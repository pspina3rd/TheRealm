import { Battle, type BattleAction } from '../battle/battle';
import { createRng, type Rng } from '../core/rng';
import { ITEMS } from '../data/items';
import { SHOPS } from '../data/shops';
import { SPELLS } from '../data/spells';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec } from '../data/types';
import { describeSpec } from '../battle/describe';
import { describeInteraction, resolveBattle } from '../game/encounter';
import { ELEMENTS, ELEMENT_NAMES, type Element } from '../core/elements';
import { SURGE_DESCRIPTIONS } from '../battle/elemental';
import { ATTUNEMENT_TITLES } from '../data/classes';
import {
  attune,
  canAttune,
  cannotUseReason,
  equip,
  heroClass,
  heroTitle,
  slotFor,
  spellCost,
  totalAttack,
  totalDefense,
  useItem,
} from '../game/hero';
import { pieceWeights } from '../game/pieceOdds';
import { deleteSave, loadGame, saveGame, type KeyValueStore } from '../game/save';
import { buy, cannotBuyReason, priceFor } from '../game/shop';
import type { Direction, EntityDef } from '../world/map';
import { step } from '../world/movement';
import { currentMap, newGame, travel, type GameState } from '../world/state';
import { Dialog } from './dialog';
import { button, byId, el, listRow } from './dom';
import { ELEMENT_ICONS } from './art/icons';
import { BattleView } from './battleView';
import { iconElement } from './iconDraw';
import { ManaBars, costIcons } from './manaBars';
import type { Atlas } from './art/atlas';
import { isCreatureId, mapFrame, type CreatureId } from './art/creatures';
import { WorldView } from './worldView';

/** Milliseconds between steps while a direction is held. */
const WALK_REPEAT_MS = 150;

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
    this.battleView.hero.onCast = (id) => this.tryCombat(id, (c) => c.castSpell(id));
    this.battleView.hero.onItem = (id) => this.tryCombat(id, (c) => c.useItem(id));
    this.bindInput();
  }

  start(): void {
    this.showView('world');
    this.renderHud();
    this.say(`Welcome to ${currentMap(this.state).name}.`);
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
      if (this.messageTimer <= 0) byId('world-message').textContent = '';
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
        this.say(`You arrive at ${currentMap(this.state).name}.`);
        this.save();
        this.renderHud();
        break;
      case 'locked':
        this.say(result.text);
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
    if (interaction.kind === 'message') {
      this.dialog.show({
        title: interaction.title,
        body: interaction.text,
        actions: [{ label: 'OK', onClick: () => this.dialog.close() }],
      });
      return;
    }
    this.dialog.show({
      title: interaction.title,
      body: [
        interaction.text,
        el('p', { className: 'muted', text: describeSpec(interaction.spec) }),
      ],
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
    const resolution = resolveBattle(this.state, active.entity, active.battle, this.rng);
    this.save();
    this.renderHud();
    this.dialog.show({
      title: resolution.won ? 'Victory!' : 'Defeat',
      body: resolution.messages,
      actions: [
        {
          label: 'Continue',
          onClick: () => {
            this.endBattle();
            if (canAttune(this.state.hero)) this.chooseAttunement();
            else if (resolution.shopId)
              this.openShop(resolution.shopId, resolution.priceMultiplier);
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
    this.say(`You are in ${currentMap(this.state).name}.`);
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

  private openShop(shopId: string, multiplier: number): void {
    const shop = SHOPS[shopId];
    if (!shop) return;
    const status = el('p', { className: 'muted' });
    const render = (): void => {
      const rows = shop.stock.map((itemId) => {
        const item = ITEMS[itemId];
        if (!item) return el('div');
        const reason = cannotBuyReason(this.state, item, multiplier);
        return listRow(
          item.name,
          item.description,
          button(
            `${priceFor(item, multiplier)} G`,
            () => {
              status.textContent = buy(this.state, itemId, multiplier);
              this.save();
              this.renderHud();
              render();
            },
            { disabled: reason !== null, title: reason ?? 'Buy' },
          ),
        );
      });
      this.dialog.show({
        title: shop.name,
        body: [
          el('p', {
            text: `Prices at ${Math.round(multiplier * 100)}% · You have ${this.state.hero.gil} gil.`,
          }),
          ...rows,
          status,
        ],
        actions: [{ label: 'Leave', onClick: () => this.dialog.close() }],
      });
    };
    render();
  }

  // ------------------------------------------------------------ menu ---

  private openMenu(): void {
    const hero = this.state.hero;
    const refresh = (message: string): void => {
      this.save();
      this.renderHud();
      this.openMenu();
      byId('dialog-body').append(el('p', { className: 'muted', text: message }));
    };

    const items = Object.entries(hero.items).map(([id, count]) => {
      const item = ITEMS[id];
      if (!item) return el('div');
      const controls: HTMLButtonElement[] = [];
      if (slotFor(item)) {
        controls.push(
          button('Equip', () => {
            equip(hero, id);
            refresh(`Equipped ${item.name}.`);
          }),
        );
      } else if (item.use) {
        const reason = cannotUseReason(hero, item);
        controls.push(
          button('Use', () => refresh(useItem(hero, id)), {
            disabled: reason !== null,
            title: reason ?? item.description,
          }),
        );
      }
      return listRow(`${item.name} ×${count}`, item.description, ...controls);
    });

    const gear = (id: string | null): string => (id ? (ITEMS[id]?.name ?? id) : 'none');
    this.dialog.show({
      title: `${hero.name} · ${heroTitle(hero)} · Level ${hero.level}`,
      body: [
        el('p', {
          text: `Attack ${totalAttack(hero)} · Defence ${totalDefense(hero)} · Mana ${hero.manaCap} per element`,
        }),
        el('p', {
          className: 'muted',
          text: `Weapon: ${gear(hero.weaponId)} · Armour: ${gear(hero.armorId)} · Charm: ${gear(hero.accessoryId)} · Attunement: ${
            hero.attunement ? ELEMENT_NAMES[hero.attunement] : 'none yet'
          }`,
        }),
        el('h2', { text: 'Items' }),
        ...(items.length ? items : [el('p', { className: 'muted', text: 'Your bag is empty.' })]),
        el('h2', { text: 'Spells' }),
        ...hero.spells.map((id) => {
          const spell = SPELLS[id];
          if (!spell) return el('div');
          return listRow(spell.name, spell.description, costIcons(spellCost(hero, spell)));
        }),
      ],
      actions: [
        ...(canAttune(hero)
          ? [{ label: 'Choose element', onClick: () => this.chooseAttunement() }]
          : []),
        { label: 'New Game', onClick: () => this.confirmNewGame() },
        {
          label: 'Save',
          onClick: () =>
            refresh(this.save() ? 'Game saved.' : 'Saving is unavailable in this browser.'),
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
      const preview = el('canvas');
      preview.width = 48;
      preview.height = 48;
      const ctx = preview.getContext('2d');
      if (ctx && isCreatureId(cls.sprite)) {
        ctx.imageSmoothingEnabled = false;
        this.atlas.draw(ctx, mapFrame(cls.sprite, 'down', false, 0), 0, 0);
      }
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
          el('small', {
            text: `HP ${hp} · Mana ${mana} each · ATK ${atk} · DEF ${def} · ${cls.gil} gil`,
          }),
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
    this.say(`${this.state.hero.name}'s adventure begins in Mossvale.`);
  }

  // ------------------------------------------------------ attunement ---

  /** Offers the one-time elemental attunement (a level-up milestone). */
  private chooseAttunement(): void {
    const hero = this.state.hero;
    const options = ELEMENTS.map((element: Element) => {
      const option = button('', () => {
        attune(hero, element);
        this.save();
        this.dialog.close();
        this.say(`${hero.name} is now a ${heroTitle(hero)}!`);
      });
      option.append(
        iconElement(ELEMENT_ICONS[element], 2),
        el('b', {
          text:
            ATTUNEMENT_TITLES[element] === ELEMENT_NAMES[element]
              ? ELEMENT_NAMES[element]
              : `${ATTUNEMENT_TITLES[element]} (${ELEMENT_NAMES[element]})`,
        }),
        el('small', { text: SURGE_DESCRIPTIONS[element] }),
      );
      return option;
    });
    this.dialog.show({
      title: 'Choose your element',
      body: [
        el('p', {
          text: `${hero.name} has grown strong enough to attune to an element. Its line effects become 50% stronger, its spells cost 2 less of it, and its pieces fall more often. This choice is permanent.`,
        }),
        el('div', { className: 'attune-grid' }, ...options),
      ],
      actions: [{ label: 'Decide later', onClick: () => this.dialog.close() }],
    });
  }

  // ------------------------------------------------------------- HUD ---

  private renderHud(): void {
    const hero = this.state.hero;
    byId('hud-name').textContent = hero.name;
    byId('hud-name').title = heroTitle(hero);
    byId('hud-level').textContent = `Lv ${hero.level}`;
    byId('hud-hp').textContent = `${hero.hp} / ${hero.maxHp}`;
    byId('hud-hp-bar').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
    this.hudMana.update(hero);
    byId('hud-gil').textContent = String(hero.gil);
    byId('hud-xp').textContent = `${hero.xp} / ${hero.nextXp}`;
    byId('hud-place').textContent = currentMap(this.state).name;
  }

  private say(text: string): void {
    byId('world-message').textContent = text;
    this.messageTimer = 3500;
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
