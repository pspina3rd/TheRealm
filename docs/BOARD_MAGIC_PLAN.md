# Board magic implementation contract

Approved October 29: board magic and durable, owned obstructions; colorless Ice
and Nature blocks; per-character placement counters; Arcane unlocked after the
Moon Wyrm and chapter-end scene. This file accompanies implementation checkpoints.

## Rules

- Resolve mutation, explicit falling, fresh sequential color contact, then full
  rows. Durable obstructions survive their row; only empty rows collapse.
- Strength is 1–3. Completed rows and Lightning damage it; Nature finishes with
  a neutral conversion. Colored contact is an alternative sequential solution.
- Gravity selects 1/2/4/all rows; selected squares fall fully. Fire burns normal
  squares in 1/2/3/4 rows; Ice fills those spans with neutral squares. Wind shifts
  those spans one square. Lightning/Nature use 1 row/1 hit, 2/1, 1/2, 2/2.
- Preview uses the real deterministic resolver on a clone. No RNG, rewards,
  payment or timer changes until confirmation. Targeting pauses play.
- Preserve existing healing and Shadow Drain. Add Nature conversion separately.
- Custom Arcane is Arcane + one element, not arbitrary ordered elemental pairs.
  Fire allows red contact; Ice delays interference; Wind shifts upcoming
  obstructions; Lightning weakens current ones; Nature neutralizes incoming
  obstructions; Gravity removes anchoring. Rank controls 1/2/3/4 charges or
  character placements; Lightning follows its elemental span/hit table, floor 1.
- Count affected-character placements independently of player locks and attacks.
  Settle the last affected placement before expiring Gravity. Refresh, never add,
  durations. Nature conversion precedes Wind redirection.
- Both base spells must be rank 2 to create a rank-1 Arcane pairing. Pairing rank
  is capped by both bases. Rank costs 6/12/20 existing XP-earned skill points.
  Editing loadout is free outside encounters and retains pairing progress.

## Delivery and acceptance

Commit the resolver and tests, then board integration, targeting and workshop,
then Arcane/progression/save migration, then campaign wiring and validation.
Keep the existing campaign playable while the new isolated workshop is reviewed.
Save v13 preserves all v1–12 migrations and committed-try recovery; correction
snapshots include obstruction state. Exact numerical balance remains subject to
existing gates, not waived by a passing test runner. Human review of the isolated
encounter precedes broad campaign activation, as specified in the approved plan.

## Follow-up: line-driven automatic casting

The author confirmed that automatic casting is driven by **lines cleared**, not
pieces placed or turns elapsed. A multi-line clear supplies one casting
opportunity per line. Learned rank determines spell strength; mana used by a cast
is spent and surplus is retained. Arcane remains manually triggered. Exact
ready-spell scheduling and automatic target selection are not yet implemented;
the current workshop still uses manual casting while those rules are developed.

Hostile obstruction placement must not independently award player clears. It
leaves a gap instead of completing a row, including across a multi-cell batch.
Ordinary hostile placements do not run the row-clear/reward phase. Explicit
helpful placements and deliberate player Arcane counterplay can still complete
rows. The workshop has no undisclosed timed ally supplying blank blocks.
