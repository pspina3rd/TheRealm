# Opening and mentor progression review

Current status: the findings below have been implemented. Earlier corrections
were independently rechecked; the coordinator verified the final cave-entry
boundary after the reviewer reached its usage limit. This is scoped opening
verification, not full story or campaign acceptance.

Independent source/mechanical review of the playable opening and current mentor
approach changes. Scope does not establish full campaign quality or player
acceptance. Preserve Rowan's intentional Quake reward; school order follows whom
the player visits and helps.

## Initial finding — old-save egress

**Changes required:** physical mentor clearings replace formerly walkable tiles
with closed perimeter walls. An existing save inside a new clearing, with no
prior mentor meeting or task completion, cannot leave to reach the task that
opens its passage. A loaded position on the new wall can likewise become
invalid. Preserve safe departure or relocate affected saves to a valid external
approach without granting free inward access. Add a serialize/reload regression
from a valid old interior position before the first meeting.

Further route, school order, reward and exposition review is in progress.

## Progression and continuity findings

Initial independent run: opening, mentor approaches, lessons, story, scenes and
world suites passed **124 tests** (`/tmp/opening-review-independent.log`).
Passing fixtures did not cover the following alternate-order cases:

- **Mandatory Rowan work must remain available after another school.** The
  Focus Stone/call now requires his well victory. Independent runtime check
  with Ice 4, Nature 4 and Charm 0 returns a hostile refusal message instead of
  an encounter offer. Apply the existing essential-NPC hostile-to-Wary rule so
  chosen school order cannot close the story gate. Keep the Quake reward.
- **Gate every early Vesper stop consistently.** Only the road appearance had
  Brightwater/refusal prerequisites. After earning the stone, leaving Mossvale
  and entering Quarry directly triggers Vision 2 and spawns Vesper Ridge before
  Brightwater. Independent runtime confirmed `reached:brightwater=false` while
  `vesperRidge` exists. Apply the intended first-appearance boundary to all early
  stops without closing regional exploration routes.
- **Rowan already used the stone.** His confession says he cracked granite with
  it, so the gift scene cannot say he never knew its purpose. Acknowledge the
  known prior use; do not remove his intentional Quake reward.
- **Ranger may have traveled already.** The call's “Never went past the second
  ridge” conflicts with permitted pre-call exploration and school choice. Use a
  present concern instead, such as watching the sleeping households. Other
  class lines describe present reluctance and need no broad rewrite.

The navigation prerequisites do not require casting or a learned school. Fire
requires Flint's road work and Cinda's forge task; Lightning/Wind may require
that onward road chain, but neither task forces learning Earth or Fire. Local
approach tests show the actual task remains reachable before its teacher opens,
including keyboard/touch blocking and route rewards. This is route coherence,
not an independent full zero-spell completion/balance trial of every barter.

Old meeting/task flags preserve established access. The new explicit lesson-win
flag correctly keeps an untrained teacher home even after Rowan teaches Earth.
Older saves without that new flag may find previously roaming teachers home;
this is a location change rather than loss of spell/SP investment. Avoid
claiming an exhaustive old-save roaming migration from these checks.

## Correction re-review

The reviewed correction now allows outward egress through a closed approach for
an existing interior save while retaining inward blocking and granting no
access flag/spell. Keyboard and tap paths share that rule; all seven
serialize/reload egress regressions pass. Existing invalid positions on new wall
tiles are also subject to the loader's existing standable-position recovery.

Rowan now remains available under the existing essential-NPC terms; his Quake
reward remains intentional. The stone line acknowledges its bedrock use and the
Ranger expresses concern for the houses rather than false travel history.
Every pre-Wyrm Vesper stop observes the new call/Brightwater boundary.

A compatibility issue exposed by the first common-gate correction is resolved
with save version 15: established journeys from versions through 14 receive an
explicit historical-journey marker. It preserves historical Vesper progression
without pretending the player visited Brightwater or granting the stone again.
Independent runtime check with a version-14 vision-progress save confirmed:
items/spells unchanged, no new stone/visited flags, correct historical Ridge
appearance, and idempotent subsequent save/reload. A fresh version-15 save with
the same vision flags has no exemption and no early Vesper.

Independent bounded real-board simulation also passed all **seven approach task
cases**, three seeds per task with at least one completion required and no
spells/casts (`/tmp/opening-zero-spell-review.log`). This supports zero-spell
access; it does not establish broad difficulty or human acceptance.

Latest seven-suite run passed **138/140** tests. The two remaining assertions
expect save version 14 and exact old flags without the intentional compatibility
marker (`/tmp/opening-review-final.log`); no new mechanical failure was found.
Update those assertions while retaining explicit migration coverage before
closing release validation. Final review is limited to opening/route coherence,
continuity and saved progression; presentation/hardware and the full campaign
remain separate reviews.

## Additional boundary required: the Moon Caves

**Story-coherence blocker:** free regional exploration currently also permits
winning Vale's Cave Pass and entering the Moon Caves before earning Rowan's
call. The ruins entrance checks only `cavePass`; Wyrm victory scenes do not
require the call. This allows resolving the sleeping crisis and then returning
to a village scene claiming the houses remain silent and presenting the initial
reason to depart.

Keep exploration, every regional teacher and the guard's task/reward available
in the player's chosen order. Apply the earned-call boundary at Moon Caves
entry: require the actual completed Rowan scene, or established legacy-journey
compatibility, alongside the pass. This is a story boundary, not a spell quota,
level or forced first school. The blocked-entry system text should direct the
player to Rowan without inventing a character speech. Movement and destination
presentation must agree. Regressions should cover earning the pass first,
blocked entry without the call, entry after the call, unchanged first-school
routes, and preserved legacy entry.

## Coordinator closure after the cave-entry finding

The requested boundary now lives on the actual Moonfall → Moon Caves warp,
using the Cave Pass plus either the earned call or historical compatibility.
The blocked text directs the player to Rowan. Movement, mentor map-distance
calculation and destination presentation share the new requirement. A permanent
regression exercises pass-before-call blocking, earned-call entry and legacy
entry. Regional first-school routes remain open.

The final independent agent turn reached its usage limit before re-reviewing
this last boundary. Its earlier correction and zero-spell results remain as
recorded above; the coordinator owns final verification of this change. This is
not an independent sign-off on the final boundary or full campaign.
