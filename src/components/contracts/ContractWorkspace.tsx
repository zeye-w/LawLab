import { useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, FileSearch, FileText, Search, ShieldCheck, Upload } from 'lucide-react';
import { importContractFile } from '../../lib/contractImport';
import type { ContractFinding } from '../../lib/contractRules';
import {
  currentReviewFindings, initialContractWorkspace, selectReviewFinding,
  withEditedContract, withImportedContract, withReviewedContract, withSampleContract
} from '../../lib/contracts/workspace';

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
  const source=state.source;
  const findings=currentReviewFindings(state);
  const current:ContractFinding|undefined=findings?.find(f=>f.id===state.selectedFindingId)??findings?.[0];
  const high=findings?.filter(f=>f.severity==='high').length??0;

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
        <textarea className="contract-text" aria-label="需要审查的合同文本" spellCheck={false}
          value={source.text} disabled={importing}
          onChange={e=>changeText(e.target.value)} placeholder="在这里粘贴脱敏后的合同文本…"/>
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
            <p>来源状态：{integrityLabel(source.integrity)}。{source.integrity==='needs-review'
              ?'审查只能覆盖当前可见的提取文本，不能代表整份原件已被完整识别。'
              :'请核对原始文件与编辑区正文是否一致。'}</p>
            {source.pageSpans&&<p>已建立 {source.pageSpans.length} 个 PDF 物理页的文本范围映射；修改正文后映射会失效。</p>}
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
                  onClick={()=>setState(old=>selectReviewFinding(old,f.id))}>
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
