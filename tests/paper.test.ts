import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaper,checkPaper,countPaperCharacters,paperToMarkdown,
  exportPaperBackup,parsePaperBackup,PAPER_MODES
} from '../src/lib/paper.ts';

test('three legal writing templates contain a substantive chapter outline',()=>{
  for(const mode of PAPER_MODES) {
    const p=createPaper(mode);
    assert.equal(p.mode,mode);
    assert.equal(p.sections.length,5);
    assert.ok(p.sections.every(s=>s.heading&&s.body===''));
    assert.equal(p.references.length,0);
  }
});
test('draft progress is based only on user-supplied content and confirmed sources',()=>{
  const p=createPaper();
  assert.ok(checkPaper(p).every(item=>!item.ok));
  p.title='示例论文';p.question='研究问题';p.argument='待论证观点';
  p.sections[0].body='测试 文本';
  assert.equal(countPaperCharacters(p),4);
  p.references.push({id:'r1',type:'裁判文书',citation:'用户填写的裁判文书',locator:'（2026）测试号',note:'自行核验',verified:false});
  const list=checkPaper(p);
  assert.equal(list.filter(x=>x.ok).length,4);
  assert.equal(list[list.length-1].ok,false);
});
test('Markdown export preserves author writing and flags unverified references',()=>{
  const p=createPaper();
  p.title='测试论文';p.sections[0].body='论证内容';
  p.references.push({id:'r1',type:'期刊论文',citation:'占位资料',locator:'测试出处',note:'测试阅读记录',verified:false});
  const output=paperToMarkdown(p);
  assert.ok(output.includes('# 测试论文'));
  assert.ok(output.includes('论证内容'));
  assert.ok(output.includes('（待核验）'));
  assert.ok(output.includes('请在正式提交前逐条核实'));
});
test('JSON backup roundtrip and rejects malformed or unsupported files',()=>{
  const p=createPaper('案例评析');
  p.title='原告与被告';p.sections[0].body='一份用户自己写的草稿';
  const backup=exportPaperBackup(p);
  assert.deepEqual(parsePaperBackup(backup),p);
  assert.throws(()=>parsePaperBackup('{'));
  assert.throws(()=>parsePaperBackup('{"format":"unknown"}'));
  assert.throws(()=>parsePaperBackup(JSON.stringify({format:'lawlab-paper-backup',version:1,paper:{...p,sections:[...p.sections,{...p.sections[0]}]}})),/重复/);
});
