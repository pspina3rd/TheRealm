import { VESPER_LINES } from './story';
import { CAMPAIGN_NPCS } from './campaignNpcs';
import type { ChallengeSpec, NpcDef } from './types';

/** Innkeeper Pete on Rowan's son (the script's Refusal), among his greetings. */
export const HAREGUY =
  "Rowan's boy is upstairs. Three weeks asleep. Breathes fine. Just won't wake.";

/**
 * Every NPC in the game. Each has a real need, the challenge is doing that
 * task, and the reward follows from it (see "NPCs and attitude" in
 * docs/GAME_DESIGN.md). Challenge kinds:
 * - offering: hand over an item, paid for with points (like MP for a spell)
 * - barter:   trade crystals of specific colours
 * - haggle:   a price duel that opens a shop
 * - puzzle:   a preset board with a fixed set of pieces
 */
export const NPCS: Readonly<Record<string, NpcDef>> = {
  ...CAMPAIGN_NPCS,
  // ---------------------------------------------------------- Mossvale ---
  elder: {
    id: 'elder',
    name: 'Elder Rowan',
    sprite: 'char.038',
    element: 'earth',
    lines: {
      intro: {
        cold: [
          "You're blocking my light, stranger. If you're here to stare at a dry well, do it somewhere else.",
          "Unless you brought a ladder and a long wire brush, I don't have much to say to you.",
        ],
        plain: [
          'Purple scum’s back in the shaft. Tastes like pennies and ruins the tea. I’d climb down myself, but my knees give out past the third rung.',
          'Ever seen well-water turn violet overnight? Means the deep mold is creeping up again. Nasty stuff.',
        ],
        warm: [
          "Ah, good. A young set of shoulders. Take a look down there—the mold's choking the main pipe again, but seeing you gives me half a mind to think we can fix it.",
          'Pull up a stool, kid. Well’s acting up, but at least the company’s improved.',
        ],
      },
      confide: {
        cold: "You've got a mean look to you, but you aren't stupid. That mold in the water? It isn't pond rot. It's coming up from the deep caves.",
        plain: [
          'Forty years ago I hit granite trying to dig this hole. Had to crack the rock with a rune stone I found in the dirt. Still keep it on the mantle.',
          "Truth is, the spores aren't just here. Hazel says her meadows are going pale too. Something’s turning underneath us.",
        ],
        warm: '*Rowan glances down the shaft and lowers his voice.* "Forty years back I hit rock digging this well and cracked it with that old stone. Something breathed down there. I\'ve wondered ever since if I let it out. Clear the shaft, and take my last Ether for the road."',
      },
      refuse: {
        cold: [
          'I’ll drink mud before I let you mess around with my timbering.',
          'Walk off. I’ve dealt with stubborn wells before, and I’ll deal with this one without you.',
        ],
        plain: [
          "Thanks, but no. I know every loose brick in this pit, and I'd rather not have a stranger knocking them loose.",
          'Appreciate it, but I’ll scrape it myself when my boy gets back from town.',
        ],
        warm: "Don't you worry about an old man's bucket, traveler. You've got bigger roads to walk.",
      },
      accept: {
        cold: "Don't touch the iron winch. It's rusted through and it'll snap your wrist.",
        plain: [
          'Work from the outside in. If you smash the center clusters first, the whole bloom drops into the drinking supply.',
          'Watch your eyes. That dust stings like hell if it gets under your eyelids.',
        ],
        warm: 'Take your time down there. The stone’s old, but it holds if you treat it right.',
      },
      decline: {
        cold: "Right. Didn't think so.",
        plain: [
          "Guess I'm fetching the long rake then.",
          "No harm done. We've still got a barrel of rain-catch out back.",
        ],
        warm: "Catch you later then. Don't be a stranger!",
      },
      win: {
        cold: [
          'Huh. It’s running. Here’s your coin—now get going before something else breaks.',
          "Look at that. Didn't cave in after all. Take your cut.",
        ],
        plain: [
          'Hear that sloshing? That’s clean water, pure and simple. Here—take the old rune stone like I promised. Better in your hands than gathering dust.',
          'First bucket’s clean! Tastes like sweet granite. You earned your pay today, kid.',
        ],
        warm: [
          'Listen to that flow! Like mountain runoff! I owe you big for this—take the Focus Stone, and you drink free in Mossvale as long as I’m breathing.',
          "Ah, you're a miracle worker! The whole street’s gonna be washing their faces tonight!",
        ],
      },
      winKnown: {
        cold: "Water's clear. You already know how to shake the earth, so take this raw stone from the first dig instead.",
        plain:
          "The spring's back! Since you're already familiar with the Quake spell, take a piece of the original quartz vein as a reward.",
        warm: "Pure water again! You're already a master of the earth magic, so keep this raw well-stone—a little piece of Mossvale history for your journey!",
      },
      lose: {
        cold: 'Great. Now the water’s purple *and* full of gravel. Get out of the way.',
        plain: [
          "Dammit. Crumbled the outer ring, didn't you? Let the sediment settle and we’ll try again.",
          'No go. That mold’s rooted deeper than I thought.',
        ],
        warm: "Ah, don't beat yourself up over it. That stone’s trickier than it looks. Take a breather.",
      },
      done: {
        cold: "Water's running. We're square.",
        plain: [
          "Cold, clear, and doesn't taste like copper anymore. Can't ask for much else.",
          'Winch is holding up fine. Thanks again.',
        ],
        warm: [
          "Every time I fill a kettle, I think of you! Stop by anytime you're passing through Mossvale.",
          'Hearth’s always warm for you here, kid.',
        ],
      },
    },
    // The spore field over the well: spores (green) and the well's stones.
    challenge: {
      kind: 'puzzle',
      rows: ['nnn..nnnnn', 'nn#..nnnnn', 'n.nnnn#nnn'],
      queue: ['O', 'I'],
      linesToClear: 3,
    },
    rewards: [
      {
        kind: 'spell',
        spellId: 'quake',
        // His rune stone, the Focus Stone, is given in the Refusal instead.
        instead: { kind: 'gil', amount: 40 },
      },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    // His last Ether, as his Devoted confidence says.
    secret: { kind: 'item', itemId: 'ether', count: 1 },
    // Said only until he gives his stone away in the Refusal: "Still keep it
    // on the mantle".
    saidUntil: {
      flag: 'scene:refusal',
      lines: [
        'Forty years ago I hit granite trying to dig this hole. Had to crack the rock with a rune stone I found in the dirt. Still keep it on the mantle.',
      ],
    },
    // He gives his rune stone in the Refusal now, so the well pays coin:
    // the lines handing over a stone are no longer said.
    unsaid: [
      'Hear that sloshing? That’s clean water, pure and simple. Here—take the old rune stone like I promised. Better in your hands than gathering dust.',
      'Listen to that flow! Like mountain runoff! I owe you big for this—take the Focus Stone, and you drink free in Mossvale as long as I’m breathing.',
      "Water's clear. You already know how to shake the earth, so take this raw stone from the first dig instead.",
      "The spring's back! Since you're already familiar with the Quake spell, take a piece of the original quartz vein as a reward.",
      "Pure water again! You're already a master of the earth magic, so keep this raw well-stone—a little piece of Mossvale history for your journey!",
    ],
    repeatable: false,
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer Bean',
    sprite: 'char.025',
    element: 'nature',
    lines: {
      intro: {
        cold: [
          "Watch where you place those boots! The blight took half my crop already; I don't need you tramping on the rest.",
          "If you're looking for hand-outs, keep walking. My beds are bare.",
        ],
        plain: [
          "Look at these rows—pale as bone. The blight took the sweet-leaf overnight. Help me seed green crystals into the soil and we'll split the yield.",
          "Ground's went sour. Needs green mana to wake the sprouts up again. Care to do some planting?",
        ],
        warm: [
          "Ah, hello dear! You caught me at a bad time—the blight got into my herb beds. Lend a hand with the seeding and I'll make sure you leave with a full satchel?",
          "Always a pleasure! Soil's stiff today, but a bit of good green energy will set these sprouts right.",
        ],
      },
      confide: {
        cold: "You've got dirt on your hands, but at least you work. Don't tell Ordor: the rot isn't weather. It's coming up through the root lines from the deep caves.",
        plain: [
          "Don't tell Ordor, but I braid charms from the very first sprouts that take. Help me replant these beds and I'll weave one for your pack.",
          'Hazel says the grove roots are bleeding sap down south. Something down in the dark is poisoning the soil.',
        ],
        warm: "You've got a gentle touch with the sprouts, love. Replant these rows and I'll give you a Grove Charm I braided from the first harvest.",
      },
      refuse: {
        cold: [
          "I'd rather let the weeds win than have you tramping through my garden.",
          'Hands off my seed bags. Move along.',
        ],
        plain: [
          "My beds, my seed. I'll tend them myself when the sun dips.",
          'Thanks, but no. Soil needs patience, not clumsy hands.',
        ],
        warm: "Oh, don't worry your head over my little garden, dear. I'll get it sorted.",
      },
      accept: {
        cold: "Green crystals only, and drop them deep into the furrow. Don't waste 'em.",
        plain: [
          'Space them evenly in the rows, mind. Give the roots room to breathe.',
          "Soft touch now—don't smother the shoots before they wake.",
        ],
        warm: "Just tuck them gently into the black dirt, love. They'll do the rest.",
      },
      decline: {
        cold: "Right. Weeds won't pull themselves anyway.",
        plain: [
          'Suit yourself. The soil waits for no one.',
          "No matter. I'll go fetch my hand-spade.",
        ],
        warm: "Take care out there, dear! Come back when you've a mind to garden.",
      },
      win: {
        cold: [
          "Hmph. They took. Here's your share—now out of my garden.",
          'Roots caught hold. Take your bundle and go.',
        ],
        plain: [
          "Look at that green come up! First cut's yours—take a good bundle for the road.",
          "Soil's rich again! Here's your share of the sweet-leaf.",
        ],
        warm: [
          'Oh, look at them bloom! Beautiful! Take a generous bundle, love, and my blessings!',
          "You've got a farmer's heart! Take these fresh herbs—they'll keep you hale on the road.",
        ],
      },
      lose: {
        cold: 'Too thin! You drowned the seed. Get out.',
        plain: [
          "Planted 'em too shallow. The birds'll have 'em before dusk. We'll have to re-plow.",
          "No growth. The blight's still holding the dirt.",
        ],
        warm: "Ah, don't fret, love. Soil can be stubborn. We'll turn the bed and try again.",
      },
      done: {
        cold: "Beds are green. That's all that matters.",
        plain: [
          'Herbs are growing lush again. Smells like spring.',
          'Rows are holding strong. Thanks for the hand.',
        ],
        warm: [
          "Come by anytime you need fresh herbs, dear! You're always welcome in my garden.",
          'The first cut is always reserved for you!',
        ],
      },
    },
    challenge: { kind: 'barter', wants: { green: 7 }, pieceLimit: 21 },
    rewards: [{ kind: 'item', itemId: 'herb', count: 2 }],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'groveCharm', count: 1 },
    repeatable: true,
  },
  kid: {
    id: 'kid',
    name: 'Pip',
    sprite: 'char.040',
    element: 'wind',
    lines: {
      intro: {
        cold: [
          "Mum said if I talk to strangers I won't get any pudding... but my crystal tower's all jammed up and I can't reach the top!",
          "Are you gonna scold me? I didn't break it on purpose! The wind pieces just got stuck!",
        ],
        plain: [
          "Hey! Look at this! I built it all the way up to my shoulder, but then the cyan piece fell sideways and now the whole thing won't spin!",
          "My crystal tower's jammed and Mum says I have to fix it before supper or no pudding! Help?",
        ],
        warm: [
          "Hi hi! Look! I made a huge one this time! But Mum says if I don't fix the stuck piece before supper I have to eat cabbage. Help me? Please?",
          "Yay, you're back! Look look look, I tried to make it reach the sky but it got tangled!",
        ],
      },
      confide: {
        cold: "If you help me fix it and don't tell Mum I was playing with her blue glass, I'll show you where the shiny rock in the cellar is.",
        plain: [
          'Psst. Clear it and you can have my lucky charm! It makes kites fly super high!',
          "I saw a spooky shadow person near the ruined tower last night... but if you fix my tower I'll give you my best charm!",
        ],
        warm: "I found a weird glowing charm under the porch! Mum doesn't know about it. Fix my tower and it's yours!",
      },
      refuse: {
        cold: [
          "No! Mum says you're mean! Go away or I'll throw a clod of dirt at your boots!",
          "I'm not talking to you! You look like a goblin!",
        ],
        plain: [
          "Nah, I'll do it myself. You'll just drop the pieces.",
          "Mum says you're trouble. I'm going inside.",
        ],
        warm: "It's okay, I wanna try to figure it out by myself first so I can show Mum!",
      },
      accept: {
        cold: 'Two lines! It has to be two cyan lines or it falls over!',
        plain: [
          'Make two lines! Cyan ones! Watch out for the top block!',
          "Spin the middle part first! That's where it stuck!",
        ],
        warm: 'Yay! Two lines, two lines! Make it glow real bright!',
      },
      decline: {
        cold: "Fine! I'll tell Mum you were staring at me!",
        plain: ['Aw. No pudding for me, then.', "Guess I'll just kick it over..."],
        warm: "Aw, okay. Don't forget to come back before supper!",
      },
      win: {
        cold: ['Oh. Thanks. Have my Ether stone, I guess.', "You fixed it. Don't tell my Mum."],
        plain: [
          'Supper saved! Have my Ether, I found it in the cellar behind the woodpile!',
          'It spins! Look at it spin! Here, take this shiny stone I saved!',
        ],
        warm: [
          "Supper saved! Pudding time! Have my Ether—it's my absolute best treasure!",
          "You're the coolest ever! Look how high it goes now!",
        ],
      },
      lose: {
        cold: "It's worse now! Mum's gonna ground me forever!",
        plain: [
          "Oh no, it sags! Mum's gonna see it from the kitchen!",
          'Aaaah, the pieces are falling!',
        ],
        warm: "Uh oh... don't worry, we can build it again before the sun goes down!",
      },
      done: {
        cold: "Tower's fine. Go away before Mum sees you.",
        plain: [
          "Tower's clean! Mum didn't even notice it was stuck.",
          "It's still spinning! Watch!",
        ],
        warm: [
          "I'm building a taller one tomorrow! You can help me make it reach the roof!",
          'Hi friend! Look how stable it is now!',
        ],
      },
    },
    challenge: {
      kind: 'puzzle',
      rows: ['###...####', '####.#####'],
      queue: ['I', 'T'],
      linesToClear: 2,
    },
    rewards: [{ kind: 'item', itemId: 'ether', count: 1 }],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'windCharm', count: 1 },
    repeatable: false,
  },
  stallKeeper: {
    id: 'stallKeeper',
    name: 'Shopkeeper Ordor',
    sprite: 'char.002',
    element: 'nature',
    lines: {
      intro: {
        cold: [
          "Prices are on the slate. Don't bother asking for a discount unless you've got real coin.",
          'Buying something or just leaning on my counter? Time is money, friend.',
        ],
        plain: [
          'Herbs from Bean, iron from the coast, charms from the road. Settle on a price and we both eat tonight.',
          "Fresh stock in today! Haggle me fair and I'll open the good sacks.",
        ],
        warm: [
          "Ah, my favorite traveler! Step up, step up! For you, I'm feeling generous—let's play a little game for the prices!",
          "Look who it is! Come inspect the goods—I'll treat you right on the figures today.",
        ],
      },
      confide: {
        cold: "Look, you've got a harsh bite, but I respect coin. I keep a lockbox under the counter for people who mean business.",
        plain: [
          "For you? I'll slide open the box under the counter. Rare stuff from the ruins. Haggle first, for form's sake.",
          "Word is the barges aren't coming up-river anymore... something's blocking the lake. What I have on the rack is all that's left.",
        ],
        warm: "Between friends? I keep the ancient charms under the floorboards. Haggle me down and I'll let you take your pick.",
      },
      refuse: {
        cold: [
          "Stall's shut to your kind. Keep moving.",
          'Not selling to you today. Go bother someone else.',
        ],
        plain: [
          "No deal. Come back when you've got a better tone.",
          "Stall's closed for the afternoon.",
        ],
        warm: 'Ah, not feeling the market today? No worries at all, friend.',
      },
      accept: {
        cold: 'Make your offer. Fast.',
        plain: ["Name your price, but don't insult me.", "Let's see your silver."],
        warm: 'Go on then, give me your best offer!',
      },
      decline: {
        cold: 'Your loss. Someone else will buy it.',
        plain: ['Market waits for no man.', "Come back when you're ready to trade."],
        warm: "Fair enough! Fire's lit whenever you want to browse!",
      },
      win: {
        cold: ['Hmph. Fine. Take it and go.', "Drive a hard bargain. Here's your gear."],
        plain: [
          'Fair deal! Pleasure doing business with you.',
          'Done! Take a look at the full selection.',
        ],
        warm: [
          'Ah, you bested me! Take the goods, my friend, and my thanks!',
          "A master bargainer! Here's the best stock in Mossvale!",
        ],
      },
      lose: {
        cold: 'Ha! Not a chance. Full price or move along.',
        plain: [
          "Lost your nerve? Come back when you've got real silver.",
          'No sale at that rate, friend.',
        ],
        warm: "Ah, close! We'll strike a deal next time.",
      },
    },
    challenge: { kind: 'haggle', pieceLimit: 8, rivalIntervalMs: 2500 },
    rewards: [{ kind: 'shop', shopId: 'mossvaleStall' }],
    repeatable: true,
  },

  // -------------------------------------------------------- Brightwater ---
  merchant: {
    id: 'merchant',
    name: 'Merchant Lo',
    sprite: 'char.037',
    element: 'water',
    lines: {
      intro: {
        cold: 'Buying or staring? Prices climb while you think.',
        plain: 'The barges bring new stock tomorrow and this lot must go. Haggle me down.',
        warm: 'Barges tomorrow, so this lot must go. Better to you than a stranger.',
      },
      confide: "Something came up from the caves. It's not on the shelf; haggle and I'll show you.",
      refuse: "I don't sell to your sort.",
      accept: 'Quick, now. I talk fast.',
      decline: 'The barges wait for no one.',
      win: {
        cold: 'Done. Look, buy, go.',
        plain: 'Done! Here is what I have.',
        warm: 'Done, and gladly! Here is what I have.',
      },
      lose: 'Ha! Too slow. Come back when the barges are in.',
    },
    challenge: { kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 2000 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterGeneral' }],
    repeatable: true,
  },
  smith: {
    id: 'smith',
    name: 'Smith Pyre',
    sprite: 'char.005',
    element: 'fire',
    lines: {
      intro: {
        cold: 'Coal costs. Steel costs more. Keep up or keep walking.',
        plain: "The forge eats coal faster than I sell steel. Keep pace and I'll price it fair.",
        warm: "Steel for you? The forge is hot. Keep pace and I'll go easy.",
      },
      confide: "I forged a hammer for myself and never swung it. Haggle, and it's on the rack.",
      refuse: 'Not my steel. Not in your hands.',
      accept: 'Strike when I strike.',
      decline: 'The coal burns either way.',
      win: {
        cold: 'Pick and pay.',
        plain: 'Good arm. Pick your steel.',
        warm: 'Good arm! Pick your steel.',
      },
      lose: 'Too slow. The forge is closed to you today.',
    },
    challenge: { kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 1600 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterSmith' }],
    repeatable: true,
  },
  innkeeper: {
    id: 'innkeeper',
    name: 'Innkeeper Pete',
    sprite: 'char.039',
    element: 'fire',
    lines: {
      intro: {
        cold: 'One bed left. Haggle for it if you want it.',
        plain: [
          'Half my rooms sit empty since the caves closed. A bed? We settle it with a game.',
          HAREGUY,
        ],
        warm: ['Come in and get warm, dear. A bed? We play a little game for the price.', HAREGUY],
      },
      confide: 'I keep a Phoenix Feather for regulars who go below. Play me for it.',
      refuse: 'No rooms. Not for you.',
      accept: 'Off we go.',
      decline: "The fire's lit if you change your mind.",
      win: {
        cold: 'Bed is upstairs.',
        plain: 'Sleep well, traveller.',
        warm: 'Sleep well, dear. Breakfast is on me.',
      },
      lose: 'Maybe next time.',
    },
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3000 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterInn' }],
    repeatable: true,
  },
  sage: {
    id: 'sage',
    name: 'Sage Orrin',
    sprite: 'char.031',
    element: 'lightning',
    lines: {
      intro: {
        cold: "The storm broke my lattice. Fix it or don't.",
        plain: "Last night's storm broke the lattice on my roof. Rebuild it before the next one.",
        warm: 'My lattice broke in the storm. You have steady hands, I can tell. Help?',
      },
      confide: 'Between us: the storm loves a line of pure gold. Rook knows why.',
      refuse: 'My roof. My storm. Go.',
      accept: 'Three lines, and it holds.',
      decline: "Then pray it doesn't storm.",
      win: {
        cold: 'It holds. Take the storm and go.',
        plain: 'It holds! The next bolt is yours to call.',
        warm: 'It holds! The next bolt is yours, friend.',
      },
      winKnown: {
        cold: 'It holds. You call storms already; take a spare rod and go.',
        plain: 'It holds! You already call the storm, so take a charm from a spare rod.',
        warm: 'It holds! You call the storm already. Wear this spare rod; it hums for you.',
      },
      lose: 'It sparks and sags. Again, before the clouds come.',
      done: {
        cold: 'The lattice holds.',
        plain: 'Not a spark lost since you fixed it.',
        warm: 'Not a spark lost. Come watch the next storm with me.',
      },
    },
    challenge: {
      kind: 'puzzle',
      rows: ['###....###', '####..####', '####..####', '#.########'],
      queue: ['L', 'O', 'I'],
      linesToClear: 3,
    },
    rewards: [
      {
        kind: 'spell',
        spellId: 'thunder',
        instead: { kind: 'item', itemId: 'stormCharm', count: 1 },
      },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'ether', count: 2 },
    repeatable: false,
  },
  guard: {
    id: 'guard',
    name: 'Captain Vale',
    sprite: 'char.020',
    element: 'earth',
    lines: {
      intro: {
        cold: "I don't like your face, traveler, but the cavern lamps are dying. Fuel blue and violet crystals into the ward frames or turning back is your only option.",
        plain:
          "The guard lamps at the cave mouth are flickering out. Feed them blue and violet mana; do that, and I'll write your pass myself.",
        warm: 'Ah, a trustworthy face at last! The ward lamps at the caves are dying and my guards are unnerved. Help me fuel them?',
      },
      confide: {
        cold: "You've got a sharp glare, but you can fight. The quartermaster keeps a Phoenix Feather in the iron safe for whoever goes below.",
        plain:
          "Between us: the quartermaster keeps a Phoenix Feather for whoever goes below. Light the lamps and it's yours.",
        warm: "You've proven your worth ten times over. Light the cave lamps and I'll hand you the watch's last Phoenix Feather.",
      },
      accept: {
        cold: "Both colors. Don't mess up the ratio.",
        plain: 'Blue and violet, steady as she goes.',
        warm: 'Take your time with the blue and violet crystals, friend.',
      },
      decline: {
        cold: 'The pass stays locked.',
        plain: "The dark below won't wait forever.",
        warm: 'Stay safe in town, then.',
      },
      win: {
        cold: "Lamps are lit. Here's your pass. Don't make me regret this.",
        plain: 'Lamps burn bright! Here is your pass and coin for the crystal fuel.',
        warm: "Superb work! Your pass, and the watch's sincere gratitude!",
      },
      lose: {
        cold: 'Pathetic effort. The lamps are still dark.',
        plain: "The crystals didn't take. The flame sputtered out.",
        warm: "No harm done, friend. Let's try fueling them again.",
      },
      done: {
        cold: 'Your pass is valid. Move along.',
        plain: 'Lamps hold fine. Mind yourself down in those caves.',
        warm: 'The watch owes you a debt. Stay safe down there!',
      },
    },
    challenge: { kind: 'barter', wants: { blue: 8, violet: 8 }, pieceLimit: 30 },
    rewards: [
      { kind: 'flag', flag: 'cavePass' },
      { kind: 'gil', amount: 20 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'phoenixFeather', count: 1 },
    essential: true,
    repeatable: false,
  },
  collector: {
    id: 'collector',
    name: 'Collector Nim',
    sprite: 'char.015',
    element: 'wind',
    lines: {
      intro: {
        cold: "Goblin Charm? Clean it and I'll pay. Grubby ones I don't touch.",
        plain: "Goblin Charms! Scrub the grime off one and I'll buy it for my cabinet.",
        warm: "Another charm for my cabinet? Clean it up and I'll pay the best rate.",
      },
      confide: "I've a Moon Shard I'll never catalogue. Clean me a charm and it's yours.",
      refuse: "My cabinet isn't for your finds.",
      accept: 'Gently. Bone chips.',
      decline: "I'll be here. I'm always here.",
      win: {
        cold: 'Acceptable. Your gil.',
        plain: 'Gleaming! Your gil, as promised.',
        warm: 'Gleaming! Into the cabinet it goes. Your gil.',
      },
      lose: "Scratched. Keep it; I can't shelve that.",
    },
    challenge: { kind: 'offering', itemId: 'goblinCharm', targetScore: 800, pieceLimit: 20 },
    rewards: [{ kind: 'gil', amount: 45 }],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'moonShard', count: 1 },
    repeatable: true,
  },
  shrineKeeper: {
    id: 'shrineKeeper',
    name: 'Shrine Keeper Myst',
    sprite: 'char.032',
    element: 'water',
    lines: {
      intro: {
        cold: "The sacred spring has clouded with muck. Pour blue and green crystals if you must; I won't plead.",
        plain:
          'Our shrine spring clouded over when the lake went dark. Pour in blue and green mana and the waters may clear.',
        warm: "Welcome, friend! Our holy spring has gone murk-gray with the lake's illness. Will you pour the crystals with me?",
      },
      confide: {
        cold: "I don't trust you, but the spring remembers ancient days. Clear it and take the charm resting in the basin.",
        plain:
          "The spring left a Tide Charm in its basin long ago. Restore the clear water and it's yours.",
        warm: "The spring hasn't shimmered like this in decades. Clear it, and I will gladly give you the ancient Tide Charm.",
      },
      accept: {
        cold: "Slowly. Don't disturb the silt.",
        plain: 'Pour blue first, then green. Let them blend.',
        warm: 'Gentle now, let the colors weave together.',
      },
      decline: {
        cold: 'The spring remains choked.',
        plain: 'Water is patient; it will wait.',
        warm: 'Blessings upon your journey until you return.',
      },
      win: {
        cold: 'It runs clear. Take an Ether and leave.',
        plain: 'It runs crystal clear! Maren will be overjoyed. Take an Ether from the basin.',
        warm: 'Miraculous! The spring sings again! Take what the basin offers, with our blessings!',
      },
      lose: {
        cold: 'Still cloudy. You wasted the crystals.',
        plain: 'The waters remain murky. Both colors are needed in harmony.',
        warm: 'Do not worry, dear friend. We will cleanse it together.',
      },
      done: {
        cold: "Spring's clear. Move along.",
        plain: 'The spring runs clear as glass today.',
        warm: 'Maren was asking after you! The waters shine bright!',
      },
    },
    challenge: { kind: 'barter', wants: { blue: 10, green: 6 }, pieceLimit: 30 },
    rewards: [
      { kind: 'flag', flag: 'shrineRestored' },
      { kind: 'item', itemId: 'ether', count: 1 },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'tideCharm', count: 1 },
    // Restoring the spring reveals a hidden spell (Purify), so it is never refused.
    essential: true,
    repeatable: false,
  },

  // ---------------------------------------------------------- Moon Caves ---
  sealedChest: {
    id: 'sealedChest',
    name: 'Sealed Chest',
    sprite: 'chest',
    element: 'arcane',
    inanimate: true,
    lines: {
      intro: {
        cold: 'A chest bound by a crystal seal: a lattice of stone.',
        plain: 'A chest bound by a crystal seal: a lattice of stone.',
        warm: 'A chest bound by a crystal seal: a lattice of stone.',
      },
      accept: 'The seal hums under your hands.',
      decline: 'You leave the seal be.',
      win: "The seal shatters. Some delver's cache, left for the way down.",
      lose: 'The seal holds firm.',
      done: 'The chest is empty.',
    },
    challenge: {
      kind: 'puzzle',
      rows: ['####.#####', '###...####', '####.#####'],
      queue: ['T', 'I'],
      linesToClear: 2,
    },
    rewards: [
      { kind: 'item', itemId: 'phoenixFeather', count: 1 },
      { kind: 'item', itemId: 'moonShard', count: 2 },
    ],
    repeatable: false,
  },
  hermit: {
    id: 'hermit',
    name: 'Steve the Cave Hermit',
    sprite: 'char.032',
    element: 'arcane',
    lines: {
      intro: {
        cold: 'Shard. Grind it. Salves. Then go.',
        plain: "Moon Shard... yes... grind one fine and I'll mix salves for us both.",
        warm: 'Oh! A kind one. A shard to grind? Salves for us both, yes, yes.',
      },
      confide: "Ssh. I carve the best shards into charms. Grind me one and you'll see.",
      refuse: 'No. No no. Go away.',
      accept: 'Fine, fine, finer!',
      decline: 'Shards keep. I keep.',
      win: {
        cold: 'Salves. Take. Go.',
        plain: 'Fine powder! Salves, salves, take these.',
        warm: 'Finest powder yet! Salves for my friend.',
      },
      lose: 'Lumpy! Lumpy is no good.',
    },
    challenge: { kind: 'offering', itemId: 'moonShard', targetScore: 500, pieceLimit: 14 },
    rewards: [
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'item', itemId: 'herb', count: 2 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'moonCharm', count: 1 },
    repeatable: true,
  },
  // ------------------------------------------------- Thornwood Grove ---
  forager: {
    id: 'forager',
    name: 'Forager Wren',
    sprite: 'char.033',
    element: 'nature',
    lines: {
      intro: {
        cold: 'Rot got into my mushroom rings. Replant them if you know how.',
        plain: 'Rot ate my mushroom rings. Plant green crystals and the spawn takes again.',
        warm: 'Rot ate my mushroom rings, friend. Help me plant them back? We share the pick.',
      },
      confide: 'Hazel taught me to braid caps into charms. Replant a ring and one is yours.',
      refuse: 'My rings, my spawn. Keep your boots out of them.',
      accept: 'Green, and keep it tidy.',
      decline: 'The rot spreads while we talk.',
      win: {
        cold: 'It takes. Here, your share.',
        plain: "It takes! First pick's yours.",
        warm: 'Look, they spring up already! Take a good basket.',
      },
      lose: 'Too thin. The rot will win that ring.',
    },
    challenge: { kind: 'barter', wants: { green: 8 }, pieceLimit: 21 },
    rewards: [
      { kind: 'item', itemId: 'herb', count: 2 },
      { kind: 'gil', amount: 15 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'groveCharm', count: 1 },
    repeatable: true,
  },

  // ------------------------------------------------- Glasswater Lake ---
  fisher: {
    id: 'fisher',
    name: 'Fisher Tam',
    sprite: 'char.014',
    element: 'water',
    lines: {
      intro: {
        cold: 'Lurkers shredded my nets. Mend them or move along.',
        plain: 'Lurkers tore my nets to ribbons. Weave blue crystals through and I can fish again.',
        warm: 'The lurkers tore my nets again. Help me mend them? Supper is on me.',
      },
      confide: 'Maren gave me a tide charm when I was a boy. Mend my nets and I pass it on.',
      refuse: "I'll mend my own nets, thanks.",
      accept: 'Blue, tight, no gaps.',
      decline: "Fish won't wait.",
      win: {
        cold: 'Holds. Take this.',
        plain: 'Holds water and fish both! Take what the last catch fetched.',
        warm: 'Good as new! Take the last catch money, and come eat.',
      },
      lose: "Holes everywhere. That net won't hold a minnow.",
    },
    challenge: { kind: 'barter', wants: { blue: 8 }, pieceLimit: 21 },
    rewards: [
      { kind: 'gil', amount: 25 },
      { kind: 'item', itemId: 'ether', count: 1 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 1 },
    secret: { kind: 'item', itemId: 'tideCharm', count: 1 },
    repeatable: true,
  },

  // --------------------------------------------------- Redrock Quarry ---
  foreman: {
    id: 'foreman',
    name: 'Foreman Flint',
    sprite: 'char.027',
    element: 'earth',
    lines: {
      intro: {
        cold: 'A rockslide buried the ridge road. Shift it, and the forge gets its ore. That is all.',
        plain: 'A rockslide buried the ridge road to Forgefyre. Help me shift the rubble?',
        warm: "The ridge road's buried and Forgefyre is starving for ore. Shift it with me?",
      },
      confide:
        'Dorn worked this face before the caves took his crew. He left a crate; clear the road.',
      accept: 'Orange first, then the loose violet shale.',
      decline: "The rubble isn't going anywhere. Neither is the ore.",
      win: {
        cold: 'Road is open. Wages. Go.',
        plain: 'The road is open! Your wages, and the forge will thank you.',
        warm: "The road's open! Wages, and a round on me in Forgefyre.",
      },
      lose: 'It slid back. Again, before it settles.',
      done: {
        cold: 'Road is open.',
        plain: 'Carts roll to Forgefyre every morning now.',
        warm: 'Carts roll every morning. Torva says the forge sings again.',
      },
    },
    challenge: { kind: 'barter', wants: { orange: 10, violet: 6 }, pieceLimit: 28 },
    rewards: [
      { kind: 'flag', flag: 'ridgeCleared' },
      { kind: 'gil', amount: 40 },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    // Dorn's crate: three Ethers (worth 42 gil, near the 40 of the Focus
    // Stone it replaces; there is one Focus Stone in the game, Rowan's).
    secret: { kind: 'item', itemId: 'ether', count: 3 },
    essential: true,
    repeatable: false,
  },

  // --------------------------------------------------------- Forgefyre ---
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice Cinda',
    sprite: 'char.006',
    element: 'fire',
    lines: {
      intro: {
        cold: 'The peak gate needs a new key and the forge is cold. Stoke it or step aside.',
        plain: "Torva's hands shake, so I must forge the peak gate's key. Help me stoke the fire?",
        warm: "I'm forging the peak gate's key while Torva rests her hands. Stoke the forge with me?",
      },
      confide: 'Torva says a key forged hot opens more than gates. Stoke it and I make you two.',
      accept: 'Red for the heat, orange for the iron.',
      decline: 'The coals are dying.',
      win: {
        cold: 'Key. The gate is north-east of Sevenstones. Go.',
        plain: 'A true key! The peak gate stands in the north-east of Sevenstones.',
        warm: 'A true key, and you swung like a smith! The peak gate is in the north-east of Sevenstones.',
      },
      lose: 'It cracked in the quench. Again.',
      done: {
        cold: 'You have the key.',
        plain: 'The storm folk trade with us again, thanks to that key.',
        warm: 'Torva hung the spare key over the forge. She calls it yours.',
      },
    },
    challenge: { kind: 'barter', wants: { red: 10, orange: 6 }, pieceLimit: 28 },
    rewards: [
      { kind: 'flag', flag: 'peakGate' },
      { kind: 'item', itemId: 'ether', count: 1 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 2 },
    secret: { kind: 'item', itemId: 'emberCharm', count: 1 },
    essential: true,
    repeatable: false,
  },
  armorer: {
    id: 'armorer',
    name: 'Armorer Garrick',
    sprite: 'char.007',
    element: 'fire',
    lines: {
      intro: {
        cold: 'Ore came back, so prices came down. Not by much for you.',
        plain: 'The ore carts are rolling and my racks are full. Haggle me down if you can.',
        warm: 'Full racks and a friend at the counter. Haggle, and I go easy.',
      },
      confide: 'I keep a Phoenix Feather under the counter for those who climb the peaks.',
      refuse: 'My steel stays on my racks.',
      accept: 'Hammer, then talk.',
      decline: 'The racks will keep.',
      win: {
        cold: 'Pick and pay.',
        plain: 'Fair price. Pick your steel.',
        warm: 'Done, friend! Pick your steel.',
      },
      lose: 'Too slow. Full price or nothing today.',
    },
    challenge: { kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 1500 },
    rewards: [{ kind: 'shop', shopId: 'emberforgeArmory' }],
    repeatable: true,
  },
  forgeInn: {
    id: 'forgeInn',
    name: 'Innkeeper Rosa',
    sprite: 'char.017',
    element: 'fire',
    lines: {
      intro: {
        cold: 'A bed by the chimney. It costs.',
        plain: 'Smiths sleep hard and pay late. A bed? We settle the price with a game.',
        warm: 'Sit by the fire! A bed? A quick game for the price, as always.',
      },
      confide: 'Regulars get my good Ether with breakfast. Play me for it.',
      refuse: 'No beds for you.',
      accept: 'Quick, before the shift ends.',
      decline: 'The chimney stays warm.',
      win: {
        cold: 'Bed is upstairs.',
        plain: 'Sleep well over the forge.',
        warm: 'Sleep well! I will keep the fire in.',
      },
      lose: 'Ha! Full price, then.',
    },
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3000 },
    rewards: [{ kind: 'shop', shopId: 'cinderRest' }],
    repeatable: true,
  },

  // ------------------------------------------------- Stormcrown Peaks ---
  beaconKeeper: {
    id: 'beaconKeeper',
    name: 'Beacon Keeper Ysolde',
    sprite: 'char.013',
    element: 'lightning',
    lines: {
      intro: {
        cold: 'The storm beacon is dark. Charge it if you can bear the sparks.',
        plain: 'The storm beacon went dark and the valleys get no warning. Charge it with gold?',
        warm: 'My beacon is dark and storms are coming. Help me charge it? You have quick hands.',
      },
      confide: 'Rook built this beacon. Charge it and take the rod he left; it calls the storm.',
      refuse: 'Off my peak.',
      accept: 'Gold, as much as you can.',
      decline: 'Then the valleys go unwarned.',
      win: {
        cold: 'It burns. Take this and go.',
        plain: 'It burns again! Take my spare rations.',
        warm: 'It blazes! The valleys sleep safe. Take my best rations.',
      },
      lose: 'It flickers out. Again, before the clouds.',
    },
    challenge: { kind: 'barter', wants: { gold: 10 }, pieceLimit: 28 },
    rewards: [
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'gil', amount: 30 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 2 },
    secret: { kind: 'item', itemId: 'stormCharm', count: 1 },
    repeatable: true,
  },

  // ------------------------------------------------- Windward Cliffs ---
  courier: {
    id: 'courier',
    name: 'Courier Twitch',
    sprite: 'char.012',
    element: 'wind',
    lines: {
      intro: {
        cold: 'Gust took my satchel. The letters are all over the cliffs. Catch them or do not.',
        plain:
          'A gust tore my satchel open and the letters are blowing off the cliffs! Catch them?',
        warm: "My letters! A gust took them all. You're fast; catch them with me?",
      },
      confide: 'Kestrel trained me. She says a Phoenix Feather rides every long route. Help me.',
      refuse: "I'll chase my own letters.",
      accept: 'Cyan, before they hit the sea!',
      decline: 'There goes the mail.',
      win: {
        cold: 'Got them. Postage, for you.',
        plain: 'Every letter! Take the postage, you earned it.',
        warm: 'Every last letter! Take the postage, and my thanks to every village.',
      },
      lose: 'Half went into the sea.',
    },
    challenge: { kind: 'barter', wants: { cyan: 10 }, pieceLimit: 28 },
    rewards: [
      { kind: 'gil', amount: 50 },
      { kind: 'item', itemId: 'herb', count: 1 },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'phoenixFeather', count: 1 },
    repeatable: true,
  },
  eyrieInn: {
    id: 'eyrieInn',
    name: 'Warden Ada',
    sprite: 'char.016',
    element: 'wind',
    lines: {
      intro: {
        cold: 'The lodge has bunks. Not free.',
        plain: 'Climbers rest here before the ruins. A bunk? We play for the price.',
        warm: 'Come in from the wind! A bunk? A quick game, then tea.',
      },
      confide: 'I keep a wind charm for climbers I like. Play me for it.',
      refuse: 'No bunks for you.',
      accept: 'Mind the draught.',
      decline: 'The wind will keep you company.',
      win: {
        cold: 'Bunk is yours.',
        plain: 'Rest well. The wind howls but the walls hold.',
        warm: 'Rest well, friend. Tea at dawn.',
      },
      lose: 'Too slow. Full price.',
    },
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3000 },
    rewards: [{ kind: 'shop', shopId: 'eyrieRest' }],
    repeatable: true,
  },

  // --------------------------------------------------- Moonfall Ruins ---
  scholar: {
    id: 'scholar',
    name: 'Scholar Ivo',
    sprite: 'char.018',
    element: 'arcane',
    lines: {
      intro: {
        cold: 'The tower rune went dark. Relight it, if you can read it.',
        plain: 'The moon rune over the tower door went dark. Relight it with violet before dusk?',
        warm: 'The moon rune went dark and I cannot read by starlight. Help me relight it?',
      },
      confide: 'Selene let me keep a Moon Shard from the old altar. Relight the rune; it is yours.',
      refuse: 'These ruins are not for you.',
      accept: 'Violet, and steady.',
      decline: 'Then I read by starlight.',
      win: {
        cold: 'It glows. Take these.',
        plain: 'It glows! Take my spare tonics.',
        warm: 'It glows brighter than ever! Take my spare tonics, with thanks.',
      },
      lose: 'It flickers out. The rune resists.',
    },
    challenge: { kind: 'barter', wants: { violet: 10 }, pieceLimit: 28 },
    rewards: [
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'gil', amount: 30 },
    ],
    bonus: { kind: 'item', itemId: 'herb', count: 2 },
    secret: { kind: 'item', itemId: 'moonShard', count: 1 },
    repeatable: true,
  },

  // ---------------------------------------------- Vesper, one step ahead ---
  // One character met in four places (see VESPER_ROUTE): an Offering or a
  // Puzzle each time, paid in Moon Shards and a piece of lore.
  vesperRoad: vesper('road', {
    kind: 'puzzle',
    rows: ['#..##..###', '#..##..###'],
    queue: ['O', 'O'],
    linesToClear: 2,
  }),
  vesperRidge: vesper('ridge', {
    kind: 'offering',
    itemId: 'herb',
    targetScore: 600,
    pieceLimit: 16,
  }),
  vesperPeaks: vesper('peaks', {
    kind: 'puzzle',
    rows: ['#....#####', '##..######', '##..######'],
    queue: ['O', 'I'],
    linesToClear: 3,
  }),
  vesperRuins: vesper('ruins', {
    kind: 'offering',
    itemId: 'ether',
    targetScore: 900,
    pieceLimit: 20,
  }),
};

/**
 * Vesper at one stop of the route: the shared lines and sprite, this
 * stop's challenge, and its reward: a Moon Shard (two at the last) and the
 * lore flag `lore:vesper.<stop>`. The Devoted secret is the shard Vesper's
 * confidence offers; the script gives no warm bonus.
 */
function vesper(stop: string, challenge: ChallengeSpec): NpcDef {
  return {
    id: `vesper${stop.charAt(0).toUpperCase()}${stop.slice(1)}`,
    name: 'Vesper, Thrall of the Depths',
    voice: 'vesper',
    sprite: 'char.004',
    element: 'arcane',
    lines: VESPER_LINES,
    challenge,
    rewards: [
      { kind: 'item', itemId: 'moonShard', count: stop === 'ruins' ? 2 : 1 },
      { kind: 'flag', flag: `lore:vesper.${stop}` },
    ],
    secret: { kind: 'item', itemId: 'moonShard', count: 1 },
    repeatable: false,
  };
}
