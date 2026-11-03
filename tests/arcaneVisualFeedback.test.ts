import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { ARCANE_BASE } from '../src/game/arcane';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import { battleSnapshotFor } from '../src/nativeBattle';
import { feedbackFor } from '../src/ui/art/feedback';

describe('committed opponent technique presentation', () => {
  it.each(
    (['fire', 'water', 'wind', 'lightning', 'nature', 'earth'] as const).flatMap((element) =>
      [1, 2, 3, 4].map((rank) => ({ element, rank })),
    ),
  )(
    'identifies the actual $element rank $rank without inventing a board cast',
    ({ element, rank }) => {
      const hero = createHero();
      for (const id of ['shadow', ARCANE_BASE[element]])
        hero.spells[id] = { ...newKnownSpell(), level: 4 };
      hero.arcane = { [element]: rank };
      const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(45), {
        boardMagic: true,
        storyFlags: new Set(['wyrmBeaten', 'scene:chapterEnd']),
      });
      for (const key of Object.keys(hero.mana)) hero.mana[key as keyof typeof hero.mana] = 100;
      battle.combat!.gauge = -100000;
      battle.board.loadRows(Array.from({ length: 20 }, () => '..........'));
      battle.board.active = null;
      battle.board.grid[17]![8] = 'stone';
      battle.board.obstructions['8,17'] = {
        id: 'actual-slime-stone',
        owner: 'slime',
        anchored: true,
        strength: 3,
        sequence: [],
        contacts: [],
        step: 0,
      };
      const id = `arcane:${element}`,
        target = { bottomRow: 17, direction: 1 as const };
      const preview = battle.magicCasting.preview(id, target);
      expect(preview.reason).toBeNull();
      const mana = { ...hero.mana };
      battle.castArcane(id, target);
      const spells = battle.events.filter(({ event }) => event.kind === 'spell');
      expect(spells).toHaveLength(1);
      const event = spells[0]!.event;
      expect(event).toEqual({
        kind: 'spell',
        spellId: 'shadow',
        opponentTechnique: { id, element, rank },
      });
      expect(feedbackFor(event)).toEqual([
        { kind: 'opponentCast', target: 'enemy', element, rank, technique: id },
      ]);
      expect(battleSnapshotFor(battle).feedback).toContainEqual(
        expect.objectContaining({
          kind: 'opponentCast',
          target: 'enemy',
          element,
          rank,
          technique: id,
        }),
      );
      expect(battle.autoFrame).toBeNull();
      for (const key of Object.keys(mana)) {
        const color = key as keyof typeof mana;
        expect(hero.mana[color]).toBe(mana[color] - (preview.cost[color] ?? 0));
      }
    },
  );

  it('emits no opponent cue when a player has not learned the technique', () => {
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(45), {
      boardMagic: true,
    });
    expect(() => battle.castArcane('arcane:wind', { bottomRow: 17, direction: 1 })).toThrow();
    expect(battleSnapshotFor(battle).feedback.some((item) => item.kind === 'opponentCast')).toBe(
      false,
    );
  });

  it('does not fabricate an opponent technique for a generic legacy Shadow event', () => {
    expect(feedbackFor({ kind: 'spell', spellId: 'shadow' })).toEqual([]);
  });
});
