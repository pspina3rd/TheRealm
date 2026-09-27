# CLAUDE.md — project context for Claude Code

## What this is

A cozy roguelite RPG about working the call center of **TLC (the
Transportation & Logistical Co-operative)** — the support co-op serving
every guild. Currently a
vertical-slice prototype validating one core loop: imperfect customer
memory shaping future encounters.

**Read `docs/settled.md` before implementing anything.** It records
what has been decided since the 12 September reframe. **[P]** is
Phil's, **[C]** is Claude's unconfirmed inference, **[C·ok]** is an
inference Phil confirmed, **[OPEN]** is unresolved. `LORE.md` and
`PLAN.md` are archived; they describe the logistics-company frame the
reframe replaced.

## File map

| File | What it is |
|---|---|
| `src/gameLogic.js` | **Pre-reframe** — the logistics-company core (shipping tickets, Phantom Inventory) the playable prototype still runs on. Pure, tested simulation core. No UI, no framework, no storage. Every function takes its randomness as an injected `rng` parameter — never call `Math.random()` directly inside a new function; take `rng` as a parameter the way every existing function does. |
| `src/gameLogic.test.js` | Node's built-in test runner (`node --test`), no external test framework. Uses a seeded `mulberry32`-style PRNG (`seededRng(seed)`) for determinism — copy that pattern for new tests rather than inventing another one. |
| `src/CallCenterPrototype.jsx` | Playable React UI. **Duplicates `gameLogic.js`'s logic inline** — artifacts can't `import` a local file, so this is a hand-port, not a real import. Any change to `gameLogic.js` must be mirrored here too, or explicitly called out as drift in your summary. If a phase only touches `gameLogic.js` and doesn't need a UI yet, it's fine to leave the JSX un-mirrored for that phase — just say so. |
| `src/supportCall.js` | The seven causes behind one symptom. No diagnosis step. |
| `src/callCards.js` | The sword call played with cards. **Its dialogue was rejected — parked. Not a reference for tone.** The hand-written calls in `docs/settled.md` are the standard. |
| `src/intake.js` | Superseded by the reframe. Kept for its tests. |
| `docs/settled.md` | The record. The source of truth for design. |
| `archive/` | The pre-reframe `LORE.md` and `PLAN.md`, kept for reference. `LORE.md` and `PLAN.md` at the root are now pointers to it. |
| `index.html` | Dev harness for playing the JSX prototype. Fetches `src/CallCenterPrototype.jsx`, transpiles it in-browser with Babel standalone, and imports it as a blob module; React comes from a CDN via import map. Adds **no** npm dependencies and no build step, on purpose. Needs network on first load and must be served over http — `python3 -m http.server 5173`, or the `prototype` config in `.claude/launch.json`. |
| `package.json` | `"type": "commonjs"` (load-bearing — `gameLogic.js` uses `require`/`module.exports`, and switching to `"module"` breaks the suite until every export is converted). Holds the two commands below as `npm test` / `npm run lint`, plus `npm run serve` for the harness. One dev-only dependency: eslint. |
| `.eslintrc.json` | `eslint:recommended`, CommonJS/Node. Ignores the JSX (it's ESM + JSX syntax and would need a different parser); lint covers every `src/*.js` file, matching the command below. |

## Conventions already established — follow them, don't reinvent

- **Every exported function is pure** with respect to its arguments.
  No mutation of inputs; return new objects. Every existing function
  in `gameLogic.js` follows this — match it.
- **JSDoc on every exported function** — params, return shape, and a
  short paragraph on *why*, not just *what*, when the reasoning isn't
  obvious from the code alone. Look at `recallMemory()`'s doc comment
  for the expected depth.
- **Randomness is always injected**, defaulting to `Math.random` at
  the public API boundary, never called bare inside logic.
- **Lint**: `npm run lint` (a plain `eslint:recommended` config,
  `.eslintrc.json` at repo root). Run `npm install` first if
  `node_modules` isn't present — eslint is the only dependency and it's
  dev-only. Must pass clean before a phase is done.
- **Tests**: `npm test` runs all four suites in `src/`. Every new pure
  function needs real tests, including edge cases and at least one
  test that would have caught a plausible mistake — not just a happy
  path. (A past session caught a real bug this way: `generateShift()`
  silently dropped customers who sat out a shift, via a 60-shift
  simulation script, not the unit tests alone. Consider a similar
  multi-shift smoke script for anything touching shift-to-shift state
  — `pendingFollowUps`, `fullRoster`, or any new persistent layer.)
- **No new dependencies** unless the work genuinely requires one — this
  has stayed dependency-free (plus a dev-only `eslint`) on purpose.
- **Logic before UI.** Pure logic in `src/`, with tests and lint clean,
  before touching the JSX prototype.
- **Decisions go in `docs/settled.md`, only when Phil approves them**
  ("fold it in"), using its tags. Never write a conclusion into the
  record on your own.
