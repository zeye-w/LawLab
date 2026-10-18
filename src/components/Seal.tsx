import { useId } from 'react';

type Props = {
  /** Three characters, read right column top-to-bottom, then the left column (traditional seal order). */
  chars: readonly [string, string, string];
  /** Accessible name; pass '' when visible text next to the seal already says it. */
  label: string;
  size?: number;
  /** Change this value to play the stamp animation again (e.g. a timestamp of the action). */
  stampKey?: string | number;
};

/** A study-completion seal. Wording stays on learning terms; it never imitates an official seal. */
export function Seal({ chars, label, size = 64, stampKey }: Props) {
  // useId may contain characters (":", "«»") that break url(#…) references.
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rough = 'seal-rough-' + raw, wear = 'seal-wear-' + raw, mask = 'seal-mask-' + raw;
  return <svg key={stampKey} className={'law-seal' + (stampKey ? ' law-seal-stamp' : '')} width={size} height={size}
    viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
    <defs>
      {/* Uneven ink edge and worn patches, like a real seal on paper. */}
      <filter id={rough} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7}/>
        <feDisplacementMap in="SourceGraphic" scale={2.6}/>
      </filter>
      <filter id={wear}>
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={3}/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.35"/>
      </filter>
      <mask id={mask}><rect width="100" height="100" fill="white"/><rect width="100" height="100" filter={`url(#${wear})`} fill="black"/></mask>
    </defs>
    <g filter={`url(#${rough})`} mask={`url(#${mask})`} className="law-seal-ink">
      <rect x="6" y="6" width="88" height="88" rx="6" fill="none" strokeWidth="6"/>
      <text x="66" y="44" fontSize="30" textAnchor="middle">{chars[0]}</text>
      <text x="66" y="78" fontSize="30" textAnchor="middle">{chars[1]}</text>
      <text x="31" y="61" fontSize="30" textAnchor="middle">{chars[2]}</text>
    </g>
  </svg>;
}
