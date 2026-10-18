import type { ContractFinding } from '../contractRules.ts';
import { reviewContract, SAMPLE_CONTRACT } from '../contractRules.ts';
import type { ContractImportResult, ContractFormat, ContractPageSpan, ContractIntegrity } from '../contractImport.ts';

/** The canonical text is the only source for finding offsets; file bytes remain in memory only while parsing. */
export type ContractOrigin = 'sample' | 'pasted' | 'uploaded' | 'edited';
/** Separate source decoding completeness from whether all contractual clauses were provided.
 * Only the fictional built-in demo is known to represent its entire supplied contract. */
export type ContractDocumentScope = 'whole' | 'excerpt' | 'unknown';

// crypto.randomUUID only exists in secure contexts (HTTPS/localhost); a LAN http preview must not crash.
function newRevisionId():string{
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  return 'rev-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}

export interface ContractSource {
  revisionId: string;
  origin: ContractOrigin;
  text: string;
  name?: string;
  format?: ContractFormat;
  pages?: number;
  pageSpans?: ContractPageSpan[];
  integrity: ContractIntegrity;
  documentScope: ContractDocumentScope;
  warnings: string[];
}

export interface ContractReviewSnapshot {
  revisionId: string;
  findings: ContractFinding[];
}

export interface ContractWorkspaceState {
  source: ContractSource;
  review: ContractReviewSnapshot | null;
  selectedFindingId: string | null;
}

export function createSource(
  text: string,
  origin: ContractOrigin,
  options: Partial<Omit<ContractSource, 'revisionId' | 'text' | 'origin'>> = {},
  revisionId: string = newRevisionId()
): ContractSource {
  return {revisionId,origin,text,integrity:options.integrity??'complete',
    documentScope:options.documentScope??'unknown',warnings:[...(options.warnings??[])],
    ...(options.name?{name:options.name}:{}),
    ...(options.format?{format:options.format}:{}),
    ...(options.pages!==undefined?{pages:options.pages}:{}),
    ...(options.pageSpans?{pageSpans:options.pageSpans.map(s=>({...s}))}:{})
  };
}

export function initialContractWorkspace(): ContractWorkspaceState {
  return {source:createSource(SAMPLE_CONTRACT,'sample',{documentScope:'whole'}),review:null,selectedFindingId:null};
}

export function withImportedContract(
  _state:ContractWorkspaceState,result:ContractImportResult
):ContractWorkspaceState {
  return {source:createSource(result.text,'uploaded',{
    name:result.name,format:result.format,pages:result.pages,
    pageSpans:result.pageSpans,integrity:result.integrity,warnings:result.warnings
  }),review:null,selectedFindingId:null};
}

/** Even a single-character edit invalidates the old document page map and every previous finding. */
export function withEditedContract(state:ContractWorkspaceState,text:string):ContractWorkspaceState {
  if(text===state.source.text)return state;
  // Only text that came from a file has an original whose completeness the edit can break.
  const fromFile=state.source.origin==='uploaded'||state.source.origin==='edited';
  if(!fromFile)return {source:createSource(text,'pasted'),review:null,selectedFindingId:null};
  return {source:createSource(text,'edited',{
    integrity:'needs-review',
    warnings:['正文已手动修改，原文件页码与解析完整性不再适用；请重新核对全部条款。']
  }),review:null,selectedFindingId:null};
}

export function withSampleContract(_state:ContractWorkspaceState):ContractWorkspaceState {
  return {source:createSource(SAMPLE_CONTRACT,'sample',{documentScope:'whole'}),review:null,selectedFindingId:null};
}

/** User assertion about supplied material; resets review because missing-clause checks depend on it. */
export function withDocumentScope(state:ContractWorkspaceState,documentScope:ContractDocumentScope):ContractWorkspaceState {
  if(state.source.documentScope===documentScope)return state;
  return {...state,source:{...state.source,documentScope},review:null,selectedFindingId:null};
}

/** A negative (missing-clause) finding requires both full document scope and trustworthy extraction. */
export function canAssessMissingClauses(source:ContractSource):boolean {
  return source.documentScope==='whole' && source.integrity==='complete';
}

export function withReviewedContract(state:ContractWorkspaceState):ContractWorkspaceState {
  if(state.source.integrity==='blocked'||!state.source.text.trim())return state;
  const results=reviewContract(state.source.text);
  const findings=canAssessMissingClauses(state.source)?results:results.filter(f=>f.id!=='disputes');
  return {...state,review:{revisionId:state.source.revisionId,findings},
    selectedFindingId:findings[0]?.id??null};
}

export function selectReviewFinding(state:ContractWorkspaceState,id:string):ContractWorkspaceState {
  if(!hasCurrentReview(state)||!state.review?.findings.some(f=>f.id===id))return state;
  return {...state,selectedFindingId:id};
}

export function hasCurrentReview(state:ContractWorkspaceState):boolean {
  return state.review!==null&&state.review.revisionId===state.source.revisionId;
}

/** Current reviewed findings are never returned for a stale source revision. */
export function currentReviewFindings(state:ContractWorkspaceState):ContractFinding[]|null {
  return hasCurrentReview(state)?state.review!.findings:null;
}
