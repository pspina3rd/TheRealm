# Bounded mentor-prepared comparison

**Mentor preparation produces Lishal wins for Knight/Mage and Malificat wins for
Ranger/Knight at 1500 ms in this sample. All 2200 ms cells still lose.**
No production balance parameters were changed. This is a bounded diagnostic,
not approved balance or evidence that every class can complete the route.

## Preparation and limits

The comparison covers Lishal (level 19) and Malificat (level 21), four classes,
1500/2200 ms pace, and one combat seed (7919), for 32 cells. Both starter and
mentor cells use a 600-second instrumentation budget. Timeouts remain censored,
never losses; none occurred in this comparison.

Each independent fixture grants exactly enough XP through production `gainXp`
to reach the authored level: 75,869 cumulative XP for level 19 and 159,597 for
level 21. `investEarnedPoints` spends the resulting 36/40 earned points, first
making the class primary ready for its next level, then spreading stat ranks.
The same point allocation is used for both preparations.

Both fixtures receive 600 gil, paying production list prices for Flame Brand
(260), Forge Plate (220), two Herbs (16), one Ether (18), and inn rest (10):
524 spent, 76 left. Bell Supplies stocks each purchase. **The game already starts
with two Herbs and one Ether**, so total carried reserves are four Herbs and
two Ethers, also true of the original benchmark. The combat bot obeys production
item-use limits. Stock checks and paid prices do not establish merchant access.

Mentor preparation adds at most three genuinely offered, won lessons: class
primary level 2; Thunder level 1 against wind-aligned Lishal or Fire level 1
against arcane-aligned Malificat; and Regen level 1 (Cure is already known).
Rogue already knows Thunder, so its Lishal preparation needs only two lessons.
All lesson choices pass `lessonsFor`; production `lessonSpec`, `Battle`,
`prepareLesson`, and `resolveBattle` apply. Lesson seeds are 7919 plus lesson
index, with the existing good bot at 1500 ms and a 600-second budget. All 23
lessons win, taking 15–75 simulated seconds each. No lesson rewards are fabricated,
no new skill points are granted, and no direct spell-level assignment occurs.

Gear is bought before lessons; reserves and inn rest are bought after. Lessons
use no items. Production mana carries between lessons and into the final fight;
inn rest restores HP only. Thus this compares a preparation package, including
earned carried mana and changed spell alignment/piece odds, not an isolated
spell-level effect. Starting mana is recorded below. Starter cells begin with
zero mana as in the original benchmark.

Mentor positions are set to their production home-stop maps in this synthetic
fixture, without traversing a route. No story flags or world victories are
granted. This does not establish route access, resource acquisition, campaign
affordability, or human-playthrough completion. Combat uses the enemy's actual
map piece weighting, production dual odds, and the unchanged prepared bot.

## Findings

| Enemy     | Starter wins / 8 | Mentor wins / 8 | Losses (starter / mentor) | Censored |
| --------- | ---------------- | --------------- | ------------------------- | -------- |
| Lishal    | 0                | 2               | 8 / 6                     | 0        |
| Malificat | 1                | 2               | 7 / 6                     | 0        |

The longer budget exposes a starter Mage Malificat victory at 245.4 seconds,
previously censored at 180 seconds. Starter Rogue reaches 56 enemy HP before
losing at 219.3 seconds. The original no-win Malificat result therefore partly
reflects the instrumentation budget. Lishal's original all-loss pattern persists
for starter preparation but is broken by legitimately won lessons.

Knight wins both bosses at 1500 ms after training (Lishal 156.1 seconds, 53% HP;
Malificat 198.7 seconds, 65% HP). This rejects a simple conclusion that Knight
cannot win these encounters, while leaving slower-pace and route concerns open.
Every 2200 ms cell loses, including mentor-prepared heroes; pace sensitivity
remains the clearest unresolved pattern.

Preparation is not monotonically better: trained Mage loses Malificat, where
starter Mage wins, and trained Ranger/Rogue sometimes die earlier. The bot
eagerly casts every ready spell in insertion order, only gates direct Cure
above half HP, and does not gate Regen by HP or remaining regeneration. Every
boss spell advances the enemy gauge by 25%. Added spells also change alignment
and piece weighting. These are concrete policy confounders; this sample does
not isolate which causes a particular regression.

Lishal's attack is 24 + 13 = 37 before defense, and Malificat's is 26 + 14 = 40.
Forge Plate alone provides 10 defense, with further class/stat defense below.
These are repeated attrition hits rather than immediate one-hit defeats at
the sampled HP totals. There is no evidence here justifying a silent HP/attack
nerf. The attack cadence, cast gauge cost, spell policy, and board overflows need
to be considered together.

## Actionable next checks

1. Keep production tuning unchanged until a small comparison tests selective
   casting (avoid refreshing active Regen and evaluate its 25% boss-gauge cost)
   at 2200 ms. Use the same actual lesson wins and report retained mana.
2. Carry real resources through the second-half route separately, including
   merchant challenges and mentor travel. The fixture's large granted XP is
   not proof the authored levels are reachable without grinding.
3. Do not call either sample a win-rate estimate: it has one deterministic
   combat seed per class/pace and no gesture noise or human decisions.

## Reproduction and verification

`CAMPAIGN_PREPARED=1 CAMPAIGN_PREPARED_OUT=/tmp/realm-campaign-prepared.md npx vitest run tests/sim/campaignCombatPrepared.test.ts`

The diagnostic asserts paid resource accounting, earned-point conservation,
offered lessons and actual lesson victories; it deliberately does not assert
a combat win-rate band. Targeted diagnostic, ESLint, and TypeScript checks pass.

## Recorded cells

Seed 7919. Independent authored-level fixtures; 600 gil funding, 524 spent, production earned points.
600-second cap means timeout/censored, never loss. Lesson policy: good bot, 1500ms, no purchased supplies.

| Enemy     | Class  | Kit     | Pace | Fixture XP | SP spent | Lessons (spell:level:outcome:seconds)                      | Spells                            | Outcome | Seconds | Pieces | HP left | Enemy HP left | Overflows |
| --------- | ------ | ------- | ---- | ---------- | -------- | ---------------------------------------------------------- | --------------------------------- | ------- | ------- | ------ | ------- | ------------- | --------- |
| lishal    | ranger | starter | 1500 | 75869      | 36       | none                                                       | gale:1,cure:1                     | lost    | 144.9   | 112    | 0%      | 361           | 1         |
| lishal    | ranger | starter | 2200 | 75869      | 36       | none                                                       | gale:1,cure:1                     | lost    | 149.7   | 86     | 0%      | 320           | 1         |
| lishal    | ranger | mentor  | 1500 | 75869      | 36       | gale:2:won:21.0s, thunder:1:won:15.0s, regen:1:won:75.0s   | gale:2,cure:1,thunder:1,regen:1   | lost    | 103.8   | 78     | 0%      | 267           | 1         |
| lishal    | ranger | mentor  | 2200 | 75869      | 36       | gale:2:won:21.0s, thunder:1:won:15.0s, regen:1:won:75.0s   | gale:2,cure:1,thunder:1,regen:1   | lost    | 114.1   | 69     | 0%      | 493           | 1         |
| lishal    | knight | starter | 1500 | 75869      | 36       | none                                                       | quake:1,cure:1                    | lost    | 160.7   | 127    | 0%      | 413           | 1         |
| lishal    | knight | starter | 2200 | 75869      | 36       | none                                                       | quake:1,cure:1                    | lost    | 120.0   | 73     | 0%      | 597           | 2         |
| lishal    | knight | mentor  | 1500 | 75869      | 36       | quake:2:won:48.0s, thunder:1:won:15.0s, regen:1:won:22.5s  | quake:2,cure:1,thunder:1,regen:1  | won     | 156.1   | 115    | 53%     | -21           | 0         |
| lishal    | knight | mentor  | 2200 | 75869      | 36       | quake:2:won:48.0s, thunder:1:won:15.0s, regen:1:won:22.5s  | quake:2,cure:1,thunder:1,regen:1  | lost    | 138.8   | 77     | 0%      | 452           | 1         |
| lishal    | mage   | starter | 1500 | 75869      | 36       | none                                                       | shadow:1,cure:1                   | lost    | 104.5   | 77     | 0%      | 501           | 1         |
| lishal    | mage   | starter | 2200 | 75869      | 36       | none                                                       | shadow:1,cure:1                   | lost    | 145.2   | 86     | 0%      | 487           | 2         |
| lishal    | mage   | mentor  | 1500 | 75869      | 36       | shadow:2:won:33.0s, thunder:1:won:15.0s, regen:1:won:75.0s | shadow:2,cure:1,thunder:1,regen:1 | won     | 164.6   | 123    | 38%     | -6            | 1         |
| lishal    | mage   | mentor  | 2200 | 75869      | 36       | shadow:2:won:33.0s, thunder:1:won:15.0s, regen:1:won:75.0s | shadow:2,cure:1,thunder:1,regen:1 | lost    | 97.5    | 55     | 0%      | 600           | 1         |
| lishal    | rogue  | starter | 1500 | 75869      | 36       | none                                                       | thunder:1,cure:1                  | lost    | 104.4   | 77     | 0%      | 391           | 1         |
| lishal    | rogue  | starter | 2200 | 75869      | 36       | none                                                       | thunder:1,cure:1                  | lost    | 109.9   | 68     | 0%      | 600           | 1         |
| lishal    | rogue  | mentor  | 1500 | 75869      | 36       | thunder:2:won:40.5s, regen:1:won:21.0s                     | thunder:2,cure:1,regen:1          | lost    | 112.2   | 89     | 0%      | 215           | 1         |
| lishal    | rogue  | mentor  | 2200 | 75869      | 36       | thunder:2:won:40.5s, regen:1:won:21.0s                     | thunder:2,cure:1,regen:1          | lost    | 109.2   | 61     | 0%      | 477           | 1         |
| malificat | ranger | starter | 1500 | 159597     | 40       | none                                                       | gale:1,cure:1                     | lost    | 157.1   | 115    | 0%      | 353           | 2         |
| malificat | ranger | starter | 2200 | 159597     | 40       | none                                                       | gale:1,cure:1                     | lost    | 209.0   | 130    | 0%      | 124           | 2         |
| malificat | ranger | mentor  | 1500 | 159597     | 40       | gale:2:won:21.0s, fire:1:won:22.5s, regen:1:won:75.0s      | gale:2,cure:1,fire:1,regen:1      | won     | 103.7   | 80     | 39%     | -9            | 1         |
| malificat | ranger | mentor  | 2200 | 159597     | 40       | gale:2:won:21.0s, fire:1:won:22.5s, regen:1:won:75.0s      | gale:2,cure:1,fire:1,regen:1      | lost    | 144.8   | 82     | 0%      | 420           | 1         |
| malificat | knight | starter | 1500 | 159597     | 40       | none                                                       | quake:1,cure:1                    | lost    | 213.8   | 158    | 0%      | 212           | 2         |
| malificat | knight | starter | 2200 | 159597     | 40       | none                                                       | quake:1,cure:1                    | lost    | 174.3   | 97     | 0%      | 636           | 1         |
| malificat | knight | mentor  | 1500 | 159597     | 40       | quake:2:won:48.0s, fire:1:won:22.5s, regen:1:won:22.5s     | quake:2,cure:1,fire:1,regen:1     | won     | 198.7   | 141    | 65%     | -70           | 0         |
| malificat | knight | mentor  | 2200 | 159597     | 40       | quake:2:won:48.0s, fire:1:won:22.5s, regen:1:won:22.5s     | quake:2,cure:1,fire:1,regen:1     | lost    | 183.5   | 98     | 0%      | 348           | 1         |
| malificat | mage   | starter | 1500 | 159597     | 40       | none                                                       | shadow:1,cure:1                   | won     | 245.4   | 185    | 24%     | -4            | 3         |
| malificat | mage   | starter | 2200 | 159597     | 40       | none                                                       | shadow:1,cure:1                   | lost    | 179.2   | 97     | 0%      | 543           | 2         |
| malificat | mage   | mentor  | 1500 | 159597     | 40       | shadow:2:won:33.0s, fire:1:won:22.5s, regen:1:won:75.0s    | shadow:2,cure:1,fire:1,regen:1    | lost    | 144.8   | 113    | 0%      | 472           | 2         |
| malificat | mage   | mentor  | 2200 | 159597     | 40       | shadow:2:won:33.0s, fire:1:won:22.5s, regen:1:won:75.0s    | shadow:2,cure:1,fire:1,regen:1    | lost    | 107.3   | 66     | 0%      | 744           | 1         |
| malificat | rogue  | starter | 1500 | 159597     | 40       | none                                                       | thunder:1,cure:1                  | lost    | 219.3   | 157    | 0%      | 56            | 2         |
| malificat | rogue  | starter | 2200 | 159597     | 40       | none                                                       | thunder:1,cure:1                  | lost    | 192.0   | 112    | 0%      | 239           | 2         |
| malificat | rogue  | mentor  | 1500 | 159597     | 40       | thunder:2:won:40.5s, fire:1:won:22.5s, regen:1:won:75.0s   | thunder:2,cure:1,fire:1,regen:1   | lost    | 123.0   | 95     | 0%      | 597           | 2         |
| malificat | rogue  | mentor  | 2200 | 159597     | 40       | thunder:2:won:40.5s, fire:1:won:22.5s, regen:1:won:75.0s   | thunder:2,cure:1,fire:1,regen:1   | lost    | 134.1   | 84     | 0%      | 468           | 1         |

## Starting HP, defense and carried mana

| Enemy     | Class  | Kit     | Max HP (starts full) | Total defense | Mana                                                                         |
| --------- | ------ | ------- | -------------------- | ------------- | ---------------------------------------------------------------------------- |
| lishal    | ranger | starter | 226                  | 17            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| lishal    | ranger | mentor  | 226                  | 17            | {"fire":3,"water":6,"lightning":3,"nature":18,"earth":8,"arcane":1,"wind":7} |
| lishal    | knight | starter | 264                  | 18            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| lishal    | knight | mentor  | 264                  | 18            | {"fire":1,"water":7,"lightning":1,"nature":14,"earth":2,"arcane":1,"wind":4} |
| lishal    | mage   | starter | 184                  | 17            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| lishal    | mage   | mentor  | 184                  | 17            | {"fire":3,"water":6,"lightning":3,"nature":20,"earth":8,"arcane":1,"wind":7} |
| lishal    | rogue  | starter | 204                  | 17            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| lishal    | rogue  | mentor  | 204                  | 17            | {"fire":1,"water":0,"lightning":6,"nature":18,"earth":6,"arcane":7,"wind":0} |
| malificat | ranger | starter | 242                  | 18            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| malificat | ranger | mentor  | 242                  | 18            | {"fire":3,"water":6,"lightning":3,"nature":19,"earth":8,"arcane":1,"wind":7} |
| malificat | knight | starter | 290                  | 19            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| malificat | knight | mentor  | 290                  | 19            | {"fire":1,"water":7,"lightning":1,"nature":14,"earth":2,"arcane":1,"wind":4} |
| malificat | mage   | starter | 196                  | 18            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| malificat | mage   | mentor  | 196                  | 18            | {"fire":3,"water":6,"lightning":3,"nature":21,"earth":8,"arcane":1,"wind":7} |
| malificat | rogue  | starter | 218                  | 18            | {"fire":0,"water":0,"lightning":0,"nature":0,"earth":0,"arcane":0,"wind":0}  |
| malificat | rogue  | mentor  | 218                  | 18            | {"fire":3,"water":6,"lightning":3,"nature":19,"earth":8,"arcane":1,"wind":7} |
