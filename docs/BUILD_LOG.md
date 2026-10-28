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

| Date   | Commit  | Done                                                                                                                                                                                                        | Next          |
| ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Oct 28 | —       | Read the spec and code; wrote the plan                                                                                                                                                                      | Step 1        |
| Oct 28 | 18302af | Step 1: board tags, narrow spawn, clears off, controlled supply, pushed rows                                                                                                                                | Step 2        |
| Oct 28 | (this)  | Step 2: `ENCOUNTERS`/`STAKES`/`REGION_RULES` data; stakes rules (regard, strain, retry, day, prices); spell seal replaces category locks; help clamp 5–35%; save v10 with zeroed-stakes migration from v1–9 | Step 3: verbs |
