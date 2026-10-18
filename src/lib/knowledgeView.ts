/** Which knowledge-graph view to open with; kept apart from the lazily loaded 3D code. */
export type KnowledgeView = '2d' | '3d';
export const KNOWLEDGE_VIEW_KEY = 'lawlab:knowledge-view:v1';

/** A saved choice wins; otherwise phones start in 2D and wider screens in 3D. */
export function initialKnowledgeView(stored: string | null, narrow: boolean): KnowledgeView {
  if (stored === '2d' || stored === '3d') return stored;
  return narrow ? '2d' : '3d';
}
