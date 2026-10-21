"""Copy the ElvGames art the game uses from extracted asset packs into public/assets/elvgames.

The purchased packs are not stored in the repository; only the files the game
draws are. Re-run this after extracting the packs to refresh or extend them.

Usage:
    python3 tools/import_art.py <extracted-packs-dir>

`<extracted-packs-dir>` must contain one sub-folder per pack zip, named as below
(e.g. `plains/Green Plains Tileset - Fantasy Dreamland Reborn/...`).
Requires Pillow (`pip install pillow`).
"""
from __future__ import annotations

import glob
import os
import shutil
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'elvgames')

# Heroes (4 classes) and NPCs, from "Character Sprites 1 - Fantasy Dreamland".
CHARACTERS = ['002', '004', '005', '008', '015', '016', '019', '020', '025', '026',
              '031', '032', '037', '038', '039', '040']
# Overworld enemies from "Enemies Sprites 1 - Fantasy Dreamland".
ENEMIES = ['001', '009']
# Moon Caves monsters from "Pixel Battlers - Animated RPG Monsters": (monster, colour variant).
BATTLERS = [('001', 'C'), ('004', 'D'), ('011', 'D'), ('006', 'C')]
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
    copy(find(src, 'plains/*/License.txt'), 'LICENSE.txt')
    print(f'Copied art into {os.path.normpath(OUT)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
