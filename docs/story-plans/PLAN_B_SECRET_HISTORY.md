# Plan B — The answer behind the voice

**Execution plan · 3 November 2026 · author-only spoilers · planning document, no game changes**

This plan carries out Plan B of the
[story quality review](../reviews/STORY_QUALITY_REVIEW.md) (findings F1, F4 and F10). It drafts
the secret history, a fair clue trail, vision rewrites and the World Bible text that would make
them canon. Passage IDs (`SR-…`) refer to the [Story Reader](../WORLD_BIBLE_STORY_READER.md).
Decision and check IDs (`WB-…`) refer to the [World Bible](../WORLD_BIBLE.md). Line numbers are
for `GetPutTaco` as read on 3 November 2026.

Nothing here is canon until the author approves it. Every canon change is listed as a decision in
section 13, with the check or question it affects.

## 0. Goal, scope and assumptions

**Goal.** The author knows what the voice is. Every major fact behind it is planted at least three
times, once in the first hour, and confirmed on screen. A player who rereads the visions after the
ending finds that the voice never lied.

**In scope.** The secret history (section 2), truth table (3), clue ledger (4), vision rewrites
(5), Fennick and Vesper seeding before the midpoint (6), delivery rules (7), World Bible text (8),
tasks (9), verification (10).

**Not in scope.** Board mechanics (Plan C). Vesper's emotional arc, rival scenes and ending
gestures (Plan D). Register and jargon fixes (Plan A), except where a clue depends on them. No
code, data or test is changed by this document.

**Dependencies.**

| Plan   | What Plan B needs from it                                                                       | What Plan B gives it                                               |
| ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Plan A | The F7 fixes to `chapterEnd` and the ward text; the new Vesper register; plain names for parts. | The meaning behind each rewritten line, so polish keeps the clue.  |
| Plan C | Nothing to start. Later, drowsy blocks and stone brightening should follow the rules in 2.6.    | What sleep is, why seven stones resist, why the rite is a weaving. |
| Plan D | Ownership of Vesper's want and arc. Plan B supplies only the lore facts Vesper's arc stands on. | Why the voice chose Vesper and what it promised, with fair plants. |

**Assumptions** (stated so work can start without questions):

1. The eighth-stone candidate in the review is the starting point (SQR-D02). An alternative is
   given in 2.9 so the author has a real choice.
2. Rowan's well becomes a _contributing_ cause, not the whole cause (SQR-D03). This keeps the
   bible's line that his worry "does not prove he caused every later harm".
3. A talk-only NPC with no challenge may not be supported by the encounter flow. Where a new NPC is
   proposed, a small fallback task is given.
4. The story text keeps its current scene order and encounter order (WB-C10).
5. Hometown wording uses the existing substitution: "Mossvale" in text means the chosen home.

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
   `SR-mentor-selene.afterLesson.plain.01`), but nothing confirms them, so they read as flavour.
3. **Lies, not framing.** The visions make physical claims ("Every breath you take on the surface
   draws air from my cavern", `SR-vision1.02`) that nothing pays off. A voice that lies teaches the
   player to ignore it, which kills the mystery.

**Tasks** (detailed in section 9): T1 approve the history; T2 write the truth table into the
bible; T3 build the clue ledger; T4 rewrite visions and prelude; T5 add confirming beats; T6 add
the clue-ledger test; T7 run the cold-reader playtest.

**Affected passages.** `SR-opening-03` (`src/data/story.ts:225`), `SR-opening-04` (`story.ts:230`),
`SR-refusal-02` (`story.ts:276`), `SR-refusal-04` (`story.ts:287`), `SR-vision1`–`3`
(`story.ts:31–52`), `SR-prelude-moonWyrm` (`story.ts:60–61`), `SR-chapterEnd-04` and `-06`
(`story.ts:341`, `story.ts:349`), `SR-archiveDrained-05` (`src/data/campaignStory.ts:98`),
`SR-rootwaysRecord-07` (`campaignStory.ts:208`), and new beats in `irdrathYielded`,
`lishalSilenced`, `campaignReturn`, `rowanReturn`, `campaignRite` and `campaignRecovery`.

**Before → after.**

| Passage                  | Before                                                                         | After                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `SR-opening-03`          | "_Far beneath the stones, something enormous breathes in._"                    | "_Far beneath the stone circle, something enormous breathes in._" (places the voice under the circle, not in the caves)         |
| `SR-vision3.02`          | "The moon above is just my pale reflection. The real light lives in the dark." | "I take nothing from the moon. I only stand in front of it, and the violet stone goes hungry." (true; see section 5)            |
| `SR-prelude-moonWyrm.02` | "For centuries I drank the moonlight while your kind built huts in the mud."   | "No one has woken this one in a hundred years. I made sure its dreams were kind." (true, and names the Wyrm as a separate one)  |
| `SR-rootwaysRecord-07`   | "The same promise. Both times."                                                | Adds a stage line: "_Both records end with the same words: 'The stones will answer you.'_" (echoed at `SR-vesperAcceptance-05`) |

**Acceptance criteria.**

- The author can answer every F1 question in one sentence (section 3) and has signed off SQR-D02.
- Every reveal R1–R11 has three or more plants, at least one guaranteed (not a rotating variant or
  a mood branch) before its confirming scene, and at least one in the first hour.
- No vision, prelude or voice line states something the secret history says is false.

**Verification.** `tests/clueLedger.test.ts` (section 10.2) proves the plant counts, that each plant
exists and is reachable before its reveal, and that each quoted clue is still in the text. The
cold-reader protocol (10.1) proves players can use the clues: at least half guess the voice's
nature before the rite.

### P4. Vesper's motive is thin (lore side only)

**Symptom.** Vesper "followed the power in the Depths after seeking glory" (bible section 5). Their
acceptance (`SR-vesperAcceptance-15`–`18`) has nothing behind it: the player does not know what the
voice offered, why Vesper could hear it, or why "I can hear the surface" is a reward.

**Root cause.** The lore never said why the voice picks a particular person, or what a bearer gets.
Plan D owns the arc. Plan B supplies the facts it stands on.

**Lore facts supplied** (section 2.5): Vesper grew up beside the stone circle in Fennick's care and
heard the singing under the stones as a child. Fennick told them it was the wind. The voice was the
first thing that seemed to speak only to them. Its promise to every bearer is the same: "The stones
will answer you." That promise is literally true, and it is the trap.

**Tasks.** T3 (plants), T5 (confirming beats), section 6 seeding. Affected: `SR-chapterEnd-06`
(`story.ts:349`), `SR-vesper.confide.plain.02` and `.warm` (`story.ts:116`, `story.ts:118`),
`SR-rootwaysRecord-07` (`campaignStory.ts:208`), a new Brightwater NPC, `SR-npc-scholar`
(`src/data/npcs.ts:1047`).

**Before → after.** `SR-vesper.confide.plain.02`: "I too once walked in the sun. Then I heard the
serpent's whisper under the earth." → "I grew up beside the stone circle. Something under it sang.
Everyone said it was the wind." (Wording for Plan A's register; Plan D may replace it.)

**Acceptance.** Before the midpoint, a player can meet the old man, learn that he raised a child,
and hear Vesper say they heard singing under the stones. At `SR-vesperAcceptance-05`, the player
recognises the promise from the ledger.

**Verification.** Clue-ledger test rows for R3 and R9. Cold-reader question Q6 (section 10.1).

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
around a closed eye. They buried the eighth stone beneath what is now the stone circle. Then they
set the seven stones around it so their songs ran in a ring. The ring is the **ward**. Inside it,
the eighth song is turned down to a lullaby. It cannot cross the ring, because the ring is all
seven songs at once.

The ring has an upper half (the seven stones and their stations at the circle) and a lower half,
the **lower return**, which runs deep under the surface country like a root and brings each song
back to its stone. They marked where it runs with small rune stones that say "not here": do not
dig.

The Lamplighters taught the villages two habits that outlived them: light the lamps at dawn, and
say the waking words, "Ves, en." In the stone tongue, _ves_ is the eighth song, rest, and _en_ is
enough. "Ves, en." means **"Rest, enough."** It is how you wake someone. Everyone in Sevenstones
still says it when they light the lane lamps, without knowing why.

Their brass lanterns have no wick because they carry stone-light, not flame. The order's singers
lived below in the lower halls to tend the few sleepers who never woke. Its wardens lived at the
circle. Its records went into the archive that is now the flooded Sunken Archive.

### 2.3 The voice: what it is, what it wants, what it gains

The voice is the eighth stone's will. It is very old and cannot move. It wants rest for everything,
forever, and calls that mercy: no more cold, hunger, fear or work. It does not hate anyone.

A song needs listeners. Every sleeper is a listener, and a sleeping listener hums the song back, so
each new sleeper makes the song louder. With enough listeners, the eighth song drowns out the other
seven. Sleepers are not food. They are a choir.

It reaches listeners through cracks in stone, still water, and anything that once sat in the ring,
such as an old rune stone. It hears whoever carries one, and they can hear it. It talks to people
the way a tired person talks to themselves late at night: kindly, and only part of the truth.

### 2.4 Vessels

The voice cannot cross the ring on its own. It needs a **vessel**: a body that carries its song.

- **Sleeping vessels** carry it but cannot choose. The Moon Wyrm is one.
- **Waking vessels**, or **bearers**, choose to carry it. A bearer can walk up to the stone circle.
  There, the promise comes true: "The stones will answer you." A bearer can draw on all seven
  songs. But a living body cannot hold the eighth song and stay awake. When the borrowed songs
  leave, the bearer sleeps and does not wake. That is how the earlier bearers in the ledger died.
- **"Malificat"** is the Lamplighters' word for a bearer drawing on all seven stones at once.

The voice never lies about the promise. It leaves out the end.

### 2.5 The people and powers below

**The Lishal** were the order's seven singers, one for each stone. Their job was to sing the eighth
song quiet and nurse the sleepers. They listened to it every day for centuries. Slowly they came
to agree with it. They kept the ledger of bearers and chose each replacement, believing a bearer
could carry rest gently to a suffering surface. Their sounding frame uses seven crystals, one per
stone, re-tuned to carry the eighth song up through the lamp lines. That is why they care for
people and then lock the doors: they truly think sleep is the kindest thing. They are still
responsible for what they choose.

**Irdrath** is a warden made of fire, set by the Lamplighters to keep sleepers warm "until we come
back". They never came back. He kept the sleepers warm for so long that keeping them became the
point, and he forgot that waking them was the job. The **Firstcoal** is an ember carried down from
the red stone when the lower halls were built. It is his heart and his heat. Freeing it ends his
grip on the chambers. Its light goes home to the red stone, which is why Torva's hands are steady
at the rite (`SR-campaignRite-02`).

**Fennick** is one of the last Lamplighters at the circle. He can read the markings and knows the
habits, but most of the procedure was lost with the archive. He raised a child near the ward: the
child we know as Vesper.

**Vesper** grew up beside the stones. As a child they put an ear to the stones and heard singing.
Fennick, not wanting to frighten them, said it was the wind. The voice was the first thing that
seemed to speak only to Vesper. They went into the Depths looking for it, ambitious and sure they
could understand what others feared. The voice let them believe the Wyrm was its Master. It was
their reason to stay. Everything about Vesper's choice beyond these facts belongs to Plan D.

### 2.6 Moonlight, the violet stone and the blight

The **violet stone** (minds, Arcane) is the stone that holds the eighth song down, the lid of the
ring. It bears the most weight, so it fails first. Its song is fed by moonlight. That is why Arcane
cannot be learned until the moonlight returns after the Wyrm.

The **moon-crystal** is not a stone of the ring. It is a natural lens deep in the Moon Caves, where
moonlight gathers and runs up through the rock to the violet stone. The voice had the sleeping Wyrm
coil around it. The Wyrm's body blocked the light. The voice took nothing from the moon. It only
stood in front of it.

**The blight** is what happens to a place when its stone's song goes quiet. Water stops moving and
clouds. Meadows grey. The wind stops. Candles burn without giving light. Mould grows in still,
dark, sleeping places and rises along the cracks. It is a symptom, not a weapon.

**Sleep** takes whoever is asleep in the song's path on the nights it is loudest. Which houses is
chance. That is part of why it feels cruel.

### 2.7 Rowan's well

Forty years ago, Rowan dug his well and hit granite. In the dirt he found a small rune stone with a
worn mark: seven rays around a closed eye. It was a Lamplighter marker for the lower return. He
could not read it. He used it to crack the bedrock, and cracked the lower return with it.

The crack was small. Through it, a thread of the eighth song reached the surface for the first time
in an age ("Something breathed down there", `SR-npc-elder.confide.warm`). Over decades it found the
sleeping Wyrm and the moon-crystal. It did not make the voice. It gave the voice an ear. The voice,
the Lishal and Vesper made their own choices. The empty line marked "lower return" in Fennick's
letter (`SR-bellRelief-07`) is the piece Rowan's crack broke. The rite mends it, with wedges Rowan
tells them how to cut (`SR-rowanReturn-08`–`10`).

The rune stone is a ring stone, so whoever holds it can hear the voice. That is why the visions
begin only after Rowan gives it to the hero (`requiresFlags: ['got:wellStone']`, `story.ts:29`).
The hero is not chosen. The hero is holding the stone.

### 2.8 The events of the game

| When                       | What happens                                                                                               | Where the player sees it                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Long ago                   | The hard winter. The Lamplighters bury the eighth stone and build the ward.                                | Lamp-post mark, ledger cover, Fennick at the rite |
| Centuries                  | The order fades. The singers below turn into the Lishal and send bearers. Each bearer dies.                | The ledger (`SR-archiveDrained-05`)               |
| 40 years ago               | Rowan's well cracks the lower return.                                                                      | `SR-refusal-04`, `SR-npc-elder.confide.warm`      |
| Decades                    | The thread finds the Wyrm, which coils around the moon-crystal. Moonlight thins. Selene starts counting.   | `SR-mentor-selene.arrives.plain.01`               |
| Some years ago             | Vesper hears the voice, goes below and serves "the Master".                                                | Vesper confide lines, Fennick in Brightwater      |
| Three weeks before opening | The violet stone weakens. Sleep starts near the Cave Pass. Hareguy falls asleep at Pete's inn.             | `SR-refusal-03`                                   |
| Opening night              | The violet stone goes dark. The song reaches the hero's home. Three houses do not wake.                    | `SR-opening-02`–`04`                              |
| Midpoint                   | The Wyrm falls. Moonlight returns, the violet stone glows. The voice lets the Wyrm sleep its own sleep.    | `SR-wyrmFall-03`, `SR-chapterEnd-01`, `-04`       |
| Underground                | Vesper reads the ledger, then accepts the voice at the Lishal's frame.                                     | `SR-rootwaysRecord`, `SR-vesperAcceptance`        |
| Return                     | Vesper carries the voice toward the circle. The violet stone dims again. The hero brings the lower return. | `SR-ascentOpened-03`, `SR-campaignReturn-10`      |
| The rite                   | The ring is mended. Vesper draws on all seven inside it. The ring holds and the songs go home.             | `SR-malificatRisen-07`, `SR-malificatFallen-01`   |
| After                      | Fennick says "Ves, en." Vesper wakes and lives. The voice stays below, turned down to a lullaby again.     | `SR-malificatFallen-04`, `SR-campaignRecovery`    |

**Why Vesper lives where earlier bearers died.** The earlier bearers were outside a working ring.
Inside the mended ring, the borrowed songs go back to their stones instead of burning out the
bearer. Fennick's waking words do the rest.

### 2.9 Reconciliation with the World Bible

Every item labelled **Established** in the bible, checked against this history.

| Established item (bible section)                                              | Fit             | Note                                                                                                           |
| ----------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| Sevenstones, stone circle, seven stones; only Mossvale connects (3)           | Kept            | The eighth stone is buried, not an eighth site. No new spoke into the sanctuary.                               |
| Four hometowns; opening cast once; mentor homes fixed (3, WB-C02)             | Kept            | The lower return runs under the whole surface country, so Rowan's well cracks it in any of the four homes.     |
| Surface regions, Brightwater, Moon Caves via Moonfall (3)                     | Kept            | Moonfall Ruins become an old Lamplighter observatory (moon rune, moon tables). No map change.                  |
| Violet stone dims first; lights weaken; spores, pale meadows, lake (4)        | Explained       | 2.6 gives the cause for each.                                                                                  |
| Wyrm coils around the moon-crystal; voice "claims" to consume moonlight (4)   | Changed wording | The claim is rewritten to a true one ("I only stand in front of it"). The fact of the coil is kept.            |
| Voice claims are not physical law (4)                                         | Kept            | Visions remain the voice's framing. The rewrite makes them true but partial.                                   |
| Wyrm's defeat restores moonlight; sleepers stir (4, WB-C08)                   | Kept            | The Wyrm's body no longer blocks the lens.                                                                     |
| Seven schools; Arcane after the Wyrm (4)                                      | Explained       | The violet stone's song needs moonlight.                                                                       |
| Rowan teaches Quake through the well (4, WB-C03)                              | Kept            | Earth magic and a rune stone cracked the bedrock; the reward is unchanged.                                     |
| Moon-crystal distinct from violet stone (4, objects)                          | Kept            | A lens, not a ring stone.                                                                                      |
| Focus Stone / rune stone separate from spell and moon-crystal (4)             | Kept, extended  | It becomes a Lamplighter marker. Still separate from both.                                                     |
| Moon Shards do not establish a stone origin (4)                               | Kept            | Not used.                                                                                                      |
| No chosen hero, heir or relative of the antagonist (5)                        | Kept            | Visions come from the stone the hero carries, not from the hero.                                               |
| Rowan's worry "does not prove he caused every later harm" (5)                 | **Changed**     | His worry becomes partly true: he opened the crack. He did not cause the voice or anyone's choices. SQR-D03.   |
| Rowan's knees; no expedition (5, WB-C16)                                      | Kept            | His part in the mending is advice and wedges at home.                                                          |
| Pip's mother awake; Hareguy asleep three weeks (5, WB-C05)                    | Kept            | Brightwater, near the Cave Pass, fell asleep first.                                                            |
| Vesper sought glory, calls the Wyrm Master, remembers the sun (5)             | Kept            | The voice let them think the Wyrm was the Master. Their childhood was at the circle, in the sun.               |
| Wyrm survives asleep; voice calls it an obedient throat (5, WB-C08)           | Kept            | Its sleep before was the voice's sleep; "a real sleep this time" is now literal.                               |
| Separate the animal from the voice without a settled origin or guilt (WB-C09) | **Changed**     | This plan settles both: the voice is the eighth stone, and the Wyrm had no choice. Proposed new WB-C09 in 8.3. |
| Old man with a lantern recognises the tracks; Fennick's rite late (5)         | Kept            | He is a Lamplighter. The pronoun fix in `SR-chapterEnd-06` is part of Plan A.                                  |
| Encounter order and midpoint false victory (7, WB-C10)                        | Kept            | No new boss.                                                                                                   |

**Established items this plan would change:** (1) the Rowan sentence in section 5, because his
guilt becomes a real but bounded arc; (2) WB-C09, because a mystery needs a settled answer the
author knows. The wording of section 4's "claims to consume moonlight" changes but not its facts.

### 2.10 Alternative history: the Long Dream (shorter)

There is no eighth stone. Long ago, the Lamplighters used healing sleep under the stone circle.
Hundreds of patients dreamed side by side for years, and their shared dream became a mind: the
voice. It is made of sleepers. Each new sleeper adds to it, and each person who wakes takes a piece
away. It dims the stones because dreamers draw on their light. The Wyrm was its oldest dreamer.
Bearers are people who let the dream wake inside them. The ward is a ring that keeps the dream
from spreading. "Ves, en." is still the waking word.

| Compared with the eighth stone | Long Dream                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Strength                       | Every rescue weakens the voice, which suits Plan C. Very human and quietly sad.        |
| Weakness                       | Loses the eight-versus-seven pattern. Darker for young players: the villain is people. |
| Rowan                          | His crack let the dream reach the surface. Same arc.                                   |
| Effort                         | Same plants; about 30% of new lines change wording.                                    |

**Recommendation:** the eighth stone. It matches the seven-part pattern already in play and keeps
sleep itself innocent, which is the theme: care that will not let go becomes control.

## 3. Truth table

One sentence each. "R" numbers are the reveals in section 4.

| Question                                                         | Answer                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1 · Why does the voice want people asleep?                      | It is the eighth stone's will, and it believes endless rest is mercy (R1, R2).                                                                         |
| F1 · What does it gain from sleepers?                            | Each sleeper hums its song back, so more sleepers make it louder until it can drown the other seven (R2).                                              |
| F1 · Why do the Lishal impose sleep?                             | They were the Lamplighters' singers, and centuries of listening convinced them sleep is kindness (R7).                                                 |
| F1 · Do the Lishal serve the voice?                              | They agree with it and work for it by choice, which is why their care and their locks are both real (R7).                                              |
| F1 · What is Irdrath?                                            | A fire warden the Lamplighters set to keep sleepers warm until they returned, who forgot that waking them was the job (R8).                            |
| F1 · Why does the Firstcoal matter?                              | It is an ember of the red stone that gives Irdrath his heat and his grip; freed, it goes home (R8).                                                    |
| F1 · What are the seven stones?                                  | Seven of eight singing stones; their songs keep the world awake, and each school is one song (R1).                                                     |
| F1 · Why does the violet stone fail first?                       | It holds the eighth song down and is fed by moonlight, which the Wyrm's body blocked (R4).                                                             |
| F1 · Why does the ward contain the voice?                        | The ward is all seven songs in a ring, and the eighth song cannot cross all seven at once (R6).                                                        |
| F1 · Who built the ward?                                         | The Lamplighters, Fennick's order (R6).                                                                                                                |
| WB-Q01 · Who is the old man, and whose tracks?                   | Fennick, a Lamplighter, who raised Vesper beside the ward; the tracks are Vesper's (R9).                                                               |
| WB-Q02 · What is the voice?                                      | The will of the buried eighth stone, which sings sleep (R1).                                                                                           |
| WB-Q02 · How much choice did the Wyrm have?                      | None: it was a sleeping vessel, and its fall gave it back its own sleep (R1).                                                                          |
| WB-Q05 · What does the rite do?                                  | It mends the lower return that Rowan's crack broke, closing the ring (R5, R6).                                                                         |
| WB-Q05 · What does the ward do?                                  | It turns the eighth song down to a lullaby and keeps it, and any vessel inside, from leaving (R6).                                                     |
| WB-Q05 · What does the lantern do?                               | It holds stone-light; at the end it releases the morning light that wakes Vesper (R6, R10).                                                            |
| WB-Q07 · What does "Ves, en." communicate?                       | "Rest, enough": the Lamplighters' waking words, still said when lamps are lit at dawn (R10).                                                           |
| WB-Q08 · What must the player understand before the final scene? | Fennick raised Vesper; bearers die with the same promise; Rowan's stone is a ring marker; the Lishal were Lamplighters; the voice is under the circle. |
| Extra · Why do the visions start when they do?                   | The hero is carrying Rowan's rune stone, a ring stone the voice can speak through (R5).                                                                |
| Extra · Why does the violet stone dim again after the Wyrm?      | Vesper carries the voice toward the circle and draws on the stones (R3, R4).                                                                           |
| Extra · Why does Vesper live?                                    | Inside a whole ring, the borrowed songs go home instead of burning out the bearer (R3, R6).                                                            |

## 4. Clue ledger

**Key.** _G_ = guaranteed on every route (a scene beat, a required task, a single-text line). _C_ =
chance (a rotating variant, a mood branch, an optional NPC). _1h_ = reachable in the first hour
(opening, the well and refusal, the first vision, the first mentor met). `NP-…` are new plants,
drafted in 4.2. Each reveal needs three or more plants, one _G_ before the confirming scene and one
_1h_.

### 4.1 Reveals

| Reveal                                                                   | Plants (gate · type)                                                                                                                                                                                                                                            | Confirming scene                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **R1** The voice is a buried stone under the circle, not the Wyrm        | `SR-opening-03` with NP-01 (G, 1h); NP-04 lamp post (G, 1h); vision 2 "where the serpent keeps the moon" (G); `SR-wyrmFall-01` "as if whatever was speaking simply stopped" (G); `SR-chapterEnd-04` (G)                                                         | NP-22 at `campaignRite`; `SR-malificatFallen-04` "The voice remains behind" |
| **R2** Sleepers are listeners; it calls endless rest mercy               | `SR-opening-03` "Sleep." (G, 1h); NP-02 humming sleepers in the houses (G, 1h); vision 1 (G, 1h); `SR-mentor-maren.afterLesson.plain.02` "Listen to the lake when you sleep" (C, 1h); NP-10 Pete (C)                                                            | `SR-lishalRefusal-02`–`11` and NP-19 Lishal line                            |
| **R3** Bearers carry it, get the stones, and die                         | `SR-chapterEnd-04` "I have others" (G); `SR-archiveDrained-05` ledger (G); NP-15 "The stones will answer you" in `rootwaysRecord` (G); `SR-rootwaysRecord-08` (G); `SR-mentor-selene.afterLesson.plain.02` "Something listens" (C); vision 1 "carry it" (G, 1h) | `SR-vesperAcceptance-05`; `SR-malificatRisen-04` "drawing on all seven"     |
| **R4** The violet stone holds the song down and needs moonlight          | `SR-opening-02` (G, 1h); NP-03 Selene's letter (G, 1h); `SR-mentor-selene.motive` (C); vision 3 (G); `SR-chapterEnd-01` (G)                                                                                                                                     | `SR-ascentOpened-03`; `SR-campaignRite-08`                                  |
| **R5** Rowan's stone is a ring marker; his well cracked the lower return | `SR-opening-05` violet well (G, 1h); `SR-refusal-04` with NP-05 mark (G, 1h); `SR-npc-elder.confide.warm` (C, 1h); visions start with the stone (G, 1h); NP-11 Dorn (C); `SR-bellRelief-07` blank line (G)                                                      | NP-20 at `campaignReturn`; NP-21 at `rowanReturn`                           |
| **R6** The ward is the Lamplighters' ring of seven songs                 | NP-04 lamp post (G, 1h); NP-06 "Ves, en." at dawn (G, 1h); `SR-npc-guard.intro.*` ward frames (G: Cave Pass task); vision 3 "seven lamps around one sleeper" (G); `SR-campaignRite-16` thread bends back (G)                                                    | `SR-malificatRisen-07` recoil; NP-22                                        |
| **R7** The Lishal were the order's singers                               | NP-14 ledger cover "singers of the lower hall" (G); `SR-lishalRefusal-01` seven crystal sockets (G); `SR-vesperAcceptance-02` "Seven voices" (G); NP-12 Ivo's moon tables mention singers (C)                                                                   | NP-19 at `lishalSilenced`                                                   |
| **R8** Irdrath is a warden; the Firstcoal is the red stone's ember       | `SR-mentor-torva.motive` shaking hands (C, 1h if Torva first); NP-13 Cinda (C); `SR-irdrathTrial-03` "I keep them warm through the night" (G); `SR-irdrathYielded-01` (G)                                                                                       | NP-18 at `irdrathYielded`; `SR-campaignRite-02` "Not a shake"               |
| **R9** Fennick raised Vesper at the circle; Vesper heard the singing     | NP-08 old man in Brightwater (G: placed on the required Cave Pass route); NP-09 Vesper confide (C); NP-12 Ivo (C); `SR-chapterEnd-06` (G)                                                                                                                       | `SR-campaignThreshold-03`                                                   |
| **R10** "Ves, en." means "Rest, enough"                                  | NP-06 hero says it at dawn (G, 1h); NP-07 Pip's translation "up you get" (C, 1h); NP-08 old man says it to Hareguy (C)                                                                                                                                          | NP-23 at `malificatFallen` and `campaignRecovery`                           |
| **R11** Blight is a stone's song going quiet                             | `SR-opening-04` Fern's still wind and Ares's lightless candle (G per class, 1h); NP-02 cold oven (G, 1h); `SR-mentor-hazel.motive`, `SR-mentor-maren.motive` (C, 1h); NP-16 mentor lines (C)                                                                    | `SR-chapterEnd-01`; `SR-campaignRite-05` Hazel at the rite                  |

The confirming scene must come after every plant it relies on. The automated check is in 10.2.

### 4.2 New plants (drafted text)

Each row names the file and the gate in the existing data shape.

| ID    | File and place                                                                                              | Gate                                        | Text                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NP-01 | `story.ts:225`, `SR-opening-03` stage                                                                       | `scene:opening`                             | _Far beneath the stone circle, something enormous breathes in. Every lamp in every village dims at once._                                                                                                               |
| NP-02 | `src/data/maps.ts:160`, `:170`, `:180` (inspect `text`), and the same houses in `hometownMaps.ts`           | `opening:houseVisited` (one house required) | Baker: "…The oven is cold. Under the breathing, very faintly, he is humming." Millers: "…neither stirs. Both are humming the same slow tune." Tess: "…Her lips move, as if she is singing along to something."          |
| NP-03 | `story.ts:276`, `SR-refusal-02`: new stage beat after Kestrel's line                                        | `scene:refusal`                             | _Selene's letter is a column of numbers, one for each night. Each is smaller than the last. At the bottom she has written: "Moonlight. Why is the violet stone always first?"_                                          |
| NP-04 | `maps.ts` Mossvale entities (and each home in `hometownMaps.ts`): new `kind: 'inspect'` lamp post           | none (ordinary world)                       | Title "The oldest lamp post". "Worn into its base: seven small rays around a closed eye. The same mark is on every lamp post in town."                                                                                  |
| NP-05 | `story.ts:287`, `SR-refusal-04` line                                                                        | `scene:refusal`                             | "Found this the year I dug the well. See the mark? Seven little lines round an eye. Cracked the bedrock with it anyway. Take it, kid."                                                                                  |
| NP-06 | `story.ts:230`, `SR-opening-04` stage                                                                       | `scene:opening`                             | _Dawn in Mossvale. You light the lane lamps and say the old dawn words, the way everyone does: "Ves, en." Bean tends her beds…_                                                                                         |
| NP-07 | `src/data/npcs.ts:248` Pip, `intro.plain` new variant                                                       | none; `saidUntil: { flag: 'wyrmBeaten' }`   | "Gran says you say 'ves, en' when you light the lamps. It means up you get. I say it to my tower when it's stuck."                                                                                                      |
| NP-08 | New NPC `lamplighter` in `npcs.ts`; entity in `maps.ts` Brightwater (near `bw-shrine`, `maps.ts:233`)       | see section 6                               | see section 6                                                                                                                                                                                                           |
| NP-09 | `story.ts:116`, `:118` Vesper `confide`                                                                     | existing Vesper route flags                 | see section 6                                                                                                                                                                                                           |
| NP-10 | `npcs.ts:15` Pete's shared line                                                                             | none                                        | "Rowan's boy is upstairs. Three weeks asleep. Breathes fine. Hums, sometimes, like he's hearing a tune."                                                                                                                |
| NP-11 | `src/data/mentors.ts:281` Dorn `afterLesson.plain`                                                          | after Dorn's lesson                         | "Old miners had a rule. If you find a marked stone, stop digging. Most people forgot it."                                                                                                                               |
| NP-12 | `npcs.ts:1047` Ivo, `intro.plain` new variant                                                               | `saidUntil: { flag: 'wyrmBeaten' }`         | see section 6                                                                                                                                                                                                           |
| NP-13 | `npcs.ts:859` Cinda, `confide` (keep the key line as a second variant)                                      | Devoted                                     | "Torva says the forge's first fire came up from the deep in a bucket. Half of it went back down and never came home."                                                                                                   |
| NP-14 | `campaignStory.ts:98`, `SR-archiveDrained-05` stage                                                         | `campaign:drain`                            | _…orders appointing their replacements. On the cover: seven rays around a closed eye. Inside: "Kept by the singers of the lower hall."_                                                                                 |
| NP-15 | `campaignStory.ts:205–208`, `rootwaysRecord`: new stage before `-07`                                        | `defeated:campaign-irdrath`                 | _Both records end with the same words: "The stones will answer you."_                                                                                                                                                   |
| NP-16 | `mentors.ts` `afterLesson.plain` for Hazel, Maren, Torva, Rook, Kestrel                                     | after each lesson                           | Hazel: "My oldest roots reach warm stone. This spring the stone went cold." Rook: "The storms hum before they break now. Like they're tired." Kestrel: "The wind stopped for a whole day last week. Wind doesn't stop." |
| NP-18 | `campaignStory.ts:164`, `irdrathYielded`: new beat after `-04`                                              | `defeated:campaign-irdrath`                 | **Irdrath:** "The lamplighters said, keep them warm until we come back." _(a pause)_ "I kept them warm."                                                                                                                |
| NP-19 | `campaignStory.ts:476`, `lishalSilenced`: new beat after `-01`                                              | `defeated:campaign-lishal`                  | _The sixth singer sets down a small brass lamp with no wick. Seven rays and a closed eye are cut into its base._ **The Lishal:** "We sang it quiet, once. Then we listened."                                            |
| NP-20 | `campaignStory.ts:537`, `campaignReturn`: new beat after `-11`                                              | `campaign:return`                           | _Fennick turns Rowan's stone over in the lamplight._ **Fennick:** "This is one of ours. A marker. It says: not here." **Hero:** "Rowan dug a well there." **Fennick:** "Then that's where the circle broke."            |
| NP-21 | `campaignStory.ts:591`, `rowanReturn`: new beats after `-10`                                                | `campaign:return`                           | **Hero:** "Fennick read your stone. It said not to dig there." _Rowan is quiet for a long time._ **Rowan:** "Then I'd better tell you how to cut these right."                                                          |
| NP-22 | `campaignStory.ts:732`, `campaignRite`: new beat after `-21`                                                | `campaign:rite`                             | **Fennick:** "There were eight stones once. We buried the eighth under this circle. Its song is sleep. Not a bad song. Just too much of it."                                                                            |
| NP-23 | `campaignStory.ts:779` `malificatFallen` after `-02`; `campaignStory.ts:802` `campaignRecovery` after `-03` | final boss, then recovery                   | Fallen: _Fennick, at the lantern, says the dawn words._ "Ves, en." _Vesper's eyes open._ Recovery: **Vesper:** "You said that every morning." **Fennick:** "Rest, enough. Time to get up."                              |

NP-17 is unused. Plan D may replace NP-09 and NP-23's recovery line; the facts
they carry must stay.

## 5. Vision rewrites

Each vision shows **one of two variants** at random (`VisionDef.lines`, `story.ts:24–55`), so both
variants must carry the vision's key clue. Every line is true from the voice's point of view.

| Passage                  | Rewrite                                                                                                                                                                                               | Key clue | What a rereading player learns                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `SR-vision1.01`          | _The rune stone in your pack turns cold._ "You mend wells and sweep up spores, little one. You are tired already. I can hear it through the stone. Rest. I let everyone rest."                        | R2, R5   | It hears the hero through Rowan's stone. "I let everyone rest" is true, and it means forever. |
| `SR-vision1.02`          | _The stone in your hand hums, low enough to feel in your teeth._ "A man broke a stone to dig a well, and I heard the sky for the first time in an age. Carry me a little further."                    | R3, R5   | Rowan's crack let it reach the surface. "Carry me" is its first bid for a bearer.             |
| `SR-vision2.01`          | _Rock dust drifts down without a sound._ "Every stone you split is a door for me. Come down to the caves, where the serpent keeps the moon."                                                          | R1, R4   | The voice and the serpent are two. The serpent "keeps" the moon: it blocks it.                |
| `SR-vision2.02`          | _A blue eye opens in a dark puddle, then closes, slow as sleep._ "The serpent has slept a hundred years and never once been cold or afraid. Would you take that from it?"                             | R1, R2   | The Wyrm is asleep and used. The voice sincerely thinks that is a gift.                       |
| `SR-vision3.01`          | _Lightning draws a ring on the clouds, then breaks it._ "Seven lamps around one sleeper. They called it a ward. I call it a wall around someone who only wanted to sing."                             | R1, R6   | The ward is a ring of seven around the voice. The "sleeper" is the eighth stone.              |
| `SR-vision3.02`          | _The wind drops to nothing._ "I take nothing from the moon. I only stand in front of it, and the violet stone goes hungry."                                                                           | R4       | Replaces "pale reflection". Consistent with the prelude: blocking, not drinking.              |
| `SR-prelude-moonWyrm.01` | _The serpent lifts its head. Its eye is half closed, like a sleeper talking in a dream._ "You came down. Good. This one is very old and very tired. It will not let go of the light. Neither will I." | R1       | "This one" and "neither will I" name two speakers. The Wyrm talks in its sleep.               |
| `SR-prelude-moonWyrm.02` | _Frost spreads from the serpent's breath._ "No one has woken this one in a hundred years. I made sure its dreams were kind. Wake it, if you can."                                                     | R1, R2   | Its fall is a waking into "a real sleep" (`SR-wyrmFall-03`). The challenge is honest.         |
| `SR-chapterEnd-04` voice | "A good throat. Old, and very obedient. Let it sleep its own sleep now. **I have others.**" (staging by Plan A)                                                                                       | R2, R3   | It releases the Wyrm on purpose. "Others" means every sleeper, and Vesper.                    |

**Gating stays as it is.** Vision 1 still needs `got:wellStone`, now a story reason as well as a
flag. Vision 3 is entered at the peaks beacon (`enters: 'peaks'`), so the lightning ring fits.

**Lines retired.** "I am the silence between stars" and "toys forgotten in the mud" go. They are
generic (F3) and carry no clue. Plan A may keep one "little one" taunt per vision for menace.

## 6. Seeding Fennick and Vesper before the midpoint

**Fennick in Brightwater (NP-08).** New NPC `lamplighter`, display name "Old Lamplighter" (unnamed
until `SR-campaignThreshold-03`). Element `arcane`. Not `essential`. Map entity in the existing
shape:

```ts
{ id: 'bw-lamplighter', kind: 'npc', npcId: 'lamplighter', x: 10, y: 12,
  requiresFlag: 'scene:refusal', untilFlag: 'wyrmBeaten' }
```

The tile is a placeholder near the shrine (`maps.ts:233`); check it is free. Brightwater is on the
required route to the Cave Pass, so the meeting is guaranteed to be _available_. It is not forced.

| Moment          | Line                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `intro.cold`    | _An old man polishes a brass lantern with no wick._ "Dark cloak. Quiet feet. If you've seen them, say so."                              |
| `intro.plain`   | _An old man polishes a brass lantern with no wick._ "Have you seen a traveller in a dark cloak? Walks quietly. Reads everything."       |
| `intro.warm`    | "Sit a moment. I'm looking for someone in a dark cloak. They left without their supper. That isn't like them."                          |
| `confide`       | "I raised a child by the stone circle. They used to put an ear to the stones and say someone was singing. I told them it was the wind." |
| task (fallback) | "Hold the lantern while I read the shrine marks." A short repeatable offering challenge using violet, like Ivo's rune (`npcs.ts:1047`). |
| `win`           | "Thank you. I sat with Rowan's boy last night. I said the dawn words. He didn't wake. Not yet."                                         |
| `done`          | "If you meet them, tell them the lamp's still lit."                                                                                     |

**Moonfall resident (NP-12).** Ivo, `intro.plain` second variant with
`saidUntil: { flag: 'wyrmBeaten', lines: [...] }`: "An old lamplighter used to climb up here to
copy the moon tables. A child always came with him. Asked what every mark meant, then asked again."

**Vesper before the midpoint (NP-09).** These replace two lines in `VESPER_LINES.confide`
(`story.ts:116`, `story.ts:118`). They use the existing route flags (`vision:1`, `vision:2`,
`vision:3`, `reached:ruins`, `story.ts:84–93`), so WB-C06 still holds.

| Passage                      | Line                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `SR-vesper.confide.plain.02` | "I grew up beside the stone circle. Something under it sang. Everyone said it was the wind." |
| `SR-vesper.confide.warm`     | "The Master speaks to me. Only to me. You can't know what that's like."                      |
| New `done.plain` variant     | "Ask the old man with the lantern what the singing was. Ask him why he said wind."           |

**Pronoun fix.** `SR-chapterEnd-06` (`story.ts:349`): "I taught the child who made them to walk."
(Plan A owns the fix. Plan B relies on it.)

## 7. Delivery rules

**How lore reaches the player.**

1. **Objects first.** A fact appears first on something the player can look at: a lamp post, a
   rune stone, a ledger cover, a lantern base. The symbol (seven rays around a closed eye) repeats
   on each, so the player connects them without being told.
2. **People say what they need, not what they know.** A line carries lore only while the speaker
   wants something from the hero (Fennick wants news of Vesper; Rowan wants his son).
3. **Three short sentences, at most.** No lore line runs longer than three sentences. NP-22 is the
   longest and it answers Vale's direct question.
4. **The voice frames; it never lies.** Every voice line must be true under section 2. Reviewers
   check it against the truth table.
5. **Confirm on screen.** Each reveal is confirmed by an action or object (the recoil, the lamp the
   singer sets down), not by a character summarising.
6. **Leave some unexplained.** The hard winter, the stone tongue and the order's history stay
   off-screen. The player needs the answers in section 3, not the whole history.
7. **No lecture scenes.** No new scene exists only to explain. Every new beat sits in a scene that
   already has a task.

**Reading-level guard for young players.**

- At most 20 words per sentence in any new line; aim for 12.
- One new proper noun per scene at most. "Lamplighters" is first used as an ordinary word
  ("an old lamplighter") before it is a name.
- Every lore word names something a child can picture: lamp, stone, ring, song, crack. Avoid
  "relay", "branch", "return" and "vessel" in player text. "Bearer" appears only in the ledger.
- "Ves, en." always appears with a picture (lighting lamps) and, the first time it is explained, a
  child's translation ("up you get").
- Sad facts stay gentle: bearers "slept and did not wake", not "died in agony".

## 8. Proposed World Bible updates (drafted text)

### 8.1 Section 4, new subsection "What lies beneath" (replaces the paragraph at `WORLD_BIBLE.md:185–189`)

> **Established once SQR-D02 is approved.** There were eight singing stones. Seven keep the world
> awake, and each school of magic is one of their songs. The eighth sings sleep. The Lamplighters
> buried it beneath the stone circle and set the seven in a ring around it: the ward. The violet
> stone holds the eighth song down and is fed by moonlight, which reaches it from the moon-crystal
> in the Moon Caves. When a stone's song weakens, its domain shows blight. The voice is the eighth
> stone's will. It wants rest for everything and gains strength from every sleeper, because each
> sleeper hums its song back. It cannot move and needs a vessel to reach the stones.
>
> The voice's lines are its own framing. They are true but partial. Do not write a voice line that
> section 4 says is false.

### 8.2 Section 5 changes

- **Rowan.** Replace "That worry does not prove he caused every later harm" with: "His worry is
  partly right. His well cracked the ring's lower return and let the voice reach the surface. He
  did not create the voice or make anyone's choices. He helps mend the ring with his skill, not by
  travelling."
- **The Moon Wyrm and the voice.** Replace the proposed interpretation with: "The voice is the will
  of the buried eighth stone. The Wyrm was a sleeping vessel with no choice. Its defeat returned it
  to its own sleep."
- **Fennick.** Add: "One of the last Lamplighters, the order that built the ward. He raised Vesper
  beside the circle and once told them the singing under the stones was the wind."
- **Irdrath.** Add: "A fire warden set by the Lamplighters to keep sleepers warm until they
  returned. The Firstcoal is an ember of the red stone."
- **The Lishal.** Add: "Once the Lamplighters' seven singers. They came to agree with the voice and
  kept the ledger of bearers. Their past explains their choices; it does not excuse them."
- **Vesper (lore only).** Add: "Heard the voice as a child through the stones. The voice let them
  believe the Wyrm was the Master. Its promise to every bearer: 'The stones will answer you.'"

### 8.3 Continuity checks

| ID     | Scope                 | Check                                                                                                                                  |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| WB-C09 | Established (revised) | The voice is the eighth stone's will; the Wyrm was a sleeping vessel without choice. Do not give the Wyrm motives or guilt of its own. |
| WB-C14 | Proposed (revised)    | The light test shows the mended ring bends stone-light back. Containment is shown by the records and by the recoil at the boundary.    |
| WB-C20 | New · secret history  | Every voice, vision or prelude line must be true under section 4. Framing and omission are allowed; false statements are not.          |
| WB-C21 | New · clue ledger     | Do not remove or reword a ledger plant without updating the ledger and keeping three plants, one guaranteed and one in the first hour. |
| WB-C22 | New · Rowan           | Rowan opened a crack; he did not cause the voice. No scene may blame him for the sleep or make him seek forgiveness from the cast.     |
| WB-C23 | New · symbol          | Seven rays around a closed eye marks Lamplighter work only. Do not put it on Lishal-made or voice-made objects except the sixth lamp.  |
| WB-C24 | New · "Ves, en."      | It means "Rest, enough" and is a waking phrase. Never use it as a spell name, a curse, or something the voice says.                    |
| WB-C25 | New · moonlight       | The voice and the Wyrm block moonlight; nothing "drinks" or "eats" it.                                                                 |

### 8.4 Section 9 decision rows

Mark WB-Q01, WB-Q02, WB-Q05 and WB-Q07 "Answered by Plan B, pending SQR-D02", with the section 3
sentences as the working version. WB-Q08's working version becomes the section 3 row.

## 9. Workstreams and tasks

| #   | Task                                                                                     | Owner role         | Input               | Output                                   | Effort |
| --- | ---------------------------------------------------------------------------------------- | ------------------ | ------------------- | ---------------------------------------- | ------ |
| T1  | Review sections 2–3 with the author; choose eighth stone or Long Dream.                  | Lead lore writer   | This plan           | Signed SQR-D02, D03 and PB decisions     | 2 days |
| T2  | Write sections 8.1–8.4 into the World Bible.                                             | Lead lore writer   | T1                  | Bible edit, author-reviewed              | 1 day  |
| T3  | Turn section 4 into a data ledger (`src/data/clueLedger.ts`) with IDs, gates and quotes. | Narrative designer | T1, section 4       | Ledger module, no player-facing change   | 2 days |
| T4  | Apply section 5 rewrites to `story.ts:24–62` and `SR-chapterEnd-04` (with Plan A).       | Writer + engineer  | T1, Plan A register | Data change, regenerated Story Reader    | 2 days |
| T5  | Add NP-01 to NP-23 to the named files.                                                   | Writer + engineer  | T1, T3              | Data changes, regenerated Story Reader   | 5 days |
| T6  | Add `lamplighter` NPC and Brightwater entity; confirm the talk-only or fallback task.    | Engineer           | Section 6           | NPC def, map entity, encounter if needed | 2 days |
| T7  | Add `tests/clueLedger.test.ts` (10.2).                                                   | Engineer           | T3                  | Passing test in CI                       | 2 days |
| T8  | Hometown parity: copy NP-02 and NP-04 to the four homes in `hometownMaps.ts`.            | Engineer           | T5                  | Equal clue access for every hero         | 1 day  |
| T9  | Cold-reader playtest (10.1), two rounds.                                                 | Playtest lead      | T4–T8 build         | Report with scores                       | 4 days |
| T10 | Fix weak reveals found in T9; rerun the affected questions.                              | Lead lore writer   | T9 report           | Revised plants                           | 2 days |

Total: about 3.5 writer-weeks plus 1.5 engineer-weeks, in line with the review's estimate.

## 10. Verification

### 10.1 Cold-reader playtest protocol

**Readers.** Eight people who have never seen the story: three aged 9–12 (with a guardian), three
adults who play mystery games, two who do not. Each plays the build, or reads a Story Reader
export of exactly one route if time is short.

**Stop 1: before the rite** (after `campaign:return`, before `campaign:rite`). Ask, without
prompts or multiple choice:

1. What do you think the voice is?
2. Is the voice the Moon Wyrm? Why do you think that?
3. Why does the voice want people asleep?
4. Why did the violet stone go dark first?
5. What do you think Rowan's stone is?
6. What did the voice promise Vesper, and has it promised that before?
7. Who built the ward around the stone circle?

**Stop 2: after the ending.** Repeat questions 1–7, then:

8. What does "Ves, en." mean?
9. Read these three visions again. Did the voice lie to you? Point to any line you think was a lie.
10. Was any word or name confusing? Which?

**Scoring.** Two reviewers score each answer against section 3: right, partly right, wrong.

| Measure                                                                      | Success threshold       |
| ---------------------------------------------------------------------------- | ----------------------- |
| Stop 1, Q1: says the voice is under the circle, a stone, or not the Wyrm     | 4 of 8 or more          |
| Stop 1, Q2: says "no" with a reason from a plant                             | 5 of 8 or more          |
| Stop 2: right or partly right on at least 6 of Q1–Q8                         | 6 of 8 readers          |
| Q9: finds no line that is false under section 2                              | 7 of 8 readers          |
| Q10: young readers name no more than two confusing terms each                | All three young readers |
| Any reader calls a scene "a lecture" or skips text out of boredom at a plant | No more than one reader |

If a measure fails, the matching reveal row in section 4 gets a new guaranteed plant before
round two.

### 10.2 Automated tests

**File:** `tests/clueLedger.test.ts`. **Data:** `src/data/clueLedger.ts` (T3), exporting
`CLUE_LEDGER: readonly Reveal[]`. Each `Reveal` has `id`, `confirmedBy` (passage IDs) and `plants`.
Each plant has `ref` (an `SR-…` passage ID or `entity:<map entity id>`), `quote` (a short exact
substring), `guaranteed`, `firstHour` and `gate` (the flags that must hold).

Passage IDs are taken from the same rules the exporter uses (`tools/export-story-reader.mjs:121`,
`:160`, `:192`, `:220`). T7 moves that ID logic into an exported helper, `collectPassages()`, that
returns `{ id, text, gate }[]`, so the test and the exporter cannot drift.

| Assertion                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every plant and every `confirmedBy` ID exists in `collectPassages()`, or as an entity in `MAPS` / the hometown maps.                                            |
| Every plant's `quote` appears in that passage's current text, so a rewrite that drops a clue fails.                                                             |
| Every plant's `gate` matches the data: the scene's `requiresFlags`, the entity's `requiresFlag`, the vision's `requiresFlags`, or `saidUntil`.                  |
| In `STORY_MILESTONE_ORDER` (the order walked in `tests/campaign.test.ts:191–249`), every plant's gate comes before its reveal's first `confirmedBy` scene flag. |
| A plant whose `saidUntil` flag is set before the reveal is counted only if its gate opens earlier.                                                              |
| Each reveal has at least three plants, at least one `guaranteed` before the reveal, and at least one `firstHour` whose gate is in `FIRST_HOUR_FLAGS`.           |
| `FIRST_HOUR_FLAGS` is `scene:opening`, `opening:houseVisited`, `scene:refusal`, `got:wellStone`, `vision:1`, and a first lesson's flag.                         |
| Both variants of each vision contain its key clue word: vision 1 "stone", vision 2 "serpent", vision 3 "seven" or "violet".                                     |
| Every NP entry's text has no sentence over 20 words and none of the banned words in section 7.                                                                  |
| No voice, vision or prelude line contains "drank", "drink" or "reflection" (WB-C25).                                                                            |
| `SR-chapterEnd-06` does not contain "boy".                                                                                                                      |
| For each of the four heroes, the hometown map has the NP-02 houses and the NP-04 lamp post.                                                                     |

**Existing checks to keep green:** `node tools/export-story-reader.mjs --check` (the reader matches
the data), `tests/story.test.ts`, `tests/campaign.test.ts`, `tests/hometowns.test.ts`.

## 11. Milestones

| Milestone | Contents                                             | Exit condition                                    |
| --------- | ---------------------------------------------------- | ------------------------------------------------- |
| M-B1      | T1, T2: history approved and in the bible.           | SQR-D02 and SQR-D03 decided.                      |
| M-B2      | T3, T7: ledger and test, before any text changes.    | Test passes against current text with known gaps. |
| M-B3      | T4, T5, T6, T8: all plants and rewrites in the data. | Clue-ledger test passes with no gaps.             |
| M-B4      | T9, T10: playtest rounds.                            | All thresholds in 10.1 met.                       |

## 12. Risks

| Risk                                                  | Mitigation                                                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Too many clues make the midpoint twist obvious.       | Vision 2 and the prelude are the only pre-midpoint hints that the voice and Wyrm are two. Test with Stop 1 Q2; aim for "suspected", not "certain". |
| Over-explaining kills wonder.                         | Delivery rules 3, 6 and 7. The hard winter and the stone tongue stay off-screen.                                                                   |
| Rowan becomes a guilty figure in a children's story.  | WB-C22. His beat ends in work, not apology. The voice, the Lishal and Vesper keep their own responsibility.                                        |
| Rotating variants hide a clue from some players.      | Every reveal has a guaranteed plant; the test enforces it.                                                                                         |
| Plan A or Plan D rewrites a line that carries a clue. | WB-C21 and the `quote` assertion fail the build until the ledger is updated.                                                                       |
| Hometown maps drift from Mossvale.                    | Parity assertion in 10.2; T8.                                                                                                                      |
| A talk-only NPC is not supported.                     | Fallback offering task (section 6).                                                                                                                |
| "Lamplighters" and the symbol feel invented late.     | They appear in the first minute (NP-04, NP-06) and on objects in every act.                                                                        |

## 13. Author decisions

| ID      | Decision                                                                                                                                                         | Affects                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| SQR-D02 | Adopt the eighth-stone history (section 2), or the Long Dream (2.10)?                                                                                            | WB-Q02, WB-C09, WB-C20  |
| SQR-D03 | Rowan's well cracked the lower return: a bounded, contributing cause.                                                                                            | Bible section 5, WB-C22 |
| PB-D01  | Name the order "the Lamplighters", with the sign of seven rays around a closed eye.                                                                              | WB-Q05, WB-C23          |
| PB-D02  | "Ves, en." means "Rest, enough", said at dawn and by Fennick at the end.                                                                                         | WB-Q07, WB-C24          |
| PB-D03  | The Lishal were the order's singers (a change from the review's "the eighth stone's choir").                                                                     | WB-Q04                  |
| PB-D04  | Irdrath is a Lamplighter fire warden; the Firstcoal is the red stone's ember.                                                                                    | WB-Q04                  |
| PB-D05  | Vesper heard the singing as a child and Fennick called it wind (lore fact for Plan D).                                                                           | WB-Q01, WB-C17          |
| PB-D06  | Place the unnamed old man in Brightwater before the Wyrm (section 6).                                                                                            | WB-C06, WB-Q08          |
| PB-D07  | Retire "silence between stars", "toys forgotten in the mud" and "pale reflection".                                                                               | Bible section 10        |
| PB-D08  | Optional: Vesper's name shares _ves_ with the waking words. The voice could use it ("Even your name is mine"). Recommended: leave unsaid unless Plan D wants it. | WB-Q07                  |
