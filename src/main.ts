import { registerInstallSupport } from './ui/install';
import './style.css';
import { createStore } from './game/storage';
import { App } from './ui/app';
import { Atlas } from './ui/art/atlas';

async function main(): Promise<void> {
  const atlas = new Atlas();
  await atlas.load(`${import.meta.env.BASE_URL}assets/`);
  const store = createStore();
  const params = new URLSearchParams(location.search);
  const fernPlaytest = import.meta.env.DEV && params.get('opening') === 'fern';
  // Author-review saves cannot replace the player's ordinary campaign or preferences.
  const playtestStore = fernPlaytest
    ? {
        persistent: store.persistent,
        getItem: (key: string) => store.getItem(`fern-opening/${key}`),
        setItem: (key: string, value: string) => store.setItem(`fern-opening/${key}`, value),
        removeItem: (key: string) => store.removeItem(`fern-opening/${key}`),
      }
    : store;
  new App(atlas, playtestStore, fernPlaytest, fernPlaytest && params.get('at') === 'dawn').start();
  void registerInstallSupport(import.meta.env.PROD, import.meta.env.BASE_URL);
}

void main();
