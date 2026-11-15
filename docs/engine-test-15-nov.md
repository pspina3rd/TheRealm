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
