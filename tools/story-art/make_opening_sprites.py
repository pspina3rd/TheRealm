"""Build the opening cinematic's edited sprites from the ElvGames pack.

Writes new files to public/assets/story/ and never changes the pack's originals.
Run from the repository root: python tools/story-art/make_opening_sprites.py
"""

from pathlib import Path

from PIL import Image

CHARS = Path('public/assets/elvgames/characters')
TILES = Path('public/assets/elvgames/tiles')
OUT = Path('public/assets/story')
FRAME = 48  # walker sheets are 4 rows (down, left, right, up) x 4 frames

Color = tuple[int, int, int, int]


def rgb(r: int, g: int, b: int) -> Color:
    return (r, g, b, 255)


def recolor(img: Image.Image, mapping: dict[Color, Color]) -> Image.Image:
    """Swap exact palette colours, leaving every other pixel as it was."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if px[x, y] in mapping:
                px[x, y] = mapping[px[x, y]]
    return out


# Rowan (char.038): shirt blues and grey hair.
ROWAN_SHIRT = [rgb(123, 156, 190), rgb(92, 117, 143), rgb(62, 78, 95), rgb(46, 58, 71)]
NAVY = [rgb(58, 82, 158), rgb(42, 62, 124), rgb(28, 42, 88), rgb(18, 28, 60)]
ROWAN_HAIR = [rgb(202, 175, 162), rgb(151, 131, 122), rgb(101, 88, 81), rgb(75, 65, 60)]
BROWN_HAIR = [rgb(166, 116, 72), rgb(128, 86, 52), rgb(92, 60, 36), rgb(66, 42, 26)]

# Fern (char.026): green hair, teal top, blue trousers, orange boots, purple bag.
FERN_HAIR = [rgb(45, 255, 0), rgb(36, 204, 0), rgb(27, 153, 0), rgb(18, 102, 0), rgb(13, 76, 0)]
DARK_GREEN = [rgb(72, 160, 44), rgb(56, 128, 34), rgb(42, 98, 26), rgb(28, 68, 18), rgb(18, 46, 12)]
FERN_TOP = [rgb(38, 89, 110), rgb(29, 67, 83), rgb(19, 44, 55), rgb(14, 33, 41)]
LEATHER = [rgb(122, 86, 54), rgb(96, 66, 40), rgb(68, 46, 28), rgb(46, 30, 18)]
FERN_SKIN = [rgb(255, 189, 153), rgb(229, 154, 114)]
PALE_SKIN = [rgb(240, 214, 200), rgb(212, 180, 164)]

MUD = rgb(92, 68, 44)
LANTERN_FRAME = rgb(58, 44, 30)
LANTERN_GLOW = rgb(255, 206, 92)
LANTERN_CORE = rgb(255, 244, 186)


def frames(sheet: Image.Image):
    """Yield (row, column, box) for each 48 x 48 frame."""
    for row in range(4):
        for col in range(4):
            yield row, col, (col * FRAME, row * FRAME, (col + 1) * FRAME, (row + 1) * FRAME)


def opaque_box(sheet: Image.Image, box) -> tuple[int, int, int, int]:
    return sheet.crop(box).getbbox() or (0, 0, FRAME, FRAME)


def add_mud(sheet: Image.Image) -> Image.Image:
    """Splash mud down the right-hand side of Fern's clothes, below the shoulders."""
    out = sheet.copy()
    px = out.load()
    clothes = set(FERN_TOP) | {rgb(82, 128, 174), rgb(102, 160, 217), rgb(30, 48, 65), rgb(41, 64, 87)}
    for _, _, box in frames(sheet):
        left, top, right, bottom = opaque_box(sheet, box)
        mid = box[0] + (left + right) // 2
        # One solid splash over the lower right of the clothes, like a fall on one side.
        cx = (mid + box[0] + right) / 2
        cy = box[1] + top + (bottom - top) * 0.8
        rx = max(1.5, (box[0] + right - mid) * 0.5)
        ry = (bottom - top) * 0.16
        for y in range(box[1] + top, box[1] + bottom):
            for x in range(box[0] + left, box[0] + right):
                inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
                if px[x, y] in clothes and inside:
                    px[x, y] = MUD
    return out


def add_lantern(sheet: Image.Image) -> Image.Image:
    """Hang a small lit lantern from the hand on the side facing the viewer."""
    out = sheet.copy()
    px = out.load()
    for row, _, box in frames(sheet):
        left, top, right, bottom = opaque_box(sheet, box)
        hand_y = box[1] + top + (bottom - top) // 2
        # Down and right: hold it on the figure's right. Left: in front. Up: hidden behind the body.
        if row == 3:
            continue
        # Hold it against the body's edge at hand height, not the edge of the hair.
        body = [x for x in range(box[0], box[2]) if px[x, hand_y + 2][3] > 0]
        x0 = (min(body) - 3) if row == 1 else (max(body) - 0)
        shape = [
            ' f  ',
            ' f  ',
            'ffff',
            'fggf',
            'fcgf',
            'fggf',
            'ffff',
        ]
        colours = {'f': LANTERN_FRAME, 'g': LANTERN_GLOW, 'c': LANTERN_CORE}
        for dy, line in enumerate(shape):
            for dx, ch in enumerate(line):
                if ch in colours:
                    px[x0 + dx, hand_y + dy] = colours[ch]
    return out


def birch_tree() -> Image.Image:
    """A single grasslands tree with a pale, banded birch trunk and lighter leaves."""
    tree = Image.open(TILES / 'grasslands.png').convert('RGBA').crop((0, 516, 64, 634))
    px = tree.load()
    for y in range(tree.height):
        for x in range(tree.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > g and r > b:  # brown trunk pixels
                shade = (r + g + b) / (3 * 255)
                band = (y * 5 + (x // 2) * 11) % 13 == 0 or (y * 5 + (x // 2) * 11) % 13 == 1
                px[x, y] = MUD if band else (int(150 + 100 * shade), int(146 + 100 * shade), int(136 + 100 * shade), a)
            elif g > r and g > b:  # leaves: lighter, yellower green
                px[x, y] = (min(255, r + 30), min(255, g + 18), b, a)
    return tree


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fern = Image.open(CHARS / '026.png').convert('RGBA')
    rowan = Image.open(CHARS / '038.png').convert('RGBA')

    rowan_coat = recolor(rowan, dict(zip(ROWAN_SHIRT, NAVY)))
    rowan_coat.save(OUT / 'rowan-coat.png')
    add_lantern(rowan_coat).save(OUT / 'rowan-coat-lantern.png')
    recolor(rowan, dict(zip(ROWAN_HAIR, BROWN_HAIR))).save(OUT / 'rowan-young.png')

    add_mud(recolor(fern, dict(zip(FERN_SKIN, PALE_SKIN)))).save(OUT / 'fern-pale-muddy.png')
    recolor(fern, dict(zip(FERN_HAIR + FERN_TOP, DARK_GREEN + LEATHER))).save(OUT / 'bracken.png')

    birch_tree().save(OUT / 'birch.png')


if __name__ == '__main__':
    main()
