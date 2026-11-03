# Encounter availability and travel delivery

The 256×256 world had only about thirty surface monsters, mostly away from
travelled roads. The stone sanctuary offered little repeatable early combat,
and the native map omitted selectable destination guidance. The reported
six-hour search with only three encounters was a content/access failure.

## Result

The world size is preserved. It now contains 113 visible surface encounters:
nearby basic fights at every hometown exit and within the sanctuary, ordinary
roadside encounters, and stronger regional wildlife farther from homes and
maintained roads. These are fixed map entities, not random battle timers.
The existing enemy stats, rewards, normal return-on-map-change rules and save
identity are preserved. No free levels, spells, equipment or road keys are added.

The native World map lists regions with their mentor and school, shows the
actual next crossing and remaining road requirement, and offers ordinary walking
for that leg. Sanctuary routes return through Mossvale; provincial travel uses
its south gate. Underground return guidance follows actual open crossings.
Selecting a destination never unlocks a gate or teleports the player. The web
map uses the same route instructions. Local mentor guidance names the actual
NPC/task that opens the approach.

## Review and validation

The [independent source/geometry review](SURFACE_ENCOUNTER_ACCESS_REVIEW.md)
returned indirect cave-route guidance and two invalid cave-test assumptions.
They were corrected and re-reviewed. Every monster is physically reachable:
106 on the provincial-road component and seven inside the sanctuary. The
mountain boundary remains intact. Early hunting circuits and the travelled
road coverage have explicit reachability/density regressions.

- Complete repository checks passed: formatting, lint, types, 1771 tests; 27 optional
  simulation tests remain skipped in the ordinary suite. Production web build,
  86 shared-art verification and offline native resource generation passed.
- Separate zero-spell/no-equipment simulations ran actual battles at 2200 ms per
  placement: twelve seeds per class against Slime and Shroom, using each actual hometown’s
  province, regional piece weights, dual-piece chance and regional rule (including
  Thornwood spores). Each class won all
  twelve basic Slime trials. Shroom trials were harder, particularly for Mage.
  A separate four-fight sequence at each hero’s own home circuit reached level 2 using real
  victory rewards and ordinary walking recovery, without spells or equipment.
  These results establish bounded viability, not novice human success rates.
  The [raw opening trials](artifacts/SURFACE_STARTER_BALANCE.json) record the
  class, enemy, win count and mean duration.
- Real browser checks passed for all four hometowns on desktop and phone-sized
  touch layouts. They cover destination selection, closed-route explanations,
  movement and save reload; no browser errors occurred. Actual screenshots show
  basic enemies visible from the road immediately outside Mossvale. Browser
  render timings are not physical iPhone performance measurements. The
  [browser report](artifacts/SURFACE_ROUTE_BROWSER_REPORT.json) records all eight
  hero/layout cases.

Source candidate: `e12a3895a8a6f3a0dffc0a20e829758bd37b6b7c`, tree
`028b9d4e09ccade8d39aef72bbc4ed19445f2954` (local package revision `ba352c7`).
[Repository CI](https://github.com/pspina3rd/TheRealm/actions/runs/41647892478)
passed. [Apple validation](https://github.com/pspina3rd/TheRealm/actions/runs/41647892668)
passed native compilation, all 26 native engine/gesture checks and all nine
iPhone 15 Pro UI tests, including all 111 visual cases.

The final native integration review also caught hometown substitution changing
literal Mossvale directions for the other three heroes. Navigation now bypasses
that story-only substitution. The correction was independently reviewed; all
four hometowns execute the route with literal place names and preserved progress
in the native boundary tests. Browser production code is unchanged by this final
native-only correction.

The actual native screenshot then exposed a separate visibility issue: selecting
a destination retained the old scroll position, hiding the new directions.
The correction settles table layout before resetting the scroll and deselects
the old choice. Independent source re-review approved it. The Apple flow now
requires the selected heading and directions to be visibly onscreen, then uses
the actual walking action and verifies arrival outside Mossvale before capturing
the starter enemies. The final source passed fresh Apple execution and screenshot review below.

The initial candidate's campaign and touch UI flows passed, but its Fire gallery
startup exceeded the five-second index predicate deadline. All 111 gallery
captures were produced, including the correct first Fire target; that whole run
is still recorded as failed. No timeout or gameplay change was made to waive it.

## Package

`Crystals-iPhone-Encounter-Routes.zip` includes 185 committed Xcode/project/asset
files, all 86 shared visual exports and the updated offline JavaScript resource.
Every archived file was compared byte-for-byte with package revision `ba352c7`.
SHA-256: `da3d035bec1ee0c237839c2605106503f160ac0d507ab639d188c5a70753b05b`.
Extract the whole ZIP, open `ios/ManaCrystalsPlaytest.xcodeproj`, keep the same
Personal Team and select the connected iPhone, then Run. Keep the installed app
to preserve its campaign save. Node, npm and a server are not required.

Raw trial evidence: [opening battles](artifacts/SURFACE_STARTER_BALANCE.json).

## Final Apple and visual disposition

[Final Apple validation](https://github.com/pspina3rd/TheRealm/actions/runs/41647892668)
is green for the packaged application source. The campaign flow verifies the
selected route heading and directions are within the visible table, follows the
actual walking action to the surface outside Mossvale, then relaunches and
resumes the saved campaign. Touch/background checks and the full four-rank
spell gallery also pass.

Root and the independent reviewer inspected the fresh
[route screen](artifacts/SURFACE_VERIFIED_NATIVE_ROUTE.png) and
[starter enemies](artifacts/SURFACE_VERIFIED_NATIVE_ENEMIES.png), artifact
`13236139432`. The complete route heading and directions are visible above the
map/action. Basic enemies are visibly nearby upon arrival outside town. This
closes the returned scroll/visibility finding and the scoped access/density
review. Physical iPhone feel and novice human difficulty remain playtest feedback;
simulator wins are not claimed as proof of either.

Subsequent changes only strengthen the optional regional simulation and preserve
review evidence. They do not change the Apple-validated application source or the
verified Xcode archive.
