import type { LegalSource } from './schema.ts';

/** Candidate official primary-text locations. These are references for editor review,
 * NOT verified legal opinions, current-law declarations, or verified source snapshots.
 * Do not mark in-force or verified automatically, even when the URL is official. */
const CIVIL_CODE = 'https://www.court.gov.cn/zixun/xiangqing/233181.html';
const EVIDENCE_RULES = 'https://www.court.gov.cn/zixun/xiangqing/212721.html';
const pending = { status: 'pending', origin: 'editorial' } as const;

export const CANDIDATE_LEGAL_SOURCES: LegalSource[] = [
  { id:'source:cn:civil-code:464',title:'中华人民共和国民法典',jurisdiction:'CN',
    kind:'statute',issuer:'全国人民代表大会',url:CIVIL_CODE,locator:'第464条',
    validity:'unknown',editorial:{...pending} },
  { id:'source:cn:civil-code:465',title:'中华人民共和国民法典',jurisdiction:'CN',
    kind:'statute',issuer:'全国人民代表大会',url:CIVIL_CODE,locator:'第465条',
    validity:'unknown',editorial:{...pending} },
  { id:'source:cn:civil-code:577',title:'中华人民共和国民法典',jurisdiction:'CN',
    kind:'statute',issuer:'全国人民代表大会',url:CIVIL_CODE,locator:'第577条',
    validity:'unknown',editorial:{...pending} },
  { id:'source:cn:evidence-rules:87',title:'最高人民法院关于民事诉讼证据的若干规定（2019年修正文本）',
    jurisdiction:'CN',kind:'judicial-interpretation',issuer:'最高人民法院',
    url:EVIDENCE_RULES,locator:'第87条',validity:'unknown',editorial:{...pending} },
  { id:'source:cn:evidence-rules:90',title:'最高人民法院关于民事诉讼证据的若干规定（2019年修正文本）',
    jurisdiction:'CN',kind:'judicial-interpretation',issuer:'最高人民法院',
    url:EVIDENCE_RULES,locator:'第90条',validity:'unknown',editorial:{...pending} },
  { id:'source:cn:evidence-rules:93',title:'最高人民法院关于民事诉讼证据的若干规定（2019年修正文本）',
    jurisdiction:'CN',kind:'judicial-interpretation',issuer:'最高人民法院',
    url:EVIDENCE_RULES,locator:'第93条',validity:'unknown',editorial:{...pending} },
];

/** Candidates, not binding interpretations. Review the exact issue of each concept
 * against the entire provision, amendments, related cases and temporal validity. */
export const CONCEPT_SOURCE_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  relationship:['source:cn:civil-code:464'],
  claims:['source:cn:civil-code:577'],
  contract:['source:cn:civil-code:465','source:cn:civil-code:577'],
  facts:['source:cn:evidence-rules:87'],
  evidence:['source:cn:evidence-rules:87','source:cn:evidence-rules:90','source:cn:evidence-rules:93'],
  burden:[],
  rules:['source:cn:civil-code:465'],
  defences:[],
  outcome:['source:cn:evidence-rules:90'],
  'contract-formation':[],
  'contract-effect':[],
  'contract-performance':['source:cn:civil-code:465'],
  'contract-breach':['source:cn:civil-code:577'],
  'contract-termination':[],
  'evidence-authenticity':['source:cn:evidence-rules:87'],
  'evidence-lawfulness':['source:cn:evidence-rules:87'],
  'evidence-relevance':['source:cn:evidence-rules:87'],
  'evidence-electronic':['source:cn:evidence-rules:93'],
  'claims-elements':[],
  'claims-defences':[]
};
