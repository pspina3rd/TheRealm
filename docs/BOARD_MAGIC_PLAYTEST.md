# Spell workshop

On GetPutTaco, run `npm install` and `npm run dev`, then open
**http://localhost:5173/workshop.html** (or the port Vite prints).

On desktop, your spellbook sits beside the board, with Slime and the objective
opposite it. On a phone, Slime and the objective move into the top encounter bar,
spells form a vertical rail, and movement controls stay at the bottom. Landscape
touch screens use the side panels to leave more height for the board.

## Play and cast

- **Keyboard:** Left/Right move, Down soft drops, Up or X rotates, Space drops.
- **Touch:** tap the board to rotate, drag to move, drag down to soft drop, flick
  down to drop. Movement buttons support the same actions; hold Left, Right or
  Down to repeat.
- **Choose a spell beside the board.** Its cost, held mana, and mana bar are
  visible on its button. The Elements and Arcane tabs stay available. Arcane's
  additional shared mana cost is shown above its spell list.
- **Choose the target.** Useful rows light up; tap or drag across the board to
  select an affected band. The game pauses while aiming. The board shows the
  actual result preview, and the action area describes what will change.
  **Before / Result** compares the current board with the preview. The arrow
  keys can also adjust a row target; Wind has explicit Left/Right options.
- **Cast [spell]** or Enter applies the result once and resumes play.
  Character-targeted Arcane spells mark Slime instead of the board.
  **Cancel** or Escape returns without spending mana.
- Movement buttons remain in place during aiming and are disabled until play
  resumes. **Pause** or P freezes play separately; **Reset** starts over.
- **Exercises** offers seven focused scenarios using the same live physics.
  Choose **Next exercise** after completing the objective.

Practice mana and Arcane pairs are supplied; your adventure save is separate.
There is no hidden timed helper adding blank blocks. Ordinary enemy placements
leave a gap rather than completing your rows; your Arcane counterplay can still
turn enemy sends into useful material.
The story remains where spells are introduced and their uses are taught. This
fixture is for reviewing board interactions and the interface.

The board uses the adventure renderer and shared crystal artwork. Colorless
blank blocks earn no mana. Stone obstructions show damage, strength pips, and
colored contact edges where required.

This is a development-only fixture. Main-campaign board-magic activation remains
pending author playtesting.

## Saved views and checks

[Desktop](artifacts/board-magic/desktop-workshop.png) ·
[Phone](artifacts/board-magic/phone-workshop.png) ·
[Phone casting](artifacts/board-magic/phone-preview.png) ·
[Wind](artifacts/board-magic/phone-wind.png) ·
[Arcane](artifacts/board-magic/phone-arcane.png) ·
[Landscape](artifacts/board-magic/landscape-workshop.png) ·
[Blank blocks](artifacts/board-magic/phone-blank-block.png)

The [interaction report](artifacts/board-magic/workshop-report.json) covers real
touch gestures, held buttons, stable movement controls, comparison without
mutation, exact casting costs, Wind, Nature, and Arcane. The
[responsive layout report](artifacts/board-magic/layout-report.json) adds tablet,
wide desktop, and landscape touch sizes. These checks support the review; the
author's hands-on usability acceptance is still open.
