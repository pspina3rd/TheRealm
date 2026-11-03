# Independent native mentor-stage visual review

Source reviewed independently against `73acb85..45659ec` and the web
`Stage.drawTinted` / `Stage.drawAlly` implementation. The corrected source and
actual Apple mentor image are reviewed below.

## Findings returned for correction

1. **Authored tint selection.** The web lesson stage takes `ENEMIES[enemyId].tint`.
   The new native bridge instead takes `lesson.mentor.element`, recoloring every
   lesson enemy. This changes foes such as Forge Imp that have no authored tint.
   Native should carry the actual lesson foe's optional tint. A tinted wisp case
   and an untinted regional foe should both be checked. Mentor `allyElement`
   should continue to come from the mentor, since that drives the helper aura.
2. **Aura baseline.** The 26×8 native ellipse at `baseline - 4` centers on the
   foot baseline and extends a point beyond the 72-point stage. A half-scale
   equivalent of the web ellipse centers two points above the feet: use
   `y = baseline - 6`, preserving its 26×8 extent inside the stage.

## Other source checks

The native recoloring uses the same sequence as the web: original sprite,
`color` blend, then the original alpha as a `destination-in` mask. Tinted crops
are cached by source region and tint; animated frame coordinates are discrete,
so the change does not generate a fresh image every display frame. Original
sprite shading and transparency are retained by the compositing sequence.

The lesson fixture constructs a detached real `Battle`, triggers a real helper
piece through the lesson's lock path, and arranges its own shield checkpoint.
It does not attach or overwrite the player's battle or save. The existing
fixture-isolation check remains meaningful. The type-only lesson import adds no
runtime path. Optional Swift stage fields preserve decoding of other stage data.

No new action buttons or input handling are introduced. Stage size remains 72
points.

## Correction re-review

`4b3ab04` resolves both findings. Native tint now reads the actual lesson enemy's
optional `tint`, matching the web source. The positive gallery case uses the
published Ember Wisp, whose tint is Fire. A separate real Torva/Forge Imp lesson
asserts that an untinted enemy keeps `tint: null` while the mentor still supplies
`allyElement: fire`. This distinguishes authored foe appearance from the helper's
own elemental cue.

The native 26×8 aura now starts at `baseline - 6`: it centers two points above
the helper's feet and ends within the 72-point stage. The hue-composite cache,
alpha mask, fixture isolation and existing inputs remain unchanged.

Independent fixture test execution passed after the correction. Source re-review
is approved with no remaining source findings in this scoped change. The prior
110-case capture did not establish this new lesson case's appearance; the fresh
mentor image provides that evidence below.

## Actual Apple mentor image

Inspected `/workspace/artifacts/native-mentor-final.png`, from Apple
[run 41566012936, attempt 1](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936/attempts/1),
artifact `13200028327`, candidate
`28e74b9d4a267de48cffbfb7f2aec6d9078e7317` (product source `4b3ab04`).

The Ember Wisp visibly carries its authored pink Fire hue while retaining sprite
shading, outline and transparent surroundings. The mentor and hero remain distinct
at the left of the compact stage. The helper's Fire aura sits at the feet inside
the stage, and the helper is visibly lifted during the actual toss. The shield,
Fire toss icon, recolored faceted waiting piece, matching next pieces, single
learned rank and unpaid `0/6` mana all remain legible. No cropped helper aura,
opaque tint rectangle, missing portrait or new control crowding was observed.

Scoped mentor-stage **source and visual review approved** after both corrections.
No product change is requested from this screenshot. Physical iPhone feel and
behavior outside the captured state remain separate acceptance checks.

The integration record reports all 111 visual cases and the campaign UI flow
passed in this attempt. The whole workflow is nevertheless **not a clean pass**:
the separate gesture test failed at app launch with “does not have a process ID”
before board actions. This mentor review does not claim that gesture test passed
or waive its outstanding validation; the same product candidate is being retried.


The unchanged [second Apple attempt](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936/attempts/2)
subsequently passed all nine UI tests, including the gesture/background-resume
checks and all 111 visual cases. The separate pending validation item is now
closed; the source and screenshot reviewed above are unchanged.
