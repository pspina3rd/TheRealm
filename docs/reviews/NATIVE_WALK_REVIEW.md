# Native walking animation review

Implementation: `2793cb3`. Independent source review: queued_ui_review, approved pending Apple compile and movement capture.

The four heroes use licensed 192×192 character sheets (026, 019, 016, 004), with 48px frames. Rows are down, left, right, up. Standing uses the same frame 0 as the shared renderer. The native gait advances at 8fps while the retained hero node moves, preserving its phase across adjacent grid steps. It returns to standing when the movement action ends. Map changes reset the gait. Reduce Motion uses standing frames and immediate position changes.

## Visual acceptance on Apple simulator or iPhone

- Walk in all four directions: the hero faces travel and alternates authored leg poses; no fixed pose sliding across the map.
- Hold a direction for several tiles: a continuous gait, without a full rapid cycle restarting at every tile.
- Turn while moving: the next pose uses the new direction's row; no reverse facing or temporary wrong character artwork.
- Release movement, finish a tapped route, or push against a wall: movement stops and the hero returns to frame 0, with no continued stepping in place.
- Open a menu or book, change maps, background and return: no stale walk or fast-forwarded animation.
- Repeated unchanged world snapshots do not restart a move or replace its walking pose mid-step.
- With Reduce Motion enabled, standing artwork stays legible and there is no interpolated travel or gait animation.
- Ground, buildings, camera and markers remain retained, with no per-step flashes or gaps.

Local verification: six retained native world rendering tests passed. UIKit/SpriteKit compilation and visual criteria remain pending the next Apple workflow/capture. This source review does not claim physical iPhone acceptance.
