import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../src/game/save';
import { newGame } from '../src/world/state';

const data = () => JSON.parse(serialize(newGame()));

describe('save validation', () => {
  it.each(['null', 'true', '7', '[]', '"save"'])(
    'rejects nonobject JSON %s without throwing',
    (json) => {
      expect(deserialize(json)).toBeNull();
    },
  );

  it('rejects the incomplete hero that previously crashed the inventory', () => {
    expect(deserialize(JSON.stringify({ ...data(), hero: { stats: {}, spells: {} } }))).toBeNull();
  });

  it.each([
    ['hp', -1],
    ['hp', 99999],
    ['level', 0],
    ['level', 1.5],
    ['xp', -1],
    ['nextXp', 0],
    ['gil', -1],
    ['skillPoints', null],
    ['items', null],
    ['items', { missingItem: 1 }],
    ['items', { herb: -1 }],
    ['items', { herb: 1.5 }],
    ['weaponId', 'herb'],
    ['armorId', 'missingArmor'],
    ['titleElement', 'missingElement'],
    ['mana', {}],
    ['stats', {}],
    ['spells', { fire: { level: 999, step: {}, kept: {} } }],
    ['spells', { missingSpell: { level: 1, step: {}, kept: {} } }],
    ['failedLessons', { arcane: { spellId: 'fire', level: 1 } }],
    ['feats', { hastedClear: -1 }],
  ])('rejects invalid hero field %s=%j', (field, value) => {
    const save = data();
    save.hero[field as string] = value;
    expect(deserialize(JSON.stringify(save))).toBeNull();
  });

  it.each([
    ['facing', 'diagonal'],
    ['flags', [1]],
    ['victories', -1],
    ['victories', 0.5],
    ['x', 2.5],
    ['mapId', 'constructor'],
  ])('rejects invalid world field %s=%j', (field, value) => {
    expect(deserialize(JSON.stringify({ ...data(), [field as string]: value }))).toBeNull();
  });

  it('rejects nonfinite numbers parsed from valid JSON', () => {
    const json = serialize(newGame()).replace('"gil":25', '"gil":1e999');
    expect(json).toContain('1e999');
    expect(deserialize(json)).toBeNull();
  });

  it('accepts valid heroes for all classes', () => {
    for (const id of ['ranger', 'knight', 'mage', 'rogue']) {
      const state = newGame(id);
      expect(deserialize(serialize(state))?.hero).toEqual(state.hero);
    }
  });

  it('keeps the documented default-class fallback for old unknown class IDs', () => {
    const save = data();
    save.hero.classId = 'constructor';
    expect(deserialize(JSON.stringify(save))?.hero.classId).toBe('ranger');
  });

  it('rejects out-of-range mana, stats and malformed spell enhancement counts', () => {
    for (const damage of [
      (save: ReturnType<typeof data>) => {
        save.hero.mana.fire = save.hero.manaCap + 1;
      },
      (save: ReturnType<typeof data>) => {
        save.hero.stats.vitality = 11;
      },
      (save: ReturnType<typeof data>) => {
        save.hero.spells.gale.step.power = -1;
      },
      (save: ReturnType<typeof data>) => {
        save.hero.spells.gale.kept.efficiency = 1.5;
      },
    ]) {
      const save = data();
      damage(save);
      expect(deserialize(JSON.stringify(save))).toBeNull();
    }
  });

  it('recovers an invalid respawn point without accepting fractional positions', () => {
    const save = data();
    save.respawn = { map: 'constructor', x: 1, y: 1 };
    expect(deserialize(JSON.stringify(save))?.respawn).toEqual(newGame().respawn);
  });
});
