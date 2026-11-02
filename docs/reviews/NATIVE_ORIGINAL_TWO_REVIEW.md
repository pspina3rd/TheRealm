# Original native playtest fixes — review record

Scope is limited to the user's original two requests. The five later observations
are queued in [the follow-up queue](../NATIVE_TOUCH_FOLLOWUP_QUEUE.md).

## Movement and touches

Implementation retained world nodes and atlas textures between steps, added
overscan, and smoothly moves the camera. Read-only snapshots do not restart
movement. World markers are retained. Held touches, soft drags and deliberate
fresh downward flicks have separate paths; a release cannot reuse stale velocity
or command the next piece.

An independent controls agent returned the work for letterbox tap containment
and stale-velocity sampling corrections. Those were implemented and re-reviewed
in `398ad09`; no blocking source findings remained. Six independent rendering
regressions passed. Swift tests cover held taps, release jitter, uninterrupted
flicks, cancellation, multi-touch and old-piece handling.

## Character selection and story tome

Sprite cards open a character's book before starting or overwriting a campaign.
Story scenes use authored shot staging, animated action or character portraits,
and spoken dialogue. Stage directions are only used as visual instructions and
VoiceOver descriptions, never printed as the dialogue body. Existing script,
mentor requirements, save flags and rewards remain authoritative. Scene skipping
runs the same completion code as watching; it never replaces a required battle.

Independent story and UI agents returned the work for actor identity/choreography,
escaped-voice embodiment, quoted-label leakage, scrolling/Dynamic Type,
Reduce Motion final states, VoiceOver, stale action protection, and a mistaken
cup/rune prop. Corrections were applied. Source re-review approved the approach
for Apple validation, with the final requirement to expose Skip for vision and
prelude narration also applied.

## Validation and delivery

Apple run [41472371022](https://github.com/pspina3rd/TheRealm/actions/runs/41472371022)
passed the engine/gesture suite, native build, and both iPhone 15 Pro UI tests.
The UI flow opens a sprite's book, returns without starting a game, begins the
adventure, turns opening pages, skips narration, reaches Rowan, enters/leaves
his puzzle, walks, opens the world map, reloads a save and recovers after backgrounding.

The actual book screenshot and simulator recording were inspected. Two recorded
world segments were reviewed: 121 continuous world frames while approaching Rowan
and 116 during held movement. No isolated ground-disappearance frames were found
in those segments. The [frame review](artifacts/NATIVE_MOVEMENT_FRAME_REVIEW.json)
records the sampling bounds and limitations. This is evidence for this simulator
run, not a guarantee about every physical-device frame.

Ready for the player's iPhone retest. The five later observations remain queued;
source review, simulator success and a device retest are separate gates.
