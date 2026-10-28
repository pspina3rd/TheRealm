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
