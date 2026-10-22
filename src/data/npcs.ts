import type { NpcDef } from './types';

/**
 * Every NPC in the game. Each one offers a different kind of challenge:
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
    greeting:
      'Spore Shrooms have overrun the meadows. Bring me a Spore Cap and prove your focus, and I will teach you to shake the earth.',
    challenge: { kind: 'offering', itemId: 'sporeCap', targetScore: 600, pieceLimit: 18 },
    rewards: [{ kind: 'spell', spellId: 'quake' }],
    successText: 'Well done. The ground itself will answer you now.',
    failText: 'Your focus wavered. Keep the pelt and try again.',
    repeatable: false,
    doneText: 'Use Quake when stone piles high on your board.',
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer Bea',
    sprite: 'char.025',
    greeting:
      'My fields need green crystals for the harvest. Trade me some and I will share my herbs.',
    challenge: { kind: 'barter', wants: { green: 8 }, pieceLimit: 20 },
    rewards: [{ kind: 'item', itemId: 'herb', count: 2 }],
    successText: 'Lovely crop! Take these herbs.',
    failText: 'Not quite enough green. Come back any time.',
    repeatable: true,
  },
  kid: {
    id: 'kid',
    name: 'Pip',
    sprite: 'char.040',
    greeting: "Bet you can't clear my crystal tower! I'll give you my Ether if you do!",
    challenge: {
      kind: 'puzzle',
      rows: ['###...####', '####.#####'],
      queue: ['I', 'T'],
      linesToClear: 2,
    },
    rewards: [{ kind: 'item', itemId: 'ether', count: 1 }],
    successText: 'Whoa! Okay, okay, the Ether is yours.',
    failText: 'Ha! Try again!',
    repeatable: false,
    doneText: "You're the crystal champion of Mossvale!",
  },
  stallKeeper: {
    id: 'stallKeeper',
    name: 'Stall Keeper Odo',
    sprite: 'char.002',
    greeting: 'Prices are set by a friendly haggle round here. Ready?',
    challenge: { kind: 'haggle', pieceLimit: 8, rivalIntervalMs: 2500 },
    rewards: [{ kind: 'shop', shopId: 'mossvaleStall' }],
    successText: 'A fair deal! Have a look.',
    failText: 'You lost your nerve. No deals today.',
    repeatable: true,
  },

  // -------------------------------------------------------- Brightwater ---
  merchant: {
    id: 'merchant',
    name: 'Merchant Lio',
    sprite: 'char.037',
    greeting: 'Welcome! Out-haggle me and the prices drop. Dawdle and they climb.',
    challenge: { kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 2000 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterGeneral' }],
    successText: 'Done! Here is what I have.',
    failText: 'Ha! Come back when you can keep up.',
    repeatable: true,
  },
  smith: {
    id: 'smith',
    name: 'Smith Hilda',
    sprite: 'char.005',
    greeting: 'Steel costs sweat. Match my pace at the anvil and I will price fairly.',
    challenge: { kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 1600 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterSmith' }],
    successText: 'Good arm. Pick your steel.',
    failText: 'Too slow. The forge is closed to you today.',
    repeatable: true,
  },
  innkeeper: {
    id: 'innkeeper',
    name: 'Innkeeper Mae',
    sprite: 'char.039',
    greeting: 'A bed for the night? We settle the price with a little game.',
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3000 },
    rewards: [{ kind: 'shop', shopId: 'brightwaterInn' }],
    successText: 'Sleep well, traveller.',
    failText: 'Maybe next time, dear.',
    repeatable: true,
  },
  sage: {
    id: 'sage',
    name: 'Sage Orrin',
    sprite: 'char.031',
    greeting: 'Lightning favours a clear mind. Solve my lattice and the storm is yours.',
    challenge: {
      kind: 'puzzle',
      rows: ['###....###', '####..####', '####..####', '#.########'],
      queue: ['L', 'O', 'I'],
      linesToClear: 3,
    },
    rewards: [{ kind: 'spell', spellId: 'thunder' }],
    successText: 'The storm answers you now.',
    failText: 'Clouded. Clear your mind and return.',
    repeatable: false,
    doneText: 'Thunder strikes hardest at those who rely on stone.',
  },
  guard: {
    id: 'guard',
    name: 'Captain Vale',
    sprite: 'char.020',
    greeting:
      'The Moon Caves are sealed. Supply the watch with blue and violet crystals and I will grant you a pass.',
    challenge: { kind: 'barter', wants: { blue: 8, violet: 8 }, pieceLimit: 30 },
    rewards: [
      { kind: 'flag', flag: 'cavePass' },
      { kind: 'gil', amount: 20 },
    ],
    successText: 'Here is your Cave Pass. The entrance lies east of the lake.',
    failText: 'Not enough. The watch needs both colours.',
    repeatable: false,
    doneText: 'Stay safe in the caves. They say a wyrm sleeps below.',
  },
  collector: {
    id: 'collector',
    name: 'Collector Nim',
    sprite: 'char.015',
    greeting: 'Goblin Charms! I pay handsomely, if you can show me some real style.',
    challenge: { kind: 'offering', itemId: 'goblinCharm', targetScore: 800, pieceLimit: 20 },
    rewards: [{ kind: 'gil', amount: 45 }],
    successText: 'Marvellous! 45 gil, as promised.',
    failText: 'Hmm, not impressed. Keep your charm for now.',
    repeatable: true,
  },

  shrineKeeper: {
    id: 'shrineKeeper',
    name: 'Shrine Keeper Ilse',
    sprite: 'char.032',
    greeting:
      'The spring under our fountain shrine clouded over with the lake. Pour clean blue and green crystals into it and it may run clear again.',
    challenge: { kind: 'barter', wants: { blue: 10, green: 6 }, pieceLimit: 30 },
    rewards: [
      { kind: 'flag', flag: 'shrineRestored' },
      { kind: 'item', itemId: 'ether', count: 1 },
    ],
    successText: 'It runs clear! Maren will want to see this. Take an Ether, drawn from the spring.',
    failText: 'Still cloudy. The spring needs both colours.',
    repeatable: false,
    doneText: 'The spring runs clear. Maren has been by to see it twice.',
  },

  // ---------------------------------------------------------- Moon Caves ---
  sealedChest: {
    id: 'sealedChest',
    name: 'Sealed Chest',
    sprite: 'chest',
    greeting: 'A chest bound by a crystal seal. The seal is a lattice of stone.',
    challenge: {
      kind: 'puzzle',
      rows: ['####.#####', '###...####', '####.#####'],
      queue: ['T', 'I'],
      linesToClear: 2,
    },
    rewards: [{ kind: 'item', itemId: 'blizzardTome', count: 1 }],
    successText: 'The seal shatters! Inside is a Tome of Blizzard.',
    failText: 'The seal holds firm.',
    repeatable: false,
    doneText: 'The chest is empty.',
  },
  hermit: {
    id: 'hermit',
    name: 'Cave Hermit',
    sprite: 'char.032',
    greeting: "Moon Shards... yes... bring me one and dazzle me, and I'll patch you up.",
    challenge: { kind: 'offering', itemId: 'moonShard', targetScore: 500, pieceLimit: 14 },
    rewards: [
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'item', itemId: 'herb', count: 2 },
    ],
    successText: 'Shiny! Take these, take these.',
    failText: 'No, no, not good enough.',
    repeatable: true,
  },
};
