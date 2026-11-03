#!/usr/bin/env python3
"""Build editable review copies. Requires python-docx; PDF also uses reportlab.

Usage: python tools/export-world-bible-review.py [output_directory]
Does not import author edits or change game/source documents.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import sys
import zipfile
from urllib.parse import urljoin

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'artifacts'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://github.com/pspina3rd/TheRealm/blob/GetPutTaco/docs/'
INLINE = re.compile(r'(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|_[^_\n]+_|\*[^*\n]+\*)')


def plain(text):
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = text.replace('**', '').replace('`', '')
    text = re.sub(r'(?<!\w)[_*]([^\n]+?)[_*](?!\w)', r'\1', text)
    return text


def blocks(text):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                row = lines[i].strip().strip('|').split('|')
                if not all(re.fullmatch(r'\s*:?-+:?\s*', c) for c in row):
                    rows.append([c.strip() for c in row])
                i += 1
            yield ('table', rows)
            continue
        heading = re.match(r'^(#{1,6}) (.+)$', line)
        if heading:
            yield ('heading', (len(heading[1]), heading[2]))
            i += 1
            continue
        if line.startswith('> '):
            quote = []
            while i < len(lines) and (lines[i].startswith('> ') or lines[i] == '>'):
                quote.append(lines[i][2:] if lines[i].startswith('> ') else '')
                i += 1
            yield ('quote', '\n'.join(quote))
            continue
        bullet = re.match(r'^(?:- |\d+\. )(.+)$', line)
        if bullet:
            yield ('bullet', bullet[1])
            i += 1
            continue
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#{1,6} |\||> |- |\d+\. )', lines[i]):
            para.append(lines[i])
            i += 1
        yield ('paragraph', ' '.join(para))


def anchor_name(fragment):
    return 'WB_' + hashlib.sha256(fragment.encode()).hexdigest()[:24]


def hyperlink(paragraph, label, target):
    node = OxmlElement('w:hyperlink')
    if target.startswith('#'):
        node.set(qn('w:anchor'), anchor_name(target[1:]))
    else:
        node.set(qn('r:id'), paragraph.part.relate_to(urljoin(BASE, target), RT.HYPERLINK, is_external=True))
    run = OxmlElement('w:r')
    props = OxmlElement('w:rPr')
    color = OxmlElement('w:color'); color.set(qn('w:val'), '24586D'); props.append(color)
    underline = OxmlElement('w:u'); underline.set(qn('w:val'), 'single'); props.append(underline)
    run.append(props)
    value = OxmlElement('w:t'); value.text = label; run.append(value)
    node.append(run); paragraph._p.append(node)


def inline(paragraph, text):
    for token in INLINE.split(text):
        if not token:
            continue
        link = re.fullmatch(r'\[([^\]]+)\]\(([^)]+)\)', token)
        if link:
            hyperlink(paragraph, link[1], link[2])
            continue
        bold = token.startswith('**') and token.endswith('**')
        code = token.startswith('`') and token.endswith('`')
        italic = not bold and ((token.startswith('_') and token.endswith('_')) or (token.startswith('*') and token.endswith('*')))
        value = token[2:-2] if bold else token[1:-1] if code or italic else token
        run = paragraph.add_run(value)
        run.bold = bold
        run.italic = italic
        if code:
            run.font.name = 'Consolas'; run.font.size = Pt(9)


def docx_export(source, target):
    text = source.read_text()
    doc = Document()
    section = doc.sections[0]
    section.top_margin = section.bottom_margin = Inches(0.7)
    section.left_margin = section.right_margin = Inches(0.7)
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'; normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.13
    for name in ['Title', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4']:
        doc.styles[name].font.name = 'Calibri'
        doc.styles[name].font.color.rgb = RGBColor.from_string('203B4D')
    header = section.header.paragraphs[0]
    header.add_run('MANA CRYSTALS  ·  AUTHOR REVIEW COPY').font.size = Pt(8)
    footer = section.footer.paragraphs[0]
    footer.alignment = 2
    footer.add_run('Page ')
    field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)
    doc.core_properties.title = plain(text.splitlines()[0].lstrip('# '))
    doc.core_properties.subject = 'World and story reference for author review; proposed material is labeled.'
    doc.core_properties.author = 'Mana Crystals project'
    bookmark_id = 0
    for kind, value in blocks(text):
        if kind == 'heading':
            level, title = value
            paragraph = doc.add_paragraph(style='Title' if level == 1 else f'Heading {min(level - 1, 4)}')
            fragment = re.sub(r'[^\w\s-]', '', plain(title).lower())
            fragment = re.sub(r'\s+', '-', fragment)
            bookmark_id += 1
            start = OxmlElement('w:bookmarkStart'); start.set(qn('w:id'), str(bookmark_id)); start.set(qn('w:name'), anchor_name(fragment))
            paragraph._p.append(start)
            inline(paragraph, title)
            end = OxmlElement('w:bookmarkEnd'); end.set(qn('w:id'), str(bookmark_id)); paragraph._p.append(end)
        elif kind == 'table':
            count = len(value[0])
            table = doc.add_table(rows=1, cols=count)
            table.style = 'Light Shading Accent 1'
            table.autofit = False
            available = section.page_width - section.left_margin - section.right_margin
            # Keep the long explanation column readable in canon/check tables.
            weights = ([0.15, 0.22, 0.63] if count == 3 and value[0][0] == 'ID' else [1 / count] * count)
            for column, weight in zip(table.columns, weights):
                column.width = int(available * weight)
            repeat = OxmlElement('w:tblHeader'); repeat.set(qn('w:val'), 'true')
            table.rows[0]._tr.get_or_add_trPr().append(repeat)
            for row_index, row in enumerate(value):
                cells = table.rows[0].cells if row_index == 0 else table.add_row().cells
                for cell, weight, cell_text in zip(cells, weights, row):
                    cell.width = int(available * weight)
                    paragraph = cell.paragraphs[0]
                    inline(paragraph, cell_text)
                    paragraph.paragraph_format.space_after = Pt(5)
                    for run in paragraph.runs:
                        run.font.size = Pt(9)
                        if row_index == 0:
                            run.bold = True
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        else:
            paragraph = doc.add_paragraph(style='List Bullet' if kind == 'bullet' else 'Normal')
            if kind == 'quote':
                paragraph.paragraph_format.left_indent = Inches(0.18)
                paragraph.paragraph_format.right_indent = Inches(0.12)
            inline(paragraph, value)
    doc.save(target)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise RuntimeError(f'Invalid DOCX: {target}')
    checked = Document(target)
    if len(checked.paragraphs) < 30 or not checked.core_properties.title:
        raise RuntimeError(f'Incomplete DOCX: {target}')
    return len(checked.paragraphs)


def pdf_markup(text):
    chunks = []
    for token in INLINE.split(text):
        link = re.fullmatch(r'\[([^\]]+)\]\(([^)]+)\)', token)
        if link:
            chunks.append(html.escape(link[1]))
        elif token.startswith('**') and token.endswith('**'):
            chunks.append('<b>' + html.escape(token[2:-2]) + '</b>')
        elif token.startswith('`') and token.endswith('`'):
            chunks.append(html.escape(token[1:-1]))
        elif ((token.startswith('_') and token.endswith('_')) or (token.startswith('*') and token.endswith('*'))):
            chunks.append('<i>' + html.escape(token[1:-1]) + '</i>')
        else:
            chunks.append(html.escape(token))
    return ''.join(chunks).replace('\n', '<br/>')


def pdf_export(source, target):
    font_root = Path('/usr/share/fonts/truetype/dejavu')
    for name, file in [('Review', 'DejaVuSerif.ttf'), ('Review-Bold', 'DejaVuSerif-Bold.ttf'), ('Review-Italic', 'DejaVuSerif-Italic.ttf'), ('Review-BoldItalic', 'DejaVuSerif-BoldItalic.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(font_root / file)))
    pdfmetrics.registerFontFamily('Review', normal='Review', bold='Review-Bold', italic='Review-Italic', boldItalic='Review-BoldItalic')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('ReviewBody', fontName='Review', fontSize=10, leading=14, spaceAfter=7, alignment=TA_LEFT))
    styles.add(ParagraphStyle('ReviewCell', parent=styles['ReviewBody'], fontSize=8, leading=11, spaceAfter=2))
    for n, size in [(1, 21), (2, 16), (3, 12.5), (4, 10.5)]:
        styles.add(ParagraphStyle(f'ReviewH{n}', parent=styles['ReviewBody'], fontName='Review-Bold', fontSize=size, leading=size * 1.25, spaceBefore=11, spaceAfter=8, keepWithNext=True))
    page_width, page_height = 595.28, 841.89
    margin = 43
    width = page_width - 2 * margin
    flow = []
    for kind, value in blocks(source.read_text()):
        if kind == 'heading':
            level, title = value
            flow.append(Paragraph(pdf_markup(title), styles[f'ReviewH{min(level, 4)}']))
        elif kind == 'table':
            count = len(value[0])
            weights = [0.14, 0.23, 0.63] if count == 3 and value[0][0] == 'ID' else [1 / count] * count
            rows = [[Paragraph(pdf_markup(c), styles['ReviewCell']) for c in row] for row in value]
            table = Table(rows, colWidths=[width * w for w in weights], repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e7edf1')), ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#bdc7ce')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
            flow.extend([table, Spacer(1, 9)])
        else:
            text = ('• ' if kind == 'bullet' else '') + pdf_markup(value)
            flow.append(Paragraph(text, styles['ReviewBody']))
    def footer(canvas, doc):
        canvas.setFont('Review', 8)
        canvas.setFillColor(colors.HexColor('#586873'))
        canvas.drawString(margin, 24, 'Mana Crystals · Author review copy')
        canvas.drawRightString(page_width - margin, 24, str(doc.page))
    SimpleDocTemplate(str(target), pagesize=(page_width, page_height), leftMargin=margin, rightMargin=margin, topMargin=margin, bottomMargin=38, title='Mana Crystals — World Bible', author='Mana Crystals project').build(flow, onFirstPage=footer, onLaterPages=footer)


outputs = []
for source_name, output_name in [
    ('WORLD_BIBLE.md', 'Mana-Crystals-World-Bible.docx'),
    ('WORLD_BIBLE_STORY_READER.md', 'Mana-Crystals-Story-Reader.docx'),
]:
    source = ROOT / 'docs' / source_name
    target = OUT / output_name
    paragraphs = docx_export(source, target)
    outputs.append({'file': target.name, 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'source': 'docs/' + source_name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'paragraphs': paragraphs})
pdf_target = OUT / 'Mana-Crystals-World-Bible.pdf'
pdf_export(ROOT / 'docs/WORLD_BIBLE.md', pdf_target)
outputs.append({'file': pdf_target.name, 'bytes': pdf_target.stat().st_size, 'sha256': hashlib.sha256(pdf_target.read_bytes()).hexdigest()})
(OUT / 'Mana-Crystals-Review-Files.json').write_text(json.dumps(outputs, indent=2) + '\n')
print(json.dumps(outputs, indent=2))
