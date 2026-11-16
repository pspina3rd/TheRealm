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
baggage, a belief, what a fix leaves her doing). No words. 23 tests;
the whole suite passes and lint is clean. *(Rebuilt on 16 November so
that each of these is a degree; see the corrections below.)*

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
| Does her sheet change her answers? | 56% of answers differ between X and Y | 22% differ, and only in which answer she gives |
| Does her baggage come out during a call? | 82% of calls | 0% |
| Say her words back, or ask twice: does it show? | 67% (always on X; on Y once the call has worn on her) | 8% |

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

**Changed:** asked who she is, she can now leave the question and carry
on with her problem. How that is decided was changed again on 16 November;
see the last correction below.

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

**Changed, on Phil's "Yes, make those changes":** her sheet now decides
each of the three. I first did it with odds; see the next correction.

### Correction, 16 November: no odds

I had put a percentage on each of the four behaviours above. Phil: *"Why
are there odds? The character sheet should help derive the response, not a
random percentage."*

A draw on her own five curves is her sheet at work. A flat one-in-four is
a coin I added beside it. The four percentages are gone. The only chance
left in an answer is where she lands on her five counts; pin those, and the
answer is fixed. A test holds that.

Each behaviour is now derived from her sheet and the call so far:

- **Leaving a question about who she is.** She does it when her own point
  is still open (the last thing she was asked about her problem has had
  nothing out of her yet) and either she prefers digging, or this answer
  has room for only one thing, which she spends on her problem. Otherwise
  she answers.
- **Feeling brushed off by that question.** A customer who prefers digging
  does, when her point is still open. Nobody else does.
- **Hearing the same word, asked a different way, as a repeat.** Low
  tolerance hears it at once. Middle hears it only once repetition has
  already worn on her in this call, which is the record's point that
  tolerance wears down inside a single bad call. High does not hear it.
- **Coming back with something after a fix.** She does when that answer
  finds her with something useful to say, or notably open: that is, when
  her signal or her openness drew high.

### Correction, 16 November: no switches either — rebuilt as degrees

Taking the odds out, I put yes-or-no rules in. Phil: *"You are making
those binary outcomes. They fall within a spectrum, and a spectrum of
spectrums."*

`src/cards/answer.js` was rebuilt on that, with his agreement to the shape
first:

- **Every reaction is a degree** from none to full: how much a move grates
  as a repeat, how brushed off or stuck she feels, how much of her answer
  goes to her own problem, how far her baggage comes out, how warmly or
  shortly a clumsy move is met, how much a miss strains her and how much of
  that shows.
- **Each degree is fed by other ranges.** How brushed off she feels is how
  strongly she prefers digging, times how much of her point is still open,
  times how far the move leaves it. How much a question grates is how like
  an earlier one it is (the word, the suit, the angle), against a tolerance
  that the call has been wearing down.
- **Her sheet carries a number under each band,** as the record says, and
  the degrees read the number. Move the number and the degree moves with
  it; a test sweeps each one.
- **Effects scale.** A little brushed off costs her a few words; badly
  brushed off costs her most of them.
- **Labels come last.** "Wears thin", "badly brushed off", "leaves the
  question" are put on for reading and decide nothing. The record's own
  wording for each band still comes out: middle tolerance is fine, then
  thin, then noticed; low hears not listening at once.
- **What she does with a question about who she is** is the record's own
  range, raised on 8 October and never ruled on: she answers, answers and
  adds, half-answers and drifts, or leaves the question.
- **The only chance** is still where she lands on her five curves.

One thing came out of the degrees that I had written as a rule before: a
customer of middle tolerance does not mind the same word asked a different
way, until repeats earlier in the call have worn her down, and then she
does. Nobody wrote that in; it follows from one tolerance wearing.

How the ranges combine is in `WEIGHT` at the top of the module. Every
number in it is my guess.

### Phil's picture of a call, 16 November

*"Imagine a door that opens to other doors. Entering a door leads to more
doors. Some doors continue in a straight line. Some lead elsewhere,
linking to other rooms from the left, right, top or bottom. Walk into the
first room through the door, the opposite wall contains the exit doors."*

My reading, which he called *"pretty damn close to what I'm
envisioning"*: the first door is the opening. A room is her answer, a
different room each time. The exit doors are what that answer makes
possible next, each open by degrees. Straight on continues the line of
inquiry; the side doors lead to rooms that can also be reached from
elsewhere, and what is found in a room depends partly on the wall it was
entered through. A call is a path through rooms, not a list of questions.

**Built so far:** the room. **Not built:** the far wall, meaning which
exits an answer opens and how wide.

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

All in `WEIGHT`, `VALUE`, `DEPTH`, `SAY` and `ROOM` at the top of
`src/cards/answer.js`. The ones that decide the most:

- **The number under each band:** 0.2, 0.5 and 0.8 for low, middle and
  high, where a sheet gives only the band.
- **How like an earlier question a new one is:** six parts the word, two
  the suit, two the angle.
- **How fast repeats wear her tolerance down,** and that it wears faster
  the less of it she had.
- **How far a move is from her point:** a related subject a short step, an
  unrelated one a longer step, a question about who she is the furthest.
- **How much fits in an answer:** one thing she knows in a few words, two
  in a sentence or two, three in three or four sentences, all five when
  she runs on.
- **Where a degree gets a word:** "a little" from three-tenths, plainly
  from a half, "badly" from three-quarters.
