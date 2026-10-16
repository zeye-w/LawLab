import type { PaperProject,PaperReference,PaperSection } from './paper';

export type ResearchStance = 'support' | 'challenge' | 'background' | 'unclassified';
export type ResearchNote = {
  stance: ResearchStance;
  claim: string;
  evidence: string;
  limitation: string;
};
export const STANCE_LABELS: Record<ResearchStance,string> = {
  support:'支持当前论点',challenge:'提出不同意见',background:'背景或研究方法',unclassified:'尚未分类'
};
export const RESEARCH_STANCES: ResearchStance[] = ['unclassified','support','challenge','background'];
export type LiteratureHit = {
  doi:string; title:string;authors:string;year:string;venue:string;url:string;abstract:string;
};
function object(value:unknown):value is Record<string,unknown> {
  return !!value && typeof value==='object' && !Array.isArray(value);
}
function plainText(value:unknown):string {
  if(typeof value!=='string')return '';
  // React escapes metadata when rendering; don't insert HTML from publishers.
  return value.replace(/<[^>]*>/g,' ').replace(/&(?:amp|#38);/gi,'&')
    .replace(/&(?:lt|#60);/gi,'<').replace(/&(?:gt|#62);/gi,'>')
    .replace(/&(?:quot|#34);/gi,'"').replace(/&(?:nbsp|#160);/gi,' ')
    .replace(/\s+/g,' ').trim();
}
function firstString(value:unknown):string {
  if(!Array.isArray(value)) return '';
  return plainText(value.find(x=>typeof x==='string'));
}
function publicationYear(item:Record<string,unknown>):string {
  const field=item.published??item.issued??item.created;
  if(!object(field)||!Array.isArray(field['date-parts']))return '';
  const part=field['date-parts'][0];
  const value=Array.isArray(part)?part[0]:null;
  return Number.isInteger(value)&&value>=1400&&value<=2200?String(value):'';
}
export function crossrefSearchUrl(query:string):string {
  const q=query.trim().slice(0,250);
  if(!q) throw new Error('请输入检索关键词。');
  const u=new URL('https://api.crossref.org/works');
  u.searchParams.set('query.bibliographic',q);
  u.searchParams.set('rows','12');
  u.searchParams.set('select','DOI,title,author,published,issued,created,container-title,URL,abstract');
  return u.toString();
}
export function crossrefBrowserUrl(query:string):string {
  return 'https://search.crossref.org/?q='+encodeURIComponent(query.trim());
}
export function parseCrossrefResponse(payload:unknown):LiteratureHit[] {
  if(!object(payload)||!object(payload.message)||!Array.isArray(payload.message.items)) {
    throw new Error('检索返回的数据格式不符合预期。');
  }
  const seen=new Set<string>(),hits:LiteratureHit[]=[];
  for(const raw of payload.message.items.slice(0,60)) {
    if(!object(raw))continue;
    const doi=typeof raw.DOI==='string'?raw.DOI.trim().toLowerCase():'';
    // Only accept DOI metadata with a canonical DOI link and a real title.
    if(!/^10\.\d{4,9}\/[^\s]+$/i.test(doi)||seen.has(doi))continue;
    const title=firstString(raw.title);
    if(!title)continue;
    const people=Array.isArray(raw.author)?raw.author.slice(0,4).map(person=>{
      if(!object(person))return '';
      return [person.given,person.family].filter(x=>typeof x==='string').join(' ').trim();
    }).filter(Boolean).join('、'):'';
    seen.add(doi);
    hits.push({
      doi,title:title.slice(0,600),authors:people.slice(0,400),year:publicationYear(raw),
      venue:firstString(raw['container-title']).slice(0,300),
      url:'https://doi.org/'+encodeURI(doi),
      abstract:plainText(raw.abstract).slice(0,1800)
    });
    if(hits.length===12)break;
  }
  return hits;
}
export function citationForHit(hit:LiteratureHit):string {
  return [hit.authors||'作者未提供',hit.title,hit.venue,hit.year].filter(Boolean).join(' · ').slice(0,2000);
}
export function summarizeResearch(paper:PaperProject) {
  const items=paper.references.filter(ref=>!!ref.research?.claim.trim());
  const groups=RESEARCH_STANCES.map(stance=>({
    stance,label:STANCE_LABELS[stance],
    items:items.filter(ref=>ref.research?.stance===stance)
  }));
  const gaps:string[]=[];
  if(!paper.question.trim())gaps.push('尚未明确研究问题，建议先界定要回答的具体争点。');
  if(!paper.argument.trim())gaps.push('尚未形成核心论点，暂时无法判断哪些观点构成支持或反驳。');
  if(paper.references.length===0)gaps.push('没有参考资料，先检索并阅读真实文献。');
  if(paper.references.some(ref=>!ref.verified))gaps.push('存在未核验来源，暂不能把这些文献作为已确认的论文依据。');
  if(!items.some(r=>r.research?.stance==='support'))gaps.push('缺少明确支持当前论点的阅读笔记。');
  if(!items.some(r=>r.research?.stance==='challenge'))gaps.push('缺少不同或反对意见，建议主动寻找并回应反例。');
  if(items.some(r=>!r.research?.evidence.trim()))gaps.push('部分观点缺少页码、具体证据或论证依据。');
  if(items.some(r=>!r.research?.limitation.trim()))gaps.push('部分观点尚未注明适用边界或研究局限。');
  return {groups,total:items.length,gaps};
}
export function makeWritingGuide(paper:PaperProject,section:PaperSection):string {
  const {groups,gaps}=summarizeResearch(paper);
  const supportive=groups.find(g=>g.stance==='support')?.items??[];
  const critical=groups.find(g=>g.stance==='challenge')?.items??[];
  const context=groups.find(g=>g.stance==='background')?.items??[];
  const lines=[
    '【写作指引 · 供作者自行完成论证，非自动生成的学术结论】',
    '本节：'+(section.heading.trim()||'未命名章节'),
    '研究问题：'+(paper.question.trim()||'（待明确）'),
    '待论证观点：'+(paper.argument.trim()||'（待明确）'),
    '',
    '一、论证结构建议',
    '1. 用一段话明确本节具体争点，界定概念及适用法域。',
    '2. 依次列出应核实的法律规范、事实或比较对象。',
    '3. 以已阅读资料支持或修正论点，解释为何证据能够支持判断。',
    '4. 正面回应不同意见、反例和适用边界。',
    '5. 用小结说明本节结果与全文核心研究问题的联系。',
    '',
    '二、已记录的研究观点（全部来自作者笔记，不代表原文自动提取）'
  ];
  if(groups.reduce((v,g)=>v+g.items.length,0)===0)lines.push('尚未记录文献观点；请先阅读并填写观点卡。');
  for(const [label,items] of [['支持性观点',supportive],['不同意见',critical],['背景与方法',context]] as const){
    lines.push(label+':');
    if(items.length===0){lines.push('- 尚无记录');continue;}
    for(const ref of items) {
      lines.push('- '+ref.research!.claim.trim()+'（'+ref.citation.trim().slice(0,120)+(ref.verified?'；已标记核验':'；待核验')+'）');
      if(ref.research!.evidence.trim())lines.push('  依据或定位：'+ref.research!.evidence.trim());
      if(ref.research!.limitation.trim())lines.push('  局限：'+ref.research!.limitation.trim());
    }
  }
  lines.push('', '三、待解决问题');
  lines.push(...(gaps.length?gaps.map(g=>'- '+g):['- 继续检查法律规范的现行效力、引证准确性与论证中的跳跃。']));
  lines.push('','【请在此处自行撰写段落，并在正式提交前逐项核实所有引文与观点出处。】');
  return lines.join('\n');
}
