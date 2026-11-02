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

## Delivery gate

The Apple engine/gesture suite, iPhone 15 Pro simulator flow and recorded movement
sequence still need to be checked for this revision before a new device package
is described as ready. Physical iPhone acceptance remains necessary after that.
