# Independent native mentor-stage visual review

Source reviewed independently against `73acb85..45659ec` and the web
`Stage.drawTinted` / `Stage.drawAlly` implementation. Apple screenshot review is
still required for the corrected mentor case.

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
points. Final approval is withheld until the tint routing and aura position are
corrected, re-reviewed and confirmed in the actual Apple screenshot.
