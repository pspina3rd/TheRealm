# Plan — the card call

The first build of the card system as settled on 3–4 October. Scope is **one
call**, played by hand and measured over many seeds. Upgrades and the run are
deliberately out.

Run `docs/trust-and-verify-cards.md` against this plan, not against my
intentions.

---

## 1. Scope

**In the build:** six suits · four angles plus Random · three target classes
with their own deciders · a CRM hierarchy with four link kinds and one
multi-category key · per-target wards on the customer sheet, learned by
bouncing · a Baggage trigger for the Need, firable obliquely · criticals as
the target plus some of its edges · nine plays with the opening free · one
coworker with a sheet and a preferred method · the three endings · scoring
through the existing `score.js`.

**Mapped, not built:** upgrades and drafting (Armour, Strength, Finesse and
the eight effects) · the run and the shift · enhancement and repair request
types · anything subscriptions-shaped (§17b penned).

**Why upgrades are out.** A run only matters if the call under it is good,
and eight upgrade effects multiply the tuning space before we know whether
choosing an angle beats choosing at random. Build the call, measure it, then
add the run. **[C] Mine** — raised in conversation 4 October, not a record
statement.

---

## 2. The scenario decision — **[C] mine, flagged**

`src/call/scenario.js` opens *"I sent my flask off for a refill by POOF"*.
Two settled rules contradict it: **nothing is refilled**, and **nothing of the
customer's travels** (settled.md:235, :241). So the existing fault scenario
cannot be the base for new work without baking a contradiction into it.

**Decision:** a new scenario, `src/cards/case.js` — a **POOF Instant Order**
that came back wrong. Nothing of hers travelled; TLC loaded a container and
sent it. The questions come from the record's own went-wrong list
(settled.md:253–259) and the causes come from POOF's settled rules rather
than from invention:

| Cause | The settled rule it comes from |
|---|---|
| Several flasks in one outer container | **multiples share a roll** |
| An inlaid container | **containers influence the magic; inlays wear** |
| Poor-quality ingredient on a custom order | **ingredient quality sets the range** |
| Proportions off against the recipe | **proportions decide the blend** |

The existing `scenario.js`, `engine.js` and their tests are left alone, so the
old engine stays runnable as a comparison.

---

## 3. The claim set

Each line is phrased so a command could refute it. **[P]** his, **[C·ok]** an
inference he confirmed, **[C]** mine.

### Moves

1. **[P]** A move is one suit, one angle, one target; nine moves a call, the
   opening free and not charged. (:922, :737, :772)
2. **[P]** All six suits — Who, What, Why, When, Where, How — are available
   from the first call and never change across a run. (:809, :904)
3. **[P]** All four angles — Verify, Validate, Expand, Contract — are
   likewise always available. (:812)
4. **[P]** Random is a selectable move: the engine picks suit and angle
   without the player's choice. (:812)
5. **[C]** Random is never better in expectation than a competent choice,
   measured over seeds, and is sometimes better on a single call.
6. **[P]** Identification is two plays: ask for something searchable, then
   search on it. The record returns nothing before she has given something.
   (:740)

### Targets and deciding

7. **[P]** Every move names a target, and the target's class decides the
   result: customer decides, CRM responds, coworker decides. (:847)
8. **[C]** A move aimed at a class that cannot answer that question is a
   miss regardless of suit, angle or delivery.
9. **[P]** The player's delivery affects the result for the two classes with
   a mind, and not for the CRM. (:853)
10. **[P]** The number of targets is not a tuned quantity; a hit yields what
    the target contains. (:863)
11. **[P]** Links from a target are one of four kinds — direct, indirect,
    tangential, red herring — and more than one path can reach a child.
    (:868)
12. **[C]** A red herring and a tangential link are indistinguishable at the
    moment of the hit; they separate only when a second path reaches the same
    place.
13. **[P]** A customer-provided identifier is multi-category: one probe
    returns several paths, not several rows. (:1616)

### The customer

14. **[P]** The sheet sets a ward per target, independently. (:1506)
15. **[C·ok]** A ward is learned by bouncing off it, and a bounce returns a
    reading rather than nothing.
16. **[C·ok]** Suit fitness comes from the customer, the sheet and the target
    together; a mismatched suit is answered obliquely and she decides the
    cost.
17. **[P]** The Need has a per-customer trigger built from Baggage, and can
    be fired obliquely rather than directly. (:1517)
18. **[C]** Two customers with different Baggage have different triggers, and
    nothing learned about one transfers to the other.

### Criticals

19. **[P]** A critical yields the target plus **some** of its edges — never
    all, never which one is right. (:930)
20. **[C]** A critical never adds a target to the board; it labels paths
    already there.

### The board

21. **[P]** The owned deck and the dealt hand are one deck; the targets are
    the board. (:891)
22. **[C]** Targets arrive from landed moves, not from a clock, so a call
    going badly starves the board.
23. **[C]** A find occupies a board slot until it is written down.

### Coworkers

24. **[P]** A coworker has a sheet, a preferred method of communication, and
    baggage. (:1287)
25. **[C]** A good brief delivered against the preferred method lands worse
    than a weaker brief delivered with it.

---

## 4. Modules and acceptance criteria

Each module is pure, takes `rng` injected, exports JSDoc'd functions, and
ships with tests including one that would catch a plausible mistake.

### `src/cards/suits.js`
Suits, angles, and legality. **Accepts when:** `SUITS` has exactly the six
and `ANGLES` exactly the four plus `RANDOM` as a separate export · a
`legal(suit, angle, target)` returns a reason string when illegal and `null`
when legal · **Validate against the CRM is illegal** — it responds, it cannot
confirm · **Verify against the customer is legal**, because the record glosses
Verify as *read it back* (settled.md:822), so reading her own words back to her
is verification against a source · `resolveRandom(rng)` returns a `{suit, angle}` drawn uniformly · claims 1–4
and 8 are each covered by a named test.

### `src/cards/record.js`
The CRM as a hierarchy. **Accepts when:** nodes carry `id`, `kind`,
`parents` (one or more) and `edges` with a `link` of `direct | indirect |
tangential | herring` · at least one child is reachable from two parents ·
one identifier appears in three or more categories · `probe(record, key)`
returns every path, each path a list of node ids · no function calls
`Math.random` · claims 11, 12, 13 covered.

### `src/cards/sheet.js`
The customer sheet. **Accepts when:** `wards` is a per-target map and two
targets on one sheet can differ · `bounce()` returns a reading, never
`undefined` · `fitness(suit, target, sheet)` returns `known | learnable |
unknowable` · `trigger` is a Baggage-derived predicate, and `fires(move,
sheet)` can return true for a move that does not name the trigger's subject
(oblique) · claims 14–18 covered, with a test asserting two sheets built from
different baggage have non-equal triggers.

### `src/cards/board.js`
Targets in play. **Accepts when:** targets enter only from a landed move ·
a miss adds nothing · a find occupies a slot until written down · `critical`
reveals a strict subset of a target's edges, never all of them and never the
correct one alone · claims 19–23 covered, including a test that a critical on
a node with four edges never returns four.

### `src/cards/call.js`
The loop. **Accepts when:** nine plays, opening free and uncharged ·
identification costs two · every move resolves through the target's class ·
three endings and no fourth · returns a transcript and a per-perspective
score from the existing `score.js` · claims 1, 6, 7, 9 covered.

### `scripts/cards.js` and `scripts/cardsAudit.js`
Hand play and measurement. See §5.

---

## 5. The four measurements

Definitions fixed before building, so they cannot be loosened afterwards.

- **Flat** — a competent policy against the same policy with every suit and
  angle chosen at random, same seeds. Report the gap in cause-found rate and
  in plays-to-cause. **A gap under 10 points is Flat** and the design has
  failed, whatever the transcripts read like.
- **Lottery** — the share of calls where the cause was reachable at the time
  it was found, against the share where it arrived without a play that
  earned it. **Any unearned arrival above 15% is a Lottery.**
- **Tax** — plays per suit-and-angle pair against payouts per pair. **Any
  pair with zero payouts across 2,000 calls is a Tax**, named in the output.
- **Solved** — the best line per seed, grouped by customer. **If one
  sequence is best on more than 40% of seeds it is Solved.**

Numbers are guesses and are expected to be wrong. They are written down so
the first measurement can refute them.

---

## 6. Order of work

1. This plan, and the claim set above. *(mine)*
2. `case.js` and `record.js` — the scenario and the hierarchy. *(mine)*
3. `suits.js`, `sheet.js`, `board.js` against the criteria above.
   *(delegable, reviewed against §4)*
4. `call.js` — the loop. *(mine)*
5. The two scripts and the four measurements. *(delegable)*
6. Play by hand, read transcripts, tune, re-measure after the last change.
7. Independent audit against this plan and the record; verify a sample of it
   first-hand.
8. Report: verified with evidence · found wrong and fixed · still unbuilt or
   unmeasured.

---

## 7. What the audit changed

An independent audit was run against this plan and the record. Fourteen of
its findings were real; the five I verified first-hand before acting were all
true. What changed as a result:

**Rules that were specified and not implemented**

- **A Fix is not always THE Fix.** The engine accepted any fix id once the
  cause was known, so knowing the cause resolved the call however wrong the
  remedy. The fix played now has to be the one that belongs to the cause.
- **A paired reach was dead data.** A cause needing two subjects could never
  be found, because a departure required a reach set of length one. Both
  words now have to be answered, which is what makes those causes dearer.
- **A target has to be in play.** Any subject could be aimed at whether or
  not it was on the board, and a CRM row id asked of the customer "landed"
  with *I couldn't say*. Claims 8 and 21 are now enforced: a move at
  something not in front of you, or at the wrong kind of thing, is a miss.
- **Nothing was ever learned.** `sheet.learned` stayed empty for the whole
  call, so `fitness` could never return `known`. A subject she has talked
  about is now learned.
- **A critical on her side showed all of a target's edges**, which claim 19
  forbids, and added nothing because those targets were already in play. It
  now reveals one thing she connects it to, and only something not already
  in front of you.
- **Contradiction was missing.** Verify could come back corroborated or
  silent but never contradicted, though the record calls contradiction the
  CRM's distinctive power. The spring order now genuinely weakens the
  container reason: same crates, same line, nobody rang.

**Leaks closed.** The transcript marked the evidence row with *consistent
with the cause*, printed `[two routes reach it]` only when the row was the
evidence rather than when the hierarchy actually had two routes, named the
cause in the `[find]` note, said whether her trigger fired obliquely, and
gave two different refusals depending on whether the player was close. All
six told the player something the design says is theirs to judge.

**Dialogue.** The stem-by-label grid produced *"Where exactly was where the
ingredients came from?"* and *"The draughts was that same morning, was it?"*.
Labels are noun phrases now and every stem works with every one of them.
Deflections came from a fixed pool indexed by word length, so the same
sentence repeated four times in a row; they are drawn from the call's rng.
Row ids were spoken aloud — *"Let me read ord-4471-lines back"* — and rows
now have spoken names. Targets fell off the board silently; the board says
what it dropped.

**Record data that contradicted itself.** Four Members with two contacts on
file · *everything on this account was created by him* against a case raised
by her · her saying *I put it in myself* while the record has Hald placing
every order.

### What I decided against doing

**Scoring is not wired, and §4 above is wrong to say it is.** `score.js`
takes the old engine's ledger — mood start and end, flavour counts,
entitlement, escalation. The card call models none of those, so feeding it
zeros would produce a per-perspective score that looks real and is not. It
stays unbuilt rather than faked.

**The slot cap stays, with a note.** The record marks *that the board needs a
slot cap* as superseded, and the cap is mine. It is kept because the record
also keeps a find occupying a slot, and because attention has to cost
something — but it now announces every drop instead of losing a word
silently. **[C] Mine, and against a superseded line: worth Phil's word.**

**Declared inventions, none of them in the record:** the customer's
`patience` · `empathy` being rolled 1–5 where the record has Low, Middle and
High · a hold being refusable on patience, where the record says an aside
cannot be refused · writing a find down costing a play · an illegal move
costing a play · the three baggage kinds and their triggers · every number in
`TUNING`.

---

## 8. Measured, 4 October, after the last change

From `node scripts/cardsAudit.js`, 2,000 calls per pass.

**Distribution.** resolved 58.4% · held 41.6% · transferred 0%. Mean 7.81
plays of 9. Causes come up evenly. Her Need surfaces in 14.5% of calls, 71%
of those obliquely.

**Found-rate by cause** — shared-roll 88.3% · oversupplied 84.5% ·
custom-container 75.3% · **mixed-sourcing 35.0%**. The cause the record is
silent about is less than half as findable as the three it can corroborate.

**1. Flat — PASS.** 71.3% found against 23.1% for the same policy rolling
suit and angle. Gap 48.1 points, mean find on play 6.5 against 7.4.

**2. Lottery — PASS, and the pass means little.** 0% of finds arrive with no
play behind them, and that number cannot be anything else: identification
takes the first plays of every call. The two diagnostics beside it are what
carry information — **31.5% of finds come on the first thing asked of her**,
and **88.1% of finds happen after the record narrowed it**. So the record is
doing most of the hunting, and the question it leaves her is close to a
one-in-three guess. That is the most important number in this run and it is
not a pathology verdict.

**3. Tax — FAIL.** At her, 14 of 24 legal pairs are played and 10 are never
reached: who/verify, who/expand, why/contract, when/validate, when/expand,
where/verify, where/expand, how/verify, how/expand, how/contract. No pair
that is played pays zero, and the payouts spread properly from 18% to 85%.
Pairs are now counted per target class, because a record read always pays and
pooling the classes hid that.

**4. Solved — PASS.** Measured as the plan defines it: ten runs per seed, the
fastest find is that seed's best line, grouped by her baggage. 48 distinct
best lines; the most common covers 29.6%, and within each baggage the best
line tops out at 30–33%. Closer to the 40% threshold than the weaker
measurement suggested.

### Still unmeasured, named plainly

- **Transfer** — 0 of 2,000. Built, reachable by a forced policy, never
  chosen, and this scenario has no route that warrants it.
- **Upgrades and the run** — out of scope by my decision, §1.
- **A second customer** — claim 18 says nothing learned about one caller
  transfers to another, and that cannot be measured against one caller.
- **Per-perspective scoring** — not wired, above.
