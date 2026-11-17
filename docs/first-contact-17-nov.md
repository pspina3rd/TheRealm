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

**Nothing went against her sheet in 1,800 answers,** before or after the
correction below. Every reaction the
sheet allows occurred, and none it doesn't:

- **Repetition (middle):** fine with it 257, wears thin 224, notices the
  repeat 152. Never "not listening".
- **Empathy (middle):** gets short with a clumsy move 364. Never lets them
  off, never hears the stock line.
- **Pattern (middle):** names a straight run 13. Never an alternation.
- **Non-positive (low):** shows it after one miss 68; asks for someone else
  after two 31.
- **Digging:** a little brushed off 81, badly brushed off 19.
- **Asked who she is:** answers and adds 47, half-answers and drifts 9,
  leaves the question 18.
- **Blamed:** turns on the agent 41.
- **How much she says:** a few words 557, a sentence or two 1,056, three
  or four sentences 160, runs on 27. A little shorter than before the
  correction, because what sours her now carries through the call.

## Her worry about Pell

In the first run it came out in 480 of 1,800 answers, three times or more
in 88 calls.[^1] With each answer now written back on her sheet, and that
memory fading as a person's does,[^2] it comes out once in 155 calls,
twice in 29, and not at all in 16. Nothing went against her sheet.

[^1]: The new module worked out each answer from her sheet as she started
    the call, and wrote nothing back. The original engine carried what
    happened from turn to turn: she said her baggage once, what she had
    already answered was less likely to come up again, and repeats and
    wrong remedies soured her. I dropped that when I built the new module.
    Corrected 17 November: each answer now returns her sheet as it leaves
    her, and the next answer starts from it. It holds her tolerance as worn
    so far, the pressure behind her baggage (eased each time she says it),
    the strain from misses, how soured she is, and what she has already
    said, which now comes after what she has not.

[^2]: My first write-back held everything perfectly: once she had said
    something, she knew it for the rest of the call. Phil: *"Is it 100%
    perfect recall, because that would be an inaccurate representation of
    what the memory on the sheet is supposed to be."* It was. Corrected
    17 November, by the record's order of what people keep (gist very
    high, emotion high, her own words moderate-high, exact dialogue
    extremely low): how well she remembers having said each thing now
    fades from one answer to the next, faster than what she felt, which
    fades back toward her sheet more slowly. So something she said a while
    ago can come round again, and a worry she voiced early can build back
    up.
