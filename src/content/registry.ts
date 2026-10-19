import { SEED_KNOWLEDGE_NODES, type KnowledgeNode } from './seedConcepts.ts';
import { CASE_SEED, EQUIPMENT_CASE_KEY } from './seedEquipmentCase.ts';
import { EVIDENCE_FACT_LINKS, PROOF_FACTS } from './seedCaseFacts.ts';
import { CANDIDATE_LEGAL_SOURCES, CONCEPT_SOURCE_CANDIDATES } from './sourceCandidates.ts';
import { CONTENT_SCHEMA_VERSION, type CaseRecord, type LegalContentRegistry, type LegalConceptRecord, type LegalSource } from './schema.ts';

/** This first seed is fictional teaching data. No official legal source has been verified yet.
 * Preserve existing IDs through explicit legacyId mappings; no new legal claims are added. */
const CASE_ID = EQUIPMENT_CASE_KEY;
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
  title:CASE_SEED.title,
  jurisdiction:'CN',
  nature:'fictional',
  synopsis:CASE_SEED.synopsis,
  parties:[...CASE_SEED.parties],
  editorial:{status:'pending',origin:'legacy-demo'},
  facts:PROOF_FACTS.map(f=>({
    id:factId(f.id),title:f.title,question:f.question,assessment:'unassessed'
  })),
  issues:[{
    id:CASE_ID+':issue:performance',
    title:'合同履行与延期争议',
    description:'分别核对付款、交付及延期协商的陈述，不把材料摘录视为已采信的证据。',
    factIds:PROOF_FACTS.map(f=>factId(f.id)),
    conceptIds:['contract','facts','evidence','claims','defences'].map(conceptId),
    sourceIds:[]
  }],
  evidence:CASE_SEED.evidence.map(e=>({
    id:evidenceId(e.id),legacyId:e.id,title:e.title,shortTitle:e.shortTitle,format:e.type,
    proposedPurpose:e.purpose,verificationNotes:e.caveat,authenticity:'unverified'
  })),
  links:Object.entries(EVIDENCE_FACT_LINKS).flatMap(([evidence, facts])=>
    facts.map(fact=>({
      id:CASE_ID+':link:'+evidence+'--'+fact,
      evidenceId:evidenceId(evidence),
      factId:factId(fact),
      relation:'candidate-support' as const,
      review:'pending' as const,
      note:'该材料与待证事实可能相关；原始资料、反证及证明目的仍须核查。'
    }))
  ),
  events:CASE_SEED.events.map(e=>({
    id:eventId(e.id),legacyId:e.id,date:e.date,
    kind:e.type==='事实'?'fact' as const:'procedure' as const,
    title:e.title,description:e.detail,
    evidenceIds:e.evidenceLegacyIds.map(evidenceId),
    legacyEvidenceDescription:e.evidence
  })),
  documents:CASE_SEED.documents.map(d=>({
    id:CASE_ID+':document:'+d.id,title:d.title,kind:d.kind,date:d.date,
    author:d.author,excerpt:d.excerpt,context:d.context,
    evidenceIds:d.evidenceLegacyIds.map(evidenceId),
    eventIds:d.eventLegacyIds.map(eventId)
  })),
  positions:CASE_SEED.positions.map(p=>({
    id:CASE_ID+':position:'+p.id,party:p.party,stance:p.stance,
    disputedFactIds:p.disputedFactLegacyIds.map(factId)
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

/** Dossier lookup is safe for static pages; data is fictional and never a verified legal fact. */
export function getTeachingCase(registry:LegalContentRegistry=LEGAL_CONTENT_V1):CaseRecord {
  const record=getCase(EQUIPMENT_CASE_KEY,registry);
  if(!record)throw new Error('LawLab fictional case fixture missing');
  return record;
}
