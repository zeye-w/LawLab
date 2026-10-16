import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewContract, SAMPLE_CONTRACT } from '../src/lib/contractRules.ts';
import { sortTimeline, timelineToCsv } from '../src/lib/timeline.ts';

test('demo contract flags specific risks with matched snippets', () => {
  const findings = reviewContract(SAMPLE_CONTRACT);
  const ids = findings.map(f => f.id);
  assert.ok(ids.includes('termination'));
  assert.ok(ids.includes('unilateral'));
  assert.ok(ids.includes('payment'));
  assert.ok(ids.includes('liability'));
  assert.ok(ids.includes('acceptance'));
  assert.ok(ids.includes('disputes'));
  assert.ok(findings.filter(f => f.quote).every(f => SAMPLE_CONTRACT.includes(f.quote!)));
});

test('empty input returns no findings', () => { assert.deepEqual(reviewContract('  '), []); });
test('nonmatching text never returns a false assurance', () => {
  assert.deepEqual(reviewContract('双方就服务范围进行约定。'), []);
});
test('clear dispute resolution clause is not flagged as missing', () => {
  const text = '本合同约定履行期限。双方应依照约定提供服务并妥善保存证据。因本合同发生争议，双方协商不成的，向有管辖权的人民法院提起诉讼。';
  assert.ok(!reviewContract(text).some(f=>f.id==='disputes'));
});
test('timeline sorting does not mutate input', () => {
  const input = [
    {id:'2', date:'2025-05-22', title:'二', type:'事实' as const, detail:'', evidence:''},
    {id:'1', date:'2025-03-01', title:'一', type:'程序' as const, detail:'', evidence:''}
  ];
  assert.deepEqual(sortTimeline(input).map(e=>e.id), ['1','2']);
  assert.equal(input[0].id,'2');
});
test('CSV escapes double quotes and keeps UTF-8 BOM', () => {
  const value = timelineToCsv([{id:'a',date:'2025-01-01',title:'含"引号"',type:'事实',detail:'逗号,换行\n下一行',evidence:'合同'}]);
  assert.ok(value.startsWith('\uFEFF'));
  assert.ok(value.includes('"含""引号"""'));
  assert.ok(value.includes('"逗号,换行\n下一行"'));
});

test('CSV escapes spreadsheet formulas in user input', () => {
  const value = timelineToCsv([{id:'b',date:'2025-01-01',title:'=1+1',type:'事实',detail:'@cmd',evidence:'-42'}]);
  assert.ok(value.includes('"\'=1+1"'));
  assert.ok(value.includes('"\'@cmd"'));
  assert.ok(value.includes('"\'-42"'));
});
