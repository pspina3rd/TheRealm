# Surface encounter and access review

Independent source and geometry review, 2026-11-03. Scope: expanded surface population, collision-aware travel guidance, and access to mentor regions. No product changes were made by this reviewer.

## Disposition

Approved for source integration. No remaining blocking finding within this scope. Native presentation, browser interaction, and novice human difficulty still require their separate checks; this record does not claim those checks passed.

## Evidence

- Actual surface population: 113 monsters — 46 Slimes, 29 Shrooms, 17 Goblins, and 21 regional creatures. Beginner encounters use existing enemy definitions; the patch does not grant equipment, spells, or progression flags.
- An independent four-direction flood fill used actual collision tiles, active entity occupancy, and terminal warp cells. Every monster has a reachable adjacent engagement cell: 106 from the provincial-road component and seven from the sanctuary component. The sanctuary mountain boundary remains closed to the roads; travel still passes through Mossvale.
- Real pathfinding and movement probes from the Mossvale surface return reached the correct Brightwater, Grove, Lake, and Quarry crossings. Peaks, Forge, Cliffs, and Ruins retained their authored locked messages. All four hometown starts receive valid road-exit legs. Sanctuary guidance returns through its northwest crossing and Mossvale.
- Regional habitat placement stays in its authored province and away from beginner homes/main roads. Roadside encounters increase encounter availability without making a fight mandatory on the tested travel paths.
- Same-region mentor guidance now uses the actual closed passage's authored instruction, including the relevant NPC and task. Once open, it names the mentor's landmark.
- Independently reran `npx vitest run tests/surfacePopulation.test.ts` after the final corrections: all 13 tests passed. This includes collision/reachability, beginner population, respawn persistence, route gates, and cave exits.

## Findings and corrections

1. Initial guidance considered only direct crossings to the overworld, leaving the Moon Caves without a route. The corrected graph follows actual open map crossings and respects required flags and closed gates. Independent movement probes confirmed caves1 → Moonfall Ruins and caves2 → caves1, with zero flags added.
2. The first cave regression incorrectly assumed caves1 exited to Brightwater and placed the caves2 start below its exit on solid terrain. Corrected tests use the authored Ruins exit and select an adjacent, walkable, non-warp starting tile. Re-review and the focused suite passed.

The reported bare-equipment/zero-spell simulations support early encounter viability, but scripted placement is not a measure of novice human win rates. Difficulty tuning should follow playtesting rather than treating simulation success as that proof.

## Native place-name correction re-review

A subsequent integration check found that the native panel's opening-story hometown substitution also rewrote real navigation references to Mossvale for the other three heroes. The narrow correction makes that substitution optional, preserves its existing default for other callers, and disables it for the world-map panel. Actual destination labels, route coordinates, and movement logic remain unchanged.

Independently reviewed the corrected call and reran `tests/nativeCampaign.test.ts`: all 18 tests passed. The route regression now covers all four hometowns, requires literal Mossvale in sanctuary directions, rejects alternate-home substitution, and follows the route into Mossvale while preserving the hero and progression gates. This correction is approved at source and native-engine-test scope. Fresh Apple execution and final browser/native presentation checks remain separate pending verification.
