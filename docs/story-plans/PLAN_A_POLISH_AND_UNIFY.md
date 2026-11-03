# Plan A — Polish and unify: execution plan

Execution plan for Plan A in [STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md)
(findings F3, F5, F7, F8 and F10). Passage IDs (`SR-…`) refer to
[WORLD_BIBLE_STORY_READER.md](../WORLD_BIBLE_STORY_READER.md). Check and decision IDs (`WB-…`)
refer to [WORLD_BIBLE.md](../WORLD_BIBLE.md). Line numbers are for `GetPutTaco` on
3 November 2026.

This is a plan. It changes no game text, data or tests. Every drafted line below is a proposal
for the author, Philip Spina.

## 1. Goal

Make the existing story read as one confident work without changing its structure.

**Done when** a cold reader cannot tell which half was written first, every hero hesitation has
a visible answer, no player-facing string contains writer's notes or obsolete names, and a test
keeps it that way.

## 2. Assumptions

- The second-half register (`campaignStory.ts`) is the target voice. The first half moves toward
  it, never the reverse.
- Vesper uses they/them. Fennick uses he/him, as in the first hook (`SR-chapterEnd-06`) and
  `campaignStory.ts:46`. Ketter, the Lishal, Ares and Vex use they/them. Lance uses he/him.
- No beat is added, removed or reordered. The native book staging indexes beats by position
  (`src/native/tome.ts:120-123`, `:248`, `:327`, `:374`), so class lines are added to existing
  hero beats only.
- `docs/STORY.md` is the author's script, kept exact and excluded from Prettier. Tests pin it to
  the game (`tests/script.test.ts`). Every first-half change therefore needs the author's
  approval and a matching `STORY.md` edit.
- Lore that Plan B would decide (what the voice is, why it wants sleep, who built the ward, what
  the stones are) stays out of Plan A text. Lines that touch it are marked **[B]**.

## 3. Scope and non-goals

| In scope                                                                          | Not in scope (owner)                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| All F7 fixes, plus the same kind of slip found elsewhere (section 6)              | The secret history and clue ledger (Plan B)              |
| Vesper's first-half lines, visions 1–3 and the Wyrm prelude                       | Drowsy blocks, Weaving rite, attitude endings (Plan C)   |
| One class line per hero in `vesperAcceptance`, `campaignRite`, `mossvaleRecovery` | Merging repair beats; new Vesper scenes (Plan D)         |
| Jargon replacement across scenes, tasks, map text and enemy names                 | Renaming Hareguy and Steve (SQR-D04, separate pass)      |
| A voice guide and a "story heart" section for the World Bible                     | New quests, maps, encounters or balance changes          |
| Tests that keep the text clean                                                    | Mentor and resident dialogue outside the passages listed |

## 4. Dependencies on other plans

| Plan | Relationship                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| B    | Plan A goes first. Lines marked **[B]** are placeholders Plan B may sharpen into clues. Plan A must not settle WB-Q02 or WB-Q05. |
| C    | Plan A keys Vesper's lines to the three existing moods. Plan C may later make the mood change the ending (SQR-D06).              |
| D    | The `vesperAcceptance` class lines are written so Plan D task 3 can reuse them as "the hero's answer to Vesper".                 |

## 5. Problems this plan solves

### P3. The two halves sound like different games

**Root cause.** The first-half antagonist text came from the team's original script (stock dark
fantasy: cosmic nouns, insults, light/dark imagery). The second half was written later to the
World Bible's writing standard (section 10): concrete objects, short questions, observed actions.
No voice guide joined them, so Vesper has two personalities (review F3). Two mechanical causes
make it worse: 5 of Vesper's 32 lines can never be spoken (section 8.1), and visions share one
rotation counter, so players see a fixed mix of variants and the lair line without its stage
direction comes first (`src/game/story.ts:89-91`, `:124-127`).

**Fixed by** WS2 (voice guide), WS3 (rewrite inventory, sections 8.1–8.3) and tasks 3.4–3.5
(engineering shape).

**Affected.** `SR-vesper.*` (32 passages, `story.ts:97-162`), `SR-vision1.01`–`SR-vision3.02`
(`story.ts:31-52`), `SR-prelude-moonWyrm.01`–`.02` (`story.ts:60-61`).

| Before                                                                                     | After                                                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `"You're blocking my light, surface-bug. The Wyrm shifts below; your footsteps annoy it."` | `"Rowan's stone. He gave it away? Then things at home are worse than he says."` |
| `"I am the silence between stars. Show me why your brief life deserves the dawn."`         | `"There you are. You came all this way awake. Let us see how long that lasts."` |

**Acceptance.** Blind sort: three readers get 10 shuffled Vesper or voice lines from each half
and sort them by half; mean accuracy is 65% or lower (chance is 50%). Every Vesper line keeps one
established trait (WB section 5, Vesper: the Master, testing the hero, life in the sun, respect
for skill).

**Test.** `tests/storyText.test.ts` › "no stock dark-fantasy phrases" and "Vesper has 10–14
reachable lines and no dead cells"; `tests/story.test.ts` › "the lair speaks its first line on
the first visit".

### P4 (hero part). The four hero hesitations are never resolved

**Root cause.** Class lines exist only in the opening and the Refusal (`story.ts:232-240`,
`:267-273`). Campaign scenes use the shared helper `say('hero', …)`
(`campaignStory.ts:9-13`), which has no class field, so every later hero line is the generic
"Chosen hero" text (review F5).

**Fixed by** WS4 (section 9): one class line per hero at `SR-vesperAcceptance-09`,
`SR-campaignRite-20` and `SR-mossvaleRecovery-05`, using the existing `classLines` field.

**Affected.** `campaignStory.ts:429`, `:729`, `:842`; setups at `SR-refusal-01`
(`story.ts:267-273`).

| Hero  | Before (`SR-vesperAcceptance-09`) | After                                                                         |
| ----- | --------------------------------- | ----------------------------------------------------------------------------- |
| Lance | `"Come over."`                    | `"I left my post to get here, and I can't let go of this brake. Come to me."` |
| Vex   | `"Come over."`                    | `"Not my problem. That's what I said, back home. Come over."`                 |

**Acceptance.** Each hero's three payoff lines answer the Refusal line in order: doubt, choice,
changed habit. A reader shown only one class's Refusal and payoff lines can name the hesitation.
No payoff line explains the monomyth or names the hesitation outright (WB section 7).

**Test.** `tests/storyText.test.ts` › "each late scene answers every hero's hesitation".

### P5a. Writer's notes in player-facing text

**Root cause.** `CHAPTER_END` was imported word for word from the author's script, including
narration written as notes to a reader ("has the last word:", "then glows, distracting
everyone", "Suddenly a voice is heard"). Stage text outside `*…*` is shown as narration, so the
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
continuation then adopted they/them everywhere else (WB-Q01). A related slip exists for Fennick
himself: `campaignStory.ts:816` reads "Fennick withdraws their hand", which is ambiguous next to
Vesper's "their", and `campaignStory.ts:335` uses "They" for Fennick.

**Fixed by** WS1 tasks 1.5–1.6.

**Affected.** `SR-chapterEnd-06` (`story.ts:349`), `SR-campaignRecovery-03`
(`campaignStory.ts:816`), `SR-bellRelief-06` (`campaignStory.ts:335`); `tests/scenes.test.ts:238`.

| Before                                                        | After                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `"…I taught the boy who made them to walk."`                  | `"…I taught the child who made them to walk."`               |
| `*Fennick withdraws their hand and sets a cup within reach.*` | `*Fennick draws his hand back and sets a cup within reach.*` |

**Acceptance.** No line refers to Vesper with he, him, his or boy. Every Fennick reference uses
he/him or his name.

**Test.** `tests/storyText.test.ts` › "pronouns match the cast sheet".

### P5c. Technical terms young players will not follow

**Root cause.** The continuation describes the underground as an engineer would: branches,
relays, returns, circuits, stations, sequences. "Return" carries three meanings (the bell
circuit, the missing piece of the ward circle, the road home). The World Bible flags the terms
(section 10) but supplies no plain alternatives.

**Fixed by** WS5 (glossary, section 10), applied by task 5.2.

**Affected.** Every occurrence listed in section 10, mainly `SR-ketterRescued-06/-08/-11`,
`SR-vesperRetreated-02`, `SR-bellRelief-01/-05/-07`, `SR-lishalSilenced-03`,
`SR-campaignRite-01/-10/-21/-23/-24`.

| Before (`SR-ketterRescued-06`)                                                                                                      | After                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"Upper branch carries the voice. Lower one feeds our lamps. You'll see the same marks on the handles. Leave the lower one alone."` | `"Two pipes. The top one carries the voice. The bottom one feeds our lamps. Same marks on both levers, so look twice. Leave the lamp pipe alone."` |

**Acceptance.** Two readers aged 8–11 read `ketterRescued` to `vesperAcceptance` and can say, in
their own words, what the hero must close and what must stay on. Each new term names a thing the
player can picture.

**Test.** `tests/storyText.test.ts` › "campaign text uses the glossary terms".

## 6. F7 complete fix list (WS1)

### 6.1 Leftover authoring text and obsolete names

| #   | Passage / place                              | Source                                 | Current                                                                                                          | Proposed replacement                                                                                                                                          |
| --- | -------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `SR-chapterEnd-02`                           | `story.ts:331-332`                     | `After the Moon Wyrm falls, Captain Vale has the last word:` + `"You came back, the realm owes you; so do I..."` | Stage `*Captain Vale meets you at the cave mouth and grips your arm.*` Line `"You came back. The realm owes you, and so do I."`                               |
| 1.2 | `SR-chapterEnd-03`                           | `story.ts:337`                         | `The Sunken Ruins' seal then glows, distracting everyone. *Across Sevenstones, …*`                               | `*Behind them, the old ward over the stair flares silver. The watch turn to stare.*`                                                                          |
| 1.3 | `SR-chapterEnd-04`                           | `story.ts:341`                         | `Suddenly a voice is heard rumbling through the breeze. *It's the voice …*`                                      | `*The wind drops. The grass lies flat and every lamp gutters. It is the voice from every vision, but there is no Wyrm now to carry it.*` + the line unchanged |
| 1.4 | `SR-ward-after-wyrm.02`                      | `story.ts:363`                         | `Below the ward, a bell rings once. It will open in the next chapter.`                                           | `Below the ward, a bell rings once, very far down.`                                                                                                           |
| 1.4 | Locked warp text (new find)                  | `maps.ts:70`                           | `The Sunken Ruins are sealed by an ancient ward.`                                                                | `An old ward seals the stair. It hums when you come close.`                                                                                                   |
| 1.4 | Toast after the chapter summary (new find)   | `src/ui/app.ts:1068`                   | `The Sunken Ruins' ward glows`                                                                                   | `The old ward glows` (move the string to `story.ts` as `WARD_TOAST` so the text test can see it)                                                              |
| 1.5 | `SR-chapterEnd-06`                           | `story.ts:349`                         | `I taught the boy who made them to walk.`                                                                        | `I taught the child who made them to walk.`                                                                                                                   |
| 1.6 | `SR-campaignRecovery-03` (new find)          | `campaignStory.ts:816`                 | `*Fennick withdraws their hand and sets a cup within reach.*`                                                    | `*Fennick draws his hand back and sets a cup within reach.*`                                                                                                  |
| 1.6 | `SR-bellRelief-06` (new find)                | `campaignStory.ts:335`                 | `They wanted measurements we couldn't get …`                                                                     | `He wanted measurements we couldn't get …`                                                                                                                    |
| 1.7 | `SR-malificatRisen-02/-04/-06/-08/-10` label | `tools/export-story-reader.mjs:67-79`  | Reader prints `**malificat**`. In game the label already reads "The Malificat" (`campaignEnemies.ts:207`).       | Add `ENEMIES` names to the exporter's `names` table so the reader prints **The Malificat**. No game text changes.                                             |
| 1.8 | `SR-prelude-moonWyrm.02` (new find)          | `story.ts:61`, `src/game/story.ts:126` | Shown first in a normal run (shared counter), with no stage direction                                            | Rewritten in section 8.3; the prelude rotates under its own key (task 3.5)                                                                                    |
| 1.9 | Vesper dead cells (new find)                 | `story.ts:113-117`, `:125-126`         | `confide.cold`, `confide.plain` ×2, `refuse.plain`, `refuse.warm` can never be spoken                            | Removed in section 8.1                                                                                                                                        |

Non-player hygiene, same pass: rename the `STORY.md:405` heading and `tests/script.test.ts:44`
constant to "The ward, after the Wyrm (map text)"; update comments at `story.ts:360` and
`src/game/ending.ts:17`. Leave save-migration names (`campaignFlags.ts:28`, the version-7 tests)
alone: they describe old saves, not the world.

### 6.2 Kept on purpose

- The scene title "End of Chapter One" (`story.ts:322`) and the summary title "Chapter One
  complete" (`src/ui/app.ts:1071`) are book chrome, like a chapter heading. Keep them unless the
  author decides otherwise (A-D8).
- "Vesper, Thrall of the Depths" (`npcs.ts:1118`) is established in `STORY.md:52`. Keep.

### 6.3 Spelling for localisation (small, optional)

Player text mixes British and American spelling: "traveler" (`story.ts:104`, `:160`;
`npcs.ts:68`, `:353`, `:550`) against "traveller" (`npcs.ts:485`); "colors" (`npcs.ts:562`, `:647`,
`:661`) against "colours" (`campaignStory.ts:452`); "gray" (`maps.ts:190`, `:236-244`) against
"grey" (`story.ts:310`, `mentors.ts:215`, `:243`). Pick one house spelling (A-D7) and record it
in the World Bible's writing standard. Translators then get one source spelling per word.

## 7. Voice guide (WS2)

Distilled from `archiveRefuge`, `irdrathTrial`, `ketterRescued`, `bellShift`, `vesperAcceptance`,
`rowanReturn` and `mossvaleRecovery`. Proposed as a new subsection of WB section 10.

### 7.1 Rules

1. **Say what you want from the person in front of you.** Every line asks, refuses, offers or
   orders something.
2. **Objects carry the feeling.** A packed bag, a cooling bowl, a rasp put down. Do not name the
   emotion.
3. **Notice the other person's last action.** "You took your time." "You found a way across."
   This is how Vesper and the voice show they are watching.
4. **Short sentences.** Aim for under 12 words a sentence and under 30 words a line.
5. **Questions over speeches.** "Has Pete been charging for the room?" does more than a paragraph.
6. **Concrete nouns only.** No "the dark", "the deep", "the tide", "the void" or "the stars" as
   threats. Threat comes from a consequence the player can picture.
7. **One stage action per direction.** Directions describe something that can be drawn or
   animated. No narrator opinions and no "suddenly".
8. **One new term at a time,** introduced by an object the player sees (see the glossary).
9. **Translation-ready.** No puns, no idioms that only work in English, no trailing "…" except a
   real interruption (use an em dash), consistent pronouns, consistent spelling.

### 7.2 Do and don't

| Don't (current first half)                                                                                               | Do (second-half model)                                                    | Rule |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---- |
| `"Away with you. Your blood soils the stone."`                                                                           | `"Keep it dry. I'll want the rest."`                                      | 1, 6 |
| `"You move with purpose. Pity it will all be swallowed by the moonless tide."`                                           | `"You took your time."`                                                   | 3, 6 |
| `"I was like you once—seeking glory in ancient places. The Wyrm showed me the true coldness of the world, and I bowed."` | `"You want me to go back with you. Carry a lamp. Wait for orders."`       | 2, 4 |
| `"Every breath you take on the surface draws air from my cavern."`                                                       | `"Sleep."` (`SR-opening-03`)                                              | 6    |
| `Suddenly a voice is heard rumbling through the breeze.`                                                                 | `*The frame passes between you. Vesper's fingers close around the rail.*` | 7    |

### 7.3 Register map

| Speaker                                 | Register                                                                                                  | Typical length | Never                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| Vesper, before the Wyrm                 | Dry, observant rival. Amused questions, small contempt, pride. Mentions the Master; never explains it.    | 8–25 words     | Insults ("vermin", "meat"), cosmic threats, light/dark puns |
| Vesper, underground                     | Same voice, less amused. Short claims, reading, wanting the rest.                                         | 3–15 words     | Speeches about destiny                                      |
| Vesper as the Malificat                 | Same voice under strain. Questions turn to accusation ("What have you done?").                            | 3–10 words     | A new villain's diction                                     |
| The voice (visions, `chapterEnd`, rite) | Calm, patient, intimate. Offers rest and permission. Notices the hero's work. Never shouts, never boasts. | 5–20 words     | Claims about how the world works **[B]**                    |
| The Wyrm (animal)                       | Has no words of its own. Shown through breath, weight and tiredness.                                      | Stage only     | Speech after the voice leaves it                            |
| The Wyrm's prelude                      | The voice speaking through a tired body. The stage shows the mismatch.                                    | 10–20 words    | Settling who is guilty (WB-C09)                             |

## 8. Rewrite inventory (WS3)

Moods follow `src/game/attitude.ts:138-142`: **cold** (Hostile, Wary), **plain** (Neutral),
**warm** (Friendly, Devoted). A missing cell falls back (`src/game/lines.ts:19-23`): plain → warm
→ cold; cold → plain → warm; warm → plain → cold. `confide` is spoken only when Devoted, so only
its warm cell is reachable (`attitude.ts:185-188`). `refuse` is spoken only when Hostile, so only
its cold cell is reachable (`src/game/encounter.ts:267-269`).

### 8.1 Vesper: 32 lines in, 13 lines out

New lines (`N1`–`N13`). `N1`–`N4` are per stop (task 3.4); everything else is shared.

| New | Slot                                  | Draft                                                                                                                                                       | Notes                                                           |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| N1  | intro, road (`vesperRoad`)            | `*A cloaked figure steps off the verge and looks at the stone in your hand.* "Rowan's stone. He gave it away? Then things at home are worse than he says."` | First meeting. No town name: hometowns vary.                    |
| N2  | intro, ridge (`vesperRidge`)          | `*Vesper sits on the ridge road, turning a chip of red rock.* "You flinched on the way in. Everyone does, the first time it speaks under stone."`           | Notices vision 2. **[B]** if Plan B limits who hears the voice. |
| N3  | intro, peaks (`vesperPeaks`)          | `*Vesper is already past the gate, brushing snow from their sleeve.* "Forgefyre's key. You worked for it, didn't you? I climbed."`                          | `peakGate` is always held here.                                 |
| N4  | intro, ruins (`vesperRuins`)          | `*Vesper waits by the cave seal.* "'To whoever's still awake.' That's what Selene wrote, and here you are. She should have been more particular."`          | Selene's letter: `SR-refusal-02`.                               |
| N5  | confide, warm (Devoted), variant 1    | `*Vesper turns a pale shard in their fingers.* "The Master gave me this to keep. Take it. I want to see what you do with it."`                              | Matches the Devoted Moon Shard secret (`npcs.ts:1128`).         |
| N6  | confide, warm (Devoted), variant 2    | `"I came down here for glory, once. I lived in the sun before that. I don't miss it. I check, now and then, that I don't."`                                 | Keeps both established facts.                                   |
| N7  | refuse, cold (Hostile)                | `"No. You'd only waste it, and I'd have to watch."`                                                                                                         |                                                                 |
| N8  | accept, plain (all moods by fallback) | `"Go on, then. I'll watch your hands."`                                                                                                                     | Sets up Plan C's mirror duel.                                   |
| N9  | decline, plain (all moods)            | `"Off you go. I'll be further down the road. I always am."`                                                                                                 | "One step ahead" (`story.ts:77-82`).                            |
| N10 | win, cold                             | `"Fine. You did it properly. Don't wait for me to say so twice."`                                                                                           |                                                                 |
| N11 | win, warm (plain falls back here)     | `"Neater than I'd have done it. I'll remember how."`                                                                                                        | Respect for skill.                                              |
| N12 | lose, plain (all moods)               | `"You rushed the last piece. People always rush the last piece."`                                                                                           | About the board, not the hero's worth.                          |
| N13 | done, plain (all moods)               | `"Still here? The Master doesn't wait, and neither do I."`                                                                                                  |                                                                 |

Fallback if task 3.4 is declined: replace N1–N4 with three shared intros. Cold: `"You again. You
walk like someone who thinks they're being followed."` Plain: `"Still stopping for everyone you
meet? It must be tiring."` Warm: `"There you are. I wondered which road you'd take."`

| Existing passage             | Source             | Decision | Becomes | Reason                                                          |
| ---------------------------- | ------------------ | -------- | ------- | --------------------------------------------------------------- |
| `SR-vesper.intro.cold.01`    | `story.ts:100`     | Cut      | —       | Insult; light imagery; claims about the Wyrm's moods            |
| `SR-vesper.intro.cold.02`    | `story.ts:101`     | Rewrite  | N1      | Keeps the idea of noticing the hero's work                      |
| `SR-vesper.intro.plain.01`   | `story.ts:104`     | Cut      | —       | "Feed the deep"                                                 |
| `SR-vesper.intro.plain.02`   | `story.ts:105`     | Cut      | —       | World-physics claim ("stars are dying")                         |
| `SR-vesper.intro.warm.01`    | `story.ts:108`     | Rewrite  | N3      | Keeps the testing tone; drops "the Master grows hungry" **[B]** |
| `SR-vesper.intro.warm.02`    | `story.ts:109`     | Cut      | —       | "Moonless tide"                                                 |
| `SR-vesper.confide.cold`     | `story.ts:113`     | Cut      | —       | Never spoken; "brave meat"                                      |
| `SR-vesper.confide.plain.01` | `story.ts:115`     | Rewrite  | N5      | Never spoken in its cell; moved to warm                         |
| `SR-vesper.confide.plain.02` | `story.ts:116`     | Rewrite  | N6      | Life in the sun, moved to warm                                  |
| `SR-vesper.confide.warm`     | `story.ts:118`     | Rewrite  | N6      | Keeps "glory"; drops "true coldness of the world"               |
| `SR-vesper.refuse.cold.01`   | `story.ts:122`     | Rewrite  | N7      |                                                                 |
| `SR-vesper.refuse.cold.02`   | `story.ts:123`     | Cut      | —       | "Surface vermin"                                                |
| `SR-vesper.refuse.plain`     | `story.ts:125`     | Cut      | —       | Never spoken                                                    |
| `SR-vesper.refuse.warm`      | `story.ts:126`     | Cut      | —       | Never spoken                                                    |
| `SR-vesper.accept.*` (3)     | `story.ts:129-131` | Rewrite  | N8      | Three moods merge into one observed line                        |
| `SR-vesper.decline.*` (3)    | `story.ts:134-136` | Rewrite  | N9      | Keeps "patient" from the warm cell                              |
| `SR-vesper.win.cold.01–02`   | `story.ts:140-141` | Rewrite  | N10     |                                                                 |
| `SR-vesper.win.plain.01–02`  | `story.ts:144-145` | Cut      | —       | Neutral falls back to N11                                       |
| `SR-vesper.win.warm.01–02`   | `story.ts:148-149` | Rewrite  | N11     | Keeps respect; drops "breaking you"                             |
| `SR-vesper.lose.*` (3)       | `story.ts:153-155` | Rewrite  | N12     | Keeps "I expected more" as a board observation                  |
| `SR-vesper.done.*` (3)       | `story.ts:158-160` | Rewrite  | N13     | Keeps "The Master watches" as "doesn't wait"                    |

### 8.2 Visions 1–3

A vision is shown once, and all three share the Wyrm's rotation counter (`src/game/story.ts:89-91`).
A normal run therefore shows `vision1.01`, `vision2.02` and `vision3.01` and never the others.
Proposal: one authored line per vision, so every player sees the same sequence (A-D5).

| Existing passage | Source        | Decision | Draft                                                                                                                                                            |
| ---------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SR-vision1.01`  | `story.ts:31` | Rewrite  | `*The road goes still. Even the birds stop.* "You mended a well today. That was kind. Kind people tire first."`                                                  |
| `SR-vision1.02`  | `story.ts:32` | Cut      | Physical claim about air and the cavern with no payoff (F7)                                                                                                      |
| `SR-vision2.01`  | `story.ts:41` | Cut      | "Closer to my coil" ties digging to the voice's location **[B]**                                                                                                 |
| `SR-vision2.02`  | `story.ts:42` | Rewrite  | `*Dust settles on the quarry floor, though nothing moved it.* "You keep so busy. Busy is only tired that has not sat down yet."`                                 |
| `SR-vision3.01`  | `story.ts:51` | Rewrite  | `*The beacon on the peak flickers, then holds.* "They light beacons and lock gates, and still they yawn at their posts. I can wait. I am very good at waiting."` |
| `SR-vision3.02`  | `story.ts:52` | Cut      | Contradicts the prelude's moonlight claim (F1)                                                                                                                   |

Vision 3 echoes Lance's "post" and the gate the player just opened. None of the three says what
the voice is or where it lives.

### 8.3 The Wyrm prelude

| Existing passage         | Source        | Decision | Draft                                                                                                                                                                                                                                                             |
| ------------------------ | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SR-prelude-moonWyrm.01` | `story.ts:60` | Rewrite  | First visit: `*The serpent lies coiled around the moon-crystal. Its breath is slow; its eye is half closed. The voice that comes out of it is far too steady for so tired a body.* "There you are. You came all this way awake. Let us see how long that lasts."` |
| `SR-prelude-moonWyrm.02` | `story.ts:61` | Rewrite  | Retry: `*The serpent has not moved. One eye opens a little.* "Back again? You could rest instead. No one would blame you."`                                                                                                                                       |

The first-visit stage plants the midpoint reversal (`SR-wyrmFall-01`, "as if whatever was
speaking simply stopped") without settling the Wyrm's guilt or the voice's origin (WB-C09). It is
a fair clue Plan B can build on.

## 9. Hero hesitation payoffs (WS4)

### 9.1 Drafted lines

The shared line stays as the fallback and the Story Reader's "Chosen hero" text.

**`SR-vesperAcceptance-09`** (`campaignStory.ts:429`, fallback `"Come over."`). The hero is
holding the shutter brake (`SR-vesperAcceptance-07`).

| Class          | Line                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| ranger (Fern)  | `I left sleepers at home to come down here. Other people are watching them. Come over.` |
| knight (Lance) | `I left my post to get here, and I can't let go of this brake. Come to me.`             |
| mage (Ares)    | `There's no book for this part. I came anyway. Come over.`                              |
| rogue (Vex)    | `Not my problem. That's what I said, back home. Come over.`                             |

**`SR-campaignRite-20`** (`campaignStory.ts:729`, fallback `"If Vesper falls, the voice will
try to leave again."`). Each line keeps the plot information Fennick answers next.

| Class          | Line                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ranger (Fern)  | `Someone's sitting with the sleepers at home, so I can stand here. If Vesper falls, the voice will try to leave again.` |
| knight (Lance) | `This stone is my post now. If Vesper falls, the voice will try to leave again.`                                        |
| mage (Ares)    | `If Vesper falls, the voice will try to leave again. After that, the records stop. We'll learn the rest by watching.`   |
| rogue (Vex)    | `If Vesper falls, the voice will try to leave again. And nobody's paying me to stand here. Funny, that.`                |

**`SR-mossvaleRecovery-05`** (`campaignStory.ts:842`, fallback `"There's a cart going to
Brightwater in the morning."`).

| Class          | Line                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ranger (Fern)  | `There's a cart going to Brightwater in the morning. The houses here are waking. They don't need me watching.` |
| knight (Lance) | `There's a cart going to Brightwater in the morning. I'll walk beside it. The road is my post tomorrow.`       |
| mage (Ares)    | `There's a cart going to Brightwater in the morning. I didn't read that anywhere. I asked.`                    |
| rogue (Vex)    | `There's a cart going to Brightwater in the morning. I've paid the driver. Don't argue.`                       |

Arc per hero: Fern trusts others to watch; Lance chooses which post matters; Ares acts past the
edge of the books; Vex says the old line and means the opposite, then pays for someone else.
None depends on Plan B.

### 9.2 Data shape for engineering

`SceneBeat` already has `classLines?: Readonly<Record<string, string>>` (`story.ts:176-177`).
The web runtime (`src/game/story.ts:297-298`), the native book (`src/native/tome.ts:426`) and the
reader export (`tools/export-story-reader.mjs:142-152`) already prefer the class line and fall
back to `line`. The only new code is a helper beside `say` in `campaignStory.ts`:

```ts
type ClassLines = Readonly<Record<'ranger' | 'knight' | 'mage' | 'rogue', string>>;
const heroSays = (line: string, classLines: ClassLines, stage = ''): SceneBeat => ({
  ...say('hero', line, stage),
  classLines,
});
// campaignStory.ts:429 becomes:
heroSays('Come over.', {
  ranger: 'I left sleepers at home to come down here. Other people are watching them. Come over.',
  knight: "I left my post to get here, and I can't let go of this brake. Come to me.",
  mage: "There's no book for this part. I came anyway. Come over.",
  rogue: "Not my problem. That's what I said, back home. Come over.",
}),
```

Class lines are stored without quotes; the runtime adds them (`src/game/story.ts:298`). They pass
through `hometownText`, so "home" is safer than a town name. Beat count and order do not change.

## 10. Jargon glossary (WS5)

| Term now                                                     | Replacement                                                                        | Occurrences (file:line)                                                                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| upper branch / voice branch                                  | the voice pipe                                                                     | `campaignStory.ts:255`, `:263`, `:281` (scene title), `:288`; `campaignNpcs.ts:151`                                                                    |
| lower branch / lower one / lamp feed / feed                  | the lamp pipe                                                                      | `campaignStory.ts:255`, `:263`, `:288`; `campaignNpcs.ts:151`; `campaignMaps.ts:221`                                                                   |
| branch feeding the great frame                               | the pipe that feeds the great frame                                                | `campaignStory.ts:452`                                                                                                                                 |
| relay, central relay, relay plan                             | the switchworks, the switchworks plan                                              | `campaignStory.ts:288`, `:332`, `:339`, `:483`, `:487`, `:549`; `campaignNpcs.ts:174`; `campaignMaps.ts:221`, `:295`; `campaignEnemies.ts:120`, `:181` |
| upper relay handle                                           | the voice-pipe lever                                                               | `campaignStory.ts:260`                                                                                                                                 |
| Relay Keeper, Relay Spark (enemy names)                      | Switchworks Keeper, Switch Spark (A-D6)                                            | `campaignEnemies.ts:104`, `:113`                                                                                                                       |
| lower return / return path / the return                      | the missing piece of the circle                                                    | `campaignStory.ts:339`, `:403`, `:416`; `campaignNpcs.ts:174`, `:191`, `:192`, `:194`                                                                  |
| return procedure / procedure / recovered or copied sequence  | Fennick's closing steps / the closing steps                                        | `campaignStory.ts:487`, `:566`, `:655`, `:704`; `campaignNpcs.ts:191`, `:196`, `:236-238`, `:241`, `:245`                                              |
| test sequence                                                | the test                                                                           | `campaignStory.ts:724`                                                                                                                                 |
| return cord / return bell / relief circuit / circuit (bells) | the answer cord / the answer bell / a fresh cord / the cord                        | `campaignStory.ts:325`; `campaignNpcs.ts:156`, `:163`, `:165`; `campaignMaps.ts:258`                                                                   |
| other circuits                                               | the other lines                                                                    | `campaignNpcs.ts:192`                                                                                                                                  |
| ring (ward), outer ring                                      | the circle, the outer circle                                                       | `campaignStory.ts:707`, `:732`, `:740`, `:759`                                                                                                         |
| test ring / small ring                                       | the chalk circle                                                                   | `campaignNpcs.ts:241`, `:242`, `:244`                                                                                                                  |
| station(s), station frames, outer station                    | the frames at the stones; someone at every stone                                   | `campaignStory.ts:339`, `:609`, `:655`, `:737`, `:740`, `:764`, `:797`; `campaignNpcs.ts:194`, `:224`, `:244`, `:246`; `maps.ts:85`                    |
| inner ward                                                   | the ward chamber                                                                   | `campaignStory.ts:740`, `:797`; `campaignNpcs.ts:236`, `:242`; `maps.ts:85`, `:88`; `campaignMaps.ts:341` (map name); `campaignEnemies.ts:227`         |
| ward (alone)                                                 | Keep. Defined on first sight at `SR-chapterEnd-03`: "the old ward over the stair". | `story.ts:337`, `:345`, `:349`, `:362-363`; `maps.ts:70`                                                                                               |
| vessel(s)                                                    | bearer(s), as `SR-archiveDrained-04` already says                                  | `campaignStory.ts:205`, `:435`                                                                                                                         |
| inspection gallery / diagram / rail                          | the walkway / the wall drawing                                                     | `campaignStory.ts:403`, `:416`; `campaignNpcs.ts:179` (task title), `:191`, `:193`                                                                     |
| service entrance / service ascent                            | the workers' stair                                                                 | `campaignStory.ts:33`, `:448`, `:487`; `maps.ts:78`                                                                                                    |
| the return road (to Sevenstones)                             | the road up to Sevenstones                                                         | `campaignStory.ts:532`                                                                                                                                 |

Sample rewrites (apply the glossary to every row above in the same way):

| Passage                  | Proposed text                                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SR-ketterRescued-11`    | `"Top pipe for the voice. Bottom pipe for the lamps."`                                                                                                                                                         |
| `SR-vesperRetreated-02`  | `*A lamp on the lowest landing flickers. You steady its pipe; Vesper is gone before you turn back. The voice pipe closes. Ketter's lamps stay lit, but farther down, the great switchworks is still running.*` |
| `SR-bellRelief-07`       | `*One letter shows the old ward drawn in ink, a frame at every stone. One piece of the circle is missing: the line just stops. Ketter lays it beside the switchworks plan.*`                                   |
| `SR-vesperAcceptance-01` | `*Your copy of the wall drawing fills the gap in Fennick's circle. Across the moving frame, Vesper stands on a far platform.*`                                                                                 |
| `SR-vesperAcceptance-11` | `"You read the same names I did. The other bearers."`                                                                                                                                                          |
| `SR-campaignRite-21`     | `"The records say the voice can't cross the circle. That light stayed put when you walked out."` **[B]**: what the circle does is WB-Q05.                                                                      |

Bible wording to update with the glossary (no canon change): WB-C12 ("the voice's branch"),
WB-C13 ("return procedure", "relay"), WB-C14, WB-C15 ("station fallbacks"), WB-Q05, and the
term list in section 10 "Names and terms".

## 11. Story heart for the World Bible (WS6)

Proposed as a new section 2a, "The story heart", after "The story at a glance". Label it
**Proposed** until the author approves it (A-D9).

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

Effort is in writer-days (wd) or engineer-days (ed). Total about 9 wd and 4 ed, in line with
the review's two weeks.

| #       | Task                                                                                                                                                      | Owner             | Input                        | Output                                                                   | Effort        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------- | ------------------------------------------------------------------------ | ------------- |
| 1.1–1.6 | Apply section 6.1 text fixes in `story.ts`, `campaignStory.ts`, `maps.ts`, `app.ts`, and `STORY.md` rows                                                  | Engineer          | Approved section 6.1         | Edited data, `STORY.md`, pinned tests updated                            | 0.5 ed        |
| 1.7     | Add enemy names to the reader exporter's `names` table                                                                                                    | Engineer          | `export-story-reader.mjs:67` | Reader shows "The Malificat"                                             | 0.1 ed        |
| 1.8     | House spelling decision and pass (optional)                                                                                                               | Writer            | A-D7                         | Spelling list in WB section 10; edits                                    | 0.5 wd        |
| 2.1     | Add the voice guide and register map to WB section 10                                                                                                     | Writer            | Section 7                    | Bible subsection                                                         | 1 wd          |
| 3.1     | Finalise Vesper N1–N13 with the author                                                                                                                    | Writer            | Section 8.1                  | Approved lines                                                           | 1 wd          |
| 3.2     | Finalise visions and prelude                                                                                                                              | Writer            | Sections 8.2–8.3             | Approved lines                                                           | 0.5 wd        |
| 3.3     | Update `STORY.md` Vesper and Wyrm tables to match                                                                                                         | Writer            | 3.1, 3.2                     | Script rows                                                              | 0.5 wd        |
| 3.4     | Per-stop intros: `VESPER_INTROS` in `story.ts`; `vesper()` in `npcs.ts:1115` merges `{ ...VESPER_LINES, intro }`; reader exports `SR-vesper.intro.<stop>` | Engineer          | A-D4                         | Code, reader, updated `story.test.ts:245`, `script.test.ts` Vesper table | 1 ed          |
| 3.5     | Prelude rotates under its own key (`src/game/story.ts:126`, e.g. `wyrm.prelude`)                                                                          | Engineer          | A-D5                         | First lair visit shows the first-visit line                              | 0.3 ed        |
| 4.1     | Finalise class lines with the author                                                                                                                      | Writer            | Section 9.1                  | 12 approved lines                                                        | 1 wd          |
| 4.2     | Add `heroSays` helper and class lines at three beats                                                                                                      | Engineer          | 4.1, section 9.2             | Data change                                                              | 0.3 ed        |
| 5.1     | Finalise glossary; confirm enemy and map renames                                                                                                          | Writer            | Section 10, A-D6             | Approved glossary                                                        | 1 wd          |
| 5.2     | Apply glossary across the listed lines; update WB-C12–C15, WB-Q05 wording                                                                                 | Writer + Engineer | 5.1                          | Data and bible edits                                                     | 1 wd + 0.5 ed |
| 6.1     | Add the story heart to the World Bible                                                                                                                    | Writer            | Section 11, A-D9             | WB section 2a                                                            | 0.5 wd        |
| 7.1     | Write `tests/storyText.test.ts` and update pinned tests                                                                                                   | Engineer          | Section 13                   | Passing tests                                                            | 1 ed          |
| 7.2     | Regenerate Story Reader; publish an old→new passage ID map for changed Vesper and vision IDs                                                              | Engineer          | All edits                    | Reader, manifest, ID map in the PR description                           | 0.2 ed        |
| 7.3     | Cold read, blind sort and child comprehension check                                                                                                       | QA / Writer       | Built game or reader         | Short report in `docs/reviews/`                                          | 1 wd          |

## 13. Verification and tests

### 13.1 Commands

1. `node tools/export-story-reader.mjs` to regenerate the reader, then
   `node tools/export-story-reader.mjs --check` (fails if the reader or its manifest is stale).
   Preserve any annotated author copy first, as the tool warns.
2. `npm run check` (format, lint, typecheck, all tests).
3. `npm run build:native`, which regenerates `ios/ManaCrystalsPlaytest/Engine/battle-engine.js`;
   it still contains the old strings until rebuilt.
4. `grep -rn "Sunken Ruins\|next chapter\|surface-bug" src ios/ManaCrystalsPlaytest` returns only
   save-migration names and comments.

### 13.2 New test file: `tests/storyText.test.ts`

A helper `playerText()` gathers every player-facing string with a source label: all `SCENES`
(title, stage, line, class lines), `VISIONS`, `PRELUDES`, `WARD_AFTER_WYRM`, `WARD_TOAST`,
`VESPER_LINES` and `VESPER_INTROS`, `NPCS` and `CAMPAIGN_NPCS` (names and every line cell),
`MENTORS` text fields, `MAPS` names, warp `lockedText` and `stirs.text`, `ENEMIES` names and
descriptions, `ENCOUNTER_DEFS` text fields and `HAREGUY`.

| Test                                               | Asserts                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no obsolete names                                  | No string matches `/Sunken Ruins/`, `/\bEmberforge\b/` or the old hero/cast names `/\b(Fen\|Bram\|Lyra\|Bea\|Odo\|Ilse)\b/` (WB section 10).                                                                                                                                                                                                                                                                                                                     |
| no out-of-fiction phrasing                         | No string matches `/next chapter/i`, `/\b(TODO\|TBD\|FIXME\|placeholder\|lorem)\b/i`, `/has the last word/i`, `/distracting everyone/i` or `/\bsuddenly\b/i`. `/\bchapter\b/i` is allowed only in scene titles.                                                                                                                                                                                                                                                  |
| stage text is staged                               | For every scene beat, `stage` with all `*…*` spans and `"…"` quotes removed is empty.                                                                                                                                                                                                                                                                                                                                                                            |
| every speaker has a proper name                    | Every `beat.who` is `hero` or resolves in `CAMPAIGN_SPEAKERS`, `NPCS`, `MENTORS` or `ENEMIES`, and the name starts with a capital letter. The reader file has no speaker label matching `/^\*\*[a-z]+\*\*$/` outside the mentor field labels (`motive`, `winText`, …).                                                                                                                                                                                           |
| pronouns match the cast sheet                      | No string contains "the boy who made them". No beat that names Vesper, and names none of Fennick, Rowan, Irdrath, Hareguy, Pete, Ordor or Pip, contains `/\b(he\|him\|his\|himself\|boy)\b/i`. `SR-campaignRecovery-03` contains "his hand".                                                                                                                                                                                                                     |
| no stock dark-fantasy phrases                      | No string matches `surface-bug`, `brave meat`, `dust returns to dust`, `silence between stars`, `hubris`, `moonless tide`, `creature of clay`, `vermin`, `feed the deep`.                                                                                                                                                                                                                                                                                        |
| Vesper has 10–14 reachable lines and no dead cells | Total variants across `VESPER_LINES` and `VESPER_INTROS` is 10–14. `confide` has only a warm cell; `refuse` has only a cold cell. No Vesper line exceeds 30 words.                                                                                                                                                                                                                                                                                               |
| one line per vision                                | Each `VISIONS[i].lines` has exactly one variant (if A-D5 is approved).                                                                                                                                                                                                                                                                                                                                                                                           |
| each late scene answers every hero's hesitation    | In `vesperAcceptance`, `campaignRite` and `mossvaleRecovery`, exactly one `hero` beat has `classLines` whose keys equal `Object.keys(CLASSES)`; the four lines are non-empty, distinct and differ from `line`; `scenePages` for each class shows that class's line.                                                                                                                                                                                              |
| campaign text uses the glossary terms              | Strings from `CAMPAIGN_SCENES`, `CAMPAIGN_NPCS`, campaign maps and `CAMPAIGN_ENEMIES` do not match `/\bupper branch\b/i`, `/\blower (branch\|return)\b/i`, `/\brelay\b/i`, `/\breturn (procedure\|path\|cord\|bell)\b/i`, `/\bstations?\b/i`, `/\bsequence\b/i`, `/\bcircuits?\b/i`, `/\binner ward\b/i`, `/\bvessels?\b/i`, `/\b(outer\|test\|small) ring\b/i`. First-half uses such as Rowan's "outer ring" of the well (`npcs.ts:109`) are outside this scan. |

### 13.3 Existing tests to update in the same change

| File                       | Lines                           | Change                                                                                                                                                 |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/script.test.ts`     | 44, 119, 223, 277–283           | Rename the ward section; read Vesper intros by stop; replace the pinned author phrases with the approved new ones.                                     |
| `tests/scenes.test.ts`     | 232–239                         | New `chapterEnd` order strings (Vale, ward, wind, footprints, "the child").                                                                            |
| `tests/story.test.ts`      | 164, 183, 190–196, 245, 272–298 | One-variant visions; prelude on its own key, with a new case "the lair speaks its first line on the first visit" after three visions; per-stop intros. |
| `tests/nativeTome.test.ts` | none expected                   | Run to confirm beat indexes still match staging.                                                                                                       |

## 14. Milestones

| Milestone  | Content                                                                   | Exit check                                           |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| M1, day 2  | Section 6 fixes, exporter fix, `storyText.test.ts` with the hygiene tests | `npm run check` and reader `--check` pass            |
| M2, day 5  | Voice guide, Vesper, visions and prelude drafts approved by the author    | A-D1, A-D4, A-D5 answered                            |
| M3, day 8  | Class lines, glossary and story heart approved; all data edits merged     | All section 13.2 tests pass                          |
| M4, day 10 | Cold read, blind sort and child comprehension check                       | Acceptance criteria in section 5 met, or fixes filed |

## 15. Risks and mitigations

| Risk                                                          | Mitigation                                                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tests pin the author's own first-half words.                  | Treat `STORY.md`, data and tests as one change after A-D1; never edit data alone.                                    |
| Reader passage IDs change, breaking existing review comments. | Publish an old→new ID map (task 7.2). Scene beat IDs do not change, because no beats move.                           |
| Drafts quietly decide Plan B lore.                            | **[B]** markers; Plan B reviews every marked line; the voice never states facts about itself.                        |
| Vesper's established traits disappear with the stock lines.   | Section 8.1 maps each trait to a new line (the Master in N5 and N13, the sun and glory in N6); task 3.1 confirms it. |
| Class lines make the hero chatty or preachy.                  | One line per scene; under 25 words; no line names its own hesitation.                                                |
| Plain terms sound childish to older readers.                  | Use physical nouns (pipe, lever, circle), not baby talk; the adult characters still speak tersely.                   |
| Per-stop intros need code and could slip.                     | The shared-intro fallback in section 8.1 keeps the plan shippable without task 3.4.                                  |
| Translations run longer than English.                         | Lines are shorter than today's; keep stage directions to one action.                                                 |

## 16. Author decisions

| ID   | Decision                                                                                                                                    | Affects                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| A-D1 | Approve rewriting your own first-half words in `STORY.md` (chapter end, ward text, Vesper, visions, prelude)? Extends SQR-D01.              | `STORY.md`; tests in section 13.3                     |
| A-D2 | "The boy" becomes "the child" (default). If the old word was meant as Fennick's outdated view, say so and Plan D can address it on screen.  | WB-Q01, WB-C17                                        |
| A-D3 | Fennick uses he/him throughout, including WB section 5 ("They need reliable evidence", line 367).                                           | WB-Q01                                                |
| A-D4 | Per-stop Vesper intros (small code change), or the shared fallback intros?                                                                  | WB section 5, Vesper; WB-C06                          |
| A-D5 | One line per vision, and the prelude's first-visit stage that shows the voice and the animal as separate.                                   | WB-C09, WB-Q02 (planted, not answered)                |
| A-D6 | Approve the glossary, including the enemy rename "Relay Keeper" → "Switchworks Keeper" and the map title "Inner Ward" → "The Ward Chamber". | WB-C12, WB-C13, WB-C14, WB-C15, WB-Q05 (wording only) |
| A-D7 | House spelling: British or American?                                                                                                        | WB section 10, writing standard                       |
| A-D8 | Keep "End of Chapter One" and "Chapter One complete" as book chrome?                                                                        | WB section 2                                          |
| A-D9 | Adopt the story heart (theme, pillars, ending feeling) as Established?                                                                      | New WB section 2a; WB-Q06 (ending tone)               |
