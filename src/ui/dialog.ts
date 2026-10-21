import { button, byId } from './dom';

export interface DialogAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface DialogOptions {
  readonly title: string;
  readonly body: string | Node | readonly (string | Node)[];
  readonly actions: readonly DialogAction[];
  /** Called when the player presses Escape. Defaults to closing the dialog. */
  readonly onCancel?: () => void;
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

  constructor() {
    this.root.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.onCancel();
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
    this.actionsEl.replaceChildren(...options.actions.map((a) => button(a.label, a.onClick)));
    this.onCancel = options.onCancel ?? (() => this.close());
    if (!this.root.open) this.root.showModal();
    // The last action is the default; callers keep destructive choices away from it.
    (this.actionsEl.lastElementChild as HTMLButtonElement | null)?.focus();
  }

  close(): void {
    if (this.root.open) this.root.close();
  }
}
