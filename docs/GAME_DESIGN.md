# Game design

## Core idea

Every interaction in the realm is played on the same falling-block board.
The board is the "battle screen" and each kind of character changes what
your line clears mean.

## Elements

Every piece shape carries an element, shown by its crystal colour. The
board is how you charge your magic: what you clear decides what you can
cast and what happens with every line.

| Piece | Colour | Element   | Line effect (3+ crystals of it in the line)                           |
| ----- | ------ | --------- | --------------------------------------------------------------------- |
| Z     | Red    | Fire      | Burn: extra damage equal to its crystals                              |
| J     | Blue   | Water     | Chill: the enemy acts a piece later (at most 2 past normal)           |
| O     | Gold   | Lightning | Chain: extra damage × lines cleared together                          |
| S     | Green  | Nature    | Regrowth: heal HP equal to its crystals                               |
| L     | Orange | Earth     | Ward: a shield (max 25) that absorbs attacks                          |
| T     | Violet | Arcane    | Surge: ⌈crystals ÷ 3⌉ mana to every element                           |
| I     | Cyan   | Wind      | Tailwind: pieces fall slower for ⌈crystals ÷ 2⌉ pieces; cancels haste |

- **Mana**: seven separate pools. Every cleared crystal adds 1 mana to its
  element (stone adds nothing), in any kind of battle. Each pool holds up to
  the hero's mana capacity.
- **Line effects** (combat only): each cleared line triggers the effect of
  its strongest element. Purer lines are stronger. A four-line clear can
  fire four different effects.
- **Weakness and resistance**: each enemy has elements it is weak to and
  elements it resists. Every cleared crystal of a weak element adds +2
  strike damage (−1 if resisted). Damaging line effects and spells deal
  ×1.5 against weaknesses and ×0.5 against resistances.
- **Piece odds**: every bag holds 2 copies of each shape. Areas tilt this
  (meadows +1 nature; Moon Caves +1 earth, +1 arcane, −1 lightning; the
  Depths +2 arcane). A charm adds +1 to its element and attunement adds
  +1, so you can tilt the odds back. No shape drops below 1 copy.

## Hero classes and attunement

Chosen when starting a new game. Differences are deliberately small so any
class can finish the game. Mana is the capacity of each of the seven pools.

| Class  | HP  | Mana | ATK | DEF | Gil | Growth per level (HP/Mana/ATK/DEF) |
| ------ | --- | ---- | --- | --- | --- | ---------------------------------- |
| Ranger | 40  | 12   | 5   | 1   | 25  | 8 / 2 / 2 / 1                      |
| Knight | 48  | 10   | 5   | 3   | 20  | 10 / 1 / 2 / 2                     |
| Mage   | 34  | 16   | 4   | 1   | 25  | 6 / 3 / 2 / 1                      |
| Rogue  | 36  | 12   | 6   | 1   | 60  | 7 / 2 / 3 / 1                      |

At **level 3** a hero attunes to one element, for good (it can be put off
and chosen later from the menu). The hero takes its title, e.g. a Knight
attuned to earth becomes a **Stone Knight**. Attunement:

- makes that element's line effects 50% stronger,
- makes its share of spell costs 2 less (never below 1),
- adds 1 copy of its piece to every bag.

Titles: Ember (fire), Tide (water), Storm (lightning), Grove (nature),
Stone (earth), Arcane (arcane), Gale (wind).

## Combat (monsters)

- Clearing lines strikes the enemy: 8 / 20 / 35 / 55 base damage for
  1 / 2 / 3 / 4 lines, plus the hero's attack (base, level and weapon),
  plus the elemental crystal bonus above. Then each line's effect fires.
- The enemy acts after a set number of your **actions** (placing a piece,
  casting a spell or using an item). Enemy magic:

  | Move   | Effect                                                                |
  | ------ | --------------------------------------------------------------------- |
  | attack | Damage = power + enemy attack − your defence; a ward absorbs it first |
  | curse  | Pushes stone rows (one gap each) up the board                         |
  | haste  | Doubles gravity for your next N pieces; ends a tailwind               |
  | heal   | Restores the enemy's HP                                               |
  | drain  | Burns mana from your fullest pool                                     |

- If the board overflows you lose 25% of max HP and the board is cleared.
- A Phoenix Feather revives you once at half HP, automatically.
- Losing sends you back to the last inn you rested at, with half your gil.
  Normal monsters reappear when you leave the map; bosses stay beaten.

### Hero magic

Damage spells deal power + 2×level, scaled by the enemy's weakness or
resistance to the spell's element.

| Spell        | Cost                      | Effect                           | How to learn           |
| ------------ | ------------------------- | -------------------------------- | ---------------------- |
| Fire         | 6 fire                    | 14 damage                        | Start                  |
| Cure         | 6 nature                  | Heal 20 HP                       | Start                  |
| Quake        | 6 earth                   | Remove the bottom two rows       | Elder Rowan (offering) |
| Gale         | 6 wind                    | 10 damage, tailwind for 5 pieces | Tome, Brightwater shop |
| Thunder      | 8 lightning               | 24 damage                        | Sage Orrin (puzzle)    |
| Blizzard     | 8 water                   | 18 damage, delays the enemy 3    | Sealed chest (puzzle)  |
| Shadow Drain | 8 arcane                  | 18 damage, heal half of it       | Tome, Brightwater shop |
| Meteor       | 6 fire, 6 earth, 6 arcane | 58 damage                        | Not placed yet         |

### Charms

Worn in the accessory slot; each adds 1 copy of its element's piece to
every bag. Ember (fire) sells in Mossvale; Ember, Tide (water), Storm
(lightning) and Wind sell at the Brightwater smithy. The Storm Charm undoes
the Moon Caves' lightning penalty, which matters against the
lightning-weak Shade Imp and Moon Wyrm.

## NPC interactions

The open question was how talking to NPCs becomes a battle. Four models
are built, each used where it fits best:

### Offering (your idea)

Presenting an item works like casting a spell: a spell costs mana, an
offering costs **points**. The NPC names an item and a price ("score 600
within 18 pieces"). You must hold the item to try, and it is only taken
if you succeed, so failing costs time, not loot. This turns monster drops
into quest currency (Spore Cap → Elder Rowan teaches Quake; Goblin Charm →
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
- **Gift instead of score**: pay the point cost with elemental mana instead of playing.

## Enemy roster

Art is mixed by area: cute Fantasy Dreamland creatures in the open world,
and bigger, scarier Pixel Battlers monsters underground.

| Area       | Enemy        | Element | Weak to       | Resists       | Magic                       | Drops           |
| ---------- | ------------ | ------- | ------------- | ------------- | --------------------------- | --------------- |
| Overworld  | Green Slime  | Nature  | Fire          | Water         | attack                      | Slime Gel       |
| Overworld  | Spore Shroom | Nature  | Fire, wind    | Nature        | attack, haste (Spore Cloud) | Spore Cap       |
| Overworld  | Goblin Scout | Earth   | Water         | Earth         | attack, curse (Rock Toss)   | Goblin Charm    |
| Moon Caves | Moon Imp     | Arcane  | Wind          | Arcane        | attack, drain               | —               |
| Moon Caves | Shade Imp    | Arcane  | Lightning     | Arcane, water | attack, heal, curse         | Moon Shard      |
| Moon Caves | Cave Brute   | Earth   | Water, nature | Earth, fire   | attack, curse (2 rows)      | Ether           |
| Depths     | Moon Wyrm    | Arcane  | Lightning     | Arcane, fire  | everything                  | Phoenix Feather |

## Progression

Mossvale (learn the challenge types) → overworld monsters (drops, levels)
→ Brightwater (shops, Thunder, earn the Cave Pass by barter) → Moon Caves
(Blizzard tome, hermit) → Moon Wyrm boss. Attunement opens at level 3,
usually around the first trip to Brightwater. The Sunken Ruins are sealed as
the hook for the next region.
