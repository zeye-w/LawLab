import { useEffect,useState,type ChangeEvent,type Dispatch,type SetStateAction } from 'react';
import { BookOpenCheck,FileUp,KeyRound,LoaderCircle,ShieldCheck,ShieldAlert,ArrowRight,ExternalLink } from 'lucide-react';
import type { ExtractedPDF } from '../lib/pdfExtract';
import { MAX_PDF_BYTES } from '../lib/pdfLimits';
import {MAX_REFERENCES,type PaperProject,type PaperReference} from '../lib/paper';
import {MODEL_ID,type VerifiedClaim} from '../../worker/grounding';
import './ai.css';

type Props={paper:PaperProject;setPaper:Dispatch<SetStateAction<PaperProject>>;goToLogic:()=>void};
type AnalysisReply={claims:VerifiedClaim[];checkedPages:number[];model:string;notice:string};
function uid():string{
  return typeof crypto!=='undefined'&&'randomUUID' in crypto
    ?crypto.randomUUID()
    :Date.now()+'-'+Math.random().toString(36).slice(2);
}
export function AIAnalysis({paper,setPaper,goToLogic}:Props){
  const [file,setFile]=useState<ExtractedPDF|null>(null);
  const [busy,setBusy]=useState(false);
  const [accessCode,setAccessCode]=useState('');
  const [error,setError]=useState('');
  const [result,setResult]=useState<AnalysisReply|null>(null);
  const [added,setAdded]=useState<string[]>([]);
  const [configured,setConfigured]=useState<boolean|null>(null);
  useEffect(()=>{
    let live=true;
    fetch('/api/ai/status',{cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{if(live)setConfigured(data?.configured===true);})
      .catch(()=>{if(live)setConfigured(false);});
    return ()=>{live=false;};
  },[]);
  async function pickFile(event:ChangeEvent<HTMLInputElement>){
    const item=event.target.files?.[0];event.target.value='';
    setResult(null);setAdded([]);setError('');setFile(null);
    if(!item)return;
    setBusy(true);
    // pdf.js is large, so it is only downloaded once someone actually picks a PDF.
    try{const {extractPdfPages}=await import('../lib/pdfExtract');setFile(await extractPdfPages(item));}
    catch(e){setError(e instanceof Error?e.message:'PDF 解析失败，请更换文件。');}
    finally{setBusy(false);}
  }
  async function analyze(){
    if(!file||busy)return;
    if(!accessCode.trim()){setError('请输入管理员提供的 AI 访问码。');return;}
    setError('');setResult(null);setAdded([]);setBusy(true);
    try{
      const response=await fetch('/api/ai/analyze',{
        method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessCode.trim()},
        body:JSON.stringify({question:paper.question.slice(0,600),passages:file.passages})
      });
      const body:unknown=await response.json();
      if(!response.ok){
        const msg=body&&typeof body==='object'&&'error' in body&&typeof body.error==='string'
          ?body.error:'AI API 请求失败（HTTP '+response.status+'）。';
        throw new Error(msg);
      }
      if(!body||typeof body!=='object'||!('claims' in body)||!Array.isArray(body.claims)||
        !('checkedPages' in body)||!Array.isArray(body.checkedPages))throw new Error('模型响应格式有误。');
      const found=body as AnalysisReply;
      setResult(found);
    }catch(e){
      setError(e instanceof SyntaxError?'AI API 尚未上线或返回了非 JSON 内容。请确认 Cloudflare Worker 已部署。':
        e instanceof Error?e.message:'AI 分析失败，请稍后重试。');
    }finally{setBusy(false);}
  }
  function addClaim(claim:VerifiedClaim){
    if(!file||paper.references.length>=MAX_REFERENCES)return;
    const key=claim.page+'|'+claim.quote;
    if(added.includes(key))return;
    const ref:PaperReference={
      id:'ai-'+uid(),type:'期刊论文',
      citation:'【待补充书目信息】'+file.fileName.slice(0,150),
      locator:'本地 PDF · 第 '+claim.page+' 页（非正式文献引注）',
      note:'由 '+MODEL_ID+' 辅助提取；仅核查引文在给定页出现，尚需人工阅读原文、核实观点和论文出处。',
      verified:false,
      research:{stance:claim.stance,claim:claim.claim,
        evidence:'第 '+claim.page+' 页，原文片段：'+claim.quote,
        limitation:claim.limitation}
    };
    setPaper(old=>old.references.length>=MAX_REFERENCES?old:{...old,references:[...old.references,ref]});
    setAdded(old=>[...old,key]);
  }
  return <div className="paper-ai">
    <section className="panel paper-panel">
      <div className="panel-head"><div><span className="eyebrow">V0.4 / CLOUDFLARE WORKERS AI</span><h2>AI 文献观点提取</h2></div><BookOpenCheck size={22}/></div>
      <p className="paper-help">上传有权分析的文字型 PDF。浏览器只发送提取的部分页面文本给 Cloudflare Workers AI 中的 Qwen 模型；PDF 文件本身不会上传服务器。AI 分析不是正式法律意见或论文引文核验。</p>
      <div className="ai-status" aria-live="polite">
        <span className={configured===true?'ai-status-dot ready':'ai-status-dot'}/>
        {configured===null?'正在查询 API 状态…':configured?'模型接口已配置，可以提交带访问码的分析请求。':'AI 接口尚未在当前站点启用；需要部署带 Workers AI Binding 的 Worker，并配置访问码。'}
      </div>
      <div className="ai-input-grid">
        <label className="ai-upload">
          <FileUp size={27}/>
          <strong>{file?file.fileName:'选择 PDF 文献'}</strong>
          <span>{file?'已解析 '+file.passages.length+' 页（文档共 '+file.totalPages+' 页）':'不超过 '+Math.round(MAX_PDF_BYTES/1024/1024)+' MB · 文字型 PDF'}</span>
          <input type="file" accept=".pdf,application/pdf" aria-label="选择需要分析的 PDF 文件" onChange={pickFile} disabled={busy}/>
        </label>
        <div className="ai-access">
          <label htmlFor="ai-access-code"><KeyRound size={16}/> AI 访问码（仅内存保存）</label>
          <input id="ai-access-code" type="password" autoComplete="off" value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="输入站点管理员配置的访问码"/>
          <div className="ai-source-stat">当前研究问题：{paper.question.trim()?paper.question.slice(0,120):'未设置，将分析文献的一般核心观点。'}</div>
          <button className="btn primary" type="button" disabled={!file||busy||configured===false} onClick={analyze}>
            {busy?<LoaderCircle size={16}/>:<BookOpenCheck size={16}/>}
            {busy?'正在处理…':'开始 AI 提取'} <ArrowRight size={15}/>
          </button>
        </div>
      </div>
      {file&&<div className="ai-extraction-note"><ShieldAlert size={16}/> 当前原型最多分析前 12 页的部分文字，已提取约 {file.sampledCharacters.toLocaleString('zh-CN')} 字符；未覆盖全部页面时不能声称完成了全文分析。扫描版 PDF 尚不支持 OCR。</div>}
      {error&&<div className="paper-message paper-message-error" role="alert">{error}</div>}
      <div className="paper-note"><ShieldCheck size={16}/> 访问码不保存到浏览器持久化存储，服务端不应记录文献文本。公开站点必须先设置访问控制和费用额度；免费 Neurons 超限时请求可能失败。</div>
    </section>
    {result&&<section className="panel paper-panel">
      <div className="panel-head"><div><span className="eyebrow">SOURCE-CONSTRAINED EXTRACTION</span><h2>可定位的观点卡</h2></div><span className="pill pill-blue">{result.claims.length} 条</span></div>
      <p className="paper-help">以下观点通过了页码与逐字引文匹配检查，但尚未验证模型的概括是否准确。加入资料库后全部保持「待核验」状态，需要人工确认文献的真实作者、题名和观点。</p>
      {result.claims.length===0?<div className="paper-empty"><ShieldAlert size={27}/><strong>没有通过原文引文检查的观点</strong><p>可能是提取页数不足、PDF 排版有误或模型没有返回逐字引文。试试更清晰的文字型 PDF。</p></div>:
        <div className="ai-cards">{result.claims.map((claim,i)=>{
          const key=claim.page+'|'+claim.quote;
          return <article key={key} className="ai-claim">
            <div className="ai-claim-top"><span className="eyebrow">POINT {String(i+1).padStart(2,'0')} · PDF P.{claim.page}</span><span className="ai-evidence-pass"><ShieldCheck size={14}/> 原文片段匹配</span></div>
            <strong>{claim.claim}</strong>
            <blockquote>{claim.quote}</blockquote>
            <p className="ai-limitation"><b>局限或待核验事项：</b>{claim.limitation||'需人工审查。'}</p>
            <button className="btn outline" type="button" disabled={added.includes(key)||paper.references.length>=MAX_REFERENCES} onClick={()=>addClaim(claim)}>{added.includes(key)?'已添加（待核验）':'加入参考资料与观点矩阵'}</button>
          </article>;
        })}</div>}
      <div className="ai-next"><span>已有 {paper.references.length} 条资料记录；请先核对原始 PDF，再用于论文论证。</span><button className="btn primary" type="button" onClick={goToLogic}>继续到观点与逻辑 <ArrowRight size={15}/></button></div>
    </section>}
    <div className="paper-bottom-note"><ExternalLink size={16}/><p>模型：{MODEL_ID}。本功能只提交部分 PDF 页文本以控制免费额度；对于扫描版、页码错位和没有确切来源依据的结果，不应当作论文引用。</p></div>
  </div>;
}
