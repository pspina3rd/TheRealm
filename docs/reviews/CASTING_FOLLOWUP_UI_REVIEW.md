# Casting readability and first-learning follow-up review

Independent AI-agent game UI/UX review, begun against local `28f3ad4` after the
author reported that mobile readiness was hard to read and desktop was only
adequate. Production source is read-only for this reviewer. This is not human
designer approval or author acceptance.

## Initial findings

The previous review established interaction correctness and viewport reachability;
it did not establish that players could read the dense readiness prose during a
falling-block game. The prior phone rail used 9px explanatory text. The author's
hands-on readability finding takes precedence over that earlier limited pass.

The updated compact charge meters materially improve scanning. Independently
inspected the actual App at **360×640, 390×844 and 1100×900**, with a staged full
seven-school book, manual opponent Arcane, an equipped custom recipe and Cure.
Resource/board staging was explicit and does not represent campaign completion.

Verified in the browser:

- Fire at 6 held / 12 cost displays a half-filled track and Charging.
- A full meter with no valid target says No target and lacks Ready treatment.
- A full useful spell says Ready · next clear. Level remains explicitly shown.
- Surplus 20 / 12 is shown numerically while the track clamps at full; it does
  not imply a higher spell level or invent another cast opportunity.
- Empty and partial meters, and real source costs, remain distinct.
- Readiness labels are at least 11px; the meter replaces redundant mobile prose.
- Manual actions and the board remain inside the tested viewports.
- Standard cards remain read-only. A meter is not another cast button.

Temporary inspection screenshots are `/tmp/followup-meter-360.png`,
`/tmp/followup-meter-390.png` and `/tmp/followup-meter-1100.png`; structured browser
measurements are `/tmp/followup-meter-report.json`.

### Corrections requested

1. **First lesson still teaches a different interaction without explaining it.**
   The ordinary fight now has read-only AUTO meters, but an initial mentor lesson
   returns to seven old manual school slots. On phone those slots hide the
   names/levels; the side hint only says Lent: Fire. A new zero-spell player can
   reasonably conclude that spells still require clicking one of seven groups.
   Explain manual practice before and during the lesson, give the taught school
   one explicit name/rank/cost/effect Practice action, and say that normal fights
   use AUTO after earning lines. This is interface guidance, not new character
   dialogue.
2. **Full-book count and scroll discoverability.** In the densest 360×640 case
   (Touch buttons on, custom + opponent technique + support controls), six cards
   are initially visible and the seventh requires a short vertical rail scroll.
   Keep the readable type; do not shrink it to claim all seven fit. Show the
   learned count and a visible continuation/scroll cue. Manual actions must stay
   in their dedicated visible area.
3. **Readiness cache.** Changing only the sealed-spell record initially left the
   card stale because it was absent from the render cache key. Pre-battle seals
   initialized correctly; adding seal/Arcane/flag inputs makes live readiness
   robust. The coordinator reports this correction is implemented; it will be
   checked again with the teaching changes.

## First-learning source observations

- Character selection explicitly says zero starting spells and explains that
  class affinity is not an automatic spell grant.
- Mentor lesson choices now show canonical school, explicit Lv, current board
  effect and base cost, rather than legacy Fire-damage or clearRows claims.
- `lessonInteraction` and the active lesson surface still need the manual-practice
  versus ordinary-AUTO explanation described above.
- The reviewer is continuing the actual mentor-entry checks for different first
  schools, rather than relying only on a workshop debug loadout.

## Current verdict

The meter presentation is a substantive readability improvement and its tested
resource states are correct. Return the first-learning interaction for correction
and re-review before describing the complete zero-spell learning flow as coherent.
The coordinator is implementing the requested lesson guidance and scroll cue.

## First-learning browser inspection and lesson re-review

A separate normal-entry browser script reached mentor offers and entered the
lesson for **each of the six possible first base schools** from an empty
spellbook: Fire/Torva, Ice/Maren, Gravity/Dorn, Wind/Kestrel, Lightning/Rook and
Nature/Hazel. The fixtures place the hero beside the mentor to inspect actual
interaction/lesson entry; this does not claim the reviewer walked every region
or won each lesson. Each school was offered at Lv 1 without another learned base
school. Choices displayed its current board effect and cost.

The revised dedicated Practice action is a substantial improvement over seven
manual icon slots. It identifies the taught school and actual rank, cost, mana
requirement and current effect. The pre-lesson note now explains ordinary
AUTO casting after cleared lines. Disabled practice instructions keep full
opacity, so they remain readable before a novice has charged the spell.

**Returned for a further correction at 360×640:** with Touch buttons enabled,
the first Fire lesson's 106px Practice strip started at y=544.6 and ended at
y=650.6, outside the 640px viewport. The portrait lesson layout still needs its
own correct height reservation; fixing the normal AUTO rail does not cover this
separate lesson layout. Re-review must check the complete Practice action and
movement controls, then aiming/cancel and Other spells dialog recovery at phone
and desktop sizes.

Also recommended consistent canonical school names in the board's lesson title
(e.g. Ice rather than Blizzard) and an explicit current-practice-rank → earned
next-rank label for upgrade lessons if the trial intentionally uses the existing
rank. This avoids apparent disagreement between the offered lesson level and the
actual cast level without changing trial mechanics.

## Independent follow-up re-review · October 31

A fresh independent reviewer resumed after the coordinator's fixes. The latest
lesson layout now uses four portrait rows (stage, board/hero, practice, movement)
and bounds the hero panel instead of letting its content push the movement row
below the viewport. The redundant separate rotate button is hidden in that
layout; the normal movement row retains Rotate.

Independent browser re-review is checking 360×640 and 390×844 with Touch buttons
both on and off, plus desktop, for all six initial schools and a paid Fire Lv2
lesson offer. The fixtures use the real App and mentor interaction/lesson entry;
positioning is staged for inspection, rather than claiming an independently
walked campaign. Charge-state and skill-staging checks are separate actual-App
flows. This checkpoint records the review in progress and is not a final pass.

## Final independent scoped disposition

**No remaining blocker found in the reviewed main-game charge meters, lesson
practice transition, or Fire training presentation.** This re-review supersedes
the earlier returned findings above. It is independent AI-agent implementation
and interface review, not human-designer approval, novice comprehension proof,
whole-campaign balance acceptance, or a claim that all progression histories
were played.

The reviewer independently ran:

| Actual-App flow                                                                                                                                   | Viewports/settings                                          | Result                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Mentor entry and lesson practice for Fire, Ice, Nature, Gravity, Lightning and Wind, plus a genuinely paid Fire Lv2 lesson offer                  | 360×640 and 390×844, Touch buttons on/off; 1100×900 desktop | 35 cases passed                                                        |
| Fire required Training plus separate Efficiency, Confirm and persisted SP/backing counts                                                          | 360×640 and desktop                                         | Passed; six SP paid, rank remains 1 until the mentor lesson            |
| Seven-school charge states, exact/full/surplus mana, manual-action and board bounds, seal-only state update, learned count and live overflow hint | 360×640, 390×844, desktop                                   | Passed                                                                 |
| Optional Vibration preference toggled in the ordinary menu, retained after reload, and disabled again                                             | 360×640                                                     | Passed; this checks preference behavior, not physical device vibration |

All 35 practice cases kept the complete Practice action and visible movement
buttons within the viewport. The reviewer also measured the action's internal
content: no scroll-height overflow and no instructional child extended below
the card. Zero-mana instructions remained at full opacity. Visual inspection
of the small-phone Nature lesson and Fire upgrade showed readable effects,
costs, current practice rank and earned-rank goal. The latter now says Practice
Fire Lv1 and Win to learn Lv2, with its actual carried-Efficiency cost.

For cases with other known spells, opening Other spells paused the battle and
Back to practice restored it. Opening the taught spell's targeting dialog and
Cancel also restored the unpaused lesson. Browser error collections remained
empty. All six schools retained canonical names on the offer, objective and
practice surfaces. The ordinary AUTO cards remain read-only; lessons explicitly
explain hands-on practice and the earned-line/charged-mana transition to normal
combat.

The dense full-book rail may still require a short scroll. The corrected count
and visible More spells below cue make that continuation explicit, while manual
advanced/custom/support actions remain in their separate visible area. The seal
cache correction was tested by changing the seal alone, without an unrelated
board mutation to force a redraw.

Reproducible source flow: `tools/lesson-onboarding-smoke.mjs` and
`tools/main-casting-smoke.mjs`. Independent run records are
`/tmp/independent-practice-rereview-report.json`,
`/tmp/independent-meter-report.json`, `/tmp/followup-fire-skills-report.json`,
and `/tmp/independent-vibration-menu.log` in the review workspace. The 35-case
inspection used the actual App/navigation/rendering with staged inspection
positions and selected mana states; earned first-school access/outcomes remain
covered separately by the progression benchmark.
