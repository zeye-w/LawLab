import { EVIDENCE } from '../data/cases';
import { EVIDENCE_FACT_LINKS,PROOF_FACTS,proofEdges,uncoveredFactIds } from '../lib/relationshipMaps';
import './graphs.css';

type Props={selected:string[];onToggle:(id:string)=>void};
const evidenceY=[80,177,274,371];
const factY=[80,177,274,371];

/** All links are candidate relevance only; nothing here scores probative force or adjudicates facts. */
export function EvidenceProofGraph({selected,onToggle}:Props){
  const uncovered=new Set(uncoveredFactIds(selected));
  const links=proofEdges(selected);
  return <section className="proof-network">
    <div className="proof-network-head">
      <span>证据材料</span><span>待证事实</span>
    </div>
    <svg viewBox="0 0 900 455" className="proof-network-svg"
      role="group" aria-label="已选择的证据与可能关联的待证事实">
      <g aria-hidden="true">
        {links.map(edge=>{
          const from=EVIDENCE.findIndex(e=>e.id===edge.evidenceId);
          const to=PROOF_FACTS.findIndex(f=>f.id===edge.factId);
          if(from<0||to<0)return null;
          const x1=245,y1=evidenceY[from],x2=658,y2=factY[to];
          const d=`M ${x1} ${y1} C ${x1+175} ${y1}, ${x2-175} ${y2}, ${x2} ${y2}`;
          return <path key={edge.id} d={d} pathLength={1} className={edge.active?'proof-edge proof-edge-on':'proof-edge proof-edge-off'}/>;
        })}
      </g>
      <g className="proof-evidence-nodes">
        {EVIDENCE.map((e,i)=>{
          const active=selected.includes(e.id);
          return <g key={e.id} transform={`translate(135 ${evidenceY[i]})`}
            className={active?'proof-graph-evidence proof-graph-on':'proof-graph-evidence proof-graph-off'}
            role="button" tabIndex={0} aria-pressed={active}
            aria-label={e.title+(active?'，已选':'，未选')}
            onClick={()=>onToggle(e.id)}
            onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onToggle(e.id);}}}>
            <title>{e.title}；可能关联：{(EVIDENCE_FACT_LINKS[e.id]||[]).map(id=>PROOF_FACTS.find(f=>f.id===id)?.title).join('、')}</title>
            <rect x="-110" y="-30" width="220" height="60" rx="11"/>
            <text textAnchor="middle" y="5">{e.shortTitle}</text>
          </g>;
        })}
      </g>
      <g>
        {PROOF_FACTS.map((fact,i)=>{
          const gap=uncovered.has(fact.id);
          return <g key={fact.id} transform={`translate(767 ${factY[i]})`}
            className={gap?'proof-graph-fact proof-graph-gap':'proof-graph-fact proof-graph-supported'}>
            <title>{fact.question}{gap?'；当前尚无已选关联证据':'；存在已选的相关证据（仍需核验）'}</title>
            <rect x="-110" y="-30" width="220" height="60" rx="11"/>
            <text textAnchor="middle" y="1">{fact.title}</text>
            <text className="proof-fact-caption" textAnchor="middle" y="18">{gap?'未选择关联材料':'存在候选证据'}</text>
          </g>;
        })}
      </g>
    </svg>
    <p className="proof-network-caption" role="status">
      已选 {selected.length} 项证据；{uncovered.size} 项待证事实目前没有选中的关联材料。
      连线只表示可能的证明目的，不能据此认定事实成立、证据已获采信或没有反证。
    </p>
  </section>;
}
