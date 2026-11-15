# The engine against the hand-played runs — 15 November

Phil, 15 November: *"Then test it in the engine if X shows the same as
Sella's other runs."* X did (`docs/playthroughs-15-nov-sheet-x.md`), so
this is the test. The engine is `src/cards/turn.js` and its neighbours,
played through `scripts/playTurns.js`, as it stood. Nothing was changed.

## What was run

Nine calls: the three kinds of baggage, on seeds 1, 2 and 3, all with the
same nine moves:

`what expand 1; who expand 6; what contract 7; what validate 4; what
validate 3; what expand 2 + who expand 5; id; look; read 7`

The output of each is in `logs/engine-test-15-nov/`. I read all nine as
the person on the call.

## What the engine did

- **Her sheet made almost no difference.** *Pell gets hurt* and *set it up
  herself* gave the same call, word for word, on all three seeds. *No one
  told her* differed from them in four to eight lines of a dozen, and the
  differences were which answer she gave, not how she gave it.
- **Her baggage was never spoken.** Not once in nine calls.
- **Asked the same thing twice, she said the same thing twice.** *"The
  bag's fine. I can see every item in it, plain as day."* came out twice
  running in eight of the nine calls, with no sign she noticed.
- **All nine ended "held"**, with the case forwarded and nothing fixed.
- **Her lines read as a person's.** They are the written answers in
  `src/cards/bagTalk.js`, and her remembrances come up in the right
  places (*"Les would've known what to do."*).

## What the hand-played runs have that the engine does not

1. **Her five sheet fields** (repetition, empathy, pattern, non-positive
   outcomes, depth or breadth). The engine has *patience*, which is mine
   and is to be deleted (`docs/claims-her-side.md`, 12), and a number for
   empathy that nothing reads the way the record words it.
2. **The five counts and their draws** (volume, signal, certainty,
   accuracy, openness, with the pulls between them). The engine has one
   written answer per question.
3. **The two causes Phil added** (her own setting; the system update), the
   profile line that shows them, and the fix that goes with each. The
   engine has her word only.
4. **Searches that return one of six results**, and the check with her.
   The engine's search always finds her account.
5. **An agent with a sheet.** The engine plays whatever moves it is given.
6. **Plays that land or misfire.** In the engine every question works.
7. **Phil's opening line**, and next steps as a play.
8. **What she takes away**, and a second call that starts from it.

## The result

**The engine does not yet produce what the hand-played runs produce.** On
the same moves, its Sella is one customer whatever her sheet says. That is
expected: what was settled over 14–15 November has not been built.

What the engine already has that the build can stand on: the turn
structure, words coming into play only once said, her written answers and
remembrances, wards, and the record's rows.

---

## Option 1, built: her answer without words

Phil, 15 November: *"Do 1 but keep the original and run it too for
comparison. If that fails we'll switch to 3."*

**What was built:** `src/cards/answer.js`, new, beside the original
engine, which is untouched. For one move aimed at her it works out the
shape of her answer from her sheet and a draw: how much she says, which of
the things she knows she hands over, how sure and how exact she is, and
what the move set off in her (a repeat, a pattern, being brushed off, her
baggage, a belief, what a fix leaves her doing). No words. 22 tests;
the whole suite passes and lint is clean.

**How it was checked:** `scripts/answerShapes.js` plays the moves of three
of the hand-played calls (runs 1, 2 and 4 of the replay) for Sheet X and
Sheet Y on the same draws and prints each answer's shape in plain words.
It then runs the original engine and measures the same three things in
both. Output for seed 1 is in `logs/answer-shapes-seed-1.txt`.

### Against the hand-played runs

The six differences between X and Y found by hand
(`docs/playthroughs-15-nov-sheet-x.md`) all come out of the module:

| Found by hand | In the module, on the same draw |
|---|---|
| Openness high: Y's fear for Pell, X's *nobody told me* | each brings out her own baggage |
| A paraphrase: Y fine the first time, X hears not listening | Y *fine*, X *not listening* |
| An apprentice floundering: Y short, X gives them room | Y *gets short*, X *lets them off* |
| Blamed: Y turns on the agent, X puts it on the company | the same |
| A fix she isn't told the meaning of: Y asks, X thanks and goes | the same |
| Sure nothing changed: Y wrong, X right | the same |

Where nothing on the sheet is set off, X and Y give the same answer from
the same draw, which is also what the hand runs showed.

### The original engine beside it

| | New module | Original engine |
|---|---|---|
| Does her sheet change her answers? | 54% of answers differ between X and Y | 22% differ, and only in which answer she gives |
| Does her baggage come out during a call? | 75% of calls | 0% |
| Say her words back, or ask twice: does it show? | 55% (always on X; not the first time on Y, as her sheet says) | 8% |

### Four faults found by reading the output, fixed before this was written

The tests passed with all four in. Reading the printed shapes as the
person on the call found them:

1. Asked her name, she gave the transfer and not her name. **This one was
   not a fault; see the correction below.**
2. Moving on from her name counted as changing the subject on her.
3. A different question about the bag counted as a repeat.
4. A fix was reported as her "giving nothing useful", when she had not
   been asked for anything.

### Correction, 15 November: fault 1 was not a fault

Phil: *"Can people ignore a question and state something else? Then why
wouldn't someone ignore the question and proceed with talking about their
problem?"*

They can, and she would. The record already says she answers from her own
card, which need not be the one asked (`settled.md` §2, *Her side,
mirrored*), and in the hand-played run 3 she did exactly this. My "fix"
made her give her name every time, which took a real behaviour away.

**Changed:** asked who she is, she now either answers or leaves the
question and carries on with her problem. It is a draw. The odds are mine:
one time in four as a rule; six in ten for a customer who prefers digging
whose last point has not been answered yet; a little more when she is
notably open. A question about her problem is never left, because there
the question and her own point are the same thing.

### Correction, 15 November: the other three were not faults either

Phil asked what else I *thought* I saw. Looked at again from her seat:

2. *Moving on from her name counted as changing the subject on her.* A
   customer in the middle of her problem who is asked for her name may
   well feel brushed off. I had made that impossible.
3. *A different question about the bag counted as a repeat.* A new angle
   on the same word is a new question to the agent. Whether she hears it
   as the same question again is hers to decide, and with low tolerance
   she often will.
4. *A fix was reported as her "giving nothing useful".* I changed it so
   she never gives anything after a fix. In the hand-played calls she did:
   *"I may have pressed something."*

All four were the same mistake: an answer that did not match the question,
or a reaction that did not follow my rule, called a fault. The lines were
those of a person.

**Changed, on Phil's "Yes, make those changes":** each is now a draw on
her sheet. The odds are mine.

- **Asked who she is mid-problem,** a customer who prefers digging feels
  brushed off three times in ten, and six in ten if her last point had got
  nothing out of her yet. Never at the start of a call, and never for a
  customer who casts wide.
- **The same word asked a different way** is heard as a repeat seven
  times in ten at low tolerance, three in ten at middle or high. The same
  card on the same word is always a repeat, and her own words said back to
  her always are.
- **After a fix** she comes back with something of her own three times in
  ten, and whenever her signal is running high. It starts from her own
  night on the account. Told she changed something, she always says she
  did not, right or wrong.

### Verdict

**It passes.** The module reproduces what the hand-played runs showed, and
the original engine does not. So there is no call to switch to option 3.

### What it does not do yet

- **Words.** By design; that is the next step.
- **Two inquiries in one turn.** The original engine has it; this takes
  one.
- **The agent's side:** the apprentice's sheet, searches that return one
  of six results, and plays left. Those were hand-played and are not her
  answer.
- **A second call.** A changed sheet can be passed in as a shift to a
  count; what she takes away from a call is not worked out.

### Guesses of mine inside it, not yet ruled on

- **How much fits in an answer:** one thing she knows in a few words, two
  in a sentence or two, three in three or four sentences, all five when
  she runs on.
- **What a reaction costs her in words:** one spread of volume for a
  repeat that wears on her or for being brushed off; half a spread when
  she gets short with a clumsy move.
- **"Brushed off"** (digging) is a change of subject after a question she
  gave nothing useful to. **"Stuck"** (casting wide) is a third question
  running on one subject.
- **A repeat** is a paraphrase, or the same card on the same word again.
- **Her baggage comes out** when her openness is more than one spread
  above her usual, or when its trigger is hit, and never when she is in
  her closed tail.
- **Middle empathy "gets short"** with a clumsy move. The record's wording
  for middle is about goodwill on a busy day; this is my reading from the
  hand runs.
