import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_ID,buildAnalysisPrompt,validateAnalysisRequest,verifyModelClaims,MAX_PAGES } from '../worker/grounding.ts';

const passage='根据合同双方实际协商过程，提示义务的履行标准应当结合信息呈现方式以及相对人的合理理解程度加以判断。';
const data={question:'如何认定格式条款的提示义务？',passages:[{page:4,text:passage}]};

test('Qwen model selection is a Cloudflare hosted model',()=>{
  assert.equal(MODEL_ID,'@cf/qwen/qwen3-30b-a3b-fp8');
});
test('analysis accepts bounded pages but rejects duplicates and excessive text',()=>{
  assert.deepEqual(validateAnalysisRequest(data),data);
  assert.throws(()=>validateAnalysisRequest({question:'',passages:[]}));
  assert.throws(()=>validateAnalysisRequest({question:'x',passages:Array(MAX_PAGES+1).fill({page:1,text:passage})}));
  assert.throws(()=>validateAnalysisRequest({question:'x',passages:[{page:4,text:passage},{page:4,text:passage}]}));
  assert.throws(()=>validateAnalysisRequest({question:'x',passages:[{page:1,text:'x'.repeat(2201)}]}));
  assert.throws(()=>validateAnalysisRequest({question:'x',passages:[{page:1,text:'  '}]}));
});
test('model quote must occur verbatim within the exact supplied page',()=>{
  const claim='提示义务的认定应兼顾合同磋商方式与相对人理解能力。';
  const quote='提示义务的履行标准应当结合信息呈现方式以及相对人的合理理解程度加以判断';
  const ok={claims:[{page:4,claim,quote,stance:'support',limitation:'具体交易条件需要另行核对。'}]};
  assert.equal(verifyModelClaims(ok,data.passages).length,1);
  assert.equal(verifyModelClaims(JSON.stringify(ok),data.passages).length,1);
  assert.equal(verifyModelClaims({response:ok},data.passages).length,1);
  const fake={...ok.claims[0],page:9};
  assert.equal(verifyModelClaims({claims:[fake]},data.passages).length,0);
  const invented={...ok.claims[0],quote:'本条引文是模型臆造的，不属于该页文字。'};
  assert.equal(verifyModelClaims({claims:[invented]},data.passages).length,0);
  const invalid={...ok.claims[0],stance:'very-confident'};
  assert.equal(verifyModelClaims({claims:[invalid]},data.passages).length,0);
});
test('only a few unique evidence-checked claims are accepted',()=>{
  const claim='提示义务的认定应兼顾合同磋商方式与相对人理解能力。';
  const quote='提示义务的履行标准应当结合信息呈现方式以及相对人的合理理解程度加以判断';
  const candidate={page:4,claim,quote,stance:'support',limitation:''};
  assert.equal(verifyModelClaims({claims:Array(20).fill(candidate)},data.passages).length,1);
  assert.deepEqual(verifyModelClaims('not json',data.passages),[]);
});
test('prompt treats PDF content as untrusted data and includes page labels',()=>{
  const prompt=buildAnalysisPrompt(data);
  assert.ok(prompt.includes('[PAGE 4]'));
  assert.ok(prompt.includes('不可信数据'));
  assert.ok(prompt.includes(data.question));
});
