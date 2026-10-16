import type { ResearchNote } from './research';
export type PaperMode = '规范解释研究' | '案例评析' | '比较法研究';
export type ReferenceType = '期刊论文' | '专著' | '法律规范' | '裁判文书' | '其他';
// notes holds the author's working notes (e.g. inserted writing guides); it is never counted or exported as paper text.
export type PaperSection = { id: string; heading: string; body: string; notes?: string };
export type PaperReference = { id: string; type: ReferenceType; citation: string; locator: string; note: string; verified: boolean; research?: ResearchNote };
export type PaperProject = {
  title: string;
  question: string;
  argument: string;
  jurisdiction: string;
  mode: PaperMode;
  sections: PaperSection[];
  references: PaperReference[];
};
export const PAPER_STORAGE_KEY = 'lawlab:student-paper:v1';
export const PAPER_RECOVERY_KEY = 'lawlab:student-paper:recovery';
export const MAX_SECTIONS = 60;
export const MAX_REFERENCES = 200;
export const MAX_SECTION_TEXT = 150000;
export const PAPER_MODES: PaperMode[] = ['规范解释研究','案例评析','比较法研究'];
export const REFERENCE_TYPES: ReferenceType[] = ['期刊论文','专著','法律规范','裁判文书','其他'];
const TEMPLATES: Record<PaperMode,string[]> = {
  '规范解释研究': ['引言：研究背景与问题','规范框架与相关研究述评','核心争点与规范解释','不同解释方案的评估','结论与研究局限'],
  '案例评析': ['引言：案例与争议焦点','案件事实与裁判理由','适用法律及要件分析','裁判评析与不同观点','结论与启示'],
  '比较法研究': ['引言：问题意识与比较范围','比较对象与制度背景','制度差异与共同问题','可借鉴性及适用条件','结论与研究局限']
};
export function createPaper(mode: PaperMode = '规范解释研究'): PaperProject {
  return {
    title: '',question:'',argument:'',jurisdiction:'中国法',mode,
    sections: TEMPLATES[mode].map((heading,index) => ({ id: 'section-'+(index+1), heading, body:'' })),
    references:[]
  };
}
// True when the outline differs from the untouched template, so replacing it would lose work.
export function sectionsCustomized(paper: PaperProject): boolean {
  const template = TEMPLATES[paper.mode];
  return paper.sections.length !== template.length ||
    paper.sections.some((section,index) => !!section.body.trim() || !!section.notes?.trim() || section.heading !== template[index]);
}
// Changing what a source is or where it is found invalidates the author's earlier verification.
export function applyReferencePatch(ref: PaperReference, patch: Partial<PaperReference>): PaperReference {
  const sourceChanged = patch.citation!==undefined || patch.locator!==undefined || patch.type!==undefined;
  return {...ref,...patch,verified:patch.verified ?? (sourceChanged ? false : ref.verified)};
}
export function countPaperCharacters(paper: PaperProject): number {
  return paper.sections.reduce((count,section) => count + section.body.replace(/\s/g,'').length,0);
}
export function checkPaper(paper: PaperProject) {
  return [
    { label:'填写论文标题',ok:!!paper.title.trim() },
    { label:'明确研究问题',ok:!!paper.question.trim() },
    { label:'形成可论证的核心观点',ok:!!paper.argument.trim() },
    { label:'完成全部章节初稿',ok:paper.sections.length>0 && paper.sections.every(s=>!!s.body.trim()) },
    { label:'录入真实参考资料',ok:paper.references.length>0 },
    { label:'核验每条来源与法律效力状态',ok:paper.references.length>0 && paper.references.every(ref=>ref.verified) }
  ];
}
export function paperToMarkdown(paper: PaperProject): string {
  const lines:string[] = [
    '# '+(paper.title.trim()||'未命名法学论文'),
    '',
    '> 研究范围：'+(paper.jurisdiction.trim()||'待确定'),
    '> 研究方法：'+paper.mode,
    '',
    '## 研究设计',
    '',
    '**研究问题：** '+(paper.question.trim()||'待填写'),
    '',
    '**核心论点：** '+(paper.argument.trim()||'待填写'),
    ''
  ];
  for(const section of paper.sections) {
    lines.push('## '+(section.heading.trim().replace(/[\r\n]+/g,' ')||'未命名章节'),'',
      section.body.trim(),'');
  }
  lines.push('## 参考资料（由作者自行核验）','');
  if(paper.references.length===0) lines.push('暂无来源记录。','');
  for(let i=0;i<paper.references.length;i++) {
    const ref=paper.references[i];
    lines.push('['+(i+1)+'] ['+ref.type+'] '+(ref.citation.trim()||'未填写来源')+
      (ref.locator.trim()?' — '+ref.locator.trim():'')+
      (ref.verified?'（作者已标记核验）':'（待核验）'),'');
    if(ref.note.trim()) lines.push('> 研究笔记：'+ref.note.trim().replace(/\r?\n/g,' '),'');
    if(ref.research?.claim.trim()) lines.push('> 作者整理的观点：'+ref.research.claim.trim().replace(/\r?\n/g,' '),'');
  }
  lines.push('---','本文件是作者自主编辑的工作草稿。请在正式提交前逐条核实法律规范的现行效力、判决的来源与引文，按院校要求调整引用格式。','');
  return lines.join('\n');
}
export function exportPaperBackup(paper:PaperProject):string {
  return JSON.stringify({format:'lawlab-paper-backup',version:1,paper},null,2);
}
function stringWithin(value:unknown,max:number):value is string {
  return typeof value==='string' && value.length<=max;
}
function record(value:unknown):value is Record<string,unknown> {
  return !!value && typeof value==='object' && !Array.isArray(value);
}
export function parsePaperBackup(text:string):PaperProject {
  let raw:unknown;
  try {raw=JSON.parse(text);} catch {throw new Error('JSON 格式无效。');}
  if(!record(raw)||raw.format!=='lawlab-paper-backup'||raw.version!==1||!record(raw.paper)) {
    throw new Error('文件不是受支持的 LawLab 论文备份。');
  }
  const p=raw.paper;
  if(!stringWithin(p.title,300)||!stringWithin(p.question,6000)||
     !stringWithin(p.argument,6000)||!stringWithin(p.jurisdiction,200)||
     !PAPER_MODES.includes(p.mode as PaperMode)||
     !Array.isArray(p.sections)||p.sections.length>MAX_SECTIONS||p.sections.length<1||
     !Array.isArray(p.references)||p.references.length>MAX_REFERENCES) {
    throw new Error('论文备份字段不完整或超过大小限制。');
  }
  const sections:PaperSection[]=[];
  for(const item of p.sections) {
    if(!record(item)||!stringWithin(item.id,100)||!item.id||
      !stringWithin(item.heading,300)||!stringWithin(item.body,MAX_SECTION_TEXT)||
      (item.notes!==undefined&&!stringWithin(item.notes,MAX_SECTION_TEXT))) {
      throw new Error('章节数据不符合要求。');
    }
    sections.push({id:item.id,heading:item.heading,body:item.body,...(item.notes!==undefined?{notes:item.notes as string}:{})});
  }
  const references:PaperReference[]=[];
  for(const item of p.references) {
    if(!record(item)||!stringWithin(item.id,100)||!item.id||
       !REFERENCE_TYPES.includes(item.type as ReferenceType)||
       !stringWithin(item.citation,2000)||!stringWithin(item.locator,2000)||
       !stringWithin(item.note,6000)||typeof item.verified!=='boolean'||
       (item.research!==undefined && (!record(item.research)||
          !['support','challenge','background','unclassified'].includes(item.research.stance as string)||
          !stringWithin(item.research.claim,4000)||!stringWithin(item.research.evidence,4000)||
          !stringWithin(item.research.limitation,4000)))) {
      throw new Error('参考资料数据不符合要求。');
    }
    references.push({id:item.id,type:item.type as ReferenceType,citation:item.citation,
      locator:item.locator,note:item.note,verified:item.verified,
      ...(item.research!==undefined?{research:{stance:item.research.stance as ResearchNote['stance'],
        claim:item.research.claim as string,evidence:item.research.evidence as string,
        limitation:item.research.limitation as string}}:{})});
  }
  if(new Set(sections.map(s=>s.id)).size!==sections.length ||
     new Set(references.map(r=>r.id)).size!==references.length) {
    throw new Error('备份含重复记录标识。');
  }
  return {
    title:p.title,question:p.question,argument:p.argument,
    jurisdiction:p.jurisdiction,mode:p.mode as PaperMode,sections,references
  };
}
