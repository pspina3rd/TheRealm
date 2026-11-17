# Sella's sheet over many first calls — 17 November

Phil, 17 November: *"We need to run tests to see what reactions occur for
her to confirm the character sheet and five work properly across sessions
for a first contact. If that works we build a second sheet and test it
next."*

**Run:** `node scripts/firstContact.js --sheet Y --calls 200`. Output in
`logs/first-contact-Y.txt`. Two hundred first calls with Sheet Y, each a
fresh first contact, nothing carried between them. The apprentice's moves
vary from call to call: what they ask about and how, whether they
paraphrase, go back over a word or fumble, when they ask who she is, and
how they end (the fix, a wrong fix first, two wrong fixes, the fix in words
she may not follow, or the fix said as her fault).

**Checked against her sheet on every answer:** that she gives only what
she knows; that her baggage is her own; that the first repeat in a call
reads as the record words her band; that middle empathy never lets the
agent off or hears a stock line; that her belief about her own side is
wrong, as it is on this sheet; that she asks for someone else only after
two misses; that a question about her problem is never left.

## Result

**Nothing went against her sheet in 1,800 answers.** Every reaction the
sheet allows occurred, and none it doesn't:

- **Repetition (middle):** fine with it 257, wears thin 224, notices the
  repeat 152. Never "not listening".
- **Empathy (middle):** gets short with a clumsy move 364. Never lets them
  off, never hears the stock line.
- **Pattern (middle):** names a straight run 13. Never an alternation.
- **Non-positive (low):** shows it after one miss 68; asks for someone else
  after two 31.
- **Digging:** a little brushed off 80, badly brushed off 19.
- **Asked who she is:** answers and adds 48, half-answers and drifts 8,
  leaves the question 18.
- **Blamed:** turns on the agent 41.
- **How much she says:** a few words 477, a sentence or two 1,089, three
  or four sentences 203, runs on 31.

## One problem

**Her baggage comes out too often within a call.** "If he goes out without
it and something happens, that's on me" came out in 480 of the 1,800
answers. In 88 of the 200 calls she said it three times or more; once,
seven times. Read as the person on the call, a worry said once or twice is
her; said five times it is a loop. The cause is that each answer works out
her baggage afresh, with no account of having already said it.
