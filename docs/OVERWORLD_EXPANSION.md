# Sevenstones: a full surface world

The compact 40 × 24 travel junction is replaced by a 256 × 256 surface world.
Sevenstones names the whole overworld; its central stone circle is a landmark
within it. The seven provinces need recognizable terrain, branching journeys,
regional sites, signs and encounters, rather than empty space between portals.

- Northwest: Moonfall's old country; west/northwest: Mossvale's settled valley.
- North: Windward's high country; northeast: Stormcrown's mountains.
- East: Glasswater's lake and coast, with Merehaven.
- Southeast: Forgefyre's volcanic country.
- South: Redrock's quarry country, with Cairnwick.
- Southwest: Thornwood's forests, with Bramblecross.

All four protagonists keep the same opening cast and story. Their hometowns
open onto different parts of this shared world. The seven mentors retain
their existing regional homes and approach challenges. Existing regional maps
become local sites within larger provinces. Interregional travel uses the
overworld roads instead of jumping directly between distant regional sites.

Keep the existing progression locks, Vesper's delayed introduction, the Moon
Wyrm midpoint, the underground second half, and the final boss order. Do not
grant spells, items or story victories to compensate for the larger map.

Provide a world map through the existing menu, district labels, readable roads
and landmarks. Cull offscreen terrain and props so a larger world remains
usable on phones. Migrate existing overworld positions and respawns to their
corresponding landmarks without relocating town saves or resetting progress.

Save and verify in increments. Validate routes and gates from every hometown,
legacy saves, story transitions, map readability, and desktop/phone rendering.

## Implemented and verified

- Seven distinct provincial landscapes, a central stone circle, branching
  authored roads, river crossings, regional trail markers and biome encounters.
- Four separated hometown exits, using the approved names Cairnwick,
  Merehaven and Bramblecross alongside Mossvale. Stable map IDs preserve saves.
- Regional map exits return to their provincial roads. New northern approaches
  preserve the Stormcrown → Windward → Moonfall story sequence and legacy access.
- A world map in the existing menu, with touch-sized destination selection,
  location markers, closed-route guidance and district names in the world HUD.
- Viewport culling for props, alongside the existing terrain culling. Regional
  battle conditions and piece weights follow the province. Roaming lessons keep
  their established training foes rather than selecting distant stronger ones.
- Save version 17 relocates old overworld positions around their original
  landmarks. Existing homes, inventory, spells and earned story flags persist.
  Current-save reloads no longer turn a Cave Pass into unearned road keys.
- Journeys checkpoint during walking, on opening the menu, and when the page
  goes into the background. District labels update as the player walks.

Validation includes physical path reachability and substantial safe road
distances from every home, regional gate tests, school-first vision ordering,
legacy round trips, full-campaign transition regressions, real App map-menu
touch/keyboard checks, and the existing casting smoke. Browser render-call
timings are evidence for culling, not a physical iPhone performance guarantee.

Human travel/content pacing still needs review, including keeping the Moon
Wyrm near the midpoint. Tile count is not proof of playtime or narrative
quality. The underground continuation is preserved, not resized in this pass.
The native iPhone app remains the separate Slime controls prototype.

Browser reproduction: `node tools/surface-world-smoke.mjs` against the dev
server on port 5191; `BASE`, `OUT`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`
can override the local setup.
