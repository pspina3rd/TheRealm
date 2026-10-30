# Build and writing log

Checkpoint work in small commits and push regularly. Agents save drafts to
files as they work; the coordinating agent commits only the files in each
checkpoint, so unfinished work is preserved without depending on a chat summary.

## 2026-10-28 · Second-half dialogue

- Baseline: GetPutTaco `c6b9e29`; character foundations and 18-scene treatment
  already saved. Production script and game code are unchanged by this phase.
- Checked team head `d14b3c4`. `STORY.md` is unchanged from `fe5c3e4`;
  `ENCOUNTER_DESIGN.md` supplies Irdrath, the seven Lishal singers, and the
  Malificat. Align the new writing with those names. Its second-half encounter
  mechanics are explicitly a non-binding appendix, not implemented requirements.
- In progress: descent dialogue (scenes 02–08), depths dialogue (09–13),
  return and ending dialogue (14–18), and independent voice/continuity review.
- Current working proposals remain labelled: Fennick's connection to Vesper,
  the new residents, ritual details, and Vesper surviving the final battle.
- Next checkpoint: aligned character/scene documents and the first saved
  dialogue sections. Then complete the script, resolve review findings, and
  validate links, sequence, and preservation of existing writing.

### Checkpoint 1 · writing saved during work

- Pushed the work log and dialogue entry point as `0e9383f`.
- Descent writer saved early sections before continuing; depths writer saved
  scene 09 first, then completed 09–13. Return scenes 14–15 are saved.
- Review found existing team cast names that can replace new duplicate roles:
  Odile replaces Neri; Ketter replaces Tams and is the rescued worker in
  scene 07. Their proposed occupations and motivations remain new writing.
- Remaining: complete descent and ending, align the planning documents with
  those names and boss identities, then resolve independent review findings.

### Checkpoint 2 · full dialogue sequence saved

- Pushed the first dialogue batches and initial review as `2a1e3f9`.
- All new scenes 02–18 are now drafted. Scene 01 preserves the team's Wyrm
  fall and chapter hook. The return includes the existing mentor lines.
- Independent descent/depths review resolved the procedure-discovery timing,
  Vesper's available retreat, Ketter's introduction, and Irdrath/Lishal voices.
- The ending prepares the brass lantern before its Resurrection moment;
  “Ves, en.” is quoted from the encounter appendix without a translation.
- In progress: final return/rite review and alignment of the planning docs.
  Nothing from the proposed second half has been added to production code.

### Final writing checkpoint · review resolved

- Pushed the complete dialogue sequence before final review as `6e456f5`.
- Completed scenes 02–18 across three script files, indexed by
  [DIALOGUE_DRAFT.md](DIALOGUE_DRAFT.md). Scene 01 retains the team's existing
  Wyrm fall and Chapter One ending.
- Aligned character foundations, regional outline, and scene treatment with
  Irdrath, the seven Lishal singers, the Malificat, Odile, and Ketter. Removed
  the competing invented boss/resident names from active planning.
- Independent final review found no remaining blocking voice or continuity
  issues after revisions. Findings and resolutions are saved in
  [REVIEW_NOTES.md](dialogue/REVIEW_NOTES.md). This is a writing-draft verdict,
  not a claim that proposed mechanics or story choices are approved.
- Validation: scenes 02–18 occur once in order; local document links resolve;
  all seven mentor speeches match the team source verbatim; whitespace checks
  pass. First-half STORY.md, production code, and tests remain unchanged.
- No runtime tests were needed for these documentation-only changes.
- The writing pass is complete. Gameplay implementation of the proposed
  second half, encounter tuning, rotating NPC barks, and playtesting are
  separate remaining work; this checkpoint does not claim those are done.

## Resuming safely after a limit or restart

Start with this log, `git status --short`, and the remote GetPutTaco head.
Read the dialogue index and final review before changing the script. Confirm
the latest team source before carrying forward names or mechanics. Commit
each working step and push the checkpoint with an expected-head check;
never force past someone else's branch update. Agents save to their assigned
files; the coordinator commits named paths and publishes committed snapshots.

## 2026-10-28 · Playable campaign implementation

### Team reconciliation checkpoint

- Reconciled the team's 15 commits through `d14b3c4`, including the opening,
  Refusal, author name changes, expanded mentor rows, Chapter One hook,
  once-ever Focus Stone receipt, v9 saves, held toasts, and input fixes.
- Preserved this branch's quota-readable saves, old Sunken Ruins recovery,
  pause/focus regressions, and richer resource-conserving progression harness.
- Independent agents resolved save, UI, and simulation conflicts and saved
  their changes before testing. Combined `npm run check` passes: formatting,
  lint, types, and 843 tests; 3 report/simulation tests intentionally skipped.
- Next: wire a playable second-half route using existing encounter systems,
  saved scene gates, distinct boss milestones, and final campaign completion.
  Tentative phased encounter designs remain separate from this first playable
  extension. Engineering contract is in [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md).

### Playable continuation checkpoint

- Team reconciliation was pushed as `238eff1`. Preserved the subsequently
  added `Improvement Recommendations` file from remote head `d4e8d7d`.
- Added eight explorable maps, 30 ordinary encounters, four distinct boss
  encounters, eight mandatory resident/rite tasks, two supply/rest points,
  and the saved scene sequence through recovery. This is a first playable
  extension using existing challenge systems, not the proposed bespoke phases.
- The Wyrm still completes Chapter One. Irdrath, Vesper's duel, the Lishal,
  Fennick's rite, and the Malificat remain separate milestones. Only the
  earned Malificat victory after the rite awards `campaignComplete`.
- Version 10 saves preserve old adventures and once-ever rewards. Old
  Wyrm-complete saves can start the continuation; interrupted scenes replay.
  Final recovery returns the hero outside the sealed inner ward.
- Route fixtures earn gates through production task/battle resolution for
  all four classes, using legal authored puzzle inputs. Combat fixtures use
  prepared clears and are explicitly not a balance or human-playtime proof.
- `npm run check` passed formatting, lint, typecheck, and **904 tests**;
  five diagnostic/report tests were intentionally skipped. Production build
  also passed. Browser fixtures rendered all eight maps without errors at
  1280×900, 390×844, and 360×640, and verified threshold replay and durable
  version-10 reload. Final battle-to-ending UI check follows this checkpoint.
- Combat diagnostics are saved in [CAMPAIGN_BALANCE.md](CAMPAIGN_BALANCE.md)
  and [CAMPAIGN_BALANCE_FOLLOWUP.md](CAMPAIGN_BALANCE_FOLLOWUP.md). They expose
  slow-pace difficulty and casting-policy confounders; no balance targets,
  equal-half playtime, or full-route affordability are claimed as verified.
- NPC speaker metadata is separate from actual challenges. Real person
  tasks preserve attitude dialogue and optional gifts without gating progress.
  New task reward icons are present; original first-half entity ordering and
  author-written scenes remain intact.

### Ending verification and recommendations review

- The playable continuation was pushed as `3edb994`. The original
  `Improvement Recommendations` file remains unchanged.
- Reviewed every recommendation against current code and the team's encounter
  plan; saved priorities and conflicts in [IMPROVEMENT_REVIEW.md](IMPROVEMENT_REVIEW.md).
  Corrected the file's old postgame premise in the assessment: the Wyrm is
  Chapter One, while the Malificat earns full-campaign completion.
- Added production-App DOM integration coverage for the final victory result,
  recovery, the single campaign summary, saved-result reload, and the sealed
  ward. These tests use mocked canvas/time and prepared combat clears; the
  later browser end-to-ending rerun remained blocked by sandbox socket access.
  Earlier desktop/phone render and reload fixtures passed as recorded above.
- Final `npm run check`: formatting, lint, types, and **906 tests passed**;
  five optional diagnostics/report tests skipped. `npm run build` passed.
  `npm run coverage` passed the configured **100% line coverage** requirement
  for measured logic layers (UI rendering/controller files are excluded by
  the existing coverage configuration). Branch coverage was 95.71%.
- Updated README and writing/design status links to distinguish the playable
  adaptation from the full treatment and tentative bespoke battle mechanics.
- Remaining gameplay work is explicit: investigate slow-pace combat and real
  route preparation, implement encounter identity through the team's staged
  plan, and assess story/pacing in human playtests. New class rules, haptics,
  audio, and replay modes were reviewed, not silently implemented.

### Fresh team alignment check

- Rechecked the other branch at `f17985d` after the author asked for explicit
  confirmation. The earlier `d14b3c4` is an ancestor of this branch through
  merge `238eff1`, but 16 newer team commits are not yet integrated.
- Read the new team build log and approved `ENCOUNTER_ADDENDUM.md`. Reactions,
  passive class abilities, and mentor synergy are approved M2a scope after the
  M1 playtest checkpoint; the recommendation review now reflects that decision.
- Identified independent save-version-10 changes on both branches and the
  team's corrected combat-simulator landing-origin calculation. Both require
  reconciliation before further balance tuning. Existing balance samples are
  historical and must not be represented as results from the corrected engine.
- No claim is made that the latest M0/M1 encounter work is already merged.
  The immediate engineering priority is to reconcile that work before adding
  more mechanics, preserving both build logs and both sets of save progress.

## Imported team encounter-build log through f17985d

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

## Current reconciliation

- Reconcile the team's encounter foundations and hooks before enabling the M1 slice.
- Both independent save-v10 formats migrate to unified version 11.
- Preserve the playable continuation, its earned gates, interrupted scenes, and final recovery.
- Retain the corrected simulator landing origin before using new balance samples.
- M2a follows the author's M1 playtest go/no-go; approved hooks remain behavior-off until then.

Reconciliation verification: 1,041 tests passed, 6 skipped; format, lint and
typecheck passed. Production build passed. Save migration fixtures cover both
version-10 origins, campaign gates, interrupted scenes, and bounded seals.
The player-facing M1 wiring is still pending; the merged hooks alone are
not a completed encounter slice.

## Player-facing M1 functional checkpoint

- Connected six NPC verbs, Win/Ask/Fail/Retry cards, free Browse, committed
  first-input saving, one-time settlement, retry gates, Vale assistance, and
  Hazel lessons. Preserved campaign/finale routes.
- Added board skins, zones and tags, lamps, Ordor price/pending display,
  numbered face/bark events, isolated dark rendering, saved map props, and
  Sevenstones grove feedback.
- Verification: 1,063 tests pass, 9 skipped; format, lint and typecheck pass.
- The 200-seed balance report in M1_PLAYTEST.md fails multiple approved
  bands. This checkpoint is functional work, not M1 acceptance.
- Browser capture unavailable: Vite localhost listen and Chromium setsockopt
  denied by sandbox. Extra-network execution stalled, then was cancelled;
  no new phone screenshot is claimed. DOM integration fixtures pass.
- Follow-up: persist interrupted-attempt failure costs, prevent Hazel
  uncommitted combat timing, diagnose balance, complete real visual review.

## Interrupted-attempt and hazard correctness checkpoint

- Save v12 persists committed attempts, settles reload abandonment once,
  and writes recovery immediately. Migrates v1–11, including both v10 forks.
- Hazel waits for actual piece/spell/item input; assisted failures lose
  regard. Ordor reload and Give up apply the same markup and strain costs.
- Wren spreads only within the warned frontier. Recorded real-input wins
  cover Rowan and Wren, with the real starter dual-piece chance.
- 1,077 tests pass, 9 skipped; format, lint, typecheck and build pass.
  Wren 200-seed rerun remains outside balance bands (45% good, 0% casual).
- New screenshots remain blocked by sandbox socket restrictions. Existing
  phone integration fixtures do not substitute for a browser layout review.
- Engineering version sequence: reconciliation v11; committed attempts v12;
  future M2a needs the next version, without changing the approved design.

## Latest team checkpoint imported for reconciliation

Team head: `5aa90cd220b1c694824eeb8e2fe8a422c4fa05cb`. The following
log is preserved as their report; its smoke evidence belongs to their tree.
Our combined tree still requires its own checks and visual review.

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

| Date   | Commit                    | Done                                                                                                                                                                                                        | Next                           |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Oct 28 | —                         | Read the spec and code; wrote the plan                                                                                                                                                                      | Step 1                         |
| Oct 28 | 6116516                   | Step 1: board tags, narrow spawn, clears off, controlled supply, pushed rows                                                                                                                                | Step 2                         |
| Oct 28 | b741551                   | Step 2: `ENCOUNTERS`/`STAKES`/`REGION_RULES` data; stakes rules (regard, strain, retry, day, prices); spell seal replaces category locks; help clamp 5–35%; save v10 with zeroed-stakes migration from v1–9 | Step 3: verbs                  |
| Oct 28 | 0951af3, ec9d156          | Step 3 (WIP): verbs DIG/BUILD/PLANT/DUEL/CONTAIN/CHARGE, encounter defs, Battle pre-roll/demo/assist/faces/give-up; encounter sim harness (`npm run sim ENCOUNTERS=…`)                                      | Tune boards via sims           |
| Oct 28 | 6a580e6                   | Sim bots aim at spawn like touch players; fixed the landing-origin bug in bot execution (O pieces landed a column off; the old fight sim has it too); survival (El-Tetris) judge for the good bot           | Hooks                          |
| Oct 28 | 8d5b1ae                   | Addendum hooks: `Battle.pushRows` (all pushes, with source flags), telegraph `leadPieces`, last-two-locks surge history, `holes` event, neutral cell kind, sim `CLASS`                                      | Fix kid/guard sims; verb tests |
| Oct 28 | 85ffa23, 66deb36          | Lessons: mentor's shield (only the taught spell breaks it), lent spell, sealed spells blocked in fights; spores and dark rules; tests for verbs and battle systems                                          | Feasibility gate               |
| Oct 28 | fdd782d                   | Feasibility gate: queue solver (Pip: 1–4 classes, greedy fails), shape-fit (Bean's furrows), supply rule, overlay budget                                                                                    | Encounter flow                 |
| Oct 28 | d177d29 + tests           | Encounter flow: Stakes card, settled tries (half pay, assist, Great), browse shops + Ordor's once-a-day haggle; haggle challenge removed; lesson retry rule; fights ease the seal                           | Step 7: UI                     |
| Oct 28 | 154e147                   | Tests for the encounter flow                                                                                                                                                                                | UI                             |
| Oct 28 | 905af08                   | Step 7: UI: Stakes card, browse/haggle dialog, frame objective, board skins and overlays, faces and lines, give up, world props, the Sevenstones stones                                                     | Feasibility re-authoring       |
| Oct 28 | c245398, f4a2625, 3fac26e | Rowan's well re-authored to five rows (good bot inside its band); one hint weight for both bots; Playwright smoke script                                                                                    | Wren                           |
| Oct 28 | 4118ae6                   | Wren's ring re-authored to five rows; CONTAIN hint in the stacker's units                                                                                                                                   | Vale                           |
| Oct 28 | 53340cd                   | Vale CHARGE hint (purity within the spare); good bot ~15%, band missed                                                                                                                                      | Docs, 200-seed sims            |
| Oct 28 | c0ba7bf                   | STORY.md: encounters' draft lines; import test checks them word for word                                                                                                                                    | GAME_DESIGN                    |
| Oct 28 | 62aa196                   | Fight sim: grove monsters with spores; Hazel's lessons in the lesson rows                                                                                                                                   | Docs                           |
| Oct 28 | 600e562, 68a1b70          | Step 8 docs: GAME_DESIGN encounters section, browse shops, seals, save v10; README                                                                                                                          | Sim tables, smoke, report      |
| Oct 28 | a94217b, b186592          | 200-seed encounter, grove and lesson tables in GAME_DESIGN; sim bot casts the taught spell through a lesson's shield; smoke rerun (52 shots, no console errors)                                             | Report                         |

## Team 5aa90cd integration verification

- Reconciled all 21 commits after f17985d using the actual ancestor.
  Preserved the campaign, earned gates, finale, save v12 recovery, first-input
  commitment, one-time settlement and CONTAIN warning correction.
- Adopted revised Rowan/Wren boards and hint units, M1 NPC definitions,
  Browse-only keepers, richer stakes incentives, pixel reactions, planting
  sun, protected mushroom art, rival meter, seven hub stones, authored
  encounter lines, simulator changes and portable smoke tooling.
- Kept Hazel as the M1 lesson slice. Legacy haggle and shop-reward types
  remain for campaign compatibility; new keepers use the team shop field.
  Repeat pay halves item counts as well as gil.
- Refreshed fixed public-input/RNG replay proofs for Rowan, Wren and Vale.
  Updated the progression benchmark to pay actual Browse prices.
- 1,082 tests passed, 11 opt-in/report skips; formatting, lint, typecheck,
  production build and whitespace checks passed.
- Fresh 200-seed tables remain outside acceptance bands. No M1 or M2a
  acceptance is claimed. Combined-tree browser capture remains blocked.

## Subsequent team tuning checkpoint

The following is the team’s log at 5fe2859. It includes the author’s Oct 29
bot definitions, Vale purity/supply decision, Pip pacing and tuning set.
These supersede the earlier policy diagnostics.

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

| Date   | Commit                             | Done                                                                                                                                                                                                                                         | Next                                                                                      |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Oct 28 | —                                  | Read the spec and code; wrote the plan                                                                                                                                                                                                       | Step 1                                                                                    |
| Oct 28 | 6116516                            | Step 1: board tags, narrow spawn, clears off, controlled supply, pushed rows                                                                                                                                                                 | Step 2                                                                                    |
| Oct 28 | b741551                            | Step 2: `ENCOUNTERS`/`STAKES`/`REGION_RULES` data; stakes rules (regard, strain, retry, day, prices); spell seal replaces category locks; help clamp 5–35%; save v10 with zeroed-stakes migration from v1–9                                  | Step 3: verbs                                                                             |
| Oct 28 | 0951af3, ec9d156                   | Step 3 (WIP): verbs DIG/BUILD/PLANT/DUEL/CONTAIN/CHARGE, encounter defs, Battle pre-roll/demo/assist/faces/give-up; encounter sim harness (`npm run sim ENCOUNTERS=…`)                                                                       | Tune boards via sims                                                                      |
| Oct 28 | 6a580e6                            | Sim bots aim at spawn like touch players; fixed the landing-origin bug in bot execution (O pieces landed a column off; the old fight sim has it too); survival (El-Tetris) judge for the good bot                                            | Hooks                                                                                     |
| Oct 28 | 8d5b1ae                            | Addendum hooks: `Battle.pushRows` (all pushes, with source flags), telegraph `leadPieces`, last-two-locks surge history, `holes` event, neutral cell kind, sim `CLASS`                                                                       | Fix kid/guard sims; verb tests                                                            |
| Oct 28 | 85ffa23, 66deb36                   | Lessons: mentor's shield (only the taught spell breaks it), lent spell, sealed spells blocked in fights; spores and dark rules; tests for verbs and battle systems                                                                           | Feasibility gate                                                                          |
| Oct 28 | fdd782d                            | Feasibility gate: queue solver (Pip: 1–4 classes, greedy fails), shape-fit (Bean's furrows), supply rule, overlay budget                                                                                                                     | Encounter flow                                                                            |
| Oct 28 | d177d29 + tests                    | Encounter flow: Stakes card, settled tries (half pay, assist, Great), browse shops + Ordor's once-a-day haggle; haggle challenge removed; lesson retry rule; fights ease the seal                                                            | Step 7: UI                                                                                |
| Oct 28 | 154e147                            | Tests for the encounter flow                                                                                                                                                                                                                 | UI                                                                                        |
| Oct 28 | 905af08                            | Step 7: UI: Stakes card, browse/haggle dialog, frame objective, board skins and overlays, faces and lines, give up, world props, the Sevenstones stones                                                                                      | Feasibility re-authoring                                                                  |
| Oct 28 | c245398, f4a2625, 3fac26e          | Rowan's well re-authored to five rows (good bot inside its band); one hint weight for both bots; Playwright smoke script                                                                                                                     | Wren                                                                                      |
| Oct 28 | 4118ae6                            | Wren's ring re-authored to five rows; CONTAIN hint in the stacker's units                                                                                                                                                                    | Vale                                                                                      |
| Oct 28 | 53340cd                            | Vale CHARGE hint (purity within the spare); good bot ~15%, band missed                                                                                                                                                                       | Docs, 200-seed sims                                                                       |
| Oct 28 | c0ba7bf                            | STORY.md: encounters' draft lines; import test checks them word for word                                                                                                                                                                     | GAME_DESIGN                                                                               |
| Oct 28 | 62aa196                            | Fight sim: grove monsters with spores; Hazel's lessons in the lesson rows                                                                                                                                                                    | Docs                                                                                      |
| Oct 28 | 600e562, 68a1b70                   | Step 8 docs: GAME_DESIGN encounters section, browse shops, seals, save v10; README                                                                                                                                                           | Sim tables, smoke, report                                                                 |
| Oct 28 | a94217b, b186592                   | 200-seed encounter, grove and lesson tables in GAME_DESIGN; sim bot casts the taught spell through a lesson's shield; smoke rerun (52 shots, no console errors)                                                                              | Report                                                                                    |
| Oct 28 | fcdcc5b, 5bf5f3e, 64b23ff, cf9fbd0 | Tuning diagnosis: sensitivity harness (tests/sim/diagnose.test.ts) and bot-realism knobs (NOISE, GHOST, GOOD_NOISE, CASUAL_JUDGE, CASUAL_HINT; defaults as specced); findings in the scratchpad tuning_diagnosis.md                          | Lead approves proposals                                                                   |
| Oct 29 | 2c877af … d59c555                  | Author decisions adopted (bot definitions, Vale P 6 and window 3, Pip 20–40 s); one planned balance set plus one correction (novice lesson HP, Ordor strain); tests follow; ENCOUNTER_DESIGN and GAME_DESIGN updated with the 200-seed table | Lead: misses that need spec or code (Rowan/Pip casual, floors, Vale assist, lesson d2/d3) |

## October 29 author decisions reconciled

- Integrated team through 5fe2859, including all 13 commits after 5aa90cd.
  Adopted the approved two-ply touch bots and Beginner diagnostic row,
  Vale purity 6 / J-T window 3, Pip 20–40 second target, and tuning set.
- Retained the campaign and v12 recovery. Preserved Wilson bounds,
  incremental JSON reports, demo readiness and legal prior lesson ranks.
- Corrected assisted table construction: clear strain as production does,
  rather than adding a fifth lamp to its diagnostic board.
- Refreshed legal RNG/input replay proofs for tuned Rowan, Wren and Vale.
- 1,082 tests pass, 12 opt-in/report skips; format, lint, typecheck and
  production build pass. Author playtest and combined browser review remain
  pending. The team’s numerical misses are documented, not waived.

Corrected assisted measurements: single-attempt good 81.0% and casual
67.5% (200 seeds each) still miss the official assisted gate. Casual
within-three recovery is 97.5% (195/200), a separate diagnostic. No
production assist mechanic was changed based on the mismeasured row.

## Open-items work: team a4a5ec5

- Imported both new team commits: only replace an incoming piece when
  assistance improves its placement score, ignore completed lamp colors,
  and use per-difficulty lesson foe scaling.
- Preserved campaign and v12 recovery. Baseline: 1,085 tests passed,
  12 skipped, with format/lint/typecheck passing.
- Running fresh 200-seed assist/lesson checks and live Chromium smoke.

## Team f1b14e6 synchronized

Imported the author’s seven-column Rowan well, Pip spare O, revised Ordor
strain and walk-off, Wren timing parameters, and direct afterLanding tests.
Local lesson/assisted-time candidates remain under measurement; no
first-try acceptance is inferred from a three-attempt recovery statistic.

## Approved correction and recovery checkpoint

- Added the author-approved one correction per Rowan/Pip attempt, clearly
  disclosed on cards and a 44px control. Restores grid/tags, dealt piece,
  score/mana and DIG/BUILD state without refunding the attempt or changing
  the remaining bag. Fatal boards wait for Correct or Give up.
- Focused core/UI tests cover hazard rollback, authored queue order, dual
  colors, fatal wobbles, one-use cap, demo/victory/give-up exclusion and
  saved attempt identity.
- Added disclosed assisted placement time. Full 200-seed first-try Vale
  assist: 100% good / 96% casual; dropper/idle 0%. Solo strained retry:
  60% good / 36% casual, both floors met.
- Refreshed public-input/RNG replay fixtures and correction-aware bots;
  corrections use observed landing mistakes, not future information.
- First live Chromium pass succeeded at phone390, phone360 and desktop.
  A later capture exposed a correction-button height inheritance defect;
  it was fixed and is being checked with a board-overlap assertion.
- Final lesson and introductory balance checks remain in progress. M2a
  and author acceptance remain off/pending.

Verified correction/recovery checkpoint: 1,093 tests pass, 17 opt-in/report
skips; format/lint/typecheck/build pass. Chromium completed all three
viewports with six correction actions, no console errors/overflow, and
checks for target size and board/Rotate overlap. Captures and report are
saved under docs/artifacts/m1. Several final balance rows remain running;
this checkpoint does not claim M1 acceptance.

Pip final 200-seed verification passes: 96% good / 67.5% casual,
floors 99% / 64.5%, mean 20 seconds, idle/dropper zero. Wren win rates
and floors pass but mean length remains 54 seconds (target at least 55).
The default Ranger already knows Cure, so its actual d1 Hazel path is
Regen; that profile is being corrected before claiming first-lesson
acceptance. The existing Cure-profile result remains a historical
isolated benchmark, not a first-lesson acceptance claim.

## October 29 — remaining automated M1 gates verified

Saved the final Rowan/Wren/lesson tuning and the approved introductory
correction. The 200-seed encounter profiles now meet the remaining
first-try, retry-floor, duration, assist and price requirements. Exact
cells and intervals are tracked in `artifacts/m1/balance-final.json`;
`M1_PLAYTEST.md` identifies synthetic-kit and human-playtest limits.
The first Ranger lesson profile now uses offered Regen, and the bot
prioritizes the visible lesson shield request before spending its mana.
Regression tests cover that choice and adjacent openings in retry debris.
Recorded legal-win fixtures refreshed; 1,096 tests pass, 17 optional/report
cases skipped; check/build pass. Browser phone/desktop evidence is saved.
Team branch rechecked at f1b14e6, still aligned. Author go/no-go remains
pending; M2a stays off.

## October 29 — board magic playable workshop checkpoint

Implemented the approved deterministic resolver, durable owned obstructions,
sequential edge-color contacts, neutral Ice/Nature cells, elemental targeting,
preview/commit, six character-targeted Arcane pairings and XP-funded pair ranks.
Character placement events are independent of player locks. Save v13 retains all
older migrations and committed-try recovery; board corrections restore obstruction
state and character effects. Existing healing and Shadow Drain remain intact.

The isolated workshop is playable with `npm run dev` at `/workshop.html`. It uses
its own save namespace and practice resources. Main-game wiring is behind the
`boardMagicEnabled` rollout flag, which is not granted to adventure saves yet:
the approved plan requires hands-on workshop review before broad activation.
No campaign-wide new balance acceptance is claimed from the workshop fixture.

Checkpoint verification: 1,113 tests pass, 17 optional/report cases skipped;
format/lint/typecheck pass. Workshop Chromium checks pass at 360x640, 390x844 and
1100x900: actual elemental cast, Arcane creation/upgrade/cast, reduced motion,
44px controls, no horizontal overflow or page errors. Browser evidence is kept
in `/tmp/magic-browser`; a tracked report and final instructions follow.

## October 29 — workshop hardening and final review evidence

Added pinned-row tracking so removing the final surviving obstruction collapses
its cleared row without another payout. Nature conversion removes hazard tags;
fresh color contact weakens and advances the sequence. Added actual lesson
conversion targets, independently delayed interference telegraphs, safe active-
piece collision rollback, and selected opt-in Slime/Goblin variants. Ice delays
only the next placement packet; later packets and ordinary attacks keep their
own timing. Legacy Purify/sweeps cannot bypass owned obstruction strength.

Targeting now hides irrelevant direction/row controls and describes the affected
character's pending Arcane effect. Cancel, keyboard routing and dark-preview
masking are covered; multi-touch edges smoothly cycle their sequence colors and
respect reduced motion. Save/correction and existing campaign behavior remain
covered. Final: 1,127 tests pass, 17 optional/report cases skipped; required
check/build pass. Workshop and original M1 browser checks pass at both phone
sizes and desktop; tracked evidence is under `artifacts/board-magic`.

GetPutTaco's playable workshop checkpoint was pushed before this hardening pass.
The remaining acceptance is the author's workshop playtest before broad campaign
activation and new balance retuning, as required by the approved plan. Existing
M1 author acceptance and M2a remain separate; neither is silently marked done.

## October 29 — replace the confusing spell workshop interface

Responded to the author's hands-on feedback by replacing spell/rank dropdowns,
row sliders and casting dialogs with spell buttons and direct targeting on the
main board. Added seven authored, solvable exercises with an explicit goal,
remaining progress, result preview and completion/next action. Default practice
is untimed and enemy pressure is off. Live practice and progression controls are
optional. Practice Arcane pairs are available without a prerequisite grind.

Each exercise has a real rank-one engine solution test; Nature's goal requires
conversion rather than destruction. Browser coverage completes all seven goals
at phone and desktop sizes and asserts that the cast controls do not cover the
board. Existing main-campaign activation remains behind the same rollout flag.

## October 29 — restore shared controls and improve block artwork

Follow-up superseding the earlier untimed workshop default: restore live play,
the full board, falling piece and landing ghost. Use the adventure's keyboard and
touch bindings, including Down Arrow and held movement buttons. Selecting a spell
pauses for explicit aiming, with a quantified preview and Cast/Cancel actions.
The UI/UX specialist review identified the cropped board, hidden movement
controls and disconnected touch gestures; the revised phone layout keeps the
whole board and 44-pixel controls visible.

Replace the workshop's placeholder HTML visuals with the adventure's BoardView,
next-piece renderer, pixel spell icons and Slime artwork. Improve shared block
faces with clipped corners, facets, beveled edges and smaller elemental glyphs.
Blank blocks are colorless; stone has texture and damage cracks, retaining
strength pips and colored contact indicators. Gameplay rules are unchanged by
this artwork pass. Checks cover actual phone touch gestures, held Down, keyboard
movement, aim/cast/cancel, and the main adventure regression.

## October 29 — rebuild the encounter composition

Responded to the author's layout feedback with distinct desktop, portrait touch,
and short-landscape arrangements. Spells and mana remain beside the board; Slime
has a recognizable portrait and an action timer. Casting details, target/result,
comparison, Cancel, and confirmation share a persistent action area. Movement
controls retain their positions while aiming and are disabled during the freeze.
The six spell buttons and Elements/Arcane tabs stay visible.

Retained explicit confirmation while validating the layout. Useful target rows
light up; copied board state shows the result using game artwork, and Before /
Result comparison never mutates the real board. Spell buttons show cost and held
mana, with Arcane's additional resource displayed separately. The story remains
the place to introduce spells; this fixture does not replace those scenes.

The AI game UI/UX review and saved evidence are documented in
`WORKSHOP_UI_REVIEW.md`. Touch interaction checks cover two phone sizes; separate
checks cover tablet, wide desktop, and two landscape sizes, including Wind and
Arcane. The full automated suite, lint, and build passed. Hands-on author
acceptance remains open; campaign activation is unchanged.

## October 29 — prevent unintended enemy assistance

Confirmed the accidental help came from hostile placements running the full row
resolver and from a hidden 12-second blank-block helper in the workshop. Removed
the helper. Hostile placements now preserve a gap instead of completing a row,
including the last cell of a multi-cell batch, and skip the row-clear phase.
They therefore cannot grant immediate mana/score/damage or leave a completed row
waiting to reward an unrelated player placement. Explicit helpful placement and
player-driven Arcane Nature/Gravity counterplay retain their effects.

Regression coverage checks strengths 1–3, multi-cell batches, reward isolation,
helpful placement, and intentional Nature/Gravity clears. Recorded the author's
per-line autocasting decision in BOARD_MAGIC_PLAN.md; this checkpoint fixes
unintended assistance without silently enabling the unfinished automatic cast
scheduler or changing the workshop's current manual interaction.

## October 29 — implement line-driven standard autocasting

Added an opt-in battle scheduler and made it the default live workshop mode.
One earned line permits one ready, useful standard cast; multi-line clears
resolve successive casts against updated state. Existing elemental alignment
sets affinity priority, with title/stable order ties. Learned levels and
upgrades control effects and costs; leftover mana is retained. Automatic clears
do not recursively create opportunities, and terminal battles/demos do not cast.
Arcane stays manual. Campaign combat wiring remains behind boardMagicEnabled;
lessons and explicit manual lab exercises keep their teaching interactions.

The standard selection buttons are now read-only readiness/priority/rank cards.
Added automatic cast feedback and a two-line opening to make the behavior easy
to try. Arcane pairing buttons show affordability. Correction snapshots include
automatic cast feedback/counts; no save format change was needed.

Core regression tests cover zero/one/three-line triggers, affinity/reselection,
learned rank and enhanced costs, retained mana, ineffective targets, deterministic
previews, bounded Ice clears, terminal states, manual-standard rejection, and
Arcane isolation. Automated touch/browser checks exercise the default flow at
phone, landscape and desktop sizes, alongside the preserved manual targeting lab.
The full suite, lint and build passed. Author hands-on acceptance remains open.

## October 29 — distinct spell animations and sequential cast playback

Replaced the combined automatic row flash with a target → effect → result
sequence for each cast. The active spell card and affected blocks are marked;
Fire burns, Ice grows into gaps, Lightning strikes/cracks, Nature grows/converts,
Gravity falls and Wind slides. Rows visibly clear/collapse after the spell
changes their cells. Playback uses exact render-only resolver traces, with mana
and mutation committed after the motion, and opponent/input clocks held while
it plays. Reduced-motion playback preserves the distinct stages without travel
or particles. Arcane targeting stays manual and ordinary gameplay rules remain.

Added a development-only six-spell visual workbench and an animated GIF preview.
Core checks reconstruct intermediate/final grids from the animation traces for
all six elements; paced checks cover frozen clocks/input, commit timing, pause
and sequential cast selection. Browser checks capture target/effect phases on
phone, landscape and desktop. Full automated suite, lint and build passed.
