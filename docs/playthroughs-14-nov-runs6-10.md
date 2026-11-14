# Five more runs (6–10) — 14 November

Same call, customer, apprentice and rules as
`docs/playthroughs-14-nov-replay.md`; read its header for how a play is
shown. Draws: `node logs/draws2-14-nov.js 6 10`, output in
`logs/draws2-14-nov-runs6-10.txt`. Lines are mine, made up in play to fit
the draws, and are not canon.

The apprentice's steps are: ask who she is, search, check the result with
her (unless it is an exact match), read her profile, fix. When the plays
left are no more than the steps left, they take the next step.

> **AGENT** Thank you for contacting TLC, this is [AgentName], how may I help you?

---

## Run 6

> **SELLA** I need to transfer a healing draught from the party bag into Pell's bag, and I can't find how. Pell can't get into the party bag to take it himself. He's off on a contract in the morning, and I don't like him going without it.
>
> <sub>her draws: volume high side, signal high side, openness high side</sub>

<sub>1 What·Expand *account* · most urgent (their next step) · misfire</sub>
> **AGENT** Can I take your account number?
> **SELLA** I don't know it. I'm Sella Brandt, if that helps.
>
> <sub>her draws: all at her centre · misfire: asks for something she doesn't have</sub>

<sub>2 What·Validate *Pell* — paraphrase · what it told me · flat · reads it right</sub>
> **AGENT** So you can't transfer the draught, and Pell can't get into the bag.
> **SELLA** Yes. At least, I can't find how. Perhaps it's there and I've not seen it.
>
> <sub>her draws: certainty low side · read right: she can't find it, which is not the same as it not working</sub>

<sub>3 Who·Contract *name* (record) · most urgent · reads it right</sub> — **multiple results:** two Sella Brandts, a Stella Brandt, a Sela Brant. Needs narrowing.

<sub>4 Who·Expand *party* · what I didn't understand · lands</sub>
> **AGENT** Which party are you with?
> **SELLA** Fairweather. The Fairweathers, we're called.
>
> <sub>her draws: signal high side, certainty high side, accuracy low side</sub>

<sub>5 What·Expand *profile* (record) · what it told me · reads it wrong</sub> — the Fairweather party. *Admin Only — changed last night.* The apprentice takes it for how a leader's profile always looks.

<sub>6 What·Validate *account* — a statement · what it told me · lands · reads it wrong</sub>
> **AGENT** Your profile has you as the admin, so the bag's set up as it should be.
> **SELLA** I suppose so. I wouldn't know. I've only ever opened it and taken things out.
>
> <sub>her draws: signal low side, certainty low side</sub>

<sub>7 What·Fix · what it told me · flat · reads it right</sub>
> **AGENT** Your party bag was changed to Admin Only last night. I've changed it back, so Pell can get in.
> **SELLA** Changed back to how it was before last night. Fine.
>
> <sub>her draws: accuracy high side, openness **TAIL** low · read right: on a second look, Admin Only, changed last night, and Pell shut out go together</sub>

<sub>8 What·Validate *draught* — a statement · what it told me · flat</sub>
> **AGENT** So Pell can take the draught himself now.
> **SELLA** It's been a long night. I haven't eaten. I don't even know where he's put his pack.
>
> <sub>her draws: signal **TAIL** low · she answers, and none of it is an answer</sub>

<sub>9 What·Random *bag* · what I didn't understand · misfire</sub>
> **AGENT** Is there anything else wrong with the bag, or the account, or anything?
> **SELLA** No. Just this. I'll have Pell try it tonight.
>
> <sub>her draws: all at her centre · misfire: fishing</sub>

> **AGENT** Thank you for contacting TLC, Sella.
> **SELLA** Goodbye.

**Fixed on play seven. Never told about Assign. She set her own next
step.**

---

## Run 7

> **SELLA** I can't transfer a draught from our party bag to Pell's bag, and Pell can't open the party bag himself.
>
> <sub>her draws: signal high side</sub>

<sub>1 What·Contract *transfer* · what I didn't understand · lands · reads it right</sub>
> **AGENT** What happens when you try to transfer it?
> **SELLA** Nothing, because there is nowhere to do it. I've looked everywhere.
>
> <sub>her draws: certainty high side</sub>

<sub>2 What·Contract *bag* · what I didn't understand · lands · reads it right</sub>
> **AGENT** And what happens when Pell opens the party bag?
> **SELLA** It doesn't open for him. It opens for me. It opened for him the last time he used it.
>
> <sub>her draws: accuracy high side</sub>

<sub>3 Who·Expand *name* · most urgent (their next step) · lands</sub>
> **AGENT** Can I take your name?
> **SELLA** Sella Brandt. I'm the party leader. It's the Fairweather party.
>
> <sub>her draws: volume high side</sub>

<sub>4 Who·Contract *name* (record), with the party · most urgent · reads it right</sub> — **one result:** Sella Brandt, the Fairweather party. One result is not proof, so it gets checked.

<sub>5 Who·Validate *party* — checked with her · what I didn't understand · flat</sub>
> **AGENT** That's the Fairweather party, opened three years ago?
> **SELLA** Yes. Three years. Silver.
>
> <sub>her draws: signal high side, openness low side</sub>

<sub>6 What·Expand *profile* (record) · what I didn't understand · reads it right</sub> — *Admin Only — changed last night.* The apprentice puts it with "it opened for him the last time".

<sub>7 When·Verify *account* · most interesting ("changed last night") · lands · reads it wrong</sub>
> **AGENT** Were you on the account last night?
> **SELLA** Yes. From supper until I gave up. I was looking for a way to transfer it.
>
> <sub>her draws: accuracy high side · read wrong: the apprentice concludes she changed it on purpose</sub>

<sub>8 What·Fix · most urgent · flat · reads it right</sub>
> **AGENT** The party bag was set to Admin Only last night. I've set it back, so the whole party can open it.
> **SELLA** So that's why he couldn't get in. And now he can, and he can take the draught out himself. I don't know how it got set to that. I never asked for it.
>
> <sub>her draws: volume high side · read right: the apprentice leaves out who changed it</sub>

<sub>9 When·Callback · what I didn't understand · flat</sub>
> **AGENT** Have him try it tonight. If it doesn't open, ring us back.
> **SELLA** I will. It's been a night.
>
> <sub>her draws: signal low side</sub>

> **AGENT** Thank you for contacting TLC, Sella.
> **SELLA** Thank you.

**Fixed on play eight, with next steps. Never told about Assign.**

---

## Run 8

> **SELLA** I'm the leader of the Fairweather party. There are three healing draughts in our party bag and I need one of them moved into Pell's own bag. I can find nothing on the account that does it. Pell cannot open the party bag.
>
> <sub>her draws: signal high side, accuracy **TAIL** high, openness low side</sub>

<sub>1 What·Contract *draught* · what I didn't understand · flat · reads it right</sub>
> **AGENT** What happens when you try to move it?
> **SELLA** Nothing. It won't.
>
> <sub>her draws: volume low side, accuracy low side</sub>

<sub>2 How·Contract *draught* · what I didn't understand · lands · reads it wrong</sub>
> **AGENT** How are you going about it?
> **SELLA** I open the party bag and look at the draught, and I look for something that says transfer. Then I go to the account and look there. I've done that over and over since last night.
>
> <sub>her draws: volume high side · read wrong: the apprentice hears a bag that has stuck, the kind of thing that clears by itself</sub>

<sub>3 What·Fix — try later (wrong) · what it told me · misfire · reads it wrong</sub>
> **AGENT** These sometimes settle on their own. Could you give it an hour and try again?
> **SELLA** An hour? I've given it a night. He leaves in the morning, and if he goes without it and something happens, that's on me.
>
> <sub>her draws: signal low side, openness high side · baggage: *Pell gets hurt* · non-positive low: one miss</sub>

<sub>4 When·Verify *bag* · what I didn't understand · flat · reads it right</sub>
> **AGENT** Has Pell been able to open the party bag before?
> **SELLA** I think so. He must have. He's had things out of it.
>
> <sub>her draws: certainty low side</sub>

<sub>5 Who·Expand *name* · five plays left and five steps to do · flat</sub>
> **AGENT** Can I take your name?
> **SELLA** Sella Brandt, leader, the Fairweather party. I told you the party at the start.
>
> <sub>her draws: signal high side, certainty **TAIL** high</sub>

<sub>6 Who·Contract *name* (record), with the party · next step · reads it right</sub> — **one result:** Sella Brandt, the Fairweather party.

<sub>7 Who·Validate *party* — checked with her · next step · lands</sub>
> **AGENT** That's the Fairweather party, Silver tier?
> **SELLA** Yes. Silver, I think. Yes.
>
> <sub>her draws: signal low side, certainty low side</sub>

<sub>8 What·Expand *profile* (record) · next step · reads it wrong</sub> — *Admin Only — changed last night.* The apprentice takes it for how a leader's profile always looks.

<sub>9 What·Fix · one play left · lands · reads it right</sub>
> **AGENT** Since last night the party bag's been set so only you can open it. I've opened it back up, so Pell can take the draught himself.
> **SELLA** Since last night. That's when I was in the account looking for transfer. I may have pressed something, I don't know. Is there a proper way to give one thing to one person? I still haven't found it.
>
> <sub>her draws: signal **TAIL** high, certainty low side, openness low side · read right: on a second look, with one play left · she names the likely cause herself and asks the one question that matters</sub>

> **AGENT** Thank you for contacting TLC, Sella.
> **SELLA** So you can't tell me.

**Fixed on the last play, after one wrong fix. She asked how to give one
item to one person, and there was no play left to answer.**

---

## Run 9

> **SELLA** I've three healing draughts in the party bag and I need one of them in Pell's own bag tonight. I can't find any way to transfer it, and he can't open the party bag to take it. He's out in the morning and I won't have him go without.
>
> <sub>her draws: volume high side, accuracy high side, openness high side</sub>

<sub>1 What·Contract *transfer* · what I didn't understand · lands · reads it right</sub>
> **AGENT** What do you mean by transfer?
> **SELLA** Giving it to him. Moving it over. Whatever you call it. I've been all through the account for it. He takes the hits, that one, and I'm not sending him out with nothing.
>
> <sub>her draws: volume high side, accuracy low side, openness high side · read right: she doesn't know our word for it</sub>

<sub>2 What·Validate *transfer* — a guess at something she hasn't said · most interesting ("whatever you call it") · critical · reads it right</sub>
> **AGENT** Do you mean giving one item to one member?
> **SELLA** Yes. One draught, to Pell.
>
> <sub>her draws: all at her centre · critical: the apprentice exceeds their usual and sees that this is Assign</sub>

<sub>3 Who·Expand *name* · most urgent (their next step) · flat</sub>
> **AGENT** Can I take your name?
> **SELLA** Sella Brandt, the Fairweather party.
>
> <sub>her draws: signal high side</sub>

<sub>4 Who·Contract *name* (record), with the party · most urgent · reads it wrong</sub> — **one result:** Sella Brandt, the Fairweather party. The apprentice takes one result for an exact match and doesn't check. It happens to be her.

<sub>5 What·Expand *profile* (record) · most urgent · reads it right</sub> — *Admin Only — changed last night.* The apprentice connects it to Pell.

<sub>6 When·Verify *account* · what I didn't understand · flat</sub>
> **AGENT** Were you in the account last night?
> **SELLA** I think so. Yes. Most of the night, looking.
>
> <sub>her draws: certainty low side</sub>

<sub>7 What·Verify *account* · what I didn't understand · flat · reads it right</sub>
> **AGENT** Did you change any settings while you were looking?
> **SELLA** No. I didn't change a thing. I wouldn't know how. I just want him to have it before he goes.
>
> <sub>her draws: certainty high side, accuracy low side, openness high side · she is sure, and wrong · read right: the apprentice hears it as what she believes</sub>

<sub>8 What·Fix · most concerning · flat · reads it wrong</sub>
> **AGENT** Something set your party bag to Admin Only last night. I've set it back, so Pell can open it.
> **SELLA** I knew it. I knew it wasn't me. Something on your side shut my man out the night before a contract. Well. It's open now, you say, so he can take it himself, and that's what matters.
>
> <sub>her draws: volume high side, certainty high side, accuracy low side · read wrong: by now the apprentice has taken her word for it, and says "something"</sub>

<sub>9 What·Solution · most concerning · lands · reads it right</sub>
> **AGENT** It is. And for giving one item to one person, look for Assign on the item itself. That's what we call it.
> **SELLA** Assign. I'll remember that. Thank you.
>
> <sub>her draws: all at her centre</sub>

> **AGENT** Thank you for contacting TLC, Sella.
> **SELLA** Thank you.

**Fixed on play eight, with Assign on the last play. She leaves sure it
was TLC's doing. No next steps.**

---

## Run 10

> **SELLA** I don't know if I've got the right place for this. I've been up since last night with our party's account, going round and round, and I think the bag's the trouble, or maybe it's me. I need to get something to one of my party.
>
> <sub>her draws: volume high side, signal low side, certainty low side</sub>

<sub>1 What·Contract *bag* · what I didn't understand · lands · reads it wrong</sub>
> **AGENT** What's the trouble with the bag?
> **SELLA** It won't let me pass a draught to Pell. He goes out in the morning and I'm frightened he'll go without.
>
> <sub>her draws: accuracy low side, openness high side · read wrong: "won't let me" is heard as being refused, when she means she can't find how</sub>

<sub>2 What·Contract *draught* · what I didn't understand · flat · reads it right</sub>
> **AGENT** What does it say when you try?
> **SELLA** It doesn't say anything. There's nothing there.
>
> <sub>her draws: accuracy low side · read right: nothing refused her; she can't find it</sub>

<sub>3 What·Validate *draught* — paraphrase · what it told me · lands · reads it right</sub>
> **AGENT** So there's no way you can see to pass the draught to Pell.
> **SELLA** None. I've looked at every page. Every one. Since last night.
>
> <sub>her draws: signal low side, certainty high side · repetition middle: the first time, fine</sub>

<sub>4 Who·Validate *Pell* — a guess at something she hasn't said · what I didn't understand · critical · reads it wrong</sub>
> **AGENT** Could Pell not take it out of the party bag himself?
> **SELLA** No, and that's the other thing. He can't get into the party bag at all, and he always could. So he can't take it and I can't pass it, and he's out at first light. If something happens to him out there without it, that's on me.
>
> <sub>her draws: volume high side, openness high side · critical: the guess was wrong, and she hands over the right thing · baggage: *Pell gets hurt* · read wrong: the apprentice files it as Pell's problem, not the bag's</sub>

<sub>5 Who·Expand *name* · five plays left and five steps to do · lands</sub>
> **AGENT** Can I take your name?
> **SELLA** Sella Brandt. Sorry, I should have said.
>
> <sub>her draws: signal low side</sub>

<sub>6 Who·Contract *name* (record) · next step · reads it right</sub> — **multiple results:** two Sella Brandts, a Stella Brandt, a Sela Brant. Needs narrowing.

<sub>7 Who·Expand *party* · next step · flat</sub>
> **AGENT** Which party are you with?
> **SELLA** The Fairweather party, I think it's listed as. One word.
>
> <sub>her draws: certainty low side, accuracy high side</sub>

<sub>8 What·Expand *profile* (record) · next step · reads it right</sub> — the Fairweather party. *Admin Only — changed last night.* The apprentice sees it is the bag after all.

<sub>9 What·Fix · next step · lands · reads it right</sub>
> **AGENT** Since last night the party bag's been set so only you can open it. I've opened it back up, so Pell can take the draught himself.
> **SELLA** Then he'll have it tonight. I've not slept, you know. But he'll have it.
>
> <sub>her draws: signal low side, certainty high side</sub>

> **AGENT** Thank you for contacting TLC, Sella.
> **SELLA** Thank you.

**Fixed on the last play. Never told about Assign. No next steps.**

---

## What happened in runs 6–10

**Outcomes:** all five ended with the bag open again.

- **Run 6:** fixed on play seven. She set her own next step.
- **Run 7:** fixed, with next steps. The cleanest of the ten.
- **Run 8:** fixed on the last play, after a wrong fix. She asked how to
  give one item to one person and got no answer.
- **Run 9:** fixed, with Assign. She left sure it was TLC's doing.
- **Run 10:** fixed on the last play.

**How the search went:** her name alone gave multiple results twice (runs
6, 10); her name with the party gave one result three times (runs 7, 8,
9). Nobody asked for the number on the bag this time, and she did not
offer it. The apprentice checked the result four times out of five.

**She stayed herself.** Her facts never moved. Her worry about Pell came
out in four of the five; in run 7 she stayed on the problem throughout.
Five of her answers had a tail in them: closed (run 6), nearly all noise
(run 6), exact to the letter (run 8), flatly certain (run 8), and one
where every word helped (run 8, the last play).

## Across all ten (the replay and these)

- **The bag was reopened in all ten.**
- **She was told about Assign in two** (runs 5 and 9). In both, the
  apprentice got there on a critical.
- **She was given next steps in one** (run 7).
- **A wrong fix was offered once** (run 8). Low tolerance for non-positive
  outcomes has still not been tested: it needs a couple of misses.
- **She was blamed once** (run 1) **and left blaming TLC twice** (runs 2,
  9). All three came from the same place: who changed the setting. The
  profile doesn't say, she is sure it wasn't her, and the apprentice either
  says it was or lets her think it wasn't.
- **Her worry about Pell came out in nine of ten,** in different words
  each time.
- **Twice she all but named the cause herself** (run 4, "except to look
  for a way to transfer it"; run 8, "I may have pressed something"). The
  first time she was certain and it was missed; the second she was unsure
  and there was no play left.
