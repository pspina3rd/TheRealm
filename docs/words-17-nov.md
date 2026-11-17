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
