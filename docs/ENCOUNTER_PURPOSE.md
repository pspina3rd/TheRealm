# What each board is trying to accomplish

The portrait beside the board does not determine whether an obstacle is hostile.
The actual authored objective and its source of pressure do. The offer names the
relationship; the live objective frame opens **Details** with the goal, meaning
of the blocks, pressure and counterplay. Opening Details does not commit a try,
spend a pause, drop a piece or change HP. Closing it returns keyboard focus to the
board and restores the prior pause state.

| Encounter             | Purpose of its material                                             | Source of pressure                                         |
| --------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Rowan’s well          | Debris covers the marked pipe                                       | Rising mold, not Rowan attacking                           |
| Pip’s tower           | Supplied pieces fit an outline; unsuitable pieces have a spare area | Cracks and imbalance from misplaced pieces                 |
| Bean’s herb beds      | Matching colors in the furrows are crops; ridges/paths are not      | Limited pieces before sundown                              |
| Wren’s mushroom ring  | Rot is hazardous; young caps are protected                          | Rot spreads toward the caps                                |
| Ordor’s price contest | Incoming rows are counter-offers; clears improve the price          | Warned sends and the rival’s price strategy                |
| Vale’s ward lamps     | Each displayed lamp needs the actual color threshold                | Wind can snuff a lamp; strain can add lamps                |
| Other barters         | Requested colors fulfill the real material quota                    | The stated piece limit, not an invented enemy routine      |
| Repair/rite puzzles   | Fixed blocks are the structure; the queue is the available tool set | The authored layout, sequence and success condition        |
| Offerings             | The offered item opens a score-based trial                          | The stated score/piece requirements                        |
| Mentor lessons        | A sample demonstrates the selected spell                            | The trial foe and matching shield; mentor help is separate |

Actor identity accompanies the offer and live board so a story-renamed NPC keeps
its proper task. Wren’s former planting instructions now match her actual
CONTAIN task. Goal text follows real parameters, including extra strained lamps.
Recorded layouts, queues, scoring, rewards and required story flags are retained.
The [independent inventory](reviews/ENCOUNTER_INTENT_REVIEW.md) covers each NPC,
shop, offering, repair and mentor operation, including the second-half tasks.

## Enemy choices

Slime and Goblin no longer receive the same pair of arbitrary coordinate stones.
Slime places **one strength-1 goo block** at a useful supported landing area.
Goblin places **one strength-2 rubble block with its fixed orange contact route**
at the mouth of a real clearing well. If the purpose cannot be served safely,
they attack instead. They alternate obstruction attempts with attacks. No new
obstruction profile is invented for unrelated creatures or bosses.

Selection avoids occupied cells, the active piece, protected task material,
completed-row gifts and already-satisfied color contacts. A queued target is
reserved. The declared footprint and material stay fixed: if the player fills
the target, the placement fizzles. An orange contact added after the Goblin’s
warning is a valid counter, not a reason to move the threatened cell elsewhere.

Other creatures retain their authored moves. Ordinary non-boss selection skips
utilities that cannot currently have an effect. Existing petrification has a
frozen crystal footprint, including an empty footprint that cannot secretly
select new targets later. Boss move selection remains authored. Their effects
have distinct explanations: rubble raises the stack, petrification denies
usable crystals/mana, a column seal limits placement until it expires, and a
normal hit reduces HP without adding blocks.

## Consistent enemy material and spells

Newly pushed enemy rubble, petrified crystals and targeted obstruction packets
share ownership and the owner’s Arcane modifier/placement clock. Legacy enemy
stone remains strength 1; tagging it does not invent extra durability or a color
lock. Environment, merchant sends, soil ridges and fixed puzzle structures do
not silently become enemy-owned material.

Wind can slide an obstruction sideways into a free cell while preserving its
durability and color contacts. **Vertical anchoring still prevents falling**;
Gravity alone does not lift that anchor. Lightning and Nature can now recognize
legacy enemy stone as well as targeted obstruction packets.

The existing **Arcane + Ice** rule is intentionally bounded: it holds the next
material batch only; later batches and attacks keep their normal action timing.
Curse and petrification share that one-batch slot. Chooser text, the live held-
batch status, Details and the actual telegraph times disclose the distinction.
Other incoming modifiers are applied on actual delivery, and one authored
multi-cell/multi-row batch advances placement-based effects once.

## Mentor material

Fire gets loose neutral material to remove; Ice gets gaps to fill; Gravity gets
unsupported blocks and their landing; Wind gets sideways space. Lightning and
Nature get explicit lesson-owned break/conversion samples with the strength
needed for the taught rank. Opponent-targeted Arcane gets no irrelevant stones.
Existing useful targets take precedence; samples never overwrite current work,
tags, the active piece or its landing, complete rows passively or grant mana.
A crowded shield can wait for a safe physical-lock boundary instead of
corrupting the board. See [the practice implementation](LESSON_PRACTICE_INTENT.md).

## Testing and remaining scope

The intent, ownership/lifecycle, frozen targeting and practice paths have
permanent regressions. Actual-App browser inspection covers the representative
roles at 393×852 (iPhone 15 Pro CSS size), 360×640 and desktop, including Details
recovery and control bounds. Browser/device emulation is not physical iPhone
validation. [iPhone installation](IPHONE_TESTING.md) explains the on-device path.

These changes implement opponent/task purpose. The proposed separate revision
to standard auto-target priorities (bottom-first clearing and Gravity selection)
is not activated by this change; existing standard spell targeting still uses
its current usefulness heuristic. M2a reactions/class abilities/synergy remain
inactive foundations, not part of this correction.
