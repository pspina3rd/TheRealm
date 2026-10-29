# Spell workshop

On GetPutTaco, run `npm install` and `npm run dev`, then open
**http://localhost:5173/workshop.html** (or the port Vite prints).

## Start here

The workshop now opens with **automatic standard spells**. The supplied square
fits the opening gap: press Space or tap **Drop** to clear two lines and see two
automatic casts. The status area reports what cast and at which learned level.
No spell selection or target confirmation is required for standard spells.

The numbered cards show **affinity order**, learned level, mana cost, held mana,
and readiness. Each earned line allows one cast of the first ready spell with a
useful target. A triple allows up to three casts. A higher-priority spell can
cast again if it still has enough mana and a useful target. Otherwise the next
eligible spell gets the opportunity. Extra mana stays; an ordinary piece
placement does not trigger a cast. Levels come from learned progression, not the
size of the current mana pool.

Automatic targets prefer completed rows, obstruction weakening/conversion, then
fewer covered holes and a lower stack. They are recalculated after each cast.
Spells without a useful target keep their mana. Automatic spell clears still
award their normal rewards but do not recursively create more cast opportunities.
Nothing fires automatically after victory or defeat.

## Arcane stays manual

Choose the **Arcane** tab. Affordable pairings light up; unaffordable ones are
disabled. Choose a pairing, inspect its target and mana cost, then **Cast Arcane**.
Character effects mark Slime; Arcane Lightning uses selected rows. **Before /
Result** compares a board preview without changing the game. **Cancel** or Escape
returns without spending mana. Arrow keys adjust row/direction and Enter confirms.
The additional Arcane mana cost is displayed separately above the pairings.

## Controls and layouts

- **Keyboard:** Left/Right move, Down soft drops, Up or X rotates, Space drops.
- **Touch:** tap the board to rotate, drag to move, drag down to soft drop, flick
  down to drop. Movement buttons support the same actions; hold Left, Right or
  Down to repeat.
- Movement controls remain in place while manually aiming Arcane, and are
  disabled until play resumes. **Pause** or P freezes play separately;
  **Reset** starts over.
- Desktop places spells and mana beside the board, with Slime and the objective
  opposite. Portrait touch uses an encounter header and vertical spell rail.
  Landscape uses side panels to preserve board height.

**Exercises → Manual spell lab** retains the earlier targeting fixture for
isolating individual effects. The seven focused manual exercises are there too;
they intentionally disable standard autocasting. **Live workshop** returns to
automatic mode.

Practice mana and Arcane pairs are supplied; your adventure save is separate.
There is no hidden timed ally. Ordinary hostile placements leave a gap rather
than completing your rows; your deliberate Arcane counterplay can still help.
Colorless blank blocks earn no mana. Story scenes remain responsible for teaching
spells, and learned rank controls each spell's effect and enhanced cost.

This is a development-only review fixture. Campaign combat wiring supports the
same engine behind the existing `boardMagicEnabled` rollout flag; new adventure
saves still do not receive that flag. Lessons retain manual teaching interactions.

## Saved views and checks

[Desktop](artifacts/board-magic/desktop-workshop.png) ·
[Phone](artifacts/board-magic/phone-workshop.png) ·
[Automatic casts](artifacts/board-magic/phone-preview.png) ·
[Manual Arcane](artifacts/board-magic/phone-arcane.png) ·
[Landscape](artifacts/board-magic/landscape-workshop.png)

The [automatic-mode report](artifacts/board-magic/auto-report.json) checks two-line
casting, read-only readiness cards, visible learned levels, no casting on an
ordinary placement, and manual Arcane on phone, landscape, and desktop. The
[manual-lab report](artifacts/board-magic/workshop-report.json) covers targeting,
comparison, touch gestures, Wind, Nature, and the absence of a hidden helper.
Author hands-on acceptance is still open.
