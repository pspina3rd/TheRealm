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
