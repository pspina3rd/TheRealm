# Plan C — Play the story

Detailed design and implementation plan for Plan C in
[STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md) §4. This is a planning document.
It changes no game code, data or tests. Passage IDs (`SR-…`) refer to
[WORLD_BIBLE_STORY_READER.md](../WORLD_BIBLE_STORY_READER.md). Continuity checks (`WB-C…`) and
open questions (`WB-Q…`) refer to [WORLD_BIBLE.md](../WORLD_BIBLE.md). Code references are to
`GetPutTaco` as read on 3 November 2026.

**Revised after review.** This version answers [PLANS_REVIEW.md](PLANS_REVIEW.md). Section 12
lists each finding and how it was resolved. Files this plan would create are marked **(new)**.

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

| Needs                                                                                | From                                                     | Blocks                                       | If late                                                                                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| What sleep is, and why the voice wants listeners (the drowsy fiction)                | **Plan B lore**, secret history (SQR-D02)                | W1 names and flavour text only               | Ship the mechanic under the neutral name "drowsy". Rules do not depend on lore.                                    |
| Order of the seven stones in the rite, and where the Arcane lantern step falls       | **Plan B**, "Plan C inputs" table in B §2 (WB-Q05, F-20) | W3 stone order                               | Use `ELEMENTS` order, lantern last, as a placeholder. Order is one data array.                                     |
| One Lishal singer per crystal colour (singer → colour mapping)                       | **Plan B**, "Plan C inputs" table (WB-Q04, F-20)         | W4b singer order and names                   | Use `CRYSTAL_COLORS` order and ordinals ("the fourth singer"), as the scenes do (`SR-vesperAcceptance-21` onward). |
| What the Firstcoal is                                                                | **Plan B lore** (F1)                                     | W4a flavour                                  | Keep the mechanic and the existing description.                                                                    |
| Why a tended (bonded) stone resists the Malificat's draw                             | **Plan B**, "Plan C inputs" table (F-20)                 | W4d flavour                                  | Mechanic stands alone: "the people at the stones hold them."                                                       |
| One guaranteed confirmation per reveal, outside mentor-gated beats                   | **Plan B** (F-16)                                        | W3 task 3.6 (moving the rite's mentor beats) | Do not move a `campaignRite` mentor beat until B has an unconditional confirmation for it.                         |
| One-voice rewrite of Vesper and the mentor lines; the jargon glossary                | Plan A (C-15)                                            | W3–W6 player text                            | Write in the second-half register now and follow A's glossary from the first draft (F-11).                         |
| Final underground scenes and flags (`read`, `hush`, `hollowsHush`, `hollowsEscaped`) | Plan D (C-11, PD-D03)                                    | W1 map list; W5 freeze point                 | Use today's scene list. The freeze flag is set at the end of whichever `vesperAcceptance` ships.                   |
| Recovery and bridge beat text; Vesper's want ("to be heard")                         | Plan D (C-8, C-9)                                        | W5 beat text                                 | C owns the mood gate; D owns the words. C's draft lines below are fallbacks.                                       |
| Vesper regard keyed by `npc.voice ?? npc.id` (D4.7)                                  | Plan D (C-10)                                            | W5 standing                                  | Without D4.7, `vesperStanding` reads the `vesperRuins` regard only.                                                |
| The save-version bump to v18                                                         | Plan D (C-12)                                            | C's save tests                               | C adds no bump. Its tests assert the current `SAVE_VERSION`, so they pass at 17 or 18.                             |
| Native book re-indexed once for all changed scenes                                   | Shared task, review §6 step 6 (F-06)                     | W3 and W5 native pages                       | C's tasks 3.7 and 5.4 hand their index changes to that task.                                                       |

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

**Auto-targeting.** `autoTarget` (`src/battle/autoCasting.ts:39`) scores, in order: completed rows,
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
| Maps `glassWarrens`, `bellHollows` (including Plan D's hush fight there, C-11), `quietFoundry`, `innerWard`                | `MAP_RULES` entry `'drowsy'`                 | default       |
| The Lishal and the Malificat                                                                                               | Boss mechanics (W4b, W4d)                    | boss-specific |

`MAP_RULES` is already read for combat in `src/ui/app.ts:794` and `src/native/campaign.ts:243`.
Today both call sites pass the map rule to **every** combat, bosses included. So the Lishal and the
Malificat would get the map-wide drowsy rule on top of their own lull: two drowsy sources (F-23).

**Boss fights skip map rules.** In the `Battle` constructor (`src/battle/battle.ts:204-206`), a
combat whose enemy has `boss: true` ignores `options.rule`. The boss mechanic carries the theme
instead. One check in the engine covers web and native, because both call sites build a `Battle`.
Lessons keep their mentor rule. Task 1.9 builds it; `tests/drowsy.test.ts` tests it.

#### Tasks

| #   | Task                                                                                                                                                                                         | Owner   | Input        | Output                   | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------ | ------------------------ | ------- |
| 1.1 | Add `'drowsy'` to `CELL_TAGS`. Tally drowsy cells as neutral in `magicCleared` and `clearFullLines` (`src/core/board.ts:790`, `:809`): pass tags into `tallyRow`.                            | GE      | this section | core change and tests    | 1 ED    |
| 1.2 | Waking by contact inside `resolveMagic`. Report it as `removed`-style `woken` data in `MagicResolution` for the trace and animation.                                                         | GE      | 1.1          | resolver change          | 1.5 ED  |
| 1.3 | `DrowsyRule` in `src/battle/rules.ts`. `RegionRuleId` gets `'drowsy'`. `createRule` gains a branch.                                                                                          | GE      | `SporeRule`  | rule                     | 1 ED    |
| 1.4 | `EnemyMove` `lull` (`src/data/types.ts:116`); execution in `CombatChallenge` (`src/battle/combat.ts:808`, next to `petrify`); `planEnemyMove`/`legacyMoveUseful` (fizzles when no crystals). | GE      | 1.1          | move                     | 1.5 ED  |
| 1.5 | Web drawing in `src/ui/boardView.ts:273` and the obstruction visuals. Native drawing in `BattleScene.swift:174`.                                                                             | GE, iOS | art note     | visuals                  | 2 ED    |
| 1.6 | CX-1 and CX-2, only if approved.                                                                                                                                                             | GE      | decision     | resolver and auto-target | 1 ED    |
| 1.7 | Workshop scenario (`workshop.html`) for G1.                                                                                                                                                  | GE      | 1.1–1.5      | prototype                | 0.5 ED  |
| 1.8 | Data: moves, `MAP_RULES`, settings.                                                                                                                                                          | SD      | G1 result    | data                     | 1 DD    |
| 1.9 | Boss combats ignore the map rule (`src/battle/battle.ts:204-206`).                                                                                                                           | GE      | F-23         | engine check and test    | 0.25 ED |

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

- Generalise `groveStone` into `stoneLight(state, element): 0|1|2|3` in `src/game/stones.ts`
  **(new)**. Remove the nature-only branch in `worldView.ts:353` and `native/world.ts:416`.
- The nature stone's existing texts become level texts in a `STONE_TEXTS` table, one row per
  element.
- When a lesson is won (`completeLesson`, `src/game/lessons.ts:217`) and the stone's light rises,
  a one-time overworld beat is due: "The red stone at Sevenstones brightens." It plays on the next
  visit to the overworld. The beat is not stored as a queue. It is due whenever a stone's light is
  above the highest `stone:seen:<element>:<level>` flag for that stone, so a reload keeps it due.
- Native `markers` (`src/native/world.ts:438`) change `lit: boolean` to `light: number`, with no
  `lit` shim. The Swift readers (`CampaignWorldView.swift:152`, `:179`) change in the same commit.
  The engine bundle is rebuilt into the app by `npm run build:native`, so no shipped Swift build
  ever reads new engine data (F-31).

**Save format.** Light is worked out from saved hero spells, encounters and flags, so no new field
is needed. Plan C adds **no save-version bump**: Plan D's v18 migration is the only one (C-12).
The seen flags live in `state.flags`, which is already saved.

**Old saves (silent marking).** This is a one-time load step, not a version migration. It is not
tied to `migrateScenes`, which runs only for saves older than version 9 (`src/game/save.ts:212`,
`src/game/story.ts:313`). Rules (F-22):

1. It runs in `deserialize` after flags and hero are sanitised, only when the save has **no**
   `stone:seen:*` flag at all. It then marks every stone's current light as seen, without a beat,
   and adds the sentinel `stone:seen:init`.
2. `newGame` adds `stone:seen:init`, so the step never runs on a save made after Plan C lands.
3. So it runs once per old save, at most. A beat that became due just before a reload is never
   swallowed: that save already carries the sentinel.

If the author later wants a stored record (for example, to stop a stone dimming after a respec),
that would ride on the next planned version bump, not a new one.

**Edge case.** `mentorsTaught` has one exception: a legacy tome (`src/game/ending.ts:47–52`). Treat
those stones as bonded too. That matches the ending summary.

| #   | Task                                                                               | Owner   | Effort |
| --- | ---------------------------------------------------------------------------------- | ------- | ------ |
| 2.1 | `stoneLight` and `STONE_TEXTS`; replace `groveStone` call sites                    | GE      | 1 ED   |
| 2.2 | Web drawing at four levels; native marker `light` (no `lit`); Swift marker drawing | GE, iOS | 1.5 ED |
| 2.3 | Brighten beat due from seen flags; one-time silent marking with sentinel           | GE      | 1 ED   |
| 2.4 | Seven stone texts × 4 levels                                                       | W       | 1 DD   |

### W3. The rite is a weaving made together

**Before:** `fennickRite` is a fixed puzzle. Mentor lines are spoken afterwards in `campaignRite`
(`SR-campaignRite-02`–`08`).
**After:** the rite board is a seven-stone weave in Fennick's recovered order. At each stone the
hero, a bonded mentor or a trained helper supplies that school's effect. The mentor's `roadBack`
line (`src/data/mentors.ts:90–395`) plays as their stone's effect fires.

**Words (F-11, C-15).** Code may name each step a station (`RiteStation`, the `'station'` tag).
Player text never does. It follows Plan A's glossary: "the red stone", "at the lantern", "someone
at every stone". The pre-rite card is titled "Who stands at each stone". The glossary test in
`tests/storyText.test.ts` (Plan A) scans the rite card, cue and helper strings too.

**Rules.**

1. **The board.** An authored rite board (`EncounterDef` skin `ring`) has two parts. A **work
   zone** is where the player clears lines. Seven **bands**, marked with a new `'station'` tag, sit
   beside it. Tags move with their cells (`src/core/board.ts:47-57`), so a band stays a band when
   rows collapse. Each band needs its school's effect to "seat" it. A stone's effect is **clipped
   to its own band's tagged cells**: it never changes a cell of the work zone.

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
3. **Sources.** `riteStations(state)` in `src/game/rite.ts` **(new)** returns seven
   `RiteStation { element; spell: WeaveSpell | 'lantern'; source: 'hero' | 'mentor' | 'helper';
rank }`.

   | Source   | When                                     | Rank                           | Cost                                                                  |
   | -------- | ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
   | `mentor` | that school's mentor is bonded           | `max(2, hero's learned level)` | free (the mentor casts)                                               |
   | `hero`   | school learned, no bond                  | learned level                  | the hero's real mana (`weaveCost` per stage)                          |
   | `helper` | school not learned (**WB-C15 fallback**) | 1                              | free, but costs the player one extra line opportunity before it fires |

   The player may switch a mentor station to `hero` (to cast it themselves) on the pre-rite card.
   That is the only choice. Order stays fixed by the recovered procedure.

4. **Always solvable, proved by construction (F-09).** `src/core/solver.ts` cannot prove the rite
   on its own. It searches drop-only placements on a fixed queue and never runs spells or
   line-triggered effects. So the proof has three parts, each one testable:
   - **Lines are the only need.** Seating depends only on how many lines the player has earned.
     The worst case is six helpers and the lantern: 7 + 6 = **13 lines**. Rank changes how an
     effect looks and how much of its band it fills, never how many lines it needs. Bonds remove
     helper lines, so they only add slack.
   - **The work zone gives 13 lines by drops alone.** `solveQueue` runs once, on the work zone and
     the rite queue, with no spells. Its `first` path must sum to at least 13 `lines`. Its
     `searched` count is recorded and capped in the test, so CI cost is measured, not guessed.
   - **Effects cannot interfere.** For each school and rank 1–4, a unit test applies the effect to
     the authored board and checks that only that band's tagged cells changed.

   Together these show the rite is solvable for every source and rank mix, without running 4,096
   searches. A replay test then plays the solver's placements through `RiteChallenge` for two
   cases, all helpers at rank 1 and all mentors at rank 4, and expects a win. The rejected option,
   a solver that applies `previewStages` on each earned line, would cost about 3 ED and still be
   slow in CI.

5. **Losing.** Running out of pieces resets with the existing `lose` line ("Stop the sequence…").
   Strain rules as for other encounters.

**How it reuses `weaving.ts`.** Pull the per-stage loop out of `previewWeave`
(`src/battle/weaving.ts:18–60`) into `previewStages(casting, stages: readonly WeaveStage[],
targets)`. `previewWeave` then calls it with its two stages and behaves exactly as before.
`RiteChallenge` (in `src/battle/rite.ts` **(new)**, implementing `Challenge`) calls it one stage
at a time. It has no `combat` and no obstructions, so the rite stays a cooperative task, as
`tests/encounterIntent.test.ts:67` requires for `fennickRite`.
`WeaveRecipe`, `sanitizeWeaving` and the 6/12/20 upgrade schedule are not touched.

**Casting-contract conflict (CX-3).** The contract says Weaving recipes "store exactly two ordered
source effects" and that custom casting "stays manual". The rite is **not** a recipe. It is an
encounter-only sequence that is never saved, and it fires on earned lines. The fiction calls it a
weaving; code and docs must call it the rite sequence, so nobody reads it as a change to recipes.
The author must approve this reading. Once approved, record it as an addendum in
`BOARD_MAGIC_PLAN.md`.

**Scenes.** `campaignRite` drops its seven `requiresMentor` beats (indices 1–7). They move into the
rite board as stone cues. The scene keeps the lantern test (`SR-campaignRite-09` onward). Ordering
stays `C.returned → fennickRite (C.rite) → campaignRite (C.wardReady)`
(`src/data/campaignNpcs.ts:227`, `campaignStory.ts:650`). Plan C owns these mechanics; Plan B
owns the stone order, the lantern step and the lore (C-13). Plan D does not touch `campaignRite`.

**Guaranteed confirmations (F-16).** Three of the moved beats confirm Plan B reveals:
`SR-campaignRite-02` (Torva), `-05` (Hazel) and `-08` (Selene). As cues they still show only to
bonded players. So task 3.6 waits until Plan B has put each of those confirmations in an
unconditional beat (B proposes NP-18 and `SR-ascentOpened-03`). The cue keeps the mentor's words;
it is never a reveal's only confirmation. B's ledger test checks this.

**Native book (F-06).** Removing beats 1–7 shifts every later `campaignRite` index in
`TOME_STAGING` (`src/native/tome.ts:327-350`: subjects and shots at 8, 9, 12, 14, 15 and 23).
`tests/nativeTome.test.ts:93-102` pins `campaignRite:1` absent, `:12` as `lantern` and `:15` as
`contain`; after the cut these become `:5` and `:8`, and the "omitted mentor" check moves to the
rite cues. Task 3.7 hands this to the shared re-index task (review §6 step 6) rather than editing
the staging twice.

**Existing tests that pin the old puzzle.** `tests/data.test.ts:266` and `tests/campaign.test.ts:42`
record a puzzle solution for `fennickRite`. Once its challenge is `{ kind: 'rite' }` it leaves the
puzzle list, so both entries are deleted, and `campaign.test.ts` solves the rite through the
replay path instead. `tests/attitude.test.ts:381` lists `fennickRite` among the story NPCs; it
stays essential and keeps its `C.rite` flag reward, so that test is unchanged.

| #   | Task                                                                                                                            | Owner   | Effort        |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------- |
| 3.1 | Extract `previewStages`; prove `previewWeave` unchanged                                                                         | GE      | 1 ED          |
| 3.2 | `src/game/rite.ts` **(new)**: `riteStations`, source rules                                                                      | GE      | 1 ED          |
| 3.3 | `RiteChallenge` in `src/battle/rite.ts` **(new)**; `ChallengeSpec` `{ kind: 'rite' }`; `createChallenge` branch; band clipping  | GE      | 3 ED          |
| 3.4 | Author the rite board (work zone and bands); solver run for 13 lines; per-effect band test; two replays                         | SD, QA  | 2 DD + 1.5 ED |
| 3.5 | Pre-rite card "Who stands at each stone" (web and native); cues using `roadBack`                                                | GE, iOS | 2 ED          |
| 3.6 | Move the `campaignRite` mentor beats (after B's F-16 fix); helper lines for missing schools, in glossary terms                  | W       | 1 DD          |
| 3.7 | Native staging changes for `campaignRite`, handed to the shared re-index task; update `nativeTome`, `data` and `campaign` tests | GE      | 0.5 ED        |

### W4. Bosses that argue through mechanics

All four use a new `BossMechanic` interface in `src/battle/bossMechanics.ts` **(new)**, shaped like
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
  opportunities, using a **battle-local school seal** (below). The next use seals the next school
  in the order. For this boss it no longer seals a board column.
- **Measured Cut** gets +2 power if the player's last 3 casts were all the same school.
- **Manual casts surprise Vesper.** A manual cast (Weaving, Arcane technique) gives no read. The next
  Mirror Stance fizzles with a line ("I didn't read that one.").

**Why not `isSealed` (F-08).** `isSealed` (`src/game/spells.ts:367`) reads `hero.seal`. That is
the lesson penalty from a lost lesson: one spell at a time, counted in won **fights**, saved with
the hero (`src/game/hero.ts:77`, `src/game/save.ts:635`) and set or cleared in
`src/game/lessons.ts:223-250`. Writing to it would put a duel effect in the save and could erase a
real lesson seal. Today's `seal` move is different again: it seals a board **column** for pieces
(`src/battle/combat.ts:799-806`, `board.sealColumn`).

**The battle-local school seal.** It lives on the fight, never on `Hero`:

- `BattleContext` (and so `Battle`) gains `schoolSeal: { element: Element; lines: number } | null`,
  next to the other per-fight counters such as `fogPieces` (`src/battle/types.ts:210-233`). It
  starts `null` in every fight and is dropped with the `Battle`.
- The Vesper mechanic sets it from `onEnemyAct` when Mirror Stance resolves.
- `nextAutomatic` (`src/battle/battle.ts:474-480`) skips spells of the sealed element.
  `resolveAutoCasts`, called after each line reward (`battle.ts:470`), takes the earned line
  count off `lines`; at 0 the seal lifts. So the seal is counted in line opportunities, as the
  casting contract counts casts.
- Manual casts (Weaving, Arcane techniques) are not blocked. That is the counterplay.
- The intent card names the sealed school and the lines left ("Fire is mirrored: 2 lines").
- `hero.seal` is never read or written by this mechanic. A test checks that `hero.seal` is the same
  object, with the same value, before and after the duel, including when a lesson seal is active.

**Counterplay.** Breadth of schools. Manual Weaving or Arcane, which unlock after the Wyrm, before
this fight.

**WB-C15 guard.** A hero with one school is sealed for at most 2 lines at a time. The fight is tuned
so a one-school hero still meets the boss floor.

**Tuning.** `VESPER_MIRROR = { sealLines: 2, cutBonus: 2, repeatWindow: 3 }`.

**Files:** `campaignEnemies.ts:163`, `bossMechanics.ts` **(new)**, `battle.ts` (`schoolSeal`),
`magicCasting.ts` (a cast log), the intent UI. Not `src/game/spells.ts` and not `hero.ts`.

#### W4d. The Malificat: drawing on all seven stones

**Rules.**

- Seven stone gauges on the enemy panel. **Sevenstone Draw** (`campaignEnemies.ts:205`) picks one
  stone, telegraphed one action ahead.
- The draw drains that school's mana pool, then lulls 3 crystals of that colour.
- A stone at `stoneLight ≥ 2` (bonded) **resists**: the draw fizzles, and the mentor's short line
  appears as a toast.
- A stone that a helper covered in the rite **halves** the draw. This is worked out again from
  `riteStations(state)`, never saved.
- Breaking the draw ends the fight as in `SR-malificatRisen-04` onward.

**Counterplay.** Spend mana before a telegraphed draw. Wake the lulled cells.

**WB-C15.** The baseline fight is tuned for **zero** bonds. Bonds only make it easier, never
required.

**Tuning.** `MALIFICAT_DRAW = { lull: 3, helperShare: 0.5 }`.

**Team-source design (F-12).** `docs/ENCOUNTER_DESIGN.md:984` sketches a phased Malificat (Moon,
Sun, Stars, then a Resurrection HOLD-race where "Ves, en." lets the lantern clear six rows). Plan C
keeps one idea from it: the stones and the hero's bonds shape the last fight (there, the final
line's element follows the highest-regard mentor; here, bonded stones resist). It does not build
the phases or the HOLD-race, and it gives "Ves, en." no mechanical effect. Whether the lantern
moment survives is Plan B's decision against WB-Q07 and WB-C24; W4d works either way. The same
file's Lishal sketch (a singer per column, falls after 3 lines) is replaced by W4b's singer per
colour, and its Vesper "mirror stance" is the move W4c builds.

**Files:** `campaignEnemies.ts`, `bossMechanics.ts` **(new)**, `stones.ts` **(new)**, `rite.ts`
**(new)**, the enemy panel UI.

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
  `attitudeOf(hero, NPCS.vesperRuins, regard)`.
- **One regard mechanism (C-10).** `regard` is Vesper's single regard, keyed by
  `npc.voice ?? npc.id` (Plan D's D4.7 in `src/game/encounter.ts:168`). Every route stop has
  `voice: 'vesper'` (`src/data/npcs.ts:1119`), so a win at the road counts at the ridge too. Plan
  C drops its own `routeRegard` sum. It keeps only an optional lore bonus: `+0.5` for each
  `lore:vesper.<stop>` flag (0–4; `npcs.ts:1126`), capped at ±2 in total. The bonus is part of
  PC-D07; if the author declines it, `regard` is used alone.
- It is frozen as the flag `vesper:mood:<tier>` when the last beat of `vesperAcceptance` finishes,
  whichever version ships (Plan D rewrites the scene, C-11). The recovery scene then matches the
  bridge, even if the hero learns more spells in between. Flags are already saved: no new field
  and no version bump (C-12).
- Old saves that are past the bridge but have no flag: work out the standing at recovery.

**Scene selection (one filter for web and native, F-07, C-7).**

- `SceneBeat` gains `moods?: readonly ('cold' | 'plain' | 'warm' | 'devoted')[]`. Plan D writes its
  beats in this shape.
- Mapping from attitude to tier: hostile and wary → `cold`; neutral → `plain`; friendly → `warm`;
  devoted → `devoted`. A beat with no `moods` shows to everyone. A beat shows when its `moods`
  include the tier. Writers tag a warm beat `['warm', 'devoted']` when Devoted should see it too.
- `beatVisible(beat, ctx): boolean` in `src/game/story.ts` holds **both** rules: `requiresMentor`
  and `moods`. `ctx` is `{ taught: ReadonlySet<string>; vesperMood: Tier }`, built by
  `sceneContext(state)` in `src/game/sceneContext.ts` **(new)**, which reads the freeze flag or
  calls `vesperStanding`. A separate file avoids an import cycle between `story.ts` and
  `attitude.ts`.
- **Web:** `scenePages` (`src/game/story.ts:287-303`) takes an optional `ctx` and filters with
  `beatVisible`. Its caller `src/ui/app.ts:634` passes `sceneContext(this.state)`.
- **Native:** the iPhone book does not use `scenePages`. `tomePages` filters beats itself
  (`src/native/tome.ts:424-425`); `src/native/campaign.ts:166` only calls it. So the `requiresMentor`
  check at `tome.ts:425` is replaced by `beatVisible(beat, sceneContext(state))`. Without this,
  iPhone players would see every mood's beats at once.
- Page ids stay `${scene.id}:${index}` with the authored index, as they do for mentor beats today.

**Native book staging (F-06).** `TOME_STAGING` stages beats by position: shots, subjects, targets,
voices and `stageSpeech` are keyed by beat index (`src/native/tome.ts:80-90`, `:248`, `:367`).
Inserting mood beats into `vesperAcceptance` and `campaignRecovery` shifts every later index. And
the recovery's home setting is hard-coded as `campaignRecovery` index 7 (`tome.ts:459-460`,
`:473-474`). Task 5.4 does two things, inside the shared re-index task (review §6 step 6):

1. Replace the hard-coded index with a staging field, `homeFrom?: number` **(new field)** on
   `Staging`: beats at or after that index use the hero's home setting and the `village`
   environment. `opening` uses `homeFrom: 3`, which replaces its own hard-coded `index >= 3`.
2. Re-key both scenes' staging after Plan D's and C's beats land, and add a shot for every new beat
   with `stage` text, as `tests/nativeTome.test.ts:16-27` requires.

**Variant beats (C-8, C-9).** Plan D owns the words; Plan C owns the gate. One insert per place,
not two.

| Passage                                     | Tier    | Beat                                                                                                               |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| after `SR-vesperAcceptance-12` (D's insert) | plain   | D's beat: "You would, too." _They look at the bridge, and at your hands on the brake._                             |
| same place, variant of D's beat             | cold    | `vesperDuel`: "You'd shut it away and call it kindness."                                                           |
| same place, variant of D's beat             | warm    | _Vesper looks at your hand on the brake, then at the bridge._ "You held that for them." (tagged `warm`, `devoted`) |
| after `SR-campaignRecovery-03`              | cold    | _The cup and the ledger stay where they were set._                                                                 |
| same place                                  | plain   | "Leave it." Later the ledger is open (D), and the cup is moved closer. No one saw who moved it (C).                |
| same place                                  | warm    | "Was it dry?" "Yes." (D)                                                                                           |
| same place                                  | devoted | _Vesper reaches for the cup and drinks. Fennick looks away so they can._ Then Vesper takes the ledger.             |

The Devoted cup beat is tagged `['devoted']` only, so "Devoted alone contains the cup beat" stays
true. "No one asks the people Vesper harmed to forgive them" stays in every variant.

| #   | Task                                                                                                             | Owner | Effort  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----- | ------- |
| 5.1 | `vesperStanding` on D4.7 regard (plus optional lore bonus); freeze flag at the bridge                            | GE    | 0.75 ED |
| 5.2 | `SceneBeat.moods`; `beatVisible` and `sceneContext` **(new)**; `scenePages` and `tomePages` both use it          | GE    | 1.5 ED  |
| 5.3 | Mood tags on D's beats; C's variant lines in glossary terms                                                      | W     | 1 DD    |
| 5.4 | `homeFrom` staging field; re-key `vesperAcceptance` and `campaignRecovery` staging (in the shared re-index task) | GE    | 1 ED    |

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

| Phase | Content                                                          | Gate                                                                                                                                                                                                                            | Effort         |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 0     | Author decisions (section 11); Plan B inputs                     | Decisions recorded                                                                                                                                                                                                              | 1 DD           |
| 1     | W1 in the workshop only (1.1–1.7)                                | **G1 prototype:** 3 human testers, including one aged under 12, on iPhone. Each says unprompted what a drowsy cell does, and wakes one without help. Simulation within ±5 points of the no-drowsy baseline at default settings. | 7 ED           |
| 2     | W2 stones (low risk; can ship before G1)                         | Unit and rendering tests; author views the ring at levels 0–3                                                                                                                                                                   | 3.5 ED + 1 DD  |
| 3     | W1 in campaign data (1.8, 1.9); W4b and W4d need W1              | **G2 playtest:** a second-half run with drowsy maps. No tester calls it unfair. Boss fights carry no map rule. Boss bands as in section 9.                                                                                      | 0.25 ED + 1 DD |
| 4     | W4 bosses, one at a time, each behind its own data switch        | **G3 per boss:** simulation band met; 2 human runs; intent line understood; for Vesper, `hero.seal` unchanged after the duel                                                                                                    | 14.5 ED + 3 DD |
| 5     | W3 rite                                                          | **G4:** the three-part proof in W3 rule 4 passes (13 lines by drops, effects clipped to bands, two replays win); every class × bond subset reaches `C.wardReady` in the reachability test; one human run with zero bonds        | 9 ED + 3 DD    |
| 6     | W5 Vesper variants (after Plan D's text and the joint text pass) | Scene tests for all five tiers on web **and** native paths; `nativeTome` passes after the shared re-index; the author reads all five tiers                                                                                      | 3.25 ED + 1 DD |
| 7     | W6 Pip tiers                                                     | Encounter simulation band "Mossvale"; optional-content check                                                                                                                                                                    | 1.5 ED + 3 DD  |
| 8     | Full campaign validation                                         | Section 9 suites green; `tools/verify-native-visuals.mjs`; `docs/IPHONE_TESTING.md` pass                                                                                                                                        | 3 ED           |

**Total:** about 43.5 ED engineering, iOS work included, and about 13 DD of design and writing.
The review's "2 weeks writing and design" holds. Engineering is about 9 weeks for one engineer.

**Order across plans.** The phase numbers are this plan's own. In the joint order (review §6),
phases 1–2 run in step 3, phase 6 (moods) in step 7 after the native re-index in step 6, phases
3–5 in step 8 and phase 7 in step 9.

**Playtests (F-32).** Fresh readers are scarce, so Plan C does not run its own story round.

- **G1 stays separate.** It tests the board, not the story, so its three testers need not be
  story-cold.
- **G2–G4 human runs** test fairness. They use testers outside the cold pool (the team or repeat
  testers).
- **The "done when" theme check** (section 1) joins the combined protocol in review §6 step 10. After
  the play-through, each reader is asked one extra question: "What were the battles about?" It is
  asked before any story question, so it does not prompt the answer.

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
   breaks a row. It is readable without colour (G1 passes). Boss fights get no map-wide rule.
2. **Stones.** Each stone's light matches `stoneLight` on web and native. Winning a lesson
   brightens its stone once, even across a reload. A save from before Plan C loads at the current
   `SAVE_VERSION` with no replayed beats, and the silent marking runs only once.
3. **Rite.** Every class, with any subset of the 7 bonds including none, can complete
   `fennickRite`. The rite board never needs a school the hero lacks. `WeaveRecipe` behaviour is
   byte-identical.
4. **Bosses.** Each boss's mechanic shows on the intent card before it acts. Each is beatable with no
   bonds and no Weaving, within its simulation band. Vesper's mirror never reads or writes
   `hero.seal`.
5. **Vesper.** Bridge and recovery text vary across three moods, plus Devoted, on web and on
   iPhone alike. The ending flags are identical in every mood.
6. **Words.** No new player-facing string uses a term in Plan A's glossary ("station", "relay",
   "sequence" and the rest).
7. **Pip.** Tiers 2–4 appear after their flags and never block progress.
8. **Phone.** Board frame time does not regress more than 10% on the iPhone test device with 10
   drowsy cells and 3 heated rows.

## 9. Test plan

| Mechanic                 | Test file (new or existing)                                                       | Concrete assertions                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drowsy tag               | `tests/boardTags.test.ts` (existing)                                              | The `'drowsy'` tag moves with its cell on line clear, `pushRow` and `removeBottomRows`. Locking a piece over a cell resets its tag.                                                                                                                                                                                                                          |
| Drowsy mana              | `tests/drowsy.test.ts` (new)                                                      | A cleared row of 10 red cells, 4 of them drowsy, gives `elementsOf(clearedCells).fire === 6`. The row still counts in `linesCleared`.                                                                                                                                                                                                                        |
| Drowsy rule              | `tests/drowsy.test.ts` (new)                                                      | Lands every `landEvery` pieces on a column's top crystal. Spreads to an orthogonal crystal only. Never more than `maxDrowsy`. Telegraph is set one piece ahead (`telegraphs()` returns the marked cells). Never tags `stone`/`neutral`.                                                                                                                      |
| Boss map rule            | `tests/drowsy.test.ts` (new)                                                      | A `Battle` for a `boss: true` enemy built with `rule: 'drowsy'` has no region rule; a non-boss combat with the same options has a `DrowsyRule`; a lesson keeps its mentor rule (F-23).                                                                                                                                                                       |
| Waking                   | `tests/drowsy.test.ts`; `tests/boardMagic.test.ts` (existing)                     | A fresh same-colour contact wakes the whole same-colour cluster. A different colour does not. An old (non-fresh) contact does not. `resolveMagic` on a clone leaves its input unchanged.                                                                                                                                                                     |
| School interplay         | `tests/boardMagic.test.ts`                                                        | Fire removes drowsy cells and adds no mana. Ice neutral cells cannot be tagged. Gravity and Wind carry tags to the destination. Nature leaves tags. Lightning wakes (CX-1 only).                                                                                                                                                                             |
| Auto-casting             | `tests/autoCasting.test.ts` (existing)                                            | With CX-2, a wake-only Lightning target scores above zero. Without it, wake-only previews are skipped. Spell order is unchanged by drowsy.                                                                                                                                                                                                                   |
| `lull` move              | `tests/obstructionIntent.test.ts`, `tests/encounterIntent.test.ts` (existing)     | `legacyMoveUseful` is false with no crystals. `enemyMovePurpose({kind:'lull'})` has a goal and counterplay. Arcane Nature makes a telegraphed `lull` fizzle. Arcane Ice delays it.                                                                                                                                                                           |
| No gifted clears         | `tests/drowsy.test.ts`                                                            | For 200 seeded boards, `lull` and spread never change `grid` values, only `tags`.                                                                                                                                                                                                                                                                            |
| Stones                   | `tests/stones.test.ts` (new); `tests/nativeWorldRendering.test.ts` (existing)     | `stoneLight` returns 0/1/2/3 for crafted hero states, one per element. The native snapshot `markers[i].light` equals `stoneLight`, and markers carry no `lit` field.                                                                                                                                                                                         |
| Stone save               | `tests/saveValidation.test.ts` (existing)                                         | A fixture saved before Plan C, with three schools learned and no `stone:seen:*` flag, loads at the current `SAVE_VERSION` (never a literal 17). Its seen flags and `stone:seen:init` are set silently; no beat is due. A second load changes nothing.                                                                                                        |
| Stone beat across reload | `tests/stones.test.ts` (new)                                                      | Win a lesson that raises a stone, `serialize` before visiting the overworld, `deserialize`: the brighten beat is still due and plays once (F-22). A `newGame` save carries `stone:seen:init`.                                                                                                                                                                |
| Weaving unchanged        | `tests/weaving.test.ts` (existing)                                                | After extracting `previewStages`, all 576 two-effect/strength configurations give identical `WeavePreview` (stages, cost, reason) to a stored snapshot.                                                                                                                                                                                                      |
| Rite stations            | `tests/rite.test.ts` (new)                                                        | For every class in `CLASSES` × all 128 bond subsets × learned/unlearned schools, `riteStations` returns 7 stations, each with a valid source. Unlearned means `helper` at rank 1. Bonded means `mentor`.                                                                                                                                                     |
| Rite solvable            | `tests/rite.test.ts` (new)                                                        | `solveQueue` on the work zone and rite queue returns a `first` path whose `lines` sum to at least 13; `searched` stays under a recorded cap. For each school and rank 1–4, the effect changes only its band's tagged cells. Replaying the solver's placements through `RiteChallenge` wins with all helpers at rank 1 and with all mentors at rank 4 (F-09). |
| Rite reachability        | `tests/campaign.test.ts` (existing, "playable second-half progression")           | For each class with zero mentor bonds, scripted play reaches `C.rite` and then `C.wardReady`. The same with all bonds.                                                                                                                                                                                                                                       |
| Rite simulation          | `tests/sim/rite.test.ts` (new; `npm run sim ENCOUNTERS=fennickRite`)              | Good bot ≥ 85%, casual ≥ 55% at zero bonds (threshold band). Higher with bonds.                                                                                                                                                                                                                                                                              |
| Irdrath                  | `tests/bossMechanics.test.ts` (new)                                               | A heated full row stays. At most 3 heated rows. Never in the top 6 rows. Breaking the Firstcoal clears every heated row in one resolution. Ice cools one (CX-4).                                                                                                                                                                                             |
| Lishal                   | `tests/bossMechanics.test.ts`                                                     | Chord lulls at most 4 cells of the singing colour. Clearing 6 cells of that colour silences the singer and wakes that colour. Silenced colours are never lulled again.                                                                                                                                                                                       |
| Vesper mirror            | `tests/bossMechanics.test.ts` (new)                                               | The intent order equals `autoSpellOrder(hero)`. Mirror sets `schoolSeal` on the battle; `nextAutomatic` skips that school for exactly 2 earned lines, then casts it again. A manual cast makes the next Mirror fizzle. With a lesson seal active before the duel, `hero.seal` is deep-equal after it; with none, it stays `null` (F-08).                     |
| Malificat                | `tests/bossMechanics.test.ts`                                                     | A draw on a stone with `stoneLight ≥ 2` fizzles. A helper station halves it. Otherwise it drains that pool and lulls 3 cells.                                                                                                                                                                                                                                |
| Boss balance             | `tests/sim/campaignCombat.test.ts` (existing; `CAMPAIGN_COMBAT=1`)                | For every class and both paces (1,500 and 2,200 ms), each boss's win rate stays within ±5 points of its pre-mechanic baseline at zero bonds, or inside a newly approved band.                                                                                                                                                                                |
| Native                   | `tests/nativeBattle.test.ts` (existing); `ios/NativeEngineTests`                  | The snapshot carries the `drowsy` tag and the heated rows. Swift draws them. A frame-time check runs on the test device.                                                                                                                                                                                                                                     |
| Vesper standing          | `tests/attitude.test.ts` (existing)                                               | A win at `vesperRoad` changes the regard `vesperStanding` reads at `vesperRuins` (D4.7, C-10). With the lore bonus approved, each `lore:vesper.*` flag adds 0.5, capped at 2. The freeze flag is set at the end of `vesperAcceptance` and used at recovery.                                                                                                  |
| Vesper scenes            | `tests/scenes.test.ts` (existing); `tests/nativeTome.test.ts` (existing)          | For each of the 5 attitudes, `scenePages` and `tomePages` for `vesperAcceptance` and `campaignRecovery` return the **same** beat set (compared by page id), non-empty, with only the matching moods. The ending flags (`C.complete`, recovery flag) are identical. Devoted alone contains the cup beat (F-07).                                               |
| Native staging           | `tests/nativeTome.test.ts` (existing)                                             | After the shared re-index: a shot for every stage-bearing beat, including mood beats; the recovery's home setting comes from `homeFrom`, not an index; `opening` pages 3 and 4 still use the home setting (F-06).                                                                                                                                            |
| Pip tiers                | `tests/encounterBattle.test.ts` (existing); `tests/sim/encounters.test.ts`        | Tiers appear only after their flags. Losing a tier blocks nothing. Good bot band 90–97% (Mossvale row).                                                                                                                                                                                                                                                      |
| Full regression          | `tests/sim/currentProgression.test.ts`, `tests/sim/valeReplay.test.ts` (existing) | Unchanged results for the first half, except the named drowsy monsters.                                                                                                                                                                                                                                                                                      |

### Existing tests to update (F-10)

| Test                                                                                                                                                             | What pins it today                                                                     | Change                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/nativeTome.test.ts:27`                                                                                                                                    | `pages.length` equals `authored.beats.length` (true today with every spell at level 2) | Compare with the beats that pass `beatVisible(beat, sceneContext(state))`; mood beats make the counts differ for any one attitude.                |
| `tests/nativeTome.test.ts:93-102`                                                                                                                                | `campaignRite:1` absent; `:12` is `lantern`; `:15` is `contain`                        | After the seven mentor beats move out: `:5` is `lantern`, `:8` is `contain`. The "omitted mentor" check moves to the rite cues.                   |
| `tests/nativeTome.test.ts:64`, `:76`                                                                                                                             | `"lower return"` in `bellRelief` 6; the voice's line at `chapterEnd` 3                 | **Not touched by Plan C.** Plan C changes neither scene. Listed so the shared re-index task does not miss them (Plans A and B do change these).   |
| `tests/attitude.test.ts:245-251`                                                                                                                                 | Three different intro moods for every person NPC                                       | **Unchanged and still true.** Plan C adds scene beats, not NPC intro lines, and `vesperStanding` reuses `attitudeOf`.                             |
| `tests/data.test.ts:266`, `tests/campaign.test.ts:42`                                                                                                            | A recorded puzzle solution for `fennickRite`                                           | Delete both entries; `fennickRite` is no longer a `puzzle`. `campaign.test.ts` completes it through the rite replay path.                         |
| `tests/encounterIntent.test.ts:67`                                                                                                                               | `fennickRite` is `cooperate`, has no combat and no obstructions                        | Unchanged; `RiteChallenge` must keep it true.                                                                                                     |
| `tests/story.test.ts:326`, `tests/game.test.ts:632`, `tests/campaignRuntime.test.ts:192`, `tests/saveCampaignStakes.test.ts:97`, `tests/arcaneMagic.test.ts:131` | `SAVE_VERSION` is 17                                                                   | **Plan C changes none of them** (no bump). Plan D's v18 updates them (C-12). Plan C's own save tests assert the current `SAVE_VERSION`, never 17. |

If Plans C and D both land, one migration test (Plan D's) loads a v17 save that has none of Plan
C's flags, and then checks that Plan C's silent marking ran once on it (C-12).

Simulation results are evidence for the gates. They are not acceptance. Human playtest gates G1–G4
decide.

## 10. Risks

| Risk                                                                         | Likelihood | Mitigation                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drowsy cells are hard to read on a small screen, or for colour-blind players | Medium     | Glyph plus saturation, not hue. G1 on iPhone with a child tester. Cap at `maxDrowsy`.                                                                                         |
| Mana starvation feels unfair                                                 | Medium     | Rows still clear and still damage. Waking by contact is always available. Settings in one table.                                                                              |
| Boss mechanics stack with existing moves into spikes                         | Medium     | One mechanic per boss, behind its own switch. A ±5-point simulation guard. Enrage left unchanged at first.                                                                    |
| The rite favours well-bonded players too much                                | Low        | Tuned and proven solvable at all-helper rank 1. Bonds add slack only.                                                                                                         |
| Vesper's mirror punishes one-school builds                                   | Medium     | Seal of 2 lines at most. Floor checked per class.                                                                                                                             |
| Phone performance with many tag marks and heat shimmer                       | Low–Medium | Use static marks when reduced motion is on. Reuse marks instead of rebuilding them every frame in `BattleScene.swift`. Frame-time check in phase 8.                           |
| Save compatibility                                                           | Low        | Everything is worked out from saved data or stored as free-form flags. No version bump; Plan D's v18 is the only one (C-12). Silent marking runs once, guarded by a sentinel. |
| A mood beat shows on web but not iPhone, or the other way                    | Medium     | One `beatVisible` helper used by both paths; a test compares the two page sets for every attitude.                                                                            |
| A lesson seal is lost or written by the duel                                 | Low        | The mirror uses a battle-local seal only; a test checks `hero.seal` before and after.                                                                                         |
| Story text written before a gate passes                                      | Medium     | Phase gates. Variant beats only after G3 or G4.                                                                                                                               |
| Plan B lore changes the station order or the singers                         | Medium     | Both are single data arrays. Neutral names until approval.                                                                                                                    |

## 11. Author decisions

| ID     | Decision                                                                                                                                                                                                                                   | Affects                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| PC-D01 | Approve drowsy blocks for a workshop prototype (SQR-D05)                                                                                                                                                                                   | W1                                        |
| PC-D02 | Approve CX-1 and CX-2 (Lightning wakes)                                                                                                                                                                                                    | `BOARD_MAGIC_PLAN.md`                     |
| PC-D03 | Approve CX-3: the rite as an encounter sequence, not a recipe                                                                                                                                                                              | WB-C17 (rite mechanism), WB-Q05, WB-C15   |
| PC-D04 | Approve CX-4 and CX-5 for Irdrath                                                                                                                                                                                                          | WB-Q04 (Irdrath motive), WB-C18           |
| PC-D05 | Lishal as seven individuals tied to colours                                                                                                                                                                                                | WB-Q04; Plan B naming                     |
| PC-D06 | Malificat draws resisted by bonded stones                                                                                                                                                                                                  | WB-C15 (must stay optional), WB-C18       |
| PC-D07 | Vesper's mood colours the bridge and recovery; freeze it at the bridge (SQR-D06). Also decides Vesper's regard across stops: one regard keyed by `voice` (D4.7), plus or minus the lore-flag bonus (the regard half of PD-D06, C-10, C-14) | WB-C11, WB-Q06                            |
| PC-D08 | Devoted Vesper drinks the water, then takes the ledger (merged with PD-D07's Devoted gesture, C-8, C-14)                                                                                                                                   | WB-Q06, WB-C17                            |
| PC-D09 | Pip tiers 2–4 at act breaks                                                                                                                                                                                                                | WB-C05 (mother awake)                     |
| PC-D10 | Where drowsy first appears in the first half (Moonfall monsters vs a lesson)                                                                                                                                                               | WB-C09 (do not settle the voice's origin) |

WB-C18 applies throughout: until each gate passes, no document may describe these boss mechanics as
proven by the playable adaptation.

### Critical files for implementation

| File                                                                                                                          | Status    | Why                                                       |
| ----------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------- |
| `src/core/boardMagic.ts`                                                                                                      | existing  | waking by contact; heated rows                            |
| `src/battle/rules.ts`                                                                                                         | existing  | `DrowsyRule`                                              |
| `src/battle/battle.ts`                                                                                                        | existing  | boss fights skip map rules; `schoolSeal`; `nextAutomatic` |
| `src/battle/weaving.ts`                                                                                                       | existing  | `previewStages` extraction                                |
| `src/battle/combat.ts`                                                                                                        | existing  | `lull` move; mechanic hook                                |
| `src/battle/bossMechanics.ts`                                                                                                 | **(new)** | the four boss mechanics                                   |
| `src/battle/rite.ts`                                                                                                          | **(new)** | `RiteChallenge`                                           |
| `src/game/rite.ts`                                                                                                            | **(new)** | `riteStations`                                            |
| `src/game/stones.ts`                                                                                                          | **(new)** | `stoneLight`, `STONE_TEXTS`                               |
| `src/game/sceneContext.ts`                                                                                                    | **(new)** | `sceneContext(state)` for both scene paths                |
| `src/game/story.ts`                                                                                                           | existing  | `beatVisible`; `scenePages` context                       |
| `src/native/tome.ts`                                                                                                          | existing  | `tomePages` filter; `homeFrom`; re-keyed staging          |
| `src/native/world.ts`                                                                                                         | existing  | marker `light`                                            |
| `src/data/campaignEnemies.ts`                                                                                                 | existing  | moves and `mechanic` ids                                  |
| `src/ui/worldFeedback.ts`                                                                                                     | existing  | `groveStone` replaced                                     |
| `tests/drowsy.test.ts`, `tests/stones.test.ts`, `tests/rite.test.ts`, `tests/bossMechanics.test.ts`, `tests/sim/rite.test.ts` | **(new)** | section 9                                                 |

## 12. Changes after review

Each row answers a finding or resolution in [PLANS_REVIEW.md](PLANS_REVIEW.md) that names Plan C.

| ID       | Resolution in this plan                                                                                                                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-06     | W3 and W5 state which `TOME_STAGING` indices shift (`campaignRite` beats 1–7 removed; mood beats inserted). Tasks 3.7 and 5.4, with effort, feed the shared re-index task (review §6 step 6). The hard-coded `campaignRecovery` index 7 becomes a `homeFrom` staging field.                                                            |
| F-07     | One `beatVisible(beat, ctx)` helper filters `requiresMentor` and `moods` for both `scenePages` and native `tomePages` (`src/native/tome.ts:424-425`). `src/native/campaign.ts:166` is named only as a call site. A test compares web and native page sets.                                                                             |
| F-08     | Mirror Stance uses a battle-local `schoolSeal` on `BattleContext`, counted in earned lines and read by `nextAutomatic`. It never touches `hero.seal` or `isSealed`. A test checks `hero.seal` before and after the duel.                                                                                                               |
| F-09     | Solvability is proved by construction: lines are the only need (13 at worst), one drop-only solver run proves the work zone gives them, effects are clipped to their bands, and two replays win. The 4,096-run claim is gone; solver cost is capped and measured.                                                                      |
| F-10     | New table "Existing tests to update" in section 9: `nativeTome.test.ts:27`, `:93-102` (changed), `:64`, `:76` (untouched by C), `attitude.test.ts:245-251` (still true), `data.test.ts:266`, `campaign.test.ts:42`, `encounterIntent.test.ts:67`, and the five `SAVE_VERSION` pins. C's save tests assert the current version, not 17. |
| F-11     | Player text follows Plan A's glossary: no "station" on the rite card, cues or helper lines ("Who stands at each stone"). Code identifiers keep `station`. Acceptance 8 added.                                                                                                                                                          |
| F-12     | W4d states which parts of the team-source Malificat (`ENCOUNTER_DESIGN.md:984`) are kept (bonds shape the last fight) and which are not (phases, HOLD-race, any "Ves, en." effect). The lantern moment is left to Plan B.                                                                                                              |
| F-16     | The rite's mentor beats move only after Plan B gives each reveal an unconditional confirmation. Added as a dependency and to task 3.6.                                                                                                                                                                                                 |
| F-20     | Dependencies now ask Plan B's "Plan C inputs" table for stone order and the lantern step, the singer-to-colour mapping, and why a tended stone resists, each with a placeholder.                                                                                                                                                       |
| F-22     | Silent marking is a one-time load step, guarded by having no `stone:seen:*` flag, with a `stone:seen:init` sentinel set by `newGame`. It is not tied to the version-9 `migrateScenes`. A reload test keeps a due beat.                                                                                                                 |
| F-23     | Boss fights skip map rules, in one check in the `Battle` constructor (`src/battle/battle.ts:204-206`). Task 1.9 and a test added.                                                                                                                                                                                                      |
| F-31     | The `lit` shim is dropped. Swift readers change in the same commit, since `npm run build:native` rebuilds the engine bundle into the app.                                                                                                                                                                                              |
| F-32     | No separate Plan C story round. G1 stays separate; G2–G4 use testers outside the cold pool; the theme question joins the combined protocol.                                                                                                                                                                                            |
| §3 facts | `autoTarget` cited at `autoCasting.ts:39`. All new files marked **(new)** in the text and in the critical-files table.                                                                                                                                                                                                                 |
| C-7      | `SceneBeat.moods: readonly ('cold' \| 'plain' \| 'warm' \| 'devoted')[]`, applied on both paths.                                                                                                                                                                                                                                       |
| C-8, C-9 | The variant table uses Plan D's words with C's gate: one insert after `SR-vesperAcceptance-12`, and the agreed cup and ledger tiers in recovery. The Devoted cup beat stays Devoted-only.                                                                                                                                              |
| C-10     | `vesperStanding` reads one regard keyed by `npc.voice ?? npc.id` (D4.7). `routeRegard` is dropped; only the optional lore bonus stays, under PC-D07.                                                                                                                                                                                   |
| C-11     | The drowsy map list covers Plan D's hush fight on `bellHollows`; the freeze flag is set at the end of whichever `vesperAcceptance` ships.                                                                                                                                                                                              |
| C-12     | Plan C adds no save-version bump. Plan D's v18 is the only one; one migration test covers a v17 save without C's flags.                                                                                                                                                                                                                |
| C-13     | Plan C owns the rite mechanics; Plan B owns order, lantern step and lore; Plan D does not touch `campaignRite`.                                                                                                                                                                                                                        |
| C-14     | PC-D07 absorbs the regard half of PD-D06; PC-D08 merges with PD-D07's Devoted gesture.                                                                                                                                                                                                                                                 |
| C-15     | Same as F-11.                                                                                                                                                                                                                                                                                                                          |

**Assumptions.** Plan D's D4.7 and v18 land before Plan C's W5. The rite's ranks run 1–4, as the
original 4⁶ count implied. Boss enemies are exactly those with `boss: true` in `CAMPAIGN_ENEMIES`.
