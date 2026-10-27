import { button, byId, el } from './dom';

export interface DialogAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  /** A count shown as a badge on the button (e.g. unspent skill points); hidden when 0. */
  readonly badge?: number;
}

export interface DialogOptions {
  readonly title: string;
  readonly body: string | Node | readonly (string | Node)[];
  readonly actions: readonly DialogAction[];
  /**
   * Called when the player dismisses the dialog (Escape, or the browser
   * closing it). Defaults to closing. To make a choice mandatory, show the
   * dialog again from here.
   */
  readonly onCancel?: () => void;
  /**
   * Whether to focus the last enabled action (the default choice). Screens
   * that manage focus themselves pass false.
   */
  readonly autofocus?: boolean;
  /**
   * Milliseconds during which keys can't press a button or dismiss the
   * dialog, so keys still being mashed from a battle don't skip it.
   */
  readonly guardMs?: number;
  /**
   * An interlude: the dialog fills the screen in the dark, and a tap
   * anywhere (once `guardMs` has passed) presses the last action.
   */
  readonly interlude?: boolean;
}

/** Keys that press a focused button or dismiss the dialog. */
const ACTIVATION_KEYS = new Set(['Enter', ' ', 'Escape']);

/**
 * The single modal dialog used for conversations, results, shops and the
 * menu. Showing a new dialog replaces the current contents.
 */
export class Dialog {
  private readonly root = byId<HTMLDialogElement>('dialog');
  private readonly titleEl = byId('dialog-title');
  private readonly bodyEl = byId('dialog-body');
  private readonly actionsEl = byId('dialog-actions');
  private onCancel: () => void = () => this.close();
  /** True while `close()` is closing the dialog, to tell it apart from the browser doing so. */
  private closingByCode = false;
  /** Keys are ignored until this time (see `guardMs`). */
  private guardUntil = 0;
  /** What a tap anywhere does, for an interlude. */
  private tapAction: (() => void) | null = null;

  constructor() {
    this.root.addEventListener('click', (event) => {
      const onButton = (event.target as Element | null)?.closest('button');
      if (!this.tapAction || onButton || performance.now() < this.guardUntil) return;
      this.tapAction();
    });
    const guard = (event: KeyboardEvent): void => {
      if (performance.now() < this.guardUntil && ACTIVATION_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    this.root.addEventListener('keydown', guard, true);
    this.root.addEventListener('keyup', guard, true);
    this.root.addEventListener('cancel', (event) => {
      // Browsers may refuse to cancel the close (e.g. Escape before any click);
      // the 'close' handler below covers that case.
      if (!event.cancelable) return;
      event.preventDefault();
      this.onCancel();
    });
    this.root.addEventListener('close', () => {
      this.settle();
      if (this.closingByCode) this.closingByCode = false;
      else this.onCancel();
    });
  }

  /**
   * After closing: no interlude look left behind (a closed interlude must
   * never cover the map), no tap action, and no focus on a hidden button,
   * where a later Enter (say, in battle) would press it.
   */
  private settle(): void {
    this.root.classList.remove('interlude');
    this.tapAction = null;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && this.root.contains(focused)) focused.blur();
  }

  /**
   * An interlude: the screen goes dark with `body`, and a tap, Enter,
   * Escape or Continue calls `onDone`, once only and not within `guardMs`,
   * so keys or taps still held can't skip it or run it twice.
   */
  showInterlude(title: string, body: readonly Node[], onDone: () => void, guardMs: number): void {
    const shown = performance.now();
    let done = false;
    const go = (): void => {
      if (done || performance.now() - shown < guardMs) return;
      done = true;
      onDone();
    };
    this.show({
      title,
      body,
      actions: [{ label: 'Continue', onClick: go }],
      onCancel: go,
      guardMs,
      interlude: true,
    });
  }

  get isOpen(): boolean {
    return this.root.open;
  }

  show(options: DialogOptions): void {
    this.titleEl.textContent = options.title;
    const body = Array.isArray(options.body) ? options.body : [options.body];
    this.bodyEl.replaceChildren(
      ...body.map((part: string | Node) =>
        typeof part === 'string'
          ? Object.assign(document.createElement('p'), { textContent: part })
          : part,
      ),
    );
    this.actionsEl.replaceChildren(
      ...options.actions.map((a) => {
        const node = button(a.label, a.onClick, { disabled: a.disabled ?? false });
        if (a.badge) node.append(el('span', { className: 'badge', text: String(a.badge) }));
        return node;
      }),
    );
    this.onCancel = options.onCancel ?? (() => this.close());
    this.root.classList.toggle('interlude', options.interlude ?? false);
    this.tapAction = options.interlude ? (options.actions.at(-1)?.onClick ?? null) : null;
    this.guardUntil = performance.now() + (options.guardMs ?? 0);
    if (!this.root.open) this.root.showModal();
    // The last enabled action is the default; callers keep destructive choices away from it.
    if (options.autofocus ?? true) {
      [...this.actionsEl.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        .pop()
        ?.focus();
    }
  }

  close(): void {
    if (!this.root.open) return;
    this.closingByCode = true;
    this.root.close();
    this.settle();
  }
}
