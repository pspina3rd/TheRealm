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

- Complete local checks passed: formatting, lint, types, 1768 tests; 27 optional
  simulation tests remain skipped in the ordinary suite. Production web build,
  86 shared-art verification and offline native resource generation passed.
- Separate zero-spell/no-equipment simulations ran actual battles at 2200 ms per
  placement: twelve seeds per class against Slime and Shroom. Each class won all
  twelve basic Slime trials. Shroom trials were harder, particularly for Mage.
  A separate four-fight sequence for each class reached level 2 using real
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

Source candidate: `6a6802813949e1b6f39f115a9ca23ec6e2ff7311`, tree
`a443ba677791dbdca10b963a44ce292fba0f0bae` (local package revision `a6a6e14`).
[Repository CI](https://github.com/pspina3rd/TheRealm/actions/runs/41642827747)
passed. [Apple validation](https://github.com/pspina3rd/TheRealm/actions/runs/41642827869)
is pending at the time of this saved checkpoint.

## Package

`Crystals-iPhone-Encounter-Routes.zip` includes 185 committed Xcode/project/asset
files, all 86 shared visual exports and the updated offline JavaScript resource.
Every archived file was compared byte-for-byte with package revision `a6a6e14`.
SHA-256: `54e88850bf127a6a35face585161bab2d5b5e95c5b32680d015fde4d7f42c49b`.
Extract the whole ZIP, open `ios/ManaCrystalsPlaytest.xcodeproj`, keep the same
Personal Team and select the connected iPhone, then Run. Keep the installed app
to preserve its campaign save. Node, npm and a server are not required.
