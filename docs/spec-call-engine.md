# Spec — the call engine (proposal, awaiting approval)

Every requirement below cites `docs/settled.md` by line and tag.
**[P]** and **[C·ok]** are binding. **[C]** is not, and is marked where used.
Nothing here is settled by being written here.

## 0. The slice boundary

**In the build now:** one call, played to one of the three outcomes, the sheet
written, a later call reading it — and the repetition check, because
repetition is how a call goes wrong in the loop this slice exists to validate.

**Mapped, not built:** §6's five traits and the six-step landing chain,
visibility, debuffs, auras, and all three upgrade categories. These are
recorded here so the shape is known, not as a work order. Anything below
marked *mapped* is out of scope until the slice stands up.

## 1. Scope

One call with one customer, played to its outcome, with the sheet written
back and a later call able to read it.

**Fixed for this scenario** — Sella Brandt, End Customer, an individual
(:1107, [P]), **tier not stated in the record — needs deciding**, flask beside her bed, refilled every night until last
night (:2005, [P]). Her **Request** is *why didn't it refill?*; her **Need** is *a
healing draught tonight* (:839, [P]).

## 2. Causes

Four, and no others (:2020, [P]): stopper left out overnight · interference
from another enchanted item nearby · drank it in the night thinking it was
her water · did something she didn't think mattered.

**Ruled out for this call** (:2023, [P]): the other-drinker and Minion causes
— the flask is by her bed. Also rejected: somewhere the refill couldn't
reach; the supply running short.

**A cause is not always THE cause** (Phil, this session). More than one
candidate can surface. The player acts and the world answers; there is no
diagnosis step and nothing grades a label (`src/supportCall.js` header).
A fix applied to the wrong candidate is discovered afterwards (Phil, this
session). **Mine, unconfirmed:** that the discovery can land on a later call.

## 3. Turns

**Nine plays** (:621, [P]). Asking the customer something, asking a coworker
for help, or looking something up each uses one. Turn one is the opening and
the universal question.

An inquiry drives toward progress: **transfer, hold, or resolve** (:627,
[C·ok]).

**A play is anything that can be wrong.** Asking her something, asking a
coworker, and looking something up are named at :621 [P], but the list is what
a trainee spends a turn on at a table, not the limit. **Fix and Offer each
cost a play**: a fix is applied to a *candidate*, an offer is what the agent
thinks will serve her, and both can be wrong (Phil, this session). Free fixes
would let a player shotgun every candidate at no cost, which is diagnosis by
menu — the thing the design refuses. **Unsettled, and mine:** whether paraphrase and automatic responses cost a
play. The record says progress *is not a separate scored step* (:885, [P]) and
that telling fits inside continuation (:880, [P]); it does not say either is
free.

**Repetition** (:746, [P]): a last-three-turns check applies to both the
**door** and the **subject**. A third check of the same thing is dangerous
for anyone. A new apprentice is **softly** limited — repeating a door works
noticeably worse, it is not forbidden (:752, [P]).

## 4. Outcomes — finite

- **Resolve.**
- **Hold** — with its six requirements, all of which stay (:925, [P]): a
  reason · the caller can say no · a cost that depends on the moment · a way
  of asking, where Finesse goes · coming back · wear when repeated.
- **Transfer** — to a different department (:917, [P]); a wrong-department
  ending is *valid*, not a failure (:1186, [C]).
- **Escalation** is a door out of the loop that **either side can reach for**
  (:1392, [P]). The apprentice does not know who picks up (:1396, [P]). **If
  nobody is available it becomes a callback, logged in the case** (:1413,
  [P]).

A call that cannot be answered today becomes a case. The record does not call
a case an outcome: card play is the first half of the player's work, the Mad
Libs case template the second (:1279, [P]).

## 5. Doors, cards and what may be dealt

**Doors: Validate and Expand** (:843, [P] via [C·ok]; :914, [P]), plus
**Contract** and **Random** as turn choices (Phil, this session). Contract
goes up a record to its parent; Expand goes outward and down.

**What is playable comes from what has happened, never from the outcome
wanted** (Phil, this session). Card types and the event that creates each:

**The card names below are mine.** The principle — what is playable comes from
what has happened, never from the outcome wanted — is Phil's, this session.
None of these names appear in the record.

| Card | Exists because |
|---|---|
| Word card | she said it, the record showed it, or a coworker named it |
| Identifier | something in the call produced that *type* of number |
| Hold | always available; refusable; wears |
| Fix | a candidate cause surfaced |
| Offer | entitlement was read off the record |
| Transfer | something out of scope appeared, or she asked for someone else |
| *(Verify / Validate — struck)* | not card types. A search aimed at the other store: the agent retrieves from the record, she retrieves from herself. What differs is who searches, and therefore how it fails — a wrong record on one side, a confident wrong memory on the other (Phil, this session) |

Search results give the agent: **Billing, Account History, Order History,
Subscriptions, Minions** (authorized users) (:872, [P]). Registration is an
irrelevant detail — required before an account could exist (:875, [P]).

Cards are single words, not phrases (Phil, this session). A key word whose
meaning is already carried by another is not dealt.

## 6. The customer — *mapped, not built*

*Everything in this section is the target model, out of scope for the slice.*

**Traits, rolled per customer, each with a written meaning at low, middle and
high over a continuous value** (:1115, [P]) — tolerance for repetition ·
empathy · pattern sensitivity · tolerance for non-positive outcomes · depth
or breadth. All change at their own rates, and tolerance for repetition can
wear down inside a single bad call (:1112, [P]).

**The chain from a card played to the sheet changing** (:1153, [C·ok]), which
the engine must implement in order:

1. the move — door, target, card, upgrades
2. the customer's filters — what they want now, certainty, the
   repetition/pattern check over the last three turns, resistance to this
   kind of card, empathy
3. the landing — **critical, lands, flat, or misfire**
4. what they show — **visibility** decides how much the player perceives
5. what it leaves — reaction, debuff, aura, and what the next move can build
   on
6. what gets written — if felt, to whichever registers it was about

**A mishandled customer is a worse source**: they stop volunteering, answers
shorten, details drop out — recoverable within the call (:735, [P·from DSC]).

**The asymmetry** (:1168, [P]): the player has the CRM, the customer has only
themselves.

## 7. What must not happen

- No fourth outcome beside resolve, hold and transfer.
- No scored diagnosis step.
- No card generated from the outcome the agent wants.
- No cause outside the four, and none of those ruled out for this scenario.
- No trait collapsed to a single mood scalar: a trait's ends mean different
  things, not more or less of the same (:1174, [P]).
- No total or aggregate score across perspectives.

## 8. Acceptance criteria

1. Every outcome produced traces to §4 above.
2. A fix can be applied to a wrong candidate, and the error surfaces later.
3. Every card in hand traces to a generating event.
4. The five traits exist with low/middle/high meanings and their own rates.
5. The landing has four states and visibility gates what the player sees.
6. The last-three-turns check is applied to door and subject.
7. Skill separates outcomes across the competence range, reported as a curve.
8. A re-run of the contradiction audit finds nothing in class CONTRADICTS-P.

## 9. Questions I had, answered by the record

1. **Does playing the Fix cost a turn? Yes**, and my first reading said no.
   A cause is not always THE cause, so a fix is applied to a candidate and can
   be wrong; if it were free a player would play every candidate's fix in
   turn. A cause surfaced on turn nine therefore cannot be acted on, and that
   is the cost of finding it late.
2. **Does the Offer cost a turn? Yes**, for the same reason — an offer is not
   always THE offer in the customer's mind.
3. **Does explaining the cause without arranging a draught resolve her
   call?** It resolves her **Request** and not her **Need** (:830, [P]).
   The record already names this as the mechanism behind *a correct, fast,
   complete call that still leaves someone unsatisfied* (:846, [C·ok]). So it
   is a resolve, and the dissatisfaction shows on her sheet rather than in
   the outcome.
