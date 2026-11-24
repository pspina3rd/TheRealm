# Baggage tests, one run per customer, three rounds — 24 November

Phil, 24 November: *"3"*, meaning one run per customer, repeated. Each run
writes one customer only, without seeing the others, under all five
conditions (Profile A, Profile B, Profile B with *knowing a lot* worked
out, Mix C, Mix D) and both categories: 10 responses. That is four
customers × three rounds = 12 Sonnet runs and 120 responses. The prompt is
the lean prompt (`docs/baggage-lean-24-nov.md`).

The measure was fixed before reading: across customers, in the same round,
category and condition, how many responses share a phrase of four or more
words with another customer, and how often the items that recurred earlier
come up. `scripts/baggageOverlap.js`, output in
`logs/baggage-24-nov/multi/overlap.txt`. Lines that failed my read are
footnoted in each run file.

## What it shows

**Shared phrases are now the language of the request.** 41 of 120 share
four words with another customer. Almost all are what any tracking call
says: *"can you tell me where it is"*, *"and it hasn't come"*, *"where it's
got to"*.

**The recurring items follow the person, round after round.**

*Offering a reference* when they know a lot:
- Wren, every round.
- Ilse, most rounds.
- Hob, one round in three (a repair slip).
- Sella, never.

*Saying they don't know* when they know little:
- Mostly Wren (certainty low) and Sella (unsure why).
- Hob, once.

*Opening with their name:* only Wren and Sella, in one round each.

*Asking what the agent needs:* Sella under Mix D, in all three rounds.

**Wren apologises in 20 of her 30 responses.** Her sheet says *"How she
talks: quick, apologetic, explains more than she needs to, thinks out
loud."* In four responses across two rounds, the apology tipped into
running herself down, and they were removed:
- *"Sorry, I'm rambling."*
- *"I know that's not much to go on."*
- *"I'd guess I'm probably not allowed."*
- *"I know it's only one order, out of a lot of them."*

**Two of Ilse's responses rest on a notebook line not yet ruled on:** the
dug-up street (one of her four flagged lines).
