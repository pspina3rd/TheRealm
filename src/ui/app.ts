import { Battle, type BattleAction } from '../battle/battle';
import { createRng, type Rng } from '../core/rng';
import { SHOPS } from '../data/shops';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import type { ChallengeSpec } from '../data/types';
import type { Attitude } from '../game/attitude';
import type { Epilogue } from '../game/ending';
import { describeInteraction, entitySprite, reply, resolveBattle } from '../game/encounter';
import { arrive, dismissVision, pendingVision, type Interlude } from '../game/story';
import { bringItems, hiddenSlots, itemsFor } from '../game/hidden';
import type { Gain } from '../game/rewards';
import { ITEMS } from '../data/items';
import { itemIcon } from './art/icons';
import { lessonSpec, prepareLesson } from '../game/lessons';
import { MENTORS, type MentorDef } from '../data/mentors';
import { mentorOf, mentorPlace } from '../world/mentors';
import { MAPS } from '../data/maps';
import { ELEMENT_NAMES, type Element } from '../core/elements';
import { SPELLS } from '../data/spells';
import { createHero, equip, heroClass, heroTitle, spendSkillPoints, useItem } from '../game/hero';
import {
  EMPTY_PLAN,
  adjustEnhancement,
  adjustStat,
  skillPlanCost,
  type SkillPlan,
} from '../game/skills';
import { spellLevel, spellName } from '../game/spells';
import { STATS, STAT_IDS } from '../data/stats';
import { dualChance, pieceWeights } from '../game/pieceOdds';
import { deleteSave, loadGame, saveGame, type KeyValueStore } from '../game/save';
import { buy, sell } from '../game/shop';
import type { Direction, EntityDef } from '../world/map';
import { step } from '../world/movement';
import { pathTo } from '../world/path';
import { currentMap, newGame, travel, type GameState } from '../world/state';
import { Dialog } from './dialog';
import { button, byId, el, lineNodes } from './dom';
import { ELEMENT_ICONS, SPELL_KIND_ICONS, STAT_ICONS } from './art/icons';
import { BattleView } from './battleView';
import { iconElement } from './iconDraw';
import { conversationBody, epilogueBody, resultsBody } from './screens/conversation';
import { menuBody } from './screens/menu';
import { shopBody } from './screens/shop';
import { focusStep, skillsBody, type StepTarget } from './screens/skills';
import { chip, spritePortrait } from './screens/widgets';
import type { IconId, IconSpec } from './art/icons';
import type { Atlas } from './art/atlas';
import { isCreatureId, type CreatureId } from './art/creatures';
import { WorldView } from './worldView';
import { bindBoardGestures, bindPress, isPhoneLayout } from './touch';
import type { ActivePiece } from '../core/board';

/** Milliseconds between steps while a direction is held. */
const WALK_REPEAT_MS = 150;
/** How long a map banner stays up. */
const BANNER_MS = 2600;
/** Settings kept beside the save: the optional touch buttons, and whether tap-to-walk was found. */
const TOUCH_BUTTONS_KEY = 'the-realm/touch-buttons';
const TAPPED_KEY = 'the-realm/tap-walked';

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const KEY_BATTLE: Readonly<Record<string, BattleAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotate',
  x: 'rotate',
  ArrowDown: 'softDrop',
  ' ': 'hardDrop',
};

interface ActiveBattle {
  readonly battle: Battle;
  readonly entity: EntityDef;
  /** The terms an NPC offered this battle on. */
  readonly terms?: Attitude;
  finished: boolean;
  /** Time left before the result is shown, so the final blow plays out. */
  resultDelay: number;
}

/** How long the last moments of a battle play before the result appears. */
const RESULT_DELAY_MS = 1000;
/** Keys can't dismiss the result for this long, so mashing from the board doesn't skip it. */
const RESULT_GUARD_MS = 350;

/**
 * Top-level controller. Owns the game state and switches between walking
 * the world and fighting battles; dialogs (conversations, results, shops,
 * the menu) sit on top of either.
 */
export class App {
  private state: GameState;
  private readonly rng: Rng = createRng();
  private readonly store: KeyValueStore;
  private readonly atlas: Atlas;
  private readonly world: WorldView;
  private readonly battleView: BattleView;
  /** False until a save is loaded or a class is chosen. */
  private started: boolean;
  private readonly dialog = new Dialog();
  private active: ActiveBattle | null = null;
  private heldDirection: Direction | null = null;
  /** Steps left of a tap-to-walk, taken one per `WALK_REPEAT_MS`. */
  private route: Direction[] = [];
  /** Touch gestures on the board, and the piece they were moving. */
  private gestures: ReturnType<typeof bindBoardGestures> | null = null;
  private gesturePiece: ActivePiece | null = null;
  private walkTimer = 0;
  private lastFrame = 0;
  private messageTimer = 0;

  constructor(atlas: Atlas, store: KeyValueStore) {
    this.store = store;
    this.atlas = atlas;
    const saved = loadGame(store);
    this.started = saved !== null;
    this.state = saved ?? newGame();
    this.world = new WorldView(byId<HTMLCanvasElement>('world-canvas'), atlas);
    this.battleView = new BattleView(atlas);
    byId('hud-hp-icon').replaceChildren(iconElement('heart', 2, 'HP'));
    byId('hud-xp-icon').replaceChildren(iconElement('star', 2, 'Experience'));
    byId('hud-gil-icon').replaceChildren(iconElement('coin', 2, 'Gil'));
    byId('menu-button').replaceChildren(iconElement('bag', 3));
    this.battleView.hero.onCast = (id) => this.tryCombat(id, (c) => c.castSpell(id));
    this.battleView.hero.onItem = (id) => this.tryCombat(id, (c) => c.useItem(id));
    this.bindInput();
    this.applyTouchPrefs();
  }

  /** Reads a setting; storage may be unavailable, which reads as unset. */
  private pref(key: string): boolean {
    try {
      return this.store.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  private setPref(key: string, on: boolean): void {
    try {
      if (on) this.store.setItem(key, '1');
      else this.store.removeItem(key);
    } catch {
      // Not saved; it still applies until the page is closed.
    }
    this.applyTouchPrefs(key, on);
  }

  /**
   * Touch buttons (off by default): the battle's move buttons and an
   * always-shown d-pad. Without them the d-pad shows only until the
   * player first taps the map to walk.
   */
  private applyTouchPrefs(key?: string, on?: boolean): void {
    const get = (k: string): boolean => (k === key ? Boolean(on) : this.pref(k));
    const buttons = get(TOUCH_BUTTONS_KEY);
    document.body.classList.toggle('touch-buttons', buttons);
    document.body.classList.toggle('tap-walker', get(TAPPED_KEY) && !buttons);
  }

  start(): void {
    this.showView('world');
    this.renderHud();
    this.say(currentMap(this.state).name);
    if (!this.started) this.chooseClass();
    else {
      // A vision the game was closed on shows again.
      const pending = pendingVision(this.state);
      if (pending) this.showVision(pending);
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------ loop ---

  private frame(timeMs: number): void {
    const dt = Math.min(100, this.lastFrame ? timeMs - this.lastFrame : 0);
    this.lastFrame = timeMs;

    if (this.active) {
      const active = this.active;
      const { battle } = active;
      if (!this.dialog.isOpen) {
        this.gestures?.tick(timeMs);
        battle.update(dt);
      }
      // A new piece ends the touch that moved the last one, so it can't move this one.
      if (battle.board.active !== this.gesturePiece) {
        this.gesturePiece = battle.board.active;
        this.gestures?.lockout();
        // On a phone the spell popover closes with each new piece, so it
        // never lingers over the play in real time.
        if (isPhoneLayout()) this.battleView.hero.back();
      }
      if (!active.finished && battle.status !== 'ongoing') active.finished = true;
      if (active.finished && active.resultDelay > 0) {
        active.resultDelay -= dt;
        if (active.resultDelay <= 0) this.finishBattle();
      }
      this.battleView.render(battle, this.state.flags, dt, timeMs, active.finished);
      this.renderHud();
    } else {
      this.updateWalking(dt);
      this.world.render(this.state, dt, timeMs);
    }

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) byId('world-banner').classList.remove('show');
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  // ----------------------------------------------------------- world ---

  private updateWalking(dt: number): void {
    if (this.dialog.isOpen || !this.started) return;
    const direction = this.heldDirection ?? this.route[0];
    if (!direction) return;
    this.walkTimer -= dt;
    if (this.walkTimer <= 0) {
      this.walkTimer = WALK_REPEAT_MS;
      if (!this.heldDirection) this.route.shift();
      this.walk(direction);
      if (this.route.length === 0) this.world.target = null;
    }
  }

  /** Tap-to-walk: heads for the tapped tile, ending by bumping into whoever stands there. */
  private walkTo(clientX: number, clientY: number): void {
    if (this.dialog.isOpen || !this.started || this.active) return;
    const tile = this.world.tileAtPoint(clientX, clientY);
    const path = pathTo(this.state, tile.x, tile.y);
    this.heldDirection = null;
    if (!path || path.length === 0) {
      this.stopRoute();
      return;
    }
    // The first step is taken now, so a tap feels immediate.
    if (!document.body.classList.contains('tap-walker') && !this.pref(TOUCH_BUTTONS_KEY)) {
      this.setPref(TAPPED_KEY, true);
    }
    this.route = path;
    this.world.target = tile;
    this.walkTimer = 0;
  }

  private stopRoute(): void {
    this.route = [];
    this.world.target = null;
  }

  private walk(direction: Direction): void {
    const result = step(this.state, direction);
    if (result.kind !== 'moved') this.stopRoute();
    switch (result.kind) {
      case 'interact':
        this.heldDirection = null;
        this.interact(result.entity);
        break;
      case 'warp': {
        const from = this.state.mapId;
        travel(this.state, result.to);
        this.heldDirection = null;
        this.say(currentMap(this.state).name);
        const vision = arrive(this.state, from);
        this.save();
        this.renderHud();
        if (vision) this.showVision(vision);
        break;
      }
      case 'locked':
        this.say(result.text, 'lock');
        break;
      case 'moved':
      case 'blocked':
        break;
    }
  }

  private interact(entity: EntityDef, decided = false): void {
    // A mentor asks for any item the hero carries for a hidden spell of
    // theirs: the hero chooses to give it (revealing the spell) or keep it.
    const mentor = entity.kind === 'mentor' ? MENTORS[entity.mentorId] : undefined;
    const wanted = mentor && !decided ? itemsFor(this.state, mentor) : [];
    if (mentor && wanted.length > 0) {
      this.offerItems(entity, mentor, wanted);
      return;
    }
    this.talk(entity);
  }

  /** The give-or-keep choice: the item, an arrow and the mentor's face. */
  private offerItems(entity: EntityDef, mentor: MentorDef, itemIds: readonly string[]): void {
    const names = itemIds.map((id) => ITEMS[id]?.name ?? id).join(', ');
    this.dialog.show({
      title: mentor.name,
      body: [
        el(
          'div',
          { className: 'gift-offer', title: `${names} → ${mentor.name}` },
          ...itemIds.map((id) => iconElement(itemIcon(id), 4, ITEMS[id]?.name)),
          el('span', { className: 'deal-arrow', text: '➜' }),
          spritePortrait(this.atlas, mentor.sprite, 72),
        ),
      ],
      actions: [
        { label: 'Keep', onClick: () => this.interact(entity, true) },
        {
          label: 'Give',
          onClick: () => {
            const given = bringItems(this.state, mentor);
            this.save();
            this.renderHud();
            this.talk(entity, given);
          },
        },
      ],
      onCancel: () => this.dialog.close(),
    });
  }

  private talk(entity: EntityDef, given: readonly Gain[] = []): void {
    const interaction = describeInteraction(this.state, entity);
    this.save(); // who said what, so lines keep rotating after a reload
    // Monsters attack on contact (a boss has its say first); people talk first.
    if (entity.kind === 'monster' && interaction.kind === 'challenge') {
      const fight = (): void => this.startBattle(entity, interaction.spec);
      if (interaction.prelude) this.showInterlude(interaction.title, interaction.prelude, fight);
      else fight();
      return;
    }
    const body = conversationBody(
      this.atlas,
      interaction,
      (lesson) => {
        if (interaction.kind === 'lessons') {
          this.startBattle(entity, lessonSpec(this.state, interaction.mentorId, lesson));
        }
      },
      given,
    );
    if (interaction.kind === 'lessons') {
      this.dialog.show({
        title: interaction.title,
        body,
        actions: [{ label: 'Leave', onClick: () => this.dialog.close() }],
        autofocus: false,
      });
      byId('dialog-body').querySelector<HTMLButtonElement>('.lesson')?.focus();
      return;
    }
    if (interaction.kind !== 'challenge') {
      this.dialog.show({
        title: interaction.title,
        body,
        actions: [{ label: 'OK', onClick: () => this.dialog.close() }],
      });
      return;
    }
    this.dialog.show({
      title: interaction.title,
      body,
      actions: [
        {
          label: 'Leave',
          onClick: () => {
            this.dialog.close();
            if (interaction.replies) {
              this.say(reply(this.state, interaction.replies, 'decline'));
              this.save();
            }
          },
        },
        {
          label: 'Accept',
          onClick: () =>
            this.startBattle(
              entity,
              interaction.spec,
              interaction.replies && reply(this.state, interaction.replies, 'accept'),
              interaction.terms,
            ),
        },
      ],
    });
  }

  /** A vision of the Moon Wyrm; once dismissed it never shows again. */
  private showVision(vision: Interlude): void {
    this.showInterlude('A vision', vision.text, () => {
      dismissVision(this.state, vision.id);
      this.save();
      this.dialog.close();
    });
  }

  /**
   * An interlude over everything: the screen goes dark for a vision or a
   * boss's words. A tap, Enter, Escape or Continue goes on (to `then`, or
   * back to the map), but not in the first moments, so held keys or taps
   * can't skip it. Before the Wyrm's fight even Escape goes on to the fight:
   * once it has spoken there is no backing away.
   */
  private showInterlude(title: string, text: string, then?: () => void): void {
    this.stopRoute();
    this.dialog.showInterlude(
      title,
      [
        el('p', { className: 'interlude-text' }, ...lineNodes(text)),
        el('p', { className: 'interlude-hint', text: 'Tap or press Enter' }),
      ],
      then ?? (() => this.dialog.close()),
      RESULT_GUARD_MS,
    );
  }

  // --------------------------------------------------------- battles ---

  /**
   * Starts a battle; `line` is what the opponent says as it begins, and
   * `terms` the attitude an NPC offered it on.
   */
  private startBattle(
    entity: EntityDef,
    spec: ChallengeSpec,
    line?: string,
    terms?: Attitude,
  ): void {
    this.dialog.close();
    if (spec.kind === 'lesson') prepareLesson(this.state.hero);
    const weights = pieceWeights(currentMap(this.state), this.state.hero);
    const dual = dualChance(this.state.hero);
    const battle = new Battle(spec, this.state.hero, this.rng, { weights, dualChance: dual });
    this.active = {
      battle,
      entity,
      ...(terms ? { terms } : {}),
      finished: false,
      resultDelay: RESULT_DELAY_MS,
    };
    const hero = creature(heroClass(this.state.hero).sprite) ?? 'char.026';
    if (spec.kind === 'lesson') {
      // The lesson's foe faces the hero and the mentor at their side.
      const foe = ENEMIES[spec.enemyId];
      const mentor = MENTORS[spec.mentorId];
      this.battleView.start(creature(foe?.sprite), hero, {
        ...(foe?.tint ? { tint: foe.tint } : {}),
        ...(mentor ? { ally: creature(mentor.sprite), allyElement: mentor.element } : {}),
      });
    } else {
      this.battleView.start(portraitFor(entity), hero, line ? { line } : {});
    }
    this.showView('battle');
  }

  private finishBattle(): void {
    const active = this.active;
    if (!active) return;
    const titleBefore = this.state.hero.titleElement;
    const resolution = resolveBattle(
      this.state,
      active.entity,
      active.battle,
      this.rng,
      active.terms,
    );
    const newTitle = this.state.hero.titleElement !== titleBefore;
    const levelled = resolution.gains.some((gain) => gain.kind === 'level');
    this.save();
    this.renderHud();
    const speaker = portraitFor(active.entity);
    // After the results: the skill screen if the hero levelled up, then any shop.
    const next = (): void => {
      if (resolution.epilogue) {
        this.showEpilogue(resolution.epilogue);
      } else if (resolution.shopId) {
        this.openShop(resolution.shopId, resolution.priceMultiplier, speaker, resolution.attitude);
      } else this.dialog.close();
    };
    const proceed = (): void => {
      this.endBattle();
      if (newTitle) {
        const hero = this.state.hero;
        this.say(heroTitle(hero), ELEMENT_ICONS[hero.titleElement]);
      }
      if (levelled) this.openSkills(next);
      else next();
    };
    // A lost lesson can be fought again straight away.
    const retry =
      !resolution.won && active.entity.kind === 'mentor'
        ? [{ label: 'Retry', onClick: () => this.startBattle(active.entity, active.battle.spec) }]
        : [];
    this.dialog.show({
      title: resolution.won ? 'Victory!' : 'Defeat',
      body: resultsBody(this.atlas, resolution, speaker),
      actions: [...retry, { label: 'Continue', onClick: proceed }],
      onCancel: proceed,
      guardMs: RESULT_GUARD_MS,
    });
    // After a lost lesson, trying again is the likely next step.
    if (retry.length > 0)
      byId('dialog-actions').querySelector<HTMLButtonElement>('button')?.focus();
  }

  private endBattle(): void {
    this.dialog.close();
    this.active = null;
    this.showView('world');
  }

  /** Runs a spell or item; if it can't be used, its button shakes. */
  private tryCombat(id: string, action: (combat: NonNullable<Battle['combat']>) => void): void {
    const combat = this.active?.battle.combat;
    if (!combat || this.active?.battle.paused || this.active?.finished) return;
    try {
      action(combat);
    } catch {
      this.battleView.hero.deny(id);
    }
  }

  // ---------------------------------------------------------- skills ---

  /**
   * The skill screen. −/+ stage stat ranks and spell enhancements in
   * `plan`; Confirm spends them for good, Later keeps the points. Either
   * way `then` runs afterwards.
   */
  private openSkills(
    then: () => void,
    plan: SkillPlan = EMPTY_PLAN,
    last?: { target: StepTarget; delta: 1 | -1 },
  ): void {
    const hero = this.state.hero;
    const adjust = (target: StepTarget, delta: 1 | -1): SkillPlan =>
      target.kind === 'stat'
        ? adjustStat(plan, target.stat, delta)
        : adjustEnhancement(plan, target.spellId, target.attribute, delta);
    this.dialog.show({
      title: 'Skills',
      body: skillsBody(
        hero,
        plan,
        (target, delta) => this.openSkills(then, adjust(target, delta), { target, delta }),
        this.lockHint,
      ),
      // Focus stays on the steps: an extra key press must not confirm a spend.
      autofocus: false,
      actions: [
        { label: 'Later', onClick: then },
        {
          label: 'Confirm',
          disabled: skillPlanCost(hero, plan) === 0,
          onClick: () => {
            spendSkillPoints(hero, plan);
            this.save();
            this.renderHud();
            then();
          },
        },
      ],
      onCancel: then,
    });
    if (!focusStep(byId('dialog-body'), last)) {
      byId('dialog-actions').querySelector<HTMLButtonElement>('button')?.focus(); // Later
    }
  }

  /** Where the mentor of a locked category is now: their face and the place's name. */
  private readonly lockHint = (category: Element): HTMLElement => {
    const mentor = mentorOf(category);
    if (!mentor) return el('span');
    const stop = mentorPlace(mentor, this.state);
    const place = `${MAPS[stop.map]?.name ?? stop.map} · ${stop.landmark}`;
    const failed = this.state.hero.failedLessons[category];
    const spell = failed && SPELLS[failed.spellId];
    const lesson = spell ? spellLevel(spell, failed.level) : null;
    return el(
      'span',
      {
        className: 'lock-hint',
        title: `${lesson ? `${lesson.name} · ` : ''}${mentor.name} · ${place}`,
      },
      ...(lesson ? [iconElement(SPELL_KIND_ICONS[lesson.effect.kind], 2, lesson.name)] : []),
      spritePortrait(this.atlas, mentor.sprite, 24),
      el('span', { text: place }),
    );
  };

  /** The chapter's end, then back to the world, where the ruins' seal now stirs. */
  private showEpilogue(epilogue: Epilogue): void {
    const close = (): void => {
      this.dialog.close();
      this.say('The Sunken Ruins stir', 'star');
    };
    this.dialog.show({
      title: 'The Moon Wyrm falls',
      body: epilogueBody(this.atlas, epilogue),
      actions: [{ label: 'Continue', onClick: close }],
      onCancel: close,
      guardMs: 600,
    });
  }

  // ----------------------------------------------------------- shops ---

  private openShop(
    shopId: string,
    multiplier: number,
    keeper: string | null,
    attitude: Attitude | null,
  ): void {
    const shop = SHOPS[shopId];
    if (!shop) return;
    const render = (): void =>
      this.dialog.show({
        title: shop.name,
        body: shopBody(
          this.atlas,
          this.state,
          shop,
          multiplier,
          keeper ?? '',
          attitude ?? 'neutral',
          (itemId) => {
            buy(this.state, itemId, multiplier);
            this.save();
            this.renderHud();
            render();
          },
          (itemId) => {
            sell(this.state, itemId);
            this.save();
            this.renderHud();
            render();
          },
        ),
        actions: [{ label: 'Leave', onClick: () => this.dialog.close() }],
      });
    render();
  }

  // ------------------------------------------------------------ menu ---

  private openMenu(): void {
    const hero = this.state.hero;
    const refresh = (): void => {
      this.save();
      this.renderHud();
      this.openMenu();
    };
    this.dialog.show({
      title: 'Menu',
      body: menuBody(
        this.atlas,
        hero,
        {
          lockHint: this.lockHint,
          onUse: (itemId) => {
            useItem(hero, itemId);
            refresh();
          },
          onEquip: (itemId) => {
            equip(hero, itemId);
            refresh();
          },
        },
        hiddenSlots(this.state),
      ),
      actions: [
        { label: 'New Game', onClick: () => this.confirmNewGame() },
        {
          label: 'Skills',
          badge: hero.skillPoints,
          onClick: () => this.openSkills(() => this.openMenu()),
        },
        {
          label: 'Save',
          onClick: () => {
            refresh();
            this.say(this.save() ? 'Saved' : 'Saving is unavailable', 'book');
          },
        },
        {
          label: `Touch buttons: ${this.pref(TOUCH_BUTTONS_KEY) ? 'On' : 'Off'}`,
          onClick: () => {
            this.setPref(TOUCH_BUTTONS_KEY, !this.pref(TOUCH_BUTTONS_KEY));
            this.openMenu();
          },
        },
        { label: 'Close', onClick: () => this.dialog.close() },
      ],
    });
  }

  private confirmNewGame(): void {
    this.dialog.show({
      title: 'Start over?',
      body: 'Your current adventure will be lost.',
      actions: [
        { label: 'Start over', onClick: () => this.chooseClass() },
        { label: 'Cancel', onClick: () => this.openMenu() },
      ],
    });
  }

  // ---------------------------------------------------- class select ---

  /** Shows the hero picker; choosing a class starts a new game. */
  private chooseClass(): void {
    const cards = Object.values(CLASSES).map((cls) => {
      const preview = spritePortrait(this.atlas, cls.sprite, 72);
      const card = button('', () => this.startNewGame(cls.id));
      card.className = 'class-card';
      const { maxHp, manaCap, atk, def, stats } = createHero(cls.id);
      const spell = SPELLS[cls.spell];
      card.append(
        preview,
        el(
          'span',
          {},
          el('b', { text: `${cls.name} · ${cls.heroName}` }),
          el('small', { text: cls.description }),
          el(
            'span',
            { className: 'chips' },
            chip('heart', maxHp, 'HP'),
            chip('potion', manaCap, 'Mana per element'),
            chip('sword', atk, 'Attack'),
            chip('ward', def, 'Defence'),
            chip('coin', cls.gil, 'Gil'),
            chip(
              ELEMENT_ICONS[cls.element],
              spell ? spellName(spell) : cls.spell,
              `${ELEMENT_NAMES[cls.element]} spell`,
            ),
          ),
          el(
            'span',
            { className: 'chips' },
            ...STAT_IDS.filter((id) => stats[id] > 0).map((id) =>
              chip(STAT_ICONS[id], stats[id], `${STATS[id].name}: ${STATS[id].description}`),
            ),
          ),
        ),
      );
      return card;
    });
    this.dialog.show({
      title: 'Choose your hero',
      body: [el('div', { className: 'class-grid' }, ...cards)],
      actions: [],
      // A hero must be chosen before the first adventure; later, Escape cancels.
      onCancel: () => (this.started ? this.dialog.close() : this.chooseClass()),
    });
    cards[0]?.focus();
  }

  private startNewGame(classId: string): void {
    deleteSave(this.store);
    this.state = newGame(classId);
    this.started = true;
    this.save();
    this.dialog.close();
    this.renderHud();
    this.say(currentMap(this.state).name);
  }

  // ------------------------------------------------------------- HUD ---

  private renderHud(): void {
    const hero = this.state.hero;
    byId('hud-name').textContent = hero.name;
    byId('hud-name').title = heroTitle(hero);
    byId('hud-level').textContent = `Lv ${hero.level}`;
    byId('hud-hp').textContent = `${hero.hp}/${hero.maxHp}`;
    byId('hud-hp-bar').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
    byId('hud-xp-bar').style.width = `${(100 * hero.xp) / hero.nextXp}%`;
    byId('hud-xp').title = `${hero.xp} / ${hero.nextXp} XP`;
    byId('hud-gil').textContent = String(hero.gil);
    byId('hud-place').textContent = currentMap(this.state).name;
    const menu = byId('menu-button');
    if (hero.skillPoints > 0) menu.dataset.points = String(hero.skillPoints);
    else delete menu.dataset.points;
    menu.setAttribute(
      'aria-label',
      hero.skillPoints > 0 ? `Menu (${hero.skillPoints} skill points)` : 'Menu',
    );
  }

  /** A short banner over the map: a place name, or a notice with an icon. */
  private say(text: string, icon?: IconId | IconSpec): void {
    const banner = byId('world-banner');
    banner.replaceChildren(
      ...(icon ? [iconElement(icon, 2)] : []),
      el('span', {}, ...lineNodes(text)),
    );
    banner.classList.remove('show');
    void banner.offsetWidth; // restart the fade
    banner.classList.add('show');
    this.messageTimer = Math.max(BANNER_MS, text.length * 50);
  }

  private save(): boolean {
    return saveGame(this.store, this.state);
  }

  private showView(view: 'world' | 'battle'): void {
    byId('world-view').hidden = view !== 'world';
    byId('battle-view').hidden = view !== 'battle';
    // Lets the stylesheet give a battle on a phone the whole screen.
    document.body.dataset.view = view;
    this.heldDirection = null;
    this.stopRoute();
    if (view === 'world') this.fitWorld();
  }

  /**
   * On a phone the map fills the screen below the HUD at one canvas pixel
   * per CSS pixel (so tiles stay large); elsewhere it keeps its fixed size.
   */
  private fitWorld(): void {
    const canvas = byId<HTMLCanvasElement>('world-canvas');
    const phone = isPhoneLayout() && canvas.clientHeight > 0;
    const width = phone ? Math.round(canvas.clientWidth) : 640;
    const height = phone ? Math.round(canvas.clientHeight) : 416;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  // ----------------------------------------------------------- input ---

  private bindInput(): void {
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => {
      if (KEY_DIRECTIONS[normalizeKey(event.key)] === this.heldDirection) this.heldDirection = null;
    });
    window.addEventListener('blur', () => (this.heldDirection = null));

    byId('menu-button').addEventListener('click', () => {
      if (!this.active) this.openMenu();
    });
    bindPress(byId('pause-button'), () => this.togglePause());
    // Thumb buttons act on press; moves and soft drop repeat while held.
    document.querySelectorAll<HTMLButtonElement>('[data-battle]').forEach((node) => {
      const action = node.dataset.battle as BattleAction;
      bindPress(
        node,
        () => this.active?.battle.input(action),
        action === 'left' || action === 'right' || action === 'softDrop',
      );
    });
    // Touching the board means playing, not choosing a spell: close the popover.
    byId('board-canvas').addEventListener('pointerdown', () => this.battleView.hero.back());
    this.gestures = bindBoardGestures(
      byId('board-canvas'),
      () => this.active?.battle.board.width ?? 10,
      (action) => {
        if (!this.dialog.isOpen) this.active?.battle.input(action);
      },
    );

    // The d-pad walks while held; a keyboard press on it takes one step.
    document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((node) => {
      const direction = node.dataset.dir as Direction;
      const release = (): void => {
        if (this.heldDirection === direction) this.heldDirection = null;
      };
      node.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (this.dialog.isOpen || !this.started) return;
        this.stopRoute();
        this.heldDirection = direction;
        this.walkTimer = WALK_REPEAT_MS;
        this.walk(direction);
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
        node.addEventListener(type, release);
      }
      node.addEventListener('click', (event) => {
        if (event.detail === 0 && !this.dialog.isOpen) this.walk(direction);
      });
    });

    // Tap (or click) the map to walk there; a drag is not a tap.
    const canvas = byId('world-canvas');
    let down: { x: number; y: number } | null = null;
    canvas.addEventListener(
      'pointerdown',
      (event) => (down = { x: event.clientX, y: event.clientY }),
    );
    canvas.addEventListener('pointerup', (event) => {
      if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 12) {
        this.walkTo(event.clientX, event.clientY);
      }
      down = null;
    });
    new ResizeObserver(() => this.fitWorld()).observe(canvas);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.dialog.isOpen) return;
    const key = normalizeKey(event.key);

    if (this.active) {
      const action = KEY_BATTLE[key];
      if (action) {
        event.preventDefault();
        this.active.battle.input(action);
      } else if (key === 'p') {
        this.togglePause();
      } else if (/^[1-9]$/.test(key)) {
        // A category, then a spell in its menu.
        this.battleView.hero.pick(Number(key));
      } else if (key === 'Escape') {
        if (this.battleView.hero.back()) event.preventDefault();
      }
      return;
    }

    const direction = KEY_DIRECTIONS[key];
    if (direction) {
      event.preventDefault();
      if (event.repeat) return;
      this.stopRoute();
      this.heldDirection = direction;
      this.walkTimer = WALK_REPEAT_MS;
      this.walk(direction);
    } else if (key === 'm' || key === 'Escape') {
      this.openMenu();
    }
  }

  private togglePause(): void {
    const battle = this.active?.battle;
    if (battle && !this.active?.finished) battle.togglePause();
  }
}

/** Lower-cases single letters so WASD works with Caps Lock or Shift. */
function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/** A creature id for a sprite key, or null if there is no such creature. */
function creature(key: string | undefined): CreatureId | null {
  return key && isCreatureId(key) ? key : null;
}

/** The creature shown large in battle: the monster, or the NPC you are dealing with. */
function portraitFor(entity: EntityDef): CreatureId | null {
  return creature(entitySprite(entity));
}
