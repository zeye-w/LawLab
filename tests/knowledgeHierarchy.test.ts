import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { knowledgeEdges, linkedConceptIds } from '../src/lib/relationshipMaps.ts';
import { LEGAL_CONTENT_V1, getConcept, getConceptChildren, knowledgeBranchNodes, getConceptSources } from '../src/content/registry.ts';
import { validateContent } from '../src/content/validate.ts';
import { buildConceptScene, fitCamera, project3D } from '../src/lib/concept3d.ts';
const ui=readFileSync(new URL('../src/components/StudyTools.tsx',import.meta.url),'utf8');
const map2d=readFileSync(new URL('../src/components/KnowledgeNetwork.tsx',import.meta.url),'utf8');
const map3d=readFileSync(new URL('../src/components/KnowledgeNetwork3D.tsx',import.meta.url),'utf8');

test('P1 hierarchy has nine legacy roots and eleven uniquely identified pending children',()=>{
  assert.equal(KNOWLEDGE_NODES.length,9);
  assert.equal(LEGAL_CONTENT_V1.concepts.length,20);
  const roots=LEGAL_CONTENT_V1.concepts.filter(n=>!n.parentId);
  const children=LEGAL_CONTENT_V1.concepts.filter(n=>n.parentId);
  assert.equal(roots.length,9);
  assert.equal(children.length,11);
  assert.equal(new Set(LEGAL_CONTENT_V1.concepts.map(n=>n.id)).size,20);
  assert.ok(children.every(n=>n.editorial.status==='pending' && n.jurisdiction==='CN'));
  assert.deepEqual(validateContent(LEGAL_CONTENT_V1),[]);
  assert.equal(getConceptChildren('contract').length,5);
  assert.equal(getConceptChildren('evidence').length,4);
  assert.equal(getConceptChildren('claims').length,2);
  assert.deepEqual(getConceptChildren('concept:cn:contract').map(n=>n.id),
    getConceptChildren('contract').map(n=>n.id));
  assert.equal(getConceptChildren('relationship').length,0);
  assert.equal(getConceptChildren('unknown').length,0);
});

test('scoped graph yields only parent and its linked children, not all twenty nodes',()=>{
  const overview=KNOWLEDGE_NODES;
  assert.equal(overview.length,9);
  const branch=knowledgeBranchNodes('contract');
  assert.equal(branch.length,6);
  assert.equal(branch[0].id,'contract');
  assert.deepEqual(branch[0].related,branch.slice(1).map(n=>n.id));
  for(const child of branch.slice(1)){
    assert.deepEqual(child.related,['contract']);
    assert.equal(getConcept(child.id)?.parentId,'concept:cn:contract');
  }
  assert.equal(knowledgeEdges(branch).length,5);
  assert.deepEqual([...linkedConceptIds('contract',branch)].sort(),branch.map(n=>n.id).sort());
  assert.equal(knowledgeEdges().length>=12,true);
  assert.deepEqual(knowledgeBranchNodes('unknown'),[]);
});

test('3D projection accepts a subgraph with intact IDs, finite depths and working bounds',()=>{
  const branch=knowledgeBranchNodes('evidence');
  const positioned=buildConceptScene(branch,knowledgeEdges(branch));
  assert.equal(positioned.length,5);
  assert.equal(new Set(positioned.map(p=>p.id)).size,positioned.length);
  const camera=fitCamera(positioned,600,440,{x:46,top:34,bottom:66});
  for(const concept of positioned){
    const p=project3D(concept,camera,600,440);
    assert.ok(p.visible && Number.isFinite(p.x) && Number.isFinite(p.y) && p.scale>0,concept.id);
  }
});

test('do not upgrade educational descriptions or candidate authorities to verified automatically',()=>{
  const child=getConcept('contract-breach')!;
  assert.equal(child.id,'concept:cn:contract-breach');
  assert.equal(child.editorial.status,'pending');
  assert.ok(getConceptSources(child.id).every(s=>s.editorial.status==='pending'&&s.validity==='unknown'));
  const unknown=getConcept('contract-formation')!;
  assert.deepEqual(getConceptSources(unknown.id),[]);
});

test('integrity validator rejects orphan parents, deeper nesting and conflicting legal categories',()=>{
  const orphan=structuredClone(LEGAL_CONTENT_V1);
  orphan.concepts.find(n=>n.legacyId==='contract-breach')!.parentId='concept:cn:never-existed';
  assert.ok(validateContent(orphan).some(e=>e.code==='DANGLING_PARENT'));
  const nested=structuredClone(LEGAL_CONTENT_V1);
  nested.concepts.find(n=>n.legacyId==='contract-breach')!.parentId='concept:cn:contract-formation';
  assert.ok(validateContent(nested).some(e=>e.code==='HIERARCHY_DEPTH'));
  const mismatch=structuredClone(LEGAL_CONTENT_V1);
  mismatch.concepts.find(n=>n.legacyId==='contract-breach')!.category='证据法';
  assert.ok(validateContent(mismatch).some(e=>e.code==='PARENT_CATEGORY'));
});

test('both renderers receive the exact same branch data and preserve keyboard alternatives',()=>{
  assert.match(ui,/knowledgeBranchNodes\(branch\)/);
  assert.match(ui,/onClick=\{leaveBranch\}/);
  assert.match(ui,/onClick=\{\(\)=>enterBranch\(current\.id\)\}/);
  assert.match(ui,/<KnowledgeNetwork3D selected=\{selected\} onSelect=\{setSelected\} concepts=\{concepts\}/);
  assert.match(ui,/<KnowledgeNetwork selected=\{selected\} onSelect=\{setSelected\} concepts=\{concepts\}/);
  assert.match(map2d,/concepts\.map\(node => <button/);
  assert.match(map3d,/concepts\.map\(node=><button/);
  assert.match(map2d,/aria-pressed=\{node\.id === selected\}/);
  assert.match(map3d,/aria-pressed=\{node.id===selected\}/);
});
