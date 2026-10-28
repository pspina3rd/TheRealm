# Playable campaign QA

Working verification record, saved while implementation is in progress.

## Scope

The reconciled first-half baseline passed 843 tests before campaign work.
This pass checks the new route, earned gates, legal puzzle inputs, failure
and retry paths, scene ordering, all-class access, and final completion.
It does not establish an equal-length second half or prove balance from
graph reachability alone. The tentative encounter appendix's new phased
mechanics are outside the existing-challenge implementation.

## Saved automated verification

- `tests/campaign.test.ts`: seven integration tests cover a pre-Wyrm locked
  route, all four classes earning the complete continuation, task and boss
  failure with retry, and essential tasks offered with hostile alignment and
  no required inventory. No mentor lessons are taken in those route fixtures.
- Routes walk using production `step` and `travel`, including locked exits
  and interactions. Mandatory task flags come from `resolveBattle`; scene
  gates come from `finishScene`. The fixture begins at a Wyrm victory and
  is explicitly not a playthrough of the first half.
- Fixed-queue task puzzles use recorded normal inputs. Barter and combat
  use prepared line-clear fixtures, with no elapsed enemy time. Their wins
  verify production accounting/resolution; they do not prove balance or
  player attainability. No campaign milestones are injected to bypass gates.
- Save/reload after the Vesper duel retains earned progression. Irdrath,
  the Vesper duel, and the Lishal do not complete the campaign. The earned
  Malificat victory after the rite does, and survives reload.
- `tests/data.test.ts` includes every new recorded puzzle solution and an
  explicitly abstract content graph test that accounts for scene and boss
  flags, rather than pretending NPC rewards alone open the whole world.
- Targeted run: **96 tests passed** across those two files. Formatting and
  owned-file whitespace checks pass.

## Findings and limits

- Found the new ascent return warp adjacent to Kestrel's existing hub stop.
  World owner moved the warp from `(18,18)` to `(19,18)`; the existing mentor
  clearance test now passes without changing the authored mentor route.
- Found a postgame continuity issue: the script sealed the inner ward while
  the old entry remained open and the player still stood inside. Runtime
  owner added an atomic recovery-scene return to Sevenstones and a
  completion-gated closed entry. All four earned route fixtures now verify
  that recovery returns outside and that re-entry is locked. Earned rite
  history is preserved rather than cleared to disguise the gate.
- The fixtures can walk around ordinary monsters. Their success neither
  measures second-half playtime nor verifies that a player can afford and
  sustain an appropriate build. Keyboard/touch playtesting and attainable
  progression balance remain distinct checks.

## Combined and UI verification

- `npm run check` passed formatting, ESLint, TypeScript, and 904 tests at
  the playable checkpoint; five optional diagnostics/report tests were skipped.
  Production build passed.
- Chromium fixtures at 1280×900, 390×844, and 360×640 rendered every new map
  without page errors or horizontal overflow, replayed the interrupted threshold
  scene, and retained the version-10 adventure through reload. These fixtures
  injected a Chapter One starting state and map arrivals; they are not a human
  playthrough or evidence of campaign affordability.
- The later final-battle browser rerun was blocked by sandbox socket access.
  Two production-App DOM integration tests were added to `storageUi.test.ts`:
  victory results lead through recovery before exactly one campaign summary;
  the hero returns outside the sealed ward; a reload at the victory result
  resumes the ending; a later reload does not repeat its summary. Both pass.
  Canvas drawing and time are mocked in those tests, and combat uses prepared
  clears with no enemy elapsed time. They do not replace a touch playtest.
- Runtime migration/lifecycle tests cover old-save entry, interrupted scenes,
  reward idempotence, earned mentor conditions, and guarded final completion.
- After adding the two ending UI tests, the combined suite passes **906 tests**
  with five optional diagnostics/report tests skipped. Production build passes.
  Coverage passes the existing measured-logic line gate at **100%**; branch
  coverage is 95.71%. Rendering/controller exclusions remain explicit in the
  existing Vitest configuration, so this is not 100% UI or behavior coverage.

## Review follow-through

The original recommendation file is preserved. Its implementation review is
in [IMPROVEMENT_REVIEW.md](IMPROVEMENT_REVIEW.md). It prioritizes the team's
encounter identity and narrative feedback work without adopting conflicting
control-swapping or unreadable placement suggestions.
