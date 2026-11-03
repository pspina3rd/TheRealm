# Mana Crystals — World Bible

**Review edition 1 · 3 November 2026 · full-story spoilers**

This is a single reference for Philip Spina to review the setting, characters,
story and continuity. It consolidates the existing documents without approving
new lore on the author's behalf. It does not change game dialogue or progression.

For the words currently in the game, use the companion
[Story Reader](WORLD_BIBLE_STORY_READER.md). Its numbered passages preserve the
current source text, including awkward wording, so edits can be traced precisely.

## Contents

1. [Authority and review status](#1-authority-and-review-status)
2. [The story at a glance](#2-the-story-at-a-glance)
3. [The world and its places](#3-the-world-and-its-places)
4. [Magic and the crisis](#4-magic-and-the-crisis)
5. [The people](#5-the-people)
6. [The complete story](#6-the-complete-story)
7. [The monomyth](#7-the-monomyth)
8. [Continuity rules](#8-continuity-rules)
9. [Decisions for author review](#9-decisions-for-author-review)
10. [Language and presentation](#10-language-and-presentation)
11. [Source register](#11-source-register)

## 1. Authority and review status

Three labels distinguish the material in this bible:

| Label       | Meaning                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Established | An explicit author decision, the approved story structure, or the existing first-half story retained by that structure. Later author corrections take precedence. |
| Team source | A name or concept supplied by the team's story or encounter documents. This does not approve every later explanation attached to it.                              |
| Proposed    | A working interpretation from the expanded outline, character profiles or dialogue draft. It remains open to author revision.                                     |

**Playable** is a separate description. A proposal can already have a playable
adaptation without becoming approved canon. Conversely, an established beat may
still need its intended animation or encounter mechanics.

The source baseline for this edition is GetPutTaco commit
`cc9918971f6cf73df50318d99ec584b173619e4a`, together with the author's accepted
story, hometown and spell-progression corrections. Links in the source register
identify the underlying documents and game files.

### Corrections carried into this reference

- Each hero begins in their selected hometown, with no learned spells.
- The player chooses which school to pursue first by choosing whom to visit and help.
- Rowan still teaches Quake through the well task. The regions can be explored before completing it, so Quake need not be the first school learned.
- The Focus Stone is earned through the opening events. Crossing a town boundary does not award it.
- Only some households fail to wake. The familiar opening cast remains awake.
- Pip's mother remains awake. Rowan's sleeping son supplies the personal reason to continue.
- The Moon Wyrm survives its defeat. Its fall is the midpoint false victory.
- Vesper's duel and evolved final form are separate encounters.
- The story continues beyond the Wyrm. It ends after the final confrontation and recovery.

Older claims that conflict with these points are historical text, not alternative
versions to introduce into new writing.

## 2. The story at a glance

**Established spine.** An unnatural sleep spreads across Sevenstones. The
chosen hero first encounters it through shuttered houses, a fouled well and
neighbors who need practical help. Rowan learns that his son Hareguy has been
asleep at the Brightwater inn for three weeks. Unable to make the journey
himself, Rowan asks the hero to go and gives them his old rune stone.

The hero travels through the surface regions, learns magic in a chosen order,
and encounters Vesper, a follower of the power speaking from the Moon Caves.
Defeating the Moon Wyrm restores moonlight and brings signs of recovery. The
animal lives, but the voice that spoke through it can still act. The apparent
solution has exposed a larger problem.

The approved second half continues underground, with substantial journeys
between Boss 2, the Vesper duel and Boss 3. The hero returns to the stone circle
for Fennick's rite, then faces Vesper's final form. The victory must lead back
to the people affected by the sleep.

**Proposed continuation.** The current writing makes the underground crisis a
conflict over care and control. Odile and Ketter need help keeping people alive
and moving. Irdrath will not let sleepers leave his protection. The Lishal offer
sleep and then enforce it on people who refuse. Vesper sees the evidence against
the voice, receives a real chance to leave and chooses its power anyway.

The proposed ending contains the voice, leaves Vesper alive under guard, and
shows people waking and returning home. These outcomes are reviewable choices,
not additional approval implied by this summary.

## 3. The world and its places

### Sevenstones and the stone circle

**Established.** Sevenstones is the surface overworld. Within it, the stone
circle is the central sanctuary associated with the seven elemental stones.
Use **the stone circle** or **the sanctuary** when a sentence means that specific
site. Use **Sevenstones** when it means the wider world.

Only Mossvale connects directly to the sanctuary. Its north path provides that
connection. Its south gate leads to the provincial roads. Other surface regions
reach the sanctuary through Mossvale; they do not have separate spokes into it.

On the current overview, Mossvale lies northwest of the circle. North and south
name the local town exits; they do not place Mossvale geographically south of the
circle or establish a straight road between the two map markers.

The current map is 256 by 256 tiles. That is an implementation measurement,
not a fictional distance, travel time or claim about the size of the planet.

### The four hometown openings

**Established.** The chosen hero changes the starting location. The opening
cast and main story remain the same.

| Hero  | Class  | Hometown     | Surrounding country                                           |
| ----- | ------ | ------------ | ------------------------------------------------------------- |
| Fern  | Ranger | Mossvale     | Northwestern country; town lies northwest of the stone circle |
| Lance | Knight | Cairnwick    | Redrock, in the southwest of the surface world                |
| Ares  | Mage   | Merehaven    | Glasswater, east of the central country                       |
| Vex   | Rogue  | Bramblecross | Thornwood, in the western forest country                      |

Rowan, Bean, Pip and Ordor belong to the selected hometown in that adventure.
The player does not meet four duplicate sets of these neighbors. A return-home
scene follows the opening cast back to the selected home.

The seven regional mentors keep their established homes. Choosing a different
hero does not move their schools into the new hometown. No approved account
currently requires the four protagonists to travel as one party or gives them
a shared family history.

### The surface regions

**Established locations and teacher homes.** The compass positions below follow
the current map. The regional sites are places within the larger surface world,
not seven rooms inside the starting settlement.

| Place            | Position and character        | Teacher             | Work that opens the teacher's approach                  |
| ---------------- | ----------------------------- | ------------------- | ------------------------------------------------------- |
| Thornwood Grove  | Southwestern forest country   | Hazel, Nature       | Help Wren clear the infected mushroom ring.             |
| Glasswater Lake  | Eastern lake country          | Maren, Water/Ice    | Help Tam mend his nets for passage.                     |
| Redrock Quarry   | Southern quarry country       | Dorn, Earth/Gravity | Help Flint clear the ridge road.                        |
| Forgefyre        | Southeastern forge country    | Torva, Fire         | Help Cinda stoke the forge.                             |
| Stormcrown Peaks | Northeastern mountain country | Rook, Lightning     | Help Ysolde restore the beacon.                         |
| Windward Cliffs  | Northern high country         | Kestrel, Wind       | Help Twitch recover his letters and lower the crossing. |
| Moonfall Ruins   | Northwestern ruins            | Selene, Arcane      | Help Ivo relight the moon rune.                         |

**Brightwater** is a separate settlement. Pete's inn shelters Hareguy. Captain
Vale protects the town and controls the Cave Pass. Myst tends its shrine.
Brightwater is outside the stone sanctuary.

**The Moon Caves** lie beyond the Moonfall route. The cave journey culminates
at the Wyrm and the moon-crystal. The intended cave entry requires the earned
opening call and the Cave Pass; access is not awarded for knowing a prescribed
number or order of spells.

### The underground route

**Proposed regional arrangement, with a playable adaptation.** These locations
provide the journey between the approved major beats. Their names and detailed
social roles remain part of the continuation for review.

| Region                        | Purpose in the proposed story                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sunken Archive                | A flooded archive and refuge. The hero meets Odile and finds records relevant to the ward and earlier vessels.                                     |
| Cistern Marches               | Waterworks and heated sleeping chambers. The conflict with Irdrath determines whether residents can be moved safely.                               |
| Rootways                      | Roots cross an old transport system. Repairing the tram continues the journey and connects the deep system to the surface blight.                  |
| Glass Warrens                 | Crystal passages and a damaged lift. Ketter's rescue leads into the separate duel with Vesper.                                                     |
| Bell Hollows                  | A working settlement whose bells carry lift and workshop signals. The hero helps Ketter arrange relief and learns more about the return procedure. |
| Quiet Foundry                 | The Lishal's sounding frame and central relay. Residents must escape before the coercive broadcast is stopped.                                     |
| Upward Road                   | A service ascent where repaired routes and cooperation help people return to the surface.                                                          |
| Outer stations and inner ward | Sites near the stone circle used for the rite and final confrontation in the playable interpretation.                                              |

These places need ordinary life as well as plot functions: homes, supplies,
rest, work and people with reasons to remain after the hero leaves.

## 4. Magic and the crisis

### What the story establishes

The violet stone dims first. Other lights weaken. Some people fall into a sleep
from which ordinary care cannot wake them. Spores foul the well, meadows pale,
and the lake clouds. The Wyrm coils around a moon-crystal and the speaking
antagonist claims to consume moonlight.

The voice's claims are dialogue, not a complete account of how the world works.
A vision claiming that every surface breath draws air from the cavern does not
establish a proven physical law. The exact relationship between the stones,
moonlight, blight and sleep still needs a consistent explanation where the
continuation depends on it.

The Wyrm's defeat restores something real. Moonlight returns and sleepers begin
to stir. The continuing threat does not erase those gains.

### Schools, learning and the board

**Established player-facing contract.** There are seven schools: Fire, Water/Ice,
Earth/Gravity, Wind, Lightning, Nature and Arcane. A class's affinity does not
award it a starting spell. Each school has four trainable ranks. The six base
schools can be pursued before the Wyrm; Arcane opens after the Wyrm's aftermath.
The player chooses whom to visit among the available teachers and which schools
to develop.

Rowan teaches Quake through the well. Dorn remains the regional Earth teacher.
Orrin's task can teach Thunder. Teaching is not restricted to one person per
school; do not remove those established rewards to make a table look tidier.

The following rules constrain demonstrations of magic in scenes and encounters.
They are a game contract, not a claim that every character describes magic as a
board of blocks.

| School    | Core effect                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fire      | Burns affected rows, with the four ranks covering one to four rows.                                                                                  |
| Ice       | Fills gaps with colorless material, allowing completed rows to clear. Its material earns no mana.                                                    |
| Gravity   | Drops unsupported material. The progression is Gravity, Mudslide, Earthquake and Avalanche, with increasing reach.                                   |
| Wind      | Shifts movable material sideways when space permits, including eligible obstructions.                                                                |
| Lightning | Damages enemy obstructions and opens space when they break. Stronger forms cover more rows or deliver more strikes.                                  |
| Nature    | Converts enemy obstructions into harmless blank material. Tough obstructions can require repeated conversions. The resulting material earns no mana. |
| Arcane    | Acts on the opponent and their interference. It is a seventh school, not another name for custom Weaving.                                            |

The current primary Arcane spell is Shadow/Shadow Drain. It targets the opponent
and follows the same automatic casting system as the other primary schools.
Advanced Arcane techniques and custom Weaving are separate manual actions.

Standard spells in combat use earned line opportunities and available mana.
Learned rank and priority matter. The player does not have to select each
standard spell before it can act.

**Advanced Arcane techniques** and **custom Weaving** are distinct. The Arcane
school, its advanced techniques and custom Weaving share the post-Wyrm unlock:
the Wyrm is beaten and its chapter-end scene is completed. Further training
requirements still apply. Weaving is an equipped
custom spell whose component strengths, order and combined mana cost are chosen
by the player. Fire followed by Gravity can produce a different result from
Gravity followed by Fire. Neither system replaces the seventh school.

### Objects that must stay distinct

| Term                             | Meaning and boundary                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seven elemental stones           | The stones associated with the regions and central circle. Do not turn their symbolic arrangement into a shortcut from every region.                                                        |
| Moon-crystal                     | The crystal around which the Wyrm coils in its lair. Its exact relationship to the surface violet stone needs care; the documents do not license treating every crystal as the same object. |
| Focus Stone / Rowan's rune stone | The old stone Rowan used while digging the well and later gives the hero. It is separate from the spell reward and from the moon-crystal.                                                   |
| Moon Shards                      | Objects offered in existing exchanges and lore. Their presence does not by itself establish a new origin story for the stones.                                                              |
| Firstcoal                        | A team-source element of Irdrath's encounter. The draft makes freeing it disrupt his control; it is not simply collected as a boss key.                                                     |
| Brass lantern                    | The wickless lantern at the ward, developed into a tool of the proposed rite. Its detailed function and speaker association remain reviewable.                                              |
| Ward, stations and ring          | Related parts of the proposed containment arrangement. The reader needs to know which boundary or device a scene means; they are not interchangeable labels for all magic.                  |

## 5. The people

The motives below distinguish existing evidence from proposed development.
New tragedies, blood relationships and secret histories must not be added merely
to make a character seem important.

### The four possible heroes

**Established character distinctions, with proposed voice guidance.**

| Hero  | Existing hesitation                                               | Useful voice guidance                                                                                                                 |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Fern  | Worries about leaving the sleepers without someone watching them. | Notices routes, weather and familiar routines. Concern can make Fern hesitate; it does not mean Fern has never left home.             |
| Lance | Believes duty requires staying at a post.                         | Notices who is exposed to danger and what a promise requires. Duty can be reconsidered without turning Lance into a different person. |
| Ares  | Relies on books and faces a problem they cannot fully explain.    | Asks how things work. Knowledge should help Ares act, rather than supply an answer to every mystery.                                  |
| Vex   | Tries to deny that the community is their responsibility.         | Notices terms, opportunities and what people withhold. Detachment can fail without making every line a joke.                          |

Every hero can be afraid, kind, mistaken or brave. No class determines a fixed
moral character. No approved history makes the hero a chosen one, a hidden heir
or a relative of the antagonist.

### The opening cast

**Rowan — established concerns; proposed emotional development.** Rowan knows
wells, timber and stone. His knees prevent him from doing work he once managed
himself. Hareguy's condition gives him a personal reason to ask for help. He
wants his son home and must trust someone else to make the journey. He wonders whether digging the well disturbed something below. That worry
does not prove he caused every later harm. He contributes materials and skilled work at the return.
His knees are not conveniently healed to let him join an expedition.

**Bean — established concern.** Her beds support her livelihood and the local
supply of food and herbs. She teaches spacing and shares an actual yield. She
can be generous while keeping enough for people who depend on her. Her voice
belongs to soil, seed, weather and work, rather than general speeches about life.

**Ordor — established concern.** His stock and trade connect the hometown to
other places. He needs to make a living. Familiarity changes his terms and how
he treats the hero; it does not turn him into either a greedy caricature or
someone who gives away everything.

**Pip — established concern.** His tower matters through pride, supper, pudding,
cabbage and the prospect of getting caught. His mother remains awake. The draft
ending returns to their ordinary life rather than adding a sleeping-mother loss
that contradicts his existing lines.

**Hareguy and Pete — established roles.** Hareguy is Rowan's son and is asleep
at Pete's inn in Brightwater. Pete provides care and reports what he knows.
The draft return verifies Hareguy's condition before the hero reports to Rowan.
A later note about breakfast signals recovery; it does not move Rowan instantly
to Brightwater.

### The regional mentors

**Established motives and habits.** Further private history should be labeled
as new writing rather than inferred from a single expression or gift.

| Mentor  | What matters to them                                      | Emotional and verbal character                                                        |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Torva   | Passing on a craft as her hands become less steady.       | Proud, impatient with poor work, embarrassed by limitation, and capable of affection. |
| Maren   | The clouding lake and connected waters.                   | Patient and caring, with grief tied to a place she knows.                             |
| Rook    | Keeping up with storms that no longer behave as expected. | Hurried, delighted by lightning, and sometimes too impatient to slow down.            |
| Hazel   | Meadows and growth threatened by rot.                     | Gentle with living things and fierce when protecting them.                            |
| Dorn    | Preventing another crew from being lost.                  | Vigilant and practical. His established loss should not be copied onto every mentor.  |
| Kestrel | Getting letters to the communities that need them.        | Restless and sociable; work can become a reason to seek someone out.                  |
| Selene  | Understanding the failing moonlight.                      | Measured, observant and willing to let another person help her think.                 |

The regional homes remain fixed. In the current game, teachers stay at those
homes until their first lesson is won, then follow their travel routes. A scripted
visit, such as Kestrel delivering Rowan's letters, does not move the school into
the hometown. Their return-scene familiarity must
reflect relationships actually earned. A skipped optional relationship is not
a reason to block the ending.

### Vesper

**Established.** Vesper followed the power in the Depths after seeking glory.
They speak of the Wyrm as Master, test the hero, remember life in the sun and
can respect ability in someone they oppose. Their separate duel and evolved
final encounter are required parts of the approved arc.

**Proposed development.** Vesper wants their pursuit of power and knowledge to
have been a sound choice. Evidence about earlier vessels threatens that belief.
They can be curious and still refuse to admit an error. After losing the duel,
they receive a clear chance to leave and choose the voice instead.
Their ambition remains a motive; the draft does not reduce it to wanting
someone's approval.

Vesper's voice should remain recognizable through the transformation: precise
observations, contempt, amused questions and wounded pride. The final form must
not become an unrelated villain wearing the same name. Survival after defeat
is a proposed ending, not an established guarantee.

### The Moon Wyrm and the voice

**Established.** The Wyrm is the ancient serpent in the Moon Caves. It is
physically defeated and survives asleep. The voice continues without it and
calls it an obedient throat. This separates the continuing speaker from the
animal, but does not settle every question of control or responsibility.

**Proposed interpretation.** The voice is an older intelligence that used the
Wyrm as a vessel and wants a durable new body. It exploits Vesper's existing
ambitions. Its age, origin, limits and exact influence over the Wyrm remain open.
Do not turn the voice's own claims into unquestionable historical exposition.

The animal's needs and the speaker's motives are not automatically identical.
Neither complete innocence nor free participation by the Wyrm has been settled.

### Fennick

**Established.** Fennick's rite belongs late in the return to the stone circle.
The first-half hook separately presents an unnamed old man with a brass lantern
who recognizes the tracks and says he taught their maker to walk.

**Proposed and playable.** The continuation identifies that man as Fennick and
the child as Vesper. It makes Fennick a former carer, not an established biological
parent. This connection gives Fennick personal stakes without granting authority
over Vesper's decisions.

Fennick wants the rite completed with the helpers alive and informed. They need
reliable evidence and other people's skill. The draft shows them accepting a
correction to a station and delegating its inspection. Care for Vesper competes
with responsibility to the people at the ring. Practical instructions should
follow what someone has to do, not replace an explanation of the rite with a
cryptic command to the hero.

### Irdrath — Boss 2

**Team source.** Irdrath is associated with ash, smoke and the buried Firstcoal.

**Proposed and playable role.** His heat serves the cistern works and sleeping
chambers. He wants the residents kept within the warmth he can control. He
needs to allow others to move them beyond his reach. He rejects a safe trial
because he cannot accept that transfer of responsibility.

The confrontation follows a decision, not an elemental creature attacking for
no reason. Afterward, he permits Odile's carriers through while still worrying
about particular residents. Defeat does not automatically absolve him. No
invented human family or tragic former profession is required to explain him.

### The Lishal — Boss 3

**Team source.** The Lishal are seven singers associated with colors and columns.

**Proposed and playable role.** They provide real food, shelter and care, then
insist that permanent sleep is the answer to suffering. When a worker knowingly
refuses, individual singers close doors and help enforce the decision. Their
shared position does not erase their individual choices.

They need to accept another person's refusal. In the draft they do not: even
with their rooms empty, all seven restart the frame. A moment of disagreement
or sympathy must have consequences rather than serve as instant redemption.

### Odile and Ketter

**Team-source names; proposed and playable roles.**

Odile maintains water and organizes the refuge. She wants the residents moved
to safe housing and also wants to leave herself. She needs partners who finish
work after receiving the information they wanted. Her packed belongings make
that personal wish visible. At the ascent, she directs the transfer rather
than waiting for another rescue.

Ketter maintains lamps, bells and lift signals. They want someone competent to
cover a shift. They need to let that person finish without constant correction.
An interrupted meal and repeated packing show fatigue. Later, Ketter leaves a
tool case to help an injured worker and trusts another operator with a signal.
Their equipment has a practical use; every mention of a bell need not become
a metaphor.

### Other residents

| Person                        | Role to preserve                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captain Vale                  | Protects Brightwater, maintains the watch and provides the Cave Pass after the relevant work. The draft gives Vale responsibility for evacuation and custody. |
| Myst                          | Shrine keeper in Brightwater. Care and ritual belong to a local responsibility, not an unlimited source of answers.                                           |
| Orrin                         | Sage whose established task can teach Thunder. Do not erase this route when describing Rook's school.                                                         |
| Lo, Pyre and Nim              | Surface trade and collection roles. Their businesses and requests supply ordinary reasons for encounters.                                                     |
| Wren, Tam and Flint           | Regional residents whose work opens Hazel, Maren and Dorn's approaches.                                                                                       |
| Cinda, Ysolde, Twitch and Ivo | Regional residents whose tasks open Torva, Rook, Kestrel and Selene's approaches.                                                                             |
| Garrick, Rosa and Ada         | Regional equipment or lodging roles. Their existence helps places function beyond the main quest.                                                             |
| Steve                         | The cave hermit from the existing first-half material. Additional secret histories remain unestablished.                                                      |
| Rafe, Quill and Ash           | Residents in the playable continuation: the tram, refuge stores and Bell Hollows stores. Their expanded biographies remain open.                              |

## 6. The complete story

This section is a continuous reading version of the current story direction.
The first half follows the established material. The second half's connecting
scenes and explanations remain proposed even where they are already playable.
It is a synopsis, not replacement dialogue.

### 6.1 The sleeping houses — established

The violet stone dims during the night. By morning, three households in the
hero's hometown have not woken. Other people continue trying to work. Bean tends
her beds, Ordor opens the stall, and Rowan draws violet water from the well.

The hero can inspect the closed houses and help with local work. These tasks
introduce people and the problems the crisis has made worse. Helping Pip is
cooperation with a child building a tower, not a hostile contest with him.

Clearing the well restores the water and teaches Quake if the hero does not
already know it. It does not wake the sleeping households. The player can also
explore regional schools before completing this opening sequence.

### 6.2 Rowan's request and the road — established

Rowan's call follows the household investigation and well work. Each hero has
a reason to hesitate. Kestrel arrives with letters. One reports that Hareguy has
been asleep at Pete's inn for three weeks. Rowan cannot make the road on his
knees. He gives the hero the rune stone he found while digging the well.

The hero has a specific person to check on in Brightwater and a problem that
will not be solved by cleaning one shaft. Departure after this earned call
brings the first vision. Merely stepping outside town does not manufacture the
call, Focus Stone or an early encounter with Vesper.

### 6.3 The surface journey — established

Travel leads through inhabited regions with work, teachers, trade and danger.
The player chooses schools by choosing whom to seek out. The mentors' approaches
require help with local problems; they are not all waiting in the starting area.

In Brightwater, Pete's account makes Hareguy's condition concrete. Vale's work
and the Cave Pass establish the route toward the Moon Caves. Vesper's early
appearances follow the earned call and the Brightwater visit. Their challenges
and conversation develop a recurring antagonist before the later duel.

The visions grow more direct as the hero advances. They give the speaker a
presence without establishing that its account of the world is reliable.
The Cave Pass and earned opening call are both required before the cave descent.

### 6.4 The Moon Wyrm — established midpoint

The hero reaches the serpent coiled around the moon-crystal. The confrontation
ends with the animal slackening, closing its eye and sleeping. Moonlight returns.
At Brightwater, sleepers stir. The victory deserves relief before the next threat
becomes clear.

At the stone circle, the voice speaks again without the Wyrm. An empty cloak and
wet footprints lead toward the ward. An old man with a brass lantern recognizes
the tracks. The hero has defeated a creature that carried the speaker, rather
than ended everything causing the crisis.

The approved structure places this false victory around the middle of the game.
It is not the ending and must not be rewritten as the Wyrm's death.

### 6.5 The archive and the refuge — proposed continuation

The old man helps the hero examine a controlled way through the ward. The
playable interpretation names him Fennick. The descent does not depend on an
unexplained fissure or on smashing every seal in sight.

In the flooded archive, Odile is preparing a refuge to leave. She needs the
drains working before residents can be carried out. The hero earns cooperation
by helping. Records describe earlier attempts to give the voice a body and
suggest why the ward was built.

That evidence changes the question. Killing another creature may not stop a
speaker that can use another vessel. The hero needs to understand the route
while keeping its residents safe.

### 6.6 Irdrath and the transfer — proposed continuation; approved Boss 2 position

The cistern works depend on heat and water. Irdrath keeps sleepers warm but
blocks their removal. Odile and the hero prepare a trial channel that can
supply the transfer without abandoning the chambers.

Irdrath sees that the trial works and still refuses. When the carriers try to
use it, the conflict becomes a fight. Freeing the Firstcoal disrupts his control
without turning it into treasure or destroying the chambers around it.

After the defeat, the first stretcher passes through. Irdrath remains concerned
about the next chamber, but Odile now has the route and responsibility to move
its residents. The story continues through the Rootways rather than placing
Vesper immediately behind the boss door.

### 6.7 Ketter and Vesper's duel — proposed continuation; approved separate duel

The hero repairs the tram and follows the route through the Rootways. Vesper
has also learned about earlier vessels. The two interpret the evidence
differently: the hero sees a danger to be stopped; Vesper tries to preserve the
claim that their allegiance was informed and worthwhile.

In the Glass Warrens, the hero rescues Ketter from a damaged lift. Their lamps
help distinguish a useful supply from the branch carrying the voice. Vesper
chooses to defend control of that route by force.

The hero wins the duel against Vesper in their earlier form. Vesper retreats
alive and refuses an opportunity to stop. Closing the upper voice branch leaves
Ketter's lamps working, but the deeper relay remains active. This distinction
makes the next journey necessary without undoing the duel's result.

### 6.8 The bells and the seven singers — proposed continuation

In the Bell Hollows, Ketter's signals keep other workers moving. Helping arrange
a relief operator gives them a reason to leave the workshop. Fennick's letters
and the recovered records describe an incomplete return procedure.

The hero reaches the Quiet Foundry, where the Lishal tend workers and run the
sounding frame. A worker accepts a bandage but refuses the offered sleep. The
singers then block the exits. Ketter and the hero help the workers escape.
Their care is real; it does not make the coercion harmless.

Before the central relay closes, the hero finds the missing return connection
on the inspection rail and copies it. The procedure is discovered through work
and observation rather than appearing as a reward after the next boss.

### 6.9 Vesper chooses; the Lishal restart — proposed continuation

Vesper stands across the working frame. The hero opens a footbridge and offers
a way out. A falling shutter threatens the escaping workers, so the hero must
hold its brake instead of immediately crossing after Vesper.

Vesper can see the retreat. They know what happened to earlier vessels. They
choose to stay and accept the voice, then leave by the service ascent. The
hero's concern for the workers explains Vesper's head start without making the
choice involuntary or the hero inexplicably passive.

The hero disconnects the coercive branch while preserving the local lift
signals. The Lishal deliberately restart the frame with its manual drive. This
causes Boss 3. Defeating them stops that broadcast; it cannot remove the power
Vesper already accepted. No separate Master boss is added after these events.

### 6.10 The return and the rite — proposed treatment of an established return

A fallen beam blocks the ascent. The hero, Odile and Ketter help clear it so the
residents can continue. A courier brings news that the violet stone is dimming
again. The repaired route lets the hero return with the procedure and people
who have reasons to help.

Fennick asks exactly what the hero witnessed of Vesper's refusal. Preparations
then involve the watch, supplies, transport and the outer stations. The hero
checks Hareguy's condition before reporting to Rowan. Rowan contributes skilled
work at home; Bean and Ordor supply a share they can actually spare.

The mentors' contributions reflect prior relationships. Trained helpers can
cover absent stations, so the rite does not require every spell or friendship.

The recovered drawing places the wickless lantern in the ring. A test produces
light and exposes a loose station that Ketter notices. Fennick accepts the
correction and asks for the remaining stations to be checked.

The test checks connections. The expectation that the ring can contain the voice
comes from the records, not from proving that every living voice behaves like
a thread of light. Later contact with the active boundary provides evidence.

### 6.11 Vesper's final form — established confrontation; proposed mechanism

Inside the prepared ward, Vesper draws on the stones and becomes the Malificat.
Their movements and speech still identify them as Vesper. The voice urges an
attack on the outer ring. When Vesper approaches it, the borrowed light recoils
from the boundary.

Fennick remains at the lantern station. The hero fights inside. The draft's late
lantern intervention creates an opening for the hero; it does not win the fight
for them. The exact phases, spectral-chain visuals, preview fog and six-row
lantern effect remain encounter-design work rather than completed mechanics.
Normal controls and a readable landing must remain available.

The final victory breaks the connection between Vesper and the stones. In the
proposed ending, the voice strikes the ring and cannot leave. The hero and watch
move Vesper out before sealing the ward. No unrelated final enemy follows.

### 6.12 Recovery — proposed ending to review

Vesper survives without the borrowed power and remains under guard. Fennick can
offer care without speaking for the people Vesper harmed. The hero does not
promise forgiveness on anyone else's behalf.

News arrives that Hareguy has asked for breakfast. Rowan prepares to travel to
Brightwater when transport is available; his knee still catches when he stands.
Odile unpacks in the refuge's new lodging. Ketter lets the relief operator finish
a signal. Pip wants the hero to see another tier of the tower before supper.

The remaining sleepers wake over the following days. People still need food,
rest and repairs. This gives the ending a visible result without claiming that
all damage or responsibility has disappeared.

## 7. The monomyth

**Established framework.** These are story functions. They should not become
speeches in which the characters explain the framework to the player.

| Journey stage                         | Story expression                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Ordinary world                        | The selected hometown, its familiar people and their work.                     |
| Call and refusal                      | The sleepers, Rowan's request and the hero's specific hesitation.              |
| Aid and crossing                      | The Focus Stone, regional teachers, earned passage and cave descent.           |
| Trials and relationships              | Practical work, lessons, travel and encounters across the surface.             |
| Ordeal                                | The midpoint Wyrm battle and false victory.                                    |
| Consequences and deeper understanding | The escaped voice, underground residents, separate bosses and Vesper's choice. |
| Road Back                             | The ascent, return visits and shared preparation for Fennick's rite.           |
| Resurrection                          | The final confrontation with Vesper's evolved form.                            |
| Return with the elixir                | Recovery reaches particular people and places; ordinary life can resume.       |

| Rough position | Major encounter or event                            | Authority                                                            |
| -------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| 50%            | Moon Wyrm, defeated but alive; false victory        | Established                                                          |
| 62%            | Boss 2; team-source identity Irdrath                | Position established; developed role proposed                        |
| 72%            | Separate Vesper duel                                | Established                                                          |
| 82%            | Boss 3; team-source identity the Lishal             | Position established; developed role proposed                        |
| 85–95%         | Return to the stone circle and Fennick's rite       | Established position; detailed procedure proposed                    |
| End            | Vesper's final form; team-source name the Malificat | Confrontation established; detailed mechanism and aftermath proposed |

There are three principal boss positions in that numbering, plus the separate
Vesper duel and final-form confrontation. Exploration and regions must separate
them. The percentages are rough author targets, not measured playtime,
completion percentages or deadlines.

## 8. Continuity rules

These are the checks to apply when a scene, map or line changes. Established
checks apply to every version. Proposed-continuation checks apply only if that
part of the draft is retained; they do not approve it.

| ID     | Scope                   | Check                                                                                                                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-C01 | Established             | Begin with the selected hometown and zero learned spells. Class affinity does not silently teach a school.                                              |
| WB-C02 | Established             | The opening cast occurs once in the selected home. Regional mentors retain their homes.                                                                 |
| WB-C03 | Established             | Keep Rowan's Quake reward and the player's ability to pursue another school first. The well does not gate all regional exploration.                     |
| WB-C04 | Established             | Earn the call and Focus Stone through the opening work. Do not award them by leaving town.                                                              |
| WB-C05 | Established             | Keep some households awake. Pip's mother remains awake; Hareguy's condition supplies Rowan's personal stake.                                            |
| WB-C06 | Current progression     | Introduce Vesper after the earned call and Brightwater visit; do not make the antagonist the first stranger outside the hometown.                       |
| WB-C07 | Established             | Use Sevenstones for the surface world and stone circle for the sanctuary when location matters. Only Mossvale connects directly.                        |
| WB-C08 | Established             | Preserve the Wyrm alive and asleep, moonlight restored and some sleepers stirring.                                                                      |
| WB-C09 | Established boundary    | Separate the animal from the continuing voice without inventing a settled origin or degree of guilt.                                                    |
| WB-C10 | Established             | Keep the encounter order: Wyrm, Boss 2, Vesper duel, Boss 3, rite, final form.                                                                          |
| WB-C11 | Proposed continuation   | Keep Vesper recognizable and responsible for choices. Show them a usable way out before they refuse it.                                                 |
| WB-C12 | Proposed continuation   | Preserve useful lamp, water and signal networks when stopping the voice's branch.                                                                       |
| WB-C13 | Proposed continuation   | Discover the return procedure before the relay closes; do not introduce it as arbitrary boss loot.                                                      |
| WB-C14 | Proposed continuation   | A light test checks connections. It does not alone prove that a voice can be contained.                                                                 |
| WB-C15 | Gameplay requirement    | Keep completion possible for every class without requiring all seven schools or every optional mentor bond. Specific station fallbacks remain proposed. |
| WB-C16 | Established             | Keep Rowan's physical limitation; do not heal his knees to make a return scene convenient.                                                              |
| WB-C17 | Approval boundary       | Vesper's survival, Fennick's relationship and the detailed rite mechanism remain proposals until approved.                                              |
| WB-C18 | Implementation boundary | Do not describe proposed boss phases, lantern effects or elapsed pacing as already proven by the playable adaptation.                                   |
| WB-C19 | Proposed continuation   | Verify Hareguy's condition before reporting to Rowan, and allow time for Rowan's later journey.                                                         |

### Older wording that must not guide new writing

| Older statement                                                  | Current reference                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Every class wakes in Mossvale Village.                           | Four hometown openings; use the selected town's accepted name.                                                           |
| Each class starts with its listed first spell.                   | Every class starts with zero spells.                                                                                     |
| Rowan's well now pays coin instead of teaching Quake.            | The well teaches Quake; the 40-gil substitute applies if it is already known. The Focus Stone is a separate earned gift. |
| The Wyrm is the full game's final boss.                          | It is the midpoint Ordeal. The full campaign continues.                                                                  |
| The second half has no implementation.                           | A playable adaptation exists; that does not approve all its new lore or finish its proposed mechanics.                   |
| A character's action in stage prose is already animated in full. | The staging must be checked in the actual presentation. Source prose alone does not establish a finished visual scene.   |

## 9. Decisions for author review

The following items need an explicit story decision. They are collected here so
reviewing this bible does not accidentally approve them by association.

| ID     | Decision                                                                           | Current working version                                                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-Q01 | Who is the old man at the ward, and who made the tracks he recognizes?             | The playable draft identifies Fennick and Vesper. It establishes a former caring role, not biological parenthood.                                                                            |
| WB-Q02 | What is the voice, and how much choice did the Wyrm have?                          | An older will using vessels; age, origin, limits and the animal's responsibility remain unresolved.                                                                                          |
| WB-Q03 | Keep the proposed underground regional arrangement and resident roles?             | Archive, cisterns, roots, warrens, bells, foundry and ascent; Odile organizes a transfer and Ketter learns to hand over a shift.                                                             |
| WB-Q04 | Keep the proposed motives for Irdrath and the Lishal?                              | Protective control of sleepers versus a collective decision to impose sleep. Their team-source identities remain separate from these new motives.                                            |
| WB-Q05 | What exactly do the rite, ward and lantern do?                                     | The recovered procedure closes an escape route; the lantern helps during the final battle. The light test shows that the connections work; it does not prove the ring can contain the voice. |
| WB-Q06 | Keep the proposed ending for Vesper?                                               | Alive, stripped of borrowed power and under guard, with care and accountability left visible.                                                                                                |
| WB-Q07 | What should “Ves, en.” communicate?                                                | The phrase is retained from the team source without an invented translation. Fennick as its speaker is a proposal.                                                                           |
| WB-Q08 | Which names and relationships should the player understand before the final scene? | The draft uses records, letters and conversations, but those explanations need to be clear in the actual game.                                                                               |

Review comments can cite these IDs, a character heading, or a numbered passage
in the Story Reader. Approval of one row should be recorded separately from
approval of the whole continuation.

## 10. Language and presentation

### Writing standard

Write what the speaker wants from the person in front of them. Use concrete
people, objects and consequences. Let fear, pride, affection or fatigue affect
the wording without giving every character the same voice.

Avoid explaining a character's motive in every exchange. Show what they keep,
give up, repair, refuse or risk. Odile's packed bag, Ketter's interrupted meal
and Rowan putting down his tool can carry meaning before anyone explains it.

Keep a distinction between a rule and a metaphor. If a scene depends on a ring
stopping the voice, the player needs evidence and a clear consequence. Calling
it a boundary repeatedly does not supply either.

The story can contain unfamiliar names. A new term should identify something
the player can recognize before another unexplained term replaces it. Check
**voice branch**, **relay**, **return**, **ring**, **ward** and **station** especially
carefully in the current continuation.

### Showing the scene

Character selection uses the hero sprites and opens the selected hero's tome.
Narration and exposition can use the same in-world book, with an illustrated
action or animated portrait, then return to exploration. Page controls and safe
skipping preserve the scene's outcome without forcing a wall of text.

A direction such as a hand shaking, a bridge lowering or someone refusing an
exit should be staged or animated where it matters. It should not simply be
spoken aloud by a character. The Story Reader retains the directions for review;
that is not an instruction to display all of them as narration.

### Names and terms

| Use                                                       | Historical or easily confused wording                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Fern, Lance, Ares, Vex                                    | Older notes use Fen, Bram and Lyra for the first three.                                                                            |
| Bean, Ordor, Myst                                         | Older notes use Bea, Odo and Ilse.                                                                                                 |
| Forgefyre                                                 | Older notes use Emberforge.                                                                                                        |
| Mossvale, Cairnwick, Merehaven, Bramblecross              | Avoid adding Village or Town to every proper name. A descriptive sentence can still call a place a town.                           |
| Stone circle / sanctuary                                  | Use for the specific central site; avoid making every use of Sevenstones mean a settlement.                                        |
| Earth/Gravity and Water/Ice                               | Distinguish school or legacy identifiers from the named board effect. Do not infer an extra school from a display-name difference. |
| Arcane school, advanced Arcane techniques, custom Weaving | Three related descriptions with distinct roles; custom Weaving does not replace the seventh school.                                |
| The Malificat                                             | Vesper's evolved final form, not an unrelated creature appearing after Vesper.                                                     |

### Passages worth a close wording review

The companion reader preserves existing text rather than hiding problems with
a new paraphrase. Particular review targets include the repeated light/dark
imagery in Vesper's earlier lines; statements in visions that sound like literal
world physics; technical return-procedure explanations; the untranslated
“Ves, en.”; and lines whose emotional intention depends entirely on a stage
direction that the game has not yet shown clearly.

No new dialogue has been invented for this bible. Its summaries can be edited
without silently changing the source game's words.

## 11. Source register

| Source                                                                                                         | What it supplies                                                                   | Caution                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [STORY_ARC.md](STORY_ARC.md)                                                                                   | Approved major structure, midpoint Ordeal, order and rough targets.                | Some implementation-status wording predates the playable continuation.                                       |
| [HOMETOWNS.md](HOMETOWNS.md)                                                                                   | Accepted four-home arrangement, shared cast and fixed mentor homes.                | Keep hometown substitution out of literal directions to Mossvale.                                            |
| [OPENING_PROGRESSION.md](OPENING_PROGRESSION.md)                                                               | Chosen-school access, Rowan's reward, earned call and delayed Vesper appearances.  | Exploration before the call is distinct from cave access.                                                    |
| [STORY.md](STORY.md)                                                                                           | Preserved first-half dialogue and team mentor lines.                               | Its starting-class introduction and some reward notes are stale; do not treat it as a synchronized export.   |
| [CHARACTERS_DRAFT.md](CHARACTERS_DRAFT.md)                                                                     | Character observations and proposed motives.                                       | Its universal Mossvale hero description is superseded by the four homes. New relationships remain proposals. |
| [STORY_OUTLINE_DRAFT.md](STORY_OUTLINE_DRAFT.md)                                                               | Expanded second-half route and interpretation.                                     | Proposed, including details already adapted into the game.                                                   |
| [SCENES_DRAFT.md](SCENES_DRAFT.md)                                                                             | Scene actions, pressures and consequences.                                         | A staging plan is not proof that every action has been implemented.                                          |
| [DIALOGUE_DRAFT.md](DIALOGUE_DRAFT.md)                                                                         | Draft dialogue through the final form and recovery, with links to its three parts. | It is a writing draft, not automatic approval of its lore.                                                   |
| [ENCOUNTER_DESIGN.md](ENCOUNTER_DESIGN.md)                                                                     | Team-source boss names/concepts and proposed encounter phases.                     | The second-half appendix is non-binding design.                                                              |
| [BOARD_MAGIC_PLAN.md](BOARD_MAGIC_PLAN.md)                                                                     | Current casting contract and its historical corrections.                           | Read the current contract before older rollout notes.                                                        |
| [CAMPAIGN_QA.md](CAMPAIGN_QA.md)                                                                               | What the playable continuation verifies and what it does not.                      | Reachability alone does not prove pacing, balance or complete staging.                                       |
| [story.ts](../src/data/story.ts)                                                                               | Current first-half interludes, visions and Vesper text.                            | Implementation evidence; not permission to override author corrections.                                      |
| [campaignStory.ts](../src/data/campaignStory.ts)                                                               | Current main continuation scenes.                                                  | A playable proposal remains proposed until approved.                                                         |
| [npcs.ts](../src/data/npcs.ts), [mentors.ts](../src/data/mentors.ts), [hometowns.ts](../src/data/hometowns.ts) | Current residents, teacher text and selected-home rules.                           | Technical IDs and map names need not be player-facing language.                                              |

The world bible is the review entry point. The Story Reader is the exact-text
companion. The author decides which proposed material becomes canon; future
updates should record that decision and update the affected scene references.
