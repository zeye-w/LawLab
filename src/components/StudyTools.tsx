import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, GitBranch, RotateCcw, Sparkles } from 'lucide-react';
import { KNOWLEDGE_NODES, STUDY_CARDS, type StudyTopic } from '../data/study';

type Recall = 'known' | 'again';
type RecallHistory = Record<string, Recall>;
const STORAGE_KEY = 'lawlab:v02:flashcard-progress';
function restoreHistory(): RecallHistory {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, result]) =>
      STUDY_CARDS.some(card => card.id === id) && (result === 'known' || result === 'again'))) as RecallHistory;
  } catch { return {}; }
}
export function Flashcards() {
  const [history, setHistory] = useState<RecallHistory>(restoreHistory);
  const [topic, setTopic] = useState<StudyTopic | '全部'>('全部');
  const [filter, setFilter] = useState<'all'|'again'|'new'>('all');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const list = STUDY_CARDS.filter(card => (topic === '全部' || card.topic === topic)
    && (filter === 'all' || (filter === 'again' ? history[card.id] === 'again' : !history[card.id])));
  const current = list[Math.min(index, Math.max(list.length - 1, 0))];
  const known = STUDY_CARDS.filter(card => history[card.id] === 'known').length;
  const reviewed = STUDY_CARDS.filter(card => history[card.id]).length;
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* unavailable */ } }, [history]);
  function changeTopic(next: StudyTopic|'全部') {setTopic(next);setIndex(0);setRevealed(false);}
  function changeFilter(next: 'all'|'again'|'new') {setFilter(next);setIndex(0);setRevealed(false);}
  function goto(next: number) {setIndex(Math.max(0,Math.min(list.length-1,next)));setRevealed(false);}
  function mark(value: Recall) {
    if (!current) return;
    setHistory(old => ({...old,[current.id]:value}));
    setRevealed(false);
    if (filter === 'all') setIndex(i => Math.min(i+1,list.length-1));
    else setIndex(i => Math.min(i,Math.max(0,list.length-2)));
  }
  return <div>
    <div className="page-heading"><div><div className="eyebrow">LAWLAB LEARN / ACTIVE RECALL</div><h1>法律记忆卡片</h1><p>先独立回忆，再翻面核对。判断是否掌握，系统会在当前浏览器记录进度。</p></div><span className="pill pill-blue">12 张原创知识卡</span></div>
    <section className="study-stats" aria-label="学习进度">
      <div><span>已练习</span><strong>{reviewed} / {STUDY_CARDS.length}</strong></div>
      <div><span>已掌握</span><strong>{known}</strong></div>
      <div><span>待复习</span><strong>{STUDY_CARDS.filter(c=>history[c.id]==='again').length}</strong></div>
    </section>
    <div className="study-filters">
      <div className="segmented" aria-label="学科筛选">{(['全部','民法','证据法','法律方法'] as const).map(t=><button key={t} className={topic===t?'selected':''} aria-pressed={topic===t} onClick={()=>changeTopic(t)}>{t}</button>)}</div>
      <div className="segmented" aria-label="复习状态">{([{id:'all',label:'全部'},{id:'new',label:'未练习'},{id:'again',label:'待复习'}] as const).map(f=><button key={f.id} className={filter===f.id?'selected':''} aria-pressed={filter===f.id} onClick={()=>changeFilter(f.id)}>{f.label}</button>)}</div>
    </div>
    {current ? <section className="study-workspace">
      <div className="flash-top"><span className="eyebrow">{current.topic} / {String(Math.min(index,list.length-1)+1).padStart(2,'0')} / {list.length}</span><span className="muted tiny">{history[current.id]==='known'?'已掌握':history[current.id]==='again'?'待复习':'尚未标记'}</span></div>
      <button key={current.id} className={`flash-card ${revealed?'flash-revealed':''}`}
        onClick={()=>setRevealed(v=>!v)} aria-pressed={revealed}
        aria-label={revealed?`答案：${current.back}。点击返回题目`:`题目：${current.front}。点击查看答案`}>
        <span className="flash-card-inner">
          <span className="flash-face flash-front" aria-hidden={revealed}>
            <span className="flash-overline">QUESTION / 想一想</span>
            <strong>{current.front}</strong>
            <span className="flash-hint">点击卡片查看答案</span>
          </span>
          <span className="flash-face flash-back" aria-hidden={!revealed}>
            <span className="flash-overline">ANSWER / 答案</span>
            <strong>{current.back}</strong>
            <span className="flash-hint">{current.context}</span>
          </span>
        </span>
      </button>
      <div className="flash-actions"><button className="btn outline" onClick={()=>goto(index-1)} disabled={index===0}><ArrowLeft size={16}/> 上一张</button>
        <div className="flash-grade"><button className="btn outline" onClick={()=>mark('again')} disabled={!revealed}>需复习</button><button className="btn primary" onClick={()=>mark('known')} disabled={!revealed}><Check size={16}/> 已掌握</button></div>
        <button className="btn outline" onClick={()=>goto(index+1)} disabled={index>=list.length-1}>下一张 <ArrowRight size={16}/></button>
      </div>
      <div className="notice"><CircleHelp size={17}/><div>标记前请先翻面。进度仅保存在本机浏览器；换设备不会同步。</div></div>
    </section> : <section className="panel study-empty"><BookOpen size={32}/><h2>这里暂时没有卡片</h2><p>该学科下没有符合当前筛选条件的卡片。试试切换为「全部」。</p><button className="btn primary" onClick={()=>{changeTopic('全部');changeFilter('all');}}>查看全部卡片</button></section>}
    <div className="study-reset"><button className="btn subtle" onClick={()=>{if(window.confirm('确定清空全部记忆卡片的学习进度吗？')) {setHistory({});setIndex(0);setRevealed(false);}}}><RotateCcw size={15}/> 重置学习记录</button></div>
  </div>;
}
export function KnowledgeGraph() {
  const [selected, setSelected] = useState('relationship');
  const current = KNOWLEDGE_NODES.find(node=>node.id===selected) || KNOWLEDGE_NODES[0];
  const related = KNOWLEDGE_NODES.filter(node=>current.related.includes(node.id));
  return <div>
    <div className="page-heading"><div><div className="eyebrow">LAWLAB LEARN / CONCEPT CONNECTIONS</div><h1>法律知识图谱</h1><p>从法律关系出发，点击概念节点，观察请求权、待证事实、证据及抗辩之间的联系。</p></div><span className="pill pill-green">互动概念地图</span></div>
    <section className="panel knowledge-panel">
      <div className="knowledge-guide"><GitBranch size={18}/><span>选择任一节点。与当前节点直接相关的概念会被高亮。</span></div>
      <div className="knowledge-map" role="group" aria-label="法律知识概念节点">
        {KNOWLEDGE_NODES.map(node=><button key={node.id} type="button" className={`knowledge-node ${node.id===selected?'knowledge-selected':''} ${current.related.includes(node.id)?'knowledge-linked':''}`} aria-pressed={node.id===selected} onClick={()=>setSelected(node.id)}>
          <span className="knowledge-kind">{node.category}</span><strong>{node.title}</strong>
        </button>)}
      </div>
    </section>
    <div className="layout-split knowledge-detail">
      <section className="panel"><div className="eyebrow">SELECTED CONCEPT</div><h2 className="knowledge-title">{current.title}</h2><p>{current.summary}</p><div className="knowledge-question"><Sparkles size={17}/><div><strong>思考问题</strong><p>{current.question}</p></div></div></section>
      <section className="panel"><div className="panel-head"><h2>相关概念</h2><span className="muted tiny">{related.length} 个关联</span></div><div className="related-list">{related.map(node=><button key={node.id} type="button" className="related-item" onClick={()=>setSelected(node.id)}><span>{node.title}</span><ArrowRight size={15}/></button>)}</div></section>
    </div>
    <div className="notice"><CircleHelp size={17}/><div>这是用于理解知识结构的教学概念图，不是完整法律规范体系，也不提供具体案件法律结论。</div></div>
  </div>;
}
