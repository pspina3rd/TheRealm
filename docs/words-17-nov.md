# Her words, step one: the prompt — 17 November

Phil, 17 November, option 3 of three: build the prompt from the shape
first, read it beside the hand-played lines, then try a model on the
prompts here before deciding whether the game calls one.

**Built:** `src/cards/prompt.js`. For each answer it fills in what a
generator would be given, from the shape `answer.js` worked out: what the
agent said, what she says and only that, whether her baggage comes out
(the line Phil accepted on 18 October), whether she states her belief and
how sure she is, how long, how she says it, and her own word for the
action where the action is in play. It ends with the rule from the record:
she says nothing that is not given. Nine tests; the suite passes, lint
clean.

**To read:** `node scripts/answerPrompts.js`, saved as
`logs/answer-prompts-seed-1.txt`. Run 1 from the hand-played sets, on
Sheet Y and Sheet X, each prompt beside the line she said by hand. The
hand-played line comes from another draw, so it will not hold the same
facts; it shows the voice the prompt has to make possible.

## Four faults found reading the prompts, fixed before this was written

1. An answer with nothing useful in it told the generator she gives
   nothing, and also that she may say nothing not given. A person still
   answers. It now says she answers vaguely, or not really at all.
2. The prompt had only the subject of the question, not the question. A
   move can now carry what the agent said, and the prompt quotes it.
3. Asked *"Is anyone else in your party able to get into the bag?"*, she
   reached for the transfer, not for Pell: the question's suit was ignored
   when choosing what she answers. Each thing she knows now says which
   kinds of answer it is (card rule 8: the suit is the kind of answer asked
   for), and a *who* question about the bag reaches Pell first.
4. Her word "transferring" was put into every prompt, even for her name.
   It is now there only when the action is in play.

## What is mine in the prompt

- How each fact is phrased for a generator. The facts themselves are
  Phil's list.
- How each reaction is put into a sentence ("It is wearing thin with
  her", "She sees they are struggling and lets them off").
- The plain-words names for what the agent asked about.
- Which kinds of answer each fact is, by suit.

---

## Step two: a model writes her lines — 20 November

**Run:** prompts for three free-middle calls on each sheet
(`node scripts/firstContact.js --sheet Y --calls 3 --show 3 --prompts …`),
46 answers in all, in `logs/words-20-nov/prompts-Y.txt` and `-X.txt`. One
subagent on Sonnet wrote her line for each, from the prompt alone; I read
every line as the person on the call and checked it against its prompt.
The brief it was given is in this session's transcript; what it asks for
is listed at the end. The lines are in `logs/words-20-nov/lines-Y.txt` and
`-X.txt`.

**Three passes.** The first two turned up faults, which were fixed before
the next pass:

- **First pass:**
  - **The same sentence, answer after answer.** The prompts gave each fact
    as a fixed sentence and never said what she had already told them, so
    the model copied the sentence each time. The prompt now marks a fact
    she remembers saying (held at half or more on her sheet); a fact she
    has half forgotten is left unmarked, so she may say it again in full.
  - **Hedging her own name and what she had seen.** *"Sella Brandt, I
    think."* That went against the sharing range Phil accepted (certainty
    is high on what she has seen, low only on why). `answer.js` now hedges
    only a belief, or an answer with nothing in it, and never who she is.
  - **Inventing the outcome of a fix.** *"Right, it's transferred."* The
    prompt never said what the fix was. It now carries what the agent said
    (Phil's fix line for the update) and what that leaves her knowing: the
    bag is open again, so Pell can take the draught himself, and nothing
    has been said about transferring.
- **Second pass:**
  - **"Like I said" in nearly every answer.** The brief now asks her to
    vary how she refers back.
  - **"I'm worn out" every time her night on the account came up.** That
    was my wording in the fact. Phil's list says she is frustrated; it now
    shows in how she speaks and is never said.
  - **No reaction to a right fix.** The prompt now says a right fix meets
    what she needed: Pell has the draught before he leaves.
  - **"Skip the sorry"**, not English anyone says. The brief now names it
    as the kind of phrase to avoid.

**Third pass, read in full** *(reported to Phil as having worked, which was wrong: a line in it made no sense)*:
- **No invented fact** in 46 lines: no name, number, time or outcome
  outside its prompt; *Assign* never said; no feeling named.
- **She refers back to what she has said** without restating it, and says
  a half-forgotten fact again, as people do.
- **A right fix lands:** *"Okay. Good."*, *"That's all I needed."*
- **The sheets come through in the words.** Sheet Y gets short and says
  her worry about Pell; Sheet X lets a fumbling agent off (*"Take your
  time."*, *"It's all right."*), hears the stock line for what it is
  (*"I don't need that."*), and says no one ever told her how it works.
- **One line reads wrong:** *"He's off, yeah. You've got that."* (Sheet Y,
  call 1, answer 6). The second sentence is not something a person would
  say.

**What the brief asks of the model, mine:** use only the prompt's facts;
refer back briefly to what she knows she has said, and vary how; put facts
in her own words, never the prompt's; say the quoted baggage line as given
or close to it; respond to what the agent has just said; show manner and
frustration without naming a feeling; say *transferring* or plain words,
never *assign*; plain modern spoken English with no regional slang or
invented idioms; leave things unsaid.

### Fourth pass — 20 November

Phil, of *"He's off, yeah."*: *"Prove to me that in context this response
makes sense."* It did not. The prompt behind it gave her nothing to say,
did not give the agent's actual question, and still told her to sound
flatly sure and loose enough to mislead. So the model made up a question
to say "yeah" to, and answered it with an idiom. Three fixes:

1. **The agent's words are in the prompt** where the call already has
   them written (`bag.js` QUESTIONS), so her line has a real question to
   answer.
2. **How sure or exact she sounds needs something to be sure or exact
   about**: a fact she gives or a belief she states. With nothing to give,
   she is only vague (`answer.js`).
3. **The brief now says** her line must answer what was said, may not say
   yes or no to something that cannot be agreed with, and may not use
   colloquial shortcuts like *"he's off"*.

Phil also corrected my fix for *"Sella Brandt, I think"*: *"She may not
remember how the account is setup, if it is under her personal name or a
team's name, or be unaware of what type of name is being prompted for."*
So unsure, asked who she is, she now hedges about which name they want or
whose name the account is under, not about who she is. Her lines: *"Sella
Brandt. Is that the name you need, or the account's?"* and *"Sella Brandt.
I don't know if that's the name it's under."*

**Read beside what the agent said, every line now answers it,** with two
exceptions, both from a written agent question that does not fit what she
knows:

- *"When are you leaving?"* She answers *"I'm not the one leaving, Pell
  is."* That is a fact she was not given: her facts say only that Pell
  leaves in the morning. The question is mine, from October.
- *"When did you last move something to one of them?"* She answers that it
  has never been a problem before, which does not answer when. Nothing she
  knows says whether she has ever moved anything to anyone.

### Phil's corrections, 20 November, and the passes after

Phil answered the two blocking questions and corrected me on four points:

- **"Asked about when Pell leaves" is a question.** My explanation said
  there was no question; that was wrong. What actually happened: her signal
  drew at the bottom of her curve, and `answer.js` then gave her room for
  nothing, not even the one thing she was asked and had already said. A
  person asked when Pell leaves still says the morning. Fixed: asked
  straight about something she knows, she gives at least that.
- **Hedging which name.** Phil said someone *could* say "is that the name
  you need, or the account's?"; the question was whether Sella would. She
  would not: she knows the account is the party's and that she leads it.
  Fixed: only a sheet marked as unsure how the account is set up hedges
  which name, and none of Sella's is.
- **"We".** I had recorded *"we can encompass Sella and Pell"* as Sella
  going, over the record's own *"Only Pell is going"*. Phil: "we" is the
  agent's soft skill of togetherness, and *"Pell is going on a solo
  mission."* Corrected in `her-side-46.md` (footnoted); the old lines that
  said *we're out at first light* now say *he goes*.
- **"When did you last move something to one of them?" answered with
  "never been a problem before"** is a valid answer and in character: her
  experience is that her team has never had trouble getting at their
  items before. I had called it wrong. Whether she has handed anything
  over before does not matter.

**Three more faults found reading the passes that followed, fixed:**
she volunteered *"I'm not going"* when nobody asked, because I had put it
in the fact about Pell (it is now something she knows and says only if
asked); *"alone"* was added every time Pell's departure came up; and the
example I gave for misleading wording (*as if the bag is refusing her*)
was pushed into answers about something else (*"The morning. It just won't
let me."*).

**Seventh pass, every line read beside what the agent said and what she
was given:** each of the 46 answers what was said, uses only what her
prompt gave her, and is plain spoken English.

**Status: done for these six calls.** Every line answers what was said and
uses only what she knows.
