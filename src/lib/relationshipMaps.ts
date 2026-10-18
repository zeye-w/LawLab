import { KNOWLEDGE_NODES } from '../data/study.ts';
import { EVIDENCE } from '../data/cases.ts';

export type Point={x:number;y:number};
export const KNOWLEDGE_POSITIONS:Record<string,Point>={
  relationship:{x:448,y:270},
  claims:{x:268,y:120},
  contract:{x:110,y:265},
  facts:{x:634,y:120},
  evidence:{x:790,y:265},
  burden:{x:634,y:425},
  rules:{x:268,y:425},
  defences:{x:110,y:425},
  outcome:{x:448,y:56}
};

export type ConceptEdge={id:string;a:string;b:string};
export function knowledgeEdges():ConceptEdge[]{
  const ids=new Set(KNOWLEDGE_NODES.map(node=>node.id));
  const edges=new Map<string,ConceptEdge>();
  for(const node of KNOWLEDGE_NODES)for(const other of node.related){
    if(!ids.has(other)||other===node.id)continue;
    const [a,b]=[node.id,other].sort();
    const id=a+'--'+b;
    edges.set(id,{id,a,b});
  }
  return [...edges.values()];
}
export function linkedConceptIds(id:string):Set<string>{
  const linked=new Set<string>([id]);
  for(const edge of knowledgeEdges()){
    if(edge.a===id)linked.add(edge.b);
    if(edge.b===id)linked.add(edge.a);
  }
  return linked;
}

export const PROOF_FACTS=[
  {id:'agreement',title:'合同关系',question:'合同是否成立，约定了什么？'},
  {id:'payment',title:'付款事实',question:'是否付款，金额和收款人是谁？'},
  {id:'delivery',title:'交付事实',question:'货物是否按约交付？'},
  {id:'extension',title:'延期合意',question:'双方是否同意变更交付期限？'}
] as const;

export const EVIDENCE_FACT_LINKS:Readonly<Record<string,readonly string[]>>={
  // A contract proves what was agreed, not that payment or delivery actually happened.
  contract:['agreement'],
  transfer:['payment'],
  delivery:['delivery'],
  messages:['extension','delivery']
};

/** Candidate relationships, not a finding that any fact has been legally proved. */
export function proofEdges(selectedEvidence:readonly string[]){
  const picked=new Set(selectedEvidence);
  return EVIDENCE.flatMap(e=>EVIDENCE_FACT_LINKS[e.id]?.map(factId=>({
    id:e.id+'--'+factId,evidenceId:e.id,factId,active:picked.has(e.id)
  }))??[]);
}
export function uncoveredFactIds(selectedEvidence:readonly string[]):string[]{
  const covered=new Set(proofEdges(selectedEvidence).filter(edge=>edge.active).map(edge=>edge.factId));
  return PROOF_FACTS.filter(f=>!covered.has(f.id)).map(f=>f.id);
}
