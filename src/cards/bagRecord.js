'use strict';

/**
 * The Fairweather party's corner of the record, for the bag-transfer call.
 *
 * Everything in here is correct. She is the Leader, she holds the Admin
 * designation, all four members are on the account, the draught is in the
 * bag, and nothing has failed. The only row that bears on the call is the
 * movement history, which is empty — a true fact that fits the reason
 * without naming it: nobody on this account has ever assigned anything.
 */

const NODES = [
  {
    id: 'acc-fairweather',
    spoken: 'the party account',
    kind: 'account',
    category: 'account history',
    parents: [],
    owner: null,
    keys: ['acc-fairweather', 'Fairweather', '4409'],
    headline: 'The Fairweather party — Silver, since last autumn',
    line: 'Four Contacts. One Bag of Holding, TLC-held. No repairs, no disputes, no exceptions.',
    edges: [
      { to: 'con-sella', link: 'direct' },
      { to: 'con-pell', link: 'direct' },
      { to: 'bag-7730', link: 'direct' },
      { to: 'mov-none', link: 'direct' },
    ],
  },
  {
    id: 'con-sella',
    spoken: 'your record on the account',
    kind: 'contact',
    category: 'party members',
    parents: ['acc-fairweather'],
    owner: 'con-sella',
    role: 'admin',
    keys: ['Sella', 'Sella Brandt', 'con-sella'],
    headline: 'Sella Brandt — Party Leader (Admin)',
    line: 'Holds the party account. Permitted to assign from the Bag. Has never done so.',
    edges: [{ to: 'bag-7730', link: 'direct' }, { to: 'mov-none', link: 'direct' }],
  },
  {
    id: 'con-pell',
    spoken: "Pell's record",
    kind: 'contact',
    category: 'party members',
    parents: ['acc-fairweather'],
    owner: 'con-pell',
    role: 'user',
    keys: ['Pell', 'con-pell'],
    headline: 'Pell Ardry — Member',
    line: 'Joined in the spring. Nothing assigned to him. Inventory empty.',
    edges: [{ to: 'bag-7730', link: 'tangential' }],
  },
  {
    id: 'bag-7730',
    spoken: 'what is in the bag',
    kind: 'bag',
    category: 'order history',
    parents: ['acc-fairweather'],
    owner: 'con-sella',
    keys: ['bag-7730', '7730'],
    headline: 'Bag of Holding 7730 — party-held',
    line: 'Nine items. Three healing draughts, standard. Rope, two torches, a spare blade, dried stores. All available.',
    edges: [{ to: 'acc-fairweather', link: 'direct' }],
  },
  {
    id: 'mov-none',
    spoken: 'what has been moved before',
    kind: 'movements',
    category: 'account history',
    parents: ['acc-fairweather', 'con-sella'],
    owner: 'con-sella',
    keys: ['mov-none'],
    headline: 'Assignment history — nil',
    line: 'No assignments recorded on this account since it was opened. Items in, items ordered, nothing ever assigned out of the Bag to a Member.',
    edges: [{ to: 'con-sella', link: 'indirect' }],
  },
  {
    id: 'inv-2201',
    spoken: 'the last invoice',
    kind: 'invoice',
    category: 'billing',
    parents: ['acc-fairweather'],
    owner: 'con-sella',
    keys: ['inv-2201'],
    headline: 'Invoice 2201 — subscription, Silver',
    line: 'Paid. Nothing outstanding.',
    edges: [{ to: 'acc-fairweather', link: 'herring' }],
  },
];

module.exports = { NODES, RECORD: { nodes: NODES } };
