# How Sella's five counts act on one another — 14 November

Phil, 14 November: *"Each of the five have its own 'usual'. What impact
does each 'usual' have on each other? Where does that bell curve land? Then
look at each tail impacting 'usual' others. Then factor two tails occurring,
then three, then four, and finally five."*

Worked through with `logs/links-14-nov.js` over a million answers; its
output is `logs/links-14-nov.txt`. **Every pull is my guess [C], fitted to
Sella on this call.** The one fixed point from the record is that certainty
and accuracy do not move together, so there is no pull between them.

A count is "usual" when it lands within two spreads of her own centre, and
in a tail beyond that. On its own, each count is usual about 95 times in
100.

## Which acts on which [C]

Openness and certainty are what she brings to an answer. Volume follows
from them. Signal and accuracy are what the listener ends up with; she
cannot steer them, so they act on nothing.

- **Openness on volume:** the more she opens up, the more she says. Closed,
  she says less.
- **Certainty on volume:** unsure, she hedges, and hedging takes words.
  Sure, she is brief.
- **Volume on signal:** few words carry little. Running on mixes her stress
  in with the facts. Either way signal drops; it drops far more when she
  says little.
- **Volume on accuracy:** few words are loose words.
- **Certainty on signal:** hedges are noise.
- **Openness on signal:** her worry is not about the fault, so when it
  comes out, less of what she says helps find the cause. Kept to the
  problem, more of it helps.

## All five usual

This is three answers in four (77 in 100).

Even here the counts lean on each other a little, because "usual" is a
range and not a point. Where each curve lands once the others have acted
on it:

- **Signal lands a little below its own centre** (about three-tenths of a
  spread). Saying a bit less than usual costs it, and so does saying a bit
  more, so the pushes do not cancel.
- **Accuracy lands a touch below** (a tenth of a spread), from the answers
  where she says a bit less.
- **Volume stays centred but spreads a little wider,** because two things
  push it about.
- **Certainty and openness land exactly where they started.** Nothing acts
  on them.

In plain terms: on an ordinary answer she is slightly less useful to the
agent than her signal alone would make her, because she is stressed and
her wordiness is never quite right.

## One tail

About one answer in five (20 in 100). What each does to the others:

- **Volume very low** (a few words): signal drops three-quarters of a
  spread, and is itself in a tail 17 times in 100. Accuracy drops half a
  spread. This is the costly one.
- **Volume very high** (she runs on): signal dips slightly. Little else.
- **Openness very high** (the worry comes out): volume rises a full
  spread, and is in a tail 17 times in 100. Signal drops a third of a
  spread.
- **Openness very low** (closed): volume drops four-fifths of a spread.
  Signal rises a little: what she does say is about the problem.
- **Certainty very low** (hedging): volume up half a spread, signal down
  about a quarter.
- **Certainty very high** (flat statements): volume down half a spread.
  Nothing else, and in particular nothing on accuracy.
- **Signal or accuracy in a tail:** moves nothing. They are results.

## Two tails

About three answers in 100. Without the pulls it would be under two, so
most pairs are one tail dragging a second out with it, not two accidents.
The commonest pairs:

- **Few words and little use** (volume low with signal low).
- **Worry out and running on** (openness high with volume high).
- **Running on and little use** (volume high with signal low).
- **Closed and few words** (openness low with volume low).
- **Few words and loose** (volume low with accuracy low).

When two tails act on the same count, they add or cancel:

- **Closed and sure** both cut volume, so she is at her shortest.
- **Open and sure** pull volume opposite ways and roughly cancel.
- **Open and unsure** both raise volume, so she is at her longest, with
  signal at its lowest.

## Three tails

About three answers in 1,000. Nearly always a chain: one count she brings,
volume following it, and signal or accuracy following volume.

- **Closed, then few words, then little use** — the first run 4 of
  `docs/playthroughs-14-nov.md`, which I had written as her ordinary self.
- **Worry out, then running on, then little use.**

## Four tails

About one answer in 7,000. A chain of three with certainty also out: for
example unsure and open, so she runs on at length, with both signal and
accuracy suffering.

## Five tails

Did not occur in a million answers. Without the pulls it is about one in
five million. It would be an answer with nothing usual about it, and for
practical purposes she never gives one.

## What this means for a run

- On a nine-play call she gives about ten answers. Expect seven or eight
  to be all usual, two to have one count out, and a two-tail answer about
  once every three calls.
- The earlier draws (`logs/draws-14-nov.js`) set "usual" at one spread, not
  two, which is why her tails looked common there.
