import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KNOWLEDGE_NODES } from '../src/data/study.ts';
import { knowledgeEdges, linkedConceptIds } from '../src/lib/relationshipMaps.ts';
import { buildConceptScene, DEFAULT_CAMERA, project3D, orbit, zoom, hitTest3D, CAMERA_BOUNDS, nodeRadius, fitCamera, compactScene, placeLabels } from '../src/lib/concept3d.ts';
import { initialKnowledgeView } from '../src/lib/knowledgeView.ts';

const points=buildConceptScene(KNOWLEDGE_NODES,knowledgeEdges());
const ui=readFileSync(new URL('../src/components/KnowledgeNetwork3D.tsx',import.meta.url),'utf8');
const parent=readFileSync(new URL('../src/components/StudyTools.tsx',import.meta.url),'utf8');

test('3D network preserves the concept IDs, categories and existing 2D relationship model',()=>{
  assert.deepEqual(points.map(p=>p.id),KNOWLEDGE_NODES.map(n=>n.id));
  assert.deepEqual(points,buildConceptScene(KNOWLEDGE_NODES,knowledgeEdges()));
  assert.equal(new Set(points.map(p=>p.id)).size,KNOWLEDGE_NODES.length);
  assert.ok(new Set(points.map(p=>p.z)).size>=3,'multiple meaningful depth planes');
  assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)));
  const byId=new Map(points.map(p=>[p.id,p]));
  for(const e of knowledgeEdges()){
    assert.ok(byId.has(e.a)&&byId.has(e.b),e.id);
    assert.ok(linkedConceptIds(e.a).has(e.b),e.id);
  }
});

test('perspective depth and rotation are real rather than a visual CSS-only scale',()=>{
  const p=points.find(n=>n.id==='relationship')!;
  const original=project3D(p,DEFAULT_CAMERA,900,460);
  const rotated=project3D(p,orbit(DEFAULT_CAMERA,120,65),900,460);
  assert.ok(original.visible&&rotated.visible);
  assert.ok(Math.abs(original.x-rotated.x)>3 || Math.abs(original.y-rotated.y)>3);
  assert.ok(Math.abs(original.depth-rotated.depth)>1);
  const closer=project3D(p,zoom(DEFAULT_CAMERA,.65),900,460);
  assert.ok(closer.scale>original.scale);
  assert.deepEqual(zoom(DEFAULT_CAMERA,1e5).distance,CAMERA_BOUNDS.maxDistance);
  assert.deepEqual(zoom(DEFAULT_CAMERA,.00001).distance,CAMERA_BOUNDS.minDistance);
  assert.ok(orbit(DEFAULT_CAMERA,0,5000).pitch<=CAMERA_BOUNDS.maxPitch);
  assert.ok(orbit(DEFAULT_CAMERA,0,-5000).pitch>=CAMERA_BOUNDS.minPitch);
});

test('hit picking is depth-aware and ignores empty canvas',()=>{
  const node=points.find(n=>n.id==='contract')!;
  const point=project3D(node,DEFAULT_CAMERA,900,460);
  assert.equal(hitTest3D(points,DEFAULT_CAMERA,900,460,point.x,point.y),node.id);
  assert.equal(hitTest3D(points,DEFAULT_CAMERA,900,460,-10000,-10000),null);
});

test('3D canvas keeps accessible controls, shared selection and 2D fallback',()=>{
  assert.match(parent,/lazy\(\(\) => import\('\.\/KnowledgeNetwork3D'\)/);
  assert.match(parent,/const \[view, setView\] = useState<KnowledgeView>\(readKnowledgeView\)/);
  assert.match(parent,/localStorage\.setItem\(KNOWLEDGE_VIEW_KEY, next\)/);
  assert.match(parent,/<KnowledgeNetwork3D selected=\{selected\} onSelect=\{setSelected\}/);
  assert.match(parent,/<KnowledgeNetwork selected=\{selected\} onSelect=\{setSelected\}/);
  assert.match(parent,/aria-label="知识图谱显示模式"/);
  assert.match(ui,/<canvas[^>]*aria-hidden="true"/);
  assert.match(ui,/aria-pressed=\{node.id===selected\}/);
  assert.match(ui,/onClick=\{\(\)=>onSelect\(node.id\)\}/);
  assert.match(ui,/ResizeObserver/);
  assert.match(ui,/IntersectionObserver/);
  assert.match(ui,/if\(!e.ctrlKey && !e.metaKey\)return/);
});

test('future concept IDs have deterministic 3D positions without changing scene renderer',()=>{
  const augmented=[...KNOWLEDGE_NODES,{id:'future-concept-100',category:'新学科'}];
  const nodes=buildConceptScene(augmented,knowledgeEdges());
  const future=nodes.find(n=>n.id==='future-concept-100')!;
  assert.ok([future.x,future.y,future.z].every(Number.isFinite));
  assert.notDeepEqual({x:future.x,y:future.y,z:future.z},{x:0,y:0,z:0});
});

test('the default camera fits every concept on phones and leaves desktop framing unchanged',()=>{
  const pad={x:46,top:34,bottom:66};
  assert.deepEqual(fitCamera(points,900,460,pad),DEFAULT_CAMERA);
  for(const [w,h,scene] of [[340,390,compactScene(points)],[300,390,compactScene(points)],[640,460,points]] as const){
    const camera=fitCamera(scene,w,h,{...pad,top:58});
    assert.ok(camera.distance>DEFAULT_CAMERA.distance,`${w}px should pull the camera back`);
    for(const n of scene){
      const p=project3D(n,camera,w,h);
      assert.ok(p.visible&&p.x>=46&&p.x<=w-46&&p.y>=58&&p.y<=h-66,`${n.id} off screen at ${w}px`);
    }
    assert.ok(zoom(camera,1.19,Math.max(CAMERA_BOUNDS.maxDistance,camera.distance*1.4)).distance>camera.distance,'zoom out still possible');
  }
});

test('labels move above or beside their node instead of covering an already placed label',()=>{
  const spots=placeLabels([{x:100,y:100,r:10,w:80,h:23},{x:120,y:104,r:10,w:80,h:23},{x:400,y:100,r:10,w:80,h:23}]);
  assert.deepEqual(spots[0],{x:60,y:120});
  assert.deepEqual(spots[1],{x:80,y:104-10-10-23});
  assert.deepEqual(spots[2],{x:360,y:120});
  // Below and above both taken: the label goes to the side.
  const boxed=placeLabels([{x:100,y:110,r:4,w:80,h:23},{x:100,y:50,r:4,w:80,h:23},{x:100,y:100,r:4,w:80,h:23}]);
  assert.deepEqual(boxed[2],{x:114,y:88.5});
});

test('3D labels do not rely on ctx.roundRect (Safari < 16, Firefox < 112)',()=>{
  assert.doesNotMatch(ui,/\.roundRect\(/);
  assert.match(ui,/arcTo/);
});

test('phones open the 2D graph, wider screens 3D, and a saved choice wins',()=>{
  assert.equal(initialKnowledgeView(null,true),'2d');
  assert.equal(initialKnowledgeView(null,false),'3d');
  assert.equal(initialKnowledgeView('3d',true),'3d');
  assert.equal(initialKnowledgeView('2d',false),'2d');
  assert.equal(initialKnowledgeView('webgl',false),'3d');
});

test('dragging moves the near side of the scene with the pointer, and no floor grid is drawn',()=>{
  const front=points.map(n=>({n,p:project3D(n,DEFAULT_CAMERA,900,460)})).sort((a,b)=>a.p.depth-b.p.depth)[0].n;
  const at=(c:typeof DEFAULT_CAMERA)=>project3D(front,c,900,460);
  assert.ok(at(orbit(DEFAULT_CAMERA,0,40)).y>at(DEFAULT_CAMERA).y,'drag down moves the near side down');
  assert.ok(at(orbit(DEFAULT_CAMERA,0,-40)).y<at(DEFAULT_CAMERA).y,'drag up moves the near side up');
  assert.ok(at(orbit(DEFAULT_CAMERA,40,0)).x>at(DEFAULT_CAMERA).x,'drag right moves the near side right');
  assert.doesNotMatch(ui,/grid/i);
});

test('3D concepts are small flat dots without a specular highlight',()=>{
  assert.ok(nodeRadius(6,1)<=11,'busiest node stays small');
  assert.ok(nodeRadius(0,.2)>=3.5,'far nodes stay visible');
  assert.doesNotMatch(ui,/createRadialGradient/);
  const node=points.find(n=>n.id==='contract')!, p=project3D(node,DEFAULT_CAMERA,900,460);
  assert.equal(hitTest3D(points,DEFAULT_CAMERA,900,460,p.x+14,p.y),node.id,'click target stays generous');
});
