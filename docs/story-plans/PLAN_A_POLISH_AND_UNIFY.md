# Plan A — Polish and unify: execution plan

Execution plan for Plan A in [STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md)
(findings F3, F5, F7, F8 and F10), revised after [PLANS_REVIEW.md](PLANS_REVIEW.md). Passage IDs
(`SR-…`) refer to [WORLD_BIBLE_STORY_READER.md](../WORLD_BIBLE_STORY_READER.md). Check and
decision IDs (`WB-…`) refer to [WORLD_BIBLE.md](../WORLD_BIBLE.md). Line numbers are for
`GetPutTaco` on 3 November 2026.

This is a plan. It changes no game text, data or tests. Every drafted line below is a proposal
for the author, Philip Spina.

## 1. Goal

Make the story read as one confident work, in one register, with plain words and no writer's
notes. After review, Plan A owns **how the text sounds and reads**, the hygiene fixes and the
tests that keep the text clean. Plans B and D own most new **content** (conflicts C-1 to C-3).

**Done when** a cold reader cannot tell which half was written first, every player-facing string
passes the text tests in section 13, and the shared answer-point lines (C-1) are in one voice.

## 2. Assumptions

- The second-half register (`campaignStory.ts`) is the target voice for every plan's text.
- Pronouns (C-4, C-5): Vesper, Ketter, the Lishal, Ares and Vex use they/them. Fennick and Lance
  use he/him. Fennick's he/him is already in the game (`campaignStory.ts:46`, "His hand stays on
  the iron").
- Plan A itself adds, removes or reorders no beats. Beats that Plan D adds or moves are Plan D's,
  and the native book is re-indexed once for all plans (review section 6, step 6).
- `docs/STORY.md` is the author's script, kept exact and excluded from Prettier. Tests pin it to
  the game (`tests/script.test.ts`). Every first-half change needs the author's approval (A-D1)
  and a matching `STORY.md` edit.
- Where a decision in another plan is still open (PD-D02, PD-D03, SQR-D02), Plan A's fix is
  written so it works either way, and the dependency is named.
- Lines that touch lore Plan B decides are marked **[B]**.

## 3. Scope and non-goals

| Plan A owns                                                                 | Owned elsewhere (cross-reference)                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| All F7 fixes and similar slips (section 6)                                  | Vesper's first-half lines: content by Plan D §5.3 (C-2)                      |
| The voice guide and register map (section 7), applied to every plan's text  | Visions 1–3 and the lair: content by Plan B §5 (C-3)                         |
| Register edits and the line budget for Vesper's lines; vision mechanics     | Placement of the hero answer points: Plan D §3.1, §4 (C-1)                   |
| The words of all twenty answer-point class lines, in one pass (C-1)         | The secret history and clue ledger (Plan B); attitude effects (Plan C)       |
| The jargon glossary, applied to every plan (C-15)                           | `bellRelief` restructure into `hollowsEscaped`, if PD-D03 is approved (C-16) |
| Pronouns (C-4, C-5); the story heart; text tests; reader check in CI (F-30) | Renaming Hareguy and Steve (SQR-D04); new quests, maps, encounters, balance  |

## 4. Dependencies on other plans

| Plan | Plan A needs                                                                     | Plan A gives                                                                |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| B    | Final single line per vision and the lair text (§5); the R9 fact for one confide | Register edits; one-line-per-vision mechanics; the lair stage (section 8.2) |
| C    | Player text on the rite card, run through the glossary (F-11)                    | Glossary and `storyText` test covering C's strings                          |
| D    | PD-D02 ("Master"), PD-D03 (pacing) and the answer-point table                    | Register and budget for D's Vesper lines; words for the twenty class lines  |

Order (review section 6): Plan A hygiene first (M1), then one joint text pass after Plan D's
structure lands, so text is written once.

## 5. Problems this plan solves

### P3. The two halves sound like different games

**Root cause.** The first-half antagonist text came from the team's original script: cosmic
nouns, insults, light/dark imagery. The second half was written later to the World Bible's
writing standard (section 10). No voice guide joined them (review F3). Two mechanical causes make
it worse: 5 of Vesper's 32 lines can never be spoken (section 8.1), and visions and the lair share
one rotation counter (`src/game/story.ts:89-91`, `:124-127`), so a normal run sees `vision1.01`,
`vision2.02`, `vision3.01` and the lair's second line, which has no stage direction.

**Fixed by** WS2 (voice guide, section 7), register review of Plan D's and Plan B's drafts
(sections 8.1–8.2), and tasks 3.4–3.5 (one line per vision, a separate lair key).

**Affected.** `SR-vesper.*` (`story.ts:97-162`), `SR-vision1.01`–`SR-vision3.02`
(`story.ts:31-52`), `SR-prelude-moonWyrm.01`–`.02` (`story.ts:60-61`).

| Before                                                                                     | After (owner)                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `"You're blocking my light, surface-bug. The Wyrm shifts below; your footsteps annoy it."` | `*A traveller in a dark cloak is stacking stones on the milestone.* "You came from Mossvale. Nobody walks this road on purpose."` (D §5.3) |
| `"I am the silence between stars. Show me why your brief life deserves the dawn."`         | `"You came down. Good. This one is very old and very tired. It will not let go of the light. Neither will I."` (B §5, A's stage)           |

**Acceptance.** Blind sort (section 13.4): mean accuracy 65% or lower (chance is 50%). Every line
passes the register map for its speaker.

**Test.** `tests/storyText.test.ts` › "no stock dark-fantasy phrases", "Vesper's lines fit the
budget and every cell is reachable"; `tests/story.test.ts` › "the lair speaks its first line on
the first visit".

### P4 (hero part). The four hero hesitations are never resolved

**Root cause.** Class lines exist only in the opening and the Refusal (`story.ts:232-240`,
`:267-273`). Campaign scenes use the helper `say('hero', …)` (`campaignStory.ts:9-13`), which has
no class field, so every later hero line is the generic "Chosen hero" text (review F5).

**Fixed by** C-1: five answer points placed by Plan D, words by Plan A in one pass (section 9).

**Affected.** `rootwaysRecord`, `vesperAcceptance` (new beat after `-12`), `campaignReturn`,
`malificatFallen` (Plan D §6.4, §7.1–7.3) and `SR-mossvaleRecovery-05` (`campaignStory.ts:842`,
Plan A's draft). Setups at `SR-refusal-01` (`story.ts:267-273`).

| Hero | Before (`SR-mossvaleRecovery-05`)                       | After                                                                                       |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ares | `"There's a cart going to Brightwater in the morning."` | `There's a cart going to Brightwater in the morning. I didn't read that anywhere. I asked.` |
| Vex  | `"There's a cart going to Brightwater in the morning."` | `There's a cart going to Brightwater in the morning. I've paid the driver. Don't argue.`    |

**Acceptance.** Each hero's five lines move from doubt to a changed habit. A reader shown one
class's Refusal line and its five answers can name the hesitation. No line names the hesitation
outright or explains the monomyth (WB section 7). No catchphrase appears more than once in a scene
(F-01: Vex's "not my problem" at most once per scene).

**Test.** `tests/storyText.test.ts` › "every answer point gives four distinct class lines".

### P5a. Writer's notes in player-facing text

**Root cause.** `CHAPTER_END` was imported word for word from the author's script, including
narration written as notes to a reader. Stage text outside `*…*` is shown as narration, so the
notes reached the player. The old map name "Sunken Ruins" survived a map rename in three places.

**Fixed by** WS1 tasks 1.1–1.4 (section 6.1).

**Affected.** `SR-chapterEnd-02` to `-04` (`story.ts:331-341`), `SR-ward-after-wyrm.02`
(`story.ts:363`), `maps.ts:70`, `src/ui/app.ts:1068`.

| Before                                                                 | After                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `The Sunken Ruins' seal then glows, distracting everyone. *Across …*`  | `*Behind them, the old ward over the stair flares silver. The watch turn to stare.*` |
| `Below the ward, a bell rings once. It will open in the next chapter.` | `Below the ward, a bell rings once, very far down.`                                  |

**Acceptance.** No scene stage text has words outside `*…*` or quotes. No player string contains
"Sunken Ruins", "next chapter", "has the last word" or "Suddenly".

**Test.** `tests/storyText.test.ts` › "stage text is staged", "no obsolete names", "no
out-of-fiction phrasing".

### P5b. The pronoun slip: Fennick calls Vesper "the boy"

**Root cause.** The first-half hook was written before Vesper's pronouns were set; the
continuation then used they/them everywhere else (WB-Q01). Fennick's own pronoun also drifts:
`campaignStory.ts:335` and `:721` use "They" next to other they/them characters, and `:816` reads
"Fennick withdraws their hand" beside Vesper's "their".

**Fixed by** WS1 tasks 1.5–1.6 and one decision, A-D3 (merges PD-D05, C-4).

**Affected.** `SR-chapterEnd-06` (`story.ts:349`), `SR-bellRelief-06` (`campaignStory.ts:335`),
`SR-campaignRite-15` (`:721`), `SR-campaignRecovery-03` (`:816`); WB section 5 line 367;
`tests/scenes.test.ts:238`.

| Before                                                        | After                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `"…I taught the boy who made them to walk."`                  | `"…I taught the child who made them to walk."`                      |
| `*Fennick crouches beside Ketter. They replace a wedge …*`    | `*Fennick crouches beside Ketter. Together they replace a wedge …*` |
| `*Fennick withdraws their hand and sets a cup within reach.*` | `*Fennick draws his hand back and sets a cup within reach.*`        |

**Acceptance.** Every passage in the pronoun table (section 13.2) uses its referent's pronoun.

**Test.** `tests/storyText.test.ts` › "pronouns match the pinned passages".

### P5c. Technical terms young players will not follow

**Root cause.** The continuation describes the underground as an engineer would: branches,
relays, returns, circuits, stations, sequences. "Return" has three meanings (the bell cord, the
missing piece of the ward circle, the road home). The World Bible flags the terms (section 10)
but gives no plain alternatives, and the new drafts in Plans C and D reuse them (F-11).

**Fixed by** WS5: the glossary (section 10), applied to all plans' player text (C-15).

**Affected.** Every occurrence in section 10, mainly `SR-ketterRescued-06/-08/-11`,
`SR-vesperRetreated-02`, `SR-bellRelief-01/-05/-07`, `SR-lishalSilenced-03` and
`SR-campaignRite-01/-10/-21/-23/-24`, plus the new-text rows in section 10.2.

| Before (`SR-ketterRescued-06`)                                                                                                      | After                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"Upper branch carries the voice. Lower one feeds our lamps. You'll see the same marks on the handles. Leave the lower one alone."` | `"Two pipes. The top one carries the voice. The bottom one feeds our lamps. Same marks on both levers, so look twice. Leave the lamp pipe alone."` |

**Acceptance.** In the combined playtest, two readers aged 8–11 can say what the hero must close
and what must stay on, in their own words. Each new term names a thing a child can picture.

**Test.** `tests/storyText.test.ts` › "story text uses the glossary terms".

## 6. F7 complete fix list (WS1)

### 6.1 Leftover authoring text, obsolete names and pronouns

| #   | Passage / place                              | Source                                 | Current                                                                                                          | Proposed replacement                                                                                                                                              |
| --- | -------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `SR-chapterEnd-02`                           | `story.ts:331-332`                     | `After the Moon Wyrm falls, Captain Vale has the last word:` + `"You came back, the realm owes you; so do I..."` | Stage `*Captain Vale meets you at the cave mouth and grips your arm.*` Line `"You came back. The realm owes you, and so do I."`                                   |
| 1.2 | `SR-chapterEnd-03`                           | `story.ts:337`                         | `The Sunken Ruins' seal then glows, distracting everyone. *Across Sevenstones, …*`                               | `*Behind them, the old ward over the stair flares silver. The watch turn to stare.*`                                                                              |
| 1.3 | `SR-chapterEnd-04`                           | `story.ts:341`                         | `Suddenly a voice is heard rumbling through the breeze. *It's the voice …*`                                      | Stage `*The wind drops. The grass lies flat and every lamp gutters. It is the voice from every vision, but there is no Wyrm now to carry it.*` Words: B's, below. |
| 1.4 | `SR-ward-after-wyrm.02`                      | `story.ts:363`                         | `Below the ward, a bell rings once. It will open in the next chapter.`                                           | `Below the ward, a bell rings once, very far down.`                                                                                                               |
| 1.4 | Locked warp text                             | `maps.ts:70`                           | `The Sunken Ruins are sealed by an ancient ward.`                                                                | `An old ward seals the stair. It hums when you come close.`                                                                                                       |
| 1.4 | Toast after the chapter summary              | `src/ui/app.ts:1068`                   | `The Sunken Ruins' ward glows`                                                                                   | `The old ward glows`, moved to `story.ts` as `WARD_TOAST` so the text test can see it                                                                             |
| 1.5 | `SR-chapterEnd-06`                           | `story.ts:349`                         | `I taught the boy who made them to walk.`                                                                        | `I taught the child who made them to walk.`                                                                                                                       |
| 1.6 | `SR-bellRelief-06`                           | `campaignStory.ts:335`                 | `They wanted measurements we couldn't get …`                                                                     | `He wanted measurements we couldn't get …` (moves to D's `hollowsEscaped` if PD-D03 is approved, C-16)                                                            |
| 1.6 | `SR-campaignRite-15`                         | `campaignStory.ts:721`                 | `*Fennick crouches beside Ketter. They replace a wedge and reseat the frame.*`                                   | `*Fennick crouches beside Ketter. Together they replace a wedge and reseat the frame.*` (F-24)                                                                    |
| 1.6 | `SR-campaignRecovery-03`                     | `campaignStory.ts:816`                 | `*Fennick withdraws their hand and sets a cup within reach.*`                                                    | `*Fennick draws his hand back and sets a cup within reach.*` (Plan D §7.4 and Plan C may rewrite this scene; keep "his")                                          |
| 1.6 | WB section 5, Fennick                        | `WORLD_BIBLE.md:367`                   | `They need reliable evidence …`                                                                                  | `He needs reliable evidence …`                                                                                                                                    |
| 1.7 | `SR-malificatRisen-02/-04/-06/-08/-10` label | `tools/export-story-reader.mjs:67-79`  | Reader prints `**malificat**`. In game the label already reads "The Malificat" (`campaignEnemies.ts:207`).       | Add `ENEMIES` names to the exporter's `names` table. No game text changes.                                                                                        |
| 1.8 | `SR-prelude-moonWyrm.02`                     | `story.ts:61`, `src/game/story.ts:126` | Shown first in a normal run (shared counter), with no stage direction                                            | The lair rotates under its own key (task 3.5); content in section 8.2                                                                                             |
| 1.9 | Vesper's unreachable cells                   | `story.ts:113-117`, `:125-126`         | `confide.cold`, `confide.plain` ×2, `refuse.plain`, `refuse.warm` can never be spoken                            | Removed when Plan D's lines replace the table (section 8.1)                                                                                                       |

`SR-chapterEnd-04` words (C-3, Plan B §5): `"A good throat. Old, and very obedient. Let it sleep
its own sleep now. **I have others.**"` This changes the line pinned at
`tests/nativeTome.test.ts:76`.

Non-player hygiene in the same pass: rename the `STORY.md:405` heading and the
`tests/script.test.ts:44` constant to "The ward, after the Wyrm (map text)"; update comments at
`story.ts:360` and `src/game/ending.ts:17`. Leave save-migration names (`campaignFlags.ts:28` and
the version-7 tests) alone: they describe old saves, not the world.

### 6.2 Kept unless another decision changes them

- "End of Chapter One" (`story.ts:322`) and "Chapter One complete" (`src/ui/app.ts:1071`) are
  book chrome, like a chapter heading (A-D8).
- The NPC name "Vesper, Thrall of the Depths" (`npcs.ts:1118`) follows PD-D02. Plan A has no
  separate position.

### 6.3 Spelling for localisation (small, optional)

Player text mixes spellings: "traveler" (`story.ts:104`, `:160`; `npcs.ts:68`, `:353`, `:550`)
against "traveller" (`npcs.ts:485`, and Plan D's road intro); "colors" (`npcs.ts:562`, `:647`,
`:661`) against "colours" (`campaignStory.ts:452`); "gray" (`maps.ts:190`, `:236-244`) against
"grey" (`story.ts:310`, `mentors.ts:215`, `:243`). Pick one house spelling (A-D7), record it in
the World Bible's writing standard, and apply it to every plan's new text.

## 7. Voice guide (WS2)

Distilled from `archiveRefuge`, `irdrathTrial`, `ketterRescued`, `bellShift`, `vesperAcceptance`,
`rowanReturn` and `mossvaleRecovery`. Proposed as a new subsection of WB section 10. It applies to
all four plans' text (C-2, C-3).

### 7.1 Rules

1. **Say what you want from the person in front of you.** Every line asks, refuses, offers or
   orders something.
2. **Objects carry the feeling.** A packed bag, a cooling bowl, a rasp put down. Do not name the
   emotion.
3. **Notice the other person's last action.** "You took your time." "You found a way across."
4. **Short sentences.** Under 12 words a sentence and under 30 words a line.
5. **Questions over speeches.** "Has Pete been charging for the room?"
6. **Concrete nouns only.** No "the dark", "the deep", "the tide", "the void" or "the stars" as
   threats. Threat comes from a consequence the player can picture.
7. **One stage action per direction.** Directions describe something that can be drawn or
   animated. No narrator opinions and no "suddenly".
8. **One new term at a time,** introduced by an object the player sees (section 10).
9. **Translation-ready.** No puns, no English-only idioms, no trailing "…" except a real
   interruption (use an em dash), consistent pronouns and spelling.
10. **One catchphrase per scene.** A hero's Refusal words ("not my problem", "my post") can return,
    but only once in a scene.

### 7.2 Do and don't

| Don't (current first half)                                                                                               | Do (second-half model)                                                    | Rule |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---- |
| `"Away with you. Your blood soils the stone."`                                                                           | `"Keep it dry. I'll want the rest."`                                      | 1, 6 |
| `"You move with purpose. Pity it will all be swallowed by the moonless tide."`                                           | `"You took your time."`                                                   | 3, 6 |
| `"I was like you once—seeking glory in ancient places. The Wyrm showed me the true coldness of the world, and I bowed."` | `"You want me to go back with you. Carry a lamp. Wait for orders."`       | 2, 4 |
| `"Every breath you take on the surface draws air from my cavern."`                                                       | `"Sleep."` (`SR-opening-03`)                                              | 6    |
| `Suddenly a voice is heard rumbling through the breeze.`                                                                 | `*The frame passes between you. Vesper's fingers close around the rail.*` | 7    |

### 7.3 Register map

| Speaker                                 | Register                                                                                                 | Length      | Never                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| Vesper, before the Wyrm                 | Dry, observant rival. Amused questions, small contempt, pride, wanting to be noticed (D §3.2).           | 8–25 words  | Insults ("vermin", "meat"), cosmic threats, light/dark puns |
| Vesper, underground                     | Same voice, less amused. Short claims, reading, wanting the rest.                                        | 3–15 words  | Speeches about destiny                                      |
| Vesper as the Malificat                 | Same voice under strain. Questions turn to accusation ("What have you done?").                           | 3–12 words  | A new villain's diction                                     |
| The voice (visions, `chapterEnd`, rite) | Calm, patient, intimate. Offers rest. Notices the hero's work. Content and truth rules are B's (WB-C20). | 5–25 words  | Shouting, boasting, unexplained world physics               |
| The Wyrm (animal)                       | No words of its own. Shown through breath, weight and tiredness.                                         | Stage only  | Speech after the voice leaves it                            |
| The lair prelude                        | The voice speaking through a tired body; the stage shows the mismatch.                                   | 10–25 words | Settling who is guilty (WB-C09)                             |

## 8. First-half text: register, budget and mechanics (WS3)

Moods follow `src/game/attitude.ts:138-142`: **cold** (Hostile, Wary), **plain** (Neutral),
**warm** (Friendly, Devoted). A missing cell falls back (`src/game/lines.ts:19-23`). `confide` is
spoken only when Devoted (`attitude.ts:185-188`); `refuse` only when Hostile
(`src/game/encounter.ts:267-269`).

### 8.1 Vesper (content: Plan D §5.3)

Plan A's own drafts (N1–N13 in the first version) are withdrawn in favour of Plan D's per-stop
tables (C-2). Plan A keeps three jobs.

**Budget.** About 20 lines, at most 24 reachable variants. Each stop's `intro` has three distinct
moods, as `tests/attitude.test.ts:245-251` requires (12 lines). Each stop has one `confide`
(4 lines); one of them carries Plan B's R9 fact. `refuse`, `accept`, `decline`, `lose`, `win` and
`done` are shared (6 lines). Total 22. Plan D's current tables have per-stop `win` and `done`
(28 lines); trimming those to shared lines meets the budget.

**Cells.** No unreachable mood cells: `confide` is a plain string or warm-only, `refuse` is a
plain string or cold-only.

**Register notes on Plan D §5.3** (for the joint text pass):

| Line                                        | Note                                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| road `cold` / `plain`: "Mossvale sent you?" | Works on the web, which substitutes the home town in interaction text (`src/ui/app.ts:490`). Confirm the native path does too, or say "your village". |
| road `plain`: "A traveller in a dark cloak" | Follow the house spelling (A-D7).                                                                                                                     |
| ruins `done`: "It's my turn to be heard."   | Names the want outright (rule 2). Suggest `"Don't follow me down. It's my turn."`                                                                     |
| ridge and peaks `confide` **[B]**           | Fine in register. Final wording waits for Plan B (SQR-D02).                                                                                           |
| "Master"                                    | Plan A takes no position; PD-D02 decides. The text tests neither require nor ban it.                                                                  |

### 8.2 Visions and the lair (content: Plan B §5)

Plan A's vision drafts are withdrawn in favour of Plan B's (C-3). Plan A keeps the mechanics and
the register edit.

1. **One line per vision** (A-D5). A vision is shown once, and the shared counter
   (`src/game/story.ts:89-91`) means a second variant is mostly never seen. Plan B picks one line
   per vision from its §5, keeping one clue each.
2. **A separate lair key** (task 3.5), so the first visit shows the first-visit line.
3. **Register check.** Each line is under 30 words, has one stage action, and follows section 7.3.
   Two of Plan A's withdrawn lines read as finished (review, "Writing quality notes") and are
   offered to Plan B for vision 1 if they keep its clues: `"You mended a well today. That was
kind. Kind people tire first."`
4. **The lair**, agreed text (C-3), first visit: `*The serpent lies coiled around the
moon-crystal. Its breath is slow; its eye is half closed. The voice that comes out of it is far
too steady for so tired a body.* "You came down. Good. This one is very old and very tired. It
will not let go of the light. Neither will I."` Retry: Plan B's `SR-prelude-moonWyrm.02`.

The stage plants the midpoint reversal (`SR-wyrmFall-01`) without settling the Wyrm's guilt
(WB-C09).

## 9. Hero answer points (WS4)

### 9.1 The five points (placement: Plan D, C-1)

| #   | Scene and beat                                            | Stage of the arc | Draft owner of first version | Plan A action                                  |
| --- | --------------------------------------------------------- | ---------------- | ---------------------------- | ---------------------------------------------- |
| 1   | `rootwaysRecord`, after "No." (D §6.4)                    | Doubt            | D                            | Polish in the joint pass                       |
| 2   | `vesperAcceptance`, new beat after `-12` (D §7.1)         | The answer       | D                            | Polish; the only "not my problem" in the scene |
| 3   | `campaignReturn`, after "I should have gone up." (D §7.2) | Choice           | D                            | Polish                                         |
| 4   | `malificatFallen`, carrying Vesper out (D §7.3)           | Action           | D                            | Polish                                         |
| 5   | `SR-mossvaleRecovery-05` (`campaignStory.ts:842`)         | Changed habit    | A                            | Draft below                                    |

Plan A's first-version lines at `SR-vesperAcceptance-09` and `SR-campaignRite-20` are dropped
(C-1, F-01). Plan D's class lines at `malificatRisen`, `warrensLit` and `hollowsHush` are dropped
too, per C-1; that is Plan D's edit. One writer writes or polishes all twenty lines in one pass,
reading each class's five lines in a row.

Answer point 5, `SR-mossvaleRecovery-05` (fallback `"There's a cart going to Brightwater in the
morning."`):

| Class          | Line                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ranger (Fern)  | `There's a cart going to Brightwater in the morning. The houses here are waking. They don't need me watching.` |
| knight (Lance) | `There's a cart going to Brightwater in the morning. I'll walk beside it. The road is my post tomorrow.`       |
| mage (Ares)    | `There's a cart going to Brightwater in the morning. I didn't read that anywhere. I asked.`                    |
| rogue (Vex)    | `There's a cart going to Brightwater in the morning. I've paid the driver. Don't argue.`                       |

Polish notes on Plan D's drafts: at point 2, Vesper's rogue line ("Not your problem. Remember?")
and the hero's ("Not my problem…") count as one catchphrase exchange, so the rogue hero line in
point 3 must not repeat it ("You're not the one who took the deal" already avoids it). Keep each
line under 25 words.

### 9.2 Data shape for engineering

`SceneBeat` already has `classLines?: Readonly<Record<string, string>>` (`story.ts:176-177`). The
web runtime (`src/game/story.ts:297-298`), the native book (`src/native/tome.ts:426`) and the
reader export (`tools/export-story-reader.mjs:142-152`) prefer the class line and fall back to
`line`. Class lines are stored without quotes; the runtime adds them. They pass through
`hometownText`. Plan D's `hero({…}, stage?)` helper (D §6.3) is the one helper for all plans.

So the tests can find the points without guessing, export one table from `campaignStory.ts`:

```ts
/** Where each hero answers their Refusal (C-1). Each beat has class lines for every class. */
export const HERO_ANSWER_POINTS: readonly { scene: string; beat: number }[] = [
  { scene: 'rootwaysRecord', beat: 15 }, // indexes are filled in after Plan D's structure lands
  // … vesperAcceptance, campaignReturn, malificatFallen, mossvaleRecovery (beat 4, 0-based)
];
```

## 10. Jargon glossary (WS5, applies to every plan: C-15)

### 10.1 Existing text

| Term now                                                    | Replacement                                                          | Occurrences (file:line)                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| upper branch / voice branch                                 | the voice pipe                                                       | `campaignStory.ts:255`, `:263`, `:281` (scene title), `:288`; `campaignNpcs.ts:151`                                                                    |
| lower branch / lower one / lamp feed / feed                 | the lamp pipe                                                        | `campaignStory.ts:255`, `:263`, `:288`; `campaignNpcs.ts:151`; `campaignMaps.ts:221`                                                                   |
| branch feeding the great frame                              | the pipe that feeds the great frame                                  | `campaignStory.ts:452`                                                                                                                                 |
| relay, central relay, relay plan                            | the switch room, the switch-room plan                                | `campaignStory.ts:288`, `:332`, `:339`, `:483`, `:487`, `:549`; `campaignNpcs.ts:174`; `campaignMaps.ts:221`, `:295`; `campaignEnemies.ts:120`, `:181` |
| upper relay handle                                          | the voice-pipe lever                                                 | `campaignStory.ts:260`                                                                                                                                 |
| Relay Keeper, Relay Spark (enemy names)                     | Lever Keeper, Lever Spark (A-D6)                                     | `campaignEnemies.ts:104`, `:113`                                                                                                                       |
| lower return / return path / the return                     | the missing piece of the circle                                      | `campaignStory.ts:339`, `:403`, `:416`; `campaignNpcs.ts:174`, `:191`, `:192`, `:194`                                                                  |
| return procedure / procedure / recovered or copied sequence | Fennick's closing steps / the closing steps                          | `campaignStory.ts:487`, `:566`, `:655`, `:704`; `campaignNpcs.ts:191`, `:196`, `:236-238`, `:241`, `:245`                                              |
| test sequence                                               | the test                                                             | `campaignStory.ts:724`                                                                                                                                 |
| return cord / return bell / relief circuit / circuit        | the answer cord / the answer bell / a fresh cord                     | `campaignStory.ts:325`; `campaignNpcs.ts:156`, `:163`, `:165`; `campaignMaps.ts:258`                                                                   |
| other circuits                                              | the other lines                                                      | `campaignNpcs.ts:192`                                                                                                                                  |
| ring (ward), outer ring                                     | the circle, the outer circle                                         | `campaignStory.ts:707`, `:732`, `:740`, `:759`                                                                                                         |
| test ring / small ring                                      | the chalk circle                                                     | `campaignNpcs.ts:241`, `:242`, `:244`                                                                                                                  |
| station(s), station frames, outer station                   | the frames at the stones; someone at every stone                     | `campaignStory.ts:339`, `:609`, `:655`, `:737`, `:740`, `:764`, `:797`; `campaignNpcs.ts:194`, `:224`, `:244`, `:246`; `maps.ts:85`                    |
| inner ward                                                  | the ward chamber                                                     | `campaignStory.ts:740`, `:797`; `campaignNpcs.ts:236`, `:242`; `maps.ts:85`, `:88`; `campaignMaps.ts:341` (map name); `campaignEnemies.ts:227`         |
| ward (alone)                                                | Keep; defined at `SR-chapterEnd-03` as "the old ward over the stair" | `story.ts:337`, `:345`, `:349`, `:362-363`; `maps.ts:70`                                                                                               |
| vessel(s)                                                   | bearer(s), as `SR-archiveDrained-04` already says                    | `campaignStory.ts:205`, `:435`                                                                                                                         |
| inspection gallery / diagram / rail                         | the walkway / the wall drawing                                       | `campaignStory.ts:403`, `:416`; `campaignNpcs.ts:179` (task title), `:191`, `:193`                                                                     |
| service entrance / service ascent                           | the workers' stair                                                   | `campaignStory.ts:33`, `:448`, `:487`; `maps.ts:78`                                                                                                    |
| the return road (to Sevenstones)                            | the road up to Sevenstones                                           | `campaignStory.ts:532`                                                                                                                                 |

Code identifiers (`station`, `relayKeeper`, `C.procedure`, map ids) keep their names. Only player
text changes.

### 10.2 New text in other plans (F-11)

| Plan and place          | Term in draft            | Replacement                                    |
| ----------------------- | ------------------------ | ---------------------------------------------- |
| D §6.6 `hollowsEscaped` | "relay plan", "stations" | "switch-room plan"; "the frames at the stones" |
| D §7.3 `malificatRisen` | "the lantern station"    | "his place at the lantern"                     |
| D §7.2 `campaignReturn` | "from my station"        | "from the lantern"                             |
| C §5 W3 rite card       | "station" for each stone | "the red stone", "the blue stone", …           |
| B, C, D new lines       | any term in 10.1         | its replacement                                |

### 10.3 Sample rewrites

| Passage                  | Proposed text                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SR-ketterRescued-11`    | `"Top pipe for the voice. Bottom pipe for the lamps."`                                                                                                                                                        |
| `SR-vesperRetreated-02`  | `*A lamp on the lowest landing flickers. You steady its pipe; Vesper is gone before you turn back. The voice pipe closes. Ketter's lamps stay lit, but farther down, the switch room is still running.*`      |
| `SR-bellRelief-07`       | `*One letter shows the old ward drawn in ink, a frame at every stone. One piece of the circle is missing. Someone has written "not finished" in the gap. Ketter lays it beside the switch-room plan.*` (C-16) |
| `SR-vesperAcceptance-01` | `*Your copy of the wall drawing fills the gap in Fennick's circle. Across the moving frame, Vesper stands on a far platform.*`                                                                                |
| `SR-vesperAcceptance-11` | `"You read the same names I did. The other bearers."`                                                                                                                                                         |
| `SR-campaignRite-21`     | `"The records say the voice can't cross the circle. That light stayed put when you walked out."` **[B]**: what the circle does is WB-Q05.                                                                     |

The `SR-bellRelief-07` rewrite keeps a quoted label ("not finished") so the native check that
quoted labels are not read as speech (`tests/nativeTome.test.ts:63-64`) keeps its purpose.

Bible wording to update with the glossary (no canon change): WB-C12, WB-C13, WB-C14, WB-C15,
WB-Q05 and the term list in section 10 "Names and terms".

## 11. Story heart for the World Bible (WS6)

Proposed as a new section 2a, "The story heart", after "The story at a glance". Label it
**Proposed** until the author approves it (A-D9). Plan B's secret history and Plan D's Vesper
bible are tested against it.

> **Theme.** Care that will not let go becomes control. Irdrath keeps the sleepers warm and will
> not let them leave. The Lishal feed the workers and lock the doors. The voice offers rest and
> means forever. Against them stand people whose care lets go: Odile packs her own bag, Ketter
> lets someone else answer the bell, Fennick puts down a cup and steps back. Real care helps
> people leave.
>
> **Tone pillars.**
>
> 1. **Small things carry big feelings.** A cooling bowl, a packed bag, a coin jar. Feeling is
>    shown through work and objects, never explained in a speech.
> 2. **Danger is real, and so is kindness.** People get hurt, and choices cost something. No one
>    is thrown away, and no one's harm is excused. A person can be stopped without being
>    discarded.
> 3. **The world is older than anyone's explanation.** Wonder comes from things the player can
>    touch: a lantern with no wick, a bell far below, a stone that dims. Characters know only
>    part of the truth, and the voice never tells all of it.
>
> **The ending should feel** like an ordinary morning after a long illness: relief that is
> quiet, not triumphant. Someone asks for breakfast. A knee still catches. Vesper is alive, under
> guard, and not forgiven on anyone else's behalf. The hero has changed in one small, visible
> way, and the village goes on around them.

Writers test a new scene against the heart: which pillar does it serve, and does it show care
that holds on or care that lets go?

## 12. Workstreams and tasks

Effort is in writer-days (wd) or engineer-days (ed). Total about 8 wd and 4 ed.

| #       | Task                                                                                    | Owner             | Input                         | Output                                             | Effort        |
| ------- | --------------------------------------------------------------------------------------- | ----------------- | ----------------------------- | -------------------------------------------------- | ------------- |
| 1.1–1.6 | Apply section 6.1 text and pronoun fixes and the matching `STORY.md` rows               | Engineer          | A-D1, A-D2, A-D3              | Edited data and script; pinned tests updated       | 0.5 ed        |
| 1.7     | Add enemy names to the reader exporter's `names` table                                  | Engineer          | `export-story-reader.mjs:67`  | Reader shows "The Malificat"                       | 0.1 ed        |
| 1.8     | Run the reader check in `npm run check` (F-30)                                          | Engineer          | `package.json:19`             | `check:reader` script, included in `check`         | 0.1 ed        |
| 1.9     | House spelling decision and pass (optional)                                             | Writer            | A-D7                          | Spelling list in WB section 10                     | 0.5 wd        |
| 2.1     | Add the voice guide and register map to WB section 10                                   | Writer            | Section 7                     | Bible subsection                                   | 1 wd          |
| 3.1     | Register edit and budget trim of Plan D's Vesper lines                                  | Writer            | D §5.3, PD-D02, section 8.1   | Approved lines (with Plan D)                       | 0.5 wd        |
| 3.2     | Register edit of Plan B's single vision lines and the lair                              | Writer            | B §5, section 8.2             | Approved lines (with Plan B)                       | 0.5 wd        |
| 3.4     | One line per vision; update `STORY.md` Wyrm table                                       | Engineer          | A-D5, 3.2                     | Data and script                                    | 0.2 ed        |
| 3.5     | The lair rotates under its own key (`src/game/story.ts:126`, e.g. `wyrm.prelude`)       | Engineer          | A-D5                          | First visit shows the first-visit line             | 0.3 ed        |
| 4.1     | Write or polish all twenty answer-point lines in one pass                               | Writer            | Section 9.1, D §6.4, §7.1–7.3 | Approved lines                                     | 1.5 wd        |
| 4.2     | Export `HERO_ANSWER_POINTS`; add answer point 5                                         | Engineer          | 4.1, Plan D structure         | Data change                                        | 0.3 ed        |
| 5.1     | Finalise the glossary and the enemy and map renames                                     | Writer            | Section 10, A-D6              | Approved glossary                                  | 0.5 wd        |
| 5.2     | Apply the glossary to existing text and to B, C and D drafts; update WB-C12–C15, WB-Q05 | Writer + Engineer | 5.1                           | Data and bible edits                               | 1 wd + 0.5 ed |
| 6.1     | Add the story heart to the World Bible                                                  | Writer            | Section 11, A-D9              | WB section 2a                                      | 0.5 wd        |
| 7.1     | Write `tests/storyText.test.ts`; update pinned tests (section 13.3)                     | Engineer          | Section 13                    | Passing tests                                      | 1 ed          |
| 7.2     | Regenerate the Story Reader; publish an old→new passage ID map                          | Engineer          | All edits                     | Reader, manifest, ID map in the change description | 0.2 ed        |
| 7.3     | Plan A's part of the combined playtest (section 13.4)                                   | QA + Writer       | Built game                    | Results in the combined report                     | 1 wd          |

## 13. Verification and tests

### 13.1 Commands

1. `node tools/export-story-reader.mjs`, then `node tools/export-story-reader.mjs --check`
   (fails if the reader or its manifest is stale). Preserve any annotated author copy first.
2. `npm run check`. After task 1.8 it also runs the reader check, so a stale reader fails the
   normal check (F-30).
3. `npm run build:native`, which regenerates `ios/ManaCrystalsPlaytest/Engine/battle-engine.js`.
4. `grep -rn "Sunken Ruins\|next chapter\|surface-bug" src ios/ManaCrystalsPlaytest` returns only
   save-migration names and comments.

### 13.2 New test file: `tests/storyText.test.ts`

A helper `playerText()` gathers every player-facing string with a source label: all `SCENES`
(title, stage, line, class lines), `VISIONS`, `PRELUDES`, `WARD_AFTER_WYRM`, `WARD_TOAST`, every
Vesper stop's lines, `NPCS` and `CAMPAIGN_NPCS` (names and every line cell), `MENTORS` text
fields, `MAPS` names, warp `lockedText` and `stirs.text`, `ENEMIES` names and descriptions,
`ENCOUNTER_DEFS` text fields and `HAREGUY`. New text from Plans B, C and D is covered
automatically because it lives in the same tables.

| Test                                                      | Asserts                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no obsolete names                                         | No string matches `/Sunken Ruins/`, `/\bEmberforge\b/` or `/\b(Fen\|Bram\|Lyra\|Bea\|Odo\|Ilse)\b/` (WB section 10).                                                                                                                                                                                                                                                                                                                                                                  |
| no out-of-fiction phrasing                                | No string matches `/next chapter/i`, `/\b(TODO\|TBD\|FIXME\|placeholder\|lorem)\b/i`, `/has the last word/i`, `/distracting everyone/i` or `/\bsuddenly\b/i`. `/\bchapter\b/i` is allowed only in scene titles.                                                                                                                                                                                                                                                                       |
| stage text is staged                                      | For every scene beat, `stage` with all `*…*` spans and `"…"` quotes removed is empty.                                                                                                                                                                                                                                                                                                                                                                                                 |
| every speaker has a proper name                           | Every `beat.who` is `hero` or resolves in `CAMPAIGN_SPEAKERS`, `NPCS`, `MENTORS` or `ENEMIES`, and the name starts with a capital letter. The reader has no speaker label matching `/^\*\*[a-z]+\*\*$/` outside the mentor field labels (`motive`, `winText`, …).                                                                                                                                                                                                                     |
| pronouns match the pinned passages                        | No string contains "the boy who made them". Each row of a `PRONOUN_PINS` table (passage → required text, forbidden pattern) holds: `SR-chapterEnd-06` has "the child"; `SR-campaignThreshold-11` has "His hand"; `SR-bellRelief-06` has "He wanted"; `SR-campaignRite-15` has "Together they"; `SR-campaignRecovery-03` has "his hand" (F-29). Rows follow passages if Plan D moves them.                                                                                             |
| no stock dark-fantasy phrases                             | No string matches `surface-bug`, `brave meat`, `dust returns to dust`, `silence between stars`, `hubris`, `moonless tide`, `creature of clay`, `vermin`, `feed the deep`. It does not test "Master", which PD-D02 decides; Plan D's `vesperArc` test owns that rule.                                                                                                                                                                                                                  |
| Vesper's lines fit the budget and every cell is reachable | Across all four stops, distinct Vesper variants number 24 or fewer. `confide` has no cold or plain cell; `refuse` has no plain or warm cell. No line exceeds 30 words. (The three-mood intro rule stays in `tests/attitude.test.ts:245-251`.)                                                                                                                                                                                                                                         |
| one line per vision                                       | Each `VISIONS[i].lines` has exactly one variant (A-D5).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| every answer point gives four distinct class lines        | For each entry in `HERO_ANSWER_POINTS`, the beat is a `hero` beat whose `classLines` keys equal `Object.keys(CLASSES)`; the four lines are non-empty and distinct; `scenePages` shows each class its line. It makes no claim about beats outside the table, so it agrees with Plan D's `vesperArc` test.                                                                                                                                                                              |
| no catchphrase twice in a scene                           | Within any scene, `/not my (problem\|village)/i` appears in at most one class line per class (rule 10, F-01).                                                                                                                                                                                                                                                                                                                                                                         |
| story text uses the glossary terms                        | Strings from `CAMPAIGN_SCENES`, `CAMPAIGN_NPCS`, campaign maps, `CAMPAIGN_ENEMIES` and any new scene from Plans B–D do not match `/\bupper branch\b/i`, `/\blower (branch\|return)\b/i`, `/\brelay\b/i`, `/\breturn (procedure\|path\|cord\|bell)\b/i`, `/\bstations?\b/i`, `/\bsequence\b/i`, `/\bcircuits?\b/i`, `/\binner ward\b/i`, `/\bvessels?\b/i`, `/\b(outer\|test\|small) ring\b/i`. Rowan's "outer ring" of the well (`npcs.ts:109`) is first-half text outside this scan. |

### 13.3 Existing tests to update in the same change

| File                       | Lines                           | Change                                                                                                                                                                      |
| -------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/script.test.ts`     | 44, 119, 223, 277–283           | Rename the ward section; read Vesper by stop (with Plan D); replace the pinned author phrases with the approved new ones.                                                   |
| `tests/scenes.test.ts`     | 232–239                         | New `chapterEnd` order strings (Vale, ward, wind, footprints, "the child").                                                                                                 |
| `tests/story.test.ts`      | 164, 183, 190–196, 245, 272–298 | One-variant visions; the lair on its own key, with a new case "the lair speaks its first line on the first visit" after three visions; per-stop Vesper lines (with Plan D). |
| `tests/nativeTome.test.ts` | 63–64                           | `bellRelief` page 6 now quotes "not finished" instead of "lower return" (or moves to `hollowsEscaped` under PD-D03, C-16).                                                  |
| `tests/nativeTome.test.ts` | 76                              | The escaped voice's dialogue gains Plan B's sentence "Let it sleep its own sleep now."                                                                                      |
| `tests/attitude.test.ts`   | 245–251                         | No change. Plan D's per-stop intros keep three moods, so the rule holds.                                                                                                    |

### 13.4 Playtest: Plan A's part of the combined protocol (F-32)

Plan A runs no separate round. In the single combined session (review section 6, step 10):
children answer two comprehension questions at Plan B's stop 2 ("What did the hero have to
close? What had to stay on?"); adults do the blind sort last, on 20 shuffled lines (10 from each
half, shown without scene context). Pass: children answer both in their own words; blind-sort
accuracy 65% or lower.

## 14. Milestones

| Milestone                    | Content                                                                       | Exit check                                           |
| ---------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| M1, days 1–2                 | Section 6 fixes, exporter fix, reader check in `npm run check`, hygiene tests | `npm run check` passes, including the reader         |
| M2, day 4                    | Voice guide and glossary in the bible; glossary sent to Plans B, C, D         | A-D1, A-D3, A-D5, A-D6 answered                      |
| M3, after Plan D's structure | Joint text pass: Vesper lines, visions, twenty class lines, glossary          | All section 13.2 tests pass                          |
| M4, combined playtest        | Section 13.4                                                                  | Acceptance criteria in section 5 met, or fixes filed |

## 15. Risks and mitigations

| Risk                                                 | Mitigation                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tests pin the author's own first-half words.         | `STORY.md`, data and tests change together after A-D1; never edit data alone.                                     |
| Reader passage IDs change and break review comments. | Publish an old→new ID map (task 7.2).                                                                             |
| Three plans edit the same lines.                     | Ownership follows C-1 to C-3 and C-16; one joint text pass at M3; Plan A's withdrawn drafts are not reintroduced. |
| Drafts quietly decide Plan B lore.                   | **[B]** markers; Plan B reviews every marked line.                                                                |
| Class lines make the hero chatty or preachy.         | One line per answer point; under 25 words; no line names its own hesitation; rule 10.                             |
| Plain terms sound childish to older readers.         | Physical nouns (pipe, lever, circle), not baby talk; adult characters still speak tersely.                        |
| Pronoun pins drift as Plan D moves passages.         | Pins are keyed by passage and updated with Plan D's ID map.                                                       |
| Translations run longer than English.                | Lines stay short; one action per stage direction.                                                                 |

## 16. Author decisions

| ID   | Decision                                                                                                                                                              | Affects                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| A-D1 | Approve rewriting your own first-half words in `STORY.md` (chapter end, ward text, and the Vesper, vision and lair rows that Plans D and B rewrite)? Extends SQR-D01. | `STORY.md`; section 13.3 tests         |
| A-D2 | "The boy" becomes "the child" (default). If the old word was meant as Fennick's outdated view, say so and Plan D can show it.                                         | WB-Q01, WB-C17                         |
| A-D3 | Fennick uses he/him throughout, including WB section 5. Merges PD-D05 (C-4, C-14).                                                                                    | WB-Q01                                 |
| A-D4 | Withdrawn. Per-stop Vesper lines are Plan D's (D §5.2, PD-D02).                                                                                                       | —                                      |
| A-D5 | One line per vision, and the lair on its own rotation key.                                                                                                            | WB-C09, WB-Q02 (planted, not answered) |
| A-D6 | Approve the glossary for all plans, including "Relay Keeper" → "Lever Keeper" and "Inner Ward" → "The Ward Chamber".                                                  | WB-C12–C15, WB-Q05 (wording only)      |
| A-D7 | House spelling: British or American?                                                                                                                                  | WB section 10                          |
| A-D8 | Keep "End of Chapter One" and "Chapter One complete" as book chrome?                                                                                                  | WB section 2                           |
| A-D9 | Adopt the story heart (theme, pillars, ending feeling) as Established?                                                                                                | New WB section 2a; WB-Q06              |

## 17. Changes after review

| Finding / conflict                     | Resolution in this plan                                                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01, C-1                              | Dropped class lines at `vesperAcceptance-09` and `campaignRite-20`. Five answer points placed by Plan D; Plan A writes all twenty lines (section 9). Test reads `HERO_ANSWER_POINTS` instead of "exactly one per scene"; added the catchphrase rule and test. |
| F-02, C-2                              | Withdrew N1–N13 for Plan D's per-stop lines. Budget raised to 24 variants with three-mood intros; register notes on D's lines; "Master" left to PD-D02 and not tested by Plan A (section 8.1).                                                                |
| F-10                                   | Section 13.3 now lists `nativeTome.test.ts:63-64` and `:76`, and `attitude.test.ts:245-251` (satisfied by D's three-mood intros). The `bellRelief-07` rewrite keeps a quoted label.                                                                           |
| F-11, C-15                             | Glossary applies to every plan; section 10.2 lists D's and C's terms; the glossary test covers new scenes.                                                                                                                                                    |
| F-17, C-3                              | Withdrew Plan A's vision drafts for Plan B's. Plan A keeps one line per vision, the separate lair key, the register check and the lair stage combined with B's words; `chapterEnd-04` uses A's staging and B's sentence.                                      |
| F-24, C-4                              | Added `campaignStory.ts:721`; one pronoun decision A-D3 (merges PD-D05); WB line 367 fixed.                                                                                                                                                                   |
| F-29                                   | Replaced the guessed pronoun rule with a per-passage `PRONOUN_PINS` table.                                                                                                                                                                                    |
| F-30                                   | Task 1.8 adds the reader check to `npm run check` in M1.                                                                                                                                                                                                      |
| F-32                                   | No separate Plan A round; Plan A's questions and blind sort join the combined protocol (section 13.4).                                                                                                                                                        |
| C-5                                    | Vesper they/them stated in assumptions and enforced by the pronoun pins.                                                                                                                                                                                      |
| C-16                                   | Fix 1.6 at `:335` and the `SR-bellRelief-07` rewrite move to Plan D's `hollowsEscaped` if PD-D03 is approved; otherwise Plan A applies them.                                                                                                                  |
| Writing note: N1                       | Moot: N1 withdrawn. D's road lines carry no unmarked lore fact.                                                                                                                                                                                               |
| Writing note: "the switchworks"        | Replaced with "the switch room"; enemy becomes "Lever Keeper".                                                                                                                                                                                                |
| Accuracy: `nativeTome` "none expected" | Corrected in section 13.3.                                                                                                                                                                                                                                    |
| C-14                                   | A-D4 withdrawn; A-D3 absorbs PD-D05.                                                                                                                                                                                                                          |
