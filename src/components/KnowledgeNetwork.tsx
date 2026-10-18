import { useEffect, useRef, useState } from 'react';
import { KNOWLEDGE_NODES } from '../data/study';
import { KNOWLEDGE_POSITIONS, knowledgeEdges, linkedConceptIds } from '../lib/relationshipMaps';
import { GRAPH_DIM, coolAlpha, layoutBounds, settleLayout, stepLayout, type SimEdge, type SimNode } from '../lib/forceLayout';
import './graphs.css';

type Props = { selected: string; onSelect: (id: string) => void };

const CATEGORY_TOKEN: Record<string, string> = {
  '总览': '--kg-core', '民法': '--kg-civil', '证据法': '--kg-evidence', '法律方法': '--kg-method',
};
const DEGREE: Record<string, number> = Object.fromEntries(
  KNOWLEDGE_NODES.map(n => [n.id, linkedConceptIds(n.id).size - 1]));
const radius = (id: string) => 5 + DEGREE[id] * 1.6;

type Visual = { fade: number; glow: number; phase: number };
type View = { x: number; y: number; k: number };

/** Canvas force-directed concept map; the node buttons below it are the accessible interface. */
export function KnowledgeNetwork({ selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusRef = useRef<string | null>(null);
  const api = useRef<{ wake: () => void; fit: () => void; scatter: () => void; zoom: (f: number) => void } | null>(null);
  selectedRef.current = selected; onSelectRef.current = onSelect; focusRef.current = focusId;

  useEffect(() => { api.current?.wake(); }, [selected, focusId]);

  useEffect(() => {
    const canvas = canvasRef.current!, wrap = wrapRef.current!, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(prefers-contrast: more)');
    // Seed from the hand-made layout so every visit starts from the same, readable arrangement.
    const nodes: SimNode[] = KNOWLEDGE_NODES.map(n => {
      const p = KNOWLEDGE_POSITIONS[n.id] ?? { x: 450, y: 250 };
      return { id: n.id, x: (p.x - 450) * 0.55, y: (p.y - 250) * 0.55, vx: 0, vy: 0 };
    });
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const edges: (SimEdge & { k: number })[] = knowledgeEdges()
      .map(e => ({ a: index.get(e.a)!, b: index.get(e.b)!, k: 0 }))
      .filter(e => e.a !== undefined && e.b !== undefined);
    const vis: Visual[] = nodes.map((_, i) => ({ fade: 1, glow: 0, phase: i * 1.7 }));
    const titles = new Map(KNOWLEDGE_NODES.map(n => [n.id, n]));
    settleLayout(nodes, edges);

    const css = getComputedStyle(wrap), token = (name: string) => css.getPropertyValue(name).trim();
    const colors = {
      ink: token('--kg-ink'), line: token('--kg-line'), link: token('--kg-link'),
      font: getComputedStyle(document.body).fontFamily,
      cat: Object.fromEntries(Object.entries(CATEGORY_TOKEN).map(([c, t]) => [c, token(t)])),
    };
    const FORCE_REST = 0.05;
    let W = 0, H = 0, dpr = 1, alpha = 0.05, frame = 0, visible = true;
    let view: View = { x: 0, y: 0, k: 1 };
    let hover: string | null = null;
    let drag: { i: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    let pan: { sx: number; sy: number; vx: number; vy: number } | null = null;

    function fit() {
      if (!W || !H) return;
      const b = layoutBounds(nodes, 62, 30);
      const k = Math.min(1.6, Math.max(0.5, Math.min((W - 32) / (b.x1 - b.x0), (H - 40) / (b.y1 - b.y0 + 20))));
      view = { k, x: W / 2 - (b.x0 + b.x1) / 2 * k, y: H / 2 - (b.y0 + b.y1 + 20) / 2 * k };
      wake();
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      fit();
    }
    const active = () => drag ? nodes[drag.i].id : hover ?? focusRef.current ?? selectedRef.current;

    function draw(): boolean {
      const fid = active(), near = linkedConceptIds(fid), dim = !contrast.matches;
      let changing = false;
      nodes.forEach((n, i) => {
        const v = vis[i], lit = near.has(n.id);
        const tf = lit || !dim ? 1 : 0, tg = n.id === fid ? 1 : 0;
        v.fade += (tf - v.fade) * 0.18; v.glow += (tg - v.glow) * 0.18;
        if (Math.abs(tf - v.fade) > 0.01 || Math.abs(tg - v.glow) > 0.01) changing = true;
      });
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); ctx!.clearRect(0, 0, W, H);
      ctx!.translate(view.x, view.y); ctx!.scale(view.k, view.k);
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b], on = a.id === fid || b.id === fid;
        e.k += ((on ? 1 : 0) - e.k) * 0.18; if (Math.abs((on ? 1 : 0) - e.k) > 0.01) changing = true;
        const base = Math.min(vis[e.a].fade, vis[e.b].fade);
        ctx!.globalAlpha = GRAPH_DIM.edge + (0.55 - GRAPH_DIM.edge) * base + e.k * 0.4;
        ctx!.strokeStyle = e.k > 0.5 ? colors.link : colors.line;
        ctx!.lineWidth = (1 + e.k * 1.4) / view.k;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
      }
      nodes.forEach((n, i) => {
        const v = vis[i], r = radius(n.id), meta = titles.get(n.id)!, c = colors.cat[meta.category] || colors.link;
        const nodeAlpha = GRAPH_DIM.node + (1 - GRAPH_DIM.node) * v.fade;
        if (v.glow > 0.02) {
          ctx!.globalAlpha = v.glow * 0.22; ctx!.fillStyle = c;
          ctx!.beginPath(); ctx!.arc(n.x, n.y, r + 10 * v.glow, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.globalAlpha = nodeAlpha; ctx!.fillStyle = c;
        ctx!.beginPath(); ctx!.arc(n.x, n.y, r, 0, Math.PI * 2); ctx!.fill();
        if (n.id === selectedRef.current) {
          ctx!.globalAlpha = 1; ctx!.strokeStyle = colors.ink; ctx!.lineWidth = 1.6 / view.k;
          ctx!.beginPath(); ctx!.arc(n.x, n.y, r + 3.5, 0, Math.PI * 2); ctx!.stroke();
        }
        const size = 13 / Math.max(0.85, view.k * 0.9);
        ctx!.font = `${n.id === fid || n.id === selectedRef.current ? 700 : 500} ${size}px ${colors.font}`;
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'; ctx!.fillStyle = colors.ink;
        ctx!.globalAlpha = GRAPH_DIM.label + (1 - GRAPH_DIM.label) * v.fade;
        ctx!.fillText(meta.title, n.x, n.y + r + 6);
      });
      ctx!.globalAlpha = 1;
      return changing;
    }
    function tick() {
      frame = 0;
      const moving = !reduced.matches;
      if (moving) {
        const t = performance.now() / 1000;
        // Gentle idle drift, the "breathing" of an Obsidian graph.
        nodes.forEach((n, i) => { n.vx += Math.cos(t * 0.6 + vis[i].phase) * 0.012; n.vy += Math.sin(t * 0.5 + vis[i].phase) * 0.012; });
      }
      if (drag) { const n = nodes[drag.i]; n.x = drag.x; n.y = drag.y; }
      if (moving || drag || alpha > FORCE_REST) stepLayout(nodes, edges, alpha, drag ? drag.i : -1);
      alpha = coolAlpha(alpha, drag ? 0.6 : 0.04);
      const changing = draw();
      if (visible && (moving || !!drag || changing || alpha > FORCE_REST)) frame = requestAnimationFrame(tick);
    }
    function wake() { if (!frame && visible) frame = requestAnimationFrame(tick); }

    const toWorld = (cx: number, cy: number) => ({ x: (cx - view.x) / view.k, y: (cy - view.y) / view.k });
    const local = (e: { clientX: number; clientY: number }) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function hit(cx: number, cy: number) {
      const w = toWorld(cx, cy); let best = -1, bd = Infinity;
      nodes.forEach((n, i) => { const d = Math.hypot(n.x - w.x, n.y - w.y); if (d < radius(n.id) + 14 / view.k && d < bd) { bd = d; best = i; } });
      return best;
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (drag) { const w = toWorld(p.x, p.y); drag.x = w.x; drag.y = w.y; drag.moved ||= Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4; alpha = Math.max(alpha, 0.5); wake(); return; }
      if (pan) { view.x = pan.vx + p.x - pan.sx; view.y = pan.vy + p.y - pan.sy; wake(); return; }
      if (e.pointerType === 'mouse') {
        const i = hit(p.x, p.y), id = i >= 0 ? nodes[i].id : null;
        canvas.style.cursor = id ? 'pointer' : 'grab';
        if (id !== hover) { hover = id; wake(); }
      }
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e), i = hit(p.x, p.y);
      if (i >= 0) { const w = toWorld(p.x, p.y); drag = { i, x: w.x, y: w.y, sx: p.x, sy: p.y, moved: false }; alpha = 0.8; canvas.setPointerCapture(e.pointerId); wake(); }
      else if (e.pointerType === 'mouse') { pan = { sx: p.x, sy: p.y, vx: view.x, vy: view.y }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('kg-panning'); }
    };
    const onUp = () => {
      if (drag && !drag.moved) onSelectRef.current(nodes[drag.i].id);
      drag = null; pan = null; canvas.classList.remove('kg-panning'); wake();
    };
    const onLeave = () => { if (!drag && hover) { hover = null; wake(); } };
    // Only claim a touch that starts on a node, so the page still scrolls over empty canvas.
    const onTouch = (e: TouchEvent) => { const t = e.touches[0], p = local(t); if (hit(p.x, p.y) >= 0) e.preventDefault(); };
    // Plain wheel scrolls the page; zoom needs ctrl/⌘ (also what trackpad pinch sends) or the buttons.
    const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomAt(local(e), Math.exp(-e.deltaY * 0.002)); };
    function zoomAt(p: { x: number; y: number }, f: number) {
      const w = toWorld(p.x, p.y); view.k = Math.min(2.4, Math.max(0.45, view.k * f));
      view.x = p.x - w.x * view.k; view.y = p.y - w.y * view.k; wake();
    }
    canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    // Stop animating while the graph is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
    io.observe(canvas);
    const onPrefs = () => wake();
    reduced.addEventListener('change', onPrefs); contrast.addEventListener('change', onPrefs);
    api.current = {
      wake, fit,
      scatter: () => { for (const n of nodes) { n.vx += (Math.random() - 0.5) * 28; n.vy += (Math.random() - 0.5) * 28; } alpha = 1; if (reduced.matches) { settleLayout(nodes, edges); fit(); } wake(); },
      zoom: f => zoomAt({ x: W / 2, y: H / 2 }, f),
    };
    resize(); wake();
    return () => {
      cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      reduced.removeEventListener('change', onPrefs); contrast.removeEventListener('change', onPrefs);
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('touchstart', onTouch);
      canvas.removeEventListener('wheel', onWheel); api.current = null;
    };
  }, []);

  return <div className="knowledge-graph-wrap" ref={wrapRef}>
    <div className="kg-stage">
      <canvas ref={canvasRef} className="kg-canvas" aria-hidden="true"/>
      <div className="kg-tools">
        <button type="button" onClick={() => api.current?.zoom(1.2)} aria-label="放大关系图">＋</button>
        <button type="button" onClick={() => api.current?.zoom(1 / 1.2)} aria-label="缩小关系图">－</button>
        <button type="button" onClick={() => api.current?.fit()}>复位</button>
        <button type="button" onClick={() => api.current?.scatter()}>重新散开</button>
      </div>
      <p className="kg-hint" aria-hidden="true">拖动节点 · Ctrl/⌘ + 滚轮缩放 · 点击查看</p>
    </div>
    <div className="kg-node-list" role="group" aria-label="法律概念：选择一个查看直接关联的概念">
      {KNOWLEDGE_NODES.map(node => <button key={node.id} type="button" aria-pressed={node.id === selected}
        className={'kg-chip kg-chip-' + (CATEGORY_TOKEN[node.category] ?? '--kg-core').slice(5)}
        onClick={() => onSelect(node.id)} onMouseEnter={() => setFocusId(node.id)} onMouseLeave={() => setFocusId(null)}
        onFocus={() => setFocusId(node.id)} onBlur={() => setFocusId(null)}>
        <i aria-hidden="true"/>{node.title}<span className="kg-chip-cat">{node.category}</span>
      </button>)}
    </div>
    <p className="knowledge-graph-caption">连线代表教学概念关联，并非法律因果或规范效力结论。节点越大，关联越多；可用 Tab 键在上方概念之间切换。</p>
  </div>;
}
