# Plan C — Play the story

Detailed design and implementation plan for Plan C in
[STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md) §4. This is a planning document.
It changes no game code, data or tests. Passage IDs (`SR-…`) refer to
[WORLD_BIBLE_STORY_READER.md](../WORLD_BIBLE_STORY_READER.md). Continuity checks (`WB-C…`) and
open questions (`WB-Q…`) refer to [WORLD_BIBLE.md](../WORLD_BIBLE.md). Code references are to
`GetPutTaco` as read on 3 November 2026.

## 1. Goal

The story should come through the player's hands. Most play time goes on clearing rows with seven
schools of magic. That play should show the plot (a sleep plague, seven stones, a ritual made
together) and the theme ("care that will not let go becomes control") before any character
explains them.

**Done when:** a playtester can describe the theme by talking only about how the battles felt, and
every class can still finish the campaign.

## 2. Problems this plan solves

### P2. The story barely touches the gameplay

The game has seven schools, seven stones, seven mentors, seven Lishal singers and seven crystal
colours. Almost none of that pattern shows up in play. Sleep never affects the board. Weaving
unlocks just as the story turns to cooperation, but the final rite does not use it.

**Root cause.** The engine already has the right hooks, but the story never uses them:

| Story element | Engine hook that exists today                                                                                                             | Why it is unused                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sleep plague  | `CellTag` and `SporeRule` (`src/core/board.ts:58`, `src/battle/rules.ts:34`): a tag that spreads, is telegraphed and clears with its line | Only the grove's `spores` and the `dark` prototype exist (`REGION_RULES`, `src/data/balance.ts:362`). No rule stands for sleep.                              |
| Seven stones  | `drawStandingStones` (`src/ui/worldView.ts:350`) and native `markers` (`src/native/world.ts:433`) already dim or brighten each stone      | Brightness comes only from `regionFixed`, plus the M1 special case `groveStone` (`src/ui/worldFeedback.ts:60`). Learning a school does nothing to its stone. |
| Mentor bonds  | `mentorsTaught(hero)` (`src/game/ending.ts:53`) and `SceneBeat.requiresMentor`                                                            | Used only to pick which rite lines appear (`SR-campaignRite-02`–`08`). Bonds change nothing in play.                                                         |
| Weaving       | `previewWeave` / `commitWeave` (`src/battle/weaving.ts`), a staged resolver run on a clone                                                | The rite is a plain 3-line `puzzle` (`fennickRite`, `src/data/campaignNpcs.ts:221`) with no magic.                                                           |
| Boss motives  | `CAMPAIGN_ENEMIES` move lists (`src/data/campaignEnemies.ts:141–229`)                                                                     | Bosses only attack, drain, fog, seal, petrify or curse. Obstruction planning is switched off for bosses (`src/battle/combat.ts:195`).                        |

**Tasks:** workstreams W1–W4 and W6 (section 5).
**Before → after:** see each workstream.
**Acceptance:** section 8.
**Tests:** section 9.

### P4 (this plan's part). Vesper's attitude does not colour the ending

**Root cause.** Attitude is worked out when needed, never stored (`src/game/attitude.ts:1–9`). It
comes from the hero's alignment, Charm and regard. It picks `cold`/`plain`/`warm` lines for Vesper's
four route meetings (`VESPER_LINES`, `src/data/story.ts:97`). Story scenes cannot read it:
`scenePages(scene, hero, flags)` (`src/game/story.ts:287`) filters beats only by `requiresMentor`.
So `vesperAcceptance` (`SR-vesperAcceptance-09`–`15`) and `campaignRecovery`
(`SR-campaignRecovery-03`) read the same for every player.

**Tasks:** workstream W5. **Acceptance and tests:** sections 8 and 9.

## 3. Scope and non-goals

**In scope:**

- drowsy blocks;
- stone brightness tied to learning;
- the rite as a staged weave;
- four boss mechanics;
- Vesper attitude variants in two scenes;
- Pip's tower as a recurring frame;
- tests, simulation and playtest gates for all of the above.

**Non-goals:**

- No change to the ending choice, or to encounter order (WB-C10).
- No change to the saved two-stage `WeaveRecipe` format.
- No new schools or spells.
- No Moon Wyrm retune: its targets are "Unchanged" (`docs/ENCOUNTER_DESIGN.md` §5.3).
- No rewrite of scene prose beyond the variant beats needed here. Prose voice is Plan A's job.

## 4. Dependencies on other plans

| Needs                                                                 | From                                      | Blocks                         | If late                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| What sleep is, and why the voice wants listeners (the drowsy fiction) | **Plan B lore**, secret history (SQR-D02) | W1 names and flavour text only | Ship the mechanic under the neutral name "drowsy". Rules do not depend on lore.                     |
| Order of the seven stones in Fennick's recovered sequence             | **Plan B lore** (WB-Q05)                  | W3 station order               | Use `ELEMENTS` order as a placeholder. Order is one data array.                                     |
| The Lishal as seven named individuals                                 | **Plan B lore** (WB-Q04)                  | W4b singer names               | Use ordinals ("the fourth singer"), which the scenes already use (`SR-vesperAcceptance-21` onward). |
| What the Firstcoal is                                                 | **Plan B lore** (F1)                      | W4a flavour                    | Keep the mechanic and the existing description.                                                     |
| Why bonded stones resist the Malificat                                | **Plan B lore**                           | W4d flavour                    | Mechanic stands alone: "the people at the stones hold them."                                        |
| One-voice rewrite of Vesper and the mentor lines                      | Plan A                                    | W5 and W6 final text           | Write the variant beats in the second-half register now. Plan A edits them later.                   |
| Vesper's want ("to be heard")                                         | Plan D (optional)                         | W5 Devoted beat wording        | The beat works without Plan D.                                                                      |

## 5. Workstreams

Effort is engineer-days (ED) for one engineer who knows the codebase, plus designer-days (DD).
Owner roles: **GE** gameplay engineer, **SD** systems designer, **W** writer, **QA** test and sim
engineer, **iOS** native engineer.

### W1. Drowsy blocks (sleep on the board)

**Before:** sleep exists only in dialogue.
**After:** encounters touched by the voice grey out crystals. Grey crystals earn no mana and slowly
spread. The player learns that the plague takes away your power and spreads through what touches
it.

#### Rules

1. **What it is.** A crystal cell carrying a new `CellTag` value, `'drowsy'`. It keeps its colour
   internally, but is drawn greyed. Only crystals can be drowsy: never `stone`, `neutral` or empty
   cells. A tag already "moves with the cell" (`src/core/board.ts:47–57`), so Gravity, Wind, row
   collapse, `pushRow` and `removeBottomRows` carry it with no new code.
2. **No mana, no element.** A drowsy cell in a cleared row counts as `neutral` in the cleared-cell
   tally, the same as neutral cells today (`elementsOf`, `src/core/elements.ts:56`). The row still
   clears, still damages the foe, and still gives one auto-cast chance for each line. This keeps the
   line-driven casting contract.
3. **Arrival.** A drowsy cell arrives in one of two ways:
   - a region rule `DrowsyRule` (a sibling of `SporeRule`) marks the top crystal of a column every
     `landEvery` pieces;
   - an enemy move `{ kind: 'lull'; name; cells; targets? }` marks `cells` crystals.
     Both are telegraphed one piece ahead with the existing `Telegraph` `{ kind: 'cells', what:
'spore' }`. Add `'drowsy'` to `what`.
4. **Spread.** Every `spreadEvery` pieces, each drowsy cluster takes one crystal next to it. The
   target is chosen one piece ahead and shown as `what: 'spread'`, which already exists. Spread
   stops at `maxDrowsy` cells on the board.
5. **Waking (the main counterplay).** Lock a piece so that a cell of the **same colour** touches a
   drowsy cell. That cell and its whole same-colour cluster wake: the tag is removed. The fiction is
   "a familiar voice wakes them". This reuses fresh-contact detection in `resolveMagic`
   (`src/core/boardMagic.ts`, the `fresh` set) and is checked in the same pass as obstruction
   contacts.
6. **No petrify by default.** Unlike spores, drowsy cells do not turn to stone. A
   `deepAt` setting, off by default, lets a boss turn a large cluster into owned stone.
7. **Never gifts or steals clears.** Tagging changes no cell, so it cannot complete or break a row.
   This respects the rule that a hostile placement "must not independently award player clears"
   (`docs/BOARD_MAGIC_PLAN.md`).

#### How each school interacts

| School (spell id)                | Interaction                                                                                                                                                                                                                 | Change to casting contract?                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Fire (`fire`)                    | Burns normal squares in its span, drowsy ones included. They give no mana, as spell removals never do.                                                                                                                      | None.                                                     |
| Ice (`blizzard`)                 | Fills empty cells in the span with `neutral`. Neutral cells cannot become drowsy, so Ice builds a firebreak.                                                                                                                | None.                                                     |
| Gravity (`quake`)                | Drops cells; drowsy tags travel with them. This can split a cluster or bring a waking colour into contact.                                                                                                                  | None.                                                     |
| Wind (`gale`)                    | Shifts cells one square; tags travel. Same uses as Gravity.                                                                                                                                                                 | None.                                                     |
| Lightning (`thunder`)            | **Proposed:** each hit also wakes drowsy cells in its span ("a jolt").                                                                                                                                                      | **Yes, CX-1.** Lightning today affects only obstructions. |
| Nature (`natureConvert`)         | Converts obstructions to neutral, as today. It does not touch drowsy cells. Nature stays the anti-stone school.                                                                                                             | None.                                                     |
| Arcane (`shadow` and techniques) | Primary Arcane is unchanged. Arcane Ice delays a telegraphed `lull`, and Arcane Nature neutralises it (it fizzles). This happens for free if `lull` goes through `ArcaneInterference.place`, like `petrify` with `targets`. | None, if `lull` is routed as interference.                |

**Auto-targeting.** `autoTarget` (`src/battle/autoCasting.ts:37`) scores, in order: completed rows,
reduced obstruction strength, then stack quality. If CX-1 is approved, waking must score, or a
Lightning cast that only wakes cells is "non-improving" and gets skipped. Proposal **CX-2**: add
`drowsyWoken × 500` between obstruction strength (×1000) and quality. Without CX-1, no change to
auto-targeting is needed.

#### Readability

- Draw drowsy cells at 45% saturation, with a closed-eye glyph. Do not rely on hue, which matters
  for colour-blind players.
- Add a slow "breathing" alpha only when reduced motion is off.
- The spread telegraph is a dashed outline, the same style as obstruction telegraphs.
- `enemyMovePurpose` (`src/game/encounterIntent.ts:194`) gets a `lull` case. Goal: "Put crystals to
  sleep so they give no mana." Counterplay: "Touch a sleeping crystal with the same colour to wake
  it, or clear its row. Ice blocks spread."
- The first appearance comes with one plain line from the mentor or a resident. It must not be a
  tutorial pop-up.

#### Difficulty settings

Add to `REGION_RULES` in `src/data/balance.ts`:

```ts
drowsy: { landEvery: 6, spreadEvery: 4, maxDrowsy: 10, wakeOnContact: true, deepAt: 0 }
```

Encounter-level overrides go in a `DROWSY_OVERRIDES` table keyed by map or enemy id. The starting
values are guesses until G1 (section 6).

#### Where it appears

| Where                                                                                                                      | How                                          | Density       |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------- |
| Late first half: voice-touched Moonfall/caves monsters (candidates `watcher`, `nightBat`, `gloomToad`; confirm their maps) | One `lull` move replaces one non-attack move | `cells: 2`    |
| Moon Wyrm                                                                                                                  | **Unchanged** (approved targets)             | —             |
| `glassEcho` (`campaignEnemies.ts:63`, "a reflected voice")                                                                 | `lull` replaces `fog`                        | `cells: 2`    |
| Maps `glassWarrens`, `bellHollows`, `quietFoundry`, `innerWard`                                                            | `MAP_RULES` entry `'drowsy'`                 | default       |
| The Lishal and the Malificat                                                                                               | Boss mechanics (W4b, W4d)                    | boss-specific |

`MAP_RULES` is already read for combat in `src/ui/app.ts:794` and `src/native/campaign.ts:243`.

#### Tasks

| #   | Task                                                                                                                                                                                         | Owner   | Input        | Output                   | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------ | ------------------------ | ------ |
| 1.1 | Add `'drowsy'` to `CELL_TAGS`. Tally drowsy cells as neutral in `magicCleared` and `clearFullLines` (`src/core/board.ts:790`, `:809`): pass tags into `tallyRow`.                            | GE      | this section | core change and tests    | 1 ED   |
| 1.2 | Waking by contact inside `resolveMagic`. Report it as `removed`-style `woken` data in `MagicResolution` for the trace and animation.                                                         | GE      | 1.1          | resolver change          | 1.5 ED |
| 1.3 | `DrowsyRule` in `src/battle/rules.ts`. `RegionRuleId` gets `'drowsy'`. `createRule` gains a branch.                                                                                          | GE      | `SporeRule`  | rule                     | 1 ED   |
| 1.4 | `EnemyMove` `lull` (`src/data/types.ts:116`); execution in `CombatChallenge` (`src/battle/combat.ts:808`, next to `petrify`); `planEnemyMove`/`legacyMoveUseful` (fizzles when no crystals). | GE      | 1.1          | move                     | 1.5 ED |
| 1.5 | Web drawing in `src/ui/boardView.ts:273` and the obstruction visuals. Native drawing in `BattleScene.swift:174`.                                                                             | GE, iOS | art note     | visuals                  | 2 ED   |
| 1.6 | CX-1 and CX-2, only if approved.                                                                                                                                                             | GE      | decision     | resolver and auto-target | 1 ED   |
| 1.7 | Workshop scenario (`workshop.html`) for G1.                                                                                                                                                  | GE      | 1.1–1.5      | prototype                | 0.5 ED |
| 1.8 | Data: moves, `MAP_RULES`, settings.                                                                                                                                                          | SD      | G1 result    | data                     | 1 DD   |

### W2. One school per stone, one stone per mentor

**Before:** stones brighten only when a region is fixed. The nature stone has an M1 special case.
**After:** each of the seven stones has light 0–3. The ring is a progress bar the player fills by
learning.

**Light levels:**

| Light | Condition                                                           | Look                                                   |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| 0     | Nothing learned in this school                                      | dim (alpha 0.45, as today)                             |
| 1     | Any spell of the stone's school is known (the school is learned)    | faint glow                                             |
| 2     | That school's mentor is bonded: `mentorsTaught(hero)` includes them | full glow and halo (today's "bright")                  |
| 3     | Light 2, and the region is fixed (`regionFixed`)                    | glow, halo and a ground effect (moss, frost and so on) |

**Design.**

- Generalise `groveStone` into `stoneLight(state, element): 0|1|2|3` in a new
  `src/game/stones.ts`. Remove the nature-only branch in `worldView.ts:353` and `native/world.ts:416`.
- The nature stone's existing texts become level texts in a `STONE_TEXTS` table, one row per
  element.
- When a lesson is won (`completeLesson`, `src/game/lessons.ts:217`) and the stone's light rises,
  queue a one-time overworld beat: "The red stone at Sevenstones brightens." It plays on the next
  visit to the overworld.
- Native `markers` change `lit: boolean` to `light: number`. Keep `lit` (as `light >= 2`) for one
  release so older Swift builds still work.

**Save format.** Light is worked out from saved hero spells, encounters and flags, so no new field
is needed and `SAVE_VERSION` stays 17 (`src/game/save.ts:59`). The one-time beat records
`stone:seen:<element>:<level>` in `state.flags`, which is already saved. Old saves load fine: at load,
mark any stone already lit as seen without playing it, in the same post-step as `migrateScenes`.
This stops one burst of seven announcements. **No version bump.** If the author later wants a
stored record (for example, to stop a stone dimming after a respec), that would be v18 with a
migration test.

**Edge case.** `mentorsTaught` has one exception: a legacy tome (`src/game/ending.ts:47–52`). Treat
those stones as bonded too. That matches the ending summary.

| #   | Task                                                                    | Owner   | Effort |
| --- | ----------------------------------------------------------------------- | ------- | ------ |
| 2.1 | `stoneLight` and `STONE_TEXTS`; replace `groveStone` call sites         | GE      | 1 ED   |
| 2.2 | Web drawing at four levels; native marker `light`; Swift marker drawing | GE, iOS | 1.5 ED |
| 2.3 | One-time brighten beat and its seen flags; silent marking at load       | GE      | 1 ED   |
| 2.4 | Seven stone texts × 4 levels                                            | W       | 1 DD   |

### W3. The rite is a weaving made together

**Before:** `fennickRite` is a fixed puzzle. Mentor lines are spoken afterwards in `campaignRite`
(`SR-campaignRite-02`–`08`).
**After:** the rite board is a seven-station weave in Fennick's recovered order. At each station the
hero, a bonded mentor or a trained helper supplies that school's effect. The mentor's `roadBack`
line (`src/data/mentors.ts:90–395`) plays as their station fires.

**Rules.**

1. **The board.** An authored rite board (`EncounterDef` skin `ring`) has seven bands marked with a
   new `'station'` tag. Each band needs its school's effect to "seat" it:

   | School    | What seats the band                                                 |
   | --------- | ------------------------------------------------------------------- |
   | Gravity   | drop an overhang                                                    |
   | Fire      | burn a cracked wedge                                                |
   | Ice       | fill gaps with neutral                                              |
   | Wind      | slide a frame one square                                            |
   | Lightning | break a strength-2 seal                                             |
   | Nature    | convert a stone                                                     |
   | Arcane    | Fennick's lantern at the end (no board effect; fires after the six) |

2. **Pacing.** Station `k` fires after the player earns a line opportunity, as in the line-driven
   contract. It resolves on a clone first (preview), then commits. Input and clocks wait during
   the staged presentation.
3. **Sources.** `riteStations(state)` in a new `src/game/rite.ts` returns seven
   `RiteStation { element; spell: WeaveSpell | 'lantern'; source: 'hero' | 'mentor' | 'helper';
rank }`.

   | Source   | When                                     | Rank                           | Cost                                                                  |
   | -------- | ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
   | `mentor` | that school's mentor is bonded           | `max(2, hero's learned level)` | free (the mentor casts)                                               |
   | `hero`   | school learned, no bond                  | learned level                  | the hero's real mana (`weaveCost` per stage)                          |
   | `helper` | school not learned (**WB-C15 fallback**) | 1                              | free, but costs the player one extra line opportunity before it fires |

   The player may switch a mentor station to `hero` (to cast it themselves) on the pre-rite card.
   That is the only choice. Order stays fixed by the recovered procedure.

4. **Always solvable.** The board must be solvable when every station is a helper at rank 1. Higher
   ranks only add slack (fewer pieces). Check this with `src/core/solver.ts` across all rank
   combinations (4⁶ = 4,096).
5. **Losing.** Running out of pieces resets with the existing `lose` line ("Stop the sequence…").
   Strain rules as for other encounters.

**How it reuses `weaving.ts`.** Pull the per-stage loop out of `previewWeave`
(`src/battle/weaving.ts:18–60`) into `previewStages(casting, stages: readonly WeaveStage[],
targets)`. `previewWeave` then calls it with its two stages and behaves exactly as before.
`RiteChallenge` (new, `src/battle/rite.ts`, implementing `Challenge`) calls it one stage at a time.
`WeaveRecipe`, `sanitizeWeaving` and the 6/12/20 upgrade schedule are not touched.

**Casting-contract conflict (CX-3).** The contract says Weaving recipes "store exactly two ordered
source effects" and that custom casting "stays manual". The rite is **not** a recipe. It is an
encounter-only sequence that is never saved, and it fires on earned lines. The fiction calls it a
weaving; code and docs must call it the rite sequence, so nobody reads it as a change to recipes.
The author must approve this reading. Once approved, record it as an addendum in
`BOARD_MAGIC_PLAN.md`.

**Scenes.** `campaignRite` drops its seven `requiresMentor` beats. They move into the rite board as
station cues. The scene keeps the lantern test (`SR-campaignRite-09` onward). Ordering stays
`C.returned → fennickRite (C.rite) → campaignRite (C.wardReady)` (`src/data/campaignNpcs.ts:227`,
`campaignStory.ts:650`).

| #   | Task                                                                          | Owner   | Effort      |
| --- | ----------------------------------------------------------------------------- | ------- | ----------- |
| 3.1 | Extract `previewStages`; prove `previewWeave` unchanged                       | GE      | 1 ED        |
| 3.2 | `src/game/rite.ts` (`riteStations`, source rules)                             | GE      | 1 ED        |
| 3.3 | `RiteChallenge`; `ChallengeSpec` `{ kind: 'rite' }`; `createChallenge` branch | GE      | 2.5 ED      |
| 3.4 | Author the rite board; prove it solvable with the solver                      | SD, QA  | 2 DD + 1 ED |
| 3.5 | Pre-rite station card (web and native); station cues using `roadBack`         | GE, iOS | 2 ED        |
| 3.6 | Move the `campaignRite` mentor beats; helper lines for missing schools        | W       | 1 DD        |

### W4. Bosses that argue through mechanics

All four use a new `BossMechanic` interface in `src/battle/bossMechanics.ts`, shaped like
`RegionRule`: `onLock`, `onEnemyAct`, `telegraphs()` and `intent()`. `CombatChallenge` creates it
from a new optional `EnemyDef.mechanic` id. The authored `moves` lists stay. A mechanic may add a
move kind or change what a named move does. This keeps the rule that boss move odds are never
silently filtered (`docs/ENEMY_OBSTRUCTION_INTENT.md`). The UI shows each mechanic as one line on
the existing intent card, in plain words.

#### W4a. Irdrath: protection that prevents progress

**Rules.**

- **Keep Warm** replaces one `Firstcoal Heat` attack (`campaignEnemies.ts:141`). It heats one row,
  telegraphed one action ahead.
- A full heated row **does not clear**. It glows and stays.
- At most 3 heated rows. Never one of the top 6 rows.
- The **Firstcoal** is an owned, anchored obstruction at the bottom (strength 3). Its colour
  sequence is blue from the top, then cyan from either side.
- Breaking the Firstcoal (by contact sequence, Lightning or rows) cools every heated row. They then
  clear together: a large multi-line clear with one cast opportunity per line. That is the release
  the story promises (`SR-irdrathYielded-01`).
- Ice cast over a heated row cools it (**CX-4**: a new Ice effect).

**Counterplay.** Do not fill heated rows. Build the blue and cyan contacts on the Firstcoal. Ice
cools one row at a time.

**Readability.** Heated rows get an orange border and a heat shimmer. The Firstcoal shows its next
needed colour (existing contact UI).

**Tuning.** `IRDRATH_HEAT = { maxRows: 3, safeTop: 6, coalStrength: 3 }`.

**Files:** `campaignEnemies.ts`, `bossMechanics.ts`, `boardMagic.ts` (a check on `heatedRows` in the
full-row step), `combat.ts`, `boardView.ts`, `BattleScene.swift`.

**Conflict.** The rule "resolve … then full rows" gains an exception: a heated full row does not
clear. This is **CX-5** and needs approval. The safe alternative is a durable obstruction per row,
but that does not stop the row's other cells clearing, so it does not express the motive.

#### W4b. The Lishal: seven singers, seven colours

**Rules.**

- Seven singer pips on the enemy panel, one per crystal colour (`CRYSTAL_COLORS`).
- **Sevenfold Chord** (`campaignEnemies.ts:183`) now also lulls: up to 4 of the lowest crystals of
  the current singer's colour become drowsy (W1).
- The singers rotate. The next singer is lit one action ahead.
- **Silencing:** clear rows containing 6 awake cells of a singer's colour while that singer is
  next or singing. The singer stops. Their colour is no longer lulled, and every drowsy cell of
  that colour wakes.
- Each silenced singer cuts Chord damage by 1 and slows `actMs` by 150 ms. HP still decides the
  fight, so a player who silences nobody can still win.

**Counterplay.** Read the next singer and stack their colour for a clear. Same-colour contact wakes
lulled cells.

**Readability.** A ring of seven coloured pips. The silenced ones go grey with a closed mouth.

**Tuning.** `LISHAL = { lullCells: 4, silenceAt: 6, chordDrop: 1, slowMs: 150 }`.

**Story.** The player meets them one by one. Named singers depend on **Plan B lore**.
`lishalSilenced` can report how many singers the player silenced.

**Files:** `campaignEnemies.ts`, `bossMechanics.ts`, `combat.ts`, the enemy panel UI, and the native
presentation snapshot.

#### W4c. Vesper's duel: a rival who studied you

**Rules.**

- At fight start, Vesper reads the player's automatic order, `autoSpellOrder(hero)`
  (`src/battle/autoCasting.ts:9`). The intent card says: "Vesper has studied you: Fire → Ice →
  Wind."
- **Mirror Stance** (an existing move name) now seals the player's top automatic school for 2 line
  opportunities, using the existing seal check (`isSealed`). The next use seals the next school in
  the order.
- **Measured Cut** gets +2 power if the player's last 3 casts were all the same school.
- **Manual casts surprise Vesper.** A manual cast (Weaving, Arcane technique) gives no read. The next
  Mirror Stance fizzles with a line ("I didn't read that one.").

**Counterplay.** Breadth of schools. Manual Weaving or Arcane, which unlock after the Wyrm, before
this fight.

**WB-C15 guard.** A hero with one school is sealed for at most 2 lines at a time. The fight is tuned
so a one-school hero still meets the boss floor.

**Tuning.** `VESPER_MIRROR = { sealLines: 2, cutBonus: 2, repeatWindow: 3 }`.

**Files:** `campaignEnemies.ts:163`, `bossMechanics.ts`, `combat.ts`, `magicCasting.ts` (a cast log),
the intent UI.

#### W4d. The Malificat: drawing on all seven stones

**Rules.**

- Seven stone gauges on the enemy panel. **Sevenstone Draw** (`campaignEnemies.ts:205`) picks one
  stone, telegraphed one action ahead.
- The draw drains that school's mana pool, then lulls 3 crystals of that colour.
- A stone at `stoneLight ≥ 2` (bonded) **resists**: the draw fizzles, and the mentor's short line
  appears as a toast.
- A rite station covered by a helper **halves** the draw.
- Breaking the draw ends the fight as in `SR-malificatRisen-04` onward.

**Counterplay.** Spend mana before a telegraphed draw. Wake the lulled cells.

**WB-C15.** The baseline fight is tuned for **zero** bonds. Bonds only make it easier, never
required.

**Tuning.** `MALIFICAT_DRAW = { lull: 3, helperShare: 0.5 }`.

**Files:** `campaignEnemies.ts`, `bossMechanics.ts`, `stones.ts`, `rite.ts`, the enemy panel UI.

| #   | Task                                                       | Owner   | Effort      |
| --- | ---------------------------------------------------------- | ------- | ----------- |
| 4.0 | `BossMechanic` interface; `EnemyDef.mechanic`; intent line | GE      | 1.5 ED      |
| 4a  | Irdrath heat and Firstcoal (CX-4, CX-5)                    | GE      | 3 ED        |
| 4b  | Lishal singers                                             | GE      | 2.5 ED      |
| 4c  | Vesper mirror and cast log                                 | GE      | 2 ED        |
| 4d  | Malificat draw and resistance                              | GE      | 2 ED        |
| 4e  | Enemy panel pips and gauges, web and native                | GE, iOS | 3 ED        |
| 4f  | Tuning passes (simulation)                                 | SD, QA  | 3 DD + 2 ED |

### W5. Vesper's attitude colours the bridge and the recovery

**Before:** one text for everyone.
**After:** three emotional colours, matching the existing `cold`/`plain`/`warm` mood scheme. Devoted
adds one gesture. The ending choice and its outcome do not change (SQR-D06).

**Standing.**

- `vesperStanding(state): Attitude` in `src/game/attitude.ts` returns
  `attitudeOf(hero, NPCS.vesperRuins, routeRegard)`.
- `routeRegard` adds `+0.5` for each `lore:vesper.<stop>` flag earned (0–4; `npcs.ts:1126`) to the
  stored regard for the four route ids, capped at ±2.
- It is frozen when `vesperAcceptance` finishes, as the flag `vesper:mood:<tier>`. The recovery
  scene then matches the bridge, even if the hero learns more spells in between. Flags are already
  saved: no new field, no version bump.
- Old saves that are past the bridge but have no flag: work out the standing at recovery.

**Scene selection.**

- `SceneBeat` gains `moods?: readonly ('cold' | 'plain' | 'warm' | 'devoted')[]`.
- `scenePages` takes an optional context `{ vesperMood }` and filters beats by it, alongside
  `requiresMentor`.
- Callers: `src/ui/app.ts:634` and native `tomePages` (`src/native/campaign.ts:166`).
- Mapping: hostile and wary → cold; neutral → plain; friendly → warm; devoted → warm plus the
  devoted beats.

**Example variant beats.** Second-half register; Plan A edits.

| Passage                        | Mood    | Beat                                                                                    |
| ------------------------------ | ------- | --------------------------------------------------------------------------------------- |
| after `SR-vesperAcceptance-12` | cold    | `vesperDuel`: "You'd shut it away and call it kindness."                                |
| after `SR-vesperAcceptance-12` | warm    | _Vesper looks at your hand on the brake, then at the bridge._ "You held that for them." |
| after `SR-campaignRecovery-03` | cold    | _The cup stays where Fennick set it._                                                   |
| after `SR-campaignRecovery-03` | plain   | _Later, the cup is moved closer. No one saw who moved it._                              |
| after `SR-campaignRecovery-03` | devoted | _Vesper reaches for the cup and drinks. Fennick looks away so they can._                |

"No one asks the people Vesper harmed to forgive them" stays in every variant.

| #   | Task                                                  | Owner | Effort |
| --- | ----------------------------------------------------- | ----- | ------ |
| 5.1 | `vesperStanding`; freeze flag at the bridge           | GE    | 1 ED   |
| 5.2 | `SceneBeat.moods`; `scenePages` context; both callers | GE    | 1 ED   |
| 5.3 | Variant beats for both scenes (4–6 beats each)        | W     | 2 DD   |

### W6. Pip's tower as a recurring frame

**Before:** one tower, and a final "another tier" image (`SR-mossvaleRecovery-07`) with nothing
behind it.
**After:** Pip asks for a new tier at each act break. Each tier is a short BUILD board (verb `build`,
`src/battle/verbs/build.ts`) that previews the next act's idea.

| Tier | Due after                           | New idea on the board                                                                                    | Encounter id |
| ---- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| 1    | opening (exists, `kid`)             | read the next piece                                                                                      | `kid`        |
| 2    | `scene:chapterEnd` (Wyrm aftermath) | two outline bands that must be filled in a stated order (preview of the order in Weaving)                | `kidTier2`   |
| 3    | `C.returned` (Road Back)            | seven thin colour bands, one per school the hero has learned; any other colour may fill a band (helpers) | `kidTier3`   |
| 4    | `C.complete`                        | free build, no fail state; Pip's "before supper" line                                                    | `kidTier4`   |

Pip's mother stays awake (WB-C05). Each tier is optional, short (under 60 seconds for the good bot)
and never gates progress.

| #   | Task                                                                       | Owner  | Effort        |
| --- | -------------------------------------------------------------------------- | ------ | ------------- |
| 6.1 | `ENCOUNTER_DEFS` tiers 2–4 and settings in `ENCOUNTERS` (`balance.ts:223`) | SD, GE | 2 DD + 1.5 ED |
| 6.2 | Pip lines for each tier, in his voice                                      | W      | 1 DD          |

## 6. Phases and gates

No story text may depend on a mechanic until that mechanic's gate passes.

| Phase | Content                                                   | Gate                                                                                                                                                                                                                            | Effort        |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 0     | Author decisions (section 11); Plan B inputs              | Decisions recorded                                                                                                                                                                                                              | 1 DD          |
| 1     | W1 in the workshop only (1.1–1.7)                         | **G1 prototype:** 3 human testers, including one aged under 12, on iPhone. Each says unprompted what a drowsy cell does, and wakes one without help. Simulation within ±5 points of the no-drowsy baseline at default settings. | 7 ED          |
| 2     | W2 stones (low risk; can ship before G1)                  | Unit and rendering tests; author views the ring at levels 0–3                                                                                                                                                                   | 3.5 ED + 1 DD |
| 3     | W1 in campaign data (1.8); W4b and W4d need W1            | **G2 playtest:** a second-half run with drowsy maps. No tester calls it unfair. Boss bands as in section 9.                                                                                                                     | 1 DD          |
| 4     | W4 bosses, one at a time, each behind its own data switch | **G3 per boss:** simulation band met; 2 human runs; intent line understood                                                                                                                                                      | 14 ED + 3 DD  |
| 5     | W3 rite                                                   | **G4:** solver proves all 4,096 rank combinations solvable; every class × bond subset reaches `C.wardReady` in the reachability test; one human run with zero bonds                                                             | 7.5 ED + 3 DD |
| 6     | W5 Vesper variants (after Plan A voice pass)              | Scene tests; the author reads all five tiers                                                                                                                                                                                    | 2 ED + 2 DD   |
| 7     | W6 Pip tiers                                              | Encounter simulation band "Mossvale"; optional-content check                                                                                                                                                                    | 1.5 ED + 3 DD |
| 8     | Full campaign validation                                  | Section 9 suites green; `tools/verify-native-visuals.mjs`; `docs/IPHONE_TESTING.md` pass                                                                                                                                        | 3 ED          |

**Total:** about 40 ED engineering, 2 iOS-weighted ED included, and about 14 DD of design and
writing. The review's "2 weeks writing and design" holds. Engineering is about 8 weeks for one
engineer.

## 7. Contract changes needing approval

All are measured against `docs/BOARD_MAGIC_PLAN.md`.

| ID   | Change                                                                       | Contract rule affected                                              | Fallback if rejected                                                          |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| CX-1 | Lightning hits also wake drowsy cells                                        | "Completed rows and Lightning damage [obstructions]"                | Waking only by contact and clears. Drowsy stays fair (G1 checks this).        |
| CX-2 | Auto-target scores waking (×500)                                             | Target preference order                                             | Not needed without CX-1.                                                      |
| CX-3 | The rite is a staged encounter sequence, not a `WeaveRecipe`, fired on lines | "exactly two ordered source effects"; "custom casting stays manual" | Rite as two-stage weaves repeated per pair of stations. Clumsier; same reuse. |
| CX-4 | Ice cools a heated row                                                       | Ice "fills those spans with neutral squares"                        | Firstcoal is the only way to release heat.                                    |
| CX-5 | A heated full row does not clear                                             | "Resolve … then full rows"                                          | Irdrath uses durable obstructions only. The motive is weaker.                 |

Nothing here changes line-driven casting, the "no gifted clears" rule, the save v14+ snapshot
rules, or the 6/12/20 cost schedules.

## 8. Acceptance criteria

1. **Drowsy.** A drowsy cell never adds mana. Same-colour contact wakes it. It never completes or
   breaks a row. It is readable without colour (G1 passes).
2. **Stones.** Each stone's light matches `stoneLight` on web and native. Winning a lesson
   brightens its stone once. An old v17 save loads with no replayed beats.
3. **Rite.** Every class, with any subset of the 7 bonds including none, can complete
   `fennickRite`. The rite board never needs a school the hero lacks. `WeaveRecipe` behaviour is
   byte-identical.
4. **Bosses.** Each boss's mechanic shows on the intent card before it acts. Each is beatable with no
   bonds and no Weaving, within its simulation band.
5. **Vesper.** Bridge and recovery text vary across three moods, plus Devoted. The ending flags are
   identical in every mood.
6. **Pip.** Tiers 2–4 appear after their flags and never block progress.
7. **Phone.** Board frame time does not regress more than 10% on the iPhone test device with 10
   drowsy cells and 3 heated rows.

## 9. Test plan

| Mechanic          | Test file (new or existing)                                                       | Concrete assertions                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drowsy tag        | `tests/boardTags.test.ts` (existing)                                              | The `'drowsy'` tag moves with its cell on line clear, `pushRow` and `removeBottomRows`. Locking a piece over a cell resets its tag.                                                                                                       |
| Drowsy mana       | `tests/drowsy.test.ts` (new)                                                      | A cleared row of 10 red cells, 4 of them drowsy, gives `elementsOf(clearedCells).fire === 6`. The row still counts in `linesCleared`.                                                                                                     |
| Drowsy rule       | `tests/drowsy.test.ts`                                                            | Lands every `landEvery` pieces on a column's top crystal. Spreads to an orthogonal crystal only. Never more than `maxDrowsy`. Telegraph is set one piece ahead (`telegraphs()` returns the marked cells). Never tags `stone`/`neutral`.   |
| Waking            | `tests/drowsy.test.ts`; `tests/boardMagic.test.ts` (existing)                     | A fresh same-colour contact wakes the whole same-colour cluster. A different colour does not. An old (non-fresh) contact does not. `resolveMagic` on a clone leaves its input unchanged.                                                  |
| School interplay  | `tests/boardMagic.test.ts`                                                        | Fire removes drowsy cells and adds no mana. Ice neutral cells cannot be tagged. Gravity and Wind carry tags to the destination. Nature leaves tags. Lightning wakes (CX-1 only).                                                          |
| Auto-casting      | `tests/autoCasting.test.ts` (existing)                                            | With CX-2, a wake-only Lightning target scores above zero. Without it, wake-only previews are skipped. Spell order is unchanged by drowsy.                                                                                                |
| `lull` move       | `tests/obstructionIntent.test.ts`, `tests/encounterIntent.test.ts` (existing)     | `legacyMoveUseful` is false with no crystals. `enemyMovePurpose({kind:'lull'})` has a goal and counterplay. Arcane Nature makes a telegraphed `lull` fizzle. Arcane Ice delays it.                                                        |
| No gifted clears  | `tests/drowsy.test.ts`                                                            | For 200 seeded boards, `lull` and spread never change `grid` values, only `tags`.                                                                                                                                                         |
| Stones            | `tests/stones.test.ts` (new); `tests/nativeWorldRendering.test.ts` (existing)     | `stoneLight` returns 0/1/2/3 for crafted hero states, one per element. The native snapshot `markers[i].light` equals `stoneLight`. `lit === light >= 2`.                                                                                  |
| Stone save        | `tests/saveValidation.test.ts` (existing)                                         | A v17 fixture with three schools learned loads at `SAVE_VERSION === 17`. Its `stone:seen:*` flags are set silently. No beat is queued.                                                                                                    |
| Weaving unchanged | `tests/weaving.test.ts` (existing)                                                | After extracting `previewStages`, all 576 two-effect/strength configurations give identical `WeavePreview` (stages, cost, reason) to a stored snapshot.                                                                                   |
| Rite stations     | `tests/rite.test.ts` (new)                                                        | For every class in `CLASSES` × all 128 bond subsets × learned/unlearned schools, `riteStations` returns 7 stations, each with a valid source. Unlearned means `helper` at rank 1. Bonded means `mentor`.                                  |
| Rite solvable     | `tests/rite.test.ts`                                                              | The `src/core/solver.ts` search finds a solution for all 4,096 rank combinations within the piece queue. All-helper has at least 1 solution.                                                                                              |
| Rite reachability | `tests/campaign.test.ts` (existing, "playable second-half progression")           | For each class with zero mentor bonds, scripted play reaches `C.rite` and then `C.wardReady`. The same with all bonds.                                                                                                                    |
| Rite simulation   | `tests/sim/rite.test.ts` (new; `npm run sim ENCOUNTERS=fennickRite`)              | Good bot ≥ 85%, casual ≥ 55% at zero bonds (threshold band). Higher with bonds.                                                                                                                                                           |
| Irdrath           | `tests/bossMechanics.test.ts` (new)                                               | A heated full row stays. At most 3 heated rows. Never in the top 6 rows. Breaking the Firstcoal clears every heated row in one resolution. Ice cools one (CX-4).                                                                          |
| Lishal            | `tests/bossMechanics.test.ts`                                                     | Chord lulls at most 4 cells of the singing colour. Clearing 6 cells of that colour silences the singer and wakes that colour. Silenced colours are never lulled again.                                                                    |
| Vesper mirror     | `tests/bossMechanics.test.ts`                                                     | The intent order equals `autoSpellOrder(hero)`. Mirror seals the top school for exactly 2 line opportunities. A manual cast makes the next Mirror fizzle.                                                                                 |
| Malificat         | `tests/bossMechanics.test.ts`                                                     | A draw on a stone with `stoneLight ≥ 2` fizzles. A helper station halves it. Otherwise it drains that pool and lulls 3 cells.                                                                                                             |
| Boss balance      | `tests/sim/campaignCombat.test.ts` (existing; `CAMPAIGN_COMBAT=1`)                | For every class and both paces (1,500 and 2,200 ms), each boss's win rate stays within ±5 points of its pre-mechanic baseline at zero bonds, or inside a newly approved band.                                                             |
| Native            | `tests/nativeBattle.test.ts` (existing); `ios/NativeEngineTests`                  | The snapshot carries the `drowsy` tag and the heated rows. Swift draws them. A frame-time check runs on the test device.                                                                                                                  |
| Vesper standing   | `tests/attitude.test.ts` (existing)                                               | `vesperStanding` rises by one tier as the four lore flags are added. The freeze flag is set at the bridge and used at recovery.                                                                                                           |
| Vesper scenes     | `tests/scenes.test.ts` (existing)                                                 | For each of the 5 tiers, `scenePages` for `vesperAcceptance` and `campaignRecovery` is non-empty and includes the matching beats only. The ending flags (`C.complete`, recovery flag) are identical. Devoted alone contains the cup beat. |
| Pip tiers         | `tests/encounterBattle.test.ts` (existing); `tests/sim/encounters.test.ts`        | Tiers appear only after their flags. Losing a tier blocks nothing. Good bot band 90–97% (Mossvale row).                                                                                                                                   |
| Full regression   | `tests/sim/currentProgression.test.ts`, `tests/sim/valeReplay.test.ts` (existing) | Unchanged results for the first half, except the named drowsy monsters.                                                                                                                                                                   |

Simulation results are evidence for the gates. They are not acceptance. Human playtest gates G1–G4
decide.

## 10. Risks

| Risk                                                                         | Likelihood | Mitigation                                                                                                                                          |
| ---------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drowsy cells are hard to read on a small screen, or for colour-blind players | Medium     | Glyph plus saturation, not hue. G1 on iPhone with a child tester. Cap at `maxDrowsy`.                                                               |
| Mana starvation feels unfair                                                 | Medium     | Rows still clear and still damage. Waking by contact is always available. Settings in one table.                                                    |
| Boss mechanics stack with existing moves into spikes                         | Medium     | One mechanic per boss, behind its own switch. A ±5-point simulation guard. Enrage left unchanged at first.                                          |
| The rite favours well-bonded players too much                                | Low        | Tuned and proven solvable at all-helper rank 1. Bonds add slack only.                                                                               |
| Vesper's mirror punishes one-school builds                                   | Medium     | Seal of 2 lines at most. Floor checked per class.                                                                                                   |
| Phone performance with many tag marks and heat shimmer                       | Low–Medium | Use static marks when reduced motion is on. Reuse marks instead of rebuilding them every frame in `BattleScene.swift`. Frame-time check in phase 8. |
| Save compatibility                                                           | Low        | Everything is worked out from saved data or stored as free-form flags. A v17 fixture test. No version bump.                                         |
| Story text written before a gate passes                                      | Medium     | Phase gates. Variant beats only after G3 or G4.                                                                                                     |
| Plan B lore changes the station order or the singers                         | Medium     | Both are single data arrays. Neutral names until approval.                                                                                          |

## 11. Author decisions

| ID     | Decision                                                                         | Affects                                   |
| ------ | -------------------------------------------------------------------------------- | ----------------------------------------- |
| PC-D01 | Approve drowsy blocks for a workshop prototype (SQR-D05)                         | W1                                        |
| PC-D02 | Approve CX-1 and CX-2 (Lightning wakes)                                          | `BOARD_MAGIC_PLAN.md`                     |
| PC-D03 | Approve CX-3: the rite as an encounter sequence, not a recipe                    | WB-C17 (rite mechanism), WB-Q05, WB-C15   |
| PC-D04 | Approve CX-4 and CX-5 for Irdrath                                                | WB-Q04 (Irdrath motive), WB-C18           |
| PC-D05 | Lishal as seven individuals tied to colours                                      | WB-Q04; Plan B naming                     |
| PC-D06 | Malificat draws resisted by bonded stones                                        | WB-C15 (must stay optional), WB-C18       |
| PC-D07 | Vesper's mood colours the bridge and recovery; freeze it at the bridge (SQR-D06) | WB-C11, WB-Q06                            |
| PC-D08 | Devoted Vesper drinks the water                                                  | WB-Q06, WB-C17                            |
| PC-D09 | Pip tiers 2–4 at act breaks                                                      | WB-C05 (mother awake)                     |
| PC-D10 | Where drowsy first appears in the first half (Moonfall monsters vs a lesson)     | WB-C09 (do not settle the voice's origin) |

WB-C18 applies throughout: until each gate passes, no document may describe these boss mechanics as
proven by the playable adaptation.

### Critical files for implementation

- src/core/boardMagic.ts
- src/battle/rules.ts
- src/battle/weaving.ts
- src/battle/combat.ts
- src/data/campaignEnemies.ts
- src/game/story.ts
- src/ui/worldFeedback.ts
