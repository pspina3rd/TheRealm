import type { ShopDef } from './types';

/** Supply points on the underground route; stock uses the existing economy. */
export const CAMPAIGN_SHOPS: Readonly<Record<string, ShopDef>> = {
  archiveSupplies: {
    id: 'archiveSupplies',
    name: 'Archive Refuge Stores',
    stock: ['herb', 'ether', 'innRest', 'ironSword', 'crystalMail', 'tideCharm'],
    secretStock: ['phoenixFeather'],
  },
  bellSupplies: {
    id: 'bellSupplies',
    name: 'Bell Hollows Stores',
    stock: ['herb', 'ether', 'phoenixFeather', 'innRest', 'flameBrand', 'forgePlate', 'moonCharm'],
    secretStock: ['tideCharm'],
  },
};
