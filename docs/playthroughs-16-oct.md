# Play-throughs — the bag call, 16 October

Played by Claude, by hand, as if the game works as described: nine plays, one
or two inquiries a play on single words already in play; the target decides;
Sella chooses neither, the first, the second or both, and which card she
answers from; what she says puts new words in play. **Every line here is
generated in play. None of it is canon, and none of it goes into the code or
the record.**

**What Sella knows** (Phil, 16 October), and nothing else: she can't transfer
an item from the party bag to Pell's bag; Pell is leaving to fulfil a contract
in the morning; Pell can't get into the party's bag; she is stressed, because
this hasn't been a problem before; she has spent a long time trying, and she
is frustrated. She does not know the cause, or the effect, or that she has
called repeatedly.

**Her sheet** as these runs used it — *corrected 18 October, see the end of
this file:* her Need (*not to be made a fool of*) is mine, from
`src/cards/bag.js`, not the record; *Certainty and Treatment weigh heaviest*
belongs to her flask call, not this one; patience is not a field in the
record. One of three baggages (from `src/cards/bag.js`) is carried. Patience
and empathy run 1–5 (`src/cards/sheet.js`).
Each run's baggage, patience, empathy and cause were rolled with the seeded
generator. The first set of rolls came out *A + her-word* five times out of
five, because the baggage and the cause were drawn from one stream; I re-rolled
with a separate stream for the cause. **The player's style in each run is my
choice, not rolled.**

**The record the agent can read:** the Fairweather party account (Silver,
opened three years ago, four contacts) · the bag, 7730 (three healing
draughts, rope, torches, a spare blade, dried stores) · assignment history,
none ever · Sella's own profile: Party Leader (Admin), and *Party bag access:
Admin Only — changed &lt;when&gt;*. **Bram**, the coworker, knows: *"There was an
update to bags three days ago. A couple of parties have rung since."*

**Assumption of mine, for the `her-word` run only:** with no update and no
change, her bag has been Admin Only since the account opened, her preference,
so Pell has never taken anything out himself.

Each turn shows the cards in small type, then the conversation.

---

## Run 1 — seed 11

**Sheet:** baggage *Pell gets hurt* (worry) · patience 5 · empathy 3.
**Cause:** the system update, three days ago.
**Player:** steady — asks, then checks, then asks someone.

> **AGENT** Thanks for calling TLC. How can I help?
> **SELLA** It isn't working.

<sub>1 · What·Expand → *working*</sub>
> **AGENT** Can you tell me what's happening?
> **SELLA** I'm trying to get a healing draught out of the party bag and into Pell's, and it won't go. And Pell can't get into the party bag himself.
>
> <sub>she takes it · answers with What · in play: draught, bag, Pell</sub>

<sub>2 · ID → ask for something searchable</sub>
> **AGENT** Is there a number on the bag, or on the account?
> **SELLA** There's a number on the bag. 4-4-0-9.

<sub>3 · Search → 4409</sub>
> **AGENT** Thank you — I've got the Fairweather party up.

<sub>4 · When·Contract → *working* + Why·Expand → *Pell*</sub>
> **AGENT** When did this start? And what does Pell need it for?
> **SELLA** Last night. I've been at it since, and again this morning, and it's never been a problem before. He's out on a contract first thing. He's the one who takes the hits. If he goes out without it and something happens, that's on me.
>
> <sub>she takes both · When, then Who · patience 5 lets her say it all · Pell and the morning in one answer, and her baggage comes out obliquely · in play: night, morning, contract</sub>

<sub>5 · Read → Sella's profile</sub>
> **AGENT** Bear with me one moment.
>
> <sub>screen: Party Leader (Admin) · Party bag access: Admin Only — changed 3 days ago</sub>

<sub>6 · Aside → Bram</sub>
> **AGENT** *(aside)* Bram — anything going on with party bags?
> **BRAM** There was an update to bags three days ago. A couple of parties have rung since.
> **SELLA** Is something wrong with it?
>
> <sub>she heard the agent not knowing · empathy 3: a little cost, no more</sub>

<sub>7 · How·Expand → *Pell*</sub>
> **AGENT** How does Pell usually get things out of the bag?
> **SELLA** He takes them out himself. Any of them can.
>
> <sub>she takes it · answers with Who · in play: nothing new · *(corrected 17 October: this was a Validate asking her to confirm what she had already said — a read-back)*</sub>

<sub>8 · Fix</sub>
> **AGENT** Your party bag was set to Admin Only, we switched it back. Pell can take the draught out himself now.
> **SELLA** Tonight? He can get it tonight?
> **AGENT** He can.
> **SELLA** Then he's not going out without it.
>
> <sub>pell-gets-hurt: her first thought is him, not whose fault it was</sub>

<sub>9 · Next steps</sub>
> **AGENT** If he has any trouble getting it out, ring us back and quote 4409.
> **SELLA** I'll wake him and have him try now.

**Ends:** fixed. Her Need was never touched — she was never told it wasn't
her, and never asked. What she takes away is that it works and Pell has it.

---

## Run 2 — seed 23

**Sheet:** baggage *No one told her* (leans to irritation) · patience 1 ·
empathy 5.
**Cause:** `her-word` — TLC calls it *assigning*; she is looking for
*transfer*.
**Player:** apprentice — one Random play, one wrong guess.

> **AGENT** Thanks for calling TLC. How can I help?
> **SELLA** It isn't working.

<sub>1 · Random → *working*</sub>
> **AGENT** Okay — what isn't working, exactly?
> **SELLA** The bag. I can't get a draught out of it to Pell.
>
> <sub>she takes it · What · patience 1: the least she can say · in play: bag, draught, Pell</sub>

<sub>2 · What·Expand → *bag* + Who·Expand → *Pell*</sub>
> **AGENT** Tell me about the bag — and who's Pell?
> **SELLA** He's in my party. He's off on a contract in the morning and he can't get into the party bag.
>
> <sub>she takes the second only · Who · in play: contract, morning</sub>

<sub>3 · ID → ask for something searchable</sub>
> **AGENT** Have you got an account number for me?
> **SELLA** There's a number on the bag. 4-4-0-9.

<sub>4 · Search → 4409</sub>
> **AGENT** Got it.

<sub>5 · How·Expand → *working*</sub>
> **AGENT** Walk me through what you're doing when you try it.
> **SELLA** I go through the account looking for where to transfer it. There isn't anywhere.
>
> <sub>she takes it · How · in play: transfer</sub>

<sub>6 · Remedy → permissions (wrong)</sub>
> **AGENT** It might be a permissions thing. I can get those looked at.
> **SELLA** Permissions. Nobody has ever sat down and told me how any of this is meant to go.
>
> <sub>her baggage, said in place of an answer · the call sours one step</sub>

<sub>7 · Where·Contract → *transfer*</sub>
> **AGENT** When you say transfer — where are you looking for it?
> **SELLA** Everywhere. I've been through every page of that account twice.
>
> <sub>she takes it · Where · in play: page</sub>

<sub>8 · Fix</sub>
> **AGENT** We call it assigning. Open the bag, pick the draught, and choose "Assign to member" — then pick Pell. It goes straight into his bag.
> **SELLA** Assign. Nobody tells you a thing about any of this.
> **SELLA** Not you. You've been fine.
>
> <sub>no-one-told-her lands on the company, not the agent · empathy 5 lets the apprentice off</sub>

<sub>9 · Try it on the line</sub>
> **AGENT** Do you want to try it while I'm here?
> **SELLA** …It's gone. It's in his.

**Ends:** fixed. The permissions guess cost her a little, and she put the
blame on TLC rather than the agent. Carries forward, if felt: *nobody tells
you anything*, about the co-op.

---

## Run 3 — seed 37

**Sheet:** baggage *Pell gets hurt* · patience 2 · empathy 2.
**Cause:** the system update.
**Player:** reads the record first, and says the wrong thing about it.

> **AGENT** Thanks for calling TLC. How can I help?
> **SELLA** It isn't working.

<sub>1 · ID → ask for something searchable</sub>
> **AGENT** Can I take the account number first?
> **SELLA** There's a number on the bag. 4-4-0-9.

<sub>2 · Search → 4409</sub>
> **AGENT** Thanks.

<sub>3 · Read → Sella's profile</sub>
> **AGENT** One moment.
>
> <sub>screen: Party bag access: Admin Only — changed 3 days ago</sub>

<sub>4 · What·Expand → *working*</sub>
> **AGENT** What's not working?
> **SELLA** I can't get a draught to Pell. He can't get into the party bag, and he's out on a contract in the morning.
>
> <sub>she takes it · What · in play: draught, Pell, bag, contract, morning</sub>

<sub>5 · Validate → *bag* (worded with her as the subject)</sub>
> **AGENT** It looks like you changed the bag to Admin Only a few days ago.
> **SELLA** I haven't touched it.
>
> <sub>she takes it · a flat no · her Need is hit: she hears she did it wrong · the call sours</sub>

<sub>6 · When·Contract → *morning* + Who·Expand → *Pell*</sub>
> **AGENT** When does he leave? And is he the only one going?
> **SELLA** First light.
>
> <sub>she takes the first only · patience 2 and souring: less given</sub>

<sub>7 · Fix</sub>
> **AGENT** I've switched it back, so Pell can get into the bag himself.
> **SELLA** Fine.

<sub>8 · Validate → *Pell*</sub>
> **AGENT** He should be able to take the draught out now.
> **SELLA** Should.
>
> <sub>neither confirmation nor thanks · she heard a guess</sub>

<sub>9 · Close</sub>
> **AGENT** Is there anything else I can help with?
> **SELLA** No.

**Ends:** fixed, but she rings off thinking TLC blamed her for something she
didn't do. What carries forward: that, about the agent and the co-op both.
Nothing on the record shows the agent got it wrong — only she knows.

---

## Run 4 — seed 41

**Sheet:** baggage *Pell gets hurt* · patience 3 · empathy 1.
**Cause:** her own setting, changed last night while she was hunting for
*transfer* — so `her-word` is underneath it, as designed (`docs/plan-two-causes.md`).
**Player:** steady, and catches the date.

> **AGENT** Thanks for calling TLC. How can I help?
> **SELLA** It isn't working.

<sub>1 · What·Expand → *working*</sub>
> **AGENT** Can you tell me what's happening?
> **SELLA** I can't transfer a draught from the party bag to Pell's. And he can't get into the party bag at all.
>
> <sub>she takes it · What · in play: transfer, draught, bag, Pell</sub>

<sub>2 · ID → ask for something searchable</sub>
> **AGENT** Is there a number on the bag I can look up?
> **SELLA** 4-4-0-9.

<sub>3 · Search → 4409</sub>
> **AGENT** Thank you.

<sub>4 · When·Expand → *working* + When·Contract → *Pell*</sub>
> **AGENT** When did it start, and when does Pell need it?
> **SELLA** Last night. He's out on a contract in the morning.
>
> <sub>she takes both · When, then When · empathy 1: facts only, nothing for the agent · in play: night, contract, morning</sub>

<sub>5 · Read → Sella's profile</sub>
> **AGENT** Bear with me.
>
> <sub>screen: Party bag access: Admin Only — changed last night</sub>

<sub>6 · Aside → Bram</sub>
> **AGENT** *(aside)* Bram — anything going on with party bags?
> **BRAM** There was an update to bags three days ago. A couple of parties have rung since.
>
> <sub>three days ago against last night: not the update</sub>

<sub>7 · Where·Expand → *transfer*</sub>
> **AGENT** Last night, when you were trying to transfer it — where were you looking?
> **SELLA** Everywhere. Every page of that account. I clicked on everything.
>
> <sub>she takes it · Where · not literal: she tried everything she could think of · in play: page</sub>

<sub>8 · Fix</sub>
> **AGENT** Something on the bag got set so only the leader can open it — that's why Pell can't get in. I've set it back.
> **SELLA** So he can take it himself.
> **AGENT** He can. And if you ever need to hand him something yourself, it's called "Assign" on our side.
> **SELLA** Assign.
>
> <sub>the line never makes her the one who changed it · empathy 1: no warmth back, none needed</sub>

<sub>9 · Close</sub>
> **AGENT** Anything else tonight?
> **SELLA** If he goes out without it and something happens, that's on me. He won't now.

**Ends:** fixed, both causes. She never learns she flipped the setting, and
the agent never said she did.

---

## Run 5 — seed 59

**Sheet:** baggage *No one told her* · patience 2 · empathy 4.
**Cause:** the system update.
**Player:** wanders, guesses, and runs out of plays.

> **AGENT** Thanks for calling TLC. How can I help?
> **SELLA** It isn't working.

<sub>1 · What·Expand → *working*</sub>
> **AGENT** What's happening?
> **SELLA** I can't move a draught from the party bag into Pell's.
>
> <sub>she takes it · What · in play: draught, bag, Pell</sub>

<sub>2 · What·Expand → *bag* + When·Expand → *bag*</sub>
> **AGENT** What else is in the bag? And when did you last use it?
> **SELLA** Biscuit carries half of what we own anyway.
>
> <sub>she takes neither · an aside from her life · in play: Biscuit</sub>

<sub>3 · Who·Expand → *Biscuit*</sub>
> **AGENT** Who's Biscuit?
> **SELLA** The mule.
>
> <sub>she takes it · Who · a play spent on the aside</sub>

<sub>4 · Remedy → new bag (wrong)</sub>
> **AGENT** I can send out a replacement bag and see if that clears it.
> **SELLA** I don't want another bag. There's nothing the matter with this one.

<sub>5 · ID → ask for something searchable</sub>
> **AGENT** Can I get a number to look you up?
> **SELLA** 4-4-0-9.

<sub>6 · Search → 4409</sub>
> **AGENT** Thanks.

<sub>7 · Why·Expand → *Pell*</sub>
> **AGENT** Why does it need to go to Pell?
> **SELLA** He's out on a contract in the morning, and he can't get into the party bag. It's never been like this before. Nobody tells you a thing about any of this.
>
> <sub>she takes it · Why · patience 2 is wearing · baggage said beside the answer</sub>

<sub>8 · Read → the bag, 7730</sub>
> **AGENT** One moment.
>
> <sub>screen: three healing draughts · all available · nothing on the access setting — that is on her profile</sub>

<sub>9 · Promise</sub>
> **AGENT** I'll open a case and someone will get back to you.
> **SELLA** Before first light?
> **AGENT** I'll mark it urgent.
> **SELLA** Right.
>
> <sub>empathy 4: she doesn't take it out on the agent</sub>

**Ends:** not fixed. Nine plays, the cause never reached; the setting was one
read away, on her profile, not the bag. What carries forward: the case, the
deadline, and *nobody tells you anything*.

---

## What the five runs show

- **Her baggage decides where she goes when the fix lands**, not the cause —
  when the call has gone well enough. Two of the three *Pell gets hurt* runs
  turn to him (*"Tonight? He can get it tonight?"*); in run 3, soured by
  being blamed, she gives nothing but *"Fine."* Both *no one told her* runs
  turn on the company.
- **Patience decides how much she gives**, and two inquiries in a turn only
  both get answered when she has it (run 1 yes, run 2 no).
- **Her Need** — to be told it was the word and not her — **was met in runs
  2 and 4**, where the agent told her TLC calls it *assigning*. It went unmet
  in runs 1 and 5, and run 3 told her she had done it.
- **The date on her profile did its job** in run 4 and wasn't looked at in
  run 5 — the profile is where the clue is, and the bag is not.
- **Phil, 17 October:** run 4's *"I clicked on everything"* stands. My
  flag was wrong: I read it literally, as a claim about what she did, when
  from her side it means *I tried everything I could think of*. **[P]** What
  she says is from her perspective. Run 2's *"Not you. You've been fine."* stands: **[P]**
  *it is possible to have good customer service and not be pleased with the
  outcome.*

## Checked 17 October — what was wrong, and what is still open

Fixed above: the header misquoted Phil (*"that anyone else has called"*; he
said *that she has called repeatedly*); run 1 turn 7 was a read-back; two card
labels did not match the question asked (run 2 turn 7, run 4 turn 4); run 4
said *both causes* under a header naming one; the summary said *both* Pell
runs when there were three, and that her Need was met in none when it was met
in two; the rolls were not disclosed honestly.

**Not a contradiction — Phil, 18 October:** *"Can players not make a mistake
or not be correct?"* What Sella knows is what she believes, and she can be
wrong. *This hasn't been a problem before* can be her belief and not the
record's fact. The record already said so (`settled.md` §8, *It
misremembers*; `docs/handover/memory/therealm-design-frame.md`, memory by
type). I flagged it without checking either.

**Found on re-reading the record against these runs, 18 October:**
- **Patience is not a field on her sheet in the record.** `settled.md` §8
  *Fields* lists tolerance for repetition, empathy, pattern sensitivity,
  tolerance for non-positive outcomes, and depth or breadth. Patience comes
  from `src/cards/sheet.js` and is mine. Every run leaned on it, and none used
  the record's four other fields.
- **Her Need as written here is mine.** *Not to be made a fool of* and *to be
  told it was the word and not her* exist only in `src/cards/bag.js:461`,
  never in the record.
- **"Certainty and Treatment weigh heaviest"** comes from the record's line
  about her *flask* call (`settled.md` §8, *The win categories on the sheet*),
  not this one. I carried it across calls without saying so.

**Corrected 18 October:** I first read *she does not know she has called
repeatedly* as meaning some calls are repeats in her world. The plainer
reading: each play-through is the same call played again, and she carries
nothing from one run to the next. These runs already treat it that way.
