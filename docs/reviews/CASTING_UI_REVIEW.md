# Independent casting UI/UX review

Reviewer role: game UI/UX. Review initiated October 30, 2026, after the author's
report that automatic casting still requires clicking seven spell groups and
neither rank nor custom Weaving is understandable. This is a critical design
review, not player acceptance or an independent human playtest.

## Initial verdict: return for correction

The latest component and workshop tests are insufficient to establish that the
main game's interaction matches the intended design. The main game and workshop
currently expose different casting models. Do not present this version as a
reviewed, coherent player experience.

## Must fix

1. **Main-game behavior differs from the advertised interaction.** In
   `src/ui/app.ts:startBattle`, automatic board spells require a flag which new
   games do not receive. `HeroPanel` otherwise renders seven manual category
   buttons. A player following ordinary main-game navigation sees the old manual
   experience. Acceptance must launch the main app, enter real combat, earn a
   clear, and observe a cast without ever selecting a standard school.
2. **The control's affordance contradicts the rule.** Standard schools cannot
   look like manual cast buttons in an automatic encounter. In automatic mode,
   show read-only cards for learned standard spells, explicitly labeled `AUTO`.
   Clicking, tapping, or number-key selection must not arm or cast one. Keep
   manual lesson controls distinct and explicitly labeled as teaching practice.
3. **The rank must be visible where the decision happens.** Show `Fire · Lv 2`
   (and the player's actual learned rank) on its card, with held/required mana.
   Show row/hit reach in the same card or a nearby persistent concise effect
   summary. During playback, highlight that one card and repeat its name/rank in
   a stable cast-status area. Do not make the player infer rank from mana, color,
   pips alone, or a fleeting spell-name variant.
4. **Readiness and ordering are not selection.** Numbered priority in an AUTO
   panel must say `Priority`, not resemble number-key shortcuts. Distinguish
   `Waiting for mana`, `No useful target`, `Ready`, and `Casting`. More mana does
   not silently change the learned level. If a line earns a chance but nothing
   can use it, avoid a misleading READY state.
5. **Weaving is obscured by overlapping Arcane concepts.** Present three clearly
   distinct things: `Automatic spells`, `Arcane — opponent techniques`, and
   `Custom spell — equipped weaving`. The custom spell must show the actual
   equipped recipe name and an ordered expression such as `Fire Lv 2 → Gravity
Lv 1`, followed by the combined actual cost. Do not make a player discover the
   custom spell by opening the Arcane techniques bank.
6. **Editing, equipping, upgrading, and casting are mixed.** The recipe editor
   currently presents a new level-1 recipe even when both trained bases are
   higher, then hides upgrade controls until the player saves it. A disabled
   strength selector does not explain this dependency. State the recipe's level
   cap and the exact next unlock; put its available upgrade beside the strength
   limit, with its XP-point cost. Explicitly show which recipe is equipped.
   Saving a recipe and equipping it should have clear feedback. Selecting a
   saved recipe for editing must not falsely imply it was equipped.
7. **Preview hides the consequence behind a long dialog.** Three complete
   20-row boards stack on phone while both target sliders and Cast are below
   them. Keep the ordered stage summary, total cost, target controls, and primary
   Cast/Cancel actions reachable together. Prefer compact stage tabs or a
   side-by-side comparison on desktop, one board with `Before / After 1 / After
2` tabs on phone. Preserve separate targets for the two effects, with current
   row bounds visibly marked. Direction controls appear only for Wind.

## Concrete player interaction contract

- New player: zero spell cards, a quiet `No spells learned` state, normal board
  controls. Story/mentors teach what the player chooses.
- Learned standards: read-only AUTO cards, each with actual learned level,
  held/required mana, persistent effect reach and priority. Clearing a line
  grants one opportunity; one identified spell animates, then its result holds.
- Opponent Arcane: one manual entry identified as opponent-targeting, with the
  unlocked techniques and clear current cost. It is not the custom editor.
- Equipped custom spell: its own manual cast control showing the recipe name,
  two ordered chosen ranks and total affordability. Configure/equip outside the
  battle action; preview the two ordered effects before a manual cast.
- Zero, one, mixed-level and all-school books use the same interaction. A debug
  supplied loadout does not define the normal new-player experience.

## Re-review acceptance

Review the changed main-game screen and workshop on desktop and portrait touch,
not screenshots of the editor alone. Verify no standard button selection is
needed; actual rank and cost remain visible; the current cast is identifiable;
manual lessons are clearly separated; opponent Arcane and equipped custom spells
have distinct controls; phone preview/cast controls remain usable; old saves
enter the same interaction instead of retaining an invisible feature gate.

Re-review is pending the implementation changes. Record corrections still needed
and their subsequent re-review here; do not mark approved from passing tests.

## Reproduced in the main app

Opened the normal root page, loaded a mixed learned-spell save fixture (Fire
level 2, Gravity level 1, Arcane level 2, no `boardMagicEnabled`), and entered a
Slime encounter through normal world movement. The scene flags in this review
fixture skip narrative interludes; the spellbook is supplied to examine the
combat UI, not evidence of a zero-spell acquisition playthrough.

- Desktop 1100×900: seven manually clickable school slots display Blaze, Quake,
  and Soul Siphon with small pips; no explicit AUTO behavior or `Lv 1/2/3/4`
  labels. Screenshot: [desktop before](artifacts/casting-main-before-desktop.png).
- Portrait touch 390×844: the seven school slots become effectively icon-only
  buttons along the bottom, with names, actual ranks and costs not legible in
  the captured viewport. Screenshot: [phone before](artifacts/casting-main-before-phone.png).
- Neither the normal save load nor combat entry enabled the new automatic mode.
  This reproduces the reported product mismatch. A workshop-only correction
  would not resolve this finding.

## Weaving's essential explanation

The meaningful player choice is **an intentional ordered pair now**, with
chosen strengths, targets, and a known combined cost, while base spells normally
resolve automatically according to affinity after earned lines. The custom spell
control and editor should communicate that agency directly. Two repeated
`Lv` values without distinguishing source level from recipe capacity obscure
this benefit. Explain recipe capacity beside strength choices, and display the
actual equipped pair and chosen strengths in combat; do not imply that a newly
saved recipe automatically uses the full levels of its base spells.

## Re-review 1 · corrections inspected

The revised code addresses the product-path mismatch and the misleading manual
standard controls: main combat enables the modern rules, the hero panel renders
learned read-only AUTO cards with canonical names, explicit levels, priority,
reach, mana and current-cast status, and a separate equipped recipe control shows
its chosen order, strengths and total cost. The editor now distinguishes recipe
mastery from source levels and explains strength gating, with paid upgrades
available before equipping. Phone casting now has Before/After1/After2 tabs and
sticky action/cost controls instead of three stacked full boards.

**Returned for one further correction:** Weaving aiming still does not mark the
selected rows on its board previews. The grids are unnumbered, and only the
slider label says rows X–Y. The author explicitly needs effects to be visually
understandable. Mark effect 1's target span on Before and effect 2's target span on
After1; leave After2 as the result. Verify both slider and board-tap changes move
the visible mark. Also label held mana versus cost explicitly instead of N/M,
which resembles a current/capacity meter.

An independent run of the supplied production-path smoke harness timed out while
waiting for its test App handle; that is harness evidence, not a finding that the
corrected game cannot launch. A separate normal-entry browser check is being
used to inspect the actual interface without depending on that handle.

A separate normal-entry retest now confirms the changed main screen renders
`Fire · Lv 2` and `Gravity · Lv 2` as read-only cards, with a separate equipped
`Emberfall · Fire Lv 2 → Gravity Lv 1` control. The phone preview's active-stage
tab, slider, total-cost/refusal text, and Cast/Cancel actions fit in the viewport.
This is materially better than the baseline.

One additional correction is requested before closing the interaction review:
manual actions currently use an overflowing horizontal strip. With a custom
recipe, Shadow Drain, and an owned Arcane technique, the opponent-technique
control is outside the visible phone area without an obvious scroll cue. The
seventh group must not disappear again behind an undisclosed horizontal gesture.
Use visible compact opponent-Arcane/custom controls, or wrap/stack these actions.
Keep any other manual support spells distinct from the six automatic standards.

The gameplay reviewer also needs to reconcile the author's reference to seven
standard schools with the current six-school automatic scheduler and manual
seventh group. That is an interaction contract question, not something an icon
layout or a passing browser assertion can silently decide.

### Full-book phone case returned for correction

The normal-entry review was expanded to **360×640, all six base schools at level
4, one equipped custom recipe, Shadow Drain, and an owned opponent Arcane
technique**. This catches a defect hidden by the two-school fixture: the spell
panel begins around y=468 and reserves 190 px, extending to y=658 on a 640 px
screen. The manual row is entirely below the captured viewport, and lower card
readiness text is clipped. This is a blocking touch-layout finding, in addition
to the horizontal discoverability issue.

[Full-book phone returned for correction](artifacts/casting-main-fullbook-returned-phone.png).

Re-review must include this full book and prove that opponent Arcane and the
custom spell remain visible/reachable without relying on off-screen clipping or
undisclosed lateral scrolling. A two-school fit check cannot close this issue.

## Re-review 2 · previous blockers addressed in inspected main-game flows

Re-review of local checkpoint `7b27a1c` used a separately written normal-entry
browser script, without replacing the main entry module or obtaining the App's
private handle. Its staged existing save omitted the old rollout flag, owned all
**seven** primary schools at level 4 plus Cure, one valid opponent Arcane
technique, and an equipped `Fire Lv 2 → Gravity Lv 1` custom recipe. It entered
Slime through normal world movement. This is explicit review staging, not an
assertion that the reviewer played the campaign to acquire these resources.

Verified six combinations: **360×640, 390×844, and 1100×900, each with Touch
buttons off and on**:

- All seven primaries render as read-only AUTO cards, including opponent-targeted
  primary Arcane. Each card has a canonical school name, explicit learned rank,
  priority, reach, held mana, required cost and readiness. Cards can be reached
  within their bounded vertical rail without moving the main manual-action row
  off-screen. Primary Arcane no longer appears as a manual standard-spell button.
- The opponent Arcane technique, equipped named custom spell and manual support
  chooser are distinct, visible controls. Their measured rectangles stay within
  the viewport in the full-book case; no lateral scroll is required.
- Weaving's Before and After1 boards visibly mark the respective target spans.
  Moving effect 2's slider to row 10 moves its actual highlighted row to 10. Its
  After2 view remains the result. The phone uses one active board, with reachable
  stage tabs and Cast/Cancel actions.
- Missing resources are described per pool with held amounts and required costs,
  rather than a generic disabled action with no explanation.
- No browser page errors occurred in these six interface checks.

[Full-book phone after correction](artifacts/casting-main-after-phone.png) ·
[Weaving aiming after correction](artifacts/casting-weaving-after-phone.png) ·
[Six-case independent UI report](artifacts/casting-ui-rereview-report.json).

**Scoped verdict:** the previously blocking main-game interaction and small-phone
layout findings above are addressed in the inspected flows. It is reasonable to
return this version to the author for hands-on playtesting, subject to gameplay
and automated checks. This is an independent AI-agent UI/UX re-review; it is not
human designer approval, project-manager signoff, or author acceptance.

A remaining non-blocking small-phone refinement is to keep the currently aimed
row above the sticky Weaving footer automatically: a default bottom-row target
can initially sit under the footer until the dialog is scrolled. Grid sizing or
scroll-to-selection can improve this without changing the casting contract.

### Final production-path and recovered-recipe checks

The independently rerun, corrected production-path browser harness passed at
360×640, 390×844 and desktop. It verifies actual red-earned Fire level-2 casting
and violet-earned primary Arcane casting without selecting a standard spell,
including real mana payment and rank/status presentation. Its resource/board
staging is explicit; this is not a campaign-completion proof.
[Production-path re-review report](artifacts/casting-production-rereview-report.json).

An additional normal-entry malformed-save fixture retained an equipped Fire /
Gravity recipe but lacked its Fire source. The custom control now remains
visible, disabled, and explains that the chosen source spells must be learned;
it does not throw and halt the render loop. The earlier test-only Arcane book
also clears its unrelated equipped recipe, so that inconsistent fixture no longer
interrupts the earned-Arcane test.

The reduced phone preview grid improves fit but does not completely remove the
non-blocking footer/selection overlap at 360×640: the default row-20 mark was
measured around y=531–546 while the footer began around y=510. Scrolling reveals
it. This refinement remains explicitly open unless subsequent scroll-to-selection
or sizing work is separately verified. It does not reopen the now-correct
manual-action availability or automatic-casting findings.

### Preview-footer refinement re-review · closed

A further normal-entry **360×640, Touch buttons on** check verified the bounded
preview viewport and scroll-to-selection refinement. On After1, the default
bottom-row target is now fully visible above the sticky footer: its marked row
ends at approximately y=504.3 while the footer starts at y=510.4. Cast/Cancel
remain reachable, and moving the slider still moves the visible highlighted
span. The full-size board is retained within its bounded scroll area; the tab,
slider and footer do not have to move to reveal the selection.

[Refinement measurements](artifacts/casting-footer-refinement-report.json).

The previously open footer/selection refinement is therefore closed in this
inspected small-phone case. The scoped UI/UX verdict remains ready for author
hands-on playtesting, without claiming human approval or campaign acceptance.
