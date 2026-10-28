# Second-half combat: preliminary viability check

Initial sample: **17 wins, 40 losses, 31 censored fights across 88 cells**. The conservative fixture does not establish viable second-half balance. No game parameters were changed by this check.

This is a synthetic encounter benchmark, not evidence that the player can earn these resources along the route. Each encounter starts independently at its enemy’s authored level, with 600 gil of fixture funding. Production XP and skill-point spending apply. Each class keeps its level-1 starting primary and Cure; there is no free mentor kit or promoted spell level.

Archive-tier preparation costs 214 gil: Iron Sword, Crystal Mail, two Herbs, one Ether, and an inn rest. Bell-tier preparation costs 524 gil: Flame Brand, Forge Plate, the same supplies, and rest. All purchases use production list-price calculations and valid stock. Early fixtures are deliberately less equipped than a hero who already bought Forgefyre gear; the route must be tested separately.

Each enemy is tested against all four classes at 1500 and 2200 ms per thinking step using seed 7919 and the prepared bot. Every fight uses the actual map’s piece weighting and production battle logic. **180 seconds is an instrumentation budget, not a gameplay cutoff.** Censored fights may still be winnable; they are not counted as losses.

## Findings

| Enemy        | Wins / 8 | Losses | Censored |
| ------------ | -------- | ------ | -------- |
| archiveEel   | 2/8      | 5      | 1        |
| cinderMote   | 3/8      | 3      | 2        |
| rootSentinel | 4/8      | 0      | 4        |
| glassEcho    | 1/8      | 5      | 2        |
| bellWisp     | 3/8      | 3      | 2        |
| relayKeeper  | 2/8      | 1      | 5        |
| ascentGolem  | 0/8      | 2      | 6        |
| irdrath      | 1/8      | 5      | 2        |
| vesperDuel   | 1/8      | 5      | 2        |
| lishal       | 0/8      | 8      | 0        |
| malificat    | 0/8      | 3      | 5        |

- The Lishal loses in all eight cells. The Malificat and Ascent Golem have no wins in this sample, with long fights censored as shown above.
- Knight has no wins in 22 cells (15 censored, seven losses). Mage and Rogue each have no wins at 2200 ms in 11 cells. These are sample-level warning patterns, not proof that human play is impossible.
- Irdrath wins once (Ranger, 1500 ms); Vesper’s duel wins once (Mage, 1500 ms).
- One seed per cell cannot estimate win rates, confidence intervals, or approved balance bands. It does not account for additional mentor training, a carried economy, the full game route, touch gesture noise, or a human’s strategy.
- Exact phased bosses and lantern-assisted Resurrection remain separate encounter work. This matrix checks the current combat patterns only; it does not verify the proposed phase mechanics.

## Reproduction

Run `CAMPAIGN_COMBAT=1 CAMPAIGN_COMBAT_OUT=/tmp/realm-campaign-combat.md npx vitest run tests/sim/campaignCombat.test.ts`.

The opt-in matrix intentionally fails if an enemy has no winning class/pace cell. The ordinary default test checks that the fixture pays for preparation and spends only earned skill points. The matrix is a diagnostic, not a release acceptance test.

## Next validation

Investigate the Lishal’s all-loss pattern, the Knight’s low damage/survival pattern, and the touch-pace disparity before calling combat balanced. A bounded mentor-prepared comparison may help distinguish missing preparation from enemy tuning. Record any parameter or fixture changes explicitly and rerun only the affected sample. Then test resource acquisition and the complete route separately.

## Initial cell results

| Enemy        | Class  | Level | Pace ms | Gil spent | SP spent | Gear                  | Outcome | Seconds | Pieces | HP left | Overflows |
| ------------ | ------ | ----- | ------- | --------- | -------- | --------------------- | ------- | ------- | ------ | ------- | --------- |
| archiveEel   | ranger | 13    | 1500    | 214       | 24       | ironSword/crystalMail | won     | 99.4    | 69     | 10%     | 1         |
| archiveEel   | ranger | 13    | 2200    | 214       | 24       | ironSword/crystalMail | lost    | 106.6   | 54     | 0%      | 1         |
| archiveEel   | knight | 13    | 1500    | 214       | 24       | ironSword/crystalMail | timeout | 180.0   | 129    | 12%     | 1         |
| archiveEel   | knight | 13    | 2200    | 214       | 24       | ironSword/crystalMail | lost    | 125.6   | 62     | 0%      | 1         |
| archiveEel   | mage   | 13    | 1500    | 214       | 24       | ironSword/crystalMail | lost    | 75.7    | 54     | 0%      | 1         |
| archiveEel   | mage   | 13    | 2200    | 214       | 24       | ironSword/crystalMail | lost    | 77.7    | 41     | 0%      | 1         |
| archiveEel   | rogue  | 13    | 1500    | 214       | 24       | ironSword/crystalMail | won     | 96.0    | 68     | 3%      | 1         |
| archiveEel   | rogue  | 13    | 2200    | 214       | 24       | ironSword/crystalMail | lost    | 92.5    | 47     | 0%      | 1         |
| cinderMote   | ranger | 14    | 1500    | 214       | 26       | ironSword/crystalMail | won     | 67.6    | 45     | 70%     | 0         |
| cinderMote   | ranger | 14    | 2200    | 214       | 26       | ironSword/crystalMail | won     | 99.0    | 44     | 53%     | 0         |
| cinderMote   | knight | 14    | 1500    | 214       | 26       | ironSword/crystalMail | timeout | 180.0   | 129    | 44%     | 1         |
| cinderMote   | knight | 14    | 2200    | 214       | 26       | ironSword/crystalMail | timeout | 180.0   | 81     | 49%     | 0         |
| cinderMote   | mage   | 14    | 1500    | 214       | 26       | ironSword/crystalMail | lost    | 151.8   | 112    | 0%      | 2         |
| cinderMote   | mage   | 14    | 2200    | 214       | 26       | ironSword/crystalMail | lost    | 141.3   | 72     | 0%      | 1         |
| cinderMote   | rogue  | 14    | 1500    | 214       | 26       | ironSword/crystalMail | won     | 115.5   | 84     | 10%     | 1         |
| cinderMote   | rogue  | 14    | 2200    | 214       | 26       | ironSword/crystalMail | lost    | 141.3   | 72     | 0%      | 1         |
| rootSentinel | ranger | 15    | 1500    | 214       | 28       | ironSword/crystalMail | won     | 137.9   | 98     | 36%     | 1         |
| rootSentinel | ranger | 15    | 2200    | 214       | 28       | ironSword/crystalMail | won     | 170.5   | 84     | 45%     | 1         |
| rootSentinel | knight | 15    | 1500    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 120    | 45%     | 0         |
| rootSentinel | knight | 15    | 2200    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 94     | 42%     | 1         |
| rootSentinel | mage   | 15    | 1500    | 214       | 28       | ironSword/crystalMail | won     | 96.5    | 67     | 100%    | 0         |
| rootSentinel | mage   | 15    | 2200    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 95     | 2%      | 2         |
| rootSentinel | rogue  | 15    | 1500    | 214       | 28       | ironSword/crystalMail | won     | 121.3   | 89     | 22%     | 1         |
| rootSentinel | rogue  | 15    | 2200    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 95     | 59%     | 1         |
| glassEcho    | ranger | 16    | 1500    | 214       | 30       | ironSword/crystalMail | won     | 90.1    | 68     | 39%     | 1         |
| glassEcho    | ranger | 16    | 2200    | 214       | 30       | ironSword/crystalMail | lost    | 134.1   | 67     | 0%      | 1         |
| glassEcho    | knight | 16    | 1500    | 214       | 30       | ironSword/crystalMail | timeout | 180.0   | 128    | 18%     | 1         |
| glassEcho    | knight | 16    | 2200    | 214       | 30       | ironSword/crystalMail | timeout | 180.0   | 87     | 10%     | 1         |
| glassEcho    | mage   | 16    | 1500    | 214       | 30       | ironSword/crystalMail | lost    | 116.8   | 87     | 0%      | 1         |
| glassEcho    | mage   | 16    | 2200    | 214       | 30       | ironSword/crystalMail | lost    | 120.0   | 60     | 0%      | 1         |
| glassEcho    | rogue  | 16    | 1500    | 214       | 30       | ironSword/crystalMail | lost    | 116.8   | 87     | 0%      | 1         |
| glassEcho    | rogue  | 16    | 2200    | 214       | 30       | ironSword/crystalMail | lost    | 120.0   | 60     | 0%      | 1         |
| bellWisp     | ranger | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | won     | 84.7    | 62     | 61%     | 0         |
| bellWisp     | ranger | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 144.3   | 74     | 0%      | 1         |
| bellWisp     | knight | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | timeout | 180.0   | 141    | 17%     | 2         |
| bellWisp     | knight | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | timeout | 180.0   | 90     | 7%      | 1         |
| bellWisp     | mage   | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | won     | 70.2    | 53     | 92%     | 0         |
| bellWisp     | mage   | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 168.6   | 93     | 0%      | 1         |
| bellWisp     | rogue  | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | won     | 58.8    | 45     | 80%     | 0         |
| bellWisp     | rogue  | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 136.1   | 69     | 0%      | 1         |
| relayKeeper  | ranger | 18    | 1500    | 524       | 34       | flameBrand/forgePlate | timeout | 180.0   | 138    | 15%     | 2         |
| relayKeeper  | ranger | 18    | 2200    | 524       | 34       | flameBrand/forgePlate | timeout | 180.0   | 105    | 11%     | 2         |
| relayKeeper  | knight | 18    | 1500    | 524       | 34       | flameBrand/forgePlate | lost    | 168.4   | 131    | 0%      | 2         |
| relayKeeper  | knight | 18    | 2200    | 524       | 34       | flameBrand/forgePlate | timeout | 180.0   | 105    | 31%     | 2         |
| relayKeeper  | mage   | 18    | 1500    | 524       | 34       | flameBrand/forgePlate | won     | 152.7   | 120    | 61%     | 2         |
| relayKeeper  | mage   | 18    | 2200    | 524       | 34       | flameBrand/forgePlate | timeout | 180.0   | 105    | 33%     | 2         |
| relayKeeper  | rogue  | 18    | 1500    | 524       | 34       | flameBrand/forgePlate | won     | 170.3   | 136    | 5%      | 2         |
| relayKeeper  | rogue  | 18    | 2200    | 524       | 34       | flameBrand/forgePlate | timeout | 180.0   | 106    | 7%      | 2         |
| ascentGolem  | ranger | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 138    | 18%     | 2         |
| ascentGolem  | ranger | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 104    | 49%     | 1         |
| ascentGolem  | knight | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 131    | 53%     | 1         |
| ascentGolem  | knight | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 91     | 32%     | 1         |
| ascentGolem  | mage   | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 160.9   | 130    | 0%      | 2         |
| ascentGolem  | mage   | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 106    | 53%     | 1         |
| ascentGolem  | rogue  | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 146.7   | 113    | 0%      | 2         |
| ascentGolem  | rogue  | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | timeout | 180.0   | 106    | 43%     | 1         |
| irdrath      | ranger | 15    | 1500    | 214       | 28       | ironSword/crystalMail | won     | 102.4   | 68     | 59%     | 0         |
| irdrath      | ranger | 15    | 2200    | 214       | 28       | ironSword/crystalMail | lost    | 126.2   | 65     | 0%      | 0         |
| irdrath      | knight | 15    | 1500    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 123    | 19%     | 1         |
| irdrath      | knight | 15    | 2200    | 214       | 28       | ironSword/crystalMail | lost    | 113.5   | 55     | 0%      | 1         |
| irdrath      | mage   | 15    | 1500    | 214       | 28       | ironSword/crystalMail | timeout | 180.0   | 131    | 7%      | 1         |
| irdrath      | mage   | 15    | 2200    | 214       | 28       | ironSword/crystalMail | lost    | 122.2   | 67     | 0%      | 0         |
| irdrath      | rogue  | 15    | 1500    | 214       | 28       | ironSword/crystalMail | lost    | 147.3   | 111    | 0%      | 1         |
| irdrath      | rogue  | 15    | 2200    | 214       | 28       | ironSword/crystalMail | lost    | 123.2   | 69     | 0%      | 0         |
| vesperDuel   | ranger | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | timeout | 180.0   | 134    | 27%     | 1         |
| vesperDuel   | ranger | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 89.7    | 46     | 0%      | 0         |
| vesperDuel   | knight | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | lost    | 171.8   | 117    | 0%      | 1         |
| vesperDuel   | knight | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | timeout | 180.0   | 82     | 22%     | 0         |
| vesperDuel   | mage   | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | won     | 135.3   | 92     | 100%    | 0         |
| vesperDuel   | mage   | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 91.5    | 51     | 0%      | 0         |
| vesperDuel   | rogue  | 17    | 1500    | 524       | 32       | flameBrand/forgePlate | lost    | 164.7   | 119    | 0%      | 1         |
| vesperDuel   | rogue  | 17    | 2200    | 524       | 32       | flameBrand/forgePlate | lost    | 91.5    | 51     | 0%      | 0         |
| lishal       | ranger | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 144.9   | 112    | 0%      | 1         |
| lishal       | ranger | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | lost    | 149.7   | 86     | 0%      | 1         |
| lishal       | knight | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 160.7   | 127    | 0%      | 1         |
| lishal       | knight | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | lost    | 120.0   | 73     | 0%      | 2         |
| lishal       | mage   | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 104.5   | 77     | 0%      | 1         |
| lishal       | mage   | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | lost    | 145.2   | 86     | 0%      | 2         |
| lishal       | rogue  | 19    | 1500    | 524       | 36       | flameBrand/forgePlate | lost    | 104.4   | 77     | 0%      | 1         |
| lishal       | rogue  | 19    | 2200    | 524       | 36       | flameBrand/forgePlate | lost    | 109.9   | 68     | 0%      | 1         |
| malificat    | ranger | 21    | 1500    | 524       | 40       | flameBrand/forgePlate | lost    | 157.1   | 115    | 0%      | 2         |
| malificat    | ranger | 21    | 2200    | 524       | 40       | flameBrand/forgePlate | timeout | 180.0   | 112    | 56%     | 1         |
| malificat    | knight | 21    | 1500    | 524       | 40       | flameBrand/forgePlate | timeout | 180.0   | 135    | 15%     | 2         |
| malificat    | knight | 21    | 2200    | 524       | 40       | flameBrand/forgePlate | lost    | 174.3   | 97     | 0%      | 1         |
| malificat    | mage   | 21    | 1500    | 524       | 40       | flameBrand/forgePlate | timeout | 180.0   | 132    | 55%     | 2         |
| malificat    | mage   | 21    | 2200    | 524       | 40       | flameBrand/forgePlate | lost    | 179.2   | 97     | 0%      | 2         |
| malificat    | rogue  | 21    | 1500    | 524       | 40       | flameBrand/forgePlate | timeout | 180.0   | 130    | 12%     | 2         |
| malificat    | rogue  | 21    | 2200    | 524       | 40       | flameBrand/forgePlate | timeout | 180.0   | 101    | 26%     | 1         |
