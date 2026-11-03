/** Isolated, deterministic presentation cases built from real spell previews.
 * This module never attaches a battle, writes a save, or changes campaign progress.
 */
import type { LessonChallenge } from '../battle/lesson';
import { Battle, type AutoCastFrame } from '../battle/battle';
import { BOARD_SPELLS, type CastPreview } from '../battle/magicCasting';
import type { MagicState } from '../core/boardMagic';
import { CRYSTAL_COLORS } from '../core/pieces';
import { createRng } from '../core/rng';
import { required } from '../core/required';
import { ENCOUNTER_DEFS } from '../data/encounters';
import { createHero } from '../game/hero';
import { newKnownSpell } from '../game/spells';
import { saveWeave, upgradeWeave, type WeaveRecipe, type WeaveStage } from '../game/weaving';
import { battleSnapshotFor } from '../nativeBattle';
import { advanceNativePresentation } from './presentation';

const FLAGS = new Set(['wyrmBeaten', 'scene:chapterEnd']);
const SCHOOLS = ['fire', 'blizzard', 'quake', 'gale', 'thunder', 'natureConvert'] as const;
type Phase = AutoCastFrame['phase'];
export interface NativeVisualFixture {
  id: string;
  title: string;
  group: string;
  progress: number;
  state: ReturnType<typeof battleSnapshotFor>;
  /** The web comparison uses exactly the same real resolver frame and waiting piece. */
  web?: {
    frame: AutoCastFrame;
    board: { width: number; height: number; active: Battle['board']['active'] };
    timeMs: number;
  };
}

function battleFor(levels: Record<string, number> = {}, enemyId = 'slime') {
  const hero = createHero();
  hero.spells = Object.fromEntries(
    Object.entries(levels).map(([id, level]) => [id, { ...newKnownSpell(), level }]),
  );
  const battle = new Battle({ kind: 'combat', enemyId }, hero, createRng(842), {
    boardMagic: true,
    autoCast: true,
    autoCastPacingMs: 500,
    storyFlags: FLAGS,
  });
  // Paid/progressed test loadouts exist only in this detached Battle instance.
  hero.manaCap = 100;
  for (const element of Object.keys(hero.mana)) hero.mana[element as keyof typeof hero.mana] = 100;
  hero.hp = Math.max(1, hero.maxHp - 7);
  const combat = required(battle.combat);
  combat.enemyHp = Math.ceil(combat.enemy.hp * 0.8);
  combat.gauge = combat.actMs * 0.4;
  battle.board.loadRows(Array.from({ length: 20 }, () => '..........'));
  battle.board.setFixedQueue(['T', 'I', 'O', 'L']);
  battle.board.spawn();
  if (battle.board.active) battle.board.active.y = 1;
  battle.paused = false;
  return battle;
}

function obstruction(battle: Battle, x: number, y: number, strength: number, step = 1) {
  const cell = required(battle.board.grid[y]);
  cell[x] = 'stone';
  battle.board.obstructions[`${x},${y}`] = {
    id: `visual-${x}-${y}`,
    owner: battle.spec.kind === 'combat' ? battle.spec.enemyId : 'slime',
    anchored: true,
    strength,
    step,
    sequence: [
      { color: 'red', sides: ['left'] },
      { color: 'green', sides: ['top', 'right', 'bottom', 'left'] },
      { color: 'violet', sides: ['top', 'right', 'bottom', 'left'] },
    ],
    contacts: [],
  };
}

function prepareSpell(battle: Battle, id: string) {
  // The blue witness is outside every limited target span and remains in the trace.
  required(battle.board.grid[10])[1] = 'blue';
  for (let y = 14; y <= 17; y++) {
    const row = required(battle.board.grid[y]);
    row[2] = 'red';
    row[4] = 'orange';
    row[6] = 'cyan';
  }
  required(battle.board.grid[19])[0] = 'green';
  required(battle.board.grid[19])[9] = 'violet';
  if (id === 'blizzard') {
    for (let y = 14; y <= 17; y++) {
      const row = required(battle.board.grid[y]);
      for (let x = 0; x < battle.board.width; x++)
        row[x] = x === 4 ? null : (CRYSTAL_COLORS[x % CRYSTAL_COLORS.length] ?? 'red');
    }
  }
  if (id === 'thunder' || id === 'natureConvert') {
    obstruction(battle, 7, 17, 1);
    obstruction(battle, 8, 17, 3);
    obstruction(battle, 8, 16, 2, 0);
  }
  if (id === 'gale') obstruction(battle, 7, 17, 2);
}

function snapshot(battle: Battle, id: string): ReturnType<typeof battleSnapshotFor> {
  const state = structuredClone(battleSnapshotFor(battle));
  // Presentation cache IDs are intentionally stable across independent gallery loads.
  state.battleID = `visual:${id}`;
  return state;
}

function phaseCase(
  battle: Battle,
  id: string,
  title: string,
  group: string,
  preview: CastPreview,
  before: MagicState,
  phase: Phase,
  progress: number,
  index = 1,
  total = 1,
  weave = false,
): NativeVisualFixture {
  battle.board.adoptMagic(phase === 'target' ? before : preview.resolution.state);
  const frame: AutoCastFrame = {
    preview,
    before,
    phase,
    remainingMs: 900 * (1 - progress),
    durationMs: 900,
    index,
    total,
    ...(weave ? { source: 'weave' as const } : {}),
  };
  battle.autoFrame = frame;
  const state = snapshot(battle, id);
  return {
    id,
    title,
    group,
    progress,
    state,
    web: {
      frame: structuredClone(frame),
      board: {
        width: battle.board.width,
        height: battle.board.height,
        active: structuredClone(battle.board.active),
      },
      timeMs: state.visualTimeMs,
    },
  };
}

function spellCases(): NativeVisualFixture[] {
  const result: NativeVisualFixture[] = [];
  for (const school of SCHOOLS)
    for (const rank of [1, 2, 3, 4]) {
      const battle = battleFor({ [school]: rank });
      prepareSpell(battle, school);
      const before = battle.board.magicState();
      const preview = battle.magicCasting.preview(school, { bottomRow: 17, direction: 1 });
      if (preview.reason) throw new Error(`Visual fixture ${school}/${rank}: ${preview.reason}`);
      const group = required(BOARD_SPELLS[school]);
      const effectProgress =
        school === 'thunder' || school === 'natureConvert' ? (rank >= 3 ? 0.42 : 0.27) : 0.3;
      for (const [phase, progress] of [
        ['target', 0.5],
        ['effect', effectProgress],
        ['result', 0.8],
      ] as const)
        result.push(
          phaseCase(
            battle,
            `${school}-r${rank}-${phase}`,
            `${preview.name} · Level ${rank} · ${phase}`,
            group,
            preview,
            before,
            phase,
            progress,
          ),
        );
    }
  return result;
}

function materialCases(): NativeVisualFixture[] {
  const result: NativeVisualFixture[] = [];
  const opening = battleFor();
  CRYSTAL_COLORS.forEach((color, x) => {
    required(opening.board.grid[17])[x + 1] = color;
  });
  required(opening.board.grid[18])[4] = 'neutral';
  result.push({
    id: 'zero-spells',
    title: 'Zero spells · shared crystals and blank material',
    group: 'special',
    progress: 0,
    state: snapshot(opening, 'zero-spells'),
  });
  for (const strength of [1, 2, 3]) {
    const battle = battleFor();
    CRYSTAL_COLORS.forEach((color, x) => {
      required(battle.board.grid[18])[x + 1] = color;
    });
    required(battle.board.grid[17])[3] = 'neutral';
    obstruction(battle, 4, 16, strength);
    obstruction(battle, 6, 16, strength, 0);
    result.push({
      id: `obstruction-${strength}`,
      title: `Obstruction strength ${strength} · current sides and color sequence`,
      group: 'special',
      progress: 0,
      state: snapshot(battle, `obstruction-${strength}`),
    });
  }
  return result;
}

function encounterCases(): NativeVisualFixture[] {
  return ['elder', 'kid', 'farmer', 'stallKeeper', 'forager', 'guard'].map((id, index) => {
    const def = required(ENCOUNTER_DEFS[id]);
    const battle = new Battle(
      { kind: 'encounter', id, strain: 0, demo: false, assisted: false },
      createHero(),
      createRng(4200 + index),
      { boardMagic: true, autoCast: true },
    );
    battle.paused = false;
    const fixtureID = `encounter-${def.skin}`;
    return {
      id: fixtureID,
      title: `${def.title} · ${def.skin} · authored opening board`,
      group: 'special',
      progress: 0,
      state: snapshot(battle, fixtureID),
    };
  });
}

function arcaneCases(): NativeVisualFixture[] {
  const result: NativeVisualFixture[] = [];
  for (const rank of [1, 2, 3, 4]) {
    const battle = battleFor({ shadow: rank }, 'gloomToad');
    prepareSpell(battle, 'shadow');
    const before = battle.board.magicState();
    const preview = battle.magicCasting.preview('shadow', { bottomRow: 17, direction: 1 });
    if (preview.reason) throw new Error(`Visual Arcane fixture: ${preview.reason}`);
    // The actual character cast supplies the displayed damage/heal and its feedback.
    battle.magicCasting.commit(preview);
    battleSnapshotFor(battle);
    advanceNativePresentation(battle, 280);
    result.push(
      phaseCase(
        battle,
        `arcane-r${rank}`,
        `${preview.name} · Level ${rank} · opponent target`,
        'special',
        preview,
        before,
        'effect',
        0.45,
      ),
    );
  }
  for (const school of SCHOOLS) {
    const element = required(BOARD_SPELLS[school]);
    const battle = battleFor({ [school]: 2, shadow: 2 }, 'gloomToad');
    battle.hero.arcane = { [element]: 2 };
    prepareSpell(battle, school);
    if (element === 'lightning') {
      // Ownership is deliberate: the technique must weaken this opponent's stone.
      obstruction(battle, 8, 17, 3);
    }
    battleSnapshotFor(battle);
    battle.castArcane(`arcane:${element}`, { bottomRow: 17, direction: 1 });
    battleSnapshotFor(battle); // Timestamp the actual emitted cast feedback.
    advanceNativePresentation(battle, 280);
    result.push({
      id: `arcane-technique-${element}`,
      title: `Arcane + ${element} · Level 2 · opponent technique`,
      group: 'special',
      progress: 0.28,
      state: snapshot(battle, `arcane-technique-${element}`),
    });
  }
  return result;
}

function weavingCases(): NativeVisualFixture[] {
  const result: NativeVisualFixture[] = [];
  for (const [name, stages, level] of [
    [
      'fire-gravity',
      [
        { spell: 'fire', rank: 1 },
        { spell: 'quake', rank: 1 },
      ],
      1,
    ],
    [
      'gravity-fire',
      [
        { spell: 'quake', rank: 1 },
        { spell: 'fire', rank: 1 },
      ],
      1,
    ],
    [
      'mixed-ranks',
      [
        { spell: 'fire', rank: 2 },
        { spell: 'quake', rank: 1 },
      ],
      2,
    ],
  ] as const) {
    const battle = battleFor({ fire: 4, quake: 4 });
    battle.board.loadRows([
      '..........',
      '..b.......',
      '..........',
      '..........',
      '..r.......',
      '..........',
    ]);
    const recipe: WeaveRecipe = {
      id: `visual-${name}`,
      name: `Visual ${name}`,
      level: 1,
      stages: stages.map((stage) => ({ spell: stage.spell, rank: 1 })) as [WeaveStage, WeaveStage],
    };
    if (!saveWeave(battle.hero, FLAGS, recipe))
      throw new Error('Could not create the fixture weaving.');
    if (level === 2) {
      battle.hero.skillPoints = 100;
      if (!upgradeWeave(battle.hero, FLAGS, recipe.id))
        throw new Error('Could not upgrade the fixture weaving.');
      if (
        !saveWeave(battle.hero, FLAGS, {
          ...recipe,
          level,
          stages: stages.map((stage) => ({ ...stage })) as [WeaveStage, WeaveStage],
        })
      )
        throw new Error('Could not equip mixed fixture ranks.');
    }
    const targets = stages.map((stage) => ({
      bottomRow: stage.spell === 'fire' ? 18 : 15,
      direction: 1 as const,
    })) as [{ bottomRow: number; direction: 1 }, { bottomRow: number; direction: 1 }];
    const preview = battle.previewWeaving(targets);
    if (preview.reason) throw new Error(`Visual weaving ${name}: ${preview.reason}`);
    preview.stages.forEach((stage, index) => {
      for (const [phase, progress] of [
        ['target', 0.5],
        ['effect', 0.3],
        ['result', 0.8],
      ] as const)
        result.push(
          phaseCase(
            battle,
            `weave-${name}-${index + 1}-${phase}`,
            `${name} · stage ${index + 1}/2 · ${phase}`,
            'special',
            stage.preview,
            stage.before,
            phase,
            progress,
            index + 1,
            2,
            true,
          ),
        );
    });
  }
  return result;
}

function lessonCases(): NativeVisualFixture[] {
  const battle = new Battle(
    { kind: 'lesson', mentorId: 'torva', spellId: 'fire', enemyId: 'forgeImp', difficulty: 1 },
    createHero(),
    createRng(478),
    { boardMagic: true },
  );
  const lesson = battle.challenge as LessonChallenge;
  lesson.helpChance = 1;
  battle.input('hardDrop');
  // Arrange the real lesson's shield checkpoint without inventing combat events.
  lesson.enemyHp = Math.ceil(lesson.enemy.hp * lesson.shieldAt);
  lesson.shield = 'up';
  battleSnapshotFor(battle);
  advanceNativePresentation(battle, 160);
  return [
    {
      id: 'mentor-lesson',
      title: 'Mentor lesson · borrowed spell, elemental foe, shield and helper toss',
      group: 'special',
      progress: 0.4,
      state: snapshot(battle, 'mentor-lesson'),
    },
  ];
}

/** Calling this cannot change the attached battle or any campaign save. */
export function nativeVisualFixtures(): NativeVisualFixture[] {
  return [
    ...materialCases(),
    ...spellCases(),
    ...arcaneCases(),
    ...weavingCases(),
    ...encounterCases(),
    ...lessonCases(),
  ];
}
export function visualFixturesJSON(): string {
  return JSON.stringify(nativeVisualFixtures());
}
