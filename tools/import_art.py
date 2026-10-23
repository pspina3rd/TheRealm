"""Copy the ElvGames art the game uses from extracted asset packs into public/assets/elvgames.

The purchased packs are not stored in the repository; only the files the game
draws are. Re-run this after extracting the packs to refresh or extend them.

Usage:
    python3 tools/import_art.py <extracted-packs-dir>

`<extracted-packs-dir>` must contain one sub-folder per pack zip, named as below
(e.g. `plains/Green Plains Tileset - Fantasy Dreamland Reborn/...`):

    plains     Green Plains Tileset - Fantasy Dreamland Reborn
    caves      Caves Tileset - Fantasy Dreamland Reborn
    village    Sunny And Winter Village Tileset - Fantasy Dreamland Reborn
    chars      Character Sprites 1 - Fantasy Dreamland
    enemies    Enemies Sprites 1 - Fantasy Dreamland
    battlers1…6  Pixel Battlers - Animated RPG Monsters 01…06
    firevfx, lightvfx, icevfx, buffvfx   the Pixel VFX packs
    blacksmith Blacksmith Workshop Tileset - Fantasy Dreamland Reborn
    castle     Castle Tileset - Fantasy Dreamland Reborn
    dungeon    Dungeon Tileset - Fantasy Dreamland Reborn
    enchanted  Enchanted Forest - Fantasy Dreamland Reborn
    forest     Forest - Fantasy Dreamland
    mountains  Mountains - Fantasy Dreamland
    desert     Desert - Fantasy Dreamland

Besides plain copies it builds three files for the mentor regions:
`tiles/props.png` (every region prop, cropped, upscaled where the pack is
16px, trimmed and packed; their rectangles go to `src/ui/art/propAtlas.ts`),
`tiles/ground2.png` (recoloured ground terrains) and `tiles/lava.png` (the
animated water recoloured as lava).
Requires Pillow (`pip install pillow`).
"""
from __future__ import annotations

import colorsys
import glob
import os
import shutil
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'elvgames')

# Heroes (4 classes) and NPCs, from "Character Sprites 1 - Fantasy Dreamland".
CHARACTERS = ['002', '004', '005', '008', '015', '016', '019', '020', '025', '026',
              '031', '032', '037', '038', '039', '040',
              # Mentor-region townsfolk.
              '006', '007', '012', '013', '014', '017', '018', '027', '033']
# Overworld and region enemies from "Enemies Sprites 1 - Fantasy Dreamland".
ENEMIES = ['001', '009', '017', '018', '024', '051', '052']
# Pixel Battlers monsters: (monster, colour variant). Moon Caves first, then the regions.
BATTLERS = [('001', 'C'), ('004', 'D'), ('011', 'D'), ('006', 'C'),
            ('017', 'A'), ('023', 'A'), ('018', 'B'), ('022', 'B'), ('018', 'C'), ('022', 'C'),
            ('036', 'C'), ('003', 'A'), ('029', 'A'), ('025', 'B'), ('030', 'B'),
            ('031', 'D'), ('033', 'D'), ('031', 'A'), ('035', 'A')]

# Region props: (name, pack sheet key, (x, y, w, h) in the sheet, scale, parts).
# 16px Fantasy Dreamland sheets are doubled to the 32px grid. A box with
# parts > 1 is cut into that many columns (a row of rocks), each cut at the
# emptiest column near its even share. Every piece is trimmed to its opaque
# pixels.
SHEETS = {
    'blacksmith': 'blacksmith/*/Tilesets (32x32)/FDR_Blacksmith.png',
    'castle': 'castle/*/Tilesets (32x32)/FDR_Castle_Props.png',
    'dungeon': 'dungeon/*/Tilesets (32x32)/FDR_Dungeon.png',
    'enchanted': 'enchanted/*/Tilesets (32x32)/FDR_Enchanted_Forest.png',
    'forest': 'forest/*/Tilesets/FD_Forest.png',
    'mountains': 'mountains/*/Tilesets/FD_Mountains.png',
    'desert': 'desert/*/Tilesets/FD_Desert.png',
}
TREE_ROWS = {'green': 0, 'blue': 128, 'red': 256, 'purple': 384}
ROCK_SETS = {'beige': (256, 0), 'blue': (0, 256), 'dark': (256, 256)}
PROPS = [
    ('forge.hall', 'blacksmith', (224, 0, 224, 256), 1, 1),
    ('forge.furnace', 'blacksmith', (964, 352, 60, 96), 1, 1),
    ('forge.anvil', 'blacksmith', (868, 288, 52, 32), 1, 1),
    ('brazier', 'castle', (294, 14, 20, 26), 1, 1),
    ('tower', 'dungeon', (384, 32, 96, 192), 1, 1),
    ('torch', 'dungeon', (516, 658, 24, 42), 1, 1),
    ('orb.blue', 'dungeon', (550, 580, 20, 44), 1, 1),
    ('orb.red', 'dungeon', (582, 580, 20, 44), 1, 1),
    ('mush.house', 'enchanted', (128, 16, 192, 208), 1, 1),
    ('mush.house.blue', 'enchanted', (128, 528, 192, 208), 1, 1),
    ('mush.tree.red', 'enchanted', (512, 515, 96, 152), 1, 1),
    ('mush.tree.blue', 'enchanted', (512, 835, 96, 152), 1, 1),
    *[(f'tree.{c}.{v}', 'forest', (192, y + dy, 32, 46), 2, 1)
      for c, y in TREE_ROWS.items() for v, dy in (('a', 17), ('b', 81))],
    *[(f'tree.{c}.round', 'forest', (233, y + 16, 46, 48), 2, 1) for c, y in TREE_ROWS.items()],
    *[(f'rock.{s}', 'mountains', (ox + 48, oy + 1, 64, 14), 2, 4) for s, (ox, oy) in ROCK_SETS.items()],
    *[(f'spire.{s}', 'mountains', (ox + 48, oy + 33, 64, 32), 2, 4) for s, (ox, oy) in ROCK_SETS.items()],
    *[(f'mine.{s}', 'mountains', (ox + 1, oy + 210, 46, 30), 2, 1) for s, (ox, oy) in ROCK_SETS.items()],
    ('hut', 'mountains', (304, 512, 95, 80), 2, 1),
    ('dock', 'mountains', (209, 545, 46, 46), 2, 1),
    ('rock.orange', 'desert', (336, 193, 64, 15), 2, 4),
    ('mesa.orange', 'desert', (441, 193, 62, 62), 2, 1),
    ('barrels', 'desert', (180, 121, 26, 23), 2, 1),
]
ATLAS_WIDTH = 1024
ATLAS_TS = os.path.join(os.path.dirname(__file__), '..', 'src', 'ui', 'art', 'propAtlas.ts')
# Spell effects: (pack folder glob, file, output name).
VFX = [
    ('firevfx/*/Fire Spells', 'Fireball_Hit.png', 'fire'),
    ('firevfx/*/Fire Spells', 'Flame_Explosion.png', 'meteor'),
    ('lightvfx/*/Light Spells', 'Thunder01.png', 'thunder'),
    ('icevfx/*/Ice Spells', 'Frostball_Hit.png', 'ice'),
    ('buffvfx/*/Buffs & Debuffs', 'Health_Up.png', 'heal'),
    ('buffvfx/*/Buffs & Debuffs', 'Hit01.png', 'hit'),
]


def find(src: str, pattern: str) -> str:
    matches = sorted(glob.glob(os.path.join(src, pattern)))
    if not matches:
        sys.exit(f'Not found: {pattern}')
    return matches[0]


def copy(src_file: str, *dest: str) -> None:
    path = os.path.join(OUT, *dest)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    shutil.copyfile(src_file, path)


def upscale(src_file: str, factor: int, *dest: str) -> None:
    """Nearest-neighbour upscale, for 16px sheets drawn on the 32px grid."""
    path = os.path.join(OUT, *dest)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image = Image.open(src_file)
    image.resize((image.width * factor, image.height * factor), Image.NEAREST).save(path)


def recolour(image: Image.Image, fn) -> Image.Image:
    """Maps every opaque pixel's (h, s, v) through `fn`."""
    image = image.convert('RGBA')
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = fn(*colorsys.rgb_to_hsv(r / 255, g / 255, b / 255))
            r, g, b = colorsys.hsv_to_rgb(h % 1, min(1, max(0, s)), min(1, max(0, v)))
            px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
    return image


def lava(h: float, s: float, v: float):
    """Blue water to orange lava (pale ripples to yellow); the rim stones darken."""
    if not 0.4 < h < 0.75:
        return h, s * 0.6, v * 0.6
    if s < 0.25:
        return 0.14, 0.5, 1.0
    return 0.01 + 0.07 * max(0, (v - 0.55) / 0.45), 0.92, v * 0.97


def build_terrains(ground: str, water: str) -> None:
    """ground2.png: ash, frost stone, moon grass and red earth, in the 12×4 block layout."""
    g = Image.open(ground).convert('RGBA')
    path, sand, grass = (g.crop((0, y, 384, y + 128)) for y in (256, 384, 128))
    blocks = [
        (recolour(path, lambda h, s, v: (h, s * 0.25, v * 0.55)), (0, 0)),
        (recolour(sand, lambda h, s, v: (0.6, s * 0.25, v * 0.92)), (384, 0)),
        (recolour(grass, lambda h, s, v: (h + 0.38, s * 0.6, v * 0.8)), (0, 128)),
        (recolour(path, lambda h, s, v: (h - 0.05, s * 1.2, v * 0.95)), (384, 128)),
    ]
    out = Image.new('RGBA', (768, 256))
    for block, at in blocks:
        out.paste(block, at)
    save(out, 'tiles', 'ground2.png')
    save(recolour(Image.open(water), lava), 'tiles', 'lava.png')


def save(image: Image.Image, *dest: str) -> None:
    path = os.path.join(OUT, *dest)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image.save(path, optimize=True)


def snapped_cuts(image: Image.Image, parts: int, reach: int = 5) -> list:
    """Cuts `image` into `parts` columns, each cut moved to the emptiest column near it."""
    alpha = image.getchannel('A').point(lambda a: 1 if a else 0)
    count = [alpha.crop((cx, 0, cx + 1, image.height)).histogram()[1] for cx in range(image.width)]
    edges = [0]
    for i in range(1, parts):
        guess = round(i * image.width / parts)
        window = range(max(1, guess - reach), min(image.width - 1, guess + reach) + 1)
        edges.append(min(window, key=lambda cx: (count[cx], abs(cx - guess))))
    edges.append(image.width)
    return list(zip(edges, edges[1:]))


def build_props(src: str) -> None:
    """Crops, scales and trims every region prop, then shelf-packs them into props.png."""
    sheets = {key: Image.open(find(src, pattern)).convert('RGBA') for key, pattern in SHEETS.items()}
    pieces = []
    for name, sheet, (x, y, w, h), scale, parts in PROPS:
        box = sheets[sheet].crop((x, y, x + w, y + h))
        cuts = snapped_cuts(box, parts)
        for i, (left, right) in enumerate(cuts):
            piece = box.crop((left, 0, right, h))
            piece = piece.crop(piece.getbbox())
            piece = piece.resize((piece.width * scale, piece.height * scale), Image.NEAREST)
            pieces.append((f'{name}.{i + 1}' if len(cuts) > 1 else name, piece))
    atlas, boxes, cx, cy, row = [], {}, 0, 0, 0
    for name, piece in pieces:
        if cx + piece.width > ATLAS_WIDTH:
            cx, cy, row = 0, cy + row + 2, 0
        boxes[name] = (cx, cy, piece.width, piece.height)
        atlas.append((piece, (cx, cy)))
        cx += piece.width + 2
        row = max(row, piece.height)
    out = Image.new('RGBA', (ATLAS_WIDTH, cy + row))
    for piece, at in atlas:
        out.paste(piece, at)
    save(out, 'tiles', 'props.png')
    lines = [
        '// Generated by tools/import_art.py: region props packed into tiles/props.png.',
        '// Do not edit by hand; change PROPS in the script and re-run it.',
        f'export const PROPS_SIZE = {{ width: {out.width}, height: {out.height} }} as const;',
        '',
        '/** Each prop\'s rectangle in props.png: [x, y, w, h]. */',
        'export const PROP_ATLAS = {',
        *[f"  '{name}': [{x}, {y}, {w}, {h}]," for name, (x, y, w, h) in boxes.items()],
        '} as const satisfies Record<string, readonly [number, number, number, number]>;',
        '',
    ]
    with open(ATLAS_TS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main(src: str) -> None:
    plains = 'plains/*/Tilesets (32x32)'
    copy(find(src, f'{plains}/FDR_Ground_Tiles_Godot.png'), 'tiles', 'ground.png')
    copy(find(src, f'{plains}/FDR_Water_Tiles_Godot.png'), 'tiles', 'water.png')
    copy(find(src, f'{plains}/FDR_Grasslands.png'), 'tiles', 'grasslands.png')
    copy(find(src, 'caves/*/Tilesets (32x32)/FDR_Caves.png'), 'tiles', 'caves.png')
    upscale(find(src, 'village/*/Tilesets/FDR_Village.png'), 2, 'tiles', 'village.png')

    for n in CHARACTERS:
        copy(find(src, f'chars/*/Character Sprites 32x32/Character_{n}.png'), 'characters', f'{n}.png')
    for n in ENEMIES:
        copy(find(src, f'enemies/*/Enemy Sprites 48x48/Enemy_{n}.png'), 'enemies', f'{n}.png')
        copy(find(src, f'enemies/*/Enemy Sprites 72x72/Enemy_{n}.png'), 'enemies', f'{n}_large.png')
    for n, variant in BATTLERS:
        copy(find(src, f'battlers*/*/*{n}/TB_Monster_{n}_{variant}.png'), 'battlers', f'{n}{variant}.png')
    for folder, name, out in VFX:
        copy(find(src, f'{folder}/{name}'), 'vfx', f'{out}.png')
    build_terrains(find(src, f'{plains}/FDR_Ground_Tiles_Godot.png'),
                   find(src, f'{plains}/FDR_Water_Tiles_Godot.png'))
    build_props(src)
    copy(find(src, 'plains/*/License.txt'), 'LICENSE.txt')
    print(f'Copied art into {os.path.normpath(OUT)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
