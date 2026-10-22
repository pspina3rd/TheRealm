import type { ShopDef } from './types';

export const SHOPS: Readonly<Record<string, ShopDef>> = {
  brightwaterGeneral: {
    id: 'brightwaterGeneral',
    name: 'Brightwater Goods',
    stock: ['herb', 'ether', 'phoenixFeather', 'apprenticeRobe', 'galeTome', 'shadowTome'],
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
  },
  brightwaterInn: {
    id: 'brightwaterInn',
    name: 'The Sleeping Lantern',
    stock: ['innRest'],
  },
  mossvaleStall: {
    id: 'mossvaleStall',
    name: 'Mossvale Stall',
    stock: ['herb', 'copperSword', 'emberCharm'],
  },
};
