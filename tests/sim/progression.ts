/**
 * An attainable-resource campaign benchmark, separate from the synthetic
 * combat fixtures. Routes are map-level itineraries, not tile navigation:
 * twenty walking-recovery ticks are modelled between encounters, no road
 * encounters are added on return trips, and each placed encounter is tried
 * once. Failed gates stay closed. This is a bot policy, not a completion proof.
 */
import { Battle } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import { REGIONS } from '../../src/data/balance';
import { ITEMS } from '../../src/data/items';
import { MAPS, STARTER_MAPS } from '../../src/data/maps';
import { SHOPS } from '../../src/data/shops';
import { ENHANCEMENT_IDS } from '../../src/data/spells';
import type { ChallengeSpec, ItemDef } from '../../src/data/types';
import { describeInteraction, resolveBattle, type Resolution } from '../../src/game/encounter';
import { heroClass, slotFor, spendSkillPoints, walkRegen, type Hero } from '../../src/game/hero';
import { lessonSpec, lessonsFor, prepareLesson } from '../../src/game/lessons';
import { dualChance, pieceWeights } from '../../src/game/pieceOdds';
import { buy, cannotBuyReason } from '../../src/game/shop';
import { canEnhance, canRaiseStat, EMPTY_PLAN } from '../../src/game/skills';
import type { EntityDef, Location } from '../../src/world/map';
import { mentorEntities } from '../../src/world/mentors';
import { activeEntities, newGame, travel, type GameState } from '../../src/world/state';
import { MENTORS } from '../../src/data/mentors';
import { simulateBattle, type FightResult } from './simulate';

export const CAMPAIGN_ROUTE = [
  'mossvale',
  'overworld',
  'brightwater',
  ...Object.keys(REGIONS).slice(1),
];
export const CAMPAIGN_PACES = [1500, 2200] as const;

/** Production presence rules apply on repeat visits, especially permanently defeated bosses. */
export function campaignEncounters(state: GameState): EntityDef[] {
  return activeEntities(state).filter((entity) => entity.kind !== 'mentor');
}

/** Spends earned points only: enhance the class primary, then defensive/offensive stats. */
export function investEarnedPoints(hero: Hero): number {
  const before = hero.skillPoints;
  const spellId = heroClass(hero).spell;
  const stats = ['strength', 'vitality', 'guard', 'focus', 'agility'] as const;
  while (hero.skillPoints > 0) {
    const attribute = ENHANCEMENT_IDS.find((id) => canEnhance(hero, EMPTY_PLAN, spellId, id));
    if (attribute) {
      if (!spendSkillPoints(hero, { stats: {}, spells: { [spellId]: { [attribute]: 1 } } })) break;
      continue;
    }
    const stat = [...stats]
      .sort((a, b) => hero.stats[a] - hero.stats[b])
      .find((id) => canRaiseStat(hero, EMPTY_PLAN, id));
    if (!stat || !spendSkillPoints(hero, { stats: { [stat]: 1 }, spells: {} })) break;
  }
  return before - hero.skillPoints;
}

const gearValue = (item: ItemDef | undefined) => (item?.atk ?? 0) + (item?.def ?? 0);

/** Buys only stock actually opened by a won challenge, without granting gil or gear. */
export function purchaseSupplies(state: GameState, shop: Resolution): number {
  if (!shop.shopId) return 0;
  const def = SHOPS[shop.shopId];
  if (!def) throw new Error(`Unknown shop: ${shop.shopId}`);
  const stock = [...def.stock, ...(shop.attitude === 'devoted' ? (def.secretStock ?? []) : [])];
  const before = state.hero.gil;
  // Equipment first, highest value first; consumables are modest carried reserves.
  const ordered = [...stock].sort((a, b) => gearValue(ITEMS[b]) - gearValue(ITEMS[a]));
  for (const id of ordered) {
    const item = ITEMS[id]!;
    const slot = slotFor(item);
    const target = id === 'herb' ? 2 : id === 'ether' || id === 'phoenixFeather' ? 1 : 0;
    const desired = () => {
      if (slot) {
        const worn = state.hero[slot];
        return slot === 'accessoryId'
          ? !worn
          : gearValue(item) > gearValue(worn ? ITEMS[worn] : undefined);
      }
      if (item.use?.rest) return state.hero.hp < state.hero.maxHp;
      return (state.hero.items[id] ?? 0) < target;
    };
    while (desired() && cannotBuyReason(state, item, shop.priceMultiplier) === null) {
      buy(state, id, shop.priceMultiplier);
    }
  }
  return before - state.hero.gil;
}

/** Same area/charm/alignment weights and dual odds as the production battle controller. */
export function progressionBattle(state: GameState, spec: ChallengeSpec, seed: number): Battle {
  return new Battle(spec, state.hero, createRng(seed), {
    weights: pieceWeights(MAPS[state.mapId]!, state.hero),
    dualChance: dualChance(state.hero),
  });
}

/** Finds a route using only currently unlocked map crossings, without granting story flags. */
function enterMap(state: GameState, target: string): boolean {
  if (!MAPS[target]) throw new Error(`Unknown map: ${target}`);
  if (state.mapId === target) return true;
  const seen = new Set([state.mapId]);
  const queue: { map: string; route: Location[] }[] = [{ map: state.mapId, route: [] }];
  for (let next = queue.shift(); next; next = queue.shift()) {
    for (const warp of MAPS[next.map]!.warps) {
      if (warp.requiresFlag && !state.flags.has(warp.requiresFlag)) continue;
      if (seen.has(warp.to.map)) continue;
      const route = [...next.route, warp.to];
      if (warp.to.map === target) {
        for (const stop of route) travel(state, stop);
        return true;
      }
      seen.add(warp.to.map);
      queue.push({ map: warp.to.map, route });
    }
  }
  return false;
}

export interface ProgressionRow {
  readonly area: string;
  readonly levelIn: number;
  readonly levelOut: number;
  readonly won: number;
  readonly lost: number;
  readonly lessonsWon: number;
  readonly lessonsTried: number;
  readonly seconds: number;
  readonly hp: number;
  readonly gil: number;
  readonly spent: number;
  readonly pointsSpent: number;
  readonly spellLevels: string;
  readonly gear: string;
  readonly blocked: boolean;
  readonly timeouts: number;
}

export interface CampaignResult {
  readonly state: GameState;
  readonly rows: readonly ProgressionRow[];
}

export interface CampaignOptions {
  readonly classId?: string;
  readonly seed?: number;
  readonly pace?: number;
  readonly route?: readonly string[];
  /** A timeout is reported separately; it is never rewarded as a victory. */
  readonly battleLimitMs?: number;
}

/** One pass with a single persistent hero; no synthetic XP, gear, spells, or refill between fights. */
export function runCampaign(options: CampaignOptions = {}): CampaignResult {
  const state = newGame(options.classId ?? 'ranger');
  const pace = options.pace ?? CAMPAIGN_PACES[0];
  const limit = options.battleLimitMs ?? 180_000;
  if (!Number.isFinite(pace) || pace <= 0 || !Number.isFinite(limit) || limit <= 0)
    throw new Error('Campaign pace and battle limit must be finite positive numbers');
  let serial = 0;
  const seed = options.seed ?? 1;
  const nextSeed = () => seed * 7919 + serial++ * 104729;
  const rows: ProgressionRow[] = [];
  for (const mapId of options.route ?? CAMPAIGN_ROUTE) {
    const map = MAPS[mapId];
    if (!map) throw new Error(`Unknown map: ${mapId}`);
    const levelIn = state.hero.level;
    let won = 0;
    let lost = 0;
    let spent = 0;
    let pointsSpent = 0;
    let seconds = 0;
    let lessonsWon = 0;
    let lessonsTried = 0;
    let timeouts = 0;
    const opened = enterMap(state, mapId);
    const fight = (entity: EntityDef, spec: ChallengeSpec, terms?: Resolution['attitude']) => {
      if (spec.kind === 'lesson') lessonsTried++;
      const battle = progressionBattle(state, spec, nextSeed());
      const result: FightResult = simulateBattle(battle, 'prepared', pace, limit);
      seconds += result.ms / 1000;
      if (battle.status === 'ongoing') {
        // A stalled bot is censored, not a gameplay defeat or a source of rewards.
        timeouts++;
        return;
      }
      const resolution = resolveBattle(state, entity, battle, battle.rng, terms ?? undefined);
      if (spec.kind === 'lesson') {
        if (result.won) lessonsWon++;
      } else if (result.won) won++;
      else lost++;
      spent += purchaseSupplies(state, resolution);
      pointsSpent += investEarnedPoints(state.hero);
    };
    const recoverAndReturn = () => {
      if (!enterMap(state, mapId)) return false;
      for (let i = 0; i < 20; i++) walkRegen(state.hero, STARTER_MAPS.has(mapId));
      return true;
    };
    const visitMentors = () => {
      for (const entity of mentorEntities(state)) {
        // At most two offered lessons at each visit; losses do not generate retry healing loops.
        for (let count = 0; count < 2; count++) {
          const mentor = MENTORS[entity.mentorId]!;
          const lesson = lessonsFor(state, mentor)[0];
          if (!lesson) break;
          prepareLesson(state.hero);
          const before = lessonsWon;
          fight(entity, lessonSpec(state, entity.mentorId, lesson));
          if (lessonsWon === before || timeouts > 0) break;
        }
      }
    };
    if (opened) {
      visitMentors();
      // Try every placed encounter once, in data order. NPC rewards require real challenge wins.
      for (const entity of campaignEncounters(state)) {
        if (timeouts > 0 || !recoverAndReturn()) break;
        const interaction = describeInteraction(state, entity);
        if (interaction.kind !== 'challenge') continue;
        fight(entity, interaction.spec, interaction.terms);
      }
      if (recoverAndReturn() && timeouts === 0) visitMentors();
    }
    rows.push({
      area: map.name,
      levelIn,
      levelOut: state.hero.level,
      won,
      lost,
      lessonsWon,
      lessonsTried,
      seconds,
      hp: state.hero.hp / state.hero.maxHp,
      gil: state.hero.gil,
      spent,
      pointsSpent,
      spellLevels: Object.entries(state.hero.spells)
        .map(([id, spell]) => `${id}:${spell.level}`)
        .join(', '),
      gear: [state.hero.weaponId, state.hero.armorId, state.hero.accessoryId]
        .filter(Boolean)
        .join(', '),
      blocked: !opened,
      timeouts,
    });
    if (timeouts > 0) break;
  }
  return { state, rows };
}
