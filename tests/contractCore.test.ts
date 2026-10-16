import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewContract, SAMPLE_CONTRACT } from '../src/lib/contractRules.ts';
import { flattenPdfTextPages, normalizeContractText } from '../src/lib/contractImport.ts';
import type { ContractImportResult } from '../src/lib/contractImport.ts';
import {
  currentReviewFindings,hasCurrentReview,initialContractWorkspace,selectReviewFinding,
  withEditedContract,withImportedContract,withReviewedContract,withSampleContract
} from '../src/lib/contracts/workspace.ts';

test('initial contract is an editable sample and all original six rule types remain intact',()=>{
  const initial=initialContractWorkspace();
  assert.equal(initial.source.origin,'sample');
  assert.equal(initial.source.text,SAMPLE_CONTRACT);
  assert.equal(initial.review,null);
  const reviewed=withReviewedContract(initial);
  const ids=currentReviewFindings(reviewed)?.map(x=>x.id)??[];
  assert.deepEqual(ids,reviewContract(SAMPLE_CONTRACT).map(x=>x.id));
  for(const id of ['termination','unilateral','payment','liability','acceptance','disputes']){
    assert.ok(ids.includes(id),id);
  }
  assert.equal(reviewed.review?.revisionId,reviewed.source.revisionId);
  assert.equal(hasCurrentReview(reviewed),true);
});

test('editing even one character invalidates all previous findings and discards source page mapping',()=>{
  const imported:ContractImportResult={
    name:'sample.pdf',format:'pdf',text:SAMPLE_CONTRACT,
    integrity:'complete',pages:2,warnings:[],
    pageSpans:[{page:1,start:0,end:15},{page:2,start:17,end:SAMPLE_CONTRACT.length}]
  };
  const first=withReviewedContract(withImportedContract(initialContractWorkspace(),imported));
  assert.ok(currentReviewFindings(first)?.length);
  assert.equal(first.source.pageSpans?.length,2);
  const unchanged=withEditedContract(first,first.source.text);
  assert.strictEqual(unchanged,first);
  const changed=withEditedContract(first,first.source.text+'，补充。');
  assert.notEqual(changed.source.revisionId,first.source.revisionId);
  assert.equal(changed.review,null);
  assert.equal(currentReviewFindings(changed),null);
  assert.equal(changed.selectedFindingId,null);
  assert.equal(changed.source.pageSpans,undefined);
  assert.equal(changed.source.pages,undefined);
  assert.equal(changed.source.integrity,'needs-review');
  assert.equal(changed.source.origin,'edited');
  const rerun=withReviewedContract(changed);
  assert.ok(hasCurrentReview(rerun));
  assert.equal(rerun.review?.revisionId,changed.source.revisionId);
});

test('new import always creates another revision and cannot reuse an earlier review',()=>{
  const sample:ContractImportResult={name:'test.txt',format:'txt',text:SAMPLE_CONTRACT,integrity:'complete',warnings:[]};
  const first=withReviewedContract(withImportedContract(initialContractWorkspace(),sample));
  const again=withImportedContract(first,sample);
  assert.notEqual(again.source.revisionId,first.source.revisionId);
  assert.equal(again.review,null);
  assert.equal(again.source.name,'test.txt');
  assert.equal(again.source.integrity,'complete');
  assert.equal(currentReviewFindings(again),null);
  const sampleBack=withSampleContract(first);
  assert.equal(sampleBack.review,null);
  assert.equal(sampleBack.source.name,undefined);
  assert.equal(sampleBack.source.text,SAMPLE_CONTRACT);
});

test('selecting a finding never permits unknown or stale review IDs',()=>{
  const start=initialContractWorkspace();
  assert.strictEqual(selectReviewFinding(start,'termination'),start);
  const reviewed=withReviewedContract(start);
  assert.strictEqual(selectReviewFinding(reviewed,'missing-rule'),reviewed);
  const selected=selectReviewFinding(reviewed,'termination');
  assert.equal(selected.selectedFindingId,'termination');
  const tampered={...selected,source:{...selected.source,revisionId:'different-document'}};
  assert.equal(hasCurrentReview(tampered),false);
  assert.equal(currentReviewFindings(tampered),null);
  assert.strictEqual(selectReviewFinding(tampered,'termination'),tampered);
});

test('partial document import is explicitly labeled needs-review even if risk engine finds no match',()=>{
  const partial:ContractImportResult={
    name:'partial.pdf',format:'pdf',text:'甲乙双方订立合同，条款请见附件。未提取附录完整内容。',
    integrity:'needs-review',pages:3,
    warnings:['第 2 页可能是扫描内容'],
    pageSpans:[{page:1,start:0,end:15},{page:3,start:17,end:27}]
  };
  const imported=withImportedContract(initialContractWorkspace(),partial);
  assert.equal(imported.source.integrity,'needs-review');
  assert.equal(imported.source.warnings.length,1);
  const reviewed=withReviewedContract(imported);
  assert.equal(reviewed.source.integrity,'needs-review');
  assert.equal(reviewed.review?.revisionId,reviewed.source.revisionId);
});

test('PDF source mapping always locates the exact canonical text on the real physical page',()=>{
  const pages=[
    normalizeContractText('第一条 双方签订合同。'),
    '',
    normalizeContractText('第三条 付款期限另行协商。')
  ];
  const {text,pageSpans}=flattenPdfTextPages(pages);
  assert.equal(text,pages[0]+'\n\n'+pages[2]);
  assert.deepEqual(pageSpans.map(p=>p.page),[1,3]);
  for(const p of pageSpans){
    assert.equal(text.slice(p.start,p.end),pages[p.page-1]);
    assert.ok(p.start>=0&&p.end<=text.length&&p.end>p.start);
  }
  const blank=flattenPdfTextPages(['', '', '甲方可随时解除合同。']);
  assert.equal(blank.text,'甲方可随时解除合同。');
  assert.deepEqual(blank.pageSpans,[{page:3,start:0,end:11}]);
});
