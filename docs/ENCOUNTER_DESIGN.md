# Mana Crystals — Encounter Design, rev 3 (for author approval)

Status: **design only**. Nothing is built until you approve it. After approval: the M1 vertical slice → your go/no-go → the rest of the build (M2–M5) → one balance pass (M6) against the targets in §5.

Every number is a **starting value**. Each one lives in `src/data/balance.ts` (new `ENCOUNTERS`, `STAKES` and `REGION_RULES` blocks).

---

## Author decisions (Oct 28, approved for building)

The seven open questions in section 10 are answered with the recommended answers, except where noted:

- **Vesper (Q5), changed:** losing to Vesper carries more weight, but it is not game over. On a loss, Vesper **withdraws back along his route**, and you must retrace your steps to reach him again before you can challenge him a second time. The consumable or gil cost stays, and his lore is told either way. Exact retreat rules are specified when Vesper is built (M4).
- **Build work saved consistently (author's process requirement):** the build commits after every working step, keeps a running build log (`docs/BUILD_LOG.md`), and checkpoints are pushed regularly, so no work is lost to limits or restarts. Game saves follow the normal rule: a version bump with migration tests.

### Oct 29: after the M1 tuning diagnosis

- **Bot definitions (§5.3) change** to realistic touch players. The old 1-ply casual bot lost because it never looked ahead, not because of touch noise. A player who sees the next piece and the landing ghost plays differently.
  - **good**: two pieces deep plus the board's hint. It slips at half the casual rate (4% a column off, 2.5% a wrong turn), and 70% of slips are caught on the ghost before release. 2.2 s a piece.
  - **casual**: a planner with slips. Two pieces deep plus the hint, the second-best spot 15% of the time. It slips 8% a column off and 5% a wrong turn, and 70% are caught on the ghost. 2.6 s a piece.
  - **beginner**: the old casual (`bestFit` one piece deep plus the hint, every slip uncaught). It is reported as an extra row and has no band.
- **Vale's lamps:** purity **P 6** (was 7), and the controlled queue gives a J and a T in every **3** pieces (was 4). If the good bot then lands above 80–90%, balance numbers trim it into the band.
- **Pip stays short:** his length band is **20–40 s**. His win bands are unchanged.
- **Rowan's well is 7 wide** (was 6), so one slip doesn't cost the dig. The start rows are re-authored to seven columns; the lip and rising numbers are re-checked by sim.
- **Pip gets one spare piece:** an O at the end of his authored queue (12 pieces). One slip is forgiven; two still lose. The solver's classes are counted on the authored eleven.

## Changes from review (rev 1 → rev 2)

The reviewer's verdict was REVISE, with the direction approved. Each issue below lists how it was resolved. I disagree with none; two items are adopted with small adjustments, noted where they apply.

| #   | Review issue                                                             | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Boards that can't be solved (Pip, Cinda, Bean)                           | **Pip**: a 3×5 toy box and an 11-piece queue, with a full worked solution (§6.1). **Cinda**: the key lies on its side (every cell supported), the bow takes "≥ half red, fire halves count", and the authored queue includes fire-dual O pieces, with a worked solution (§6.7). **Bean**: 2-wide paths `FFPPFFPPFF`; a wrong colour scores 0 at Mossvale. **M0 feasibility gate**: every authored board ships with a recorded solution; every random-queue board ships with a 200-seed good-bot run (§9).                                                                                                                                                                                                 |
| 2   | Colour is shape, and colour verbs depend on queue luck                   | Stated as a rule in §2. Bean's lesson _is_ "the seed is the green S; the red Z only looks like it". Every colour encounter uses a **controlled queue** (a guaranteed supply, e.g. "one S in every 3 pieces"), and a **supply rule** in balance.ts caps what it may ask for. Dual halves of the wanted element count.                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | Mossvale teaching order and channel                                      | Teaching happens **on the board**: on the first attempt the person places the first piece themselves, and the row vanishes or the sprout pops. The objective sits on the board's frame. The order is **Rowan → Pip → Bean → Ordor**, guided by each win line (no locks). Ordor is **one-sided**: scripted single rows, no cancel. Bean's win line teaches mana.                                                                                                                                                                                                                                                                                                                                           |
| 4   | Bot duel is costly and weak; haggling has no value                       | DUEL becomes a **scripted rival**: a data-driven garbage schedule plus a modelled stack, drawn as the mini board (S–M, deterministic). Haggling at **3 merchants** only (Ordor, Lo, Garrick). Win = regard +1 toward Friendly (−10% for good), shown on the card. Great = a free item. A markup lasts until you **win a haggle there or 2 days pass**.                                                                                                                                                                                                                                                                                                                                                    |
| 5   | Failure spirals                                                          | **Regard never changes difficulty** (prices, rewards and dialogue only), and it can never drop anyone to Hostile on its own. Wary difficulty is deleted for townsfolk; Wary keeps +20% prices. A lost lesson locks **only that spell** (rev 3: a bounded seal on casting it, N9). Sim floor: strain 2 still ≥ 60% good / ≥ 25% casual.                                                                                                                                                                                                                                                                                                                                                                    |
| 6   | Dark overused, early and unreadable                                      | Vale has no dark. Dark is capped at **4 encounters + the Wyrm**, all after Selene teaches it. The **skyline and the ghost's landing cells always show**; only the interior is dark. Prototyped in M1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | Mechanics fighting the drag controls                                     | Gusts acted **at spawn** and never during a drag (superseded in rev 3 by the crosswind, N3). The Malificat's heavy hands are **visual only** (chains, drag trail, desaturation); gesture thresholds are never touched. Placement-relevant events are telegraphed **one piece ahead**; 1.5 s warnings stay only for gauge attacks. All region rules are counted in pieces.                                                                                                                                                                                                                                                                                                                                 |
| 8   | Targets can't be measured                                                | **200 seeds per cell**, reported with a 95% interval (about ±5.5 points at 80%). The casual bot gets **touch noise** (8% one column off, 5% wrong rotation). Your **first-try log** on M1 is an acceptance row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | HOLD shallow, CHAIN numbers missing, too much DIG, two duels in one town | **HOLD** is now a race: clears shorten the haul. **CHAIN** numbers are specified, with floor 0 and the card framing "build up, then keep it going". DIG drops to 4 people (Wren moves to CONTAIN-protect). **CONTAIN spreads into your own crystals**. Pyre becomes browse-only, so there are no two duels in one town. Rosa and Ada are cut; Pete is the only inn game.                                                                                                                                                                                                                                                                                                                                  |
| 10  | Scope hidden                                                             | Re-costed (§8): world props (a win plus one fail state each), region rules, Wyrm mechanics. Barks cut to **3 per person** plus wordless reaction faces (≈ 75 lines). LOCK strain is a timer cut, not new boards. Archetype move variants deferred to the balance pass. The second half moves to a **non-binding appendix**. Build split into M1 → go/no-go → M2–M5 → M6.                                                                                                                                                                                                                                                                                                                                  |
| —   | Secondary issues                                                         | **Adopted**: Wyrm phase 1 without the wrap (crush-to-stone at the walls, sweep pressure), the tidal pull defined the same way, a **phase-2 checkpoint** after a Wyrm loss (proposed in Q6), fees by region (10/20/35), Wait = "after your next won monster fight", repeat wins pay half with no regard, Vesper takes only from a stack of 2+ (else gil), the Malificat's final element tie-break uses highest alignment, the Stakes card leads with the win, a **pre-roll** (no clock until first touch), the overlay budget defined and enforced, assisted wins keep the gil. **Adjusted**: the assist is offered, not imposed (as the review asked), and I also skip the bonus item on an assisted win. |
| —   | The Malificat                                                            | Treated as decided; renamed throughout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| —   | Vertical slice                                                           | The reviewer's M1 is adopted as written (it adds Vale, Wren's Wait stakes and a dark prototype).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Rev 3 (the re-review's N1–N13, all applied)

| #   | Re-review issue                                  | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Ordor fails a normal player by default           | At Ordor a **received row moves the meter +1** (Lo and Garrick stay at +3). Singles-only play now ends at about 104% (Even); one tetris or two triples wins.                                                                                                                                                                                                                                                                                                                                            |
| N2  | Bean's upright S buries a hole, even in the demo | A **soil ridge** cell at row 1 in each furrow's left column (cols 0, 4, 8). An upright S seats flush, and S pieces stack flush on each other. Paths take O, I, and L+J pairs (T dropped from the list).                                                                                                                                                                                                                                                                                                 |
| N3  | Gusts at spawn are toothless                     | Replaced by a **crosswind**: every 4th piece (marked on the preview) can't move past a marked **wind line**. The drag simply stops there, and the piece spawns on the allowed side. No input change and no desync. Sky Ram's line is at col 3. Applied to Kestrel, the cliffs rule and Twitch.                                                                                                                                                                                                          |
| N4  | Twitch's violet bin can't be tiled               | Bins `LLLL OO TTTT`: cols 0–3 L, cols 4–5 O, cols 6–9 T. Plus an **M0 shape-fit check**: every zone must have a drop-only tiling by its wanted shape.                                                                                                                                                                                                                                                                                                                                                   |
| N5  | HOLD rewards singles                             | **2 s per line plus a 5 s bonus on 3+** (a triple saves 11 s, a tetris 13 s). Tam's Great is re-derived: hauled in ≤ 35 s of real time.                                                                                                                                                                                                                                                                                                                                                                 |
| N6  | CHAIN's floor makes the drain moot               | **Banked lanterns**: lit at 25, 50, 75 and 100, and each lit one is a floor the drain can't go under. Applied to Pete and Ysolde.                                                                                                                                                                                                                                                                                                                                                                       |
| N7  | GRIND is easy and its board unspecified          | **Only singles grind.** A double chips the shard, 2 chips or any 3+ clear shatter it. An 8-row grit mortar is specified.                                                                                                                                                                                                                                                                                                                                                                                |
| N8  | Regard only ratchets down on repeatables         | A repeat win **restores** regard, up to the level the first win reached (never above it).                                                                                                                                                                                                                                                                                                                                                                                                               |
| N9  | The lesson lock reads as no penalty              | **The taught spell is sealed** (it can't be cast) until you win the lesson **or win 3 monster fights**, whichever comes first, so it's bounded and can't spiral. One seal at a time. Lent spells: regard −1 plus Wait.                                                                                                                                                                                                                                                                                  |
| N10 | Cinda and Orrin too easy                         | **Cinda**: 11-piece queue, 3 traps (two J pieces that look like the blade's L, and a gold O that looks like the bow's O\*), flaw limit **1**, a **2×4 rack** that only the two J pieces fill, timer **60 s**, with a new worked solution. (11 pieces, not the suggested 12: with 3 traps and one legal home each, 11 is what tiles.) **Orrin**: the solver counts **solution classes** (the O pieces' order and columns), and a non-opening trap is added: a T must cap the left stack after the 2nd O. |
| N11 | Wren's caps have no row-clear rule               | **A cap in a cleared row is picked** (saved), and it counts toward the objective.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| N12 | The Wyrm's sweep buries holes                    | Sweep and pull shift only rows that have a gap (the gap moves). The cell pushed off one edge comes back as **stone on the far edge**, so cells are conserved and no holes are made. M5 sims this against the crush variant before choosing.                                                                                                                                                                                                                                                             |
| N13 | Small gaps                                       | **Moon drain dropped**; the caves rule is rockfall only. **Route check**: the ruins' dark switches on only once Selene's lesson has been played, Ivo offers only after that, and a data test proves it. **Vale's assist is Maren**, tossing only J or T shapes. **A haggle markup applies to Browse prices too.**                                                                                                                                                                                       |

---

## 0. The diagnosis, checked against the code

| Complaint                     | What the code does                                                                                                                                        | Where                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Haggling can't be lost        | The status is `won` when the pieces run out (6–10 pieces), at any price. Doing nothing still "wins" a shop at about 115–125%. Every shop visit forces it. | `src/battle/haggle.ts` `status()`      |
| Rowan is trivial              | 3 pre-filled rows, queue `O, I`, clear 3. Two placements.                                                                                                 | `src/data/npcs.ts` `elder.challenge`   |
| Pip, Orrin, chest, Vesper     | 2–4 rows, 2–3 pieces, one obvious answer.                                                                                                                 | `npcs.ts` puzzles                      |
| Barter and offering           | "Clear N of a colour" or "reach a score", with 20–30 pieces of slack. Failing "costs time, not loot".                                                     | `barter.ts`, `offering.ts`             |
| Failing never matters         | A lost NPC challenge gives no penalty, changes no attitude and leaves no trace in the world.                                                              | `src/game/encounter.ts` `resolveNpc`   |
| No place on the board         | The same 10×20 grid and art everywhere.                                                                                                                   | `types.ts` `Objective`, `boardView.ts` |
| Every errand the same         | 4 kinds across 27 people; 9 of them are "clear N of a colour".                                                                                            | `npcs.ts`                              |
| NPC difficulty never measured | `npm run sim` plays only fights and lessons.                                                                                                              | `tests/sim/simulate.ts`                |
| Lessons are easy              | Lessons win 87–100% for the good bot; the mentor tosses up to 50% of pieces.                                                                              | GAME_DESIGN "Balance", `lesson.ts`     |

Monster fights already have teeth (67–90% for the good bot, a loss costs the inn and half your gil). Their problem is sameness (§7).

---

## 1. Design pillars

1. **The board is the place.** Every board shows the fiction before the first piece: a brick well, furrows, a tower outline, a merchant's stack. If a cell isn't something in the story, it isn't there.
2. **Each person has their own verb.** No two encounters in one town or region share a verb. A returning verb brings a new twist.
3. **Stakes before the first piece.** The Stakes card shows the win first, then the cost of failing, then the retry rule, in the person's words. No hidden punishments.
4. **You can lose, and the world remembers.** A fail lowers regard, a retry costs something, and the situation gets worse (strain), visible on the map. Failure never makes the _next_ encounter with someone else harder.
5. **Shown, then trusted.** Mossvale teaches each idea on the board, by the person's own hands. After that there's no hand-holding, and each region adds one rule.
6. **The person is in the room.** The person's portrait sits in the stage strip, reacting with faces to every event and speaking at three beats.

---

## 2. Verb library

### Colour is shape

Every element is one tetromino:

| Element   | Colour | Piece |
| --------- | ------ | ----- |
| Nature    | Green  | S     |
| Fire      | Red    | Z     |
| Lightning | Gold   | O     |
| Water     | Blue   | J     |
| Earth     | Orange | L     |
| Arcane    | Violet | T     |
| Wind      | Cyan   | I     |

Dual pieces are the exception: half the piece in its own element, half in a related one. So "clear green" means "place S pieces", and **any colour verb is really a shape-and-supply verb**. Three rules follow.

1. **Controlled queue.** Every colour encounter guarantees its supply: "≥ 1 wanted piece in every k pieces". This is done by bag slotting, not just tilting the bag.
2. **Supply rule** (in `balance.ts`, checked in M0):

   > wanted cells required ≤ 0.5 × (piece limit ÷ k) × 4

   Purity P is never above 7 of 10. **Dual halves of the wanted element count**, so dual pieces become a choice: where does the off-colour half go?

3. **Fit the zone to the shape.** Every zone must be fillable by the wanted shape: a 2-wide furrow fits an upright S; a 1-wide zone is never used.

### Verbs

Nine are Challenge rules (`src/battle/*.ts`, implementing `Challenge`); FIGHT is the existing combat plus region rules. They share four systems:

- **Tags**: markers on cells that move with the cell.
- **Zones and masks**: fixed board regions.
- **Narrow boards**: `Board` already takes a width.
- **Pre-roll**: the board, skin and pulsing objective cells show first; the clock and the first piece start at the first touch.

| Verb                | On the board                                                                                                                                                                                                                                                                          | Tests                                                 | Fail                                               | Scales by                         | Touch                         | Cost        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- | --------------------------------- | ----------------------------- | ----------- |
| **DIG**             | Pre-filled debris with tagged **targets**. Win by clearing a target's row, uncovering it, or removing every debris tag. Modifiers: **rising** (a row pushes up every N pieces, and each new buried hole brings it 1 piece sooner); **fragile** (a piece locked on a target chips it). | Downstacking, hole reading                            | Danger line crossed, pieces run out, target broken | Rows, rising interval, chip limit | Good                          | M           |
| **GRIND**           | A tagged object (never clears) needs K **single-line** clears through each of its cells. A double through it **chips** it; 2 chips, or any 3+ clear through it, **shatter** it. The inverse of normal play: you can't make big clears near it.                                        | Restraint                                             | Shatter, pieces run out                            | K, pieces                         | Good                          | S (on tags) |
| **CONTAIN**         | Hazard tags spread to one adjacent crystal every N pieces, **including crystals you just placed**: "don't build next to the murk" is the decision. Clearing a line removes its hazard. Optional protected tags die when touched.                                                      | Where to place, what to clear first                   | Hazard cap, protected tag lost, top-out            | Start count, interval, sources    | Good                          | M           |
| **PLANT / SORT**    | Column zones sized to their shape. In a cleared line, a crystal of the zone's colour scores. At Mossvale a wrong colour scores 0; from Twitch on it scores −1. SORT uses 3 colours and bins.                                                                                          | Shape to place, rotation, dual halves                 | Pieces run out below target, top-out               | Target, colours, penalty          | Good                          | S           |
| **BUILD**           | Fill a ghost outline; line clears are **off**. Cells outside both the outline and the spare area are wobbles. A buried gap inside the outline is a crack. Optional colour share per part. Authored queue, at least 3 previews.                                                        | Exact placement, the preview, pairing                 | Crack, wobble or flaw limit, timer                 | Outline, limits, colour share     | OK: slow gravity, ghost piece | M           |
| **CHARGE**          | Only **pure** lines count (≥ P of 10 in the wanted element, P ≤ 7, dual halves count). Each lights a lamp or stroke on the frame.                                                                                                                                                     | Building by colour                                    | Pieces run out, top-out                            | P, lamps, a twist                 | Good                          | S           |
| **CHAIN**           | Meter (numbers below).                                                                                                                                                                                                                                                                | Building a stack, then a combo run                    | Pieces run out, top-out                            | Target, pieces                    | Good                          | S           |
| **HOLD (race)**     | A haul countdown T. Each line cleared takes 2 s off, **plus a 5 s bonus** for a 3+ line clear (a triple saves 11 s, a tetris 13 s). Pressure pushes rows up on a piece schedule, telegraphed one piece ahead. One element's surge cancels the next push.                              | Safe singles versus greedy big clears, under pressure | Stack crosses the danger line                      | T, push interval and size         | Good                          | S           |
| **DUEL (scripted)** | The rival is a **modelled stack** drawn as a mini board in the stage strip (rules below). A tug meter between the portraits.                                                                                                                                                          | Big clears, tempo                                     | You top out, or the meter finishes on their side   | Script per merchant               | Good                          | **S–M**     |
| **LOCK**            | A fixed queue, all shown, on an authored board with 1–3 traps (the greedy move fails). Recorded solutions.                                                                                                                                                                            | Planning                                              | Queue or timer runs out                            | Length 6–14, traps                | Good: no rush                 | S           |
| **FIGHT**           | Combat plus a **region rule** (§7) and telegraphs. Lessons add the **mentor's shield** (§6.3).                                                                                                                                                                                        | Everything                                            | HP 0                                               | Existing tables                   | Existing                      | M           |

**CHAIN numbers**

- +10 per line cleared.
- +15 × (combo step − 1) for consecutive clearing pieces: the 2nd in a row +15, the 3rd +30, the 4th +45.
- +20 for back-to-back 2+ line clears.
- −5 per piece that clears nothing.
- **Banked lanterns**: reaching 25, 50, 75 and 100 lights a lantern on the frame. A lit lantern is a **floor** the drain can't go under (the meter starts with floor 0).
- Target **100** (four lanterns) within 36 pieces.
- Plain play inches up and banks the first lantern or two (partial progress, a softer skill cliff). Combo runs (a stack with a 1–2 wide well, then 3–4 clearing pieces in a row) bank the rest. The card says **"Build up, then keep it going."**
- The sim's good bot needs a combo hint (§9).

**DUEL (scripted) rules**

- The rival's stack starts at S rows and **tops out at 12**.
- The rival's own growth and its "clears" follow a data script.
- The rival sends garbage on a script; each send is telegraphed one piece ahead (a red pending bar).
- Your 2/3/4-line clears add 1/2/4 rows to the rival's stack (+1 back-to-back). Singles send nothing.
- Meter −3 per row you send, **+3 per row received (+1 at Ordor, where there's no cancel)**, clamped to 70–130%.
- It ends at time T or on a top-out.
- Per-merchant twists are script fields: late blocks, cancel allowed, hot rows.
- **The Vesper duel** (second half) is the only place a real bot might be used, and that is decided then.

**Shared rules**

- **No idle win.** The idle bot loses 100% of encounters. The dropper bot loses ≥ 90% (≥ 85% in Mossvale).
- **Mana from the board only.** NPC boards fill the pools; spells work in every encounter (Quake digs, Purify cleans murk).
- **Same controls.** No verb adds an input or changes a gesture threshold. Nothing moves the falling piece while a finger is down.
- **Crosswind** (the wind rule; this replaces gusts): every 4th piece is marked on the preview with a wind arrow. That piece spawns on the allowed side of a **wind line** drawn on the board, and can't be dragged past it; the drag stops at the line, like a wall. It's a placement constraint you plan for, not a push.
- **Shape-fit** (M0 check): every zone and bin must be fillable, by drop-only placements, using its wanted shape (a small solver or a table).
- **Overlay budget.** At most **one** hazard or visibility family (hazard tags, or dark) **plus one** objective family (targets, zones, or an outline) per board. Frame lamps and meters are not overlays.

---

## 3. Stakes system

### 3.1 Before

- Greeting → **Stakes card** → **Take it on** / **Not now** (always free).
- From the first touch (the pre-roll) you are committed. **Give up** counts as a fail.

**Stakes card** (Rowan, strain 0), in this order:

| Row     | Example                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| **Win** | Quake (or 40 gil) · the well runs clear · regard ●●○ → one more good turn and Rowan is Friendly (−10%, a bonus) |
| The ask | "Scrape down to the pipe before the mold climbs over the lip."                                                  |
| Fail    | The mold spreads (one row worse next time) · Rowan cools                                                        |
| Retry   | Right away                                                                                                      |

### 3.2 Failure has teeth, without spirals

| Tooth                      | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regard**                 | Saved per person, −2 to +2, added to the attitude score. +1 on a first win; −1 on a fail. A **repeat win restores** regard by 1, up to the level the first win reached (never above it), so a loss can be repaired but repeats can't be farmed for regard. **It moves prices, rewards and dialogue only. It never changes any challenge's difficulty**, and it can never push someone to Hostile on its own (the floor is Wary if alignment alone isn't Hostile). Wary difficulty (`WARY_HARDER`) is removed for townsfolk; Wary keeps +20% prices. |
| **Retry cost**             | One rule per encounter (table below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Worse outcome (strain)** | Saved per encounter, 0–2. Each fail adds a step: the next attempt is harder (per verb, below), and the world shows the fail state. A win resets it; a night at an inn takes off 1 step.                                                                                                                                                                                                                                                                                                                                                             |

**Retry rules**

| Rule     | Meaning                                                                                                                | Used by                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Now**  | Retry at once                                                                                                          | Mossvale; the first lesson retry                          |
| **Wait** | After your **next won monster fight**                                                                                  | Most townsfolk, thresholds, lessons after the first retry |
| **Fee**  | Pay now, or Wait for free. Fees by region: hub/grove/lake **10**, quarry/forge/peaks **20**, cliffs/ruins/caves **35** | Orrin, Tam                                                |
| **Item** | The item breaks                                                                                                        | Nim (Goblin Charm), Steve (Moon Shard)                    |
| **Day**  | Once per day (a day ends at an inn)                                                                                    | Haggles, Pete, repeat plays of repeatables                |
| **Once** | One chance at this stop                                                                                                | Vesper                                                    |

**Strain per verb** (maximum 2; maximum 1 at thresholds)

| Verb         | Each step                               |
| ------------ | --------------------------------------- |
| DIG          | +1 debris row                           |
| GRIND        | −3 pieces                               |
| CONTAIN      | +3 starting hazard                      |
| PLANT / SORT | Target +2                               |
| BUILD        | −10 s or 1 pre-cracked cell             |
| CHARGE       | +1 lamp                                 |
| CHAIN        | Target +15                              |
| HOLD         | +5 s                                    |
| DUEL         | Meter starts 5 points worse             |
| LOCK         | −10 s (no new boards)                   |
| Lesson       | none: the spell seal (§6.3) is the cost |

### 3.3 Optional rewards

- Townsfolk challenges are **optional**, except the three thresholds.
- **Win** and, where it fits, **Great** (+1 item). The bonus and secret by attitude are unchanged.
- **Repeatables** (Bean, Wren, Tam, Nim, Steve, Ysolde, Twitch, Ivo): once a day. **Repeat wins pay half and give no regard.** The economy sim includes daily farming.

### 3.4 Essential and threshold

- **Essential** (never refuses): Myst. Her challenge stays optional.
- **Threshold** (required, no other route): **Flint** (ridge), **Cinda** (peak gate), **Vale** (cave pass).
- **Failing a threshold**: regard −1, strain +1 (cap 1), Wait.
- **After 2 fails, the assist is offered** on the Stakes card: "Let Dorn steady it?" / "I'll do it myself."
  - The assisted try: strain clears; the mentor tosses at 30% per piece, steered by the challenge's placement hint.
  - The win **keeps the gil** but drops the bonus item; regard +0.
- **Why required:** these are Threshold beats. As optional games they'd be filler; as gil tolls they'd be purchases. The mentor's help makes the Mentor stage real and guarantees no walls.

---

## 4. Context: why you're doing this

| When                      | What                                                        | How                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Before**                | The ask in their words, with the objective in fiction terms | Greeting → Stakes card; the `objective` line ("Scrape down to the pipe…").                                                                                                                                                          |
| **Mossvale, first try**   | **Shown, not told**                                         | The person places the first piece themselves, as a scripted toss you watch: the row vanishes, the sprout pops, the tower rises a level. Then you get control.                                                                       |
| **During: the place**     | Board skin, zones and tags drawn as things                  | About **8 unique skins** (well shaft, herb beds, toy tower, market stall, spring basin, anvil, beacon, rune wall). The rest are recoloured region themes.                                                                           |
| **During: the objective** | On the board frame, not just the strip                      | One line (≤ 2 at 390 px) on the frame's top edge, with the counter beside it.                                                                                                                                                       |
| **During: the person**    | Faces plus 3 lines                                          | Wordless **reaction faces** on every event (wince at a hole, cheer at a 3+ clear, alarm at danger). **3 spoken lines** per person: `start`, `hazard` (their verb's event), `nearly` (≥ 85%). Win and fail use their existing lines. |
| **After**                 | The world changes                                           | Each encounter has **one win prop and one fail prop** on the map (no per-strain props; the card shows strain).                                                                                                                      |
| **Across the game**       | The threat stays in view                                    | Each region fixed brightens its Sevenstones stone.                                                                                                                                                                                  |

---

## 5. Difficulty curve and targets

### 5.1 Mossvale: four ideas, shown on the board, in order

The opening ends at Rowan's well. Each win line points to the next person ("Pip's been wailing about his tower since dawn"). Nothing is locked.

| #   | Person | Verb            | Idea (named)                                                         | The demo (first try only)                                          | Explained in their words                                                                |
| --- | ------ | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | Rowan  | DIG + rising    | **"Clear to dig"**: full lines vanish; buried gaps come back to bite | Rowan drops an O into the top gap; the row vanishes                | "Every row you fill, I scrape out. Leave a gap under a stone and the mold roots in it." |
| 2   | Pip    | BUILD           | **"Read the next piece"**: look ahead, pair shapes                   | Pip drops the first O; the tower rises a level; the previews pulse | "Look what's coming! Two J's make a block, see? Ugly ones go in the toy box!"           |
| 3   | Bean   | PLANT           | **"Colour is shape, and where it lands matters"**                    | Bean drops an upright S into a furrow; a sprout pops               | "Seed's the green S, love. The red Z only _looks_ like it. Stand it up in the furrow."  |
| 4   | Ordor  | DUEL, one-sided | **"Big clears push back"**                                           | Ordor slides one telegraphed row across: "Counter-offer!"          | "A single doesn't move me. Two, three, four lines at once? Now you're haggling."        |

Bean's win line also carries the mana idea: "Green you clear goes to your own green magic, too."

### 5.2 Escalation

- **Mossvale**: one verb, no twist.
- **Hub, grove, lake**: a verb plus one twist.
- **Quarry, forge**: two verbs combined or real-time pressure.
- **Peaks, cliffs, ruins, caves**: verb + region rule + tighter limit.

Dark appears only after Selene (§7.1).

### 5.3 Targets

**Conditions**

- First try, strain 0, touch pace (2.2 s per piece).
- **200 seeds per cell.** Each cell reports its mean and 95% interval (±5.5 points at 80%, ±7 at 50%).
- **A cell passes** when its mean is inside the band.
- **Bots**:
  - **good**: two pieces deep plus the hint; light touch slips (half the casual rate), 70% caught on the landing ghost; 2.2 s per piece (Author decisions, Oct 29);
  - **casual**: a planner with slips: two pieces deep plus the hint, 15% second-best placements, **touch noise** (8% one column off, 5% wrong rotation), 70% caught on the ghost, 2.6 s per piece (Author decisions, Oct 29);
  - **beginner** (reported, no band): the old casual, `bestFit` with no look-ahead, 15% second-best, every slip uncaught;
  - **dropper**;
  - **idle**.
- Good, casual and beginner use the same per-verb placement hint, so the hint can't flatter one of them.

| Band                          | Good                                                                      | Casual                         | Dropper | Idle   | Length (good) |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------ | ------- | ------ | ------------- |
| Mossvale                      | 90–97%                                                                    | 60–75%                         | ≤ 15%   | 0%     | 40–80 s       |
| Hub (Brightwater)             | 85–92%                                                                    | 50–65%                         | ≤ 10%   | 0%     | 50–90 s       |
| Grove, Lake                   | 80–90%                                                                    | 45–60%                         | ≤ 5%    | 0%     | 55–95 s       |
| Quarry, Forge                 | 75–85%                                                                    | 40–55%                         | ≤ 3%    | 0%     | 60–100 s      |
| Peaks, Cliffs                 | 70–80%                                                                    | 35–50%                         | 0%      | 0%     | 65–110 s      |
| Ruins, Caves                  | 65–75%                                                                    | 25–40%                         | 0%      | 0%     | 70–120 s      |
| Thresholds                    | 80–90%                                                                    | 45–60%                         | 0%      | 0%     | per region    |
| Threshold, assisted           | ≥ 97%                                                                     | ≥ 90%                          | —       | 0%     | —             |
| Haggle: ≤ 94% finish          | 70–80%                                                                    | 30–45%                         | 0%      | 0%     | 45–60 s       |
| Haggle: mean price            | 84–90%                                                                    | 96–103%                        | ≥ 110%  | ≥ 112% |               |
| Vesper 1–4 (one try)          | 75 / 70 / 65 / 60%                                                        | 45 / 40 / 35 / 30%             | 0%      | 0%     | 40–90 s       |
| Lessons d1 / d2 / d3 / hidden | 80–90 / 70–80 / 60–70 / 55–65%                                            | 50–65 / 40–55 / 30–45 / 25–40% | ≤ 15%   | 0%     | 50–100 s      |
| Monster fights                | **Unchanged** approved targets (re-run at 200 seeds)                      |                                |         |        |               |
| Moon Wyrm                     | **Unchanged** (good 15–20, kit 20–30, prepared 35–45%); each phase ≥ 30 s |                                |         |        | 100–140 s     |

**Floors and rows that also have to pass**

- **Strain 2**: good ≥ 60%, casual ≥ 25% in every band. Wary no longer changes difficulty, so this one floor covers every attitude.
- **LOCK and BUILD with authored queues**: a solver finds 1–4 solutions, and the greedy bot fails.
- **The author row (M1)**: you win Rowan on your first try, and fail at least one of Pip, Bean or Ordor at least once. Your "stupidly easy" verdict is the real target; a pass with every bot band met but the author bored is a fail.

---

## 6. Encounter specs

**Notation**

- Row 1 is the bottom; columns 0–9.
- In row strings, `m` is mold (violet and green crystals), `#` is stone, `.` is empty, and `P` is a tagged target.
- **Lines** are drafts in the person's voice (3 each), for your edit in STORY.md.
- **World** = one win prop and one fail prop.

### 6.1 Mossvale (level 1)

#### Elder Rowan: "The Well" · DIG + rising · _Clear to dig_

- **Board**
  - A **7-wide** well shaft (cols 0–6 inside brick masonry; was 6, Author decisions, Oct 29); the **lip** at row 14 (16 since the M1 tuning).
  - Start (top to bottom):

    | Row | Cells     |
    | --- | --------- |
    | r5  | `mm..mmm` |
    | r4  | `mmmmm.m` |
    | r3  | `m.mmmmm` |
    | r2  | `mm.mmmm` |
    | r1  | `mmPmm.m` |

    (Five rows since the M1 feasibility re-authoring, seven wide since the Oct 29 decision.)

  - The **pipe** is P (a tagged stone) in row 1.
- **Demo**: Rowan drops an O into r6's gap; r6 clears; the O's top half settles flat.
- **Rising**: every 6 pieces a 1-gap mold row pushes up from below. Each new buried hole brings it 1 piece sooner. Rows pushed in below the pipe don't need clearing.
- **Objective**: "Scrape down to the pipe before the mold climbs over the lip." Clear the pipe's row.
- **Fail**: a cell locks above the lip.
- **Stakes**: retry **Now**; strain +1 debris row.
- **Reward**: Quake, or 40 gil.
- **Feasibility**: random queue; M0 run with good ≥ 95% over 200 seeds, or the layout is re-authored.
- **Lines**
  - "Lip's your limit, kid. Mold over the lip and it's in the tea."
  - "_The shaft groans._ There it comes again."
  - "There's the pipe!"
- **World**: clear water and villagers at the well / violet water with mold up the wall.

#### Pip: "The Crystal Tower" · BUILD · _Read the next piece_

- **Board**
  - **Tower outline**: cols 4–7, rows 1–8 (32 cells).
  - **Spinner**: row 9, cols 4–7, capped by a flat I.
  - **Toy box**: cols 0–2, rows 1–5, where a mess is fine (holes don't count).
  - Line clears off; gravity at level 1; **3 previews** (Pip calls them out).
- **Queue** (12): O, **S**, O, J, J, **Z**, I, I, L, L, I, then a spare O (Author decisions, Oct 29). Total = 36 tower and spinner cells (9 pieces) + 2 toy-box pieces + 1 spare.
- **Worked solution**

  | #    | Piece     | Placement                                                                                       |
  | ---- | --------- | ----------------------------------------------------------------------------------------------- |
  | 1    | O         | Cols 4–5, rows 1–2                                                                              |
  | 2    | S         | Upright in the box: col 1 rows 2–3, col 2 rows 1–2                                              |
  | 3    | O         | Cols 6–7, rows 1–2                                                                              |
  | 4    | J (spawn) | Bar row 3 cols 4–6, nub row 4 col 4                                                             |
  | 5    | J (180°)  | Bar row 4 cols 5–7, nub row 3 col 7                                                             |
  | 6    | Z         | Upright at cols 0–1: rests on the S, cells col 0 rows 3–4, col 1 rows 4–5, still inside the box |
  | 7, 8 | I, I      | Flat, rows 5 and 6                                                                              |
  | 9    | L (spawn) | Bar row 7 cols 5–7, nub row 8 col 7                                                             |
  | 10   | L (180°)  | Bar row 8 cols 4–6, nub row 7 col 4                                                             |
  | 11   | I         | Flat, row 9 (the spinner)                                                                       |

  0 cracks, 0 wobbles.

- **Traps**: the S right after the first O, and the Z after the J pair. Both look like they'd "fit somewhere" in the tower.
- **Demo**: Pip drops piece 1.
- **Fail**: 4th crack, 2nd wobble, or the queue ends unfinished.
- **Stakes**: retry **Now**; strain: 1 pre-cracked cell.
- **Reward**: Ether.
- **Lines**
  - "Next is a square! Then a squiggly one, ew!"
  - "It's wobbling!"
  - "Spinner time! The long one, flat!"
- **World**: the tower spins / the tower leans.

#### Farmer Bean: "The Herb Beds" · PLANT · _Colour is shape_

- **Board**
  - Columns `F F P P F F P P F F`: **furrows** at cols 0–1, 4–5 and 8–9 (soil); **paths** at cols 2–3 and 6–7 (grass, which take O, upright I, and L+J pairs).
  - A **soil ridge** (an inert filled cell that never scores) sits at row 1 in each furrow's left column (cols 0, 4, 8). An upright S (left column high) seats flush on it, and each S stacks flush on the last: "stand it up, it fits".
  - No hardpan at strain 0.
  - A sun crosses the strip.
- **Queue**: controlled, with **one S in every 3 pieces** (bag slotting), the rest random. Dual pieces on, and green halves count.
- **Supply check**: 26 pieces → 8–9 S → about 34 green cells. The target of 12 is about 35% of supply (within the 50% rule).
- **Demo**: Bean drops an upright S onto the cols 0–1 ridge; it seats flush with no hole, and a sprout pops.
- **Objective**: "Plant 12 sprouts in the furrows before sundown." Each green crystal in a furrow in a cleared line counts +1. Any other colour counts 0. 26 pieces.
- **Fail**: below target at sundown, or top-out.
- **Stakes**: retry **Now**, then **Day** (repeatable); strain: target +2.
- **Reward**: 2 Herbs. **Great** (≥ 16): +1 Herb.
- **Lines**
  - "The seed's the green S, love. The red one only looks like it."
  - "Upright, it fits the furrow."
  - "Last row before dark!"
- **Win line adds**: "Green you clear goes to your own green magic, too."
- **World**: green beds and a herb rack / grey beds.

#### Shopkeeper Ordor: "The Stall" · DUEL, one-sided · _Big clears push back_

- **Shops** (all of them): **Browse** at list price × attitude, always.
  - **Haggle** only at **Ordor, Lo and Garrick**, once per day.
  - **Win**: discount until you leave the town, plus **regard +1** (the card shows "1 more deal: Friendly −10% for good").
  - **Great**: plus a free item (a Herb at Ordor).
  - **Fail**: a markup on that shop's prices, **Browse included**, until you win a haggle there or 2 days pass. Regard −1.
- **Rival script**
  - His stack starts at 4 rows (crates) and grows +1 row every 10 s.
  - He sends **1 single row every 15 s**, telegraphed one piece ahead. No cancelling at Mossvale. **Each row you receive moves the meter only +1** (+3 elsewhere).
  - The arithmetic: playing only singles ends at about 104% (Even, no penalty); one tetris (−12) or two triples (−12) reaches a Win.
  - He clears −2 rows every 20 s.
  - Duration 60 s.
- **Your clears**: 2/3/4 lines add 1/2/4 rows to his stack. If he reaches 12 rows: **"Sold!"** (min(meter, 80%)).
- **Price bands**: ≤ 85% Great, 86–94% Win, 95–105% Even, ≥ 106% Fail. If you top out, it's a walk-off: max(meter, 115%).
- **Demo**: his first counter-offer row arrives during the pre-roll.
- **Lines**
  - "A single? I didn't feel it."
  - "Counter-offer!"
  - "Careful, you'll tip the scales!"
- **World**: green prices on the slate / red prices on the slate.

### 6.2 Brightwater (hub, levels 1–3)

#### Captain Vale: "The Ward Lamps" · CHARGE, twist _wind snuffs_ · **Threshold** (cavePass) · no dark

- **Board**: the cave mouth, with 4 sconces on the frame.
- **Queue**: controlled, with **one J and one T in every 3 pieces** (was 4; Author decisions, Oct 29).
- **Objective**: "Light all four ward lamps: two blue, two violet. A lamp only takes a pure line." P = 6 (was 7; Author decisions, Oct 29), dual halves count. 36 pieces.
- **Twist**: every 14 pieces the wind snuffs the oldest lit lamp, unless all 4 are lit. The flame flickers one piece ahead.
- **Supply**: 4 × 7 = 28 cells needed, against about 72 wanted cells supplied (39%).
- **Fail**: pieces run out, or top-out.
- **Stakes**: Wait; strain +1 lamp (cap 1). Assist offered after 2 fails: **Maren** (she visits Brightwater's fountain and is usually met early). Her tosses are J or T shapes only.
- **Reward**: Cave Pass, 20 gil.
- **Lines**
  - "Both colours. Don't mess up the ratio."
  - "Wind! Hold that one!"
  - "Last lamp!"
- **World**: lit lamps and alert guards / guttering lamps.

#### Shrine Keeper Myst: "The Clouded Spring" · CONTAIN · essential, optional

- **Board**: the basin. Rows 1–6 hold blue and green crystals, with 6 **murk** tags.
- **Murk**: spreads every 4 pieces to one adjacent crystal, **your own included**. Clearing a line removes its murk.
- **Objective**: "Clear the murk from the spring." Murk 0 within 30 pieces.
- **Fail**: murk ≥ 16, pieces run out, or top-out.
- **Stakes**: Wait; strain +3 murk.
- **Reward**: `shrineRestored` (reveals Purify), Ether.
- **Lines**
  - "Slowly. Don't disturb the silt."
  - "It's taking the clear water."
  - "Nearly clear…"
- **World**: the spring sparkles / brown water.

#### Merchant Lo: haggle · DUEL (scripted), twist _barge clock_

- Her counter-offers come as **2-row blocks every 14 s**, landing **3 s late**.
- **Cancelling is introduced here**: your clears subtract from her pending rows first.
- Her stack starts at 5 rows, grows +1 every 9 s, and clears −2 every 18 s.
- **Lines**
  - "Barges come Thursday. Everything goes."
  - "Ooh, you cancelled my offer."
  - "Final price, final!"
- **World**: as Ordor.

**Smith Pyre**: browse-only (her secret stock is unchanged).

#### Innkeeper Pete: "Lanterns" · CHAIN (the only inn game)

- **Room**: always 10 gil. The game is optional, once a day.
- **Rules**: CHAIN numbers as in §2, with banked lanterns (25 / 50 / 75 / 100); target 100, 36 pieces. A fail that banked 2+ lanterns still gets Pete's warm line; the room is still 20 gil.
- **Win**: the room is free, plus a Herb. **Fail**: tonight's room is 20 gil, and regard −1.
- **Lines**
  - "Hareguy used to beat me at this. Every night."
  - "Keep it going…"
  - "One more lantern!"
- **World**: a lit inn window / a dark window.
- _Rosa and Ada are cut; their inns keep a fixed price._

#### Sage Orrin: "The Lattice" · LOCK + storm timer

- **Board**: rows 1–4 are each `#gg....gg#` (copper rods at the edges, gold crystals, a 4-wide gap).
- **Queue** (10, all shown): 4 O pieces and 6 others (L, J, T, I, S, Z), interleaved so a non-gold piece comes first.
- **The answer**: the O's go side by side in the gap. Each pair of O's completes two rows of 8 gold + 2 stone (pure). Every non-gold piece goes on the outer columns above row 4 without contaminating a lattice row.
- **Objective**: "Three lines of gold. Anything less, it melts." 3 pure lines; storm timer 90 s.
- **Stakes**: Fee 10, or Wait; strain −10 s.
- **Reward**: Thunder, or the Storm Charm.
- **Second trap (not the opening move)**: right after the 2nd O comes a T. It must cap the **left outer stack** so that the 3rd O, which arrives two pieces later, lands flush in the shaft instead of hanging on a rod.
  - Dropped in the shaft, the T contaminates a lattice row.
  - Dropped flat on the right, it blocks the shaft.
- The I must stand upright (any flat placement overhangs col 3 or col 6).
- **Feasibility**: the exact queue is authored with a recorded solution in M2. The solver counts **solution classes** (the O pieces' order and columns, ignoring where the junk goes): 1–3 classes required, and the greedy bot must fail.
- **Lines**
  - "Mind the top rods. They bite."
  - "Thunder's close…"
  - "One more line of gold!"
- **World**: the lattice hums / a scorched roof.

#### Collector Nim: "Clean the Charm" · DIG + fragile

- **Board**: 8 rows of cave mud. A 2×3 **charm** (tagged, never clears) is buried at rows 2–4; a row with charm cells clears its other cells.
- **Objective**: "Brush it clean: bone chips, wire snaps." Uncover the charm (nothing above it) within 24 pieces.
- **Fail**: 2 chips (a piece locked on the charm), pieces run out, or top-out.
- **Stakes**: Item (the charm is scratched; it still sells for 20).
- **Reward**: 45 gil. **Great**: 0 chips, +5 gil.
- **Lines**
  - "Gently."
  - "_wince_ That's a chip."
  - "Look at the wirework!"
- **World**: a new charm in his cabinet / a scratched charm on his desk.

### 6.3 Mentor lessons: FIGHT + the mentor's shield + their region's rule

- **The mentor's shield.**
  - At 25% HP the foe raises a shield ringed in the spell's colour. Only **the spell being taught** breaks it.
  - The spell is **lent** if you don't know it yet; its mana comes from the board.
  - So every lesson ends with you casting what you're learning.
- **The region's rule.** The lesson teaches its home region's rule (table below) before the region's monsters use it.
- **Help.** Toss chance clamp(30% − 5% × (alignment − difficulty), 5%, 35%) × relation.
- **A lost lesson seals the taught spell.** If you already know the spell, it can't be cast (at your current level) until you win the lesson **or win 3 monster fights**, whichever comes first. The mentor says "Leave the flame alone till you've earned it back."
  - Only one seal at a time: a later loss doesn't add a second.
  - Other spells in the element stay free, so the penalty bites but is bounded (no spiral).
  - For a lent spell there's nothing to seal; the tooth is regard −1 plus Wait.
- **Retry**: Now once, then Wait. The full-HP start is unchanged.

| Mentor  | Region rule, taught here (piece-counted, telegraphed one piece ahead)                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hazel   | **Spores**: a spore lands every 5 pieces and spreads every 3. A 4-cell cluster petrifies.                                            |
| Maren   | **Tide**: a garbage row every 7 pieces, cancelled if a blue surge fired since the last one.                                          |
| Dorn    | **Rockfall**: a stone drops into the tallest column every 6 pieces.                                                                  |
| Torva   | **Slag**: 3 non-clearing pieces in a row turn 2 top crystals to stone.                                                               |
| Rook    | **Bolts**: every 6 pieces a bolt deletes the top 2 cells of a marked column.                                                         |
| Kestrel | **Crosswind**: every 4th piece (marked on the preview) can't be dragged past a wind line at col 5, alternating sides each time (§2). |
| Selene  | **Dark** (spec in §7.1). Taught in the Ruins; never seen before this lesson in a normal route.                                       |

- Away from home, a mentor uses their own rule against the local foe.
- **Targets**: the lesson rows in §5.3.

### 6.4 Thornwood Grove (levels 2–4)

#### Forager Wren: "The Mushroom Ring" · CONTAIN + protect

- **Board**: 7 rows of leaf litter. **3 young caps** (protected tags) at rows 3–5. **2 rot sources** at row 1.
- **Rot**: spreads every 4 pieces into adjacent crystals, yours included. A cap touched by rot dies.
- **Caps**: a cap in a cleared row is **picked** (saved, into her basket); its cell leaves the board with the row. Caps must be picked to reach the rot below them.
- **Objective**: "Clear the rot before it reaches the young caps." Rot 0 with ≥ 2 caps picked or still alive, within 30 pieces.
- **Fail**: 2 caps die, pieces run out, or top-out.
- **Stakes**: Wait, then Day; strain +3 rot.
- **Reward**: 2 Herbs, 15 gil. **Great**: all 3 caps, +1 Herb.
- **Lines**
  - "That pale one, guard it."
  - "Rot's moving."
  - "Nearly clean!"
- **World**: a ring of mushrooms / a brown patch.

### 6.5 Glasswater Lake (levels 3–5)

#### Fisher Tam: "Haul the Net" · HOLD (race)

- **Board**: the jetty, with the **gunwale** at row 15.
- **Haul clock**: 60 s. Each line cleared takes 2 s off, plus a 5 s bonus for a 3+ line clear (single 2 s, double 4 s, triple 11 s, tetris 13 s).
- **Tugs**: every 5 pieces the lurker tugs (the rope shakes one piece ahead), pushing up a 1-gap row. A **blue surge** cancels the next tug.
- **Objective**: "Haul it in before he tears it." The clock reaches 0.
- **Fail**: a cell locks above the gunwale.
- **Stakes**: Fee 10, or Wait; strain +5 s.
- **Reward**: 25 gil, Ether. **Great**: hauled in ≤ 35 s of real time, which needs ≥ 25 s of clear savings (about two tetrises, or a tetris and a triple, plus a few lines): +1 Herb.
- **Lines**
  - "Brace!"
  - "Blue! Knot it with blue!"
  - "Nearly in!"
- **World**: mended nets and a fish basket / torn nets.

### 6.6 Redrock Quarry (levels 4–6)

#### Foreman Flint: "The Ridge Road" · DIG + aftershocks · **Threshold** (ridgeCleared)

- **Board**: 10 rows of **rubble** (tagged crystals and stone); the road is drawn below them.
- **Aftershocks**: every 7 pieces a tagged stone drops into the tallest column, which glows one piece ahead.
- **Objective**: "Clear every stone off the road." Rubble tags reach 0 within 45 pieces.
- **Stakes**: Wait; strain +1 row (cap 1). Assist offered after 2 fails: **Dorn**.
- **Reward**: the ridge opens, 40 gil.
- **Lines**
  - "Pushed from under, that slide."
  - "Aftershock!"
  - "I can see road!"
- **World**: the warp opens and the crew cheers / a fresh slide.

### 6.7 Forgefyre (levels 5–7)

#### Apprentice Cinda: "Forge the Key" · BUILD + colour share · **Threshold** (peakGate)

- **Board**: the key lies **on its side** on the anvil, so every cell is supported:

  | Part             | Cells                                   | Colour rule                                    |
  | ---------------- | --------------------------------------- | ---------------------------------------------- |
  | Bow              | Cols 0–1, rows 1–4 (8)                  | **≥ half red** (fire halves count)             |
  | Blade            | Cols 2–9, rows 1–2 (16)                 | **Orange** (L); each non-orange cell is a flaw |
  | Tooth 1          | A T shape: row 3 cols 4–6 + row 4 col 5 | Any colour                                     |
  | Tooth 2          | Cols 7–8, rows 3–4                      | Any colour                                     |
  | Tooth 3          | Col 9, rows 3–6                         | Any colour                                     |
  | **Rack** (spare) | **2×4**: cols 2–3, rows 3–6             | —                                              |
  - Outline total: 8 + 16 + 4 + 4 + 4 = 36 cells. The rack holds 8.
  - Line clears off; 3 previews; quench timer **60 s**.

- **Authored queue** (11, with authored dual pieces; this changes the "fixed queues are never dual" rule for authored queues only): **L, O\*, L, J, L, L, O, O\*, T, J, I**. O\* is a **fire-dual O** (top half red, bottom half gold).
- **Traps** (each has exactly one legal home):
  - **The two J pieces** look like the blade's L. Any J cell in the blade is a flaw, which already exceeds the limit with a J's 4 cells. Their only home is the rack: the two J pieces tile the 2×4 exactly.
  - **The gold O** (piece 7) arrives while the bow's top half is still open and looks like it belongs there. In the bow it leaves only 2 red of 8. Its home is tooth 2.
- **Worked solution**

  | #   | Piece                        | Placement                                          |
  | --- | ---------------------------- | -------------------------------------------------- |
  | 1   | L (spawn)                    | Row 1 cols 3–5 + row 2 col 5                       |
  | 2   | O\*                          | Bow rows 1–2                                       |
  | 3   | L (180°)                     | Row 2 cols 2–4 + row 1 col 2 → blade cols 2–5 done |
  | 4   | J (left-facing, `.X/.X/XX`)  | Rack: row 3 col 2 + col 3 rows 3–5                 |
  | 5   | L (spawn)                    | Row 1 cols 7–9 + row 2 col 9                       |
  | 6   | L (180°)                     | Row 2 cols 6–8 + row 1 col 6 → blade done          |
  | 7   | O (gold)                     | Tooth 2 (cols 7–8, rows 3–4)                       |
  | 8   | O\*                          | Bow rows 3–4 → 4 red of 8 ✓                        |
  | 9   | T (spawn)                    | Tooth 1                                            |
  | 10  | J (right-facing, `XX/X./X.`) | Rack: col 2 rows 4–6 + row 6 col 3 → rack full     |
  | 11  | I (upright)                  | Tooth 3                                            |

  0 flaws, 0 cracks, 0 wobbles. The M0 gate replays it.

- **Fail**: **2 flaws** (the limit is 1), 3 cracks, 2 wobbles, or the timer.
- **Stakes**: Wait; strain −10 s (cap 1). Assist offered after 2 fails: **Torva**, whose tossed pieces are all red (existing toss rule).
- **Reward**: the peak gate key, Ether.
- **Target**: Threshold band (good 80–90%, casual 45–60%). The gate's solver must show the greedy bot fails.
- **Lines**
  - "Iron to the blade, fire to the bow."
  - "That's a flaw, it'll snap in the lock!"
  - "Last tooth!"
- **World**: the key hangs at the gate / a cracked key on the anvil.

#### Armorer Garrick: haggle · DUEL (scripted), twist _hot iron_

- His sends are 1 row every 10 s, and those rows are **red-hot**: if one isn't cleared within 6 pieces, its gap seals with stone (the row turns orange one piece ahead).
- His stack starts at 6 rows, grows +1 every 7 s, and clears −2 every 14 s: the hardest haggle.
- **Lines**
  - "Strike while it's hot."
  - "Too slow. It's set."
  - "Last offer."
- **World**: as Ordor.

**Innkeeper Rosa**: fixed price, no game.

### 6.8 Stormcrown Peaks (levels 6–8)

#### Beacon Keeper Ysolde: "Relight the Beacon" · CHAIN + bolts

- **Rules**: CHAIN numbers as in §2 (banked lanterns become beacon braziers at 25 / 50 / 75 / 100), **+3 per gold crystal** cleared. Controlled queue: one O in every 4 pieces.
- **Bolts**: every 6 pieces (column marked one piece ahead) a bolt deletes the top 2 cells of that column.
- **Objective**: "Keep it fed. A beacon that goes cold won't take." 100 within 40 pieces.
- **Stakes**: Wait, then Day; strain target +15.
- **Reward**: 2 Ethers, 30 gil.
- **Lines**
  - "Feed it gold!"
  - "Strike, left side!"
  - "It's catching!"
- **World**: the beacon is lit, on the peaks and on the Sevenstones horizon / a cold beacon.

### 6.9 Windward Cliffs (levels 7–9)

#### Courier Twitch: "Scattered Letters" · SORT + crosswind

- **Board**: three **bins**, `LLLL OO TTTT`, each sized so its shape tiles it with drops alone:

  | Bins     | Colour | Piece | For              | How it tiles                           |
  | -------- | ------ | ----- | ---------------- | -------------------------------------- |
  | Cols 0–3 | Orange | L     | The quarry towns | L spawn + L 180° pairs make 4×2 blocks |
  | Cols 4–5 | Gold   | O     | Brightwater      | Stacked O pieces                       |
  | Cols 6–9 | Violet | T     | Moonfall         | 4×4 from 4 T pieces (below)            |
  - **The violet bin's drop-only tiling**:
    1. T spawn: row 1 cols 6–8, row 2 col 7.
    2. T left-facing: col 9 rows 1–3, row 2 col 8.
    3. T right-facing: col 6 rows 2–4, row 3 col 7.
    4. T 180°: row 4 cols 7–9, row 3 col 8.
  - The M0 shape-fit check verifies all three bins.

- **Queue**: controlled, with ≥ 1 L, ≥ 1 T and ≥ 2 O in every 6 pieces.
- **Crosswind** (§2): every 4th piece (marked on the preview) can't be dragged past a wind line at col 5, alternating sides. A letter for the wrong side has to wait or be dumped.
- **Objective**: "Back in the right satchels." 18 letters within 34 pieces.
  - A crystal in its matching bin in a cleared line scores +1.
  - **A wrong colour in a bin scores −1** (the first time this penalty appears).
- **Supply**: about 23 wanted pieces → 92 cells. The target of 18 is about 20%.
- **Stakes**: Wait, then Day; strain target +2.
- **Reward**: 50 gil, Herb.
- **Lines**
  - "That one's for Moonfall!"
  - "Wind! Can't get it across!"
  - "They all say the same thing: people won't wake."
- **World**: a full satchel / letters blowing on the path.

_Warden Ada: fixed price, no game._

### 6.10 Moonfall Ruins (levels 8–10)

#### Scholar Ivo: "The Moon Rune" · CHARGE + dark

- **Board**: the rune wall, with **dark** as in §7.1.
- **Queue**: controlled, with one T in every 3 pieces.
- **Objective**: "Write the rune back in light: four strokes, nothing but violet." 4 pure violet lines (P 7), 40 pieces. Each stroke lit adds 2 lit rows.
- **Supply**: 28 cells needed of about 52 supplied (54%), which is over the 50% rule. **Compensation**: P = 6 for Ivo (24 cells, 46%).
- **Stakes**: Wait, then Day; strain +1 stroke.
- **Reward**: 2 Ethers, 30 gil.
- **Lines**
  - "Pure. It won't take a speck of anything else."
  - "The dark's swallowing it…"
  - "Last stroke!"
- **World**: the rune glows over the tower / a dead rune.

### 6.11 Moon Caves (levels 10–11)

#### Sealed Chest: "The Moon Lock" · LOCK + dark

- **Board**: a moon-crystal lattice across rows 1–7. A 14-piece queue, all shown. 3 traps. Dark as in §7.1. Frost timer 120 s.
- **Objective**: break 4 lattice lines.
- **Stakes**: Wait; strain −10 s ("The crystal grows a little thicker").
- **Reward**: Feather, 2 Moon Shards.
- **Feasibility**: authored in M5 with a recorded solution; solver 1–3 solutions; the greedy bot fails.
- **World**: the open chest with its scratched name / frost-thick crystal.

#### Steve the Cave Hermit: "Grind the Shard" · GRIND (no dark)

- **Board**: the mortar. **8 rows of grit**: grey, violet and orange crystals, each row with 1–2 gaps staggered so that no two adjacent rows share a gap column.
  - A **Moon Shard** sits embedded at row 2 cols 4–5 and row 3 col 4: 3 tagged cells in an L that never clear; their rows clear around them.
- **Rules**
  - Each shard cell needs **3 single-line clears** through its row.
  - A **double** through a shard row **chips** it; **2 chips, or any 3+ line clear** through it, **shatter** it.
  - Clears that don't touch a shard row are free.
  - So you dig the 5 rows above it with any clears, then work rows 2–3 one line at a time: at least 6 single clears through them, set up while the stack above keeps growing.
- **Objective**: "Fine, not smashed. One stroke at a time." 32 pieces.
- **Fail**: the shard shatters, pieces run out, or top-out.
- **Stakes**: Item (a shattered shard is lost), then Day.
- **Reward**: 2 Ethers, 2 Herbs.
- **Feasibility**: M0 run, good bot ≥ 65% over 200 seeds (ruins/caves band). Re-author the grit if it misses.
- **Lines**
  - "Gently, gently. One line."
  - "_hiss_ That's a chip!"
  - "Smells like moonlight."
- **World**: salve jars on his shelf / shard dust on the floor.

### 6.12 Vesper: four meetings, one try each

- **Lore is told win or lose.**
- **Win**: Moon Shard(s).
- **Fail**: Vesper takes **one consumable from a stack of 2 or more** (Herb, then Ether). If you have no such stack, he takes gil instead (15 / 25 / 35 / 45 by stop). Regard −1.

| Stop                 | Verb            | Board                                                                                                  | Objective                                 | Good target |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ----------- |
| 1 · Sevenstones road | LOCK            | Vesper's scratched rune: 5 rows, 6 pieces, 1 trap                                                      | Clear 3 lines                             | 75%         |
| 2 · Quarry ridge     | CONTAIN         | Shadow from 3 sources, spreading every 3 pieces, into your crystals too                                | Shadow 0 within 28 pieces (cap 14)        | 70%         |
| 3 · Peaks road       | HOLD (race)     | Lantern-chains seal a column for 3 pieces every 5 pieces (one piece ahead); a curse row every 8 pieces | Clock 60 s, clears shorten it             | 65%         |
| 4 · Ruins seal       | DUEL (scripted) | Vesper's stack. His sends seal one of your columns for 3 pieces                                        | Top him out, or win the meter within 75 s | 60%         |

---

## 7. Monster fights and the Ordeal

### 7.1 Every fight

- **Telegraphs**
  - Placement-relevant board moves (curse, seal, petrify, rockfall, bolt, crosswind, tide) are marked **one piece ahead** on the board.
  - **Gauge attacks** keep a 1.5 s flash.
  - Insight 9 shows the next move from the start of the gauge.
- **Region rules**: passive, at the strength the mentor taught (§6.3).

  | Region      | Rule                                                                                                         |
  | ----------- | ------------------------------------------------------------------------------------------------------------ |
  | Sevenstones | none                                                                                                         |
  | Grove       | Spores                                                                                                       |
  | Lake        | Tide                                                                                                         |
  | Quarry      | Rockfall                                                                                                     |
  | Forge       | Slag                                                                                                         |
  | Peaks       | Bolts                                                                                                        |
  | Cliffs      | Crosswind: a wind line at col 5 (Sky Ram's Charge moves its line to col 3, confining that piece to cols 0–3) |
  | Ruins       | **Dark**                                                                                                     |
  | Caves       | Rockfall (no dark; moon drain dropped)                                                                       |

- **The dark spec**
  - The interior is dark beyond 3 rows of the active piece or a lit source.
  - **The skyline (the stack's top surface) is always drawn as a lit outline**, as are the ghost's landing cells and the active piece.
  - The preview stays visible. Pause still hides the board, as now.
  - **Uses (the cap):** the Selene lesson, the ruins' monsters (one region rule), Ivo, the Sealed Chest, and the Wyrm's phase 2.
  - **Route rule:** the ruins' dark rule switches on only once the hero has **played** Selene's lesson (flag `lesson:selene`; win or lose). Before that, ruins monsters fight with no region rule. Ivo offers his errand only after that flag.
  - A data test flood-fills the routes and checks that no dark board is reachable before the flag.
- **Archetypes**
  - Each region's 3 monsters keep their current kits plus the region rule.
  - The hexer and brute amplifications are **deferred**: added at the balance pass only if fights still feel samey to you.
- **Balance**: the approved targets are kept. Monster HP is retuned (expected −5 to −10%) to absorb the region rules.

### 7.2 The Moon Wyrm

Its numbers are unchanged; its board changes by phase.

| Phase               | HP              | Board                                                                                                                                                                                                                                                                                                                                                                                                                                             | Telegraph                      | Line (draft)                        |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| **1 · The Coil**    | 100–60%         | The coil fills cols 0 and 9 (**8 wide**). **Tail Sweep** every 8 pieces shifts the bottom 3 rows one column toward a side, **only rows that have a gap** (the gap moves). The cell pushed off the near edge comes back as **stone on the far edge**: cells are conserved and no buried holes are made. The narrow board makes lines quicker (2 pieces each, not 2.5), so this phase's damage is checked in the sim and the sweep is the pressure. | The tail rises one piece ahead | "Small light. Lie down."            |
| **2 · Eclipse**     | 60–30%          | The coil releases. **Dark** (§7.1). Crystal Tomb buries **3 moon cells**. Clearing a moon cell's row frees moonlight: 8% max-HP damage and the board lit for 4 pieces.                                                                                                                                                                                                                                                                            | Tomb rows glow one piece ahead | "The moon is mine. I keep it warm." |
| **3 · The Swallow** | < 30% (enraged) | Gauge 4.6 s. **Tidal Pull** every 7 pieces: every row with a gap shifts one column toward the jaw, and the cell pushed off the jaw side returns as **stone on the far side** (the same conservation rule, so no free edge well).                                                                                                                                                                                                                  | Arrows one piece ahead         | "Everyone sleeps, in the end."      |

- **The Ordeal costs:** a loss means the inn and half your gil, as now.
- **Proposed checkpoint (Q6):** once phase 2 is reached, a later attempt starts at **60% HP in phase 2**. That keeps first-try difficulty but cuts 3-minute reruns to about 2 minutes.

---

## 8. Cut, merge, reuse, cost

### Cut or merge

| Current                        | Becomes                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Haggle (unlosable, every shop) | Scripted DUEL at Ordor, Lo and Garrick only; every shop is browse-free        |
| Barter                         | PLANT/SORT and CHARGE with controlled supply, or another verb                 |
| Offering                       | Nim (DIG fragile) and Steve (GRIND); Vesper's become §6.12                    |
| Puzzle                         | LOCK: Orrin, the Chest, Vesper 1; plus the authored BUILD queues (Pip, Cinda) |
| `essential`                    | essential (never refuses) + threshold (required, assist offered)              |
| Wary +25% difficulty           | Removed for townsfolk (prices only)                                           |
| Lesson category lock           | The taught spell is sealed until you win the lesson or win 3 fights           |
| Lesson help at 10–50%          | 5–35% plus the shield                                                         |
| Rosa's and Ada's haggles       | Fixed-price inns                                                              |

### Reuse

| Existing                                                 | Used for                                                 |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `Challenge` and `Battle`                                 | Every verb                                               |
| `loadRows`, `setFixedQueue` (plus authored dual entries) | Start boards, LOCK, BUILD                                |
| `addGarbage`                                             | Rising, tugs, sends, tide                                |
| `petrify`, `sealColumn`, `count`                         | Slag, chains, hazard counts                              |
| `Board` width                                            | The well, the Coil                                       |
| `bestFit`                                                | Assist and sim bots, plus a per-challenge placement hint |
| Combo and back-to-back tracking                          | CHAIN, sends                                             |
| Lesson toss                                              | Mossvale demos, assist                                   |
| Curse, seal, fog and quicken                             | Region rules, Vesper                                     |
| Rotating lines                                           | The 3 lines per person                                   |
| Sim harness, recorded solutions                          | Every encounter                                          |

### Cost (re-costed)

| Item                                                                                                      | Size                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------ |
| Tags layer (moves with collapse, garbage and bottom removal)                                              | M                        |
| Zones, masks, no-clear lock, pre-roll, narrow-board spawn                                                 | S                        |
| Controlled-queue slotting, authored dual entries                                                          | S                        |
| Stakes data (regard, strain, day, retry) + save migration + Stakes card                                   | M                        |
| Scripted DUEL (rival model, mini-board render, pending bar, meter)                                        | S–M                      |
| Dark overlay with skyline                                                                                 | M                        |
| Demo toss (scripted placement)                                                                            | S                        |
| Reaction faces + 3-line system                                                                            | S                        |
| 10 encounter challenge classes                                                                            | 10 × S–M                 |
| **7 region rules** (shared by lessons and monsters)                                                       | 7 × S                    |
| Mentor's shield, lent spell, spell seal                                                                   | S–M                      |
| **Wyrm** (coil columns, crush-to-stone sweep and pull, moon tags, checkpoint)                             | M                        |
| **Board skins**: 8 unique + recolours                                                                     | M (art)                  |
| **World props**: a win and one fail state for about 22 encounters (≈ 44, mostly prop swaps and recolours) | M (art)                  |
| Placement hints for the sim (one per verb, shared by the good and casual bots)                            | M                        |
| Lines: 3 per person × 25 ≈ 75, plus objectives ≈ 25, drafted in milestone batches                         | S (your approval rounds) |

---

## 9. Build plan

| #      | Milestone                           | Contents                                                                                                                                                                                                                                                                                                                          | Acceptance                                                                                                                                                                                                                                                                                                                                                                                                                             | Checks                                                                                                                                                 |
| ------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M0** | Foundations + **feasibility gate**  | Every shared system in §8. Sim harness for any `Challenge` with the casual (touch noise) and idle bots, 200 seeds and 95% intervals. Solver for authored queues.                                                                                                                                                                  | Old saves load (stakes zeroed). Tag movement unit-tested. **Every board in this doc** has either a replayed recorded solution (Pip, Cinda, Orrin, Chest, Vesper 1) or a 200-seed good-bot run meeting its band (random-queue boards); a failing board is re-authored before M1. The supply rule and the **shape-fit check** (every zone and bin tileable by drop-only placements of its wanted shape) pass for every colour encounter. | `npm run sim ENCOUNTERS=…`: per cell good / casual / dropper / idle mean and interval, time and pieces, fail-cause mix                                 |
| **M1** | **Vertical slice** (the reviewer's) | Rowan, Pip, Bean, Ordor (demos, skins, lines). All shops browse-free (haggle at Ordor only). **Wren** (Wait, CONTAIN). **Vale** (threshold + assist, no dark). Hazel's lessons with the shield and spores. Grove monsters with spores and telegraphs. A **dark prototype** on one Selene test board. The grove's stone brightens. | (1) The four demos teach without text. (2) Each board reads as its place in a 390×844 screenshot, objective ≤ 2 lines, within the overlay budget. (3) Fail props and the card's promised costs appear. (4) The dark board is playable on a phone: skyline visible, no blind drops. (5) **Your first-try log** (§5.3).                                                                                                                  | Mossvale, grove, hub-threshold and lesson rows inside their bands at 200 seeds; strain-2 floor; idle 0%; dropper caps; phone QA at 390×844 and 360×640 |
| —      | **Your go/no-go**                   | You play M1                                                                                                                                                                                                                                                                                                                       | The verbs, stakes and teaching are approved before they're copied                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                                                                        |
| **M2** | Brightwater                         | Myst, Lo (cancel), Pete, Orrin, Nim; haggles at Lo                                                                                                                                                                                                                                                                                | Orrin solution replayed                                                                                                                                                                                                                                                                                                                                                                                                                | Hub band; haggle mean price                                                                                                                            |
| **M3** | Lake, Quarry, Forgefyre             | Tam, Flint (threshold), Cinda (threshold), Garrick; Maren, Dorn and Torva lessons; tide, rockfall and slag                                                                                                                                                                                                                        | Thresholds: assisted ≥ 90% casual within 3 tries                                                                                                                                                                                                                                                                                                                                                                                       | Region bands; monster table re-run at 200 seeds after the HP retune                                                                                    |
| **M4** | Peaks, Cliffs, Ruins, Vesper        | Ysolde, Twitch, Ivo; Rook, Kestrel and Selene lessons; bolts, crosswind and dark; Vesper ×4                                                                                                                                                                                                                                       | The crosswind never moves a piece; the drag stops at the line (gesture tests)                                                                                                                                                                                                                                                                                                                                                          | Region bands, Vesper targets                                                                                                                           |
| **M5** | Caves and the Ordeal                | Chest, Steve, the Wyrm's three phases + checkpoint                                                                                                                                                                                                                                                                                | Every phase reached and ≥ 30 s for the good bot; sweep and pull make no buried holes                                                                                                                                                                                                                                                                                                                                                   | Wyrm's approved targets; the conserving sweep and pull simmed against the crush-to-stone variant, keeping whichever lands the targets                  |
| **M6** | **One balance pass**                | Tune `ENCOUNTERS`, `STAKES`, `REGION_RULES` and monster HP in one planned set, then one correction; update GAME_DESIGN.md and STORY.md                                                                                                                                                                                            | Every cell inside its band, or each miss written up with its reason                                                                                                                                                                                                                                                                                                                                                                    | Full sim at touch and keyboard pace; economy one-pass including daily repeatable farming (gil left ≤ ~150 per region)                                  |

### Risks

| Risk                                        | Mitigation                                              |
| ------------------------------------------- | ------------------------------------------------------- |
| Scope (10 classes, about 44 props, 8 skins) | M1 proves every shared system before anything is copied |
| Dark readability                            | Prototyped in M1; capped at 4 + the Wyrm                |
| Bot validity                                | Shared hints, touch noise, 200 seeds, and your own log  |
| Colour supply still feeling lucky           | Controlled slotting plus the supply rule, checked in M0 |
| Script process                              | Lines drafted in batches per milestone                  |

---

## 10. Open questions (each with the reviewer's recommended answer)

1. **Story gates (Flint, Cinda, Vale):** required, no other route, and after 2 fails an assist that is **offered, not imposed** ("Let Dorn steady it?" / "I'll do it myself"), with assisted wins keeping the gil? **Recommended: yes.**
2. **Shops:** browse at list price; haggling an optional once-a-day duel at **3 merchants** only, with a markup that holds until you win a haggle back or 2 days pass (resting alone doesn't clear it)? **Recommended: yes.**
3. **Regard:** saved per person, −2 to +2, but it **never changes difficulty** (prices, rewards and dialogue only) and never drops anyone to Hostile by itself? **Recommended: yes.**
4. **Mossvale retries:** immediate, with strain and regard as the teeth, plus the person placing the first piece on the first attempt only? **Recommended: yes.**
5. **Vesper:** one try per meeting; on a loss he takes a consumable only from a stack of 2+, otherwise gil; lore is told either way? **Recommended: yes.**
6. **Monster fights:** keep the approved targets; region rules and telegraphs are the fix for "samey"; revisit difficulty only if your M1 playtest still says "boring". Also add the **Wyrm phase-2 checkpoint**? **Recommended: agree to both.**
7. **New text:** about **3 lines per person** plus one objective line each, drafted in batches per milestone for your edit (not ≈ 230 barks)? **Recommended: yes.**

---

## Appendix (non-binding): the second half

_To be redesigned in the second-half doc. Listed only so the verbs above are built to carry it._

**Townsfolk**

| Person                | Verb                                 |
| --------------------- | ------------------------------------ |
| Fennick               | LOCK (rite order)                    |
| Odile                 | DIG                                  |
| Suli                  | DIG + fragile                        |
| Rafe                  | BUILD                                |
| Quill, Ash            | Browse, or scripted DUEL             |
| Brisa                 | CHAIN                                |
| Ghost-lamp            | LOCK                                 |
| Pell                  | GRIND                                |
| Ketter                | HOLD race                            |
| Tallow                | DIG                                  |
| Bettany               | CHARGE                               |
| Isa                   | CONTAIN                              |
| Grell                 | BUILD                                |
| Corin                 | DIG + rising (Rowan's well reprised) |
| Rhosyn                | SORT                                 |
| Twitch (sleepwalking) | SORT, reprised                       |
| Wim                   | CHARGE gold                          |
| Tova                  | CHAIN                                |

**Bosses**

| Boss              | Shape                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Irdrath**       | Ash (CONTAIN; petrifies at 3) → smoke (fog, haste) → the buried Firstcoal (DIG; freeing it staggers him, ×2 damage for 4 pieces)                                                                                                                                                                                                                                                                              |
| **Vesper duel**   | DUEL (scripted or bot, decided then) → a mirror stance → protect Ketter's lamps                                                                                                                                                                                                                                                                                                                               |
| **The Lishal**    | Seven singers, one per column and colour. A singer falls after 3 cleared lines with its colour in its column (SORT under a piece-counted rhythm); haste after 3 fall                                                                                                                                                                                                                                          |
| **The Malificat** | Moon (CHARGE in the dark) → Sun (contain + quicken) → Stars (columns + curse). Then **Resurrection**: chains on the piece and a desaturated board (visual only, controls unchanged), preview fogged; HOLD-race keeping the lantern tag unburied. "Ves, en.": the lantern clears the bottom 6 rows. The final pure line is in the element of the highest-regard mentor (ties, or no regard: highest alignment) |
