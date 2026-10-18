import { useEffect, useRef, useState } from 'react';
import { KNOWLEDGE_NODES } from '../data/study';
import { knowledgeEdges, linkedConceptIds } from '../lib/relationshipMaps';
import { buildConceptScene, DEFAULT_CAMERA, hitTest3D, orbit, project3D, zoom,
  type OrbitCamera, type Point3 } from '../lib/concept3d';
import './graphs.css';

type Props = { selected: string; onSelect: (id: string) => void };
const CATEGORY_TOKEN: Record<string, string> = {
  '总览':'--kg-core', '民法':'--kg-civil', '证据法':'--kg-evidence', '法律方法':'--kg-method',
};
const NODES = buildConceptScene(KNOWLEDGE_NODES, knowledgeEdges());
const EDGES = knowledgeEdges();
const BY_ID = new Map(NODES.map(node => [node.id, node]));
const META = new Map(KNOWLEDGE_NODES.map(node => [node.id, node]));

/** Perspective 3D concept explorer. Uses the browser's 2D canvas as a lightweight 3D
 * projection surface (no WebGL runtime), with a separate keyboard-accessible node list. */
export function KnowledgeNetwork3D({ selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const focusRef = useRef<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const api = useRef<{ redraw: () => void; turn: (x: number, y: number) => void;
    changeZoom: (factor: number) => void; reset: () => void } | null>(null);
  selectedRef.current = selected;
  onSelectRef.current = onSelect;
  focusRef.current = focusId;

  useEffect(() => { api.current?.redraw(); }, [selected, focusId]);

  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const contrast = window.matchMedia('(prefers-contrast: more)');
    let camera: OrbitCamera = { ...DEFAULT_CAMERA };
    let width = 0, height = 0, dpr = 1, visible = true, hover: string | null = null;
    let gesture: { startX: number; startY: number; x: number; y: number; moved: boolean; id: string | null } | null = null;
    const style = getComputedStyle(stage);
    const cat = (category: string) => style.getPropertyValue(CATEGORY_TOKEN[category] ?? '--kg-core').trim() || '#4f8473';

    function segment(a: Point3, b: Point3, color: string, alpha: number, lineWidth = 1) {
      const pa = project3D(a, camera, width, height), pb = project3D(b, camera, width, height);
      if (!pa.visible || !pb.visible) return;
      ctx!.beginPath(); ctx!.moveTo(pa.x, pa.y); ctx!.lineTo(pb.x, pb.y);
      ctx!.strokeStyle = color; ctx!.lineWidth = lineWidth; ctx!.globalAlpha = alpha; ctx!.stroke();
    }
    function paint() {
      if (!visible || width <= 0 || height <= 0) return;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      const active = hover ?? focusRef.current ?? selectedRef.current;
      const linked = linkedConceptIds(active);
      const strict = contrast.matches;

      // Depth plane and a quiet x/z grid make the third dimension legible.
      for (let i = -5; i <= 5; i++) {
        segment({x:i*90,y:185,z:-420}, {x:i*90,y:185,z:420}, '#91afa1', strict?.31:.14);
        segment({x:-450,y:185,z:i*78}, {x:450,y:185,z:i*78}, '#91afa1', strict?.31:.14);
      }
      segment({x:-460,y:185,z:0},{x:460,y:185,z:0},'#699686',.32,1.2);
      segment({x:0,y:185,z:-430},{x:0,y:185,z:430},'#8b9ab3',.27,1.2);

      const lines = EDGES.map(edge => {
        const a = BY_ID.get(edge.a)!, b = BY_ID.get(edge.b)!;
        const pa = project3D(a, camera, width, height), pb = project3D(b, camera, width, height);
        return { a, b, pa, pb, lit:edge.a===active||edge.b===active, depth:(pa.depth+pb.depth)/2 };
      }).sort((a,b)=>b.depth-a.depth);
      for (const e of lines) {
        if (!e.pa.visible || !e.pb.visible) continue;
        ctx!.beginPath(); ctx!.moveTo(e.pa.x,e.pa.y); ctx!.lineTo(e.pb.x,e.pb.y);
        ctx!.strokeStyle = e.lit ? '#458775' : '#a5b9ae';
        ctx!.lineWidth = e.lit ? 2.2 : 1;
        ctx!.globalAlpha = e.lit ? 0.93 : (strict ? .48 : .17);
        ctx!.stroke();
      }

      const projected = NODES.map(n => ({ ...n, p:project3D(n,camera,width,height) }))
        .filter(n=>n.p.visible).sort((a,b)=>b.p.depth-a.p.depth);
      const font = getComputedStyle(stage).fontFamily || 'sans-serif';
      for (const n of projected) {
        const {x,y,scale} = n.p, chosen = n.id===selectedRef.current;
        const illuminated = linked.has(n.id) || strict, focused = n.id===active;
        const r = Math.max(5,(7+n.degree*1.65)*scale);
        const color = cat(n.category);
        ctx!.globalAlpha = 1;
        if (chosen || focused) {
          ctx!.beginPath(); ctx!.arc(x,y,r+8,0,Math.PI*2);
          ctx!.fillStyle = 'rgba(78,148,137,0.13)'; ctx!.fill();
        }
        const gradient = ctx!.createRadialGradient(x-r*.35,y-r*.42,r*.08,x,y,r);
        gradient.addColorStop(0,'#ffffff'); gradient.addColorStop(.22,color);
        gradient.addColorStop(1,color);
        ctx!.beginPath(); ctx!.arc(x,y,r,0,Math.PI*2);
        ctx!.fillStyle = gradient; ctx!.globalAlpha = illuminated?1:.32; ctx!.fill();
        if (chosen) {
          ctx!.beginPath();ctx!.arc(x,y,r+3.8,0,Math.PI*2);
          ctx!.strokeStyle='#315c4e';ctx!.lineWidth=2;ctx!.globalAlpha=1;ctx!.stroke();
        }
        const title=META.get(n.id)?.title ?? n.id;
        ctx!.font=`${chosen||focused?'700':'600'} 12px ${font}`;
        const labelW=Math.ceil(ctx!.measureText(title).width)+18;
        const ly=y+r+10;
        ctx!.globalAlpha=chosen||illuminated?0.95:0.84;
        ctx!.fillStyle='#ffffff';
        ctx!.strokeStyle=chosen?'#9ec5b2':'#e0e9e2';
        ctx!.lineWidth=1;
        ctx!.beginPath();ctx!.roundRect(x-labelW/2,ly,labelW,23,8);ctx!.fill();ctx!.stroke();
        ctx!.textAlign='center';ctx!.textBaseline='middle';ctx!.globalAlpha=1;
        ctx!.fillStyle='#2f4a42';ctx!.fillText(title,x,ly+11.5);
      }
      ctx!.globalAlpha = 1;
    }

    function resize() {
      const rect=canvas!.getBoundingClientRect();
      width=rect.width; height=rect.height;
      dpr=Math.min(2,window.devicePixelRatio||1);
      canvas!.width=Math.round(width*dpr);canvas!.height=Math.round(height*dpr);
      paint();
    }
    function pointer(e: PointerEvent|WheelEvent) {
      const rect=canvas!.getBoundingClientRect();
      return { x:e.clientX-rect.left,y:e.clientY-rect.top };
    }
    const move=(e:PointerEvent)=>{
      const p=pointer(e);
      if(gesture) {
        if(Math.hypot(p.x-gesture.startX,p.y-gesture.startY)>5)gesture.moved=true;
        if(gesture.moved) camera=orbit(camera,p.x-gesture.x,p.y-gesture.y);
        gesture.x=p.x;gesture.y=p.y;paint();return;
      }
      if(e.pointerType==='mouse') {
        const id=hitTest3D(NODES,camera,width,height,p.x,p.y);
        canvas!.style.cursor=id?'pointer':'grab';
        if(id!==hover){hover=id;paint();}
      }
    };
    const down=(e:PointerEvent)=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      const p=pointer(e);
      gesture={startX:p.x,startY:p.y,x:p.x,y:p.y,moved:false,
        id:hitTest3D(NODES,camera,width,height,p.x,p.y)};
      canvas!.setPointerCapture(e.pointerId);
    };
    const up=()=>{
      if(gesture && !gesture.moved && gesture.id)onSelectRef.current(gesture.id);
      gesture=null;
      paint();
    };
    const cancel=()=>{gesture=null;paint();};
    const leave=()=>{if(!gesture && hover){hover=null;paint();}};
    // Normal scrolling is untouched; browser pinch gestures send ctrl-wheel.
    const wheel=(e:WheelEvent)=>{
      if(!e.ctrlKey && !e.metaKey)return;
      e.preventDefault();camera=zoom(camera,Math.exp(e.deltaY*.002));paint();
    };
    const ro=new ResizeObserver(resize);ro.observe(canvas);
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)paint();});
    io.observe(stage);
    const preferences=()=>paint();contrast.addEventListener('change',preferences);
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
    canvas.addEventListener('pointerleave',leave);canvas.addEventListener('wheel',wheel,{passive:false});
    api.current={
      redraw:paint,
      turn:(x,y)=>{camera=orbit(camera,x,y);paint();},
      changeZoom:(factor)=>{camera=zoom(camera,factor);paint();},
      reset:()=>{camera={...DEFAULT_CAMERA};paint();}
    };
    resize();
    return ()=>{
      ro.disconnect();io.disconnect();contrast.removeEventListener('change',preferences);
      canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);
      canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);
      canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('wheel',wheel);
      api.current=null;
    };
  },[]);

  return <div className="knowledge-graph-wrap knowledge-graph-3d">
    <div className="kg-stage kg3d-stage" ref={stageRef}>
      <canvas ref={canvasRef} className="kg3d-canvas" aria-hidden="true"/>
      <div className="kg-tools kg3d-tools" role="group" aria-label="三维视角控制">
        <button type="button" aria-label="向左旋转视角" onClick={()=>api.current?.turn(-45,0)}>←</button>
        <button type="button" aria-label="向右旋转视角" onClick={()=>api.current?.turn(45,0)}>→</button>
        <button type="button" aria-label="放大三维图谱" onClick={()=>api.current?.changeZoom(.84)}>＋</button>
        <button type="button" aria-label="缩小三维图谱" onClick={()=>api.current?.changeZoom(1.19)}>－</button>
        <button type="button" onClick={()=>api.current?.reset()}>复位</button>
      </div>
      <span className="kg3d-axis" aria-hidden="true">PERSPECTIVE / 3D</span>
      <p className="kg-hint" aria-hidden="true">拖动旋转视角 · 点击概念 · Ctrl/⌘ + 滚轮缩放</p>
    </div>
    <div className="kg-node-list" role="group" aria-label="三维法律概念节点：选择后在下方查看解释">
      {KNOWLEDGE_NODES.map(node=><button key={node.id} type="button"
        aria-pressed={node.id===selected}
        className={'kg-chip kg-chip-'+(CATEGORY_TOKEN[node.category]??'--kg-core').slice(5)}
        onClick={()=>onSelect(node.id)}
        onMouseEnter={()=>setFocusId(node.id)} onMouseLeave={()=>setFocusId(null)}
        onFocus={()=>setFocusId(node.id)} onBlur={()=>setFocusId(null)}>
        <i aria-hidden="true"/>{node.title}<span className="kg-chip-cat">{node.category}</span>
      </button>)}
    </div>
    <p className="knowledge-graph-caption">三维网格表达概念的空间关联，不表示法律概念的层级效力或法律因果。节点与连线沿用二维图谱的数据；可使用按钮和 Tab 键操作。</p>
  </div>;
}
