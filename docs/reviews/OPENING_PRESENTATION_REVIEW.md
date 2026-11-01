# Opening presentation review

Read-only game UI review of the current opening, Farmer Bean task, compact
encounter offers, and task-gated regional mentor entrances. Browser inspection
uses the actual App with staged save positions at 393×852 and 1100×900; this is
emulated touch layout review, not physical iPhone testing or full campaign acceptance.

## Final verdict

**Pass for the reviewed opening surfaces.** Fresh actual-App captures at 393×852
and 1100×900 confirm entrance and exit labels read above props and mentor markers.
The compact offer, sleeping-house inspection and Bean demo remain readable. No
remaining presentation blocker was found in this scope; this does not establish
physical iPhone testing, independent progression acceptance, or full campaign
acceptance.

## Initial source review

The offer now shows character speech, one goal, reward icons and a short failure
consequence; detailed stakes sit inside optional **Rewards & risks**. Mossvale
contains three separately inspectable sleeping households. Bean's green seeds
score on placement rather than waiting for a full row, and expose a Sprouts
counter. Regional entrances explain the associated NPC task in world terms.

The following findings preserve the review history; their label blockers were
resolved in the final retest below.

## Initial actual App findings (label issue subsequently resolved)

- **Changes required — entrance labels are obscured.** At Torva's forge
  entrance, new rock props cover most of the locked `Help Apprentice Cinda`
  label and the unlocked `Torva →` label. `WorldView.drawApproaches` draws them
  before sorted props. Keep passage ground/icons at ground level and render the
  text in the final overlay pass, clamped to the viewport. Captures:
  `/tmp/opening-presentation-review/393-gate-closed.png` and
  `/tmp/opening-presentation-review/393-gate-open.png`.
- Bean's offer fits on both reviewed layouts with the longer stakes closed.
  Speech, planting goal, reward and brief failure consequence remain visible
  together with both choices. Removed cooperation/hostility implementation
  labels are absent from the reviewed surface.
- Bean's real first-try demo changes **Sprouts 0/19 → 4/19**, displays **+4 sprouts**
  and produces a planted event without a line clear. The remaining player board
  stays visible and presents the next piece and controls.
- An unlocked Torva entrance permits the next inward step; the locked entrance
  displays the task's in-world explanation. This is one entrance's staged UI
  check; independent route and old-save review remain separate.

Phone and desktop screenshots and the machine-readable observations are saved
under `/tmp/opening-presentation-review/`. No page errors were recorded in these
staged interactions. Exit and household follow-up is recorded below.

## Follow-up: household and exit

The baker's door opens a short, readable inspection on both layouts. The house
is a visible place the player approaches; its sleeping household is discovered
through one brief description rather than an opening exposition panel. The other
two inspectable doors are authored separately in the map; they were source
reviewed, not individually exercised in this UI pass.

The southern village exit has the **same label layering defect** as the mentor
entrance: boundary tree props and the hero obscure most of `→ Sevenstones`.
`drawWaymarks` likewise needs its text painted after map props. Capture:
`/tmp/opening-presentation-review/393-exit.png`.

**Disposition:** compact offers and Bean's immediate planting feedback pass this
review; correct the entrance/exit text overlay order before publishing. Review
acceptance remains limited to the staged opening surfaces described above.

## Overlay retest

Moving labels above terrain props fixes the obscured southern exit. Entrance
text is now above rocks, but Torva's floating scroll is drawn afterward and still
covers part of `Help Apprentice Cinda` and the arrow beside `Torva`. Queue those
labels after character markers as well, or move them clear of that marker lane.
The remaining issue is narrower than the original prop occlusion; fresh captures
at the same paths show this follow-up.

The revised warning now accurately describes Cinda stoking the cold forge; the
source wording for Tam and Twitch also matches their actual NPC tasks.

## Final label-layer retest

A separate final labels pass now follows terrain, creatures, and character
markers. Both reviewed layouts show complete `Help Apprentice Cinda`, `Torva →`
and `→ Sevenstones` labels. Ground tint and lock/boot cues remain on the actual
passage tile. The locked task warning and open inward step still behave as
before. Fresh screenshots replace the earlier images under
`/tmp/opening-presentation-review/`, with observations in `report.json`.

The repeated Bean check still scores Sprouts 0/19 → 4/19 with planted feedback,
and both runs report no page errors. **The identified label-layer blocker is
resolved.**
