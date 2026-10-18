import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { EVIDENCE } from '../src/data/cases.ts';
import {
  knowledgeEdges,linkedConceptIds,KNOWLEDGE_POSITIONS,
  proofEdges,uncoveredFactIds,EVIDENCE_FACT_LINKS,PROOF_FACTS
} from '../src/lib/relationshipMaps.ts';
import { reviewContract,SAMPLE_CONTRACT } from '../src/lib/contractRules.ts';
import { locateRisk } from '../src/lib/contracts/locateRisk.ts';

test('knowledge network is an undirected de-duplicated relationship graph with all positions',()=>{
  const ids=new Set(KNOWLEDGE_NODES.map(n=>n.id));
  const edges=knowledgeEdges();
  assert.ok(edges.length>=12);
  assert.equal(new Set(edges.map(e=>e.id)).size,edges.length);
  for(const n of KNOWLEDGE_NODES){
    assert.ok(KNOWLEDGE_POSITIONS[n.id],n.id+' needs a position');
    assert.ok(Number.isFinite(KNOWLEDGE_POSITIONS[n.id].x));
  }
  for(const e of edges){
    assert.ok(ids.has(e.a)&&ids.has(e.b));
    assert.notEqual(e.a,e.b);
    assert.ok(linkedConceptIds(e.a).has(e.b));
    assert.ok(linkedConceptIds(e.b).has(e.a));
  }
  assert.ok(linkedConceptIds('relationship').has('claims'));
  assert.ok(!linkedConceptIds('relationship').has('burden'));
});

test('evidence-to-fact graph does not invent relationships and exposes uncovered facts',()=>{
  const evidenceIds=new Set(EVIDENCE.map(e=>e.id));
  const factIds=new Set(PROOF_FACTS.map(f=>f.id));
  assert.deepEqual(Object.keys(EVIDENCE_FACT_LINKS).sort(),[...evidenceIds].sort());
  const all=proofEdges([]);
  assert.ok(all.length>=4);
  assert.equal(new Set(all.map(e=>e.id)).size,all.length);
  for(const edge of all){
    assert.ok(evidenceIds.has(edge.evidenceId));
    assert.ok(factIds.has(edge.factId));
    assert.equal(edge.active,false);
  }
  assert.deepEqual(uncoveredFactIds([]).sort(),[...factIds].sort());
  assert.deepEqual(uncoveredFactIds(['contract']),['extension']);
  assert.deepEqual(uncoveredFactIds(['contract','messages']),[]);
  assert.equal(proofEdges(['transfer']).filter(e=>e.active).length,1);
  assert.deepEqual(uncoveredFactIds(['not-an-evidence-id']).sort(),[...factIds].sort());
});

test('risk quote highlight uses exact regex source offset, including leading whitespace',()=>{
  const input='  \n'+SAMPLE_CONTRACT+'\n';
  const findings=reviewContract(input);
  for(const finding of findings){
    const location=locateRisk(input,finding);
    if(!finding.quote){assert.equal(location,null);continue;}
    assert.ok(location,'missing location: '+finding.id);
    assert.equal(input.slice(location!.start,location!.end),finding.quote);
    assert.ok(location!.snippetStart<=location!.start);
    assert.ok(location!.snippetEnd>=location!.end);
  }
});

test('risk highlighter rejects changed text, stale offsets and whole-document no-quote finding',()=>{
  const text='甲方可随时无理由解除本合同。第2条 违约责任：乙方不承担任何责任。';
  const findings=reviewContract(text);
  const termination=findings.find(f=>f.id==='termination');
  assert.ok(termination);
  assert.ok(locateRisk(text,termination!));
  assert.equal(locateRisk('已修改：'+text,termination!),null);
  assert.equal(locateRisk(text,{...termination!,start:0,end:2}),null);
  const noQuote=reviewContract(SAMPLE_CONTRACT).find(f=>f.id==='disputes');
  assert.ok(noQuote);
  assert.equal(locateRisk(SAMPLE_CONTRACT,noQuote!),null);
});

test('identical quoted text at two locations highlights only the actual first regex match',()=>{
  const phrase='甲方可随时无理由解除本合同';
  const text='第一条 '+phrase+'；第二条 '+phrase+'。';
  const result=reviewContract(text).find(f=>f.id==='termination');
  assert.ok(result);
  assert.equal(result!.start,text.indexOf(phrase));
  assert.equal(locateRisk(text,result!)?.start,text.indexOf(phrase));
});
