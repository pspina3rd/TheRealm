# Plan B — The answer behind the voice

**Execution plan · revision 2, 3 November 2026 · author-only spoilers · planning document, no game
changes**

This plan carries out Plan B of the
[story quality review](../reviews/STORY_QUALITY_REVIEW.md) (findings F1, F4 and F10). It drafts
the secret history, a fair clue trail, vision rewrites and the World Bible text that would make
them canon. Passage IDs (`SR-…`) refer to the [Story Reader](../WORLD_BIBLE_STORY_READER.md).
Decision and check IDs (`WB-…`) refer to the [World Bible](../WORLD_BIBLE.md). Line numbers are
for `GetPutTaco` as read on 3 November 2026. Revision 2 answers the
[review of plans A–D](PLANS_REVIEW.md); section 14 lists every finding and its resolution.

Nothing here is canon until the author approves it. Every canon change is listed as a decision in
section 13, with the check or question it affects.

## 0. Goal, scope and assumptions

**Goal.** The author knows what the voice is. Every major fact behind it is planted at least three
times, once in the first hour, and confirmed on screen for every player. A player who rereads the
visions after the ending finds that the voice never lied.

**In scope.** The secret history (section 2), truth table (3), clue ledger (4), vision rewrites
(5), Fennick seeding before the midpoint (6), delivery rules (7), World Bible text (8), tasks (9),
verification (10), and lore inputs for Plans C and D (2.10, 2.11).

**Not in scope.** Board mechanics (Plan C). Vesper's want, arc, first-half lines and late scenes
(Plan D). Register, line budgets, glossary and vision mechanics (Plan A). No code, data or test is
changed by this document.

**Ownership after review** (conflicts C-2, C-3, C-6, C-11, C-13 in the review):

| Area                                        | Content owner | Also involved                    |
| ------------------------------------------- | ------------- | -------------------------------- |
| Secret history, truth table, clue ledger    | B             | A (register of every plant)      |
| Visions 1–3, the lair, `SR-chapterEnd-04`   | B (words)     | A (register; one-line mechanics) |
| Vesper's first-half lines                   | D             | A (budget), B (the R9 fact only) |
| Underground scene list, IDs and flags       | D             | B places plants on D's list      |
| "Ves, en." meaning and when it is spoken    | B             | C (lantern mechanic), D          |
| The rite: mechanics / lore (order, singers) | C / B         | —                                |

**Dependencies.**

| Plan   | What Plan B needs from it                                                                                                   | What Plan B gives it                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Plan A | A-D1 (rewrite the author's script), A-D5 (one line per vision; prelude on its own key, A task 3.5), the glossary, F7 fixes. | Clue content for every rewritten line, marked so polish keeps the clue. |
| Plan C | The lantern phase of the Malificat fight, if built (2.11, C-6).                                                             | Rite order, singer colours, why tended stones resist (2.10).            |
| Plan D | PD-D03 decided before B's text task (T5); D's final scene IDs and flags (`read`, `hush`).                                   | Lore facts for Vesper, Fennick, `warrensLit`, `hollowsHush` (2.11).     |

**Assumptions** (stated so work can start without questions):

1. The eighth-stone candidate in the review is the starting point (SQR-D02). An alternative is
   given in 2.9.
2. Rowan's well becomes a _contributing_ cause, not the whole cause (SQR-D03).
3. **PD-D03 is approved.** The ledger in section 4 uses D's scene list (`archiveRefuge` hands over
   the ledger; `archiveDrained` and `bellShift` are cut; `rootwaysRecord` is rewritten;
   `hollowsEscaped` replaces `bellRelief`). If PD-D03 is rejected, use the fallback in 4.3.
4. **A-D5 is approved.** Each vision has one line and the lair prelude rotates on its own key.
5. **PD-D06 is approved.** Fennick looked after twelve children, Vesper among them.
6. A talk-only NPC may not be supported. Where a new NPC is proposed, a fallback task is given.
7. Encounter order is unchanged apart from D's `campaign-hush` fight (WB-C10, PD-D04).
8. "Mossvale" in text means the chosen home, through the existing substitution.

## 1. Problems this plan solves

### P1. The mystery has no answer behind it

**Symptom.** Nobody can say what the voice is, why it wants people asleep, or how the stones,
moonlight, blight and sleep connect (bible section 4; WB-Q02, WB-Q05). The visions contradict each
other: "The moon above is just my pale reflection" (`SR-vision3.02`) against "I drank the
moonlight" (`SR-prelude-moonWyrm.02`). Players have nothing fair to solve.

**Root cause.** Three things, in order:

1. **No secret history.** The visions and Vesper's lines were written as atmosphere first. Later
   writers rightly refused to treat them as fact, so no one could build on them.
2. **Clues without a referent.** Strong hints already exist ("Cracked the bedrock with it",
   `SR-refusal-04`; "The violet stone at Sevenstones dimmed first. I don't think that's chance",
   `SR-mentor-selene.afterLesson.plain.01`), but nothing confirms them.
3. **Lies, not framing.** The visions make physical claims ("Every breath you take on the surface
   draws air from my cavern", `SR-vision1.02`) that nothing pays off. A voice that lies teaches the
   player to ignore it.

A fourth cause was found in review: **half the vision text is never shown.** All visions and the
lair share one counter (`src/game/story.ts:89-91`, `:124-127`), so a normal run sees
`SR-vision1.01`, `SR-vision2.02`, `SR-vision3.01` and the lair's second line, and never the others.
Section 5 therefore writes one line per vision.

**Tasks** (section 9): T1 approve the history; T2 bible text; T3 ledger data; T4 visions and lair;
T5 plants and confirming beats on D's scene list; T6 Brightwater NPC; T7 clue-ledger test; T8
hometown parity; T9 script and test sync; T10 native book list; T11 combined playtest.

**Affected passages.** `SR-opening-03` and `-04` (`src/data/story.ts:225`, `:230`),
`SR-refusal-03` and `-04` (`story.ts:281`, `:287`), `SR-vision1`–`3` (`story.ts:24-55`),
`SR-prelude-moonWyrm` (`story.ts:60-61`), `SR-chapterEnd-01` and `-04` (`story.ts:321-341`), the
Mossvale house inspects (`src/data/maps.ts:154-183`), and new beats in D's `archiveRefuge`,
`rootwaysRecord` and `hollowsEscaped`, plus `irdrathYielded`, `lishalSilenced`, `campaignReturn`,
`rowanReturn`, `campaignRite` and `malificatFallen` (`src/data/campaignStory.ts`).

**Before → after.**

| Passage                     | Before                                                                       | After                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SR-opening-03`             | "_Far beneath the stones, something enormous breathes in._"                  | "_Far beneath the stone circle, something enormous breathes in._" (the voice is under the circle, not in the caves)  |
| `SR-vision3.01` (only line) | "They lock the iron gates to keep me out... or to keep you caged…"           | "Seven stones around one sleeper. They call it a ward. The violet one is hungry tonight. I can wait." (section 5)    |
| `SR-prelude-moonWyrm.02`    | "For centuries I drank the moonlight while your kind built huts in the mud." | Retry line: "Back again? No one has woken this one in a hundred years. Rest instead." (true; names a separate "one") |
| `rootwaysRecord` (D)        | "The same promise. Both times." with no promise quoted                       | D's reading scene adds: "_Every entry ends with the same words: 'The stones will answer you.'_"                      |

**Acceptance criteria.**

- The author can answer every F1 question in one sentence (section 3) and has signed off SQR-D02.
- Every reveal R1–R11 has three or more plants, at least one _guaranteed_ before its confirmation,
  at least one in the first hour, and at least one _guaranteed_ confirmation.
- No vision, prelude or voice line states something the secret history says is false.

**Verification.** `tests/clueLedger.test.ts` (10.2) and the combined cold-reader playtest (10.1):
at least half of the readers guess the voice's nature before the rite.

### P4. Vesper's motive is thin (lore side only)

**Symptom.** Vesper's acceptance (`SR-vesperAcceptance-15`–`18`) has nothing behind it in the lore:
the player does not know what the voice offered, why Vesper could hear it, or why "I can hear the
surface" is a reward.

**Root cause.** The lore never said why the voice picks a person, or what a bearer gets. Plan D
owns the arc and the lines (PD-D01, C-2). Plan B supplies only the facts the arc stands on.

**Lore facts supplied** (2.5, 2.11): Vesper grew up beside the stone circle, one of twelve children
in Fennick's care. They heard the singing under the stones. Fennick told them it was the wind. The
voice was the first thing that seemed to speak only to them, and it said their name right. Its
promise to every bearer is the same: "The stones will answer you." The promise is true, and it is
the trap.

**Tasks.** T5 (plants on D's scenes), T6 (Fennick in Brightwater). B's earlier Vesper drafts
(revision 1, NP-09) are withdrawn in favour of D's per-stop lines.

**Before → after.** The R9 fact enters through D's ruins stop `confide`
(`PLAN_D_VESPER_STORY.md` §5.3), which already reads "The man who looked after us read to twelve of
us at once." B proposes one added sentence for D to accept or reword: "Under the circle, something
sang to me. He said it was the wind."

**Acceptance.** Before the midpoint, a player can meet the old man and learn that he raised
children by the circle. At `SR-vesperAcceptance-05`, the player recognises the promise from vision 1
and the ledger.

**Verification.** Clue-ledger rows R3 and R9; combined playtest question B6.

## 2. The secret history (author-only draft)

Author-only. Players learn it in pieces and never as one speech. Proposed until SQR-D02 is decided.

### 2.1 The stones and the schools

Long ago there were eight stones under Sevenstones, and each one sang. Seven songs keep the world
awake: fire warm, water moving, earth holding, wind blowing, storms breaking, things growing, and
minds clear. The seven schools of magic are those seven songs learned by people. That is why there
are seven schools, seven mentors and seven stones in the circle.

The eighth stone sang sleep. Its song is not evil. Every night it brings rest, and every morning
the seven songs bring people back. The trouble is balance. Once, in a hard winter, people begged
for rest and the eighth song grew until whole towns did not wake.

### 2.2 The Lamplighters and the ward

The people who woke those towns became an order: the **Lamplighters**. Their sign is seven rays
around a closed eye. They moved the eighth stone from the centre of the circle, where an empty
hollow still lies, and buried it deep beneath. Then they set the seven stones so their songs ran in
a ring. The ring is the **ward**. Inside it, the eighth song is turned down to a lullaby. It cannot
cross the ring, because the ring is all seven songs at once.

The ring has an upper half (the seven stones at the circle) and a lower half that runs deep under
the surface country like a root and brings each song back to its stone. Game text calls it "the
missing piece of the circle" (Plan A glossary); "lower return" stays an author term. The
Lamplighters marked where it runs with small rune stones that say "not here": do not dig.

They taught the villages two habits that outlived them: light the lamps at dawn, and say the waking
words, "Ves, en." In the stone tongue, _ves_ is rest and _en_ is enough. "Ves, en." means **"Rest,
enough."** It is how you wake someone. People still say it when they light the lane lamps, without
knowing why. Children translate it as "up you get".

Their brass lanterns have no wick because they carry stone-light, not flame. The order's singers
lived below to tend the few sleepers who never woke. Its wardens lived at the circle. Its records
went into the archive that is now the flooded Sunken Archive. Moonfall's tower was their
observatory, where they kept tables of moonlight (PB-D09).

### 2.3 The voice: what it is, what it wants, what it gains

The voice is the eighth stone's will. It is very old and cannot move. It wants rest for everything,
forever, and calls that mercy: no more cold, hunger, fear or work. **It does not hate and does not
get angry.** It is patient, and it waits.

A song needs listeners. Every sleeper is a listener, and a sleeping listener hums the song back, so
each new sleeper makes the song louder. With enough listeners, the eighth song drowns out the other
seven. Sleepers are not food. They are a choir. It listens closely, so it always says a person's
name right.

It reaches listeners through cracks in stone, still water, bell and lamp lines, and anything that
once sat in the ring, such as an old rune stone. It hears whoever carries one, and they hear it.

**How long sleep lasts.** A sleeper stays asleep while they can still hear the song. Sleep that
arrives in a sudden burst (through bells near the Lishal's frame) ends within a day once the burst
stops. Sleep on the surface lasts weeks, because the song keeps reaching sleepers through stone
and still water until the violet stone is strong again. When stones go dark, more people fall
asleep, which is why Brightwater loses three more during the Malificat (Plan D §7.4).

### 2.4 Vessels

The voice cannot cross the ring on its own. It needs a **vessel**: a body that carries its song.

- **Sleeping vessels** carry it but cannot choose. The Moon Wyrm is one.
- **Waking vessels**, or **bearers**, choose to carry it. A bearer can walk up to the stone circle.
  There the promise comes true: "The stones will answer you." A bearer can draw on all seven songs.
  But a living body cannot hold the eighth song and stay awake. When the borrowed songs leave, the
  bearer sleeps and does not wake. That is what happened to the earlier bearers in the ledger.
- **"Malificat"** is the Lamplighters' word for a bearer drawing on all seven stones at once.

The voice never lies about the promise. It leaves out the end.

### 2.5 The people and powers below

**The Lishal** were the order's seven singers, one for each stone. They sang the eighth song quiet
and nursed the sleepers. They listened to it every day for centuries and came to agree with it.
They kept the ledger of bearers and chose each replacement, believing a bearer could carry rest
gently to a suffering surface. Their sounding frame uses seven crystals, re-tuned to carry the
eighth song up the bell and lamp lines. They truly think sleep is the kindest thing. They are still
responsible for what they choose.

**Irdrath** is a fire warden set by the Lamplighters to keep sleepers warm "until we come back".
They never came back. Keeping the sleepers became the point, and he forgot that waking them was the
job. The **Firstcoal** is an ember carried down from the red stone. It is his heat and his grip.
Freed, its light goes home to the red stone.

**Fennick** is one of the last Lamplighters at the circle. He can read the markings and knows the
habits, but most of the procedure was lost with the archive. He looked after twelve children by the
ward, Vesper among them.

**Vesper** grew up beside the stones. As a child they put an ear to the stones and heard singing.
Fennick, not wanting to frighten them, said it was the wind. The voice was the first thing that
seemed to speak only to Vesper. They went below to find it. If PD-D02 keeps "the Master", the voice
let them believe the Wyrm was its master. If PD-D02 removes it, the voice simply let them believe it
spoke from the deep caves. Everything else about Vesper belongs to Plan D.

### 2.6 Moonlight, the violet stone and the blight

The **violet stone** (minds, Arcane) holds the eighth song down. It bears the most weight, so it
fails first. Its song is fed by moonlight, which is why Arcane cannot be learned until the
moonlight returns after the Wyrm. It is also the last stone the rite lights ("The violet stone went
first, and it will go last", `SR-campaignRite-08`).

The **moon-crystal** is not a stone of the ring. It is a natural lens deep in the Moon Caves where
moonlight gathers and runs up through the rock to the violet stone. The voice had the sleeping Wyrm
coil around it. The Wyrm's body blocked the light. The voice took nothing from the moon. It only
stood in front of it.

**The blight** is what happens to a place when its stone's song goes quiet. Water stills and
clouds. Meadows grey. The wind stops. Lamps give half their light. Mould grows in still, dark,
sleeping places and rises along cracks. It is a symptom, not a weapon. The Lamplighters planted
small growing things behind glass in the Glass Warrens to show where the songs still reach: they
lean toward living light and grey where the songs are quiet (Plan D `warrensLit`).

**Sleep** takes whoever is asleep in the song's path on the nights it is loudest. Which houses is
chance. That is part of why it feels cruel.

### 2.7 Rowan's well

Forty years ago, Rowan dug his well and hit granite. In the dirt he found a small rune stone with a
worn mark: seven rays around a closed eye. It was a Lamplighter marker for the ring's deep half. He
could not read it. He used it to crack the bedrock, and cracked the ring with it.

The crack was small. Through it, a thread of the eighth song reached the surface for the first time
in an age ("Something breathed down there", `SR-npc-elder.confide.warm`). Over decades it found the
sleeping Wyrm and the moon-crystal. Rowan did not make the voice. He gave it an ear. The voice, the
Lishal and Vesper made their own choices. The missing piece in Fennick's drawing is the part
Rowan's crack broke. The rite mends it, with wedges Rowan tells the hero how to cut
(`SR-rowanReturn-08`–`10`).

The rune stone is a ring stone, so whoever holds it can hear the voice. That is why the visions
begin only after Rowan gives it to the hero (`requiresFlags: ['got:wellStone']`, `story.ts:29`).
The hero is not chosen. The hero is holding the stone.

### 2.8 The events of the game

| When                       | What happens                                                                                                | Where the player sees it                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Long ago                   | The hard winter. The Lamplighters bury the eighth stone and build the ward.                                 | Lamp post, ledger cover, the hollow (NP-22)             |
| Centuries                  | The order fades. The singers below become the Lishal and send bearers. Each bearer dies.                    | The ledger (NP-14, NP-15)                               |
| 40 years ago               | Rowan's well cracks the ring.                                                                               | `SR-refusal-04`, `SR-npc-elder.confide.warm`            |
| Decades                    | The thread finds the Wyrm, which coils around the moon-crystal. Moonlight thins. Selene starts counting.    | NP-03, `SR-mentor-selene.arrives.plain.01`              |
| Some years ago             | Vesper hears the voice and goes below.                                                                      | Fennick in Brightwater (NP-08), D's ruins stop          |
| Three weeks before opening | The violet stone weakens. Sleep starts near the Cave Pass. Hareguy falls asleep at Pete's inn.              | `SR-refusal-03`                                         |
| Opening night              | The violet stone goes dark. The song reaches the hero's home. Three houses do not wake.                     | `SR-opening-02`–`04`                                    |
| Midpoint                   | The Wyrm falls. Moonlight returns; the violet stone glows. The voice lets the Wyrm sleep its own sleep.     | `SR-wyrmFall-03`, `SR-chapterEnd-01`, `-04`             |
| Underground                | Vesper reads the ledger, loses the duel, opens the bell lines to follow the voice, then accepts it.         | D's `rootwaysRecord`, `hollowsHush`, `vesperAcceptance` |
| Return                     | Vesper carries the voice toward the circle; the violet stone dims again. The hero brings the missing piece. | `SR-ascentOpened-03`, `SR-campaignReturn-10`            |
| The rite                   | The ring is mended. Vesper draws on all seven inside it. The ring holds and the songs go home.              | `SR-malificatRisen-07`, `SR-malificatFallen-01`         |
| After                      | Fennick says "Ves, en." once, at the lantern. Vesper wakes and lives. The voice stays below.                | NP-23 (or Plan C's lantern phase)                       |

**Why Vesper lives where earlier bearers died.** The earlier bearers were outside a working ring.
Inside the mended ring, the borrowed songs go back to their stones instead of burning out the
bearer. Fennick's waking words do the rest.

### 2.9 Reconciliation with the World Bible

Every item labelled **Established** in the bible, checked against this history, plus the bible's
rules about added histories.

| Established item or rule (bible section)                                             | Fit                  | Note                                                                                                           |
| ------------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sevenstones, stone circle, seven stones; only Mossvale connects (3)                  | Kept                 | The eighth stone is buried, not an eighth site. No new spoke into the sanctuary.                               |
| Four hometowns; opening cast once; mentor homes fixed (3, WB-C02)                    | Kept                 | The ring's deep half runs under the whole surface country, so Rowan's well cracks it in any of the four homes. |
| Surface regions, Brightwater, Moon Caves via Moonfall (3)                            | Extended             | Moonfall's tower becomes an old Lamplighter observatory (new place lore, PB-D09). No map change.               |
| Violet stone dims first; lights weaken; spores, pale meadows, lake (4)               | Explained            | 2.6.                                                                                                           |
| Wyrm coils around the moon-crystal; the voice "claims" to consume moonlight (4)      | Changed wording      | The claim is retired; the voice now says it blocks. The coil is kept. New WB-C25.                              |
| Voice claims are not physical law (4)                                                | Kept                 | Visions remain the voice's framing: true but partial (WB-C20).                                                 |
| Wyrm's defeat restores moonlight; sleepers stir (4, WB-C08)                          | Kept                 | The Wyrm's body no longer blocks the lens.                                                                     |
| Seven schools; Arcane after the Wyrm (4)                                             | Explained            | The violet stone's song needs moonlight.                                                                       |
| Rowan teaches Quake through the well (4, WB-C03)                                     | Kept                 | Reward unchanged.                                                                                              |
| Moon-crystal distinct from violet stone (4)                                          | Kept                 | A lens, not a ring stone.                                                                                      |
| Focus Stone / rune stone separate from spell and moon-crystal (4)                    | Kept, extended       | It becomes a Lamplighter marker. Still separate from both.                                                     |
| Moon Shards do not establish a stone origin (4)                                      | Kept                 | Not used.                                                                                                      |
| No chosen hero, heir or relative of the antagonist (5)                               | Kept                 | Visions come from the stone the hero carries.                                                                  |
| Rowan's worry "does not prove he caused every later harm" (5)                        | **Changed**          | His worry becomes partly true; he did not cause the voice or anyone's choices. SQR-D03, WB-C22.                |
| Rowan's knees; no expedition (5, WB-C16)                                             | Kept                 | His part is advice and wedges at home.                                                                         |
| Pip's mother awake; Hareguy asleep three weeks (5, WB-C05)                           | Kept                 | Brightwater, near the Cave Pass, fell asleep first.                                                            |
| Vesper sought glory, remembers the sun; "Master" (5)                                 | Kept or adapted      | Childhood in the sun at the circle. "Master" follows PD-D02 (2.5).                                             |
| Wyrm survives asleep; voice calls it an obedient throat (5, WB-C08)                  | Kept                 | "A real sleep this time" becomes literal.                                                                      |
| Separate the animal from the voice without a settled origin or guilt (WB-C09)        | **Changed**          | Settled: the voice is the eighth stone; the Wyrm had no choice. New WB-C09 in 8.3.                             |
| Old man with a lantern recognises the tracks; Fennick's rite late (5)                | Kept                 | He is a Lamplighter. Pronoun fix in `SR-chapterEnd-06` is Plan A's.                                            |
| Rule: no secret histories "merely to make a character seem important" (5)            | **Waived knowingly** | Each addition carries a clue the mystery needs. Named in PB-D04, PB-D05 (F-15).                                |
| Rule: Irdrath needs "no … tragic former profession" (5, Irdrath)                     | **Waived knowingly** | "Warden" is a job, not a tragedy, but it is a former role. PB-D04 asks the author to accept or cut it (F-15).  |
| Team-source Malificat design: "Ves, en." clears six rows (`ENCOUNTER_DESIGN.md:984`) | Kept                 | It is the lantern moment of 2.11. WB-C24 allows it there and nowhere else (F-12).                              |
| Encounter order and midpoint false victory (7, WB-C10)                               | Kept                 | No new boss from Plan B.                                                                                       |

**Established items this plan would change:** the Rowan sentence in section 5, WB-C09, and the
section 4 wording "claims to consume moonlight". Two section 5 rules are waived knowingly.

### 2.10 Inputs for Plan C (the rite and the bosses)

| Plan C needs                        | Lore answer                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rite order of the seven stones      | Red (Fire), orange (Earth), blue (Water), green (Nature), cyan (Wind), gold (Lightning), then violet (Arcane) last, with the lantern beside it. Warmth first; the lid last (`SR-campaignRite-08`).                                          |
| One stone per Lishal singer         | Same order: first singer red, second orange, third blue, fourth green, fifth cyan, sixth gold, seventh violet. The sixth (storms, breaking) is the one who doubts; the seventh (the lid) never leaves the crystals (`SR-lishalRefusal-13`). |
| Why a tended stone resists the draw | A song that a living person is singing cannot be borrowed. A helper who learned that stone's song keeps it sung, so the Malificat can only draw on stones no one is holding.                                                                |
| What the Firstcoal does             | It is the red stone's ember. Freed, it goes home: the red stone brightens. Any board effect should read as warmth returning, not treasure.                                                                                                  |
| What the lantern does               | It holds morning light. When Fennick says "Ves, en.", it lets the light go. Plan C's six-row clear is that release (2.11).                                                                                                                  |
| What sleep feels like on the board  | Things stop moving and stop giving. Waking is contact with a living song of the same colour, which matches Plan C's drowsy rule.                                                                                                            |

### 2.11 Inputs for Plan D and "Ves, en." (C-6)

| Plan D scene or line                                           | Lore answer                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `warrensLit`: what grows behind the glass                      | Lamplighter song gardens: small plants that lean toward living light. The dark smear is a stretch where the songs no longer reach.                                                                                                                             |
| `hollowsHush`: why every bell rings                            | Not anger: the voice does not get angry (2.3). Retreating from the duel, Vesper opened the bell lines to follow the voice. The Lishal drive the frame harder, and the song floods the bells.                                                                   |
| `hollowsEscaped`: "The bell sleepers always do"                | True: burst sleep ends within a day once the burst stops (2.3).                                                                                                                                                                                                |
| `campaignRecovery`: "Three more fell asleep"                   | True: when stones go dark, more people sleep (2.3).                                                                                                                                                                                                            |
| `malificatRisen`: "He is outside. He has always been outside." | Reword as true framing: "He stayed outside. He always does." The voice may frame, never state a falsehood (WB-C20; F-14).                                                                                                                                      |
| Ridge `confide`: "It says my name right"                       | True and a clue: the voice listens closely (2.3).                                                                                                                                                                                                              |
| "Ves, en."                                                     | Spoken once in the whole second half, by Fennick at the lantern. If Plan C builds the lantern phase, it is said there and `malificatFallen` shows only its effect. If not, it is said in `malificatFallen` (NP-23). D's recovery keeps Fennick saying nothing. |

## 3. Truth table

One sentence each. "R" numbers are the reveals in section 4.

| Question                                                         | Answer                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 · Why does the voice want people asleep?                      | It is the eighth stone's will, and it believes endless rest is mercy (R1, R2).                                                                            |
| F1 · What does it gain from sleepers?                            | Each sleeper hums its song back, so more sleepers make it louder until it can drown the other seven (R2).                                                 |
| F1 · Why do the Lishal impose sleep?                             | They were the Lamplighters' singers, and centuries of listening convinced them sleep is kindness (R7).                                                    |
| F1 · Do the Lishal serve the voice?                              | They agree with it and work for it by choice, which is why their care and their locks are both real (R7).                                                 |
| F1 · What is Irdrath?                                            | A fire warden the Lamplighters set to keep sleepers warm until they returned, who forgot that waking them was the job (R8).                               |
| F1 · Why does the Firstcoal matter?                              | It is the red stone's ember that gives Irdrath his heat and his grip; freed, it goes home (R8).                                                           |
| F1 · What are the seven stones?                                  | Seven of eight singing stones; their songs keep the world awake, and each school is one song (R1).                                                        |
| F1 · Why does the violet stone fail first?                       | It holds the eighth song down and is fed by moonlight, which the Wyrm's body blocked (R4).                                                                |
| F1 · Why does the ward contain the voice?                        | The ward is all seven songs in a ring, and the eighth song cannot cross all seven at once (R6).                                                           |
| F1 · Who built the ward?                                         | The Lamplighters, Fennick's order (R6).                                                                                                                   |
| WB-Q01 · Who is the old man, and whose tracks?                   | Fennick, a Lamplighter who looked after twelve children by the ward; the tracks are Vesper's (R9).                                                        |
| WB-Q02 · What is the voice?                                      | The will of the buried eighth stone, which sings sleep (R1).                                                                                              |
| WB-Q02 · How much choice did the Wyrm have?                      | None: it was a sleeping vessel, and its fall gave it back its own sleep (R1).                                                                             |
| WB-Q05 · What does the rite do?                                  | It mends the piece of the ring that Rowan's crack broke, closing the circle (R5, R6).                                                                     |
| WB-Q05 · What does the ward do?                                  | It turns the eighth song down to a lullaby and keeps it, and any vessel inside, from leaving (R6).                                                        |
| WB-Q05 · What does the lantern do?                               | It holds morning light and releases it when Fennick says the waking words, which wakes Vesper (R6, R10).                                                  |
| WB-Q07 · What does "Ves, en." communicate?                       | "Rest, enough": the Lamplighters' waking words, still said when lamps are lit at dawn (R10).                                                              |
| WB-Q08 · What must the player understand before the final scene? | Fennick raised Vesper; bearers die after the same promise; Rowan's stone is a ring marker; the Lishal were Lamplighters; the voice lies under the circle. |
| Extra · Why do the visions start when they do?                   | The hero is carrying Rowan's rune stone, a ring stone the voice speaks through (R5).                                                                      |
| Extra · Why does the violet stone dim again after the Wyrm?      | Vesper carries the voice toward the circle and draws on the stones (R3, R4).                                                                              |
| Extra · Why does Vesper live?                                    | Inside a whole ring, the borrowed songs go home instead of burning out the bearer (R3, R6).                                                               |
| Extra · Why do the Hollows' bell sleepers wake in a day?         | Burst sleep ends when the burst stops; surface sleep lasts while the song still reaches through stone (R2).                                               |

## 4. Clue ledger

**Key.** _G_ = guaranteed: a scene beat or required task text seen on every route and by every
class. _C_ = chance: a mood branch, an optional NPC, a mentor-gated beat, or one class's line. _1h_
= in the first hour: gated only by flags in `FIRST_HOUR_FLAGS` (10.2). `NP-…` are new plants in
4.2. Passage IDs for D's new or rewritten scenes are written `D:<scene>` until D's text lands and
the reader is regenerated; the test then uses the real IDs.

Rule per reveal: three or more plants; one _G_ plant before the confirmation; one _1h_ plant; one
_G_ confirmation.

### 4.1 Reveals

| Reveal                                                             | Plants (type)                                                                                                                                                                                                                                                                            | Guaranteed confirmation                              | Extra confirmation (C)                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **R1** The voice is a buried stone under the circle, not the Wyrm  | NP-01 `SR-opening-03` (G, 1h); vision 2 "My serpent keeps the moon for me" (G); lair first visit "This one… Neither will I" (G); `SR-wyrmFall-01` (G); `SR-chapterEnd-04` (G); NP-04 lamp post (C, 1h)                                                                                   | NP-22 at `campaignRite`                              | `SR-malificatFallen-04`                                |
| **R2** Sleepers are listeners; it calls endless rest mercy         | `SR-opening-03` "Sleep." (G, 1h); NP-02 humming sleepers (G, 1h); `SR-mentor-maren.afterLesson.plain.02` (C, 1h); NP-10 Pete (C)                                                                                                                                                         | `SR-lishalRefusal-02`–`11`                           | NP-19                                                  |
| **R3** Bearers carry it, get the stones, and die                   | Vision 1 "Carry me. The stones will answer you." (G, 1h); `SR-chapterEnd-04` "I have others" (G); `D:archiveRefuge` ledger text "promised rewards, death dates" (G); NP-14 (G); NP-15 in `D:rootwaysRecord` (G); `D:rootwaysRecord` "And nothing here about how either bearer died." (G) | `SR-vesperAcceptance-05`                             | `SR-malificatRisen-04`                                 |
| **R4** The violet stone holds the song down and needs moonlight    | `SR-opening-02` (G, 1h); NP-03 Selene's letter (G, 1h); vision 3 "The violet one is hungry" (G); `SR-mentor-selene.motive` (C)                                                                                                                                                           | `SR-chapterEnd-01` (moonlight returns, violet glows) | `SR-ascentOpened-03`; `SR-campaignRite-08`             |
| **R5** Rowan's stone is a ring marker; his well cracked the ring   | `SR-opening-05` (G, 1h); NP-05 `SR-refusal-04` mark (G, 1h); vision 1 "His well let me hear the sky" (G, 1h); `SR-npc-elder.confide.warm` (C, 1h); NP-11 Dorn (C); NP-16 `D:hollowsEscaped` (G)                                                                                          | NP-20 at `campaignReturn`                            | NP-21 at `rowanReturn`                                 |
| **R6** The ward is the Lamplighters' ring of seven songs           | NP-06 "Ves, en." at dawn (G, 1h); NP-04 lamp post (C, 1h); vision 3 "Seven stones around one sleeper" (G); `SR-npc-guard.intro.cold` "ward frames" (C); `SR-campaignRite-16` (G)                                                                                                         | `SR-malificatRisen-07` (the recoil)                  | NP-22                                                  |
| **R7** The Lishal were the order's singers                         | NP-14 ledger cover in `D:archiveRefuge` "singers of the lower hall" (G); `SR-lishalRefusal-01` seven crystal sockets (G); `SR-vesperAcceptance-02` "Seven voices" (G); NP-12 Ivo (C)                                                                                                     | NP-19 at `lishalSilenced`                            | —                                                      |
| **R8** Irdrath is a warden; the Firstcoal is the red stone's ember | `SR-irdrathTrial-03` "I keep them warm through the night" (G); `SR-irdrathYielded-01` Firstcoal (G); `SR-mentor-torva.motive` (C, 1h); NP-13 Cinda (C); NP-06 half-lit lamps (G, 1h)                                                                                                     | NP-18 at `irdrathYielded`                            | `SR-campaignRite-02` (Torva)                           |
| **R9** Fennick raised Vesper at the circle                         | `SR-chapterEnd-06` "the child who made them" (G); NP-08 old man in Brightwater (C); NP-12 Ivo (C); D's ruins `confide` (C); NP-04 lamp post (C, 1h)                                                                                                                                      | `SR-campaignThreshold-03`                            | D's `rootwaysRecord` "He read to twelve of us"         |
| **R10** "Ves, en." is the waking words                             | NP-06 the hero says it at dawn (G, 1h); NP-07 Pip's "up you get" (C, 1h); NP-24 Fennick at the rite (G); NP-08 `win` (C)                                                                                                                                                                 | NP-23: Fennick says it; Vesper wakes                 | —                                                      |
| **R11** Blight is a stone's song going quiet                       | NP-06 "The lamps you lit give half their light" (G, 1h); `SR-opening-04` Fern and Ares lines (C, 1h); NP-17 Hazel, Rook, Kestrel (C); `D:warrensLit` dark smear (G)                                                                                                                      | NP-25 `SR-chapterEnd-01` "the wind starts up again"  | `SR-campaignRite-05` (Hazel); `SR-campaignRecovery-08` |

R1's first-hour plant (NP-01) is guaranteed, so the lamp post may stay optional. R9 has no _1h_
plant that names Fennick, by design: the lamp post's mark is the only first-hour link, and the
midpoint reveal should surprise. The test allows R9 this one exception (10.2).

### 4.2 New plants (drafted text)

Every first-half row also changes `docs/STORY.md` and `tests/script.test.ts` in the same change
(T9, F-05). "Insert" rows add a beat and must go on the native book list (T10, F-06).

| ID    | File and place                                                                                          | Kind   | Gate                                    | Text                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NP-01 | `story.ts:225`, `SR-opening-03` stage; `STORY.md` "Opening: the night the stone dims" row 3             | Edit   | `scene:opening`                         | _Far beneath the stone circle, something enormous breathes in. Every lamp in every village dims at once._                                                                                                                                                      |
| NP-02 | `src/data/maps.ts:160`, `:170`, `:180` inspect `text`, and the same houses in `hometownMaps.ts`         | Edit   | `opening:houseVisited`                  | Baker: "…The oven is cold. Under the breathing, very faintly, he is humming." Millers: "…neither stirs. Both are humming the same slow tune." Tess: "…Her lips move, as if she is singing along."                                                              |
| NP-03 | `story.ts:281`, `SR-refusal-03` stage (beat R3; no new beat); `STORY.md` "beats R1–R4" row R3           | Edit   | `scene:refusal`                         | _Selene's letter is a column of numbers, one for each night, each smaller than the last. Rowan reads his own, then reads it again. His hands shake._                                                                                                           |
| NP-04 | `maps.ts` Mossvale entities and each home in `hometownMaps.ts`: new `kind: 'inspect'` lamp post         | New    | none                                    | Title "The oldest lamp post". "Worn into its base: seven small rays around a closed eye. Pip says an old lamplighter cut it."                                                                                                                                  |
| NP-05 | `story.ts:287`, `SR-refusal-04` line; `STORY.md` row R4                                                 | Edit   | `scene:refusal`                         | "Found this the year I dug the well. See the mark? Little lines round an eye. Cracked the bedrock with it anyway. Take it, kid."                                                                                                                               |
| NP-06 | `story.ts:230`, `SR-opening-04` stage; `STORY.md` opening row 4                                         | Edit   | `scene:opening`                         | _Dawn in Mossvale. You light the lane lamps and say the old dawn words, the way everyone does: "Ves, en." The lamps give half their light. Bean tends her beds…_                                                                                               |
| NP-07 | `src/data/npcs.ts:248` Pip, `intro.plain` new variant; `STORY.md` Pip                                   | Edit   | `saidUntil: { flag: 'wyrmBeaten' }`     | "Gran says 'ves, en' means up you get. I say it to my tower when it's stuck."                                                                                                                                                                                  |
| NP-08 | New NPC `lamplighter` in `npcs.ts`; entity in Brightwater (`maps.ts:227-233`)                           | New    | section 6                               | Section 6.                                                                                                                                                                                                                                                     |
| NP-10 | `npcs.ts:15` Pete's shared line; `STORY.md` "Innkeeper Pete, on Rowan's son"                            | Edit   | none                                    | "Rowan's boy is upstairs. Three weeks asleep. Breathes fine. Hums, sometimes, like he's hearing a tune."                                                                                                                                                       |
| NP-11 | `src/data/mentors.ts:281` Dorn `afterLesson.plain`; `STORY.md` Dorn row                                 | Edit   | after Dorn's lesson                     | "Old miners had a rule. Find a marked stone, stop digging. Most people forgot it."                                                                                                                                                                             |
| NP-12 | `npcs.ts:1047` Ivo, `intro.plain` new variant                                                           | Edit   | `saidUntil: { flag: 'wyrmBeaten' }`     | "An old lamplighter used to climb up here to copy the moon tables. A child always came with him. Asked what every mark meant."                                                                                                                                 |
| NP-13 | `npcs.ts:859` Cinda `confide` (keep the key line as a second variant)                                   | Edit   | Devoted                                 | "Torva says the forge's first fire came up from the deep. Half of it went back down and never came home."                                                                                                                                                      |
| NP-14 | `D:archiveRefuge`, the new beat after Odile hands over the ledger (D §6.7, §9.1)                        | Insert | `campaign:descent`                      | The ledger text from `SR-archiveDrained-05`, word for word ("promised rewards, death dates, and orders appointing their replacements"), then: _On the cover: seven rays around a closed eye. Inside, in a neat hand: "Kept by the singers of the lower hall."_ |
| NP-15 | `D:rootwaysRecord`, after the turn-taking beat, exact quote (D §6.4, §9.1)                              | Insert | `defeated:campaign-irdrath`             | _Every entry ends with the same words: "The stones will answer you."_                                                                                                                                                                                          |
| NP-16 | `D:hollowsEscaped`, the letter beat (D §6.6, §9.1; replaces `SR-bellRelief-07`)                         | Edit   | `defeated:campaign-hush`                | _…A circle is drawn in ink, with one piece missing. Beside the gap, in Fennick's hand: "Under Mossvale?"_                                                                                                                                                      |
| NP-17 | `mentors.ts` `afterLesson.plain`: Hazel (`:211` block), Rook (`:181`), Kestrel (`:360` block)           | Edit   | after each lesson                       | Hazel: "My oldest roots reach warm stone. This spring the stone went cold." Rook: "The storms hum before they break now. Like they're tired." Kestrel: "The wind stopped for a whole day last week. Wind doesn't stop."                                        |
| NP-18 | `campaignStory.ts:164` `irdrathYielded`, after `-04`                                                    | Insert | `defeated:campaign-irdrath`             | **Irdrath:** "The lamplighters said, keep them warm until we come back." _A pause._ "I kept them warm." _The Firstcoal's glow drifts upward through the stone._                                                                                                |
| NP-19 | `campaignStory.ts:476` `lishalSilenced`, after `-01`                                                    | Insert | `defeated:campaign-lishal`              | _The sixth singer sets down a small brass lamp with no wick. Seven rays and a closed eye are cut into its base._ **The Lishal:** "We sang it quiet, once. Then we listened."                                                                                   |
| NP-20 | `campaignStory.ts:537` `campaignReturn`, after `-11`                                                    | Insert | `campaign:return`                       | _Fennick turns Rowan's stone over in the lamplight._ **Fennick:** "One of ours. A marker. It says: not here." **Hero:** "Rowan dug a well there." **Fennick:** "Then that's the missing piece."                                                                |
| NP-21 | `campaignStory.ts:591` `rowanReturn`, after `-10`                                                       | Insert | `campaign:return`, `scene:hareguyVisit` | **Hero:** "Fennick read your stone. It said not to dig there." _Rowan is quiet for a long time._ **Rowan:** "Then I'd better tell you how to cut these right."                                                                                                 |
| NP-22 | `campaignStory.ts:732` `campaignRite`, after `-21`                                                      | Insert | `campaign:rite`                         | _At the centre of the circle is a shallow hollow where an eighth stone once stood. Fennick touches its edge._ **Fennick:** "There was one more. The lamplighters put it to sleep, long ago."                                                                   |
| NP-23 | `campaignStory.ts:779` `malificatFallen`, after `-02` (or Plan C's lantern phase, 2.11)                 | Insert | final boss                              | _At the lantern, Fennick says the dawn words._ "Ves, en." _Light spills from the lantern across the floor. Vesper's eyes open._                                                                                                                                |
| NP-24 | `campaignStory.ts:732` `campaignRite`, after NP-22                                                      | Insert | `campaign:rite`                         | **Fennick:** "When it's time, I'll say the dawn words. Same as every morning."                                                                                                                                                                                 |
| NP-25 | `story.ts:321` block, `SR-chapterEnd-01` stage (with Plan A's staging); `STORY.md` "End of Chapter One" | Edit   | `wyrmBeaten`                            | _…In Brightwater, sleepers stir and yawn. Somewhere, the wind starts up again._                                                                                                                                                                                |

NP-09 (Vesper's lines) is withdrawn; Plan D owns them. B's recovery exchange is dropped (C-6).

### 4.3 Fallback if PD-D03 is rejected

| Plant | Current-scene home                                                                       |
| ----- | ---------------------------------------------------------------------------------------- |
| NP-14 | `SR-archiveDrained-05` stage (`campaignStory.ts:98`)                                     |
| NP-15 | New stage before `SR-rootwaysRecord-07` (`campaignStory.ts:208`)                         |
| NP-16 | `SR-bellRelief-07` (`campaignStory.ts:339`), with Plan A's "missing piece" wording       |
| R9    | Extra confirmation becomes `SR-rootwaysRecord-08`; the twelve children line is not used. |

## 5. Vision rewrites

**Mechanics (from review F-03).** Visions and the lair share one counter (`src/game/story.ts:89-91`,
`:124-127`). Under A-D5 each vision has exactly **one** line, so every player sees the same text,
and the lair rotates on its own key (Plan A task 3.5): its first line on the first visit, the second
on retries. B writes the words; A edits register (5–20 spoken words, calm, never shouts). A save
that holds `pending:vision1:1` still loads: `pendingVision` takes the variant modulo the line count
(`src/game/story.ts:108-110`), so it shows the one line.

| Passage                  | Line                                                                                                                                                                                                                                                                                                | Clues      | What a rereading player learns                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SR-vision1` (one line)  | _Rowan's stone turns cold in your pack._ "His well let me hear the sky. Now I hear you. Carry me. The stones will answer you."                                                                                                                                                                      | R3, R5     | It hears the hero through Rowan's stone. It made its bearer's promise to the hero first, in the first hour.                      |
| `SR-vision2` (one line)  | _Dust settles on the quarry floor, though nothing moved it._ "My serpent keeps the moon for me, down in the caves. It has not been cold in a hundred years."                                                                                                                                        | R1, R4     | "My serpent": the voice and the Wyrm are two. "Keeps the moon": it blocks the light. It truly thinks the Wyrm's sleep is a gift. |
| `SR-vision3` (one line)  | _Lightning draws a ring on the clouds, then breaks it._ "Seven stones around one sleeper. They call it a ward. The violet one is hungry tonight. I can wait."                                                                                                                                       | R1, R4, R6 | The ward is a ring of seven around the voice, the "sleeper". The violet stone starves because the moonlight is blocked.          |
| `SR-prelude-moonWyrm.01` | First visit. A's stage: _The serpent lies coiled around the moon-crystal. Its breath is slow; its eye is half closed. The voice that comes out of it is far too steady for so tired a body._ "You came down. This one is very old and very tired. It will not let go of the light. Neither will I." | R1         | "This one" and "Neither will I" are two speakers.                                                                                |
| `SR-prelude-moonWyrm.02` | Retry. _The serpent has not moved. One eye opens a little._ "Back again? No one has woken this one in a hundred years. Rest instead."                                                                                                                                                               | R1, R2     | Its fall is a waking into "a real sleep" (`SR-wyrmFall-03`).                                                                     |
| `SR-chapterEnd-04` voice | A's staging, then: "A good throat. Old, and very obedient. Let it sleep its own sleep now. **I have others.**"                                                                                                                                                                                      | R2, R3     | It releases the Wyrm on purpose. "Others" means every sleeper, and Vesper.                                                       |

**Lines retired:** `SR-vision1.02`, `SR-vision2.01`, `SR-vision3.02` and their old physical claims;
"I am the silence between stars", "toys forgotten in the mud", "pale reflection" and "drank the
moonlight" (PB-D07, WB-C25). Vision gating is unchanged (`got:wellStone`; `enters: 'quarry'`,
`'peaks'`).

**Tests these lines touch** (T9): `tests/script.test.ts:31-35` (Wyrm rows in `STORY.md:67`),
`tests/story.test.ts` vision and prelude cases (Plan A lists the lines), and
`tests/nativeTome.test.ts:76`, which pins the `chapterEnd-04` sentence.

## 6. Seeding Fennick before the midpoint

Vesper's own pre-midpoint lines are Plan D's (C-2). Plan B seeds Fennick and supplies the R9 fact.

**Fennick in Brightwater (NP-08).** New NPC `lamplighter`, display name "Old Lamplighter" (unnamed
until `SR-campaignThreshold-03`). Element `arcane`. Not `essential`. Map entity in the existing
`MapEntity` shape (`src/world/map.ts:60-62`):

```ts
{ id: 'bw-lamplighter', kind: 'npc', npcId: 'lamplighter', x: 10, y: 12,
  requiresFlag: 'scene:refusal', untilFlag: 'wyrmBeaten' }
```

The tile is a placeholder near the shrine (`bw-shrine`, `maps.ts:233`); T6 checks it is free.
Brightwater is on the required route to the Cave Pass, so the meeting is always available, but it
is optional (_C_ in the ledger). The three intro moods are distinct, as
`tests/attitude.test.ts:245-251` requires.

| Moment          | Line                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `intro.cold`    | _An old man polishes a brass lantern with no wick._ "Dark cloak. Quiet feet. If you've seen them, say so."                                  |
| `intro.plain`   | _An old man polishes a brass lantern with no wick._ "Have you seen a traveller in a dark cloak? Walks quietly. Reads everything."           |
| `intro.warm`    | "Sit a moment. I'm looking for someone in a dark cloak. They left without their supper. That isn't like them."                              |
| `confide`       | "I looked after a houseful of children by the stone circle. One used to put an ear to the stones and say someone was singing. I said wind." |
| task (fallback) | "Hold the lantern while I read the shrine marks." A short repeatable offering using violet, like Ivo's rune (`npcs.ts:1047`).               |
| `win`           | "Thank you. I sat with Rowan's boy last night and said the dawn words. He didn't wake. Not yet."                                            |
| `done`          | "If you meet them, tell them the lamp's still lit."                                                                                         |

**Moonfall resident (NP-12).** Ivo has no `saidUntil` today, so the field is free for this line.

**The R9 fact for Plan D.** D's ruins `confide` carries it. B proposes one added sentence: "Under
the circle, something sang to me. He said it was the wind." D may reword it; the ledger records the
plant as _C_ either way.

**Pronoun fix.** `SR-chapterEnd-06` (`story.ts:349`): "I taught the child who made them to walk."
Plan A owns it; R9 relies on it.

## 7. Delivery rules

**How lore reaches the player.**

1. **Objects first.** A fact appears first on something the player can look at: a lamp post, a
   rune stone, a ledger cover, a lantern base, a hollow in the circle. The symbol (seven rays around
   a closed eye) repeats on each.
2. **People say what they need, not what they know.** A line carries lore only while the speaker
   wants something from the hero.
3. **Three short sentences, at most.** No lore line runs longer than three spoken sentences.
4. **The voice frames; it never lies, never shouts, never gets angry.** Every voice line must be
   true under section 2 (WB-C20).
5. **Confirm on screen, by action or object.** The recoil, the lamp the singer sets down, the hollow
   Fennick touches. No character summarises the history (NP-22 was cut to two lines for this
   reason).
6. **Leave some unexplained.** The hard winter, the stone tongue and the order's age stay
   off-screen.
7. **No lecture scenes.** Every new beat sits in a scene that already has a task.
8. **One owner per line.** A plant inside another plan's scene is marked **[B]** there and keeps
   its quoted clue; WB-C21 protects it.

**Reading-level guard for young players.**

- At most 20 words per sentence in any new line; aim for 12.
- One new proper noun per scene at most. "Lamplighters" is first an ordinary word ("an old
  lamplighter").
- Every lore word names something a child can picture. Plan A's glossary applies to every plant:
  no "relay", "branch", "return", "station" or "vessel" in player text (F-11, C-15).
- "Ves, en." always appears with a picture (lighting lamps) and, before it matters, a child's
  translation ("up you get").
- Sad facts stay gentle: the ledger keeps its existing "death dates", but no new line describes a death.
- Ages stay clear: Fennick never says "we" about the order's distant past (NP-22).

## 8. Proposed World Bible updates (drafted text)

### 8.1 Section 4, new subsection "What lies beneath" (replaces `WORLD_BIBLE.md:185-189`)

> **Established once SQR-D02 is approved.** There were eight singing stones. Seven keep the world
> awake, and each school of magic is one of their songs. The eighth sings sleep. The Lamplighters
> buried it beneath the stone circle and set the seven in a ring around it: the ward. The violet
> stone holds the eighth song down and is fed by moonlight from the moon-crystal in the Moon
> Caves. When a stone's song weakens, its place shows blight. The voice is the eighth stone's
> will. It wants rest for everything and grows stronger with every sleeper, because each sleeper
> hums its song back. It cannot move and needs a vessel to reach the stones.
>
> The voice's lines are its own framing: true but partial. It does not lie, shout or rage.

### 8.2 Section 5 changes

- **Rowan.** Replace "That worry does not prove he caused every later harm" with: "His worry is
  partly right. His well cracked the ring and let the voice reach the surface. He did not create
  the voice or make anyone's choices. He helps mend the ring with his skill, not by travelling."
- **The Moon Wyrm and the voice.** "The voice is the will of the buried eighth stone. The Wyrm was a
  sleeping vessel with no choice. Its defeat returned it to its own sleep."
- **Fennick.** Add: "One of the last Lamplighters, the order that built the ward. He looked after
  twelve children by the circle, Vesper among them, and once told Vesper the singing under the
  stones was the wind."
- **Irdrath.** Add: "A fire warden set by the Lamplighters to keep sleepers warm until they
  returned. The Firstcoal is the red stone's ember." Amend the "no tragic former profession" note:
  "His former role is a warden's job, kept because it explains his motive; no further tragedy is
  added."
- **The Lishal.** Add: "Once the Lamplighters' seven singers, one per stone. They came to agree
  with the voice and kept the ledger of bearers. Their past explains their choices; it does not
  excuse them."
- **Vesper (lore only).** Add: "Heard the voice as a child through the stones. Its promise to every
  bearer: 'The stones will answer you.'"
- **Section 5 intro rule.** Add after the rule: "Exceptions approved in PB-D04 and PB-D05."

### 8.3 Continuity checks

| ID     | Scope                 | Check                                                                                                                                                                                                                           |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-C09 | Established (revised) | The voice is the eighth stone's will; the Wyrm was a sleeping vessel without choice. Do not give the Wyrm motives or guilt of its own.                                                                                          |
| WB-C14 | Proposed (revised)    | The light test shows the mended ring bends stone-light back. Containment is shown by the records and by the recoil at the boundary.                                                                                             |
| WB-C20 | New · secret history  | Every voice, vision or prelude line must be true under section 4. Framing and omission are allowed; false statements, shouting and anger are not.                                                                               |
| WB-C21 | New · clue ledger     | Do not remove or reword a ledger plant without updating the ledger and keeping its counts: three plants, one guaranteed, one first-hour, one guaranteed confirmation.                                                           |
| WB-C22 | New · Rowan           | Rowan opened a crack; he did not cause the voice. No scene blames him for the sleep or makes him seek the cast's forgiveness.                                                                                                   |
| WB-C23 | New · symbol          | Seven rays around a closed eye marks Lamplighter work only, including objects the Lishal kept from their time in the order.                                                                                                     |
| WB-C24 | New · "Ves, en."      | It means "Rest, enough" and is a waking phrase. In the second half Fennick says it once, at the lantern; the lantern's light release in the final fight is that moment. The voice never says it, and the player never casts it. |
| WB-C25 | New · moonlight       | The voice and the Wyrm block moonlight; nothing "drinks" or "eats" it.                                                                                                                                                          |

### 8.4 Section 9 decision rows

Mark WB-Q01, WB-Q02, WB-Q05 and WB-Q07 "Answered by Plan B, pending SQR-D02", with the section 3
sentences as the working version. WB-Q08's working version becomes the section 3 row. WB-Q07 notes
the team-source lantern line (`ENCOUNTER_DESIGN.md:984`) is kept under WB-C24.

## 9. Workstreams and tasks

| #   | Task                                                                                                                                                                                                                                                                        | Owner role         | Input                 | Output                                 | Effort   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------- | -------------------------------------- | -------- |
| T1  | Review sections 2–3 with the author; decide SQR-D02, SQR-D03 and PB decisions on the merged sheet.                                                                                                                                                                          | Lead lore writer   | This plan             | Recorded decisions                     | 2 days   |
| T2  | Write sections 8.1–8.4 into the World Bible.                                                                                                                                                                                                                                | Lead lore writer   | T1                    | Bible edit, author-reviewed            | 1 day    |
| T3  | Build `src/data/clueLedger.ts` (new) from section 4, against current text with known gaps marked.                                                                                                                                                                           | Narrative designer | T1                    | Ledger module, no player-facing change | 2 days   |
| T4  | Apply section 5 to `story.ts:24-62` and `SR-chapterEnd-04`, after A-D5 and A task 3.5.                                                                                                                                                                                      | Writer + engineer  | T1, A register        | Data change, regenerated reader        | 1 day    |
| T5  | Add NP plants on D's final scene list, in the joint text pass (review step 5). Waits for PD-D03.                                                                                                                                                                            | Writer + engineer  | T1, D structure, T3   | Data changes, regenerated reader       | 4 days   |
| T6  | Add the `lamplighter` NPC and Brightwater entity; confirm talk-only or the fallback task.                                                                                                                                                                                   | Engineer           | Section 6             | NPC def, map entity                    | 2 days   |
| T7  | Add `tests/clueLedger.test.ts` (new; 10.2) and the `collectPassages()` helper.                                                                                                                                                                                              | Engineer           | T3                    | Passing test in CI                     | 2 days   |
| T8  | Hometown parity: NP-02 and NP-04 in all four homes (`hometownMaps.ts`).                                                                                                                                                                                                     | Engineer           | T5                    | Equal clue access for every hero       | 1 day    |
| T9  | Script and test sync: author approval under A-D1; edit `docs/STORY.md` rows for every first-half change (NP-01, -03, -05, -06, -07, -10, -11, -17, -25, section 5); update `tests/script.test.ts`, `tests/story.test.ts`, `tests/nativeTome.test.ts:76` in the same change. | Writer + engineer  | T4, T5                | Script and tests agree                 | 1.5 days |
| T10 | Native book: hand the list of inserted beats (NP-14, -15, -18 to -24) to the shared re-index step (review step 6) and request a staging field to replace the hard-coded `campaignRecovery` index (`src/native/tome.ts:460`, `:474`).                                        | Engineer           | T5                    | Entries on the shared re-index list    | 0.5 day  |
| T11 | Contribute B's questions to the combined playtest (10.1); fix weak reveals; rerun only affected questions.                                                                                                                                                                  | Lead lore writer   | Combined round report | Revised plants                         | 2 days   |

About 3.5 writer-weeks plus 1.5 engineer-weeks. The re-index itself is the shared task's effort.

## 10. Verification

### 10.1 Combined cold-reader playtest (B's part)

One protocol is shared by all plans (review F-32). B contributes these questions and thresholds;
the combined round supplies the readers (at least eight, three aged 9–12 with a guardian).

**Stop 1: before the rite** (after `campaign:return`, before `campaign:rite`). Open questions:

- B1. What do you think the voice is?
- B2. Is the voice the Moon Wyrm? Why do you think that?
- B3. Why does the voice want people asleep?
- B4. Why did the violet stone go dark first?
- B5. What do you think Rowan's stone is?
- B6. What did the voice promise Vesper? Had you heard that before?
- B7. Who built the ring around the stone circle?

**Stop 2: after the ending.** Repeat B1–B7, then: B8. What does "Ves, en." do? B9. Read the three
visions again: did the voice lie? Point to any line you think was a lie. B10. Which words or names
were confusing?

| Measure                                                                  | Success threshold       |
| ------------------------------------------------------------------------ | ----------------------- |
| Stop 1, B1: says the voice is under the circle, a stone, or not the Wyrm | At least half           |
| Stop 1, B2: says "no" with a reason from a plant                         | At least 60%            |
| Stop 1, B6: recognises the promise from vision 1 or the ledger           | At least half           |
| Stop 2: right or partly right on at least 6 of B1–B8                     | At least 75% of readers |
| B9: finds no line that is false under section 2                          | At least 85% of readers |
| B10: young readers name no more than two confusing terms each            | All young readers       |
| A reader calls a plant scene "a lecture" or skips it out of boredom      | No more than one        |

A failed measure gives its reveal a new guaranteed plant before the next round.

### 10.2 Automated tests

**New file:** `tests/clueLedger.test.ts`. **New data:** `src/data/clueLedger.ts`, exporting
`CLUE_LEDGER: readonly Reveal[]`, and two new constants:

- `STORY_MILESTONE_ORDER` (new): the flag order walked in `tests/campaign.test.ts:191-249`, with
  the first-half flags before it: `scene:opening`, `opening:houseVisited`, `scene:refusal`,
  `got:wellStone`, `vision:1`, `reached:brightwater`, `vision:2`, `vision:3`, `reached:ruins`,
  `wyrmBeaten`, `scene:chapterEnd`, then the campaign flags in D's order (`campaign:descent`,
  `defeated:campaign-irdrath`, `campaign:read`, `campaign:rescue`, `defeated:campaign-vesper`,
  `defeated:campaign-hush`, `campaign:procedure`, `campaign:accepted`, `defeated:campaign-lishal`,
  `campaign:ascent`, `campaign:return`, `campaign:rite`, `campaign:wardReady`,
  `defeated:campaign-malificat`).
- `FIRST_HOUR_FLAGS` (new): exactly `scene:opening`, `opening:houseVisited`, `scene:refusal`,
  `got:wellStone`, `vision:1`, and `taught:mentor:<id>` for `hazel`, `maren`, `dorn`, `torva`,
  `rook`, `kestrel` (the flag set at `src/game/encounter.ts:355`). A mentor plant counts as _1h_
  only when gated by its own mentor's flag.

Each `Reveal` has `id`, `confirmedBy` (each with `ref` and `guaranteed`) and `plants`. Each plant
has `ref` (an `SR-…` ID or `entity:<map entity id>`), `np` (the NP id, if any), `quote` (a short
exact substring), `guaranteed`, `firstHour` and `gate`. Passage IDs come from a new exported helper,
`collectPassages()`, moved out of `tools/export-story-reader.mjs` (ID rules at `:121`, `:160`,
`:192`, `:220`), returning `{ id, text, gate }[]`, so the test and the exporter cannot drift.

| Assertion                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every plant and confirmation `ref` exists in `collectPassages()`, or as an entity in `MAPS` and the hometown maps.                                     |
| Every plant's `quote` appears in that passage's current text.                                                                                          |
| Every plant's `gate` matches the data: scene `requiresFlags`, entity `requiresFlag`, vision `requiresFlags`, `saidUntil`, or the mentor's taught flag. |
| In `STORY_MILESTONE_ORDER`, each plant's gate comes before the reveal's first guaranteed confirmation.                                                 |
| A plant whose `saidUntil` flag comes before its reveal counts only if its gate opens earlier still.                                                    |
| Each reveal has at least three plants, at least one `guaranteed` before the confirmation, and at least one `guaranteed` confirmation (F-16).           |
| Each reveal has at least one `firstHour` plant gated only by `FIRST_HOUR_FLAGS`; R9 is the one listed exception.                                       |
| A beat with `requiresMentor`, a mood gate or a single class's line is never marked `guaranteed`.                                                       |
| Each vision has exactly one line, and it contains its clue word: vision 1 "stone" or "stones", vision 2 "serpent", vision 3 "seven" and "violet".      |
| For every plant with an `np` id: no sentence over 20 words; none of Plan A's banned glossary terms.                                                    |
| No voice, vision or prelude line contains "drank", "drink", "drinks" or "reflection" (WB-C25).                                                         |
| "Ves, en." appears exactly once in second-half scene and encounter text, and never in a voice line or spell name (WB-C24).                             |
| For each of the four heroes, the hometown map has the NP-02 houses and the NP-04 lamp post.                                                            |

**Existing tests to update** (F-10): `tests/script.test.ts` with `docs/STORY.md` (T9);
`tests/story.test.ts` vision and prelude cases; `tests/nativeTome.test.ts:76` (the `chapterEnd-04`
sentence) and `:64` (moves with D's `hollowsEscaped`); `tests/attitude.test.ts:245-251` (the new NPC
already has three intro moods). **Keep green:** `tests/campaign.test.ts`, `tests/hometowns.test.ts`,
and `node tools/export-story-reader.mjs --check`, which Plan A adds to the checks in its first
milestone (F-30). Until then, T7 runs it from the clue-ledger test.

## 11. Milestones

| Milestone | Contents                                                 | Exit condition                                               |
| --------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| M-B1      | T1, T2: history decided and in the bible.                | SQR-D02, SQR-D03, PB decisions recorded.                     |
| M-B2      | T3, T7: ledger and test against current text.            | Test runs, with known gaps listed as expected.               |
| M-B3      | T4, T6, T9: visions, lair, Brightwater NPC, script sync. | Script, story and clue-ledger tests pass for the first half. |
| M-B4      | T5, T8, T10 after D's structure lands.                   | Clue-ledger test passes with no gaps.                        |
| M-B5      | T11 in the combined playtest.                            | All thresholds in 10.1 met.                                  |

## 12. Risks

| Risk                                                 | Mitigation                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Too many clues make the midpoint twist obvious.      | Only vision 2 and the lair hint that the voice and Wyrm are two. Test B2 aims for "suspected", not "certain". |
| Over-explaining kills wonder.                        | Delivery rules 3, 5, 6 and 7.                                                                                 |
| Rowan becomes a guilty figure in a children's story. | WB-C22. His beat ends in work, not apology.                                                                   |
| Another plan rewrites a clue line.                   | WB-C21 and the `quote` assertion fail until the ledger is updated.                                            |
| Plan D's structure is rejected or delayed.           | Fallback homes in 4.3; T5 waits for PD-D03.                                                                   |
| Plan C does not build the lantern phase.             | NP-23 says "Ves, en." in `malificatFallen` instead; the once-only assertion holds either way.                 |
| Inserted beats shift native book staging.            | T10 feeds the shared re-index step and requests a staging field.                                              |
| A talk-only NPC is not supported.                    | Fallback offering task (section 6).                                                                           |

## 13. Author decisions

| ID      | Decision                                                                                                                                                                   | Affects                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| SQR-D02 | Adopt the eighth-stone history (section 2), or the Long Dream alternative below?                                                                                           | WB-Q02, WB-C09, WB-C20 |
| SQR-D03 | Rowan's well cracked the ring: a bounded, contributing cause.                                                                                                              | WB §5 Rowan, WB-C22    |
| PB-D01  | Name the order "the Lamplighters", with the sign of seven rays around a closed eye.                                                                                        | WB-Q05, WB-C23         |
| PB-D02  | "Ves, en." means "Rest, enough"; Fennick says it once, at the lantern. Keep the team-source lantern line (`ENCOUNTER_DESIGN.md:984`) as that moment, or retire it.         | WB-Q07, WB-C24         |
| PB-D03  | The Lishal were the order's singers (a change from the review's "the eighth stone's choir").                                                                               | WB-Q04                 |
| PB-D04  | Irdrath is a Lamplighter fire warden; the Firstcoal is the red stone's ember. Waives WB §5 "no … tragic former profession" and the section 5 rule against added histories. | WB-Q04, WB §5          |
| PB-D05  | Vesper heard the singing as a child and Fennick called it wind (lore for Plan D). Waives the WB §5 rule against added histories; pairs with PD-D01 and PD-D06.             | WB-Q01, WB-C17, WB §5  |
| PB-D06  | Place the unnamed old man in Brightwater before the Wyrm (section 6).                                                                                                      | WB-C06, WB-Q08         |
| PB-D07  | Retire "silence between stars", "toys forgotten in the mud", "pale reflection" and "drank the moonlight"; one line per vision (with A-D5).                                 | WB §4, WB §10, WB-C25  |
| PB-D09  | Moonfall's tower was a Lamplighter observatory (new place lore; no map change).                                                                                            | WB §3                  |

PB-D08 (Vesper's name and the voice using "ves") is withdrawn (C-6, F-12).

**Alternative history: the Long Dream (for SQR-D02).** There is no eighth stone. Long ago, the
Lamplighters used healing sleep under the stone circle. The patients' shared dream became a mind:
the voice. Each new sleeper adds to it, and each person who wakes takes a piece away. It dims the
stones because dreamers draw on their light. The Wyrm was its oldest dreamer. Bearers let the dream
wake inside them. The ward keeps the dream from spreading. "Ves, en." is still the waking word.
Strength: every rescue weakens the voice, which suits Plan C. Weakness: it loses the
eight-versus-seven pattern and makes the villain made of people, which is darker for young
players. Same plants; about 30% of new lines change wording. **Recommendation:** the eighth stone.

## 14. Changes after review

Findings and resolutions from [PLANS_REVIEW.md](PLANS_REVIEW.md) that name Plan B, plus the
conflicts Plan B owns.

| ID   | Resolution in this revision                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-02 | B's Vesper drafts (NP-09) withdrawn. D owns the lines; B supplies the R9 fact through D's ruins `confide` (section 6). "Master" lore made conditional on PD-D02 (2.5).                                                                                                                                 |
| F-03 | Section 5 rewritten for the shared counter: one line per vision under A-D5, lair on its own key. Clues merged so each line carries them. Test changed to "the one line contains the clue".                                                                                                             |
| F-04 | Plants placed exactly as D's table 9.1: ledger text and NP-14 in the new `archiveRefuge` beat after the handover; NP-15 after the turn-taking beat in `rootwaysRecord`; `SR-rootwaysRecord-08` kept word for word; R5's letter line (NP-16) in `hollowsEscaped`. Fallback in 4.3. T5 waits for PD-D03. |
| F-05 | T9 added: A-D1 approval, `docs/STORY.md` edits and `tests/script.test.ts` in the same change. NP-03 now edits beat R3 instead of adding a fifth Refusal beat.                                                                                                                                          |
| F-06 | T10 added: inserted beats go on the shared native re-index list, with a staging field requested for the hard-coded `campaignRecovery` index. 4.2 marks Edit and Insert rows.                                                                                                                           |
| F-10 | "Existing tests to update" list added (10.2): `script`, `story`, `nativeTome:76` and `:64`, `attitude:245-251`.                                                                                                                                                                                        |
| F-12 | WB-C24 relaxed: the team-source lantern moment is where Fennick says "Ves, en."; PB-D02 records the choice; PB-D08 dropped.                                                                                                                                                                            |
| F-14 | 2.3 states the voice never gets angry; 2.11 gives D a true cause for `hollowsHush` (Vesper opened the bell lines) and a true rewording of "He is outside".                                                                                                                                             |
| F-15 | The WB §5 rules are quoted in 2.9 and waived knowingly in PB-D04 and PB-D05, citing WB-Q01, WB-Q04 and WB §5.                                                                                                                                                                                          |
| F-16 | Every reveal now has a guaranteed confirmation (4.1). Mentor-gated rite beats moved to "extra". R4 confirmed by `SR-chapterEnd-01`, R8 by NP-18, R11 by NP-25. Test asserts it.                                                                                                                        |
| F-17 | With C-3: B owns the words, A the register and mechanics. A's first-visit lair stage is kept with B's line.                                                                                                                                                                                            |
| F-18 | "Ves, en." timeline row now cites NP-23 (or Plan C's lantern phase), not `SR-malificatFallen-04`.                                                                                                                                                                                                      |
| F-19 | NP-22 cut to an object (the hollow) and two short lines, with no "we" for the distant past.                                                                                                                                                                                                            |
| F-20 | 2.10 "Inputs for Plan C": rite order, singer-to-colour mapping, why tended stones resist, Firstcoal and lantern meaning.                                                                                                                                                                               |
| F-21 | `STORY_MILESTONE_ORDER` and `FIRST_HOUR_FLAGS` marked new and listed exactly; plants carry an `np` field.                                                                                                                                                                                              |
| F-30 | Reader `--check` relies on Plan A's first-milestone CI step; until then the clue-ledger test runs it (10.2).                                                                                                                                                                                           |
| F-32 | B's playtest folded into the combined protocol (10.1) as questions B1–B10 with thresholds.                                                                                                                                                                                                             |
| C-3  | Adopted as above (section 5).                                                                                                                                                                                                                                                                          |
| C-6  | "Rest, enough"; spoken once, by Fennick, at the lantern. B's recovery exchange dropped; D's silent Fennick kept. PB-D08 dropped.                                                                                                                                                                       |
| C-11 | Ledger uses D's scene IDs and flags (`campaign:read`, `defeated:campaign-hush`, `warrensLit`, `hollowsHush`, `hollowsEscaped`).                                                                                                                                                                        |
| C-13 | Lore for the rite supplied (2.10). The mentor beats C moves out of `campaignRite` are no longer B's only confirmations.                                                                                                                                                                                |
| Note | Review writing note on vision 1 ("A man broke a stone") fixed: "His well let me hear the sky." Moonfall observatory added as PB-D09; WB-C25 added to PB-D07.                                                                                                                                           |
