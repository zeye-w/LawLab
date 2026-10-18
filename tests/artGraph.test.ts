import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { KNOWLEDGE_POSITIONS, knowledgeEdges } from '../src/lib/relationshipMaps.ts';
import { settleLayout, stepLayout, layoutBounds, type SimNode, type SimEdge } from '../src/lib/forceLayout.ts';

function seeded(): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodes = KNOWLEDGE_NODES.map(n => ({ id: n.id, x: (KNOWLEDGE_POSITIONS[n.id].x - 450) * .55, y: (KNOWLEDGE_POSITIONS[n.id].y - 250) * .55, vx: 0, vy: 0 }));
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  return { nodes, edges: knowledgeEdges().map(e => ({ a: index.get(e.a)!, b: index.get(e.b)! })) };
}

test('force layout settles deterministically into a spread-out, linked-together arrangement', () => {
  const first = seeded(), second = seeded();
  settleLayout(first.nodes, first.edges); settleLayout(second.nodes, second.edges);
  assert.deepEqual(first.nodes, second.nodes, 'same seed must give the same layout');
  const { nodes, edges } = first;
  for (const n of nodes) assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), n.id + ' position');
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    assert.ok(d > 55, `${nodes[i].id} and ${nodes[j].id} overlap (${d.toFixed(1)})`);
  }
  const linked = new Set(edges.map(e => [e.a, e.b].sort().join('|')));
  let inSum = 0, inN = 0, outSum = 0, outN = 0;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    if (linked.has(i + '|' + j)) { inSum += d; inN++; } else { outSum += d; outN++; }
  }
  assert.ok(inSum / inN < outSum / outN, 'linked concepts should sit closer than unlinked ones');
  const b = layoutBounds(nodes);
  assert.ok(Math.abs((b.x0 + b.x1) / 2) < 60 && Math.abs((b.y0 + b.y1) / 2) < 60, 'graph stays centred');
});

test('a pinned (dragged) node does not move while its neighbours react', () => {
  const { nodes, edges } = seeded();
  settleLayout(nodes, edges);
  const pinned = nodes.findIndex(n => n.id === 'facts');
  nodes[pinned].x += 120;
  const before = { x: nodes[pinned].x, y: nodes[pinned].y };
  const neighbour = edges.find(e => e.a === pinned || e.b === pinned)!;
  const other = nodes[neighbour.a === pinned ? neighbour.b : neighbour.a];
  const start = { x: other.x, y: other.y };
  for (let i = 0; i < 30; i++) stepLayout(nodes, edges, .8, pinned);
  assert.deepEqual({ x: nodes[pinned].x, y: nodes[pinned].y }, before);
  assert.ok(Math.hypot(other.x - start.x, other.y - start.y) > 1, 'neighbour should be pulled along');
});

test('seals and ruled paper respect reduced motion and keep official-seal wording out', () => {
  const art = readFileSync(new URL('../src/art.css', import.meta.url), 'utf8');
  assert.match(art, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.law-seal-stamp \{ animation: none; \}/);
  assert.match(art, /background-attachment: local/);
  const sources = ['../src/App.tsx', '../src/components/StudyTools.tsx', '../src/components/PaperWorkspace.tsx']
    .map(p => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');
  const seals = [...sources.matchAll(/<Seal chars=\{\[([^\]]+)\]\}/g)].map(m => m[1].replace(/['\s,]/g, ''));
  assert.deepEqual(seals.sort(), ['已掌握', '已掌握', '已核验', '研读毕'].sort());
  for (const text of seals) assert.doesNotMatch(text, /法院|人民|政府|公章|专用章/);
});
