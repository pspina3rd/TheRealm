# Build log: encounter redesign (M0 + M1)

The running log of the encounter build (docs/ENCOUNTER_DESIGN.md, §9 M0 and
M1). One entry per commit, newest last, so a restart can resume exactly.
Branch `encounters-m1`, based on `claude/laughing-brown-7i13lb`.

## Plan

| Step | Contents                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------ |
| 1    | Board foundations: cell tags, narrow-board spawn, clears off, controlled supply, pushed rows           |
| 2    | `ENCOUNTERS`, `STAKES`, `REGION_RULES` data; stakes rules (regard, strain, retry, day, seal); save v10 |
| 3    | Verbs: DIG + rising, BUILD, PLANT, DUEL (scripted), CONTAIN + protect, CHARGE; pre-roll, demo, assist  |
| 4    | Lessons: shield, lent spell, spell seal, help clamp; spores region rule; dark visibility               |
| 5    | Sim harness (good / casual / dropper / idle, 200 seeds, 95% CI), solver, shape-fit and supply checks   |
| 6    | Encounter flow: Stakes card data, resolution with stakes, browse shops, Ordor's haggle                 |
| 7    | UI: Stakes card, frame objective, skins, faces and lines, demos, world props, Sevenstones stones       |
| 8    | Docs (GAME_DESIGN, STORY lines, README), Playwright smoke at 390×844 and 1100×900                      |

## Log

| Date   | Commit           | Done                                                                                                                                                                                                        | Next                           |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Oct 28 | —                | Read the spec and code; wrote the plan                                                                                                                                                                      | Step 1                         |
| Oct 28 | 6116516          | Step 1: board tags, narrow spawn, clears off, controlled supply, pushed rows                                                                                                                                | Step 2                         |
| Oct 28 | b741551          | Step 2: `ENCOUNTERS`/`STAKES`/`REGION_RULES` data; stakes rules (regard, strain, retry, day, prices); spell seal replaces category locks; help clamp 5–35%; save v10 with zeroed-stakes migration from v1–9 | Step 3: verbs                  |
| Oct 28 | 0951af3, ec9d156 | Step 3 (WIP): verbs DIG/BUILD/PLANT/DUEL/CONTAIN/CHARGE, encounter defs, Battle pre-roll/demo/assist/faces/give-up; encounter sim harness (`npm run sim ENCOUNTERS=…`)                                      | Tune boards via sims           |
| Oct 28 | 6a580e6          | Sim bots aim at spawn like touch players; fixed the landing-origin bug in bot execution (O pieces landed a column off; the old fight sim has it too); survival (El-Tetris) judge for the good bot           | Hooks                          |
| Oct 28 | 8d5b1ae          | Addendum hooks: `Battle.pushRows` (all pushes, with source flags), telegraph `leadPieces`, last-two-locks surge history, `holes` event, neutral cell kind, sim `CLASS`                                      | Fix kid/guard sims; verb tests |
| Oct 28 | 85ffa23, 66deb36 | Lessons: mentor's shield (only the taught spell breaks it), lent spell, sealed spells blocked in fights; spores and dark rules; tests for verbs and battle systems                                          | Feasibility gate               |
| Oct 28 | fdd782d          | Feasibility gate: queue solver (Pip: 1–4 classes, greedy fails), shape-fit (Bean's furrows), supply rule, overlay budget                                                                                    | Encounter flow                 |
| Oct 28 | d177d29 + tests  | Encounter flow: Stakes card, settled tries (half pay, assist, Great), browse shops + Ordor's once-a-day haggle; haggle challenge removed; lesson retry rule; fights ease the seal                           | Step 7: UI                     |
