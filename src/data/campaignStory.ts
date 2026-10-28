/**
 * The playable continuation of the reviewed second-half script.
 * Tasks and battles, not scene narration, earn their own milestones. These
 * scenes use those saved milestones so interrupted conversations replay safely.
 */
import type { SceneBeat, SceneDef } from './story';
import { CAMPAIGN_FLAGS as C, CAMPAIGN_RECOVERY_FLAG } from './campaignFlags';

const say = (who: string, line: string, stage = ''): SceneBeat => ({
  stage,
  who,
  line: `"${line}"`,
});
const show = (stage: string): SceneBeat => ({ stage: `*${stage}*` });

export const CAMPAIGN_SCENES: readonly SceneDef[] = [
  {
    id: 'campaignThreshold',
    title: 'The inspection stair',
    flag: 'scene:campaignThreshold',
    map: 'overworld',
    requiresFlags: ['wyrmBeaten', 'scene:chapterEnd'],
    sets: [C.descent],
    beats: [
      show(
        'Vale kneels beside the wet tracks. The old man looks from the ward to the empty cloak.',
      ),
      say('hero', 'Vesper?'),
      say('fennick', "Yes. I'm Fennick. I looked after them when they were small."),
      say('guard', 'These prints go straight into stone.'),
      say(
        'fennick',
        "There's a service entrance. Help me shift this.",
        '*Fennick brushes mud from a shallow groove.*',
      ),
      show(
        'You shift the fallen slab. A narrow stair descends beside the main barrier. Fennick reaches for its iron handhold.',
      ),
      say('guard', 'Who keeps the entrance open if you both go?'),
      say('hero', "Do you know what's down there?"),
      say('fennick', "I can read the markings. That's all."),
      say('hero', "Then stay here. I'll bring back what I find."),
      say(
        'fennick',
        'If you find Vesper—',
        '*His hand stays on the iron. He looks at the cloak, then releases it.*',
      ),
      say('fennick', "Tell them I'm here."),
      say('guard', "I'll send a guard with rope. Nobody else takes those stairs yet."),
    ],
  },
  {
    id: 'archiveRefuge',
    title: "Odile's packed belongings",
    flag: 'scene:archiveRefuge',
    map: 'sunkenArchive',
    requiresFlags: [C.descent],
    untilFlag: C.drain,
    beats: [
      show(
        'Odile tightens a blanket around a sleeping resident. Her travel bag stands beside her boots. Water covers the lift landing.',
      ),
      say('hero', 'Is there a road below this?'),
      say('odile', "Behind the shelves. Third step's missing."),
      say('hero', "You're leaving too?"),
      say('odile', "When that lift comes down. I've had the bags ready since yesterday."),
      show('She tests the bell pull. Its cable moves, but the lift does not.'),
      say('hero', "The water's above the lower catch."),
      say(
        'odile',
        "I know. The drain's under that pallet. I can't move it and keep hold of the sluice.",
      ),
      say('hero', 'Where do you need me?'),
      say(
        'odile',
        'On the dry side. Lift the near end first.',
        '*She sets her bag on a high shelf and takes the sluice lever.*',
      ),
    ],
  },
  {
    id: 'archiveDrained',
    title: 'The first stretcher',
    flag: 'scene:archiveDrained',
    map: 'sunkenArchive',
    requiresFlags: [C.drain],
    beats: [
      show(
        'The repaired drain clears the landing. Odile lowers the lift and checks a loaded stretcher against its gate.',
      ),
      say('odile', "That's one trip we can make. Thank you."),
      say('hero', 'What about the road?'),
      say(
        'odile',
        "I'll show you. Bring that ledger off the shelf, will you? It has the old channels in it. Irdrath won't let anyone else touch the gates.",
      ),
      show(
        'The ledger records earlier bearers of the voice: promised rewards, death dates, and orders appointing their replacements. Odile arranges a watcher for the refuge before showing you the cistern road.',
      ),
    ],
  },
  {
    id: 'irdrathCistern',
    title: 'The heat in the pipes',
    flag: 'scene:irdrathCistern',
    map: 'cisternMarches',
    requiresFlags: [C.drain],
    untilFlag: C.trial,
    beats: [
      show(
        'An ash figure stands among the cistern pipes. A red glow pulses beneath his ribs. Before Odile can speak, he presses a smoking hand to a valve.',
      ),
      say('irdrath', 'Back from that joint.'),
      show('Steam spits where Odile was standing. Irdrath lowers the pressure.'),
      say('odile', 'The refuge needs water. Two barrels today.'),
      say('irdrath', 'One.'),
      say('odile', 'That leaves nothing for the people carrying the beds.'),
      say('irdrath', 'Chamber nine is cold. They have not moved in six days.'),
      say('hero', 'We can take them up with the others.'),
      say(
        'irdrath',
        'Not through that channel. Open it and the heat goes with you.',
        '*Ash thickens across the lower gate.*',
      ),
      say('odile', 'The old drain runs outside it. Here. We can test it with the chambers shut.'),
      say(
        'irdrath',
        'Show me the lower catch.',
        '*He bends over the plan. Its edge blackens; he lifts his hand away.*',
      ),
    ],
  },
  {
    id: 'irdrathTrial',
    title: 'A road beyond the fire',
    flag: 'scene:irdrathTrial',
    map: 'cisternMarches',
    requiresFlags: [C.trial],
    untilFlag: C.irdrath,
    beats: [
      show(
        'The trial flow passes through the independent drain. The sleeping chambers stay dry; their heat remains steady.',
      ),
      say('odile', 'No drop. You can feel it yourself.'),
      say('irdrath', 'I keep them warm through the night. Who does that on your road?'),
      say('odile', 'We have blankets. Braziers at the stops. People waiting above.'),
      say('irdrath', 'Then let them wait.', '*Ash closes across the gate.*'),
      show(
        "The carriers bring the first stretcher to the tested channel. Odile checks the blanket over its occupant's feet.",
      ),
      say('irdrath', 'Put that bed back.'),
      say('odile', "The lift is ready. We're going."),
      say('irdrath', 'They stay beside my fire.'),
      say('odile', "They've stayed long enough. Take the head end, please."),
      say(
        'hero',
        'Let them through.',
        '*Irdrath surges toward the catch. You step between him and the stretcher.*',
      ),
      say('irdrath', 'Move.'),
    ],
  },
  {
    id: 'irdrathYielded',
    title: 'Chamber nine next',
    flag: 'scene:irdrathYielded',
    map: 'cisternMarches',
    requiresFlags: [C.irdrath],
    beats: [
      show('Irdrath gathers thinly around the Firstcoal. The crew keeps the transfer moving.'),
      say('irdrath', 'The draught. Keep it off their feet.'),
      say(
        'odile',
        "I've got them. Can you hold that door clear?",
        "*She turns the blanket under the sleeper's heels.*",
      ),
      say(
        'irdrath',
        'Chamber nine next.',
        '*His smoke withdraws from the arch. A stretcher passes through.*',
      ),
      say('odile', "We know. Their bed's on the list."),
      show(
        'Irdrath remains by the open door as Odile calls the next carriers. The maintenance passage is clear.',
      ),
    ],
  },
  {
    id: 'rootwaysRecord',
    title: 'The same promise',
    flag: 'scene:rootwaysRecord',
    map: 'rootways',
    requiresFlags: [C.irdrath],
    untilFlag: C.vesper,
    beats: [
      show(
        'You study the Archive plan beside a stopped tram. Vesper approaches and looks over the open page.',
      ),
      say('vesperDuel', "That's a bell tower. The road runs underneath."),
      say('hero', "You've been there?"),
      say('vesperDuel', "I'd hardly send you ahead of me, would I?"),
      say(
        'hero',
        'I found this with it.',
        '*You place the earlier vessel record beside the plan.*',
      ),
      say('vesperDuel', 'Let me see.', '*They read to the bottom, then return to the first name.*'),
      say('hero', 'The same promise. Both times.'),
      say('vesperDuel', 'And nothing here about how either bearer died.'),
      say('hero', "There's more in the ledger. In my pack. Stay and read it."),
      say(
        'vesperDuel',
        "Keep it dry. I'll want the rest.",
        '*Their hand moves toward the pack, then stops. They leave along the lower road.*',
      ),
    ],
  },
  {
    id: 'ketterStranded',
    title: 'The moving lamp',
    flag: 'scene:ketterStranded',
    map: 'glassWarrens',
    requiresFlags: [C.tram],
    untilFlag: C.rescue,
    beats: [
      show(
        'A call repeats from three passages. Across the lift shaft, a lamp swings beneath a damaged landing. The lift is caught above it.',
      ),
      say('ketter', "Down here! Don't pull that rope—it's frayed through!"),
      show(
        'The lamp moves with the living speaker. The other passages only repeat the sound. The damaged lift needs to be secured before anyone can lower it.',
      ),
    ],
  },
  {
    id: 'ketterRescued',
    title: "Ketter's lamps",
    flag: 'scene:ketterRescued',
    map: 'glassWarrens',
    requiresFlags: [C.rescue],
    untilFlag: C.vesper,
    beats: [
      show(
        'The repaired lift reaches the damaged landing. Ketter climbs aboard, then reaches back for the lamp.',
      ),
      say('ketter', "Nearly left that. Would've heard about it all week."),
      say('hero', 'Who are you signalling?'),
      say(
        'ketter',
        "The carriers. They can't see the lift from the far landings. I'm Ketter. Usually I keep the bells working. Today it's everything else.",
      ),
      say('hero', 'I need to stop a signal going through the next chamber.'),
      say(
        'ketter',
        "Upper branch carries the voice. Lower one feeds our lamps. You'll see the same marks on the handles. Leave the lower one alone.",
      ),
      show(
        'Ketter answers a light across the shaft. A worker on that landing starts a loaded lift.',
      ),
      say('vesperDuel', 'You took your time.', '*Vesper rests a hand on the upper relay handle.*'),
      say('hero', 'Someone was stranded. Move your hand.'),
      say('vesperDuel', 'You know what this does?'),
      say('hero', 'Upper branch for the voice. Lower for the lamps.'),
      say('vesperDuel', 'So you do. Leave it open. I can follow the voice from here.'),
      say('hero', 'We can close it and read the rest together.'),
      say(
        'vesperDuel',
        'You want me to go back with you. Carry a lamp. Wait for orders.',
        '*Their fingers lift from the handle. For a moment neither of you moves.*',
      ),
      say('hero', 'I want you away from that handle.'),
      say(
        'vesperDuel',
        'Stop there.',
        '*You step forward. Vesper draws their weapon and blocks the control.*',
      ),
    ],
  },
  {
    id: 'vesperRetreated',
    title: 'The upper branch closes',
    flag: 'scene:vesperRetreated',
    map: 'glassWarrens',
    requiresFlags: [C.vesper],
    beats: [
      say('hero', 'Vesper. Wait.', '*Vesper retreats toward the far passage, breathing hard.*'),
      show(
        "A lamp on the lowest landing flickers. You secure its feed; Vesper leaves before you turn back. The upper branch closes. Ketter's lights remain on, but the central relay farther below is still active.",
      ),
    ],
  },
  {
    id: 'bellShift',
    title: 'An interrupted supper',
    flag: 'scene:bellShift',
    map: 'bellHollows',
    requiresFlags: [C.vesper],
    untilFlag: C.bells,
    beats: [
      show(
        'A bell strikes twice. Ketter puts down a spoon and answers on a smaller bell. A packed tool roll rests beside a bowl with a skin across its surface.',
      ),
      say('hero', 'You made it back. How is your lift?'),
      say('ketter', "Working, thanks to you. It's the other one now."),
      say(
        'ketter',
        "Lift's stopped between landings. Again.",
        '*Three quick strikes. Ketter listens, then answers once.*',
      ),
      say('hero', "Who's on it?"),
      say(
        'ketter',
        "Two from the east works. They've been waiting for supper longer than I have. Hold this cord. I'll show you where it's caught.",
      ),
    ],
  },
  {
    id: 'bellRelief',
    title: 'The missing return',
    flag: 'scene:bellRelief',
    map: 'bellHollows',
    requiresFlags: [C.bells],
    beats: [
      show(
        'The repaired circuit carries a clear signal. A worker takes the bell while Ketter tests it from the landing.',
      ),
      say('ketter', 'Two for hold. One for—'),
      show(
        'The worker answers correctly. "I know. You\'ve told me every shift this week." Ketter\'s hand stops short of the cord.',
      ),
      say('ketter', 'Right. You have it.'),
      say('hero', 'You can show me the relay now?'),
      say(
        'ketter',
        "These came from Fennick. Take them too. They wanted measurements we couldn't get while the lower bells were running.",
        '*Ketter opens a drawer of plans and letters.*',
      ),
      show(
        'One letter shows the surface ward stations. A line marked "lower return" ends at a blank space. Ketter lays it beside the relay plan.',
      ),
      say('hero', 'And now?'),
      say('ketter', "Now someone's got to go down and look."),
      say(
        'ketter',
        "Give me a moment. I'm finishing this outside.",
        '*They pick up their tool roll, then the bowl.*',
      ),
    ],
  },
  {
    id: 'lishalRefusal',
    title: 'The seven singers',
    flag: 'scene:lishalRefusal',
    map: 'quietFoundry',
    requiresFlags: [C.bells],
    untilFlag: C.procedure,
    beats: [
      show(
        'Seven singers stand around a great sounding frame. One binds a burned hand, another brings food, another rolls out bedding. The others tend the machinery and its seven crystal sockets.',
      ),
      say(
        'lishal',
        'Sit here. Your hand will swell if you keep using it.',
        '*The first singer holds a bandage.*',
      ),
      show('The worker pulls on their coat. "I\'ve a cart outside. I\'ll eat on the way."'),
      say(
        'lishal',
        "Your meal's ready. Leave the cart a while.",
        '*The fourth singer turns from the machinery.*',
      ),
      say('ketter', 'That our repair box? The one under the bench?'),
      show(
        'The fourth singer slides it across. Ketter checks the tools. The worker thanks the first singer, then asks for their coat.',
      ),
      say('lishal', "There's a bed behind the curtain.", '*The third singer unfolds a blanket.*'),
      show(
        '"You told us about the sleep. I heard you. I don\'t want it." The first singer keeps hold of the bandage.',
      ),
      say(
        'lishal',
        'They understand. Let them take the coat.',
        '*The sixth singer steps away from the frame.*',
      ),
      show(
        'The fourth turns a catch beside the door. The third pulls bedding across the passage; the second blocks the other exit. The sixth looks at the catch, then returns to the frame.',
      ),
      say(
        'lishal',
        'Close the outer doors. Bring the beds through.',
        '*All seven voices sound together.*',
      ),
      say('hero', 'Ketter. The loading door.'),
      show(
        "Ketter wedges the door with the repair box. A falling shutter strikes a worker's leg. The seventh singer reaches toward them, then draws back to keep their place at the crystals.",
      ),
      say(
        'ketter',
        'Leave it. Arm round my shoulder. Can you manage that?',
        '*The worker points back at the repair box. Ketter helps them through the opening.*',
      ),
      show(
        'The sixth singer adds their voice to the others. The frame turns faster. Beyond it lies the inspection gallery and the missing lower return.',
      ),
    ],
  },
  {
    id: 'vesperAcceptance',
    title: 'A way out',
    flag: 'scene:vesperAcceptance',
    map: 'quietFoundry',
    requiresFlags: [C.procedure],
    sets: [C.accepted],
    beats: [
      show(
        "The copied inspection diagram completes the lower return in Fennick's letter. Across the moving frame, Vesper stands on a far platform.",
      ),
      say('vesperDuel', 'Listen to it. Seven voices, and they can barely carry a whisper.'),
      show('The voice comes from the stone: "You need not wait for them."'),
      say('vesperDuel', 'I have waited quite enough.'),
      show(
        'Light spreads beneath Vesper\'s feet. "Take my voice with you. The stones will answer you wherever you go."',
      ),
      say('hero', "Vesper. I've got the bridge."),
      show(
        "You lower the footbridge outside the turning frame. A warning bell sounds below: the loading shutter is falling across the workers' exit. You catch its brake and hold it.",
      ),
      say('vesperDuel', 'You found a way across.'),
      say('hero', 'Come over.'),
      say(
        'vesperDuel',
        'And let you shut all this away?',
        '*Vesper takes one step toward the bridge. You can see the cut left by the duel.*',
      ),
      say('hero', 'You read the same names I did. The other vessels.'),
      say('vesperDuel', 'I read every one.'),
      show(
        "The frame passes between you. Vesper's fingers close around the rail. When it passes again, they have let go.",
      ),
      say('hero', 'Vesper?'),
      say('vesperDuel', "No. I'm staying."),
      say('vesperDuel', 'Let me hear it. All of it.', '*They turn toward the light.*'),
      show(
        'Light climbs their arms. The bells sound with their next breath. They stagger once, then straighten.',
      ),
      say('vesperDuel', 'I can hear the surface.'),
      show(
        'Vesper leaves by the marked service ascent. You keep hold of the shutter brake until Ketter signals that the last worker is clear.',
      ),
      say('ketter', 'Lift calls are still coming through. Try the other handle.'),
      show(
        'You disconnect the branch feeding the great frame. The small lift bell answers. Seven colours fade from the machinery.',
      ),
      say('lishal', 'Put it back.', '*The fourth singer steps toward the control.*'),
      say('hero', 'The lifts are working. Your people are out.'),
      say(
        'lishal',
        "They won't stay out. They'll tire. They'll be hurt.",
        '*The first singer takes the loose drive handle.*',
      ),
      say('ketter', "They'll send for help. Like they did today."),
      say(
        'lishal',
        'The rooms are empty.',
        '*The sixth singer catches the handle and holds it still.*',
      ),
      say('lishal', 'There are others above.', '*The fourth singer points toward the ascent.*'),
      say(
        'lishal',
        'Begin again.',
        '*The sixth fits the handle into the manual drive. All seven resume their places.*',
      ),
    ],
  },
  {
    id: 'lishalSilenced',
    title: 'The local bell',
    flag: 'scene:lishalSilenced',
    map: 'quietFoundry',
    requiresFlags: [C.lishal],
    beats: [
      show(
        'The sounding frame falls still. Its seven singers can no longer reach the relay. The local lift bell remains lit.',
      ),
      say('ketter', "There. Hear that? Someone's reached the upper landing."),
      show(
        'The copied return procedure is safe in your pack. Vesper has taken the voice beyond the relay; the service ascent leads toward Sevenstones.',
      ),
    ],
  },
  {
    id: 'ascentLanding',
    title: 'People use the road',
    flag: 'scene:ascentLanding',
    map: 'upwardRoad',
    requiresFlags: [C.lishal],
    untilFlag: C.ascent,
    beats: [
      show(
        'A fallen beam blocks the lift. Odile waits beside two bearers holding a sleeper on a blanket.',
      ),
      say('odile', "Set her down. Both of you. The floor's dry here."),
      say('hero', 'Vesper came this way?'),
      say('odile', "Straight through. Didn't stop."),
      say(
        'ketter',
        "I need someone on the wheel. I'll have to get underneath.",
        '*Ketter sets a jack beneath the beam.*',
      ),
      say('odile', 'I can turn it.'),
      say('ketter', 'You need to keep the landing clear.'),
      say('hero', 'Tell me when.', '*You take the wheel. Odile moves the waiting group back.*'),
    ],
  },
  {
    id: 'ascentOpened',
    title: 'The violet stone',
    flag: 'scene:ascentOpened',
    map: 'upwardRoad',
    requiresFlags: [C.ascent],
    beats: [
      show(
        'The repaired lift cable runs freely. A relief operator answers from below and starts the lift correctly. Ketter stops before giving another instruction.',
      ),
      say('ketter', "Good. They've got it."),
      show(
        'Odile directs the first bearers aboard. A courier descends the stairs, shielding a lamp. "Is the road open? Fennick sent me. The violet stone\'s going dark."',
      ),
      say('hero', "We're coming."),
      say('odile', 'Go on. We can move them now.'),
      show(
        "She takes a bearer's place while they rest. Ketter stays to guide the next lift. The return road to Sevenstones is open.",
      ),
    ],
  },
  {
    id: 'campaignReturn',
    title: 'The clear passage',
    flag: 'scene:campaignReturn',
    map: 'overworld',
    requiresFlags: [C.ascent, C.accepted, C.procedure],
    untilFlag: C.complete,
    sets: [C.returned],
    beats: [
      show(
        'Fennick has laid the recovered pages across a workbench. The brass lantern sits beside an oil lamp. The violet stone pulses dimly overhead.',
      ),
      say('fennick', 'You saw Vesper?'),
      say('hero', 'At the relay. I opened a way out for them.'),
      say('fennick', 'Show me.'),
      say(
        'hero',
        'Here. It was clear all the way to the steps.',
        '*You trace the passage on the plan.*',
      ),
      say('fennick', 'Could they see it from where they were?'),
      say('hero', 'They looked at it. Then they went back to the voice.'),
      say(
        'fennick',
        'And you were close enough to hear them?',
        "*Fennick's finger remains on the steps.*",
      ),
      say('hero', 'Yes.'),
      say(
        'hero',
        'I brought the rest of the procedure.',
        '*You set the remaining pages down without covering the plan.*',
      ),
      say('fennick', 'Leave it there. Please.'),
      say(
        'fennick',
        "Find Vale. We can't do this with two people.",
        '*Fennick starts to read, then catches your sleeve as you turn toward the stones.*',
      ),
    ],
  },
  {
    id: 'hareguyVisit',
    title: "Pete's upstairs room",
    flag: 'scene:hareguyVisit',
    map: 'brightwater',
    requiresFlags: [C.returned],
    untilFlag: C.complete,
    beats: [
      show(
        'Pete takes you upstairs. Hareguy is still asleep, with a watch volunteer beside his bed. You stay long enough to see his breathing, then leave a message for Rowan with Pete.',
      ),
    ],
  },
  {
    id: 'rowanReturn',
    title: 'The dry offcut',
    flag: 'scene:rowanReturn',
    map: 'mossvale',
    requiresFlags: [C.returned, 'scene:hareguyVisit'],
    untilFlag: C.complete,
    beats: [
      say('elder', 'My boy?', '*Rowan puts down his rasp before you have crossed the yard.*'),
      say('hero', "Still asleep. Pete's keeping someone with him."),
      say('elder', 'Did you see him yourself?'),
      say('hero', 'Yes. Before I came here.'),
      say(
        'elder',
        'Has Pete been charging for the room?',
        '*He picks up the rasp, then puts it down again.*',
      ),
      say('hero', "I didn't ask."),
      say('elder', "There's coin in the jar under the nails. Take it to him."),
      say('elder', 'Who cut these wedges?', '*You show him the station-frame sketch.*'),
      say('hero', "We haven't made them yet."),
      say('elder', "Good. Leave the sketch. Those'll split if you cut them that way."),
      say('hero', "You don't have to come to Sevenstones."),
      say('elder', "I'd slow you down. Fetch that offcut instead. The dry one."),
    ],
  },
  {
    id: 'mossvaleSupplies',
    title: 'A share of the harvest',
    flag: 'scene:mossvaleSupplies',
    map: 'mossvale',
    requiresFlags: [C.returned],
    untilFlag: C.rite,
    beats: [
      show('Bean spreads herbs over a sheet. Ordor waits beside a loaded handcart.'),
      say('farmer', "That bundle's for the inn. Mind you don't mix them."),
      say('hero', 'How much can you spare for Sevenstones?'),
      say(
        'farmer',
        "These. I'll have to cut again tomorrow.",
        '*She counts three bundles, hesitates over the fourth, and leaves it on the sheet.*',
      ),
      say('stallKeeper', "Put them on top. I've got lamp oil under there."),
      say('hero', 'What do I owe you for the cart?'),
      say(
        'stallKeeper',
        "Bring it back with both wheels. We can settle the oil when someone's had time to count it.",
      ),
      say(
        'farmer',
        "And leave him enough room to pull it. You keep stacking things like you're the one taking them up the hill.",
        '*You reach for another crate. Ordor rearranges one already aboard.*',
      ),
    ],
  },
  {
    id: 'campaignRite',
    title: 'The lantern answers',
    flag: 'scene:campaignRite',
    map: 'overworld',
    requiresFlags: [C.returned, C.rite],
    untilFlag: C.complete,
    sets: [C.wardReady],
    beats: [
      show(
        'The completed station frames surround the ward. Volunteers carry supplies from the watch. At each stone, a helper steadies the frame while Fennick checks the recovered sequence.',
      ),
      {
        ...say(
          'torva',
          'Look at that. Not a shake. Must be you, spark.',
          '*Her hands are steady on the red stone.*',
        ),
        requiresMentor: 'torva',
      },
      {
        ...say(
          'maren',
          "The lake cleared the day you went down. I've been waiting at this stone ever since, love.",
        ),
        requiresMentor: 'maren',
      },
      {
        ...say('rook', "Stone's dark, sky's dark, and you're late! Ha! Light it with me."),
        requiresMentor: 'rook',
      },
      {
        ...say(
          'hazel',
          "Grey moss all the way up the stone. We'll grow it back, sprout. We always do.",
        ),
        requiresMentor: 'hazel',
      },
      {
        ...say(
          'dorn',
          'You came back up. I said you would. Hold the lamp while I steady the stone.',
        ),
        requiresMentor: 'dorn',
      },
      {
        ...say(
          'kestrel',
          "Every village sent a letter, and they all say the same thing: 'Is the hero back?' Yes. Yes, they are.",
        ),
        requiresMentor: 'kestrel',
      },
      {
        ...say(
          'selene',
          'The violet stone went first, and it will go last. Hold it with me, one more time.',
        ),
        requiresMentor: 'selene',
      },
      say('hero', "There. That's your lantern.", '*You point to the copied procedure.*'),
      say(
        'fennick',
        "I've been putting it beside the ward. It belongs in the ring.",
        '*Three notches beneath the tarnish match the drawing.*',
      ),
      say('hero', 'Shall I take it in?'),
      say('fennick', 'Here first. Make a small one.'),
      say(
        'ketter',
        "That corner's moved.",
        '*You set the lantern inside a chalk circle. Ketter presses the nearest frame; it rocks.*',
      ),
      say('fennick', 'I checked it.'),
      say(
        'fennick',
        'Show me.',
        '*Fennick crouches beside Ketter. They replace a wedge and reseat the frame.*',
      ),
      show(
        'The test sequence closes. Pale light gathers inside the wickless lantern. A thread brushes the chalk and bends back. You step across the circle and out; the light stays within. Fennick ends the test.',
      ),
      say('fennick', 'Ketter, will you check the others?'),
      say('ketter', 'All of them?'),
      say('fennick', 'Please.'),
      say('hero', 'If Vesper falls, the voice will try to leave again.'),
      say(
        'fennick',
        "The records say the voice can't cross the ring. That light stayed put when you walked out.",
      ),
      say('guard', "And if Vesper doesn't fall?"),
      say(
        'fennick',
        "Then they're still carrying it. We keep the stations manned and give the watch time to get everyone else away.",
      ),
      show(
        'Vale assigns the evacuation route to a guard. Fennick places the lantern in its seat at the outer ring. Ketter checks the last frame. When the stations report ready, the inner ward entrance opens.',
      ),
    ],
  },
  {
    id: 'malificatRisen',
    title: 'Vesper, the Malificat',
    flag: 'scene:malificatRisen',
    map: 'innerWard',
    requiresFlags: [C.wardReady],
    untilFlag: C.malificat,
    beats: [
      show(
        "Light moves beneath Vesper's skin. Their shape stretches as seven streams draw together. They watch their hand open, then turn it toward you.",
      ),
      say('malificat', 'You should have stayed to watch.'),
      say('hero', 'The stones are going dark.'),
      say('malificat', "I know. I'm drawing on all seven."),
      show(
        'Vesper studies you with the same searching tilt of the head. A second voice speaks first: "The outer ring. Break it."',
      ),
      say(
        'malificat',
        'Fennick?',
        '*Fennick looks up from the lantern without leaving the outer station.*',
      ),
      show(
        'Vesper steps toward the entrance. A loose strand of light strikes the boundary and recoils.',
      ),
      say('malificat', 'What have you done?'),
      say('hero', "The voice can't leave this chamber."),
      say(
        'malificat',
        'You think you can take it from me.',
        '*Vesper looks down at the light inside their hand. They close it. The Malificat unfolds fully.*',
      ),
    ],
  },
  {
    id: 'malificatFallen',
    title: 'The voice remains',
    flag: 'scene:malificatFallen',
    map: 'innerWard',
    requiresFlags: [C.complete],
    beats: [
      show(
        'The current between the stones and Vesper breaks. Their altered shape collapses. A voice strikes the boundary and comes back from every wall. Vesper lies breathing, without the light.',
      ),
      show(
        '"Vesper." The voice calls from the chamber. Vesper tries to lift a hand; nothing gathers in it. Outside, Fennick starts forward.',
      ),
      say(
        'guard',
        'Wait. Let us check it.',
        '*Vale puts an arm across the entrance. Fennick stops.*',
      ),
      show(
        'The watch holds the approach while Vesper is carried beyond the boundary. The voice remains behind. Only after everyone is out do the stations close the inner ward.',
      ),
    ],
  },
  {
    id: 'campaignRecovery',
    title: 'Getting someone home',
    flag: CAMPAIGN_RECOVERY_FLAG,
    map: 'innerWard',
    to: { map: 'overworld', x: 18, y: 19 },
    requiresFlags: [C.complete, 'scene:malificatFallen'],
    beats: [
      show(
        'Outside the ward, Vesper lies on a watch blanket. Fennick kneels beside them, reaches toward their hand, then folds the blanket around their shoulder instead.',
      ),
      say('vesperDuel', "Don't."),
      say(
        'fennick',
        "There's water when you want it.",
        '*Fennick withdraws their hand and sets a cup within reach.*',
      ),
      say('guard', "We have a room ready. They'll stay under guard."),
      show('Fennick nods. No one asks the people Vesper harmed to forgive them.'),
      show(
        'Word reaches Sevenstones from Brightwater: the remaining sleepers are beginning to wake. Pete sends a note that Hareguy has asked for breakfast. A courier sets out to tell Rowan.',
      ),
      show(
        "In the refuge's new lodging, Odile puts her own things on a shelf before taking a blanket to someone just waking. At Ketter's workshop, another worker answers the next signal correctly. Ketter listens from the doorway, then goes out without correcting them.",
      ),
      show(
        "Mossvale's doors begin to open. Water is drawn; a cart is made ready for Brightwater. Recovery will take time, but ordinary journeys are possible again.",
      ),
    ],
  },
  {
    id: 'mossvaleRecovery',
    title: 'Breakfast and tomorrow',
    flag: 'scene:mossvaleRecovery',
    map: 'mossvale',
    requiresFlags: [C.complete, CAMPAIGN_RECOVERY_FLAG],
    beats: [
      show("Rowan sits among unused offcuts with Pete's note in his hands. He reads it twice."),
      say('elder', "He's asked for breakfast."),
      say('hero', 'Pete says he ate it, too.'),
      show('Rowan starts to stand. His knee catches; he swears, grips the bench, and waits.'),
      say('hero', "There's a cart going to Brightwater in the morning."),
      say('elder', "I'll be ready."),
      show(
        'He puts the note in his coat, takes it out, and reads the last line again. Nearby, Pip has added another tier to his tower. His mother calls from the house.',
      ),
      say('kid', "It's not stuck! I just wanted you to see it before supper."),
      show('You stay to look. The village goes on around you.'),
    ],
  },
];
