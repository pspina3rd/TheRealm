# Current-rules progression validation

The simulator now uses actual player-chosen known spells instead of assuming
each class owns its old default primary. The production application starts with
an empty spellbook, enables board magic for combat/lessons, automatic casts for
combat only, and 500 ms cast animation pacing. Story flags and regional combat
rules now reach every simulated battle. Fixed puzzle and encounter rules stay
unchanged. Map-specific due scenes use the actual current map. The simulator's
placement policy and automatic-frame lifecycle were repaired separately in
`tests/sim/simulate.ts` as part of the same work.

`runCampaign` now accepts a `firstSchool` preference and an `investment` policy.
These select among real mentor offers and spend only earned skill points; they
never grant a school, XP, gil, items, or gate flags. An explicit `spellPriority`
can favor one learned school; `statPriority` can deliberately produce uneven
stat investment. The default favors the first learned primary, irrespective of
class.

The shared battle helper starts mana empty through the production `Battle`
constructor. It enables board magic for combat and lessons, automatic casts
for combat only, 500 ms animation pacing, production piece weights/dual odds,
story flags, and regional rules for combat. Presentation takes real simulated
time: one automatic cast normally has 500 ms target, 900 ms effect and 500 ms
result frames. The simulator advances these frames before accepting another
piece and drains terminal result frames before applying battle resolution.

## Bounded evidence

`tests/sim/currentProgression.test.ts` covers all four classes and six initial
school choices at 1500 ms, using lesson seed 7919. Every hero starts with the
actual empty spellbook, gil and items. Map access follows unlocked production
warps. Fire access first requires Foreman Flint's genuine zero-spell barter;
Wind and Lightning also require Apprentice Cinda's barter. These gate tries
use seeds 401 and 402, at most two tries each, and production interaction,
reply and resolution. Gate rewards alone open the routes. No prerequisite
school is granted or learned.

Each present mentor must genuinely offer the desired school, and only a won
lesson is resolved as teaching it. Hazel uses the current M1 try commitment and
settlement rules. Mentor preparation supplies its production full HP; no HP is
invented outside that service. Lessons grant no XP, gil or skill points. Every
sample asserts that exactly the selected spell is known after a win and none
after a failed/censored first lesson.

After a won lesson, the hero crosses back to Sevenstones and tries three
distinct placed Slimes and one Spore Shroom, carrying HP between fights. These
award 11 + 11 + 11 + 13 = 46 XP if all are won; level 2 costs 44. Only completed
battles are resolved; censored fights receive neither victory nor defeat.
Earned points favor the selected known school, then Vitality. No battle,
lesson, gate or reward is repeated to manufacture resources.

The sample uses the existing greedy one-piece bot (`spammer`) with actual
current board lock resolution, automatic casts in combat, and legal useful
manual board-spell targets during lessons. It uses no items, shop purchases,
free gear, fixture XP, fixture gil, or direct spell grants. No walking recovery
or intermediate road encounters are modeled. These choices deliberately bound
the sample and must not be confused with the full `runCampaign` policy.

## Results

| School    | First lessons won / 4 | Lost                    | Censored at 90 seconds |
| --------- | --------------------- | ----------------------- | ---------------------- |
| Fire      | 4                     | 0                       | 0                      |
| Water     | 4                     | 0                       | 0                      |
| Earth     | 4                     | 0                       | 0                      |
| Wind      | 4                     | 0                       | 0                      |
| Lightning | 1 (Knight)            | 3 (Ranger, Mage, Rogue) | 0                      |
| Nature    | 4                     | 0                       | 0                      |

All 12 needed Foreman cells win their first zero-spell gate attempt. All eight
needed Cinda cells lose the first attempt and win the second. Thus the sample
actually reaches all six mentors while keeping the spellbook empty until the
chosen first lesson. A fresh process after the manual Wind targeting repair has no censored cells.
The three Lightning losses in this table use the deliberately no-item policy;
carried-Herb comparisons below test those exact affected cells.

The carried-resource combat sample has 62 wins and 15 losses in 77 fights.
Knight's six won-school paths also win all four carried-resource combats,
earn level 2 and spend two earned points on the selected school. The spell
remains rank 1 with a Power enhancement; reaching rank 2 still requires the
remaining paid enhancements and another won mentor lesson. Other class paths
lose on the third Slime or Shroom under this no-item, no-rest policy. Failed
combat applies actual defeat consequences, including gil loss; reported lower
gil is not an unrecorded purchase.

Fire and Nature produce useful automatic casts in these cells. Many other
short fights record zero automatic casts because they do not earn enough mana
and a useful target together. The separate animation regression explicitly
uses a known-spell/mana/board fixture to test one real automatic cast's lifecycle;
that fixture is not resource-acquisition evidence.

The unit spending test deliberately supplies earned-XP/known-spell fixtures
to test an uneven two-school plan. It favors Water on a Knight, leaves Fire
unimproved, and never invents the old class-default Earth spell. That test is
about spending validity; the matrix supplies actual acquisition evidence.

## Post-review diagnosis and affected-cell comparison

The earlier 18-win/five-loss/one-censored result used a manual lesson bot that
reused automatic targeting's strictly positive stack-score requirement. This
rejected valid score-neutral Wind shifts even when they could break the taught
spell's shield. That was a simulator-policy artifact. The repaired `castReady`
permits a valid changed manual preview while the taught-spell shield is up;
automatic combat target selection is unchanged. A fresh full matrix now has
21 lesson wins and three losses, with no censored lessons.

All four Wind cells cast their lent Gale and break the shield. Ranger, Knight,
and Rogue win at 27.0 seconds; Mage wins at 34.5 seconds. The old Knight timeout
is resolved by legal manual targeting, with the same 90-second cap.

All four Lightning cells also cast Thunder at 22.5 seconds and break the shield.
The three no-item losses are attrition after a successful cast: Spark Wisp
retains eight HP, while Ranger/Mage/Rogue have nine/three/five HP after the
21.9-second hit. Its fifth attack at 27.25 seconds defeats them before another
line clear. Their peak Lightning mana is 12/14/12 and final mana 4/6/4; they are
not stuck behind an unbroken shield or unable to afford the first cast. Knight
survives the same pattern and wins at 33.0 seconds.

The diagnostic hooks only observe events and mana before/after ordinary
50 ms updates; they do not alter RNG, board, resources, or policy. Event times
are sampled to that update interval. Snapshots below precede lesson settlement,
which otherwise patches HP to at least half. Full shield/spell/hit/move timelines
are reproducible in the report's `.diagnostics.json` companion.

| Class  | School    | Outcome | Seconds | HP before settlement | Enemy HP | Shield | Peak / final school mana | Casts |
| ------ | --------- | ------- | ------- | -------------------- | -------- | ------ | ------------------------ | ----- |
| ranger | wind      | won     | 27.00   | 35/40                | -2       | broken | 12 / 9                   | 1     |
| ranger | lightning | lost    | 27.25   | 0/40                 | 8        | broken | 12 / 4                   | 1     |
| knight | wind      | won     | 27.00   | 51/54                | -2       | broken | 10 / 7                   | 1     |
| knight | lightning | won     | 33.00   | 23/54                | -13      | broken | 10 / 10                  | 1     |
| mage   | wind      | won     | 34.50   | 24/34                | -11      | broken | 14 / 14                  | 1     |
| mage   | lightning | lost    | 27.25   | 0/34                 | 8        | broken | 14 / 6                   | 1     |
| rogue  | wind      | won     | 27.00   | 31/36                | -2       | broken | 12 / 9                   | 1     |
| rogue  | lightning | lost    | 27.25   | 0/36                 | 8        | broken | 12 / 4                   | 1     |

A bounded recovery comparison clones the actual pre-lesson state after its
zero-spell gate victories, uses the same lesson seed, greedy placement policy,
1500 ms pace, and 90-second cap, then consumes carried Herbs below 35% HP before
piece input. It grants no items, gil, gear, spell, mana, or HP; production item
costs, enemy gauge costs, and the two-item battle limit apply. Independent
comparison outcomes do not change the no-item baseline rows below.

| Class  | Maximum Herbs allowed | Actually consumed | Outcome | Seconds | Learned Thunder |
| ------ | --------------------- | ----------------- | ------- | ------- | --------------- |
| ranger | 1                     | 1 of 2 carried    | won     | 33.00   | 1               |
| mage   | 1                     | 1 of 2 carried    | lost    | 30.75   | 0               |
| rogue  | 1                     | 1 of 2 carried    | lost    | 30.75   | 0               |
| mage   | 2                     | 2 of 2 carried    | won     | 31.50   | 1               |
| rogue  | 2                     | 2 of 2 carried    | won     | 31.50   | 1               |

Ranger succeeds with one real starter Herb. Mage and Rogue succeed with their
two real starter Herbs; Knight needs none in this seed. Each win uses actual
lesson resolution to teach Thunder at rank 1. These comparisons establish a
legitimate winning preparation in the tested cells and distinguish the original
no-item policy losses from a demonstrated production impossibility. They do
not establish full-campaign affordability, remaining supplies for later fights,
upgrade completion, or balance acceptance.

To reproduce only the affected three classes with at most one carried Herb:
`CURRENT_PROGRESSION=1 CURRENT_CLASSES=ranger,mage,rogue CURRENT_SCHOOLS=lightning CURRENT_RECOVERY=1 CURRENT_PROGRESSION_OUT=/tmp/current-lightning-recovery.md npx vitest run tests/sim/currentProgression.test.ts`

For the final two-Herb comparison, use `CURRENT_CLASSES=mage,rogue` and
`CURRENT_RECOVERY_MAX_HERBS=2` with the same command. Both affected-cell runs and
the fresh full matrix pass their assertions. No instrumentation cap was raised.

## Limits and next work

This is a deterministic 24-cell sample with a 90-second instrumentation cap per
fight, not a win-rate estimate or balance signoff. It does not verify arbitrary
multi-school rank histories, every class's full campaign, touch gesture noise,
later bosses, or a human playthrough. The gate retries and deliberately simple
bot are material policy assumptions.

The tested first-school cells now have actual novice victories for every class
when legal manual targeting and modest carried recovery are included. This
resolves these diagnostic failures without production tuning; it does not
establish a wider win rate. Separately test a carried
campaign with paid recovery and selectable first-school/uneven investment; the
large historical full-campaign simulation was not rerun here.

## Reproduction

Default regressions:
`npx vitest run tests/sim/currentProgression.test.ts tests/sim/progression.test.ts`

Bounded matrix:
`CURRENT_PROGRESSION=1 CURRENT_PROGRESSION_OUT=/tmp/current-progression.md npx vitest run tests/sim/currentProgression.test.ts`

Owned test files pass ESLint and the repository TypeScript check. Default tests
also verify unchanged fixed-puzzle controls, M1 attempts/Browse, earned-point
conservation, actual scene/vision memory and no invented gate flags.

## Recorded bounded sample

Seed 7919 for lessons, 7920–7923 for three distinct slimes and a shroom. 1500ms pace, 90-second reporting cap.
Greedy one-piece bot; no fixture XP/gil/gear/spells/healing. Starting items are carried and not used.
No intermediate road encounters. Foreman/Cinda prerequisite gates use at most two genuine zero-spell tries; unresolved access is reported, no gate flags granted.

| Class  | School    | Pace | Stage                   | Outcome | Seconds | Level | SP spent | Gil | Spell (rank; power/efficiency/effect) |
| ------ | --------- | ---- | ----------------------- | ------- | ------- | ----- | -------- | --- | ------------------------------------- |
| ranger | fire      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| ranger | fire      | 1500 | lesson                  | won     | 24.0    | 1     | 0        | 65  | fire                                  |
| ranger | fire      | 1500 | slime 1 (1 auto casts)  | won     | 33.4    | 1     | 0        | 69  | fire:1 (0/0/0)                        |
| ranger | fire      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 73  | fire:1 (0/0/0)                        |
| ranger | fire      | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 77  | fire:1 (0/0/0)                        |
| ranger | fire      | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 39  | fire:1 (0/0/0)                        |
| ranger | water     | 1500 | lesson                  | won     | 22.5    | 1     | 0        | 25  | blizzard                              |
| ranger | water     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 29  | blizzard:1 (0/0/0)                    |
| ranger | water     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | blizzard:1 (0/0/0)                    |
| ranger | water     | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 37  | blizzard:1 (0/0/0)                    |
| ranger | water     | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 19  | blizzard:1 (0/0/0)                    |
| ranger | earth     | 1500 | lesson                  | won     | 19.5    | 1     | 0        | 25  | quake                                 |
| ranger | earth     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 29  | quake:1 (0/0/0)                       |
| ranger | earth     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | quake:1 (0/0/0)                       |
| ranger | earth     | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 37  | quake:1 (0/0/0)                       |
| ranger | earth     | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 19  | quake:1 (0/0/0)                       |
| ranger | wind      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| ranger | wind      | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 65  | none                                  |
| ranger | wind      | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 65  | none                                  |
| ranger | wind      | 1500 | lesson                  | won     | 27.0    | 1     | 0        | 65  | gale                                  |
| ranger | wind      | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 69  | gale:1 (0/0/0)                        |
| ranger | wind      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 73  | gale:1 (0/0/0)                        |
| ranger | wind      | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 77  | gale:1 (0/0/0)                        |
| ranger | wind      | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 39  | gale:1 (0/0/0)                        |
| ranger | lightning | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| ranger | lightning | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 65  | none                                  |
| ranger | lightning | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 65  | none                                  |
| ranger | lightning | 1500 | lesson                  | lost    | 27.3    | 1     | 0        | 65  | none                                  |
| ranger | nature    | 1500 | lesson                  | won     | 48.0    | 1     | 0        | 25  | natureConvert                         |
| ranger | nature    | 1500 | slime 1 (1 auto casts)  | won     | 39.4    | 1     | 0        | 29  | natureConvert:1 (0/0/0)               |
| ranger | nature    | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | natureConvert:1 (0/0/0)               |
| ranger | nature    | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 37  | natureConvert:1 (0/0/0)               |
| ranger | nature    | 1500 | shroom 4 (0 auto casts) | lost    | 45.4    | 1     | 0        | 19  | natureConvert:1 (0/0/0)               |
| knight | fire      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 60  | none                                  |
| knight | fire      | 1500 | lesson                  | won     | 24.0    | 1     | 0        | 60  | fire                                  |
| knight | fire      | 1500 | slime 1 (1 auto casts)  | won     | 33.4    | 1     | 0        | 64  | fire:1 (0/0/0)                        |
| knight | fire      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | fire:1 (0/0/0)                        |
| knight | fire      | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 72  | fire:1 (0/0/0)                        |
| knight | fire      | 1500 | shroom 4 (1 auto casts) | won     | 48.4    | 2     | 2        | 78  | fire:1 (1/0/0)                        |
| knight | water     | 1500 | lesson                  | won     | 24.0    | 1     | 0        | 20  | blizzard                              |
| knight | water     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 24  | blizzard:1 (0/0/0)                    |
| knight | water     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 28  | blizzard:1 (0/0/0)                    |
| knight | water     | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 32  | blizzard:1 (0/0/0)                    |
| knight | water     | 1500 | shroom 4 (0 auto casts) | won     | 48.0    | 2     | 2        | 38  | blizzard:1 (1/0/0)                    |
| knight | earth     | 1500 | lesson                  | won     | 19.5    | 1     | 0        | 20  | quake                                 |
| knight | earth     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 24  | quake:1 (0/0/0)                       |
| knight | earth     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 28  | quake:1 (0/0/0)                       |
| knight | earth     | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 32  | quake:1 (0/0/0)                       |
| knight | earth     | 1500 | shroom 4 (0 auto casts) | won     | 48.0    | 2     | 2        | 38  | quake:1 (1/0/0)                       |
| knight | wind      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 60  | none                                  |
| knight | wind      | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 60  | none                                  |
| knight | wind      | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 60  | none                                  |
| knight | wind      | 1500 | lesson                  | won     | 27.0    | 1     | 0        | 60  | gale                                  |
| knight | wind      | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 64  | gale:1 (0/0/0)                        |
| knight | wind      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | gale:1 (0/0/0)                        |
| knight | wind      | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 72  | gale:1 (0/0/0)                        |
| knight | wind      | 1500 | shroom 4 (0 auto casts) | won     | 48.0    | 2     | 2        | 78  | gale:1 (1/0/0)                        |
| knight | lightning | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 60  | none                                  |
| knight | lightning | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 60  | none                                  |
| knight | lightning | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 60  | none                                  |
| knight | lightning | 1500 | lesson                  | won     | 33.0    | 1     | 0        | 60  | thunder                               |
| knight | lightning | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 64  | thunder:1 (0/0/0)                     |
| knight | lightning | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | thunder:1 (0/0/0)                     |
| knight | lightning | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 72  | thunder:1 (0/0/0)                     |
| knight | lightning | 1500 | shroom 4 (0 auto casts) | won     | 48.0    | 2     | 2        | 78  | thunder:1 (1/0/0)                     |
| knight | nature    | 1500 | lesson                  | won     | 40.5    | 1     | 0        | 20  | natureConvert                         |
| knight | nature    | 1500 | slime 1 (1 auto casts)  | won     | 39.4    | 1     | 0        | 24  | natureConvert:1 (0/0/0)               |
| knight | nature    | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 28  | natureConvert:1 (0/0/0)               |
| knight | nature    | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 32  | natureConvert:1 (0/0/0)               |
| knight | nature    | 1500 | shroom 4 (0 auto casts) | won     | 48.0    | 2     | 2        | 38  | natureConvert:1 (1/0/0)               |
| mage   | fire      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| mage   | fire      | 1500 | lesson                  | won     | 25.5    | 1     | 0        | 65  | fire                                  |
| mage   | fire      | 1500 | slime 1 (1 auto casts)  | won     | 33.4    | 1     | 0        | 69  | fire:1 (0/0/0)                        |
| mage   | fire      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 73  | fire:1 (0/0/0)                        |
| mage   | fire      | 1500 | slime 3 (0 auto casts)  | lost    | 15.8    | 1     | 0        | 37  | fire:1 (0/0/0)                        |
| mage   | water     | 1500 | lesson                  | won     | 22.5    | 1     | 0        | 25  | blizzard                              |
| mage   | water     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 29  | blizzard:1 (0/0/0)                    |
| mage   | water     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | blizzard:1 (0/0/0)                    |
| mage   | water     | 1500 | slime 3 (0 auto casts)  | lost    | 15.8    | 1     | 0        | 17  | blizzard:1 (0/0/0)                    |
| mage   | earth     | 1500 | lesson                  | won     | 19.5    | 1     | 0        | 25  | quake                                 |
| mage   | earth     | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 29  | quake:1 (0/0/0)                       |
| mage   | earth     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | quake:1 (0/0/0)                       |
| mage   | earth     | 1500 | slime 3 (0 auto casts)  | lost    | 15.8    | 1     | 0        | 17  | quake:1 (0/0/0)                       |
| mage   | wind      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| mage   | wind      | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 65  | none                                  |
| mage   | wind      | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 65  | none                                  |
| mage   | wind      | 1500 | lesson                  | won     | 34.5    | 1     | 0        | 65  | gale                                  |
| mage   | wind      | 1500 | slime 1 (0 auto casts)  | won     | 37.5    | 1     | 0        | 69  | gale:1 (0/0/0)                        |
| mage   | wind      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 73  | gale:1 (0/0/0)                        |
| mage   | wind      | 1500 | slime 3 (0 auto casts)  | lost    | 15.8    | 1     | 0        | 37  | gale:1 (0/0/0)                        |
| mage   | lightning | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 65  | none                                  |
| mage   | lightning | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 65  | none                                  |
| mage   | lightning | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 65  | none                                  |
| mage   | lightning | 1500 | lesson                  | lost    | 27.3    | 1     | 0        | 65  | none                                  |
| mage   | nature    | 1500 | lesson                  | won     | 37.5    | 1     | 0        | 25  | natureConvert                         |
| mage   | nature    | 1500 | slime 1 (1 auto casts)  | won     | 39.4    | 1     | 0        | 29  | natureConvert:1 (0/0/0)               |
| mage   | nature    | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 33  | natureConvert:1 (0/0/0)               |
| mage   | nature    | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 37  | natureConvert:1 (0/0/0)               |
| mage   | nature    | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 19  | natureConvert:1 (0/0/0)               |
| rogue  | fire      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 100 | none                                  |
| rogue  | fire      | 1500 | lesson                  | won     | 24.0    | 1     | 0        | 100 | fire                                  |
| rogue  | fire      | 1500 | slime 1 (1 auto casts)  | won     | 33.4    | 1     | 0        | 104 | fire:1 (0/0/0)                        |
| rogue  | fire      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 108 | fire:1 (0/0/0)                        |
| rogue  | fire      | 1500 | slime 3 (0 auto casts)  | lost    | 47.5    | 1     | 0        | 54  | fire:1 (0/0/0)                        |
| rogue  | water     | 1500 | lesson                  | won     | 22.5    | 1     | 0        | 60  | blizzard                              |
| rogue  | water     | 1500 | slime 1 (0 auto casts)  | won     | 36.0    | 1     | 0        | 64  | blizzard:1 (0/0/0)                    |
| rogue  | water     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | blizzard:1 (0/0/0)                    |
| rogue  | water     | 1500 | slime 3 (0 auto casts)  | lost    | 47.5    | 1     | 0        | 34  | blizzard:1 (0/0/0)                    |
| rogue  | earth     | 1500 | lesson                  | won     | 19.5    | 1     | 0        | 60  | quake                                 |
| rogue  | earth     | 1500 | slime 1 (0 auto casts)  | won     | 36.0    | 1     | 0        | 64  | quake:1 (0/0/0)                       |
| rogue  | earth     | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | quake:1 (0/0/0)                       |
| rogue  | earth     | 1500 | slime 3 (0 auto casts)  | lost    | 47.5    | 1     | 0        | 34  | quake:1 (0/0/0)                       |
| rogue  | wind      | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 100 | none                                  |
| rogue  | wind      | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 100 | none                                  |
| rogue  | wind      | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 100 | none                                  |
| rogue  | wind      | 1500 | lesson                  | won     | 27.0    | 1     | 0        | 100 | gale                                  |
| rogue  | wind      | 1500 | slime 1 (0 auto casts)  | won     | 36.0    | 1     | 0        | 104 | gale:1 (0/0/0)                        |
| rogue  | wind      | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 108 | gale:1 (0/0/0)                        |
| rogue  | wind      | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 112 | gale:1 (0/0/0)                        |
| rogue  | wind      | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 56  | gale:1 (0/0/0)                        |
| rogue  | lightning | 1500 | gate foreman try 1      | won     | 40.5    | 1     | 0        | 100 | none                                  |
| rogue  | lightning | 1500 | gate apprentice try 1   | lost    | 42.0    | 1     | 0        | 100 | none                                  |
| rogue  | lightning | 1500 | gate apprentice try 2   | won     | 25.5    | 1     | 0        | 100 | none                                  |
| rogue  | lightning | 1500 | lesson                  | lost    | 27.3    | 1     | 0        | 100 | none                                  |
| rogue  | nature    | 1500 | lesson                  | won     | 37.5    | 1     | 0        | 60  | natureConvert                         |
| rogue  | nature    | 1500 | slime 1 (1 auto casts)  | won     | 37.9    | 1     | 0        | 64  | natureConvert:1 (0/0/0)               |
| rogue  | nature    | 1500 | slime 2 (0 auto casts)  | won     | 33.0    | 1     | 0        | 68  | natureConvert:1 (0/0/0)               |
| rogue  | nature    | 1500 | slime 3 (0 auto casts)  | won     | 51.0    | 1     | 0        | 72  | natureConvert:1 (0/0/0)               |
| rogue  | nature    | 1500 | shroom 4 (0 auto casts) | lost    | 7.5     | 1     | 0        | 36  | natureConvert:1 (0/0/0)               |
