# PLAN.md — implementation backlog

Phased and dependency-ordered. Each phase can be handed to a Claude
Code session on its own — read `CLAUDE.md` first, then this file,
then the linked `LORE.md` section(s) for the phase you're doing.

**Do not skip ahead of a phase's stated dependency.** Phases 6 and 7
specifically depend on Phase 1 existing in code, not just in lore.

**Do not add a new phase to this backlog until the current one is
built, tested, and played** — not just designed. Extending an
existing phase, or adding a short Open Questions note in `LORE.md`
without full design elaboration, is fine at any time. Adding a fully-
designed, fully-unbuilt system on top of another fully-designed,
fully-unbuilt system is the one thing worth actively refusing to do.

---

## Phase 0 — Ticket Resolution: Investigation Phase (proof-of-concept) — BUILT
**Depends on**: nothing. Was done before Phase 1, correctly — see
`LORE.md`, "Ticket Resolution — Investigation Phase," for the full
diagnosis and design.
**LORE.md**: "Ticket Resolution — Investigation Phase"

Replaced the old single-step flow (a `blurb` that already stated the
diagnosis, then one pick from four universal, content-free quality
buttons — a player could win every ticket by clicking the same option
forever) with the four-step structure, **for "Phantom Inventory"
only, as a proof-of-concept**: opening statement (no diagnosis given)
→ investigation (a menu of costed actions, each revealing one clue) →
diagnosis (ticket-specific, correctness grounded in what was actually
uncovered) → status (unchanged).

**Decisions actually made, not just specified in `LORE.md`:**
- Diagnosis-correctness maps onto `quality` by a simple rule:
  correct diagnosis + the one key clue investigated → `correct`;
  correct diagnosis without it → `adequate` (a right-but-ungrounded
  guess); wrong diagnosis with zero investigation → `dismissive`;
  wrong diagnosis with at least one action taken → `rushed`.
- Phantom Inventory got 4 investigation actions (manifest check,
  delivery log, stockroom access, recent bulk activity — the last one
  is the key clue) and 4 diagnosis options (1 correct, 3 wrong).
- It does carry one genuinely misleading clue (stockroom access,
  which reads as plausible but isn't the actual cause) — chosen
  deliberately as an example of the "some tickets, not all" rule, not
  because every ticket needs one.

**Built**: `resolveInvestigation()` and `investigationTimeCost()` in
`gameLogic.js`, `TICKET_TEMPLATES.partner`'s Phantom Inventory entry
now carries a full `investigation` block, `generateShift()` copies it
onto generated tickets, and the JSX prototype has a real investigation
UI (investigate, then diagnose, then the existing status-choice step
unchanged — no duplicated status-rendering code between the
investigation and non-investigation ticket paths).

**Tests**: 10 new tests, 42 total, all passing. Includes the exact
test this phase existed to produce — `resolveInvestigation: this is
exactly the case the old model could not distinguish` — which asserts
an under-investigated and a fully-investigated attempt at the same
ticket produce different outcomes (`adequate` vs `correct`). That's
the test that would have caught the original design's core flaw, and
it now has a permanent place in the suite.

**Verified beyond unit tests**: a full headless-browser click-through
of the actual running JSX (mount → Clock in → find a Phantom
Inventory ticket → investigate the key clue → diagnose correctly →
confirm it advances to status choice). Genuinely played, not just
compiled.

**One real, unresolved finding from that verification** (logged in
`LORE.md`'s Open Questions, not silently fixed or hidden): diagnosis
options are visible immediately alongside the investigation actions,
not gated behind them, and the correct option's own label ("the
festival sale wasn't logged") leaks enough that a player could blind-
guess it without investigating anything. Blunted, not solved — a
correct blind guess caps at `adequate`, never `correct` (this is
tested and confirmed), but the wording itself still carries more
information than it probably should. Left as an open decision:
vaguer diagnosis wording, gating diagnosis options behind at least one
investigation action, or accepting the current tradeoff as reasonable
for how small Phase 0 is scoped.

---

## Phase 1 — Character Disposition Model — BUILT
**Depends on**: nothing. Do this first — the most other things wait
on it.
**LORE.md**: "Character Disposition Model — Baggage, Sensitivity,
Social Filter"

> **BUILT.** Disposition is a four-quantity vector; Baggage is per-axis
> with `you` always starting at zero for a stranger; Sensitivity and
> Social Filter are scalar; wrinkles bias the draw without deciding it.
> `applyDisposition()` returns internal feeling AND visible reaction
> separately, so a player cannot read the truth off the presentation.
> 62 tests. `guardednessOf()` — the manner-of-disclosure hook — is now
> live rather than inert.
>
> **Values chosen, not specified in lore** (flagged in code, meant to be
> tuned): Baggage ±35 triangular, Sensitivity 0.55–1.45, Social Filter
> 0.35–1.0, and the correctness weighting tlc 1.0 / you 0.6 /
> experience 0.3.
>
> **Original re-scope note, kept for context — the target changed.** This phase was
> written against a single `disposition` integer. `LORE.md` now locks
> **disposition as a four-quantity vector** — You, TLC, The Experience
> (all feelings), plus Understanding (not a feeling) — see "Character
> Disposition Model," *Disposition is a vector, not a number*. Two
> concrete revisions to everything written below:
> - **Baggage becomes per-axis**, not one offset. A stranger can arrive
>   already hostile to TLC while holding no opinion of the agent at all.
>   Baggage on **You** starts near zero for a first-time caller and
>   carries over only for returning ones.
> - **Sensitivity and Social Filter stay scalar** — one lid and one
>   valve per person, applied to whatever is moving.
>
> The "Hard constraint from lore" below (archetype is never a formula
> input) is unchanged and still binding. The wrinkle-bias test is
> unchanged. The pipeline-math test now needs to run per-axis.
>
> Also note `dispositionTag()` maps one number to a five-value tag and
> has no vector equivalent yet — that is an open question in `LORE.md`,
> not something to invent while building this.

Replace the current flat model (every customer starts at disposition
0, every response quality applies the same delta to everyone) with
three independent per-customer traits: **Baggage** (starting
disposition offset), **Sensitivity** (multiplier on how much a raw
response-quality delta registers), **Social Filter** (dampener applied
after Sensitivity, governing how much of that registers *visibly*).
Pipeline: raw delta → × Sensitivity → dampened by Social Filter →
applied to disposition.

**Hard constraint from lore**: archetype must never be a formula
input for any of the three traits — they're individually rolled per
customer. Contextual "wrinkles" (COG affiliation, pre/post-adventure
state) may *bias* the random draw, but the bias must be tied to a
specific situational fact about that customer instance, not to their
archetype category. Don't build an archetype→trait lookup table; that
directly violates the design.

**Needs a decision, not just implementation**: actual numeric ranges
and distribution shapes for all three traits aren't specified in
`LORE.md` — that's an open implementation choice. Pick something
reasonable (e.g., Baggage as a signed offset within the existing
-100..100 disposition range, Sensitivity as a multiplier centered on
1.0, Social Filter as a 0..1 dampening factor), document the choice in
code comments, and flag it in your summary as a value you chose rather
than one that was specified.

**Touches**: `buildCustomerPool()` (roll the three traits per new
customer), `resolveTicket()` (route the delta through the new
pipeline instead of applying it directly).

**Tests**: distribution sanity (traits vary across many generated
customers, aren't archetype-correlated), pipeline math (a known raw
delta + known Sensitivity + known Social Filter produces the expected
final disposition change), and a wrinkle-bias test (a COG-affiliated
customer's Baggage distribution is measurably skewed vs. a non-COG
customer's, across many seeded rolls, without being deterministic).

---

## Phase 2 — Classification-Dispute Tickets ("Pigs is Pigs")
**Depends on**: nothing — independent of Phase 1.
**LORE.md**: "Screening & Classification (\"Pigs is Pigs\")"

> **Premise changed — re-scope before starting.** Classification is no
> longer a special ticket type's private axis. It is now **Classify**,
> one of the five non-linear phases on *every* call (see `LORE.md`,
> "Ticket Resolution — Investigation Phase," five-phase structure,
> preferred by Phil over the old four-step version). That makes this
> phase smaller and sharper than written below: the universal
> classify-and-revise mechanic belongs to the core loop, and what's
> left here is **tickets whose correct classification is genuinely
> ambiguous** — the Fire Drake, the pet mimic — where reasonable
> classifications disagree and the disagreement is the content. Read
> the rest of this phase with that narrowing in mind; the `resolveTicket()`
> touchpoint below is likely wrong now, since classification will live
> in the call flow rather than on the outcome object.

New ticket category: rigid, literal classification produces a genuine
dispute (a Fire Drake as Livestock/Transportation/Hazardous Cargo; a
pet mimic misclassified, or invisibly unclassified because it's
mimicking something mundane). Maps onto the existing
resolved/hold/transfer mechanic: `resolved` = agent rules on the
classification themselves; `hold` = kicked up for manual review;
`transfer` = punted to whoever owns tariff schedules.

**Touches**: `TICKET_TEMPLATES` (new category entries with multi-way
ambiguous classification options), `resolveTicket()` (may need a new
`classification` field on the outcome distinct from `quality`/
`status`, since "which classification did the agent pick" is a new
axis this ticket type introduces that others don't have).

**Tests**: at least one test per classification ambiguity example
from lore (Fire Drake, pet mimic — both the plain-misclassification
case and the invisible-mimic case), and a test confirming this ticket
type still produces valid `resolved`/`hold`/`transfer` outcomes like
any other.

---

## Phase 3 — Partnership & Onboarding Inquiries
**Depends on**: nothing — independent.
**LORE.md**: "Partnership & Onboarding Inquiries"

New ticket type with a fundamentally different shape: the agent has
**zero sway over the outcome**. `quality` still applies (how well the
process is explained), but `resolved` — not `transfer` — is the
normal correct status, since there's no phone infrastructure
connecting the call center to POST (Partner Operations Selection
Team) to transfer a call *to*. Submitting a request to POST on the
caller's behalf is itself the resolution.

**Touches**: likely a new ticket template category with no
`customerId` requiring existing history (these are non-customers,
prospective ones), and resolution logic that doesn't roll a dispute-
reopen risk the way a normal `resolved` ticket does — there's no
"outcome" for the customer to dispute yet, since POST hasn't decided
anything.

**Tests**: confirm this ticket type never produces a `followUp` of
kind `reopen-risk` regardless of quality (since there's nothing to
dispute), and confirm `hold` is available for "no update yet, check
back" style follow-ups.

---

## Phase 4 — Priority Relay & Caravan (code the locked tiers)
**Depends on**: nothing — independent, but touches `generateShift()`
significantly.
**LORE.md**: "Logistics & Shipping Tiers"

Five tiers are locked in lore; only POOF-equivalent (direct hop) and
the existing two-leg hop+courier exist in any form in code today.
Add:
- **Priority Relay** — three legs (courier → hub-to-hub hop →
  courier), for routes where neither end is near a major node.
  Genuinely distinct from the existing two-leg tier, not a rename.
- **Caravan** — bulk/freight tier for large regular orders, cost-
  optimized per shipment (ley vs. physical vs. mixed, physical usually
  cheaper). Best suited to Business-tier bulk orders.

**Explicitly out of scope for this phase**: Wildline routing is *not*
locked yet (still an Open Question — needs a decision on what
in-game event represents "the Research division's breakthrough"
before it's implementable) and should not be built here.

**Touches**: ticket generation logic needs a way to tag which tier a
given ticket "shipped via," if that's going to matter for flavor text
or future Caravan-specific ticket categories.

**Tests**: each tier's leg-count/shape is distinguishable in generated
output; Caravan's cost-optimization logic (even a simple version)
picks differently across seeded runs rather than always defaulting to
one method.

---

## Phase 5 — Figurehead Standing-Policy Layer
**Depends on**: nothing structurally, but Phase 7 (Meetings) needs
this to exist for its Figurehead-triggered Coaching register to have
anything to deliver.
**LORE.md**: "Leadership & Governance" (Figurehead policy consequences
section)

A persistent policy layer, distinct from ephemeral `SHIFT_MODIFIERS`
(which reset every shift) — persists across many shifts until the
next Conclave. Concrete levers from lore: coaching frequency, pace
pressure (time-cost multiplier), mandatory training, procedure
updates, specialist/generalist assignment.

**Touches**: needs a new persistent state object (parallel to
`reputation`/`commendations` in the prototype) representing "current
administration's policy," and a way for `generateShift()` or
`resolveTicket()` to read from it the way they currently read from
per-shift modifiers.

**Tests**: policy persists correctly across multiple `generateShift()`
calls without needing to be re-specified each time; a policy change
actually measurably affects at least one of the levers named above
(e.g., pace pressure detectably changes `timeCost` outcomes).

---

## Phase 6 — Multi-Angle Recurring Characters
**Depends on**: Phase 1 (Character Disposition Model) must exist in
code first. Do not build this independently of it.
**LORE.md**: "Multi-Angle Recurring Characters"

When a ticket names a specific other person, that person becomes a
real customer entity — own `id`/`tier`/`archetype`, own independently-
rolled Baggage/Sensitivity/Social Filter, tagged with which incident
and which other customer connects them. Symmetric (either party can
be the one whose ticket generates first). Two distortion types:
adversarial (opposing self-interest, both truthful-to-themselves) and
proxy (a third party advocating on someone else's behalf, no motive
to distort, but still secondhand). Scheduling rides the same shape as
`pendingFollowUps`.

**Touches**: `resolveTicket()` or a new function to detect/seed a
named-character link; `endShift()`'s `pendingFollowUps` generation
extended to include "linked customer surfaces later" entries;
`generateShift()`'s follow-up-folding logic extended to handle this
new follow-up kind alongside `hold`/`reopen`.

**Tests**: a linked customer, once seeded, actually appears in a
future shift with their own independently-rolled traits (not
inherited from the customer who named them); symmetry (seed from
either side, confirm both directions work); a case where the two
linked customers' accounts of the same incident genuinely diverge
because of different rolled traits, not randomly.

---

## Phase 7 — Meetings with Supervisors & Coworkers
**Depends on**: Phase 1 (supervisor/coworker disposition reuse) and
Phase 5 (Figurehead policy layer, for the Figurehead-triggered
Coaching register to have something real to deliver). Feedback and
"Just to chat" registers could technically ship without Phase 5, but
Coaching's most interesting trigger can't.
**LORE.md**: "Meetings with Supervisors & Coworkers"

Three registers: Feedback (Supervisor, cites shift-summary specifics
or a vague tone depending on the supervisor's own disposition toward
the player), Coaching (Supervisor, either rough-patch-triggered or
guaranteed on a new Figurehead taking office), "Just to chat"
(Coworker, no mechanical effect, delivers the folk-wisdom principles
from Customer Service Philosophy). Draws from the existing
`DECOY_AGENT_NAMES` roster (Cassidy, Thistle, Bram, Pell, Wren), now
with assigned Supervisor/Coworker roles.

**Touches**: new `rollBreakRoomEncounter(lastShiftSummary,
figureheadJustChanged, rng)` function, called from the lobby phase in
the prototype; supervisors/coworkers need their own disposition state
tracked the same way customers do (reuses Phase 1's model).

**Tests**: routine encounters are probabilistic (null most of the
time across many seeded rolls); rough-patch Coaching fires reliably
when its trigger conditions are met; Figurehead-triggered Coaching is
guaranteed (100% across seeded rolls) on the first roll after a
Figurehead change flag is set; the same official Coaching content
produces different flavor depending on the delivering supervisor's
own rolled disposition traits.

---

## Phase 8 — Smaller items (any order, all independent)

- **Network-growth instability** (`LORE.md`: "Ley Lines") —
  location-specific, multi-shift volume spike for newly-connected
  towns/outposts. Distinct from `SHIFT_MODIFIERS`; needs its own
  persistent, location-keyed state.
- **Organizational-account memory asymmetry** (`LORE.md`: "The
  Coalition of Guilds," the "high-volume direct customers" section) —
  `recallMemory()` doesn't currently distinguish individual customers
  from organizational ones (Business tier, COG). The caller may not
  know their own account's history even though company records do;
  needs a way to represent "agent knows more than the caller does."

---

## Explicitly not ready for a phase yet

- **Wildline routing** and the associated **cargo-transformation
  content** (Small Potion → Large Potion, etc.) — both fully
  described in `LORE.md`, but blocked on an undecided question: what
  in-game event or condition represents "the Research division's
  breakthrough" that unlocks this tier? Don't implement until that's
  decided — see `LORE.md` Open Questions.
- **Who administers Realm law day-to-day** — pure lore question, not
  blocking any code yet, but may eventually inform a ticket flavor
  (a "Realm proclamation" affecting screening rules). No phase until
  the lore question itself is resolved.
