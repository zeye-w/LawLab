/** Small deterministic force-directed layout (Obsidian-style physics) with no DOM access. */
export type SimNode = { id: string; x: number; y: number; vx: number; vy: number };
export type SimEdge = { a: number; b: number };

/** Non-adjacent concepts fade their dots and links like Obsidian, but labels stay readable. */
export const GRAPH_DIM = { node: 0.22, edge: 0.14, label: 0.82 } as const;

export const FORCE = {
  repulsion: 7200, // all-pairs push, divided by squared distance
  spring: 0.018,   // pull of each link towards its rest length
  rest: 135,       // preferred link length in layout units
  gravity: 0.006,  // weak pull towards the origin so the graph stays framed
  damping: 0.86,   // velocity kept per step
  minAlpha: 0.04,
  cooling: 0.985,
} as const;

/** One integration step. `pinned` keeps a dragged node where the pointer is. */
export function stepLayout(nodes: SimNode[], edges: SimEdge[], alpha: number, pinned = -1): void {
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    let dx = b.x - a.x, dy = b.y - a.y;
    const d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2), f = FORCE.repulsion / d2 * alpha;
    dx /= d; dy /= d;
    a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
  }
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    let dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.01, f = (d - FORCE.rest) * FORCE.spring * alpha;
    dx /= d; dy /= d;
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  nodes.forEach((n, i) => {
    if (i === pinned) { n.vx = n.vy = 0; return; }
    n.vx -= n.x * FORCE.gravity * alpha; n.vy -= n.y * FORCE.gravity * alpha;
    n.vx *= FORCE.damping; n.vy *= FORCE.damping;
    n.x += n.vx; n.y += n.vy;
  });
}

export function coolAlpha(alpha: number, floor: number = FORCE.minAlpha): number {
  return Math.max(floor, alpha * FORCE.cooling);
}

/** Run the simulation to rest, e.g. for the first frame or for reduced motion. */
export function settleLayout(nodes: SimNode[], edges: SimEdge[], iterations = 400): void {
  let alpha = 1;
  for (let i = 0; i < iterations; i++) { stepLayout(nodes, edges, alpha); alpha = coolAlpha(alpha); }
  for (const n of nodes) n.vx = n.vy = 0;
}

export function layoutBounds(nodes: SimNode[], padX = 0, padY = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }
  return { x0: x0 - padX, y0: y0 - padY, x1: x1 + padX, y1: y1 + padY };
}
