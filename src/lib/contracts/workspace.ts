import type { ContractFinding } from '../contractRules';
import { reviewContract, SAMPLE_CONTRACT } from '../contractRules';
import type { ContractImportResult, ContractFormat, ContractPageSpan, ContractIntegrity } from '../contractImport';

/** The canonical text is the only source for finding offsets; file bytes remain in memory only while parsing. */
export type ContractOrigin = 'sample' | 'pasted' | 'uploaded' | 'edited';

export interface ContractSource {
  revisionId: string;
  origin: ContractOrigin;
  text: string;
  name?: string;
  format?: ContractFormat;
  pages?: number;
  pageSpans?: ContractPageSpan[];
  integrity: ContractIntegrity;
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
  revisionId: string = crypto.randomUUID()
): ContractSource {
  return {revisionId,origin,text,integrity:options.integrity??'complete',warnings:[...(options.warnings??[])],
    ...(options.name?{name:options.name}:{}),
    ...(options.format?{format:options.format}:{}),
    ...(options.pages!==undefined?{pages:options.pages}:{}),
    ...(options.pageSpans?{pageSpans:options.pageSpans.map(s=>({...s}))}:{})
  };
}

export function initialContractWorkspace(): ContractWorkspaceState {
  return {source:createSource(SAMPLE_CONTRACT,'sample'),review:null,selectedFindingId:null};
}

export function withImportedContract(
  state:ContractWorkspaceState,result:ContractImportResult
):ContractWorkspaceState {
  return {source:createSource(result.text,'uploaded',{
    name:result.name,format:result.format,pages:result.pages,
    pageSpans:result.pageSpans,integrity:result.integrity,warnings:result.warnings
  }),review:null,selectedFindingId:null};
}

/** Even a single-character edit invalidates the old document page map and every previous finding. */
export function withEditedContract(state:ContractWorkspaceState,text:string):ContractWorkspaceState {
  if(text===state.source.text)return state;
  return {source:createSource(text,state.source.origin==='sample'?'pasted':'edited',{
    integrity:'needs-review',
    warnings:['正文已手动修改，原文件页码与解析完整性不再适用；请重新核对全部条款。']
  }),review:null,selectedFindingId:null};
}

export function withSampleContract(state:ContractWorkspaceState):ContractWorkspaceState {
  return {source:createSource(SAMPLE_CONTRACT,'sample'),review:null,selectedFindingId:null};
}

export function withReviewedContract(state:ContractWorkspaceState):ContractWorkspaceState {
  if(state.source.integrity==='blocked'||!state.source.text.trim())return state;
  const findings=reviewContract(state.source.text);
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
