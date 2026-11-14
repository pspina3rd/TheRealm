# Fern opening — editing and delivery

14 November 2026. Implements the author's request to edit the cinematic writing and try the completed dawn departure, focusing on Fern. Base: GetPutTaco `3a3a7d0`.

## What changed

- Replaced the long opening paragraphs with 30 short illustrated beats and 274 visible words. Narration supplies context; labelled dialogue and accessible image descriptions remain separate. Silent beats let the failing stones, running, sitting and return climb carry the action.
- Removed the static memory/exposition page and the report's second recital of the seven colors. Preserved Bracken's importance, Rowan believing Fern, the practical care at the chair and the familiar bat joke. Bracken's rescue and Rowan's guilt are not explained prematurely.
- Added the next morning's watch arrangements, private rune-stone handoff, Kestrel recommendation, Rowan's first watch and the quiet dawn departure. The letter and teacher visit are not filmed.
- Added a reusable illustrated web book with Previous, Replay, safe Skip, labelled speech, reduced-motion stills and accessible scene descriptions. Held Enter/Space cannot repeatedly turn pages.
- Reading through and skipping commit the same once-only handoff to the playable north road. Fern has zero spells. Possession of the unexplained rune is recorded without equipping the older gameplay-altering Focus Stone.
- Fresh Fern can enter Windward without falsely receiving the old mountain gate or prior-region milestones. Twitch's actual regional task still opens Kestrel's local approach. Kestrel is recommended, not an awarded first spell.
- Replaced the obsolete bible with the current approved reference, preserved its earlier edition as historical, and marked related legacy documents. No new voice identity, Lamplighter history or replacement late-game lore was approved or built.

## Try it

Run `npm run dev`, then visit `http://localhost:5173/?opening=fern`. This explicit development mode uses a separate `fern-opening/` save namespace. It cannot replace ordinary campaign saves. An interrupted opening restarts; a completed one resumes the road position.

`http://localhost:5173/cinematic.html` opens the book alone. Walk onward or Skip enters the isolated playable road. The [script](../story-plans/samples/OPENING_SAMPLE.md), [shot list](../story-plans/cinematics/OPENING_SHOTS.md) and refreshed [30-shot contact sheet](../story-plans/cinematics/opening-preview-contact-sheet.png) are the review surfaces.

## Review loop

[Independent review](FERN_OPENING_INDEPENDENT_REVIEW.md) initially returned the inaccessible Windward route and repeated held-Enter activation. Both were corrected, tested and independently re-reviewed. The final review found no blocking issue within this isolated opening scope.

The first browser-harness runs also exposed test assumptions: hidden dialog contents were still counted after completion, and a newly navigated phone page could have an initially closed dialog before its app/save finished loading. The checks now require a visible book or the persisted dawn milestone as appropriate. The independent re-review confirmed these were harness-readiness issues, not failures of the saved handoff.

## Validation

- Full unit suite: 1,806 passed, 27 skipped.
- Lint, typecheck, repository formatting and production web build passed.
- Focused tests cover script fidelity, seated/report/eyeline staging, stone sequence, once-only save outcomes, reload, a fresh walked route into Windward, retained courier access challenge and first-level Gale eligibility.
- Browser harness: all 30 pages versus Skip produce identical saved outcomes; normal save stays intact; movement persists on reload; Previous/Replay/touch Skip work at 393 × 852; controls are at least 44px tall; no horizontal overflow; held Enter requires a release; reduced motion and accessible image descriptions work. No browser errors.
- Independent review separately checked held Enter and Space, phone preview-to-road transition and current bible canon boundaries, then reran the browser harness successfully.
- Primary agent visually inspected the report page, phone dawn page and refreshed contact sheet. Captures are frames of the actual browser renderer, not replacement illustrations.
- After regenerating the shared native engine bundle, 55 native bridge/world/tome-related tests passed and all 86 native visuals verified. Regeneration is required by the existing native CI contract when shared rules change; it does not port these cinematics into the iPhone UI.

Repeat the focused browser check with a running dev server: `node tools/check-fern-opening.mjs /path/to/screenshots`. It uses installed Chromium at `/usr/bin/chromium`, overridable with `CHROMIUM_PATH`; `PLAYTEST_URL` overrides the local server address.

## Boundaries and remaining work

This is a desktop/web author-review sequence, as requested by the existing platform order. The ordinary campaign entry and native opening still use the earlier implementation. Later campaign scenes retain superseded sleep-based material and need their own coherent rewrite; reaching the first mentor does not certify that campaign adaptation. Other hero openings are deferred while Fern is the focus. Voice identity, revised underground conflicts and final recovery remain explicit story decisions. This pass does not claim an Apple-device cinematic review or TestFlight delivery.
