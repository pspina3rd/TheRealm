# Purposeful enemy obstruction plans

This replaces the Slime/Goblin pilot's fixed two-coordinate packets with
two explicit profiles. It does not invent obstruction types for the rest
of the enemy roster or change authored boss move probabilities.

## Creature purpose and material

| Creature     | Intention from existing description | Target                                                     | Fixed counterplay                                          |
| ------------ | ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Green Slime  | Goo hardens into stone              | A supported surface at or near the current piece's landing | One durability-1 obstruction; no colour requirement        |
| Goblin Scout | Throws rocks and stakes columns     | Mouth of a visible clearing well beside nearly filled rows | One durability-2 obstruction; orange contact from any side |

Material never cycles with turn number, target coordinate, or RNG. Both
stay within the existing 1–3 durability system. Existing ownership,
anchoring, colour contact, and Arcane interference remain authoritative:
Nature may neutralize the incoming cell, Wind may redirect it, and Gravity
may release its anchor. No new character barks are added.

Selection rejects a colour-contact target that the current board already
fulfills. That guard is deliberately absent from delivery validation: orange
placed beside a telegraphed Goblin target is a legitimate counter. The frozen
rubble arrives there and the existing contact resolver clears it. It does
not move to a different well, change its colour, or turn into an attack.

## Hook API

`planEnemyMove(enemy, board, rng, options)` returns `PlannedEnemyMove`:

- `move`: a deeply frozen `EnemyMove`, including a concrete obstruction
  footprint and nested material requirements when an obstruction is useful;
- `intent`, `label`, and `reason`: data for the existing telegraph/intent UI;
- `fallback`: true when the creature should attack instead of wasting a turn.

Pass the actual `Board` (or the exported `IntentBoard` structural snapshot).
Pass `previousMove` to prevent consecutive obstruction attempts. Pass
`hostile: false` for lessons, practice, demos, and authored NPC boards; the
combat owner also bypasses profile conversion for those encounters.
No-clear boards, objective tags, disabled board magic, and bosses are
protected defensively by the planner too.

Pass `reservedCells` from queued frozen packets to keep later plans from
choosing the same point while Ice delays the earlier packet. Reservations
affect **selection only**; they are not stones, do not change the landing
simulation, and do not invalidate the already frozen packet at delivery.
If the only useful point is reserved, the creature uses its authored attack.

Call at initial selection and **after** executing each current enemy move,
so the next telegraph uses the changed board. Combat construction currently
precedes the first piece spawn; Slime therefore opens with its authored
attack until an actual landing exists. Goblin waits for a real well rather
than scattering rubble on an empty board.

`boardMagicEnemy(enemy, width, height)` retains its call signature. Its
obstruction entry is now a **template with empty cells**, not a deliverable
fixed-coordinate packet. Use the planner's concrete `move`, not the template,
for the initial telegraph and actual action. Older tests that manually pull
an obstruction from `enemy.moves` must use a planned move instead.

## Frozen delivery and safety

Call `frozenObstructionStillLegal(move, board)` before enqueueing a delayed
packet and again at delivery. It validates the exact footprint without
finding replacements. If the player occupies or changes the marked target,
the entire packet fizzles; it must not silently retarget or become an
untelegraphed attack. Initial planning with no useful legal target instead
selects an existing authored attack.

The validator rejects occupied/tagged/current-piece/sealed/spawn-area cells,
out-of-range strength or coordinates, duplicates, already topped-out boards,
and packets that fill a whole row. It also simulates the current piece's
landing and rejects newly gifted clears or top-out. It never mutates the
board. Existing target/protected/ridge objectives suppress obstruction plans
entirely, even if the proposed cell is elsewhere.

This is selection-time geometry, not a promise that the player's future
choices cannot counter or benefit from a changed board. Actual delivery still
uses `ArcaneInterference.place`; player-owned Arcane effects intentionally
can alter the packet according to the existing counterplay rules.

## Optional legacy usefulness filtering

`legacyMoveUseful` recognizes obvious no-ops: healing at full HP, draining
empty hero mana, refreshing an equal/longer status, or petrifying a board
without crystals. `filterLegacy` is opt-in for unprofiled ordinary enemies.
Boss policy is never filtered, even when requested, so this change does not
silently retune campaign bosses. `heroMana` is the total across pools.

Integration still needs focused combat tests for initial planning,
post-action replanning, telegraphed target stability, delayed receipts,
lesson/practice isolation, and intent-label invalidation if a test or authored
script manually replaces `nextMove`. This module owns neither the combat
hook nor the UI; the coordinating implementation handles those files.

## Leaf validation

The 27 focused tests pass, including a 200-case deterministic target/safety
check, whole-packet validation, fixed material, objective guards, exact
target freezing, queued reservations, and existing owner/Nature counterplay.
Owned-file lint, formatting, and whitespace checks pass. These establish
planning behavior; they are not encounter win-rate or pacing evidence.
