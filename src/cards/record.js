'use strict';

/**
 * The CRM as a hierarchy, with links that are not all honest.
 *
 * The record is a hierarchy of hierarchies (settled.md:1578): the Company,
 * the Accounts, the Contacts under each Account, and the sub-records below
 * them. An Account must have a Contact designated Admin, and the
 * account-wide view is the Admin's view rather than a second parent
 * (settled.md:1591) — so a Member sees only what they created or were
 * assigned, and a Member can genuinely be unable to see their own guild's
 * order.
 *
 * Hitting a node links back directly, indirectly, tangentially, or to a red
 * herring (settled.md:868), and more than one path can reach the same child.
 * A tangential link and a red herring are indistinguishable when found; they
 * separate only when a second path reaches the same place.
 *
 * Nothing here is fake. Every red herring is a true, related, irrelevant
 * record — which is what a real CRM is made of.
 */

/** The four kinds of link a hit can return. */
const LINKS = ['direct', 'indirect', 'tangential', 'herring'];

/** The CRM categories a node can be filed under. */
const CATEGORIES = [
  'account history',
  'party members',
  'order history',
  'billing',
  'tracking',
  'cases',
];

/**
 * The Ironbridge Company's corner of the record.
 *
 * `parents` is the hierarchy. `owner` is the Contact who created it, which is
 * what decides a Member's visibility. `keys` are the identifiers printed on
 * the row — the same key can appear on rows in different categories, which is
 * what makes one probe return several paths (settled.md:1616).
 */
const NODES = [
  {
    id: 'acc-ironbridge',
    spoken: 'the Ironbridge account',
    kind: 'account',
    category: 'account history',
    parents: [],
    owner: null,
    keys: ['acc-ironbridge', 'Ironbridge'],
    headline: 'The Ironbridge Company — Guild account, Silver, since the spring',
    line: 'Guild customer. One Guild Leader, one Member on file. Standard POOF Instant ordering, no repairs.',
    edges: [
      { to: 'con-hald', link: 'direct' },
      { to: 'con-oda', link: 'direct' },
      { to: 'ord-4471', link: 'direct' },
      { to: 'case-1180', link: 'tangential' },
    ],
  },
  {
    id: 'con-hald',
    spoken: 'Hald on the account',
    kind: 'contact',
    category: 'party members',
    parents: ['acc-ironbridge'],
    owner: 'con-hald',
    role: 'admin',
    keys: ['Hald', 'con-hald'],
    headline: 'Hald Ironbridge — Guild Leader (Admin)',
    line: 'Places the orders and holds the invoices. Every order and invoice on this account was created by him.',
    edges: [
      { to: 'ord-4471', link: 'direct' },
      { to: 'inv-9912', link: 'direct' },
      { to: 'ord-3390', link: 'indirect' },
    ],
  },
  {
    id: 'con-oda',
    spoken: 'your own record',
    kind: 'contact',
    category: 'party members',
    parents: ['acc-ironbridge'],
    owner: 'con-oda',
    role: 'user',
    keys: ['Oda', 'Oda Varn', 'con-oda'],
    headline: 'Oda Varn — Member, quartermaster',
    line: 'Named on no order. One case raised by her, in the spring.',
    edges: [{ to: 'case-1180', link: 'direct' }],
  },
  {
    id: 'ord-4471',
    spoken: 'the order itself',
    kind: 'order',
    category: 'order history',
    parents: ['acc-ironbridge', 'con-hald'],
    owner: 'con-hald',
    keys: ['ord-4471', 'PO-1183'],
    headline: 'POOF Instant Order 4471 — twelve sets, standard healing draught',
    line: 'One order line, quantity twelve, customer-supplied ingredients. Custom Container. Shipped and delivered.',
    edges: [
      { to: 'ord-4471-lines', link: 'direct' },
      { to: 'inv-9912', link: 'direct' },
      { to: 'trk-7781', link: 'direct' },
      { to: 'ord-3390', link: 'tangential' },
    ],
  },
  {
    id: 'ord-4471-lines',
    spoken: 'what was on the order',
    kind: 'orderline',
    category: 'order history',
    parents: ['ord-4471'],
    owner: 'con-hald',
    keys: ['ord-4471', 'PO-1183'],
    headline: 'Order 4471, lines',
    line: 'Twelve sets on one line. Customer-supplied ingredients, quantities above the recipe on the common component. Condition and provenance not recorded.',
    edges: [{ to: 'ord-4471', link: 'direct' }],
  },
  {
    id: 'inv-9912',
    spoken: 'the invoice for it',
    kind: 'invoice',
    category: 'billing',
    parents: ['acc-ironbridge', 'con-hald'],
    owner: 'con-hald',
    keys: ['inv-9912', 'PO-1183'],
    headline: 'Invoice 9912 — order 4471',
    line: 'Carriage, handling, and a Custom Container fee. Paid on the guild account.',
    edges: [
      { to: 'ord-4471', link: 'direct' },
      { to: 'inv-8803', link: 'herring' },
    ],
  },
  {
    id: 'trk-7781',
    spoken: 'the shipment',
    kind: 'shipment',
    category: 'tracking',
    parents: ['ord-4471'],
    owner: 'con-hald',
    keys: ['trk-7781', 'PO-1183'],
    headline: 'Shipment 7781 — delivered',
    line: 'One container, delivered after dark, signed for at the hall. No exception recorded.',
    edges: [{ to: 'ord-4471', link: 'direct' }],
  },
  {
    id: 'ord-3390',
    spoken: 'your order from the spring',
    kind: 'order',
    category: 'order history',
    parents: ['acc-ironbridge', 'con-hald'],
    owner: 'con-hald',
    keys: ['ord-3390', 'PO-1183'],
    headline: 'POOF Instant Order 3390 — six sets, standard healing draught',
    line: 'The spring order. Six sets, one line, Custom Container, no complaint recorded.',
    // A true, related, irrelevant-looking fact that genuinely argues against
    // the container being the thing: the same line, the same crates, and
    // nobody rang. Contradiction is the record's distinctive power
    // (settled.md:831).
    weakens: 'custom-container',
    edges: [
      { to: 'inv-8803', link: 'direct' },
      { to: 'ord-4471', link: 'tangential' },
    ],
  },
  {
    id: 'inv-8803',
    spoken: 'the invoice from the spring',
    kind: 'invoice',
    category: 'billing',
    parents: ['acc-ironbridge', 'con-hald'],
    owner: 'con-hald',
    keys: ['inv-8803'],
    headline: 'Invoice 8803 — order 3390',
    line: 'Carriage, handling, Custom Container fee. Paid.',
    edges: [{ to: 'ord-3390', link: 'direct' }],
  },
  {
    id: 'case-1180',
    spoken: 'the case you raised in the spring',
    kind: 'case',
    category: 'cases',
    parents: ['acc-ironbridge', 'con-oda'],
    owner: 'con-oda',
    keys: ['case-1180'],
    headline: 'Case 1180 — the cold room, in the spring',
    line: 'Raised by Oda Varn. Draughts stored badly, resolved with advice. Closed.',
    edges: [{ to: 'con-oda', link: 'herring' }],
  },
];

/** The record, as the thing functions take. */
const RECORD = { nodes: NODES };

/** @returns {object|undefined} the node with that id. */
function node(record, id) {
  return record.nodes.find((n) => n.id === id);
}

/**
 * Every path from a root to every node carrying `key`.
 *
 * A customer-provided identifier is multi-category, so one probe returns
 * several *paths* rather than several rows (settled.md:1616): the same PO
 * under an order and under an invoice is two routes to different children.
 *
 * @param {object} record
 * @param {string} key - what the customer gave, matched case-insensitively.
 * @returns {Array<{node: string, category: string, path: string[]}>}
 */
function probe(record, key) {
  const want = String(key).toLowerCase();
  const hits = record.nodes.filter((n) => n.keys.some((k) => k.toLowerCase() === want));
  const out = [];
  for (const hit of hits) {
    for (const path of pathsTo(record, hit.id)) {
      out.push({ node: hit.id, category: hit.category, path });
    }
  }
  return out;
}

/**
 * Every route down to a node, one per parent chain.
 *
 * Recursive rather than iterative because a node can have more than one
 * parent and each parent is its own route; an ancestor seen twice on one
 * chain is dropped so a cycle in the data cannot hang the call.
 *
 * @returns {string[][]}
 */
function pathsTo(record, id, seen = []) {
  if (seen.includes(id)) return [];
  const n = node(record, id);
  if (!n) return [];
  if (!n.parents.length) return [[id]];
  const out = [];
  for (const p of n.parents) {
    for (const up of pathsTo(record, p, seen.concat(id))) out.push(up.concat(id));
  }
  return out.length ? out : [[id]];
}

/**
 * What reading a row actually adds.
 *
 * A list shows its rows; reading one adds what is not on the face of it. The
 * edges come back *unlabelled* — the player is told a link exists, not what
 * kind it is, because a tangential link and a red herring look the same when
 * found. A critical is what labels some of them (see `board.js`).
 *
 * @returns {{headline: string, line: string, edges: string[]}|null}
 */
function read(record, id) {
  const n = node(record, id);
  if (!n) return null;
  return { spoken: n.spoken, headline: n.headline, line: n.line, edges: n.edges.map((e) => e.to) };
}

/**
 * The rows of a category that a given Contact can see.
 *
 * §10: Admins see all, Users see only what they created or were assigned.
 * Passing an Admin's id returns the account-wide view, which is what *the
 * Account has visibility to all sub-records* means (settled.md:1591).
 *
 * @param {object} record
 * @param {string} category
 * @param {string} contactId - whose eyes. An Admin sees everything.
 * @returns {Array<{id: string, headline: string}>}
 */
function list(record, category, contactId) {
  const who = node(record, contactId);
  const admin = who && who.role === 'admin';
  return record.nodes
    .filter((n) => n.category === category)
    .filter((n) => admin || n.owner === contactId || n.owner === null)
    .map((n) => ({ id: n.id, spoken: n.spoken, headline: n.headline }));
}

/**
 * Whether two paths reach the same node by different routes.
 *
 * This is the only thing that separates a tangential link from a red herring
 * after the fact: one path to a fact is a lead, two independent paths are a
 * confirmation, and that judgement is the player's rather than a readout.
 */
function corroborated(paths, id) {
  const routes = new Set();
  for (const p of paths) {
    const at = p.path.indexOf(id);
    if (at === -1) continue;
    // The route is what was walked to *get to* this node. Using the whole
    // path minus its last element instead counted every descendant's route
    // as a route to the ancestor, which made the root look corroborated by
    // everything under it.
    routes.add(p.path.slice(0, at).join('>'));
  }
  return routes.size > 1;
}

/** The link kind on an edge, for the engine rather than the player. */
function linkKind(record, fromId, toId) {
  const n = node(record, fromId);
  const e = n && n.edges.find((x) => x.to === toId);
  return e ? e.link : null;
}

module.exports = {
  LINKS,
  CATEGORIES,
  NODES,
  RECORD,
  node,
  probe,
  pathsTo,
  read,
  list,
  corroborated,
  linkKind,
};
