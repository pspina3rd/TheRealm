# Story improvement plans

Detailed plans for the five main problems and four improvement plans in
[STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md). These are planning documents only.
They change no game code, data or tests, and they approve no lore on the author's behalf. Every
canon change is listed as an author decision in the plan that proposes it.

## Documents

| Document                                                 | Expert role                   | What it plans                                                                  |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| [PLAN_A_POLISH_AND_UNIFY.md](PLAN_A_POLISH_AND_UNIFY.md) | Narrative and line editor     | One voice across both halves, text fixes, hero hesitation lines, jargon.       |
| [PLAN_B_SECRET_HISTORY.md](PLAN_B_SECRET_HISTORY.md)     | Lore and mystery designer     | The secret history, truth table, clue ledger and vision rewrites.              |
| [PLAN_C_PLAY_THE_STORY.md](PLAN_C_PLAY_THE_STORY.md)     | Systems designer and engineer | Drowsy blocks, the stone-school link, the rite as a Weaving, boss mechanics.   |
| [PLAN_D_VESPER_STORY.md](PLAN_D_VESPER_STORY.md)         | Narrative director            | Vesper, Fennick and the hero's arcs; underground pacing; late-scene rewrites.  |
| [PLANS_REVIEW.md](PLANS_REVIEW.md)                       | Independent reviewer          | Accuracy, coverage and cross-plan conflicts, with resolutions and build order. |

Each plan opens with a **Problems this plan solves** section. It gives the root cause, the tasks,
the affected passages and files, before-and-after examples, acceptance criteria and the test that
proves each fix. Each plan ends with a **Changes after review** section that records how every
review finding was resolved.

## The five problems and where each is planned

| #   | Problem                                                                                                      | Lead plan | Supporting plans                                     |
| --- | ------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------- |
| P1  | The mystery has no answer: what the voice is, why it wants sleepers, and how stones, moon and sleep connect. | B         | A (vision register), C (rite lore inputs)            |
| P2  | The story barely touches the gameplay: the sevens, sleep and Weaving never appear in play.                   | C         | B (stone order and meaning), D (scene placement)     |
| P3  | The two halves sound like different games.                                                                   | A         | B (vision content), D (Vesper line content)          |
| P4  | Vesper's choice and the hero's growth do not land.                                                           | D         | A (hero line wording), B (motive lore), C (attitude) |
| P5a | Writer's notes and obsolete names in player-facing text.                                                     | A         | —                                                    |
| P5b | Fennick calls Vesper "the boy"; pronouns are inconsistent.                                                   | A         | D (cast sheet)                                       |
| P5c | Technical terms young players will not follow.                                                               | A         | Glossary applies to new text in B, C and D           |
| P5d | The underground half repeats one beat: seven repair scenes in a row.                                         | D         | B (clue beats re-homed)                              |

## Shared rules agreed in review

These settle the conflicts the review found. The full table is in
[PLANS_REVIEW.md](PLANS_REVIEW.md), conflict resolutions C-1 to C-16.

- **One owner per text.** D places the hero's answers to Vesper and A words them. D owns the content
  of Vesper's first-half lines and A owns their register. B owns the content of the visions and A
  owns their register and how they rotate.
- **Pronouns.** Vesper is they/them. Fennick is he/him.
- **Scene list.** D's underground scene IDs and flags are the reference. B's clue plants and C's
  mechanics follow them.
- **Save format.** D's version 18 migration is the only save-version change.
- **Mood gates.** Scene beats use C's `moods` field, in both the web scenes and the native book.
- **Jargon.** A's glossary applies to every plan's player-facing text.
- **The voice does not lie.** It frames and withholds, following B's proposed continuity check
  WB-C20.

## Build order

Follow the order in [PLANS_REVIEW.md](PLANS_REVIEW.md). In short:

1. Plan A text fixes and the story-text test, after author approval of the first-half wording.
2. Plan B secret history approved by the author, since C and D depend on it.
3. Plan C prototypes behind playtest gates, alongside the Plan B writing.
4. Plan D structure and late scenes, then the attitude-coloured ending from Plan C.

## Author decisions

Each plan lists its own decisions: A-D, PB-D, PC-D and PD-D, plus SQR-D in the quality review. No
IDs collide. Approve or reject each row separately. Approving one plan does not approve the lore in
another.
