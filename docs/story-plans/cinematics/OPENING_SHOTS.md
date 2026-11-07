# Opening shot list

Draft for author review. Staging for the opening as written in
[OPENING_SAMPLE.md](../samples/OPENING_SAMPLE.md), from the patrol to the walk back down the hill.
Nothing is built until this list is approved.

The scenes play as illustrated storybook pages: one shot per page, with the page's words beneath.
"Code effect" means it is done in the game's drawing code with the existing art. "Art edit" means a
changed or new sprite.

## Scene 1 — The last stop (hilltop, night)

| #   | Words on the page                          | On screen                                                                                                                    | How                                                                       |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | "The night patrol ended at the stones…"    | Fern walks up a dark path between birch trees.                                                                               | Night tint (code effect). Birch trees (art edit A).                       |
| 2   | "There he stood…"                          | Fern stops at the crest, his back to us. Seven stones in a ring, softly glowing.                                             | Lit stone sprites with a slow glow pulse (code effect).                   |
| 3   | "Fern sighed…" / "Well, that's enough…"    | Fern faces us, then turns to go.                                                                                             | Existing walk frames.                                                     |
| 4   | "He turned to go, and the stones seemed…"  | As he turns away, all seven dip for a split second. He turns back; they are steady.                                          | Brief brightness dip (code effect).                                       |
| 5   | "Fern stood very still." / "You're tired…" | Fern stares at the stones, then looks left and right: a head shake.                                                          | Quick left and right frames.                                              |
| 6   | "He turned away again."                    | Fern walks away from the stones.                                                                                             | Existing walk frames.                                                     |
| 7   | "The violet stone was out!…"               | Stones dim and go out one at a time: violet, blue, cyan, green, gold, orange. The whole scene grows slowly darker with each. | Lit stone swaps to unlit stone; scene darkens step by step (code effect). |
| 8   | "Fern ran."                                | As the red stone starts to go, Fern runs off down the path. Fade to black.                                                   | Walk cycle at double speed; fade (code effect).                           |

## Scene 2 — Rowan (Rowan's house, night)

| #   | Words on the page                               | On screen                                                                                | How                                                                                                                      |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 9   | "Rowan yawned as he put on his captain's coat…" | Inside Rowan's house: bed, chair, stove, door. Rowan in his navy captain's uniform coat. | Village furniture tiles. Rowan in coat (art edit B).                                                                     |
| 10  | "The two had grown up together…"                | Memory: young Rowan and Bracken side by side, softly faded at the edges.                 | Soft vignette, not full sepia, so colours stay readable (code effect). Bracken and young Rowan (art edit F; question 1). |
| 11  | "Pounding at the door…"                         | The door shakes.                                                                         | Door tile jolts (code effect).                                                                                           |
| 12  | "Was it a little dragon again…"                 | The door swings open.                                                                    | Closed door swaps to open door (existing tiles).                                                                         |
| 13  | "Fern stumbles in shouting…"                    | Fern rushes in, pale, mud down one side.                                                 | Muddy, pale Fern (art edit C).                                                                                           |
| 14  | "Sit," Rowan said…                              | Fern stands by the chair, too wound up to sit; Rowan standing.                           | Existing frames.                                                                                                         |
| 15  | Fern's report                                   | Two-shot of Fern and Rowan. Words only.                                                  | Existing frames.                                                                                                         |
| 16  | "Then we'll go and see."                        | Rowan takes the lantern from its hook; they leave.                                       | Rowan holding a lantern (art edit E).                                                                                    |

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

| ID  | Edit                                                            | Frames            | Size   |
| --- | --------------------------------------------------------------- | ----------------- | ------ |
| A   | Birch trees: pale trunks with dark bands                        | 1–2 tree variants | Small  |
| B   | Rowan in his captain's uniform coat, navy (a darker royal blue) | All 16            | Medium |
| C   | Fern, pale and muddy down one side                              | All 16            | Small  |
| E   | Rowan in his coat, holding a lantern                            | All 16            | Medium |
| F   | Memory pair: young Rowan and Bracken (question 1)               | All 16 each       | Medium |

Not possible at this sprite size, so carried by the words alone: Rowan yawning or pulling on his
coat, Fern's grin, Fern paling at the thought of leaving.

Removed after review: Fern's shadow thinning (the scene darkens with the stones instead), Fern
sitting, and the inset replay during the report.

## Questions for the author

1. **Bracken's sprite.** Options: a colour-swapped Rowan; Fern's sprite with darker hair and
   different clothes, so father and son resemble each other; or an unused character sprite.
