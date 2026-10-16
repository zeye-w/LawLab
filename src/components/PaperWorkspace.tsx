import { useEffect,useState,type ChangeEvent } from 'react';
import './paper.css';
import { ArrowDown,ArrowDownToLine,ArrowLeft,ArrowUp,BookOpen,CheckCircle2,FilePlus2,FileText,Plus,RotateCcw,ShieldCheck,Trash2,Upload } from 'lucide-react';
import {
  PAPER_STORAGE_KEY, PAPER_RECOVERY_KEY, PAPER_MODES, REFERENCE_TYPES, MAX_SECTIONS, MAX_REFERENCES,
  createPaper,checkPaper,sectionsCustomized,applyReferencePatch,
  countPaperCharacters,paperToMarkdown,exportPaperBackup,parsePaperBackup,
  type PaperMode,type PaperProject,type PaperReference,type PaperSection
} from '../lib/paper';

type Draft={paper:PaperProject;raw:string;lockSave:boolean};
// Never let an unreadable draft be silently replaced by the blank paper's autosave:
// copy it aside first, and if even that fails, keep autosave off so the original stays put.
function readDraft():Draft {
  let stored:string|null=null;
  try { stored=localStorage.getItem(PAPER_STORAGE_KEY); } catch { /* storage unavailable */ }
  if(!stored) return {paper:createPaper(),raw:'',lockSave:false};
  try { return {paper:parsePaperBackup(stored),raw:'',lockSave:false}; }
  catch {
    try { localStorage.setItem(PAPER_RECOVERY_KEY,stored); return {paper:createPaper(),raw:stored,lockSave:false}; }
    catch { return {paper:createPaper(),raw:stored,lockSave:true}; }
  }
}
function saveFile(name:string,content:string,mime:string) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function fileBase(title:string) {
  const clean=title.trim().replace(/[\/\\:*?"<>|\x00-\x1f]/g,'-').slice(0,55);
  return clean||'lawlab-paper';
}
function newId(prefix:string):string {
  if(typeof crypto!=='undefined' && 'randomUUID' in crypto) return prefix+crypto.randomUUID();
  return prefix+Date.now()+'-'+Math.random().toString(36).slice(2);
}
type Tab='design'|'write'|'sources';
const NAV:[Tab,string][]=[['design','研究设计'],['write','章节写作'],['sources','参考资料']];
export function PaperWorkspace() {
  const [draft]=useState(readDraft);
  const [paper,setPaper]=useState<PaperProject>(draft.paper);
  const [lockSave,setLockSave]=useState(draft.lockSave);
  const [tab,setTab]=useState<Tab>('design');
  const [sectionId,setSectionId]=useState('');
  const [message,setMessage]=useState('');
  const [saveError,setSaveError]=useState('');
  useEffect(()=>{
    if(lockSave) return;
    try { localStorage.setItem(PAPER_STORAGE_KEY,exportPaperBackup(paper));setSaveError(''); }
    catch { setSaveError('浏览器本地存储失败。请立即导出 JSON 备份，以免丢失内容。'); }
  },[paper,lockSave]);
  const checks=checkPaper(paper), completed=checks.filter(x=>x.ok).length;
  const active=paper.sections.find(s=>s.id===sectionId)??paper.sections[0];
  function updateField<K extends keyof Pick<PaperProject,'title'|'question'|'argument'|'jurisdiction'>>(field:K,value:PaperProject[K]){
    setPaper(old=>({...old,[field]:value}));
  }
  function changeMode(next:PaperMode) {
    if(next===paper.mode) return;
    if(sectionsCustomized(paper)&&!window.confirm('更换论文结构会用新模板替换全部章节，包括已修改的章节标题、顺序和正文。请先导出备份。确定继续吗？')) return;
    setPaper(old=>({...old,mode:next,sections:createPaper(next).sections}));
    setSectionId('');setMessage('已切换论文结构模板。');
  }
  function updateSection(id:string,patch:Partial<PaperSection>) {
    setPaper(old=>({...old,sections:old.sections.map(s=>s.id===id?{...s,...patch}:s)}));
  }
  function addSection() {
    if(paper.sections.length>=MAX_SECTIONS) return;
    const id=newId('section-');
    setPaper(old=>({...old,sections:[...old.sections,{id,heading:'新增章节',body:''}]}));
    setSectionId(id);setTab('write');
  }
  function removeSection(id:string){
    if(paper.sections.length===1)return;
    if(!window.confirm('确定删除该章节及其正文？此操作不可撤销，建议先导出备份。'))return;
    setPaper(old=>({...old,sections:old.sections.filter(s=>s.id!==id)}));setSectionId('');
  }
  function moveSection(id:string,direction:-1|1) {
    setPaper(old=>{
      const list=[...old.sections],index=list.findIndex(s=>s.id===id),other=index+direction;
      if(index<0||other<0||other>=list.length)return old;
      [list[index],list[other]]=[list[other],list[index]];
      return {...old,sections:list};
    });
  }
  function addReference() {
    if(paper.references.length>=MAX_REFERENCES) return;
    const id=newId('source-');
    setPaper(old=>({...old,references:[...old.references,{id,type:'期刊论文',citation:'',locator:'',note:'',verified:false}]}));
    setTab('sources');setMessage('请填写真实来源及可供核验的出处；系统不会自动生成引文。');
  }
  function updateRef(id:string,patch:Partial<PaperReference>) {
    setPaper(old=>({...old,references:old.references.map(r=>r.id===id?applyReferencePatch(r,patch):r)}));
  }
  function markVerified(ref:PaperReference,value:boolean){
    if(value&&(!ref.citation.trim()||!ref.locator.trim())){
      setMessage('标记「已核验」前，请先填写来源信息和可核验的出处／链接／案号。');return;
    }
    setMessage('');
    updateRef(ref.id,{verified:value});
  }
  function deleteReference(id:string){
    if(!window.confirm('确定移除这条参考资料记录？'))return;
    setPaper(old=>({...old,references:old.references.filter(r=>r.id!==id)}));
  }
  function exportMarkdown(){
    saveFile(fileBase(paper.title)+'.md',paperToMarkdown(paper),'text/markdown;charset=utf-8');
    setMessage('Markdown 文稿已导出。请核对引用和学校格式要求。');
  }
  function exportJson(){
    saveFile(fileBase(paper.title)+'.lawlab.json',exportPaperBackup(paper),'application/json;charset=utf-8');
    setMessage('已导出可恢复的项目备份。');
  }
  async function importJson(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>1.8*1024*1024){setMessage('导入失败：备份文件超过 1.8 MB。');return;}
    if(!window.confirm('导入将覆盖当前论文工作区。请确认已备份现有内容。'))return;
    try {
      const imported=parsePaperBackup(await file.text());
      setPaper(imported);setSectionId('');setTab('design');setMessage('论文备份已恢复。');
    }catch(error){setMessage(error instanceof Error?error.message:'备份无法读取。');}
  }
  function reset(){
    if(!window.confirm('重置会清空论文、章节和参考资料。本操作不可撤销，建议先导出 JSON 备份。确定继续吗？'))return;
    setPaper(createPaper());setSectionId('');setTab('design');setMessage('已经建立一份新的空白论文。');
  }
  return <div className="paper-page">
    <div className="page-heading"><div><div className="eyebrow">LAWLAB LEARN / ACADEMIC WRITING</div><h1>法学论文写作工作台</h1><p>从研究问题与论点出发，建立论文结构，撰写章节，并对每条法律资料进行独立核验。</p></div><span className="pill pill-green">本地写作 · 无 AI 调用</span></div>
    <div className="paper-overview" aria-label="写作进度">
      <div><span>论文正文</span><strong>{countPaperCharacters(paper).toLocaleString('zh-CN')}</strong><small>字符（不含空白）</small></div>
      <div><span>研究准备</span><strong>{completed} / {checks.length}</strong><small>检查项已完成</small></div>
      <div><span>参考资料</span><strong>{paper.references.filter(r=>r.verified).length} / {paper.references.length}</strong><small>由作者标记已核验</small></div>
    </div>
    <div className="paper-toolbar">
      <div className="paper-tabs" role="group" aria-label="论文写作模块">{NAV.map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
      <div className="paper-toolbar-actions">
        <button type="button" className="btn outline" onClick={exportMarkdown}><ArrowDownToLine size={15}/> 导出 Markdown</button>
        <button type="button" className="btn outline" onClick={exportJson}><ArrowDownToLine size={15}/> 备份 JSON</button>
        <label className="btn outline paper-import"><Upload size={15}/> 恢复备份<input aria-label="导入 LawLab 论文 JSON 备份" type="file" accept=".json,application/json" onChange={importJson}/></label>
      </div>
    </div>
    {message&&<div className="paper-message" role="status">{message}<button type="button" onClick={()=>setMessage('')} aria-label="关闭提示">×</button></div>}
    {saveError&&<div className="paper-message paper-message-error" role="alert">{saveError}</div>}
    {draft.raw&&<div className="paper-message paper-message-error" role="alert"><span>{lockSave
      ?'上次保存的论文无法读取，且无法另存副本。为避免覆盖原始数据，已暂停自动保存。请先下载原始存档；确认后再恢复自动保存。'
      :'上次保存的论文无法读取，原始数据已另存在浏览器恢复区，当前显示空白论文。请下载原始存档并联系维护者协助恢复。'}</span>
      <button type="button" className="btn outline" onClick={()=>saveFile('lawlab-paper-recovery.json',draft.raw,'application/json;charset=utf-8')}>下载原始存档</button>
      {lockSave&&<button type="button" className="btn outline" onClick={()=>{if(window.confirm('恢复自动保存会覆盖无法读取的原始存档。确定已下载备份吗？'))setLockSave(false);}}>恢复自动保存</button>}</div>}
    {tab==='design'&&<div className="paper-columns">
      <section className="panel paper-panel">
        <div className="panel-head"><div><span className="eyebrow">01 / RESEARCH DESIGN</span><h2>研究设计</h2></div><BookOpen size={19}/></div>
        <div className="paper-field"><label htmlFor="paper-title">论文标题</label><input id="paper-title" maxLength={300} value={paper.title} onChange={e=>updateField('title',e.target.value)} placeholder="例如：数字平台格式条款的效力审查路径"/></div>
        <div className="paper-field"><label htmlFor="paper-jurisdiction">研究法域与范围</label><input id="paper-jurisdiction" maxLength={200} value={paper.jurisdiction} onChange={e=>updateField('jurisdiction',e.target.value)} placeholder="例如：中国法；民法典合同编"/></div>
        <div className="paper-field"><label htmlFor="paper-mode">论文研究类型</label><select id="paper-mode" value={paper.mode} onChange={e=>changeMode(e.target.value as PaperMode)}>{PAPER_MODES.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div className="paper-field"><label htmlFor="paper-question">核心研究问题</label><textarea id="paper-question" maxLength={6000} rows={4} value={paper.question} onChange={e=>updateField('question',e.target.value)} placeholder="你具体想回答什么法律争议？明确适用范围和概念边界。"/></div>
        <div className="paper-field"><label htmlFor="paper-argument">初步核心论点</label><textarea id="paper-argument" maxLength={6000} rows={4} value={paper.argument} onChange={e=>updateField('argument',e.target.value)} placeholder="你的观点是什么？它需要哪些规范、案例和研究结果支持？"/></div>
      </section>
      <aside className="panel paper-panel">
        <div className="panel-head"><div><span className="eyebrow">WRITING CHECKLIST</span><h2>论文写作检查</h2></div></div>
        <div className="paper-checklist">{checks.map(check=><div key={check.label} className={check.ok?'paper-checked':''}><CheckCircle2 size={18}/><span>{check.label}</span></div>)}</div>
        <div className="paper-advice"><strong>建议的研究顺序</strong><p>先确定研究问题，再核验规范依据与既有研究，梳理论证路径，最后完成分章节写作与统一引注。</p></div>
        <button type="button" className="btn primary" onClick={()=>setTab('write')}>前往章节写作 <ArrowLeft size={15} className="paper-rotated"/></button>
      </aside>
    </div>}
    {tab==='write'&&<div className="paper-columns paper-writing">
      <aside className="panel paper-outline">
        <div className="panel-head"><div><span className="eyebrow">02 / OUTLINE</span><h2>论文提纲</h2></div><button type="button" className="btn outline" onClick={addSection} disabled={paper.sections.length>=MAX_SECTIONS} title={paper.sections.length>=MAX_SECTIONS?`最多 ${MAX_SECTIONS} 个章节`:undefined}><Plus size={15}/> 章节</button></div>
        <div className="paper-outline-list">{paper.sections.map((s,i)=><div key={s.id} className={'paper-outline-item '+(active?.id===s.id?'selected':'')}>
          <button type="button" className="paper-outline-main" onClick={()=>setSectionId(s.id)} aria-current={active?.id===s.id?'true':undefined}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.heading||'未命名章节'}</strong><small>{s.body.replace(/\s/g,'').length} 字符</small></button>
          <div className="paper-outline-actions"><button type="button" aria-label={'上移'+s.heading} disabled={i===0} onClick={()=>moveSection(s.id,-1)}><ArrowUp size={14}/></button><button type="button" aria-label={'下移'+s.heading} disabled={i===paper.sections.length-1} onClick={()=>moveSection(s.id,1)}><ArrowDown size={14}/></button><button type="button" aria-label={'删除'+s.heading} disabled={paper.sections.length===1} onClick={()=>removeSection(s.id)}><Trash2 size={14}/></button></div>
        </div>)}</div>
        <div className="paper-advice"><strong>章节写作提示</strong><p>建议每节采用“问题—规范依据—观点论证—回应反对意见—小结”的论证结构。引证资料请在文中自行标记，并在参考资料页登记。</p></div>
      </aside>
      <section className="panel paper-editor">{active&&<>
        <div className="panel-head"><div><span className="eyebrow">SECTION EDITOR</span><h2>撰写章节</h2></div><FileText size={20}/></div>
        <div className="paper-field"><label htmlFor="paper-heading">章节标题</label><input id="paper-heading" maxLength={300} value={active.heading} onChange={e=>updateSection(active.id,{heading:e.target.value})}/></div>
        <div className="paper-field"><label htmlFor="paper-body">正文</label><textarea id="paper-body" className="paper-body" maxLength={150000} spellCheck value={active.body} onChange={e=>updateSection(active.id,{body:e.target.value})} placeholder="在这里展开你自己的法律论证。引入法律条文、学术观点或案例时，请注明可核验的出处。"/></div>
        <div className="paper-editor-footer"><span>章节正文 {active.body.replace(/\s/g,'').length.toLocaleString('zh-CN')} 字符</span><span>自动保存到此浏览器（建议定期备份）</span></div>
      </>}</section>
    </div>}
    {tab==='sources'&&<div className="panel paper-panel">
      <div className="panel-head"><div><span className="eyebrow">03 / RESEARCH SOURCES</span><h2>参考资料与法律依据</h2></div><button type="button" className="btn primary" onClick={addReference} disabled={paper.references.length>=MAX_REFERENCES} title={paper.references.length>=MAX_REFERENCES?`最多 ${MAX_REFERENCES} 条来源`:undefined}><FilePlus2 size={16}/> 添加来源</button></div>
      <p className="paper-help">由你录入真实文献信息、法条或裁判文书，记录 DOI / 正式链接 / 法条位置 / 案号。只有本人完成核验后才勾选「已核验」，本站不自动访问数据库或声称核验成功。</p>
      {paper.references.length===0?<div className="paper-empty"><BookOpen size={30}/><strong>尚未录入参考资料</strong><p>从你实际阅读过的文献、现行法律及裁判文书开始，避免虚构或未经核实的引用。</p><button className="btn outline" onClick={addReference}>添加第一条来源</button></div>:
        <div className="paper-references">{paper.references.map((ref,i)=><section className="paper-ref" key={ref.id}>
          <div className="paper-ref-top"><span className="eyebrow">SOURCE {String(i+1).padStart(2,'0')}</span><div><span className={ref.verified?'paper-state verified':'paper-state'}>{ref.verified?'作者已核验':'待核验'}</span><button type="button" className="paper-icon-button" aria-label={'删除第'+(i+1)+'条来源'} onClick={()=>deleteReference(ref.id)}><Trash2 size={16}/></button></div></div>
          <div className="paper-ref-fields">
            <div className="paper-field"><label htmlFor={'paper-ref-type-'+ref.id}>资料类型</label><select id={'paper-ref-type-'+ref.id} value={ref.type} onChange={e=>updateRef(ref.id,{type:e.target.value as PaperReference['type']})}>{REFERENCE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="paper-field"><label htmlFor={'paper-ref-citation-'+ref.id}>来源信息</label><input id={'paper-ref-citation-'+ref.id} maxLength={2000} value={ref.citation} onChange={e=>updateRef(ref.id,{citation:e.target.value})} placeholder="作者、标题、刊物与年份；或法律规范名称"/></div>
            <div className="paper-field"><label htmlFor={'paper-ref-locator-'+ref.id}>可核验出处</label><input id={'paper-ref-locator-'+ref.id} maxLength={2000} value={ref.locator} onChange={e=>updateRef(ref.id,{locator:e.target.value})} placeholder="DOI、出版社、官方链接、条文位置或案号"/></div>
            <div className="paper-field"><label htmlFor={'paper-ref-note-'+ref.id}>阅读摘要 / 引用理由</label><textarea id={'paper-ref-note-'+ref.id} rows={2} maxLength={6000} value={ref.note} onChange={e=>updateRef(ref.id,{note:e.target.value})} placeholder="这项资料能够支持论文的哪一个观点？有哪些局限？"/></div>
          </div>
          <label className="paper-verify"><input type="checkbox" checked={ref.verified} onChange={e=>markVerified(ref,e.target.checked)}/><span>我已自行核验来源及对应论点；若为法律依据，也已核验适用版本和效力。</span></label>
        </section>)}</div>}
    </div>}
    <div className="paper-bottom">
      <div className="paper-bottom-note"><ShieldCheck size={17}/><p>本版本不生成论文正文、不自动查找或验证文献。所有研究内容仅保存在当前设备的浏览器内，不会上传到服务器；请定期下载 JSON 备份。引用格式、AI 使用规范与学术诚信要求以所在学校规定为准。</p></div>
      <button type="button" className="btn subtle" onClick={reset}><RotateCcw size={15}/> 新建空白论文</button>
    </div>
  </div>;
}
