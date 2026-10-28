# M1 implementation plan

Baseline inspected: local campaign `f1ea3fb`, incoming immutable team tree
`f17985d`, and approved Encounter Design rev 3 plus Addendum A rev 3.
This is the remaining vertical slice after reconciling the incoming foundations;
it is not authorization to copy the redesign through later regions.

## Scope and preservation

Ship Rowan, Pip, Bean, Ordor, Wren, Vale, Hazel lessons, grove monsters,
one isolated Selene dark prototype, and Sevenstones grove-stone feedback.
Keep first-half authored story and the playable second-half campaign, their
maps, flags, completion rewards, finale handling, and progression saves.

Incoming save v10 is an independent schema fork of campaign save v10. Merge
fields and validators explicitly; version equality is not compatibility.
The union migration needs a new version and fixtures from both v10 writers.
Do not zero existing campaign progression while adding stakes defaults.

Addendum A is approved **after the author's M1 go/no-go**. Keep the incoming
push/telegraph/glass/holes/CLASS hooks inert; do not activate reactions, class
abilities, awakening/stat trades, synergy, or their save fields in M1.

## What the incoming team tree already supplies

- Board tags, narrow spawn, controlled queues, neutral cells, push hooks.
- Six verb implementations and `ENCOUNTER_DEFS` for the slice.
- Battle pre-roll, animated demo placement, assisted tosses, faces and beat events.
- Stakes helpers (`recordOf`, `blockedReason`, `firstTry`, `beginTry`, `settle`,
  `assistOffered`, `settleHaggle`, `priceChange`, `innNight`).
- Shield/lent-spell lesson logic, bounded seal helpers, spores and dark visibility.
- Initial verb sims, bot placement fixes, feasibility/board-tag tests.

The incoming BUILD_LOG ends at the verb/hook stage. In particular its App and
`game/encounter.ts` still offer legacy specs and legacy resolution; these
foundations are not yet connected to a player-facing M1 loop.

## Work boundaries and interfaces

M1 NPC ids: Rowan `elder`, Pip `kid`, Bean `farmer`, Ordor `stallKeeper`,
Wren `forager`, Vale `guard`. Region selection is already declared through
`MAP_RULES` and `MENTOR_RULES` in balance.ts; consume those maps rather than
hard-coding biome strings in App.

### A. Encounter state flow (one owner)

Own `src/game/encounter.ts`, `src/game/stakes.ts`, `src/game/lessons.ts`,
`src/game/shop.ts`, and any necessary shared `Interaction`/`Resolution` types.
Own core-focused state-flow tests. Coordinate App integration through the
contract below so presentation can proceed independently.

1. Route only known M1 NPC ids to `{kind: 'encounter', id, strain,
demo, assisted}`; retain legacy specs for campaign and later encounters.
2. Expose a pure card model from interaction preparation: win rewards and
   world outcome first, objective, fail consequence/current strain, retry
   text/blocked reason, optional assist choice, and whether browsing is offered.
   The UI must not reconstruct stakes from NPC ids.
3. Check retry availability both when presenting and committing a try.
   First actual player input after the demo commits exactly once with
   `beginTry` and immediate persistence. Merely viewing/leaving pre-roll is free;
   give-up after commitment settles once as failure. A completed demo alone
   must not consume the first try. Define explicit App commitment callback or
   a monotonic Battle event; do not infer commitment from frame counts.
4. Settle strain/regard/retry and reward/completion changes exactly once.
   Repeat wins halve gil and cannot farm regard; assisted wins retain gil,
   suppress bonus items/regard, clear strain and grant the threshold flag.
   Failed NPCs stay on the map and show the fail prop.
5. Vale: Wait after failure, cap strain at one, offer Maren after two fails,
   player chooses assist or solo. Preserve existing cavePass story gate.
6. Lessons: card before starting, Now-once then Wait, per-spell bounded seal,
   regard settlement, three monster wins release the seal. A monster victory
   updates global victories once and unblocks Wait. Keep finale/campaign
   resolution branches intact.
7. Browse every shop without a battle; only Ordor offers new M1 haggle.
   Use saved priceChange for browsing and results, including markups.
   Preserve later-region/campaign shop availability and stock. Wire inn/day
   and town-exit discount expiry to existing movement/rest paths.

Suggested contract: extend the challenge interaction with optional `stakes`
(view data) and `canAccept`/assist alternatives; expose a dedicated shop
interaction for Browse plus optional Haggle. Return stakes changes in Gain
and use the existing resolution shop fields. Exact type names are flexible,
but agree them before App and card edits overlap.

### B. App and presentation (one owner)

Own `src/ui/app.ts`, `src/ui/screens/conversation.ts`, `src/ui/battleView.ts`,
`src/ui/boardView.ts`, `src/ui/stage.ts`, `src/ui/art/feedback.ts`, relevant
styles and focused UI tests. Depend on A's typed data, not mutable state rules.

- Render Stakes card in approved Win / Ask / Fail / Retry order, Not now,
  Take it on, explicit assist and solo choices, and readable blocked reason.
  Lesson selection leads to the same card. Browse remains directly available.
- Start Battle with encounter specs and `rule: 'spores'` for grove monsters;
  Hazel's rule follows the mentor. Do not globally enable Selene dark boards.
- Add commitment persistence and pre-roll leave/give-up actions to App;
  blocked retries must reopen the card rather than reuse stale specs.
- Draw objective on board frame, at most two lines; objective counter/lamps,
  DUEL mini stack + pending rows + price meter, active mentor shield and lent
  taught-spell affordance. Use existing Battle.objective and telegraphs().
- Render verb zones/outline/protected tags and one hazard family. Frame lamps
  and meters are outside the grid overlay budget. Distinct well/tower/beds/
  stall/ring/lamps treatments should make boards recognizable without text.
- Play incoming demo, beat and face events once through numbered events;
  preserve gesture thresholds and pause accessibility. Confirm Ordor's demo
  demonstrates the incoming row rather than inventing a falling-piece demo.
- Dark prototype uses visibleCells plus always visible skyline and ghost
  landing cells, isolated via test fixture/debug entry rather than story route.

### C. Content and world feedback (one owner)

Own `src/data/encounters.ts`, M1-only dialogue additions in `src/data/npcs.ts`,
`src/ui/worldView.ts`, and relevant art/data helpers. Do not rewrite campaign
NPC definitions or existing story scenes. Coordinate shared styles with B.

- Review layouts/queues against recorded feasibility rather than trusting
  legacy NPC challenge data; numbers stay in balance.ts.
- Keep three lines/person and ≤2-line objective. Append winAdd guidance in
  Rowan → Pip → Bean → Ordor order without locking that order.
- Render one win and one fail prop for each M1 encounter from saved outcomes;
  ensure map coordinates are correct. Add grove Sevenstones brightening from
  existing story/mentor progress, without introducing a new progression gate.
- Update STORY/GAME_DESIGN and BUILD_LOG to describe implemented behavior.

### D. QA and balance (one owner)

Own tests/sim, recorded fixtures, docs/M1_PLAYTEST.md and screenshot artifacts.
Do not tune unrelated campaign difficulty while checking the slice.

- Regression fixtures for legacy saves and both v10 forks; first-half route,
  second-half flags/maps/quests, finale completion and save round trips.
- State-flow tests: free pre-roll exit, first-touch exactly once, demo replay
  only before first committed try, give-up failure, retry blocking and monster
  unblock, inn strain relief/day, assisted threshold win, repeat rewards,
  Browse markup expiry, bounded lesson seal, one-time settlement.
- Verify every authored queue has replay proof; shape-fit and controlled
  supply checks. Existing incoming BUILD feasibility numbers may differ from
  the prose design; investigate rather than silently changing acceptance.
- Run 200 seeded good/casual/dropper/idle cells for Mossvale, Wren, Vale,
  Hazel and grove monsters; report Wilson 95% intervals, fail causes, pieces
  and time. Test strain-2 floor (good ≥60%, casual ≥25%), idle 0%, and approved
  per-cell/dropper bands; assisted Vale casual ≥90% within three tries.
- Capture 390×844 and 360×640 boards/cards/results, plus desktop smoke.
  Check objective wrapping, readable dark skyline/ghost, overlays, touch
  targets, no horizontal overflow, and no gesture regression.
- Record honest author playtest status: Rowan first-try win; at least one
  Pip/Bean/Ordor failure; whether verbs/stakes/demos feel clear and challenging.
  Automated completion is not the author's go/no-go.

## Suggested sequence

1. Root reconciles immutable trees, documents schema union, and saves the
   foundation checkpoint with existing campaign tests passing.
2. Agree A/B interaction and commitment types, then implement state flow and
   presentation in separate ownership areas; C handles content/world files.
3. Integrate small checkpoints: Rowan full loop, all four Mossvale loops,
   Wren/Wait + Vale/assist, Hazel/grove + dark prototype, then phone polish.
4. QA validates each checkpoint, writes actual evidence, and runs full required
   format/lint/typecheck/test/build plus relevant M1 sims once integration lands.
5. Deliver the playable M1 and author log. The only genuine decision required
   is the author's M1 playtest go/no-go before M2/M2a; do not ask for routine
   implementation approvals or represent that playtest as already passed.
