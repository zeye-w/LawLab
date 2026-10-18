import { KNOWLEDGE_NODES } from '../data/study';
import { KNOWLEDGE_POSITIONS,knowledgeEdges,linkedConceptIds } from '../lib/relationshipMaps';
import './graphs.css';

type Props={selected:string;onSelect:(id:string)=>void};
const categoryTone:Record<string,string>={
  '总览':'core','民法':'civil','证据法':'evidence','法律方法':'method'
};

/** SVG lines and nodes share one coordinate system; no layout-measuring effects. */
export function KnowledgeNetwork({selected,onSelect}:Props){
  const linked=linkedConceptIds(selected);
  const edges=knowledgeEdges();
  let delay=0;
  return <div className="knowledge-graph-wrap">
    <svg className="knowledge-graph-svg" viewBox="0 0 900 500"
      role="group" aria-label="法律概念关系图：选择节点查看直接关联的概念"
      preserveAspectRatio="xMidYMid meet">
      <g aria-hidden="true" className="knowledge-edges">
        {edges.map(edge=>{
          const a=KNOWLEDGE_POSITIONS[edge.a],b=KNOWLEDGE_POSITIONS[edge.b];
          if(!a||!b)return null;
          const active=edge.a===selected||edge.b===selected;
          const lag=active?delay++*65:0;
          // pathLength=1 makes the dash animation span the whole line whatever its rendered size.
          return <line key={selected+'-'+edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength={1}
            className={active?'knowledge-edge knowledge-edge-on':'knowledge-edge knowledge-edge-off'}
            style={{animationDelay:active?lag+'ms':undefined}}/>;
        })}
      </g>
      <g className="knowledge-nodes">
        {KNOWLEDGE_NODES.map(node=>{
          const pos=KNOWLEDGE_POSITIONS[node.id];
          if(!pos)return null;
          const active=node.id===selected,neighbor=linked.has(node.id);
          return <g key={node.id} tabIndex={0} role="button"
            aria-label={node.title+'，'+node.category+(active?'，当前选中':'')}
            aria-pressed={active}
            className={['knowledge-svg-node',categoryTone[node.category]||'core',
              active?'knowledge-svg-selected':neighbor?'knowledge-svg-neighbor':'knowledge-svg-muted'].join(' ')}
            transform={`translate(${pos.x} ${pos.y})`}
            onClick={()=>onSelect(node.id)}
            onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(node.id);}}}>
            <title>{node.title}：{node.summary}</title>
            <rect x="-75" y="-34" rx="13" width="150" height="68"/>
            <text className="knowledge-svg-category" textAnchor="middle" y="-10">{node.category}</text>
            <text className="knowledge-svg-label" textAnchor="middle" y="13">{node.title}</text>
          </g>;
        })}
      </g>
    </svg>
    <p className="knowledge-graph-caption">连线代表教学概念关联，并非法律因果或规范效力结论。可使用 Tab 与 Enter 键切换节点。</p>
  </div>;
}
