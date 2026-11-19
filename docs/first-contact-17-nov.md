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

---

## Sheet X, the same way

Phil, 17 November: *"Yes, run Sheet X the same way."* Same script, same
200 apprentices making the same moves on the same draws; only the sheet
differs. Output in `logs/first-contact-X.txt`.

Sheet X: *no one told her* · repetition low · empathy high · pattern low ·
non-positive high · digging · the system update.

**Nothing went against her sheet in 1,800 answers.**

### Where X and Y part, on the same calls

| | Sheet Y | Sheet X |
|---|---|---|
| Her own words said back, or asked again | fine 268, wears thin 217, notices 148 | not listening 497, wears thin 136, never fine |
| A clumsy move | gets short 364 | lets them off 357 |
| A stock line | not heard | heard 34 |
| A straight run of the same card | named 13 | never |
| Wrong fixes | shows it 68, asks for someone else after two 31 | gives no sign 99, never asks for someone else |
| A fix in words she doesn't follow | asks what it means 30 | thanks them and rings off 30 |
| Told she changed it | turns on the agent 41 | puts it on the company 41 |
| Sure nothing changed on her side | wrong | right |
| Her baggage | *Pell gets hurt*: once 155, twice 29 | *no one told her*: once 151, twice 25 |

**Where the sheets agree, the calls agree:** brushed off (X 93 and 22, Y
81 and 19, a little more on X because she says less after a repeat and
leaves more points open); what she does when asked who she is; how much
she says, apart from X's repeats costing her more words.

**Verdict:** the second sheet works the same way the first did. Same
moves, same draws, a different customer, and every difference traces to
a line on her sheet.

---

## The free middle — 19 November

Phil, 19 November: the opening is fixed, the case comes after, and what
happens between is fluid (`docs/card-rules.md`, 28–31). My test agent had
forced a path: it always opened on what was not working, always asked who
she was in the first half, and always ended with a fix in the last two
plays.[^3]

**Rebuilt:** `scripts/firstContact.js` now opens with Phil's line and then
chooses every move from the call so far: what she has just said, which
words she has put in play, what is still open, whether she has been
identified or looked up, and how many plays are left. Each move starts
from one of Phil's questions to reach for, drawn as the apprentice's sheet
has it. The apprentice may follow her lead, go back to a thin answer,
paraphrase, wander to a word she raised, look her up, or try a fix when
they think they have it; a right fix ends her side of the call. When the
plays left are no more than the steps still to do, they take the next
step.

**How free it came out, on Sheet Y:** 197 different paths in 200 calls.
The first move after the opening varied (a paraphrase, a question on what
is not working, asking her number, her name, her account, and others), she
was asked who she is anywhere from the first play to the seventh, and
calls ended anywhere from the third play to the ninth, fixed or not.

**Both sheets, with the middle free:** nothing went against either sheet,
Y over 1,424 answers and X over 1,413. Where the sheets differ, the calls
differ the same way as before.

**One fault found reading X, fixed:** a question that only partly repeated
an earlier one was labelled "fine with it" for X, whose tolerance is low;
the record says low notices a repeat at once. A part repeat now reads as
grating on her, and the check for "fine" on low tolerance is in the
script.

[^3]: The answer module never forced an order; the test agent did, and so
    did the procedure I gave the apprentice in the hand-played runs.
    Corrected 19 November.

### What a repeat is to her — 19 November

Phil asked whether the part repeats were immediate or later, and then
whether the player was attempting something else. Tagging each move with
what the apprentice was after, on Sheet X: of 176 questions read as
repeats, 147 were going back to a point her answer had left short, 14 were
asking who she was again because she had not answered, 9 followed up her
worry, and 4 checked whether anything had changed. None was the agent
missing what she said.[^4]

**Changed, on Phil's "Yes, make that change":** a question asked again is
now three things to her, each a degree:

- **A repeat:** asked again about something she did answer. Only this is
  the record's repetition, and it fades with how long ago the first asking
  was, at the rate for exactly what she was asked.
- **Being pressed:** asked again about something she gave little or
  nothing to. Her tolerance decides how it lands: low feels badgered,
  middle feels pressed, high does not mind.
- **Being heard:** coming back, after her worry came out, to what she was
  talking about when it did, or to what it is about.

Her own words said back to her are still a repeat whenever they come
(card rule 11 is unchanged).

**After the change, nothing went against either sheet.** On Sheet X, of
what had read as repeats, most going back to a short answer now grates on
her a little or reads as being pressed, asking who she is again after she
left the question reads as being pressed, and a follow-up on her worry
reads as being heard.

[^4]: The module measured only how alike two questions were. It ignored
    whether she had answered the first, how long ago it was, and what the
    agent was coming back for. Corrected 19 November.
