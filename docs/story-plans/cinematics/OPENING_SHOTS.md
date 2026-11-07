# Opening shot list

Draft for author review. Staging for the opening as written in
[OPENING_SAMPLE.md](../samples/OPENING_SAMPLE.md), from the patrol to the walk back down the hill.
Nothing is built until this list is approved.

The scenes play as illustrated storybook pages: one shot per page, with the page's words beneath.
"Code effect" means it is done in the game's drawing code with the existing art. "Art edit" means a
changed or new sprite.

## Scene 1 — The last stop (hilltop, night)

| #   | Words on the page                          | On screen                                                                                         | How                                                          |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | "The night patrol ended at the stones…"    | Fern walks up a dark path between birch trees.                                                    | Night tint (code effect). Birch trees (art edit A).          |
| 2   | "There he stood…"                          | Fern stops at the crest, his back to us. Seven stones in a ring, softly glowing.                  | Lit stone sprites with a slow glow pulse (code effect).      |
| 3   | "Fern sighed…" / "Well, that's enough…"    | Fern faces us, then turns to go.                                                                  | Existing walk frames.                                        |
| 4   | "He turned to go, and the stones seemed…"  | As he turns away, all seven dip for a split second. He turns back; they are steady.               | Brief brightness dip (code effect).                          |
| 5   | "Fern stood very still." / "You're tired…" | Fern stares at the stones, then looks left and right: a head shake.                               | Quick left and right frames.                                 |
| 6   | "He turned away again." / his shadow       | Fern walks away. A long shadow ahead of him thins and fades.                                      | Drawn shadow that fades (code effect).                       |
| 7   | "The violet stone was out!…"               | Stones go out one at a time: violet, blue, cyan, green, gold, orange. The hill darkens with each. | Lit stone swaps to unlit stone; scene darkens (code effect). |
| 8   | "Fern ran."                                | As the red stone starts to go, Fern runs off down the path. Fade to black.                        | Walk cycle at double speed; fade (code effect).              |

## Scene 2 — Rowan (Rowan's house, night)

| #   | Words on the page                               | On screen                                                                                         | How                                                                |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 9   | "Rowan yawned as he put on his captain's coat…" | Inside Rowan's house: bed, chair, stove, door. Rowan in his captain's coat.                       | Village furniture tiles. Rowan in coat (art edit B).               |
| 10  | "The two had grown up together…"                | Optional memory: two young men side by side, in faded warm colours.                               | Sepia tint (code effect). Needs a sprite for Bracken (question 1). |
| 11  | "Pounding at the door…"                         | The door shakes.                                                                                  | Door tile jolts (code effect).                                     |
| 12  | "Was it a little dragon again…"                 | The door swings open.                                                                             | Closed door swaps to open door (existing tiles).                   |
| 13  | "Fern stumbles in shouting…"                    | Fern rushes in, pale, mud down one side.                                                          | Muddy, pale Fern (art edit C).                                     |
| 14  | "Sit," Rowan said…                              | Fern in the chair by the stove; Rowan standing.                                                   | Fern sitting (art edit D, optional; question 2).                   |
| 15  | Fern's report                                   | Two-shot of Fern and Rowan. Optional small inset replaying the stones going out as Fern tells it. | Reuses shots 4 and 7 in a frame (code effect; question 3).         |
| 16  | "Then we'll go and see."                        | Rowan takes the lantern from its hook; they leave.                                                | Rowan holding a lantern (art edit E).                              |

## Scene 3 — The hill again (night)

| #   | Words on the page                        | On screen                                                                            | How                                              |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 17  | "Rowan was stern and silent…"            | Rowan leads up the birch path with the lantern; Fern behind, turning to look at him. | Lantern light circle around Rowan (code effect). |
| 18  | "As they crested the barren hill…"       | Both stop at the crest. All seven stones glow brightly.                              | Lit stones at full brightness.                   |
| 19  | Dialogue at the stones                   | Two-shot by the stones.                                                              | Existing frames.                                 |
| 20  | "You're going to learn magic."           | Rowan turns to face Fern.                                                            | Direction frames.                                |
| 21  | "Because..." / "...someone has to stay." | Rowan looks back down the hill toward Mossvale.                                      | Direction frames.                                |
| 22  | "Or large bats," Rowan said, chuckling.  | Rowan walks down the path; Fern follows. Fade out.                                   | Existing walk; fade (code effect).               |

## Art edits needed

All edits are made from the existing pack art and keep its style and palette.

| ID  | Edit                                     | Frames            | Size   |
| --- | ---------------------------------------- | ----------------- | ------ |
| A   | Birch trees: pale trunks with dark bands | 1–2 tree variants | Small  |
| B   | Rowan in a captain's coat                | All 16            | Medium |
| C   | Fern, pale and muddy down one side       | All 16            | Small  |
| D   | Fern sitting in a chair                  | 1–2               | Medium |
| E   | Rowan holding a lantern                  | All 16            | Medium |

Not possible at this sprite size, so carried by the words alone: Rowan yawning or pulling on his
coat, Fern's grin, Fern paling at the thought of leaving.

## Questions for the author

1. **The memory of Bracken (shot 10).** Include it? If so, which existing character sprite should be
   Bracken, or should I make one?
2. **Fern sitting (shot 14).** Worth a new frame, or is standing by the chair enough?
3. **The inset replay during Fern's report (shot 15).** Include it, or keep the report as words only?
4. **Rowan's coat colour.** Any preference? The watch has no colours yet.
