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
| J     | Blue   | Water     | Chill: pushes the enemy's gauge back 1.5 s (never below −3 s)         |
| O     | Gold   | Lightning | Chain: extra damage × lines cleared together                          |
| S     | Green  | Nature    | Regrowth: heal HP equal to its crystals                               |
| L     | Orange | Earth     | Ward: a shield (max 25) that absorbs attacks                          |
| T     | Violet | Arcane    | Surge: ⌈crystals ÷ 3⌉ mana to every element                           |
| I     | Cyan   | Wind      | Tailwind: pieces fall slower for ⌈crystals ÷ 2⌉ pieces; cancels haste |

- **Mana**: seven separate pools that belong to a battle. **Every battle
  starts with all pools empty**; every cleared crystal adds 1 mana to its
  element (stone adds nothing), in any kind of battle. Each pool holds up to
  the hero's mana capacity (Focus). Nothing outside the board fills mana:
  not level-ups, the inn, rewards or items, so a spell is always paid for
  with lines cleared in that fight. An **Ether** (battle only) doubles the
  mana from crystals cleared during the next 3 pieces; it adds none itself.
  Mana pools are shown only on the battle screen.
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

### Dual pieces

Some pieces arrive **split** (inspired by Dr. Mario's capsules): half in
their shape's own element, half in one of its two **related** elements
from the chart above (picked at random), e.g. a fire Z as 2 fire + 2
lightning or 2 fire + 2 earth.

- **The split** (`DUAL_SPLIT` in `src/core/board.ts`, by cell in the
  shape's spawn order, kept through rotation): I left pair / right pair;
  O, S and Z top / bottom; J and L the hook / the rest of the bar; T keeps
  its nub and centre and its two wings take the second colour (no 2 + 2
  split of a T keeps both halves touching). Each cell keeps its colour as
  the piece turns.
- **How often** (`dualChance` in `src/game/pieceOdds.ts`): each random
  piece is dual with chance `1/7 + 0.04 × (elements with alignment ≥ 2)`,
  at most 1/3. A hero who spreads across elements meets more mixed pieces.
  Puzzle boards (fixed queues) are never dual; a mentor's toss is always
  in the mentor's colour.
- **Rules unchanged**: lines still clear when full. Each crystal gives
  its own element's mana; a line's surge is still its strongest element;
  a pure line (7 of 10 crystals of one element) now asks you to place the
  halves well. Purify, petrify, Gust and feats work per cell; Gust sends
  a dual piece back to the queue still split.
- **Shown**: every crystal carries its own colour and glyph, on the board
  and in the next-piece preview, so a dual piece is visibly two-tone.

## Hero classes and alignment

Chosen when starting a new game. Differences are deliberately small so any
class can finish the game. Mana is the capacity of each of the seven pools.
Every hero also starts with Cure. Starting numbers include the class's
starting stats (below); levels only add HP.

| Class  | Element   | First spell  | HP  | Mana | ATK | DEF | Gil | Starting stats      | HP per level |
| ------ | --------- | ------------ | --- | ---- | --- | --- | --- | ------------------- | ------------ |
| Ranger | Wind      | Gale         | 40  | 12   | 5   | 1   | 25  | Agility 2, Luck 2   | 8            |
| Knight | Earth     | Quake        | 54  | 10   | 5   | 3   | 20  | Vitality 2, Guard 2 | 10           |
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

| Stat     | Icon        | Per rank                                                                   | Max |
| -------- | ----------- | -------------------------------------------------------------------------- | --- |
| Vitality | Heart       | +6 max HP                                                                  | 10  |
| Strength | Sword       | +4% damage on every line-clear strike                                      | 10  |
| Guard    | Shield      | −1 damage from every enemy hit                                             | 10  |
| Focus    | Potion      | +1 capacity in every mana pool                                             | 10  |
| Agility  | Winged boot | Pieces fall 4% slower (40% at max)                                         | 10  |
| Insight  | Eye         | Rank 3: see 2 next pieces. 6: see 3. 9: enemy's next move                  | 9   |
| Charm    | Gift        | +1 NPC [attitude](#npcs-and-attitude) per rank (better prices and rewards) | 10  |
| Luck     | Clover      | +2% to every item drop; 3% crit chance on 3+ line clears                   | 10  |

- **Skill points**: 2 per hero level. A stat rank costs 1 point. The same
  points buy [spell enhancements](#enhancements). Points can be saved;
  spending is permanent (no respec, for now).
- **Level-ups** give the points plus the class's HP growth, added to
  current HP too, but they are no full heal (mana is battle-only). Pool size, attack and defence only grow through
  stats and gear.
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

Fights are real time and reward planning: a sloppy stack loses.

- **Strike damage** for each clear (`strikeDamage` in
  `src/battle/combat.ts`):

  `LINE_DAMAGE[lines] × (1 + 4% × attack) × back-to-back × combo × affinity`

  | Lines together   | 1   | 2   | 3   | 4   |
  | ---------------- | --- | --- | --- | --- |
  | Base damage      | 3   | 12  | 26  | 48  |
  | Mana per crystal | ×½  | ×1  | ×1½ | ×2  |

  Mana follows the same curve (`MANA_PER_LINES` in `src/battle/battle.ts`,
  rounded down per element): a lone line gives half its crystals as mana,
  a four-line clear double, so spells are fuelled by the big clears too.
  - **Attack** (class base, Strength and weapon) is a percentage: +4% per
    point (a Ranger with a copper sword, attack 8, strikes ×1.32).
  - **Back-to-back**: a 2+ line clear right after another 2+ line clear
    (pieces that clear nothing in between don't break it; a single does)
    strikes ×1.5 (the stage floats "×1.5").
  - **Combo**: each consecutive piece that clears adds +25% (up to +200%
    at 8 steps); a piece that clears nothing ends it (floats "×2", "×3"…).
  - **Affinity**: 1 + 0.5 × (share of cleared cells the enemy is weak to)
    − 0.25 × (share it resists); Fault Line counts every crystal as weak.
  - Luck can crit a 3+ line clear (×2). Then each line's surge fires
    (3+ crystals of one element; see the line effects above) as before.

- **The action gauge** (Active-Time-Battle style) replaces turn counting:
  it fills over the enemy's `actMs` (shown as an orange bar under its
  HP; it pulses red when nearly full) and the enemy moves when full. The
  pause stops it.
  - **Spells and items take time**: casting a spell fills 15% of the
    gauge (25% against a boss, so a full spell kit can't simply out-cast
    it) and using an item 40% (the gauge flashes white; a full gauge
    acts at once). At most **2 item uses per battle** (a bag with "1/2"
    leads the item list); a Herb heals 25% of max HP; a Phoenix Feather
    revives at most **once per fight**, and its revive is one of the 2
    uses.
  - **Pauses**: 3 per battle (the pause button shows how many are left;
    resuming is always allowed). While paused the board and the
    next-piece preview are hidden, so a pause can't be used to plan.
  - **Slows it**: a water line pushes it back 1.5 s (never below −3 s);
    Blizzard pushes it back 1.5 s per "piece" of its freeze (never below
    one full gauge); Mist makes the next move fizzle. Chill shows as ice
    over the bar.
  - **Speeds it**: enrage (bosses) shortens `actMs`; growing with the
    hero shortens it 3% per level.
  - **Mistakes feed it**: each new covered hole a placement leaves adds
    15% of a gauge (at most 45% per piece; the gauge flashes and "+N"
    floats); a full gauge moves at once. Overflowing the board costs 25%
    of max HP, clears the board **and** gives the enemy a free move on
    top of its gauge (not when its own curse caused the overflow).
  - Agility and tailwind still act on gravity, not on the gauge.
- **Enemy moves**, chosen one move ahead (Insight 9 shows its icon left
  of the gauge):

  | Move    | Effect                                                                                          | Shown as                                   |
  | ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
  | attack  | Damage = power + enemy attack − your defence (base, Guard and armour); a ward absorbs it first  | Red number, hero shakes                    |
  | curse   | Pushes stone rows (one gap each) up the board                                                   | Board shakes                               |
  | haste   | Doubles gravity for your next N pieces; ends a tailwind                                         | Haste badge with a count                   |
  | heal    | Restores the enemy's HP                                                                         | Green number                               |
  | drain   | Burns mana from your fullest pool                                                               | Pool flashes                               |
  | fog     | Hides the next-piece preview for N pieces                                                       | Grey cloud and eye over the preview, count |
  | seal    | Seals a column (never one of the spawn columns 3–6, never under the falling piece) for N pieces | Hatched column with a lock and count       |
  | petrify | Turns K random crystals on the board to stone                                                   | Cells flash white, then show as stone      |
  | quicken | Pieces fall 2.5× faster for N seconds                                                           | Hourglass badge counting seconds           |

- A Phoenix Feather revives you once at **25% HP**, automatically (one
  per fight, however many you carry), and the revive **counts as one of
  the fight's 2 item uses**: with both uses spent there is no revive.
  (It used to revive at half HP for free; prepared players won 97–100%
  of fights mostly because of it.)
- **Bosses damp weaknesses**: a boss takes `BOSS_WEAKNESS_SHARE` (75%) of
  a weakness bonus: ×1.375 instead of ×1.5 for a weak element's spell,
  +37.5% instead of +50% for weak crystals, and Fault Line likewise.
- **Failure costs**: losing a fight sends you back to the last inn you
  rested at with **30% HP** (50% in Mossvale, the home village, whose
  healer looks after beginners) and half your gil (no free heal). Normal
  monsters reappear when you leave the map; bosses stay beaten. So a
  broke, battered hero never soft-locks, **walking heals 1 HP per step
  while below half HP**; the inn (10 gil) restores the rest. A
  **beginner** (below level 4) walking in the starter lands (Mossvale
  and the Realm, `STARTER_MAPS`) heals up to **80%** instead: a playtest
  hero who spent his last gil on a sword went 7–14 at the half-HP cap. A lesson
  still starts at full HP (the mentor's setup), and afterwards, won or
  lost, the mentor leaves you at least half.

### Monster scaling

Each monster grows with the hero inside a band (`src/game/scaling.ts`):
its effective level is `clamp(hero level, own level, own level + band)`,
with band 3 (1 for bosses; `EnemyDef.band` overrides it per monster: the
mentor regions' monsters use their region's band, 2, from `REGIONS` in
`src/data/balance.ts`). Each level grown adds 10% of its base HP, 1 attack and 3%
gauge speed, and the same 10% to its XP. Gravity stays at the monster's
own level; it speeds up 45 ms per level to level 7 (450 ms a row) and
only 20 ms per level after that, so the late regions (up to level 13)
stay playable.

**Balance constants** all live in `src/data/balance.ts` (each with a
one-line note; the modules that use them re-export them): strike damage,
gauge costs, item caps and the Feather, element and boss factors, battle
pacing, monster scaling, recovery and regen caps, lessons, the XP curve
and each region's level band. Enemy stat blocks stay in
`src/data/enemies.ts`. Once the hero stands above the effective level, XP falls 25%
per level (at least 10%); bosses' XP never falls off. The stage shows the
level it fights at ("Lv4") left of its HP bar.

### Balance (simulated)

`tests/sim/simulate.ts` plays the real `Battle` on simulated time (one
piece per 1.5 s) with bots:

- **good** stacks flat with no holes, looks one piece ahead (when the
  preview isn't fogged), keeps a well column for 3–4 line clears and
  casts whatever spell is ready; no items.
- **prepared** plays like good but brings 5 Herbs, an Ether and a Phoenix
  Feather (Ether at once, a Herb below 35% HP; the 2-use cap applies).
- **singles** (`spammer`) clears lines as soon as it can, mostly single
  lines, and casts every ready spell: the "single lines + spells" plan.
- **sloppy** is the greedy tidy heuristic from `bestFit` with a careless
  drop a third of the time; **dropper** hard-drops in place.

- **full kit** gives the good or prepared bot nine mentor spells across
  the elements (Fire, Kindle, Gale, Gust, Thunder, Static, Cure, Regen,
  Quake; the primaries at level 2), as a late-game hero would have;
  otherwise the bots know only the class spell (starter kit).

Each fight starts at full HP; the hero (Ranger) is at the monster's level
with points spread over Strength, Vitality and Guard and level-fit gear
(Copper Sword; Iron Sword and Apprentice Robe from level 4; Knight Blade
and Crystal Mail from 7; Flame Brand and Forge Plate from 9).
`npm run sim` plays **the whole game's fight set** (every area's monsters
at their own level, the Moon Wyrm, and mentor lessons) against every bot
and prints one table (`RUNS` seeds per cell, default 12; `SIM_OUT=file`
also writes it). The tests check that hard-dropping in place loses every
ordinary fight.

**Status: the numbers below are placeholders.** The region monsters, the
shifted Moon Caves and the Wyrm were given first-guess stats (a few quick
runs of the good bot against each); the final balance pass tunes them
against the targets below. Latest run (12 seeds):

| Area                | Fight         | Hero Lv | Good (starter spells) | Good (full kit) | Prepared | Prepared (full kit) | Singles + spells | Sloppy | Good: time / pieces | Good: HP left |
| ------------------- | ------------- | ------- | --------------------- | --------------- | -------- | ------------------- | ---------------- | ------ | ------------------- | ------------- |
| The Realm           | Green Slime   | 1       | 100%                  | 92%             | 100%     | 83%                 | 83%              | 0%     | 39 s / 26           | 63%           |
| The Realm           | Spore Shroom  | 2       | 100%                  | 100%            | 100%     | 100%                | 83%              | 0%     | 48 s / 32           | 73%           |
| The Realm           | Goblin Scout  | 3       | 92%                   | 92%             | 100%     | 92%                 | 100%             | 0%     | 80 s / 54           | 56%           |
| Thornwood Grove     | Sproutling    | 2       | 100%                  | 92%             | 100%     | 92%                 | 42%              | 0%     | 59 s / 40           | 71%           |
| Thornwood Grove     | Leaf Sprite   | 3       | 92%                   | 92%             | 92%      | 100%                | 75%              | 0%     | 63 s / 42           | 54%           |
| Thornwood Grove     | Thorn Troll   | 4       | 83%                   | 92%             | 100%     | 100%                | 83%              | 0%     | 82 s / 55           | 65%           |
| Glasswater Lake     | Drip          | 3       | 83%                   | 92%             | 92%      | 92%                 | 100%             | 0%     | 57 s / 38           | 58%           |
| Glasswater Lake     | Lake Lurker   | 4       | 83%                   | 100%            | 83%      | 100%                | 83%              | 0%     | 79 s / 53           | 63%           |
| Glasswater Lake     | Tide Ogre     | 5       | 75%                   | 75%             | 100%     | 83%                 | 58%              | 0%     | 91 s / 61           | 50%           |
| Redrock Quarry      | Goblin Digger | 4       | 67%                   | 100%            | 100%     | 92%                 | 92%              | 0%     | 90 s / 61           | 64%           |
| Redrock Quarry      | Quarry Hound  | 5       | 83%                   | 92%             | 92%      | 92%                 | 33%              | 0%     | 84 s / 57           | 51%           |
| Redrock Quarry      | Stone Ogre    | 6       | 58%                   | 83%             | 100%     | 92%                 | 58%              | 0%     | 123 s / 83          | 46%           |
| Emberforge          | Cinder        | 5       | 83%                   | 83%             | 92%      | 83%                 | 42%              | 0%     | 63 s / 42           | 52%           |
| Emberforge          | Forge Imp     | 6       | 67%                   | 67%             | 83%      | 100%                | 50%              | 0%     | 74 s / 50           | 54%           |
| Emberforge          | Magma Drake   | 7       | 83%                   | 67%             | 92%      | 83%                 | 33%              | 0%     | 94 s / 63           | 50%           |
| Stormcrown Peaks    | Spark Pup     | 6       | 83%                   | 92%             | 75%      | 83%                 | 58%              | 0%     | 81 s / 55           | 49%           |
| Stormcrown Peaks    | Storm Goblin  | 7       | 83%                   | 83%             | 92%      | 100%                | 67%              | 0%     | 113 s / 75          | 51%           |
| Stormcrown Peaks    | Thunderhide   | 8       | 75%                   | 83%             | 92%      | 75%                 | 92%              | 0%     | 110 s / 76          | 47%           |
| Windward Cliffs     | Puffball      | 7       | 58%                   | 92%             | 100%     | 92%                 | 92%              | 0%     | 105 s / 72          | 55%           |
| Windward Cliffs     | Gale Bat      | 8       | 67%                   | 83%             | 67%      | 75%                 | 58%              | 0%     | 106 s / 72          | 49%           |
| Windward Cliffs     | Sky Ram       | 9       | 83%                   | 92%             | 100%     | 92%                 | 92%              | 0%     | 115 s / 79          | 51%           |
| Moonfall Ruins      | Watcher       | 8       | 83%                   | 92%             | 83%      | 92%                 | 33%              | 0%     | 98 s / 65           | 50%           |
| Moonfall Ruins      | Night Bat     | 9       | 75%                   | 100%            | 92%      | 92%                 | 67%              | 0%     | 127 s / 85          | 52%           |
| Moonfall Ruins      | Gloom Toad    | 10      | 83%                   | 58%             | 83%      | 75%                 | 8%               | 0%     | 150 s / 101         | 48%           |
| Moon Caves          | Moon Imp      | 10      | 83%                   | 75%             | 92%      | 100%                | 92%              | 0%     | 120 s / 82          | 65%           |
| Moon Caves          | Shade Imp     | 11      | 92%                   | 100%            | 100%     | 92%                 | 83%              | 0%     | 115 s / 77          | 64%           |
| Moon Caves          | Cave Brute    | 11      | 75%                   | 100%            | 100%     | 100%                | 92%              | 0%     | 125 s / 85          | 52%           |
| Moon Caves · Depths | Shade Imp     | 11      | 92%                   | 100%            | 100%     | 92%                 | 83%              | 0%     | 115 s / 77          | 64%           |
| Moon Caves · Depths | Moon Wyrm     | 13      | 25%                   | 25%             | 50%      | 83%                 | 33%              | 0%     | 147 s / 103         | 55%           |
| Lesson              | Ember Wisp d1 | 1       | 83%                   | 83%             | 92%      | 92%                 | 92%              | 17%    | 35 s / 23           | 33%           |
| Lesson              | Tide Wisp d1  | 1       | 100%                  | 92%             | 92%      | 100%                | 100%             | 25%    | 39 s / 26           | 71%           |
| Lesson              | Gale Wisp d1  | 1       | 100%                  | 92%             | 100%     | 100%                | 100%             | 17%    | 29 s / 19           | 72%           |
| Lesson              | Ember Wisp d2 | 3       | 92%                   | 75%             | 83%      | 75%                 | 58%              | 0%     | 40 s / 27           | 38%           |
| Lesson              | Tide Wisp d2  | 3       | 92%                   | 83%             | 100%     | 100%                | 100%             | 0%     | 61 s / 40           | 72%           |
| Lesson              | Gale Wisp d2  | 3       | 100%                  | 100%            | 92%      | 92%                 | 100%             | 0%     | 43 s / 28           | 69%           |
| Lesson              | Ember Wisp d3 | 5       | 92%                   | 92%             | 100%     | 100%                | 75%              | 0%     | 53 s / 35           | 42%           |
| Lesson              | Tide Wisp d3  | 5       | 100%                  | 100%            | 100%     | 100%                | 100%             | 0%     | 67 s / 45           | 75%           |
| Lesson              | Gale Wisp d3  | 5       | 100%                  | 100%            | 100%     | 100%                | 100%             | 8%     | 39 s / 26           | 77%           |

Read against the draft targets: the region fights mostly sit in the
target band for the good bot (58–100%), prepared players still win most
fights (the Feather now costs an item use and revives at 25%), and the
Moon Wyrm at level 13 is 25% for the good bot and 50% prepared (83% with
a full kit, above target): the balance pass's first jobs.

#### Balance targets (DRAFT, for review)

What the balance pass should aim for. Not yet tuned to.

| Area                  | Hero level entering | Good (starter spells) | Good (full kit) | Prepared | Singles + spells | Sloppy    | Fight length (good) | Gil in (per fight) / out (main buys)     |
| --------------------- | ------------------- | --------------------- | --------------- | -------- | ---------------- | --------- | ------------------- | ---------------------------------------- |
| The Realm             | 1                   | 80–90%                | —               | 95%+     | 70–85%           | under 15% | 40–70 s             | 4–10 / Copper Sword 22, inn 10           |
| Thornwood Grove       | 2                   | 75–85%                | —               | 90%+     | 65–80%           | under 10% | 50–80 s             | 6–11 / herbs                             |
| Glasswater Lake       | 3                   | 75–85%                | —               | 90%+     | 65–80%           | under 10% | 50–90 s             | 7–14 / Iron Sword 80, Crystal Mail 90    |
| Redrock Quarry        | 4                   | 70–85%                | 80–90%          | 90%+     | 60–75%           | under 10% | 60–100 s            | 12–17 / Knight Blade 150                 |
| Emberforge            | 5                   | 70–85%                | 80–90%          | 90%+     | 60–75%           | under 10% | 60–100 s            | 14–22 / Flame Brand 260, Forge Plate 220 |
| Stormcrown Peaks      | 6                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 70–110 s            | 16–26 / inn, Feathers 30                 |
| Windward Cliffs       | 7                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 70–110 s            | 20–30 / inn, Feathers 30                 |
| Moonfall Ruins        | 8                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 80–120 s            | 25–34 / Ethers                           |
| Moon Wyrm (first try) | 12–13               | 25–35%                | 35–45%          | 50–60%   | 15–25%           | 0%        | 100–140 s           | 90                                       |
| Mentor lessons        | at need             | 85–100%               | —               | —        | 75–100%          | 0–20%     | 30–60 s             | —                                        |

"Prepared" means 5 Herbs, an Ether and a Feather with the 2-use cap.
Gil should cover each region's gear by the time the next one opens, with
no more than ~150 gil unspent (the old playtests left 300–400).

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

| Category  | Level 1               | Level 2               | Level 3               | Level 4                 | Effect                             | How to learn                       |
| --------- | --------------------- | --------------------- | --------------------- | ----------------------- | ---------------------------------- | ---------------------------------- |
| Fire      | Fire · 6 · 14         | Blaze · 8 · 22        | Inferno · 10 · 36     | Cataclysm · 12 · 57     | Damage                             | Torva (mentor)                     |
| Water     | Blizzard · 8 · 18/3   | Hailstorm · 10 · 29/3 | Glacier · 12 · 46/4   | Deep Winter · 14 · 74/4 | Damage / gauge back N × 1.5 s      | Maren (mentor)                     |
| Lightning | Thunder · 8 · 24      | Thunderclap · 10 · 38 | Stormcall · 12 · 61   | Skyfall · 14 · 98       | Damage                             | Rogue start; Sage Orrin (puzzle)   |
| Nature    | Cure · 6 · 20         | Mend · 8 · 32         | Restore · 10 · 51     | Rebirth · 12 · 82       | Heal HP                            | Start (every class)                |
| Earth     | Quake · 6 · 6/2       | Rockslide · 8 · 10/3  | Upheaval · 10 · 16/3  | Worldsplit · 12 · 26/4  | Damage / removes the bottom N rows | Knight start; Elder Rowan (puzzle) |
| Arcane    | Shadow Drain · 8 · 18 | Soul Siphon · 10 · 29 | Night Feast · 12 · 46 | Void Hunger · 14 · 74   | Damage, heals half of it           | Mage start; Selene (mentor)        |
| Wind      | Gale · 6 · 10/5       | Squall · 8 · 16/6     | Cyclone · 10 · 26/7   | Hurricane · 12 · 41/8   | Damage / tailwind for N pieces     | Ranger start; Kestrel (mentor)     |

Each cell is name · mana of the category's element · power (or healing),
then rows or pieces after the slash.

**Supports** have a single level. Each needs its category's primary.

| Support   | Category  | Cost        | Effect                                                               |
| --------- | --------- | ----------- | -------------------------------------------------------------------- |
| Kindle    | Fire      | 5 fire      | Burns the enemy for 4 (fire, so ×1.5 if weak) after each of 5 pieces |
| Mist      | Water     | 6 water     | The enemy's next move fizzles ("Miss")                               |
| Static    | Lightning | 5 lightning | Each of the next 3 line clears also strikes for 6 lightning          |
| Regen     | Nature    | 6 nature    | Heals 4 HP after each of 5 pieces (not at full HP)                   |
| Stoneskin | Earth     | 5 earth     | +15 ward (up to the usual 25)                                        |
| Mana Tap  | Arcane    | 4 arcane    | +1 mana to every other pool (not when they are all full)             |
| Gust      | Wind      | 3 wind      | Swaps the falling piece for the next one (not if it has no room)     |

Running supports show on the stage with a count: Kindle and Mist under
the enemy's action gauge, Regen and Static beside the hero.

**Combos** have a single level and build both (or all) of their elements'
alignment. Each needs another element's primary.

| Combo       | Category  | Needs                  | Cost                      | Effect                      |
| ----------- | --------- | ---------------------- | ------------------------- | --------------------------- |
| Wildfire    | Fire      | Gale                   | 4 fire, 4 wind            | 28 damage, tailwind 4       |
| Spring Rain | Water     | Cure                   | 4 water, 4 nature         | Heals 36                    |
| Storm Surge | Lightning | Blizzard               | 4 lightning, 4 water      | 28 damage, enemy gauge −3 s |
| Bramble     | Nature    | Quake                  | 4 nature, 4 earth         | Clears 2 rows, 12 damage    |
| Magma       | Earth     | Fire                   | 4 earth, 4 fire           | 34 damage                   |
| Void Bolt   | Arcane    | Thunder                | 4 arcane, 4 lightning     | 28 damage, heals half       |
| Moonwind    | Wind      | Shadow Drain           | 4 wind, 4 arcane          | 32 damage                   |
| Meteor      | Fire      | Quake and Shadow Drain | 6 fire, 6 earth, 6 arcane | 58 damage                   |

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
  Casting closes the menu and takes time (the enemy's gauge jumps 15%). Tooltips give a short
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
| Freeze (Blizzard)      | Pushes the enemy's gauge back 1.5 s more                           |
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
- **Locks**: a category can't be enhanced while the hero has a lost
  mentor lesson in it still to win (`failedLessons`, see
  [Mentors](#mentors)). It shows a lock, the lost spell's kind icon, the
  mentor's face and where they are now (map and landmark).
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

| Mentor  | Element   | Why they teach                                 | Home region, landmark (trial foe)   | Route after home                                                                 | Moves every |
| ------- | --------- | ---------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| Torva   | Fire      | Her hands shake too much for the forge now     | Emberforge, old forge (Ember Wisp)  | Quarry, ridge road · Brightwater · Mossvale · Moon Caves¹                        | 4 wins      |
| Maren   | Water     | The lake is clouding; she can't watch it alone | Glasswater Lake, jetty (Tide)       | Brightwater fountain · Grove pond · Mossvale                                     | 5 wins      |
| Rook    | Lightning | Storms roll off the peaks faster every year    | Stormcrown Peaks, beacon (Spark)    | Cliff road · Realm, north-east · Brightwater · Moon Caves¹ · Depths²             | 3 wins      |
| Hazel   | Nature    | Spores are choking her meadows                 | Thornwood Grove, old oak (Moss)     | Realm, west meadow · Mossvale · Lake meadow                                      | 6 wins      |
| Dorn    | Earth     | The caves took his crew                        | Redrock Quarry, quarry lift (Stone) | Realm, tunnel gate · Emberforge ridge · Moon Caves¹ · Depths¹ · Brightwater      | 4 wins      |
| Selene  | Arcane    | Something below drinks the moonlight           | Moonfall Ruins, moon tower (Moon)   | Cliff path · Brightwater · Depths¹                                               | 5 wins      |
| Kestrel | Wind      | Her letters must reach every village           | Windward Cliffs, eyrie (Gale)       | Peaks, high pass · Realm, south road · Mossvale · Brightwater · Realm, east road | 3 wins      |

Every mentor lives in their own region (see [World and regions](#world-and-regions))
and travels to the neighbouring region and the starter towns, so each has
a stop a brand-new hero can walk to (the tests check it): a class mentor
whose home is still behind a gate comes through Brightwater, Mossvale or
the Realm within a few wins. While a mentor is at home behind a gate the
hero hasn't opened, the lock hint still names the place; a mentor who
noticed a feat waits at the nearest stop the hero can actually reach
(`mapDistance` skips warps still locked to the hero).

¹ once the hero holds the Cave Pass. ² once the Moon Wyrm is beaten.

- **Travel**: a mentor's place is a pure function of the story flags and
  the number of monster battles won (saved): the route's open stops, home
  first, and one stop on every _N_ wins, wrapping round. So a mentor is in
  exactly one place, and story progress opens new stops. A mentor never
  arrives on the hero's tile: while the hero stands on their next stop,
  they wait at the one before. Each stop has a landmark ("cave seal",
  "lake shore") shown with the map's name in lock hints.
- **What they teach** (only their element): the next level of a _ready_
  spell; the primary, if the hero lacks it; the support, once the primary
  is known; each combo, once its other spell is known; a hidden spell,
  once revealed.
- **Difficulty**: the level being taught (a new spell is 1); a combo's is
  its number of elements (2; Meteor 3). A [hidden spell](#hidden-spells)
  is one harder.
- **The foe**: at home, the mentor's trial **wisp** of their element;
  away, the toughest non-boss monster of the area (of the mentor's element
  if there is one), or the wisp in a town. Per difficulty above 1 the foe
  gains 60% HP, +3 attack and a level (faster pieces). Lessons give no XP,
  gil or drops.
- **The mentor's help**: on every new piece, with chance

  > p = clamp(40% − 5% × (alignment in the mentor's element − difficulty), 10%, 50%) × relation

  where relation compares the mentor's element to the hero's title
  element: same ×1, related ×0.8, the mentor's beats the hero's ×0.6, the
  hero's beats the mentor's ×0.8. The mentor then tosses the best-fitting
  **shape** in place of the piece that came out of the bag: every shape,
  rotation and column is scored (lines completed +0.76, covered holes
  −0.36, total height −0.51, bumpiness −0.18; ties go to the first tried)
  and the best placement's shape enters as usual (spawn rotation and
  column), so the hero still has to place it. Its crystals are in the
  mentor's colour, so clearing them gives the mentor's mana. The tossed
  piece glows, and the mentor (beside the hero on the stage, and in a
  portrait by the next piece) hops and flashes their element. Gust sends a
  tossed piece back to the queue in its own colour.

- **Win**: the spell is learned or raised, shown on the results with its
  icon and level pips. If it was the lesson that locked the category, the
  lock opens.
- **Before each try** (and each Retry) the mentor heals the hero to full
  HP; mana is the hero's own to manage.
- **Lose**: the lesson is recorded and stays open (no trip to the inn). The hero can **Retry**
  at once from the results (it has focus; keys are ignored for 350 ms so
  mashing can't skip the result), or walk away, but the category is
  **locked**: none of its spells can be enhanced until **that** lesson is
  won. The mentor's other lessons stay on offer but don't lift the lock;
  the lost one is marked with a lock in their list. If the hero comes to
  know that spell at that level another way (e.g. an old save's tome), the lock lifts
  by itself, so it can never become permanent. A later loss while locked
  keeps the first lesson as the one to win. The lock shows the mentor's
  face and where they are now; since mentors travel, the hero may have to
  go and find them.

### Charms

Worn in the accessory slot; each adds 1 copy of its element's piece to
every bag. Ember (fire) sells in Mossvale; Ember, Tide (water), Storm
(lightning) and Wind sell at the Brightwater smithy. The Storm Charm undoes
the Moon Caves' lightning penalty, which matters against the
lightning-weak Shade Imp and Moon Wyrm. The rest come from people: the
Well Stone (earth) from Elder Rowan, for a hero who already knows Quake;
the Grove Charm (nature), the Moon Charm (arcane) and Pip's Wind Charm as
Devoted secrets (see [NPCs and attitude](#npcs-and-attitude)).

## Hidden spells

Seven spells, one per element, appear on no list until something the hero
does reveals them. Each has a single level and can't be enhanced; once
revealed, its element's mentor teaches it (difficulty one above the usual:
2, or 3 for Volcano). Code: `hidden` on the spell (`src/data/spells.ts`),
`src/game/hidden.ts` and `src/game/feats.ts`.

| Spell          | Element   | Kind               | Cost            | Effect                                                       | Unlock    | Condition (for developers)                                    |
| -------------- | --------- | ------------------ | --------------- | ------------------------------------------------------------ | --------- | ------------------------------------------------------------- |
| Volcano        | Fire      | Combo (fire+earth) | 6 fire, 6 earth | Clears the bottom 3 rows, 40 fire damage (no level bonus)    | Alignment | Fire 4 and earth 4                                            |
| Purify         | Water     | Support            | 5 water         | Every stone on the board becomes a water crystal             | Quest     | Shrine Keeper Ilse's barter in Brightwater (`shrineRestored`) |
| Ball Lightning | Lightning | Support            | 6 lightning     | 2 damage per lightning crystal on the board (no level bonus) | Pattern   | 2 pure lightning lines over the hero's life                   |
| Bloom          | Nature    | Support            | 7 nature        | Heals 6 after each of the next 8 pieces                      | Item      | Bring a Spore Cap to Hazel                                    |
| Fault Line     | Earth     | Support            | 5 earth         | For 4 pieces every element strikes as a weakness             | Stat      | Insight 5                                                     |
| Eclipse        | Arcane    | Support            | 9 arcane        | 36 damage, heals all of it                                   | Item      | Bring a Moon Shard to Selene                                  |
| Tempest        | Wind      | Support            | 7 wind          | 34 damage, tailwind 8 (cancels haste)                        | Pattern   | A clear of 2+ lines at once under the enemy's haste           |

- **Silhouettes**: until revealed, a hidden spell's slot is a dark
  silhouette of its element with a faint hint of what kind of thing
  reveals it (eye: a stat, star: alignment, piece: a board feat, scroll: a
  quest, bag: an item); never its name or condition. A board-feat slot
  also shows progress pips (●○ = 1 of 2 done). Revealed but untaught,
  it lights up in its element's colour with its mentor's face. It shows in
  the spellbook (after its element's spells), at the end of an open
  category menu in battle, and in its mentor's lesson list (where a
  revealed spell is an ordinary lesson). `hiddenState` derives hidden /
  unlocked / known.
- **Feats** (`hero.feats`, saved): fights and lessons (not puzzles,
  trades or haggles, whose preset or forgiving boards could be replayed)
  count each cleared line with at least 7 of its 10 cells one element
  (`pure.<element>`; stone and other colours just don't count toward it)
  and each clear of 2+ lines at once made while the enemy's haste is on
  (`hastedClear`; older saves' `hastedQuad` carries over). Both were
  tuned so an attentive player reaches them: with stricter rules (all one
  element, then 8 of 10; a hasted four- then three-line clear) four full
  playthroughs of ~60 fights each never got there. Crystals Purify makes from stone count as
  water; no hidden spell needs pure water lines.
- **Items**: walking into the mentor with the item first asks: the item,
  an arrow and the mentor's face, with **Give** or **Keep** (so the hero
  can hold on to it). In a shop's Sell list such an item carries the
  wanting mentor's small face, so it isn't sold by accident. Giving hands it over (shown under their
  speech) and reveals the spell for good (`gift:<spell>` flag); keeping
  goes on to the usual conversation and asks again next time.
- **Running effects**: a heal-over-time keeps whichever of Regen and
  Bloom has more healing left. Fault Line wears off after each piece's
  Kindle and Regen, so all four of its pieces expose every hit, burns
  included. Eclipse heals all the damage it actually deals (level bonus
  and weakness included), up to max HP.
- **The mentor noticed**: while a feat-revealed spell is untaught, its
  mentor leaves their route and seeks the hero out: they wait at their
  open stop fewest warps from the hero's map (one on that map first, the
  earlier stop on a tie, never the hero's own tile), with a leaping star of
  their colour overhead instead of the scroll. Once taught, they go back to
  their route.
- **Fault Line** shows on the stage: all seven elements line up under the
  enemy's weakness mark, resistances vanish, and a ▲ count under the turn
  pips shows the pieces left.
- **Meteor** stays an ordinary stage 4 combo (Quake and Shadow Drain, taught
  by Torva): it is already listed and taught, and the alignment unlock went
  to Volcano instead.

## NPC interactions

The open question was how talking to NPCs becomes a battle. Four models
are built, each used where it fits best:

### Offering (your idea)

Presenting an item works like casting a spell: a spell costs mana, an
offering costs **points**. The NPC names an item and a price ("score 600
within 18 pieces"). You must hold the item to try, and it is only taken
if you succeed, so failing costs time, not loot. This turns monster drops
into quest currency (a Goblin Charm, cleaned → the collector pays gil; a
Moon Shard, ground → the hermit mixes salves).

### Barter

The NPC wants crystals of specific colours ("8 green"). Only crystals in
cleared lines count. It rewards planning which pieces go where, and it
uses the board's colours, which combat mostly ignores.

### Haggle

Used by every shop and the inn. The price starts at 100%. Each line you
clear pushes it down (−5% / −12% / −20% / −30% for 1–4 lines); the merchant
pushes it up 3% on a timer. After a fixed number of pieces the deal is
struck at the current price (50%–150%). Overflowing ends the haggle with no
deal. Fast, clean play is literally cheaper. The keeper's
[attitude](#npcs-and-attitude) then moves every price.

Every shop also **buys**: its Sell list shows what's in the bag, each at
half its list price (rounded down). Worn gear isn't in the bag, services
can't be sold, and keepsakes (price 0, e.g. an old save's Blizzard tome)
are worth nothing; story progress is held in flags, never items, so
selling can't lock anything. Treasures now have a price for this (Slime
Gel 6, Spore Cap 10, Goblin Charm 20, Moon Shard 20), so every drop is
worth something; the collector and hermit still pay far better.

Prices were raised after playtests left heroes 300–400 gil unspent: Iron
Sword 80 (was 55), Crystal Mail 90 (65), Knight Blade 150 (105).

### Puzzle

A preset board and a fixed sequence of pieces. Used by sages, children's
games and sealed chests. Every puzzle has a recorded solution that the
tests replay, so none can be accidentally unsolvable.

### Other options considered (not built yet)

- **Reputation**: repeated wins with an NPC unlock better rewards.
- **Duel**: a rival on a second board sends stone rows when they clear.
- **Escort / timed**: survive N seconds while an NPC's needs tick up.
- **Gift instead of score**: pay the point cost with elemental mana instead of playing.

## NPCs and attitude

Every NPC who is not a mentor has an element, and an **attitude** toward
the hero, worked out fresh each time (never saved):

> score = alignment in their element + ½ × alignment in the two related
> elements − ½ × alignment in the two elements that beat theirs + Charm rank

For a fire NPC, earth and lightning are related and water and wind are
opposed; nature and arcane (which fire beats) don't count. The tier
(`src/game/attitude.ts`):

| Attitude | Score     | Face  | Prices | Rewards               | Will deal?               | Dialogue        |
| -------- | --------- | ----- | ------ | --------------------- | ------------------------ | --------------- |
| Hostile  | below −2½ | Scowl | —      | —                     | Refuses; shops close     | Curt            |
| Wary     | −2½ to −1 | Frown | +20%   | Base                  | Harder challenge         | Suspicious      |
| Neutral  | −½ to 2½  | Flat  | ±0     | Base                  | Yes                      | Plain           |
| Friendly | 3 to 5½   | Smile | −10%   | Base + one bonus item | Yes                      | Warm            |
| Devoted  | 6 and up  | Grin  | −20%   | Base + bonus + secret | Yes, plus a secret offer | Confides, hints |

A new hero (1 alignment, Charm 0–2) is Neutral to almost everyone; the
Rogue's Charm 2 makes the lightning sage Friendly from the start. A few
spell levels in one element, or Charm, make its people Friendly; Devoted
takes real growth. A hero deep in the two elements that beat an NPC's
(e.g. water 3 and nature 3 against earth) turns them Hostile.

- **Shown, not told**: the face floats beside the NPC's head on the map,
  sits on their portrait in the conversation, and leads the shop header
  with the price change. Bonus and secret rewards show in a gold frame
  after the usual rewards; secret shop stock is starred.
- **Prices**: what you pay = list price × haggle result × attitude price,
  rounded, at least 1 gil. Charm counts once, inside attitude; there is no
  separate Charm discount.
- **Wary is harder**: offerings need 25% more points, barters 25% more
  crystals (rounded up), and merchants push prices up 25% faster. Puzzles
  are unchanged, since each has exactly one recorded solution.
- **Devoted secrets**: quest NPCs add a `secret` item; shopkeepers bring
  out `secretStock`. The Elder's secret is a Spore Cap, which reveals Bloom
  when brought to Hazel; the sage's confidence hints at Ball Lightning.
- **No soft-locks**: NPCs whose rewards the realm needs (Captain Vale's
  Cave Pass; Shrine Keeper Ilse's spring, which reveals Purify) are
  `essential`: when Hostile they still deal, at Wary terms, with their curt
  lines. The tests check every flag a warp or hidden spell needs comes from
  such an NPC. Everyone else may refuse; nothing they give is required.
- **Known spells**: a spell reward names an `instead`, given to a hero who
  already knows the spell (the Knight gets the Elder's Well Stone, the
  Rogue the sage's Storm Charm). A deed is never repaid with nothing.
- **Things** (the sealed chest) have no face and always deal at Neutral.

### Dialogue rules

Every NPC follows three rules, with short lines (one or two sentences):

1. **A real need.** The NPC wants something for a reason in their life.
2. **The challenge is the task.** The battle is doing that thing, not a
   test of the hero.
3. **The reward follows.** What they give comes from what you did.

Each NPC has an intro, accept, decline, win and lose line (plus a done
line once a one-time task is finished). Lines that matter come in three
moods: cold (Hostile, Wary), plain (Neutral) and warm (Friendly, Devoted).
Devoted NPCs confide instead of the warm intro, and NPCs who can refuse
have a refusal. The accept line opens the battle as a banner; the decline
line shows over the map.

| NPC                  | Element   | Need                                      | Challenge                      | Reward (bonus / secret)                           |
| -------------------- | --------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Elder Rowan          | Earth     | Spores choke the village well             | Puzzle: clear the spore field  | Quake, or the Well Stone (Ether / Spore Cap)      |
| Farmer Bea           | Nature    | Blight left her herb beds bare            | Barter: plant 7 green          | 2 Herbs (Herb / Grove Charm)                      |
| Pip                  | Wind      | His crystal tower is jammed before supper | Puzzle: unjam the tower        | Ether (Herb / Wind Charm)                         |
| Stall Keeper Odo     | Nature    | Makes his living at the stall             | Haggle                         | Mossvale Stall (secret: Iron Sword)               |
| Merchant Lio         | Water     | Must clear stock before the barges come   | Haggle                         | Brightwater Goods (secret: Crystal Mail)          |
| Smith Hilda          | Fire      | The forge eats coal faster than she sells | Haggle                         | Ember Forge (secret: Hilda's Hammer)              |
| Innkeeper Mae        | Fire      | Empty rooms since the caves closed        | Haggle                         | The Sleeping Lantern (secret: Phoenix Feather)    |
| Sage Orrin           | Lightning | The storm broke his roof lattice          | Puzzle: rebuild the lattice    | Thunder, or a Storm Charm (Ether / 2 Ethers)      |
| Captain Vale         | Earth     | The cave ward lamps are dying             | Barter: 8 blue, 8 violet       | Cave Pass, 20 gil (Herb / Phoenix Feather)        |
| Collector Nim        | Wind      | Goblin Charms for his cabinet, but clean  | Offering: clean a Goblin Charm | 45 gil (Ether / Moon Shard)                       |
| Shrine Keeper Ilse   | Water     | The shrine spring clouded with the lake   | Barter: 10 blue, 6 green       | Spring restored, Ether (Ether / Tide Charm)       |
| Cave Hermit          | Arcane    | Grinds Moon Shards into salves            | Offering: grind a Moon Shard   | 2 Ethers, 2 Herbs (Herb / Moon Charm)             |
| Sealed Chest         | Arcane    | (a thing)                                 | Puzzle: break the seal         | Phoenix Feather, 2 Moon Shards (a delver's cache) |
| Forager Wren         | Nature    | Rot ate her mushroom rings (grove)        | Barter: plant 8 green          | 2 Herbs, 15 gil (Herb / Grove Charm)              |
| Fisher Tam           | Water     | Lurkers tore his nets (lake)              | Barter: weave 8 blue           | 25 gil, Ether (Herb / Tide Charm)                 |
| Foreman Brann        | Earth     | A rockslide buried the ridge road         | Barter: 10 orange, 6 violet    | Ridge road open, 40 gil (Ether / Well Stone)      |
| Apprentice Cinda     | Fire      | Must forge the peak gate's key for Torva  | Barter: 10 red, 6 orange       | Peak gate key, Ether (2 Herbs / Ember Charm)      |
| Armorer Garrick      | Fire      | The ore is back and his racks are full    | Haggle                         | Emberforge Armory (secret: Phoenix Feather)       |
| Innkeeper Rosa       | Fire      | Smiths sleep hard and pay late            | Haggle                         | The Cinder Rest (secret: Ether)                   |
| Beacon Keeper Ysolde | Lightning | The storm beacon went dark                | Barter: charge 10 gold         | 2 Ethers, 30 gil (2 Herbs / Storm Charm)          |
| Courier Finch        | Wind      | A gust scattered his letters (cliffs)     | Barter: catch 10 cyan          | 50 gil, Herb (Ether / Phoenix Feather)            |
| Warden Ada           | Wind      | Climbers rest at her lodge                | Haggle                         | Eyrie Lodge (secret: Wind Charm)                  |
| Scholar Ivo          | Arcane    | The moon rune over the tower went dark    | Barter: relight with 10 violet | 2 Ethers, 30 gil (2 Herbs / Moon Shard)           |

Spell tomes left the shops: mentors teach spells. Their items remain, so
a tome an old save holds can still be read. The sealed chest's Blizzard
tome became a delver's cache (Maren teaches Blizzard).

## Enemy roster

Art is mixed by area: cute Fantasy Dreamland creatures in the open world,
and bigger, scarier Pixel Battlers monsters underground.

| Area      | Enemy        | Lv  | HP  | Atk | Gauge | Element | Weak to       | Resists                | Kit                                                              | Drops        |
| --------- | ------------ | --- | --- | --- | ----- | ------- | ------------- | ---------------------- | ---------------------------------------------------------------- | ------------ |
| Overworld | Green Slime  | 1   | 66  | 6   | 8.5 s | Nature  | Fire, arcane  | Water, nature, earth   | Bounce 3 (×2), petrify 3 (Sticky Goo)                            | Slime Gel    |
| Overworld | Spore Shroom | 2   | 85  | 6   | 7.5 s | Nature  | Fire, arcane  | Water, nature, earth   | Headbutt 3 (×2), haste 3 (Spore Cloud), fog 3 (Spore Haze)       | Spore Cap    |
| Overworld | Goblin Scout | 3   | 100 | 6   | 8 s   | Earth   | Water, nature | Lightning, earth, wind | Stab 4 (×2), curse 1 (Rock Toss), seal 3 (Stake)                 | Goblin Charm |
| Lessons   | Wisps (×7)   | 2   | 50  | 5   | 9 s   | Each    | From chart    | From chart             | Lash 2 + one of their element's (Tide: fog 2; Gale: quicken 4 s) | —            |

**The mentor regions and the Moon Caves** (stats are placeholders for the
balance pass; region monsters grow at most 2 levels with the hero, the
caves' 3, the Wyrm 1). Overworld critters are Fantasy Dreamland enemies;
the bigger beasts are Pixel Battlers.

| Area                | Enemy         | Lv  | HP  | Atk | Gauge  | Element   | Weak to           | Resists                          | Kit                                                                                                                          | XP / gil | Drops               |
| ------------------- | ------------- | --- | --- | --- | ------ | --------- | ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| Thornwood Grove     | Sproutling    | 2   | 115 | 7   | 7.5 s  | Nature    | Fire, Arcane      | Water, Nature, Earth             | Root Slap 3, Sunbathe 8, Seed Pod 3                                                                                          | 9 / 6    | herb 30%            |
| Thornwood Grove     | Leaf Sprite   | 3   | 120 | 8   | 7.0 s  | Nature    | Fire, Arcane      | Water, Nature, Earth             | Leaf Cut 4, Pollen 3, Leaf Storm 3                                                                                           | 13 / 8   | sporeCap 20%        |
| Thornwood Grove     | Thorn Troll   | 4   | 160 | 9   | 10.0 s | Nature    | Fire, Arcane      | Water, Nature, Earth             | Thorn Club 7, Bramble 1, Moss Bed 12                                                                                         | 18 / 11  | herb 40%            |
| Glasswater Lake     | Drip          | 3   | 90  | 7   | 7.0 s  | Water     | Lightning, Nature | Fire, Water, Earth               | Splash 4, Lake Mist 3, Soak 3                                                                                                | 13 / 7   | ether 15%           |
| Glasswater Lake     | Lake Lurker   | 4   | 150 | 9   | 8.0 s  | Water     | Lightning, Nature | Fire, Water, Earth               | Bite 6, Undertow 3, Gulp 4                                                                                                   | 18 / 10  | herb 30%            |
| Glasswater Lake     | Tide Ogre     | 5   | 190 | 10  | 9.5 s  | Water     | Lightning, Nature | Fire, Water, Earth               | Wave Crash 8, Silt 2, Spray 3                                                                                                | 27 / 14  | ether 30%           |
| Redrock Quarry      | Goblin Digger | 4   | 125 | 9   | 8.0 s  | Earth     | Water, Nature     | Lightning, Earth, Wind           | Pick 5, Rock Toss 1, Stake 3                                                                                                 | 18 / 12  | goblinCharm 40%     |
| Redrock Quarry      | Quarry Hound  | 5   | 150 | 9   | 6.5 s  | Earth     | Water, Nature     | Lightning, Earth, Wind           | Maul 5, Pounce 4 s, Grit 4                                                                                                   | 27 / 13  | herb 30%            |
| Redrock Quarry      | Stone Ogre    | 6   | 180 | 11  | 12.0 s | Earth     | Water, Nature     | Lightning, Earth, Wind           | Boulder Slam 9, Landslide 2, Boulder 3                                                                                       | 38 / 17  | ether 40%           |
| Emberforge          | Cinder        | 5   | 160 | 10  | 6.5 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Flare 6, Kindle 3, Scorch 4                                                                                                  | 27 / 14  | herb 30%            |
| Emberforge          | Forge Imp     | 6   | 195 | 12  | 7.0 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Pitchfork 7, Bellows 4, Stoke 5 s                                                                                            | 38 / 17  | ether 30%           |
| Emberforge          | Magma Drake   | 7   | 300 | 13  | 9.0 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Magma Breath 12, Slag 2, Cinders 5                                                                                           | 56 / 22  | ether 40%           |
| Stormcrown Peaks    | Spark Pup     | 6   | 160 | 9   | 5.5 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Zap 5, Static 5 s, Jolt 3                                                                                                    | 38 / 16  | herb 30%            |
| Stormcrown Peaks    | Storm Goblin  | 7   | 180 | 11  | 7.0 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Shock Spear 8, Lightning Rod 2, Thunderhead 3                                                                                | 56 / 21  | ether 30%           |
| Stormcrown Peaks    | Thunderhide   | 8   | 240 | 11  | 9.5 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Thunder Slam 10, Roar 4, Storm Surge 6 s                                                                                     | 80 / 26  | ether 40%           |
| Windward Cliffs     | Puffball      | 7   | 200 | 12  | 6.0 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Puff 6, Dust Devil 3, Updraft 5 s                                                                                            | 56 / 20  | herb 30%            |
| Windward Cliffs     | Gale Bat      | 8   | 240 | 14  | 6.0 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Wing Cut 8, Gale 4, Downdraft 3                                                                                              | 80 / 24  | ether 30%           |
| Windward Cliffs     | Sky Ram       | 9   | 280 | 13  | 9.0 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Ram 10, Rockfall 1, Charge 4 s                                                                                               | 117 / 30 | ether 40%           |
| Moonfall Ruins      | Watcher       | 8   | 320 | 14  | 7.0 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Gaze 8, Stare 5, Mind Leech 5                                                                                                | 80 / 25  | herb 30%            |
| Moonfall Ruins      | Night Bat     | 9   | 290 | 16  | 6.5 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Night Bite 11, Moon Sip 5, Eclipse Wing 3, Leech 14                                                                          | 117 / 28 | moonShard 30%       |
| Moonfall Ruins      | Gloom Toad    | 10  | 440 | 17  | 8.5 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Tongue Lash 13, Hex 2, Gloom 5, Wallow 25                                                                                    | 170 / 34 | ether 40%           |
| Moon Caves          | Moon Imp      | 10  | 360 | 17  | 6.0 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Swoop 8, Leech Mana 4, Moon Dust 3, Flit 5 s                                                                                 | 170 / 30 | —                   |
| Moon Caves          | Shade Imp     | 11  | 340 | 18  | 7.0 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Moonbeam 9, Glimmer 12, Hex 1, Gloom 4                                                                                       | 240 / 36 | moonShard 30%       |
| Moon Caves          | Cave Brute    | 11  | 290 | 16  | 12.5 s | Earth     | Water, Nature     | Lightning, Earth, Wind           | Slam 8, Rubble 2, Boulder 3                                                                                                  | 240 / 40 | ether 40%           |
| Moon Caves · Depths | Moon Wyrm     | 13  | 460 | 14  | 8.0 s  | Arcane    | Fire, Wind        | Water, Lightning, Nature, Arcane | Lunar Breath 16, Tail Sweep 10, Crystal Tomb 2, Eclipse 4, Moon Drain 4, Moonfog 4, Starfall 6, Tidal Pull 3, Night Wind 6 s | 900 / 90 | phoenixFeather 100% |

The Moon Wyrm keeps everything from before (attacks twice as likely,
resists water, enrages at ½ HP with a 5 s gauge, 3-row curses and +4
attack), now at the end of the level curve, and as a boss it takes a damped
weakness bonus and makes each spell cost 25% of its gauge.

The seven wisps (Ember, Tide, Spark, Moss, Stone, Moon, Gale) are mentors'
trial foes, drawn as a slime recoloured to their element. Each lesson
difficulty above 1 adds 60% HP and 3 attack (and a level of gravity).
At difficulty 1 a hero below level 3 meets a gentler foe with 72% of its
HP (a wisp has 36).

**Gil**: cave monsters pay about 30% less than before (Moon Imp 7, Shade
Imp 11, Cave Brute 15, Moon Wyrm 42), so gil no longer piles up late
while Brightwater stays tight.

**The difficulty overhaul** (after bot playthroughs won 59–0 and 60–0):
monsters died in 1–4 single lines and acted only every 3–5 pieces, so the
board never needed planning. Now HP is roughly 3× (a fight is 30–60
pieces for a good stacker), single lines are weak, enemies act in real
time and attack the board, mistakes feed the enemy, failure costs HP,
and monsters grow with the hero. The Moon Wyrm wants preparation (a
level or two, items, a weakness spell) and usually a few attempts.

**Earlier history — balance after two full playthroughs** (Ranger, Knight; numbers since replaced by the overhaul above): the Moon Wyrm
fell first try at level 7, so it now has 300 HP (was 160) and attack 15
(13), and **enrages** below half HP: it acted every 2 pieces instead of 3
and its curse pushes 3 stone rows instead of 2 (generic
`EnemyDef.enrage`; the battle shows "Enraged!" and the wyrm glows a
pulsing red). Once enraged it stays so, even if it heals back above
half. Its gil fell to 60 (150). Cave XP rose so heroes reach the
lair around level 8–9: Moon Imp 22 (15), Shade Imp 30 (20), Cave Brute
40 (28). Gil still piled up (~330 at Brightwater, ~500 at the end), so
overworld gil fell 30%: Slime 4 (6), Spore Shroom 6 (9), Goblin Scout 10
(14); Moon Shards drop 30% of the time (50%) and Spore Caps 15% (60%).
Farmer Bea wants 7 green (8), which failed in all four runs. The Knight starts with 6
more base HP (42; 54 with Vitality 2) to soften a harsh opening.

## Progression

Mossvale (learn the challenge types) → overworld monsters (drops, levels)
→ Brightwater (shops, Thunder, earn the Cave Pass by barter) → Moon Caves
(sealed chest, hermit) → Moon Wyrm boss. Spells beyond the class spell
come from mentors, the Elder (Quake) and the sage (Thunder); shops sell no
tomes. The Sunken Ruins are sealed as the hook for the next region.

That road now runs through the seven mentor regions (see
[World and regions](#world-and-regions)): the grove and the lake, the
quarry and the forge town, then the peaks, the cliffs and the moonlit
ruins over the Moon Caves, so the Wyrm sits at the end of a curve from
level 1 to about 13.

## World and regions

"Why is everyone in the same area?" The realm was five small maps sharing
every person and monster. Each mentor now has a **home region** with its
own map, monsters, people and landmark, joined to the Realm (the hub, which
gained road exits west, east and south) or to the region before it.
Regions keep a level band (`REGIONS` in `src/data/balance.ts`; their
monsters grow at most 2 levels with the hero) and tilt the bag toward
their element.

| #   | Region (map)                     | Mentor, landmark   | Monster levels | Monsters                                   | People                                            | Reached from                                      | Gate                      |
| --- | -------------------------------- | ------------------ | -------------- | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| 0   | The Realm, Mossvale, Brightwater | (visits)           | 1–3            | Slime, Spore Shroom, Goblin Scout          | the old cast                                      | start                                             | —                         |
| 1   | Thornwood Grove (`grove`)        | Hazel, old oak     | 2–4            | Sproutling, Leaf Sprite, Thorn Troll       | Forager Wren                                      | Realm, west road                                  | —                         |
| 2   | Glasswater Lake (`lake`)         | Maren, jetty       | 3–5            | Drip, Lake Lurker, Tide Ogre               | Fisher Tam                                        | Realm, east road                                  | —                         |
| 3   | Redrock Quarry (`quarry`)        | Dorn, quarry lift  | 4–6            | Goblin Digger, Quarry Hound, Stone Ogre    | Foreman Brann                                     | Realm, south road                                 | —                         |
| 4   | Emberforge (`forge`)             | Torva, old forge   | 5–7            | Cinder, Forge Imp, Magma Drake             | Apprentice Cinda, Armorer Garrick, Innkeeper Rosa | quarry, ridge road                                | `ridgeCleared` (Brann)    |
| 5   | Stormcrown Peaks (`peaks`)       | Rook, storm beacon | 6–8            | Spark Pup, Storm Goblin, Thunderhide       | Beacon Keeper Ysolde                              | Realm, the tunnel north-east (once the cave seal) | `peakGate` (Cinda)        |
| 6   | Windward Cliffs (`cliffs`)       | Kestrel, eyrie     | 7–9            | Puffball, Gale Bat, Sky Ram                | Courier Finch, Warden Ada (inn)                   | peaks, west                                       | —                         |
| 7   | Moonfall Ruins (`ruins`)         | Selene, moon tower | 8–10           | Watcher, Night Bat, Gloom Toad             | Scholar Ivo                                       | cliffs, south-west                                | —                         |
| 8   | Moon Caves, Depths               | (visits)           | 10–11, Wyrm 13 | Moon Imp, Shade Imp, Cave Brute, Moon Wyrm | Cave Hermit, Sealed Chest                         | ruins, cave mouth                                 | `cavePass` (Captain Vale) |

- **Gates are people, never items**: each flag comes from an `essential`
  NPC (they deal even when Hostile) in a region the hero can already
  reach; the tests flood-fill the world flag by flag and check every map
  opens and every gate's flag is earned before it is needed. A locked
  warp says who holds the key.
- **Inns** in Brightwater, Emberforge and the cliffs' lodge; Emberforge's
  armory sells the next gear tier (Flame Brand, Forge Plate).
- **Moved**: the Moon Caves' entrance moved from the Realm into the
  Moonfall Ruins, and the old cave seal is now the tunnel gate to the
  peaks. Old saves load as they were (the caves' way out now leads to the
  ruins); a saved spot that is no longer walkable sends the hero to their
  inn (or the start). The Moon Caves' monsters moved up the level curve
  (Moon Imp 10, Shade Imp and Cave Brute 11, Moon Wyrm 13).
- **Moon Shards** (Eclipse, the hermit) also drop from the ruins' Night
  Bats and are Scholar Ivo's secret, so Selene's hidden spell no longer
  waits for the caves.
- **Art**: each region has its own theme (`src/ui/art/themes.ts`): the
  ground sheet's other grasses and sand, recoloured ash, frost, moon grass
  and red earth, animated lava (the water recoloured), and props from the
  Blacksmith, Castle, Dungeon, Enchanted Forest, Forest, Mountains and
  Desert packs, cropped and packed into one sheet by `tools/import_art.py`.

**The ending**: beating the Moon Wyrm sets `wyrmBeaten` and, after the
results (and the skill screen on a level-up), shows the chapter's end:
the hero's portrait, title element, level and spell count, portraits of
the mentors whose lessons the hero won, and Captain Vale's last word.
Lessons aren't recorded, so this is derived: only a lesson raises a spell
past level 1, and only a lesson teaches a spell that is neither a
starting spell nor an NPC's reward (an old save's tome is the one
exception). Back on the map the Sunken Ruins'
seal glows violet and, bumped, says it will open in the next chapter
(`Warp.stirs`); it stays shut. Routes gated on the wyrm
(`defeated:c2-wyrm`) still open as before.

## Planned: progression redesign

**Status: stages 1–6 are built and now documented in
[Elements](#elements), [Hero classes and alignment](#hero-classes-and-alignment),
[Stats and skill points](#stats-and-skill-points),
[Hero magic](#hero-magic), [Enhancements](#enhancements),
[Mentors](#mentors), [Hidden spells](#hidden-spells) and
[NPCs and attitude](#npcs-and-attitude). Only new content remains (see
below).** All numbers are starting values to tune in play.

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

Built (see [Hidden spells](#hidden-spells)): one per element, revealed by a
stat, alignment, a board feat, a quest or an item.

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
  at home) and replaces locked categories with the lost lesson behind each
  lock (`failedLessons`; older saves had none). v7 (built) adds the
  hero's lifetime board feats (`feats`; older saves start empty).
- **Removed**: attunement and the level 3 choice; spell tomes from shops
  (mentors teach spells).

### Build order

1. Element chart and alignment, replacing attunement. **Done.**
2. Stats, skill points and the level-up screen. **Done.**
3. Spell levels, enhancements and the category menu. **Done.**
4. Mentors, team-up battles, supports and combo spells. **Done.**
5. Hidden spells and their unlocks. **Done.**
6. NPC attitudes and the dialogue rewrite. **Done.**

Each stage ships with tests and keeps the game playable.

## Parked ideas

- **Colour-match clears** (Dr. Mario style): four or more crystals of one
  element in a row or column would pop on their own, beside the usual
  full-line clears. Dual pieces would make it a real placement game. Not
  built: it would change damage, mana and the board's pacing at once, so
  it needs its own balance pass.
