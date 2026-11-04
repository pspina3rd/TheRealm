# Plan D — Vesper's story: execution plan

Execution plan for Plan D in
[STORY_QUALITY_REVIEW.md](../reviews/STORY_QUALITY_REVIEW.md) (findings F3, F4, F5, F6; decisions
SQR-D06, SQR-D07). Passage IDs (`SR-…`) refer to
[WORLD_BIBLE_STORY_READER.md](../WORLD_BIBLE_STORY_READER.md). Continuity checks (`WB-C…`) and
decisions (`WB-Q…`) refer to [WORLD_BIBLE.md](../WORLD_BIBLE.md). File references are to branch
`GetPutTaco` as read on 3 November 2026.

This is a planning document. It changes no game text, data or tests. All drafted text is a
proposal for the author (Philip Spina). New decisions are numbered `PD-D01`… in section 15.

**Markers.** **[A]** means the line depends on Plan A (one voice, class answers, jargon). **[B]**
means it depends on Plan B (the secret history and clue ledger). **[C]** means it depends on Plan C
(attitude-coloured scenes, board mechanics). Lines with no marker stand alone.

## 1. Goal, scope and non-goals

**Goal.** Rebuild the emotional spine as a triangle — the hero, Vesper and Fennick — so that
players remember Vesper and can say what Vesper wanted. Fix the second-half rhythm at the same
time.

**Scope.**

- Character bibles for the hero (four classes), Vesper and Fennick.
- A beat sheet for the whole game, mapped to the monomyth (WB section 7) and WB-C10.
- Vesper as a rival at the four first-half stops (`VESPER_ROUTE`, `src/data/story.ts:83-95`).
- The underground restructure from `campaignThreshold` to `ascentOpened`: seven repair beats
  become three, plus one wonder, one danger and one quiet Vesper scene.
- Rewrites of `vesperAcceptance`, `campaignReturn`, `malificatRisen`, `malificatFallen` and
  `campaignRecovery`.
- Engineering impact, save migration and tests, described for the engineer who implements it.

**Non-goals.**

- No change to the encounter order (WB-C10) or the four major fights' stats.
- No new answer to what the voice is. That is Plan B (WB-Q02).
- No new attitude rules. Plan C owns how attitude colours scenes; this plan supplies the text.
- No change to surface mentor approaches (the other half of F6), or to other characters' barks (Plan A).
- Vesper is not redeemed or forgiven. Harm stays named and owned.

## 2. Problems this plan solves

### P4. Vesper's big choice and the hero's growth do not land

**Root cause.**

1. Vesper has no motive a player can feel. The only stated motive is "seeking glory"
   (`SR-vesper.confide.warm`, `src/data/story.ts:118`). The first-half lines are thirty
   interchangeable threats in a register the second half never uses (F3).
2. The Fennick link appears only after the Wyrm (`SR-chapterEnd-06`, `SR-campaignThreshold-03`).
   The player has no picture of Vesper's childhood when Vesper chooses the voice.
3. "I can hear the surface" (`SR-vesperAcceptance-18`) is a climax with no setup. Nothing earlier
   says Vesper wanted to be heard.
4. The hero's four hesitations (`SR-refusal-01`, `src/data/story.ts:264-272`) never return. Every
   later hero line is shared text such as "Where do you need me?" (`SR-archiveRefuge-09`).
5. The scene system already supports class lines for any speaker (`classLines`,
   `src/data/story.ts:177`, resolved in `src/game/story.ts:297`), but only the opening and refusal
   use it.

**Tasks.** D1.1–D1.5 (rival lines), D2.4 (quiet reading scene), D3.1–D3.5 (late rewrites), D5.1
(playtest). Plan A drafts the full class voice; this plan owns the arc and where each answer
lands (section 4).

**Before → after.**

| Moment                | Before                                             | After                                                                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Four first-half stops | One shared bark table, "surface-bug", "the Master" | Four stop-specific rival scenes; Vesper competes, sometimes helps, never says "Master"      |
| Vesper's motive       | "Seeking glory"                                    | "It's my turn to be heard." Ambition stays: power is how Vesper thinks you get heard        |
| `rootwaysRecord`      | Short reading; Vesper leaves                       | Quiet scene; the two take turns reading; Vesper names the childhood wound                   |
| `vesperAcceptance`    | Shared hero lines; Vesper's refusal is generic     | Vesper quotes the hesitation the hero told them in `rootwaysRecord`; the hero answers       |
| `campaignReturn`      | Fennick asks; the hero reports a route             | The hero reports what Vesper said; Fennick owns his part                                    |
| `malificatRisen`      | "Fennick?" gets no answer                          | Fennick answers "I'm here" — the payoff to "Tell them I'm here" (`SR-campaignThreshold-12`) |
| `campaignRecovery`    | Cup of water; no hero gesture                      | The hero returns the ledger Vesper asked for; Vesper's response follows attitude **[C]**    |

**Acceptance criteria.** Every hero class has a distinct line at the five answer points
(`rootwaysRecord`, `vesperAcceptance`, `campaignReturn`, `malificatFallen`, `mossvaleRecovery`;
section 7), and Vesper's bridge line quotes what that class said in `rootwaysRecord`. The words "surface-bug", "meat" and "dust" (and "Master", if PD-D02 is approved) do
not appear in Vesper's first-half lines. Five of eight playtesters can say what Vesper wanted (section 12).

**Tests.** `tests/vesperArc.test.ts` (new, section 8.4): every class gets its own line at each
answer point; the banned words are absent; Fennick's "I'm here" directly follows "Fennick?" in
`malificatRisen`.

### P5d. The underground half repeats one beat

**Root cause.** From `archiveRefuge` to `ascentLanding` the critical path is gated by seven repair
beats in a row: drain (`archiveDrain`, `src/data/campaignNpcs.ts:64`), trial channel
(`cisternTrial`, :86), tram rail (`rootTram`, :109), lift (`ketterRescue`, :132), bell circuit
(`bellCircuit`, :154), shutter brake (staged in `SR-vesperAcceptance-07`) and jacked beam
(`ascentRepair`, :199). Each warp in `src/data/campaignMaps.ts` (:109, :146, :182, :218, :255,
:292, :332) waits on one of them. There is no place of wonder, no danger that cannot be fixed, and
no rest.

**Tasks.** D2.1–D2.8, D4.1–D4.6.

**Before → after.** Seven repairs become three: the old drain (drain and channel merged), Ketter's
lift (unchanged) and the fallen beam (beam and bell handover merged). The tram becomes a ride. The
bell circuit becomes the danger: the bells cannot be fixed, only escaped. The shutter brake stays
as a choice inside the bridge scene, not a task. Full table in section 6.1.

**Acceptance criteria.** On the critical path between `campaignThreshold` and `ascentOpened`, no
two repair tasks are adjacent without a non-repair scene or fight between them. The three new
scenes (wonder, danger, quiet) exist and are reachable for all four classes with no optional
lessons (WB-C15).

**Tests.** `tests/campaign.test.ts` per-class completion run updated to the new task list;
`tests/campaignPacing.test.ts` (new) asserts the rhythm rule and scene reachability (section 8.4).

## 3. Character bibles

### 3.1 The hero

The hero's arc is the same shape for every class: **a hesitation, set up in the opening, is said
back to the hero by Vesper at the bridge, and the hero answers it.** The hero changes because they
hear their own excuse in someone else's mouth. Class sets the words, not the morality (WB section
5).

| Class (hero)  | Want (opening)               | Lie they believe                       | Need                                  | Vesper quotes it back (heard in `rootwaysRecord`)                   |
| ------------- | ---------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Ranger, Fern  | Keep watch over the sleepers | "If I look away, someone gets lost."   | Trust other people to watch           | "You didn't want to leave your houses… I won't leave this."         |
| Knight, Lance | Hold the post                | "Duty means staying where I was put."  | Choose a post for the people under it | "A knight doesn't leave his post. You told me. This is mine."       |
| Mage, Ares    | Find the answer in a book    | "What isn't written can't be trusted." | Listen to a person, not only a page   | "None of it was in your books. None of it was ever written for me." |
| Rogue, Vex    | Stay out of it               | "If I care, I owe."                    | Admit they care and pay it            | "Not your problem. You said it twice. Go up."                       |

**Arc beats by act.**

| Act                       | Hero beat                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1 (to the call)           | Hesitation stated (`SR-refusal-01`). Leaves anyway, for Rowan's son.                                         |
| 2a (surface, to the Wyrm) | Meets a rival who is better at the hero's own game. Wins some contests, loses some.                          |
| 2b (underground)          | Reads the ledger with Vesper; admits their own hesitation to them. Holds the brake rather than chase Vesper. |
| 3 (return and rite)       | Tells Fennick what Vesper said, without excusing it. Fights Vesper, then carries them out.                   |
| End                       | Gives back the ledger. Goes home; Pip's tower.                                                               |

**Voice rules.** Short sentences. Concrete nouns the class notices (WB section 5): Fern routes and
weather; Lance who is exposed; Ares how things work; Vex terms and what is withheld. The hero never
gives a speech about growth. The hesitation is said to Vesper once (`rootwaysRecord`) and answered
once (the bridge). Class lines appear only at the five answer points (section 7).

### 3.2 Vesper

**Want (child-sized).** To be heard. Vesper's own phrase is **"It's my turn."** A child understands
waiting for a turn that never comes.

**Wound (added backstory: PD-D01, PD-D06).** Vesper was one of twelve children Fennick looked after. Fennick read to all of them at
once; "you had to be loud to get a page turned", and Vesper was quiet. Fennick was often at the
ward. The voice was the first thing that spoke only to Vesper and said their name right. **[B]**
for why the voice could reach a child near the ward.

**Lie.** "Nobody hears you unless you are the loudest." Power is volume. This keeps Vesper's
established ambition (WB section 5): Vesper still wants power and knowledge, because they believe
that is what gets you heard.

**Need.** To be heard without taking power, and to hear others: to be one voice among many. The
Lishal's "seven voices, and they can barely carry a whisper" (`SR-vesperAcceptance-02`) is Vesper
scorning exactly that.

**Accountability.** Vesper chooses. Vesper reads every name of the earlier vessels
(`SR-vesperAcceptance-12`), sees the bridge, and lets go of the rail. Their choice darkens the
stones, and people fall asleep (`SR-ascentOpened-03`, `SR-malificatRisen-04`). The wound explains
the choice; it never excuses it. No scene asks anyone harmed to forgive Vesper
(`SR-campaignRecovery-05` stays).

**Arc beats by act.**

| Act | Vesper beat                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 2a  | A rival one step ahead. Watches the hero, copies their moves, wants to be noticed. "Someone listens to me." |
| Mid | Goes into the Moon Caves ahead of the hero. Empty cloak, wet tracks.                                        |
| 2b  | Reads the ledger with the hero. Hears "Fennick's at the ward." Duel: "Wait my turn again?" Then the bridge. |
| 3   | The Malificat calls for Fennick. Loses. "It's gone quiet."                                                  |
| End | Alive, under guard. Accepts, or does not accept, the ledger and the cup **[C]**.                            |

**Voice rules.** Precise observations about what the hero just did; amused questions; wounded
pride (WB section 5). Counts things. Never uses "surface-bug", "meat", "dust", "darkness", "the
deep" or "Master" before the midpoint. Calls the voice "someone" or "it" until the Malificat.
Pronouns they/them everywhere (fix `SR-chapterEnd-06` under Plan A). The Malificat speaks with the
same habits (WB-C11).

### 3.3 Fennick

**Want.** The rite done with the helpers alive and informed (WB section 5).

**Wound (added backstory: PD-D06).** He looked after many children and chose the ward over the one who needed him most. He
heard Vesper say they could hear the town from the top window, and told them to come down and eat.

**Lie.** "Looking after everyone is the same as listening to each one."

**Need.** To listen to one person. To accept that he cannot undo Vesper's choice, and must not
speak for the people Vesper harmed.

**Arc beats.** Threshold: hand on the iron, lets go, stays at his post ("Tell them I'm here").
Return: owns his part ("I should have gone up"). Rite: accepts Ketter's correction, a first act of
listening (`SR-campaignRite-15`). Malificat: answers "I'm here" without leaving his station.
Recovery: sits and listens, says nothing.

**Voice rules.** Practical instructions; short; asks questions instead of explaining. Pronoun
**he/him**, matching "old man" (`SR-chapterEnd-06`) and `SR-campaignThreshold-11`. Plan A fixes
`src/data/campaignStory.ts:335`, `:721` and `:816` under A-D3.

## 4. Beat sheet

Positions are rough author targets (WB section 7), not measured time.

| Monomyth stage (WB 7)              | Pos.   | Scene / encounter (WB-C10 in bold)                            | Hero                            | Vesper                                         | Fennick                                         |
| ---------------------------------- | ------ | ------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Ordinary world                     | 0–5%   | `opening`                                                     | Class line `SR-opening-04`      | —                                              | —                                               |
| Call and refusal                   | 5–10%  | `refusal`                                                     | Hesitation `SR-refusal-01`      | —                                              | —                                               |
| Aid and crossing                   | 10–20% | Brightwater; Fennick seed **[B]** (Plan B task 4)             | —                               | —                                              | Lantern, asks about a cloaked traveller         |
| Trials and relationships           | 20–30% | `vesperRoad`                                                  | Meets a rival                   | "I'm Vesper. Remember it."                     | —                                               |
|                                    | 30–38% | `vesperRidge` (quarry)                                        | Contest                         | Torva turned them away; "someone listens"      | —                                               |
|                                    | 38–44% | `vesperPeaks`                                                 | Helped                          | Marks the gate; reads aloud to themselves      | —                                               |
|                                    | 44–48% | `vesperRuins`                                                 | Contest                         | "It's my turn to be heard."                    | —                                               |
| Ordeal                             | 50%    | **Moon Wyrm**; `wyrmFall`, `chapterEnd`                       | False victory                   | Empty cloak                                    | "I taught the child… to walk" **[A]**           |
| Consequences, deeper understanding | 52%    | `campaignThreshold`                                           | Goes down alone                 | —                                              | "Them and eleven others." "Tell them I'm here." |
|                                    | 55–62% | `archiveRefuge` → old drain → **Irdrath**                     | Repair 1                        | —                                              | —                                               |
|                                    | 65%    | `rootwaysRecord` (quiet)                                      | Says own hesitation to Vesper   | The wound, in their words                      | Message delivered                               |
|                                    | 68–72% | `ketterStranded` → lift → **Vesper duel**                     | Repair 2                        | "Wait my turn again?"                          | —                                               |
|                                    | 73%    | `warrensLit` (wonder)                                         | Shared line of wonder           | A dragged handprint on the glass               | —                                               |
|                                    | 75%    | `hollowsHush` (danger) → `hollowsEscaped`                     | Carries a sleeper               | Rings the great bell; people fall asleep       | Letters found                                   |
|                                    | 78–82% | `lishalRefusal` → procedure → `vesperAcceptance` → **Lishal** | Hears it quoted back; answers   | Lets go of the rail. "I can hear the surface." | —                                               |
| Road back                          | 84%    | `ascentLanding` → beam → `ascentOpened`                       | Repair 3                        | "Straight through. Didn't stop."               | Courier                                         |
|                                    | 86–95% | `campaignReturn`, Mossvale, **rite**                          | Reports Vesper's words          | —                                              | "I should have gone up." Takes correction       |
| Resurrection                       | 96%    | `malificatRisen` → **Malificat** → `malificatFallen`          | Fights, then carries Vesper out | Calls "Fennick?"; "It's gone quiet."           | "I'm here."                                     |
| Return with the elixir             | 98%    | `campaignRecovery`, `mossvaleRecovery`                        | Returns the ledger              | Response by attitude **[C]**                   | Sits and listens                                |

WB-C10 order is unchanged: Wyrm, Irdrath, Vesper duel, Lishal, rite, final form. The danger
encounter at 75% is an ordinary-strength fight, not a boss position (PD-D04).

## 5. Workstream 1 — Vesper as rival before the midpoint

### 5.1 How the gates work today

- **Where Vesper appears.** `vesperStop` (`src/game/story.ts:132-151`) returns the newest stop in
  `VESPER_ROUTE` whose flag the hero holds: `vesperRoad` after `vision:1` plus `reached:brightwater`
  and `scene:refusal` (WB-C06); `vesperRidge` after `vision:2`; `vesperPeaks` after `vision:3`;
  `vesperRuins` on `reached:ruins`. Vesper is gone once `wyrmBeaten` is set.
- **What each stop is.** `vesper(stop, challenge)` (`src/data/npcs.ts:1115-1130`) builds one NPC per
  stop with `voice: 'vesper'`, element `arcane`, the shared `VESPER_LINES`
  (`src/data/story.ts:97-167`), a puzzle or offering, and rewards of Moon Shards plus
  `lore:vesper.<stop>`. It is not `essential` and not repeatable.
- **Attitude.** `attitudeOf` (`src/game/attitude.ts:83-92`): arcane alignment, plus half of water
  and earth, minus half of fire and wind, plus Charm, plus regard. Moods: `cold`
  (Hostile/Wary), `plain` (Neutral), `warm` (Friendly/Devoted). Devoted says `confide` instead of
  `intro`. A Hostile hero is refused, because Vesper is not essential (`dealTerms`, :99-102).
- **Regard is per stop, not per character.** `regardOf(state, npc.id)` (`src/game/encounter.ts:168`)
  keys on `vesperRoad`, `vesperRidge` and so on, so a win at the road does not warm the ridge. A
  rivalry needs memory across stops. Recommendation for Plan C: key Vesper's regard by `voice`
  (D4.7, PD-D06).
- **Lore flags.** `lore:vesper.*` only show an icon labelled "Lore of the Depths"
  (`src/ui/art/icons.ts:1099-1105`). They carry no text. Plan B decides whether they become clue
  pages **[B]**.

### 5.2 Changes

1. Rename the NPC from "Vesper, Thrall of the Depths" to **Vesper** (`src/data/npcs.ts:1118`). The
   Master becomes a secret (PD-D02).
2. Replace the shared table with per-stop lines: `VESPER_LINES_BY_STOP`, sharing `refuse`,
   `accept`, `decline` and `lose`. Each `intro` keeps three distinct moods, as
   `tests/attitude.test.ts:245-256` requires.
3. Keep every challenge, reward and route gate. The contest framing makes the existing puzzles
   rival races: "I've done this one. Show me how you'd do it."
4. Update the author's script table `### Vesper, Thrall of the Depths` in `docs/STORY.md:52`,
   because `tests/script.test.ts:119` checks the game text against it.

### 5.3 Draft lines (existing `NpcLines` shape)

Budget (review C-2): about 20 lines. Each stop needs one `intro` per mood, because
`tests/attitude.test.ts:245-251` requires three distinct intro moods for every person NPC. Each stop
also gets a `confide`. `refuse`, `accept`, `decline`, `lose`, `win` and `done` are shared, with
`win` and `done` as rotating variants under the `vesper` voice. Plan A edits the register **[A]**.
The R9 fact from Plan B (Fennick raised Vesper at the circle; Vesper heard the singing) goes into
the ruins `confide` **[B]**. All of this assumes PD-D02 removes "Master"; if the author keeps it,
see section 16, C-2.

```
const VESPER_SHARED = {
  refuse: '*Vesper turns their back.* "Not today. You wouldn\'t listen anyway."',
  accept: "I've done this one already. Show me how you'd do it.",
  decline: "Fine. I'll be ahead of you anyway.",
  lose: '*They show you where their own piece went.* "Too slow. Try it my way next time."',
  win: [
    '*They knock their practice stones flat.* "You put the second piece where I put my first. I\'m Vesper. Remember it."',
    '"Close. I made five more than that. Don\'t tell anyone."',
    '"You didn\'t waste the long piece. I always waste the long piece."',
  ],
  done: ["I'm going on ahead. Someone up there listens.", "I'll be there first. I always am."],
};
export const VESPER_LINES_BY_STOP = {
  road: { ...VESPER_SHARED,
    intro: {
      cold: '*A traveller in a dark cloak blocks the milestone.* "Mossvale sent you? Just you?"',
      plain: '*A traveller in a dark cloak is stacking stones on the milestone.* "You came from Mossvale. Nobody walks this road on purpose."',
      warm: '*They tilt their head.* "You walked the whole road without looking back once. I counted."',
    },
    confide: '"Nobody on this road has asked my name all week. You didn\'t either. But you looked." *They hold out a Moon Shard.*',
  },
  ridge: { ...VESPER_SHARED,
    intro: {
      cold: '"Torva sent me away. Has she let you in yet?"',
      plain: '*Vesper sits on the ridge road, rubbing a burned thumb.* "Torva says my hands are quick and careless. Then she went back inside."',
      warm: '"You again. Good. I wanted somebody to see this."',
    },
    confide: '"At night, under the ridge, something hums. It says my name right. Most people get it wrong."', // [B]
  },
  peaks: { ...VESPER_SHARED,
    intro: {
      cold: '"The storm gate sticks on the left. Work it out yourself."',
      plain: '*Vesper has chalked an arrow on the beacon road.* "The storm gate sticks on the left. I marked it. You\'re welcome."',
      warm: '"I waited. Don\'t make it strange. The gate is easier with two."',
    },
    confide: '"I used to read out loud to myself, so somebody was talking to me. Now somebody talks back."', // [B]
  },
  ruins: { ...VESPER_SHARED,
    intro: {
      cold: '*Vesper keeps a palm flat on the Moon Caves\' seal.* "Selene told me to wait outside. Has she let you in yet?"',
      plain: '*Vesper keeps a palm flat on the seal.* "I asked Selene about the moon. She said wait. I\'ve waited. It\'s my turn."',
      warm: '"You\'re nearly as fast as me now. Nearly." *Their hand stays on the seal.* "It\'s my turn next, though."',
    },
    confide: '"The man who looked after us kept a lamp by the old stones. At night I could hear them singing. Nobody else could."', // [B] R9
  },
};
```

**Fit to gates.** Cold lines are short and closed; plain lines carry the rival; warm lines show
Vesper wanting to be noticed. "It's my turn" is in the ruins plain and warm intros, so every
non-Hostile hero hears it before the Wyrm. Mentor mentions describe only Vesper's own experience
("Selene told me to wait"), so they are true whether or not the hero has met that mentor (review
F-26). Vesper sometimes helps: the peaks puzzle is Vesper's marked route, and `lose` shows the hero
Vesper's own move. The `accept` line sets up Plan C's duel that mirrors the hero's spell order
**[C]**.

## 6. Workstream 2 — Underground pacing

### 6.1 Before and after

Scene line references are to `src/data/campaignStory.ts`. "R" marks a repair task.

| #   | Before: scene / task (line)               | Map            | Requires → sets                              | After                                                                   | What breaks                                                                     |
| --- | ----------------------------------------- | -------------- | -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | `campaignThreshold` (17)                  | overworld      | `wyrmBeaten`, `scene:chapterEnd` → `descent` | Keep; two line edits (6.3)                                              | Tome staging indices if beats are added (`src/native/tome.ts:136`)              |
| 2   | `archiveRefuge` (52)                      | sunkenArchive  | `descent`, until `drain`                     | Keep; Odile hands over the ledger (NP-14, 9.1); until `trial`           | Warp `sunkenArchive→cisternMarches` now needs `descent` (`campaignMaps.ts:109`) |
| 3   | R `archiveDrain` task (Npcs :64)          | sunkenArchive  | → `drain`                                    | **Cut**; merged into row 5                                              | Entity `archive-odile` (Maps :100); tests listing the task                      |
| 4   | `archiveDrained` (81)                     | sunkenArchive  | `drain`                                      | **Cut**; first stretcher moves to row 7                                 | Tome entry `archiveDrained` (`tome.ts:148`)                                     |
| 5   | `irdrathCistern` (102) + R `cisternTrial` | cisternMarches | `drain`, until `trial` → `trial`             | Keep; requires `descent`; task becomes "the old drain": clear and test  | Task intro text; `encounterIntent.ts:30-31`                                     |
| 6   | `irdrathTrial` (133) → **Irdrath**        | cisternMarches | `trial` → `irdrath`                          | Keep                                                                    | —                                                                               |
| 7   | `irdrathYielded` (163)                    | cisternMarches | `irdrath`                                    | Keep; add the first stretcher and "one trip we can make" from row 4     | Tome indices                                                                    |
| 8   | `rootwaysRecord` (188)                    | rootways       | `irdrath`, until `vesper`                    | **Rewrite** as the quiet scene; sets new `read`                         | Tome indices (`tome.ts:172`)                                                    |
| 9   | R `rootTram` task (Npcs :109)             | rootways       | → `tram`                                     | **Cut**; tram is a ride; Rafe in scene only                             | Warp `rootways→glassWarrens` needs `read` (Maps :182)                           |
| 10  | `ketterStranded` (218) + R `ketterRescue` | glassWarrens   | `tram`, until `rescue` → `rescue`            | Keep; requires `read`                                                   | —                                                                               |
| 11  | `ketterRescued` (235) → **Vesper duel**   | glassWarrens   | `rescue`, until `vesper` → `vesper`          | Keep; one line edit (6.3)                                               | —                                                                               |
| 12  | `vesperRetreated` (279)                   | glassWarrens   | `vesper`                                     | Keep                                                                    | —                                                                               |
| 13  | —                                         | glassWarrens   | —                                            | **New** `warrensLit` (wonder); requires `vesper`, until `hush`          | New tome entry                                                                  |
| 14  | `bellShift` (292) + R `bellCircuit`       | bellHollows    | `vesper`, until `bells` → `bells`            | **Replaced** by `hollowsHush` (danger) + fight `campaign-hush` → `hush` | Entity `bells-ketter` (Maps :246); warp needs `hush` (Maps :255)                |
| 15  | `bellRelief` (317)                        | bellHollows    | `bells`                                      | **Replaced** by `hollowsEscaped`; letters and R5 plant; requires `hush` | `tests/nativeTome.test.ts:63-65`                                                |
| 16  | `lishalRefusal` (350)                     | quietFoundry   | `bells`, until `procedure`                   | Keep; requires `hush`                                                   | —                                                                               |
| 17  | `foundryProcedure` task                   | quietFoundry   | → `procedure`                                | Keep (discovery, WB-C13)                                                | —                                                                               |
| 18  | `vesperAcceptance` (407)                  | quietFoundry   | `procedure` → `accepted`                     | **Rewrite** (7.1); brake stays a choice, not a task                     | Tome indices                                                                    |
| 19  | **Lishal**, `lishalSilenced` (475)        | quietFoundry   | `accepted` → `lishal`                        | Keep                                                                    | —                                                                               |
| 20  | `ascentLanding` (491) + R `ascentRepair`  | upwardRoad     | `lishal`, until `ascent` → `ascent`          | Keep; adds Ketter's handover from row 15 ("Two for hold")               | —                                                                               |
| 21  | `ascentOpened` (515)                      | upwardRoad     | `ascent`                                     | Keep; trim the duplicated handover                                      | —                                                                               |

**Rhythm after.** People → repair → boss → quiet → repair → boss → wonder → danger → discovery →
choice → boss → repair → road back. Three repairs: the old drain, the lift, the beam.

### 6.2 Flags

| Flag constant (`campaignFlags.ts`) | Value                    | Status after                                                                  |
| ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `drain`                            | `campaign:drain`         | No longer granted. Kept as a constant for saves. Nothing gates on it.         |
| `tram`                             | `campaign:tram`          | No longer granted. Migration maps it to `read`.                               |
| `bells`                            | `campaign:bells`         | No longer granted. Migration maps it to `hush`.                               |
| `read` (new)                       | `campaign:read`          | Set by `rootwaysRecord` (`sets`). Gates `rootways → glassWarrens`.            |
| `hush` (new)                       | `defeated:campaign-hush` | Set by winning the `campaign-hush` fight. Gates `bellHollows → quietFoundry`. |

A scene may set a milestone; `campaignThreshold` and `vesperAcceptance` already do
(`src/data/campaignStory.ts:23`, :413). `rootwaysRecord` setting `read` follows that precedent. It
is a story beat with no failure state, so it does not let narration replace earned work in the
sense of the file header (:1-5).

### 6.3 Small edits to kept scenes

Drafts in sections 6 and 7 use the scene helpers in `src/data/campaignStory.ts:9-14` (`say`,
`show`). `hero({…}, stage?)` is shorthand for `{ stage, who: 'hero', classLines: {…} }`, and
`voiced(who, {…})` is the same for another speaker. Both are existing `SceneBeat` fields
(`src/data/story.ts:169-182`). A `moods: [...]` key is Plan C's proposed field (C-7).

```
// campaignThreshold, SR-campaignThreshold-03 (line 29)
say('fennick', "Yes. I'm Fennick. I looked after them when they were small. Them and eleven others."),
// ketterRescued, SR-ketterRescued-14 (lines 266-270); stage direction unchanged
say('vesperDuel', 'You want me to go back with you. Stand in line. Wait my turn again.', '*Their fingers lift…*'),
```

Plan A replaces "Upper branch carries the voice. Lower one feeds our lamps" (`SR-ketterRescued-06`)
with "the voice pipe" and "the lamp pipe" **[A]**.

### 6.4 The quiet Vesper scene — `rootwaysRecord` (rewrite)

No conflict. The two take turns, which is the thing Vesper never got. This is also where the hero
says their own opening hesitation **in Vesper's hearing** (review F-13), so the bridge can quote it.
It keeps Plan B's plants: NP-15's exact words and the line at `SR-rootwaysRecord-08` (F-04).

```
{ id: 'rootwaysRecord', title: 'Taking turns', flag: 'scene:rootwaysRecord', map: 'rootways',
  requiresFlags: [C.irdrath], untilFlag: C.vesper, sets: [C.read], beats: [
  show('The tram waits at the platform with its lamp lit. Rafe has gone for the driver. Vesper sits on the step, reading the plan you left on the bench.'),
  say('vesperDuel', "That's a bell tower. The road runs underneath."),
  say('hero', "You've been there?"),
  say('vesperDuel', "I'd hardly send you ahead of me, would I?"),
  say('hero', 'I found this with it.', '*You put the ledger on the step between you.*'),
  show('Vesper does not take it. They wait until you open it, then lean in.'),
  say('vesperDuel', 'Read it out. I like hearing it.'),
  show('You read the first name. Vesper reads the second. You go on like that, taking turns, down the page.'),
  show('Both records end with the same words: "The stones will answer you."'),          // [B] NP-15, kept verbatim
  say('vesperDuel', 'And nothing here about how either bearer died.'),                  // SR-rootwaysRecord-08, kept
  say('hero', "Fennick's at the ward. He said to tell you he's there."),
  say('vesperDuel', 'He was always there. At the ward.', '*They turn the page before you finish it.*'),
  say('vesperDuel', 'He read to twelve of us at once. You had to be loud to get a page turned.'),
  say('hero', 'Were you loud?'),
  say('vesperDuel', 'No. Were you? Back home?'),
  hero({ ranger: "I nearly didn't come down. I didn't want to leave my houses with nobody watching.",
         knight: "I nearly didn't come. A knight doesn't leave his post, I said.",
         mage: 'I nearly stayed with my books. None of this is in them.',
         rogue: 'I said none of this was my problem. I said it twice.' }),            // [A] answer point 1: doubt
  say('vesperDuel', 'And here you are.', '*They look at you a moment longer than they need to.*'),
  show('Up the platform, the tram bell rings. Rafe waves from the cab.'),
  say('vesperDuel', "Keep it dry. I'll want the rest.", '*Their hand moves toward the ledger, then stops. They step down onto the lower road.*'),
] }
```

The ledger's contents depend on Plan B's clue ledger **[B]**. "Bearer" follows Plan A's glossary
(not "vessel").

### 6.5 The wonder scene — `warrensLit` (new)

Plays on `glassWarrens` straight after `vesperRetreated`, before the hero walks on. No class line
here (review C-1); the hero's reaction is shared.

```
{ id: 'warrensLit', title: 'Every lamp at once', flag: 'scene:warrensLit', map: 'glassWarrens',
  requiresFlags: [C.vesper], untilFlag: C.hush, beats: [
  show('Ketter opens the lamp pipe all the way. Lamp by lamp, the Glass Warrens light from the floor up.'),
  show('The walls are not rock. They are glass, thin as a window, and behind every pane something small is growing toward the light.'), // [B]
  say('ketter', "First time in a year they've all been on at once."),
  say('hero', 'Nobody told me it was beautiful.'),
  show('Far down the shaft one pane is dark: a long smear, as if a hand was dragged across the glass.'),
  say('ketter', "That's where they went. The lower road, toward the bells."),
] }
```

What grows behind the glass is a Plan B lore hook **[B]**.

### 6.6 The danger scene — `hollowsHush` (new) and `hollowsEscaped` (replaces `bellShift`, `bellRelief`)

Real danger with no repair answer. Vesper, on their way down, rings the great bell that nobody
rings. It is the first time Vesper is loud, and other people pay for it. The voice is not angry
and does not shout (Plan A register; Plan B WB-C20, review F-14): the bells carry the song, and
people near them fall asleep. The hero cannot fix the bells, only get people out. A mandatory
ordinary-strength fight, `campaign-hush`, stands on the escape path.

```
{ id: 'hollowsHush', title: 'Every bell at once', flag: 'scene:hollowsHush', map: 'bellHollows',
  requiresFlags: [C.vesper], untilFlag: C.hush, beats: [
  show("Ketter's supper bowl sits on the bench, cold. High on the bell gallery, a cloaked figure takes the great bell's rope in both hands."),
  say('ketter', "Nobody rings that one. Nobody's allowed—"),
  show('The great bell sounds. Every small bell in the Hollows answers it. Nobody is pulling their cords. The figure on the gallery lets go and is gone.'),
  say('ketter', 'Hands over your ears. Now.'),
  show('Down the passage, two workers sit down where they stand. One is still holding a lamp. Their eyes close.'),
  say('hero', 'We can stop the bells—'),
  say('ketter', "Not these. They're carrying something that isn't ours. We carry who we can, and we go."),
  show("The sleeping worker's lamp tips. Nobody's hand is near it."),
  say('hero', "I've got this one. Go.", '*You lift the nearest worker.*'),
] }
{ id: 'hollowsEscaped', title: "Fennick's letters", flag: 'scene:hollowsEscaped', map: 'bellHollows',
  requiresFlags: [C.hush], beats: [
  show('At the far door the bells stop together, one after another, as the great bell goes still. Ketter lowers the second worker onto a bench and counts their breathing.'),
  say('ketter', "They'll wake. The bell sleepers always do. Give it a day."),    // [B]
  say('ketter', 'These came from Fennick. He wanted measurements we couldn\'t take while the bells were running.', '*Ketter opens a drawer of plans and letters.*'), // A fix 1.6 (:335) re-homed
  show('One letter shows the old ward drawn in ink, a frame at every stone. One piece of the circle is missing: the line just stops. Ketter lays it beside the switchworks plan.'), // [B] R5 plant re-homed; A's SR-bellRelief-07 rewrite
  say('ketter', "Now someone's got to go down and look for the missing piece."),
] }
```

`campaign-hush` uses a new enemy `hushWisp` at about `bellWisp` strength
(`src/data/campaignEnemies.ts`). If Plan C's drowsy blocks pass their playtest gate, this is the
first fight to use them; Plan C adds it to its drowsy map list (review C-11) **[C]**. "The bell
sleepers always do" must agree with Plan B's account of sleep **[B]**. "Switchworks" follows Plan
A's glossary as it stands; if Plan A adopts the review's "switch room", use that.

### 6.7 Merged repairs

- **The old drain** (`cisternTrial`, `src/data/campaignNpcs.ts:86-108`). One task: clear the blocked
  drain outside Irdrath's channel, then run the test with the chambers shut. New intro, plain mood:
  "The archive floods because this drain is blocked. Clear it and we can test it with the chambers
  shut." `irdrathCistern`'s "The old drain runs outside it" (`SR-irdrathCistern-10`) then refers to
  the same object the player clears. `archiveRefuge` changes "The drain's under that pallet"
  (`SR-archiveRefuge-08`) to "The water comes down from the cisterns. Their old drain is blocked,
  and Irdrath won't let anyone else touch the gates." It then takes `SR-archiveDrained-03`'s
  request ("Bring that ledger off the shelf, will you?") and `-05`'s ledger stage, word for word,
  with Plan B's NP-14 cover added (9.1). Odile ends: "Come with me."
- **The lift** (`ketterRescue`) is unchanged. It is a rescue, with a person on the other end.
- **The fallen beam** (`ascentRepair`). `ascentLanding` takes the handover moment from
  `SR-bellRelief-02`–`04`: the relief operator answers "Two for hold" correctly before Ketter
  finishes. `ascentOpened` drops its duplicate (`SR-ascentOpened-01`) and keeps "Good. They've
  got it."

## 7. Workstream 3 — Late-scene rewrites

**Answer points (review C-1).** The hero has exactly five class-keyed answer points, owned here
for placement; Plan A writes the final words, one writer, all twenty lines in one pass:

| #   | Scene                           | What the line does                       | Draft  |
| --- | ------------------------------- | ---------------------------------------- | ------ |
| 1   | `rootwaysRecord`                | Doubt: says the hesitation to Vesper     | 6.4    |
| 2   | `vesperAcceptance`, after `-12` | The answer, when Vesper quotes it back   | 7.1    |
| 3   | `campaignReturn`                | Choice: Vesper's choice is not Fennick's | 7.2    |
| 4   | `malificatFallen`               | Carrying Vesper out                      | 7.3    |
| 5   | `mossvaleRecovery`              | A changed habit at home                  | Plan A |

No other scene in this plan has class-keyed hero lines. Plan A's line at `SR-vesperAcceptance-09`
("Come over.") stays shared, so Vex never says "not my problem" twice in one scene (F-01).

### 7.1 The bridge — `vesperAcceptance`

Keep `SR-vesperAcceptance-01` to `-12` and `-13` to `-28`, with Plan A's glossary applied
("bearers", "wall drawing"). Insert four beats between `-12` ("I read every one.") and `-13` (the
rail). Vesper quotes what the hero said in `rootwaysRecord`, so the echo is a memory the story
gave them (F-13). Class lines work for any speaker (`src/game/story.ts:297-298`). The "You would,
too." beat carries Plan C's cold and warm lines as mood variants (C-9), using Plan C's `moods`
field (C-7). This is the only insert after `-12`.

```
show('The frame passes between you. When it clears, Vesper has not moved.'),
voiced('vesperDuel', { ranger: "You didn't want to leave your houses with nobody watching. I won't leave this.",
  knight: "A knight doesn't leave his post. You told me. This is mine.",
  mage: 'None of it was in your books. None of it was ever written for me.',
  rogue: 'Not your problem. You said it twice. Go up.' }),
hero({ ranger: 'I left them with people I trust. Let someone listen to you.',
  knight: "I left mine. I'm holding this one because people are under it. Come to me.",
  mage: "Then I'll read whatever you write. Every word.",
  rogue: 'Not my problem. I said that about home, too. Come over.' },
  '*Your hands stay on the brake.*'),                                                       // [A] answer point 2
{ moods: ['cold'], who: 'vesperDuel', line: '"You\'d shut it away and call it kindness."', stage: '' },          // Plan C
{ moods: ['plain'], who: 'vesperDuel', line: '"You would, too."', stage: '*They look at the bridge, and at your hands on the brake.*' },
{ moods: ['warm', 'devoted'], who: 'vesperDuel', line: '"You held that for them."', stage: '*Vesper looks at your hand on the brake, then at the bridge.*' }, // Plan C
```

Then the existing `-13` (fingers close on the rail; when the frame passes, they have let go), `-14`
"Vesper?", `-15` "No. I'm staying.", `-16` "Let me hear it. All of it." One line is added after
`-18` "I can hear the surface.":

```
say('vesperDuel', "And they'll all hear me.", '*The bells answer with their next breath.*'),
```

Plan C's freeze flag `vesper:mood:<tier>` is set when this scene finishes (C-11), so recovery
matches the bridge.

**Why it works.** The hero's own excuse comes back at them, in words Vesper heard them say; the
hero answers in their own voice; Vesper sees the answer is sincere and still chooses. The choice
is free, seen and costly (WB-C11). The hero holding the brake explains Vesper's head start (WB
section 6.9).

### 7.2 `campaignReturn`

Keep `SR-campaignReturn-01` to `-09` (ending "And you were close enough to hear them?" / "Yes.").
Insert the report and Fennick's admission after `-09`, keep `-10` to `-12` with Plan A's glossary
("the closing steps" for "the procedure"), and add one line after `-12`:

```
say('fennick', 'What did they say?'),
say('hero', "That they'd waited long enough. Then: 'I can hear the surface.'"),
show("Fennick's finger stays on the steps."),
say('fennick', 'When they were small they sat in the top window. They said they could hear the town from there. I told them to come down and eat with the others.'),
say('fennick', 'I should have gone up.'),
hero({ ranger: 'You were watching the ward. Someone had to. But they chose the voice, not you.',
  knight: 'You kept your post. I know how that goes. The choice on that platform was theirs.',
  mage: 'No book would have told you. And none of it made their choice for them.',
  rogue: "You're not the one who took the deal." }),                                          // [A] answer point 3
// SR-campaignReturn-10 to -12 as written (glossary applied), then:
say('fennick', "If they call for me in there, I'll answer from the lantern. Tell Vale that's where I'll be."),
```

Every hero answer comforts Fennick without moving Vesper's responsibility onto him. The last line
fixes the unfinished sleeve-catch (`SR-campaignReturn-12`) and sets up 7.3.

### 7.3 `malificatRisen` and `malificatFallen`

`malificatRisen`, after `SR-malificatRisen-06` ("Fennick?"), which follows the second voice
(`-05`):

```
say('fennick', "I'm here.", '*He does not leave the lantern.*'),
show("For a breath, the light in Vesper's hand goes still."),
show('The second voice: "He stayed outside. He always does. Break it."'),                  // [B] true framing, WB-C20
```

`-04` becomes "I know. I'm drawing on all seven. Can you hear how loud I am?" The hero's line at
`-09` stays shared: "The voice can't leave this chamber." Plan A fixes the speaker label (F7).

The voice's line is true under Plan B's history: Fennick did stay outside, at the ward, then and
now. It frames the truth to wound; it does not state a falsehood (Plan B WB-C20, review F-14).

`malificatFallen`: keep `-01`. After `-02` (the voice calls "Vesper."), add Vesper's line and the
hero carrying them out. Keep Vale's arm across the entrance (`-03`) and the sealing (`-04`).

```
say('vesperDuel', "It's gone quiet.", '*They say it to no one.*'),
hero({ ranger: "I've got you. Lift.", knight: "Lean on me. I'm not moving till you do.",
  mage: 'Up. Slowly. Count with me.', rogue: "You're heavier than you look. Come on." },
  "*You kneel and get your shoulder under Vesper's arm.*"),                                   // [A] answer point 4
```

`-04` changes "while Vesper is carried beyond the boundary" to "while you and a guard carry Vesper
beyond the boundary", and "the stations close the inner ward" to "the people at every stone close
the ward chamber" (Plan A glossary). If the author adopts Plan B's "Ves, en." for Fennick here
(C-6), it goes after Vesper is carried out; D's recovery keeps Fennick silent.

### 7.4 `campaignRecovery`

Keep `SR-campaignRecovery-01` to `-03` and `-06` to `-08`. Replace `-04` and `-05` with the beats
below. They use Plan C's `SceneBeat.moods` field (C-7): hostile and wary see `cold`; neutral sees
`plain`; friendly sees `warm`; devoted sees `warm` plus `devoted`. Text follows review C-8.

```
say('guard', "Three more fell asleep in Brightwater while the stones were dark. We have a room ready. They'll stay under guard."), // [B]
show('Fennick nods. No one asks the people Vesper harmed to forgive them.'),
show('You take the ledger from your pack. The pages are dry. You set it beside the cup.'),
say('hero', 'You wanted the rest.'),
{ moods: ['cold'],  stage: '*The cup and the ledger stay where they were set.*' },
{ moods: ['plain'], who: 'vesperDuel', line: '"Leave it."', stage: '' },
{ moods: ['plain'], stage: '*Later, the cup is moved closer, and the ledger is open. No one saw who moved them.*' }, // C + D
{ moods: ['warm', 'devoted'], who: 'vesperDuel', line: '"Was it dry?"', stage: '' },
{ moods: ['warm', 'devoted'], who: 'hero', line: '"Yes."', stage: '' },
{ moods: ['devoted'], stage: '*Vesper reaches for the cup and drinks. Fennick looks away so they can.*' },      // Plan C
{ moods: ['devoted'], stage: '*Then Vesper takes the ledger and reads the first name aloud. Fennick says nothing. He listens.*' },
```

"Devoted alone contains the cup beat" (Plan C's test) stays true. The number "three more"
depends on Plan B's account of what dark stones do **[B]**. A cold Vesper still survives, still
has the cup within reach, and is still under guard: the ending choice is the same; only its
colour changes (Plan C item 5). The forgiveness line is in every mood.

## 8. Workstream 4 — Engineering impact

### 8.1 Data and code

| Area                   | File and line                                            | Change                                                                                                 |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Flags                  | `src/data/campaignFlags.ts:3-20`                         | Add `read`, `hush`. Keep `drain`, `tram`, `bells` as constants.                                        |
| Scenes                 | `src/data/campaignStory.ts`                              | Rewrites in 6.3–6.6, 7.1–7.4; remove `archiveDrained`, `bellShift`, `bellRelief`.                      |
| Tasks                  | `src/data/campaignNpcs.ts:64`, :109, :154                | Remove `archiveDrain`, `rootTram`, `bellCircuit`; update the `voice` switch (:25-33).                  |
| Task intent text       | `src/game/encounterIntent.ts:30-34`                      | Remove the three intents; update `cisternTrial`.                                                       |
| Maps                   | `src/data/campaignMaps.ts:100`, :174, :246               | Remove the three task entities; Rafe and Ketter in Hollows become scene-only.                          |
| Warps                  | `campaignMaps.ts:109`, :182, :255                        | Gates: `descent`, `read`, `hush`; new locked texts.                                                    |
| Encounter              | `campaignMaps.ts` (bellHollows entities)                 | Add `boss('campaign-hush', 'hushWisp', …, C.vesper)` or a non-boss mandatory variant (PD-D04).         |
| Enemy                  | `src/data/campaignEnemies.ts`                            | Add `hushWisp`, `bellWisp` tier.                                                                       |
| Vesper NPCs            | `src/data/npcs.ts:1083-1130`                             | `vesper(stop, challenge)` takes per-stop lines; name "Vesper".                                         |
| Vesper lines           | `src/data/story.ts:97-167`                               | Replace `VESPER_LINES` with `VESPER_LINES_BY_STOP`.                                                    |
| Author's script        | `docs/STORY.md:52`                                       | Per-stop Vesper tables (the fidelity test reads them).                                                 |
| Native tome staging    | `src/native/tome.ts:136-210`                             | Re-index `shots`, `casts`, `subjects` for every scene with inserted beats; add entries for new scenes. |
| Mood-gated scene beats | `src/data/story.ts:169-182`, `src/game/story.ts:286-303` | Plan C adds `moods` to `scenePages` and native `tomePages` (F-07); Plan D supplies beats.              |
| Vesper regard          | `src/game/encounter.ts:168`, :232                        | One mechanism, decided as PC-D07; D recommends `npc.voice ?? npc.id` (D4.7).                           |
| Story Reader           | `tools/export-story-reader.mjs`                          | Regenerate; passage numbers shift for rewritten scenes.                                                |

### 8.2 Save migration

Scenes are saved only as `scene:` flags; there is no saved "current scene" (`src/game/save.ts:200-216`).
Bump `SAVE_VERSION` from 17 to 18 (`src/game/save.ts:59`) and add `migrateCampaignPacing(flags)`
for `version < 18`:

1. `tram` held → add `read` and `scene:rootwaysRecord`.
2. `bells` held → add `hush`, `scene:hollowsHush`, `scene:hollowsEscaped`, `scene:warrensLit`.
3. `vesper` held but not `bells` → add nothing. The hero is in the Hollows before the old repair;
   the new danger scene and fight will play. Accept this one-time replay.
4. `drain` without `trial` → add nothing. The cistern gate now opens on `descent`.
5. A hero standing on a removed entity's tile stays put; the existing
   `tests/campaignRuntime.test.ts:234` behaviour covers this.

Old `scene:archiveDrained`, `scene:bellShift` and `scene:bellRelief` flags are harmless and stay.

### 8.3 Existing tests to update

| Test file                                                                                                                                                        | What changes                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/campaign.test.ts:27-40`, :191-248                                                                                                                         | Per-class loop: remove `archiveDrain`, `rootTram`, `bellCircuit` steps; add the `rootwaysRecord` scene and `campaign-hush` fight; assert `read` and `hush` are earned in order and `C.complete` is set with no optional lessons (WB-C15). |
| `tests/campaign.test.ts:251-287`, :289-310                                                                                                                       | Mandatory task list; the failed-task retry test uses `archiveDrain`, switch to `cisternTrial`.                                                                                                                                            |
| `tests/attitude.test.ts:361-406`                                                                                                                                 | Task list in "never locks progress".                                                                                                                                                                                                      |
| `tests/attitude.test.ts:245-251`                                                                                                                                 | No change needed: each Vesper stop keeps three distinct intro moods (5.3). Listed so nobody narrows it.                                                                                                                                   |
| `tests/data.test.ts:251-265`                                                                                                                                     | Puzzle layout table for removed tasks.                                                                                                                                                                                                    |
| `tests/encounterIntent.test.ts:67`                                                                                                                               | `it.each` list.                                                                                                                                                                                                                           |
| `tests/nativeTome.test.ts:63-65`                                                                                                                                 | `bellRelief` page checks move to `hollowsEscaped`; line 64's `"lower return"` pin becomes `"missing"` (glossary).                                                                                                                         |
| `tests/story.test.ts:245`                                                                                                                                        | Stops no longer share `VESPER_LINES`; assert `voice: 'vesper'` and per-stop lines.                                                                                                                                                        |
| `tests/script.test.ts:119`, :277                                                                                                                                 | Map each stop to its `docs/STORY.md` table.                                                                                                                                                                                               |
| `tests/saveCampaignStakes.test.ts:97`, `tests/arcaneMagic.test.ts:131`, `tests/campaignRuntime.test.ts:192`, `tests/game.test.ts:632`, `tests/story.test.ts:326` | Each pins `SAVE_VERSION` 17. Assert the current `SAVE_VERSION` instead, so the v18 bump (and any later one) does not break them (F-10, C-12).                                                                                             |

### 8.4 New tests

| New test file                    | Assertions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/campaignPacing.test.ts`   | (1) Every scene's `requiresFlags` are each set by some scene `sets`, task reward, boss defeat or Chapter One flag (reachability). (2) With `REPAIR_TASKS = ['cisternTrial', 'ketterRescue', 'ascentRepair']` listed in the test (F-28), no two of them are consecutive on the critical path. (3) `warrensLit`, `hollowsHush` and `rootwaysRecord` are due on their maps in a fresh run. (4) Each removed task id is absent from `NPCS` and every map.                                                                                                                   |
| `tests/vesperArc.test.ts`        | (1) The five answer points (section 7 table) each give four distinct hero lines via `scenePages`; no other campaign scene has class-keyed hero lines. (2) `vesperAcceptance` gives a class-keyed Vesper line, and each class's Vesper line shares a key word with that class's `rootwaysRecord` line. (3) No first-half Vesper line contains "Master", "surface-bug", "meat" or "dust" (only if PD-D02 is approved). (4) `campaignRecovery` keeps "No one asks the people Vesper harmed to forgive them" for every mood. (5) Only `devoted` shows the cup beat **[C]**. |
| `tests/saveMigrationV18.test.ts` | A v17 save holding `tram` loads with `read`; one holding `bells` loads with `hush` and the three new scenes seen; one mid-Hollows (`vesper`, no `bells`) gets the danger scene; no save gains `complete`. One case is a v17 save with Plan C's flags absent (C-12).                                                                                                                                                                                                                                                                                                     |

Plan A's glossary test (`tests/storyText.test.ts`) runs over this plan's new text too (C-15); the
drafts in sections 6 and 7 are written to pass it. The Story Reader check
`node tools/export-story-reader.mjs --check` joins `npm run check` in Plan A's first milestone
(F-30); until then D4.6 runs it by hand.

## 9. Coordination with Plans A, B and C

| Plan | Plan D needs                                                                                                                                                  | Plan D gives                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A    | One register; the line budget; final words for the five answer points; the glossary; Fennick he/him (A-D3).                                                   | Placement of the answer points (section 7 table); per-stop Vesper structure (5.3); the `bellRelief` fixes, re-homed (C-16). |
| B    | The voice's nature and truth rule (WB-C20); why it reached a child at the ward; what dark stones and bells do to sleepers; ledger contents; R9; Fennick seed. | The post-D scene list and where each plant now lives (9.1).                                                                 |
| C    | `SceneBeat.moods` in both `scenePages` and native `tomePages`; one regard mechanism (PC-D07); drowsy blocks for `campaign-hush`; the freeze flag.             | The mood beats for the bridge and recovery (7.1, 7.4); flags `read` and `hush` (C-11); the only save bump (C-12).           |

**Order.** PD-D03 is decided first (C-11). Plan D's structure lands before any other plan edits
underground text, so text is written once. Plan B's **[B]** lines can go in with placeholders.
Plan C's mood gate must land before 7.1's mood beats and 7.4 ship; until then both use the
`plain` beats only.

### 9.1 Where Plan B's plants live after this plan (F-04)

| Plan B plant                                                                       | Was                                      | Now                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| NP-14: ledger description and cover ("seven rays around a closed eye", "singers…") | `archiveDrained`, `SR-archiveDrained-05` | `archiveRefuge`, the new beat after Odile hands over the ledger (6.7) |
| R3 ledger: "promised rewards, death dates… replacements"                           | `SR-archiveDrained-05`                   | Same beat in `archiveRefuge`, word for word                           |
| NP-15: "The stones will answer you."                                               | `rootwaysRecord`, before `-07`           | `rootwaysRecord`, exact quote, after the turn-taking beat (6.4)       |
| `SR-rootwaysRecord-08`: "And nothing here about how either bearer died."           | `rootwaysRecord`                         | `rootwaysRecord`, kept word for word (6.4)                            |
| R5: the blank line in Fennick's letter                                             | `bellRelief`, `SR-bellRelief-07`         | `hollowsEscaped`, the letter beat (6.6)                               |
| "Irdrath won't let anyone else touch the gates"                                    | `archiveDrained`                         | `archiveRefuge` (6.7)                                                 |

Passage IDs for these beats change when the reader is regenerated (D4.6). Plan B's ledger test
reads the new IDs from the reader.

## 10. Tasks

| ID   | Task                                     | Owner role       | Input                     | Output                           | Effort  |
| ---- | ---------------------------------------- | ---------------- | ------------------------- | -------------------------------- | ------- |
| D1.1 | Approve bibles (section 3)               | Narrative lead   | This plan, WB section 5   | Bibles added to WB section 5     | 2 days  |
| D1.2 | Final per-stop Vesper lines              | Writer           | 5.3, Plan A register      | `VESPER_LINES_BY_STOP` text      | 3 days  |
| D1.3 | Update `docs/STORY.md` Vesper tables     | Writer           | D1.2                      | Script tables                    | 1 day   |
| D1.4 | Implement per-stop lines and rename      | Engineer         | D1.3                      | `story.ts`, `npcs.ts`            | 1 day   |
| D1.5 | Rival playtest of the four stops         | Designer         | D1.4 build                | Notes, line fixes                | 2 days  |
| D2.1 | Approve pacing table (6.1)               | Author           | Section 6                 | PD-D03 decision                  | 1 day   |
| D2.2 | Merge drain and channel                  | Writer, engineer | 6.7                       | `cisternTrial`, scenes 2, 5, 7   | 2 days  |
| D2.3 | Cut tram task; Rafe in scene             | Engineer         | 6.1 row 9                 | Maps, NPCs                       | 1 day   |
| D2.4 | Quiet scene `rootwaysRecord`             | Writer           | 6.4                       | Scene                            | 2 days  |
| D2.5 | Wonder scene `warrensLit`                | Writer, artist   | 6.5                       | Scene, tome staging              | 3 days  |
| D2.6 | Danger scene and `campaign-hush` fight   | Writer, designer | 6.6, Plan C drowsy result | Scenes, enemy, map entity        | 4 days  |
| D2.7 | Merge handover into ascent               | Writer           | 6.7                       | `ascentLanding`, `ascentOpened`  | 1 day   |
| D2.8 | Balance pass on the new route            | Designer         | D2.2–D2.7                 | `docs/CAMPAIGN_BALANCE.md` notes | 2 days  |
| D3.1 | Bridge rewrite                           | Writer           | 7.1, Plan A class voice   | Scene                            | 2 days  |
| D3.2 | `campaignReturn` rewrite                 | Writer           | 7.2                       | Scene                            | 1 day   |
| D3.3 | `malificatRisen` / `malificatFallen`     | Writer           | 7.3, Plan B voice         | Scenes                           | 2 days  |
| D3.4 | `campaignRecovery` with mood beats       | Writer           | 7.4, Plan C gate          | Scene                            | 1 day   |
| D3.5 | Small edits (6.3) and `ketterRescued`    | Writer           | 6.3                       | Scenes                           | 0.5 day |
| D4.1 | Flags, warps, entities                   | Engineer         | 8.1                       | Data changes                     | 2 days  |
| D4.2 | Save migration v18                       | Engineer         | 8.2                       | `save.ts`                        | 1 day   |
| D4.3 | Native tome re-indexing                  | Engineer         | Final scenes              | `tome.ts`                        | 2 days  |
| D4.4 | Update existing tests                    | Engineer         | 8.3                       | Passing suite                    | 2 days  |
| D4.5 | New tests                                | Engineer         | 8.4                       | Four test files                  | 2 days  |
| D4.6 | Regenerate Story Reader                  | Engineer         | D4.1–D4.3                 | Reader and manifest              | 0.5 day |
| D4.7 | Vesper regard across stops (with Plan C) | Engineer         | PC-D07                    | `encounter.ts`                   | 1 day   |
| D5.1 | Questions in the combined playtest (12)  | Designer         | Full build                | Report                           | 2 days  |

Total about 5 writer-weeks and 2.5 engineer-weeks, within the review's 4–6 week estimate.

## 11. Acceptance criteria

1. All four classes complete the campaign with no optional lessons (WB-C15), proven by the
   per-class test.
2. Every scene's prerequisite flags are reachable (`tests/campaignPacing.test.ts`).
3. Encounter order matches WB-C10.
4. The critical path between `campaignThreshold` and `ascentOpened` has three repair tasks, none
   adjacent, plus the wonder, danger and quiet scenes.
5. Each class has its own line at the five answer points (section 7), and no class lines elsewhere.
6. Vesper's first-half lines follow PD-D02; pronouns are they/them throughout.
7. "No one asks the people Vesper harmed to forgive them" remains, and the harm is named.
8. Old v17 saves load at every underground stage without losing or gaining milestones beyond 8.2.
9. Playtest targets in section 12 are met.
10. Plan B's plants exist where 9.1 lists them; no voice line states a falsehood (WB-C20).

## 12. Playtest protocol

Fresh readers are scarce, so Plan D does not run its own round (F-32). Its questions go into the
**combined protocol**: Plan B's stop-1 questions, then play to the end, then Plan D's and Plan B's
stop-2 questions, then Plan A's blind sort. Plan C's board test stays separate.

**Who.** At least eight of the combined round's players: four aged 9–13, four adults; two per
class. None has seen the story.

**During play.** The observer notes, without prompting: remarks about Vesper; whether the player
stops to read `rootwaysRecord`; reactions at the bridge (pause, comment, retry); skipped pages in
the book.

**Plan D's stop-2 questions, unprompted first.**

1. "Which character do you remember most?" Record the first name said.
2. "What did Vesper want?" Free answer.
3. "Why did Vesper stay at the bridge?"
4. "Was Vesper bad? Should they be forgiven?"
5. "What did your hero say to Vesper on the bridge? Did it sound like your hero?"
6. "Which part underground felt different from the rest?"
7. "Was any part underground boring?"

**Success.**

| Measure                                                                  | Target          |
| ------------------------------------------------------------------------ | --------------- |
| Names Vesper first or second in Q1                                       | 6 of 8          |
| Q2 answer matches "to be heard / noticed / have a turn / be listened to" | 5 of 8          |
| Q4 answer holds both: they did wrong, and they are not thrown away       | 5 of 8          |
| Q5 recalls the class answer                                              | 4 of 8          |
| Q6 names the Warrens lit or the bells                                    | 5 of 8          |
| Q7 names a repair scene as boring                                        | 2 of 8 or fewer |

**If it fails.** Q2 fails → strengthen the ruins intro and the quiet scene. Q4 tilts toward
"Vesper was right" → strengthen the recovery harm line. Q7 still names repairs → cut the beam to a
scene.

## 13. Milestones

| Milestone | Contents                                                     | Gate                                 |
| --------- | ------------------------------------------------------------ | ------------------------------------ |
| M-D1      | Bibles approved; decisions PD-D01–D08 answered               | Author sign-off                      |
| M-D2      | Rival lines in game (D1.x)                                   | Rival playtest, D1.5                 |
| M-D3      | Underground restructure in game (D2.x, D4.1–D4.5)            | Suite green; per-class run passes    |
| M-D4      | Late rewrites in game (D3.x), with Plan B and C dependencies | Plan B history approved; Plan C gate |
| M-D5      | Full playtest (D5.1)                                         | Section 12 targets                   |

## 14. Risks

| Risk                                                          | Mitigation                                                                                                            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Vesper becomes too sympathetic; the story excuses harm        | Harm named in recovery; every hero answer to Fennick keeps the choice with Vesper; test asserts the forgiveness line. |
| "To be heard" reads as wanting approval, against WB section 5 | Keep ambition explicit: power is how Vesper thinks you get heard (PD-D01).                                            |
| The danger fight adds a fifth major encounter                 | Ordinary strength; no boss music; WB-C10 positions unchanged (PD-D04).                                                |
| Old saves replay or skip scenes                               | Migration 8.2 plus `tests/saveMigrationV18.test.ts`.                                                                  |
| Tome staging drifts after beat inserts                        | D4.3 re-index; `tests/nativeTome.test.ts` page checks for each rewritten scene.                                       |
| Plan B changes the voice and invalidates **[B]** lines        | Mark and hold **[B]** lines until Plan B approval; few lines depend on it.                                            |
| Plan C mood gate slips                                        | Ship recovery with plain beats; mood beats follow.                                                                    |
| Class lines feel like four writers                            | Plan A owns final class voice; one writer does all late class lines in one pass.                                      |

## 15. Author decisions

WB section 5 says: "New tragedies, blood relationships and secret histories must not be added
merely to make a character seem important." PD-D01 and PD-D06 add backstory, so approving them
waives that rule knowingly, for these characters only (F-15). The case for the waiver: the wound
explains a choice the climax depends on (F4), and it is shown through objects and two lines, not
told.

| ID     | Decision                                                                                                                                                                                              | Affects                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| PD-D01 | Adopt Vesper's want "to be heard" ("It's my turn") and the childhood wound (quiet child, never got a turn), replacing "seeking glory" as the root motive, ambition kept? Waives the WB §5 rule above. | WB §5 intro and Vesper; WB-C11; WB-Q01; WB-Q06 |
| PD-D02 | Remove "Thrall of the Depths" and "Master" from Vesper's first-half lines? Decide before Plan A's N5, N13 and Plan B's confide line (C-2).                                                            | WB §5; WB-C11; WB-Q08                          |
| PD-D03 | Approve the underground pacing table (6.1): cut three tasks, add wonder, danger and quiet scenes, re-home Plan B's plants (9.1)?                                                                      | SQR-D07; WB-Q03; WB-C12; WB-C13                |
| PD-D04 | Add the mandatory ordinary-strength `campaign-hush` fight between the duel and the Lishal, started by Vesper ringing the great bell?                                                                  | WB-C10; WB-C11; WB-C18                         |
| PD-D06 | Fennick looked after twelve children, Vesper among them, and chose the ward over listening to Vesper? Waives the WB §5 rule above. (The regard half moves to PC-D07.)                                 | WB §5 intro and Fennick; WB-Q01; WB-C17        |
| PD-D07 | The hero carries Vesper out of the ward, and the ledger is returned in recovery? (The Devoted cup gesture is decided with PC-D08.)                                                                    | WB-Q06; WB-C17                                 |
| PD-D08 | Defer the surface mentor approaches (the other half of F6) to a follow-up review under Plan A?                                                                                                        | SQR review F6                                  |

PD-D05 (Fennick's pronoun) is merged into Plan A's A-D3 (C-4, C-14): he/him.

## 16. Changes after review

Resolutions to [PLANS_REVIEW.md](PLANS_REVIEW.md) findings and conflicts that name Plan D.

| ID   | Resolution                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Five answer points only (section 7 table). Class lines removed from `warrensLit`, `hollowsHush`, `malificatRisen`. `SR-vesperAcceptance-09` stays shared. Test asserts no other class-keyed hero beats. |
| F-02 | Per-stop structure kept with a 20-line budget (5.3); "Master" removal waits on PD-D02; the vesperArc ban is conditional on it.                                                                          |
| F-04 | Plan B's plants kept word for word or re-homed; table in 9.1.                                                                                                                                           |
| F-07 | All mood beats use Plan C's `moods` array (7.1, 7.4); the old `mood:` field is gone.                                                                                                                    |
| F-10 | 8.3 lists `nativeTome.test.ts:64`, the attitude intro-mood test and the five `SAVE_VERSION` pins.                                                                                                       |
| F-11 | Plan A's glossary applied to all D drafts: no "relay plan", "station", "vessel", "procedure" in player text; "lantern", "every stone", "switchworks", "bearer", "closing steps".                        |
| F-13 | The hero says their hesitation to Vesper in `rootwaysRecord` (6.4); Vesper quotes it at the bridge (7.1).                                                                                               |
| F-14 | The bells ring because Vesper rings the great bell, not because the voice is angry (6.6). The voice's line is now a true framing: "He stayed outside. He always does." (7.3).                           |
| F-15 | Section 15 quotes the WB §5 rule; PD-D01 and PD-D06 waive it knowingly.                                                                                                                                 |
| F-25 | Citation corrected to `src/data/story.ts:118`; the `campaign.test.ts` row moved to 8.3.                                                                                                                 |
| F-26 | Ridge and ruins intros describe only Vesper's own experience (5.3).                                                                                                                                     |
| F-27 | Surface mentor approaches deferred as PD-D08.                                                                                                                                                           |
| F-28 | The pacing test lists the three repair task ids.                                                                                                                                                        |
| F-30 | Reader check noted under 8.4; joins `npm run check` in Plan A's first milestone.                                                                                                                        |
| F-32 | Section 12 folds into the combined protocol.                                                                                                                                                            |
| C-1  | Placement table in section 7.                                                                                                                                                                           |
| C-2  | 5.3 rewritten to the budget; R9 in the ruins `confide`.                                                                                                                                                 |
| C-8  | 7.4 follows the review's cold/plain/warm/devoted text exactly.                                                                                                                                          |
| C-9  | Plan C's bridge lines are mood variants of "You would, too." (7.1); one insert.                                                                                                                         |
| C-11 | Flags `read`, `hush` and scenes `warrensLit`, `hollowsHush`, `hollowsEscaped` fixed; `campaign-hush` on Plan C's drowsy list; freeze flag at the end of `vesperAcceptance`.                             |
| C-12 | v18 is the only save bump; pinned tests assert the current version; one migration case has Plan C's flags absent.                                                                                       |
| C-16 | Plan A's fix 1.6 (`:335`, "He wanted") and the `SR-bellRelief-07` rewrite now live in `hollowsEscaped` (6.6).                                                                                           |

Rogue's bridge answer and the vague threat in `hollowsHush` follow the review's line suggestions.
