# Encounter layout review

## Problem

The previous workshop scattered spell selection, mana, target information, and
confirmation across the screen. It shrank the same sidebar on phones, gave the
opponent little visual presence, and replaced movement buttons during aiming.
Fitting controls on screen did not establish a usable encounter layout.

## Revised composition

- Desktop: spellbook and mana on the left, full board in the center, opponent,
  next action, objective, and next piece on the right.
- Portrait touch: compact encounter header, board with a vertical spell rail,
  selected-spell action area, and a fixed movement dock.
- Short landscape: spellbook and movement at the left, full-height board in the
  center, opponent and casting actions at the right.
- Movement buttons retain their positions during aiming; they are visibly
  disabled while the game is frozen. Spell selection and bank tabs stay present.
- Selection, consequence, cost, comparison, Cancel, and named confirmation share
  one action area. Useful rows and opponent targets receive distinct highlights.
- A result preview renders copied board state with the actual game artwork;
  Before/Result comparison does not alter the game or spend mana.

## Consultation and verification

An AI agent acting as a game UI/UX specialist reviewed the published layouts,
proposed composition, and implemented desktop and phone captures, including Wind
and Arcane. The final review found no blocking composition issue and requested
clearer spell purpose, live-play wording, and an explicit Arcane action label;
these were addressed. This is not an external human usability study.

Browser interaction checks cover 360×640 and 390×844 touch and 1100×900 desktop.
Additional layout checks cover 640×360 and 844×390 landscape touch, 768×1024
tablet, and 1440×900 desktop. They verify full-board visibility, separate functional
regions, stable movement positions, 44-pixel buttons, and Wind/Arcane fit.

The [playtest instructions](BOARD_MAGIC_PLAYTEST.md) link the saved captures and
reports. The next author playtest should evaluate whether the encounter now
communicates the player's available actions and the relationship between spell,
mana, board, and opponent. Story-based spell teaching and campaign rollout remain
separate from this fixture review.
