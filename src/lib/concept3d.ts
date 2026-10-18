import { KNOWLEDGE_POSITIONS } from './relationshipMaps.ts';

export type Point3 = { x: number; y: number; z: number };
export type SceneConcept = Point3 & { id: string; category: string; degree: number };
export type OrbitCamera = { yaw: number; pitch: number; distance: number };
export type Projection = { x: number; y: number; depth: number; scale: number; visible: boolean };

export const DEFAULT_CAMERA: Readonly<OrbitCamera> = { yaw: -0.34, pitch: 0.25, distance: 940 };
export const CAMERA_BOUNDS = { minDistance: 540, maxDistance: 1700, minPitch: -1.1, maxPitch: 1.1 } as const;
const DEPTH_BY_CATEGORY: Readonly<Record<string, number>> = {
  '总览': 0, '民法': 116, '证据法': -112, '法律方法': 168,
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Deterministic 3D placement from the existing graph; IDs, not UI labels, carry the relations.
 * Unknown future concept IDs are positioned on a ring rather than silently disappearing. */
export function buildConceptScene(
  nodes: readonly { id: string; category: string }[],
  edges: readonly { a: string; b: string }[],
): SceneConcept[] {
  const ids = new Set(nodes.map(n => n.id));
  const degrees = new Map(nodes.map(n => [n.id, 0]));
  for (const e of edges) {
    if (e.a === e.b || !ids.has(e.a) || !ids.has(e.b)) continue;
    degrees.set(e.a, (degrees.get(e.a) ?? 0) + 1);
    degrees.set(e.b, (degrees.get(e.b) ?? 0) + 1);
  }
  const placed = nodes.map((node, i) => {
    const known = KNOWLEDGE_POSITIONS[node.id];
    const angle = 2 * Math.PI * i / Math.max(nodes.length, 1);
    const x = known ? (known.x - 450) * .78 : Math.cos(angle) * (260 + 30 * (i % 3));
    const y = known ? (known.y - 250) * .68 : Math.sin(angle) * 175;
    const layer = DEPTH_BY_CATEGORY[node.category] ?? ((i % 5) - 2) * 58;
    // Small deterministic depth staggering keeps same-category objects from lying on a plane.
    const z = layer + ((i * 7) % 5 - 2) * 19;
    return { id: node.id, category: node.category, degree: degrees.get(node.id) ?? 0, x, y, z };
  });
  // Centre the bounding box on the origin so orbiting turns the scene about its middle.
  const mid = (k: 'x' | 'y' | 'z') => placed.length
    ? (Math.min(...placed.map(p => p[k])) + Math.max(...placed.map(p => p[k]))) / 2 : 0;
  const cx = mid('x'), cy = mid('y'), cz = mid('z');
  return placed.map(p => ({ ...p, x: p.x - cx, y: p.y - cy, z: p.z - cz }));
}

export function orbit(camera: OrbitCamera, dx: number, dy: number): OrbitCamera {
  return {
    yaw: camera.yaw + dx * .006,
    pitch: clamp(camera.pitch + dy * .006, CAMERA_BOUNDS.minPitch, CAMERA_BOUNDS.maxPitch),
    distance: camera.distance,
  };
}

export function zoom(camera: OrbitCamera, multiplier: number, maxDistance: number = CAMERA_BOUNDS.maxDistance): OrbitCamera {
  return {
    ...camera,
    distance: clamp(camera.distance * multiplier, CAMERA_BOUNDS.minDistance, maxDistance),
  };
}

/** Screen room each node needs around its centre: sphere above, label box below. */
export type FitPadding = { x: number; top: number; bottom: number };

/** Pull the camera back until every concept and its label fits the canvas, e.g. on phones.
 * Wide canvases that already fit keep the base camera unchanged. */
export function fitCamera(
  concepts: readonly Point3[], width: number, height: number, pad: FitPadding,
  base: OrbitCamera = DEFAULT_CAMERA,
): OrbitCamera {
  const fits = (camera: OrbitCamera) => concepts.every(n => {
    const p = project3D(n, camera, width, height);
    return p.visible && p.x >= pad.x && p.x <= width - pad.x && p.y >= pad.top && p.y <= height - pad.bottom;
  });
  let camera = { ...base };
  for (let i = 0; i < 80 && !fits(camera); i++) camera = { ...camera, distance: camera.distance * 1.05 };
  return camera;
}


/** Perspective projection, with z pointing toward the viewer and no DOM dependencies. */
export function project3D(p: Point3, camera: OrbitCamera, width: number, height: number): Projection {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const x = p.x * cy + p.z * sy;
  const z = -p.x * sy + p.z * cy;
  const y = p.y * cp - z * sp;
  const forward = p.y * sp + z * cp;
  const depth = camera.distance - forward;
  const visible = depth > 80;
  const scale = visible ? Math.min(5, 870 / depth) : 0;
  return { x: width / 2 + x * scale, y: height / 2 + y * scale,
    scale, depth, visible };
}

/** Pick the nearest visible node in screen space, preferring foreground on ties. */
export function hitTest3D(
  concepts: readonly SceneConcept[], camera: OrbitCamera, width: number, height: number,
  x: number, y: number,
): string | null {
  const hits = concepts.map(n => {
    const p = project3D(n, camera, width, height);
    const radius = Math.max(18, (7 + n.degree * 1.65) * p.scale + 7);
    return { id: n.id, depth: p.depth, distance: Math.hypot(p.x - x, p.y - y), radius, visible: p.visible };
  }).filter(h => h.visible && h.distance <= h.radius);
  hits.sort((a, b) => a.distance / a.radius - b.distance / b.radius || a.depth - b.depth);
  return hits[0]?.id ?? null;
}

export type LabelBox = { x: number; y: number; r: number; w: number; h: number };
const LABEL_GAP = 10;

/** Put each label under its node, or above it when that spot is already taken.
 * Items are placed in priority order (nearest / selected first); returns each box's top edge. */
export function placeLabels(items: readonly LabelBox[]): number[] {
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const hits = (b: { x0: number; x1: number; y0: number; y1: number }) =>
    taken.some(t => b.x0 < t.x1 && t.x0 < b.x1 && b.y0 < t.y1 && t.y0 < b.y1);
  return items.map(it => {
    const box = (top: number) => ({ x0: it.x - it.w / 2, x1: it.x + it.w / 2, y0: top, y1: top + it.h });
    const below = box(it.y + it.r + LABEL_GAP), above = box(it.y - it.r - LABEL_GAP - it.h);
    const chosen = hits(below) && !hits(above) ? above : below;
    taken.push(chosen);
    return chosen.y0;
  });
}

/** Narrow canvases get a taller, slimmer scene so labels are not squeezed side by side. */
export const COMPACT_SCENE = { below: 560, x: 0.8, y: 1.2 } as const;
export function compactScene<T extends Point3>(concepts: readonly T[]): T[] {
  return concepts.map(n => ({ ...n, x: n.x * COMPACT_SCENE.x, y: n.y * COMPACT_SCENE.y }));
}
