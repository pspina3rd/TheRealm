import { CAMPAIGN_FLAGS as C } from './campaignFlags';
import type { ChallengeSpec, NpcDef, NpcLines } from './types';

const framePuzzle: ChallengeSpec = {
  kind: 'puzzle',
  rows: ['#..##..###', '#..##..###'],
  queue: ['O', 'O'],
  linesToClear: 2,
};

function task(
  id: string,
  name: string,
  sprite: string,
  element: NpcDef['element'],
  flag: string,
  challenge: ChallengeSpec,
  lines: NpcLines,
): NpcDef {
  return {
    id,
    name,
    sprite,
    element,
    voice:
      id === 'archiveDrain' || id === 'cisternTrial'
        ? 'odile'
        : id === 'ketterRescue' || id === 'bellCircuit' || id === 'ascentRepair'
          ? 'ketter'
          : id === 'fennickRite'
            ? 'fennick'
            : id,
    inanimate: id === 'foundryProcedure',
    challenge,
    lines,
    rewards: [
      { kind: 'flag', flag },
      { kind: 'gil', amount: 40 },
    ],
    // These gifts improve supplies; the flag above is always granted at every attitude.
    ...(id === 'foundryProcedure'
      ? {}
      : {
          bonus: { kind: 'item' as const, itemId: 'herb', count: 1 },
          secret: { kind: 'item' as const, itemId: 'ether', count: 1 },
        }),
    completionFlag: flag,
    essential: true,
    repeatable: false,
  };
}

/** Scene-only identities have no challenge, rewards, or completion state. */
export const CAMPAIGN_SPEAKERS: Readonly<
  Record<string, { readonly name: string; readonly sprite: string }>
> = {
  fennick: { name: 'Fennick', sprite: 'char.038' },
  odile: { name: 'Odile', sprite: 'char.015' },
  ketter: { name: 'Ketter', sprite: 'char.031' },
};

/** Mandatory tasks cost no inventory, spells, or gil and remain available at any attitude. */
export const CAMPAIGN_NPCS: Readonly<Record<string, NpcDef>> = {
  archiveDrain: task(
    'archiveDrain',
    'Odile — the flooded landing',
    'char.015',
    'water',
    C.drain,
    framePuzzle,
    {
      intro: {
        cold: 'Keep clear of the sluice. If you mean to help, the pallet needs moving first.',
        plain: 'The drain is under that pallet. I cannot move it and keep hold of the sluice.',
        warm: 'You can take the near end, if you have a moment. We could have this landing dry before the next load.',
      },
      confide:
        'My bag has been packed since yesterday. I keep thinking of something else to check. Help me clear the drain, then I can see whether the stretchers fit.',
      accept: 'On the dry side. Lift the near end first.',
      decline: 'The bags will stay here until the lift works.',
      win: 'The catch is clear. We can lower the lift now.',
      lose: 'Set it down. We will shift it from the other end.',
      done: 'The landing is dry. The cistern road is behind the shelves.',
    },
  ),
  cisternTrial: task(
    'cisternTrial',
    'Odile — the trial channel',
    'char.015',
    'water',
    C.trial,
    { kind: 'barter', wants: { blue: 8, green: 4 }, pieceLimit: 28 },
    {
      intro: {
        cold: 'The sleeping chambers stay shut during this test. Help with the channel, and leave those gates alone.',
        plain:
          'We can test the old drain with the sleeping chambers shut. Help me keep the flow steady.',
        warm: 'I have the chambers shut. Will you watch the channel while I check the heat? We can compare before moving anyone.',
      },
      confide:
        'I want those beds upstairs. I also want to check every one myself. Watch the channel for me; I cannot see both ends from here.',
      accept: 'Blue for the channel. Green for the roots holding its bank.',
      decline: 'I will keep the chambers isolated.',
      win: 'No drop in heat, and no water in the chambers. Irdrath saw it too.',
      lose: 'Close the inlet. No one has moved a bed yet; we can test again.',
      done: 'The trial held. We are ready to move the first bed.',
    },
  ),
  rootTram: task(
    'rootTram',
    'Rafe — the stopped tram',
    'char.027',
    'earth',
    C.tram,
    { kind: 'puzzle', rows: ['####....##'], queue: ['I'], linesToClear: 1 },
    {
      intro: {
        cold: 'Stay off the rail. The roots have lifted it. Set that brace if you want a tram out of here.',
        plain:
          'The roots have lifted this rail. Set the straight brace and I can get the tram moving.',
        warm: 'Good, another pair of hands. Hold this rail level with the straight brace and I will try the tram.',
      },
      confide:
        'I can turn the wheels by hand, but they catch at this joint. Help me set the brace, then stand here with me for the first run.',
      accept: 'Across the middle. Leave the wheels clear.',
      decline: 'I will keep everyone off the track.',
      win: 'There. The tram runs to the Glass Warrens again.',
      lose: 'The brace missed its seat. Nothing is loaded; try it again.',
      done: 'The tram is yours to use. Mind the low roots.',
    },
  ),
  ketterRescue: task(
    'ketterRescue',
    'Ketter — the damaged lift',
    'char.031',
    'wind',
    C.rescue,
    { kind: 'puzzle', rows: ['..##..##..', '..##..##..'], queue: ['O', 'O', 'O'], linesToClear: 2 },
    {
      intro: {
        cold: 'Do not pull that rope. It is frayed through. Secure the lift first, if you are helping.',
        plain: 'Down here! Secure the lift before you lower it. That rope is frayed through.',
        warm: 'Down here! Glad you saw the lamp. Brace the lift first and we can get me out of this cage.',
      },
      confide:
        'I have checked every fitting I can reach from here. Twice. You will have to check the far side for me before you lower it.',
      accept: 'Seat the supports under both sides.',
      decline: 'I have my lamp. I can wait if you need another look.',
      win: 'Hold it there. I can reach the cage now.',
      lose: 'The support slipped. Keep your hands clear; try the frame again.',
      done: 'Upper branch carries the voice. Lower branch feeds our lamps. Leave that one lit.',
    },
  ),
  bellCircuit: task(
    'bellCircuit',
    'Ketter — the return bell',
    'char.031',
    'wind',
    C.bells,
    { kind: 'puzzle', rows: ['##..##..##', '##..##..##'], queue: ['O', 'O'], linesToClear: 2 },
    {
      intro: {
        cold: 'Leave the bell to the operator. The return cord is caught; help me seat these fittings.',
        plain:
          'The return cord is caught again. Help me seat these fittings while the relief operator takes the bell.',
        warm: 'There you are. Take the other fitting, will you? If this cord runs clean, I might finish supper somewhere else.',
      },
      confide:
        'They answered the last signal correctly. I still went back to check. Help me finish this cord, and I will let them answer the next one without me.',
      accept: 'Keep both fittings level. The signal has to come back clean.',
      decline: 'I will answer this one. Come back when you are free.',
      win: 'They answered it themselves. I can leave the workshop with you.',
      lose: 'That still catches. We will lift it and try again.',
      done: 'Take Fennick’s letters and the relay plan. The lower return is the missing part.',
    },
  ),
  foundryProcedure: task(
    'foundryProcedure',
    'The inspection rail',
    'chest',
    'arcane',
    C.procedure,
    {
      kind: 'puzzle',
      rows: ['####.#####', '####.#####', '####.#####', '####.#####'],
      queue: ['I'],
      linesToClear: 4,
    },
    {
      intro:
        'The diagram matches Fennick’s letter. A narrow return path is missing from the copied sequence.',
      accept: 'Trace the return without crossing the other circuits.',
      decline: 'The inspection diagram remains beside the rail.',
      win: 'The completed return joins the surface stations. You copy it before approaching the bridge.',
      lose: 'The route doubled back. The original diagram is still intact; copy it again.',
      done: 'The procedure is copied. The loading-door brake is beside the bridge release.',
    },
  ),
  ascentRepair: task(
    'ascentRepair',
    'Ketter — the fallen beam',
    'char.031',
    'earth',
    C.ascent,
    { kind: 'barter', wants: { gold: 8, orange: 8 }, pieceLimit: 35 },
    {
      intro: {
        cold: 'Can you keep that wheel steady? I need to get underneath, and Odile has the landing to clear.',
        plain:
          'I need someone on the wheel while I get underneath. Odile has to keep the landing clear.',
        warm: 'Will you take the wheel again? I can reach the cable from below once you have the lift braced.',
      },
      confide:
        'I left the tool case below. It can wait. The people on this landing cannot, so I am counting on you to hold the wheel.',
      accept: 'Slowly. Keep the lift braced while I free the cable.',
      decline: 'The sleepers are on dry ground. We can wait.',
      win: 'The cable is free. We can lift them through to Sevenstones.',
      lose: 'Lower it gently. Everyone is clear; we can reset the jack.',
      done: 'Go on. We can keep the ascent open from here.',
    },
  ),
  fennickRite: task(
    'fennickRite',
    'Fennick — the outer stations',
    'char.038',
    'arcane',
    C.rite,
    {
      kind: 'puzzle',
      rows: ['nnn..nnnnn', 'nn#..nnnnn', 'n.nnnn#nnn'],
      queue: ['O', 'I'],
      linesToClear: 3,
    },
    {
      intro: {
        cold: 'Keep outside the inner ward. Ketter has checked the frames; we can test the sequence at these marks.',
        plain: 'Ketter has checked the frames. Help me fit the recovered sequence to these marks.',
        warm: 'Bring your copy beside mine. Ketter has checked the frames, and I would like you to check the sequence with me.',
      },
      confide:
        'I keep looking for one more thing to check. Read the sequence back to me, will you? Then we can test the small ring together.',
      accept: 'The small ring first. Nobody enters the inner ward yet.',
      decline: 'We will keep the approach clear until you are ready.',
      win: 'The light stayed inside the test ring. Let the others take their stations.',
      lose: 'Stop the sequence. We will reset the marks before anyone goes in.',
      done: 'The outer stations are ready. The watch is keeping the helpers clear.',
    },
  ),
  archiveMerchant: {
    id: 'archiveMerchant',
    name: 'Quill — refuge stores',
    sprite: 'char.002',
    element: 'nature',
    essential: true,
    repeatable: true,
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3400 },
    rewards: [{ kind: 'shop', shopId: 'archiveSupplies' }],
    lines: {
      intro: {
        cold: 'The bandages are clean and the prices are marked. Make an offer if you need supplies.',
        plain: 'Beds, clean bandages, and enough stock for the next road. Shall we settle a price?',
        warm: 'Come in. There is room to rest, and I can spare you a better price on supplies for the road.',
      },
      confide:
        'I keep a little stock behind the counter. Ask to see it after we settle the price; you may have more use for it down the road.',
      accept: 'Make your offer.',
      decline: 'I will be here.',
      win: 'Agreed. Take a look.',
      lose: 'Full price today. Try me again when you have rested.',
    },
  },
  bellMerchant: {
    id: 'bellMerchant',
    name: 'Ash — Bell Hollows stores',
    sprite: 'char.020',
    element: 'fire',
    essential: true,
    repeatable: true,
    challenge: { kind: 'haggle', pieceLimit: 6, rivalIntervalMs: 3400 },
    rewards: [{ kind: 'shop', shopId: 'bellSupplies' }],
    lines: {
      intro: {
        cold: 'Do not block the stairs. If you need food or gear, show me your offer.',
        plain: 'Food, a place to sleep, and gear for the upper works. Show me your offer.',
        warm: 'You made it back up. Rest your legs, then let us find you a decent price for the next climb.',
      },
      confide:
        'There is a little more gear under the counter. We can look through it together once we have agreed on a price.',
      accept: 'Fair terms, now.',
      decline: 'Mind the stairs.',
      win: 'That will do. The stores are open.',
      lose: 'Not that low. There is no fee for trying again.',
    },
  },
};
