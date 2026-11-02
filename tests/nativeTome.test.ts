import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { SCENES, OPENING, REFUSAL } from '../src/data/story';
import { HOMETOWNS } from '../src/data/hometowns';
import { SPELLS } from '../src/data/spells';
import { newGame } from '../src/world/state';
import { newKnownSpell } from '../src/game/spells';
import { serialize } from '../src/game/save';
import { TOME_STAGING, heroBook, heroBookJSON, spokenText, tomePages } from '../src/native/tome';

const scene = (id: string) => SCENES.find((entry) => entry.id === id)!;
const page = (id: string, index: number) =>
  tomePages(scene(id), newGame()).find((entry) => entry.id === `${id}:${index}`)!;

describe('native tome story presentation', () => {
  it('authors a shot for every stage-bearing beat and resolves every cast sprite', () => {
    const state = newGame();
    for (const [id] of Object.entries(SPELLS))
      state.hero.spells[id] = { ...newKnownSpell(), level: 2 };
    for (const authored of SCENES) {
      const staging = TOME_STAGING[authored.id];
      expect(staging, authored.id).toBeDefined();
      for (const [index, beat] of authored.beats.entries()) {
        if (beat.stage) expect(staging!.shots[index], `${authored.id}:${index}`).toBeDefined();
      }
      const pages = tomePages(authored, state);
      expect(pages.length, authored.id).toBe(authored.beats.length);
      for (const book of pages) {
        expect(book.caption).toBe('');
        expect(book.dialogue).not.toContain('*');
        expect(new Set(book.actors.map((actor) => actor.id)).size).toBe(book.actors.length);
        for (const actor of book.actors)
          expect(existsSync(`public/assets/${actor.source}`), actor.id).toBe(true);
        if (book.subject && book.subject !== 'master')
          expect(
            book.actors.some((actor) => actor.id === book.subject),
            book.id,
          ).toBe(true);
        if (book.target)
          expect(
            book.actors.some((actor) => actor.id === book.target),
            book.id,
          ).toBe(true);
      }
    }
  });

  it('shows the authored opening as actions and preserves the actual spoken words', () => {
    const pages = tomePages(OPENING, newGame());
    expect(pages.map((entry) => entry.action)).toEqual(['stones', 'dim', 'breath', 'dawn', 'well']);
    expect(pages[0]!.dialogue).toBe('');
    expect(pages[1]!.dialogue).toBe('');
    expect(pages[2]!.dialogue).toBe('Sleep.');
    expect(pages[3]!.dialogue).toBe(OPENING.beats[3]!.classLines!.ranger);
    expect(pages[4]!.dialogue).toBe(
      "Three houses still abed, and the well's gone purple. Something's wrong, kid.",
    );
    expect(pages[4]!.actionDescription).toContain('hauls up a bucket');
    expect(pages[4]!.dialogue).not.toContain('hauls up a bucket');
  });

  it('does not turn quoted diagram labels into speech or put worker lines in Ketter’s mouth', () => {
    expect(page('bellRelief', 6).dialogue).toBe('');
    expect(page('bellRelief', 6).actionDescription).toContain('"lower return"');
    const answer = page('bellRelief', 2);
    expect(answer.speaker).toBe('Worker');
    expect(answer.dialogue).toBe("I know. You've told me every shift this week.");
    expect(answer.subject).toBe('ketter');
    expect(page('lishalRefusal', 2).speaker).toBe('Worker');
    expect(page('lishalRefusal', 7).speaker).toBe('Worker');
  });

  it('keeps the escaped voice disembodied after the false victory', () => {
    const escaped = page('chapterEnd', 3);
    expect(escaped.speaker).toBe('A voice');
    expect(escaped.dialogue).toBe('A good throat. Old, and very obedient. I have others.');
    expect(escaped.actors.some((actor) => actor.id === 'moonWyrm')).toBe(false);
    expect(page('malificatRisen', 4).speaker).toBe('A voice');
    expect(page('malificatRisen', 4).actors.some((actor) => actor.id === 'moonWyrm')).toBe(false);
  });

  it('names the actual actor for courier arrival, rune gift and Vesper’s transformation', () => {
    expect(page('refusal', 1).subject).toBe('kestrel');
    expect(page('refusal', 3).subject).toBe('elder');
    expect(page('refusal', 3).target).toBe('hero');
    expect(page('malificatRisen', 0).subject).toBe('vesperDuel');
    expect(page('malificatFallen', 0).subject).toBe('vesperDuel');
    expect(page('archiveRefuge', 0).subject).toBeUndefined();
    expect(page('hareguyVisit', 0).subject).toBeUndefined();
    expect(page('wyrmFall', 1).subject).toBe('moonWyrm');
  });

  it('keeps authored beat indices when unearned mentor contributions are omitted', () => {
    const state = newGame();
    const pages = tomePages(scene('campaignRite'), state);
    expect(pages.some((entry) => entry.id === 'campaignRite:1')).toBe(false);
    expect(pages.find((entry) => entry.id === 'campaignRite:12')?.action).toBe('lantern');
    expect(pages.find((entry) => entry.id === 'campaignRite:15')?.action).toBe('contain');
    const before = serialize(state);
    tomePages(scene('campaignRite'), state);
    expect(serialize(state)).toBe(before);
  });

  it.each(HOMETOWNS)(
    'previews $name with its authored hero voice without changing progress',
    (home) => {
      const state = newGame(home.classId);
      const before = serialize(state);
      const pages = heroBook(home.classId);
      expect(JSON.parse(heroBookJSON(home.classId))).toEqual(pages);
      expect(pages.map((entry) => entry.setting)).toEqual([home.name, home.name]);
      expect(pages[0]!.dialogue).toBe(OPENING.beats[3]!.classLines![home.classId]);
      expect(pages[1]!.dialogue).toBe(REFUSAL.beats[0]!.classLines![home.classId]);
      expect(pages.every((entry) => entry.actors[0]?.id === 'hero')).toBe(true);
      expect(serialize(state)).toBe(before);
    },
  );

  it('preserves quoted terms and emphasis inside real dialogue while removing stage directions', () => {
    expect(spokenText('Have you learned "Fire" yet?')).toBe('Have you learned "Fire" yet?');
    expect(spokenText('You are **late**.')).toBe('You are late.');
    expect(spokenText('*She points at the "Fire" chart.* "Start with the red crystal."')).toBe(
      'Start with the red crystal.',
    );
    expect(spokenText('*A low voice:* "Sleep."')).toBe('Sleep.');
  });
});

it('stages the waking hometown rather than an empty surface during the opening', () => {
  const state = newGame('mage');
  const pages = tomePages(OPENING, state);
  expect(pages[3]?.environment).toBe('village');
  expect(pages[3]?.setting).toBe('Merehaven');
  expect(pages[4]?.environment).toBe('village');
});
