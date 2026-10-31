# Encounter purpose and intent review

Independent design audit of the current authored enemy and non-enemy encounters.
This is read-only production review; recommendations do not authorize new M2a
mechanics, rewritten character dialogue, changed M1 solutions, or new rewards.
Initial disposition: changes required in generic combat targeting, mentor target
setup, and the surfaced distinction between character intent and task pressure.

## Core distinction

A board obstacle is not automatically an act of hostility by the portrait beside
it. Separate:

- **Hostile action:** the faced enemy deliberately impedes a current player plan.
- **Competitive action:** a merchant protects a price or offers a counterbid.
- **Cooperation/teaching:** a person provides an authored demonstration, supplies,
  protected objective or a safe practice target.
- **Environment/task:** mold, rot, a damaged frame, wind or an exact procedure is
  the problem both characters want solved.

Retain actual challenge objectives and their counters. Context can explain why
they exist; it must not silently create a different game under the same story.

## Baseline findings

1. `magicEncounters.ts` gives Slime and Goblin two fixed obstruction positions,
   then random move selection chooses whether to use them. Durability/color
   differ, but positions ignore the current board and their authored motives.
   This is not evidence of a goal-directed opponent.
2. `LessonChallenge.prepareMagicTargets` injects a generic obstruction and loose
   colored block for every lesson. It can create unrelated stone in a healing,
   Arcane-drain or higher-level lesson. Teach the selected operation; do not
   equate all mentors with the same two props.
3. Most non-enemy encounters already have specific authored objectives and
   pressure. They need honest purpose/context presentation, not generic enemy
   obstruction logic. Their absence of hostile actions is intentional.
4. The UI must distinguish the source of pressure, current action/counterplay,
   and the actual success condition. An HP-style “opponent” framing is misleading
   for repairing Odile's drain or helping Ketter support a lift.

## Non-enemy inventory and exact preservation requirements

### M1 authored encounters

| ID / person           | Actual purpose and relationship                    | Pressure and existing counterplay to preserve                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elder` / Rowan       | Cooperate to clear the well pipe                   | Mold rises toward the lip; place the authored pieces, dig to the pipe. Rowan's first demonstration and one correction help; he is not adding hostile stone.                                                                              |
| `kid` / Pip           | Cooperate to restore the tower spinner             | Authored outline, spare toy-box zone, cracks/wobble and finite queue. His demonstration is instructional, not a rival move. Preserve the exact fixed solution and spare correction.                                                      |
| `farmer` / Bean       | Cooperate to seed her herb beds                    | Green furrows, wrong-color consequences, soil ridges and piece/day limit. The supplied green pieces are disclosed help; no generic attacks.                                                                                              |
| `stallKeeper` / Ordor | Compete over a fair sale price                     | Scripted rival growth/clears/counteroffer rows and price meter; big clears send/cancel offers. Preserve the existing duel script/grade/economy. Counteroffers are not bodily attacks.                                                    |
| `forager` / Wren      | Cooperate to contain rot while saving young caps   | Hazard spread threatens protected caps; clear rot, save the required caps, preserve piece limit. Wren is not spreading rot. Existing intro about planting green is not the mechanical CONTAIN goal; use the actual objective in task UI. |
| `guard` / Vale        | Cooperate to power the ward lamps and earn passage | Pure blue/violet lines, bounded supply, lamp order, wind snuff telegraph and retry/assist. Wind is environmental; Vale is testing safe lamp power, not sabotaging the player.                                                            |

### First-half crystal tasks and offerings

| ID / person             | Concrete task                                     | Constraint/counterplay which remains authoritative                                                                                                    |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sage` / Orrin          | Repair the storm-damaged roof lattice             | Exact puzzle rows/queue/line target. No new interference; advertised Lightning reward and known-spell replacement remain intact.                      |
| `collector` / Nim       | Clean a Goblin Charm for his collection           | Requires that inventory item, then score within the piece budget. Item is consumed on success only. No false monster intent or free item duplication. |
| `shrineKeeper` / Myst   | Restore the clouded shrine spring                 | Actual blue10/green6 cleared-crystal quota in 30 pieces. Explain collection; do not turn Myst into a mana-draining adversary.                         |
| `sealedChest`           | Open an inanimate crystal seal                    | Exact fixed puzzle, no character motivation or random opponent actions. Preserve contents and finite queue.                                           |
| `hermit` / Steve        | Process a Moon Shard into salves                  | The offered item, score target and piece budget define the exchange. No damage to an ally and no item consumption on failure.                         |
| `fisher` / Tam          | Repair nets damaged by lurkers                    | Blue8 in 21 pieces. The damaged net is the task; Tam has no authored attack behavior.                                                                 |
| `foreman` / Flint       | Clear the rockslide road to Forgefyre             | Orange10/violet6 in 28 pieces, then the actual ridge gate flag. Rubble is environmental, not Flint's deliberate sabotage.                             |
| `apprentice` / Cinda    | Forge the peak-gate key while Torva's hands shake | Red10/orange6 in 28 pieces. The fire/metal procedure is the goal; preserve key flag and free retry/economy rules.                                     |
| `beaconKeeper` / Ysolde | Recharge the dead warning beacon                  | Gold10 in 28 pieces. Preserve quota and reward; do not invent a hostile sentry behavior.                                                              |
| `courier` / Twitch      | Recover letters blown from the satchel            | Cyan10 in 28 pieces. Gusts are the problem; the courier wants the letters recovered.                                                                  |
| `scholar` / Ivo         | Relight the dark moon rune                        | Violet10 in 28 pieces. Preserve the quota; Arcane affiliation does not make the scholar hostile.                                                      |

### Vesper's first-half appearances

| ID            | Actual authored challenge             | Correct framing                                                                                                                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vesperRoad`  | Exact two-O frame puzzle              | Deliberate intimidation/test from an antagonistic character, but the fixed challenge is the chosen form of pressure. Do not replace it with the later Vesper duel. |
| `vesperRidge` | Herb offering, score600 in 16 pieces  | Coercive/bargaining test with a real required item, not a new combat move. Preserve success-only item consumption and lore/shard result.                           |
| `vesperPeaks` | Exact O/I puzzle, three lines         | An authored obstruction/test; preserve fixed solution and no random additions.                                                                                     |
| `vesperRuins` | Ether offering, score900 in 20 pieces | Another authored toll/test, preserving item and reward rules. This is not Vesper's evolved form or a free extra boss fight.                                        |

Vesper is not a friendly helper, but an antagonist's motive does not license
changing every early appearance into live combat. Likewise a cooperative NPC's
strict procedure is not an attack merely because it can fail.

### Campaign cooperation and procedures

| ID / person                          | Concrete shared purpose                              | Preserve                                                                                                    |
| ------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `archiveDrain` / Odile               | Shift the pallet while she holds the sluice          | Exact two-O drain puzzle and descent milestone. Water pressure is environmental.                            |
| `cisternTrial` / Odile               | Test flow with sleeping chambers shut                | Blue8/green4 in 28 pieces. Odile cooperates; do not make her intentionally flood the player.                |
| `rootTram` / Rafe                    | Brace a root-lifted tram rail                        | Exact I brace puzzle and tram flag. Roots/derelict machinery are the problem.                               |
| `ketterRescue` / Ketter              | Secure the frayed-rope lift before lowering          | Exact three-O rescue puzzle. Ketter is endangered, not an enemy dropping obstacles.                         |
| `bellCircuit` / Ketter               | Seat fittings while relief keeps the bell            | Exact two-O return-bell puzzle. Disclosed relief help is cooperative.                                       |
| `foundryProcedure` / inspection rail | Satisfy an inanimate inspection procedure            | Exact I/four-line puzzle and procedure flag; no personal motives, attacks or invented merchant.             |
| `ascentRepair` / Ketter, with Odile  | Hold the wheel while Ketter repairs the beam         | Gold8/orange8 in 35 pieces. Preserve the cooperative division of labor and ascent flag.                     |
| `fennickRite` / Fennick, with Ketter | Fit the recovered sequence to checked station frames | Exact O/I three-line rite puzzle, not a random duel against Fennick. Preserve prepared-ward/story sequence. |

All mandatory campaign tasks remain available at any attitude and do not require
new inventory, spells or gil. Context/intent work must not add a late-campaign
softlock or require a custom spell to complete a fixed solution.

### Shops and price negotiations

`merchant` (Lo), `smith` (Pyre), `innkeeper` (Pete), `armorer` (Garrick),
`forgeInn` (Rosa), and `eyrieInn` (Ada) are shop/rest identities. In the current
data several have no challenge and offer ordinary browsing/rest services; do not
claim they execute haggle attacks merely because their introduction mentions a
game or fair price. `archiveMerchant` (Quill) and `bellMerchant` (Ash) explicitly
have haggle price challenges. Ordor uses the authored M1 scripted price duel.

For every supported price challenge, show the actual price meter, timer/piece
budget and browse alternative. Competitive intent is to protect price/supplies,
not kill the shopper. Existing town-scoped discounts, persistent markup rules,
reward bands and skip/browse access must not be changed under an intent label.
Do not add a charge for merely reading a preview or a hidden extra item reward.

## Mentor lessons: operation-specific cooperation

The mentor intends learning, while a summoned trial foe supplies bounded
resistance. The UI must distinguish their help, the practiced spell and the foe's
actions. Do not attribute hostile wisp attacks to the mentor.

- **Fire:** a small clearly ordinary burnable set; leave an earned-mana route and
  show which rows can burn. Do not add irrelevant durable stone as the main goal.
- **Ice:** an identifiable gap/completable row demonstrating blank fill, then row
  removal. The demonstration must not claim blanks earn mana.
- **Gravity:** an unsupported unanchored block above a visible empty landing
  space. Do not anchor the only target, or let an unrelated earlier clear settle
  it before the taught spell can act; refresh disclosed teaching setup if needed.
- **Wind:** room for a legal sideways shift, with explicit direction and the
  before/after difference. A meaningful manual shift may be score-neutral;
  teaching must not confuse the automatic heuristic with whether the spell works.
- **Lightning:** an obstruction with visible durability, and no automatic row
  completion from the foe's placement. Show opening space after its required hits.
- **Nature:** an obstruction with visible strength which converts to blank;
  distinguish the remaining material from Lightning's opened space.
- **Primary Arcane:** the faced trial foe is the target. Do not inject board stone
  to justify a character drain. At full HP, damage still makes the attack useful;
  never secretly injure the hero just to make a healing animation look necessary.
- **Manual healing/support:** use actual effect eligibility, not generic stone;
  disclose when full HP or no target makes the support unavailable. A lesson may
  wait for authored foe pressure; do not create hidden resource grants/damage.

A next-level lesson practices the current learned level and awards the next only
on victory. Preserve lent ownership, actual cost, shield behavior, earned mana,
mentor help, retry/seal rules, and the lesson-to-normal-AUTO transition. The
mentor is not a new M2a rival AI.

## Enemy intent and visible counterplay

A dynamic enemy action should pursue its authored objective on the visible
current board, not always write two stones at absolute coordinates. Slime can
clog a live working gap with goo; Goblin can threaten a useful well/space with
rubble and stakes. Preserve distinct material, durability and accessible color
counterplay, and the authored direct attacks/secondary actions.

- Build legal candidate actions from the actual board, excluding occupied cells,
  the active falling piece and spawn-safety region. Score obstruction of a
  visible player plan rather than row creation or pure randomness.
- Keep at least one honest response: ordinary line clears/color contacts, or
  learned spells as alternatives. Do not create a color-locked obstruction whose
  required contacts can never be reached.
- Preview the actual selected cells, strength and color requirement before they
  land. If the board changes, skip illegal cells rather than silently retargeting
  an unseen surprise. Re-select only for the next clearly previewed action.
- Do not complete a player row, award mana/score or supply a winning piece from
  an ordinary hostile action. Deliberate player Arcane counterplay and explicitly
  helpful authored actions remain separate exceptions.
- Repeated obstruction requests on occupied or useless cells should not masquerade
  as successful adaptive pressure. A move can be unavailable; preserve other
  authored enemy actions instead of forcing an unfair spawn-blocking placement.

## Authored hostile families: reuse their real actions, do not flatten them

The existing enemy data already distinguishes motives/materials. Adaptive
selection and intent summaries should preserve those differences rather than
turn every listed foe into the same obstruction caster.

| Authored identities                                                                   | Existing pressure and concrete purpose/counterplay                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slime`                                                                               | Goo hardens/clogs the working board; visible low-gap interference and low-strength ordinary clears/contact/Lightning/Nature alternatives fit the description.                                                                                 |
| `goblin`, `goblinDigger`                                                              | Rock toss plus stakes deny space/columns; target a visible useful channel rather than adding the same rocks everywhere. Keep the authored column-seal timer distinct from destructible stone.                                                 |
| `shroom`, `leafSprite`                                                                | Spores/pollen hurry pieces and obscure the preview; pacing and limited preview are the pressure. Do not pretend they physically throw generic boulders.                                                                                       |
| `sproutling`, `thornTroll`                                                            | Seed hardening or bramble growth, with self-recovery. Ordinary line/contact/spell clearing counters material pressure; healing should actually restore missing enemy HP rather than being described as a successful full-health action.       |
| `drip`, `archiveEel`                                                                  | Mist or siphoning earned mana. Drains should have an existing pool to drain; their action does not remove an owned spell or change learned rank.                                                                                              |
| `lakeLurker`, `tideOgre`                                                              | Undertow/column restriction and silt. Temporary seals have a visible duration; raised silt is removable material, not an unannounced permanent lock.                                                                                          |
| `quarryHound`, `brute`, `stoneOgre`, `ascentGolem`                                    | Grit/boulders/rubble and heavy strikes. Preserve attack pace and pressure budget; material targeting should not jump into the active piece or instant-fill the spawn.                                                                         |
| `cinder`, `cinderMote`, `magmaDrake`                                                  | Ash/slag hardens the board, with heat/speed or breath attacks. Their hardened cells need the same honest obstruction response as other enemy-created stone.                                                                                   |
| `forgeImp`, `moonImp`, `shadeImp`                                                     | Heat/mana theft, fog, self-mending or stone. Select an actually useful authored action, and keep direct damage/temporary statuses separate from physical cells.                                                                               |
| `sparkPup`, `stormGoblin`, `thunderhide`                                              | Charged haste, rods/seals, fog and strong strikes. They have a timing/visibility identity; no new universal stone attack is needed.                                                                                                           |
| `puffball`, `galeBat`, `skyRam`, `bellWisp`                                           | Gusts, preview disruption, pace and authored rockfall. A wind enemy is not automatically a helpful line-clearing ally; actions which materially aid a player clear must be deliberate player counterplay or authored help.                    |
| `watcher`, `nightBat`, `gloomToad`, `glassEcho`                                       | Petrification, mana theft, self-heal and preview haze. Glass Echo explicitly obscures preview, never the landing; intent copy must preserve that visibility boundary.                                                                         |
| `rootSentinel`, `relayKeeper`                                                         | Tangled tracks/relay grounding and fallen fittings are failed machinery/caretaker orders enacted by hostile bodies. Keep their known moves and visible counterplay; do not confuse them with the cooperative Rafe/Ketter repair tasks nearby. |
| `moonWyrm`                                                                            | Authored midpoint Ordeal/false-victory boss. Preserve its mixed existing pressure, attack weights, enrage and narrative outcome. “Smarter” does not authorize a different boss sequence.                                                      |
| `irdrath`                                                                             | Ash/smoke/Firstcoal guardian of the sleeping chambers. Preserve hardening, smoke and attacks; counterplay should concern the authored material and visibility.                                                                                |
| `vesperDuel`                                                                          | Vesper's bodily defense of the relay, with mana/column pressure. Keep it separate from early fixed tests and the final evolved form.                                                                                                          |
| `lishal`                                                                              | Seven singers keep the sounding frame turning; haste/drain/chord attacks embody that mechanism. Preserve the existing encounter rather than inventing a new M2a singing minigame.                                                             |
| `malificat`                                                                           | Final evolved Vesper draws from all stones while the prepared ward prevents escape. Keep the authored ward prerequisites, full finale and outcome; no generic NPC aid may bypass this structure.                                              |
| `emberWisp`, `tideWisp`, `sparkWisp`, `mossWisp`, `stoneWisp`, `moonWisp`, `galeWisp` | Summoned lesson resistance. The foe resists while the mentor teaches; that separation must remain visible. Do not attribute trial damage or environmental pressure to a cooperative mentor's hostility.                                       |

Useful-action filtering should not silently increase all enemies' attack output
by removing every harmless turn and replacing it with the strongest attack.
Respect authored move budgets, pace, phase/enrage and the current player's visible
board. Any change in action policy needs bounded encounter checks, not an
assumption that “optimal hostility” is always the author's intended difficulty.

## Returned cross-enemy counterplay defect

At the audit baseline, `Board.petrify` changes ordinary crystals to raw `stone`,
and `Battle.pushRows` creates raw stone for enemy curses. Neither path records
an obstruction owner or strength. Standard Lightning/Nature inspect registered
`Obstruction` records, so most existing enemies' stone is invisible to those
counterspells. Conversely, Fire's non-obstruction branch can burn those enemy
stones as ordinary material. Adapting only Slime/Goblin placement would leave
this mismatch across the rest of the hostile catalog.

Recommended bounded correction: register **enemy-caused** petrification and curse
rubble as owned, one-row-clear-strength obstructions, unless a current authored
move already explicitly supplies different durability. Preserve existing tags,
positions and ordinary one-clear removal. Keep M1 puzzle terrain, merchant sends,
neutral soil ridges and environmental material separate; do not normalize all
raw stone globally into hostile actors. No new durability penalty or new colored
requirement should be invented to retrofit ownership.

Re-review should verify Lightning opens those enemy-created spaces, Nature
leaves blank/no-mana material, owner-targeted Arcane affects only that actor, and
ordinary row clearing still removes strength-one material in one clear. Temporary
column seals/fog remain their own statuses with their authored counters; merely
being an enemy effect does not turn every status into a destructible stone cell.

## Fairness, economy and preview invariants

- Context/preview rendering is read-only: no RNG consumption, paid resource use,
  timer progress, item removal, regard change, flag grant, discount or reward.
- Existing fixed puzzle queues, layouts and solution counts remain byte-for-byte
  unless a separate authored correction is requested. Generic interference must
  not invalidate the exact Sage/chest/Vesper/campaign repair solutions.
- Mandatory campaign tasks stay available across attitudes and do not acquire
  hidden spell, gil or item prerequisites. Assistance must not auto-win a rite,
  unlock a gate, or fake a boss defeat.
- Offerings consume exactly the required item only on successful settlement;
  missing-item views, preview, refusal, failure and cancellation consume none.
- Haggles retain their actual bounded price bands, markup/discount lifetime and
  browse/rest alternative. Intent labels do not change town economy or turn a
  completed timer into an unadvertised extra reward.
- Hostile placement still leaves a gap and never creates unearned player clears,
  mana, score or damage. Forecasted targets stay stable through the warning;
  newly illegal cells are skipped rather than secretly retargeted after input.
- Explicit helpful demonstrations and mentor supplies remain disclosed and
  bounded. Do not revive the earlier hidden timed ally which cleared player
  lines without explanation.
- Preview/intent labels must be tied to actual instance data: selected board
  cells, current goal, remaining quota, current durability, next weather event or
  price counter. Generic “preparing an attack” is not adequate context for a
  neutral repair or barter.

## Re-review acceptance checklist

1. Hostile Slime/Goblin plans select legal, goal-relevant cells on different
   visible boards; previews match execution, with safe/no-useful-target fallback.
2. Legacy enemy petrify/curse material participates in honest owner-aware
   counterplay without changing fixed non-combat terrain or row-clear strength.
3. Every mentor's first selected operation has its own meaningful demo/target;
   no unnecessary generic stone is injected into character-drain/healing lessons.
4. Each of the six M1 objectives and all fixed campaign/first-half puzzles retain
   their authored mechanics, exact known solutions, corrections, retry and
   resource rules after contextual intent is added.
5. Barter quotas, offering procedure/items, price negotiation and ordinary shop
   browsing are presented according to their actual purpose and remain solvable
   under the same authored resources.
6. UI context correctly names environment pressure versus helper/foe action,
   including before acceptance and while the board is active. Neutral tasks have
   no fabricated hostile action or HP objective.
7. Existing story voices remain intact. The author may revise contradictory
   dialogue separately; implementation explanations are system UI, not invented
   character speeches.

Initial scope is review of existing authored behavior and these corrections;
no new M2a mechanics or blanket human/story-context approval is implied.

## Independent staged correction review

Reviewed `848dedb`, `cbe9673` and `e61f044` plus the live working tree.
Disposition: **changes required**, bounded to the items below. This is an
independent source/mechanical review, not player acceptance or campaign balance
approval.

The new Slime and Goblin profiles have distinct board purposes, deterministic
material, frozen targets and safe attack fallback. Execution revalidates the
advertised cells rather than silently choosing replacements. School-specific
practice samples are neutral or explicitly owned practice material, preserve
existing useful work, avoid active/ghost travel, and do not inject generic
hostile stones into opponent-targeted Arcane. Context separates cooperative
repairs, weather pressure, price contests and hostile creature actions.

### Required corrections

1. **Incoming curse material bypasses owner interference.** `Battle.ownEnemyCells`
   registers stones after raw row insertion, without the modifier or placement
   lifecycle used by `ArcaneInterference.place`. Independent runtime check:
   activate Nature 1 and Gravity 2 for Slime, then push one owned curse row.
   Result: nine anchored owner stones, zero neutral conversions, empty placement
   counts, and both effect counters unchanged. Standard Lightning/Nature can now
   reach these stones, but advanced Nature/Wind promises and Gravity duration
   remain false for these arrivals. Route actual incoming enemy rubble through
   the same owner lifecycle, preserving authored strength 1 and the row's gap.
   Petrify transforms existing material, so its arrival/redirection policy may
   differ, but Gravity ownership and duration need an explicit, consistent rule.
   Keep neutral/environment/helper rows outside hostile ownership.
2. **Disclose the existing next-packet Ice limit accurately.** The deliberate
   existing contract (`docs/BUILD_LOG.md`, lines 471–474 and the named
   `arcaneMagic` regression) delays only the next placement packet; later
   packets and attacks keep their timing. My initial suggestion to delay every
   packet would have changed that rule and is withdrawn. Preserve its strength.
   Chooser and live pending context must identify the one reserved batch, and
   the next move must not show added delay while that slot is already occupied.
   Extend the same reserved slot to incoming owned curse/petrify batches.
   Frozen illegal destinations must still fizzle at eventual delivery.
3. **Charge context must match strained instances.** The counterplay and guard
   objective say four lamps, while `ChargeChallenge` adds `strainLamps` per
   strain. Say all displayed lamps or derive the actual count. Keep the actual
   mixed-color threshold and weather explanation; do not imply pure rows.
4. **Use the actual authored task in context.** Courier recovers scattered
   letters; Fisher repairs torn nets; Collector cleans the carried Goblin Charm;
   Hermit grinds the MoonShard into salves; Sage repairs the roof lattice. These
   are system goal descriptions, not a request to rewrite character dialogue.
5. **Update the obsolete owned-obstruction fixture.**
   `tests/arcaneMagic.test.ts` selects the now-empty profile marker from
   `enemy.moves`. Select/replan the actual frozen declaration and assert its
   footprint, ownership and delivery instead. Preserve the opt-in assertion.

Independent focused run: `obstructionIntent`, `lessonPractice` and `arcaneMagic`
produced **108 passing, 1 failing** test; the failure is the obsolete fixture
above (`/tmp/encounter-intent-review-tests.log`). Passing isolated suites do not
cover the owner-lifecycle and delayed-second-packet failures.

Required follow-up verification: incoming curse conversion/redirection and owner
placement expiry; explicitly chosen petrify semantics; multiple delayed frozen
packets; strained guard counts; authored M1 fixed solutions, retry/economy and
lesson ownership unchanged. Re-review the resulting corrections before closing
these items.

### In-progress lifecycle recheck

Independent runtime recheck of the staged `adopt` delivery path closes the
original curse reproduction: Nature 1 plus Gravity 2, followed by one owned
curse row, produces one neutral block and eight unanchored owned stones,
placement count 1, Nature 0 and Gravity 1. A second row produces placement count
2, Gravity 0 and reanchors that owner's surviving stones. This verifies the
original counter/counterplay case; final packet timing and regression suite
review remain pending.

Additional frozen-target edge: declaring Petrify when no crystal exists must
freeze an explicit empty target list. Returning a targetless move allows the
execution-time freeze to choose newly added player crystals without warning.
Also correct the base guard objective used by `encounterFlow` offers and
`encounterGoal`; an intent-only override leaves the old four-lamp/pure-line
statement reachable.

### Bounded correction re-review

The later staged code closes the empty-target Petrify edge by freezing an empty
list. The next-packet Ice slot is preserved and shared by curse, petrify and
targeted obstructions. Chooser, live details, workshop and board pending status
now explain the one held batch. The next move's telegraph excludes the reserved
delay when the slot is already occupied. This satisfies the conditional timing
finding without changing Ice's established power.

Independent mixed-family runtime check: Ice 4 holds a first curse row without
introducing stones; a later frozen Petrify arrives on its ordinary clock,
receives owner metadata and advances placement count to 1; the curse remains
held with the correct remaining timer. At expiry it arrives and advances count
to 2. The focused suites now pass **109/109**
(`/tmp/encounter-intent-review-tests2.log`). The obsolete profile-marker fixture
has been corrected.

The task descriptions and strained-lamp intent are corrected. At this checkpoint
the base guard objective used by `encounterFlow` still says four lamps/pure
line; close that reachable copy inconsistency before final acceptance. Add
persistent regression coverage for the new incoming legacy-material lifecycle
and empty-target Petrify case. These runtime/source checks do not imply a full
campaign playthrough or human comprehension approval.

## Final scoped disposition

Re-reviewed stable implementation `00c9143` and the current story/assertion
follow-ups. **No remaining blocker in this encounter-purpose and owner-arrival
scope.** All required correction items above are closed:

- Base guard objective and story table now refer to all displayed lamps and
  their color requirements; strained context derives the actual count/threshold.
- Authored task context describes net repair, letter recovery, cleaning the
  carried charm, Moon Shard salves and roof repair. Wren's instruction now
  matches the existing rot/cap objective rather than introducing planting.
- Curse and petrify material use the unified owner modifier/counter lifecycle;
  non-enemy terrain and merchant/environment rows retain their prior ownership.
- Permanent regressions cover incoming Nature/Gravity, whole-batch duration,
  standard counterplay, Wind's horizontal movement with retained vertical
  anchoring, the empty Petrify declaration, one reserved Ice batch across legacy
  arrivals, and cancellation of an occupied frozen target without retargeting.
- Existing next-packet-only Ice behavior remains intact and disclosed, with
  pending/next-move timing distinguished. No queue-all balance change is needed.

Independent final run of `encounterIntent`, `obstructionIntent`, `lessonPractice`,
`arcaneMagic`, `encounterBattle` and `encounterFlow`: **164 tests passed across six
files**, recorded in `/tmp/encounter-intent-final-independent.log`.

This verdict is independent source/mechanical review of the named corrections.
The author's full release checks and browser/PWA reports are separate evidence;
I did not independently certify those runs, physical iPhone behavior, human UI
comprehension, full campaign balance or story acceptance. The separate phone
installation request does not change this review's scope.
