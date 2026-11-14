# Fern opening — independent review

14 November 2026. Read-only review of the revised author decision log,
opening sample and shots, cinematic data/book, dawn transition, and opt-in
App/main wiring. Scope is the isolated development web playtest; no native,
other-hero, or full-campaign rewrite is assessed or requested here.

## Initial verdict: revise two issues

1. **The recommended first teacher is inaccessible to fresh Fern.**
   `src/data/surfaceWorld.ts` gives the Windward entrance both `peakGate`
   and a prior-region requirement (`reached:peaks`, `reached:cliffs`,
   `reached:ruins`, or `opening:legacyJourney`). `finishFernOpening` grants
   none of these, correctly avoiding invented campaign progress. The dawn
   script and lead nevertheless direct Fern to Kestrel first. Provide an
   explicit isolated Fern-journey access condition, rather than fake earned
   flags, and verify entry to Windward before Forgefyre/Stormcrown progress.
   Current handoff tests establish adjacent movement only; the browser
   regression also stops at the road.
2. **A held Enter skips successive book pages.** `cinematicBook` rejects
   repeated Arrow/Escape events, but focused button activation bypasses that
   handler for Enter. In Chromium, focusing Next page and repeating key-down
   without releasing Enter at 350 ms intervals produced `patrol-path` →
   `the-stones` → `turns-to-go` → `the-flicker` → `head-shake`. Suppress
   repeated Enter/Space activation while preserving normal keyboard button
   use. The 250 ms time guard alone does not require a fresh press.

## Canon, character and transition checks

- The prose does not reintroduce enchanted sleep, the lamp order, a spoken
  “Sleep,” Rowan's bad knees, the letter, or an explanation of the rune stone.
- Fern is restless and still remembers Bracken; Rowan's practical concern
  and private belief support their established relationship without explaining
  Redrock or assigning a new cause to Bracken's death.
- Fern sits to report, the pair return to lit stones, Rowan takes the next
  night's watch, and only Rowan sees Fern leave at dawn. Kestrel is recommended
  rather than mandated; the teacher visit remains playable rather than filmed.
- The rune is recorded as possession without awarding the old equippable
  Focus Stone, a spell, stat changes, or a demonstrated magical effect.
- Skip and the last page share the same once-only handoff. A completed
  handoff survives save/reload and cannot relocate Fern a second time.
  An interrupted pending opening can replay; completion flags prevent an
  already finished opening from replaying.
- Development entry uses the `fern-opening/` storage namespace and is gated
  by `import.meta.env.DEV`. Ordinary campaign saves and production entry are
  not migrated into the playtest. Book completion/cancel disposes its loop
  and key listener.

## Evidence

`npx vitest run tests/cinematic.test.ts tests/fernOpening.test.ts`: 24 tests
passed. Independently reproduced held-Enter behavior in Chromium against the
running development preview. These checks do not establish that later
campaign text has completed the abandoned-sleep rewrite; the shot document
already states that limitation honestly.

Re-review pending the two revisions above.

## Re-review — both findings resolved

Re-read the revised world-state overlay and capture-phase keyboard handler.
The overlay removes only Windward's obsolete surface-entry prerequisites
for the explicit `opening:fernDawn` journey. It does not change the shared
map definition, grant mountain/region/legacy milestones, or bypass Twitch's
local access task. The fresh-state route test walks to Windward, checks
the still-closed local passage, settles the actual courier reward table,
and establishes Kestrel reachability and Gale eligibility. It is an access
test, not a claim that the lesson's difficulty has been playtested.

Independently reproduced the original Enter sequence after the fix: one
press advanced `patrol-path` to `the-stones`, then three repeated key-downs
left it there. Releasing and pressing again advanced normally. Repeated
Space did not turn pages while held; release activated the button once.
The capture listener is removed with the same capture option on disposal.

The first full browser rerun was interrupted by a concurrent Vite hot
reload; the next exposed a test-readiness race after preview navigation.
The harness now waits for the persisted dawn flag, not merely an initially
closed dialog before application startup. A stable final rerun passed:

- Skip, isolated ordinary-save preservation, walking and reload.
- All 30 pages versus Skip producing identical saved state.
- 393 × 852 browser touch viewport, Previous, Replay, Skip, 44 px controls,
  no horizontal overflow, and preview-to-dawn handoff.
- Held Enter protection and a fresh activation after key release.
- Reduced-motion still presentation and accessible image descriptions.

No browser errors were recorded. Results and screenshots from this review
are in `/tmp/fern-opening-independent-review-final`. The independent
focused unit run passed 39 tests across cinematic, Fern opening and world
tests. Actual native/iPhone cinematic validation is not implied.

The revised `WORLD_BIBLE.md` correctly distinguishes accepted opening
decisions, held voice/backstory choices, proposed continuation details and
legacy implementation. It does not restore sleep, bad knees, an explained
rune power, a mandatory first school, or the rejected shared order history.
It correctly defers the other-hero opening adaptations and native scene port.

**Closing verdict:** no blocking canon, voice, clarity, save/skip/reload or
first-route issue remains within this isolated opening pass. Later no-sleep
campaign adaptation and lesson-feel review remain separate work.
