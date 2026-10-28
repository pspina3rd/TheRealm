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
  | Base damage      | 4   | 12  | 26  | 48  |
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
  - **Spells and items take time**: casting a spell fills 10% of the
    gauge (25% against a boss, so a full spell kit can't simply out-cast
    it) and using an item 40% (the gauge flashes white; a full gauge
    acts at once). At most **2 item uses per battle** (a bag with "1/2"
    leads the item list); a Herb heals 35% of max HP; a Phoenix Feather
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

- A Phoenix Feather revives you once at **35% HP**, automatically (one
  per fight, however many you carry), and the revive **counts as one of
  the fight's 2 item uses**: with both uses spent there is no revive.
  (It used to revive at half HP for free; prepared players won 97–100%
  of fights mostly because of it. The final balance pass raised the
  revive from 25% to 35% and the Herb from 25% to 35%, so preparing
  pays off again under the 2-use cap.)
- **Bosses damp weaknesses**: a boss takes `BOSS_WEAKNESS_SHARE` (75%) of
  a weak crystal's bonus (+37.5% instead of +50%, and Fault Line likewise)
  and `BOSS_SPELL_WEAKNESS_SHARE` (none) of a weak spell's: Fire or Gale
  hit the Moon Wyrm ×1, not ×1.5. (At 75% the full kit's Fire won 43% of
  first tries against a 20–30% target; see the story pass below.)
- **Failure costs**: losing a fight sends you back to the last inn you
  rested at with **30% HP** (50% in Mossvale, the home village, whose
  healer looks after beginners) and half your gil (no free heal). Normal
  monsters reappear when you leave the map; bosses stay beaten. So a
  broke, battered hero never soft-locks, **walking heals 1 HP per step
  while below half HP**; the inn (10 gil) restores the rest. A
  **beginner** (below level 4) walking in the starter lands (Mossvale
  and Sevenstones, `STARTER_MAPS`) heals up to **80%** instead: a playtest
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
and each region's level band (the gravity curve and `PIECE_MS` are
defined in `src/core/scoring.ts`, since the core layer never imports
data, and re-exported from `balance.ts`). Enemy stat blocks stay in
`src/data/enemies.ts`. The XP curve: level 2 takes 44 XP and each level
1.45× the last (it was 30, which put the hero a level ahead of every
region's entry level). Once the hero stands above the effective level, XP falls 25%
per level (at least 10%); bosses' XP never falls off. The stage shows the
level it fights at ("Lv4") left of its HP bar.

### Balance (simulated)

`tests/sim/simulate.ts` plays the real `Battle` on simulated time with
bots that take a set time per piece (`PACE`, default 1.5 s, the keyboard
pace; a phone player takes about 2.2 s, since a touch placement is
0.6–0.8 s of finger movement, 1.5–2× the keys). Like a person, a bot
hurries when the piece is about to land (2 rows above its landing spot,
under haste, quicken or late gravity), but never faster than 40% of its
pace; before this the slow bots let fast pieces lock wherever they fell,
which alone made the Moon Wyrm 10% at touch pace. The bots:

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
and prints one table (`RUNS` seeds per cell, default 12; `PACE` ms per
piece; `AREAS` limits it to some map ids and/or `lessons`; `SIM_OUT=file`
also writes it). It also prints the **one-pass economy**
(`tests/sim/economy.ts`): the hero walks the regions in order, beats every
monster once at the hero's level, takes each person's gil once and buys
the region's main gear as soon as it can. The tests check that
hard-dropping in place loses every ordinary fight.

**The final balance pass** (30 seeds per cell). Baseline, at the touch
pace: region fights 27–77% for the good bot (the slow bot also let fast
pieces lock where they fell; with it hurrying like a person, 37–80%),
prepared barely above good, singles 10–60%, the Ember Wisp's lessons
30–57%, the Moon Wyrm 53% (good) and 90% (prepared, keyboard), the caves
93–100%, and the hero a level ahead of every region's entry level. One
planned set of changes, then one small correction:

- **Regions**: monster HP down 7–20% (the most where fights ran long at
  touch pace), a few gauges slowed (Leaf Sprite, Lake Lurker, Tide Ogre,
  Forge Imp, Magma Drake, Gale Bat, Gloom Toad) and the opening softened
  (Green Slime 58 HP, attack 4; Spore Shroom attack 5). The caves hit
  harder and faster (attack 21–22, gauges 5.4–11 s) with a little more
  HP; they were the easiest fights in the game.
- **Moon Wyrm**: 490 HP (460), attack 17 (14), gauge 6.8 s (8 s; enraged
  4.6 s), Lunar Breath 18 (16).
- **Rules**: a single line strikes 4 (3); a spell fills 10% of the gauge
  (15%; a boss still 25%); a Herb heals 35% (25%) and the Feather revives
  at 35% (25%), so preparing pays off; the Ember Wisp's special is a haste
  instead of a second attack.
- **XP and gil**: level 2 takes 44 XP (30); ruins and caves XP up, caves
  gil down (see the roster); the first slimes pay a little more XP so a
  broke beginner reaches level 2 after four of them.

Final run at the **touch pace** (2.2 s a piece), which the targets aim at:

| Area                | Fight         | Hero Lv | Good (starter spells) | Good (full kit) | Prepared | Prepared (full kit) | Singles + spells | Sloppy | Good: time / pieces | Good: HP left |
| ------------------- | ------------- | ------- | --------------------- | --------------- | -------- | ------------------- | ---------------- | ------ | ------------------- | ------------- |
| Sevenstones         | Green Slime   | 1       | 90%                   | 73%             | 87%      | 90%                 | 93%              | 0%     | 63 s / 29           | 53%           |
| Sevenstones         | Spore Shroom  | 2       | 90%                   | 93%             | 100%     | 100%                | 87%              | 0%     | 72 s / 33           | 63%           |
| Sevenstones         | Goblin Scout  | 3       | 80%                   | 67%             | 73%      | 93%                 | 53%              | 0%     | 80 s / 38           | 56%           |
| Thornwood Grove     | Sproutling    | 2       | 67%                   | 63%             | 70%      | 83%                 | 57%              | 0%     | 77 s / 35           | 64%           |
| Thornwood Grove     | Leaf Sprite   | 3       | 77%                   | 90%             | 83%      | 100%                | 70%              | 0%     | 73 s / 34           | 49%           |
| Thornwood Grove     | Thorn Troll   | 4       | 77%                   | 80%             | 80%      | 90%                 | 57%              | 0%     | 96 s / 45           | 55%           |
| Glasswater Lake     | Drip          | 3       | 67%                   | 83%             | 87%      | 87%                 | 63%              | 0%     | 71 s / 32           | 57%           |
| Glasswater Lake     | Lake Lurker   | 4       | 73%                   | 73%             | 73%      | 83%                 | 60%              | 0%     | 94 s / 44           | 55%           |
| Glasswater Lake     | Tide Ogre     | 5       | 70%                   | 70%             | 93%      | 87%                 | 53%              | 0%     | 96 s / 47           | 54%           |
| Redrock Quarry      | Goblin Digger | 4       | 73%                   | 70%             | 70%      | 90%                 | 50%              | 3%     | 87 s / 42           | 56%           |
| Redrock Quarry      | Quarry Hound  | 5       | 73%                   | 90%             | 80%      | 83%                 | 73%              | 0%     | 89 s / 42           | 58%           |
| Redrock Quarry      | Stone Ogre    | 6       | 90%                   | 90%             | 80%      | 90%                 | 63%              | 0%     | 114 s / 55          | 59%           |
| Forgefyre           | Cinder        | 5       | 70%                   | 90%             | 80%      | 80%                 | 57%              | 0%     | 78 s / 36           | 54%           |
| Forgefyre           | Forge Imp     | 6       | 67%                   | 77%             | 67%      | 87%                 | 50%              | 0%     | 82 s / 40           | 51%           |
| Forgefyre           | Magma Drake   | 7       | 57%                   | 67%             | 83%      | 80%                 | 43%              | 0%     | 103 s / 51          | 54%           |
| Stormcrown Peaks    | Spark Pup     | 6       | 77%                   | 77%             | 80%      | 87%                 | 50%              | 0%     | 98 s / 49           | 50%           |
| Stormcrown Peaks    | Storm Goblin  | 7       | 70%                   | 90%             | 93%      | 90%                 | 77%              | 0%     | 128 s / 64          | 50%           |
| Stormcrown Peaks    | Thunderhide   | 8       | 73%                   | 83%             | 93%      | 97%                 | 70%              | 0%     | 119 s / 62          | 60%           |
| Windward Cliffs     | Puffball      | 7       | 90%                   | 83%             | 87%      | 97%                 | 70%              | 0%     | 110 s / 55          | 54%           |
| Windward Cliffs     | Gale Bat      | 8       | 70%                   | 87%             | 83%      | 97%                 | 57%              | 0%     | 111 s / 56          | 49%           |
| Windward Cliffs     | Sky Ram       | 9       | 73%                   | 97%             | 97%      | 100%                | 90%              | 0%     | 156 s / 80          | 57%           |
| Moonfall Ruins      | Watcher       | 8       | 70%                   | 70%             | 77%      | 87%                 | 40%              | 0%     | 128 s / 61          | 47%           |
| Moonfall Ruins      | Night Bat     | 9       | 73%                   | 73%             | 90%      | 90%                 | 63%              | 0%     | 131 s / 63          | 51%           |
| Moonfall Ruins      | Gloom Toad    | 10      | 77%                   | 93%             | 73%      | 83%                 | 20%              | 0%     | 161 s / 80          | 47%           |
| Moon Caves          | Moon Imp      | 10      | 67%                   | 87%             | 87%      | 83%                 | 67%              | 0%     | 157 s / 82          | 46%           |
| Moon Caves          | Shade Imp     | 11      | 67%                   | 87%             | 87%      | 90%                 | 37%              | 0%     | 159 s / 82          | 54%           |
| Moon Caves          | Cave Brute    | 11      | 77%                   | 70%             | 93%      | 90%                 | 60%              | 0%     | 160 s / 84          | 48%           |
| Moon Caves · Depths | Shade Imp     | 11      | 67%                   | 87%             | 87%      | 90%                 | 37%              | 0%     | 159 s / 82          | 54%           |
| Moon Caves · Depths | Moon Wyrm     | 13      | 20%                   | 43%             | 40%      | 57%                 | 10%              | 0%     | 156 s / 85          | 34%           |
| Lesson              | Ember Wisp d1 | 1       | 100%                  | 93%             | 97%      | 100%                | 100%             | 27%    | 49 s / 22           | 59%           |
| Lesson              | Tide Wisp d1  | 1       | 90%                   | 97%             | 100%     | 97%                 | 97%              | 20%    | 48 s / 22           | 70%           |
| Lesson              | Gale Wisp d1  | 1       | 97%                   | 90%             | 97%      | 100%                | 100%             | 17%    | 47 s / 21           | 65%           |
| Lesson              | Ember Wisp d2 | 3       | 93%                   | 97%             | 97%      | 100%                | 97%              | 17%    | 71 s / 33           | 54%           |
| Lesson              | Tide Wisp d2  | 3       | 97%                   | 93%             | 97%      | 100%                | 93%              | 0%     | 79 s / 37           | 53%           |
| Lesson              | Gale Wisp d2  | 3       | 87%                   | 97%             | 100%     | 97%                 | 100%             | 3%     | 66 s / 31           | 54%           |
| Lesson              | Ember Wisp d3 | 5       | 97%                   | 100%            | 100%     | 97%                 | 97%              | 7%     | 80 s / 37           | 59%           |
| Lesson              | Tide Wisp d3  | 5       | 100%                  | 97%             | 100%     | 100%                | 97%              | 0%     | 88 s / 41           | 62%           |
| Lesson              | Gale Wisp d3  | 5       | 97%                   | 100%            | 100%     | 97%                 | 97%              | 0%     | 73 s / 34           | 64%           |

The same at the **keyboard pace** (1.5 s a piece): keyboard players are
stronger, region fights 80–97% for the good bot and the Wyrm 50% (good)
and 80% (prepared). At a mix (1.85 s) the Wyrm is 40% good, 30% full kit,
70% prepared, 27% singles.

| Area                | Fight         | Hero Lv | Good (starter spells) | Good (full kit) | Prepared | Prepared (full kit) | Singles + spells | Sloppy | Good: time / pieces | Good: HP left |
| ------------------- | ------------- | ------- | --------------------- | --------------- | -------- | ------------------- | ---------------- | ------ | ------------------- | ------------- |
| Sevenstones         | Green Slime   | 1       | 97%                   | 97%             | 97%      | 93%                 | 100%             | 3%     | 39 s / 25           | 71%           |
| Sevenstones         | Spore Shroom  | 2       | 90%                   | 100%            | 93%      | 100%                | 90%              | 0%     | 55 s / 37           | 70%           |
| Sevenstones         | Goblin Scout  | 3       | 93%                   | 90%             | 97%      | 100%                | 90%              | 0%     | 59 s / 41           | 68%           |
| Thornwood Grove     | Sproutling    | 2       | 83%                   | 90%             | 97%      | 97%                 | 77%              | 0%     | 54 s / 36           | 70%           |
| Thornwood Grove     | Leaf Sprite   | 3       | 83%                   | 100%            | 90%      | 97%                 | 67%              | 0%     | 58 s / 39           | 63%           |
| Thornwood Grove     | Thorn Troll   | 4       | 97%                   | 87%             | 100%     | 100%                | 83%              | 0%     | 65 s / 44           | 64%           |
| Glasswater Lake     | Drip          | 3       | 90%                   | 83%             | 93%      | 93%                 | 93%              | 0%     | 50 s / 34           | 66%           |
| Glasswater Lake     | Lake Lurker   | 4       | 97%                   | 90%             | 93%      | 100%                | 83%              | 0%     | 69 s / 47           | 57%           |
| Glasswater Lake     | Tide Ogre     | 5       | 93%                   | 90%             | 93%      | 97%                 | 87%              | 0%     | 74 s / 51           | 52%           |
| Redrock Quarry      | Goblin Digger | 4       | 93%                   | 90%             | 93%      | 93%                 | 90%              | 0%     | 63 s / 43           | 65%           |
| Redrock Quarry      | Quarry Hound  | 5       | 87%                   | 97%             | 97%      | 97%                 | 87%              | 0%     | 73 s / 50           | 57%           |
| Redrock Quarry      | Stone Ogre    | 6       | 90%                   | 100%            | 100%     | 100%                | 90%              | 0%     | 83 s / 60           | 63%           |
| Forgefyre           | Cinder        | 5       | 87%                   | 90%             | 93%      | 87%                 | 77%              | 0%     | 60 s / 40           | 60%           |
| Forgefyre           | Forge Imp     | 6       | 80%                   | 87%             | 93%      | 97%                 | 63%              | 0%     | 66 s / 45           | 58%           |
| Forgefyre           | Magma Drake   | 7       | 83%                   | 93%             | 93%      | 93%                 | 73%              | 0%     | 82 s / 58           | 56%           |
| Stormcrown Peaks    | Spark Pup     | 6       | 87%                   | 97%             | 93%      | 100%                | 97%              | 0%     | 74 s / 53           | 55%           |
| Stormcrown Peaks    | Storm Goblin  | 7       | 90%                   | 93%             | 97%      | 93%                 | 97%              | 0%     | 84 s / 60           | 59%           |
| Stormcrown Peaks    | Thunderhide   | 8       | 90%                   | 93%             | 100%     | 100%                | 93%              | 0%     | 94 s / 68           | 62%           |
| Windward Cliffs     | Puffball      | 7       | 97%                   | 93%             | 100%     | 100%                | 90%              | 0%     | 87 s / 62           | 59%           |
| Windward Cliffs     | Gale Bat      | 8       | 90%                   | 93%             | 100%     | 97%                 | 77%              | 0%     | 79 s / 56           | 59%           |
| Windward Cliffs     | Sky Ram       | 9       | 97%                   | 100%            | 100%     | 100%                | 93%              | 0%     | 93 s / 67           | 70%           |
| Moonfall Ruins      | Watcher       | 8       | 83%                   | 90%             | 97%      | 97%                 | 70%              | 0%     | 87 s / 60           | 57%           |
| Moonfall Ruins      | Night Bat     | 9       | 90%                   | 97%             | 100%     | 97%                 | 87%              | 0%     | 111 s / 78          | 55%           |
| Moonfall Ruins      | Gloom Toad    | 10      | 97%                   | 93%             | 93%      | 97%                 | 73%              | 0%     | 112 s / 79          | 58%           |
| Moon Caves          | Moon Imp      | 10      | 93%                   | 87%             | 100%     | 100%                | 90%              | 0%     | 99 s / 72           | 60%           |
| Moon Caves          | Shade Imp     | 11      | 100%                  | 93%             | 100%     | 100%                | 80%              | 0%     | 111 s / 79          | 60%           |
| Moon Caves          | Cave Brute    | 11      | 93%                   | 97%             | 100%     | 100%                | 97%              | 0%     | 125 s / 92          | 50%           |
| Moon Caves · Depths | Shade Imp     | 11      | 100%                  | 93%             | 100%     | 100%                | 80%              | 0%     | 111 s / 79          | 60%           |
| Moon Caves · Depths | Moon Wyrm     | 13      | 50%                   | 57%             | 80%      | 77%                 | 27%              | 0%     | 134 s / 102         | 31%           |
| Lesson              | Ember Wisp d1 | 1       | 100%                  | 100%            | 100%     | 100%                | 100%             | 30%    | 32 s / 21           | 75%           |
| Lesson              | Tide Wisp d1  | 1       | 100%                  | 97%             | 100%     | 100%                | 100%             | 17%    | 34 s / 23           | 76%           |
| Lesson              | Gale Wisp d1  | 1       | 100%                  | 97%             | 100%     | 100%                | 100%             | 30%    | 29 s / 19           | 75%           |
| Lesson              | Ember Wisp d2 | 3       | 100%                  | 100%            | 100%     | 100%                | 100%             | 10%    | 41 s / 27           | 71%           |
| Lesson              | Tide Wisp d2  | 3       | 100%                  | 93%             | 93%      | 100%                | 97%              | 0%     | 52 s / 34           | 71%           |
| Lesson              | Gale Wisp d2  | 3       | 97%                   | 97%             | 100%     | 100%                | 100%             | 3%     | 42 s / 28           | 72%           |
| Lesson              | Ember Wisp d3 | 5       | 100%                  | 100%            | 100%     | 100%                | 100%             | 17%    | 48 s / 32           | 74%           |
| Lesson              | Tide Wisp d3  | 5       | 100%                  | 100%            | 100%     | 100%                | 100%             | 3%     | 58 s / 39           | 76%           |
| Lesson              | Gale Wisp d3  | 5       | 100%                  | 100%            | 100%     | 100%                | 100%             | 3%     | 43 s / 28           | 77%           |

**Economy and levels** (one pass, no grinding, losses or herbs): the hero
enters each region at its entry level and meets the Wyrm at 12. Gil left
at each exit stays at or under ~150 until the depths (174 there, 264
after the Wyrm, with nothing left to buy). The Knight Blade (150) waits a
region, and the forge's Flame Brand and Forge Plate (480 together) are
bought over the peaks, cliffs and ruins: one pass of per-fight gil inside
the target bands can't pay for them sooner, so a player who wants them
early grinds a little.

| Area                | Hero Lv entering | XP gained | Gil in | Gil spent | Gil left at exit | Still wanted               |
| ------------------- | ---------------- | --------- | ------ | --------- | ---------------- | -------------------------- |
| Sevenstones         | 1                | 104       | 115    | 52        | 88               | —                          |
| Thornwood Grove     | 2                | 91        | 71     | 30        | 129              | —                          |
| Glasswater Lake     | 3                | 117       | 87     | 200       | 16               | —                          |
| Redrock Quarry      | 4                | 168       | 124    | 10        | 130              | knightBlade                |
| Forgefyre           | 5                | 242       | 106    | 160       | 76               | flameBrand, forgePlate     |
| Stormcrown Peaks    | 6                | 348       | 156    | 230       | 2                | flameBrand, phoenixFeather |
| Windward Cliffs     | 7                | 506       | 198    | 70        | 130              | flameBrand                 |
| Moonfall Ruins      | 8                | 1140      | 204    | 298       | 36               | —                          |
| Moon Caves          | 10               | 2220      | 124    | 30        | 130              | —                          |
| Moon Caves · Depths | 11               | 880       | 44     | 0         | 174              | —                          |
| Moon Wyrm           | 12               | 900       | 90     | 0         | 264              | —                          |

**The opening** (a broke level 1 Ranger, no sword, touch pace, good bot):
a slime is won 90% at full HP and 80% at the 80% a beginner walks back up
to (a casual "tidy" player 70% / 47%); a level 2 Spore Shroom 60% at 80% HP
(it is meant for level 2); a Copper Sword adds only a few points. Starting
a fight at half HP is where the old death spiral came from (37% against a
slime), which the beginner's 80% walk-regen avoids.

#### Balance targets (approved)

What the balance pass aims for. Regular fights and lessons as first drafted;
the Moon Wyrm was made harder at the user's request (expect several attempts).

| Area                  | Hero level entering | Good (starter spells) | Good (full kit) | Prepared | Singles + spells | Sloppy    | Fight length (good) | Gil in (per fight) / out (main buys)     | Actual, touch pace (final pass)                                           |
| --------------------- | ------------------- | --------------------- | --------------- | -------- | ---------------- | --------- | ------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Sevenstones           | 1                   | 80–90%                | —               | 95%+     | 70–85%           | under 15% | 40–70 s             | 4–10 / Copper Sword 22, inn 10           | G 80–90 · K 67–93 · P 73–100 · S 53–93 · Sl 0 · 63–80 s (keys: G 90–97)   |
| Thornwood Grove       | 2                   | 75–85%                | —               | 90%+     | 65–80%           | under 10% | 50–80 s             | 6–11 / herbs                             | G 67–77 · K 63–90 · P 70–83 · S 57–70 · Sl 0 · 73–96 s (keys: G 83–97)    |
| Glasswater Lake       | 3                   | 75–85%                | —               | 90%+     | 65–80%           | under 10% | 50–90 s             | 7–14 / Iron Sword 80, Crystal Mail 90    | G 67–73 · K 70–83 · P 73–93 · S 53–63 · Sl 0 · 71–96 s (keys: G 90–97)    |
| Redrock Quarry        | 4                   | 70–85%                | 80–90%          | 90%+     | 60–75%           | under 10% | 60–100 s            | 12–17 / Knight Blade 150                 | G 73–90 · K 70–90 · P 70–80 · S 50–73 · Sl 0–3 · 87–114 s (keys: G 87–93) |
| Forgefyre             | 5                   | 70–85%                | 80–90%          | 90%+     | 60–75%           | under 10% | 60–100 s            | 14–22 / Flame Brand 260, Forge Plate 220 | G 67–73 · K 73–90 · P 73–93 · S 57–73 · Sl 0 · 75–98 s (keys: G 80–87)    |
| Stormcrown Peaks      | 6                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 70–110 s            | 16–26 / inn, Feathers 30                 | G 70–77 · K 77–90 · P 80–93 · S 50–77 · Sl 0 · 98–128 s (keys: G 87–90)   |
| Windward Cliffs       | 7                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 70–110 s            | 20–30 / inn, Feathers 30                 | G 70–90 · K 83–97 · P 83–97 · S 57–90 · Sl 0 · 110–156 s (keys: G 90–97)  |
| Moonfall Ruins        | 8                   | 70–80%                | 80–90%          | 85–95%   | 55–70%           | under 5%  | 80–120 s            | 25–34 / Ethers                           | G 70–77 · K 70–93 · P 73–90 · S 20–63 · Sl 0 · 128–161 s (keys: G 83–97)  |
| Moon Wyrm (first try) | 12–13               | 15–20%                | 20–30%          | 35–45%   | 5–15%            | 0%        | 100–140 s           | 90                                       | Lv 12 · G 20 · K 33 · P 28 · S 0 · Sl 0 · 166 s (keys: G 50, P 80)        |
| Mentor lessons        | at need             | 85–100%               | —               | —        | 75–100%          | 0–20%     | 30–60 s             | —                                        | G 87–100 · S 93–100 · Sl 0–27 · 47–88 s (keys: G 97–100)                  |

Actual: win rates in % for Good (G), Good with the full kit (K),
Prepared (P), Singles + spells (S) and Sloppy (Sl) at the touch pace
(2.2 s a piece), the good bot's fight length, and the good bot at the
keyboard pace (1.5 s). Misses: Forgefyre's good bot (67–73% after the
story pass, from 57–70%), the ruins' singles (20% against the healing Gloom
Toad), prepared below 90% in the early regions (the 2-use cap leaves one
Herb after the Ether), touch fights running 10–40 s longer than the
length targets (keyboard fights sit inside them), the Wyrm after the
story pass (prepared 28% against 35–45%, full kit 33% against 20–30%,
singles 0% (from 10%) against 5–15%; not tuned further, since the Wyrm's
role changes in the planned second half, which gets its own balance pass),
and the Ember and Gale Wisps' first lessons for the sloppy bot (27%).

"Prepared" means 5 Herbs, an Ether and a Feather with the 2-use cap.
Gil should cover each region's gear by the time the next one opens, with
no more than ~150 gil unspent (the old playtests left 300–400).

#### Story pass (balance misses)

Two small changes for the last pass's misses, re-simulated at the touch
pace (2.2 s a piece) with `AREAS=caves2,forge PACE=2200 npm run sim`:
30 runs a cell for Forgefyre, 60 for the Wyrm (30 runs leave about ±9
points of noise).

- **Moon Wyrm**: a spell on a boss's weakness gets no weakness bonus
  (`BOSS_SPELL_WEAKNESS_SHARE` 0: Fire and Gale hit the Wyrm ×1); weak
  crystals keep `BOSS_WEAKNESS_SHARE` (75%). The crystal bonus now follows
  the element chart rather than the spell multiplier, so it survives.
- **Forgefyre**: Cinder 150 → 140 HP; Forge Imp 165 → 150 HP, attack 12 → 11;
  Magma Drake 250 → 210 HP, attack 13 → 12.

| Fight       | Good (starter) | Good (full kit) | Prepared | Prepared (kit) | Singles  | Sloppy | Good: time  |
| ----------- | -------------- | --------------- | -------- | -------------- | -------- | ------ | ----------- |
| Cinder      | 70% → 73%      | 90% → 90%       | 80 → 83% | 80 → 80%       | 57 → 73% | 0%     | 78 → 75 s   |
| Forge Imp   | 67% → 73%      | 77% → 80%       | 67 → 73% | 87 → 90%       | 50 → 57% | 0%     | 82 → 77 s   |
| Magma Drake | 57% → 67%      | 67% → 73%       | 83 → 93% | 80 → 90%       | 43 → 57% | 0%     | 103 → 98 s  |
| Moon Wyrm   | 20% → 20%      | 43% → 33%       | 40 → 28% | 57 → 38%       | 10 → 0%  | 0%     | 156 → 166 s |

Tried on the way (30 runs each): spell share 0.25 (Wyrm G 20, K 37, P 33)
and 0.1 (G 27, K 37, P 30); with weak crystals damped too, crystal share
0.6 (G 13, K 37, P 33) and 0.5 (G 13, K 30, P 37), which push the starter
row under 15%. The damping alone lands the full kit at 33%, just over the
20–30% target, and the prepared bot falls to 28% (target 35–45%): the
next lever is the Wyrm's own numbers, not its weakness. The Magma
Drake's good bot (67%) is still just under 70%.

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
  Casting closes the menu and takes time (the enemy's gauge jumps 10%). Tooltips give a short
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

**What a mentor says** as the hero walks up is one of the script's rows,
in the hero's mood with the mentor's element (their attitude score, as for
an NPC of that element), rotating like any line. The first that applies
(`mentorMoment`, `src/game/mentorLines.ts`):

1. _If you failed their lesson_: while a lost lesson locks their category.
2. _Seeks you out_: while they seek the hero (a board feat they noticed,
   see Hidden spells).
3. _Arrives somewhere new_: the first talk since they moved to a new stop
   away from home, once the hero has met them somewhere else. Where the
   hero last talked with each mentor is kept as a flag
   (`met:<mentor>:<stop>`), so it is said once per new stop.
4. _After the lesson_: once one of their lessons is won (derived like the
   chapter's summary, see `mentorsTaught`).
5. Otherwise why they teach (said on meeting).

The _At the Road Back_ row is stored for the second half and not said yet.

| Mentor  | Element   | Why they teach                                 | Home region, landmark (trial foe)   | Route after home                                                                             | Moves every |
| ------- | --------- | ---------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| Torva   | Fire      | Her hands shake too much for the forge now     | Forgefyre, old forge (Ember Wisp)   | Quarry, ridge road · Brightwater · Mossvale · Moon Caves¹                                    | 4 wins      |
| Maren   | Water     | The lake is clouding; she can't watch it alone | Glasswater Lake, jetty (Tide)       | Brightwater fountain · Grove pond · Mossvale                                                 | 5 wins      |
| Rook    | Lightning | Storms roll off the peaks faster every year    | Stormcrown Peaks, beacon (Spark)    | Cliff road · Sevenstones, north-east · Brightwater · Moon Caves¹ · Depths²                   | 3 wins      |
| Hazel   | Nature    | Spores are choking her meadows                 | Thornwood Grove, old oak (Moss)     | Sevenstones, west meadow · Mossvale · Lake meadow                                            | 6 wins      |
| Dorn    | Earth     | The caves took his crew                        | Redrock Quarry, quarry lift (Stone) | Sevenstones, tunnel gate · Forgefyre ridge · Moon Caves¹ · Depths¹ · Brightwater             | 4 wins      |
| Selene  | Arcane    | Something below drinks the moonlight           | Moonfall Ruins, moon tower (Moon)   | Cliff path · Brightwater · Depths¹                                                           | 5 wins      |
| Kestrel | Wind      | Her letters must reach every village           | Windward Cliffs, eyrie (Gale)       | Peaks, high pass · Sevenstones, south road · Mossvale · Brightwater · Sevenstones, east road | 3 wins      |

Every mentor lives in their own region (see [World and regions](#world-and-regions))
and travels to the neighbouring region and the starter towns, so each has
a stop a brand-new hero can walk to (the tests check it): a class mentor
whose home is still behind a gate comes through Brightwater, Mossvale or
Sevenstones within a few wins. While a mentor is at home behind a gate the
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
Focus Stone (earth) from Elder Rowan in the Refusal;
the Grove Charm (nature), the Moon Charm (arcane) and Pip's Wind Charm as
Devoted secrets (see [NPCs and attitude](#npcs-and-attitude)).

## Hidden spells

Seven spells, one per element, appear on no list until something the hero
does reveals them. Each has a single level and can't be enhanced; once
revealed, its element's mentor teaches it (difficulty one above the usual:
2, or 3 for Volcano). Code: `hidden` on the spell (`src/data/spells.ts`),
`src/game/hidden.ts` and `src/game/feats.ts`.

| Spell          | Element   | Kind               | Cost            | Effect                                                                                 | Unlock    | Condition (for developers)                                    |
| -------------- | --------- | ------------------ | --------------- | -------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| Volcano        | Fire      | Combo (fire+earth) | 6 fire, 6 earth | Clears the bottom 3 rows, 40 fire damage (no level bonus)                              | Alignment | Fire 4 and earth 4                                            |
| Purify         | Water     | Support            | 5 water         | Every stone on the board becomes a water crystal                                       | Quest     | Shrine Keeper Myst's barter in Brightwater (`shrineRestored`) |
| Ball Lightning | Lightning | Support            | 6 lightning     | 2 damage per lightning crystal on the board (no level bonus)                           | Pattern   | 2 pure lightning lines over the hero's life                   |
| Bloom          | Nature    | Support            | 7 nature        | Heals 6 after each of the next 8 pieces                                                | Item      | Bring a Spore Cap to Hazel                                    |
| Fault Line     | Earth     | Support            | 5 earth         | For 4 pieces every element strikes as a weakness (on a boss: crystals only, spells ×1) | Stat      | Insight 5                                                     |
| Eclipse        | Arcane    | Support            | 9 arcane        | 36 damage, heals all of it                                                             | Item      | Bring a Moon Shard to Selene                                  |
| Tempest        | Wind      | Support            | 7 wind          | 34 damage, tailwind 8 (cancels haste)                                                  | Pattern   | A clear of 2+ lines at once under the enemy's haste           |

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

No discount buys below resale: a bought item costs at least its sell
price (and at least 1 gil), so a cheap haggle and a grinning keeper can't
be chained into buy-then-sell profit. Services (the inn) can't be resold,
so their discounts are unrestricted.

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
  Cave Pass; Shrine Keeper Myst's spring, which reveals Purify) are
  `essential`: when Hostile they still deal, at Wary terms, with their curt
  lines. The tests check every flag a warp or hidden spell needs comes from
  such an NPC. Everyone else may refuse; nothing they give is required.
- **Known spells**: a spell reward names an `instead`, given to a hero who
  already knows the spell (the Knight gets 40 gil from the Elder, the
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
line shows over the map. Any line may hold several variants, which the
speaker rotates through, and `*stage directions*` (see [Story](#story)).

| NPC                   | Element   | Need                                      | Challenge                      | Reward (bonus / secret)                           |
| --------------------- | --------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Elder Rowan           | Earth     | Spores choke the village well             | Puzzle: clear the spore field  | Quake, or the Focus Stone (Ether / Spore Cap)     |
| Farmer Bean           | Nature    | Blight left her herb beds bare            | Barter: plant 7 green          | 2 Herbs (Herb / Grove Charm)                      |
| Pip                   | Wind      | His crystal tower is jammed before supper | Puzzle: unjam the tower        | Ether (Herb / Wind Charm)                         |
| Shopkeeper Ordor      | Nature    | Makes his living at the stall             | Haggle                         | Mossvale Stall (secret: Iron Sword)               |
| Merchant Lo           | Water     | Must clear stock before the barges come   | Haggle                         | Brightwater Goods (secret: Crystal Mail)          |
| Smith Pyre            | Fire      | The forge eats coal faster than she sells | Haggle                         | Ember Forge (secret: Pyre's Hammer)               |
| Innkeeper Pete        | Fire      | Empty rooms since the caves closed        | Haggle                         | The Sleeping Lantern (secret: Phoenix Feather)    |
| Sage Orrin            | Lightning | The storm broke his roof lattice          | Puzzle: rebuild the lattice    | Thunder, or a Storm Charm (Ether / 2 Ethers)      |
| Captain Vale          | Earth     | The cave ward lamps are dying             | Barter: 8 blue, 8 violet       | Cave Pass, 20 gil (Herb / Phoenix Feather)        |
| Collector Nim         | Wind      | Goblin Charms for his cabinet, but clean  | Offering: clean a Goblin Charm | 45 gil (Ether / Moon Shard)                       |
| Shrine Keeper Myst    | Water     | The shrine spring clouded with the lake   | Barter: 10 blue, 6 green       | Spring restored, Ether (Ether / Tide Charm)       |
| Steve the Cave Hermit | Arcane    | Grinds Moon Shards into salves            | Offering: grind a Moon Shard   | 2 Ethers, 2 Herbs (Herb / Moon Charm)             |
| Sealed Chest          | Arcane    | (a thing)                                 | Puzzle: break the seal         | Phoenix Feather, 2 Moon Shards (a delver's cache) |
| Forager Wren          | Nature    | Rot ate her mushroom rings (grove)        | Barter: plant 8 green          | 2 Herbs, 15 gil (Herb / Grove Charm)              |
| Fisher Tam            | Water     | Lurkers tore his nets (lake)              | Barter: weave 8 blue           | 25 gil, Ether (Herb / Tide Charm)                 |
| Foreman Flint         | Earth     | A rockslide buried the ridge road         | Barter: 10 orange, 6 violet    | Ridge road open, 40 gil (Ether / Focus Stone)     |
| Apprentice Cinda      | Fire      | Must forge the peak gate's key for Torva  | Barter: 10 red, 6 orange       | Peak gate key, Ether (2 Herbs / Ember Charm)      |
| Armorer Garrick       | Fire      | The ore is back and his racks are full    | Haggle                         | Forgefyre Armory (secret: Phoenix Feather)        |
| Innkeeper Rosa        | Fire      | Smiths sleep hard and pay late            | Haggle                         | The Cinder Rest (secret: Ether)                   |
| Beacon Keeper Ysolde  | Lightning | The storm beacon went dark                | Barter: charge 10 gold         | 2 Ethers, 30 gil (2 Herbs / Storm Charm)          |
| Courier Twitch        | Wind      | A gust scattered his letters (cliffs)     | Barter: catch 10 cyan          | 50 gil, Herb (Ether / Phoenix Feather)            |
| Warden Ada            | Wind      | Climbers rest at her lodge                | Haggle                         | Eyrie Lodge (secret: Wind Charm)                  |
| Scholar Ivo           | Arcane    | The moon rune over the tower went dark    | Barter: relight with 10 violet | 2 Ethers, 30 gil (2 Herbs / Moon Shard)           |

Spell tomes left the shops: mentors teach spells. Their items remain, so
a tome an old save holds can still be read. The sealed chest's Blizzard
tome became a delver's cache (Maren teaches Blizzard).

## Story

The author's script, [docs/STORY.md](STORY.md), is the source of truth for
the text it covers: the opening (class names, hero names, descriptions),
Mossvale (Elder Rowan, Farmer Bean, Pip, Shopkeeper Ordor), Captain Vale,
Shrine Keeper Myst, the mentors' motive / win / lose lines and their new
rows, Vesper, the Moon Wyrm, and the scenes (the opening, the Refusal with
Innkeeper Pete's line on Rowan's son, the Moon Wyrm's fall and the end of
Chapter One). Their lines are in the game word for word, punctuation and
stage directions included; `tests/script.test.ts` reads the script's tables
and checks every imported cell against the data. Everyone else keeps their
lines until the script covers them.

### Rotating lines

A line is one sentence or a list of variants (the script's `•` bullets).
Each speaker counts how often each of their moments (greeting, accept,
win, …) has been said (`GameState.talk`, saved), and the n-th time says
variant n mod count (`src/game/lines.ts`). So a character with two or more
variants never says the same sentence twice running, and the order is the
same in every game (deterministic, no dice). One character met as several
NPCs (Vesper) shares one count through `NpcDef.voice`, and the Moon
Wyrm's visions and lair words share one rotation (the `wyrm` voice), so
its variants alternate across all of them.

- **Moods**: a line is either one cell for everyone or a cell per mood:
  cold (Hostile, Wary), plain (Neutral), warm (Friendly, Devoted). The
  script never uses a "(same)" cell, so every imported row is per mood.
- **Missing cells** fall back to the nearest mood: a missing cold or warm
  cell uses plain, then the other extreme; a missing plain uses warm, then
  cold. A missing moment uses the old default (`...`).
- **Script conventions**: a bullet that is one quoted sentence is said
  without its quotes (the quotes are the table's notation); a bullet with
  a stage direction keeps them, since they part speech from narration.
  "You succeed, already knowing the spell" is the `winKnown` line.
- **Cells the rules can't reach yet**: confidences are said only when
  Devoted, so only their warm cell is ever shown (the cold and plain
  "Confides" cells never are), and refusals only when Hostile, so only
  their cold cell is (the plain and warm "Refuses" cells never are). They
  are kept verbatim for the author. Farmer Bean's "Afterwards" row is kept
  too, though she can be helped again and again, so her done line never
  shows.
- **Said, not offered**: an NPC's accept and decline lines are both ready
  when the challenge is offered, but only the one the hero hears is
  counted, so declining twice in a row hears two different lines.

### Stage directions

Text wrapped in `*…*` is narration, not speech: `parseStage` splits a line
into speech and stage runs, and the UI draws stage runs as italic
narration (`em.stage`) in conversations, the map banner, the battle
banner (drawn on the canvas, wrapping long lines) and interludes. A
stage direction opens with `*` at the start of the line or after a space
and closes with `*` before a space, punctuation or the end, with no space
just inside either asterisk; anything else (`5 * 3 * 2`, `**bold**`, a
lone asterisk) stays as written. Single-word emphasis in speech (Elder
Rowan's "purple \*and\* full of gravel") matches the same rule, so it
renders in italics exactly like narration.

### Scenes

A **scene** is a run of interludes shown once, one beat each, in the same
dark interlude as a vision (350 ms guard; tap, Enter, Continue or Escape
goes on). A beat with a speaker shows their face and name above the words;
class lines are said by the hero in their class's own words.
`dueScenes` (`src/game/story.ts`) lists the scenes due, in order: each not
yet seen whose `dueWith` flag the hero holds. A scene is marked seen
(`scene:<id>`) only after its last beat, so a game closed on one shows it
again from its first beat on the next load. A scene grants only what a beat `gives`, when it ends (the Focus Stone in R4).

| Scene                      | Due               | Shown                                                         |
| -------------------------- | ----------------- | ------------------------------------------------------------- |
| Opening (beats 1–5)        | on a new game     | after class select, before the hero has control in Mossvale   |
| The Refusal (R1–R4)        | with `vision:1`   | the first warp out of Mossvale, just before Vision 1          |
| The Moon Wyrm's fall (1–3) | with `wyrmBeaten` | after the Wyrm's results (and the skill screen on a level-up) |
| End of Chapter One (1–6)   | with `wyrmBeaten` | straight after the fall, then the Chapter One summary         |

**The Focus Stone rule**: in R4 Rowan gives the hero his rune stone, the
Focus Stone (`wellStone`, a beat's `gives`), handed over when the scene
ends, and only to a hero who has none in the bag or worn: an old save that
had it from his well (the old reward) still sees R4 but gets no second
stone. His well now pays the Quake spell, or 40 gil to a hero who knows it.
His success lines that hand over a stone (one plain and one warm "You
succeed" variant, and all three "already knowing the spell" cells) are
kept word for word but never said (`NpcDef.unsaid`): he says his other
success line instead, and a hero who knows Quake hears his usual success
lines.

Innkeeper Pete's line on Rowan's son (Hareguy) is one more of his
Neutral and Friendly greetings, rotating with the others.

### The Moon Wyrm's visions

Three visions, each shown once as an **interlude**: the screen goes dark
and the Wyrm speaks, a stage direction and a line. A tap, Enter or
Continue (or Escape) dismisses it after a 350 ms guard, so keys or taps
still held from walking can't skip it. `src/game/story.ts` decides them
from the warp just taken (pure, tested) and records each as a flag; a
shown vision is also `pending:<vision>:<variant>` until dismissed, so a game closed
on a vision shows the same words again on the next load:

| Vision | Shown on the first warp…        | Flag       |
| ------ | ------------------------------- | ---------- |
| 1      | out of Mossvale                 | `vision:1` |
| 2      | into Redrock Quarry (the ridge) | `vision:2` |
| 3      | into Stormcrown Peaks           | `vision:3` |

Each arrival also sets `reached:<map>`. The Wyrm's words rotate under one
voice, visions and lair alike, so its two variants alternate.

**The lair**: bumping the Moon Wyrm shows its lair words as an interlude
first (`PRELUDES` in `src/data/story.ts`, rotating each time), and the
fight starts when it is dismissed, by tap, Enter, Continue or Escape alike:
once the Wyrm has spoken there is no backing away.

### Vesper, Thrall of the Depths

The Wyrm's thrall (arcane, hooded) appears region to region, always one
step ahead: Vesper waits at the stop of the newest story beat the hero
has reached (`VESPER_ROUTE`), one place at a time, derived from the saved
flags (deterministic, survives a reload). Vesper is gone before the first
vision and after the Wyrm falls, and never stands on the hero's tile.

| Stop | Where                                  | After              | Challenge                    | Reward                             |
| ---- | -------------------------------------- | ------------------ | ---------------------------- | ---------------------------------- |
| 1    | Sevenstones, the road out of Mossvale  | Vision 1           | Puzzle: two O pieces, 2 rows | Moon Shard, `lore:vesper.road`     |
| 2    | Redrock Quarry, by the ridge road      | Vision 2           | Offering: a Herb (600 pts)   | Moon Shard, `lore:vesper.ridge`    |
| 3    | Stormcrown Peaks, the west road        | Vision 3           | Puzzle: O then I, 3 rows     | Moon Shard, `lore:vesper.peaks`    |
| 4    | Moonfall Ruins, by the Moon Caves seal | reaching the ruins | Offering: an Ether (900 pts) | 2 Moon Shards, `lore:vesper.ruins` |

Each stop is its own NPC (`vesperRoad` … `vesperRuins`) sharing Vesper's
lines and voice, done once ("Afterwards" until Vesper moves on). Attitude
is the usual arcane one: Hostile refuses (Vesper is not essential, nothing
needed comes from Vesper), Wary raises the offering's target. The Devoted
secret is a Moon Shard, the one Vesper's confidence hands over; the
script gives Vesper no warm bonus. The lore flags show as an arcane book
and are kept for the story to build on.

### Saves

Save version 9 adds the scenes: an older save has seen every scene already
due (the opening always; the Refusal once Vision 1 is seen; the Wyrm's fall
and the chapter's end once the Wyrm is beaten), so it is never shown a
scene it is past. A version 8 save still in Mossvale sees the Refusal when
it first leaves.

Save version 8 adds the line memory (`talk`; only whole counts of 0 or
more are kept). An older save starts every speaker at their first
variant, and marks the story steps it is already past, by the map it
stands on or by its progress flags: Vision 1 once the hero has left
Mossvale or done anything; Vision 2 (and the quarry reached) in the
quarry or Forgefyre, or with the ridge cleared; Vision 3 (and the peaks)
on the peaks or the cliffs, or with the peak gate's key; the ruins in the
ruins or the caves, or with the Cave Pass, the Sunken Ruins open or the
Wyrm beaten. Each step implies every step before it, so an old save made
on the hub late in the game is never shown a vision out of order, and
Vesper waits where its story stands.

Loading runs in a fixed order: parse, migrate (old flags, the version 8
story, the hero's older shapes), then sanitise. Only structural garbage
is refused: text that isn't a JSON object, an unknown version, or a
missing or mistyped core field (map, position, flag list; the hero's
name, level, XP, HP, gil, skill points). Everything else is repaired, so
one stale entry never costs a whole adventure: removed items, spells,
failed lessons and feats are dropped; gear that no longer exists is
unequipped; numbers become whole and in range (stats to their max rank,
spell levels to the spell's levels, enhancements and line counts 0 or
more); max HP, mana cap, attack and defence are recomputed from class,
level and stats, and HP and mana clamped to them; an unknown class
becomes the default; a spot (or inn) that no longer exists sends the hero
to their inn (or the start). A save that still can't be read is copied
to `the-realm/save.corrupt` before a new game begins, autosaves never
touch that copy, and a notice above the HUD tells the player. An earlier,
different backup is never overwritten: the newer one is kept beside it as
`the-realm/save.corrupt.<time>`.

Storage is probed at startup. If the browser refuses it (private mode,
blocked site data, a full quota), the game keeps running on an in-memory
store, says so in a lasting notice, and the Save command reports "Session
only" rather than "Saved".

## Enemy roster

Art is mixed by area: cute Fantasy Dreamland creatures in the open world,
and bigger, scarier Pixel Battlers monsters underground.

| Area      | Enemy        | Lv  | HP  | Atk | Gauge | Element | Weak to       | Resists                | Kit                                                                              | Drops        |
| --------- | ------------ | --- | --- | --- | ----- | ------- | ------------- | ---------------------- | -------------------------------------------------------------------------------- | ------------ |
| Overworld | Green Slime  | 1   | 58  | 4   | 8.5 s | Nature  | Fire, arcane  | Water, nature, earth   | Bounce 3 (×2), petrify 3 (Sticky Goo)                                            | Slime Gel    |
| Overworld | Spore Shroom | 2   | 85  | 5   | 7.5 s | Nature  | Fire, arcane  | Water, nature, earth   | Headbutt 3 (×2), haste 3 (Spore Cloud), fog 3 (Spore Haze)                       | Spore Cap    |
| Overworld | Goblin Scout | 3   | 92  | 6   | 8 s   | Earth   | Water, nature | Lightning, earth, wind | Stab 4 (×2), curse 1 (Rock Toss), seal 3 (Stake)                                 | Goblin Charm |
| Lessons   | Wisps (×7)   | 2   | 50  | 5   | 9 s   | Each    | From chart    | From chart             | Lash 2 + one of their element's (Ember: haste 2; Tide: fog 2; Gale: quicken 4 s) | —            |

**The mentor regions and the Moon Caves** (stats from the final balance pass,
tuned at touch pace; region monsters grow at most 2 levels with the hero, the
caves' 3, the Wyrm 1). Overworld critters are Fantasy Dreamland enemies;
the bigger beasts are Pixel Battlers.

| Area                | Enemy         | Lv  | HP  | Atk | Gauge  | Element   | Weak to           | Resists                          | Kit                                                                                                                          | XP / gil | Drops               |
| ------------------- | ------------- | --- | --- | --- | ------ | --------- | ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| Thornwood Grove     | Sproutling    | 2   | 95  | 7   | 7.5 s  | Nature    | Fire, Arcane      | Water, Nature, Earth             | Root Slap 3, Sunbathe 8, Seed Pod 3                                                                                          | 9 / 6    | herb 30%            |
| Thornwood Grove     | Leaf Sprite   | 3   | 100 | 8   | 7.5 s  | Nature    | Fire, Arcane      | Water, Nature, Earth             | Leaf Cut 4, Pollen 3, Leaf Storm 3                                                                                           | 13 / 8   | sporeCap 20%        |
| Thornwood Grove     | Thorn Troll   | 4   | 135 | 9   | 10.0 s | Nature    | Fire, Arcane      | Water, Nature, Earth             | Thorn Club 7, Bramble 1, Moss Bed 12                                                                                         | 18 / 11  | herb 40%            |
| Glasswater Lake     | Drip          | 3   | 85  | 7   | 7.0 s  | Water     | Lightning, Nature | Fire, Water, Earth               | Splash 4, Lake Mist 3, Soak 3                                                                                                | 13 / 7   | ether 15%           |
| Glasswater Lake     | Lake Lurker   | 4   | 125 | 9   | 8.6 s  | Water     | Lightning, Nature | Fire, Water, Earth               | Bite 6, Undertow 3, Gulp 4                                                                                                   | 18 / 10  | herb 30%            |
| Glasswater Lake     | Tide Ogre     | 5   | 155 | 9   | 10.2 s | Water     | Lightning, Nature | Fire, Water, Earth               | Wave Crash 8, Silt 2, Spray 3                                                                                                | 27 / 14  | ether 30%           |
| Redrock Quarry      | Goblin Digger | 4   | 110 | 9   | 8.0 s  | Earth     | Water, Nature     | Lightning, Earth, Wind           | Pick 5, Rock Toss 1, Stake 3                                                                                                 | 18 / 12  | goblinCharm 40%     |
| Redrock Quarry      | Quarry Hound  | 5   | 140 | 9   | 6.5 s  | Earth     | Water, Nature     | Lightning, Earth, Wind           | Maul 5, Pounce 4 s, Grit 4                                                                                                   | 27 / 13  | herb 30%            |
| Redrock Quarry      | Stone Ogre    | 6   | 165 | 11  | 12.0 s | Earth     | Water, Nature     | Lightning, Earth, Wind           | Boulder Slam 9, Landslide 2, Boulder 3                                                                                       | 38 / 17  | ether 40%           |
| Forgefyre           | Cinder        | 5   | 150 | 10  | 6.5 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Flare 6, Kindle 3, Scorch 4                                                                                                  | 27 / 14  | herb 30%            |
| Forgefyre           | Forge Imp     | 6   | 165 | 12  | 7.5 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Pitchfork 7, Bellows 4, Stoke 5 s                                                                                            | 38 / 17  | ether 30%           |
| Forgefyre           | Magma Drake   | 7   | 250 | 13  | 9.6 s  | Fire      | Water, Wind       | Fire, Nature, Arcane             | Magma Breath 12, Slag 2, Cinders 5                                                                                           | 56 / 22  | ether 40%           |
| Stormcrown Peaks    | Spark Pup     | 6   | 150 | 9   | 5.5 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Zap 5, Static 5 s, Jolt 3                                                                                                    | 38 / 16  | herb 30%            |
| Stormcrown Peaks    | Storm Goblin  | 7   | 165 | 11  | 7.0 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Shock Spear 8, Lightning Rod 2, Thunderhead 3                                                                                | 56 / 21  | ether 30%           |
| Stormcrown Peaks    | Thunderhide   | 8   | 225 | 11  | 9.5 s  | Lightning | Earth, Arcane     | Water, Lightning, Wind           | Thunder Slam 10, Roar 4, Storm Surge 6 s                                                                                     | 80 / 26  | ether 40%           |
| Windward Cliffs     | Puffball      | 7   | 200 | 12  | 6.0 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Puff 6, Dust Devil 3, Updraft 5 s                                                                                            | 56 / 20  | herb 30%            |
| Windward Cliffs     | Gale Bat      | 8   | 190 | 13  | 6.4 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Wing Cut 8, Gale 4, Downdraft 3                                                                                              | 80 / 24  | ether 30%           |
| Windward Cliffs     | Sky Ram       | 9   | 270 | 13  | 9.0 s  | Wind      | Lightning, Earth  | Fire, Arcane, Wind               | Ram 10, Rockfall 1, Charge 4 s                                                                                               | 117 / 30 | ether 40%           |
| Moonfall Ruins      | Watcher       | 8   | 285 | 14  | 7.0 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Gaze 8, Stare 5, Mind Leech 5                                                                                                | 125 / 25 | herb 30%            |
| Moonfall Ruins      | Night Bat     | 9   | 275 | 16  | 6.5 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Night Bite 11, Moon Sip 5, Eclipse Wing 3, Leech 14                                                                          | 180 / 28 | moonShard 30%       |
| Moonfall Ruins      | Gloom Toad    | 10  | 380 | 17  | 9.0 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Tongue Lash 13, Hex 2, Gloom 5, Wallow 25                                                                                    | 265 / 34 | ether 40%           |
| Moon Caves          | Moon Imp      | 10  | 370 | 22  | 5.4 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Swoop 8, Leech Mana 4, Moon Dust 3, Flit 5 s                                                                                 | 300 / 18 | —                   |
| Moon Caves          | Shade Imp     | 11  | 350 | 22  | 6.3 s  | Arcane    | Fire, Wind        | Lightning, Nature, Arcane        | Moonbeam 9, Glimmer 12, Hex 1, Gloom 4                                                                                       | 440 / 22 | moonShard 30%       |
| Moon Caves          | Cave Brute    | 11  | 310 | 21  | 11.0 s | Earth     | Water, Nature     | Lightning, Earth, Wind           | Slam 8, Rubble 2, Boulder 3                                                                                                  | 440 / 24 | ether 40%           |
| Moon Caves · Depths | Moon Wyrm     | 13  | 490 | 17  | 6.8 s  | Arcane    | Fire, Wind        | Water, Lightning, Nature, Arcane | Lunar Breath 18, Tail Sweep 10, Crystal Tomb 2, Eclipse 4, Moon Drain 4, Moonfog 4, Starfall 6, Tidal Pull 3, Night Wind 6 s | 900 / 90 | phoenixFeather 100% |

The Moon Wyrm keeps everything from before (attacks twice as likely,
resists water, enrages at ½ HP with a 4.6 s gauge, 3-row curses and +4
attack), now at the end of the level curve, and as a boss it takes a damped
weakness bonus and makes each spell cost 25% of its gauge.

The seven wisps (Ember, Tide, Spark, Moss, Stone, Moon, Gale) are mentors'
trial foes, drawn as a slime recoloured to their element. Each lesson
difficulty above 1 adds 60% HP and 3 attack (and a level of gravity).
At difficulty 1 a hero below level 3 meets a gentler foe with 72% of its
HP (a wisp has 36). The Ember Wisp's special is a haste (it was a
second attack, which made Torva's lessons the only ones a good player
lost: 30–57% at touch pace against 90%+ for the others).

**Gil and XP late**: the caves pay less gil (Moon Imp 18, Shade Imp 22,
Cave Brute 24; the Wyrm 90) since nothing is left to buy there, and the
ruins and caves pay more XP (Watcher 125, Night Bat 180, Gloom Toad 265,
Moon Imp 300, Shade Imp and Cave Brute 440), so one pass through them
takes the hero from level 8 to 12 for the Wyrm (see the economy table
under Balance).

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
Farmer Bean wants 7 green (8), which failed in all four runs. The Knight starts with 6
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
own map, monsters, people and landmark, joined to Sevenstones (the hub, which
gained road exits west, east and south) or to the region before it.

**Sevenstones** is the hub's name (it was "The Realm"): seven standing
mana crystals ring it, one per element. The name is one data field (the
overworld's `name` in `src/data/maps.ts`), shown on arrival, in the
mentors' whereabouts ("Sevenstones · west meadow") and wherever a place is
named.
Regions keep a level band (`REGIONS` in `src/data/balance.ts`; their
monsters grow at most 2 levels with the hero) and tilt the bag toward
their element.

| #   | Region (map)                       | Mentor, landmark   | Monster levels | Monsters                                   | People                                            | Reached from                                            | Gate                      |
| --- | ---------------------------------- | ------------------ | -------------- | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------- | ------------------------- |
| 0   | Sevenstones, Mossvale, Brightwater | (visits)           | 1–3            | Slime, Spore Shroom, Goblin Scout          | the old cast                                      | start                                                   | —                         |
| 1   | Thornwood Grove (`grove`)          | Hazel, old oak     | 2–4            | Sproutling, Leaf Sprite, Thorn Troll       | Forager Wren                                      | Sevenstones, west road                                  | —                         |
| 2   | Glasswater Lake (`lake`)           | Maren, jetty       | 3–5            | Drip, Lake Lurker, Tide Ogre               | Fisher Tam                                        | Sevenstones, east road                                  | —                         |
| 3   | Redrock Quarry (`quarry`)          | Dorn, quarry lift  | 4–6            | Goblin Digger, Quarry Hound, Stone Ogre    | Foreman Flint                                     | Sevenstones, south road                                 | —                         |
| 4   | Forgefyre (`forge`)                | Torva, old forge   | 5–7            | Cinder, Forge Imp, Magma Drake             | Apprentice Cinda, Armorer Garrick, Innkeeper Rosa | quarry, ridge road                                      | `ridgeCleared` (Flint)    |
| 5   | Stormcrown Peaks (`peaks`)         | Rook, storm beacon | 6–8            | Spark Pup, Storm Goblin, Thunderhide       | Beacon Keeper Ysolde                              | Sevenstones, the tunnel north-east (once the cave seal) | `peakGate` (Cinda)        |
| 6   | Windward Cliffs (`cliffs`)         | Kestrel, eyrie     | 7–9            | Puffball, Gale Bat, Sky Ram                | Courier Twitch, Warden Ada (inn)                  | peaks, west                                             | —                         |
| 7   | Moonfall Ruins (`ruins`)           | Selene, moon tower | 8–10           | Watcher, Night Bat, Gloom Toad             | Scholar Ivo                                       | cliffs, south-west                                      | —                         |
| 8   | Moon Caves, Depths                 | (visits)           | 10–11, Wyrm 13 | Moon Imp, Shade Imp, Cave Brute, Moon Wyrm | Steve the Cave Hermit, Sealed Chest               | ruins, cave mouth                                       | `cavePass` (Captain Vale) |

- **Gates are people, never items**: each flag comes from an `essential`
  NPC (they deal even when Hostile) in a region the hero can already
  reach; the tests flood-fill the world flag by flag and check every map
  opens and every gate's flag is earned before it is needed. A locked
  warp says who holds the key.
- **Inns** in Brightwater, Forgefyre and the cliffs' lodge; Forgefyre's
  armory sells the next gear tier (Flame Brand, Forge Plate).
- **Moved**: the Moon Caves' entrance moved from Sevenstones into the
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

**The end of Chapter One**: beating the Moon Wyrm sets `wyrmBeaten` and,
after the results (and the skill screen on a level-up), plays the Wyrm's
fall and the end of Chapter One (see Scenes), then a **Chapter One
complete** summary: the hero's portrait, title element, level and spell
count, and portraits of the mentors whose lessons the hero won.
Lessons aren't recorded, so this is derived: only a lesson raises a spell
past level 1, and only a lesson teaches a spell that is neither a
starting spell nor an NPC's reward (an old save's tome is the one
exception). The hero plays on: back on the map the Sunken Ruins' seal
glows violet and, bumped, says the script's two ward lines in turn (the
footprints at its edge; it will open in the next chapter; `Warp.stirs`);
it stays shut. Routes gated on the wyrm
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

## Touch and phone UI

- **The board is the controller.** Tap rotates (a long, still press
  rotates too, on release, so a resting thumb never "does nothing"); a
  sideways drag moves the piece one column per column-width the finger
  travels (the first step at 0.6 of a column); a downward drag soft drops
  after 120 ms held, then a row every 50 ms; a release after 36 px or more
  down is a flick, a hard drop, when it moved down at 0.35 px/ms or faster
  (over the last 80 ms, or over the last two samples that moved if they
  ended within 100 ms of the lift, since a phone at 20–30 fps sends a move
  only every ~50 ms) or when the whole drag took 250 ms or less. A touch
  keeps the axis it starts on (14 px slop), a second finger cancels it,
  and a new piece ends it, so one touch never moves two pieces. The
  recognizer is pure (`src/ui/art/gestures.ts`) and unit-tested, sparse
  events included.
- **Space goes to the board.** No permanent button row: one round rotate
  button sits beside the board; pause and item uses fold into the enemy
  strip as 44 px thumb targets; spells are a slim strip of seven icons. A
  category opens as a one-row popover over the enemy strip (never over the
  board) and closes when the board is touched or a new piece comes. Move buttons are an opt-in setting (Touch buttons, in the menu).
- **One screen.** At phone widths (≤ 760 px) the battle is sized from
  `100dvh` and the safe-area insets, so it never scrolls; the stage
  becomes a 480×150 strip. Desktop keeps its layout.
- **World.** Tap a tile to walk there along the shortest path
  (breadth-first over walkable tiles, `src/world/path.ts`); people,
  monsters and warps end a path, so tapping one walks up and meets it. A
  small see-through d-pad (walks while held) shows until the first tap-walk.
- **Dialogs** are bottom sheets on phones: the body scrolls, the actions
  stay at the bottom, 48 px tall. The result guard and focus rules stay.
- **Less motion** (`prefers-reduced-motion`) stops the stage's shakes and
  drifting numbers and CSS animations. Haptics (a few ms) are optional.

## Parked ideas

- **Colour-match clears** (Dr. Mario style): four or more crystals of one
  element in a row or column would pop on their own, beside the usual
  full-line clears. Dual pieces would make it a real placement game. Not
  built: it would change damage, mana and the board's pacing at once, so
  it needs its own balance pass.
