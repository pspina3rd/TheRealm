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
