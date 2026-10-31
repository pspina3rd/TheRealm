# M2a mentor synergy foundation

Implements pure state transitions and typed cast intents from
[ENCOUNTER_ADDENDUM.md](ENCOUNTER_ADDENDUM.md), rev 3 §3–5. This is an inactive
foundation, not an activated feature or acceptance of M2a.

## Scope and API

`src/data/synergy.ts` holds the starting values and three joint-spell mappings:
Hazel → nature/spores, Maren → water/tide, Dorn → earth/rockfall. These logical
rule targets do not claim that tide or rockfall has a runtime implementation.
Values stay in this new leaf module to avoid concurrent edits to `balance.ts`;
consolidation into its approved `SYNERGY` block remains an integration task.

`src/battle/synergy.ts` exports:

- `createSynergy(encounter)`: returns fresh fight-local state, or `null`. Requires
  an explicitly enabled supported lesson, outside Mossvale, with a positive
  integer difficulty. Wyrm, threshold assists, ordinary encounters, and allied
  bosses have no eligible path. Later allied boss support requires a separate gate.
- `noteSynergyToss(state, tossId)`: records the identity of the latest actual
  mentor replacement toss. A newer toss replaces the old identity.
- `gainSynergyFromLock(state, lock)`: +10 per cleared line whose actual surge is
  the mentor element, plus +10 once for this lock if at least two cells of the
  latest toss were cleared. The caller supplies actual resolved surge events and
  toss provenance, not colour guesses. Aggregate toss cells over the cleared rows.
- `gainSynergyFromReaction(state, {primer, trigger})`: +15 for an actual reaction
  involving the mentor element on either side. Call once per reaction, separately
  from that lock's line gains. Do not call for a primer without a reaction.
- `synergyCastEligibility(state, context)`: returns a typed blocking reason, or
  `null` when ready. `castSynergy` returns either an unchanged state and no intents,
  or the consumed state with three intents.

There is no decay. Gains clamp at 100 and stop after use. State is immutable;
the runtime adapter must adopt each returned state. A successful cast resets the
meter and marks the spell used for this fight. Do not persist it across battles.

## Integration contract still to implement

No existing runtime, Board, UI, save, balance, or spell file is changed here.
The seven standard AUTO spells retain their current flow, and custom Arcane
Weaving remains manual. Joint synergy is a separate approved portrait action;
it is never an AUTO entry, standard spell slot, or custom Weaving recipe.

The adapter must supply `canAct: false` during pre-roll, pause, animation playback,
or after battle completion. Only `source: 'portrait-tap'`, a full unused meter,
and a shield that is not up can cast. A failed tap consumes nothing. A successful
tap returns base elemental damage `18 + 6 × difficulty`, a **cost** of 25% of the
enemy action gauge (advance the enemy gauge, not refund or slow it), and cleanup
of **at most four** hazards belonging to that mentor's rule with a three-piece
delay. Apply the intents once, adopt the consumed state atomically, and preserve
the existing damage/affinity and shield-crossing rules. Never allow this damage
to break a raised teaching shield or bypass its HP threshold.

Region adapters must choose only the specified rule's hazards, leave other
rules and boss signatures untouched, preserve counters, and keep the rule alive.
Delay its next scheduled action without resetting its accumulated progress.
Cleanup grants no incidental mana or normal clear strike. The foundation emits
limits; it does not remove board cells or mutate a timer. Tide and rockfall
adapters and bounded cleanup support in the existing spore rule remain pending.

Toss-cell identity must survive lock/collapse operations and distinguish the
latest toss from earlier tosses and naturally matching crystals. The current
Board does not expose this tracking; the module deliberately does not add it.
Invoke gains exactly once for each event, after resolved line/reaction evidence
is known. No event deduplication or board ownership is hidden in this leaf API.

UI remains pending: arc on the 48 px portrait, minimum 44 px tap target, glowing
readiness, shield greying, +10/+15 feedback, and a joint banner that takes priority
over the reaction banner. No dialogue or art is invented here.

## Validation and outstanding acceptance

`tests/synergy.test.ts` checks eligibility boundaries, opt-in, supported mentors,
gain arithmetic, toss identity, clamping/no decay, shield and input blocking,
damage/gauge/cleanup intents, immutability, and once-per-fight consumption.

Unit checks do **not** establish the addendum's balance or presentation acceptance.
The paired 800-seed-per-arm synergy-on/off lesson checks remain **unmet**: approved
lesson bands, 60–80% good-bot casts, joint damage ≤20% of lesson damage, and lesson
length ≤105% of synergy-off. Do not activate from these unit results. If those
checks miss, tune synergy gains; any foe HP retune is capped at +5%.

The 390×844 and **360×640 worst-case** screenshots remain **unmet**: shield up,
portrait arc ready, live primer, and recharging Knight badge together. Author
ability-feel go/no-go, reaction/class acceptance, and the later combined M6
checks remain separate milestones. No production activation is included.
