import test from 'node:test';
import assert from 'node:assert/strict';
import { crossrefSearchUrl,parseCrossrefResponse,citationForHit,summarizeResearch,makeWritingGuide } from '../src/lib/research.ts';
import { createPaper,exportPaperBackup,parsePaperBackup,paperToMarkdown } from '../src/lib/paper.ts';

test('Crossref query is safely URL encoded and empty queries are rejected',()=>{
  const u=new URL(crossrefSearchUrl('  contract & obligations   '));
  assert.equal(u.origin,'https://api.crossref.org');
  assert.equal(u.searchParams.get('query.bibliographic'),'contract & obligations');
  assert.equal(u.searchParams.get('rows'),'12');
  assert.throws(()=>crossrefSearchUrl('  '));
});
test('Crossref results are parsed from actual metadata, with canonical DOI links and no invented content',()=>{
  const payload={message:{items:[
    {DOI:'10.1000/Test.1',title:['Test Article'],author:[{given:'Ada',family:'Chen'}],
      published:{'date-parts':[[2024,1]]},'container-title':['Legal Journal'],abstract:'<jats:p>Example &amp; findings</jats:p>'},
    {DOI:'10.1000/Test.1',title:['Duplicate']},
    {title:['No DOI']},{DOI:'bad DOI',title:['Wrong']}]}};
  const hits=parseCrossrefResponse(payload);
  assert.equal(hits.length,1);
  assert.equal(hits[0].doi,'10.1000/test.1');
  assert.equal(hits[0].url,'https://doi.org/10.1000/test.1');
  assert.ok(hits[0].abstract.includes('Example & findings'));
  assert.ok(citationForHit(hits[0]).includes('Legal Journal'));
  assert.throws(()=>parseCrossrefResponse({message:{}}));
});
test('argument synthesis is explicitly grounded in researcher-entered positions',()=>{
  const p=createPaper();
  p.question='争点';p.argument='个人观点';
  p.references=[
    {id:'a',type:'期刊论文',citation:'Study A',locator:'https://doi.org/10.1/a',note:'',verified:true,
      research:{stance:'support',claim:'A supports a narrow reading',evidence:'p. 12',limitation:'certain contexts'}},
    {id:'b',type:'期刊论文',citation:'Study B',locator:'https://doi.org/10.1/b',note:'',verified:false,
      research:{stance:'challenge',claim:'B challenges the rule',evidence:'',limitation:''}}
  ];
  const result=summarizeResearch(p);
  assert.equal(result.total,2);
  assert.equal(result.groups.find(g=>g.stance==='challenge')?.items.length,1);
  assert.ok(result.gaps.some(g=>g.includes('未核验')));
  assert.ok(result.gaps.some(g=>g.includes('论证依据')));
  const guide=makeWritingGuide(p,p.sections[2]);
  assert.ok(guide.includes('A supports a narrow reading'));
  assert.ok(guide.includes('B challenges the rule'));
  assert.ok(guide.includes('待核验'));
  assert.ok(!guide.includes('学术共识已经达成'));
});
test('version-1 paper backups preserve optional research notes and still accept previous backups',()=>{
  const p=createPaper();
  p.references=[{id:'a',type:'期刊论文',citation:'Example',locator:'DOI',note:'',verified:false,
    research:{stance:'background',claim:'User reading note',evidence:'p.5',limitation:'context'}}];
  assert.deepEqual(parsePaperBackup(exportPaperBackup(p)),p);
  assert.ok(paperToMarkdown(p).includes('作者整理的观点：User reading note'));
  assert.throws(()=>parsePaperBackup(JSON.stringify({format:'lawlab-paper-backup',version:1,paper:{
    ...p,references:[{...p.references[0],research:{stance:'bad',claim:'x',evidence:'',limitation:''}}]
  }})));
  const legacy=createPaper();
  legacy.references=[{id:'legacy',type:'期刊论文',citation:'Legacy',locator:'',note:'',verified:false}];
  assert.deepEqual(parsePaperBackup(exportPaperBackup(legacy)),legacy);
});
