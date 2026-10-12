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
