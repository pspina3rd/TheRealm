# Board magic implementation contract

## Author correction · October 30

The current implementation and its passing tests are not acceptance of the
intended progression. The author clarified that new players start with **zero
spells**, choose the acquisition order of the six base schools, and choose which
schools to level. **Arcane is a seventh, opponent-targeted spell group. Arcane
Weaving is a separate equippable custom spell with player-selected effects,
strengths, and execution order, displaying the resulting casting cost.**

The historical rule below restricting custom Arcane to Arcane + one element is
incorrect for Weaving and is superseded by this clarification. Existing
opponent-interference effects are useful implementation material for the seventh
group, not a substitute for the custom spell system. Existing unlock timing is
retained unless the author changes it; the correction does not authorize silently
inventing a fixed spell-acquisition order.

See [progression and coverage correction](SPELL_PROGRESSION_CORRECTION.md) for
verified implementation gaps, coverage scope, and the repair sequence. The
workshop's 24 individual spell/rank checks remain component evidence only.

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
- Manual previews use the real deterministic resolver on a clone. No RNG,
  rewards, payment or timer changes until confirmation. Automatic target
  evaluation uses the same clone and commits only after an earned line. Manual
  targeting pauses play.
- Preserve existing healing and Shadow Drain. Add Nature conversion separately.
- Seventh-group Arcane techniques target the faced character. They are separate
  from the player-configured Weaving spell.
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
Save v14 preserves all v1–13 migrations and committed-try recovery; correction
snapshots include obstruction state. Exact numerical balance remains subject to
existing gates, not waived by a passing test runner. Human review of the isolated
encounter precedes broad campaign activation, as specified in the approved plan.

## Follow-up: line-driven automatic casting

The author confirmed that automatic casting is driven by **lines cleared**, not
pieces placed or turns elapsed. A multi-line clear supplies one casting
opportunity per line. Learned rank determines spell strength; mana used by a cast
is spent and surplus is retained. Arcane remains manually triggered.

Implemented in the default workshop and opt-in board-magic combat:

- Each earned line allows one cast. The first affordable standard spell with a
  useful target is chosen; a multi-line clear repeats this selection once per
  line against the updated board and mana.
- Affinity uses the game's existing elemental alignment (levels of known spells
  belonging to each element). Greater alignment goes first; the hero's title
  element breaks ties, then a stable listed spell order. The UI displays this
  derived priority. Learned level and enhancements set the actual effect/cost;
  there is no temporary mana-driven upgrade or cheaper-rank fallback.
- Targets prefer completed rows, reduced obstruction strength, fewer covered
  holes, then lower stack height. Equal scores keep a deterministic bottom-first
  target (right before left for Wind). Non-improving targets are skipped.
- No line, no automatic cast. Unused mana stays; unspent line opportunities do
  not accumulate across later turns. A still-ready spell can use successive
  line opportunities, including on later clears.
- Automatic spell clears award normal rewards without recursively extending
  the cast budget. Manual Arcane and deliberate helpful counterplay can earn
  line opportunities. Stop on victory/defeat, and ignore teaching demos.
- Readiness cards replace manual standard selection in automatic mode. Arcane
  remains explicit and consumes both elemental and Arcane mana. Focused manual
  exercises remain available for testing. Healing and Shadow Drain are unchanged.

No save migration is required: order is derived from saved progression, and the
mode is set by battle options. The existing campaign rollout flag remains off
for new saves; lessons keep manual teaching interactions.

Hostile obstruction placement must not independently award player clears. It
leaves a gap instead of completing a row, including across a multi-cell batch.
Ordinary hostile placements do not run the row-clear/reward phase. Explicit
helpful placements and deliberate player Arcane counterplay can still complete
rows. The workshop has no undisclosed timed ally supplying blank blocks.

## Cast presentation

Paced presentation is enabled in the workshop and opt-in campaign combat. Each
cast has target, element-specific motion, and result stages. Mana and game state
commit after the motion stage; player input and opponent/gravity clocks wait
until the sequence completes. The next cast is selected against the actual
updated board. The headless/default engine option can still resolve immediately.

A render-only resolver trace preserves cell identities, creation, conversion,
removal and collapse destinations, including an intermediate state before row
clears. Animations use this data rather than guessing where identical colors
moved. Ordinary resolution/save state and spell effects are unchanged. Automatic
row flashes and simultaneous surge icons are suppressed on the board. The six
standard spell types each use their own visual treatment.

## Corrected progression and custom spell delivery · October 30

Implemented zero starting spells, empty-book persistence, class selection without
spell grants, and player-selected learning/uneven upgrades. Legacy ownership is
retained; old starting-spell provenance prevents class affinity being mistaken
for a newly earned lesson. Arcane lessons require the Moon Wyrm aftermath.

Arcane mastery retains opponent techniques and their saved progress. Independent
Weaving recipes store exactly two ordered source effects, chosen strengths,
weaving level, name, and equipment. Either effect may use the same school.
Sources are the six standard board spells and must be learned to level 2.
Weaving unlocks after the Wyrm aftermath, starts at level 1, and uses its own
6/12/20 skill-point upgrade schedule, capped by the source levels. Each selected
strength is bounded by the source and weaving levels; cost sums both actual
enhanced casts. There is no recipe discount or partial payment.

Preview resolves both effects on a clone in order and shows the intermediate
board. Casting revalidates the equipped recipe and complete cost, presents both
stages with the shared elemental renderer, then atomically commits and pays.
Input and opponent clocks wait throughout. Custom casting stays manual and
retains the intended earned-line behavior for deliberately completed rows.

Coverage includes all 15,625 base spellbooks, 720 complete learning orders and
1,957 acquisition prefixes, 576 ordered two-effect/strength configurations,
reproducible mixed progression histories, cost/refusal/stale-preview checks,
save migration, paced execution, and keyboard/touch browser flows. These verify
specific contracts; they do not claim every possible campaign or board history
has been exhaustively tested. The existing campaign rollout flag stays under the
previous human-playtest gate.
