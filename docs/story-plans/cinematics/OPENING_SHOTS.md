# Fern — opening shot list

Revised 14 November 2026. Web prototype implemented through the dawn handoff. The iPhone scenes remain deferred until the web sequence is settled, as recorded in [AUTHOR_DECISIONS.md](../AUTHOR_DECISIONS.md).

The [page script](../samples/OPENING_SAMPLE.md) contains visible narration and dialogue. The table below describes what the picture must show; these descriptions are also available to screen readers without being repeated as visible prose. Pages wait for the reader. Animation duration does not impose a reading deadline. Previous and Replay are available; Skip opening reaches the same handoff as reading through.

| Shot | ID                        | Setting | Action                                                                                                   |
| ---- | ------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| 1    | `patrol-path`             | hill    | At night, Fern walks up the birch path toward seven glowing standing stones.                             |
| 2    | `the-stones`              | hill    | Fern pauses at the crest, facing the seven steady lights.                                                |
| 3    | `turns-to-go`             | hill    | Fern turns back toward Mossvale.                                                                         |
| 4    | `the-flicker`             | hill    | All seven lights dip briefly. Fern turns back; the stones are steady again.                              |
| 5    | `head-shake`              | hill    | Fern looks to either side, then back at the stones.                                                      |
| 6    | `walks-away`              | hill    | Fern starts down the path.                                                                               |
| 7    | `stones-go-out`           | hill    | Violet goes dark, followed by blue, cyan, green, gold and orange. The hill darkens. Red still glows.     |
| 8    | `fern-runs`               | hill    | As red fades, Fern runs down the path. The scene fades to black.                                         |
| 9    | `rowan-wakes`             | house   | In Rowan's cottage, the captain turns from the fire toward his door.                                     |
| 10   | `pounding`                | house   | The cottage door shakes. Fern calls from outside.                                                        |
| 11   | `door-opens`              | house   | Rowan crosses to the door and opens it.                                                                  |
| 12   | `fern-bursts-in`          | house   | Fern rushes in, pale and muddy. Rowan steps aside.                                                       |
| 13   | `by-the-chair`            | house   | Rowan leads Fern to the fire. Fern sits and catches his breath.                                          |
| 14   | `the-report`              | house   | Fern reports from the chair; Rowan stays beside him and listens.                                         |
| 15   | `the-report-ends`         | house   | Rowan asks about the last stone. Fern looks up at him.                                                   |
| 16   | `are-they-still-out`      | house   | Rowan waits for Fern to answer before taking his lantern.                                                |
| 17   | `lantern`                 | house   | Rowan takes his lantern. Fern stands and follows him outside.                                            |
| 18   | `back-up-the-hill`        | hill    | Rowan leads up the path. Fern glances right toward him, waiting for a response.                          |
| 19   | `the-crest`               | hill    | They reach the hilltop together. All seven stones are glowing.                                           |
| 20   | `i-believe-you`           | hill    | Fern turns to Rowan. Rowan turns toward Fern instead of looking away.                                    |
| 21   | `learn-magic`             | hill    | Rowan faces Fern, who turns toward him.                                                                  |
| 22   | `someone-has-to-stay`     | hill    | Rowan looks down the path toward Mossvale. Fern stays beside him.                                        |
| 23   | `or-large-bats`           | hill    | Rowan heads down the path. Fern hesitates, then follows.                                                 |
| 24   | `the-morning-after`       | house   | Daylight fills the cottage. Fern and Rowan speak alone by the hearth.                                    |
| 25   | `keep-it-between-us`      | house   | Rowan faces Fern. There is no one else in the cottage.                                                   |
| 26   | `the-rune-stone`          | house   | Rowan passes a small, unlit rune stone to Fern. Fern keeps it.                                           |
| 27   | `a-teacher-to-start-with` | house   | Rowan names a teacher. Fern listens; the route is a recommendation, not a compulsory lesson.             |
| 28   | `rowans-watch`            | hill    | Rowan keeps watch alone beside seven steady stones, from dusk toward dawn.                               |
| 29   | `dawn-on-the-north-road`  | road    | Fern and Rowan stand at the fork: the north road continues ahead, the path to the stones branches right. |
| 30   | `beyond-the-patrol`       | road    | Fern turns north and takes a few steps past the fork. Rowan stays behind. The player takes control here. |

## Web testing

- Run `npm run dev`, then open `/cinematic.html` for the illustrated book preview.
- Open `/?opening=fern` for the same sequence followed by a playable overworld handoff. This development playtest uses a separate save namespace; ordinary campaign saves are not replaced.
- The final preview action opens `/?opening=fern&at=dawn` at the fork. Walking, regional approach challenges and lessons use the existing game. Later campaign text still needs the no-sleep rewrite; this test does not claim that rewrite is finished.
- `?shot=N&t=MS` freezes a preview frame; `node tools/cinematic-screenshots.mjs <folder> N:MS` saves it. Shot IDs above are the stable reference.

## Staging constraints

Keep the existing pack art: boulder standing stones, birches, captain's coat, muddy Fern, seated Fern and Rowan's lantern. Fern sits for his report, stands to follow Rowan, and looks right toward him on the return climb. He is clean again the following morning. The rune stone is an ordinary, unlit hand-held prop; do not give it a glow, an elemental demonstration or an explanation of its future purpose. The watch and dawn scenes have no neighbor cameos. The first teacher visit and letter are played, not filmed.

The two facing sprites and long narration that previously formed the memory page are removed from this opening. Bracken's death and Rowan's guilt are not explained here; Dorn's later scene remains the planned place for the Redrock account.
