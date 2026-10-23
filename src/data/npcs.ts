import type { NpcDef } from './types';

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
  // ---------------------------------------------------------- Mossvale ---
  elder: {
    id: 'elder',
    name: 'Elder Rowan',
    sprite: 'char.038',
    element: 'earth',
    lines: {
      intro: {
        cold: "Spores in my well. Clear them if you must; I won't beg.",
        plain: 'Spores have choked the village well. Clear them out and we drink again.',
        warm: 'A kind face, thank goodness. The spores have choked our well. Help me clear it?',
      },
      confide: "I dug this well with Quake when I was young. Clear it and I'll share what I kept.",
      refuse: "Not from you. I'll scrape the well myself.",
      accept: "Mind the stones. They're the well's.",
      decline: "Then I'll fetch my rake.",
      win: {
        cold: 'It runs. Take this and go.',
        plain: 'It runs clear. Take what I dug it with.',
        warm: 'Clear water! Take what I dug it with, and my thanks.',
      },
      winKnown: {
        cold: 'It runs. You know Quake already; take a stone from the first dig.',
        plain: 'It runs clear. You already shake the ground, so take a stone from the first dig.',
        warm: 'Clear water! You know Quake already. Keep a stone from the first dig, for luck.',
      },
      lose: "Still choked. The spores won't wait forever.",
      done: {
        cold: "The well's clean. That's all.",
        plain: 'Sweet water, every bucket.',
        warm: 'Sweet water, every bucket. Come drink whenever you pass.',
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
        instead: { kind: 'item', itemId: 'wellStone', count: 1 },
      },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'sporeCap', count: 1 },
    repeatable: false,
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer Bea',
    sprite: 'char.025',
    element: 'nature',
    lines: {
      intro: {
        cold: "Blight took my herb beds. Plant if you're planting.",
        plain: "Blight left my herb beds bare. Plant green crystals and we'll share the cut.",
        warm: 'Blight took my herb beds, love. Help me plant them green again?',
      },
      confide:
        "Don't tell Odo: I braid charms from the first sprouts. Replant and you'll have one.",
      refuse: 'My beds, my seed. Not your hands.',
      accept: 'Green in the rows, mind.',
      decline: "Beds won't plant themselves.",
      win: {
        cold: "They'll grow. Here's your share.",
        plain: "First cut's yours. Take a bundle.",
        warm: 'Look at them come up! Take a good bundle.',
      },
      lose: "Too thin. They'll never take.",
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
        cold: "Mum says don't talk to strangers. ...But my tower's stuck.",
        plain: "My crystal tower's jammed and Mum says clear it before supper. Help?",
        warm: "Hi! My crystal tower's jammed and supper's soon. Will you help? Please?",
      },
      confide: 'Psst. Clear it and you can have my lucky charm. It makes kites fly higher.',
      refuse: "Mum says you're trouble. Go away.",
      accept: 'Two lines! It has to be two!',
      decline: 'Aw. No pudding, then.',
      win: {
        cold: 'Oh. Thanks. Have my Ether, I guess.',
        plain: 'Supper saved! Have my Ether, I found it in the cellar.',
        warm: "Supper saved! Have my Ether, it's my best thing!",
      },
      lose: "It's worse now! Mum's going to see!",
      done: {
        cold: 'Thanks for the tower.',
        plain: "Tower's clean. Mum didn't even notice.",
        warm: "I'm building a taller one. You can help next time!",
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
    name: 'Stall Keeper Odo',
    sprite: 'char.002',
    element: 'nature',
    lines: {
      intro: {
        cold: 'Prices are what they are. Haggle if you like.',
        plain: "Herbs, a sword, a charm. A man's got to eat; haggle me for them.",
        warm: 'A friendly face! Haggle me, just for the fun of it.',
      },
      confide: "For you I'll open the box under the counter. Haggle first, for form.",
      refuse: 'Stall is shut. For you, anyway.',
      accept: 'Go on, then.',
      decline: 'Your loss.',
      win: {
        cold: 'Fine. Have a look.',
        plain: "Fair's fair. Have a look.",
        warm: 'You drive a hard bargain, friend. Have a look.',
      },
      lose: {
        cold: 'Ha. No sale.',
        plain: 'Lost your nerve? Come back later.',
        warm: 'No harm done.',
      },
    },
    challenge: { kind: 'haggle', pieceLimit: 8, rivalIntervalMs: 2500 },
    rewards: [{ kind: 'shop', shopId: 'mossvaleStall' }],
    repeatable: true,
  },

  // -------------------------------------------------------- Brightwater ---
  merchant: {
    id: 'merchant',
    name: 'Merchant Lio',
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
    name: 'Smith Hilda',
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
    name: 'Innkeeper Mae',
    sprite: 'char.039',
    element: 'fire',
    lines: {
      intro: {
        cold: 'One bed left. Haggle for it if you want it.',
        plain: 'Half my rooms sit empty since the caves closed. A bed? We settle it with a game.',
        warm: 'Come in and get warm, dear. A bed? We play a little game for the price.',
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
        cold: 'Cave lamps need blue and violet crystals. Fuel them and you get a pass. Nothing more.',
        plain:
          'Our ward lamps at the cave mouth are dying. Fuel them blue and violet; the pass is yours.',
        warm: "The ward lamps at the caves are dying. Fuel them and I'll write your pass myself.",
      },
      confide: 'The quartermaster keeps a Phoenix Feather for whoever goes below. Light the lamps.',
      accept: 'Both colours. The lamps need both.',
      decline: "The lamps won't last long.",
      win: {
        cold: "Lamps lit. Your pass. Don't make me regret it.",
        plain: "Lamps lit. Here's your pass, and pay for the crystals.",
        warm: "Lamps lit! Your pass, and the watch's thanks.",
      },
      lose: 'Too little. The lamps sputter out.',
      done: {
        cold: 'Your pass is valid. Move along.',
        plain: 'The lamps hold. Mind yourself below.',
        warm: 'The lamps hold. They say a wyrm sleeps below. Come back up.',
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
    name: 'Shrine Keeper Ilse',
    sprite: 'char.032',
    element: 'water',
    lines: {
      intro: {
        cold: 'The spring is clouded. Blue and green crystals clear it, if you pour them.',
        plain:
          'Our shrine spring clouded over with the lake. Pour in blue and green and it may clear.',
        warm: 'Our spring clouded over with the lake. Will you pour the crystals with me?',
      },
      confide:
        "The spring left a charm in its basin long ago. Clear it and I'll lift it out for you.",
      accept: 'Slowly. Let the colours settle.',
      decline: 'It will keep. Springs are patient.',
      win: {
        cold: 'It runs clear. Take an Ether from it. Go.',
        plain: 'It runs clear! Maren will want to see. Take an Ether from the spring.',
        warm: 'It runs clear! Maren will weep. Take what the spring gives.',
      },
      lose: 'Still cloudy. The spring needs both colours.',
      done: {
        cold: 'The spring is clear.',
        plain: 'The spring runs clear. Maren has been by twice.',
        warm: 'The spring runs clear. Maren asks after you.',
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
    name: 'Cave Hermit',
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
    name: 'Foreman Brann',
    sprite: 'char.027',
    element: 'earth',
    lines: {
      intro: {
        cold: 'A rockslide buried the ridge road. Shift it, and the forge gets its ore. That is all.',
        plain: 'A rockslide buried the ridge road to Emberforge. Help me shift the rubble?',
        warm: "The ridge road's buried and Emberforge is starving for ore. Shift it with me?",
      },
      confide:
        'Dorn worked this face before the caves took his crew. He left a crate; clear the road.',
      accept: 'Orange first, then the loose violet shale.',
      decline: "The rubble isn't going anywhere. Neither is the ore.",
      win: {
        cold: 'Road is open. Wages. Go.',
        plain: 'The road is open! Your wages, and the forge will thank you.',
        warm: "The road's open! Wages, and a round on me in Emberforge.",
      },
      lose: 'It slid back. Again, before it settles.',
      done: {
        cold: 'Road is open.',
        plain: 'Carts roll to Emberforge every morning now.',
        warm: 'Carts roll every morning. Torva says the forge sings again.',
      },
    },
    challenge: { kind: 'barter', wants: { orange: 10, violet: 6 }, pieceLimit: 28 },
    rewards: [
      { kind: 'flag', flag: 'ridgeCleared' },
      { kind: 'gil', amount: 40 },
    ],
    bonus: { kind: 'item', itemId: 'ether', count: 1 },
    secret: { kind: 'item', itemId: 'wellStone', count: 1 },
    essential: true,
    repeatable: false,
  },

  // --------------------------------------------------------- Emberforge ---
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
        cold: 'Key. The gate is north of Mossvale. Go.',
        plain: 'A true key! The peak gate stands north of the Realm.',
        warm: 'A true key, and you swung like a smith! The peak gate is north of the Realm.',
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
    name: 'Courier Finch',
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
};
