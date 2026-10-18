import { SEED_KNOWLEDGE_NODES, type KnowledgeNode } from './seedConcepts.ts';
import { EVIDENCE } from '../data/cases.ts';
import { INITIAL_EVENTS } from '../lib/timeline.ts';
import { EVIDENCE_FACT_LINKS, PROOF_FACTS } from './seedCaseFacts.ts';
import { CANDIDATE_LEGAL_SOURCES, CONCEPT_SOURCE_CANDIDATES } from './sourceCandidates.ts';
import { CONTENT_SCHEMA_VERSION, type CaseRecord, type LegalContentRegistry, type LegalConceptRecord, type LegalSource } from './schema.ts';

/** This first seed is fictional teaching data. No official legal source has been verified yet.
 * Preserve existing IDs through explicit legacyId mappings; no new legal claims are added. */
const CASE_ID = 'case:cn:equipment-sale-demo-001';
const factId = (id: string) => CASE_ID + ':fact:' + id;
const evidenceId = (id: string) => CASE_ID + ':evidence:' + id;
const eventId = (id: string) => CASE_ID + ':event:' + id;
const conceptId = (id: string) => 'concept:cn:' + id;

const concepts: LegalConceptRecord[] = SEED_KNOWLEDGE_NODES.map(node => ({
  id:conceptId(node.id),
  legacyId:node.id,
  parentId:node.parentId ? conceptId(node.parentId) : undefined,
  title:node.title,
  category:node.category,
  jurisdiction:'CN',
  explanation:node.summary,
  learningQuestion:node.question,
  relatedConceptIds:node.related.map(conceptId),
  sourceIds:[...(CONCEPT_SOURCE_CANDIDATES[node.id] ?? [])],
  editorial:{status:'pending',origin:'legacy-demo'}
}));

const caseRecord: CaseRecord = {
  id:CASE_ID,
  title:'设备买卖合同纠纷（虚构教学案例）',
  jurisdiction:'CN',
  nature:'fictional',
  synopsis:'围绕设备买卖中的付款、交付及延期协商，练习分辨争议事实与候选证据。本案例纯属虚构。',
  parties:['买方','卖方'],
  editorial:{status:'pending',origin:'legacy-demo'},
  facts:PROOF_FACTS.map(f=>({
    id:factId(f.id),title:f.title,question:f.question,assessment:'unassessed'
  })),
  issues:[{
    id:CASE_ID+':issue:performance',
    title:'合同履行与延期争议',
    description:'核对合同义务、价款支付、交付行为及延期合意；不得以案例演示关系直接认定事实。',
    factIds:PROOF_FACTS.map(f=>factId(f.id)),
    conceptIds:['contract','facts','evidence','claims','defences'].map(conceptId),
    sourceIds:[]
  }],
  evidence:EVIDENCE.map(item=>({
    id:evidenceId(item.id),legacyId:item.id,title:item.title,format:item.type,
    proposedPurpose:item.purpose,verificationNotes:item.caveat,authenticity:'unverified'
  })),
  links:Object.entries(EVIDENCE_FACT_LINKS).flatMap(([evidence, facts])=>
    facts.map(fact=>({
      id:CASE_ID+':link:'+evidence+'--'+fact,
      evidenceId:evidenceId(evidence),
      factId:factId(fact),
      relation:'candidate-support' as const,
      review:'pending' as const,
      note:'仅为原演示图谱中的候选关联，需核验原始材料和证明目的。'
    }))
  ),
  events:INITIAL_EVENTS.map(e=>({
    id:eventId(e.id),legacyId:e.id,date:e.date,
    kind:e.type==='事实'?'fact' as const:'procedure' as const,
    title:e.title,description:e.detail,
    // The legacy timeline only contains display strings, not verified IDs.
    evidenceIds:[],
    legacyEvidenceDescription:e.evidence
  }))
};

/** New content features should read this registry or its selectors, not copy arrays between UIs.
 * Candidate sources remain pending and with unknown legal validity; no automatic verification. */
export const LEGAL_CONTENT_V1: LegalContentRegistry = {
  schemaVersion:CONTENT_SCHEMA_VERSION,
  sources:CANDIDATE_LEGAL_SOURCES,
  concepts,
  cases:[caseRecord]
};

/** Read-only adapters for gradual migration, including the current 2D/3D graph and case widgets. */
export function legacyConceptView(registry: LegalContentRegistry = LEGAL_CONTENT_V1) {
  return registry.concepts.filter(n=>n.legacyId && !n.parentId).map(n=>({
    id:n.legacyId!,title:n.title,category:n.category,
    summary:n.explanation,question:n.learningQuestion,
    related:n.relatedConceptIds.map(id=>
      registry.concepts.find(candidate=>candidate.id===id)?.legacyId
    ).filter((id):id is string=>!!id)
  }));
}
export function getCase(id: string, registry: LegalContentRegistry = LEGAL_CONTENT_V1): CaseRecord | undefined {
  return registry.cases.find(item=>item.id===id);
}
export function getConcept(id: string, registry: LegalContentRegistry = LEGAL_CONTENT_V1): LegalConceptRecord | undefined {
  return registry.concepts.find(item=>item.id===id||item.legacyId===id);
}

/** Read-only legal source candidates; status is not silently upgraded by selecting a concept. */
export function getConceptSources(
  id: string, registry: LegalContentRegistry = LEGAL_CONTENT_V1
): LegalSource[] {
  const concept=getConcept(id,registry);
  if(!concept) return [];
  const byId=new Map(registry.sources.map(source=>[source.id,source]));
  return concept.sourceIds.flatMap(sourceId=>{
    const source=byId.get(sourceId);
    return source?[source]:[];
  });
}

/** Authoritative hierarchy selector. Parent/child navigation is independent of
 * semantic cross-links; legacy top-level layout stays exactly nine nodes. */
export function getConceptChildren(
  parentId: string, registry: LegalContentRegistry = LEGAL_CONTENT_V1
): LegalConceptRecord[] {
  const parent=getConcept(parentId,registry);
  if(!parent)return [];
  return registry.concepts.filter(item=>item.parentId===parent.id);
}

/** Small star-shaped branch graph for both 2D and 3D; no extra nodes in overview.
 * Stable legacy IDs remain the keys used by existing graph layouts and buttons. */
export function knowledgeBranchNodes(
  parentId: string, registry: LegalContentRegistry = LEGAL_CONTENT_V1
): KnowledgeNode[] {
  const parent=getConcept(parentId,registry);
  if(!parent?.legacyId)return [];
  const children=getConceptChildren(parent.id,registry).filter(n=>n.legacyId);
  const convert=(n:LegalConceptRecord,related:string[]):KnowledgeNode=>({
    id:n.legacyId!,
    title:n.title,
    category:n.category as KnowledgeNode['category'],
    summary:n.explanation,
    question:n.learningQuestion,
    related
  });
  return [
    convert(parent,children.map(n=>n.legacyId!)),
    ...children.map(child=>convert(child,[parent.legacyId!]))
  ];
}
