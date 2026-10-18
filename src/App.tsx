import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check,
  CheckCircle2, ChevronRight, CircleHelp, FileSearch,
  FileText, GitBranch, GraduationCap, Landmark, LayoutGrid, Menu, Network,
  Plus, RotateCcw, Scale, ShieldCheck, Trash2, X, BrainCircuit, BriefcaseBusiness, Layers3, NotebookPen
} from 'lucide-react';
import { COURT_PHASES, DEFENDANT_PHASES, EVIDENCE, QUIZ } from './data/cases';
import { ContractWorkspace } from './components/contracts/ContractWorkspace';
import { EvidenceProofGraph } from './components/EvidenceProofGraph';
import { INITIAL_EVENTS, sortTimeline, timelineToCsv, type EventType, type TimelineEvent } from './lib/timeline';
import { Flashcards, KnowledgeGraph } from './components/StudyTools';
import { PaperWorkspace } from './components/PaperWorkspace';

type ModuleId = 'home' | 'learn' | 'practice' | 'litigation' | 'nonlit' | 'flashcards' | 'knowledge' | 'paper' | 'court' | 'reasoning' | 'evidence' | 'quiz' | 'timeline' | 'contracts';
type ToolId = Exclude<ModuleId, 'home' | 'learn' | 'practice' | 'litigation' | 'nonlit'>;
type ModuleIcon = typeof Landmark;
const MODULES: { id: ToolId; label: string; subtitle: string; description: string; icon: ModuleIcon; color: string }[] = [
  { id: 'flashcards', label: '记忆卡片', subtitle: 'ACTIVE RECALL', description: '主动回忆、翻面核对、记录已掌握和待复习的知识。', icon: BrainCircuit, color: 'blue' },
  { id: 'knowledge', label: '知识图谱', subtitle: 'KNOWLEDGE GRAPH', description: '通过互动概念地图连接法律规范、事实和证据。', icon: Layers3, color: 'green' },
  { id: 'paper', label: '论文写作', subtitle: 'ACADEMIC WRITING', description: '整理研究问题、撰写章节、管理与核验参考资料。', icon: NotebookPen, color: 'sand' },
  { id: 'court', label: '模拟法庭', subtitle: 'MOOT COURT', description: '扮演诉讼代理人，体验陈述、举证、质证与总结。', icon: Landmark, color: 'slate' },
  { id: 'reasoning', label: '法律推理', subtitle: 'LEGAL REASONING', description: '沿着请求权基础与构成要件，梳理法律问题。', icon: GitBranch, color: 'blue' },
  { id: 'evidence', label: '证据链实验室', subtitle: 'EVIDENCE LAB', description: '关联事实与证据，识别相互支持和证明缺口。', icon: Network, color: 'green' },
  { id: 'quiz', label: '法学闯关', subtitle: 'LEGAL QUIZ', description: '完成原创情境题，获得即时反馈和知识回顾。', icon: GraduationCap, color: 'lavender' },
  { id: 'timeline', label: '案件时间线', subtitle: 'CASE TIMELINE', description: '编辑事实与程序节点，查看证据并导出时间线。', icon: CalendarDays, color: 'sand' },
  { id: 'contracts', label: '合同审查', subtitle: 'CONTRACT REVIEW', description: '支持 TXT、DOC、DOCX 和文字型 PDF 本地导入，以可解释规则筛查条款风险。', icon: FileSearch, color: 'rose' }
];
const DEEP_LINKS = new Set<ModuleId>(['home','learn','practice','litigation','nonlit','flashcards','knowledge','paper','court','reasoning','evidence','quiz','timeline','contracts']);
function getHashPage(): ModuleId {
  const value = window.location.hash.slice(1) as ModuleId;
  return DEEP_LINKS.has(value) ? value : 'home';
}
// Animation marks are cleared on animationend, which never fires when motion is reduced, so don't set them then.
function motionAllowed():boolean{ return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function useBrowserState<T>(key: string, initial: T): [T, (value: T | ((old: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* storage may be unavailable */ } }, [key, state]);
  return [state, setState];
}
function downloadText(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function PageHeading({ eyebrow, title, description, right }: { eyebrow: string; title: string; description: string; right?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{right}</div>;
}
function Notice({ children, icon = CircleHelp }: { children: ReactNode; icon?: ModuleIcon }) {
  const Icon = icon;
  return <div className="notice"><Icon size={17} aria-hidden="true"/><div>{children}</div></div>;
}
function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function Placeholder({ children }: { children: ReactNode }) { return <div className="placeholder">{children}</div>; }
function ModuleTiles({ ids, navigate }: { ids: ToolId[]; navigate: (id: ModuleId) => void }) {
  return <section className="module-grid" aria-label="可使用的功能模块">{ids.map((id, i) => {
    const m = MODULES.find(item=>item.id===id)!;
    const Icon=m.icon;
    return <button key={id} className={`module-card module-${m.color}`} onClick={()=>navigate(id)}>
      <span className="module-card-top"><span className="module-symbol"><Icon size={23} strokeWidth={1.65}/></span><span className="module-number">{String(i+1).padStart(2,'0')}</span></span>
      <span className="module-en">{m.subtitle}</span><span className="module-title">{m.label}</span><span className="module-description">{m.description}</span>
      <span className="module-footer">进入模块 <ArrowRight size={16}/></span>
    </button>;
  })}</section>;
}
function EntryCard({ icon: Icon, overline, title, description, callout, onClick, accent } : {
  icon: ModuleIcon; overline: string; title: string; description: string; callout: string; onClick: () => void; accent: 'study'|'work'
}) {
  return <button className={`entry-card entry-${accent}`} onClick={onClick}>
    <span className="entry-head"><span className="entry-icon"><Icon size={27} strokeWidth={1.6}/></span><ArrowRight size={20}/></span>
    <span className="entry-overline">{overline}</span>
    <strong>{title}</strong><span className="entry-description">{description}</span>
    <span className="entry-action">{callout} <ArrowRight size={16}/></span>
  </button>;
}
function ModuleHome({ navigate }: { navigate: (id: ModuleId) => void }) {
  return <>
    <section className="hero portal-hero">
      <div className="hero-overline"><span className="hero-dot"/> LAWLAB · LEARN & PRACTICE</div>
      <h1>从理解法律，<br/><em>到运用法律。</em></h1>
      <p>一个项目，两种工作方式。学生版帮你记忆知识、理解概念、练习推理；专业版按诉讼与非诉业务组织实务工具。</p>
      <div className="hero-art" aria-hidden="true"><div className="art-card art-a"><GraduationCap size={27}/><span>LEARN</span></div><div className="art-line"/><div className="art-card art-b"><BriefcaseBusiness size={24}/><span>PRACTICE</span></div></div>
    </section>
    <div className="section-line"><div><span className="index-label">CHOOSE YOUR SPACE / 02</span><h2>选择工作台</h2></div><p>两种版本共享基础能力，不重复建设。</p></div>
    <div className="entry-grid">
      <EntryCard icon={GraduationCap} overline="01 / LAWLAB LEARN" title="学生版" description="记忆卡片、知识图谱、论文写作、案例练习与模拟法庭，贯通学习和研究。" callout="进入学习空间" accent="study" onClick={()=>navigate('learn')}/>
      <EntryCard icon={BriefcaseBusiness} overline="02 / LAWLAB PRACTICE" title="专业版" description="按诉讼与非诉业务整理证据、时间线和合同审查流程。当前仅供示例训练与工作流演示。" callout="进入实务空间" accent="work" onClick={()=>navigate('practice')}/>
    </div>
    <Notice icon={ShieldCheck}>当前为浏览器本地演示版：学习和案件数据只保存在本机，仅论文「文献检索」会把检索词发送到 Crossref；学生与专业模式不需要账号，案例均为虚构；专业版不应上传或处理真实客户敏感材料，也不提供正式法律意见。</Notice>
  </>;
}
const PORTAL_TOOLS: Record<'learn'|'litigation'|'nonlit',ToolId[]> = {
  learn:['flashcards','knowledge','paper','quiz','reasoning','court'],
  litigation:['evidence','timeline','reasoning','court'],
  nonlit:['contracts']
};
function Portal({ kind, navigate }: { kind: 'learn'|'practice'|'litigation'|'nonlit'; navigate:(id:ModuleId)=>void }) {
  if (kind==='practice') return <>
    <PageHeading eyebrow="LAWLAB PRACTICE / CHOOSE PRACTICE" title="专业版 · 实务工作台" description="先选择业务领域。诉讼以案件事实和证据为主线；非诉以合同与交易风险为主线。"/>
    <div className="entry-grid">
      <EntryCard icon={Landmark} overline="LITIGATION / 诉讼" title="诉讼业务" description="组织待证事实与证据链，整理程序时间线、请求权与抗辩，并开展庭审情境演练。" callout="进入诉讼工作台" accent="study" onClick={()=>navigate('litigation')}/>
      <EntryCard icon={FileText} overline="NON-LITIGATION / 非诉" title="非诉业务" description="基于本地透明规则审查示例合同条款，识别需要进一步核对的风险及修改方向。" callout="进入非诉工作台" accent="work" onClick={()=>navigate('nonlit')}/>
    </div>
    <Notice icon={ShieldCheck}>专业版当前为流程原型，没有客户权限管理、律师复核记录或专业级 AI 审查。请仅使用虚构及脱敏示例。</Notice>
  </>;
  const data={
    learn:{eyebrow:'LAWLAB LEARN / STUDENT',title:'学生版 · 学习空间',description:'先回忆概念，再建立知识联系，最后通过案例练习运用。',back:'home' as ModuleId,backLabel:'返回双版本首页'},
    litigation:{eyebrow:'LAWLAB PRACTICE / LITIGATION',title:'诉讼业务工作台',description:'以待证事实为线索，关联证据、时间线、请求权及庭审准备。',back:'practice' as ModuleId,backLabel:'返回专业版'},
    nonlit:{eyebrow:'LAWLAB PRACTICE / NON-LITIGATION',title:'非诉业务工作台',description:'从合同条款入手，提示风险、审查理由及可讨论的修改方向。',back:'practice' as ModuleId,backLabel:'返回专业版'}
  }[kind];
  return <>
    <button className="portal-back" onClick={()=>navigate(data.back)}><ArrowLeft size={16}/>{data.backLabel}</button>
    <PageHeading eyebrow={data.eyebrow} title={data.title} description={data.description}/>
    <div className="section-line"><div><span className="index-label">TOOLS / {String(PORTAL_TOOLS[kind].length).padStart(2,'0')}</span><h2>可用工具</h2></div></div>
    <ModuleTiles ids={PORTAL_TOOLS[kind]} navigate={navigate}/>
    {kind==='nonlit'&&<div className="upcoming-tools"><div><span className="eyebrow">COMING LATER</span><h3>下一阶段方向</h3></div><span>合同修订对比</span><span>法律尽职调查</span><span>合规审查</span></div>}
    <Notice icon={ShieldCheck}>{kind==='learn'?'本地学习记录仅保存在此设备；此版本的学习内容不能代替查阅现行有效法律。':'只用于虚构案例与功能演示，不处理真实委托案件；分析结果不能替代专业人员复核。'}</Notice>
  </>;
}

function Court() {
  const [role,setRole] = useState<'plaintiff' | 'defendant'>('plaintiff');
  const [step,setStep] = useState(0);
  const [answers,setAnswers] = useState<Array<number | null>>([null,null,null,null]);
  const phases = role === 'plaintiff' ? COURT_PHASES : DEFENDANT_PHASES;
  const phase = phases[step];
  const answer = answers[step];
  const completed = answers.every(value => value !== null);
  // Feedback animation belongs to the answer just given, not to every later visit of that step.
  const [feedbackKey,setFeedbackKey] = useState<string|null>(null);
  function choose(index: number) { setAnswers(old => old.map((x,i) => i===step?index:x)); if(motionAllowed())setFeedbackKey(`${role}-${step}-${index}`); }
  function reset(nextRole: 'plaintiff' | 'defendant' = role) { setRole(nextRole); setStep(0); setAnswers([null,null,null,null]); }
  return <>
    <PageHeading eyebrow="MODULE 01 / MOOT COURT" title="模拟法庭" description="围绕同一件虚构买卖合同纠纷，练习结构化陈述与证据质证。" right={<Pill tone="blue">情境演练</Pill>}/>
    <div className="stack"><div className="toolbar"><span className="toolbar-label">你的角色</span><div className="segmented"><button className={role==='plaintiff'?'selected':''} onClick={()=>reset('plaintiff')}>原告代理人</button><button className={role==='defendant'?'selected':''} onClick={()=>reset('defendant')}>被告代理人</button></div></div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">CASE / 001</span><h2>一份迟到的设备订单</h2></div><Pill>虚构案例</Pill></div>
      <p>双方约定交付一批设备，买方已支付预付款。交付日期到来后，双方对是否已协商延期产生争议。以下演练仅检查论证策略，不预测裁判结果。</p>
      <div className="step-track">{phases.map((p,i)=><button title={`转到${p.title}`} aria-label={`转到第${i+1}阶段：${p.title}`} aria-current={i===step?'step':undefined} key={p.title} className={i===step?'current':answers[i]!==null?'done':''} onClick={()=>setStep(i)}><span>{answers[i]!==null?<Check size={14}/>:i+1}</span><small>{p.title}</small></button>)}</div>
      <div className="court-scene"><span className="court-scene-label">SESSION {String(step+1).padStart(2,'0')} / 04</span><Landmark size={46} strokeWidth={1.25}/><div>{phase.title}</div></div>
      <h3 className="question">{phase.prompt}</h3><div className="choice-list">{phase.choices.map((opt,i)=><button key={i} className={`choice ${answer===i?'choice-selected':''} ${answer===i&&feedbackKey===`${role}-${step}-${i}`?(opt.emphasis==='good'?'choice-pulse':'choice-shake'):''}`} onAnimationEnd={e=>{if(e.target===e.currentTarget)setFeedbackKey(null);}} onClick={()=>choose(i)}><span className="choice-letter">{String.fromCharCode(65+i)}</span><span>{opt.label}</span>{answer===i&&<CheckCircle2 size={18}/>}</button>)}</div>
      {answer!==null && <div className={`feedback ${phase.choices[answer].emphasis==='good'?'positive':'caution'}`} role="status"><strong>即时反馈</strong><p>{phase.choices[answer].feedback}</p></div>}
      <div className="panel-actions"><button className="btn subtle" disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> 上一步</button><div className="action-side">{completed && <Pill tone="green">四个阶段已作答</Pill>}{step<3?<button className="btn primary" disabled={answer===null} onClick={()=>setStep(s=>s+1)}>下一阶段 <ArrowRight size={16}/></button>:<button className="btn outline" onClick={()=>reset()}><RotateCcw size={16}/> 重新演练</button>}</div></div>
    </section><Notice>这是预设情境反馈，不是真人法官或实时 AI。正式法律结论需结合适用法律、完整案卷和程序规则。</Notice></div>
  </>;
}
const REASON_QUESTIONS = [
  { title:'合同是否成立？', hint:'先核对当事人、意思表示、合同文本及可能影响成立的其他事实。', choices:[['成立','有合同文本和签署/合意线索。'],['不成立','需重新识别可能的其他请求权基础。'],['尚不清楚','继续收集签署、聊天记录等材料。']] },
  { title:'付款义务是否履行？', hint:'确认付款数额、账户主体、付款节点与价款约定。', choices:[['已经付款','核对款项是否对应这份合同。'],['尚未付款','注意对履行顺序及责任判断的影响。'],['证据不足','需核对原始付款凭证与对账记录。']] },
  { title:'交付义务是否履行？', hint:'核对合同期限、交付记录、通知及签收事实。', choices:[['未按约交付','应继续核实迟延原因及合同约定。'],['已经交付','核对交付内容是否符合约定。'],['存在争议','需要物流、签收和沟通等证据。']] },
  { title:'是否存在影响请求的抗辩？', hint:'检查延期合意、同时履行抗辩、不可抗力等是否被主张并有相应依据。', choices:[['提出了具体抗辩','还要逐项核对事实和法律构成要件。'],['暂未提出','仍须考虑已知材料中的相关事实。'],['尚不清楚','补充对方答辩与证据材料。']] }
] as const;
function Reasoning() {
  const [selected,setSelected] = useState<Array<number | null>>([null,null,null,null]);
  const [step,setStep] = useState(0);
  const answer = selected[step];
  const stopped = step === 0 && answer !== null && answer !== 0;
  const canNext = step<3 && answer !== null && !stopped;
  function choose(v:number) { setSelected(old=>old.map((x,i)=>i===step?v:i>step?null:x)); }
  function restart(){ setSelected([null,null,null,null]);setStep(0); }
  return <>
    <PageHeading eyebrow="MODULE 02 / LEGAL REASONING" title="法律推理决策树" description="先明确请求权基础，再检查事实、要件、反证与抗辩。"/>
    <div className="layout-split"><div className="panel">
      <div className="eyebrow">CLAIM ANALYSIS / STEP {String(step+1).padStart(2,'0')}</div><h2 className="panel-title">{REASON_QUESTIONS[step].title}</h2><p>{REASON_QUESTIONS[step].hint}</p>
      <div className="choice-list spaced">{REASON_QUESTIONS[step].choices.map((choice,i)=><button key={i} className={`choice ${answer===i?'choice-selected':''}`} onClick={()=>choose(i)}><span className="choice-letter">{String.fromCharCode(65+i)}</span><span><strong>{choice[0]}</strong><small>{choice[1]}</small></span>{answer===i&&<CheckCircle2 size={18}/>}</button>)}</div>
      {stopped&&<div className="feedback caution"><strong>当前分支需要进一步确认</strong><p>合同成立是合同请求权分析的重要前提。当前答案不足以沿原路径继续；可以补充事实或改从其他请求权基础分析。这不是案件败诉结论。</p></div>}
      {step===3&&answer!==null&&<div className="feedback positive"><strong>本次分析路径已完成</strong><p>已记录四个判断节点。下一步应逐项对应具体法律依据、证据与相反解释，而不能仅凭勾选得出胜负判断。</p></div>}
      <div className="panel-actions"><button className="btn subtle" disabled={step===0} onClick={()=>setStep(v=>v-1)}><ArrowLeft size={16}/> 返回</button><div className="action-side"><button className="btn ghost" onClick={restart}><RotateCcw size={15}/> 重置</button><button className="btn primary" disabled={!canNext} onClick={()=>setStep(v=>v+1)}>继续审查 <ArrowRight size={15}/></button></div></div>
    </div><aside className="panel compact"><div className="eyebrow">REASONING PATH</div><h3>当前推理路径</h3><div className="reason-tree">{REASON_QUESTIONS.map((q,i)=><button key={i} className={`tree-item ${step===i?'tree-current':''}`} disabled={i>0 && (selected.slice(0,i).some(x=>x===null) || selected[0]!==0)} onClick={()=>setStep(i)}><span className="tree-dot">{selected[i]!==null?<Check size={13}/>:i+1}</span><span><strong>{q.title}</strong><small>{selected[i]===null?'尚未判断':q.choices[selected[i]][0]}</small></span></button>)}</div>
      <Notice>这是一棵教学化的事实审查树，不是穷尽性法条检索，也不提供自动裁判结论。</Notice>
    </aside></div>
  </>;
}
function EvidenceLab() {
  const [picked,setPicked] = useState<string[]>(['contract']);
  const selected = EVIDENCE.filter(e=>picked.includes(e.id));
  function toggle(id:string){setPicked(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
  return <>
    <PageHeading eyebrow="MODULE 03 / EVIDENCE LAB" title="证据链实验室" description="选择需要纳入分析的证据，比较证明目的、局限性和待核实事项。" right={<Pill tone="blue">虚构合同纠纷</Pill>}/>
    <div className="layout-split evidence-layout"><div className="panel"><div className="panel-head"><h2>候选证据</h2><span className="muted tiny">已选 {picked.length} / {EVIDENCE.length}</span></div><div className="evidence-list">{EVIDENCE.map(e=><button key={e.id} className={`evidence-card ${picked.includes(e.id)?'evidence-on':''}`} onClick={()=>toggle(e.id)} aria-pressed={picked.includes(e.id)}><span className="checkmark">{picked.includes(e.id)&&<Check size={14}/>}</span><span className="grow"><strong>{e.title}</strong><small>{e.type}</small></span><ChevronRight size={16}/></button>)}</div><Notice>选择证据只改变当前分析清单，不代表证据已被采信，也不等于证明力评分。</Notice></div>
    <div className="panel"><div className="panel-head"><div><div className="eyebrow">PROOF MAP</div><h2>待证事实与支撑关系</h2></div></div><div className="fact-focus"><Scale size={22}/><div><strong>核心待证事实</strong><p>合同关系、是否付款、是否按约交付以及是否协商延期。</p></div></div>
      <EvidenceProofGraph selected={picked} onToggle={toggle}/>
      <div className="evidence-results">{selected.length?selected.map(e=><div className="evidence-result" key={e.id}><div className="result-title"><span className="result-mark"/><strong>{e.title}</strong></div><p><b>可能支持：</b>{e.purpose}</p><p className="limitation"><b>需要核查：</b>{e.caveat}</p></div>):<Placeholder>尚未选择证据。点击左侧卡片将其加入分析。</Placeholder>}</div>
      <div className="gap-section"><div className="eyebrow">OPEN QUESTIONS</div><strong>目前仍需回答</strong><ul><li>交付标的、数量和期限是否明确？</li><li>是否存在有效的延期合意？</li><li>证据来源和原始载体能否核验？</li></ul></div>
    </div></div>
  </>;
}
function Quiz() {
  const [index,setIndex] = useState(0);
  const [responses,setResponses] = useBrowserState<Array<number|null>>('lawlab.quiz.v1',[null,null,null,null,null]);
  const q = QUIZ[index], response=responses[index];
  const score = responses.reduce<number>((n,choice,i)=>n+(choice===QUIZ[i].answer?1:0),0);
  const [displayScore,setDisplayScore] = useState(score);
  const scoreAnimation = useRef<number|null>(null);
  useEffect(()=>{
    if(scoreAnimation.current!==null)cancelAnimationFrame(scoreAnimation.current);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){setDisplayScore(score);return;}
    const start=performance.now(),duration=340,from=displayScore;
    function frame(now:number){const t=Math.min((now-start)/duration,1);setDisplayScore(Math.round(from+(score-from)*(1-Math.pow(1-t,3))));if(t<1)scoreAnimation.current=requestAnimationFrame(frame);}
    scoreAnimation.current=requestAnimationFrame(frame);
    return ()=>{if(scoreAnimation.current!==null)cancelAnimationFrame(scoreAnimation.current);};
  },[score]);
  const done = responses.every(answer=>answer!==null);
  const [feedbackKey,setFeedbackKey] = useState<string|null>(null);
  function choose(v:number){if(response===null){setResponses(old=>old.map((x,i)=>i===index?v:x));if(motionAllowed())setFeedbackKey(`${index}-${v}`);}}
  return <>
    <PageHeading eyebrow="MODULE 04 / LEGAL QUIZ" title="法学闯关" description="5 道原创情境练习，完成选择后查看对应的法律分析。" right={<Pill tone="green">本机记录进度</Pill>}/>
    <div className="quiz-shell panel"><div className="quiz-bar"><span>QUESTION {String(index+1).padStart(2,'0')} / 05</span><span>答对 <span className="score-number" aria-label={`答对 ${score} 题`}>{displayScore}</span> 题</span></div><div className="progress-track"><div style={{width:`${(responses.filter(a=>a!==null).length/QUIZ.length)*100}%`}}/></div>
      <Pill tone="blue">{q.topic}</Pill><h2 className="quiz-question">{q.stem}</h2><div className="choice-list">{q.options.map((opt,i)=>{const revealed=response!==null; const correct=revealed&&i===q.answer;const wrong=revealed&&i===response&&response!==q.answer;return <button disabled={revealed} key={i} className={`choice ${correct?'choice-correct':wrong?'choice-wrong':''} ${response===i&&feedbackKey===`${index}-${i}`?(correct?'choice-pulse':wrong?'choice-shake':''):''}`} onAnimationEnd={e=>{if(e.target===e.currentTarget)setFeedbackKey(null);}} onClick={()=>choose(i)}><span className="choice-letter">{String.fromCharCode(65+i)}</span><span>{opt}</span>{correct&&<CheckCircle2 size={18}/>}</button>;})}</div>
      {response!==null&&<div className={`feedback ${response===q.answer?'positive':'caution'}`} role="status"><strong>{response===q.answer?'回答正确':'还需要再想想'}</strong><p>{q.explanation}</p></div>}
      {done&&<div className="quiz-summary"><strong>本轮完成 · {score}/{QUIZ.length}</strong><p>可以返回之前的题目复习解析，也可以清除进度重新练习。</p></div>}
      <div className="panel-actions"><button className="btn subtle" onClick={()=>setIndex(i=>Math.max(0,i-1))} disabled={index===0}><ArrowLeft size={16}/> 上一题</button><div className="action-side"><button className="btn ghost" onClick={()=>{setResponses(Array(QUIZ.length).fill(null));setIndex(0);}}><RotateCcw size={15}/> 重新开始</button><button className="btn primary" disabled={index===QUIZ.length-1||response===null} onClick={()=>setIndex(i=>i+1)}>下一题 <ArrowRight size={15}/></button></div></div>
    </div>
  </>;
}
const EMPTY_EVENT = { date: '', title:'', type: '事实' as EventType, detail:'', evidence:'' };
function Timeline() {
  const [events,setEvents] = useBrowserState<TimelineEvent[]>('lawlab.timeline.v1',INITIAL_EVENTS);
  const [filter,setFilter] = useState<'全部' | EventType>('全部');
  const [selectedId,setSelectedId] = useState('f1');
  const [showForm,setShowForm] = useState(false);
  const [draft,setDraft] = useState(EMPTY_EVENT);
  const [lastAddedId,setLastAddedId] = useState<string|null>(null);
  const [removingId,setRemovingId] = useState<string|null>(null);
  useEffect(()=>{
    if(!removingId)return;
    const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;
    const timer=window.setTimeout(()=>{
      setEvents(old=>old.filter(e=>e.id!==removingId));
      setSelectedId('');setRemovingId(null);
    },delay);
    return ()=>window.clearTimeout(timer);
  },[removingId,setEvents]);
  const shown = sortTimeline(events.filter(e=>filter==='全部'||e.type===filter));
  const current = shown.find(e=>e.id===selectedId) ?? shown[0];
  function add(event:FormEvent<HTMLFormElement>){event.preventDefault();const dateOk=/^\d{4}-\d{2}-\d{2}$/.test(draft.date)&&!Number.isNaN(Date.parse(draft.date));if(!dateOk||!draft.title.trim())return; const item: TimelineEvent = {...draft, id:`user-${crypto.randomUUID()}`, title:draft.title.trim(), custom:true};setEvents(old=>[...old,item]);if(motionAllowed())setLastAddedId(item.id);setFilter('全部');setSelectedId(item.id);setDraft(EMPTY_EVENT);setShowForm(false);}
  function remove(id:string){if(!removingId)setRemovingId(id);}
  return <>
    <PageHeading eyebrow="MODULE 05 / CASE TIMELINE" title="案件时间线生成器" description="把零散事实变成可检索的案件脉络。支持新建节点、筛选与 CSV 导出。"/>
    <div className="toolbar timeline-toolbar"><div className="segmented">{(['全部','事实','程序'] as const).map(t=><button key={t} onClick={()=>setFilter(t)} className={filter===t?'selected':''}>{t==='全部'?'全部节点':`${t}时间线`}</button>)}</div><div className="toolbar-buttons"><button className="btn outline" onClick={()=>downloadText('lawlab-timeline.csv',timelineToCsv(sortTimeline(events)),'text/csv;charset=utf-8')}><ArrowDownToLine size={16}/> 导出 CSV</button><button className="btn primary" onClick={()=>setShowForm(value=>!value)}><Plus size={16}/> 添加事件</button></div></div>
    {showForm&&<form className="panel new-event" onSubmit={add}><div className="panel-head"><h2>添加时间节点</h2><button type="button" className="icon-button" aria-label="关闭" onClick={()=>setShowForm(false)}><X size={18}/></button></div><div className="form-grid"><label>事件日期<input required type="date" value={draft.date} onChange={e=>setDraft(old=>({...old,date:e.target.value}))}/></label><label>节点类型<select value={draft.type} onChange={e=>setDraft(old=>({...old,type:e.target.value as EventType}))}><option>事实</option><option>程序</option></select></label><label className="wide">事件标题<input required maxLength={80} value={draft.title} placeholder="例如：对方发出补充协议" onChange={e=>setDraft(old=>({...old,title:e.target.value}))}/></label><label className="wide">事件描述<textarea value={draft.detail} rows={2} onChange={e=>setDraft(old=>({...old,detail:e.target.value}))}/></label><label className="wide">关联证据<input value={draft.evidence} placeholder="例如：邮件、合同、转账凭证" onChange={e=>setDraft(old=>({...old,evidence:e.target.value}))}/></label></div><div className="form-actions"><button className="btn primary" type="submit">保存事件</button></div></form>}
    <div className="layout-split timeline-layout"><div className="panel"><div className="panel-head"><h2>事件脉络</h2><span className="muted tiny">{shown.length} 个节点</span></div><div className="timeline-stream">{shown.length?shown.map(event=><button key={event.id} className={`timeline-row ${current?.id===event.id?'timeline-selected':''} ${lastAddedId===event.id?'timeline-row-enter':''} ${removingId===event.id?'timeline-row-exit':''}`} onAnimationEnd={e=>{if(e.target===e.currentTarget&&lastAddedId===event.id)setLastAddedId(null);}} onClick={()=>setSelectedId(event.id)}><span className={`timeline-rail ${event.type==='程序'?'rail-procedure':''}`}><span/></span><span className="timeline-body"><span className="timeline-date">{event.date} · {event.type}</span><strong>{event.title}</strong><small>{event.evidence||'尚无关联证据'}</small></span><ChevronRight size={16}/></button>):<Placeholder>这一类别还没有事件。可切换筛选或新增节点。</Placeholder>}</div></div>
    <aside className="panel detail-panel"><div className="eyebrow">EVENT DETAILS</div>{current?<><div className="detail-top"><Pill tone={current.type==='事实'?'green':'blue'}>{current.type}节点</Pill>{current.custom&&<button className="btn danger-quiet" disabled={removingId===current.id} onClick={()=>remove(current.id)}><Trash2 size={15}/> 删除</button>}</div><div className="detail-date">{current.date}</div><h2>{current.title}</h2><div className="detail-section"><span>事件说明</span><p>{current.detail||'暂无描述'}</p></div><div className="detail-section"><span>关联证据</span><p>{current.evidence||'尚未填写'}</p></div></>:<Placeholder>请选择左侧事件。</Placeholder>}</aside></div>
    <Notice icon={ShieldCheck}>事件保存在当前浏览器的 localStorage。导出的 CSV 可能包含案件隐私信息，分享前请脱敏；演示节点不是实际法院记录。</Notice>
  </>;
}
export default function App(){
  const [page,setPage] = useState<ModuleId>(getHashPage);
  const [menuOpen,setMenuOpen] = useState(false);
  const pageRef=useRef(page);
  pageRef.current=page;
  useEffect(()=>{function onHashChange(){setPage(getHashPage());}window.addEventListener('hashchange',onHashChange);return()=>window.removeEventListener('hashchange',onHashChange);},[]);
  function navigate(id:ModuleId){
    if(pageRef.current===id){setMenuOpen(false);return;}
    const move=()=>{pageRef.current=id;window.location.hash=id;setPage(id);setMenuOpen(false);};
    const transitionDocument=document as Document & {startViewTransition?: (update:()=>void)=>{finished:Promise<void>}};
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&transitionDocument.startViewTransition){
      transitionDocument.startViewTransition(()=>flushSync(move));
    }else move();
    window.scrollTo({top:0,behavior:'auto'});
  }
  const pageLabels: Partial<Record<ModuleId,string>> = {home:'选择工作台',learn:'学生版',practice:'专业版',litigation:'诉讼业务',nonlit:'非诉业务'};
  const title=pageLabels[page]??MODULES.find(m=>m.id===page)?.label??'工作空间';
  function navItem(id:ModuleId, label:string, Icon:ModuleIcon){
    return <button key={id} className={`nav-item ${page===id?'nav-active':''}`} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={18}/><span>{label}</span></button>;
  }
  return <div className="app-shell"><aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><div className="sidebar-header"><button className="brand" onClick={()=>navigate('home')} aria-label="回到 LawLab 首页"><span className="brand-mark"><Scale size={23}/></span><span><strong>LawLab</strong><small>LEARN & PRACTICE</small></span></button><button className="close-menu icon-button" aria-label="关闭导航" onClick={()=>setMenuOpen(false)}><X size={19}/></button></div>
    <div className="sidebar-group"><span className="side-heading">总览</span>{navItem('home','选择工作台',LayoutGrid)}</div>
    <nav className="sidebar-group" aria-label="学生版导航"><span className="side-heading">学生版 · LEARN</span>
      {navItem('learn','学习空间',GraduationCap)}
      {navItem('flashcards','记忆卡片',BrainCircuit)}
      {navItem('knowledge','知识图谱',Layers3)}
      {navItem('paper','论文写作',NotebookPen)}
      {navItem('quiz','法学闯关',GraduationCap)}
      {navItem('reasoning','法律推理',GitBranch)}
      {navItem('court','模拟法庭',Landmark)}
    </nav>
    <nav className="sidebar-group" aria-label="专业版导航"><span className="side-heading">专业版 · PRACTICE</span>
      {navItem('practice','实务工作台',BriefcaseBusiness)}
      {navItem('litigation','诉讼业务',Landmark)}
      {navItem('evidence','证据链实验室',Network)}
      {navItem('timeline','案件时间线',CalendarDays)}
      {navItem('nonlit','非诉业务',FileText)}
      {navItem('contracts','合同审查',FileSearch)}
    </nav>
    <div className="sidebar-bottom"><div className="side-info"><BookOpen size={18}/><span><strong>学习与实践相连接</strong><small>双入口 · 共享分析能力</small></span></div><span className="version">V 0.2.1 · LOCAL DEMONSTRATION</span></div></aside>
    {menuOpen&&<button className="backdrop" aria-label="关闭菜单" onClick={()=>setMenuOpen(false)}/>}
    <div className="main-area"><header className="topbar"><button className="menu-toggle icon-button" aria-label="打开导航菜单" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><div className="breadcrumbs"><span>LAWLAB</span><ChevronRight size={14}/><strong>{title}</strong></div><div className="topbar-right"><span className="top-dot"/><span>本地保存 · 文献检索联网</span></div></header>
      <main key={page} className="content content-enter" id="main-content">{page==='home'?<ModuleHome navigate={navigate}/>:page==='learn'||page==='practice'||page==='litigation'||page==='nonlit'?<Portal kind={page} navigate={navigate}/>:page==='flashcards'?<Flashcards/>:page==='knowledge'?<KnowledgeGraph/>:page==='paper'?<PaperWorkspace/>:page==='court'?<Court/>:page==='reasoning'?<Reasoning/>:page==='evidence'?<EvidenceLab/>:page==='quiz'?<Quiz/>:page==='timeline'?<Timeline/>:<ContractWorkspace/>}</main>
      <footer className="footer"><span>LAWLAB · LEARN THE LAW. PRACTICE THE LAW.</span><span>教学与流程演示 · 不构成法律意见</span></footer>
    </div>
  </div>;
}
