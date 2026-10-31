# M2a reactions — pure scheduler and bounded effect intents

This implements the reaction rules from `ENCOUNTER_ADDENDUM.md` rev 3 as
**unconnected leaf modules**. No Battle, combat, UI, save, or balance switch
has been changed. The feature is not active in the game.

## Contract for runtime integration

- `src/data/reactions.ts` owns the seven-element ring, stable discovery IDs,
  names, and approved starting parameters. The values can later be moved to
  the agreed `REACTIONS` balance block without changing this API.
- `emptyReactionState()` starts a fight-local buffer. `advanceReactions`
  consumes exactly one physical lock. Its lines come from `reactionLines`
  over the physical `LockResult`, using the existing `lineSurge` rule.
- `advanceReactions` receives an explicit `enabled`, map, encounter kind,
  and source. Mossvale/NPC locks do not react. AUTO, manual spells, custom
  Weaving, and reaction-generated board changes never advance this buffer,
  produce another reaction, or manufacture another physical placement.
- The previous lock's primer is frozen while selecting the bottommost
  eligible successor. No same-lock chain is possible. If nothing reacts,
  the bottommost surge replaces the primer. A primer lasts through the next
  two physical locks, including empty locks. The lead confirmed this ordering.
- `reactionEffects(trigger, context)` runs after the normal strike and line
  effects, before AUTO resolution. Its output is data, not callbacks. Apply
  it once, without re-entering the normal clear/strike/mana/AUTO pipeline.

`ReactionContext` supplies the enemy, whether the mentor shield is up, the
post-clear board cells and hexes, all physical clear-row indices, current
enemy gauge, protection on its next event, and the trigger strike's base
damage/current non-elemental multiplier. Damage intent amounts are already
rounded and resolved using existing **spell** affinity (including boss spell
weakness share); do not run elemental affinity over them a second time.
The shield makes damage zero while retaining utility. No reaction spends
gauge time. Conduction emits only the extra strike damage, not a duplicate
normal hit, and cannot increase a total multiplier above ×3.

The burst/heal crystal count is the actual trigger colour in all eligible
successor-surge rows, not alignment-boosted surge power or shape identity.
Dual halves and recoloured mentor tosses therefore use their true colours.
`reactionPrimer` exposes successor element/shape and remaining pips for a
future frame glyph; it does not add a UI or an input.

## Bounded utility adapter requirements

- Conflagration selects at most two highest unprotected stone cells, once.
- Eruption requests only the bottom row, once, and skips it if the snapshot
  contains a protected/signature/threshold cell there. Its explicit reward
  mask forbids mana, strikes, AUTO budget, and reactions from that removal.
- Quagmire requests only the available delay above the −3 s gauge floor;
  protected next moves are not delayed.
- Overload is the only mana intent: +2 lightning and +2 arcane, once, sourced
  from the earned triggering clear. Repeats emit damage instead.
- Witchbloom removes at most three eligible hazard **tags**, not their cells,
  and never resets a region counter. Normal row collapse is inverted before
  testing the original cleared-row ±1 radius.
- Seedstorm names only the oldest eligible hex. Its two-piece tailwind
  explicitly must not cleanse other hexes. The existing generic combat
  `tailwind` helper clears haste, so it cannot be reused unchanged here.

The adapter must annotate boss-signature, threshold-defining, and protected
cells/hexes/events in the snapshots. Unmarked metadata must not be taken as
proof a signature may be cancelled. Existing interference-owned obstructions
and region tags need this mapping before activation. Apply changes through
the existing board-magic transaction path so tags/ownership/visual traces
remain consistent, rather than directly erasing obstruction state.

## Discovery and save boundary

The persistent shape is `{ reactionsSeen: ReactionId[] }`, separate from
fight-local primer, age, and spent utilities. `sanitizeReactionDiscovery`
accepts the stored array and filters unknown/duplicate IDs into stable order.
`discoverReaction` adds a selected reaction immutably and idempotently.
No save version was changed here; the current save version must be inspected
by the integrating owner rather than copying the addendum's historical v11.

## Remaining before activation

1. Wire one physical-lock hook and one post-normal-effects intent adapter,
   preserving seven-primary AUTO's existing earned-line budget and manual
   custom Weaving. Add integration tests for that non-recursion boundary.
2. Map all signature/threshold/hazard/hex ownership, mentor shield, and
   utility-safe board operations. Prove region counters keep running.
3. Integrate discovered IDs with current save migration, menu ring, frame
   glyph, stage banner priority, and scripted first-lesson tosses. No new
   character barks have been invented in this implementation.
4. Run paired reactions-on/off **800 seeds per arm**, good/casual policies,
   all relevant region cells and the Wyrm. Gain must be ≤5 points in regions,
   ≤3 for Wyrm, with on-results inside approved bands; reaction damage ≤15%.
   Median fight duration must stay ≤105% and within existing length targets.
   Cut reaction parameters before considering a capped +5% HP adjustment.
5. Validate combined class/synergy behavior and author ability-feel review,
   plus 390×844 and 360×640 worst-case layouts, before enabling the feature.

Leaf unit tests prove rule timing and bounded intents, not those acceptance
bands, full-runtime behavior, or a production-ready feature.

## Saved validation

- 35 reaction tests pass, including all seven first/repeat cases, window
  expiry, bottom-first selection, mixed-colour tallies, shield/boss rules,
  protected utilities, non-recursive sources, and discovery sanitation.
- The combined reactions, elements, dual pieces, AUTO casting, and custom
  Weaving run passes 139 tests. This compatibility check changes no existing
  casting path and does not substitute for future integrated reaction tests.
- Project typecheck and owned-file lint pass. The fixtures use the current
  `neutral` cell type (the addendum's conceptual neutral glass), without
  introducing a second neutral-cell kind or altering existing scorers.
