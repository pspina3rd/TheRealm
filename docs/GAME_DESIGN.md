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

> Attunement is being replaced by alignment, skill points and mentors.
> See [Planned: progression redesign](#planned-progression-redesign).

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

## Planned: progression redesign

**Status: for review. Nothing in this section is built yet.** All numbers
are starting values to tune in play.

### Goals

- Every level-up is a choice: the hero's stats, or their spells.
- Spells grow slowly and through people: points make a spell _ready_ for its
  next level, and a mentor teaches it.
- What the hero knows changes how the world treats them (alignment).
- Most of it is shown, not told: icons, colours, silhouettes.

### Element chart

Each element is strong against two, weak to two and neutral to two. A
creature also resists its own element.

| Element   | Strong vs         | Weak to           | Neutral (related) |
| --------- | ----------------- | ----------------- | ----------------- |
| Fire      | Nature, Arcane    | Water, Wind       | Earth, Lightning  |
| Water     | Fire, Earth       | Nature, Lightning | Wind, Arcane      |
| Earth     | Lightning, Wind   | Water, Nature     | Fire, Arcane      |
| Nature    | Earth, Water      | Fire, Arcane      | Lightning, Wind   |
| Lightning | Water, Wind       | Earth, Arcane     | Fire, Nature      |
| Wind      | Fire, Arcane      | Earth, Lightning  | Water, Nature     |
| Arcane    | Nature, Lightning | Fire, Wind        | Water, Earth      |

- **Related** elements are the neutral pair. **Opposed** elements are the
  two that beat it.
- Enemy weaknesses and resistances come from this chart instead of being set
  by hand. A boss may add one extra resistance.

### Alignment

Each element has an alignment score: **the sum of the levels of every spell
the hero knows in that element**. A combo spell counts its level toward both
of its elements. Alignment only goes up; you grow by learning.

- **Classes keep their identity** by starting aligned: their first spell is
  a level 1 spell of their element.

  | Class  | Element   | Starting spell |
  | ------ | --------- | -------------- |
  | Knight | Earth     | Quake 1        |
  | Mage   | Arcane    | Shadow 1       |
  | Ranger | Wind      | Gale 1         |
  | Rogue  | Lightning | Thunder 1      |

- **Effects** (these replace attunement):
  - Line effects of an element grow by 10% per alignment point (up to ×2).
  - Every 4 alignment points in an element add 1 copy of its piece to each
    bag (still at most +2 from alignment).
  - The hero's title comes from their highest alignment, e.g. a Knight
    highest in earth is a **Stone Knight**. Ties keep the older title.
- **Shown as** a seven-point star in the menu, one spike per element.

### Stats

The hero has eight stats. Each level gives a small automatic gain from the
class (HP only); everything else comes from skill points.

| Stat     | Icon       | Per point                                                 |
| -------- | ---------- | --------------------------------------------------------- |
| Vitality | Heart      | +6 max HP                                                 |
| Strength | Sword      | +1 damage on every line-clear strike                      |
| Guard    | Shield     | −1 damage from every enemy hit                            |
| Focus    | Potion     | +1 capacity in every mana pool                            |
| Agility  | Wind swirl | Pieces fall 4% slower and wait longer to lock             |
| Insight  | Eye        | Rank 3: see 2 next pieces. 6: see 3. 9: enemy's next move |
| Charm    | Gift       | +1 NPC attitude; 3% better prices                         |
| Luck     | Star       | +2% item drops; big clears can crit                       |

Classes start with different stat spreads (Knight: Vitality and Guard;
Mage: Focus and Insight; Ranger: Agility and Luck; Rogue: Strength and
Charm), so the existing "slightly different base stats" stays.

### Skill points

- **2 skill points per hero level.**
- A **stat** rank costs **1 point**.
- A **spell enhancement** costs more as the spell rises (below).
- Points can be saved. Spending is permanent (no respec, for now).

### Spells

Spells are grouped into **categories**, one per element. Selecting a
category in battle opens its menu: the primary spell, its supports and any
combos.

- **Primary spell**: levels 1 → 2 → 3 → 4, like Fire → Fira → Firaga.
- **Support spells**: their own spells within the category (Chill, Ward,
  Regen, Haste…). Not every support is levelled; some have a single level.
- **Combo spells** (variations): once you know X, a mentor of another
  element can teach Y, which costs X's mana plus the mentor's element.
  Example: know Fire, learn **Magma** from an earth mentor
  (cost 3 fire + 3 earth).

#### Enhancements

Every levelled spell has three attributes:

| Attribute  | Per enhancement                                                    |
| ---------- | ------------------------------------------------------------------ |
| Power      | +20% of the spell's base damage, heal or shield                    |
| Efficiency | −1 mana from the spell's cost (never below 1 per element)          |
| Effect     | Stronger side effect: longer chill, bigger ward, more rows cleared |

Enhancing a spell's attributes makes it **ready** for its next level. A
mentor lesson then raises it. Bonuses from enhancements stay after the
level-up.

| Step        | Enhancements needed        | Points each | Points total | Hero levels (2 pts/level) |
| ----------- | -------------------------- | ----------- | ------------ | ------------------------- |
| Level 1 → 2 | 3 (one per attribute)      | 2           | 6            | 3                         |
| Level 2 → 3 | 4 (each attribute + 1 any) | 3           | 12           | 6                         |
| Level 3 → 4 | 5 (each attribute + 2 any) | 4           | 20           | 10                        |

Spending any points on stats delays this, so in practice one spell reaches
level 3 around hero level 12–15.

### Mentors

Mentors are named characters, each of one element. They teach new spells,
spell levels and combos through **team-up battles**.

- **Where**: at their home (a summoned trial foe of their element) and out in
  the world (they join a real fight you walk into).
- **Requirement**: the spell must be _ready_ (all its enhancements bought) or,
  for a new or hidden spell, its unlock must be met. Otherwise the mentor
  talks but doesn't teach.
- **Their help**: during the fight the mentor tosses the best-fitting piece
  for your board, in their element's colour, instead of your next piece.
- **How much help**: less as you grow, and lessons get harder.
  - Lesson difficulty = the spell level being taught (combos count as one
    more).
  - Chance per piece = 40% − 5% × (your alignment in the mentor's element −
    lesson difficulty), clamped to 10–50%.
  - Relation to your highest alignment: same element ×1, related ×0.8,
    opposed ×0.6.
- **Win**: learn the spell or level.
- **Lose**: the lesson stays open. The hero can fight it again straight away
  or walk away for now, but **no spell in that category can be enhanced**
  until the lesson is won. The category shows a lock icon, and the mentor
  waits at home to be challenged again.

### Hidden spells

Some spells don't appear on any list. Their slot shows as a dark silhouette
in the category menu until unlocked; then a mentor can teach them.

| Unlock    | Example                                                                     |
| --------- | --------------------------------------------------------------------------- |
| Stat      | Insight 5 → **Foresight** (see the enemy's next move early)                 |
| Alignment | Fire 4 and Earth 4 → **Magma**                                              |
| Pattern   | Clear 4 pure-fire lines at once → a fire mentor "noticed" and seeks you out |
| Quest     | Restore the Brightwater shrine → **Purify**                                 |
| Item      | Bring the Moon Shard to the arcane mentor → **Eclipse**                     |

### NPC alignment and attitude

Every non-mentor NPC has an element. Their **attitude** toward the hero is:

> your alignment in their element + ½ × your related alignments
> − ½ × your opposed alignments + Charm

| Attitude | Face icon | Prices | Rewards       | Will deal?             | Dialogue        |
| -------- | --------- | ------ | ------------- | ---------------------- | --------------- |
| Hostile  | Scowl     | —      | —             | Refuses                | Curt            |
| Wary     | Frown     | +20%   | Base          | Harder challenge       | Suspicious      |
| Neutral  | Flat      | ±0     | Base          | Yes                    | Plain           |
| Friendly | Smile     | −10%   | +1 extra item | Yes                    | Warm            |
| Devoted  | Grin      | −20%   | Best reward   | Yes, plus secret offer | Confides, hints |

The face shows before you talk, so the hero can see who likes them.

### NPC dialogue rules

Every NPC encounter follows three rules:

1. **A real need.** The NPC wants something for a reason in their life.
2. **The challenge is the task.** The battle is doing that thing, not a
   test of the hero.
3. **The reward follows.** What they give comes from what you did for them.

Example: Elder Rowan's spore field is choking the village well. Clearing it
(the battle) cleans the well, and she teaches Quake, the spell she used to
break the ground for that well.

### What this changes

- **Content**: one spell to level 3 takes 12–15 levels, so the realm needs
  well over the ~7 levels it has now. New regions come after the Moon
  Caves, starting with the Sunken Ruins.
- **Saves (v3)**: attunement is dropped; known spells become level 1;
  unspent points are granted as 2 × (level − 1); stats are recomputed from
  the class.
- **Removed**: attunement, the level 3 choice, spell tomes from shops (they
  become quest or mentor rewards).

### Build order

1. Element chart and alignment (replaces attunement).
2. Stats, skill points and the level-up screen.
3. Spell levels, enhancements and the category menu.
4. Mentors, team-up battles and combo spells.
5. Hidden spells and their unlocks.
6. NPC attitudes and the dialogue rewrite.

Each stage ships with tests and keeps the game playable.
