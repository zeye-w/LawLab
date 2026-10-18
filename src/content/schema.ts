/** LawLab content contract v1. Data is educational until source and editorial
 * verification are completed; relationship edges do not establish legal proof. */
export const CONTENT_SCHEMA_VERSION = 1 as const;
export type Jurisdiction = 'CN' | 'HK' | 'MO' | 'TW' | 'OTHER';
export type ReviewStatus = 'pending' | 'verified' | 'rejected';
export type Editorial = {
  status: ReviewStatus;
  origin: 'legacy-demo' | 'editorial';
  checkedAt?: string; // YYYY-MM-DD, only present after verification
  checkedBy?: string;
};
export type LegalSource = {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  kind: 'statute' | 'regulation' | 'judgment' | 'scholarship' | 'official-guidance' | 'judicial-interpretation';
  issuer: string;
  url: string;
  locator?: string; // article, section, page, or judgment paragraph
  effectiveFrom?: string;
  effectiveTo?: string;
  validity: 'unknown' | 'in-force' | 'expired';
  editorial: Editorial;
};
export type LegalConceptRecord = {
  id: string; // stable, never based on translated display titles
  legacyId?: string;
  parentId?: string; // optional stable parent concept ID; separate from semantic relatedConceptIds
  title: string;
  category: string;
  jurisdiction: Jurisdiction;
  explanation: string;
  learningQuestion: string;
  relatedConceptIds: string[];
  sourceIds: string[];
  editorial: Editorial;
};
export type CaseIssue = {
  id: string; title: string; description: string;
  factIds: string[]; conceptIds: string[]; sourceIds: string[];
};
export type CaseFact = {
  id: string;
  title: string;
  question: string;
  assessment: 'unassessed' | 'alleged' | 'disputed' | 'stipulated';
};
export type CaseEvidence = {
  id: string;
  legacyId?: string;
  title: string;
  format: string;
  proposedPurpose: string;
  verificationNotes: string;
  authenticity: 'unverified' | 'checked';
};
export type EvidenceFactLink = {
  id: string;
  evidenceId: string;
  factId: string;
  relation: 'candidate-support' | 'candidate-challenge' | 'context';
  review: ReviewStatus;
  note: string;
};
export type CaseEvent = {
  id: string;
  legacyId?: string;
  date: string;
  kind: 'fact' | 'procedure';
  title: string;
  description: string;
  evidenceIds: string[]; // candidate association, not proof
  legacyEvidenceDescription?: string;
};
export type CaseRecord = {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  nature: 'fictional';
  synopsis: string;
  parties: string[];
  editorial: Editorial;
  issues: CaseIssue[];
  facts: CaseFact[];
  evidence: CaseEvidence[];
  links: EvidenceFactLink[];
  events: CaseEvent[];
};
export type LegalContentRegistry = {
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  sources: LegalSource[];
  concepts: LegalConceptRecord[];
  cases: CaseRecord[];
};
