# Improvement Recommendations — implementation review

Reviewed against the preserved [recommendations](../Improvement%20Recommendations),
the team's [encounter design](ENCOUNTER_DESIGN.md), and the playable campaign
checkpoint `3edb994`. The recommendations are useful directions, not a list
of features already implemented or a replacement for the team's decisions.

## 1. Encounter variety and board modifiers — highest gameplay priority

The underlying concern is sound: adding regions and HP does not by itself
give each encounter an identity. The current continuation supplies distinct
routes, tasks, enemy move mixes, and story milestones, but its bosses still
use the existing combat system. The proposed Firstcoal, seven-singer, and
lantern phases have not been implemented by naming those bosses.

Use the team's concrete encounter work as the implementation basis: authored
objectives, regional rules, one-piece telegraphs, controlled queues, and the
overlay budget. Prototype and measure those rules before inventing another
parallel set of hazards. Existing curse, seal, petrify, haste, and preview fog
already provide building blocks; they are not the full proposed encounter plan.

Two examples in the recommendation need adjustment. Swapping column controls
conflicts with the team's explicit same-controls and stable-drag rules.
A 3×3 visibility penalty must not hide the skyline or current landing cells.
Preserve those readable cues and telegraph a hazard instead of making an
input unreliable or a legal placement unknowable.

## 2. Element reactions and class mechanics — design separately

Rapid elemental reactions could create useful build choices, but they add a
new scoring/combat layer on top of existing combo damage, elemental affinity,
and multi-element spells. Define an observable trigger, stacking limits,
enemy interaction, and feedback before tuning damage. First address the
current [combat findings](CAMPAIGN_BALANCE.md) and
[prepared comparison](CAMPAIGN_BALANCE_FOLLOWUP.md); those samples do not yet
establish balanced second-half combat.

The class examples also touch existing rules:

- Mirroring an S/Z or J/L changes its shape identity. The encounter design
  deliberately ties colour to shape, so a Ranger mirror needs an explicit
  rule for both; it is not simply another rotation button.
- Extra preview is already provided by **Insight**, through `previewCount`.
  Moving it to Mage Focus would change the stat system and access for other
  classes. Assess whether a new class passive adds a distinct decision.
- Mana currently comes from cleared crystals; stealing enemy mana changes
  that economy, and enemies do not have the hero's seven-pool inventory.
  Any Rogue theft needs a defined resource and limit rather than an implicit
  bypass of the current mana rule.

Keep required story progress possible for all four classes. A new passive
should offer a different approach, not become the missing key to a task.

## 3. Narrative and companion delivery — build on what is present

Portraits, attitude faces, tiered dialogue, and visible mentor assistance
already exist. `conversationBody` places an attitude face with the speaker;
lessons show a mentor and toss fitting pieces. New scenes now connect the
Wyrm's false victory to Vesper, the return, the rite, and the final form.

The useful next improvement is stronger reactions during play: the team's
three encounter barks and wordless faces tied to meaningful events. Preserve
the character motives in the reviewed script instead of adding generic
encouragement to every clear. Reaction portraits require matching art and
state mapping; the existing static face is not that completed system.

A separate synergy gauge or fusion system is additional combat design.
Prototype a clearly earned joint action after the existing lesson and boss
behaviors read well. Do not add another meter merely to restate the mana
or action gauges already on screen.

## 4. Touch feedback and audio — useful polish after readability

The event/feedback layer already drives row flashes, floating numbers,
spell effects, and shakes. Optional haptics can subscribe to those events
for hard drops and major clears, with a saved preference and a no-op fallback
where vibration is unavailable. Avoid continuous vibration or duplicate
pulses from both input and resolution events.

Maps contain music identifiers, but the current source has no audio playback
engine or shipped audio tracks. Layered music therefore needs an audio asset
set, user-initiated playback, mute/volume controls, and pause/visibility handling
before intensity transitions can be assessed. Music identifiers alone are
not an audio feature.

## 5. Replayability — update the premise and unlock at the right ending

The file assumes play stops at the Wyrm with a sealed sequel ward. That was
the earlier build boundary. The current checkpoint opens the continuation
and reserves full-campaign completion for the Malificat after Fennick's rite.
Postgame features should use `campaignComplete`, not `wyrmBeaten`.

A deterministic endless challenge is a useful later experiment because it
can reuse the battle engine. Keep it separate from story saves and record
the seed and rules version for comparable results. New Game+ needs explicit
carryover/reset rules, save compatibility, and a fresh economy check. It
should not be used to make the unfinished main-route balance feel complete.

## Resulting order of work

1. Finish the current route/UI verification and retain the balance findings.
2. Develop encounter identity through the team's existing vertical-slice plan;
   measure real preparation, slow-pace play, and resource acquisition.
3. Add event-driven character reactions and optional touch feedback.
4. Establish audio assets/playback before dynamic music.
5. Evaluate new class/reaction systems and replay modes as separate additions
   once the main adventure is reliable and satisfying to play.

This review preserves the original recommendation file. It does not silently
enable new gestures, alter mana rules, add audio, or claim the tentative
encounter mechanics are finished.
