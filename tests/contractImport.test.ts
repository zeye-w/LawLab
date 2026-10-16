import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {File as NodeFile} from 'node:buffer';
import {fileURLToPath} from 'node:url';
import {reviewContract} from '../src/lib/contractRules.ts';
import {
  contractFormat,validContractHeader,normalizeContractText,validatedContractText,
  inspectDocxZip,importContractFile,MAX_CONTRACT_FILE_BYTES,MAX_CONTRACT_TEXT_CHARS
} from '../src/lib/contractImport.ts';
import readLegacyWord from '../src/lib/vendor/docToText.js';

const docxB64='UEsDBBQAAAAIABpIUF3mdcR+0gAAAIsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QvVLDMAzHX8XnlasVGBh6SToAKzD0BXSOkvjw11luad++Sls6cIVR+n/8ZLebQ/BqT4Vdip1+NI3e9O32mImVKJE7Pdea1wBsZwrIJmWKooypBKwylgky2i+cCJ6a5hlsipViXdWlQ/ftK42481W9HWR9oRTyrNXLxbiwOo05e2exig77OPyirK4EI8mzh2eX+UEMGu4SFuVvwDX3Ic8ubiD1iaW+YxAXfKcywJDsLkjS/F9z5840js7SLb+05ZIsMbs4BW9uSkAXf+6H83f3J1BLAwQUAAAACAAaSFBdXzOVUpUAAAAHAQAACwAAAF9yZWxzLy5yZWxzjc87DsIwDAbgq0Q+QJ0yMKCmXVi6Ii4QJW5T0TzkhNftycBAEQOjf//6LHfDw6/iRpyXGBS0jYSh70606lKD7JaURW2ErMCVkg6I2TjyOjcxUaibKbLXpY48Y9LmomfCnZR75E8DtqYYrQIebQvi/Ez0jx2naTF0jObqKZQfJ74aVdY8U1Fwj2zRvuOmsoB9h5sX+xdQSwMEFAAAAAgAGkhQXZ3kwDQOAQAAagEAABEAAAB3b3JkL2RvY3VtZW50LnhtbLOxr8jNUShLLSrOzM+zVTLUM1Cyt7Mpt0rJTy7NTc0rUQBK5xVbldsqZZSUFFjp6xcnZ6TmJhbr5Rek5gHl0vKLchNLgNyidP3y/KKUgqL85NTi4sy89NwcfSMDAzP93MTMPCWQkUn5KZUgugBEFIGIErunEzqeTuh5um7hs/lLn23tfrF+6rNp7c8WLn7c0GSjD1IAIovAZAG63udTNj2btvNp//qXs/qfTd/2bPqC5xPank/Z+GL54pczlzybswZiODFGPdk5E2jUs879z7pbn8/e8XTXlBdbFj/Zvfv9np6nrduf7J38ZPeMZ2v2PZu+9Nmc+U/7l71Y2PO0t//p1DbshuvDPKuPCEg7AFBLAQIUAxQAAAAIABpIUF3mdcR+0gAAAIsBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAGkhQXV8zlVKVAAAABwEAAAsAAAAAAAAAAAAAAIABAwEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAGkhQXZ3kwDQOAQAAagEAABEAAAAAAAAAAAAAAIABwQEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAP4CAAAAAA==';
const sampleDocx=Buffer.from(docxB64,'base64');
const fixture=readFileSync(fileURLToPath(new URL('./fixtures/legacy-word-sample.base64',import.meta.url)),'utf-8').split('\n').filter(s=>!s.startsWith('#')).join('').trim();
const legacyDoc=Buffer.from(fixture,'base64');
function browserFile(contents:Uint8Array|string,name:string):File {
  return new NodeFile([contents],name) as unknown as File;
}
test('recognized formats include doc, docx, pdf and txt with no extension spoofing',()=>{
  for(const ext of ['doc','docx','pdf','txt'] as const)assert.equal(contractFormat('test.'+ext),ext);
  assert.equal(contractFormat('A.DOC'),'doc');
  assert.throws(()=>contractFormat('malware.exe'));
  assert.ok(validContractHeader('doc',legacyDoc.subarray(0,8)));
  assert.ok(validContractHeader('docx',sampleDocx.subarray(0,8)));
  assert.ok(validContractHeader('pdf',Buffer.from('%PDF-1.7\n')));
  assert.ok(!validContractHeader('pdf',legacyDoc));
  assert.ok(!validContractHeader('doc',sampleDocx));
  assert.equal(MAX_CONTRACT_FILE_BYTES,8*1024*1024);
});
test('normalize PDF CJK text runs for existing contract rule engine without inventing clauses',()=>{
  const value=normalizeContractText('甲 方 可 随 时 无 理 由 解 除 本 合 同。\r\n\n付款时间另行协商。\u0000');
  assert.ok(value.includes('甲方可随时无理由解除本合同'));
  assert.ok(reviewContract(value).some(f=>f.id==='termination'));
  assert.throws(()=>validatedContractText('   '));
  assert.throws(()=>validatedContractText('合'.repeat(MAX_CONTRACT_TEXT_CHARS+1)));
});
test('complete Chinese UTF-8 text files can enter the existing review flow',async()=>{
  const sample='甲方可随时无理由解除本合同。双方应当依照合同约定履行付款及交付义务。';
  const imported=await importContractFile(browserFile(sample,'sample.txt'));
  assert.equal(imported.format,'txt');
  assert.ok(imported.text.includes('甲方可随时'));
  assert.ok(reviewContract(imported.text).some(f=>f.id==='termination'));
  await assert.rejects(importContractFile(browserFile('not a PDF content','bad.pdf')),/扩展名/);
  await assert.rejects(importContractFile(browserFile('\0\0not utf8','bad.doc')),/扩展名/);
});
test('true Word 97-2003 OLE2 document is read locally, malformed or encrypted data is rejected',async()=>{
  assert.ok(legacyDoc.length>1024);
  const content=readLegacyWord(legacyDoc);
  assert.ok(content&&content.length>100);
  const imported=await importContractFile(browserFile(legacyDoc,'legacy.doc'));
  assert.equal(imported.format,'doc');
  assert.ok(imported.text.length>100);
  assert.ok(imported.warnings.some(s=>s.includes('主要正文')));
  assert.equal(readLegacyWord(Buffer.from('not a word file')),null);
});
test('DOCX ZIP metadata is checked before decompression and oversized entry is rejected',()=>{
  assert.doesNotThrow(()=>inspectDocxZip(sampleDocx));
  const bad=Uint8Array.from(sampleDocx);
  const view=new DataView(bad.buffer);
  let at=-1;
  for(let i=0;i<bad.length-4;i++)if(view.getUint32(i,true)===0x02014b50){at=i;break;}
  assert.ok(at>0);
  view.setUint32(at+24,50*1024*1024,true);
  assert.throws(()=>inspectDocxZip(bad),/安全限制/);
  assert.throws(()=>inspectDocxZip(Uint8Array.from([80,75,3,4])),/结构/);
});
