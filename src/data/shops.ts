import type { ShopDef } from './types';

/** Every shop. Spell tomes are not sold: mentors teach spells. */
export const SHOPS: Readonly<Record<string, ShopDef>> = {
  brightwaterGeneral: {
    id: 'brightwaterGeneral',
    name: 'Brightwater Goods',
    stock: ['herb', 'ether', 'phoenixFeather', 'apprenticeRobe'],
    secretStock: ['crystalMail'],
  },
  brightwaterSmith: {
    id: 'brightwaterSmith',
    name: 'Ember Forge',
    stock: [
      'copperSword',
      'ironSword',
      'knightBlade',
      'crystalMail',
      'emberCharm',
      'tideCharm',
      'stormCharm',
      'windCharm',
    ],
    secretStock: ['smithHammer'],
  },
  brightwaterInn: {
    id: 'brightwaterInn',
    name: 'The Sleeping Lantern',
    stock: ['innRest'],
    secretStock: ['phoenixFeather'],
  },
  mossvaleStall: {
    id: 'mossvaleStall',
    name: 'Mossvale Stall',
    stock: ['herb', 'copperSword', 'emberCharm'],
    secretStock: ['ironSword'],
  },
  emberforgeArmory: {
    id: 'emberforgeArmory',
    name: 'Emberforge Armory',
    stock: ['herb', 'ether', 'flameBrand', 'forgePlate', 'knightBlade', 'emberCharm'],
    secretStock: ['phoenixFeather'],
  },
  cinderRest: {
    id: 'cinderRest',
    name: 'The Cinder Rest',
    stock: ['innRest', 'herb'],
    secretStock: ['ether'],
  },
  eyrieRest: {
    id: 'eyrieRest',
    name: 'Eyrie Lodge',
    stock: ['innRest', 'herb', 'ether', 'phoenixFeather'],
    secretStock: ['windCharm'],
  },
};
