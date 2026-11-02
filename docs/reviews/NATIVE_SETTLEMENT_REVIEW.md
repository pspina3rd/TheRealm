# Independent settlement collision and entrance review

Reviewed the queued collision and settlement entrance changes through `993f936`.

## Findings and corrections

- Mushroom and hut render widths included roof overhangs. Blocking the entire art width would create invisible walls beside their narrower ground bodies. The final catalog separates render anchoring from left/right ground insets. Mushroom art also removes a repeated alternate door course from the source region.
- New solid forge and hut walls initially covered two existing regional return landings: Forgefyre returned to Sevenstones `(200,194)` and Windrest returned to `(108,38)`. Both now return onto the street immediately below their corresponding entrance. This was a blocking review finding; the corrected data and tests were re-reviewed.
- Town warp markers now depict clustered homes behind an open central gateway, rather than a single large house door. The central lane aligns with the existing warp tile; this does not invent town interiors or change map topology.

## Evidence

[Rendered licensed atlas compositions with ground footprints](artifacts/NATIVE_SETTLEMENT_COLLISION_REVIEW.png) show both settlement variants, a mushroom home, Mossvale cottage, forge hall and hut. Orange cells denote solid ground; roof overhangs remain outside the footprint. This is an atlas composition review, not an iPhone screenshot.

Independent `tests/buildingReview.test.ts` follows actual tap paths from each of the four hometown starting positions to all three sleeping homes, confirms they remain inspect interactions, and verifies that a legacy save inside newly solid forge walls recovers to its valid inn while preserving the hero, items, money, flags, day and victories.

Re-review: `tests/buildingReview.test.ts`, `tests/buildings.test.ts`, `tests/data.test.ts` and `tests/surfaceWorld.test.ts` pass: 129 tests. The data suite covers map/warp destinations, world reachability and every mentor stop; the focused tests cover shared direct/tap collision and return landings. Independent test lint passes.

Source and shared-engine review approved. Native compilation, simulator evidence and physical iPhone acceptance remain the integration/release checks; this review does not claim device acceptance.
