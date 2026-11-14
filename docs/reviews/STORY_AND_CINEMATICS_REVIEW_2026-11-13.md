# Latest story and cinematic critique

Review date: 13 November 2026. Reviewed GetPutTaco at `f67b8beaa5c5c7a64dc1fcc611cf0d220e524a99` (8 November). This review changes no story, lore, game code or author decisions.

## Verdict

The rebuilt opening has a better emotional center than the older campaign: Fern wants adventure, Rowan trusts him, and their shared loss complicates Rowan's decision to send him away. The stones failing and then appearing normal is an effective mystery. Keep those strengths.

The project does not yet have a coherent current reference for that story. The decision log has moved beyond the bible, retelling, plans and playable campaign. Removing enchanted sleep affects the central conflict, both underground bosses and the ending; it cannot be handled as an opening-only edit.

The cinematic work is a useful illustrated prototype. Its staging has specific strengths, but its script still reads too often like prose pasted below moving sprites. It is also incomplete against the newly approved dawn handoff.

## Scope and limits

Read the latest author decisions, world bible, full-story retelling, opening sample and shot list; inspected the cinematic data, timing model, renderer, preview and tests. Also checked the story arc, hometown/progression references, current first-half and continuation scene data, and relevant existing review/plan material. The large A–D plans were checked for their stated role and conflicts, not exhaustively re-reviewed line by line.

This is a document and source-staging critique. The execution environment failed, and the connected GitHub tools could not supply the repository's PNG contact sheet as a viewable image. I did not run the preview, watch motion, listen to sound or test an iPhone build. Findings about wording, scene coverage and keyframes are source-confirmed; palette, final composition, motion quality and device readability still require direct visual review. Existing tests were inspected, not run.

Authority: [AUTHOR_DECISIONS.md](../story-plans/AUTHOR_DECISIONS.md) overrides older drafts where it explicitly changes them. Suggestions below are recommendations, not new approvals.

## 1. Story and world bible

### S01 — Blocking: the reference bible contradicts accepted decisions

[WORLD_BIBLE.md](../WORLD_BIBLE.md) still calls spreading sleep the established spine (§2), makes Hareguy a sleeper (§5), protects Rowan's bad knees (WB-C16), and retains “Ves, en.” as an unresolved phrase (WB-Q07).

The later decision log removes enchanted sleep, makes Hareguy awake, makes Rowan the watch captain with emotional rather than physical limits, and removes the foreign phrase. It also replaces Rowan's well as the first-spell route. These are explicit changes, not interpretations for the reviewer to choose between.

**Fix:** publish a revised bible with a clear current-through date and decision-log link. Replace conflicting summaries, profiles, continuity rules, artifact descriptions and ending assumptions together. Mark the original edition as historical. Preserve still-valid geography, spell distinctions and approved encounter order.

**Done when:** a writer following only the current bible cannot accidentally restore sleepers, bad knees, the lamp order, Rowan's compulsory teaching reward or the untranslated phrase.

### S02 — Blocking: removing sleep leaves major plot causes and resolutions without a replacement

[STORY_RETOLD.md](../story-plans/STORY_RETOLD.md), the bible and [campaignStory.ts](../../src/data/campaignStory.ts) still depend on sleepers: Odile's evacuation, Irdrath's protective confinement, the Lishal's imposed sleep, Hareguy's stake and the recovery breakfast. The old ending's waking people is no longer an answer to the approved crisis.

**Fix:** write a short causal outline before polishing more dialogue. Establish what the stones protect, what their failure threatens, what the voice gains, what defeating the Wyrm genuinely restores, why the danger continues, and what the final victory changes. Distinguish mysteries withheld from players from answers the writer has not decided. Choose fresh motives for affected encounters; do not simply replace every occurrence of “sleep” with a new affliction.

Keep the approved major encounter order and midpoint false victory unless the author changes them. The Wyrm's ordinary rest after defeat is distinct from an abandoned enchanted-sleep epidemic.

**Done when:** each boss has a concrete present-tense conflict, and both victories have understandable consequences without anyone needing an enchanted sleeper.

### S03 — High: the decision log contains superseded instructions without reliable navigation

Round 4 still specifies Quake at Rowan's well and a letter before leaving town. Round 6 changes the first teacher to Dorn. Later Round 7 recommends Kestrel, preserves player choice, and puts the letter after the played trip and return. There are two sections called Round 7. Earlier Bracken/Rowan guilt wording also differs from the later instruction not to state Rowan's explanation outright.

**Fix:** retain history, but give decisions stable IDs and explicit “superseded by” links. Put a short current-state summary at the top. Record the letter's current availability after returning from whichever first teacher the player chose; do not silently require Kestrel's lesson if free choice remains intended.

The newest instruction is a recommendation to visit Kestrel, not permission to force Wind on every player.

### S04 — High: four selectable heroes are no longer covered by the new opening

The approved four-home arrangement remains in [HOMETOWNS.md](../HOMETOWNS.md), while the new sample and cinematic hard-code Fern, Mossvale, Bracken and a patrol to Mossvale's uniquely connected stone circle.

This is an uncovered adaptation requirement, not evidence that the other three heroes have been canceled.

**Fix:** create a compact table for each hero: home, role, reason to witness/report the disturbance, relationship to Rowan, departure motivation and first route. Share the main journey and familiar cast; do not automatically give everyone Fern's father or move mentors and the sanctuary. Decide which opening material is shared and which is specific before duplicating cinematics.

### S05 — High: the opening's secrecy needs a character reason and a practical consequence

The latest decisions have Rowan believe Fern, keep the incident from the watch, add a dedicated watch and send Fern away quietly. That can reveal Rowan's protective instincts and fear. Without a motive the audience can infer, it can also look like a captain concealing a serious problem while sending an untrained dependent to deal with it.

**Fix:** preserve the approved quiet departure, but make Rowan's immediate plan intelligible through his orders and behavior. Distinguish what he knows, suspects and is withholding. Let a later consequence test that decision. Do not restore bad knees as a convenient excuse or explain Bracken's death at the doorway.

Because the author deliberately delays the stakes, the teachers should provide concrete evidence of danger as the player reaches them. Their scenes should advance understanding, not repeat only that something felt wrong.

### S06 — Medium: character material is improving, but some proposed arcs remain too schematic

Fern's simultaneous excitement and grief is useful complexity. Rowan choosing duty over either son, Hareguy's independent ambition and the Redrock rescue can form a strong family thread. Keep Hareguy's hair-styling ambition meaningful rather than treating his name or vocation as his whole character. His later gift should not imply that Rowan was right to value him only for magical usefulness.

Vesper's proposed wish to be heard is understandable, but repeated “wait,” “turn,” “voice” and “hear me” lines risk making every scene state the same theme. Fennick's twelve children and that motive are explicitly held decisions.

**Fix:** retain them as alternatives. If adopted, give Vesper distinct immediate objectives and observable choices before the final refusal. Let Fennick's listening be visible in behavior without making one missed conversation the complete cause of Vesper's harm. Maintain Vesper's agency and the victims' right not to forgive.

### S07 — Medium: mystery devices need planned payoffs without premature exposition

The rune stone is deliberately unexplained in the opening. Kestrel's uncertainty is accepted. That is not a defect by itself. It becomes weak if several mentors merely say to keep it safe without changing the player's understanding.

**Fix:** maintain a private clue/payoff ledger: what each appearance adds, what the player can infer and where the answer matters. Resolve the voice's writer-facing nature before designing its final containment rules. The decision log leaves the voice choice held; the plans' “voice does not lie” rule should remain a proposal unless separately approved. Do not restore the rejected Lamplighter history to fill the gap.

## 2. Cinematics and opening prose

### C01 — High: the implemented scene ends before the approved handoff

[openingCinematic.ts](../../src/data/openingCinematic.ts) contains 23 shots, ending with the return down the hill and the bat joke. The latest decision specifies illustrated scenes through Fern slipping out at dawn, then player control at the north-road turning.

**Fix:** complete the approved connective beats: Rowan's response/watch arrangements, rune-stone handoff and quiet dawn departure. Then return control at the specified turning. Keep the road, Twitch, the first lesson, walk home and letter playable. Do not turn the entire first teacher visit into another film.

The current preview is explicitly development-only and separate from the campaign. [OPENING_SHOTS.md](../story-plans/cinematics/OPENING_SHOTS.md) says so, and the author has deferred iPhone scenes until the web version is settled. That deferral is intentional; do not describe this as a shipped native cinematic.

### C02 — High: moving pictures and paragraphs compete instead of dividing the storytelling

The strongest visual events are already staged: the flicker, sequential lights going out, Fern rushing in muddy, sitting by the fire, and discovering the stones restored. Yet the text narrates those same actions, repeats the color sequence during Fern's report and adds internal explanations to mostly static two-shots.

The memory page tells the friendship and impending-fatherhood story while its two actors merely stand and turn toward each other. The picture does not yet carry the specific information the narration claims.

**Fix:** distinguish the prose reading version from the production scene script. Let animation show visible actions; keep words for speech, essential context and interiority worth preserving. Keep selected literary narration—the tome should still feel like a book. Shorten the report to what Rowan needs to decide, rather than recounting the whole scene the player just saw. Either stage a specific memory action or reserve that history for a later scene where it matters.

### C03 — Medium: the sample needs a consistent sentence-level edit

Concrete issues in [OPENING_SAMPLE.md](../story-plans/samples/OPENING_SAMPLE.md):

| Passage                                                     | Problem                                                                          | Recommended treatment                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Opening “You followed…” then “There he stood…”              | Second person abruptly becomes third person.                                     | Choose a consistent narrator for the book.                                               |
| “Illuminating the night with their soft rainbow of colors.” | A detached participial fragment after a cumbersome explanation of ancient magic. | Attach it cleanly or let the lit stones supply the image.                                |
| “A role he took over because Bracken…”                      | A fragment following a tenure calculation that interrupts the emergency.         | Fold the essential relationship into a natural sentence; move service history elsewhere. |
| “Rowan asks”; “Fern stumbles”; “Rowan hesitates”            | Unmotivated switches from past into present tense.                               | Use the same narrative tense throughout.                                                 |
| “Rowan hesitates, the lad's face is white…”                 | Comma splice plus mixed tenses in one sentence.                                  | Separate the action from the observation and retain only what the image cannot show.     |
| “they stopped glowing!!!”                                   | Punctuation is doing the work of performance.                                    | Use restrained punctuation and the actor's entrance to carry urgency.                    |
| Rowan's “I know you. And your tells…” explanation           | Repeats the stronger, shorter “I know” that precedes it.                         | Preserve reassurance; reduce the explanation of why he believes Fern.                    |

The “Sit. Breathe. Start from the beginning” exchange works because it expresses care through an immediate action. Preserve that directness. The bat joke can retain their familiarity, but its repeated setup should not crowd out the mystery.

These are editing recommendations, not authorization to replace the author's script verbatim during this review.

### C04 — Medium: some keyframes contradict the intended performance

In `back-up-the-hill`, Fern is left of Rowan (x146 versus x160) but glances left, away from him, while the text says he is looking at Rowan. This is a concrete blocking mismatch.

Props and scenery are drawn before every actor; only actors are mutually depth-sorted. That creates a rendering risk when later staging requires a character to pass behind a tree, stone or chair. It is not proof of a visible defect in the current frames.

**Fix:** correct Fern's glance toward Rowan, then review entrances, exits, sitting, held props and eyelines against the words. Introduce shared depth ordering only where a demonstrated shot requires it. Visually check light falloff and dark-scene legibility before approving the art.

### C05 — Medium: the preview verifies animation, not the intended book experience

[cinematicPreview.ts](../../src/ui/cinematicPreview.ts) exposes whole paragraphs immediately and starts each animation at once. Long dialogue pages become static while the reader continues; early Next input can also skip a key visual event. The canvas, words and debug controls are not the requested in-world tome.

The shot durations total 85.6 seconds, but pages advance manually. That is an animation total, not the opening's duration or an enforced reading deadline.

**Fix:** keep debug controls in the preview. For the actual tome, design short readable beats, clear speaker/portrait treatment, unobtrusive navigation, replay, reduced motion and safe skip. Preserve the player's reading pace. Ensure skipping commits required outcomes once and returning from the book restores play cleanly. Test on iPhone after the desktop scenes are approved, respecting the author's platform order.

### C06 — Medium: production documents and tests can preserve the wrong thing

The shot list says Fern does not sit and lists sitting among removed effects. The latest decision, sample, sprite keyframes and seated-pose test say he does sit. The sample's later draft still contains sleeping houses, and its “What to judge” notes retain unresolved Bracken details that have since been decided.

The cinematic test proves that its text matches the sample. That is useful fidelity protection, but it also faithfully preserves tense errors and obsolete assumptions if the sample is stale.

**Fix:** synchronize the sample, shot list and implemented shot IDs; clearly archive superseded sections. Keep the fidelity test, adding checks for approved scene coverage and skip/state behavior when integrated. Use visual review and editorial judgment for acting, prose and readability; string equality cannot certify them.

## 3. Recommended correction order

1. **Reconcile the reference set.** Current decision summary, revised bible, retired obsolete instructions and a decision-to-document checklist.
2. **Repair the full-story cause and effect.** A short no-sleep synopsis, boss motives, voice rules, Wyrm gain and final resolution. Surface still-open author decisions together rather than interrupting every sentence edit.
3. **Settle hero coverage and scene ownership.** Four openings, fixed geography, chosen first teacher, then prose script versus illustrated script.
4. **Finish and edit the web opening.** Approved dawn handoff, economical report, clean tense/viewpoint, corrected eyelines and current shot list.
5. **Review the actual presentation.** Watch the web sequence at normal pace and with rapid navigation; then test the approved version in the iPhone tome. Review movement, darkness, text size, speaker clarity, sound, skip and return to play.

Do not build more late-game cinematics on the abandoned sleep premise. Do not discard the new Fern/Rowan opening simply because the old reference set has fallen behind it.

## 4. Acceptance for the next review

- One clearly identified current bible; historical editions are labeled.
- Every author decision above is reflected or explicitly marked pending in affected documents.
- A complete synopsis explains the crisis and ending without enchanted sleepers.
- Player-selected first-school order survives the Kestrel recommendation.
- All four heroes have an internally consistent opening plan.
- Web shots reach the approved dawn control point without filming the playable first lesson.
- Prose has consistent viewpoint/tense and no repeated action recaps without a narrative purpose.
- Shot list, script and keyframes agree; full-sequence visual and touch review is recorded separately from source tests.
