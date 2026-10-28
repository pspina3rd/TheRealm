# Second-half implementation notes

Working engineering notes, saved before code work. Root is first reconciling
the team's `d14b3c4` changes, including its version-9 scene system. The
dialogue draft is a working script, not evidence that gameplay exists yet.

## Keep and extend the existing engine

- Keep `wyrmBeaten` / `FINALE_FLAG` as the Chapter One milestone. Add a
  distinct `campaignComplete` flag earned only by defeating the Malificat.
  Do not label the Wyrm as full-campaign completion.
- Reuse the team's `SceneDef`, `scenePages`, `finishScene`, and recursive
  `App.playScenes`. Do not build a second cinematic engine.
- New scenes live in a leaf data module, with type-only imports of scene
  types. They use registered NPC speaker IDs and existing sprite keys.
- Extend scene conditions with an optional required map and additional flags.
  `dueScenes(flags, mapId?)` can retain the existing call shape; campaign
  map-specific scenes must be excluded when no map is supplied. Update the
  UI call to supply the current map.
- Add completion flags to scenes only if needed to unlock the next playable
  action. `finishScene` applies them atomically with its seen flag, after the
  last page. A reload during the scene replays it and cannot duplicate gains.
- Call `playScenes` after ordinary NPC/boss results, not just Chapter One's
  epilogue. Existing warp/start hooks already show due scenes.

## Data/module ownership boundaries

Suggested independent work packages after the team reconciliation:

1. **Runtime and save owner:** `src/game/story.ts`, `src/game/ending.ts`,
   `src/game/encounter.ts`, `src/game/save.ts`, `src/ui/app.ts`; scene lifecycle,
   boss milestones, campaign ending, compatibility. Coordinate any additions
   to `SceneDef` in `src/data/story.ts` with the scene-data owner.
2. **World content owner:** new `src/data/campaignMaps.ts`,
   `campaignEnemies.ts`, `campaignNpcs.ts`; append exported records from the
   existing aggregate maps/enemies/NPCs. Use a small `campaignFlags.ts` leaf
   for shared string constants rather than importing game logic from data.
3. **Scene data owner:** `src/data/campaignStory.ts`; translate the reviewed
   dialogue into actual scene beats and map/flag conditions. Maintain exact
   speaker IDs agreed with the world content owner. Preserve existing
   first-half scenes and mentor speech.
4. **Independent QA owner:** campaign progression/graph, lifecycle and save
   tests, plus browser playthrough. Test earned gates and defeat/reload paths,
   not a sequence of manually added flags pretending to be a playthrough.

Do not introduce imports from a leaf campaign data file back into aggregate
`MAPS`, `NPCS`, or `ENEMIES`: those aggregates will import the leaf files.
Only types, core element IDs, and a shared leaf flag registry are safe there.

## Campaign progression contract

Substantial map sequence: Sevenstones threshold → Sunken Archive → Cistern
Marches / Irdrath → Rootways → Glass Warrens / Vesper duel → Bell Hollows →
Quiet Foundry / Lishal → Upward Road → Sevenstones rite → inner ward /
Malificat. Use multiple explorable maps/areas where needed, ordinary monsters,
resident tasks, optional exploration, rest and supply points between bosses.

Every one-way story gate needs a deliberate return route. Every mandatory
NPC is essential (hostile alignment still deals), and no gate requires a
mentor lesson, hidden spell, class, optional reward, consumable, or permanent
spend that can exhaust the player's save. Boss defeats are permanent and
distinct. Losses retain required task flags and leave a retry path.

Use current `combat`, `puzzle`, and `barter` challenges for the first playable
extension. The encounter appendix's new phased mechanics, seven-column
singer rules, lamp-protection system, and final Resurrection effect need
separate implementation; do not claim they are complete merely because
equivalent narration exists. No controls may be impaired or landing guides
hidden to fake the specified effects.

Suggested stable IDs (final agreement pending with root):

- Maps: `sunkenArchive`, `cisternMarches`, `rootways`, `glassWarrens`,
  `bellHollows`, `quietFoundry`, `upwardRoad`, `innerWard`.
- Boss enemies: `irdrath`, `vesperDuel`, `lishal`, `malificat`.
- Permanent boss entities: `campaign-irdrath`, `campaign-vesper`,
  `campaign-lishal`, `campaign-malificat`.
- Mandatory tasks: archive drain, safe cistern trial, Ketter rescue,
  bell circuit, foundry procedure, ascent repair, Fennick rite.

## Save compatibility and honest completion

The team's `migrateScenes` marks old first-half scenes seen and grants
Rowan's old item once. Do not append campaign scenes and let that migration
silently mark their new threshold seen in old Wyrm-complete saves. Restrict
that migration to its original scene generation, or use an explicit versioned
scene list. The new campaign uses existing flags but should still receive
a new save version with migration tests for the newly reachable world.

Old v7 `sunkenRuins` saves must retain the established safe recovery outside
the ward; do not reinterpret that obsolete map ID as an earned campaign entry.
Old Wyrm-complete v8/v9 saves should be able to begin the new threshold,
without replaying the opening or losing Focus Stone receipt history.

Validation must distinguish story reachability, battle viability, and pacing.
Reaching the final map with flags injected tests neither gameplay nor the
claim of an equally substantial second half. Record limitations and new
mechanics still pending in the build log, and checkpoint each working step.

## Runtime step saved

The agreed runtime is now implemented: scene map/all-flag/obsolete conditions,
atomic scene completion flags, earned-mentor filtering, gated map entities,
version-10 compatibility, post-result and map-entry scene playback, and
guarded Malificat victory. `campaignComplete` is refused as a scene reward.
The final summary waits for `scene:campaignRecovery` and appears once.

Focused verification passes 70 tests across `campaignRuntime.test.ts`,
`scenes.test.ts`, and `saveValidation.test.ts`, including 14 new runtime
tests. Independent campaign traversal, battle viability, full-suite checks,
and browser checks belong to the integrating/QA work, not this test count.
The new fight-specific mechanics listed above remain separate work.

### Postgame integration finding resolved

QA found that the final recovery says the inner chamber is sealed while the
state still stood inside it and its entry remained open. An authored scene
destination now applies once on final-page completion and returns the hero
to Sevenstones at the existing ward return point. A generic warp `closesWith`
milestone prevents re-entering the contained voice's chamber after victory.
The earned `rite` and `wardReady` history remains intact. Focused lifecycle
and independently earned-route tests cover the return and postgame gate.
