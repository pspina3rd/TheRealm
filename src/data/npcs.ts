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
};
