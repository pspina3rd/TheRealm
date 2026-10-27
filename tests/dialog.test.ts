// @vitest-environment jsdom
/**
 * The interlude (the Wyrm's visions and lair) in a real DOM: once
 * dismissed it is gone (closed, no dark full-screen class, nothing focused
 * inside), and it runs its continuation once only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../src/ui/dialog';
import { lineNodes } from '../src/ui/dom';

/** jsdom has no modal dialogs: open and close by the attribute, as browsers do. */
function polyfillDialog(): void {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

let now = 0;

beforeEach(() => {
  polyfillDialog();
  document.body.innerHTML = `<dialog id="dialog"><h2 id="dialog-title"></h2>
    <div id="dialog-body"></div><div id="dialog-actions"></div></dialog>`;
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => vi.restoreAllMocks());

const root = () => document.getElementById('dialog') as HTMLDialogElement;
const continueButton = () => root().querySelector<HTMLButtonElement>('#dialog-actions button')!;

describe('the interlude', () => {
  it('leaves nothing over the map once dismissed', () => {
    const dialog = new Dialog();
    dialog.showInterlude('A vision', [document.createTextNode('words')], () => dialog.close(), 350);
    expect(root().open).toBe(true);
    expect(root().classList.contains('interlude')).toBe(true);
    expect(document.activeElement).toBe(continueButton());
    now += 400;
    continueButton().click();
    expect(root().open).toBe(false);
    expect(root().classList.contains('interlude')).toBe(false);
    expect(root().contains(document.activeElement)).toBe(false);
  });

  it('ignores taps and presses within the guard, then goes on once only', () => {
    const dialog = new Dialog();
    const fight = vi.fn(() => dialog.close());
    dialog.showInterlude('Moon Wyrm', [], fight, 350);
    now += 100;
    root().click(); // a tap anywhere, too soon
    continueButton().click();
    expect(fight).not.toHaveBeenCalled();
    now += 300;
    const button = continueButton();
    root().click(); // a tap anywhere: goes on
    expect(fight).toHaveBeenCalledTimes(1);
    // Enter on the old button (or another tap) after the fight began starts nothing more.
    button.click();
    root().click();
    expect(fight).toHaveBeenCalledTimes(1);
  });

  it('goes on with Escape (cancel) once, too', () => {
    const dialog = new Dialog();
    const done = vi.fn(() => dialog.close());
    dialog.showInterlude('A vision', [], done, 350);
    now += 400;
    root().dispatchEvent(new Event('cancel', { cancelable: true }));
    root().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(done).toHaveBeenCalledTimes(1);
    expect(root().open).toBe(false);
  });

  it('a plain dialog after an interlude is not dark', () => {
    const dialog = new Dialog();
    dialog.showInterlude('A vision', [], () => {}, 0);
    dialog.show({ title: 'Elder', body: 'Hi', actions: [] });
    expect(root().classList.contains('interlude')).toBe(false);
  });
});

describe('stage directions in the DOM', () => {
  it('renders narration as em.stage, as the map banner and speech bubbles do', () => {
    const span = document.createElement('span');
    span.append(...lineNodes('*Vesper bows.* "Go."'));
    expect(span.innerHTML).toBe('<em class="stage">Vesper bows.</em> "Go."');
  });
});
