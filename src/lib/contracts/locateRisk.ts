import type { ContractFinding } from '../contractRules.ts';

export type RiskLocation={
  start:number;end:number;snippetStart:number;snippetEnd:number
};
/** Safely locate a finding using captured regex offsets, not a second substring search.
 * The quote must still match the CURRENT source text; revision checks are handled upstream. */
export function locateRisk(text:string,finding:ContractFinding):RiskLocation|null{
  if(!finding.quote||!Number.isSafeInteger(finding.start)||!Number.isSafeInteger(finding.end))return null;
  const start=finding.start!,end=finding.end!;
  if(start<0||end<=start||end>text.length||text.slice(start,end)!==finding.quote)return null;
  const lineStart=text.lastIndexOf('\n',start-1)+1;
  const lineEndIndex=text.indexOf('\n',end);
  const lineEnd=lineEndIndex===-1?text.length:lineEndIndex;
  const snippetStart=Math.max(lineStart,start-75);
  const snippetEnd=Math.min(lineEnd,end+75);
  return {start,end,snippetStart,snippetEnd};
}
