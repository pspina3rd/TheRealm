# Her side — the 46 pairs, 12 October

Working file, not the record. For each card the player plays on a word that
`bag.js` `SUIT_NONSENSE` marked as making no sense: the card Sella answers
from, her line, and the single words it puts in play. **[C] Every choice of
card is mine.** Every line is copied from an existing line of hers, named.
Counts checked by script: 19 subjects × 6 suits = 114 pairs; 23 written,
46 marked nonsense, 45 neither.

## Set 1 — Phil: "I guess" (accepted, 12 October)

| Played | She answers | Line | Source | Puts in play |
|---|---|---|---|---|
| Who · working | Who | Just me. It's the party's account, and I set it up. | `account`, `leader` | account, party |
| When · working | When | Last night, and again this morning. | `bagTalk` tried what/expand | night, morning |
| Where · working | Where | On the account. I've been through every page of it twice. | `BASELINE.looking`, no *transfer* | account, page |
| Why · working | What | I don't know. I do the thing I think I'm meant to do, and the draught just sits there. | `bagTalk` working what/contract | draught |
| How · working | How | I found the draught in the bag, then went through the account for how to get it to him. | `bagTalk` tried how/contract | draught, bag, account |
| When · bag | When | We stocked up for the passes. | `HERRINGS.stores` | passes |
| Why · bag | What | It's the party's bag. Everything we carry is in it. | `bagTalk` bag what/expand | party |
| Who · bag | Who | It's the party's. Me, Pell, and the Ryle brothers. | `bagTalk` party what/expand | Pell, Ryles |
| When · draught | What | A healing draught. The standard one — we keep three. | `bagTalk` draught what/contract | three |
| Who · draught | Who | Pell. He's the one who takes the hits, so he ought to be the one carrying it. | `bagTalk` pell who/expand | Pell |

## Set 2 — put to Phil 12 October

Phil: 1, 3, 4 and 10 read awkwardly; 9 makes no sense without its context. Rewrites below the table; **[C] the rewritten wording is mine**, keeping the source line's facts.

| Played | She answers | Line | Source | Puts in play |
|---|---|---|---|---|
| When · Pell | When | Pell only came in with us in the spring, if that makes a difference. | `HERRINGS.pell` | spring |
| Where · Pell | When | We're out at first light, and I'd rather it was in his hands before then. | `VOLUNTEER.morning` | morning (the subject; she does not say the word) |
| Where · tried | How | I go through the account looking for the way to do it, and I can't find one. | `bagTalk` tried how/expand | account |
| Who · looking | What | Transfer. I've read every word on that account and not one of them says it. | `bagTalk` looking what/contract | transfer |
| When · looking | When | Last night, and again this morning. | `bagTalk` tried what/expand | night, morning |
| Where · looking | Where | Everywhere. I've been through every page of that account twice. | `BASELINE.looking` | page, account |
| Why · looking | What | That's all I'm trying to do — transfer it out of the shared one and into his. | `CAUSES[0].departures[0]`, second half | transfer |
| How · looking | How | I've read every word on that account and not one of them says transfer. | `CAUSES[0].departures[0]`, first half | transfer, account |
| When · party | When | Since last autumn. | `bagTalk` account what/contract | autumn |
| When · leader | Who | I am. I set it up myself. | `bagTalk` leader who/validate | — |

### Set 2 rewrites — put to Phil 13 October

| Played | She answers | Line | Keeps the facts of |
|---|---|---|---|
| When · Pell | When | He joined us in the spring. | `HERRINGS.pell` |
| Where · tried | Where | In the account. I've been all through it. | `bagTalk` tried how/expand |
| Who · looking | What | Somewhere to transfer it. There isn't one. | `bagTalk` looking what/contract |
| When · party | When | We opened the party's account last autumn. | `bagTalk` account what/expand |
| When · leader | When | From the start. I set the account up. | `bagTalk` leader who/expand; *from the start* is new |

### Set 2, second rewrites — 13 October

**Corrected.** I first recorded Phil's description of the history *I* had
given the party (formed last autumn, split before spring, Pell in the spring)
as his ruling. It was his criticism of it: *"I don't like how little history
you gave them. Maud and Sella won't have enough history for them to be rivals
yet."* "Since last autumn" is mine, from `bag.js:75`, `bagTalk.js:97–98` and
`bagRecord.js:22`. The timeline is open.

| Played | She answers | Line |
|---|---|---|
| When · party | When | *withdrawn — waits on the timeline* |
| When · leader | When | **[P]** We set it up last autumn, and I've been the party leader the whole time. · **[P]** I've been the leader the whole time. It was set that way when we formed. |

### The party's history — Phil, 13 October **[P]**

- Five years ago Atrem went missing; that is what drove Sella to become an
  adventurer, to find her brother. She meets Maud at the guild and they
  become friends.
- Three years ago the party formed.
- The Ryles join. Then, a year ago, Maud and Les leave, fearing Sella is
  obsessed with finding her brother.
- This spring Pell joins.

**Applied 13 October** (wording mine, facts his): `bag.js` members, account,
the *party members* belief; `bagTalk.js` members who/contract and
who/validate, account what/expand and what/contract and their words
(`autumn` → `years`); `bagRecord.js` headline; `sellaLife.js` Atrem, four →
five years. Folded into `settled.md` §8 as tentative, 14 October, with four → five. Tests 393 pass, lint clean.

When · party: **[C]** *"We formed three years ago."* **Set 2 accepted, 14 October.**

## Found while checking set 2 — canon disagrees with itself on the timeline

- `bag.js:75`, `bagRecord.js:22`: the account since last autumn; the record
  says **Silver since last autumn**.
- `bagTalk.js:88`, `bag.js:73`: she put the members on "when we started".
- `HERRINGS.pell`, `sellaLife.js:131`: Pell joined in the spring.
- `bagTalk.js` tier what/contract: Silver "went up when the Ryles joined".
- Phil, 12 October: the account was opened before Maud and Les left; Sella
  kept it.

Pell cannot have been put on "when we started" if he joined in the spring,
and the tier cannot have gone up when the Ryles joined if it has been Silver
since the account opened — unless the Ryles were there from the start, in
which case it did not go up.

## Set 3 — put to Phil 14 October

| Played | She answers | Line | Source | Puts in play |
|---|---|---|---|---|
| Where · leader | Who | I've been the leader the whole time. It was set that way when we formed. | Phil, 13 October | — |
| Who · permission | Who | Nobody has ever mentioned permissions to me. | `VOLUNTEER.permission` | permission |
| When · permission | Who | Not that anyone has told me. | `bagTalk` permission what/contract | — |
| Where · permission | Where | The clerk at the guild hall wants a form for everything, and then a second form to say the first one's filled in. | `sellaLife` clerk | clerk, hall |
| Who · before | Who | Nobody. I've never moved anything to anybody before. | `bagTalk` before when/contract, *No* → *Nobody* | — |
| What · before | What | Nothing. There's never been a need. | `bagTalk` before when/expand, *Never* → *Nothing* | — |
| Where · before | When | First time. There's never been a need. | `bagTalk` before when/validate | — |
| Who · since | Who | I've been at it since last night. | Phil, 14 October: option 2 without *Me* | night |
| Where · since | When | Since last night. | `bagTalk` since when/contract | night |
| Who · morning | Who | Pell. He's the one who takes the hits, and I'd rather he had it on him. | `bagTalk` pell who/expand + morning why/expand | Pell |

Set 3 accepted 15 October, with Who · since as above.

15 October: Where · since changed to *Since last night.*; `HERRINGS.since` in `bag.js` changed to *I've been at it since last night.* — it no longer mentions her being tired, which was what pointed at the *try later* remedy.

## Set 4 — put to Phil 15 October

| Played | She answers | Line | Source | Puts in play |
|---|---|---|---|---|
| Where · morning | Where | The passes. We're out at first light. | `HERRINGS.stores` + `bagTalk` morning when/expand; **[C]** that the passes are where they are going is my inference | passes |
| When · members | When | As each of them joined. I put them on myself. | `bagTalk` members who/contract | — |
| Where · members | Who | All of them. Pell and both the Ryles. | `bagTalk` members who/expand | Pell, Ryles |
| Who · item | Who | Nobody has it yet. It's still in the bag. | `bagTalk` item what/expand | bag |
| When · item | When | Right now. It's right there in the bag. | `VOLUNTEER.item` | bag |
| Why · item | Why | Because it won't go. It just sits there. | `bagTalk` working what/expand | — |
| Who · account | Who | The party's. I set it up myself. | `bagTalk` account what/validate + leader who/validate | party |
| Where · account | What | It's the party's account. We set it up three years ago. | `bagTalk` account what/expand | party, years |
| Who · tier | Who | It went up when the Ryles joined. | `bagTalk` tier what/contract | Ryles |
| Where · tier | What | Silver. | `bagTalk` tier what/expand | silver |

15 October, Phil on Where · morning: "That's fine" — the passes stand — and *"We've got a new contract and are out at first light."* is also acceptable **[P]**. Both kept as ways she can say it. The rest of set 4 not yet ruled on.

Set 4 accepted 15 October.

## Set 5 — the last six, put to Phil 15 October

| Played | She answers | Line | Source | Puts in play |
|---|---|---|---|---|
| Who · stores | Who | I do. Keeping the bag stocked is my job. | Phil, 14 October: the leader coordinates and maintains the party's bag | bag |
| When · stores | When | We stocked up for the passes. | `HERRINGS.stores` (also set 1, When · bag) | passes |
| Who · paid | Who | I pay it. Every month, without fail. | `bagTalk` paid when/contract | — |
| Where · paid | What | It's paid every month without fail. | `bagTalk` paid what/expand | — |
| When · ryles | When | A while back. We went up to Silver when they joined. | `bagTalk` tier what/contract; Phil's timeline | silver |
| Where · ryles | Who | The Ryles have never had anything off me either, come to think of it. | `HERRINGS.ryles` | — |

### Set 5 — Phil, 15 October

| Played | Line | |
|---|---|---|
| Who · stores | We all add items to the bag. | **[P]** — replaces mine ("dumb") |
| When · stores | We stocked up for the passes. | kept |
| Who · paid | It's paid each month as part of our dues for the Adventurer's Guild. | **[P]** |
| Where · paid | The guild handles it, when we pay our dues. | **[P]** |
| When · ryles | Silver, I think. Pretty sure it went up when the Ryles joined. | **[P]** |
| Where · ryles | *open — mine read poorly* | |

**[P] facts from these:** every member adds items to the party's bag; the
party pays TLC each month as part of its Adventurer's Guild dues, and the
guild handles the payment.

**Conflict found:** Sella pays Atrem's guild dues *every year*
(`settled.md` Tragedies, `sellaLife.js`), and the party's are paid *each
month*.

**Dues — Phil, 15 October, resolving the conflict above:** Sella pays
Atrem's dues each year and her own each month. An active adventurer pays
monthly, and the guild takes a percentage of the spoils from completed
contracts; an inactive one is charged a flat rate. *(Given as questions;
recorded as his reasoning, not yet in the record.)*

Where · ryles: three more of mine rejected ("very much NOT"). Proposed
instead, her existing line unchanged: *"They do as they're told and never ask
for anything."* (`bagTalk` ryles who/expand), answering with Who.

**Phil, 15 October:** "Why is this not focusing on the Where portion and
switching to the WHO?" — I switched card because I had no fact for where the
Ryles are, rather than asking. **[P]** Only Pell is going. The Ryles are
recovering from injuries.

Where · ryles, proposed: **[C]** *"They're staying behind. They're both still
recovering from injuries, so it's only Pell going."*

**Open:** whether Sella goes. Lines that say *we're out at first light*:
`bag.js:72`, `bagTalk.js:79`, `bagTalk.js:132`, set 2 Where · Pell, set 4
Where · morning (Phil's alternative also says *we*).

**Phil, 15 October:** *we* can encompass Sella and Pell. So the five
*we're out at first light* lines stand unchanged; Sella and Pell go, the Ryles
stay behind.

Where · ryles, revised: **[C]** *"They're staying behind. They're both still
recovering from injuries, so it's just Pell and me going."*

## Audit of every accepted line against Phil's facts — 15 October

Each line in sets 1–5, and the existing lines they were copied from, checked
against what Phil has said and the record. Most hold. Found:

**Contradicts Phil — fixed here:**
- When · leader, his line *"We set it up last autumn, and I've been the party
  leader the whole time."* — written before his timeline. Now *"We set it up
  three years ago, and I've been the party leader the whole time."*

**Mine, never his, and nothing behind them — to ask:**
1. *"There's never been a need"* (`bag.js:70`, `bagTalk.js:70,72`; set 3
   What · before, Where · before). Three years as leader of a party of
   four, with members who have their own bags, and she has never once
   given anyone anything from the party's bag.
2. *"I set the whole thing up myself"* (`bag.js:68`, `bagTalk.js:60,62,400`;
   set 1 Who · working, set 4 Who · account). Phil's own lines say *we set it
   up*. Her baggage `set-it-up-herself` (`bag.js` BAGGAGE) is built on it.
3. *"Everything we carry is in it"* (`bagTalk.js:25`; set 1 Why · bag) — and
   in the record, Biscuit the mule *"carries what the bag does not"*
   (`settled.md:1808`, [C·ok]). Phil: the party's bag contains all items,
   and every member has their own bag.

### Phil's answers to the audit — 15 October

1. **[P]** *Could Sella have accidentally switched the settings on her party's
   bag, so now no one else can access the items within it? Could Sella have
   not noticed a TLC change that meant her party could no longer access the
   party's bag to extract contents?* — Given as questions. **Not acted on**;
   these would be new causes for the call.
2. **[P]** Sella may have requested the account be set up; TLC sets it up upon
   request and approval. **Applied** (wording mine): `bag.js` leader answer,
   party fragment, baggage `set-it-up-herself` line (id kept); `bagTalk.js`
   leader who/expand and who/validate, `VOLUNTEER.leader`, the permissions
   remedy reply. Set 1 Who · working → *"Just me. It's the party's account,
   and I'm the leader."* Set 4 Who · account → *"The party's. I asked for it
   to be set up."* Phil's own *we set it up* lines left as his.
3. **[P]** Biscuit stays; not everything is stored in the bag. **Applied:**
   `bagTalk.js` bag what/expand and set 1 Why · bag → *"It's the party's bag.
   Most of what we carry is in it."*
