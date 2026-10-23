# Mana Crystals

A falling-block fantasy RPG. Walk an overworld, visit villages and towns,
and descend into dungeons. **Every interaction is a battle**: monsters fight
you with magic, merchants haggle, villagers barter and sages set puzzles,
all played out on a falling-block board.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run check      # format check, lint, typecheck and tests (run before pushing)
npm run build      # static site in dist/
```

| Script             | What it does                        |
| ------------------ | ----------------------------------- |
| `npm run dev`      | Development server with hot reload  |
| `npm run build`    | Typecheck and build the static site |
| `npm run preview`  | Serve the production build locally  |
| `npm test`         | Run the unit tests once             |
| `npm run coverage` | Tests with a coverage report        |
| `npm run lint`     | ESLint                              |
| `npm run format`   | Rewrite files with Prettier         |
| `npm run check`    | Everything CI runs                  |

## How to play

| Where  | Keys                                                                                 |
| ------ | ------------------------------------------------------------------------------------ |
| World  | Arrows / WASD walk · walk into anyone to challenge them · M or Esc opens the menu    |
| Battle | ← → move · ↑ or X rotate · ↓ soft drop · Space hard drop · P pause                   |
| Magic  | 1–7 pick an element's spells (a lone spell casts at once) · then 1–n cast · Esc back |
| Touch  | World: tap a tile to walk there (tap a person or monster to meet them) · d-pad       |
| Touch  | Battle: the board is the controller (table below) · ↻ button rotates · tap a slot    |

On a touch screen the board takes these gestures:

| Gesture            | Does                                                  |
| ------------------ | ----------------------------------------------------- |
| Tap                | Rotate (so does the round ↻ button beside the board)  |
| Drag sideways      | Move the piece column by column, following the finger |
| Drag down and hold | Soft drop while held                                  |
| Flick down         | Hard drop                                             |
| Second finger      | Cancels the gesture until every finger is lifted      |

Phones get a one-screen portrait battle (no scrolling): the enemy strip
with pause and items on top, the board as large as fits with the next
piece, HP and mana beside it, and a slim strip of the seven spell slots
(a category opens as a popover). Move buttons, and a d-pad that stays,
can be turned on with **Touch buttons** in the menu; otherwise the small
d-pad hides once you have walked by tapping.

A new game starts by choosing a hero class. The game saves automatically
after every battle and map change (browser local storage). Start over from
the menu.

| Class  | Strengths                                                            |
| ------ | -------------------------------------------------------------------- |
| Ranger | Agility and Luck: slower pieces, more drops and crits                |
| Knight | Vitality and Guard: most HP and defence, small pools                 |
| Mage   | Focus and Insight: deepest pools, close to a longer preview; fragile |
| Rogue  | Strength and Charm: hits harder, people warm to them, 60 gil         |

### Stats and skill points

Every level gives 2 skill points (and a little HP). Spend them on the skill
screen, which opens after a level-up and from the menu's Skills button (a
badge counts waiting points), on eight stats: Vitality (HP), Strength
(+4% strike damage per rank), Guard (less damage taken), Focus (mana pools), Agility
(slower pieces), Insight (more next pieces, then the enemy's next move),
Charm (people like you more) and Luck (drops and critical strikes). The same
points enhance spells (below). Points can be saved; spending is permanent.

### Spells

Each element has a main spell with four levels and its own name at each
(Fire → Blaze → Inferno → Cataclysm). Skill points buy enhancements:
Power (stronger), Efficiency (cheaper) and Effect (a stronger side
effect). One of each, plus extras at higher levels, makes a spell
**ready** (a glowing scroll); a mentor will then teach its next level. Each
element also has a single-level **support** (Kindle, Mist, Static, Regen,
Stoneskin, Mana Tap, Gust) and **combos** that cost two elements' mana
(Magma: earth and fire). In battle, spells sit in one button per element;
one with several spells opens its own small menu.

### Mentors

Seven mentors, one per element, teach their element's spells: Torva
(fire), Maren (water), Rook (lightning), Hazel (nature), Dorn (earth),
Selene (arcane) and Kestrel (wind). A glow at their feet shows their
element and a scroll over their head means they have a lesson for you.
A lesson is a fight side by side: now and then the mentor tosses you the
shape that fits best, in their colour, for you to place. Win and you
learn the spell or its next level. Lose and that element's spells are
locked until you win that same lesson; the lock shows the spell, the
mentor's face and where they are, because mentors travel as you win
battles and open new places.

Some spells are hidden: their slot is only a dark silhouette until
something you do reveals it, and then its mentor will teach it.

### Elements and magic

Every piece has an element, shown by its colour: red fire, blue water,
gold lightning, green nature, orange earth, violet arcane and cyan wind.

- Every battle starts with empty mana pools; each cleared crystal adds 1
  mana to its element's pool, so spells are always earned on the board
  (an Ether doubles what you clear for 3 pieces). Spells cost
  specific elements (Fire costs fire mana; Meteor costs fire, earth and
  arcane).
- Each cleared line triggers its strongest element: fire burns, water
  chills, lightning chains, nature heals, earth wards, arcane refills mana
  and wind slows your pieces.
- Elements follow a chart: each beats two and loses to two. Enemies are
  weak to what beats their element and resist their own and what it beats.
- Alignment is the total level of your spells in an element (a combo such
  as Meteor counts toward each of its elements): stronger line effects,
  more of its pieces and a title such as "Stone Knight".
- Areas tilt which pieces fall; charms and alignment tilt them back.
- Every townsperson has an element too. Your alignment around it, plus
  Charm, sets their attitude, shown as a face over their head: from a
  scowl (won't deal) through a frown (dearer, harder) to a grin (cheaper,
  extra rewards and a secret offer). Anyone the story needs always deals.
- Shops also buy what's in your bag at half its list price.

The battle screen shows all of this instead of describing it: every
crystal carries its element's icon, cleared lines flash and burst their
element's icon, damage floats off the monster in the element's colour, the
monster's weaknesses (▲) and resistances (▼) sit under its HP bar, pips
count down to its next move, and mana pools glow as they fill. Monsters
attack the moment you walk into them. Full rules and numbers are in
[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

### The adventure so far

1. **Mossvale Village** (start): Elder Rowan, Farmer Bea, Pip and a stall keeper.
2. **The Realm** (overworld): slimes, Spore Shrooms and goblins guard the roads.
3. **Brightwater Town**: shop, smithy, inn, a sage, a collector, a shrine
   keeper and Captain Vale, who holds the pass to the caves.
4. **Moon Caves** (two floors): imps and a Cave Brute, a sealed chest, a
   hermit and the Moon Wyrm boss.
5. **Sunken Ruins**: sealed for now. Beat the Moon Wyrm (it enrages at
   half HP) to see the chapter's end; the ruins' seal then glows, waiting
   for the next chapter.

### Challenge types

| Type     | Who           | Win condition                                                       |
| -------- | ------------- | ------------------------------------------------------------------- |
| Combat   | Monsters      | Reduce the enemy to 0 HP before its real-time gauge wears you down. |
| Offering | Quest NPCs    | Hold the item and score N points within P pieces.                   |
| Barter   | Traders       | Clear N crystals of the requested colours within P pieces.          |
| Haggle   | Shopkeepers   | Survive P pieces; your clears lower the price, time raises it.      |
| Puzzle   | Sages, chests | Clear N lines from a preset board using a fixed set of pieces.      |
| Lesson   | Mentors       | Defeat the foe with the mentor's help; win to learn the spell.      |

Fights are real time: the enemy's gauge (under its HP bar) fills and it
moves when full, hitting you or your board (stone rows, a sealed column,
fog over your next piece, crystals turned to stone, faster gravity).
Single lines barely scratch it; 3–4 line clears, back-to-back big clears
and combos (several pieces in a row that each clear) hit hard. Leaving
covered holes or overflowing the board feeds its gauge, and spells (15%)
and items (40%, at most 2 per fight) take time too. Some pieces arrive
split between two related elements (more often as your alignment spreads). You get 3 pauses per
fight, and the board is hidden while paused. Monsters grow
with you (within a few levels of their own), so no area turns into a
farm. Falling in battle wakes you at the last inn with 30% HP and half
your gil; level-ups add only the new max HP. Walking heals a little while
you're below half HP, and the inn restores the rest.

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the full rules and the
reasoning behind them.

## Project layout

```
src/
  core/      Falling-block engine: board, pieces, seeded RNG, scoring (no DOM)
  battle/    Battle runner plus one rules module per challenge type
  game/      Hero, stats, alignment, rewards, encounters, shops, save/load
  world/     Map model, tile legend, game state, movement
  data/      All content: enemies, spells, items, NPCs, shops, maps
  ui/        Canvas renderers (world, board, battle stage), HUD, app controller
  ui/screens/ Conversation, results, menu and shop screens, built from icons
  ui/art/    Art definitions: images, tile themes, props, creatures, effects,
             pixel icons, and battle feedback (event → what the player sees)
tests/       Vitest unit tests, one file per area
tools/       import_art.py: copies the used art in from the asset packs
public/assets/elvgames/   The art the game draws (ElvGames)
```

Logic in `core`, `battle`, `game`, `world` and `ui/art` is pure TypeScript
with no browser APIs, so it is fully unit-tested. The rest of `ui` is the
thin browser layer.

## Adding content

All content is data. No logic changes are needed for:

- **An enemy**: add an entry to `src/data/enemies.ts`. Its `moves` decide its
  magic (`attack`, `curse`, `haste`, `heal`, `drain`).
- **An NPC**: add an entry to `src/data/npcs.ts` with an `element`,
  `lines` (a real need; the challenge is the task; the reward follows),
  a `challenge`, `rewards`, a Friendly `bonus` and a Devoted `secret`,
  then place it on a map in `src/data/maps.ts`.
- **A map**: draw rows with the legend in `src/world/tiles.ts`, add `warps`
  and `entities`, and link it from another map.

`tests/data.test.ts` checks every map is rectangular and reachable, every
reference exists, every offered item can be found, and every puzzle can
be solved. Add a solution to `PUZZLE_SOLUTIONS` for each new puzzle.

## Art

Maps stay plain text; each map has a **theme** (`outdoor`, `town` or
`cave`) that decides how its characters are drawn
(`src/ui/art/themes.ts`):

- **Ground** (grass, paths, sand, water, cave floor) is blended at the
  edges automatically using the packs' 47-tile "blob" layout
  (`src/ui/art/autotile.ts`). Water is animated.
- **Props** (trees, boulders, crystals) come from tile characters; houses,
  doors, stalls and signs are listed in a map's `decor`. Props, people and
  monsters are depth-sorted, and props in front of the hero turn
  see-through.
- **Creatures** (`src/ui/art/creatures.ts`): heroes, NPCs and overworld
  monsters are Fantasy Dreamland 4-direction walkers; Moon Caves monsters
  are animated Pixel Battlers. Battles show the opponent large beside the
  board, shaking when hit, with spell effects from the VFX packs.

To use more of the packs, extract them into one folder per pack (named as
in `tools/import_art.py`), add the files to its lists, and run:

```bash
python3 tools/import_art.py <extracted-packs-dir>   # needs Pillow
```

Then register the image in `src/ui/art/images.ts` and reference it from
`objects.ts`, `creatures.ts` or `themes.ts`. `tests/art.test.ts` checks
that every image exists at its declared size, that every sprite rectangle
fits inside its image, and that every sprite key used by the game data
exists.

## Credits

- Gameplay prototype: `mana_crystals.html`.
- Art: Fantasy Dreamland tilesets, characters and enemies, Pixel Battlers
  monsters, and pixel spell effects by [ElvGames](https://elvgames.itch.io),
  used under the ElvGames licence (`public/assets/elvgames/LICENSE.txt`).
  The licence requires credit and forbids reselling or redistributing the
  packs, so keep this repository private and copy in only the files the
  game uses.
