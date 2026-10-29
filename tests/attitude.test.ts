import { describe, expect, it } from 'vitest';
import { settleHaggle } from '../src/game/stakes';
import { ELEMENTS, emptyCounts, relatedTo, weakTo } from '../src/core/elements';
import { createRng } from '../src/core/rng';
import { CLASSES } from '../src/data/classes';
import { ITEMS } from '../src/data/items';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { FLAG_ICONS } from '../src/ui/art/icons';
import { NPCS } from '../src/data/npcs';
import { SHOPS } from '../src/data/shops';
import { SPELLS } from '../src/data/spells';
import { SCENES } from '../src/data/story';
import type { Line, MoodLine, NpcDef, Reward } from '../src/data/types';
import { variantsFor, type Mood } from '../src/game/lines';
import {
  ATTITUDES,
  ATTITUDE_PRICES,
  ATTITUDE_THRESHOLDS,
  attitudeForScore,
  attitudeOf,
  attitudeScore,
  dealTerms,
  introFor,
  rewardsOnTerms,
  say,
  stockFor,
  type Attitude,
} from '../src/game/attitude';
import {
  commitBattleTry,
  describeInteraction,
  entityAttitude,
  resolveBattle,
} from '../src/game/encounter';
import { createHero, type Hero } from '../src/game/hero';
import type { EntityDef } from '../src/world/map';
import { newGame, type GameState } from '../src/world/state';
import { newKnownSpell } from '../src/game/spells';
import { makeBattle } from './helpers';

const PRIMARY = {
  fire: 'fire',
  water: 'blizzard',
  lightning: 'thunder',
  nature: 'cure',
  earth: 'quake',
  arcane: 'shadow',
  wind: 'gale',
} as const;

/** A hero who knows exactly these spells at these levels, with this Charm. */
function heroWith(spells: Readonly<Record<string, number>>, charm = 0): Hero {
  const hero = createHero('ranger');
  hero.spells = Object.fromEntries(
    Object.entries(spells).map(([id, level]) => [id, { ...newKnownSpell(), level }]),
  );
  hero.stats.charm = charm;
  return hero;
}

/** A new game whose hero has exactly this attitude score toward `npc` (no spells, only Charm or opposed spells). */
function stateFor(npc: NpcDef, attitude: Attitude): GameState {
  const state = newGame();
  const [opposedA, opposedB] = weakTo(npc.element);
  const scores: Record<Attitude, () => Hero> = {
    hostile: () => heroWith({ [PRIMARY[opposedA!]]: 3, [PRIMARY[opposedB!]]: 3 }),
    wary: () => heroWith({ [PRIMARY[opposedA!]]: 2 }),
    neutral: () => heroWith({}),
    friendly: () => heroWith({}, 3),
    devoted: () => heroWith({}, 6),
  };
  state.hero = scores[attitude]();
  expect(attitudeOf(state.hero, npc)).toBe(attitude);
  return state;
}

function entityOf(npcId: string): EntityDef {
  for (const map of Object.values(MAPS)) {
    const found = map.entities.find((e) => e.kind === 'npc' && e.npcId === npcId);
    if (found) return found;
  }
  throw new Error(npcId);
}

const people = Object.values(NPCS).filter((npc) => !npc.inanimate);
const shopOf = (npc: NpcDef): string | undefined =>
  npc.shop ?? npc.rewards.flatMap((reward) => (reward.kind === 'shop' ? [reward.shopId] : []))[0];
const isShop = (npc: NpcDef): boolean => shopOf(npc) !== undefined;

describe('attitude score', () => {
  it('adds the element, half the related, minus half the opposed, plus Charm', () => {
    const alignment = { ...emptyCounts(), fire: 2, lightning: 2, earth: 2, water: 2, wind: 4 };
    // Fire: related lightning and earth, opposed water and wind (they beat fire).
    expect(relatedTo('fire').sort()).toEqual(['earth', 'lightning']);
    expect(weakTo('fire').sort()).toEqual(['water', 'wind']);
    expect(attitudeScore(alignment, 1, 'fire')).toBe(2 + (2 + 2) / 2 - (2 + 4) / 2 + 1);
  });

  it('ignores the elements the NPC beats', () => {
    // Fire beats nature and arcane: they neither help nor hurt.
    expect(attitudeScore({ ...emptyCounts(), nature: 5, arcane: 5 }, 0, 'fire')).toBe(0);
  });

  it('maps scores to tiers at the documented thresholds', () => {
    const cases: [number, Attitude][] = [
      [-3, 'hostile'],
      [ATTITUDE_THRESHOLDS.wary, 'wary'],
      [-1, 'wary'],
      [ATTITUDE_THRESHOLDS.neutral, 'neutral'],
      [2.5, 'neutral'],
      [ATTITUDE_THRESHOLDS.friendly, 'friendly'],
      [5.5, 'friendly'],
      [ATTITUDE_THRESHOLDS.devoted, 'devoted'],
      [20, 'devoted'],
    ];
    for (const [score, tier] of cases) expect(attitudeForScore(score), String(score)).toBe(tier);
  });

  it('makes Neutral the usual tier for a new hero of any class', () => {
    for (const heroClass of Object.values(CLASSES)) {
      const hero = createHero(heroClass.id);
      const neutral = people.filter((npc) => attitudeOf(hero, npc) === 'neutral');
      expect(neutral.length, heroClass.id).toBeGreaterThan(people.length / 2);
      expect(people.some((npc) => attitudeOf(hero, npc) === 'hostile')).toBe(false);
    }
  });

  it('counts Charm as one point per rank', () => {
    const npc = NPCS.merchant!;
    expect(attitudeOf(heroWith({}, 2), npc)).toBe('neutral');
    expect(attitudeOf(heroWith({}, 3), npc)).toBe('friendly');
  });

  it('can turn strongly opposed heroes Hostile', () => {
    // Water and nature beat earth: the earth-aligned captain scowls.
    expect(attitudeOf(heroWith({ blizzard: 3, cure: 3 }), NPCS.guard!)).toBe('hostile');
  });

  it('leaves things (a chest) Neutral whatever the hero knows', () => {
    expect(attitudeOf(heroWith({ shadow: 4 }, 10), NPCS.sealedChest!)).toBe('neutral');
  });
});

describe('tier effects', () => {
  it('moves prices by tier', () => {
    expect(ATTITUDES.map((a) => ATTITUDE_PRICES[a])).toEqual([1.2, 1.2, 1, 0.9, 0.8]);
  });

  it('refuses when Hostile unless progress depends on the NPC', () => {
    expect(dealTerms(NPCS.farmer!, 'hostile')).toBeNull();
    expect(dealTerms(NPCS.guard!, 'hostile')).toBe('wary');
    expect(dealTerms(NPCS.farmer!, 'devoted')).toBe('devoted');
  });

  it('adds regard to the score, but regard alone never makes anyone Hostile', () => {
    const npc = NPCS.farmer!;
    expect(attitudeOf(heroWith({}, 2), npc, 0)).toBe('neutral');
    expect(attitudeOf(heroWith({}, 2), npc, 2)).toBe('friendly');
    expect(attitudeOf(heroWith({}, 0), npc, -2)).toBe('wary');
    // Neutral at −0.5 or more: −2 regard would reach Hostile, so the floor holds at Wary.
    expect(attitudeOf(heroWith({}, 0), npc, -2)).not.toBe('hostile');
    const hostile = heroWith({ fire: 3, kindle: 3, wildfire: 3 });
    expect(attitudeOf(hostile, NPCS.farmer!)).toBe('hostile');
    expect(attitudeOf(hostile, NPCS.farmer!, 2)).not.toBe('hostile');
    expect(attitudeOf(heroWith({}, 0), NPCS.sealedChest!, -2)).toBe('neutral');
  });

  it('adds the bonus when Friendly and the secret too when Devoted', () => {
    const hero = heroWith({});
    const npc = NPCS.farmer!;
    expect(rewardsOnTerms(hero, npc, 'neutral')).toEqual({
      base: npc.rewards,
      extras: [],
      knewSpell: false,
    });
    expect(rewardsOnTerms(hero, npc, 'wary').extras).toEqual([]);
    expect(rewardsOnTerms(hero, npc, 'friendly').extras).toEqual([npc.bonus]);
    expect(rewardsOnTerms(hero, npc, 'devoted').extras).toEqual([npc.bonus, npc.secret]);
  });

  it('gives something else for a spell the hero already knows', () => {
    const knight = createHero('knight'); // knows Quake
    expect(rewardsOnTerms(knight, NPCS.elder!, 'neutral').base).toEqual([
      { kind: 'gil', amount: 40 },
    ]);
    const rogue = createHero('rogue'); // knows Thunder
    expect(rewardsOnTerms(rogue, NPCS.sage!, 'neutral').base).toEqual([
      { kind: 'item', itemId: 'stormCharm', count: 1 },
    ]);
    // A spell reward with nothing instead is simply dropped for a hero who knows it.
    const bare: NpcDef = { ...NPCS.elder!, rewards: [{ kind: 'spell', spellId: 'quake' }] };
    expect(rewardsOnTerms(knight, bare, 'neutral').base).toEqual([]);
  });

  it('shows every flag an NPC grants as its own icon', () => {
    for (const npc of Object.values(NPCS)) {
      for (const reward of npc.rewards) {
        if (reward.kind === 'flag') expect(FLAG_ICONS[reward.flag], reward.flag).toBeDefined();
      }
    }
  });

  it('gives every spell reward an alternative, with its own win line', () => {
    for (const npc of Object.values(NPCS)) {
      if (npc.rewards.some((r) => r.kind === 'spell'))
        expect(npc.lines.winKnown, npc.id).toBeDefined();
    }
    for (const npc of Object.values(NPCS)) {
      for (const reward of npc.rewards) {
        if (reward.kind === 'spell') expect(reward.instead, npc.id).toBeDefined();
      }
    }
  });

  it('brings out secret stock only when Devoted', () => {
    const shop = SHOPS.brightwaterSmith!;
    expect(stockFor(shop, 'friendly')).toBe(shop.stock);
    expect(stockFor(shop, 'devoted')).toEqual([...shop.stock, 'smithHammer']);
    expect(stockFor(SHOPS.mossvaleStall!, 'devoted')).toContain('ironSword');
  });
});

/** A line's first variant in a mood. */
const first = (line: Line, mood: Mood): string | undefined => variantsFor(line, mood)[0];

describe('dialogue', () => {
  const line: MoodLine = { cold: 'c', plain: 'p', warm: 'w' };

  it('picks cold, plain or warm by tier', () => {
    expect(ATTITUDES.map((a) => say(line, a))).toEqual(['c', 'c', 'p', 'w', 'w']);
    expect(say('same', 'hostile')).toBe('same');
  });

  it('confides when Devoted, if the NPC has a confidence', () => {
    expect(introFor(NPCS.elder!, 'devoted')).toBe(first(NPCS.elder!.lines.confide!, 'warm'));
    expect(introFor(NPCS.elder!, 'friendly')).toBe(first(NPCS.elder!.lines.intro, 'warm'));
    expect(introFor(NPCS.sealedChest!, 'devoted')).toBe(
      first(NPCS.sealedChest!.lines.intro, 'warm'),
    );
  });

  it('gives every person an element and lines for every tier they can reach', () => {
    for (const npc of people) {
      expect(ELEMENTS, npc.id).toContain(npc.element);
      const { intro, confide, refuse } = npc.lines;
      const moods = (['cold', 'plain', 'warm'] as const).map((m) => first(intro, m));
      expect(new Set(moods).size, npc.id).toBe(3);
      expect(confide, npc.id).toBeTruthy();
      // Only NPCs who can refuse need a refusal.
      expect(Boolean(refuse), npc.id).toBe(!npc.essential);
    }
  });
});

describe('rewards data', () => {
  const rewardsOf = (npc: NpcDef): Reward[] =>
    [...npc.rewards, npc.bonus, npc.secret].flatMap((r) =>
      !r ? [] : r.kind === 'spell' && r.instead ? [r, r.instead] : [r],
    );

  it('names only real items and spells', () => {
    for (const npc of Object.values(NPCS)) {
      for (const reward of rewardsOf(npc)) {
        if (reward.kind === 'item') expect(ITEMS[reward.itemId], reward.itemId).toBeDefined();
        if (reward.kind === 'spell') expect(SPELLS[reward.spellId], reward.spellId).toBeDefined();
      }
    }
    for (const shop of Object.values(SHOPS)) {
      for (const id of shop.secretStock ?? []) expect(ITEMS[id], id).toBeDefined();
    }
  });

  it('gives every person a warm bonus (or prices) and a secret offer', () => {
    for (const npc of people) {
      const shop = shopOf(npc);
      if (shop) expect(SHOPS[shop]?.secretStock?.length, npc.id).toBeGreaterThan(0);
      else {
        // Vesper, an antagonist, has no warm bonus in the author's script.
        if (npc.voice !== 'vesper') expect(npc.bonus?.kind, npc.id).toBe('item');
        expect(npc.secret, npc.id).toBeDefined();
      }
    }
    expect(
      people
        .filter(isShop)
        .map((n) => n.id)
        .sort(),
    ).toEqual([
      'archiveMerchant',
      'armorer',
      'bellMerchant',
      'eyrieInn',
      'forgeInn',
      'innkeeper',
      'merchant',
      'smith',
      'stallKeeper',
    ]);
  });

  it('sells no spell tomes (mentors teach spells)', () => {
    for (const shop of Object.values(SHOPS)) {
      for (const id of [...shop.stock, ...(shop.secretStock ?? [])]) {
        expect(ITEMS[id]?.use?.learnSpell, `${shop.id}: ${id}`).toBeUndefined();
      }
    }
    for (const npc of Object.values(NPCS)) {
      for (const reward of rewardsOf(npc)) {
        if (reward.kind === 'item') expect(ITEMS[reward.itemId]?.use?.learnSpell).toBeUndefined();
      }
    }
  });
});

describe('encounters on terms', () => {
  it('shows the face and the tier’s words', () => {
    const npc = NPCS.farmer!;
    const plain = describeInteraction(stateFor(npc, 'neutral'), entityOf('farmer'));
    expect(plain).toMatchObject({
      kind: 'challenge',
      attitude: 'neutral',
      text: first(npc.lines.intro, 'plain'),
    });
    const wary = describeInteraction(stateFor(npc, 'wary'), entityOf('farmer'));
    expect(wary).toMatchObject({
      attitude: 'wary',
      text: first(npc.lines.intro, 'cold'),
      spec: { kind: 'encounter', id: 'farmer' },
    });
    const warm = describeInteraction(stateFor(npc, 'friendly'), entityOf('farmer'));
    expect(warm).toMatchObject({ text: first(npc.lines.intro, 'warm'), extras: [npc.bonus] });
  });

  it('makes a Devoted NPC confide and add their secret offer', () => {
    const npc = NPCS.elder!;
    const result = describeInteraction(stateFor(npc, 'devoted'), entityOf('elder'));
    expect(result).toMatchObject({
      kind: 'challenge',
      attitude: 'devoted',
      text: first(npc.lines.confide!, 'warm'),
      extras: [npc.bonus, { kind: 'item', itemId: 'ether', count: 1 }],
    });
  });

  it('refuses a Hostile hero with a curt line', () => {
    const npc = NPCS.farmer!;
    expect(describeInteraction(stateFor(npc, 'hostile'), entityOf('farmer'))).toEqual({
      kind: 'message',
      title: npc.name,
      sprite: npc.sprite,
      attitude: 'hostile',
      text: first(npc.lines.refuse!, 'cold'),
    });
  });

  it('never locks progress: every NPC whose flag the realm needs deals even when Hostile', () => {
    const needed = new Set([
      ...Object.values(MAPS).flatMap((m) => m.warps.flatMap((w) => w.requiresFlag ?? [])),
      ...Object.values(MAPS).flatMap((m) => m.entities.flatMap((e) => e.requiresFlag ?? [])),
      ...SCENES.flatMap((scene) => [
        ...(scene.requiresFlags ?? []),
        ...(scene.dueWith ? [scene.dueWith] : []),
      ]),
      ...Object.values(MENTORS).flatMap((m) => m.route.flatMap((stop) => stop.requiresFlag ?? [])),
      ...Object.values(SPELLS).flatMap((s) => (s.hidden?.kind === 'quest' ? [s.hidden.flag] : [])),
    ]);
    const story = Object.values(NPCS).filter((npc) =>
      npc.rewards.some((r) => r.kind === 'flag' && needed.has(r.flag)),
    );
    expect(story.map((n) => n.id).sort()).toEqual([
      'apprentice',
      'archiveDrain',
      'ascentRepair',
      'bellCircuit',
      'cisternTrial',
      'fennickRite',
      'foreman',
      'foundryProcedure',
      'guard',
      'ketterRescue',
      'rootTram',
      'shrineKeeper',
    ]);
    for (const npc of story) {
      expect(npc.essential, npc.id).toBe(true);
      const result = describeInteraction(
        npc.inanimate ? newGame() : stateFor(npc, 'hostile'),
        entityOf(npc.id),
      );
      if (npc.inanimate) {
        expect(result, npc.id).toMatchObject({ kind: 'challenge', spec: npc.challenge });
        continue;
      }
      expect(result, npc.id).toMatchObject({
        kind: 'challenge',
        attitude: 'hostile',
        text: first(npc.lines.intro, 'cold'),
        spec: { kind: npc.challenge!.kind },
      });
    }
  });

  it('grants the cave pass to a Hostile hero who wins', () => {
    const state = stateFor(NPCS.guard!, 'hostile');
    const battle = makeBattle(
      { kind: 'encounter', id: 'guard', strain: 0, demo: false, assisted: false },
      state.hero,
    );
    expect(commitBattleTry(state, battle)).toBe(true);
    Object.defineProperty(battle, 'status', { value: 'won' });
    const result = resolveBattle(state, entityOf('guard'), battle, createRng(1), 'wary');
    expect(state.flags.has('cavePass')).toBe(true);
    expect(result.speech).toBe(say(NPCS.guard!.lines.win, 'wary'));
  });

  it('teaches the Elder’s Quake, or pays coin to a hero who knows it (never the stone)', () => {
    for (const [classId, gain] of [
      ['ranger', { kind: 'spell', spellId: 'quake' }],
      ['knight', { kind: 'gil', amount: 40 }],
    ] as const) {
      const state = newGame(classId);
      const shown = describeInteraction(state, entityOf('elder'));
      expect(shown).toMatchObject({
        kind: 'challenge',
        spec: { kind: 'encounter', id: 'elder', strain: 0, demo: true, assisted: false },
      });
      const battle = makeBattle(
        { kind: 'encounter', id: 'elder', strain: 0, demo: false, assisted: false },
        state.hero,
      );
      expect(commitBattleTry(state, battle)).toBe(true);
      Object.defineProperty(battle, 'status', { value: 'won' });
      const result = resolveBattle(state, entityOf('elder'), battle, createRng(1), 'neutral');
      expect(result.gains, classId).toEqual([{ kind: 'regard', delta: 1, level: 1 }, gain]);
      // His lines handing over a stone are unsaid: both hear his other success line, then
      // where to go next.
      expect(result.speech).toBe(
        'First bucket’s clean! Tastes like sweet granite. You earned your pay today, kid. Pip’s been wailing about his tower since dawn.'.replace(
          'Pip’s',
          "Pip's",
        ),
      );
      expect(state.hero.items.wellStone ?? 0).toBe(0);
      expect(state.flags.has('npc:elder')).toBe(true);
    }
  });

  it('prices a shop by attitude, and by a haggle won there', () => {
    for (const tier of ['wary', 'neutral', 'friendly', 'devoted'] as const) {
      const state = stateFor(NPCS.merchant!, tier);
      expect(describeInteraction(state, entityOf('merchant')), tier).toMatchObject({
        browse: {
          shopId: 'brightwaterGeneral',
          priceMultiplier: ATTITUDE_PRICES[tier],
          attitude: tier,
        },
      });
    }
    const state = stateFor(NPCS.stallKeeper!, 'neutral');
    state.mapId = 'mossvale';
    settleHaggle(state, 'stallKeeper', 'mossvaleStall', 'win', 0.9);
    const stall = describeInteraction(state, entityOf('stallKeeper'));
    expect(stall).toMatchObject({ kind: 'challenge', browse: { shopId: 'mossvaleStall' } });
    if (stall.kind !== 'challenge' || !stall.browse) throw new Error('a shop');
    // Regard +1 from the win: still Neutral at this score, so 0.9 × 1.
    expect(stall.browse.priceMultiplier).toBeCloseTo(0.9);
    expect(stall.spec).toMatchObject({ kind: 'encounter', id: 'stallKeeper' });
  });

  it('shows faces only on people', () => {
    const state = newGame();
    expect(entityAttitude(state, entityOf('farmer'))).toBe('neutral');
    expect(entityAttitude(state, entityOf('sealedChest'))).toBeNull();
    const monster = MAPS.overworld!.entities.find((e) => e.kind === 'monster')!;
    expect(entityAttitude(state, monster)).toBeNull();
    expect(entityAttitude(state, { id: 'x', kind: 'npc', npcId: 'nope', x: 0, y: 0 })).toBeNull();
    expect(describeInteraction(state, entityOf('sealedChest'))).not.toHaveProperty('attitude');
  });
});
