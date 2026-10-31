# M2a class ability leaf implementation

Implemented: pure awakening/trade helpers and bounded per-battle intents.
These modules are not connected to Hero, save loading, Board, Battle, UI,
or feature activation by this change.

The source is Encounter Addendum rev 3, sections 2, 4 and 5. Rev 3's
awakening-time rank trade supersedes the earlier rank-refund language.
No new skill point is granted. New saves keep starting stats unchanged;
the first completed mentor lesson outside Mossvale awakens on either outcome.

`src/game/classAbilities.ts` returns copied flags/stats plus a trade intent.
The integrator must commit that transition, derived-stat refresh and save
as one operation. Flags `ability:awake`, `ability:lessonOutsideMossvale` and
`ability:trade:<classId>` make replay and migration idempotent. A migration
receives trusted lesson-history evidence instead of guessing from location,
level or known spells. This module reserves no save version.

## Integration API

- `awakenClassAbility(progress, lesson)` takes `{classId, stats, flags}`
  and a completed `{kind: 'mentorLesson', mapId, mentorId, outcome}` event.
  Win and loss both qualify; Mossvale and empty identities do not.
- `migrateClassAbility(progress, {pastOutsideMossvaleLesson})` uses trusted
  historical evidence supplied by the save owner. Existing receipt/payment
  markers are also evidence. No hero stat, spell, level, or map is guessed
  to imply an old completed lesson.
- `hasAwakenedClassAbility` requires the awake flag and that class's paid
  trade marker. Unknown classes do not silently use Ranger's trade.
- `createClassAbilityState(scope, rules)` receives a battle scope and an
  injected tuning object. It starts with no charges, streak or cooldown.
- `onClassAbilityLock` consumes the placement's authoritative new-hole count,
  cleared lines, orange counts per cleared line and normal event windows.
- `onClassAbilityPush` returns the actual row count plus a presentation intent.
  Apply that returned count once; the intent must not subtract another row.
- `classAbilitySight` supplies display guidance, not a scheduling change.

The progress transition's `status` is `awakened`, `repaired`, `unchanged`,
or `invalid`. The integrator applies copied flags and ranks atomically,
refreshes derived stats, and clamps existing HP/mana to their new capacity
without healing or adding mana. There is no change to unspent skill points.
Repeated migration or repeated lesson completion never pays twice.

## Rules and bounds

The integration owner should put this injected object in the approved
`CLASS_ABILITIES` balance block; no balance file is edited by this leaf work:

```ts
{
  breeze: { safePlacements: 6, maxGlass: 2 },
  bulwark: { earthCrystals: 3, protectedNpcPushes: 2 },
  pickpocket: { minLines: 3, cooldownPieces: 10 },
  sight: { leadPieces: 2, extraDarkRows: 1 },
}
```

Scope fields are `classId`, `awakened`, `mapId`, `encounter` (`combat`,
`lesson`, `npc`), and `board` (`standard`, `LOCK`, `BUILD`). Abilities are
inactive before awakening, on Mossvale, and on LOCK/BUILD. The integration
owner must classify legacy authored puzzles as LOCK too. No feature gate
is enabled by constructing or importing these helpers.

- **Breeze:** six consecutive hole-free placements charge one use. The next
  placement making holes emits an intent for at most two newly covered holes,
  then resets the streak and charge. Existing holes are not candidates.
- **Bulwark:** one cleared line containing at least three orange crystals
  charges one use. Eligible pushes lose exactly one row. Count push calls,
  not rows: the first two positive NPC pushes remain intact. Only one NPC
  block is allowed. Signature and threshold-defining events keep the charge.
- **Pickpocket:** one 3+ clear cancels the earliest eligible event. A normal
  announcement at spawn N admits locks N and N+1 only; cooldown becomes ready
  at the triggering piece plus ten. Each event is cancelled at most once,
  and NPC encounters permit only one cancellation. No send or mana effect
  is returned. Signature and threshold-defining events cannot be selected.
- **Sight:** placement telegraphs can display two pieces ahead, CONTAIN can
  disclose exact next-spread cells, and dark visibility gains one row. Other
  telegraphs keep their normal lead. Existing longer lead is not shortened.
  Earlier viewing never changes Pickpocket's normal N/N+1 window.

Absolute piece numbers start at 1. Duplicate/out-of-order lock events do not
advance streaks or consume another allowance. Event protection fields must
be explicitly false before interception is allowed; absent legacy metadata
is not treated as permission. NPC caps are fixed at one; tuning validation
prevents increasing glass/dark utility caps or weakening protected pushes.

## Deliberately not activated

The battle helpers emit intents and never edit board cells. Glass still
requires neutral scoring and cell support, including purity and wrong-colour
rules. Resolve a glass intent within the placement transaction using that
placement's new-hole coordinates, so completed lines clear normally; do not
fill arbitrary old holes or independently award mana/score. No phase counter,
region-rule counter, boss signature, threshold event or gesture is changed.

Hero/save/Board/Battle/UI integration, awakening dialogue, actual glass
semantics, frame badges and activation are outside this checkpoint. The
800-seed class comparisons, approved-band checks, phone screenshots and
author Knight/Rogue feel session in sections 4–5 remain required before M2a
acceptance. Passing the leaf tests does not satisfy that acceptance gate.

## Validation

Focused unit tests cover all four trades and idempotence, old-save proof,
scope exclusions, new-hole versus old-hole limits, first-two NPC pushes,
one-row and one-NPC caps, protected events, exact N/N+1 boundaries, cooldown,
duplicate locks, Mage visibility and unchanged input data.
