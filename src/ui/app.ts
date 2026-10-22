import { Battle, type BattleAction } from '../battle/battle';
import { createRng, type Rng } from '../core/rng';
import { SHOPS } from '../data/shops';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import type { ChallengeSpec } from '../data/types';
import { describeInteraction, entitySprite, resolveBattle } from '../game/encounter';
import { lessonSpec } from '../game/lessons';
import { MENTORS } from '../data/mentors';
import { mentorOf, mentorStop } from '../world/mentors';
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
import { spellName } from '../game/spells';
import { STATS, STAT_IDS } from '../data/stats';
import { pieceWeights } from '../game/pieceOdds';
import { deleteSave, loadGame, saveGame, type KeyValueStore } from '../game/save';
import { buy } from '../game/shop';
import type { Direction, EntityDef } from '../world/map';
import { step } from '../world/movement';
import { currentMap, newGame, travel, type GameState } from '../world/state';
import { Dialog } from './dialog';
import { button, byId, el } from './dom';
import { ELEMENT_ICONS, STAT_ICONS } from './art/icons';
import { BattleView } from './battleView';
import { iconElement } from './iconDraw';
import { ManaBars } from './manaBars';
import { conversationBody, resultsBody } from './screens/conversation';
import { menuBody } from './screens/menu';
import { shopBody } from './screens/shop';
import { focusStep, skillsBody, type StepTarget } from './screens/skills';
import { chip, spritePortrait } from './screens/widgets';
import type { IconId, IconSpec } from './art/icons';
import type { Atlas } from './art/atlas';
import { isCreatureId, type CreatureId } from './art/creatures';
import { WorldView } from './worldView';

/** Milliseconds between steps while a direction is held. */
const WALK_REPEAT_MS = 150;
/** How long a map banner stays up. */
const BANNER_MS = 2600;

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
  finished: boolean;
  /** Time left before the result is shown, so the final blow plays out. */
  resultDelay: number;
}

/** How long the last moments of a battle play before the result appears. */
const RESULT_DELAY_MS = 1000;

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
  private readonly hudMana = new ManaBars(byId('hud-mana'), 1);
  /** False until a save is loaded or a class is chosen. */
  private started: boolean;
  private readonly dialog = new Dialog();
  private active: ActiveBattle | null = null;
  private heldDirection: Direction | null = null;
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
  }

  start(): void {
    this.showView('world');
    this.renderHud();
    this.say(currentMap(this.state).name);
    if (!this.started) this.chooseClass();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------ loop ---

  private frame(timeMs: number): void {
    const dt = Math.min(100, this.lastFrame ? timeMs - this.lastFrame : 0);
    this.lastFrame = timeMs;

    if (this.active) {
      const active = this.active;
      const { battle } = active;
      if (!this.dialog.isOpen) battle.update(dt);
      if (!active.finished && battle.status !== 'ongoing') active.finished = true;
      if (active.finished && active.resultDelay > 0) {
        active.resultDelay -= dt;
        if (active.resultDelay <= 0) this.finishBattle();
      }
      this.battleView.render(battle, dt, timeMs, active.finished);
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
    if (!this.heldDirection || this.dialog.isOpen || !this.started) return;
    this.walkTimer -= dt;
    if (this.walkTimer <= 0) {
      this.walkTimer = WALK_REPEAT_MS;
      this.walk(this.heldDirection);
    }
  }

  private walk(direction: Direction): void {
    const result = step(this.state, direction);
    switch (result.kind) {
      case 'interact':
        this.heldDirection = null;
        this.interact(result.entity);
        break;
      case 'warp':
        travel(this.state, result.to);
        this.heldDirection = null;
        this.say(currentMap(this.state).name);
        this.save();
        this.renderHud();
        break;
      case 'locked':
        this.say(result.text, 'lock');
        break;
      case 'moved':
      case 'blocked':
        break;
    }
  }

  private interact(entity: EntityDef): void {
    const interaction = describeInteraction(this.state, entity);
    // Monsters attack on contact; people talk first.
    if (entity.kind === 'monster' && interaction.kind === 'challenge') {
      this.startBattle(entity, interaction.spec);
      return;
    }
    const body = conversationBody(this.atlas, interaction, (lesson) => {
      if (interaction.kind === 'lessons') {
        this.startBattle(entity, lessonSpec(this.state, interaction.mentorId, lesson));
      }
    });
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
        { label: 'Leave', onClick: () => this.dialog.close() },
        { label: 'Accept', onClick: () => this.startBattle(entity, interaction.spec) },
      ],
    });
  }

  // --------------------------------------------------------- battles ---

  private startBattle(entity: EntityDef, spec: ChallengeSpec): void {
    this.dialog.close();
    const weights = pieceWeights(currentMap(this.state), this.state.hero);
    const battle = new Battle(spec, this.state.hero, this.rng, { weights });
    this.active = { battle, entity, finished: false, resultDelay: RESULT_DELAY_MS };
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
      this.battleView.start(portraitFor(entity), hero);
    }
    this.showView('battle');
  }

  private finishBattle(): void {
    const active = this.active;
    if (!active) return;
    const titleBefore = this.state.hero.titleElement;
    const resolution = resolveBattle(this.state, active.entity, active.battle, this.rng);
    const newTitle = this.state.hero.titleElement !== titleBefore;
    const levelled = resolution.gains.some((gain) => gain.kind === 'level');
    this.save();
    this.renderHud();
    const speaker = portraitFor(active.entity);
    // After the results: the skill screen if the hero levelled up, then any shop.
    const next = (): void => {
      if (resolution.shopId) this.openShop(resolution.shopId, resolution.priceMultiplier, speaker);
      else this.dialog.close();
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
    });
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
    const stop = mentorStop(mentor, this.state.flags, this.state.victories);
    const place = MAPS[stop.map]?.name ?? stop.map;
    return el(
      'span',
      { className: 'lock-hint', title: `${mentor.name} · ${place}` },
      spritePortrait(this.atlas, mentor.sprite, 24),
      el('span', { text: place }),
    );
  };

  // ----------------------------------------------------------- shops ---

  private openShop(shopId: string, multiplier: number, keeper: string | null): void {
    const shop = SHOPS[shopId];
    if (!shop) return;
    const render = (): void =>
      this.dialog.show({
        title: shop.name,
        body: shopBody(this.atlas, this.state, shop, multiplier, keeper ?? '', (itemId) => {
          buy(this.state, itemId, multiplier);
          this.save();
          this.renderHud();
          render();
        }),
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
      body: menuBody(this.atlas, hero, {
        lockHint: this.lockHint,
        onUse: (itemId) => {
          useItem(hero, itemId);
          refresh();
        },
        onEquip: (itemId) => {
          equip(hero, itemId);
          refresh();
        },
      }),
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
    this.hudMana.update(hero);
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
    banner.replaceChildren(...(icon ? [iconElement(icon, 2)] : []), el('span', { text }));
    banner.classList.remove('show');
    void banner.offsetWidth; // restart the fade
    banner.classList.add('show');
    this.messageTimer = BANNER_MS;
  }

  private save(): boolean {
    return saveGame(this.store, this.state);
  }

  private showView(view: 'world' | 'battle'): void {
    byId('world-view').hidden = view !== 'world';
    byId('touch-pad').hidden = view !== 'world';
    byId('battle-view').hidden = view !== 'battle';
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
    byId('pause-button').addEventListener('click', () => this.togglePause());
    document.querySelectorAll<HTMLButtonElement>('[data-battle]').forEach((node) => {
      node.addEventListener('click', () =>
        this.active?.battle.input(node.dataset.battle as BattleAction),
      );
    });
    document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((node) => {
      node.addEventListener('click', () => {
        if (!this.dialog.isOpen) this.walk(node.dataset.dir as Direction);
      });
    });
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
      this.heldDirection = direction;
      this.walkTimer = WALK_REPEAT_MS;
      this.walk(direction);
    } else if (key === 'm' || key === 'Escape') {
      this.openMenu();
    }
  }

  private togglePause(): void {
    const battle = this.active?.battle;
    if (battle && !this.active?.finished) battle.paused = !battle.paused;
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
