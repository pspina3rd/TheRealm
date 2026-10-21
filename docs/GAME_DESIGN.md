# Game design

## Core idea

Every interaction in the realm is played on the same falling-block board.
The board is the "battle screen" and each kind of character changes what
your line clears mean.

## Combat (monsters)

- Clearing lines strikes the enemy: 8 / 20 / 35 / 55 base damage for
  1 / 2 / 3 / 4 lines, plus the hero's attack (base, level and weapon).
- Each enemy has a **weakness colour**. Every cleared crystal of that colour
  adds +2 damage, so you can plan where to place pieces.
- Each line cleared restores 1 MP.
- The enemy acts after a set number of your **actions** (placing a piece,
  casting a spell or using an item). Enemy magic:

  | Move   | Effect                                        |
  | ------ | --------------------------------------------- |
  | attack | Damage = power + enemy attack − your defence  |
  | curse  | Pushes stone rows (one gap each) up the board |
  | haste  | Doubles gravity for your next N pieces        |
  | heal   | Restores the enemy's HP                       |
  | drain  | Burns your MP                                 |

- If the board overflows you lose 25% of max HP and the board is cleared.
- A Phoenix Feather revives you once at half HP, automatically.
- Losing sends you back to the last inn you rested at, with half your gil.
  Normal monsters reappear when you leave the map; bosses stay beaten.

### Hero magic

| Spell    | MP  | Effect                                  | How to learn           |
| -------- | --- | --------------------------------------- | ---------------------- |
| Fire     | 3   | 12 + 2×level damage                     | Start                  |
| Cure     | 4   | Heal 18 HP                              | Start                  |
| Quake    | 5   | Remove the bottom two rows              | Elder Rowan (offering) |
| Thunder  | 5   | 23 + 2×level damage                     | Sage Orrin (puzzle)    |
| Blizzard | 6   | 18 + 2×level damage, delays the enemy 3 | Sealed chest (puzzle)  |
| Meteor   | 10  | 58 + 2×level damage                     | Not placed yet         |

## NPC interactions

The open question was how talking to NPCs becomes a battle. Four models
are built, each used where it fits best:

### Offering (your idea)

Presenting an item works like casting a spell: a spell costs MP, an
offering costs **points**. The NPC names an item and a price ("score 600
within 18 pieces"). You must hold the item to try, and it is only taken
if you succeed, so failing costs time, not loot. This turns monster drops
into quest currency (Wolf Pelt → Elder Rowan teaches Quake; Goblin Charm →
the collector pays gil; Moon Shard → the hermit gives potions).

### Barter

The NPC wants crystals of specific colours ("8 green"). Only crystals in
cleared lines count. It rewards planning which pieces go where, and it
uses the board's colours, which combat mostly ignores.

### Haggle

Used by every shop and the inn. The price starts at 100%. Each line you
clear pushes it down (−5% / −12% / −20% / −30% for 1–4 lines); the merchant
pushes it up 3% on a timer. After a fixed number of pieces the deal is
struck at the current price (50%–150%). Overflowing ends the haggle with no
deal. Fast, clean play is literally cheaper.

### Puzzle

A preset board and a fixed sequence of pieces. Used by sages, children's
games and sealed chests. Every puzzle has a recorded solution that the
tests replay, so none can be accidentally unsolvable.

### Other options considered (not built yet)

- **Reputation**: repeated wins with an NPC unlock better rewards.
- **Duel**: a rival on a second board sends stone rows when they clear.
- **Escort / timed**: survive N seconds while an NPC's needs tick up.
- **Gift instead of score**: pay the point cost with MP instead of playing.

## Progression

Mossvale (learn the challenge types) → overworld monsters (drops, levels)
→ Brightwater (shops, Thunder, earn the Cave Pass by barter) → Moon Caves
(Blizzard tome, hermit) → Moon Wyrm boss. The Sunken Ruins are sealed as
the hook for the next region.
