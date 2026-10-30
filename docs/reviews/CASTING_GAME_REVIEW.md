# Casting gameplay review — partial, returned for correction

October 30, 2026. Independent agent review, not a human designer's signoff.
The reviewer reported these blockers before hitting a usage limit:

1. Main-game automatic casting was behind an absent rollout flag, so workshop
   tests did not cover the player's ordinary route.
2. Seven manual spell/category controls survived. Nature's legacy healing spell
   and the board-conversion spell could be confused; merely enabling auto mode
   would not make that distinction clear.
3. Weaving introduced its own mastery cap, initially level 1, without explaining
   why trained source spells could not use their higher strengths. Requiring an
   initial save before exposing upgrades made the restriction harder to discover.

The review did not finish and did not approve the implementation. The reviewer's
usage limit also prevents claiming a completed gameplay re-review. The root
agent is implementing the reported corrections and recording test evidence;
that work is not a substitute for this missing independent verdict.

## Re-review in progress · corrected seventh-primary interpretation

The first review inherited the prior implementation's mistaken “six automatic,
manual seventh” premise. On re-reading the explicit user history, that premise
is withdrawn. The user approved standard autocasting while keeping **Arcane
combos** manual, then objected that the opponent-targeted seventh school had been
eliminated into Weaving. Their current “standard spell out of the seven” is
consistent with seven primary auto schools. This is a correction to the review,
not a new mechanic invented to resolve an open product decision.

The reviewed correction now enables board/automatic combat in the production App
for new and old flag-less saves, provides read-only standard cards with explicit
rank/reach/mana and priority, preserves manual legacy support actions, promotes
Nature conversion in mentor offers, and explains custom mastery before equip.
Those changes address G1, G3, G4 and the legibility part of G5 in code. G2 remains
open until seventh-primary Arcane is included in automatic selection/execution.

Independent runtime execution of the production smoke exposed a harness issue:
Vite's `main.ts?t=...` entry bypassed the exact interception pattern. A temporary
query-aware copy starts the production App. Its next staged-line assertion did
not observe a cast; immediate state was ongoing with 1 line, **4 fire mana**,
Fire Lv2 costing 8, and enemy HP 36. This is evidence of a mana-insufficient
fixture, not evidence that the game should cast without mana. Production runtime
acceptance is still pending a corrected earned-mana fixture and seven-primary
implementation. No pass is claimed from this failed smoke run.

G7's per-stage cost contributions and named short pools are still a clarity
follow-up; the existing combined-cost computation is structurally sound. The
final re-review will distinguish tested fixes, pending blockers and human
acceptance rather than presenting a blanket design signoff.

## Re-review 2 · scoped final disposition

**No remaining blocker found in the reviewed production combat casting and
custom-spell preview surfaces.** This is an independent implementation/design
review with targeted runtime evidence. It is not author playtest acceptance,
whole-campaign approval, or proof of every possible progression/board history.

I independently inspected the corrected code and ran:

- `tools/main-casting-smoke.mjs` against the actual production App at 360×640
  touch, 390×844 touch, and 1100×900 desktop. Final run passed, including an
  earned-violet-line rank-2 primary Arcane cast, actual mana payment, visible
  learned levels and read-only standard cards. Evidence from this independent
  run is `/tmp/game-design-approved-scope/report.json` and its screenshots.
- `tests/autoCasting.test.ts` and `tests/weaving.test.ts`: 75 tests passed in
  `/tmp/game-design-approved-tests.log`. The four primary Arcane ranks verify
  opponent damage, healing, actual cost, no extra manual-gauge tax, unchanged
  board, and no invented board-row metadata. Insufficient mana and usefulness
  at full player HP are also checked.

### Disposition of the initial findings

| Finding                            | Re-review disposition                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1 · Production policy             | Corrected. Normal combat enables board/automatic rules for new and loaded flag-less saves; lessons retain teaching controls.                                                                                                                                 |
| G2 · False manual affordances      | Corrected for combat. All seven primaries participate in automatic priority/selection. Standard cards are read-only; advanced opponent techniques, support spells, and custom Weaving remain explicit manual actions.                                        |
| G3 · Nature identity/access        | Conversion is available and prioritized in live mentor offers; owned healing remains separately manual. Teaching-description caveat below remains open.                                                                                                      |
| G4 · Hidden learned rank           | Corrected in combat. Stable school names, explicit Lv, reach, held mana/cost, readiness, and current/last caster are shown. Arcane identifies the opponent instead of fictional rows.                                                                        |
| G5 · Invisible custom mastery gate | Corrected in the reviewed editor. Source learned levels and custom mastery cap are explained, and paid strength unlock is offered before equip. This does not imply independent approval of every balance number.                                            |
| G6 · Custom order/equipment        | Corrected in the reviewed surfaces. Equipped recipe shows ordered names/strengths and real cost; preview has Before/After 1/After 2 with touch phase tabs, stage targeting and visible cast/cancel actions. Model tests distinguish order-sensitive results. |
| G7 · Cost/shortage clarity         | Corrected in casting preview. Per-stage contributions, combined cost and the named short pools/amounts are shown; model preserves atomic payment/refusal.                                                                                                    |
| G8 · Overstated component coverage | Corrected in evidence scope. The production App path now has targeted runtime coverage. Component enumerations remain explicitly component evidence.                                                                                                         |

The first final-runtime attempt exposed an unusable equipped recipe after the
fixture replaced its learned book with Arcane alone. The fixture now clears that
recipe, and production rendering defensively checks recipe eligibility before
calculating cost, so a missing-source recipe does not crash the combat panel.
The earlier character `autoSpell.rows` metadata issue was also corrected to an
explicit empty list and given a four-rank regression assertion. The final run
passed after those corrections; earlier failed runs are not counted as passes.

### Bounded follow-ups outside this combat-surface verdict

1. **First-spell teaching/menu descriptions remain on the legacy effect model.**
   `src/ui/screens/conversation.ts:lessonButton` still calls legacy `castSummary`
   and `spellMeta`. For example, Nature conversion's synthetic `clearRows` data
   can describe a zero-damage row clear instead of obstruction conversion, and
   Fire can describe direct damage instead of burning its board span. These
   descriptions should share the new school/rank/board-intent model before the
   entire onboarding/teaching flow is called reviewed and accepted.
2. **Legacy enhancement descriptions need a board-magic progression audit.**
   Board-cast Power/Effect bonuses feed line-clear damage/surges through
   `CombatChallenge.onBoardClear`. They do not automatically create a direct
   attack when a spell merely changes cells. In particular Fire burns ordinary
   cells without completing rows itself. Do not promise the old direct-damage
   bonus in upgrade copy where it has no such effect. Changing enhancement rules
   is a separate progression/balance change and must not be silently invented
   as a casting UI fix.
3. **Human judgement and wider playthroughs remain distinct.** The reviewed
   runtime checks stage reproducible earned-line encounters and owned recipes;
   they are not human novice comprehension tests or exhaustive campaign
   playthroughs. The author still decides whether the resulting interaction is
   clear and enjoyable in story context.

These follow-ups are disclosed rather than hidden behind a generic “experts
approved” claim. The actual automatic trigger, seventh opponent-targeted primary,
manual advanced/custom distinction, and reviewed custom preview have received
correction and independent re-review.

## Teaching-copy follow-up re-review

The shared `ui/standardSpellText.ts` now supplies the actual school effect model
in lesson offers, the spellbook and skills: explicit school/Lv; Fire's burned row
span; Nature's obstruction conversions and blank/no-mana result; other board
reach tables; and base opponent damage/drain for primary Arcane. The menu now
shows the actual cost icons without reintroducing a legacy effect-kind icon.

The skills screen no longer promises direct Fire damage or extra burned rows
from Power/Effect. It explicitly identifies those purchases as next-level
training, while explaining row-attack/clear-surge bonuses for board casts which
can complete rows. Efficiency still displays the actual enhanced cost. This is
an accurate description of the current mechanics; it does not invent a new Fire
combat bonus or change paid progression.

I independently ran `tests/castingPresentation.test.ts`: **4 tests passed** in
`/tmp/game-design-teaching-copy-tests.log`. Code inspection confirms the new
shared descriptions are used by the three requested surfaces. The original
legacy-description and false-enhancement-copy follow-ups are therefore resolved
within this bounded scope.

One wording precision was sent back: lesson offers build a new, unenhanced
record at the taught level, so their displayed costs are **base costs**. They
must be labelled as such, or calculated from the player's retained enhancements,
rather than implying they are that player's exact projected payment. The menu
and skills use the actual known record and do not have this issue.

Whether Fire's training purchases should also grant a separate immediate benefit
is a substantive progression/balance preference, not a remaining claim of
incorrect execution or dishonest enhancement copy. Human novice comprehension,
full campaign play and final enjoyment remain outside this independent review.

### Base-cost wording correction verified

The standard lesson-offer branch now displays **Base cost:** directly before its
cost icons. I inspected the applied correction in
`src/ui/screens/conversation.ts`; the sent-back wording item is closed. It is a
text-only clarification of the existing unenhanced offer record, with no change
to payment, progression, damage or learned rank. There is no remaining mechanical
or teaching-copy blocker in the reviewed scope. The separate Fire training
balance preference and human/campaign acceptance distinctions above still apply.
