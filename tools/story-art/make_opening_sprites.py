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
# Rowan's right sleeve uses its own grey ramp, separate from his hair.
ROWAN_SLEEVE = [rgb(183, 173, 155), rgb(146, 138, 124), rgb(110, 104, 93), rgb(73, 69, 62), rgb(55, 52, 46)]
NAVY_SLEEVE = [rgb(72, 98, 176), rgb(58, 82, 158), rgb(42, 62, 124), rgb(28, 42, 88), rgb(18, 28, 60)]
SHIRT_SLEEVE = [rgb(150, 180, 210), rgb(123, 156, 190), rgb(92, 117, 143), rgb(62, 78, 95), rgb(46, 58, 71)]
ROWAN_HAIR = [rgb(202, 175, 162), rgb(151, 131, 122), rgb(101, 88, 81), rgb(75, 65, 60)]
BROWN_HAIR = [rgb(166, 116, 72), rgb(128, 86, 52), rgb(92, 60, 36), rgb(66, 42, 26)]

# Fern (char.026): green hair, teal top, blue trousers, orange boots, purple bag.
FERN_HAIR = [rgb(45, 255, 0), rgb(36, 204, 0), rgb(27, 153, 0), rgb(18, 102, 0), rgb(13, 76, 0)]
DARK_GREEN = [rgb(72, 160, 44), rgb(56, 128, 34), rgb(42, 98, 26), rgb(28, 68, 18), rgb(18, 46, 12)]
FERN_TOP = [rgb(38, 89, 110), rgb(29, 67, 83), rgb(19, 44, 55), rgb(14, 33, 41)]
LEATHER = [rgb(122, 86, 54), rgb(96, 66, 40), rgb(68, 46, 28), rgb(46, 30, 18)]
# Fern's right sleeve is purple in the original; match it to the top instead.
FERN_SLEEVE = [rgb(181, 76, 255), rgb(145, 61, 204), rgb(109, 46, 153), rgb(72, 30, 102), rgb(54, 23, 76)]
TEAL_SLEEVE = [rgb(52, 112, 138), rgb(38, 89, 110), rgb(29, 67, 83), rgb(19, 44, 55), rgb(14, 33, 41)]
LEATHER_SLEEVE = [rgb(148, 106, 68), rgb(122, 86, 54), rgb(96, 66, 40), rgb(68, 46, 28), rgb(46, 30, 18)]
# One of Fern's trouser legs is orange in the original; make both legs one colour.
FERN_ORANGE_LEG = [rgb(255, 168, 0), rgb(204, 134, 0), rgb(76, 50, 0)]
BLUE_LEG = [rgb(102, 160, 217), rgb(82, 128, 174), rgb(41, 64, 87)]
FERN_BLUE_LEG = [rgb(102, 160, 217), rgb(82, 128, 174), rgb(41, 64, 87), rgb(30, 48, 65)]
MOSS_TROUSERS = [rgb(104, 112, 84), rgb(84, 92, 68), rgb(58, 64, 46), rgb(40, 44, 32)]
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


MUD_DARK = rgb(68, 50, 32)
MUD_SPLASH = rgb(132, 100, 66)


def add_mud(sheet: Image.Image) -> Image.Image:
    """Mud caked round both trouser cuffs, with a few small splashes higher on the body."""
    out = sheet.copy()
    px = out.load()
    trousers = set(BLUE_LEG) | {rgb(30, 48, 65)}
    clothes = set(FERN_TOP) | set(TEAL_SLEEVE) | trousers
    for _, _, box in frames(sheet):
        # Cuffs: the lowest two trouser pixels in every column, darkest at the hem.
        for x in range(box[0], box[2]):
            column = [y for y in range(box[1], box[3]) if px[x, y] in trousers]
            if column:
                hem = max(column)
                px[x, hem] = MUD_DARK
                if px[x, hem - 1] in trousers:
                    px[x, hem - 1] = MUD
        # Splashes: a few single specks spread over the clothes, at least three pixels apart.
        candidates = sorted(
            ((x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2]) if px[x, y] in clothes),
            key=lambda p: _noise(*p),
        )
        placed: list[tuple[int, int]] = []
        for x, y in candidates:
            if len(placed) == 6:
                break
            if all(abs(x - qx) + abs(y - qy) >= 4 for qx, qy in placed):
                px[x, y] = MUD_SPLASH
                placed.append((x, y))
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


# Birch: the pack's round tree with lighter, yellower leaves and white bark marked in black.
BIRCH_LEAVES = [rgb(40, 86, 52), rgb(70, 140, 70), rgb(110, 176, 74), rgb(156, 206, 92), rgb(210, 236, 128)]
# The pack trunk's four shades (by r + g + b), darkest to lightest, as birch bark.
BIRCH_BARK = {213: rgb(92, 86, 80), 322: rgb(196, 192, 182), 422: rgb(230, 227, 218), 489: rgb(248, 246, 240)}
BARK_MARK = rgb(46, 40, 38)
# The pack sheet stacks a spare trunk piece under this tree; the tree itself ends at row 92.
PACK_TREE = (0, 516, 64, 608)


def _noise(x: int, y: int) -> int:
    """Stable per-pixel noise, 0 to 99, so the art is identical on every run."""
    return (x * 73856093 ^ y * 19349663) % 100


def _brightness(colour: Color) -> int:
    return int(0.3 * colour[0] + 0.59 * colour[1] + 0.11 * colour[2])


def birch_tree() -> Image.Image:
    """The pack's single round tree, made a birch: same outline and shading, new colours."""
    tree = Image.open(TILES / 'grasslands.png').convert('RGBA').crop(PACK_TREE)
    px = tree.load()
    leaf_shades = sorted(
        {_brightness(px[x, y]) for y in range(tree.height) for x in range(tree.width)
         if px[x, y][3] > 200 and px[x, y][1] > px[x, y][0]}
    )
    for y in range(tree.height):
        for x in range(tree.width):
            r, g, b, a = px[x, y]
            if a <= 200:
                continue  # the soft ground shadow stays as it is
            if g > r:
                step = leaf_shades.index(_brightness(px[x, y])) * 5 // len(leaf_shades)
                px[x, y] = BIRCH_LEAVES[step][:3] + (a,)
            else:
                bark = BIRCH_BARK.get(r + g + b, BIRCH_BARK[422])
                marked = r + g + b >= 422 and _noise(3, y) < 18 and _noise(x // 2, y) < 55
                px[x, y] = (BARK_MARK if marked else bark)[:3] + (a,)
    return tree


# The seven stones: the pack's round boulder with small crystals of each stone's colour set in it.
STONE_HEX = ['#bd91ff', '#7296ff', '#61d9e8', '#72e6a2', '#f6d365', '#ffad69', '#ff7c9b']
PACK_ROCK = (0, 192, 32, 222)
# Crystal shapes: o outline, m body, l light face, h highlight.
BIG_CRYSTAL = ['..o..', '.olo.', '.ohlo', 'omllo', 'omlho', 'ommlo', 'ommlo', '.ooo.']
SMALL_CRYSTAL = ['.o.', 'olo', 'oho', 'omo', 'omo', 'ooo']
CHIP = ['.o.', 'olo', 'omo', 'ooo']
# Where each crystal sits on the boulder (top-left of its shape).
CRYSTALS = [(BIG_CRYSTAL, 13, 0), (SMALL_CRYSTAL, 7, 5), (SMALL_CRYSTAL, 21, 4), (CHIP, 17, 15)]


def _crystal_ramp(hex_colour: str, lit: bool) -> dict[str, Color]:
    r, g, b = (int(hex_colour[i : i + 2], 16) for i in (1, 3, 5))
    if not lit:  # a dark stone: the crystals dull to a dim grey tint of their colour
        grey = (r + g + b) // 3
        r, g, b = ((v + grey * 2) // 3 * 45 // 100 for v in (r, g, b))
    mix = lambda v, k: min(255, int(v + (255 - v) * k))  # noqa: E731
    return {
        'o': rgb(r * 35 // 100, g * 35 // 100, b * 42 // 100),
        'm': rgb(r * 80 // 100, g * 80 // 100, b * 85 // 100),
        'l': rgb(r, g, b),
        'h': rgb(mix(r, 0.6), mix(g, 0.6), mix(b, 0.6)),
    }


def standing_stones() -> Image.Image:
    """A sheet of the seven stones in STONE_ORDER: lit on the top row, dark beneath."""
    rock = Image.open(TILES / 'grasslands.png').convert('RGBA').crop(PACK_ROCK)
    w, h = rock.size
    sheet = Image.new('RGBA', (w * len(STONE_HEX), h * 2), (0, 0, 0, 0))
    for row, lit in enumerate((True, False)):
        for col, hex_colour in enumerate(STONE_HEX):
            stone = rock.copy()
            px = stone.load()
            ramp = _crystal_ramp(hex_colour, lit)
            for shape, ox, oy in CRYSTALS:
                for dy, line in enumerate(shape):
                    for dx, ch in enumerate(line):
                        if ch in ramp:
                            px[ox + dx, oy + dy] = ramp[ch]
            sheet.alpha_composite(stone, (col * w, row * h))
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fern = Image.open(CHARS / '026.png').convert('RGBA')
    rowan = Image.open(CHARS / '038.png').convert('RGBA')

    rowan_coat = recolor(rowan, dict(zip(ROWAN_SHIRT + ROWAN_SLEEVE, NAVY + NAVY_SLEEVE)))
    rowan_coat.save(OUT / 'rowan-coat.png')
    add_lantern(rowan_coat).save(OUT / 'rowan-coat-lantern.png')
    recolor(rowan, dict(zip(ROWAN_HAIR + ROWAN_SLEEVE, BROWN_HAIR + SHIRT_SLEEVE))).save(
        OUT / 'rowan-young.png'
    )

    # The everyday Fern: the pack's purple sleeve and orange leg matched to the rest of his outfit.
    fern_fixed = recolor(fern, dict(zip(FERN_SLEEVE + FERN_ORANGE_LEG, TEAL_SLEEVE + BLUE_LEG)))
    fern_fixed.save(OUT / 'fern.png')
    pale = recolor(fern_fixed, dict(zip(FERN_SKIN, PALE_SKIN)))
    add_mud(pale).save(OUT / 'fern-pale-muddy.png')
    bracken = dict(zip(FERN_HAIR + FERN_TOP + FERN_SLEEVE, DARK_GREEN + LEATHER + LEATHER_SLEEVE))
    # Both legs, orange and blue, become one pair of moss-green trousers.
    bracken.update(zip(FERN_BLUE_LEG, MOSS_TROUSERS))
    bracken.update(zip(FERN_ORANGE_LEG, MOSS_TROUSERS[:2] + MOSS_TROUSERS[2:3]))
    recolor(fern, bracken).save(OUT / 'bracken.png')

    birch_tree().save(OUT / 'birch.png')
    standing_stones().save(OUT / 'stones.png')


if __name__ == '__main__':
    main()
