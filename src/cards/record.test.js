'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { LINKS, CATEGORIES, NODES, RECORD, node, probe, pathsTo, read, list, corroborated, linkKind } = require('./record');

test('probe PO-1183 returns paths in three distinct categories and more than one route to one node', () => {
  const hits = probe(RECORD, 'PO-1183');
  assert.ok(new Set(hits.map((h) => h.category)).size >= 3);
  const perNode = {};
  for (const h of hits) perNode[h.node] = (perNode[h.node] || 0) + 1;
  assert.ok(Object.values(perNode).some((n) => n > 1), 'no node was reached by two routes');
  for (const h of hits) assert.strictEqual(h.path[h.path.length - 1], h.node);
});

test('probe matches case-insensitively', () => {
  assert.deepStrictEqual(probe(RECORD, 'po-1183'), probe(RECORD, 'PO-1183'));
});

test('every parent and every edge target is a real node id', () => {
  const ids = new Set(NODES.map((n) => n.id));
  assert.strictEqual(ids.size, NODES.length, 'duplicate node ids');
  for (const n of NODES) {
    for (const p of n.parents) assert.ok(ids.has(p), `${n.id} has dangling parent ${p}`);
    for (const e of n.edges) assert.ok(ids.has(e.to), `${n.id} has dangling edge to ${e.to}`);
  }
});

test('every link is a LINK and every category a CATEGORY', () => {
  for (const n of NODES) {
    assert.ok(CATEGORIES.includes(n.category), `${n.id} category ${n.category}`);
    for (const e of n.edges) assert.ok(LINKS.includes(e.link), `${n.id} -> ${e.to} link ${e.link}`);
  }
});

test('a Member cannot see her own guild\'s order; the Admin can', () => {
  assert.deepStrictEqual(list(RECORD, 'order history', 'con-oda'), []);
  assert.ok(list(RECORD, 'order history', 'con-hald').length > 0);
  // she can still see what she created
  assert.ok(list(RECORD, 'cases', 'con-oda').some((r) => r.id === 'case-1180'));
});

test('read returns bare-id edges with no link kind leaking', () => {
  for (const n of NODES) {
    const r = read(RECORD, n.id);
    assert.deepStrictEqual(Object.keys(r).sort(), ['edges', 'headline', 'line', 'spoken']);
    assert.strictEqual(r.edges.length, n.edges.length);
    for (const e of r.edges) assert.strictEqual(typeof e, 'string');
    // The link kind must not come back at all: an edge is a bare id, and
    // nothing in the row's own text names a kind.
    for (const l of LINKS) {
      assert.ok(!r.edges.includes(l), `edge list leaked the link kind ${l}`);
      assert.ok(!String(r.line).includes(l), `the row text names the link kind ${l}`);
    }
  }
});

test('read on an unknown id is null; probe of an uncarried key is empty; pathsTo of unknown id is []', () => {
  assert.strictEqual(read(RECORD, 'nope'), null);
  assert.deepStrictEqual(probe(RECORD, 'nobody-carries-this'), []);
  assert.deepStrictEqual(pathsTo(RECORD, 'nope'), []);
});

test('pathsTo terminates on a cycle in the data', () => {
  const cyc = {
    nodes: [
      { id: 'a', parents: ['b'], keys: [], edges: [] },
      { id: 'b', parents: ['a'], keys: [], edges: [] },
    ],
  };
  assert.doesNotThrow(() => pathsTo(cyc, 'a'));
  assert.ok(Array.isArray(pathsTo(cyc, 'a')));
});

test('pathsTo gives one route per parent chain, root first', () => {
  const routes = pathsTo(RECORD, 'ord-4471').map((p) => p.join('>')).sort();
  assert.deepStrictEqual(routes, ['acc-ironbridge>con-hald>ord-4471', 'acc-ironbridge>ord-4471']);
  assert.deepStrictEqual(pathsTo(RECORD, 'acc-ironbridge'), [['acc-ironbridge']]);
});

test('corroborated is true for two distinct routes and false for one', () => {
  assert.strictEqual(corroborated(probe(RECORD, 'ord-4471'), 'ord-4471'), true);
  assert.strictEqual(corroborated(probe(RECORD, 'Ironbridge'), 'acc-ironbridge'), false);
  const chain = { nodes: [
    { id: 'r', parents: [], keys: [], edges: [] },
    { id: 'c', parents: ['r'], keys: ['k'], edges: [] },
  ] };
  assert.strictEqual(corroborated(probe(chain, 'k'), 'c'), false);
  assert.strictEqual(corroborated(probe(RECORD, 'ord-4471'), 'not-in-paths'), false);
});

test('every link kind appears somewhere in the data', () => {
  const seen = new Set(NODES.flatMap((n) => n.edges.map((e) => e.link)));
  for (const l of LINKS) assert.ok(seen.has(l), `no edge of kind ${l}`);
});

test('linkKind reports the engine-side kind, and null for no edge', () => {
  assert.strictEqual(linkKind(RECORD, 'inv-9912', 'inv-8803'), 'herring');
  assert.strictEqual(linkKind(RECORD, 'inv-9912', 'case-1180'), null);
  assert.strictEqual(linkKind(RECORD, 'nope', 'x'), null);
  assert.ok(node(RECORD, 'con-hald'));
});
