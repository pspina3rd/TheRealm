/**
 * An attainable-resource Chapter One benchmark, separate from the synthetic
 * combat fixtures. Routes are map-level itineraries, not tile navigation:
 * twenty walking-recovery ticks are modelled between encounters, no road
 * encounters are added on return trips. Gate retries and preparation are
 * explicitly bounded. Failed gates stay closed; this is not a full-campaign
 * completion proof. Its endpoint remains the Moon Wyrm, not the final form.
 */
import { Battle } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import { MAP_RULES, REGIONS } from '../../src/data/balance';
import type { BoardElement } from '../../src/core/boardMagic';
import { ITEMS } from '../../src/data/items';
import { NPCS } from '../../src/data/npcs';
import { MAPS, STARTER_MAPS } from '../../src/data/maps';
import { SHOPS } from '../../src/data/shops';
import { ENHANCEMENT_IDS, SPELLS, type EnhancementId } from '../../src/data/spells';
import type { StatId } from '../../src/data/stats';
import type { ChallengeSpec, ItemDef } from '../../src/data/types';
import {
  describeInteraction,
  commitBattleTry,
  reply,
  resolveBattle,
  type Resolution,
} from '../../src/game/encounter';
import { slotFor, spendSkillPoints, walkRegen, useItem, type Hero } from '../../src/game/hero';
import { lessonSpec, prepareLesson } from '../../src/game/lessons';
import { dualChance, pieceWeights } from '../../src/game/pieceOdds';
import { buy, cannotBuyReason } from '../../src/game/shop';
import { canEnhance, canRaiseStat, EMPTY_PLAN } from '../../src/game/skills';
import type { EntityDef, Location } from '../../src/world/map';
import { mentorEntities } from '../../src/world/mentors';
import { activeEntities, newGame, travel, type GameState } from '../../src/world/state';
import { MENTORS } from '../../src/data/mentors';
import { simulateBattle, type FightResult } from './simulate';
import { flowFor } from '../../src/game/encounterFlow';
import { BarterChallenge } from '../../src/battle/barter';
import { FINALE_FLAG } from '../../src/game/ending';
import type { NpcEntity } from '../../src/world/map';
import type { CrystalColor } from '../../src/core/pieces';
import { bringItems, itemsFor } from '../../src/game/hidden';
import { arrive, dismissVision, dueScenes, finishScene } from '../../src/game/story';

export const CAMPAIGN_ROUTE = [
  'mossvale',
  'overworld',
  'brightwater',
  ...Object.keys(REGIONS).slice(1),
];
export const CAMPAIGN_PACES = [1500, 2200] as const;
export const MAX_GATE_ATTEMPTS = 3;

const WARP_FLAGS = new Set(
  Object.values(MAPS).flatMap((map) =>
    map.warps.flatMap((warp) => (warp.requiresFlag ? [warp.requiresFlag] : [])),
  ),
);

/** Gate identities come from actual reward/warp data, rather than fabricated progression flags. */
export function gateFlags(entity: EntityDef): string[] {
  if (entity.kind !== 'npc') return [];
  return NPCS[entity.npcId]!.rewards.flatMap((reward) =>
    reward.kind === 'flag' && WARP_FLAGS.has(reward.flag) ? [reward.flag] : [],
  );
}

/** Production presence rules apply on repeat visits, especially permanently defeated bosses. */
export function campaignEncounters(state: GameState): EntityDef[] {
  return activeEntities(state).filter((entity) => entity.kind !== 'mentor');
}

export interface InvestmentPolicy {
  /** Known spells only, in priority order. Omit to favor the first learned primary. */
  readonly spellPriority?: readonly string[];
  readonly enhancementOrder?: readonly EnhancementId[];
  /** Explicit ordering fills one stat before the next; omitted stats remain untouched. */
  readonly statPriority?: readonly StatId[];
}

/** Spends earned points only; class choice never supplies or chooses a school. */
export function investEarnedPoints(hero: Hero, policy: InvestmentPolicy = {}): number {
  const before = hero.skillPoints;
  const spells = (
    policy.spellPriority ??
    Object.keys(hero.spells)
      .filter((id) => SPELLS[id]?.role === 'primary')
      .slice(0, 1)
  ).filter((id) => Object.hasOwn(hero.spells, id));
  const stats = ['strength', 'vitality', 'guard', 'focus', 'agility'] as const;
  while (hero.skillPoints > 0) {
    const enhancement = spells.flatMap((spellId) => {
      const attribute = (policy.enhancementOrder ?? ENHANCEMENT_IDS).find((id) =>
        canEnhance(hero, EMPTY_PLAN, spellId, id),
      );
      return attribute ? [{ spellId, attribute }] : [];
    })[0];
    if (enhancement) {
      const { spellId, attribute } = enhancement;
      if (!spendSkillPoints(hero, { stats: {}, spells: { [spellId]: { [attribute]: 1 } } })) break;
      continue;
    }
    const stat = (
      policy.statPriority
        ? [...policy.statPriority]
        : [...stats].sort((a, b) => hero.stats[a] - hero.stats[b])
    ).find((id) => canRaiseStat(hero, EMPTY_PLAN, id));
    if (!stat || !spendSkillPoints(hero, { stats: { [stat]: 1 }, spells: {} })) break;
  }
  return before - hero.skillPoints;
}

const gearValue = (item: ItemDef | undefined) => (item?.atk ?? 0) + (item?.def ?? 0);

/** Buys only stock actually opened by a won challenge, without granting gil or gear. */
export function purchaseSupplies(
  state: GameState,
  shop: Pick<Resolution, 'shopId' | 'attitude' | 'priceMultiplier'>,
): number {
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
  const rule = spec.kind === 'combat' ? MAP_RULES[state.mapId] : undefined;
  return new Battle(spec, state.hero, createRng(seed), {
    boardMagic: spec.kind === 'combat' || spec.kind === 'lesson',
    autoCast: spec.kind === 'combat',
    autoCastPacingMs: 500,
    storyFlags: state.flags,
    weights: pieceWeights(MAPS[state.mapId]!, state.hero),
    dualChance: dualChance(state.hero),
    ...(rule ? { rule } : {}),
  });
}

/** Finds a route using only currently unlocked map crossings, without granting story flags. */
export function enterMap(state: GameState, target: string): boolean {
  if (!MAPS[target]) throw new Error(`Unknown map: ${target}`);
  if (state.mapId === target) {
    finishDueScenes(state);
    return true;
  }
  const seen = new Set([state.mapId]);
  const queue: { map: string; route: Location[] }[] = [{ map: state.mapId, route: [] }];
  for (let next = queue.shift(); next; next = queue.shift()) {
    for (const warp of MAPS[next.map]!.warps) {
      if (warp.requiresFlag && !state.flags.has(warp.requiresFlag)) continue;
      if (seen.has(warp.to.map)) continue;
      const route = [...next.route, warp.to];
      if (warp.to.map === target) {
        for (const stop of route) {
          const from = state.mapId;
          travel(state, stop);
          const vision = arrive(state, from);
          finishDueScenes(state);
          if (vision) dismissVision(state, vision.id);
        }
        return true;
      }
      seen.add(warp.to.map);
      queue.push({ map: warp.to.map, route });
    }
  }
  return false;
}

/** The benchmark dismisses dialogue, while retaining the production scene rewards. */
function finishDueScenes(state: GameState): void {
  for (const scene of dueScenes(state.flags, state.mapId)) finishScene(state, scene);
}

/** Describes the locked flags on a concrete map route, without opening any of them. */
function missingRouteFlags(state: GameState, target: string): string[] {
  const seen = new Set([state.mapId]);
  const queue = [{ map: state.mapId, missing: [] as string[] }];
  for (let node = queue.shift(); node; node = queue.shift()) {
    if (node.map === target) return [...new Set(node.missing)];
    for (const warp of MAPS[node.map]!.warps) {
      if (seen.has(warp.to.map)) continue;
      seen.add(warp.to.map);
      queue.push({
        map: warp.to.map,
        missing: [
          ...node.missing,
          ...(warp.requiresFlag && !state.flags.has(warp.requiresFlag) ? [warp.requiresFlag] : []),
        ],
      });
    }
  }
  return [];
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
  readonly trace: readonly EncounterTrace[];
  readonly chapterVictory: boolean;
  readonly sequelSealed: boolean;
  /** Completion of this Chapter One itinerary, never full-campaign completion. */
  readonly completed: boolean;
}

/** Chapter One victory is earned from the Wyrm; this is not full-campaign completion. */
export function campaignEnding(
  state: GameState,
): Pick<CampaignResult, 'chapterVictory' | 'sequelSealed' | 'completed'> {
  const chapterVictory = state.flags.has(FINALE_FLAG);
  const sequelSealed =
    chapterVictory &&
    MAPS.overworld!.warps.some(
      (warp) =>
        warp.stirs?.flag === FINALE_FLAG &&
        !!warp.requiresFlag &&
        !state.flags.has(warp.requiresFlag),
    );
  return { chapterVictory, sequelSealed, completed: chapterVictory };
}

export interface ResourceSnapshot {
  readonly hp: number;
  readonly maxHp: number;
  readonly gil: number;
  readonly level: number;
  readonly skillPoints: number;
  readonly items: Readonly<Record<string, number>>;
  readonly spells: Readonly<Record<string, number>>;
  readonly flags: readonly string[];
}

export interface EncounterTrace {
  readonly mapId: string;
  readonly entityId: string;
  readonly npcId?: string;
  readonly phase:
    'encounter' | 'gate-retry' | 'shop-preparation' | 'blocked-map' | 'mentor-gift' | 'preparation';
  readonly gateFlags: readonly string[];
  readonly attempt: number;
  readonly outcome: string;
  readonly reason: string;
  readonly pieces: number;
  readonly missingColors: Readonly<Record<string, number>>;
  readonly before: ResourceSnapshot;
  readonly after: ResourceSnapshot;
}

function resources(state: GameState): ResourceSnapshot {
  const hero = state.hero;
  return {
    hp: hero.hp,
    maxHp: hero.maxHp,
    gil: hero.gil,
    level: hero.level,
    skillPoints: hero.skillPoints,
    items: { ...hero.items },
    spells: Object.fromEntries(Object.entries(hero.spells).map(([id, spell]) => [id, spell.level])),
    flags: [...state.flags].sort(),
  };
}

export interface CampaignOptions {
  readonly classId?: string;
  /** Delay other mentor lessons until this offered school is actually won; grants nothing. */
  readonly firstSchool?: BoardElement;
  readonly investment?: InvestmentPolicy;
  readonly seed?: number;
  readonly pace?: number;
  readonly route?: readonly string[];
  /** A timeout is reported separately; it is never rewarded as a victory. */
  readonly battleLimitMs?: number;
  /** Baseline preserves the original once-only generic combat-bot policy for comparison. */
  readonly policy?: 'baseline' | 'prepared';
  readonly puzzleNodeBudget?: number;
}

/** Resource-conserving campaign with explicit, bounded policy choices and encounter traces. */
export function runCampaign(options: CampaignOptions = {}): CampaignResult {
  const state = newGame(options.classId ?? 'ranger');
  // The application enables board magic when creating/loading a playable game.
  state.flags.add('boardMagicEnabled');
  const pace = options.pace ?? CAMPAIGN_PACES[0];
  const limit = options.battleLimitMs ?? 180_000;
  const improved = options.policy !== 'baseline';
  if (!Number.isFinite(pace) || pace <= 0 || !Number.isFinite(limit) || limit <= 0)
    throw new Error('Campaign pace and battle limit must be finite positive numbers');
  let serial = 0;
  const seed = options.seed ?? 1;
  const nextSeed = () => seed * 7919 + serial++ * 104729;
  const rows: ProgressionRow[] = [];
  const trace: EncounterTrace[] = [];
  const attempts = new Map<string, number>();
  const merchants = new Map<string, { mapId: string; entity: NpcEntity; shopId: string }>();
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
    const record = (
      entity: EntityDef,
      phase: EncounterTrace['phase'],
      before: ResourceSnapshot,
      outcome: string,
      reason: string,
      pieces = 0,
      missingColors: Record<string, number> = {},
    ) =>
      trace.push({
        mapId: state.mapId,
        entityId: entity.id,
        ...(entity.kind === 'npc' ? { npcId: entity.npcId } : {}),
        phase,
        gateFlags: gateFlags(entity),
        attempt: attempts.get(entity.id) ?? 0,
        outcome,
        reason,
        pieces,
        missingColors,
        before,
        after: resources(state),
      });
    const fight = (
      entity: EntityDef,
      spec: ChallengeSpec,
      terms?: Resolution['attitude'],
      phase: EncounterTrace['phase'] = 'encounter',
    ): FightResult => {
      const before = resources(state);
      const battleMap = state.mapId;
      attempts.set(entity.id, (attempts.get(entity.id) ?? 0) + 1);
      if (spec.kind === 'lesson') lessonsTried++;
      const battle = progressionBattle(state, spec, nextSeed());
      if (flowFor(spec)) {
        while (battle.demoPlaying) battle.update(50);
        if (!commitBattleTry(state, battle))
          throw new Error('Attempt blocked before simulated input');
        battle.input('left');
      }
      const result = simulateBattle(battle, 'prepared', pace, limit, {
        challengeAware: improved,
        puzzleNodeBudget: options.puzzleNodeBudget,
      });
      seconds += result.ms / 1000;
      const missingColors =
        battle.challenge instanceof BarterChallenge
          ? Object.fromEntries(
              Object.entries(battle.challenge.wants).flatMap(([color, target]) => {
                const missing = Math.max(
                  0,
                  (target ?? 0) -
                    ((battle.challenge as BarterChallenge).collected[color as CrystalColor] ?? 0),
                );
                return missing > 0 ? [[color, missing]] : [];
              }),
            )
          : {};
      let reason: string = result.stopReason;
      if (result.stopReason === 'lost') {
        reason = battle.board.toppedOut
          ? 'board-overflow'
          : battle.combat
            ? 'hero-defeated'
            : spec.kind === 'barter'
              ? 'piece-budget: unmet colour goals'
              : spec.kind === 'offering'
                ? `piece-budget: score ${battle.score}/${spec.targetScore}`
                : 'piece-budget: puzzle goal not reached';
      }
      if (battle.status === 'ongoing') {
        // Solver/deadline censoring is never turned into a gameplay loss or victory.
        timeouts++;
      } else {
        const resolution = resolveBattle(state, entity, battle, battle.rng, terms ?? undefined);
        finishDueScenes(state);
        if (spec.kind === 'lesson') {
          if (result.won) lessonsWon++;
        } else if (result.won) won++;
        else lost++;
        spent += purchaseSupplies(state, resolution);
        pointsSpent += investEarnedPoints(state.hero, options.investment);
        if (entity.kind === 'npc' && resolution.shopId)
          merchants.set(entity.id, { mapId: battleMap, entity, shopId: resolution.shopId });
      }
      // Record the encounter's map, even when its defeat caused a respawn elsewhere.
      const traceIndex = trace.length;
      record(entity, phase, before, result.stopReason, reason, result.pieces, missingColors);
      trace[traceIndex] = { ...trace[traceIndex]!, mapId: battleMap };
      return result;
    };
    const recoverAndReturn = () => {
      if (!enterMap(state, mapId)) return false;
      for (let i = 0; i < 20; i++) walkRegen(state.hero, STARTER_MAPS.has(mapId));
      return true;
    };
    const prepare = (entity: EntityDef) => {
      const before = resources(state);
      pointsSpent += investEarnedPoints(state.hero, options.investment);
      // Menu healing consumes actual inventory; no battle-use cap is bypassed within fights.
      if (state.hero.hp < state.hero.maxHp * 0.65 && (state.hero.items.herb ?? 0) > 0)
        useItem(state.hero, 'herb');
      record(
        entity,
        'preparation',
        before,
        'prepared',
        'earned investment and at most one carried Herb',
      );
    };
    const attempt = (entity: EntityDef, phase: EncounterTrace['phase'] = 'encounter') => {
      const interaction = describeInteraction(state, entity);
      if ('browse' in interaction && interaction.browse && entity.kind === 'npc') {
        const before = resources(state);
        spent += purchaseSupplies(state, interaction.browse);
        merchants.set(entity.id, { mapId: state.mapId, entity, shopId: interaction.browse.shopId });
        record(entity, phase, before, 'browsed', 'paid production Browse prices; no challenge');
        return;
      }
      if (interaction.kind === 'challenge' && interaction.canAccept !== false) {
        if (interaction.replies) reply(state, interaction.replies, 'accept');
        fight(entity, interaction.spec, interaction.terms, phase);
      } else if (gateFlags(entity).length) {
        const before = resources(state);
        record(
          entity,
          phase,
          before,
          'not-offered',
          interaction.kind === 'needsItem' ? `needs-item:${interaction.itemId}` : interaction.kind,
        );
      }
    };
    const visitMentors = () => {
      const ids = mentorEntities(state).map((entity) => entity.mentorId);
      for (const mentorId of ids) {
        for (let count = 0; count < 2; count++) {
          // A taught hidden spell can end seeking and move its mentor away immediately.
          let entity = mentorEntities(state).find((present) => present.mentorId === mentorId);
          if (!entity) break;
          const mentor = MENTORS[mentorId]!;
          if (
            options.firstSchool &&
            !Object.keys(state.hero.spells).some(
              (id) => SPELLS[id]?.category === options.firstSchool,
            ) &&
            mentor.element !== options.firstSchool
          )
            break;
          if (improved && itemsFor(state, mentor).length) {
            const before = resources(state);
            bringItems(state, mentor);
            record(
              entity,
              'mentor-gift',
              before,
              'given',
              'carried reveal items consumed by production gift rules',
            );
            entity = mentorEntities(state).find((present) => present.mentorId === mentorId);
            if (!entity) break;
          }
          const interaction = describeInteraction(state, entity);
          const lesson = interaction.kind === 'lessons' ? interaction.lessons[0] : undefined;
          if (!lesson) break;
          const before = resources(state);
          prepareLesson(state.hero);
          record(entity, 'preparation', before, 'prepared', 'production mentor lesson healing');
          const result = fight(entity, lessonSpec(state, mentorId, lesson));
          if (timeouts > 0) return;
          if (!result.won) break;
        }
      }
    };
    const restock = () => {
      // Known keepers can be browsed again at their current saved prices.
      const available = [...merchants.values()].sort((a, b) => {
        const rest = (id: string) => (SHOPS[id]!.stock.includes('innRest') ? 1 : 0);
        return state.hero.hp < state.hero.maxHp ? rest(b.shopId) - rest(a.shopId) : 0;
      });
      for (const merchant of available) {
        if (!enterMap(state, merchant.mapId)) continue;
        const interaction = describeInteraction(state, merchant.entity);
        if ('browse' in interaction && interaction.browse) {
          const before = resources(state);
          spent += purchaseSupplies(state, interaction.browse);
          record(
            merchant.entity,
            'shop-preparation',
            before,
            'browsed',
            'paid current Browse prices',
          );
          break;
        }
        if (
          interaction.kind !== 'challenge' ||
          interaction.canAccept === false ||
          interaction.spec.kind !== 'haggle'
        )
          continue;
        if (interaction.replies) reply(state, interaction.replies, 'accept');
        fight(merchant.entity, interaction.spec, interaction.terms, 'shop-preparation');
        if (timeouts > 0) return;
        break; // At most one actual merchant encounter per gate retry.
      }
      recoverAndReturn();
    };
    if (opened) {
      visitMentors();
      const gates: EntityDef[] = [];
      for (const entity of campaignEncounters(state)) {
        if (timeouts > 0 || !recoverAndReturn()) break;
        if (!activeEntities(state).some((present) => present.id === entity.id)) continue;
        if (improved && gateFlags(entity).length) {
          gates.push(entity); // Gate trials follow local fights and their legitimately earned resources.
          continue;
        }
        if (improved && entity.kind === 'monster') prepare(entity);
        attempt(entity);
      }
      if (timeouts === 0 && recoverAndReturn()) visitMentors();
      for (const entity of gates) {
        for (
          let retry = 0;
          retry < MAX_GATE_ATTEMPTS &&
          (attempts.get(entity.id) ?? 0) < MAX_GATE_ATTEMPTS &&
          timeouts === 0;
          retry++
        ) {
          if (gateFlags(entity).every((flag) => state.flags.has(flag))) break;
          if (retry > 0) restock();
          if (timeouts > 0 || !recoverAndReturn()) break;
          prepare(entity);
          attempt(entity, retry > 0 ? 'gate-retry' : 'encounter');
        }
      }
    } else {
      const before = resources(state);
      const missing = missingRouteFlags(state, mapId);
      const required = Object.values(NPCS)
        .filter((npc) =>
          npc.rewards.some((reward) => reward.kind === 'flag' && missing.includes(reward.flag)),
        )
        .map((npc) => npc.id);
      trace.push({
        mapId,
        entityId: `map:${mapId}`,
        phase: 'blocked-map',
        gateFlags: missing,
        attempt: 0,
        outcome: 'blocked',
        reason: `no unlocked map route; missing ${missing.join(', ') || 'route'}; required NPCs ${required.join(', ') || 'chapter boss'}`,
        pieces: 0,
        missingColors: {},
        before,
        after: before,
      });
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
  return {
    state,
    rows,
    trace,
    ...campaignEnding(state),
  };
}
