# CLAUDE.md — project context for Claude Code

## What this is

A cozy roguelite RPG about working the call center of **TLC (the
Transportation & Logistical Co-operative)** — the support co-op serving
every guild. Currently a
vertical-slice prototype validating one core loop: imperfect customer
memory shaping future encounters.

**Read `LORE.md` before implementing anything.** It's not optional
flavor text — it's the design rationale for every mechanic in this
repo, including several fully-designed systems that aren't built yet.
`PLAN.md` is the execution order; `LORE.md` is *why* each thing works
the way it does. Implementing from `PLAN.md` alone, without reading
the linked `LORE.md` section, will produce something that technically
works but doesn't match the intended tone or edge cases.

## File map

| File | What it is |
|---|---|
| `src/gameLogic.js` | Pure, tested simulation core. No UI, no framework, no storage. Every function takes its randomness as an injected `rng` parameter — never call `Math.random()` directly inside a new function; take `rng` as a parameter the way every existing function does. |
| `src/gameLogic.test.js` | Node's built-in test runner (`node --test`), no external test framework. Uses a seeded `mulberry32`-style PRNG (`seededRng(seed)`) for determinism — copy that pattern for new tests rather than inventing another one. |
| `src/CallCenterPrototype.jsx` | Playable React UI. **Duplicates `gameLogic.js`'s logic inline** — artifacts can't `import` a local file, so this is a hand-port, not a real import. Any change to `gameLogic.js` must be mirrored here too, or explicitly called out as drift in your summary. If a phase only touches `gameLogic.js` and doesn't need a UI yet, it's fine to leave the JSX un-mirrored for that phase — just say so. |
| `LORE.md` | World facts, design rationale, and — critically — a full "Open Questions" section listing exactly what's designed-but-not-built. Sections are cross-referenced; follow the links. |
| `PLAN.md` | Phased backlog, dependency-ordered, each phase scoped with its `LORE.md` section, code touchpoints, and test expectations. |
| `index.html` | Dev harness for playing the JSX prototype. Fetches `src/CallCenterPrototype.jsx`, transpiles it in-browser with Babel standalone, and imports it as a blob module; React comes from a CDN via import map. Adds **no** npm dependencies and no build step, on purpose. Needs network on first load and must be served over http — `python3 -m http.server 5173`, or the `prototype` config in `.claude/launch.json`. |
| `package.json` | `"type": "commonjs"` (load-bearing — `gameLogic.js` uses `require`/`module.exports`, and switching to `"module"` breaks the suite until every export is converted). Holds the two commands below as `npm test` / `npm run lint`, plus `npm run serve` for the harness. One dev-only dependency: eslint. |
| `.eslintrc.json` | `eslint:recommended`, CommonJS/Node. Ignores the JSX (it's ESM + JSX syntax and would need a different parser); lint covers the two `.js` files only, matching the command below. |

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
- **Tests**: `npm test`. Every new pure
  function needs real tests, including edge cases and at least one
  test that would have caught a plausible mistake — not just a happy
  path. (A past session caught a real bug this way: `generateShift()`
  silently dropped customers who sat out a shift, via a 60-shift
  simulation script, not the unit tests alone. Consider a similar
  multi-shift smoke script for anything touching shift-to-shift state
  — `pendingFollowUps`, `fullRoster`, or any new persistent layer.)
- **No new dependencies** unless a phase genuinely requires one — this
  has stayed dependency-free (plus a dev-only `eslint`) on purpose.

## Working through PLAN.md

Each phase in `PLAN.md` is meant to be handed to a session on its own,
not all at once. Before starting a phase:
1. Read its linked `LORE.md` section(s) in full.
2. Check "Depends on" — don't start a phase whose dependency isn't
   done yet.
3. Implement in `gameLogic.js` first, with tests, lint clean, before
   touching the JSX prototype.
4. Update `LORE.md`'s "Open Questions" entry for that item — move it
   from "not built" to a note that it's implemented, or leave a short
   note if the implementation diverged from the design in some way
   (and say why).
