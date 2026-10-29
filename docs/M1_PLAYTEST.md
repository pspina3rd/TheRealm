# M1 verification and playtest record

**Functional implementation is checkpointed separately from acceptance. The
M1 balance gate fails; the author's go/no-go is still pending. M2a remains
off.** Passing Vitest means a report ran successfully, not that its measured
win rates met the approved targets.

## Team checkpoint chronology

Team `5aa90cd` changes Rowan/Wren to five-row layouts, scales hints into
the bots’ safety units, and supplies additional M1 flow and presentation.
The tables below describe the earlier `f17985d` layouts/policy and are
historical diagnostics after this update, except where explicitly rerun.
They must not be used to claim that the new layouts passed or failed.
Fresh affected cells will be recorded separately.

## Method and reproducibility

All acceptance cells below use **200 deterministic seeds**. Brackets are
**Wilson 95% confidence bounds**. The incoming normal approximation collapsed
to zero width at 0/200 and 200/200; that reporting defect is corrected.

- Good: two pieces deep, 2.2 seconds per piece, survival judge plus the
  challenge's hint (DUEL uses its large-clear judge).
- Casual: no look-ahead, second-best placement 15% of the time, 8% column
  error, 5% rotation error, 2.6 seconds per piece. Its judge is `bestFit`
  plus the same challenge hint. The two safety judges have different scales:
  good weighs the hint 3×, casual 1×; do not mistake this for identical policy.
- Dropper hard-drops at spawn; idle commits once and never acts again.
- Good/casual combat rows share a spell policy and cast the taught spell
  against its raised lesson shield, even for a heal at full HP. No items.
  Primary d3 lessons start with the prior spell rank. Hidden Bloom is actual
  difficulty 2. Earlier malformed d3/hidden diagnostic rows are excluded.
- The team landing-origin correction is retained. The harness waits for both
  piece demos and Ordor's incoming-row demo before aiming or acting.
- No production difficulty values were changed by this QA. Parameter probes
  below modify isolated test-process memory and restore it afterward.

```sh
npm run sim ENCOUNTERS=all RUNS=200 SIM_OUT=/tmp/m1-encounters-200.md SIM_JSON=/tmp/m1-encounters-200.jsonl
M1_SIM=1 RUNS=200 M1_OUT=/tmp/m1-extended-200.md M1_JSON=/tmp/m1-extended-200.jsonl npx vitest run tests/sim/m1.test.ts
M1_LEGACY_COMBAT=1 RUNS=200 M1_OUT=/tmp/m1-grove-legacy-good-200.md npx vitest run tests/sim/m1.test.ts
```

The full six-NPC table completed in 834.5 seconds. Reports now save every
completed row so interrupted future runs retain evidence.

## Six NPC encounters

| Encounter   | Band      | Good               | Casual           | Dropper       | Idle          | Good, strain 2     | Casual, strain 2 | Good: time / pieces | Great (good) | Mean price (good / casual / dropper / idle) | Good fail causes |
| ----------- | --------- | ------------------ | ---------------- | ------------- | ------------- | ------------------ | ---------------- | ------------------- | ------------ | ------------------------------------------- | ---------------- |
| elder       | Mossvale  | 68% [61.2, 74.1]   | 2% [0.8, 5.0]    | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 22% [16.8, 28.2]   | 0% [0.0, 1.9]    | 59 s / 29           | 0%           | —                                           | rule 64          |
| kid         | Mossvale  | 100% [98.1, 100.0] | 1% [0.1, 2.8]    | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 100% [98.1, 100.0] | 2% [0.8, 5.0]    | 20 s / 11           | 0%           | —                                           | —                |
| farmer      | Mossvale  | 100% [98.1, 100.0] | 32% [25.9, 38.8] | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 100% [97.2, 99.9]  | 12% [7.8, 16.7]  | 53 s / 26           | 100%         | —                                           | —                |
| stallKeeper | Haggle    | 80% [73.9, 85.0]   | 1% [0.1, 2.8]    | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 29% [23.2, 35.6]   | 0% [0.0, 1.9]    | 58 s / 27           | 31%          | 88% / 103% / 115% / 111%                    | price 40         |
| forager     | Grove     | 44% [36.8, 50.4]   | 0% [0.0, 1.9]    | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 38% [31.6, 44.9]   | 0% [0.0, 1.9]    | 57 s / 27           | 35%          | —                                           | pieces 113       |
| guard       | Threshold | 3% [1.4, 6.4]      | 0% [0.0, 1.9]    | 0% [0.0, 1.9] | 0% [0.0, 1.9] | 0% [0.0, 1.9]      | 0% [0.0, 1.9]    | 77 s / 36           | 0%           | —                                           | pieces 194       |

These are measurements, compared against [Encounter Design §5.3](ENCOUNTER_DESIGN.md#53-targets):

- Rowan misses the 90–97% Mossvale good band and the stricter 95% random-board
  feasibility gate. His casual success is also far below 60–75%.
- Pip and Bean exceed the good band while casual success is too low. Pip's
  good run is also only about 20 seconds against the 40–80-second target.
- Ordor's good success/mean price are in band, but casual success is too low.
  Idle's mean price is 111%, short of the approved ≥112% consequence.
- Wren and Vale miss their good and casual bands.
- Every reachable casual strain floor misses 25%. Rowan, Ordor, Wren and
  Vale also miss the good floor. All idle/dropper win caps pass.
- The table rounds point estimates to whole percent; intervals retain one
  decimal. A displayed 100% can be 199/200. Use JSON output on future runs
  when exact counts are required.

Vale is a threshold whose saved strain is capped at one. The table's
strain-two Vale column is synthetic; its reachable floor is below:

| Cell                 | Good (95% Wilson) | Casual          | Dropper         | Idle            | Good seconds / pieces | Good fail causes |
| -------------------- | ----------------- | --------------- | --------------- | --------------- | --------------------- | ---------------- |
| guard:strain1 (Lv 2) | 0.0% [0.0, 1.9]   | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 77.0 s / 36.0         | pieces:200       |

All 200 good floor losses exhausted the 36-piece budget. A bot failing to
find a strategy is not a proof that a board is unsolvable; obtain a recorded
legal CHARGE win and validate policy scaling before large layout changes.

## Hazel and grove: four-bot touch policy

| Cell                    | Good (95% Wilson)    | Casual             | Dropper         | Idle            | Good seconds / pieces | Good fail causes |
| ----------------------- | -------------------- | ------------------ | --------------- | --------------- | --------------------- | ---------------- |
| grove:sproutling (Lv 2) | 97.5% [94.3, 98.9]   | 15.5% [11.1, 21.2] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 82.1 s / 37.3         | won:195, hp:5    |
| grove:leafSprite (Lv 3) | 93.5% [89.2, 96.2]   | 27.5% [21.8, 34.1] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 71.6 s / 32.5         | won:187, hp:13   |
| grove:thornTroll (Lv 4) | 92.0% [87.4, 95.0]   | 7.0% [4.2, 11.4]   | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 92.6 s / 42.0         | won:184, hp:16   |
| hazel:d1 (Lv 2)         | 100.0% [98.1, 100.0] | 97.0% [93.6, 98.6] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 81.8 s / 37.2         | won:200          |
| hazel:d2 (Lv 3)         | 100.0% [98.1, 100.0] | 91.0% [86.2, 94.2] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 116.9 s / 53.1        | won:200          |
| hazel:d3 (Lv 5)         | 100.0% [98.1, 100.0] | 80.0% [73.9, 85.0] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 145.4 s / 66.1        | won:200          |
| hazel:hidden (Lv 5)     | 100.0% [98.1, 100.0] | 96.5% [93.0, 98.3] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 131.5 s / 59.8        | won:200          |

All four Hazel good means exceed their approved difficulty bands. Casual
means also exceed their corresponding bands. Difficulty-two, difficulty-three
and hidden lesson lengths exceed the 100-second ceiling. Shield and spores
alone have not brought lessons into the intended difficulty range.

The grove rows above use the new encounter bot. Their casual column is not
the old combat "Sloppy" policy. To assess the **unchanged** approved grove
combat good band (75–85%), the original corrected combat good policy was
also rerun at 2.2 seconds per piece, starter spells, no equipment or items,
and spores:

| Grove foe         | Original good policy (Wilson 95%) | Seconds / pieces | Endings              |
| ----------------- | --------------------------------- | ---------------- | -------------------- |
| sproutling (Lv 2) | 99.0% [96.4, 99.7]                | 55.8 s / 25.1    | {"won":198,"lost":2} |
| leafSprite (Lv 3) | 99.0% [96.4, 99.7]                | 52.9 s / 23.8    | {"won":198,"lost":2} |
| thornTroll (Lv 4) | 99.5% [97.2, 99.9]                | 60.7 s / 27.4    | {"won":199,"lost":1} |

All three original-policy means exceed the 75–85% good target. Older
campaign balance tables with the landing-origin defect are historical
diagnostics, not tuning targets.

## Vale assistance and isolated probes

Assisted Vale casual within three attempts: **13/200 wins (6.5%; Wilson
95% 3.8–10.8%)**, versus ≥90%. Final failures: 147 top-outs, 40 piece-budget
failures. Mean total across up to three attempts: 187.9 seconds / 83.9 pieces.

These are three fresh assisted battle boards after assistance is offered;
the experiment does not simulate intervening monster victories required by
Wait. The assistance offer/toss works; its balance gate does not pass.

All probes below retain four lamps, both colors, 30% assist toss chance,
and the same noisy casual policy. They use **50 paired seed groups**, not
acceptance evidence. Removing wind is a causal diagnostic, not a proposed
shipped mechanic.

| Purity | Wind interval | Piece budget | Original hint | Hint ignores completed colors |
| ------ | ------------- | ------------ | ------------- | ----------------------------- |
| 7      | 14            | 36           | 14%           | 12%                           |
| 7      | off           | 36           | 28%           | —                             |
| 6      | 14            | 36           | 26%           | —                             |
| 5      | 14            | 36           | 28%           | —                             |
| 6      | 20            | 36           | 32%           | 40%                           |
| 5      | 20            | 36           | 36%           | 64%                           |
| 5      | off           | 36           | 56%           | —                             |
| 6      | 20            | 48           | 36%           | —                             |
| 5      | 20            | 48           | 46%           | 76%                           |

The best probe still misses 90% and has nine final top-outs in 50 groups.
Do not ship those relaxations as a verified fix. Ignoring a color after all
its lamps are lit improves some variants, but does not fix the baseline.
An extra hint penalty of 2 per buried hole worsened the tested variants
(baseline 8%; purity5/wind20/budget48 64%); discard it.
A high-HINT diagnostic (12×, ten seeds) produced only 10% good baseline wins;
it is not acceptance evidence or a recommended policy change.

```sh
M1_EXPERIMENT=1 RUNS=50 M1_OUT=/tmp/vale-probes.md npx vitest run tests/sim/m1.test.ts
M1_EXPERIMENT=1 M1_HINT_FILTER=1 RUNS=50 M1_OUT=/tmp/vale-filter-probes.md npx vitest run tests/sim/m1.test.ts
```

## Remaining work and author log

Resolve the measured balance/policy failures before labeling M1 accepted.
Keep legal queue replay proofs, repeat the affected 200-seed cells after
any change, and preserve the first-half story and continuation. The tests
also cover Pip's recorded solution classes, greedy failure, Bean's shape-fit,
controlled supply at all reachable strains, and the overlay family budget.

The author must play Rowan from a fresh attempt, then Pip, Bean and Ordor:
record Rowan's first-try result, at least one failure among the other three,
and whether the verbs/stakes/demos are clear and challenging. Bot completion
cannot provide this go/no-go. Author log: **not yet played**.

Phone and desktop visual evidence is tracked by the integration owner.

## Correctness follow-up

Save version 12 records a committed M1 attempt. Reloading it applies the
ordinary give-up consequence once and immediately saves the cleared pending
record. Version 11 and both version-10 schemas still migrate. Hazel now
waits for real input before combat begins; assisted losses lower regard
consistently with the card.

CONTAIN spread now snapshots the warned frontier, preventing a second hop
through a newly infected crystal during the same tick. Fixed real-input
replays prove legal Rowan and Wren wins with the starter dual-piece chance.
After this fix, Wren was rerun with 200 seeds per cell: good 45%
[38.3, 51.9], casual/dropper/idle 0% [0, 1.9]; strain-two good 40%
[33.0, 46.4], casual 0% [0, 1.9]. Mean good duration: 57 seconds /
27 pieces; 110 good failures exhausted the budget. These results still
fail the approved bands. No difficulty values were changed.

Current integration checks: 1,077 tests pass, 9 skipped; formatting, lint,
type checks and production build pass. Phone/desktop DOM fixtures verify
interactions, but new browser screenshots remain unverified: local socket
operations are denied by this execution sandbox.

## Reconciled team 5aa90cd measurements

These fresh rows replace the earlier six-NPC table for the current layouts
and shared hint weight. Each cell uses 200 seeds and Wilson 95% bounds.
The CONTAIN warning fix and v12 save recovery are retained. Percentages
below retain half-percent precision; Rowan is 189/200, **94.5%**, rather
than an exact 95%. This remains below the strict 95% random-board gate.

| NPC         | Good                 | Casual             | Dropper         | Idle            | Good strain 2        | Casual strain 2    |
| ----------- | -------------------- | ------------------ | --------------- | --------------- | -------------------- | ------------------ |
| elder       | 94.5% [90.4, 96.9]   | 4.5% [2.4, 8.3]    | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 49.0% [42.2, 55.9]   | 0.0% [0.0, 1.9]    |
| kid         | 100.0% [98.1, 100.0] | 0.5% [0.1, 2.8]    | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 100.0% [98.1, 100.0] | 2.0% [0.8, 5.0]    |
| farmer      | 100.0% [98.1, 100.0] | 55.0% [48.1, 61.7] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 94.0% [89.8, 96.5]   | 29.0% [23.2, 35.6] |
| stallKeeper | 80.0% [73.9, 85.0]   | 0.5% [0.1, 2.8]    | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 29.0% [23.2, 35.6]   | 0.0% [0.0, 1.9]    |
| forager     | 86.0% [80.5, 90.1]   | 3.5% [1.7, 7.0]    | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 77.5% [71.2, 82.7]   | 2.0% [0.8, 5.0]    |
| guard       | 14.5% [10.3, 20.0]   | 0.0% [0.0, 1.9]    | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9] | 0.0% [0.0, 1.9]      | 0.0% [0.0, 1.9]    |

Vale’s strain-two row is synthetic: his saved strain caps at one. At the
reachable cap, good won 5/200 (2.5%, Wilson 1.1–5.7%) and casual won 0/200.
Assisted casual Vale within three fresh attempts won **10/200 (5.0%,
Wilson 2.7–9.0%)**, versus the ≥90% target. Final failures: 58 top-outs and
132 exhausted budgets. This does not simulate the Wait scheduling fights.

The new legal replay fixtures preserve actual RNG, timed public inputs and
preview reads for Rowan, Wren and Vale; no board/queue edits are used. A
legal win proves solvability for that seed, not a passing difficulty band.

Still needed: casual accessibility and strain-floor balance, Vale’s assist
recovery, Hazel pacing/difficulty, and a browser layout review of the combined
tree. The author’s M1 playtest/go-no-go has not occurred; M2a stays off.

## Current policy: author decisions at team 5fe2859

The author’s October 29 decisions supersede the old good/casual definitions
in the earlier tables. Good now has light slips; casual plans two pieces
deep with slips and 70% ghost corrections. The old one-ply casual is
reported as Beginner, without an acceptance band. Vale uses purity 6 and
a J/T supply window of 3; Pip’s length target is 20–40 seconds. The full
tuning set and **the team’s own** 200-seed table are preserved in
[GAME_DESIGN.md](GAME_DESIGN.md#encounter-sims). Those are attributed team
results, not an independent run of this combined tree.

The tuning pass improves several first-try means, but the team still
reports misses for Rowan/Pip casual, strain floors, Ordor’s idle price,
Vale assistance, Hazel difficulties and Wren duration. M1 is not accepted.

A measurement defect was found during integration: the assisted table
passed strain one straight into the battle, whereas the actual game clears
strain on assistance. The shared cell constructor now clears it and has a
regression test. Fresh assisted-within-three measurements are recorded next.
Our Wilson intervals, immediate incremental reports, bounded lesson
prerequisites, Ordor demo readiness and legal replay fixtures are retained.

The earlier raw percentages must not be applied to the new policy or
tuning. No later boss mechanics, reactions or class abilities were enabled.

## Corrected assisted measurement

With the Oct 29 policy and tuning, 195/200 casual runs won within three
fresh assisted attempts: **97.5%**, Wilson 94.3–98.9%. Five final failures
exhausted the piece budget; mean total time 92.65 seconds / 37.09 pieces.
This is a recovery diagnostic, **not** the first-attempt assisted gate in
ENCOUNTER_DESIGN §5.3. Intervening Wait-unblocking monster fights are not
simulated. Single-attempt good/casual measurements remain required.

The corrected **single-attempt** assisted row has now also been rerun
independently (200 seeds per bot): good **162/200, 81.0%** (Wilson
75.0–85.8%), casual **135/200, 67.5%** (60.7–73.6%). Beginner 11.5%;
dropper and idle 0%. Good losses all exhausted the piece budget. Mean
good duration: 49.09 seconds / 23.32 pieces. Both active-bot means still
miss the official assisted bands (≥97% good / ≥90% casual). The
three-attempt result above must not be substituted for these gates.
