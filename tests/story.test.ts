import { describe, expect, it } from 'vitest';
import { weakTo } from '../src/core/elements';
import { createRng } from '../src/core/rng';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import { SPELLS } from '../src/data/spells';
import { PRELUDES, VESPER_LINES, VESPER_ROUTE, VISIONS, reachedFlag } from '../src/data/story';
import { attitudeOf } from '../src/game/attitude';
import { describeInteraction, reply, resolveBattle } from '../src/game/encounter';
import { FINALE_FLAG } from '../src/game/ending';
import { addItem, itemCount, removeItem } from '../src/game/hero';
import {
  parseStage,
  pickVariant,
  speak,
  variantsFor,
  variantsOf,
  type LineMemory,
} from '../src/game/lines';
import { SAVE_VERSION, deserialize, serialize } from '../src/game/save';
import { newKnownSpell } from '../src/game/spells';
import {
  arrive,
  dismissVision,
  pendingVision,
  migrateStory,
  preludeFor,
  vesperEntities,
  vesperStop,
  visionOnWarp,
} from '../src/game/story';
import { tileAt, warpAt, type EntityDef } from '../src/world/map';
import { activeEntities, newGame, travel, type GameState } from '../src/world/state';
import { makeBattle } from './helpers';

describe('rotating lines', () => {
  it('reads one sentence or a list of variants', () => {
    expect(variantsOf('one')).toEqual(['one']);
    expect(variantsOf(['a', 'b'])).toEqual(['a', 'b']);
    expect(variantsFor(['a', 'b'], 'cold')).toEqual(['a', 'b']);
  });

  it('picks a mood’s cell, falling back to the nearest mood when one is missing', () => {
    const line = { cold: 'c', plain: ['p1', 'p2'], warm: 'w' };
    expect(variantsFor(line, 'cold')).toEqual(['c']);
    expect(variantsFor(line, 'plain')).toEqual(['p1', 'p2']);
    expect(variantsFor({ plain: 'p' }, 'cold')).toEqual(['p']);
    expect(variantsFor({ plain: 'p' }, 'warm')).toEqual(['p']);
    expect(variantsFor({ cold: 'c' }, 'warm')).toEqual(['c']);
    expect(variantsFor({ warm: 'w', plain: [] }, 'plain')).toEqual(['w']);
    expect(variantsFor({}, 'plain')).toEqual([]);
  });

  it('rotates so a speaker never says the same sentence twice running', () => {
    const memory: LineMemory = {};
    const said = Array.from({ length: 6 }, () => pickVariant(['a', 'b', 'c'], memory, 'k'));
    expect(said).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
    expect(memory).toEqual({ k: 6 });
    // Each moment keeps its own count; one variant always says it; no memory says the first.
    expect(pickVariant(['x', 'y'], memory, 'other')).toBe('x');
    expect(pickVariant(['only'], memory, 'k')).toBe('only');
    expect(pickVariant(['x', 'y'])).toBe('x');
    expect(pickVariant([], memory, 'k')).toBe('...');
    expect(speak({ warm: ['w1', 'w2'] }, 'warm', memory, 'w')).toBe('w1');
    expect(speak({ warm: ['w1', 'w2'] }, 'warm', memory, 'w')).toBe('w2');
  });
});

describe('stage directions', () => {
  it('splits narration from speech', () => {
    expect(parseStage('*A shadow moves.* "Hello."')).toEqual([
      { kind: 'stage', text: 'A shadow moves.' },
      { kind: 'speech', text: ' "Hello."' },
    ]);
    expect(parseStage('Purple *and* gravel')).toEqual([
      { kind: 'speech', text: 'Purple ' },
      { kind: 'stage', text: 'and' },
      { kind: 'speech', text: ' gravel' },
    ]);
  });

  it('keeps plain lines and lone asterisks as written', () => {
    expect(parseStage('Just words.')).toEqual([{ kind: 'speech', text: 'Just words.' }]);
    expect(parseStage('5 * 3')).toEqual([{ kind: 'speech', text: '5 * 3' }]);
    expect(parseStage('5 * 3 * 2')).toEqual([{ kind: 'speech', text: '5 * 3 * 2' }]);
    expect(parseStage('**bold**')).toEqual([{ kind: 'speech', text: '**bold**' }]);
    expect(parseStage('a*b*c')).toEqual([{ kind: 'speech', text: 'a*b*c' }]);
    expect(parseStage('**')).toEqual([{ kind: 'speech', text: '**' }]);
    expect(parseStage('')).toEqual([]);
    expect(parseStage('Say "*bows*", then go.')).toEqual([
      { kind: 'speech', text: 'Say "*bows*", then go.' },
    ]);
    expect(parseStage('He *bows*, then goes.')).toEqual([
      { kind: 'speech', text: 'He ' },
      { kind: 'stage', text: 'bows' },
      { kind: 'speech', text: ', then goes.' },
    ]);
  });
});

describe('dialogue rotation in encounters', () => {
  const entityOf = (npcId: string): EntityDef =>
    Object.values(MAPS)
      .flatMap((m) => m.entities)
      .find((e) => e.kind === 'npc' && e.npcId === npcId)!;

  it('greets with the next variant each time, and remembers it in the save', () => {
    const state = newGame();
    const elder = entityOf('elder');
    const intro = variantsFor(NPCS.elder!.lines.intro, 'plain');
    expect(describeInteraction(state, elder).text).toBe(intro[0]);
    expect(describeInteraction(state, elder).text).toBe(intro[1]);
    expect(state.talk['elder.intro']).toBe(2);
    const loaded = deserialize(serialize(state))!;
    expect(describeInteraction(loaded, elder).text).toBe(intro[0]);
  });

  it('counts a reply only when it is said, so declining twice says two lines', () => {
    const state = newGame();
    const bea = entityOf('farmer');
    const decline = variantsFor(NPCS.farmer!.lines.decline, 'plain');
    const accept = variantsFor(NPCS.farmer!.lines.accept, 'plain');
    expect(decline.length).toBe(2);
    const offer = () => {
      const offered = describeInteraction(state, bea);
      if (offered.kind !== 'challenge' || !offered.replies) throw new Error('expected an offer');
      return offered.replies;
    };
    expect(reply(state, offer(), 'decline')).toBe(decline[0]);
    expect(reply(state, offer(), 'accept')).toBe(accept[0]);
    expect(reply(state, offer(), 'decline')).toBe(decline[1]);
    expect(reply(state, offer(), 'accept')).toBe(accept[1]);
    expect(state.talk['farmer.decline']).toBe(2);
  });

  it('rotates a mentor’s words', () => {
    const state = newGame();
    const torva = MENTORS.torva!;
    const entity: EntityDef = { id: 'm', kind: 'mentor', mentorId: 'torva', x: 0, y: 0 };
    expect(describeInteraction(state, entity).text).toBe(variantsOf(torva.motive)[0]);
    expect(state.talk['torva.motive']).toBe(1);
  });
});

describe('the Moon Wyrm’s visions', () => {
  it('shows each vision once, on leaving Mossvale or entering the quarry and the peaks', () => {
    const none = new Set<string>();
    expect(visionOnWarp('mossvale', 'overworld', none)?.id).toBe('vision1');
    expect(visionOnWarp('overworld', 'quarry', none)?.id).toBe('vision2');
    expect(visionOnWarp('overworld', 'peaks', none)?.id).toBe('vision3');
    expect(visionOnWarp('overworld', 'grove', none)).toBeNull();
    expect(visionOnWarp('mossvale', 'mossvale', none)).toBeNull();
    expect(visionOnWarp('mossvale', 'overworld', new Set(['vision:1']))).toBeNull();
  });

  it('marks the vision seen and the map reached on arrival, rotating the Wyrm’s words', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 5, y: 6 });
    const first = arrive(state, 'mossvale');
    expect(first).toEqual({ id: 'vision1', text: variantsOf(VISIONS[0]!.lines)[0] });
    expect(state.flags).toEqual(
      new Set([reachedFlag('overworld'), 'vision:1', 'pending:vision1:0']),
    );
    // Closed on the vision, the game shows the same words again, without
    // moving the rotation; dismissed, never.
    expect(pendingVision(state)).toEqual(first);
    expect(pendingVision(deserialize(serialize(state))!)).toEqual(first);
    expect(state.talk.wyrm).toBe(1);
    dismissVision(state, 'vision1');
    dismissVision(state, 'vision1');
    expect(pendingVision(state)).toBeNull();
    expect(state.flags).toEqual(new Set([reachedFlag('overworld'), 'vision:1']));
    travel(state, { map: 'mossvale', x: 9, y: 13 });
    expect(arrive(state, 'overworld')).toBeNull();
    travel(state, { map: 'overworld', x: 5, y: 6 });
    expect(arrive(state, 'mossvale')).toBeNull();
    travel(state, { map: 'quarry', x: 16, y: 1 });
    const second = arrive(state, 'overworld');
    expect(second?.text).toBe(variantsOf(VISIONS[1]!.lines)[1]);
    expect(state.flags.has('pending:vision2:1')).toBe(true);
    expect(pendingVision(state)).toEqual(second);
  });

  it('speaks in the lair before the fight, rotating, and nowhere else', () => {
    const memory: LineMemory = {};
    const lair = variantsOf(PRELUDES.moonWyrm!);
    expect(preludeFor('moonWyrm', memory)).toBe(lair[0]);
    expect(preludeFor('moonWyrm', memory)).toBe(lair[1]);
    expect(preludeFor('slime', memory)).toBeNull();
    const state = newGame();
    const wyrm = MAPS.caves2!.entities.find((e) => e.id === 'c2-wyrm')!;
    expect(describeInteraction(state, wyrm)).toMatchObject({ kind: 'challenge', prelude: lair[0] });
    const slime = MAPS.overworld!.entities[0]!;
    expect(describeInteraction(state, slime)).not.toHaveProperty('prelude');
  });
});

describe('Vesper, one step ahead', () => {
  it('waits at the newest step of the story, nowhere before the first vision or after the Wyrm', () => {
    const at = (...flags: string[]) => vesperStop(new Set(flags))?.npcId ?? null;
    expect(at()).toBeNull();
    expect(at('vision:1')).toBe('vesperRoad');
    expect(at('vision:1', 'vision:2')).toBe('vesperRidge');
    expect(at('vision:3', 'vision:1', 'vision:2')).toBe('vesperPeaks');
    expect(at('vision:1', 'vision:2', 'vision:3', reachedFlag('ruins'))).toBe('vesperRuins');
    expect(at('vision:1', 'vision:2', FINALE_FLAG)).toBeNull();
  });

  it('stands on one map at a time, as someone the hero can walk into', () => {
    const state = newGame();
    state.flags.add('vision:1');
    expect(vesperEntities(state)).toEqual([]);
    travel(state, { map: 'overworld', x: 5, y: 6 });
    const [vesper] = vesperEntities(state);
    expect(vesper).toMatchObject({ kind: 'npc', npcId: 'vesperRoad', x: 8, y: 6 });
    expect(activeEntities(state)).toContainEqual(vesper);
    expect(vesperEntities({ ...state, x: 8, y: 6 })).toEqual([]);
    state.flags.add('vision:2');
    expect(vesperEntities(state)).toEqual([]);
  });

  it('stops on walkable tiles, clear of warps, people and mentors', () => {
    const mentorStops = Object.values(MENTORS).flatMap((m) => m.route);
    for (const stop of VESPER_ROUTE) {
      const map = MAPS[stop.map]!;
      expect(tileAt(map, stop.x, stop.y).walkable, stop.npcId).toBe(true);
      expect(warpAt(map, stop.x, stop.y), stop.npcId).toBeUndefined();
      const taken = [...map.entities, ...mentorStops.filter((s) => s.map === stop.map)];
      expect(
        taken.some((e) => e.x === stop.x && e.y === stop.y),
        stop.npcId,
      ).toBe(false);
      expect(NPCS[stop.npcId]).toMatchObject({ voice: 'vesper', lines: VESPER_LINES });
    }
    expect(new Set(VESPER_ROUTE.map((s) => s.npcId)).size).toBe(VESPER_ROUTE.length);
  });

  it('sets an Offering or a Puzzle and pays Moon Shards and lore', () => {
    const kinds = VESPER_ROUTE.map((s) => NPCS[s.npcId]!.challenge.kind);
    expect(kinds).toEqual(['puzzle', 'offering', 'puzzle', 'offering']);
    for (const stop of VESPER_ROUTE) {
      const npc = NPCS[stop.npcId]!;
      expect(npc.rewards).toContainEqual(expect.objectContaining({ itemId: 'moonShard' }));
      expect(npc.rewards).toContainEqual({ kind: 'flag', flag: expect.stringMatching(/^lore:/) });
    }
  });

  it('refuses a Hostile hero, deals otherwise, and has words for afterwards', () => {
    const state = newGame();
    state.flags.add('vision:1');
    travel(state, { map: 'overworld', x: 5, y: 6 });
    const vesper = vesperEntities(state)[0]!;
    const npc = NPCS.vesperRoad!;
    const neutral = describeInteraction(state, vesper);
    expect(neutral).toMatchObject({
      kind: 'challenge',
      title: npc.name,
      text: variantsFor(VESPER_LINES.intro, 'plain')[0],
    });
    if (neutral.kind !== 'challenge') throw new Error('expected a challenge');
    const battle = makeBattle(neutral.spec, state.hero);
    Object.defineProperty(battle, 'status', { value: 'won' });
    const result = resolveBattle(state, vesper, battle, createRng(1), neutral.terms);
    expect(itemCount(state.hero, 'moonShard')).toBe(1);
    expect(state.flags.has('lore:vesper.road')).toBe(true);
    expect(result.speech).toBe(variantsFor(VESPER_LINES.win, 'plain')[0]);
    expect(describeInteraction(state, vesper).text).toBe(
      variantsFor(VESPER_LINES.done!, 'plain')[0],
    );

    const hostile = newGame();
    hostile.flags.add('vision:1');
    hostile.hero.spells = Object.fromEntries(
      weakTo('arcane').map((e) => [
        Object.values(SPELLS).find((s) => s.category === e && s.role === 'primary')!.id,
        { ...newKnownSpell(), level: 4 },
      ]),
    );
    expect(attitudeOf(hostile.hero, npc)).toBe('hostile');
    expect(describeInteraction(hostile, vesper)).toMatchObject({
      kind: 'message',
      text: variantsFor(VESPER_LINES.refuse!, 'cold')[0],
    });
  });

  it('asks for its offering before dealing', () => {
    const state = newGame();
    while (removeItem(state.hero, 'herb'));
    const ridge: EntityDef = { id: 'v', kind: 'npc', npcId: 'vesperRidge', x: 0, y: 0 };
    expect(describeInteraction(state, ridge)).toMatchObject({ kind: 'needsItem', itemId: 'herb' });
    addItem(state.hero, 'herb');
    expect(describeInteraction(state, ridge).kind).toBe('challenge');
  });
});

describe('save version 8 (story)', () => {
  /** A version 7 save of this game, before the story beats. */
  const old = (state: GameState): GameState => {
    const data = JSON.parse(serialize(state));
    delete data.talk;
    return deserialize(JSON.stringify({ ...data, version: 7 }))!;
  };

  it('saves the line memory and the story flags', () => {
    const state = newGame();
    state.talk = { 'elder.intro': 3 };
    state.flags.add('vision:1');
    expect(SAVE_VERSION).toBe(11);
    const loaded = deserialize(serialize(state))!;
    expect(loaded.talk).toEqual({ 'elder.intro': 3 });
    expect(loaded.flags.has('vision:1')).toBe(true);
    const withTalk = (talk: unknown) =>
      deserialize(JSON.stringify({ ...JSON.parse(serialize(state)), talk }))!.talk;
    expect(withTalk(5)).toEqual({});
    expect(withTalk({ a: 2, b: -1, c: 1.5, d: 'x', e: 1e20, f: 0 })).toEqual({ a: 2, f: 0 });
  });

  it('shows a fresh old save every vision, but none an old save is already past', () => {
    expect([...old(newGame()).flags]).toEqual([reachedFlag('mossvale'), 'scene:opening']);
    const quarry = newGame();
    travel(quarry, { map: 'quarry', x: 16, y: 1 });
    expect(old(quarry).flags).toEqual(
      new Set([
        reachedFlag('quarry'),
        'vision:1',
        'vision:2',
        'scene:opening',
        'scene:refusal',
        'got:wellStone',
      ]),
    );
    const caves = newGame();
    travel(caves, { map: 'caves2', x: 8, y: 9 });
    expect(vesperStop(old(caves).flags)?.npcId).toBe('vesperRuins');
    const won = newGame();
    won.victories = 2;
    expect(old(won).flags.has('vision:1')).toBe(true);
  });

  it('counts every vision seen once the Wyrm has fallen', () => {
    const flags = new Set([FINALE_FLAG]);
    migrateStory(flags, 'unknownMap', 0);
    expect(flags).toEqual(
      new Set([
        FINALE_FLAG,
        'vision:1',
        'vision:2',
        'vision:3',
        reachedFlag('quarry'),
        reachedFlag('peaks'),
        reachedFlag('ruins'),
      ]),
    );
  });

  it('reads progress flags, not just the map, so a late save on the hub stays in order', () => {
    const onHub = (...flags: string[]) => {
      const state = newGame();
      travel(state, { map: 'overworld', x: 5, y: 6 });
      for (const flag of flags) state.flags.add(flag);
      return old(state).flags;
    };
    const gate = onHub('ridgeCleared', 'peakGate');
    for (const flag of ['vision:1', 'vision:2', 'vision:3', reachedFlag('peaks')]) {
      expect(gate.has(flag), flag).toBe(true);
    }
    expect(gate.has(reachedFlag('ruins'))).toBe(false);
    expect(vesperStop(gate)?.npcId).toBe('vesperPeaks');
    // No vision is left to play out of order.
    expect(visionOnWarp('overworld', 'quarry', gate)).toBeNull();
    expect(vesperStop(onHub('ridgeCleared'))?.npcId).toBe('vesperRidge');
    expect(vesperStop(onHub('cavePass'))?.npcId).toBe('vesperRuins');
    expect(onHub('cavePass').has('vision:3')).toBe(true);
  });
});
