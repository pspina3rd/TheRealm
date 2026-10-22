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
- **Weakness and resistance**: each enemy is weak to the elements that beat
  its own, and resists its own element and the two it beats (see the chart
  below; a boss may add one extra resistance). Every cleared crystal of a weak element adds +2
  strike damage (−1 if resisted). Damaging line effects and spells deal
  ×1.5 against weaknesses and ×0.5 against resistances.
- **Piece odds**: every bag holds 2 copies of each shape. Areas tilt this
  (meadows +1 nature; Moon Caves +1 earth, +1 arcane, −1 lightning; the
  Depths +2 arcane). A charm adds +1 to its element and alignment adds up
  to +2, so you can tilt the odds back. No shape drops below 1 copy.

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

## Hero classes and alignment

Chosen when starting a new game. Differences are deliberately small so any
class can finish the game. Mana is the capacity of each of the seven pools.
Every hero also starts with Cure. Starting numbers include the class's
starting stats (below); levels only add HP.

| Class  | Element   | First spell  | HP  | Mana | ATK | DEF | Gil | Starting stats      | HP per level |
| ------ | --------- | ------------ | --- | ---- | --- | --- | --- | ------------------- | ------------ |
| Ranger | Wind      | Gale         | 40  | 12   | 5   | 1   | 25  | Agility 2, Luck 2   | 8            |
| Knight | Earth     | Quake        | 48  | 10   | 5   | 3   | 20  | Vitality 2, Guard 2 | 10           |
| Mage   | Arcane    | Shadow Drain | 34  | 16   | 4   | 1   | 25  | Focus 2, Insight 2  | 6            |
| Rogue  | Lightning | Thunder      | 36  | 12   | 6   | 1   | 60  | Strength 2, Charm 2 | 7            |

### Alignment

Each element has an alignment score: **the sum of the levels of every spell
the hero knows in that element**. A combo spell counts its level toward both
of its elements. Alignment only goes up; you grow by learning.

- **Classes keep their identity** by starting aligned: their first spell is
  a spell of their element (table above).
- **Effects**:
  - Line effects of an element grow by 10% per alignment point (up to ×2).
  - Every 4 alignment points in an element add 1 copy of its piece to each
    bag (still at most +2 from alignment).
  - The hero's title comes from their highest alignment, e.g. a Knight
    highest in earth is a **Stone Knight**. Ties keep the older title.
- **Shown as** a seven-point star in the menu, one spike per element. A
  new title is announced with its element's icon.
- A combo counts toward each of its elements (Magma toward earth and fire;
  Meteor toward fire, earth and arcane).

## Stats and skill points

The hero has eight stats. Each is a rank from 0 to its max, bought with
skill points.

| Stat     | Icon        | Per rank                                                    | Max |
| -------- | ----------- | ----------------------------------------------------------- | --- |
| Vitality | Heart       | +6 max HP                                                   | 10  |
| Strength | Sword       | +1 damage on every line-clear strike                        | 10  |
| Guard    | Shield      | −1 damage from every enemy hit                              | 10  |
| Focus    | Potion      | +1 capacity in every mana pool                              | 10  |
| Agility  | Winged boot | Pieces fall 4% slower (40% at max)                          | 10  |
| Insight  | Eye         | Rank 3: see 2 next pieces. 6: see 3. 9: enemy's next move   | 9   |
| Charm    | Gift        | 3% off shop prices (after haggling); NPC attitude (planned) | 10  |
| Luck     | Clover      | +2% to every item drop; 3% crit chance on 3+ line clears    | 10  |

- **Skill points**: 2 per hero level. A stat rank costs 1 point. The same
  points buy [spell enhancements](#enhancements). Points can be saved;
  spending is permanent (no respec, for now).
- **Level-ups** give the points plus the class's HP growth, and restore HP
  and mana. Mana, attack and defence only grow through stats and gear.
- **Crit**: a critical strike doubles the clear's strike damage (not its
  line effects) and shows a clover and ×2 over the enemy.
- **Skill screen**: opens after a battle that levelled the hero up (before
  any shop) and from the menu's Skills button. Each stat shows its icon,
  rank pips (Insight's unlock ranks are ringed) and what its ranks add up
  to; − and + stage choices, Confirm spends them. Below the stats, the
  Spells section does the same for enhancements (see
  [Enhancements](#enhancements)); stats and spells share one pool and are
  checked together. Focus never lands on Confirm. A badge on the menu
  button counts unspent points.

## Combat (monsters)

- Clearing lines strikes the enemy: 8 / 20 / 35 / 55 base damage for
  1 / 2 / 3 / 4 lines, plus the hero's attack (class base, Strength and
  weapon), plus the elemental crystal bonus above; Luck can crit it. Then
  each line's effect fires.
- The enemy acts after a set number of your **actions** (placing a piece,
  casting a spell or using an item). It picks its move a turn ahead, so
  Insight 9 can show it beside the turn pips. Enemy magic:

  | Move   | Effect                                                                                         |
  | ------ | ---------------------------------------------------------------------------------------------- |
  | attack | Damage = power + enemy attack − your defence (base, Guard and armour); a ward absorbs it first |
  | curse  | Pushes stone rows (one gap each) up the board                                                  |
  | haste  | Doubles gravity for your next N pieces; ends a tailwind                                        |
  | heal   | Restores the enemy's HP                                                                        |
  | drain  | Burns mana from your fullest pool                                                              |

- If the board overflows you lose 25% of max HP and the board is cleared.
- A Phoenix Feather revives you once at half HP, automatically.
- Losing sends you back to the last inn you rested at, with half your gil.
  Normal monsters reappear when you leave the map; bosses stay beaten.

### Hero magic

Damage spells deal power + 2×level, scaled by the enemy's weakness or
resistance to the spell's element (its category). Spells that clear rows
(the Quake line) get no level bonus, so their damage stays small.

Spells sit in **categories**, one per element. Each element has a
**primary** spell with four levels, each with its own name; power and
healing grow about ×1.6 a level, rows and pieces by about 1 every level or
two, and the cost +2 a level.
A category can also hold a **support** and **combos**, spells of several
elements that cost each one's mana. Every spell in a category can be
taught by that element's [mentor](#mentors).

| Category  | Level 1               | Level 2               | Level 3               | Level 4                 | Effect                             | How to learn                         |
| --------- | --------------------- | --------------------- | --------------------- | ----------------------- | ---------------------------------- | ------------------------------------ |
| Fire      | Fire · 6 · 14         | Blaze · 8 · 22        | Inferno · 10 · 36     | Cataclysm · 12 · 57     | Damage                             | Tome, Mossvale stall                 |
| Water     | Blizzard · 8 · 18/3   | Hailstorm · 10 · 29/3 | Glacier · 12 · 46/4   | Deep Winter · 14 · 74/4 | Damage / delays the enemy N pieces | Sealed chest (puzzle)                |
| Lightning | Thunder · 8 · 24      | Thunderclap · 10 · 38 | Stormcall · 12 · 61   | Skyfall · 14 · 98       | Damage                             | Rogue start; Sage Orrin (puzzle)     |
| Nature    | Cure · 6 · 20         | Mend · 8 · 32         | Restore · 10 · 51     | Rebirth · 12 · 82       | Heal HP                            | Start (every class)                  |
| Earth     | Quake · 6 · 6/2       | Rockslide · 8 · 10/3  | Upheaval · 10 · 16/3  | Worldsplit · 12 · 26/4  | Damage / removes the bottom N rows | Knight start; Elder Rowan (offering) |
| Arcane    | Shadow Drain · 8 · 18 | Soul Siphon · 10 · 29 | Night Feast · 12 · 46 | Void Hunger · 14 · 74   | Damage, heals half of it           | Mage start; tome, Brightwater shop   |
| Wind      | Gale · 6 · 10/5       | Squall · 8 · 16/6     | Cyclone · 10 · 26/7   | Hurricane · 12 · 41/8   | Damage / tailwind for N pieces     | Ranger start; tome, Brightwater shop |

Each cell is name · mana of the category's element · power (or healing),
then rows or pieces after the slash.

**Supports** have a single level. Each needs its category's primary.

| Support   | Category  | Cost        | Effect                                                               |
| --------- | --------- | ----------- | -------------------------------------------------------------------- |
| Kindle    | Fire      | 5 fire      | Burns the enemy for 4 (fire, so ×1.5 if weak) after each of 5 pieces |
| Mist      | Water     | 6 water     | The enemy's next move fizzles ("Miss")                               |
| Static    | Lightning | 5 lightning | Each of the next 3 line clears also strikes for 6 lightning          |
| Regen     | Nature    | 6 nature    | Heals 4 HP after each of 5 pieces                                    |
| Stoneskin | Earth     | 5 earth     | +15 ward (up to the usual 25)                                        |
| Mana Tap  | Arcane    | 4 arcane    | +2 mana to every other pool                                          |
| Gust      | Wind      | 3 wind      | Swaps the falling piece for the next one                             |

Running supports show on the stage with a count: Kindle and Mist under
the enemy's turn pips, Regen and Static beside the hero.

**Combos** have a single level and build both (or all) of their elements'
alignment. Each needs another element's primary.

| Combo       | Category  | Needs                  | Cost                      | Effect                   |
| ----------- | --------- | ---------------------- | ------------------------- | ------------------------ |
| Wildfire    | Fire      | Gale                   | 4 fire, 4 wind            | 28 damage, tailwind 4    |
| Spring Rain | Water     | Cure                   | 4 water, 4 nature         | Heals 36                 |
| Storm Surge | Lightning | Blizzard               | 4 lightning, 4 water      | 28 damage, enemy waits 2 |
| Bramble     | Nature    | Quake                  | 4 nature, 4 earth         | Clears 2 rows, 12 damage |
| Magma       | Earth     | Fire                   | 4 earth, 4 fire           | 34 damage                |
| Void Bolt   | Arcane    | Thunder                | 4 arcane, 4 lightning     | 28 damage, heals half    |
| Moonwind    | Wind      | Shadow Drain           | 4 wind, 4 arcane          | 32 damage                |
| Meteor      | Fire      | Quake and Shadow Drain | 6 fire, 6 earth, 6 arcane | 58 damage                |

A combo strikes as its category's element (Magma is earth).

- **Battle menu**: seven fixed slots, one per element in chart order
  (fire, water, lightning, nature, earth, arcane, wind), so keys 1–7
  always mean the same element. A slot shows its element, its best
  spell's name, level pips, a kind icon (burst damage, heart heal, fang
  drain, hourglass freeze, boot tailwind, stone piece clear rows) and the
  cost, dimmed when nothing in it can be cast. An element with no known
  spell is a dark silhouette. A slot with several spells (a +N badge)
  opens its menu: the primary at its level, then supports and combos;
  the panel keeps its height. A slot with one spell casts it straight
  away. Then 1–n picks a spell; Escape (or the ◀ button) goes back.
  Casting closes the menu and counts as an action. Tooltips give a short
  summary, e.g. "Blaze · Lv 2 · 22 damage".
- **Spellbook** (menu): every known spell at its level, with level pips,
  kind icon, cost, a scroll and a glowing frame when ready, and a lock when its
  category is locked.

### Enhancements

Every spell with a level still to gain has three attributes, bought with
skill points on the skill screen:

| Attribute  | Icon  | Per enhancement                                            |
| ---------- | ----- | ---------------------------------------------------------- |
| Power      | Burst | +20% of the level's base damage or healing (rounded)       |
| Efficiency | Drop  | −1 mana from each element of the cost (never below 1 each) |
| Effect     | Wand  | A stronger side effect, by kind of spell (below)           |

| Spell kind             | Effect per enhancement                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Damage (Fire, Thunder) | Also fires the element's line effect at 3 per Effect (burn, chain) |
| Heal (Cure)            | Also fires regrowth at 3 per Effect                                |
| Freeze (Blizzard)      | The enemy waits 1 more piece                                       |
| Tailwind (Gale)        | 1 more slow piece                                                  |
| Drain (Shadow Drain)   | Heals 10% more of the damage (50% → at most 100%)                  |
| Clear rows (Quake)     | +1 row at 1, 3 and 5 Effect                                        |

Enhancing a spell makes it **ready** for its next level:

| Step        | Enhancements needed        | Points each | Points total | Hero levels (2 pts/level) |
| ----------- | -------------------------- | ----------- | ------------ | ------------------------- |
| Level 1 → 2 | 3 (one per attribute)      | 2           | 6            | 3                         |
| Level 2 → 3 | 4 (each attribute + 1 any) | 3           | 12           | 6                         |
| Level 3 → 4 | 5 (each attribute + 2 any) | 4           | 20           | 10                        |

- Every attribute needs its one before extras go anywhere, and nothing can
  be added past a complete step. A level 4 spell (or a single-level one,
  like Meteor) can't be enhanced.
- A **ready** spell waits for a [mentor](#mentors) lesson to raise it
  (`raiseSpellLevel` in `src/game/hero.ts`). Bonuses stay after the
  level-up and the next step starts empty.
- **Locks**: a category listed in the hero's `lockedCategories` can't be
  enhanced. A lost mentor lesson sets it (see [Mentors](#mentors)); the
  category shows a lock, the mentor's face and the place they are now.
- **Skill screen**: each spell shows its level pips, the points one
  enhancement costs, step pips (bought, staged in green), and per
  attribute its icon, current value (Efficiency shows the mana taken off,
  e.g. −1, then the cost left), pips (the required one ringed) and −/+. When an attribute can take no more, focus moves on to the next
  attribute's +, so Enter can walk a step from the keyboard. A ready
  spell glows and shows a scroll.

## Mentors

Mentors are named characters, one per element, who teach that element's
spells through **lessons**: team-up battles where they fight beside the
hero. Each has a reason to teach. They use the townsfolk sprites, with a
glow of their element's colour at their feet; a **scroll** floats over a
mentor who has a lesson for you. Talking to them lists their lessons as
buttons (spell, level pips, kind, cost, difficulty as swords).

| Mentor  | Element   | Why they teach                                 | Home (trial foe)                | Route after home                                 | Moves every |
| ------- | --------- | ---------------------------------------------- | ------------------------------- | ------------------------------------------------ | ----------- |
| Torva   | Fire      | Her hands shake too much for the forge now     | Mossvale (Ember Wisp)           | Realm by the village · Brightwater · Moon Caves¹ | 4 wins      |
| Maren   | Water     | The lake is clouding; she can't watch it alone | Realm, east lakeshore (Tide)    | Brightwater fountain · Mossvale                  | 5 wins      |
| Rook    | Lightning | Storms roll off the peaks faster every year    | Realm, north-east (Spark)       | Brightwater · Moon Caves¹ · Depths²              | 3 wins      |
| Hazel   | Nature    | Spores are choking her meadows                 | Realm, west meadow (Moss)       | Mossvale · Realm, south                          | 6 wins      |
| Dorn    | Earth     | The caves took his crew                        | Realm, at the cave seal (Stone) | Moon Caves¹ · Depths¹ · Brightwater              | 4 wins      |
| Selene  | Arcane    | Something below drinks the moonlight           | Brightwater (Moon Wisp)         | Realm, north · Depths¹                           | 5 wins      |
| Kestrel | Wind      | Her letters must reach every village           | Realm, south road (Gale)        | Mossvale · Brightwater · Realm, east road        | 3 wins      |

¹ once the hero holds the Cave Pass. ² once the Moon Wyrm is beaten.

- **Travel**: a mentor's place is a pure function of the story flags and
  the number of monster battles won (saved): the route's open stops, home
  first, and one stop on every _N_ wins, wrapping round. So a mentor is in
  exactly one place, and story progress opens new stops.
- **What they teach** (only their element): the next level of a _ready_
  spell; the primary, if the hero lacks it; the support, once the primary
  is known; each combo, once its other spell is known.
- **Difficulty**: the level being taught (a new spell is 1); a combo's is
  its number of elements (2; Meteor 3).
- **The foe**: at home, the mentor's trial **wisp** of their element;
  away, the toughest non-boss monster of the area (of the mentor's element
  if there is one), or the wisp in a town. Per difficulty above 1 the foe
  gains 50% HP, +2 attack and a level (faster pieces). Lessons give no XP,
  gil or drops.
- **The mentor's help**: on every new piece, with chance

  > p = clamp(40% − 5% × (alignment in the mentor's element − difficulty), 10%, 50%) × relation

  where relation compares the mentor's element to the hero's title
  element: same ×1, related ×0.8, the mentor's beats the hero's ×0.6, the
  hero's beats the mentor's ×0.8. The mentor then tosses the best-fitting
  piece instead: every shape, rotation and column is scored (lines
  completed +0.76, covered holes −0.36, total height −0.51, bumpiness
  −0.18; ties go to the first tried) and the winner appears already turned
  over its best column, its crystals in the mentor's colour, so clearing
  them gives the mentor's mana. The tossed piece glows, the mentor (beside
  the hero on the stage, and in a portrait by the next piece) hops and
  flashes their element.

- **Win**: the spell is learned or raised, shown on the results with its
  icon and level pips, and the category's lock (if any) opens.
- **Lose**: the lesson stays open. The mentor patches the hero up to at
  least half HP (no trip to the inn). The hero can **Retry** at once from
  the results, or walk away, but the category is **locked**: none of its
  spells can be enhanced until a lesson of that mentor is won. The lock
  shows the mentor's face and where they are now; since mentors travel,
  the hero may have to go and find them.

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
deal. Fast, clean play is literally cheaper. The hero's Charm then takes 3%
a rank off every price.

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

| Area       | Enemy        | Element | Weak to       | Resists                                 | Magic                           | Drops           |
| ---------- | ------------ | ------- | ------------- | --------------------------------------- | ------------------------------- | --------------- |
| Overworld  | Green Slime  | Nature  | Fire, arcane  | Water, nature, earth                    | attack                          | Slime Gel       |
| Overworld  | Spore Shroom | Nature  | Fire, arcane  | Water, nature, earth                    | attack, haste (Spore Cloud)     | Spore Cap       |
| Overworld  | Goblin Scout | Earth   | Water, nature | Lightning, earth, wind                  | attack, curse (Rock Toss)       | Goblin Charm    |
| Moon Caves | Moon Imp     | Arcane  | Fire, wind    | Lightning, nature, arcane               | attack, drain                   | —               |
| Moon Caves | Shade Imp    | Arcane  | Fire, wind    | Lightning, nature, arcane               | attack, heal, curse             | Moon Shard      |
| Moon Caves | Cave Brute   | Earth   | Water, nature | Lightning, earth, wind                  | attack, curse (2 rows)          | Ether           |
| Depths     | Moon Wyrm    | Arcane  | Fire, wind    | Water (boss), lightning, nature, arcane | everything                      | Phoenix Feather |
| Lessons    | Wisps (×7)   | Each    | From chart    | From chart                              | attack + one of their element's | —               |

The seven wisps (Ember, Tide, Spark, Moss, Stone, Moon, Gale) are mentors'
trial foes: 30 HP, attack 5, acting every 4 pieces, drawn as a slime
recoloured to their element.

## Progression

Mossvale (learn the challenge types) → overworld monsters (drops, levels)
→ Brightwater (shops, Thunder, earn the Cave Pass by barter) → Moon Caves
(Blizzard tome, hermit) → Moon Wyrm boss. Fire is a tome at the Mossvale
stall. The Sunken Ruins are sealed as the hook for the next region.

## Planned: progression redesign

**Status: stages 1–4 are built and now documented in
[Elements](#elements), [Hero classes and alignment](#hero-classes-and-alignment),
[Stats and skill points](#stats-and-skill-points),
[Hero magic](#hero-magic), [Enhancements](#enhancements) and
[Mentors](#mentors). The rest is planned.** All numbers are starting values to tune in play.

### Goals

- Every level-up is a choice: the hero's stats, or their spells.
- Spells grow slowly and through people: points make a spell _ready_ for its
  next level, and a mentor teaches it.
- What the hero knows changes how the world treats them (alignment).
- Most of it is shown, not told: icons, colours, silhouettes.

### Skill points and spells

Skill points (see [Stats and skill points](#stats-and-skill-points)) also
buy **spell enhancements** (built; see [Enhancements](#enhancements)),
which cost more as the spell rises.

### Spells

Categories, levels, supports, combos and mentors are built (see
[Hero magic](#hero-magic) and [Mentors](#mentors)). Spending any points on
stats delays a spell's next level, so in practice one spell reaches level
3 around hero level 12–15.

### Hidden spells

Some spells don't appear on any list. Their slot shows as a dark silhouette
in the category menu until unlocked; then a mentor can teach them.

| Unlock    | Example                                                                     |
| --------- | --------------------------------------------------------------------------- |
| Stat      | Insight 5 → **Foresight** (see the enemy's next move early)                 |
| Alignment | Fire 4 and Earth 4 → **Volcano**                                            |
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
- **Saves**: v3 (built) drops attunement, keeps an attuned hero's title
  and teaches the class spell. v4 (built) gives older heroes their class's
  starting stats and 2 × (level − 1) unspent points, and recomputes their
  numbers from the class (HP growth only), keeping HP and mana within the
  new caps. v5 (built) turns each known spell into a level 1 spell with
  no enhancements and adds an empty list of locked categories. v6 (built)
  counts monster battles won (older saves start at 0, so every mentor is
  at home).
- **Removed**: attunement and the level 3 choice (done); spell tomes from
  shops (later: they become quest or mentor rewards).

### Build order

1. Element chart and alignment, replacing attunement. **Done.**
2. Stats, skill points and the level-up screen. **Done.**
3. Spell levels, enhancements and the category menu. **Done.**
4. Mentors, team-up battles, supports and combo spells. **Done.**
5. Hidden spells and their unlocks.
6. NPC attitudes and the dialogue rewrite.

Each stage ships with tests and keeps the game playable.
