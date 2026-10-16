import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_ID,buildAnalysisPrompt,validateAnalysisRequest,verifyModelClaims,verifyModelClaimsDetailed,MAX_PAGES } from '../worker/grounding.ts';

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
test('Chinese PDF letter spacing is layout-normalized while quote remains anchored to the exact page',()=>{
  const source='根据《民法典》第 四 百 九 十 六 条， 提 示 义 务 的 履 行 应当兼顾合同类型及相对人理解能力。';
  const quoted='提示义务的履行应当兼顾合同类型及相对人理解能力';
  const claim={page:2,quote:quoted,claim:'提示义务的履行与合同类型和理解能力有关。',stance:'support',limitation:''};
  const checked=verifyModelClaimsDetailed({claims:[claim]},[{page:2,text:source}]);
  assert.equal(checked.claims.length,1);
  assert.equal(checked.claims[0].evidenceMatch,'layout');
  assert.equal(checked.diagnostics.layoutNormalized,1);
  assert.equal(checked.diagnostics.accepted,1);
  assert.ok(source.includes(checked.claims[0].quote));
  assert.equal(verifyModelClaimsDetailed({claims:[{...claim,page:3}]},[{page:2,text:source}]).diagnostics.pageMissing,1);
  assert.equal(verifyModelClaimsDetailed({claims:[{...claim,quote:quoted+'并保护消费者'}]},[{page:2,text:source}]).diagnostics.quoteNotFound,1);
});
test('empty candidates and rejected evidence are separately reported with counts only',()=>{
  const noCandidates=verifyModelClaimsDetailed({claims:[]},data.passages);
  assert.equal(noCandidates.diagnostics.candidates,0);
  const hallucinated={page:4,claim:'提示义务的认定应兼顾磋商方式与理解能力。',quote:'这段话根本不存在于所提供的原文里面。',stance:'support',limitation:''};
  const rejected=verifyModelClaimsDetailed({claims:[hallucinated]},data.passages);
  assert.equal(rejected.diagnostics.candidates,1);
  assert.equal(rejected.diagnostics.accepted,0);
  assert.equal(rejected.diagnostics.quoteNotFound,1);
});
test('prompt treats PDF content as untrusted data and includes page labels',()=>{
  const prompt=buildAnalysisPrompt(data);
  assert.ok(prompt.includes('[PAGE 4]'));
  assert.ok(prompt.includes('不可信数据'));
  assert.ok(prompt.includes(data.question));
});

import { MAX_REQUEST_BYTES,MAX_TOTAL_CHARS,MAX_PAGE_CHARS,RequestError,readModelPayload } from '../worker/grounding.ts';
import worker from '../worker/index.ts';

const goodClaims={claims:[{page:4,claim:'提示义务的认定应兼顾合同磋商方式与相对人理解能力。',
  quote:'提示义务的履行标准应当结合信息呈现方式以及相对人的合理理解程度加以判断',stance:'support',limitation:''}]};
const TOKEN='t'.repeat(32);
function makeEnv({ai=async()=>({response:goodClaims}),allow=true,limiters=true}:{ai?:()=>Promise<unknown>;allow?:boolean;limiters?:boolean}={}){
  const limiter={limit:async()=>({success:allow})};
  return {AI:{run:ai},ASSETS:{fetch:async()=>new Response('asset')},LAWLAB_AI_ACCESS_TOKEN:TOKEN,
    ...(limiters?{AI_IP_LIMITER:limiter,AI_GLOBAL_LIMITER:limiter}:{})};
}
function post(body:unknown,env:ReturnType<typeof makeEnv>){
  return worker.fetch(new Request('https://lawlab.test/api/ai/analyze',{method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+TOKEN},body:JSON.stringify(body)}),env as never);
}

test('a full-size Chinese submission fits the byte budget and is accepted',async()=>{
  const pages=Math.ceil(MAX_TOTAL_CHARS/2000);
  const body={question:'问'.repeat(600),passages:Array.from({length:pages},(_,i)=>({page:i+1,text:'法'.repeat(Math.min(2000,MAX_PAGE_CHARS))}))};
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).length<=MAX_REQUEST_BYTES);
  const response=await post(body,makeEnv());
  assert.equal(response.status,200);
  const result=await response.json() as {diagnostics:{candidates:number;accepted:number}};
  assert.equal(result.diagnostics.candidates,1);
  assert.equal(result.diagnostics.accepted,0);
});
test('model output is read from chat-completion, reasoning and fenced shapes; garbage is reported, not hidden',()=>{
  const text=JSON.stringify(goodClaims);
  for(const shape of [goodClaims,text,{response:goodClaims},{response:text},
    {choices:[{message:{role:'assistant',content:text}}]},
    {response:'<think>先阅读页面</think>\n'+text},{response:'```json\n'+text+'\n```'},{response:'结果如下：'+text}]){
    assert.equal(verifyModelClaims(shape,data.passages).length,1,JSON.stringify(shape).slice(0,60));
  }
  assert.equal(readModelPayload({response:'无法完成'}),null);
  assert.equal(readModelPayload({choices:[]}),null);
  assert.deepEqual(readModelPayload({claims:[]}),{claims:[]});
});
test('request problems are RequestError (400); upstream failures are generic 502 without their text',async()=>{
  assert.throws(()=>validateAnalysisRequest({}),RequestError);
  const bad=await post({question:'x',passages:[]},makeEnv());
  assert.equal(bad.status,400);
  const upstream=await post(data,makeEnv({ai:async()=>{throw new Error('AiError: 5006: Invalid JSON schema (internal-id 8f2c)');}}));
  assert.equal(upstream.status,502);
  assert.ok(!(await upstream.text()).includes('internal-id'));
  const unreadable=await post(data,makeEnv({ai:async()=>({response:'抱歉'})}));
  assert.equal(unreadable.status,502);
});
test('model calls are rate limited, and AI stays off without the limiter bindings',async()=>{
  let calls=0;
  const limited=await post(data,makeEnv({allow:false,ai:async()=>{calls++;return {response:goodClaims};}}));
  assert.equal(limited.status,429);
  assert.equal(calls,0);
  assert.equal((await post(data,makeEnv({limiters:false}))).status,503);
  const status=await worker.fetch(new Request('https://lawlab.test/api/ai/status'),makeEnv({limiters:false}) as never);
  assert.equal((await status.json() as {configured:boolean}).configured,false);
});
