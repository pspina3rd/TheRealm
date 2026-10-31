# Progression follow-up review

October 30, 2026 (America/Chicago). Read-only design audit of first-spell onboarding, Fire's
preparation interface, and current-physics simulation coverage. Source edits are
not part of this review. This report recommends concrete corrections without
changing spell ranks, row spans, obstruction hits, damage, SP prices or ownership.

## Disposition

Changes are warranted in the teaching transition and progression interface.
The six-school acquisition model supports free order, but teaching and benchmark
presentation still inherit the older manual/class-primary model. Fire's current
copy is honest about training-only purchases; its three-attribute interface still
asks players to distinguish two purchases with no distinct immediate benefit.
Do not solve that by inventing direct Fire damage or stronger row effects.

## 1. Make the lesson-to-combat transition explicit

### Actual behavior

`App.startBattle` enables automatic standards in ordinary combat, and manual
casting in lessons. `LessonChallenge` lends an unknown spell through its combat
spellbook without granting ownership. The taught spell breaks the mentor's
shield when manually cast; victory then grants the spell or its next level.
A next-level lesson casts the player's currently known level, not the level
which will only be earned on victory. This is a valid teaching arrangement, but
it currently introduces a different interaction without explaining the boundary.

`BattleView` labels the lesson spell “Lent” or “Taught” and adds a shield cue. It
does not say that this is guided manual practice or that ordinary combat uses
automatic learned standards. The current label can also use an old tier name
instead of the school/Lv presented elsewhere.

### Minimal correction

Use system teaching UI, not newly invented character dialogue:

- Before the trial: identify the school and level being practiced, its actual
  effect and cost. State that the spell is lent here if unknown, or that the
  current learned level is being practiced before the next level is awarded.
- During the trial: visibly label **Guided practice · manual aim/cast**. State
  that the mentor's shield needs this practiced spell. Keep a usable target,
  affordable earned-mana route, and a direct cast/target action accessible.
- On victory: identify the exact learned school/Lv, then state the ordinary
  rule: earned lines allow automatic casts when mana and a useful target exist.
  On loss/cancel, do not claim the lent spell was learned.
- In the next ordinary fight: show the existing read-only readiness card and
  demonstrate the normal trigger through real earned mana, not a hidden grant.
  A single line may be insufficient; “Waiting for mana” is correct in that case.

Do not make a player manually choose the standard school every combat. Do not
turn an instruction panel into permission to cast without an earned opportunity.
Do not grant a next-level rank during the lesson before its victory.

### Acceptance evidence

Exercise a zero-spell first lesson for each of the six board schools, plus the
first unlocked primary Arcane lesson. Confirm temporary lending, known-rank
practice during upgrade lessons, ownership only on victory, an explicit manual
practice label, and normal automatic behavior afterward. At least one main-App
UI path should cross this boundary on desktop and touch; pure offer enumeration
is not evidence that the actual controls explain it.

## 2. Preserve player choice and make mentor discovery actionable

### What the code supports

`lessonsFor` offers the base board primaries without another base school's
knowledge prerequisite. Nature conversion is prioritized over legacy Cure in
production's board-magic mode. Arcane lessons deliberately wait for the Moon
Wyrm aftermath, so “choose any first of the six” does not require early Arcane.
Independent known-spell records and SP plans permit uneven levels.

Mentor homes are geographically asymmetric. Nature/Ice/Gravity have open roads;
Fire's home is beyond the quarry road gate, and Lightning/Wind homes involve
later roads. The relevant road gates are barter/puzzle challenges with crystal
requirements, not requirements to learn some other spell. Their being farther
away does not by itself impose a learning order. Mentors also move with wins, so
static hints can become wrong while a spell-less player travels.

### Minimal correction

- In the empty spellbook/skills state, provide a **Learn a school** guide showing
  the six school effects, each mentor's actual current place, and any road gate.
  Derive positions from `mentorPlace`; keep the game's movement/story rules.
- Explain that class gives affinity/stat choices, not a prescribed first spell.
  Do not auto-select Fire, Wind, or the class's legacy primary as “the” first.
- Advertise spell rewards before accepting a teaching encounter. Rowan's Quake
  reward and the Sage's Thunder reward are acquisition routes too; completing a
  normal quest should not invisibly surprise a player with an unadvertised school.
  Existing owned spells and alternative known-spell rewards must remain intact.
- For a ready learned spell, show the mentor and the next-level trial as the next
  step; readiness is not an automatic level increase or an instruction to rebuy
  the spell from scratch.

A first-school reachability check must include actual gates and current mentor
presence, not just call `lessonsFor` on a fabricated flag set. Test several
learning orders through public game interactions and retain the inexpensive
exhaustive offer/ownership checks for the remaining permutations.

## 3. Project Fire's existing preparation into one honest Training control

### Current rule, which should be preserved

Each next-level step requires one purchase in Power, Efficiency and Effect, plus
0/1/2 elective purchases at levels 1/2/3. A purchase costs 2/3/4 SP respectively.
Completing the step makes the spell ready for a mentor trial. The full step costs
are 6/12/20 SP. `step`, `kept`, actual costs and paid progress survive level gains
and save/load.

Board Fire burns ordinary cells; it does not separately damage the opponent or
complete rows. Its Power/Effect backing fields therefore train the next level
without an immediate burn-damage or row-clear bonus. Efficiency does immediately
lower the actual mana cost. The current explanatory copy avoids false promises,
but two separate Power/Effect controls still imply two useful tactical upgrades.

### Recommended interface-only correction

For Fire, display:

1. **Efficiency** — its actual current/staged mana cost and the next purchase's
   real reduction, subject to the existing minimum cost.
2. **Training toward Fire Lv N** — one progress meter and plus/minus staging
   action for the two training-only backing attributes. Explain that this prepares
   the next rank; the new rank's larger row span arrives after the mentor trial.
3. **Elective preparation**, when the existing step has 1 or 2 elective slots —
   make the actual alternatives explicit: more Efficiency has its existing
   immediate benefit; extra Training is training-only. Do not pretend those are
   equally strong immediate combat effects, and do not silently reassign the
   player's earlier elective purchases.
4. A complete next-step summary: committed/staged SP, remaining requirements,
   the next rank's real reach, and whether a mentor trial is still needed.

The Training action can deterministically stage a missing Power/Effect minimum
first, then an allowed elective training slot, through the existing
`canEnhance`/`adjustEnhancement`/`spendSkillPoints` path. Keep the real backing
attributes and prices. No save migration or refund is needed merely to project
them into one control. Minus should undo the corresponding staged action, never
unspend committed investment.

### Important compatibility edge case

Do not use `Power + Effect >= 2` as the core-ready condition. A legal old level-2
step can contain Power 2 / Effect 0 / Efficiency 1: one required training unit is
missing and one elective was already spent. Core training progress is
`min(requiredEach, Power) + min(requiredEach, Effect)`. Elective progress includes
amounts beyond each attribute's minimum, including extra Efficiency. Respect the
existing `fitsStep` reserved requirements and `isReady` result.

Show required and elective progress distinctly so old allocations remain honest.
Do not zero, redistribute or refund `step`/`kept`, grant a free next rank, add
burn damage, change spans/hits, or force a new acquisition order.

### Acceptance evidence

Cover fresh and partially invested Fire at every step, old legal skewed elective
allocations, mixed committed/staged purchases, insufficient SP, cancel/confirm,
save/reload and a completed mentor upgrade. Assert unchanged SP totals/backing
records for unchanged choices, unchanged mana-cost calculation and rank/spans,
no false immediate Power/Effect claim, and no accidental readiness from aggregate
training counts. Other spells retain their real Power/Effect behavior.

Whether Fire should eventually gain a separate immediate training benefit is a
balance redesign, not a prerequisite for this honest interface correction.

## 4. Update simulations to the current production policy

### Concrete mismatches

- `tests/sim/progression.ts:progressionBattle` constructs `Battle` without
  board-magic/automatic options or story flags. It therefore exercises legacy
  manual effects rather than the production combat policy and new collapse.
- Its resource investment routine selects `heroClass(hero).spell`, rather than
  a declared player-chosen learned focus. The campaign selects the first offered
  mentor lesson. Neither policy represents the player's arbitrary school order
  or uneven training choice.
- `tests/sim/simulate.ts:castReady` calls manual `combat.castSpell(id)` without a
  board target. Merely switching the simulator's board flag on will break manual
  board-spell lessons or misrepresent normal auto spells.
- Its placement search uses grid-only classic `landings`, without durable
  obstruction metadata, pinned rows and the current resolver's released-stack
  cascades. Actual execution may be correct while its lookahead and reported
  policy quality assume a different board.
- The historical synthetic `FULL_KIT` omits Nature conversion and base Arcane.
  It cannot be presented as a current seven-primary or first-school coverage kit.

### Minimal correction

Use one shared production casting-policy definition for App and current-mode
benchmarks. Add explicit learning-order and training-focus policy options based
on owned schools, with real earned SP and real story flags. Keep any legacy
comparison mode clearly named and its results separate.

For manual lessons, target the practiced board spell through a meaningful real
preview; normal automatic standards must run through earned lines rather than
manual `castReady`. A manual shield lesson may need a meaningful teaching target
which does not score as an automatic stack-quality improvement, especially Wind.
Do not bypass affordability/ownership or call a row spell without a target.

Evaluate candidate placements against the real state/resolver, including tags,
obstruction identities/durability and pending rows, without mutating live RNG or
rewards. Report the declared policy and its limits. A simulator timeout is not a
victory, and a grid-only planner's weakness is not proof the player's chosen
school is unviable.

## 5. Treat physical collapse as a real usefulness/balance change

Finishing the descent of blocks released by a fully removed row is now shared
physics. The stale identical-signature cascade defect was independently found,
returned and corrected in the previous review. Pinned surviving rows and
untouched overhangs still matter.

After a normal full-row clear, most released overhangs are already settled before
the automatic cast opportunity is selected. Gravity should then retain mana if
there is no remaining useful fall. Wind on a newly tidy stack may also have no
immediate beneficial shift. That is correct execution of current rules, not a
reason to spend mana on a pretend effect or secretly delay physical settling.

However, first-school usefulness is now more dependent on enemy obstructions,
pinned clears, unaffected overhangs and color-contact opportunities. Check real
encounter patterns for first-Gravity and first-Wind players. Their teaching
boards should demonstrate genuine targets and their cards must state when there
is no useful target. Do not change rank spans, anchor rules, or the earned-line
trigger merely to make a meter fire.

The pinned Gravity/Wind/Ice fixtures correctly isolate spell cost and cast-budget
contracts; they are not evidence that those useful situations occur frequently
in the campaign. Compare six first-school scenarios and uneven-rank policies
against authored enemies under current physics, tracking useful cast frequency,
mana retained, opportunities skipped, and actual encounter outcomes. Distinguish
policy limitations from game-rule failures. Keep spell-created cascade rewards
inside the existing no-recursive-auto-budget guard.

## Delivery order and boundaries

First deliver the honest Fire Training projection and explicit guided-practice
transition, with compatibility regressions. Then verify current-production
first-school encounter paths and simulator parity; record any remaining balance
limitations without inventing new damage or changing the author's spell table.
Preserve existing story characterization rather than writing substitute mentor
dialogue to carry implementation explanations. Independent code/design review,
automated evidence and human story-context acceptance remain separate.

## Correction re-review · implementation checkpoint 6926649 and follow-up

The root implemented the interface-only Fire projection and guided-practice
transition, and returned the code for independent review. I inspected the helper
in `src/game/skills.ts`, staged plan wiring, skills screen, practice panel and
result rows, plus `tests/progressionPresentation.test.ts`.

### Verified corrections

- Fire now has one grouped Training action and separate Efficiency. The required
  meter clips each backing attribute to the required minimum, so a committed
  Power2/Effect0 step correctly shows core Training1/2 plus an elective instead
  of pretending the missing Effect requirement is complete.
- Underlying Power/Effect/Efficiency counts, 6/12/20 full-step prices, readiness,
  learned ranks, actual costs, damage and spans remain unchanged. The helper
  stages deficits first and never mutates the hero while planning.
- I returned a staged-undo edge case: an elective Power purchase could be left
  while minus removed a required Effect. The follow-up now removes a staged
  surplus before a staged core requirement. Committed investment is untouched.
- Skills shows the next rank's actual school effect, the current-training cost
  projection, remaining steps and the required mentor win. It does not promise
  separate burn damage from Fire training.
- Lessons now expose one canonical school/Lv practice action with actual cost,
  effect, charging instruction and an explicit aim-here/automatic-in-fights
  distinction. Other known spells are separated from the taught action.
- The result surface identifies the learned school/Lv and the earned-line,
  affordable/useful automatic rule. A lent record is not granted by displaying
  or clicking the lesson control.

I independently ran `tests/progressionPresentation.test.ts` and
`tests/spells.test.ts`: **47 tests passed** in
`/tmp/progression-design-followup-tests.log`. This is scoped implementation/copy
review and compatibility evidence, not a novice comprehension or full campaign
playthrough claim.

### Returned consistency/policy details

- Pre-acceptance spell reward chips still use old tier names such as Quake while
  result/card names use Gravity. The offer should use the same canonical school
  name, without changing its reward.
- An upgrade practice correctly uses the current learned level, but should
  explicitly state the next level is awarded on victory. This prevents a player
  who chose a Lv2 lesson from interpreting a Lv1 practice cast as a regression.
- The updated simulation now uses current battle policy and real Board clone
  placement/cascade evaluation. I reproduced one remaining lesson-policy gap:
  a Wind lesson with its shield up, enough mana, and a single floating cyan cell
  has a valid meaningful manual preview, but `autoTarget` declines the neutral
  stack-score shift. `castReady` then never breaks the shield. For a taught
  manual shield cast, use a valid meaningful-preview fallback after the auto
  preference search; do not weaken normal automatic usefulness requirements.

Current-physics first-school outcome evidence and declared investment policy are
being handled separately by the benchmark follow-up. The initial historical
simulator mismatches above should not be mistaken for the state of that updated
work. The core Fire/SP and practice-transition fixes are acceptable within the
reviewed scope; these returned consistency/policy details need explicit closure
before all follow-up items are described as finished.

## Returned corrections closed and conditional-benefit audit

The grouped Training minus action now removes a **staged surplus** before a
staged required unit. This closes the returned undo example without touching
committed counts. Spell reward offers now use the same canonical school name as
the result and AUTO card. The simulator's manual shield-practice branch now falls
back to a valid meaningful preview when its automatic preference search declines
a score-neutral teaching action.

I added the requested isolated regression file
`tests/sim/manualPractice.test.ts`. It verifies:

- the exact Wind fixture (one floating cyan cell, sufficient wind mana, shield
  up) is a valid manual practice action, breaks the shield, pays the real cost,
  and does not grant ownership or create an automatic cast;
- ordinary automatic combat does not inherit that manual-practice fallback;
- insufficient mana and a no-op board do not cast or spend practice mana.

Independent execution of that file plus `tests/progressionPresentation.test.ts`
passed **17 tests** in `/tmp/progression-practice-review-tests.log`.

### Wind, Nature and Lightning retain real conditional enhancements

I also executed staged, reachable-state resolver/combat scenarios with one row
completion at rank 1. These are mechanical examples, not campaign balance data.
They compare unchanged fixtures with no enhancement, Power1, or Effect1:

| School    | Baseline                          | Power1            | Effect1                                      |
| --------- | --------------------------------- | ----------------- | -------------------------------------------- |
| Wind      | 4 opponent damage, no slow pieces | 5 opponent damage | 4 damage plus 2 slow pieces from wind surge3 |
| Nature    | 5 opponent damage, player HP1     | 6 opponent damage | 5 damage and player HP4 from nature surge3   |
| Lightning | 4 opponent damage                 | 5 opponent damage | 7 total damage, including lightning surge3   |

Wind's example shifts a cyan cell above the final pin, satisfies its top color
contact, then releases a cascade which completes a row. Lightning removes a
final pinned obstruction and permits that cascade. Nature converts a previously
latched all-obstruction row to blanks, completing and clearing it. In every
case the rank and span/hit table remain unchanged. Power scales the resulting
row attack; Effect supplies the actual school surge only after a row completion.
These benefits must not be removed merely because the old direct-spell damage
text was inappropriate. Fire remains the distinct training-only case.

### Scoped disposition

The core Fire/SP projection, compatibility handling, explicit practice-to-AUTO
transition, canonical reward naming and manual-practice policy corrections are
acceptable within this reviewed implementation scope. There is no need to
invent direct damage or change rank/spans/strength rules to close those items.
The declared current-physics benchmark policy and first-school outcome evidence
are being reviewed by the separate simulation follow-up; their results must not
be inferred from these staged mechanical examples. Human comprehension and
campaign/story-context acceptance remain separate from this code/design review.
