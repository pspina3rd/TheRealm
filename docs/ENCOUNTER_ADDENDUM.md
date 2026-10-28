# Encounter Design — Addendum A, rev 3: reactions, class abilities, mentor synergy

> **Approved by the author (Oct 28).** Built as M2a after the author's go/no-go on the M1 slice.

Status: **design for author approval**. It extends `docs/ENCOUNTER_DESIGN.md` (rev 3, approved).

The author chose three items from "Improvement Recommendations" (§2, element reaction chaining and class-specific board mechanics; §3, the mentor synergy meter). Endless mode and New Game+ are deferred (Appendix).

Every number is a starting value. They live in three new blocks in `src/data/balance.ts`: `REACTIONS`, `CLASS_ABILITIES` and `SYNERGY`.

**The rules every addition obeys**

1. **The approved bands don't move.** Each addition is measured switched on, and it has to fit inside them (§4). Nothing makes an encounter easier overall, and nothing lengthens fights.
2. **No new inputs and no gesture changes.** Everything is passive, or uses an existing tap.
3. **Mana comes only from the board.**
4. **The overlay budget holds.** Inside the grid there are only one-shot effects (plus the Mage's earlier telegraphs, which belong to the existing hazard family). New state lives on the board frame, in the stage strip, or on the portrait.
5. **Colour is shape**, with the exceptions stated where they apply.
6. **Mossvale is the teaching floor.** The three features change nothing there.

---

## Changes from review (rev 1 → rev 2)

| #   | Review issue                                                | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Bulwark is free, automatic power that blunts the push verbs | **Earned**: 1 charge per **earth line** cleared (3+ orange crystals), hold 1. It **blocks one row**: Lo's 2-row block loses one row. Never blockable: boss signature moves (incl. Crystal Tomb), threshold-defining events, and the **first 2 pushes of any NPC encounter**, so every verb's pressure is felt. At most **1 block per NPC encounter**. Off in Mossvale. **Paid with Agility −1** ("Heavy Plate": pieces fall 4% faster on every board), a stat that works everywhere Bulwark does. The Knight keeps Guard 2. _(Rev 3: the payment is now Vitality 2 → 1, taken at awakening; R2.)_ |
| A2  | Abilities change the boards the author just approved        | Abilities **awaken after Mossvale**, as a story beat after the hero's first mentor lesson outside Mossvale. They never act on the Mossvale map. A short **author go/no-go on ability feel** is added to M2a.                                                                                                                                                                                                                                                                                                                                                                                      |
| A3  | Joint spell shares the taught spell's slot                  | The joint spell is cast by **tapping the mentor's portrait** (a 44 px target, an existing tap). The strip slot always means your own spell. The portrait is **greyed and can't be cast while the shield is up**.                                                                                                                                                                                                                                                                                                                                                                                  |
| A4  | Reaction power unmeasured; Overload a mana fountain         | **Overload**: +2 to the primer's and trigger's pools only (4 mana). Each reaction's **utility part fires once per fight**; later triggers give only a small damage bonus. Utility effects are capped so none cancels a region rule wholesale. New checks: an **on/off delta** (≤ +8 points before any retune, otherwise cut `REACTIONS`; rev 3 tightens this to +5 regions / +3 Wyrm, R1), **fight length** (no growth beyond 5%), and an HP retune cap of +5%.                                                                                                                                   |
| A5  | Pickpocket and Arcane Sight                                 | Pickpocket can't touch boss signature moves or threshold-defining events. Its window is **the telegraphed piece or the one after**, so it can be set up. **The Mage trades Focus 2 → 1**, not Insight, which keeps the preview path intact.                                                                                                                                                                                                                                                                                                                                                       |
| A6  | ±5 class check unmeasurable at 200 seeds                    | **800 seeds per class cell**, for the **good and casual** bots. A cell is flagged when \|class − mean\| > 5 points **and** the difference is significant at 95%. The sim budget and bot policies are specified (§4).                                                                                                                                                                                                                                                                                                                                                                              |
| A7  | The ring is by element; lessons break the shape mapping     | The ring is **by element**, with shapes only as the usual mnemonic. Recoloured mentor tosses count by their colour. The frame glyph shows the successor's **colour and shape silhouette**. The first reaction is taught by a **scripted toss** in the first lesson (§1.3). The wrong "first reaction in a lesson" claim is removed.                                                                                                                                                                                                                                                               |
| A8  | M1 hooks incomplete                                         | Five hooks: (1) `pushRows(source, count, {blockable, signature})`; (2) `Telegraph` as data with `leadPieces`; (3) **a neutral `glass` cell kind** and **`cellScoresAs(cell, colour)`**, used by every PLANT, SORT and CHARGE scorer and by purity (glass is never "wanted"); (4) **one new-holes event** from `Board`, already counted as `LockResult.holesMade`, consumed by every challenge; (5) `CLASS` in the sim. The surge buffer moves to M2a.                                                                                                                                             |
| A9  | The frame is getting crowded                                | The corner layout and its yield rules are specified (§5). M2a's acceptance needs a **360×640 worst-case screenshot**: a lesson with the shield up, the portrait arc ready, a primer live and a Knight badge recharging.                                                                                                                                                                                                                                                                                                                                                                           |
| A10 | Scope and save changes                                      | M2a builds **3 joint spells** (Hazel, Maren, Dorn: the first mentors met). Torva's arrives in M3; Rook's, Kestrel's and Selene's in M4. **Old saves get the same trade**: the traded rank comes back as 1 unspent skill point, so the change is neutral. _(Rev 3 replaces this: the trade happens at awakening, or on load for saves already past it; R6.)_                                                                                                                                                                                                                                       |

### Rev 3 (addendum re-review, all applied)

| #   | Issue                                                                            | Resolution                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The +8 reaction-gain limit is generous and can't be measured at 200 seeds        | **Paired seeds** (the same seed in both arms), **800 per arm**. Gain limit **≤ +5 points** for regions and **≤ +3 for the Wyrm**, and the reactions-on result must also sit **inside the approved band**. The synergy length check is paired too.       |
| R2  | The trades hit Mossvale before any ability exists; Agility −1 is a negative rank | Start stats are unchanged. **The trade happens at awakening** ("the knack costs you…"). The Knight trades **Vitality 2 → 1** (no negative ranks, no Heavy Plate).                                                                                       |
| R3  | Pickpocket breaks haggles                                                        | **At most 1 Pickpocket per NPC encounter.** It **only cancels** the event; nothing is added to your sends.                                                                                                                                              |
| R4  | Pickpocket's window is ambiguous                                                 | **Exact timing:** a telegraph appears when piece N spawns, and its event resolves when piece N+1 locks. Pickpocket's window is a 3+ clear by **piece N or N+1**, the same for every class (Arcane Sight shows it earlier but doesn't widen the window). |
| R5  | The scripted first reaction may never fire                                       | **Both tosses are scripted**: a predecessor-colour toss whose best placement clears a line with 3+ of that colour, then the mentor's own colour placed the same way. The script waits until a search finds both placements.                             |
| R6  | Old saves and the trade                                                          | **Old saves past the awakening point** get the ability **and the trade on load**. Saves before it trade at awakening like everyone else, so old and new games are treated the same. _(For the lead to tell the author.)_                                |
| —   | Bulwark's charges in controlled-queue cells (minor)                              | Noted as intended: the Knight is expected to run below the mean in cells with controlled queues (Bean, Vale, Ivo). A ±5 flag there isn't retuned.                                                                                                       |

---

## 1. Element reactions

### 1.1 The rule

- **Primer.** A cleared line fires its **surge** element (the existing line effect: 3+ crystals of one element; the line's strongest element). That element becomes the **primer** for the next **2 pieces**.
- **Reaction.** If a later lock within those 2 pieces fires a surge of the primer's **successor**, the reaction fires once, after that lock's normal strike and line effects.
- **Limits.** At most one reaction per lock. With several surges, the first eligible line counts, scanning bottom to top.
- **Chaining.** The trigger element becomes the new primer, so reactions can chain. A surge that isn't the successor replaces the primer; after 2 pieces it expires.
- **By element, not shape.** Crystals count by their **colour**. A dual half counts as its own colour, and a mentor's toss (any shape, recoloured) counts as the mentor's element. Shapes are only the usual mnemonic.
- **Where it applies.** **Combat only**: monsters, lessons, bosses. NPC verbs ignore reactions.

### 1.2 The ring and its effects

**Wind → Fire → Earth → Water → Lightning → Arcane → Nature → Wind.** As a mnemonic in plain bags, that's I → Z → L → J → O → T → S.

Each reaction has a **utility** part, which fires **once per fight per reaction**. Every later trigger of the same reaction gives only its **repeat** value.

| Primer → trigger   | Reaction          | First trigger in a fight (utility)                                                               | Repeat               | Cap so it never cancels a rule    |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------- |
| Wind → Fire        | **Conflagration** | Fire burst: 8 + 2 × fire crystals in the trigger lines; burns away the **2** highest stone cells | The burst only       | ≤ 2 stones, once                  |
| Fire → Earth       | **Eruption**      | Clears the bottom row (no mana, no strike), plus 6 earth damage                                  | 6 earth damage       | One row, once                     |
| Earth → Water      | **Quagmire**      | Enemy gauge −2 s (the −3 s floor holds)                                                          | 4 water damage       | Once                              |
| Water → Lightning  | **Conduction**    | Trigger strike ×1.5 (total multiplier capped at ×3)                                              | Trigger strike ×1.25 | —                                 |
| Lightning → Arcane | **Overload**      | **+2 mana to the lightning and arcane pools only**, from that clear                              | 4 arcane damage      | 4 mana, once                      |
| Arcane → Nature    | **Witchbloom**    | Heals 6 + 1 per nature crystal; removes **up to 3** hazard tags in the cleared rows ±1           | Heals 3              | ≤ 3 tags, once; no counters reset |
| Nature → Wind      | **Seedstorm**     | Cleanses the oldest hex (fog, haste, quicken or seal) + 2-piece tailwind                         | 4 wind damage        | One hex, once                     |

**How it meets the other rules**

- **Region rules.** A reaction never resets a region rule's counter or stops it. The once-per-fight utility, plus the caps, means each reaction is a single answer to one hazard, not a cure for the region.
- **The mentor's shield.** Reaction damage against a shield is **0**; the utility still applies.
- **Bosses.** Damage follows the boss spell weakness rules (the boss spell share is 0). Reactions take no gauge time. Boss signature moves are unaffected.
- **Stakes.** None.

### 1.3 Teaching and reading it

- **The frame glyph** (top-right, 24 px): the primer's icon, then an arrow, then the **successor's colour and shape silhouette**, with 2 pips for the window. The colour is what counts; the silhouette is the usual piece that carries it.
- **The banner.** The reaction's name shows in the stage strip, with a one-shot effect over the trigger rows.
- **The first reaction is scripted.** In the hero's first mentor lesson (whichever mentor that is):
  1. **Both tosses are scripted.** On a piece where a search finds it possible, the mentor tosses a piece in the **predecessor's colour** (e.g. violet for Hazel), chosen so that its best placement clears a line with 3+ crystals of that colour.
  2. On the **next piece**, the mentor tosses their **own colour**, chosen the same way, so it fires the reaction (Witchbloom for Hazel) inside the window.
  3. The script waits until the search finds both placements. The ghost shows each best placement, so the player only has to drop them.
  4. The mentor says their reaction line once ("Violet feeds green. Watch.").
  5. These two tosses don't count against the help chance.
- **The menu.** The alignment star gains a ring view: discovered reactions are lit, the rest show `?`. Saved as `reactionsSeen` (save v11).

---

## 2. Class board abilities

**Awakening.** No ability acts in Mossvale, and **start stats are unchanged**.

- After the hero's **first mentor lesson outside Mossvale** (win or lose), the mentor names it ("Hazel: _you've got a knack of your own_") and the flag `ability:awake` is set, and **the trade happens then** ("the knack costs you…"): the listed rank is removed.
- From then on the ability is active **everywhere except**:
  - the Mossvale map;
  - the authored **LOCK and BUILD** boards (Pip, Cinda, Orrin, the Sealed Chest, Vesper 1), whose recorded solutions define them.

| Class                     | Ability          | Exact rule (`CLASS_ABILITIES`)                                                                                                                                                                                                                                                                                                                                                                                                       | Frame badge                    | Trade                                                                                                  |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Ranger Fern** (wind)    | **Breeze**       | After **6 placements in a row that create no new covered hole**, Breeze charges (hold 1). The next placement that would create covered holes fills **up to 2** of them with **glass**: a neutral cell that completes lines, gives no mana, never scores, is never a wrong colour, and is **never "wanted"** for purity.                                                                                                              | Feather plus a 6-pip streak    | Agility 2 → 1                                                                                          |
| **Knight Lance** (earth)  | **Bulwark**      | **1 charge per earth line cleared** (a line with 3+ orange crystals), hold 1. The next **blockable** pushed row shatters at the base, **one row only**: a 2-row push loses one row. **Never blockable:** boss signature moves (incl. Crystal Tomb), threshold-defining events, and the first 2 pushes of any NPC encounter. **At most 1 block per NPC encounter.**                                                                   | Shield, lit when charged       | **Vitality 2 → 1** (−6 max HP; at 48 HP he's still the toughest; HP matters everywhere Bulwark works). |
| **Mage Ares** (arcane)    | **Arcane Sight** | Placement-relevant telegraphs show **2 pieces ahead** instead of 1 (a faint violet outline first). CONTAIN shows the **exact cells** of the next spread. Dark boards light **+1 row**.                                                                                                                                                                                                                                               | Eye; pulses on an early reveal | **Focus 2 → 1** (pools 15, still the deepest)                                                          |
| **Rogue Vex** (lightning) | **Pickpocket**   | A **3+ line clear** inside the event's window makes it **fizzle**: **only cancelled**, nothing is added to your sends. **Window:** a telegraph appears when piece N spawns, and its event resolves when piece N+1 locks; a 3+ clear by piece N or N+1 steals it, the same for every class. Cooldown **10 pieces**; **at most 1 per NPC encounter**. **Never:** boss signature moves or threshold-defining events. No mana is stolen. | Hand, plus a cooldown ring     | Strength 2 → 1                                                                                         |

**Event flags.** "Blockable", "signature" and "threshold-defining" are flags on each `pushRows` call or `Telegraph` (§5). In the main doc's encounters:

| Flag                     | Applies to                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Signature**            | The Wyrm's Tail Sweep, Tidal Pull and Crystal Tomb; Vesper 4's sends; every second-half boss phase move |
| **Threshold-defining**   | Flint's aftershocks, Vale's wind snuffs, Cinda's quench                                                 |
| **Blockable / pickable** | Monster curses and the region rules' rows and marks; NPC pushes after the first 2 (rising, tug, sends)  |

**Rejected:** the recommendation's Ranger "mirror the piece" (it breaks colour-is-shape and needs an input). The Mage's "3 previews" already comes from Insight for everyone.

**Trades at awakening.**

- Ranks only go up and every class starts at 2 in its listed stat, so the trade is always possible.
- **Old saves:** a save past the awakening point (it holds the lesson flag) gets the ability **and the trade on load**. A save before it trades at awakening, like a new game.

**Controlled-queue cells.** The Knight is expected to run below the class mean in controlled-queue cells (Bean, Vale, Ivo), because his charges need orange lines. That's intended: a flag there isn't retuned.

---

## 3. Mentor synergy meter

### 3.1 Where

- All mentor lessons (once the joint spell exists; §6).
- Second-half allied boss fights: Irdrath with Torva; the Lishal with Rook and Kestrel; the Malificat with the highest-regard mentor (ties go to highest alignment).
- **Not** the Moon Wyrm (the Ordeal is the hero's alone), and **not** the threshold assist.

### 3.2 The rule (`SYNERGY`)

- **The meter** runs 0–100, shown as an arc around the **mentor's portrait** in the stage strip. There's no decay.
- **Filling:**

  | Event                                                        | Gain |
  | ------------------------------------------------------------ | ---- |
  | Each cleared line whose surge is the **mentor's element**    | +10  |
  | A lock that clears **≥ 2 cells of the mentor's latest toss** | +10  |
  | A **reaction** with the mentor's element on either side      | +15  |

- **Casting.** When the meter is full, **tap the mentor's portrait** (a 44 px target; an existing tap). The strip slot always stays "your spell". While the shield is up, the portrait is **greyed and can't be cast**.
  - It costs **no mana** (the meter was filled by clears).
  - It takes **25%** of the gauge.
  - **Once per fight.**
- **The joint spell:**
  - **18 + 6 × lesson difficulty** damage in the mentor's element.
  - A **capped cleanse** of the mentor's region rule: it removes **up to 4** of that rule's hazards (spores, slag stones, the tide row's next push, the bolt or rockfall mark, the crosswind piece) and **delays the rule by 3 pieces**. It never resets or ends it. Selene's version lights the whole board for 3 pieces.

### 3.3 Readability

- The arc sits on a 48 px portrait, with "+10" and "+15" floating from it.
- The portrait glows when the spell is ready, and greys under the shield.
- One banner at a time; the joint spell outranks a reaction.

---

## 4. Bands are protected, never loosened

| Addition        | Check (touch pace; 95% intervals)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | If it misses                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Reactions       | **On/off gain**, with **paired seeds** (the same seed in both arms), **800 per arm**: good + reaction-hint win rate minus reactions-off, before any retune, **≤ +5 points** per region and **≤ +3 points for the Moon Wyrm**. The reactions-on result must also sit **inside the approved band**. Good bot: 3–6 reactions per region fight; casual 0–2. Reactions ≤ 15% of damage. **Fight length**: the good bot's median with reactions on is ≤ 105% of reactions-off, and inside the approved length targets wherever it is now. | **Cut `REACTIONS`.** An HP retune may absorb at most **+5%**, and never lengthens fights past the length check. |
| Class abilities | **800 seeds per class cell**, good **and** casual. Flag a cell when \|class − four-class mean\| > 5 points **and** the difference is significant at 95%. All four classes inside each band.                                                                                                                                                                                                                                                                                                                                         | Tune `CLASS_ABILITIES` (charge rules, caps), never the encounter                                                |
| Synergy         | Lesson bands hold with synergy on. The joint spell is cast in 60–80% of good-bot lessons, ≤ 20% of lesson damage. Lesson length ≤ 105% of synergy-off (paired seeds, 800 per arm).                                                                                                                                                                                                                                                                                                                                                  | Tune `SYNERGY` gains; foe HP up to +5% at most                                                                  |
| All together    | M6: every approved band and the strain-2 floor, with everything on, for all 4 classes and both bots                                                                                                                                                                                                                                                                                                                                                                                                                                 | As above                                                                                                        |

**Bot policies** (shared by the good and casual bots; only the good bot uses the hints):

- **Reaction hint**: prefer placements that complete a successor-element row within the primer's window.
- **Pickpocket**: when an eligible event is telegraphed and a 3+ clear is available this piece or next, take it.
- **Joint spell**: cast as soon as ready, unless the shield is up.
- **Breeze, Bulwark and Sight**: automatic, so no policy is needed. The good bot reads Sight's earlier telegraphs.

**Sim budget.** Class checks: about 20 encounter cells (M1 plus M2a) × 4 classes × 2 bots × 800 seeds ≈ 128k runs. They run at milestone end (not per commit), in parallel workers, and are reported in the build log. Per-commit CI keeps the 200-seed Ranger table.

---

## 5. Build: M1 hooks, M2a, and the frame layout

**M1 (in progress): five hooks, all behaviour off**

1. **`Battle.pushRows(source, count, { blockable, signature })`** is the only way rows enter the board (curse, rising, tug, duel send, tide, Crystal Tomb). Each caller states its flags and row count now.
2. **`Telegraph` data** with `leadPieces` (1 now) and its target (cells, column or row), plus the same `signature` and `thresholdDefining` flags.
3. **A neutral `glass` cell kind**, and **`cellScoresAs(cell, colour)`**, used by every PLANT, SORT and CHARGE scorer and by the purity count. Glass is never wanted, never a wrong colour, gives no mana and is never a flaw.
4. **One new-holes event**: `Board` computes it once per lock (it's already counted as `LockResult.holesMade`), and every challenge consumes it (Rowan's rising, combat's gauge rule, later Breeze).
5. **`CLASS` in the sim harness** (default ranger).

Acceptance adds unit tests: every push goes through `pushRows` with flags; every scorer uses `cellScoresAs`.

**M2a (after the author's go/no-go, before Brightwater)**

- The surge buffer, the reactions, the ring glyph and the menu ring, the scripted first reaction, `reactionsSeen`.
- The four abilities with awakening, the trades and the flags; the save v11 migration (rank → skill point).
- Synergy with **3 joint spells** (Hazel, Maren, Dorn).
- About 10 new author lines: 7 reaction lines, 3 joint-spell lines.
- **Acceptance:**
  - every §4 check;
  - **an author go/no-go on ability feel** (one session each with the Knight and the Rogue at least);
  - screenshots at 390×844 **and 360×640**, including the worst case: a lesson with the shield up, the portrait arc ready, a primer live and a Knight badge recharging.

**Later**

- Torva's joint spell arrives in M3; Rook's, Kestrel's and Selene's in M4.
- Allied boss synergy comes with the second half.

**Frame layout and yield rules (phone)**

| Spot                      | Holds                                           | Yield at ≤ 360 px wide                                                                           |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Frame, top edge, left     | Objective line (NPC verbs)                      | Wraps to 2 lines maximum, as now                                                                 |
| Frame, top-right corner   | Reaction glyph (combat)                         | **Moves into the next-piece column**, above the preview, at 20 px. Pips become a ring around it. |
| Frame, bottom-left corner | Class badge                                     | Shrinks to 22 px; the streak or cooldown becomes a ring around it                                |
| Frame edges (sides)       | Vale's lamps, CHAIN's lanterns, the danger line | Unchanged. These never occur in combat, so they never meet the reaction glyph.                   |
| Stage strip               | Portrait, with the synergy arc                  | Unchanged (the 44 px tap target is kept)                                                         |

---

## 6. Open questions (with the reviewer's recommended answers)

1. **Reactions in combat only?** **Yes.**
2. **The ring?** **The ring**, defined by element, with Overload narrowed to 4 mana and each reaction's utility once per fight.
3. **Class abilities, with a trade?** **Yes, with the changes**: they awaken after Mossvale; Bulwark is charged by earth lines and paid with Vitality 2 → 1 at awakening; the Mage trades Focus; boss signature moves and threshold-defining events are exempt from Bulwark and Pickpocket.
4. **Synergy?** **Yes**: lessons now, allied bosses in the second half, the Wyrm stays solo, cast from the **mentor's portrait** (never while the shield is up), and 3 joint spells in M2a.

---

## Appendix: deferred until after the main game

- **Endless mode** ("Moon Cave Descent") and **New Game+ / challenge runs** are deferred until the second half ships. They'd reuse the seeded sim, the classes and the reactions; nothing here blocks them.
- The recommendations' haptics, layered music and portrait or stage cues are polish, outside this addendum.
