import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, FileSearch, FileText, Search, ShieldCheck, Upload } from 'lucide-react';
import { importContractFile } from '../../lib/contractImport';
import type { ContractFinding } from '../../lib/contractRules';
import {
  canAssessMissingClauses, currentReviewFindings, initialContractWorkspace, selectReviewFinding,
  withDocumentScope, withEditedContract, withImportedContract, withReviewedContract, withSampleContract
} from '../../lib/contracts/workspace';
import type {ContractDocumentScope} from '../../lib/contracts/workspace';
import { locateRisk } from '../../lib/contracts/locateRisk';
import '../graphs.css';

/** Contract-only UI: keep contract data out of shared App state and out of persistent storage. */
function RiskPill({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'red'|'amber'|'green'}){
  return <span className={'pill pill-'+tone}>{children}</span>;
}
function ContractNotice({children}:{children:ReactNode}){
  return <div className="notice"><ShieldCheck size={17} aria-hidden="true"/><div>{children}</div></div>;
}
function integrityLabel(value:'complete'|'needs-review'|'blocked'){
  return value==='complete'?'文本已提取':value==='needs-review'?'需人工核对完整性':'无法安全审查';
}
export function ContractWorkspace(){
  const [state,setState]=useState(initialContractWorkspace);
  const [uploadError,setUploadError]=useState('');
  const [importing,setImporting]=useState(false);
  const editorRef=useRef<HTMLTextAreaElement>(null);
  // While a finding is shown in the editor it is read-only: a stray key must not replace the
  // selected clause, and phones do not raise the keyboard for a read-only field.
  const [inspecting,setInspecting]=useState(false);
  const source=state.source;
  const findings=currentReviewFindings(state);
  const current:ContractFinding|undefined=findings?.find(f=>f.id===state.selectedFindingId)??findings?.[0];
  const high=findings?.filter(f=>f.severity==='high').length??0;
  const highlighted=current?locateRisk(source.text,current):null;

  function focusFinding(finding:ContractFinding){
    setState(old=>selectReviewFinding(old,finding.id));
    const location=locateRisk(source.text,finding);
    if(!location)return;
    requestAnimationFrame(()=>{
      const editor=editorRef.current;
      if(!editor||editor.value.slice(location.start,location.end)!==finding.quote)return;
      editor.readOnly=true;setInspecting(true);
      editor.focus({preventScroll:true});
      editor.setSelectionRange(location.start,location.end);
      editor.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });
  }
  function changeText(value:string){
    setState(old=>withEditedContract(old,value));
    setUploadError('');
  }
  async function upload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file||importing)return;
    setImporting(true);setUploadError('');
    try{
      const imported=await importContractFile(file);
      setState(old=>withImportedContract(old,imported));
    }catch(error){
      // Never replace the previous document with a partially decoded file.
      setUploadError(error instanceof Error?error.message:'文件读取失败，请更换文件。');
    }finally{setImporting(false);}
  }
  return <>
    <div className="page-heading">
      <div><div className="eyebrow">MODULE 06 / CONTRACT REVIEW</div>
        <h1>合同审查工作台</h1>
        <p>支持 TXT、DOC、DOCX、文字型 PDF，本地提取正文并运行可解释规则筛查。</p>
      </div>
      <span className="pill pill-amber">规则演示 · 非 AI</span>
    </div>
    <div className="layout-split contracts-layout">
      <div className="panel">
        <div className="panel-head">
          <h2>合同文本</h2><span className="muted tiny">仅在浏览器内处理</span>
        </div>
        <textarea ref={editorRef} className="contract-text" aria-label="需要审查的合同文本" spellCheck={false}
          value={source.text} disabled={importing} readOnly={inspecting}
          onPointerDown={()=>setInspecting(false)} onBlur={()=>setInspecting(false)}
          onChange={e=>changeText(e.target.value)} placeholder="在这里粘贴脱敏后的合同文本…"/>
        {current&&highlighted&&<div className="contract-match-preview" role="status">
          <strong>风险对应原文 · 点击右侧风险可定位并选中左侧正文{inspecting?'（定位中为只读，点击正文即可继续编辑）':''}</strong>
          <p>{source.text.slice(highlighted.snippetStart,highlighted.start)}<mark>{source.text.slice(highlighted.start,highlighted.end)}</mark>{source.text.slice(highlighted.end,highlighted.snippetEnd)}</p>
          <small>仅突出当前文本版本的精确规则命中片段；不是整条款法律效力判断。</small>
        </div>}
        {current&&!highlighted&&<p className="muted tiny">当前选中项目是全文缺失检查或无法核验的匹配结果，没有可高亮的具体原文。</p>}
        <div className="contract-actions">
          <label htmlFor="contract-document-scope" className="muted tiny">提供的合同材料范围</label>
          <select id="contract-document-scope" aria-label="提供的合同材料范围"
            value={source.documentScope} disabled={importing}
            onChange={e=>setState(old=>withDocumentScope(old,e.target.value as ContractDocumentScope))}>
            <option value="unknown">尚未确认是否为完整合同</option>
            <option value="excerpt">仅提供了合同片段</option>
            <option value="whole">我确认已提供整份合同正文</option>
          </select>
        </div>
        <p className="muted tiny">文件文字提取是否完整与所提供材料是否包含整份合同分别判断。只有用户确认整份正文且没有已知提取缺口，才进行“缺少争议解决约定”等负面筛查。</p>
        <div className="contract-actions">
          <label className="btn outline file-upload"><Upload size={16}/>
            {importing?'正在解析文件…':'导入 TXT / DOC / DOCX / PDF'}
            <input type="file" accept=".txt,.doc,.docx,.pdf,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={importing} onChange={upload}/>
          </label>
          <button className="btn subtle" disabled={importing} onClick={()=>{setState(withSampleContract);setUploadError('');}}>载入示例</button>
          <button className="btn primary" disabled={!source.text.trim()||importing||source.integrity==='blocked'}
            onClick={()=>setState(withReviewedContract)}><Search size={16}/> 开始审查</button>
        </div>
        <div className="notice" role="status">
          <FileText size={17} aria-hidden="true"/>
          <div>
            <strong>{source.name?'已导入 '+source.name:source.origin==='sample'?'已载入虚构示例':'当前编辑文本'}</strong>
            {' · '+source.text.length.toLocaleString('zh-CN')+' 字符'}
            {source.pages!==undefined?' · PDF 共 '+source.pages+' 页':''}
            {source.origin==='sample'||source.origin==='pasted'
              ?<p>来源：示例或手动输入的文本，审查范围就是编辑区的全部内容。</p>
              :<p>来源状态：{integrityLabel(source.integrity)}。{source.integrity==='needs-review'
                ?'审查只能覆盖当前可见的提取文本，不能代表整份原件已被完整识别。'
                :source.integrity==='blocked'?'该来源不能用于规则审查。':'请核对原始文件与编辑区正文是否一致。'}</p>}
            {source.pageSpans&&<p>已建立 {source.pageSpans.length} 个 PDF 物理页的文本范围映射；修改正文后映射会失效。</p>}
            <p>合同材料范围：{source.documentScope==='whole'?'声明整份合同正文':source.documentScope==='excerpt'?'仅合同片段':'尚未确认'}。</p>
            {source.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
          </div>
        </div>
        {uploadError&&<p role="alert" className="input-error">{uploadError}</p>}
        <p className="muted tiny">单文件最大 8 MB，PDF 最多 80 页；解析和规则审查仅在当前浏览器内完成，不上传合同，也不调用论文 AI。扫描 PDF 需先 OCR。请仅使用虚构或已脱敏、已获授权的内容。</p>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">REVIEW FINDINGS</div><h2>风险提示</h2></div>
          {findings&&<RiskPill tone={high?'red':'amber'}>{findings.length} 项待核查</RiskPill>}
        </div>
        {findings!==null&&!canAssessMissingClauses(source)&&<p className="muted tiny" role="status">目前仅展示已命中的风险；因合同范围未确认或文字提取可能不完整，暂不判断整份合同是否缺少必要条款。</p>}
        {findings===null
          ?<div className="empty-review"><FileSearch size={40} strokeWidth={1.3}/>
            <h3>从一份合同开始</h3><p>导入文件、粘贴文本或使用示例，点击「开始审查」查看规则结果。</p></div>
          :findings.length===0
            ?<div className="empty-review"><CheckCircle2 size={36}/><h3>未命中当前预设规则</h3>
              <p>这并不代表合同无风险。规则覆盖范围有限，需要逐条人工审查。</p></div>
            :<>
              <div className="findings-list">
                {findings.map(f=><button key={f.id}
                  className={'finding '+(current?.id===f.id?'finding-active':'')}
                  onClick={()=>focusFinding(f)}>
                  <span className={'risk-line risk-'+f.severity}/>
                  <span className="grow"><strong>{f.title}</strong>
                    <small>{f.quote?'“'+f.quote.slice(0,44)+(f.quote.length>44?'…':'')+'”':'文本未检测到明确约定'}</small>
                  </span>
                  <RiskPill tone={f.severity==='high'?'red':'amber'}>{f.severity==='high'?'高关注':'需关注'}</RiskPill>
                </button>)}
              </div>
              {current&&<div className="finding-detail">
                <div className="eyebrow">SELECTED FINDING</div><h3>{current.title}</h3>
                <p><strong>为什么需要关注</strong><br/>{current.reason}</p>
                <p><strong>审查与修改方向</strong><br/>{current.suggestion}</p>
                {current.quote&&<div className="quoted">匹配文本：{current.quote}</div>}
              </div>}
            </>
        }
      </div>
    </div>
    <ContractNotice>当前仍是透明正则规则筛查，不构成律师审查意见。文件文字无法提取的部分不在审查范围内；未检出风险不等于合法、有效或公平。</ContractNotice>
  </>;
}
