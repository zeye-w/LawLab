import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {GRAPH_DIM} from '../src/lib/forceLayout.ts';

const graphUi=readFileSync(new URL('../src/components/KnowledgeNetwork.tsx',import.meta.url),'utf8');
const contractUi=readFileSync(new URL('../src/components/contracts/ContractWorkspace.tsx',import.meta.url),'utf8');

test('unrelated concept labels remain legible and high-contrast mode removes muting',()=>{
  // Dots and links of unrelated concepts fade (Obsidian-style); their labels must stay readable.
  assert.ok(GRAPH_DIM.label>=.80,'concept labels should not be made nearly invisible');
  assert.ok(GRAPH_DIM.node>0&&GRAPH_DIM.edge>0,'faded parts must stay visible');
  assert.match(graphUi,/matchMedia\('\(prefers-contrast: more\)'\)/);
  assert.match(graphUi,/dim = !contrast\.matches/);
  // The canvas is decorative for assistive tech; every concept is a real, labelled button.
  assert.match(graphUi,/<canvas[^>]*aria-hidden="true"/);
  assert.match(graphUi,/KNOWLEDGE_NODES\.map\(node => <button[^>]*aria-pressed=\{node\.id === selected\}/);
});

test('selecting a contract risk does not force screen-reader focus into the full contract',()=>{
  const handler=contractUi.split('function focusFinding(')[1]?.split('function changeText(')[0];
  assert.ok(handler,'risk navigation handler missing');
  assert.doesNotMatch(handler,/\b(?:editor|editorRef\.current)\.focus\(/);
  assert.match(handler,/setSelectionRange\(location\.start,location\.end\)/);
  assert.match(contractUi,/className="contract-match-preview">/);
  assert.doesNotMatch(contractUi,/className="contract-match-preview"\s+(?:aria-live|role=)/);
  assert.match(contractUi,/<mark>\{source\.text\.slice\(highlighted\.start,highlighted\.end\)\}<\/mark>/);
});

test('risk list buttons expose short accessible labels instead of repeated quoted passage',()=>{
  assert.match(contractUi,/aria-pressed=\{current\?\.id===f\.id\}/);
  assert.match(contractUi,/aria-label=\{\x60\$\{f\.title\}/);
  assert.match(contractUi,/<small aria-hidden="true">\{f\.quote\?/);
});
