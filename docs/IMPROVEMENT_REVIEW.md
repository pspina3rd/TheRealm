# Improvement Recommendations — implementation review

Reviewed against the preserved [recommendations](../Improvement%20Recommendations),
the team's [encounter design](ENCOUNTER_DESIGN.md), and the playable campaign
checkpoint `3edb994`. The recommendations are useful directions, not a list
of features already implemented or a replacement for the team's decisions.

## Latest team check — supersedes the earlier scheduling assessment

Rechecked `claude/laughing-brown-7i13lb` at
[`5fe2859`](https://github.com/pspina3rd/TheRealm/commit/5fe285989df47ce92fa561bc2bc64c4fcc0a0f81).
This adds the team’s M1 wiring, five-row Rowan/Wren layouts, shared hint
weight, CHARGE hint revision, recorded tables, and smoke script. These are
reconciled with GetPutTaco’s campaign and save-recovery checks. The subsequent
13 commits include the author’s October 29 bot definitions, Vale P6/window3,
Pip’s 20–40 second target and balance tuning; those now take precedence.
The encounter foundation commits after `d14b3c4` have been reconciled into
GetPutTaco, preserving the playable campaign. The unified save format is
version 12 and loads both independently written version-10 formats, plus
version 11. The player-facing M1 wiring is implemented and checkpointed;
its automated balance gate still fails. See [M1_PLAYTEST.md](M1_PLAYTEST.md).

The new work includes board tags, controlled supply, encounter verbs, stakes,
lesson shields, telegraphs, feasibility checks, and simulator changes. The
[approved Addendum A](https://github.com/pspina3rd/TheRealm/blob/f17985d91e42f78100e44cf57441518cf597ad17/docs/ENCOUNTER_ADDENDUM.md)
selects **element reactions, class abilities, and mentor synergy** from the
recommendations. They belong to M2a, after the author's M1 playtest go/no-go.
The earlier assessment below did not have this approval available.

The current priority order is:

1. **Reconcile and validate the team's encounter foundation and M1 slice.**
   Encounter variety remains the highest immediate gameplay priority. Extend
   their implementations rather than build competing verbs or pressure rules.
2. **Follow approved M2a for reactions, passive class abilities, and synergy.**
   These are chosen work, not indefinitely deferred ideas. Keep awakening,
   stat trades, capped effects, protected signature moves, and paired balance
   checks from the approved addendum.
3. **Character reactions and optional touch feedback.** Add event-driven
   expressions/barks to support the motives already written; keep the phone
   layout readable. Haptics remain optional polish, outside Addendum A.
4. **Audio foundations, then layered music.** Playback and assets are still
   prerequisites for dynamic music.
5. **Endless mode and New Game+.** The approved addendum explicitly defers
   these until after the main game.

Two concrete reconciliation issues were addressed before further tuning:
the independent save-version-10 additions (campaign entry versus stakes)
now migrate through version 11 to version 12, and the corrected simulator landing origin is
retained.
Those samples remain historical diagnostics, not tuning targets.

The addendum also resolves the rough class examples: Ranger **Breeze**,
Knight **Bulwark**, Mage **Arcane Sight**, and Rogue **Pickpocket**. It rejects
piece mirroring and duplicating Insight's preview benefit. Pickpocket cancels
eligible telegraphed events instead of creating off-board mana. Mentor synergy
keeps the Wyrm solo and uses mentor portraits for eligible joint spells.

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

## 2. Element reactions and class mechanics — original assessment

Scheduling here is superseded by the approved M2a plan above. The mechanical
concerns below explain why the team refined the original class suggestions;
they are not grounds to defer the approved implementations.

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

The newer approved addendum specifies the synergy gauge, portrait casting,
initial three joint spells, and later allied bosses. Implement that design
after the M1 checkpoint, rather than inventing a competing fusion system.

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

## Earlier order of work — superseded by the latest team check

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
