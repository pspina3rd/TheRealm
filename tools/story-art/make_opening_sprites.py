"""Build the opening cinematic's edited sprites from the ElvGames pack.

Writes new files to public/assets/story/ and never changes the pack's originals.
Run from the repository root: python tools/story-art/make_opening_sprites.py
"""

import random
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


# The seven stones are smooth, water-worn lake stones, like yooperlites under a black light: plain
# grey rock by day, but when lit the rock goes dark and patches, veins and flecks inside it glow in
# the stone's colour. Each stone has its own shape and its own pattern of glow.
STONE_HEX = ['#bd91ff', '#7296ff', '#61d9e8', '#72e6a2', '#f6d365', '#ffad69', '#ff7c9b']
STONE_CELL = 80  # each stone sits bottom-centred in an 80 x 80 cell
# Plain lake-stone greys, darkest (outline) to lightest (sunlit top), and the rock under a lit glow.
STONE_GREYS = [rgb(46, 44, 48), rgb(92, 90, 94), rgb(124, 122, 126), rgb(156, 154, 156), rgb(188, 186, 186)]
LIT_GREYS = [rgb(22, 20, 28), rgb(44, 42, 52), rgb(58, 56, 66), rgb(72, 70, 80), rgb(88, 86, 96)]
# Shapes: width, height, lumps (extra rounded masses as fractions: across, up, size), lean, seed.
STONE_SHAPES = [
    (30, 58, [(0.5, 0.75, 0.55), (0.45, 0.4, 0.6)], 3, 11),  # violet: a tall egg, leaning
    (62, 40, [(0.3, 0.35, 0.55), (0.7, 0.4, 0.5)], 0, 23),  # blue: broad and low, two lobes
    (46, 50, [(0.4, 0.55, 0.6), (0.65, 0.3, 0.45)], -2, 37),  # cyan: lumpy, leaning left
    (54, 46, [(0.5, 0.45, 0.7)], 0, 41),  # green: a round, heavy stone
    (34, 62, [(0.5, 0.3, 0.55), (0.45, 0.72, 0.5)], -3, 53),  # gold: tall, narrow and crooked
    (58, 36, [(0.35, 0.4, 0.6), (0.68, 0.35, 0.55)], 0, 67),  # orange: flat and wide
    (48, 54, [(0.5, 0.3, 0.6), (0.3, 0.65, 0.45), (0.72, 0.62, 0.45)], 1, 79),  # red: a heaped cairn
]


def _glow_ramp(hex_colour: str) -> dict[str, Color]:
    """Fluorescent glow: a deep edge, the stone's colour, and a near-white hot core."""
    r, g, b = (int(hex_colour[i : i + 2], 16) for i in (1, 3, 5))

    def toward_white(v: int, k: float) -> int:
        return min(255, int(v + (255 - v) * k))

    return {
        'm': rgb(r * 62 // 100, g * 62 // 100, b * 70 // 100),
        'l': rgb(r, g, b),
        'h': rgb(toward_white(r, 0.65), toward_white(g, 0.65), toward_white(b, 0.65)),
    }


def _value_noise(seed: int, scale: float):
    """Smooth 2D noise in 0..1, stable for a given seed."""
    rand = random.Random(seed)
    grid = {(i, j): rand.random() for i in range(-2, 40) for j in range(-2, 40)}

    def at(x: float, y: float) -> float:
        gx, gy = x / scale, y / scale
        i, j = int(gx), int(gy)
        fx, fy = gx - i, gy - j
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        top = grid[(i, j)] * (1 - fx) + grid[(i + 1, j)] * fx
        low = grid[(i, j + 1)] * (1 - fx) + grid[(i + 1, j + 1)] * fx
        return top * (1 - fy) + low * fy

    return at


def _stone_mask(width: int, height: int, lumps, lean: int, seed: int) -> set[tuple[int, int]]:
    """The stone's silhouette: overlapping rounded masses with weathered, uneven edges, resting on a
    flattened base at the bottom of the cell."""
    left = (STONE_CELL - width) // 2
    base = STONE_CELL - 1
    rough = _value_noise(seed + 9, 5.0)
    pixels = set()
    for across, up, size in lumps:
        cx = left + across * width
        cy = base - up * height
        rx, ry = size * width * 0.62, size * height * 0.62
        for y in range(STONE_CELL):
            for x in range(STONE_CELL):
                shift = lean * (base - y) / max(1, height)  # the stone leans as it rises
                edge = 1 + 0.22 * (rough(x, y) - 0.5)
                if ((x - cx - shift) / rx) ** 2 + ((y - cy) / ry) ** 2 <= edge:
                    pixels.add((x, y))
    # Settle the stone: drop it onto the ground and flatten the bottom two rows it rests on.
    drop = base - max(y for _, y in pixels)
    settled = {(x, y + drop) for x, y in pixels}
    floor = base - 1
    row = [x for x, y in settled if y == floor - 2]
    if row:
        for x in range(min(row) + 1, max(row)):
            settled.update({(x, floor), (x, base)})
    return {(x, y) for x, y in settled if y <= base}


def _shade(mask: set[tuple[int, int]], x: int, y: int, greys, weather) -> Color:
    """Pack-style stepped shading: outline at the edge, light from the upper left, dithered steps,
    with weathering: broad patches a shade lighter or darker and small dark pits."""
    if any((x + dx, y + dy) not in mask for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
        return greys[0]
    xs = [px for px, py in mask if py == y]
    ys = [py for px, py in mask if px == x]
    across = (x - min(xs)) / max(1, max(xs) - min(xs))
    down = (y - min(ys)) / max(1, max(ys) - min(ys))
    light = 4.1 - across * 1.6 - down * 2.2 + (weather(x, y) - 0.5) * 1.4
    if _noise(x, y) < 4:
        return greys[1]  # a pit
    step = int(light)
    if light - step > 0.6 and (x + y) % 2 == 0:
        step += 1
    return greys[max(1, min(4, step))]


def standing_stones() -> Image.Image:
    """A sheet of the seven stones in STONE_ORDER: lit (glowing) on the top row, plain beneath."""
    sheet = Image.new('RGBA', (STONE_CELL * len(STONE_SHAPES), STONE_CELL * 2), (0, 0, 0, 0))
    for col, ((width, height, lumps, lean, seed), hex_colour) in enumerate(zip(STONE_SHAPES, STONE_HEX)):
        mask = _stone_mask(width, height, lumps, lean, seed)
        weather = _value_noise(seed + 5, 6.0)
        patches = _value_noise(seed, 7.0)
        flecks = _value_noise(seed + 1, 2.2)
        veins = _value_noise(seed + 2, 11.0)
        glow = _glow_ramp(hex_colour)
        for row, lit in enumerate((True, False)):
            stone = Image.new('RGBA', (STONE_CELL, STONE_CELL), (0, 0, 0, 0))
            px = stone.load()
            for x, y in mask:
                px[x, y] = _shade(mask, x, y, LIT_GREYS if lit else STONE_GREYS, weather)
                if not lit or px[x, y] == LIT_GREYS[0]:
                    continue
                patch = patches(x, y)
                vein = abs(veins(x, y) - 0.5) < 0.035  # thin bands where the vein noise crosses its middle
                if patch > 0.74 or (vein and patch > 0.45):
                    px[x, y] = glow['h'] if patch > 0.8 else glow['l']
                elif patch > 0.66 or vein:
                    px[x, y] = glow['m']
                elif flecks(x, y) > 0.86:
                    px[x, y] = glow['l']
            sheet.alpha_composite(stone, (col * STONE_CELL, row * STONE_CELL))
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
