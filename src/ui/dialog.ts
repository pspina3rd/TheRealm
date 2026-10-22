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
}

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

  constructor() {
    this.root.addEventListener('cancel', (event) => {
      // Browsers may refuse to cancel the close (e.g. Escape before any click);
      // the 'close' handler below covers that case.
      if (!event.cancelable) return;
      event.preventDefault();
      this.onCancel();
    });
    this.root.addEventListener('close', () => {
      if (this.closingByCode) this.closingByCode = false;
      else this.onCancel();
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
  }
}
