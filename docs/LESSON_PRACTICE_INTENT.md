# Mentor lesson practice boards

The taught school determines the board's purpose. Fire removes expendable
neutral blocks; Ice fills gaps; Gravity drops unsupported blocks toward
visible landing cells; Wind shifts loose blocks into gaps. Lightning breaks
explicit practice obstructions and Nature converts them to neutral. Arcane
faces the opponent and adds no irrelevant board rubble.

The practice helper uses the actual school mapping and `spanFor` calculation.
Known ranks are preserved; lent spells use rank 1. Lightning and Nature
targets have strength 1 at ranks 1–2 and strength 2 at ranks 3–4, matching
their one-hit/two-hit progression. Gravity's fourth rank spans the whole
board but needs only a bounded four-row demonstration.

`LessonChallenge.practiceIntent` exposes typed `school`, `rank`, `goal`,
`rows`, `cells`, `landingCells`, and a recommended `target` for intent UI.
Reading it does not mutate the board. Target preparation runs on lesson
creation and when the shield first rises. If no safe target fits, it can
retry between physical locks while that shield is up and a useful target
is still missing. Frames and getters never seed targets. A current useful
target suppresses replacement, so repeated checks cannot accumulate layouts.

Only empty, untagged lower cells can receive a sample. Active and ghost
cells and the current drop path are excluded, so the displayed landing does
not jump when a practice sample appears. Before the first spawn the normal
spawn corridor is reserved. Existing useful work is left as the target. A replacement is
added only if no useful target remains, never by clearing existing work,
completing a row passively, overwriting tags, or moving an active piece.
If there is no safe space, the helper waits without changing anything.

All added loose blocks are neutral. Explicit obstructions have their own
lesson-practice ownership. Preparation grants no mana, score, health, items,
or spell ranks. A real cast still pays mana earned from cleared crystals,
and the existing lent-spell, shield, help toss, and lesson rewards remain
responsible for learning and progression. Lessons opt out of hostile enemy
obstruction adaptation while keeping the trial foe's authored moves.

Ordinary NPC authored boards and combat encounter layout are not changed
by the lesson helper. It is inactive when board magic is disabled and for
support spells that do not have one of the seven taught board/character effects.

## Validation

`tests/lessonPractice.test.ts` exercises each board school at ranks 1–4
through the actual magic resolver and checks Arcane without board rubble.
It checks spans, obstruction hit strength, neutral conversion, movement,
active/ghost preservation, target caps, repeated setup, passive-row safety,
and waiting for safe room at a crowded shield checkpoint. Real lessons earn
mana from crystal clears and then pay for the taught cast to break the shield.
Lent spells do not enter the saved book; failed/no-op or wrong-school casts
do not break the shield. Preparation never grants mana.

Focused validation: 59 practice tests and 39 existing lesson tests pass;
owned-file lint and whitespace checks pass. These tests establish behavior,
not a new pacing or balance claim. The full application checks and intent UI
integration belong to the coordinating checkpoint.
