# Spell workshop

On GetPutTaco, run `npm install` and `npm run dev`, then open
**http://localhost:5173/workshop.html** (or the port Vite prints).

The workshop opens with a live, full-height board: falling pieces, landing ghost,
Slime placing obstructions, and an ally occasionally supplying blank blocks.
Your adventure save is separate, with practice mana and Arcane pairs provided.

- **Keyboard:** Left/Right move, Down soft drops, Up or X rotates, Space drops.
- **Touch:** tap the board to rotate, drag to move, drag down to soft drop, flick
  down to drop. The buttons below the spells provide the same actions; hold
  Left, Right or Down to repeat.
- **Spells:** select a spell, then tap or drag to choose its target row. The gold
  band shows the affected rows; the side panel states rank, effect and mana cost.
  Aiming pauses the action. **Cast** commits once and resumes play; **Cancel** or
  Escape returns without spending mana. Character-targeted Arcane spells instead
  highlight Slime. Row arrows and Enter also work while aiming.
- **Pause** or P freezes play separately. **Reset** starts over.
- **Exercises** offers seven focused scenarios. These use the same live physics;
  read the goal and choose **Next exercise** after completing it.

The board uses the adventure renderer and shared faceted crystal artwork.
Colorless frosted blocks earn no mana. Weathered stone obstructions show strength
pips, damage cracks, and colored contact edges where required.

This is a development-only review fixture. Main-campaign board-magic activation
remains pending author playtesting.

[Browser report](artifacts/board-magic/workshop-report.json),
[phone view](artifacts/board-magic/phone-workshop.png),
[desktop preview](artifacts/board-magic/desktop-preview.png),
[blank-block view](artifacts/board-magic/phone-blank-block.png), and
[adventure regression report](artifacts/board-magic/m1-regression-report.json)
are saved. Browser checks exercise movement, held buttons, real touch gestures,
aiming, cancellation and casting on two phone sizes and desktop.
