# Two more causes for the bag call — what each would need

Written 16 October for Phil to read before anything is built. **Nothing here
is built.** Every line marked **[C]** is mine and still to be put to Phil one
at a time; nothing is folded into `docs/settled.md`.

## Where they come from

**[P]** Phil, 15 October, asked as questions:

- *Could Sella have accidentally switched the settings on her party's bag, so
  now no one else can access the items within it?*
- *Could Sella have not noticed a TLC change that meant that her party could
  no longer access the Party's bag to extract contents?*

**[P]** Already his, and what both rest on (`settled.md` §10, tentative 14
October): every member has their own bag; the party's bag contains all items
and must be coordinated and maintained by the leader to give members access;
access is restricted by the leader's personal preferences. And from §10
proper: an Admin can assign items from the party's bag to a member.

## What the engine already supports

`src/cards/turn.js:66` picks one cause per call from `CAUSES` in
`src/cards/bag.js`. Today there is one, `her-word`: the function is called
*assign* and she is looking for *transfer*. Each cause carries:

| Field | What it is |
|---|---|
| `rule` | The cause in one sentence |
| `reach` | Which of her subjects lead to it |
| `hints` | Subjects that point toward it |
| `evidence` | The record row that fits it without naming it |
| `departures` | What she says when the player reaches it |
| `suggests` | Which wrong remedies it is mistaken for |
| `fix` | The agent's line that resolves it, and her reply |

So adding a cause is data, not a new mechanism. The known fault it helps with:
one cause means one fixed line of play wins every call
(`docs/notes-reply-engine.md`, *What is wrong, and known*).

## Cause A — she switched the bag's settings by accident

**What has to be true:**

1. A setting on the party's bag that says who can take items out. It is now
   set so only the leader can.
2. Before the switch, members took items out themselves. That is why she has
   never had to move anything to anyone (`bag.js:70`: *"I've never moved
   anything to anybody before. There's never been a need."*), and it now reads
   as true rather than odd.
3. She changed it without meaning to, and does not know she did.

**What the record would need** (`src/cards/bagRecord.js`):

- A row on the bag for its access setting, showing *leader only* and when it
  was changed, and by whom: her.
- A history of members taking items out themselves, up to the date of the
  change, then nothing. That is the evidence row: it fits the cause without
  naming it.
- The file's header says *"Everything in here is correct… nothing has
  failed."* That stays true. The record would be correct, and she would be the
  one who changed it.

**What changes in what she says:**

- Her complaint today is that she does the thing and the draught sits there.
  Under this cause, the trouble starts when Pell tries to take it and cannot.
  **The opening may not be the same call.** See question 1.
- The `permissions` remedy (`bag.js` REMEDIES) is the wrong guess today, and
  her reply is *"You've just told me my permissions are right."* Under this
  cause, access is the actual problem. The remedy and her reply would need a
  version for this cause.
- Two herrings point at permissions on purpose, because today that is the
  wrong lead: *"Pell only came in with us in the spring"* and *"The Ryles have
  never had anything off me either."* Under this cause they point the right
  way. They would stop being herrings on this cause.

**[C] Inventions it needs, each to raise separately:** the setting's name as
the record shows it; the date it changed; what she was doing when she changed
it; the lines she says when the player reaches it; the agent's fix line and
her reply.

## Cause B — TLC changed something and she did not notice

**What has to be true:**

1. TLC changed how party bags work: members can no longer take items out
   themselves, and the leader has to assign them.
2. TLC told parties about it somehow, and she missed it or did not take it in.
3. As with A, members used to take items out themselves, which is why she has
   never assigned anything.

**What the record would need:**

- A notice from TLC on the account, with a date, saying what changed.
- The same history as A: members taking items out until the change, then
  nothing.
- Nothing on the account showing *she* changed anything. That is how the
  player tells A from B.

**What changes in what she says:**

- Her belief about the account (`bag.js` BELIEFS, `account history`): *"It's
  all been quiet."* Under this cause she believes it, and it is wrong. That
  fits the memory rule as it stands: she is confident and wrong.
- The same remedy and herring changes as A.
- **Cozy rule** (`settled.md` §8, *Honest error*): nobody is at fault. TLC
  sent a notice; she did not see it. The record is right and she is honest.

**[C] Inventions it needs, each to raise separately:** what exactly TLC
changed; how the notice reached her (on the account, by enchanted mail, or
both); its date and wording; her lines; the fix line and her reply.

## How the three causes sit together

| | `her-word` (today) | A — her setting | B — TLC's change |
|---|---|---|---|
| Is anything wrong with the account? | No | Yes, a setting | Yes, how bags work |
| Who changed it? | Nobody | She did | TLC did |
| What the record shows | No assignments ever | A setting changed by her | A notice from TLC |
| Is *permissions* the right guess? | No | Yes | Partly — it is TLC's rule, not hers |

## Questions only Phil can answer

1. **Is it the same call?** Today she rings because she does the thing and the
   draught sits there. Under A and B, the trouble is that Pell cannot take it
   out himself. Does she ring with the same opening (*"It isn't working."*)
   and the same symptom on every cause, or does each cause start differently?
2. **Can the causes stack?** Under A or B, if she then tries to move the
   draught to Pell herself, she would also hit `her-word`, looking for
   *transfer*. Can a call carry two causes at once?
3. **Cause A:** how did she switch it? While doing what?
4. **Cause B:** what did TLC change, and how did they tell parties?
5. **Does she know?** Under A, does any part of her remember changing a
   setting, wrongly or vaguely, or nothing at all?

## Phil's answers — 16 October **[P]**

1. **Same call?** Same call, same opening, same symptom — and it can also
   start differently: the cause, the opening or the symptom could each be
   different.
2. **Stacking:** causes could stack.
3. **Cause A, how she switched it:** "Who knows."
4. **Cause B, what TLC changed:** a system update with an unintended
   consequence — bag settings were set to **Admin Only** on the party bag.
   This could also be used as an occasional scenario where the consequences
   are different; not reused right after a call where the consequences were
   something else, so probably once every 100 calls the consequences shift.
5. **Does she know?** *"Does anyone read and remember in full, every
   notification from a service provider? Not counting those edge cases of
   perfect recall, eidetic memory, etc."*

### What follows from those **[C]**, mine, for checking

- A and B leave the account in the **same state**: the party's bag set to
  Admin Only. What differs is who changed it — her, or a system update — and
  the record is where the player can tell.
- Under B there was a notification, and she may have seen it and kept only
  the gist, or nothing. That is memory by type (`settled.md` §8, *It
  misremembers*) applied to a notice.
- **The engine does not yet do three of these:** it picks exactly one cause
  per call (`turn.js:66`), so stacking needs a change; it has one opening
  (`bag.js` OPENING), so a different opening per cause needs a change; and a
  system update whose consequences shift every ~100 calls is state that
  carries between calls, which nothing in `src/cards/` holds today.

## Correction — Phil, 16 October **[P]**

*"You are assuming that setting appears on the account record. It's a setting
within the Party Leader's profile."*

So every place above that puts the access setting, or who changed it, on the
account or the bag is wrong: lines 56, 96, 99, the table at 121, and the
claim at 158 that *the record is where the player can tell*. The setting sits
on Sella's own profile — in `bagRecord.js`, the `con-sella` node, *"your
record on the account"*. Whether the player can see who changed it, or when,
is not known and is the first thing to put to Phil.

**[P] Settled 16 October — what her profile shows:** the setting and when it
last changed, not who changed it: *"Party bag access: Admin Only — changed
<when>"*. The date is a clue; it does not name A or B.
