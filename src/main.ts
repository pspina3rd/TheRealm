import './style.css';
import { createStore } from './game/storage';
import { App } from './ui/app';
import { Atlas } from './ui/art/atlas';

async function main(): Promise<void> {
  const atlas = new Atlas();
  await atlas.load(`${import.meta.env.BASE_URL}assets/`);
  new App(atlas, createStore()).start();
}

void main();
