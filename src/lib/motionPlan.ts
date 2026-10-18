/** Single source of truth for navigation motion layers.
 * Landing workspaces get a small scale-in; complex visual tools reveal their panels in sequence.
 * Every route still receives the same restrained global page transition. */
export type MotionLayer='portal'|'complex'|'regular';

const LANDING_PAGES=new Set(['home','learn','practice','litigation','nonlit']);
const COMPLEX_PAGES=new Set(['knowledge','evidence','contracts']);

export function motionLayer(page:string):MotionLayer {
  if(LANDING_PAGES.has(page))return 'portal';
  if(COMPLEX_PAGES.has(page))return 'complex';
  return 'regular';
}
