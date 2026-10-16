import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_CARDS, KNOWLEDGE_NODES } from '../src/data/study.ts';

test('study cards are unique and contain actionable learning material', () => {
  assert.equal(STUDY_CARDS.length, 12);
  assert.equal(new Set(STUDY_CARDS.map(card=>card.id)).size, STUDY_CARDS.length);
  for (const card of STUDY_CARDS) {
    assert.ok(card.front.trim() && card.back.trim() && card.context.trim());
    assert.ok(['民法','证据法','法律方法'].includes(card.topic));
  }
});

test('knowledge graph has unique nodes and no dangling links', () => {
  const ids = new Set(KNOWLEDGE_NODES.map(n=>n.id));
  assert.equal(ids.size, KNOWLEDGE_NODES.length);
  assert.ok(ids.has('relationship'));
  for (const node of KNOWLEDGE_NODES) {
    assert.ok(node.title.trim() && node.summary.trim() && node.question.trim());
    assert.ok(node.related.length>0);
    assert.ok(!node.related.includes(node.id));
    assert.equal(new Set(node.related).size,node.related.length);
    for (const id of node.related) assert.ok(ids.has(id),`Unknown linked node ${id}`);
  }
});

test('knowledge graph links are bidirectional', () => {
  for (const node of KNOWLEDGE_NODES) {
    for (const id of node.related) {
      const other = KNOWLEDGE_NODES.find(n=>n.id===id)!;
      assert.ok(other.related.includes(node.id),`${id} should link back to ${node.id}`);
    }
  }
});

test('students can use each teaching topic and topic content is non-empty', () => {
  for (const topic of ['民法','证据法','法律方法']) {
    assert.ok(STUDY_CARDS.some(card=>card.topic===topic));
    assert.ok(KNOWLEDGE_NODES.some(node=>node.category===topic));
  }
});
