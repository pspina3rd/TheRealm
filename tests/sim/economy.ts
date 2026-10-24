/**
 * A one-pass playthrough model for the balance pass: the hero walks the
 * regions in order, beats every monster on each map once (at the hero's
 * level, so monsters grow and XP falls off as in play), takes each
 * person's gil once and buys the region's main gear as soon as it can.
 * It prints the hero's level entering each region and the gil in, spent
 * and left at each exit (losses, grinding and herbs are left out).
 */
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS } from '../../src/data/items';
import { MAPS } from '../../src/data/maps';
import { NPCS } from '../../src/data/npcs';
import { createHero, gainXp } from '../../src/game/hero';
import { scaledEnemy } from '../../src/game/scaling';

/** Each area's main buys (the "Gil out" column of the targets), in the order a player wants them. */
const BUYS: Record<string, readonly string[]> = {
  overworld: ['copperSword', 'innRest', 'herb', 'herb'],
  grove: ['herb', 'herb', 'innRest'],
  lake: ['ironSword', 'apprenticeRobe', 'crystalMail', 'innRest'],
  quarry: ['knightBlade', 'innRest'],
  forge: ['flameBrand', 'forgePlate', 'innRest'],
  peaks: ['innRest', 'phoenixFeather'],
  cliffs: ['innRest', 'phoenixFeather'],
  ruins: ['ether', 'ether', 'innRest'],
  caves1: ['innRest', 'herb', 'herb'],
  caves2: [],
};

/** NPCs whose gil the hero collects once, per area (towns count with the Realm). */
const PEOPLE: Record<string, readonly string[]> = {
  overworld: ['guard', 'collector'],
};

export interface EconomyRow {
  readonly area: string;
  readonly levelIn: number;
  readonly xp: number;
  readonly gilIn: number;
  readonly spent: number;
  readonly left: number;
  readonly wanted: readonly string[];
}

/** Walks the regions in `order` (map ids) and returns one row per area. */
export function economy(order: readonly string[], classId = 'ranger'): EconomyRow[] {
  const hero = createHero(classId);
  const rows: EconomyRow[] = [];
  let wanted: string[] = [];
  for (const id of order) {
    const map = MAPS[id]!;
    const levelIn = hero.level;
    let xp = 0;
    let gilIn = 0;
    const bosses: string[] = [];
    for (const entity of map.entities) {
      if (entity.kind !== 'monster') continue;
      if (ENEMIES[entity.enemyId]!.boss) {
        bosses.push(entity.enemyId);
        continue;
      }
      const enemy = scaledEnemy(ENEMIES[entity.enemyId]!, hero.level);
      xp += enemy.xp;
      gilIn += enemy.gil;
      gainXp(hero, enemy.xp);
    }
    const people = [
      ...map.entities.flatMap((e) => (e.kind === 'npc' ? [e.npcId] : [])),
      ...(PEOPLE[id] ?? []),
    ];
    for (const npcId of people) {
      for (const reward of NPCS[npcId]!.rewards) if (reward.kind === 'gil') gilIn += reward.amount;
    }
    hero.gil += gilIn;
    let spent = 0;
    wanted = [...wanted, ...(BUYS[id] ?? [])];
    const still: string[] = [];
    for (const itemId of wanted) {
      const price = ITEMS[itemId]!.price;
      if (hero.gil >= price) {
        hero.gil -= price;
        spent += price;
      } else still.push(itemId);
    }
    wanted = still;
    rows.push({ area: map.name, levelIn, xp, gilIn, spent, left: hero.gil, wanted });
    // A boss (the Moon Wyrm) is its own row, met after the rest of its map.
    for (const bossId of bosses) {
      const boss = scaledEnemy(ENEMIES[bossId]!, hero.level);
      const level = hero.level;
      gainXp(hero, boss.xp);
      hero.gil += boss.gil;
      rows.push({
        area: boss.name,
        levelIn: level,
        xp: boss.xp,
        gilIn: boss.gil,
        spent: 0,
        left: hero.gil,
        wanted,
      });
    }
  }
  return rows;
}
