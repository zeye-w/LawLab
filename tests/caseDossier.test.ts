import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTeachingCase, LEGAL_CONTENT_V1 } from '../src/content/registry.ts';
import { EQUIPMENT_CASE_KEY } from '../src/content/seedEquipmentCase.ts';
import { EVIDENCE } from '../src/data/cases.ts';
import { INITIAL_EVENTS, LEGACY_SEED_EVENTS, migrateSeedEvents } from '../src/lib/timeline.ts';
import { EVIDENCE_FACT_LINKS,PROOF_FACTS } from '../src/content/seedCaseFacts.ts';
import { assertValidContent, validateContent } from '../src/content/validate.ts';

const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const copied=()=>structuredClone(LEGAL_CONTENT_V1);

test('one fictional case dossier owns all documents, parties, evidence and timeline events',()=>{
  const c=getTeachingCase();
  assert.equal(c.id,EQUIPMENT_CASE_KEY);
  assert.equal(c.nature,'fictional');
  assert.equal(c.editorial.status,'pending');
  assert.equal(c.documents.length,7);
  assert.equal(c.positions.length,2);
  assert.equal(c.events.length,6);
  assert.equal(c.evidence.length,4);
  assert.equal(c.facts.length,4);
  assert.equal(c.issues.length,1);
  assert.strictEqual(assertValidContent(LEGAL_CONTENT_V1),LEGAL_CONTENT_V1);
  assert.deepEqual(validateContent(LEGAL_CONTENT_V1),[]);
  assert.ok(c.evidence.every(e=>e.authenticity==='unverified'));
  assert.ok(c.facts.every(f=>f.assessment==='unassessed'));
  assert.ok(c.links.every(l=>l.review==='pending'&&l.relation==='candidate-support'));
  assert.ok(c.documents.every(d=>d.excerpt.length>12&&d.context.length>12));
  assert.ok(c.positions.every(p=>p.disputedFactIds.length>0));
  assert.ok(c.documents.some(d=>d.context.includes('否认') && d.excerpt.includes('下周')));
});

test('existing evidence cards and default timeline have matching canonical legacy IDs and values',()=>{
  const c=getTeachingCase();
  assert.deepEqual(EVIDENCE.map(x=>x.id),c.evidence.map(x=>x.legacyId));
  assert.deepEqual(EVIDENCE.map(x=>x.title),c.evidence.map(x=>x.title));
  assert.deepEqual(EVIDENCE.map(x=>x.caveat),c.evidence.map(x=>x.verificationNotes));
  assert.deepEqual(INITIAL_EVENTS.map(x=>x.id),c.events.map(x=>x.legacyId));
  assert.deepEqual(INITIAL_EVENTS.map(x=>x.title),c.events.map(x=>x.title));
  assert.deepEqual(INITIAL_EVENTS.map(x=>x.date),c.events.map(x=>x.date));
  assert.deepEqual(INITIAL_EVENTS.map(x=>x.evidence),c.events.map(x=>x.legacyEvidenceDescription));
  assert.deepEqual(Object.keys(EVIDENCE_FACT_LINKS).sort(),EVIDENCE.map(x=>x.id).sort());
  assert.equal(PROOF_FACTS.length,c.facts.length);
  const registry=read('src/content/registry.ts');
  assert.doesNotMatch(registry,/from '\.\.\/data\/cases\.ts'/);
  assert.doesNotMatch(registry,/from '\.\.\/lib\/timeline\.ts'/);
  assert.match(read('src/data/cases.ts'),/getTeachingCase\(\)\.evidence\.map/);
  assert.match(read('src/lib/timeline.ts'),/getTeachingCase\(\)\.events\.map/);
});

test('fictional documents and events reference real case-local evidence and event IDs',()=>{
  const c=getTeachingCase();
  const evidence=new Set(c.evidence.map(e=>e.id));
  const events=new Set(c.events.map(e=>e.id));
  const facts=new Set(c.facts.map(f=>f.id));
  for(const document of c.documents){
    for(const id of document.evidenceIds)assert.ok(evidence.has(id),document.title+' unknown evidence');
    for(const id of document.eventIds)assert.ok(events.has(id),document.title+' unknown event');
  }
  for(const event of c.events)for(const id of event.evidenceIds)assert.ok(evidence.has(id));
  for(const position of c.positions)for(const id of position.disputedFactIds)assert.ok(facts.has(id));
  assert.ok(c.documents.some(d=>d.evidenceIds.length && d.eventIds.length));
  assert.ok(c.events.some(e=>e.evidenceIds.length));
});

test('rejects altered dossier with dangling references, duplicate identities or unknown parties',()=>{
  const missingEvidence=copied();
  missingEvidence.cases[0].documents[0].evidenceIds.push('case:fake:evidence');
  assert.ok(validateContent(missingEvidence).some(d=>d.code==='DANGLING_EVIDENCE'));
  const missingEvent=copied();
  missingEvent.cases[0].documents[0].eventIds.push('case:fake:event');
  assert.ok(validateContent(missingEvent).some(d=>d.code==='DANGLING_EVENT'));
  const fakeParty=copied();
  fakeParty.cases[0].positions[0].party='虚构的第三方';
  assert.ok(validateContent(fakeParty).some(d=>d.code==='UNKNOWN_PARTY'));
  const badFact=copied();
  badFact.cases[0].positions[0].disputedFactIds.push('nonexistent');
  assert.ok(validateContent(badFact).some(d=>d.code==='DANGLING_FACT'));
  const badDate=copied();
  badDate.cases[0].documents[0].date='2025-02-31';
  assert.ok(validateContent(badDate).some(d=>d.code==='DATE'));
  const dup=copied();
  dup.cases[0].documents[1].id=dup.cases[0].documents[0].id;
  assert.ok(validateContent(dup).some(d=>d.code==='DUPLICATE_ID'));
  const noContext=copied();
  noContext.cases[0].documents[0].context='';
  assert.ok(validateContent(noContext).some(d=>d.code==='REQUIRED'));
});

test('case library and four case workspaces share the same dossier without overriding local timeline progress',()=>{
  const app=read('src/App.tsx'),dossier=read('src/components/CaseDossier.tsx');
  assert.match(app,/casebook/);
  assert.match(app,/<CaseDossier\/>/);
  assert.equal((app.match(/<CaseDossier compact\/>/g)||[]).length,4);
  assert.match(app,/<Court\/>/);
  assert.match(app,/<Reasoning\/>/);
  assert.match(app,/<EvidenceLab\/>/);
  assert.match(app,/<Timeline\/>/);
  assert.match(app,/useBrowserState<TimelineEvent\[]>\('lawlab.timeline.v1',INITIAL_EVENTS,migrateSeedEvents\)/);
  assert.match(dossier,/getTeachingCase\(\)/);
  assert.match(dossier,/<details key=\{doc\.id\}/);
  assert.match(dossier,/aria-label="同一案件跨模块分析"/);
  assert.match(dossier,/全部当事人、文书、日期、数字和诉讼过程均为虚构/);
});

test('untouched legacy seed timeline events adopt canonical wording; learner edits are kept',()=>{
  const edited={...LEGACY_SEED_EVENTS[1],detail:'我改过的说明'};
  const custom={id:'u1',date:'2025-06-01',title:'自建节点',type:'事实' as const,detail:'',evidence:'',custom:true};
  const saved=[{...LEGACY_SEED_EVENTS[0]},edited,{...LEGACY_SEED_EVENTS[2]},custom];
  const migrated=migrateSeedEvents(saved);
  assert.deepEqual(migrated[0],INITIAL_EVENTS.find(e=>e.id==='f1'));
  assert.deepEqual(migrated[1],edited,'edited seed event must stay as saved');
  assert.deepEqual(migrated[2],INITIAL_EVENTS.find(e=>e.id==='f3'));
  assert.deepEqual(migrated[3],custom);
  assert.equal(migrated.length,saved.length,'deleted seed events are not re-added');
  assert.deepEqual(migrateSeedEvents(INITIAL_EVENTS),INITIAL_EVENTS,'already-current data is unchanged');
  assert.deepEqual(LEGACY_SEED_EVENTS.map(e=>e.id),INITIAL_EVENTS.map(e=>e.id));
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(app,/useBrowserState<TimelineEvent\[\]>\('lawlab\.timeline\.v1',INITIAL_EVENTS,migrateSeedEvents\)/);
});

test('proof graph uses compact evidence labels that fit their node box',()=>{
  for(const e of EVIDENCE){
    assert.ok(e.shortTitle.length<=8,e.shortTitle);
    assert.ok(e.title.startsWith(e.shortTitle.slice(0,2)),'short label stays recognisable: '+e.shortTitle);
  }
  const graph=readFileSync(new URL('../src/components/EvidenceProofGraph.tsx',import.meta.url),'utf8');
  assert.match(graph,/\{e\.shortTitle\}<\/text>/);
  assert.match(graph,/<title>\{e\.title\}/,'full title kept in the tooltip');
});

test('case library navigation is exclusive to practice and absent from student tools',()=>{
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  const navBlock=(label:string)=>{
    const index=app.indexOf(`aria-label="${label}"`);
    assert.ok(index>=0,label+' nav must exist');
    const rest=app.slice(index);
    return rest.slice(0,rest.indexOf('</nav>'));
  };
  assert.doesNotMatch(navBlock('学生版导航'),/navItem\('casebook','案例资料库'/);
  assert.match(navBlock('专业版导航'),/navItem\('casebook','案例资料库'/);
  const studentTools=app.match(/learn:\[([^\]]+)\]/)?.[1]??'';
  const litigationTools=app.match(/litigation:\[([^\]]+)\]/)?.[1]??'';
  assert.doesNotMatch(studentTools,/'casebook'/);
  assert.match(litigationTools,/'casebook'/);
});
