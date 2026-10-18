import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { EVIDENCE } from '../src/data/cases.ts';
import { INITIAL_EVENTS } from '../src/lib/timeline.ts';
import { EVIDENCE_FACT_LINKS, PROOF_FACTS } from '../src/lib/relationshipMaps.ts';
import { CONTENT_SCHEMA_VERSION, type LegalContentRegistry } from '../src/content/schema.ts';
import { LEGAL_CONTENT_V1, getCase, getConcept, legacyConceptView } from '../src/content/registry.ts';
import { assertValidContent, validateContent } from '../src/content/validate.ts';

const copy = (): LegalContentRegistry => structuredClone(LEGAL_CONTENT_V1);
const codes=(data:LegalContentRegistry)=>validateContent(data).map(d=>d.code);

test('versioned unified registry validates without claiming a legal source was verified',()=>{
  assert.equal(CONTENT_SCHEMA_VERSION,1);
  assert.strictEqual(assertValidContent(LEGAL_CONTENT_V1),LEGAL_CONTENT_V1);
  assert.deepEqual(validateContent(LEGAL_CONTENT_V1),[]);
  assert.equal(LEGAL_CONTENT_V1.sources.length,0);
  assert.ok(LEGAL_CONTENT_V1.concepts.every(n=>n.editorial.status==='pending'&&n.sourceIds.length===0));
  assert.ok(LEGAL_CONTENT_V1.cases.every(c=>c.nature==='fictional'&&c.editorial.status==='pending'));
  assert.ok(LEGAL_CONTENT_V1.cases[0].links.every(x=>x.review==='pending'&&x.relation==='candidate-support'));
});

test('existing 9 graph concepts retain stable legacy IDs and all original explanations/edges',()=>{
  const graph=legacyConceptView();
  assert.equal(graph.length,KNOWLEDGE_NODES.length);
  for(const node of KNOWLEDGE_NODES) {
    const adapted=graph.find(n=>n.id===node.id);
    assert.ok(adapted,node.id);
    assert.equal(adapted.title,node.title);
    assert.equal(adapted.summary,node.summary);
    assert.deepEqual(adapted.related,node.related);
    const canonical=getConcept(node.id);
    assert.equal(canonical?.id,'concept:cn:'+node.id);
    assert.equal(getConcept(canonical!.id)?.legacyId,node.id);
  }
  assert.equal(new Set(graph.map(n=>n.id)).size,graph.length);
});

test('single fictional case reuses legacy evidence/fact/chronology IDs without asserting proof',()=>{
  const c=LEGAL_CONTENT_V1.cases[0];
  assert.equal(getCase(c.id)?.id,c.id);
  assert.deepEqual(c.evidence.map(e=>e.legacyId),EVIDENCE.map(e=>e.id));
  assert.deepEqual(c.events.map(e=>e.legacyId),INITIAL_EVENTS.map(e=>e.id));
  assert.equal(c.facts.length,PROOF_FACTS.length);
  assert.equal(c.links.length,Object.values(EVIDENCE_FACT_LINKS).reduce((n,ids)=>n+ids.length,0));
  assert.ok(c.events.every(e=>e.evidenceIds.length===0&&!!e.legacyEvidenceDescription));
  assert.ok(c.evidence.every(e=>e.authenticity==='unverified'));
  assert.ok(c.facts.every(f=>f.assessment==='unassessed'));
});

test('detects dangling concept, authority, fact, evidence, event and duplicate IDs',()=>{
  const c1=copy(); c1.concepts[0].relatedConceptIds.push('concept:cn:missing');
  assert.ok(codes(c1).includes('DANGLING_CONCEPT'));
  const c2=copy(); c2.concepts[0].sourceIds.push('source:cn:missing');
  assert.ok(codes(c2).includes('DANGLING_SOURCE'));
  const c3=copy(); c3.cases[0].issues[0].factIds.push('missing-fact');
  assert.ok(codes(c3).includes('DANGLING_FACT'));
  const c4=copy(); c4.cases[0].events[0].evidenceIds=['missing-evidence'];
  assert.ok(codes(c4).includes('DANGLING_EVIDENCE'));
  const c5=copy(); c5.concepts[1].id=c5.concepts[0].id;
  assert.ok(codes(c5).includes('DUPLICATE_ID'));
  const c6=copy(); c6.cases[0].links.push({...c6.cases[0].links[0],id:'different-id'});
  assert.ok(codes(c6).includes('DUPLICATE_LINK'));
});

test('rejects unsourced verified legal assertions and unreviewed claims of current legal effect',()=>{
  const c1=copy();c1.concepts[0].editorial={origin:'editorial',status:'verified',checkedAt:'2026-10-18',checkedBy:'editor'};
  assert.ok(codes(c1).includes('MISSING_AUTHORITY'));
  const c2=copy();c2.sources.push({
    id:'test:unverified-source',title:'虚拟法律依据（测试专用）',
    jurisdiction:'CN',kind:'statute',issuer:'Test Fixture',
    url:'http://example.org/not-verified',validity:'in-force',
    editorial:{status:'pending',origin:'editorial'}
  });
  assert.ok(codes(c2).includes('SOURCE_URL'));
  assert.ok(codes(c2).includes('UNVERIFIED_VALIDITY'));
  const c3=copy();c3.cases[0].links[0].review='verified';
  assert.ok(codes(c3).includes('UNVERIFIED_EVIDENCE'));
  const c4=copy();c4.schemaVersion=999 as 1;
  assert.ok(codes(c4).includes('SCHEMA_VERSION'));
});

test('rejects broken dates, missing review provenance and false source references',()=>{
  const c1=copy();c1.cases[0].events[0].date='2025-02-30';
  assert.ok(codes(c1).includes('DATE'));
  const c2=copy();c2.cases[0].editorial.status='verified';
  assert.ok(codes(c2).includes('REVIEW_PROVENANCE'));
  const c3=copy();c3.concepts[0].relatedConceptIds.push(c3.concepts[0].id);
  assert.ok(codes(c3).includes('DANGLING_CONCEPT'));
  assert.throws(()=>assertValidContent(c3),/DANGLING_CONCEPT/);
});
