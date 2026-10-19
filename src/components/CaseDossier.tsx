import { getTeachingCase } from '../content/registry.ts';
import './caseDossier.css';

const dossier=getTeachingCase();
const byEvidence=new Map(dossier.evidence.map(e=>[e.id,e]));
const byEvent=new Map(dossier.events.map(e=>[e.id,e]));
const byFact=new Map(dossier.facts.map(f=>[f.id,f]));

function CaseContents() {
  return <div className="case-dossier-body">
    <p className="case-dossier-synopsis">{dossier.synopsis}</p>
    <div className="case-dossier-stats" aria-label="资料数量">
      <span>{dossier.documents.length} 份教学文书</span><span>{dossier.evidence.length} 项候选证据</span>
      <span>{dossier.issues.length} 个争点</span><span>{dossier.events.length} 个事件</span>
    </div>
    <div className="case-dossier-grid">
      <div>
        <h3>双方陈述（均待核实）</h3>
        {dossier.positions.map(position=><div className="case-dossier-position" key={position.id}>
          <strong>{position.party}</strong>
          <p>{position.stance}</p>
          <small>相关待证事实：{position.disputedFactIds.map(id=>byFact.get(id)?.title??'未找到事实').join('、')}</small>
        </div>)}
      </div>
      <div>
        <h3>争点与证据局限</h3>
        {dossier.issues.map(issue=><div className="case-dossier-position" key={issue.id}>
          <strong>{issue.title}</strong>
          <p>{issue.description}</p>
          <small>涉及：{issue.factIds.map(id=>byFact.get(id)?.title??'未找到事实').join('、')}</small>
        </div>)}
      </div>
    </div>
    <h3>案件资料 · 原始教学摘录（非真实案卷）</h3>
    <div className="case-document-list">
      {dossier.documents.map((doc,i)=><details key={doc.id} className="case-document">
        <summary><span className="case-document-index">{String(i+1).padStart(2,'0')}</span><span className="case-document-label"><strong>{doc.title}</strong><small>{doc.date} · {doc.author}</small></span><span className="case-document-chevron" aria-hidden="true">＋</span></summary>
        <div className="case-document-content">
          <p className="case-document-excerpt">{doc.excerpt}</p>
          <p><strong>审查局限：</strong>{doc.context}</p>
          <p><strong>候选关联证据：</strong>{doc.evidenceIds.length?doc.evidenceIds.map(id=>byEvidence.get(id)?.title??'待核验').join('、'):'暂无对应的主图证据节点'}</p>
          <p><strong>关联时间节点：</strong>{doc.eventIds.length?doc.eventIds.map(id=>byEvent.get(id)?.title??'待核验').join('、'):'暂无对应事件'}</p>
        </div>
      </details>)}
    </div>
    <nav className="case-dossier-links" aria-label="同一案件跨模块分析">
      <a href="#evidence">证据链分析 →</a>
      <a href="#timeline">案件时间线 →</a>
      <a href="#reasoning">法律推理 →</a>
      <a href="#court">模拟法庭 →</a>
    </nav>
    <p className="case-dossier-disclaimer">全部当事人、文书、日期、数字和诉讼过程均为虚构教学设定。文书仅为节选，不是证据原件；链接表示候选关联，不表示真实性、证明力、事实成立或裁判结论。法律依据的现行效力须另行核实。</p>
  </div>;
}

/** One canonical dossier shared by every case-oriented module; native disclosure keeps
 * complex reading out of the way until the learner opens it. */
export function CaseDossier({ compact=false }: {compact?:boolean}) {
  if(compact) return <details className="panel case-dossier-compact">
    <summary><span className="case-dossier-summary-title">统一案件资料包</span><span className="case-dossier-summary-note">查看双方陈述、{dossier.documents.length} 份文书与争议事实</span><span aria-hidden="true">＋</span></summary>
    <CaseContents/>
  </details>;
  return <section className="panel case-dossier-full" aria-label="统一虚构案件资料库">
    <div className="panel-head"><div><div className="eyebrow">CASE DOSSIER / 001</div><h2>{dossier.title}</h2></div><span className="pill pill-green">虚构教学案例</span></div>
    <CaseContents/>
  </section>;
}
