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

| Where  | Keys                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| World  | Arrows / WASD walk · walk into anyone to challenge them · M or Esc opens the menu |
| Battle | ← → move · ↑ or X rotate · ↓ soft drop · Space hard drop · 1–9 cast · P pause     |
| Touch  | On-screen buttons appear on touch devices                                         |

The game saves automatically after every battle and map change (browser
local storage). Start over from the menu.

### The adventure so far

1. **Mossvale Village** (start): Elder Rowan, Farmer Bea, Pip and a stall keeper.
2. **The Realm** (overworld): slimes, wolves and goblins guard the roads.
3. **Brightwater Town**: shop, smithy, inn, a sage, a collector and Captain
   Vale, who holds the pass to the caves.
4. **Moon Caves** (two floors): bats, wisps, golems, a sealed chest, a hermit
   and the Moon Wyrm boss.
5. **Sunken Ruins**: sealed for now. This is where the next region goes.

### Challenge types

| Type     | Who           | Win condition                                                       |
| -------- | ------------- | ------------------------------------------------------------------- |
| Combat   | Monsters      | Reduce the enemy to 0 HP. Lines deal damage; the enemy casts magic. |
| Offering | Quest NPCs    | Hold the item and score N points within P pieces.                   |
| Barter   | Traders       | Clear N crystals of the requested colours within P pieces.          |
| Haggle   | Shopkeepers   | Survive P pieces; your clears lower the price, time raises it.      |
| Puzzle   | Sages, chests | Clear N lines from a preset board using a fixed set of pieces.      |

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the full rules and the
reasoning behind them.

## Project layout

```
src/
  core/      Falling-block engine: board, pieces, seeded RNG, scoring (no DOM)
  battle/    Battle runner plus one rules module per challenge type
  game/      Hero, rewards, encounters, shops, save/load
  world/     Map model, tile legend, game state, movement
  data/      All content: enemies, spells, items, NPCs, shops, maps
  ui/        Canvas renderers, dialogs, sprite registry, app controller
tests/       Vitest unit tests, one file per area
public/assets/manifest.json   Maps sprite keys to image files
```

Logic in `core`, `battle`, `game` and `world` is pure TypeScript with no
browser APIs, so it is fully unit-tested. `ui` is the thin browser layer.

## Adding content

All content is data. No logic changes are needed for:

- **An enemy**: add an entry to `src/data/enemies.ts`. Its `moves` decide its
  magic (`attack`, `curse`, `haste`, `heal`, `drain`).
- **An NPC**: add an entry to `src/data/npcs.ts` with a `challenge` and
  `rewards`, then place it on a map in `src/data/maps.ts`.
- **A map**: draw rows with the legend in `src/world/tiles.ts`, add `warps`
  and `entities`, and link it from another map.

`tests/data.test.ts` checks every map is rectangular and reachable, every
reference exists, every offered item can be found, and every puzzle can
be solved. Add a solution to `PUZZLE_SOLUTIONS` for each new puzzle.

## Adding art

Until real art is loaded, everything is drawn in code as placeholders. To
use real images, put them under `public/assets/` and list them in
`public/assets/manifest.json` by sprite key:

```json
{
  "monster.slime": {
    "src": "monsters/slime.png",
    "frameWidth": 64,
    "frameHeight": 64,
    "frames": 8,
    "fps": 8
  },
  "tile.grass": { "src": "tiles/grass.png" },
  "hero.down": { "src": "hero/walk.png", "frameWidth": 32, "frameHeight": 32, "frames": 4 }
}
```

Sprite keys come from the data files: `sprite` on enemies and NPCs,
`sprite` on tiles, and `hero.<up|down|left|right>` for the hero. Any key
without an image keeps its placeholder.

## Credits

- Gameplay prototype: `mana_crystals.html`.
- Monster sprites (when added): [ElvGames](https://elvgames.itch.io), used
  under the ElvGames licence. Do not redistribute the raw asset files.
