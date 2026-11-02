# Native playtest follow-up queue

The original requests are implemented, corrected through independent source
review, and passed Apple/simulator validation. They are ready for iPhone retesting:

1. Remove movement flashing and prevent held-touch rotation from becoming a drop.
2. Sprite character selection, in-world story tome, animated action/portraits,
   narration/exposition shown rather than stage directions printed. Return or skip
   safely without changing progression rewards.

Queued after those are complete, in the user's requested order:

- Remove the redundant “Village” from Mossvale's displayed name.
- Replace remaining platform-standard menus with the game's visual theme.
- Align building collisions and visible footprints; make entrances understandable.
- Give town entrances settlement visuals instead of a single house portal.
- Use the available walking frames for characters instead of sliding sprites.

These remain queued; a shared foundation or incidental improvement is not completion
of a queued item. Implementation → independent review → correction → re-review →
Apple engine/simulator validation → updated device package.
