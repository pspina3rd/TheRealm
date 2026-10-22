import { Battle, type BattleAction } from '../battle/battle';
import { createRng, type Rng } from '../core/rng';
import { SHOPS } from '../data/shops';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec } from '../data/types';
import { describeInteraction, resolveBattle } from '../game/encounter';
import { ELEMENT_NAMES } from '../core/elements';
import { SPELLS } from '../data/spells';
import { equip, heroClass, heroTitle, useItem } from '../game/hero';
import { pieceWeights } from '../game/pieceOdds';
import { deleteSave, loadGame, saveGame, type KeyValueStore } from '../game/save';
import { buy } from '../game/shop';
import type { Direction, EntityDef } from '../world/map';
import { step } from '../world/movement';
import { currentMap, newGame, travel, type GameState } from '../world/state';
import { Dialog } from './dialog';
import { button, byId, el } from './dom';
import { ELEMENT_ICONS } from './art/icons';
import { BattleView } from './battleView';
import { iconElement } from './iconDraw';
import { ManaBars } from './manaBars';
import { conversationBody, resultsBody } from './screens/conversation';
import { menuBody } from './screens/menu';
import { shopBody } from './screens/shop';
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
    const body = conversationBody(this.atlas, interaction);
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
    const hero = heroClass(this.state.hero).sprite;
    this.battleView.start(portraitFor(entity), isCreatureId(hero) ? hero : 'char.026');
    this.showView('battle');
  }

  private finishBattle(): void {
    const active = this.active;
    if (!active) return;
    const titleBefore = this.state.hero.titleElement;
    const resolution = resolveBattle(this.state, active.entity, active.battle, this.rng);
    const newTitle = this.state.hero.titleElement !== titleBefore;
    this.save();
    this.renderHud();
    const speaker = portraitFor(active.entity);
    this.dialog.show({
      title: resolution.won ? 'Victory!' : 'Defeat',
      body: resultsBody(this.atlas, resolution, speaker),
      actions: [
        {
          label: 'Continue',
          onClick: () => {
            this.endBattle();
            if (newTitle) {
              const hero = this.state.hero;
              this.say(heroTitle(hero), ELEMENT_ICONS[hero.titleElement]);
            }
            if (resolution.shopId) {
              this.openShop(resolution.shopId, resolution.priceMultiplier, speaker);
            }
          },
        },
      ],
      onCancel: () => this.endBattle(),
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
      const { hp, mana, atk, def } = cls.base;
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
            chip('heart', hp, 'HP'),
            chip('potion', mana, 'Mana per element'),
            chip('sword', atk, 'Attack'),
            chip('ward', def, 'Defence'),
            chip('coin', cls.gil, 'Gil'),
            chip(
              ELEMENT_ICONS[cls.element],
              SPELLS[cls.spell]?.name ?? cls.spell,
              `${ELEMENT_NAMES[cls.element]} spell`,
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
        const spellId = this.state.hero.spells[Number(key) - 1];
        if (spellId) this.tryCombat(spellId, (c) => c.castSpell(spellId));
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

/** The creature shown large in battle: the monster, or the NPC you are dealing with. */
function portraitFor(entity: EntityDef): CreatureId | null {
  const key =
    entity.kind === 'monster' ? ENEMIES[entity.enemyId]?.sprite : NPCS[entity.npcId]?.sprite;
  return key && isCreatureId(key) ? key : null;
}
