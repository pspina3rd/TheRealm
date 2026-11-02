import '../nativeBattle';
import { tomePages, conversationPage, type TomePage } from './tome';
import {
  ARCANE_ELEMENTS,
  ARCANE_PURPOSE,
  arcaneUnlocked,
  arcaneRank,
  arcaneCap,
  createArcane,
  upgradeArcane,
  ARCANE_UPGRADE_COSTS,
} from '../game/arcane';
import {
  WEAVE_SPELLS,
  WEAVE_NAMES,
  saveWeave,
  weaveCost,
  upgradeWeave,
  weaveCap,
  WEAVE_UPGRADE_COSTS,
  type WeaveStage,
  type WeaveRecipe,
} from '../game/weaving';
import { bringItems, itemsFor } from '../game/hidden';
import { MENTORS } from '../data/mentors';
import { stockFor } from '../game/attitude';
import { battleTryCommitted } from '../game/encounterFlow';
import { STANDARD_SPELLS, type MagicTarget } from '../battle/magicCasting';
import { Battle } from '../battle/battle';
import {
  attachCampaignBattle,
  currentNativeBattle,
  dispatch as battleDispatch,
} from '../nativeBattle';
import { CLASSES } from '../data/classes';
import { MAPS } from '../data/maps';
import { MAP_RULES } from '../data/balance';
import { surfaceProvince } from '../data/surfaceLayout';
import { ITEMS } from '../data/items';
import { SHOPS } from '../data/shops';
import { SPELLS, ENHANCEMENT_IDS } from '../data/spells';
import { STATS, STAT_IDS } from '../data/stats';
import { createRng } from '../core/rng';
import { required } from '../core/required';
import { newGame, travel, currentMap, type GameState } from '../world/state';
import { step } from '../world/movement';
import { pathTo } from '../world/path';
import type { Direction, EntityDef } from '../world/map';
import {
  describeInteraction,
  lessonInteraction,
  resolveBattle,
  reply,
  commitBattleTry,
} from '../game/encounter';
import { prepareLesson } from '../game/lessons';
import { serialize, deserialize } from '../game/save';
import { dueScenes, finishScene, arrive, pendingVision, dismissVision } from '../game/story';
import { hometownText } from '../data/hometowns';
import { dualChance, pieceWeights } from '../game/pieceOdds';
import { openingLead } from '../game/opening';
import { cannotBuyReason, priceFor, buy, sell, sellableItems } from '../game/shop';
import { useItem, cannotUseReason, slotFor, equip, spendSkillPoints } from '../game/hero';
import {
  EMPTY_PLAN,
  skillPlanCost,
  canRaiseStat,
  canEnhance,
  adjustStat,
  adjustEnhancement,
} from '../game/skills';
import type { Gain } from '../game/rewards';
import { spellName, levelStep } from '../game/spells';
import type { Attitude } from '../game/attitude';
import { worldSnapshot, overviewSnapshot } from './world';

interface Choice {
  label: string;
  run: () => void;
  enabled?: boolean;
}
interface Panel {
  title: string;
  text: string;
  actions: { id: string; label: string; enabled: boolean }[];
  tome?: TomePage;
}
let game: GameState | null = null;
let panel: Panel | null = null;
const actions = new Map<string, () => void>();
let revision = 0;
let battleInfo: { entity: EntityDef; terms?: Attitude } | null = null;
let walking: Direction[] = [];
let seed = 101;
let dirty = false;
let outgoingSave: string | null = null;
let overview: ReturnType<typeof overviewSnapshot> | null = null;
let cachedWorld: ReturnType<typeof worldSnapshot> | null = null;
const rng = () => createRng(seed++);
const state = () => required(game, 'Choose a hero or continue a saved campaign.');
function show(title: string, text: string, choices: Choice[]): void {
  walking = [];
  overview = null;
  actions.clear();
  revision++;
  panel = {
    title,
    text: hometownText(text, state().flags),
    actions: choices.map((choice, index) => {
      const id = `${revision}:${index}`;
      if (choice.enabled !== false) actions.set(id, choice.run);
      return { id, label: choice.label, enabled: choice.enabled !== false };
    }),
  };
}
function clear(): void {
  panel = null;
  overview = null;
  actions.clear();
  walking = [];
}
function message(title: string, text: string, after = scenes): void {
  show(title, text, [{ label: 'Continue', run: after }]);
}
function bookMessage(
  title: string,
  text: string,
  source: string | undefined,
  after: () => void,
  caption = '',
): void {
  const page = conversationPage(title, text, source, state(), caption);
  show(title, page.dialogue, [
    { label: 'Continue', run: after },
    { label: 'Skip scene', run: after },
  ]);
  required(panel).tome = page;
}
function scenes(): void {
  clear();
  const s = state(),
    vision = pendingVision(s);
  if (vision) {
    bookMessage('A distant voice', vision.text, 'battler.wyrm', () => {
      dismissVision(s, vision.id);
      dirty = true;
      scenes();
    });
    return;
  }
  const scene = dueScenes(s.flags, s.mapId)[0];
  if (!scene) return;
  const pages = tomePages(scene, s);
  const complete = () => {
    finishScene(s, scene);
    dirty = true;
    scenes();
  };
  const page = (index: number): void => {
    const beat = pages[index];
    if (!beat) {
      complete();
      return;
    }
    show(beat.title, beat.dialogue, [
      ...(index > 0 ? [{ label: 'Previous page', run: () => page(index - 1) }] : []),
      {
        label: index + 1 === pages.length ? 'Return to the world' : 'Next page',
        run: () => page(index + 1),
      },
      { label: 'Skip scene', run: complete },
    ]);
    required(panel).tome = beat;
  };
  page(0);
}
function interact(
  entity: EntityDef,
  interaction?: ReturnType<typeof describeInteraction>,
  keepGifts = false,
): void {
  if (!interaction) {
    if (entity.kind === 'mentor' && !keepGifts) {
      const mentor = required(MENTORS[entity.mentorId]),
        items = itemsFor(state(), mentor);
      if (items.length) {
        show(
          mentor.name,
          `${items.map((id) => ITEMS[id]?.name ?? id).join(', ')} → ${mentor.name}`,
          [
            { label: 'Keep', run: () => interact(entity, undefined, true) },
            {
              label: 'Give',
              run: () => {
                bringItems(state(), mentor);
                dirty = true;
                interact(entity, undefined, true);
              },
            },
          ],
        );
        return;
      }
    }
    interaction = describeInteraction(state(), entity);
  }
  dirty = true;
  const card = interaction;
  const choices: Choice[] = [];
  if (card.kind === 'lessons') {
    for (const lesson of card.lessons)
      choices.push({
        label: `${spellName(required(SPELLS[lesson.spellId]), state().hero.spells[lesson.spellId]?.level)} · Level ${lesson.level}`,
        run: () => interact(entity, lessonInteraction(state(), card.mentorId, lesson)),
      });
  }
  if (card.kind === 'challenge') {
    const begin = (assisted = false) => {
      if (card.replies) reply(state(), card.replies, 'accept');
      const spec = assisted ? card.assistedSpec : card.spec;
      if (!spec) return;
      if (spec.kind === 'lesson') prepareLesson(state().hero);
      const s = state(),
        province = s.mapId === 'overworld' ? surfaceProvince(s.x, s.y)?.id : undefined,
        local = currentMap(s);
      const weights = pieceWeights(
        province ? { ...local, pieceBias: MAPS[province]?.pieceBias } : local,
        s.hero,
      );
      const rule = spec.kind === 'combat' ? MAP_RULES[province ?? s.mapId] : undefined;
      const battle = new Battle(spec, s.hero, rng(), {
        weights,
        dualChance: dualChance(s.hero),
        boardMagic: spec.kind === 'combat' || spec.kind === 'lesson',
        autoCast: spec.kind === 'combat',
        autoCastPacingMs: 500,
        storyFlags: s.flags,
        ...(rule ? { rule } : {}),
      });
      attachCampaignBattle(battle, () => {
        const ok = commitBattleTry(s, battle);
        dirty = true;
        return ok;
      });
      battleInfo = { entity, terms: card.terms };
      clear();
      dirty = true;
    };
    if (entity.kind === 'monster') {
      if (card.prelude) bookMessage(card.title, card.prelude, card.sprite, () => begin());
      else begin();
      return;
    }
    if (card.canAccept !== false)
      choices.push({
        label: 'Begin',
        run: () => {
          if (card.prelude) bookMessage(card.title, card.prelude, card.sprite, () => begin());
          else begin();
        },
      });
    if (card.assistedSpec) choices.push({ label: 'Begin with help', run: () => begin(true) });
  }
  if ('browse' in card && card.browse) {
    const browse = card.browse;
    choices.push({
      label: 'Browse',
      run: () => shop(browse.shopId, browse.priceMultiplier, browse.attitude),
    });
  }
  choices.push({
    label: card.kind === 'challenge' ? 'Leave' : 'Continue',
    run: () => {
      if (card.kind === 'challenge' && card.replies) reply(state(), card.replies, 'decline');
      scenes();
    },
  });
  const objective = card.kind === 'challenge' ? card.stakes?.objective : undefined;
  show(
    card.title,
    [card.text, objective, card.kind === 'challenge' ? card.stakes?.blockedReason : null]
      .filter(Boolean)
      .join('\n\n'),
    choices,
  );
  if (card.kind !== 'needsItem')
    required(panel).tome = conversationPage(
      card.title,
      card.text,
      card.sprite,
      state(),
      [objective, card.kind === 'challenge' ? card.stakes?.blockedReason : null]
        .filter(Boolean)
        .join('\n'),
    );
}
function move(direction: Direction): void {
  const s = state(),
    result = step(s, direction);
  cachedWorld = null;
  dirty = true;
  if (result.kind === 'warp') {
    const from = s.mapId;
    travel(s, result.to);
    arrive(s, from);
    scenes();
  } else if (result.kind === 'interact') interact(result.entity);
  else if (result.kind === 'locked') message('The way ahead', result.text);
  else if (result.kind === 'blocked') walking = [];
}
function finishBattle(): void {
  const info = required(battleInfo, 'There is no campaign battle.'),
    battle = required(currentNativeBattle());
  if (battle.status === 'ongoing' || battle.autoCastingBusy)
    throw new Error('Finish the encounter first.');
  const resolution = resolveBattle(state(), info.entity, battle, rng(), info.terms);
  battleInfo = null;
  dirty = true;
  cachedWorld = null;
  const after = () =>
    resolution.shopId
      ? shop(resolution.shopId, resolution.priceMultiplier, resolution.attitude ?? 'neutral')
      : scenes();
  message(
    resolution.won ? 'Encounter complete' : 'Try again',
    [
      resolution.speech ?? (resolution.fell ? 'You wake at your last resting place.' : ''),
      ...resolution.gains.map(gainText),
    ]
      .filter(Boolean)
      .join('\n'),
    after,
  );
}
function gainText(gain: Gain): string {
  switch (gain.kind) {
    case 'xp':
      return `+${gain.amount} XP`;
    case 'gil':
      return `${gain.amount >= 0 ? '+' : ''}${gain.amount} gil`;
    case 'item':
      return `${gain.count >= 0 ? '+' : ''}${gain.count} ${ITEMS[gain.itemId]?.name ?? gain.itemId}`;
    case 'level':
      return `Level ${gain.level} · +${gain.points} skill points`;
    case 'spell':
      return `Learned ${spellName(required(SPELLS[gain.spellId]), state().hero.spells[gain.spellId]?.level)}`;
    case 'spellLevel':
      return `${spellName(required(SPELLS[gain.spellId]), gain.level)} · Level ${gain.level}`;
    case 'seal':
      return `${spellName(required(SPELLS[gain.spellId]))} sealed`;
    case 'unseal':
      return `${spellName(required(SPELLS[gain.spellId]))} unsealed`;
    case 'route':
      return `${MENTORS[gain.mentorId]?.name ?? gain.mentorId} can travel again`;
    case 'regard':
      return gain.delta > 0 ? 'Regard improved' : gain.delta < 0 ? 'Regard fell' : '';
    case 'strain':
      return `Retry strain ${gain.level}`;
    case 'price':
      return `Shop prices ${Math.round(gain.multiplier * 100)}%`;
  }
}
function shop(id: string, multiplier: number, attitude: Attitude): void {
  const def = required(SHOPS[id]);
  const stock = stockFor(def, attitude);
  show(def.name, `${state().hero.gil} gil`, [
    ...stock.map((itemId) => {
      const item = required(ITEMS[itemId]),
        reason = cannotBuyReason(state(), item, multiplier);
      return {
        label: `${item.name} · ${priceFor(item, multiplier)} gil${reason ? ` · ${reason}` : ''}`,
        enabled: !reason,
        run: () => {
          buy(state(), itemId, multiplier);
          dirty = true;
          shop(id, multiplier, attitude);
        },
      };
    }),
    ...sellableItems(state().hero).map((item) => ({
      label: `Sell ${item.name}`,
      run: () => {
        sell(state(), item.id);
        dirty = true;
        shop(id, multiplier, attitude);
      },
    })),
    { label: 'Leave', run: scenes },
  ]);
}
function inventory(): void {
  const hero = state().hero;
  show('Inventory', `${hero.hp}/${hero.maxHp} HP · ${hero.gil} gil`, [
    ...Object.entries(hero.items)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const item = required(ITEMS[id]),
          gear = slotFor(item),
          reason = gear ? null : cannotUseReason(hero, item, false);
        return {
          label: `${item.name} ×${count}${gear ? ' · Equip' : reason ? ` · ${reason}` : ' · Use'}`,
          enabled: !reason,
          run: () => {
            if (gear) equip(hero, id);
            else useItem(hero, id);
            dirty = true;
            inventory();
          },
        };
      }),
    { label: 'Back', run: menu },
  ]);
}
function skills(): void {
  const hero = state().hero;
  show(
    'Growth',
    `${hero.skillPoints} skill points. Spell ranks are earned through mentor lessons.`,
    [
      ...STAT_IDS.map((stat) => ({
        label: `Train ${STATS[stat].name} ${hero.stats[stat]} → ${hero.stats[stat] + 1} · ${skillPlanCost(hero, adjustStat(EMPTY_PLAN, stat, 1))} SP · ${STATS[stat].description}`,
        enabled: canRaiseStat(hero, EMPTY_PLAN, stat),
        run: () => {
          spendSkillPoints(hero, adjustStat(EMPTY_PLAN, stat, 1));
          dirty = true;
          skills();
        },
      })),
      ...Object.entries(hero.spells).map(([id, known]) => ({
        label: `${spellName(required(SPELLS[id]), known.level)} · Level ${known.level}`,
        run: () => spellGrowth(id),
      })),
      { label: 'Back', run: menu },
    ],
  );
}
function spellGrowth(id: string): void {
  const hero = state().hero;
  show(
    spellName(required(SPELLS[id]), hero.spells[id]?.level),
    `${hero.skillPoints} skill points. Train attributes, then revisit this spell's mentor for the next rank.`,
    [
      ...ENHANCEMENT_IDS.map((attribute) => ({
        label: `Train ${attribute} ${required(hero.spells[id]).step[attribute]} → ${required(hero.spells[id]).step[attribute] + 1} · ${levelStep(required(SPELLS[id]), required(hero.spells[id]).level)?.cost ?? '—'} SP`,
        enabled: canEnhance(hero, EMPTY_PLAN, id, attribute),
        run: () => {
          spendSkillPoints(hero, adjustEnhancement(EMPTY_PLAN, id, attribute, 1));
          dirty = true;
          spellGrowth(id);
        },
      })),
      { label: 'Back', run: skills },
    ],
  );
}
function menu(): void {
  show(
    'Campaign',
    `${state().hero.name} · Level ${state().hero.level}\n${currentMap(state()).name}\n${openingLead(state())}`,
    [
      { label: 'Resume', run: scenes },
      {
        label: 'World map',
        run: () => {
          show('World map', 'North is up. Reach the stones through Mossvale’s north path.', [
            { label: 'Back', run: menu },
          ]);
          overview = overviewSnapshot(state());
        },
      },
      { label: 'Inventory', run: inventory },
      { label: 'Growth and spells', run: skills },
      ...(arcaneUnlocked(state().flags)
        ? [
            { label: 'Arcane techniques', run: arcaneGrowth },
            { label: 'Custom Weaving', run: weaving },
          ]
        : []),
      {
        label: 'Save and return to title',
        run: () => {
          outgoingSave = serialize(state());
          clear();
          game = null;
          cachedWorld = null;
        },
      },
    ],
  );
}

function commitManual(run: () => void): void {
  const battle = required(currentNativeBattle()),
    paused = battle.paused;
  battleDispatch(JSON.stringify({ type: 'begin' }));
  battle.paused = false;
  try {
    if (!commitBattleTry(state(), battle)) throw new Error('Wait for the demonstration to finish.');
    run();
    dirty = true;
  } finally {
    battle.paused = paused;
  }
  clear();
}
function battleMenu(): void {
  const b = required(currentNativeBattle());
  show('Battle actions', b.objective.label, [
    { label: 'Return to board', run: clear },
    ...(b.canCorrect
      ? [
          {
            label: 'Correct last placement',
            run: () => {
              b.correctLastDrop();
              dirty = true;
              clear();
            },
          },
        ]
      : []),
    ...(b.status === 'ongoing' && !b.autoCastingBusy
      ? [
          ...Object.entries(state().hero.items)
            .filter(([, n]) => n > 0)
            .flatMap(([id]) => {
              const item = required(ITEMS[id]);
              return b.combat && !b.combat.cannotUseItemReason(id)
                ? [
                    {
                      label: `Use ${item.name}`,
                      run: () => {
                        commitManual(() => b.combat?.useItem(id));
                      },
                    },
                  ]
                : [];
            }),
          ...(!b.autoCastingEnabled
            ? Object.keys(b.magicCasting.book())
                .filter((id) => STANDARD_SPELLS[id])
                .map((id) => ({
                  label: `Cast ${spellName(required(SPELLS[id]), b.magicCasting.book()[id]?.level)}`,
                  run: () =>
                    targetRows('Choose row', (target) => {
                      const preview = b.magicCasting.preview(id, target);
                      message(
                        preview.name,
                        preview.reason ??
                          `Row ${target.bottomRow + 1} from the top. Cost: ${JSON.stringify(preview.cost)}`,
                        () => {
                          if (!preview.reason) commitManual(() => b.castBoardSpell(id, target));
                          else clear();
                        },
                      );
                    }),
                }))
            : []),
          ...(arcaneUnlocked(state().flags)
            ? ARCANE_ELEMENTS.filter((e) => arcaneRank(state().hero, e) > 0).map((e) => ({
                label: `Arcane + ${e} · Level ${arcaneRank(state().hero, e)}`,
                run: () => {
                  const target = { bottomRow: b.board.height - 1, direction: 1 as const },
                    preview = b.magicCasting.preview(`arcane:${e}`, target);
                  show(
                    `Arcane + ${e}`,
                    `${ARCANE_PURPOSE[e]}\n${preview.reason ?? `Cost: ${JSON.stringify(preview.cost)}`}`,
                    [
                      {
                        label: 'Cast',
                        enabled: !preview.reason,
                        run: () => {
                          commitManual(() => b.castArcane(`arcane:${e}`, target));
                        },
                      },
                      { label: 'Back', run: battleMenu },
                    ],
                  );
                },
              }))
            : []),
          ...(state().hero.weaving?.equipped
            ? [
                {
                  label: 'Cast equipped Weaving',
                  run: () =>
                    targetRows('First effect: row', (first) =>
                      targetRows('Second effect: row', (second) => {
                        const preview = b.previewWeaving([first, second]);
                        show(
                          preview.name,
                          preview.reason ??
                            preview.stages
                              .map(
                                (stage, i) =>
                                  `${i + 1}. ${stage.preview.name} · row ${stage.preview.target.bottomRow + 1}`,
                              )
                              .join('\n') + `\nCost: ${JSON.stringify(preview.cost)}`,
                          [
                            {
                              label: 'Cast in this order',
                              enabled: !preview.reason,
                              run: () => {
                                commitManual(() => b.castWeaving(preview));
                              },
                            },
                            { label: 'Back', run: battleMenu },
                          ],
                        );
                      }),
                    ),
                },
              ]
            : []),
          {
            label: battleTryCommitted(b) ? 'Abandon attempt' : 'Leave before starting',
            run: () => {
              if (battleTryCommitted(b)) {
                b.giveUp();
                clear();
              } else {
                battleInfo = null;
                scenes();
              }
              dirty = true;
            },
          },
        ]
      : []),
  ]);
}
function targetRows(
  title: string,
  selected: (target: MagicTarget) => void,
  direction: -1 | 1 = 1,
): void {
  const b = required(currentNativeBattle());
  show(title, `Rows are counted from the top. Wind moves ${direction === 1 ? 'right' : 'left'}.`, [
    {
      label: 'Switch wind direction',
      run: () => targetRows(title, selected, direction === 1 ? -1 : 1),
    },
    ...Array.from({ length: b.board.height }, (_, i) => ({
      label: `Row ${i + 1}`,
      run: () => selected({ bottomRow: i, direction }),
    })),
    { label: 'Cancel', run: battleMenu },
  ]);
}
function arcaneGrowth(): void {
  const s = state();
  show(
    'Arcane techniques',
    `${s.hero.skillPoints} skill points. Techniques affect the opponent. Custom Weaving is separate.`,
    [
      ...ARCANE_ELEMENTS.map((e) => {
        const rank = arcaneRank(s.hero, e),
          cost = ARCANE_UPGRADE_COSTS[rank - 1];
        return {
          label: `${e} · ${rank ? `Level ${rank} · upgrade ${cost ?? '—'} SP` : 'Learn technique'}`,
          enabled:
            rank === 0
              ? arcaneCap(s.hero, e) >= 2
              : rank < arcaneCap(s.hero, e) && cost !== undefined && s.hero.skillPoints >= cost,
          run: () => {
            if (rank === 0) createArcane(s.hero, s.flags, e);
            else upgradeArcane(s.hero, s.flags, e);
            dirty = true;
            arcaneGrowth();
          },
        };
      }),
      { label: 'Back', run: menu },
    ],
  );
}
function weaving(): void {
  const s = state();
  show('Custom Weaving', 'Choose two effects, their strength and their casting order.', [
    { label: 'Create custom spell', run: () => weaveSpell(0, [], null) },
    ...(s.hero.weaving?.recipes ?? []).flatMap((recipe) => [
      {
        label: `${recipe.name} · Level ${recipe.level} · Equip`,
        run: () => {
          required(s.hero.weaving).equipped = recipe.id;
          dirty = true;
          weaving();
        },
      },
      { label: `Edit ${recipe.name}`, run: () => weaveSpell(0, [], recipe) },
      {
        label: `Upgrade ${recipe.name} · ${WEAVE_UPGRADE_COSTS[recipe.level - 1] ?? '—'} SP`,
        enabled:
          recipe.level < weaveCap(s.hero, recipe.stages) &&
          s.hero.skillPoints >= (WEAVE_UPGRADE_COSTS[recipe.level - 1] ?? Infinity),
        run: () => {
          upgradeWeave(s.hero, s.flags, recipe.id);
          dirty = true;
          weaving();
        },
      },
    ]),
    { label: 'Back', run: menu },
  ]);
}
function weaveSpell(index: number, stages: WeaveStage[], existing: WeaveRecipe | null): void {
  const hero = state().hero;
  const choices: Choice[] = WEAVE_SPELLS.filter((id) => (hero.spells[id]?.level ?? 0) >= 2).map(
    (spell) => ({
      label: WEAVE_NAMES[spell],
      run: () => {
        show(`${index === 0 ? 'First' : 'Second'} effect strength`, WEAVE_NAMES[spell], [
          ...Array.from(
            { length: Math.min(existing?.level ?? 1, hero.spells[spell]?.level ?? 0) },
            (_, i) => ({
              label: `Level ${i + 1}`,
              run: () => {
                const next = [...stages, { spell, rank: i + 1 }];
                if (index === 0) weaveSpell(1, next, existing);
                else {
                  const recipe: WeaveRecipe = {
                    id: existing?.id ?? `native-${revision}`,
                    name: next.map((s) => `${WEAVE_NAMES[s.spell]} ${s.rank}`).join(' → '),
                    level: existing?.level ?? 1,
                    stages: next as [WeaveStage, WeaveStage],
                  };
                  show(
                    'Save custom spell',
                    `${recipe.name}\nCost: ${JSON.stringify(weaveCost(hero, recipe))}`,
                    [
                      {
                        label: 'Save and equip',
                        run: () => {
                          if (!saveWeave(hero, state().flags, recipe))
                            throw new Error('These effects cannot be combined yet.');
                          dirty = true;
                          weaving();
                        },
                      },
                      { label: 'Cancel', run: weaving },
                    ],
                  );
                }
              },
            }),
          ),
          { label: 'Cancel', run: weaving },
        ]);
      },
    }),
  );
  show(
    `${index === 0 ? 'First' : 'Second'} effect`,
    stages.map((s) => WEAVE_NAMES[s.spell]).join(' → '),
    [...choices, { label: 'Cancel', run: weaving }],
  );
}
export function campaignDispatch(json: string): string {
  try {
    const r = JSON.parse(json) as Record<string, unknown>;
    if (r.type === 'start') {
      if (!Object.hasOwn(CLASSES, String(r.classId)))
        throw new Error('Choose one of the four heroes.');
      game = newGame(String(r.classId));
      game.flags.add('boardMagicEnabled');
      battleInfo = null;
      cachedWorld = null;
      dirty = true;
      scenes();
    } else if (r.type === 'load') {
      const loaded = typeof r.save === 'string' ? deserialize(r.save) : null;
      if (!loaded) throw new Error('This campaign save could not be loaded.');
      game = loaded;
      game.flags.add('boardMagicEnabled');
      battleInfo = null;
      cachedWorld = null;
      dirty = true;
      scenes();
    } else if (r.type === 'snapshot') {
      /* Read only. */
    } else if (r.type === 'checkpoint') {
      if (game) dirty = true;
      walking = [];
    } else if (r.type === 'finishBattle') finishBattle();
    else if (r.type === 'battleMenu') battleMenu();
    else if (r.type === 'action') {
      const action = actions.get(String(r.id));
      if (!action) throw new Error('That choice is no longer available.');
      action();
      cachedWorld = null;
    } else if (r.type === 'menu') {
      if (!battleInfo) menu();
    } else if (r.type === 'move') {
      if (!panel && !battleInfo) {
        if (!['up', 'down', 'left', 'right'].includes(String(r.direction)))
          throw new Error('Invalid direction.');
        walking = [];
        move(r.direction as Direction);
      }
    } else if (r.type === 'walkTo') {
      if (!panel && !battleInfo && Number.isInteger(r.x) && Number.isInteger(r.y))
        walking = pathTo(state(), Number(r.x), Number(r.y)) ?? [];
    } else if (r.type === 'walkStep') {
      if (!panel && !battleInfo) {
        const direction = walking.shift();
        if (direction) move(direction);
      }
    } else if (r.type === 'stopWalking') walking = [];
    else throw new Error('Unknown campaign request.');
    const save = outgoingSave ?? (game && dirty ? serialize(game) : null);
    dirty = false;
    outgoingSave = null;
    if (game && !cachedWorld && !battleInfo) cachedWorld = worldSnapshot(game);
    return JSON.stringify({
      ok: true,
      state: {
        mode: !game ? 'title' : battleInfo ? 'battle' : 'world',
        mapId: game?.mapId ?? '',
        location: game ? currentMap(game).name : '',
        heroName: game?.hero.name ?? '',
        hp: game?.hero.hp ?? 0,
        maxHP: game?.hero.maxHp ?? 0,
        panel,
        world: battleInfo ? null : cachedWorld,
        walking: walking.length > 0,
        overview,
        save,
      },
    });
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Campaign stopped.',
    });
  }
}
