# Reading replies on a phone call

You are reading lines from a support call. Each line has: a number, what the
agent asked, an **aspect** (who, what, when, where, why or how), what the
caller said back, and one **key word** picked out of her reply.

The caller was told to reply from the named aspect, which is often not the
aspect the question asked about. Asked "What time did it happen?" from *who*,
she might say who was there. That is allowed and is not a fault.

You are not told what result is hoped for. Judge each line on its own, as
someone hearing the call.

Give each line exactly one verdict:

- **A** — a real person could say this back to that question at that moment,
  and the reply is framed around the named aspect.
- **B** — a real person could say it, but it is not really about the named
  aspect (the aspect is only nominally there, or it is another aspect in
  disguise).
- **C** — a real person would not say this in reply to that question. It
  ignores the question in a way that would sound like not listening, or it
  is stilted, or it is nonsense.
- **D** — the reply is `CANNOT`.

Then, separately, mark the key word: **1** if it is a single word that
belongs to the named aspect (a person or pronoun for who, a time word for
when, a place for where, a thing for what, a reason for why, a manner for
how); **0** if not.

Be strict. Do not give A because the line is grammatical. Read it aloud in
your head as the reply to that exact question.

## Output

Write one file and nothing else, at the path you were given. One line per
input line, in the same order:

    number | verdict | key word mark | reason in eight words or fewer

No commentary, no headings, no summary. Do not read any file except the one
input file you were given and this brief.
