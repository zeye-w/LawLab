import { useRef,useState,type Dispatch,type SetStateAction } from 'react';
import { ArrowRight,BookOpen,CheckCircle2,ExternalLink,FilePlus2,GitBranch,LibraryBig,LoaderCircle,Search,ShieldAlert,Sparkles } from 'lucide-react';
import {
  crossrefSearchUrl,crossrefBrowserUrl,parseCrossrefResponse,citationForHit,
  summarizeResearch,makeWritingGuide,STANCE_LABELS,RESEARCH_STANCES,
  type LiteratureHit,type ResearchNote,type ResearchStance
} from '../lib/research';
import { MAX_REFERENCES,type PaperProject,type PaperReference,type PaperSection } from '../lib/paper';
import './research.css';

type Props={paper:PaperProject;setPaper:Dispatch<SetStateAction<PaperProject>>};
function newId(prefix:string):string {
  if(typeof crypto!=='undefined'&&'randomUUID' in crypto)return prefix+crypto.randomUUID();
  return prefix+Date.now()+'-'+Math.random().toString(36).slice(2);
}
function sourceDisplay(ref:PaperReference) {return ref.citation.trim()||'未命名参考资料';}
export function LiteratureSearch({paper,setPaper,onLogic}:{onLogic:()=>void}&Props){
  const [query,setQuery]=useState('');
  const [hits,setHits]=useState<LiteratureHit[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [searched,setSearched]=useState(false);
  const abort=useRef<AbortController|null>(null);
  async function search(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const trimmed=query.trim();
    if(!trimmed){setError('请填写检索关键词。');return;}
    if(trimmed.length>250){setError('关键词请控制在 250 字以内。');return;}
    abort.current?.abort();
    const ctl=new AbortController();abort.current=ctl;
    setBusy(true);setError('');setSearched(false);setHits([]);
    const timer=window.setTimeout(()=>ctl.abort(),15000);
    try{
      const response=await fetch(crossrefSearchUrl(trimmed),{signal:ctl.signal,headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(response.status===429?'Crossref 请求次数过多，请稍后再试。':'检索接口错误：HTTP '+response.status);
      const data:unknown=await response.json();
      if(abort.current!==ctl)return;
      setHits(parseCrossrefResponse(data));setSearched(true);
    }catch(e){
      if(abort.current!==ctl)return;
      setError(e instanceof Error && e.name==='AbortError'
        ?'检索超时，请检查网络或使用下方的外部检索入口。'
        :e instanceof TypeError
          ?'浏览器无法访问 Crossref 接口（可能是网络或跨域限制）。可通过下方链接手动检索并添加文献。'
          :e instanceof Error?e.message:'检索失败，请稍后重试。');
    }finally{window.clearTimeout(timer);if(abort.current===ctl){abort.current=null;setBusy(false);}}
  }
  function addHit(hit:LiteratureHit){
    if(paper.references.length>=MAX_REFERENCES)return;
    const exists=paper.references.some(ref=>ref.locator.toLowerCase()===hit.url.toLowerCase());
    if(exists)return;
    const next:PaperReference={id:newId('crossref-'),type:'期刊论文',
      citation:citationForHit(hit),locator:hit.url,note:'',verified:false,
      research:{stance:'unclassified',claim:'',evidence:'',limitation:''}};
    setPaper(old=>{
      if(old.references.length>=MAX_REFERENCES||old.references.some(ref=>ref.locator.toLowerCase()===hit.url.toLowerCase()))return old;
      return {...old,references:[...old.references,next]};
    });
  }
  return <div className="paper-research">
    <div className="panel paper-panel">
      <div className="panel-head"><div><div className="eyebrow">01 / LITERATURE DISCOVERY</div><h2>学术文献检索</h2></div><LibraryBig size={20}/></div>
      <p className="paper-help">检索 Crossref 收录的论文元数据，展示标题、作者、刊物、年份和 DOI。结果必须先打开来源阅读核对，再进入观点整理；不保证全文可用，中文法学文献覆盖可能不足。</p>
      <form className="paper-search-bar" onSubmit={search}>
        <label className="paper-search-input"><Search size={19}/><input aria-label="文献检索关键词" type="search" maxLength={250} value={query} onChange={e=>setQuery(e.target.value)} placeholder="例如：standard terms contract law / 格式条款"/></label>
        <button type="submit" className="btn primary" disabled={busy||!query.trim()}>{busy?<LoaderCircle size={16}/>:<Search size={16}/>} {busy?'正在检索…':'检索文献'}</button>
      </form>
      <div className="paper-search-extras">
        <button className="btn subtle" type="button" onClick={()=>setQuery((paper.question||paper.title).slice(0,250))} disabled={!paper.question.trim()&&!paper.title.trim()}>使用论文研究问题</button>
        <a href={crossrefBrowserUrl(query||paper.question||'contract law')} target="_blank" rel="noopener noreferrer">打开 Crossref 搜索 <ExternalLink size={13}/></a>
      </div>
      {error&&<div className="paper-message paper-message-error" role="alert">{error}</div>}
      {searched&&<div className="paper-results-heading"><strong>检索结果</strong><span>{hits.length} 条 DOI 记录 · 仅元数据</span></div>}
      {searched&&hits.length===0&&<div className="paper-empty"><BookOpen size={25}/><strong>未检索到合适的 DOI 记录</strong><p>可换用英文关键词，或从正式数据库手动登记中文法学文献。</p></div>}
      {hits.length>0&&<div className="paper-search-results">
        {hits.map(hit=>{
          const exists=paper.references.some(ref=>ref.locator.toLowerCase()===hit.url.toLowerCase());
          return <article key={hit.doi} className="paper-result">
            <div><strong>{hit.title}</strong><p>{[hit.authors,hit.venue,hit.year].filter(Boolean).join(' · ')||'作者与年份未完整提供'}</p>
              <span className="paper-doi">DOI: {hit.doi}</span></div>
            <div className="paper-result-actions">
              <a href={hit.url} target="_blank" rel="noopener noreferrer" className="btn outline"><ExternalLink size={14}/> 查看 DOI 来源</a>
              <button className="btn outline" type="button" disabled={exists||paper.references.length>=MAX_REFERENCES} onClick={()=>addHit(hit)}><FilePlus2 size={14}/> {exists?'已加入':'加入文献库'}</button>
            </div>
            {hit.abstract&&<details className="paper-abstract"><summary>查看登记的摘要片段（非全文，未经核实）</summary><p>{hit.abstract}</p></details>}
          </article>;
        })}
      </div>}
      <div className="paper-note"><ShieldAlert size={17}/><span>Crossref 记录仅验证 DOI 及出版元数据的检索结果，并不证明全文内容、法律规则的现行效力或观点正确性。勿将摘要直接作为最终论证。</span></div>
    </div>
    <div className="paper-research-next"><div><span className="eyebrow">NEXT STEP / SOURCE ANALYSIS</span><strong>已收录 {paper.references.length} 条参考资料</strong><p>阅读原文后，为资料标注核心观点、论证依据、不同意见与研究局限。</p></div><button type="button" className="btn primary" onClick={onLogic}>进入观点与逻辑 <ArrowRight size={15}/></button></div>
  </div>;
}
const EMPTY:ResearchNote={stance:'unclassified',claim:'',evidence:'',limitation:''};
export function ArgumentWorkbench({paper,setPaper,onInsertGuide}:{onInsertGuide:(section:PaperSection,guide:string)=>void}&Props){
  const [chosen,setChosen]=useState('');
  const [showGuide,setShowGuide]=useState(false);
  const [onlyNoted,setOnlyNoted]=useState(false);
  const summary=summarizeResearch(paper);
  const selected=paper.sections.find(s=>s.id===chosen)??paper.sections[0];
  const guide=selected?makeWritingGuide(paper,selected):'';
  function changeNote(id:string,key:keyof ResearchNote,value:string){
    setPaper(old=>({...old,references:old.references.map(ref=>{
      if(ref.id!==id)return ref;
      return {...ref,research:{...EMPTY,...ref.research,[key]:value}};
    })}));
  }
  return <div className="paper-research">
    <div className="panel paper-panel">
      <div className="panel-head"><div><div className="eyebrow">02 / READING NOTES</div><h2>阅读笔记与观点标注</h2></div><GitBranch size={20}/></div>
      <p className="paper-help">在阅读每篇原文后，把观点用自己的话记录，并注明原文页码、所依据的证据及适用局限。下方整理的所有立场都来自你的手工标注，**并非 AI 自动提取论文内容**。</p>
      {paper.references.length===0?<div className="paper-empty"><LibraryBig size={30}/><strong>尚无可分析资料</strong><p>请先在「文献检索」加入 DOI 文献，或从「参考资料」手动添加中文法律文献。</p></div>:<>
        <label className="paper-logic-filter"><input type="checkbox" checked={onlyNoted} onChange={e=>setOnlyNoted(e.target.checked)}/>仅显示已填写观点的来源</label>
        <div className="paper-logic-sources">{paper.references.filter(ref=>!onlyNoted||!!ref.research?.claim.trim()).map((ref,index)=><section className="paper-logic-source" key={ref.id}>
          <div className="paper-source-head"><div><span className="eyebrow">SOURCE {index+1} · {ref.verified?'作者已标记核验':'来源待核验'}</span><strong>{sourceDisplay(ref)}</strong></div>{ref.locator.startsWith('https://')&&<a href={ref.locator} target="_blank" rel="noopener noreferrer" title="打开来源"><ExternalLink size={16}/></a>}</div>
          <div className="paper-field"><label htmlFor={'stance-'+ref.id}>这条观点与你的核心论点关系</label><select id={'stance-'+ref.id} value={ref.research?.stance??'unclassified'} onChange={e=>changeNote(ref.id,'stance',e.target.value as ResearchStance)}>{RESEARCH_STANCES.map(v=><option key={v} value={v}>{STANCE_LABELS[v]}</option>)}</select></div>
          <div className="paper-field"><label htmlFor={'claim-'+ref.id}>作者核心观点（由你阅读后归纳）</label><textarea id={'claim-'+ref.id} rows={2} maxLength={4000} value={ref.research?.claim??''} onChange={e=>changeNote(ref.id,'claim',e.target.value)} placeholder="该文献究竟主张什么？避免仅依据题目推测。"/></div>
          <div className="paper-field"><label htmlFor={'evidence-'+ref.id}>论据 / 法条位置 / 页码</label><textarea id={'evidence-'+ref.id} rows={2} maxLength={4000} value={ref.research?.evidence??''} onChange={e=>changeNote(ref.id,'evidence',e.target.value)} placeholder="例如：第 12 页中的论证、相关法条或案例所在段落。"/></div>
          <div className="paper-field"><label htmlFor={'limit-'+ref.id}>反对意见 / 研究局限</label><textarea id={'limit-'+ref.id} rows={2} maxLength={4000} value={ref.research?.limitation??''} onChange={e=>changeNote(ref.id,'limitation',e.target.value)} placeholder="观点在哪些场景可能不成立？作者未处理的反例是什么？"/></div>
        </section>)}</div>
      </>}
    </div>
    <div className="panel paper-panel">
      <div className="panel-head"><div><div className="eyebrow">03 / ARGUMENT MATRIX</div><h2>观点整合与对照</h2></div><span className="pill pill-blue">已标注 {summary.total} 条观点</span></div>
      <p className="paper-help">按你标注的立场归类，不将文献数量或引用量解释为学术共识。不同文献可能讨论不同法律问题，需要进一步比较其法域、规范适用范围和研究方法。</p>
      <div className="paper-argument-grid">{summary.groups.map(group=><section key={group.stance} className={'paper-argument-group paper-argument-'+group.stance}><div className="paper-argument-header"><strong>{group.label}</strong><span>{group.items.length}</span></div>
        {group.items.length===0?<p className="paper-argument-blank">暂无作者标记的观点</p>:group.items.map(ref=><div className="paper-argument-item" key={ref.id}><p>{ref.research!.claim}</p><small>{sourceDisplay(ref).slice(0,110)} · {ref.verified?'已标记核验':'待核验'}</small></div>)}
      </section>)}</div>
    </div>
    <div className="panel paper-panel">
      <div className="panel-head"><div><div className="eyebrow">04 / REASONING AUDIT</div><h2>论证逻辑与缺口</h2></div><ShieldAlert size={19}/></div>
      <div className="paper-logic-flow"><span>明确问题</span><ArrowRight size={15}/><span>找到规范与资料</span><ArrowRight size={15}/><span>支持论点</span><ArrowRight size={15}/><span>回应异议</span><ArrowRight size={15}/><span>审慎结论</span></div>
      {summary.gaps.length>0?<div className="paper-gaps">{summary.gaps.map((gap,i)=><div key={i}><ShieldAlert size={15}/><span>{gap}</span></div>)}</div>:<p className="paper-note"><CheckCircle2 size={16}/> 基础记录已覆盖主要检查项，但仍须独立审查推理有效性与引用准确性。</p>}
    </div>
    <div className="panel paper-panel">
      <div className="panel-head"><div><div className="eyebrow">05 / GUIDED WRITING</div><h2>从研究分析进入章节写作</h2></div><Sparkles size={20}/></div>
      <p className="paper-help">依据当前研究问题、你手动整理的观点和论证缺口，为指定章节生成**结构化写作指引**。它不会替你写出未经验证的法律结论，插入章节之前可先检查。</p>
      <div className="paper-guide-toolbar"><label htmlFor="research-guide-section">目标章节</label><select id="research-guide-section" value={selected?.id??''} onChange={e=>{setChosen(e.target.value);setShowGuide(false);}}>{paper.sections.map(s=><option key={s.id} value={s.id}>{s.heading}</option>)}</select>
        <button type="button" className="btn outline" onClick={()=>setShowGuide(v=>!v)} disabled={!selected}>{showGuide?'收起指引':'生成写作指引'}</button></div>
      {showGuide&&<div className="paper-guide-preview"><pre>{guide}</pre><button type="button" className="btn primary" disabled={!selected} onClick={()=>onInsertGuide(selected,guide)}>将写作指引附加到此章节 <ArrowRight size={15}/></button></div>}
    </div>
  </div>;
}
