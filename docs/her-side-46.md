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
| Where · since | When | I've been at this since last night. | baggage line, first half | night |
| Who · morning | Who | Pell. He's the one who takes the hits, and I'd rather he had it on him. | `bagTalk` pell who/expand + morning why/expand | Pell |

Set 3 accepted 15 October, with Who · since as above.
