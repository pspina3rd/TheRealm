# Play and review the current casting interface

Run `git pull --ff-only` and `npm run dev`, then open Vite's **main game URL**
(without `workshop.html`) to check normal combat and your saved adventure.
Existing saves now use the same current casting rules as new games.

Seven learned primary schools are automatic. Cards show actual level, priority,
reach, **Held** mana and **Cost**, and whether they are ready or waiting. Earn a
line clear; no standard spell selection is needed. Base Arcane strikes the faced
opponent. Advanced Arcane techniques and your equipped custom Weaving have their
own manual controls. Teaching and support spells remain explicitly separate.

[Full-book phone](artifacts/casting-main/phone-full-book.png) ·
[Automatic Arcane](artifacts/casting-main/phone-arcane-auto.png) ·
[Weaving preview](artifacts/casting-main/phone-weaving.png) ·
[Actual-main browser evidence](artifacts/casting-main/report.json)

Independent reviewers checked the ordinary main-game route, including full books,
small touch screens, actual earned mana, and both Fire and seventh-school Arcane
auto-casts. Their returned findings and re-review verdicts are saved in
[UI/UX review](reviews/CASTING_UI_REVIEW.md) and
[gameplay review](reviews/CASTING_GAME_REVIEW.md).

The workshop below is an optional isolated test tool, not the only place where
auto-casting works.

---

# Spell workshop

On GetPutTaco, run `npm install` and `npm run dev`, then open
**http://localhost:5173/workshop.html** (or the port Vite prints).

## Start here

The workshop opens with **zero spells and empty mana**, using normal character
stats. Place blocks and clear lines normally. Under **Exercises**, choose the
school to learn first, then learn others in any order. The progression controls
simulate mentor learning and earned XP; they do not change your adventure save.

**Earn a level (test XP)** awards the real XP-earned skill points. Spend them on
one spell's Power, Efficiency and Effect; **Train next level** becomes available
when that spell is ready. Other schools keep their own levels. Reset keeps the
learned book; reloading preserves progression and equipped custom spells.
**New zero-spell run** clears this separate test progression.

For isolated visual checks, Exercises also has explicitly labeled **Supplied
spells · Lv 1–4** presets, a single-school selector, and **Supply mana (debug)**.
Those are supplied practice scenarios, not new-player acceptance tests.

Standard spells cast automatically after earned line clears, using their learned
levels and available mana. No selection or confirmation is required. Each cast
marks its targets, animates the actual blocks, then holds the result. Piece and
opponent clocks pause through the sequence.

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

## Advanced Arcane techniques stay manual

Choose the **Arcane** tab. Affordable techniques light up; unaffordable ones are
disabled. Choose a technique, inspect its target and mana cost, then **Cast Arcane**.
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
they intentionally disable standard autocasting. **Supplied spells · Lv 1–4** returns to automatic mode with debug resources.
Pick **Test spells** to isolate a school, then select the supplied level.
Each spell card shows its own learned level. Arcane techniques require the
Moon Wyrm aftermath and their trained prerequisites.

Supplied resources are limited to the labeled debug controls. Your adventure
save is separate.
There is no hidden timed ally. Ordinary hostile placements leave a gap rather
than completing your rows; your deliberate Arcane counterplay can still help.
Colorless blank blocks earn no mana. Story scenes remain responsible for teaching
spells, and learned rank controls each spell's effect and enhanced cost.

This is a development-only review fixture. The main game now uses the same current rules for new and loaded adventures.
All seven primary schools, including opponent-targeted Arcane, auto-cast in
combat. Lessons retain manual teaching interactions; advanced opponent techniques
and custom Weaving remain manual.

## Saved views and checks

[Desktop](artifacts/board-magic/desktop-workshop.png) ·
[Phone](artifacts/board-magic/phone-workshop.png) ·
[Automatic casts](artifacts/board-magic/phone-preview.png) ·
[Manual Arcane](artifacts/board-magic/phone-arcane.png) ·
[Landscape](artifacts/board-magic/landscape-workshop.png)

## Arcane and custom Weaving are separate

**Exercises → Arcane mastery** manages seventh-group opponent techniques.
**Exercises → Arcane Weaving** creates a custom, equippable two-effect spell:
choose both schools, their order, and each effect's strength. Both source schools
must be learned to level 2 and the Moon Wyrm aftermath must be complete. The
workshop has an explicit test-unlock control; it does not unlock the adventure.

New recipes begin at weaving level 1. Upgrade them with XP-earned skill points
(6/12/20), capped by both source levels. Casting cost is the sum of the two chosen
strengths' real enhanced costs, including repeated schools. Editing/equipping is
free. **Reverse order** changes the recipe; **Unequip** preserves saved recipes.

In the Arcane tab, **Equipped weaving** opens a preview showing Before, After
Effect 1, and After Effect 2, with separate targets and Wind directions. Cast
plays both elemental animations in order and pays once for the complete spell.
Insufficient total mana rejects the entire cast. Weaving is never auto-cast.

[Phone editor](artifacts/board-magic/weaving-editor-phone.png) ·
[Ordered preview](artifacts/board-magic/weaving-preview-desktop.png) ·
[Progression/Weaving browser report](artifacts/board-magic/progression-report.json)

The [automatic-mode report](artifacts/board-magic/auto-report.json) checks two-line
casting, read-only readiness cards, visible learned levels, no casting on an
ordinary placement, and manual Arcane on phone, landscape, and desktop. The
[manual-lab report](artifacts/board-magic/workshop-report.json) covers targeting,
comparison, touch gestures, Wind, Nature, and the absence of a hidden helper.
The [live rank report](artifacts/board-magic/rank-report.json) exercises all 24
spell/level combinations through an earned line, checks the level shown and the
completed cast, and verifies Reset preserves the chosen setup. Engine tests check
costs, committed results, and refusal below mana cost at every rank.
Author hands-on acceptance is still open.

## Watch the spell animations

Open **http://localhost:5173/spell-animations.html** (use Vite's printed port) to
watch all six spells at all four levels side by side (24 examples). The workbench uses the same renderer and
actual resolver traces as play, including the intermediate filled row before
Ice clears it. [Animated preview](artifacts/board-magic/spell-animations.gif).

Fire burns with flames and embers; Ice grows frost into gaps; Lightning strikes
and cracks stone; Nature grows vines and converts stone to colorless material;
Gravity animates exact falling paths; Wind slides blocks with directional gusts.
Reduced-motion mode omits travel and particle movement while retaining the
separate target/effect/result states. No manual confirmation is added to autos.

[All four levels](artifacts/board-magic/spell-levels.png) show the actual reach:
Fire/Ice/Wind cover 1/2/3/4 rows; Gravity covers 1/2/4 rows then the whole board.
Lightning/Nature use 1 row × 1 hit, 2 rows × 1 hit, 1 row × 2 hits, and
2 rows × 2 hits. Higher-rank hits animate separately, with the intermediate
obstruction strength visible between them. Four steady rank pips and per-row
target ticks identify the tier and area without extra flashing.

## October 31 follow-up: charge visibility and released blocks

Automatic cards now have colored mana charge bars labeled **held / cost**.
The bar caps visually at full while the number retains any surplus. **Charging**,
**Ready · next clear**, **No target**, **Sealed**, and **Casting** distinguish mana
from actual eligibility. A full bar alone does not promise a cast. Level remains
explicit and does not change with the bar. The portrait rail fits seven cards at
360×640 and 390×844; redundant legacy mana bars are hidden in automatic combat.

When a fully cleared row releases the blocks above it, those blocks now finish
falling to their next support. This may complete another row, resolved once with
its normal rewards. Untouched overhangs, boards without a clear, and rows pinned
by surviving durable obstructions keep their existing behavior. Gravity remains
useful for those unsupported overhangs. Automatic spell-created clears still do
not generate more automatic casting opportunities.
