import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { motionLayer, markNativeTransitions, NATIVE_TRANSITIONS_CLASS } from '../src/lib/motionPlan.ts';

const css=readFileSync(new URL('../src/motion.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const entry=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');

test('A/B/C classification covers every LawLab route and isolates complex modules',()=>{
  for(const page of ['home','learn','practice','litigation','nonlit']){
    assert.equal(motionLayer(page),'portal',page);
  }
  for(const page of ['knowledge','evidence','contracts']){
    assert.equal(motionLayer(page),'complex',page);
  }
  for(const page of ['flashcards','paper','court','reasoning','quiz','timeline']){
    assert.equal(motionLayer(page),'regular',page);
  }
  assert.equal(motionLayer('unknown-route'),'regular');
});

test('native transition captures content only, never sidebar or entire root',()=>{
  assert.match(css,/:root\.lawlab-native-transitions\s*\{view-transition-name:none;\}/);
  assert.match(css,/:root\.lawlab-native-transitions \.content\s*\{view-transition-name:lawlab-content;\}/);
  assert.match(css,/::view-transition-old\(lawlab-content\)/);
  assert.match(css,/::view-transition-new\(lawlab-content\)/);
  assert.doesNotMatch(css,/::view-transition-(?:old|new)\(root\)/);
  assert.match(css,/:root\.lawlab-native-transitions \.content-enter\s*\{animation:none;\}/);
  assert.match(css,/\.content-enter\s*\{animation:lawPageEnter 240ms/);
});

test('sidebar, hash back/forward and reduced-motion share the same navigation logic',()=>{
  assert.match(app,/function onHashChange\(\)\{changePage\(getHashPage\(\),false\);\}/);
  assert.match(app,/function navigate\(id:ModuleId\)\{changePage\(id,true\);\}/);
  assert.match(app,/if\(motionAllowed\(\)&&transitionDocument\.startViewTransition\)/);
  assert.match(app,/flushSync\(\(\)=>\{setPage\(next\);setMenuOpen\(false\);\}\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/::view-transition-old\(lawlab-content\),::view-transition-new\(lawlab-content\)\{animation:none!important;\}/);
});

test('workspace micro-zoom and complex panel reveal are scoped to initial page shells',()=>{
  assert.match(app,/const layer=motionLayer\(page\)/);
  assert.match(app,/className=\{\x60content content-enter motion-\$\{layer\}\x60\}/);
  assert.match(css,/@keyframes lawPortalBreathe/);
  assert.match(css,/scale\(\.989\)/);
  assert.match(css,/\.motion-portal > \.entry-grid/);
  assert.match(css,/\.motion-portal > \.module-grid/);
  assert.match(css,/\.motion-complex \.knowledge-panel/);
  assert.match(css,/\.motion-complex \.evidence-layout > \.panel/);
  assert.match(css,/\.motion-complex \.contracts-layout > \.panel/);
  // Internal updates must not re-key the page or couple reveal animation to selected risks.
  assert.doesNotMatch(css,/\.finding-active[^\n]*lawSectionReveal/);
  assert.match(css,/\.motion-complex \.contracts-layout > \.panel,\s*\.choice-pulse/s);
});

test('native transition support is marked before the first render, only when the API exists',()=>{
  const fakeDoc=(api:unknown)=>{const added:string[]=[];return {added,doc:{startViewTransition:api,documentElement:{classList:{add:(n:string)=>added.push(n)}}}};};
  const yes=fakeDoc(()=>{});
  assert.equal(markNativeTransitions(yes.doc),true);
  assert.deepEqual(yes.added,[NATIVE_TRANSITIONS_CLASS]);
  const no=fakeDoc(undefined);
  assert.equal(markNativeTransitions(no.doc),false);
  assert.deepEqual(no.added,[]);
  // Marked at module load, before createRoot().render(), not in an effect after the first paint.
  assert.ok(entry.indexOf('markNativeTransitions(document)')>-1);
  assert.ok(entry.indexOf('markNativeTransitions(document)')<entry.indexOf('.render('));
  assert.doesNotMatch(app,/classList\.(?:add|remove)\('lawlab-native-transitions'\)/);
});
