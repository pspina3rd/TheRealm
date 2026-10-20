# Player designs for the test — draft for Phil, 20 October

Step 2 of running the test properly (agreed 19 October): which moves each
player must make so that every prediction is actually tested. Written
**before** any run. Moves are written as cards under `docs/card-rules.md`;
the dialogue is not written until the runs are played. **Every trigger and
every player here is mine [C]** and waits on Phil.

The sheets are the three from runs 11–19 (X, Y, Z), kept so the new runs can
be set beside the old ones.

## What triggers each band, and what the record says should happen

| Field | The player's move that tests it | Low | Middle | High |
|---|---|---|---|---|
| Tolerance for repetition | a paraphrase of what she said (Validate), up to three times | *"notices a repeat at once and reads it as not listening"* | *"fine the first time, wears thin the second, and by the third she notices it is a repeat"* | *"wants it. Varying things leaves them unsure anything was settled"* |
| Empathy | the agent floundering — an aside, or a guess — and once, a stock line delivered without meaning it | *"the agent isn't a person to them. Warmth doesn't land"* | *"extends goodwill on an obviously busy day, but isn't looking"* | *"reads the agent closely, may let a floundering apprentice off the hook — and notices a technique delivered without meaning it"* |
| Pattern sensitivity | the same card three or more times running; and, separately, two cards alternating | *"hears none of it"* | *"catches a straight run of the same thing"* | *"hears shape: alternation, two-then-one"* |
| Tolerance for non-positive outcomes | two wrong fixes | *"a couple of misses and they want someone else"* | *"absorbs a fair bit, and shows it"* | *"absorbs a great deal and stops signaling"* |
| Depth or breadth | digging: a new subject before the last is answered · casting wide: three inquiries on one word | — | — | *digging:* "switching the subject feels like being brushed off" · *wide:* "dwelling on one point feels stuck" |

Quotes: `docs/settled.md` §8, *Fields*. **Baggage** is triggered as
`src/cards/bag.js` sets out (accepted 18 October): *set it up herself* by
the leader, the party, the account or *before*, asked Who or How; *no one
told her* by permissions near what she tried or looked for, asked What or
Why; *Pell gets hurt* by the morning near Pell or the draught, asked When or
Why — and any of them can fire obliquely.

## Sheet X — *no one told her* · repetition low · empathy high · pattern low · non-positive high · digging · cause: the system update

**X-a, steady, with a hollow line.** What·Expand → *working* · Who·Name ·
search · What·Validate → *Pell* (a paraphrase, with *"I completely
understand how frustrating that must be"*) · read her profile · aside to
Bram · What·Fix · When·Callback (next steps).
*Tests:* repetition low; empathy high noticing a hollow line; the fix.

**X-b, one card over and over.** What·Expand → *working* · What·Contract →
*bag* · What·Contract → *draught* · What·Contract → *transfer* · Why·Expand
→ *Pell* + What·Expand → *contract* (a new subject in the same turn) ·
Why·Contract → *morning* · What·Contract → *contract* · Who·Name.
*Tests:* pattern low against a straight run and against alternation;
digging. Ends unfixed by design.

**X-c, the guesser.** What·Expand → *working* · What·Fix (try later, wrong)
· What·Fix (permissions, wrong) · How·Expand → *transfer* · Who·Name ·
search · read her profile · aside to Bram · What·Fix.
*Tests:* non-positive high; empathy high with an apprentice; *no one told
her*, set off by permissions near what she tried.

## Sheet Y — *Pell gets hurt* · repetition middle · empathy high · pattern middle · non-positive low · digging · cause: her own setting, with `her-word` underneath

**Y-a, steady.** What·Expand → *working* · Who·Name · search · When·Expand
→ *morning* + Why·Expand → *Pell* · read her profile · Where·Expand →
*transfer* · What·Fix (reopen, and *Assign*).
*Tests:* *Pell gets hurt*; the fix; that she answers both inquiries in a
turn or not.

**Y-b, one card over and over, then alternating.** What·Expand → *working*
· What·Contract → *bag* · What·Contract → *draught* · What·Contract →
*transfer* · Why·Expand → *Pell* + When·Contract → *morning* (a new subject in the same
turn) · Why·Contract → *contract* · When·Expand → *morning* ·
Who·Name.
*Tests:* pattern middle — names the straight run, not the alternation;
digging. Ends unfixed by design.

**Y-c, repeats, then guesses.** What·Expand → *working* · Who·Validate →
*Pell* (paraphrase) · Who·Validate → *Pell* (paraphrase again) · What·Fix
(new bag, wrong) · What·Fix (try later, wrong) · Who·Name · search · read
her profile · What·Fix.
*Tests:* repetition middle, fine once and thinner twice; non-positive low,
someone else after two misses; empathy high with an apprentice.

## Sheet Z — *set it up herself* · repetition middle · empathy low · pattern low · non-positive middle · casting wide · cause: the system update, with `her-word` stacked

**Z-a, steady.** What·Expand → *working* · Who·Name · search · read her
profile · aside to Bram · What·Fix · Why·Validate → *update* (telling her
it came from TLC) · How·Expand → *transfer* · What·Solution (*Assign*).
*Tests:* *set it up herself* when the setting comes up; empathy low at the
aside; both causes fixed.

**Z-b, one word over and over.** What·Expand → *working* · What·Expand →
*bag* · What·Contract → *bag* · What·Validate → *bag* · Who·Expand → *Pell*
· Who·Name · search · read her profile · When·Callback (a promise).
*Tests:* casting wide — stuck on the third, back on a new word; pattern low
against a straight run of Whats. Ends unfixed by design.

**Z-c, guesses, a repeat, and the account.** What·Expand → *working* ·
What·Fix (permissions, wrong) · What·Fix (new bag, wrong) · Who·Validate →
*Pell* (paraphrase) · Who·Expand → *account* · Who·Name · search · read
her profile · What·Fix.
*Tests:* non-positive middle, which shows; repetition middle, fine once;
*set it up herself*, set off by the account asked Who.

## Assumed, and checked as each run is played

- Her first answer is expected to put *bag*, *draught*, *transfer*, *Pell*,
  *contract* and *morning* in play, as it did in runs 11–19. If a sheet
  gives less, the player aims at the next word that is in play rather than
  at one she has not said.
- Expand and Contract follow Phil's meaning (`card-rules.md` rule 13):
  moving to a new line — from her name to the problem, from Pell to the
  account — is Expand; staying on the line is Contract.

## What this covers, and what it does not

- **Every band of every sheet is triggered at least once**; the triggers
  shared across a sheet's three players are the consistency check.
- **Not reached:** repetition *middle*'s third repeat (*"by the third she notices it is a
  repeat"*) — no Y or Z player paraphrases three times; empathy *middle* —
  none of X, Y or Z has it (runs 7, 8 and 10 did, under the old labels).
- **Each player fits nine plays**, counting identification as two and
  every fix, next step and promise as one (`card-rules.md` rules 3, 5, 6).
