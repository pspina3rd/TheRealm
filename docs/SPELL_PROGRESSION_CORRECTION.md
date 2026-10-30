# Spell progression and coverage correction

Author clarification, October 30, 2026. This supersedes conflicting previous
implementation notes; the implementation checkpoint below records what is now delivered.

## Required behavior

- New characters start with no spells. Class choice must not silently learn one.
- Players choose which of the six base schools to learn first, second, and so on,
  and where to invest progression. Unlearned schools never appear as usable or
  participate in cast priority. Learning one school must not require owning a
  different base school merely because a fixture did.
- Mixed ranks are normal player states. Affinity, useful targets, actual mana,
  earned-line budgets, and encounter outcomes govern automatic standard casting.
- Arcane is the seventh spell group and targets the character faced. Preserve
  the authored opponent effects and Moon Wyrm unlock context.
- Arcane Weaving is separate: the player configures and equips a custom spell,
  choosing the mix, each effect's strength, and execution order. Show its actual
  cost and preview both stages in order. Do not reduce it to six fixed pairings.
- Keep manual triggering for Arcane/custom casts as previously agreed. Do not
  silently add either system to the automatic standard scheduler.

## Baseline audit (the defects being repaired)

- `src/game/hero.ts:createHero` currently grants a class spell and Cure.
- `tests/hero.test.ts` explicitly expects those starting spells; this is an
  incorrect product expectation, not missing test-runner coverage.
- The live workshop now exposes all ranks and isolated schools but still starts
  with a supplied spellbook and full practice mana. It cannot establish that a
  zero-spell campaign is playable or that arbitrary learning paths work.
- `src/game/arcane.ts` stores six fixed elemental pairing ranks, capped through
  Shadow and a base spell. `src/ui/app.ts` labels their editor Arcane Weaving.
  There is no independent ordered, strength-configurable equipped recipe model.
- The implementation contract previously prohibited arbitrary ordered elemental
  combinations. That restriction conflicts with the author's custom-spell intent.

## Coverage size and method

For six base schools, treating each as unlearned or level 1–4 gives **5^6 =
15,625 spellbooks**. This excludes enhancements, mana, boards, character states,
Arcane, Weaving, and history. Learning all six has **720 complete orders**;
including every partial ordered acquisition path gives **1,957 prefixes**.

These are state/path counts, not a claim that 15,625 UI tests prove correctness.
Some level combinations may be progression-gated at a given story point. Test
legal reachability separately from defensive handling of invalid saved states.

Use several complementary layers:

1. Enumerate base spellbooks for inexpensive ownership, rank, priority, and
   eligibility invariants. Include empty and mixed-rank books, sealed spells,
   no affordable/useful targets, exact affordability, and ties.
2. Traverse legal acquisition and upgrade transitions with a reference model.
   Exercise every acquisition order, saving/reloading along representative paths.
   Verify order does not accidentally lock unrelated schools or change saved
   choices. Preserve deliberate affinity tie-breaking behavior explicitly.
3. Generate reproducible sequences of learning, spending upgrades, line clears,
   mana changes, opponent actions, manual casts, and save/reload. Assert no
   unlearned cast, overspend, invented rank, recursive auto budget, stale commit,
   or opponent-generated player reward. Keep failing seeds as regression cases.
4. Check actual resolver effects against independently stated row/hit contracts,
   not only preview-versus-commit agreement: both can share the same bug.
5. Test Arcane opponent ownership, duration/charge clocks, eligibility and manual
   payment independently from Weaving recipe construction, equipment, ordered
   preview/execution, cost calculation, and persistence/migration.
6. Keep curated desktop/touch playthroughs starting at zero spells, taking
   different first schools, uneven upgrades, scarce mana, competing affordable
   spells, and eventual Arcane unlock/custom spell use. These are acceptance
   scenarios, not artificially maxed demonstration encounters.

Recipe counts cannot be honestly finalized until allowed recipe lengths,
repeated-school rules, and selectable source schools are established. Record
those constraints before enumerating recipes; do not invent a cap to shrink the
suite. Order-sensitive examples must include Fire→Gravity and Gravity→Fire on
boards where their actual results differ.

## Repair sequence

1. Correct the zero-spell start and its assertions; audit lesson access, borrowed
   teaching spells, healing/item assumptions, acquisition rewards, and onboarding
   before changing the campaign constructor. Preserve existing owned spells in
   saved games rather than wiping them during migration.
2. Separate seventh-group Arcane ownership/progression/targeting from custom
   Weaving data, equipped recipes, cost/ordered execution, and UI. Reuse validated
   opponent effects without discarding saved progress. Identify genuinely missing
   recipe constraints from the rest of the story/design before asking the author.
3. Build the progression/invariant/sequence suite and expand the playable fixture
   to start empty, learn selected schools, and level them independently. Use
   normal earned mana as the default acceptance path; label optional supplied
   resources explicitly as debugging aids.
4. Verify representative complete campaigns, Arcane unlock, save migration, and
   touch/keyboard play. Report completion only against this corrected contract.

The prior 24 spell/rank browser cases and fixed pairing tests remain useful
component checks. They do not constitute progression or custom-Weaving coverage.

## Delivered checkpoint

- New characters start empty; save version 14 retains empty spellbooks and all
  existing owned spells, Arcane progress, and committed-attempt recovery.
- Arcane mastery and custom Weaving now have separate data, editors, progression,
  and casting paths. Recipes are two ordered effects from the six base schools;
  repeated schools are allowed. Strength selection, actual enhanced combined
  cost, equipment, paid upgrades, intermediate preview, and sequential animation
  are implemented. Existing opponent techniques remain intact.
- The workshop starts with zero spells, normal stats and earned mana. Its
  independent-learning/upgrade path persists through reload. Supplied loadouts,
  XP simulation and mana grants are explicitly marked as test/debug controls.
- Added exhaustive base-book eligibility/priority checks, every acquisition
  order/prefix, every 576 ordered two-source strength configuration, deterministic
  mixed progression histories, and specific casting/save/cost regressions.
- Browser evidence covers a zero-spell two-line clear, player-chosen learning,
  uneven upgrades, unlock gating, independent Arcane/Weaving ownership, persisted
  equipment, whole-cost refusal, and sequential casting on touch and desktop.

The baseline audit above describes previous defects, not current behavior.
Human campaign acceptance remains distinct from automated component and browser
coverage; the previous broad-rollout gate is retained.
