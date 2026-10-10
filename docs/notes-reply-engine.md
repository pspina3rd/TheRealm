# Notes — the reply engine (bag call), 8 October

## Where to pick up — written 10 October, at the end of that session

Committed on `record-into-repo` (`1b2a797`, `6e43a3a`). 388 tests pass.
`node scripts/playTurns.js` plays the bag call.

**Next, in this order. Neither is built.**

1. **Restore her choosing neither.** Phil gave her choices as 0, 1 or 2:
   neither, the first, the second, or both (settled.md §2). On 10 October I
   made "neither" rare, treating it as a fault, and the call became winnable
   by one fixed line of play every time (see *Still wrong* in
   `docs/templates-from-playthroughs.md`). It has to be a real choice her
   sheet makes — when what is asked is something she guards — and when she
   takes it she still brings something in. This changes `ownOptions` and the
   `cause` test in `src/cards/reply.js`. Nothing has to be made up to do it.
2. **Give the bag call more than one cause.** It has one, which the record
   has ruled out since 7 September ("a singular root cause is lazy work").
   Every candidate cause is an invention: **bring them to Phil one at a
   time, before building any.** He has said there is no cause in the CRM for
   this call; the cause is on her side.

**Then:** the generator. Phil has said yes to a model called at play time
for her voice. Everything here — her choice, the tags for what is in play,
her remembrances and what they hang off, the templates — is its brief.

**How Phil wants this worked** is in `CLAUDE.md` under Conventions, and in
the memory notes. In short: restate before building; raise each invention
first; check the record before building; read output as the caller would;
record detail in a file and bring him only problems, each with three
solutions; say what a delegated run will use before launching one.

**What the delegated runs cost on 10 October** is at the end of
`docs/templates-from-playthroughs.md`. Do reads and counts yourself where
you can.

---

The detail behind what was reported in conversation. Not part of the record;
nothing here is settled. `docs/settled.md` §2 *The turn, and her side of it*
and §8 *Her words* are the authority.

## What exists

- `src/cards/turn.js` — a call in nine turns; a turn at her carries one or two
  inquiries.
- `src/cards/reply.js` — her choice (first, second, both, her own way) and the
  filled template.
- `src/cards/bagTalk.js` — her written lines for the bag call: one answer per
  question that can be put to her (92), seven things she says unasked.
- `src/cards/speak.js` — joins the agent's inquiries into one line and turns
  her template into her line. No generator.
- `src/cards/words.js` — feeling words by layer of her sheet.
- `scripts/playTurns.js` — play it. Prints the conversation; writes the detail
  of each turn to `logs/bag-seed-<seed>.log`.
- Also from earlier the same day: `scripts/lineInventory.js`,
  `scripts/tableTest.js`, `scripts/playCards.js`, and a `steer` / `plays` /
  `pause` option on `src/cards/call.js`.

Not committed. `npm test`: 376 pass. `npm run lint`: clean.

## Everything in it that is mine and was not raised first

Phil's rule is that each of these is raised before it is built. They were not.

1. Every line in `bagTalk.js` — 92 answers, 7 unasked statements, 3 pivots,
   2 ways of saying yes, 1 refusal, 1 reworded remedy. Each restates a fact
   `bag.js` already held; the wording is mine.
2. Every number in `reply.js` `LEAN` — how her wards, the suit, her trigger,
   repetition and a souring call move her choice.
3. The mood rule in `turn.js` (patience, plus half a point per turn she
   answered, minus souring) and what sours her (a wrong remedy 2, the same
   subject inside three turns 0.5).
4. The kinds of "her own way" and their weights; frustration only after
   souring reaches 2.
5. The feeling words in `words.js` beyond Phil's two lines, and the `VOICE`
   block in `bag.js`.
6. Only written questions can be asked (92 of 456 for this call).
7. A read-back (Verify) cannot be asked until she has answered on that
   subject; a name cannot be used until she has said it.
8. A remedy can be offered only once her own words point at one.
9. On the ninth turn a find auto-plays one of the remedies it pointed at,
   chosen at random.
10. No coworker and no hold in this loop.
11. The angle has no effect on her choice. It only selects which written
    question is asked and which written answer comes back.

## What an independent reader found (30 calls, seeds 20–49)

Saved as `logs/thirty-calls-8-oct.txt`. The reader had not seen the code.
No call was free of faults. Counts: agent assumes what she never said 54 ·
her reply answers nothing asked 27 · not something a person would say 15 ·
joined badly 5 · unprovoked tone 5 · near-repeats 3 · contradictions 0.

Checked first-hand against the file: seeds 20, 25 and 31 are as reported.

- **11 of the 15 "not something a person would say" are the closing line**
  *"We've got that documented, and are forwarding the case for follow-up
  later today."* That line is Phil's own wording from 5 October, so it is not
  counted as a fault.
- **The agent assumes what she never said (54).** What is put in front of the
  player follows the subject she answered on, not the words of the answer she
  gave. So "the bag" appears after an answer that never mentions a bag, and
  questions such as *"It started last night?"* can be asked before she has
  said when. The remedy line names "the draught" in calls where she never
  did.
- **Her reply answers nothing asked (27).** All are her going her own way:
  her baggage line, or a statement behind *"The thing is,"* / *"What I do
  know is,"* / *"Look,"*. It happens on the first question of a call as
  readily as the eighth. 33 of her 264 lines in the thirty calls are of this
  kind.
- **Joined badly (5).** Two short answers run together: *"It is. No."*,
  *"I am. Nothing at all."*
- **Her cause line assumes context** — *"transfer it out of the shared one
  and into his"* in calls where no bag and no person has been mentioned.

## Faults found and fixed before the reader ran

A template printed as if it were her line · the cause and an innocent
departure labelled differently · "the bag" in front of the player before she
said it · two questions printed as two sentences · a double "And" · a feeling
sentence tacked onto plain answers, some ungrammatical (*"TLC is a mess"*) ·
a departure said twice · *"Last night. I started on it last night…"* · the
stock refusal to *permissions* assuming the agent had read her a row · the
ninth turn ending with her explanation unanswered · the ninth-turn offer
using a stale remedy · the remedy naming Pell before she had.

## Earlier the same day — corrections to what was reported

- "About four times as many wrong offers" when she steers toward her own
  belief: the measured figure is 2.7 times.
- "In a third of calls two different questions get the same sentence": about
  a quarter; the third included the same question asked twice.
- "By the third call 61% is already heard" includes three lines that never
  change (opening, number, closing).
- Four tags in `settled.md` §8 claim more than Phil said: *each aspect of the
  sheet can offer suggested words* (he asked it as a question) · *she has
  words she returns to* (my reading) · *not every caller steers* (he said
  "depends on the customer") · *the reply is two jobs* (tagged confirmed; it
  was not). Not corrected — changing the record needs his word.
- Audit findings on `call.js` not acted on: a steered miss still counts
  against her patience · a bad `plays` value silently becomes nine · a paused
  result carries the hidden cause to the caller of `playCall`.
- `scripts/playCards.js` still lists the bag call's remedies by name.
- `CLAUDE.md`'s file map does not list any of today's files.

## After Phil's two decisions (later on 8 October)

**Decision 1 — tag every line.** Every answer in `bagTalk.js` now carries what
it introduces (`SAYS`), her other lines and the record's rows likewise
(`SAYS_OTHER`), and every question what must already have been said
(`NEEDS`). `turn.js` puts a subject in front of the player only when a line of
hers or a row has introduced it. The old per-topic lists (`GIVES`, `OPENS`)
are no longer used on this call. The remedy line is assembled from what has
been introduced (`theWord`). The fault was mine: the rule that a word appears
only after she or the record introduces it was already settled, and I had the
engine open topics by which subject she answered on instead.

**Decision 2 — leave her "random option" until the generator**, with the one
requirement that it introduces something. Her own-way line now counts as an
option only if it would put a new word in play; with nothing new to say she
answers what she was asked. Plain frustration is out until a generator can
tie it to the question. *"Look,"* is removed as a pivot.

### Measured after the last change

- `npm test` 380 pass · lint clean.
- 300 played calls: nothing asked about before it was introduced, and no
  question asked without what it needs (the test recomputes this from the
  tags, independently of the engine's bookkeeping).
- 400 played calls: every own-way line introduced something.
- A plain sensible agent (asks what happens, how she is going about it, what
  she was looking for, then offers the remedy) resolves 783 of 1,000 calls,
  in 4.4 turns on average. A random agent resolves 3 of 30.

### Second independent read, same thirty seeds

Saved as `logs/thirty-calls-8-oct-second-read.txt`. Read by a smaller model.

- Its counts: agent assumes what was never said **1** (was 54) · reply
  answers nothing **8** · everything else 0 · 21 of 30 calls with no flag.
- **It under-counted, and I checked.** Counting her own-way lines directly:
  **63 of her 321 lines** (one in five) answer nothing that was asked, and in
  **11 of the 30 calls** her very first reply is one of them. The smaller
  model reported 8. It also reported no badly joined answers; there are about
  six, e.g. *"The party's. No. There's no transfer anywhere."*
- So for reading a call as a caller would, the smaller model is not enough.
- The one "assumes" flag is the agent offering to look at permissions when
  she has said nothing about them — a wrong remedy, which is allowed.

### Still wrong

- Her own-way line is one reply in five and can be her first.
- Two short answers given together read as fragments.
- The same sentence can end two replies (*"I've been at this since last
  night…"* is said once, but near *"Since last night."*).
- Everything listed above under "Earlier the same day" is unchanged.
