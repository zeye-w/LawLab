import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { knowledgeEdges, linkedConceptIds } from '../src/lib/relationshipMaps.ts';
import { SEED_KNOWLEDGE_NODES } from '../src/content/seedConcepts.ts';
import { CANDIDATE_LEGAL_SOURCES } from '../src/content/sourceCandidates.ts';
import { LEGAL_CONTENT_V1, getConcept, getConceptSources, legacyConceptView } from '../src/content/registry.ts';
import { assertValidContent, validateContent } from '../src/content/validate.ts';

const read = (path: string) => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('canonical Registry drives legacy graph without a duplicated authored node array',()=>{
  assert.deepEqual(KNOWLEDGE_NODES,legacyConceptView());
  assert.equal(KNOWLEDGE_NODES.length,SEED_KNOWLEDGE_NODES.length);
  assert.equal(KNOWLEDGE_NODES.length,LEGAL_CONTENT_V1.concepts.length);
  const source=read('src/data/study.ts');
  const registry=read('src/content/registry.ts');
  assert.match(source,/KNOWLEDGE_NODES: KnowledgeNode\[\] = legacyConceptView\(\)/);
  assert.doesNotMatch(source,/\{ id:'relationship'/);
  assert.doesNotMatch(registry,/from '\.\.\/data\/study\.ts'/);
  assert.doesNotMatch(registry,/from '\.\.\/lib\/relationshipMaps\.ts'/);
  assert.ok(KNOWLEDGE_NODES.every(n=>getConcept(n.id)?.legacyId===n.id));
  assert.ok(knowledgeEdges().length>=12);
  assert.ok(linkedConceptIds('relationship').has('claims'));
});

test('2D and 3D render the shared Registry-backed node and relationship arrays',()=>{
  const base=read('src/components/KnowledgeNetwork.tsx');
  const scene=read('src/components/KnowledgeNetwork3D.tsx');
  for(const src of [base,scene]){
    assert.match(src,/import \{ KNOWLEDGE_NODES \} from '\.\.\/data\/study'/);
    assert.match(src,/knowledgeEdges/);
    assert.match(src,/linkedConceptIds/);
  }
  const ui=read('src/components/StudyTools.tsx');
  assert.match(ui,/getConceptSources\(current\.id\)/);
  assert.match(ui,/aria-label="知识图谱显示模式"/);
  assert.match(ui,/<KnowledgeNetwork3D selected=\{selected\} onSelect=\{setSelected\}/);
  assert.match(ui,/<KnowledgeNetwork selected=\{selected\} onSelect=\{setSelected\}/);
  assert.match(ui,/rel="noopener noreferrer"/);
});

test('official publication links are only pending candidates with locators and unknown current validity',()=>{
  assert.equal(CANDIDATE_LEGAL_SOURCES.length,6);
  assert.equal(new Set(CANDIDATE_LEGAL_SOURCES.map(s=>s.id)).size,6);
  for(const source of CANDIDATE_LEGAL_SOURCES){
    assert.equal(source.editorial.status,'pending');
    assert.equal(source.validity,'unknown');
    assert.equal(source.jurisdiction,'CN');
    assert.ok(source.locator?.trim());
    assert.equal(new URL(source.url).protocol,'https:');
    assert.equal(new URL(source.url).hostname,'www.court.gov.cn');
  }
  assert.equal(getConceptSources('evidence').length,3);
  assert.equal(getConceptSources('concept:cn:evidence').length,3);
  assert.equal(getConceptSources('burden').length,0);
  assert.equal(getConceptSources('not-a-node').length,0);
  assert.strictEqual(assertValidContent(LEGAL_CONTENT_V1),LEGAL_CONTENT_V1);
});

test('no verified claim may cite solely pending sources or silently elevate source validity',()=>{
  const bad=structuredClone(LEGAL_CONTENT_V1);
  bad.concepts.find(n=>n.legacyId==='contract')!.editorial={
    status:'verified',origin:'editorial',checkedBy:'test-editor',checkedAt:'2026-10-18'
  };
  assert.ok(validateContent(bad).some(d=>d.code==='UNVERIFIED_AUTHORITY'));
  const bogus=structuredClone(LEGAL_CONTENT_V1);
  bogus.sources[0].validity='in-force';
  assert.ok(validateContent(bogus).some(d=>d.code==='UNVERIFIED_VALIDITY'));
  const dangling=structuredClone(LEGAL_CONTENT_V1);
  dangling.sources.splice(0,1);
  assert.ok(validateContent(dangling).some(d=>d.code==='DANGLING_SOURCE'));
});
