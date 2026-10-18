import { CONTENT_SCHEMA_VERSION, type Editorial, type LegalContentRegistry } from './schema.ts';

export type ContentDiagnostic = { code: string; path: string; message: string };

export function validateContent(data: LegalContentRegistry): ContentDiagnostic[] {
  const errors: ContentDiagnostic[] = [];
  const fail = (code: string, path: string, message: string) => errors.push({code,path,message});
  const nonempty = (value: string, path: string) => {
    if (!value?.trim()) fail('REQUIRED',path,'不得为空');
  };
  const seen = new Set<string>();
  const addId = (id: string, path: string) => {
    nonempty(id,path);
    if (seen.has(id)) fail('DUPLICATE_ID',path,'跨内容实体 ID 重复');
    seen.add(id);
  };
  const dateOK = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date+'T00:00:00Z')) &&
    new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
  const editorial = (e: Editorial, path: string) => {
    if (!['pending','verified','rejected'].includes(e.status)) fail('REVIEW_STATUS',path+'.status','非法核验状态');
    if (e.checkedAt && !dateOK(e.checkedAt)) fail('DATE',path+'.checkedAt','核验日期无效');
    if (e.status==='verified' && (!e.checkedAt || !e.checkedBy?.trim()))
      fail('REVIEW_PROVENANCE',path,'verified 必须有人工核验日期与核验人');
  };
  if (data.schemaVersion!==CONTENT_SCHEMA_VERSION)
    fail('SCHEMA_VERSION','schemaVersion','不支持的内容版本');

  const sources = new Map(data.sources.map(s=>[s.id,s]));
  const concepts = new Map(data.concepts.map(c=>[c.id,c]));
  for (const [i,s] of data.sources.entries()) {
    const p='sources['+i+']';
    addId(s.id,p+'.id'); nonempty(s.title,p+'.title');nonempty(s.issuer,p+'.issuer');
    editorial(s.editorial,p+'.editorial');
    if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(s.url)) fail('SOURCE_URL',p+'.url','来源必须提供 HTTPS 地址');
    if(s.effectiveFrom && !dateOK(s.effectiveFrom))fail('DATE',p+'.effectiveFrom','生效日期无效');
    if(s.effectiveTo && !dateOK(s.effectiveTo))fail('DATE',p+'.effectiveTo','失效日期无效');
    if(s.effectiveFrom && s.effectiveTo && s.effectiveFrom>s.effectiveTo)
      fail('DATE_ORDER',p,'失效时间早于生效时间');
    if(s.validity!=='unknown'&&s.editorial.status!=='verified')
      fail('UNVERIFIED_VALIDITY',p+'.validity','未经核验不得断言法律规范效力状态');
    if(s.editorial.status==='verified' && !s.locator?.trim())
      fail('SOURCE_LOCATOR',p+'.locator','已核验来源必须有条、页或段落定位');
  }
  for(const [i,c] of data.concepts.entries()){
    const p='concepts['+i+']';
    addId(c.id,p+'.id');nonempty(c.title,p+'.title');nonempty(c.explanation,p+'.explanation');
    editorial(c.editorial,p+'.editorial');
    if(c.parentId) {
      const parent=concepts.get(c.parentId);
      if(!parent || parent.id===c.id) fail('DANGLING_PARENT',p+'.parentId',String(c.parentId));
      else {
        if(parent.parentId)fail('HIERARCHY_DEPTH',p+'.parentId','当前 P1 仅允许两级结构');
        if(parent.jurisdiction!==c.jurisdiction)fail('PARENT_JURISDICTION',p+'.parentId','上下级概念法域不一致');
        if(parent.category!==c.category)fail('PARENT_CATEGORY',p+'.parentId','上下级概念分类不一致');
      }
    }
    if(new Set(c.relatedConceptIds).size!==c.relatedConceptIds.length)
      fail('DUPLICATE_LINK',p+'.relatedConceptIds','关联概念重复');
    for(const other of c.relatedConceptIds){
      if(other===c.id||!concepts.has(other))fail('DANGLING_CONCEPT',p+'.relatedConceptIds',other);
    }
    if(c.editorial.status==='verified' && c.sourceIds.length===0)
      fail('MISSING_AUTHORITY',p+'.sourceIds','已核验法律知识必须有依据');
    for(const id of c.sourceIds){
      const s=sources.get(id);
      if(!s)fail('DANGLING_SOURCE',p+'.sourceIds',id);
      else if(c.editorial.status==='verified'&&(s.editorial.status!=='verified'||s.jurisdiction!==c.jurisdiction))
        fail('UNVERIFIED_AUTHORITY',p+'.sourceIds','依据未经核验或法域不一致');
    }
  }
  for(const [i,c] of data.cases.entries()){
    const base='cases['+i+']';
    addId(c.id,base+'.id');nonempty(c.title,base+'.title');nonempty(c.synopsis,base+'.synopsis');
    editorial(c.editorial,base+'.editorial');
    if(c.nature!=='fictional')fail('CASE_NATURE',base+'.nature','本期仅允许虚构演示案例');
    const facts=new Set(c.facts.map(f=>f.id));
    const evidence=new Set(c.evidence.map(e=>e.id));
    for(const [j,f] of c.facts.entries()){
      const p=base+'.facts['+j+']';
      addId(f.id,p+'.id');nonempty(f.title,p+'.title');nonempty(f.question,p+'.question');
    }
    for(const [j,e] of c.evidence.entries()){
      const p=base+'.evidence['+j+']';
      addId(e.id,p+'.id');nonempty(e.title,p+'.title');nonempty(e.proposedPurpose,p+'.proposedPurpose');
    }
    for(const [j,issue] of c.issues.entries()){
      const p=base+'.issues['+j+']';
      addId(issue.id,p+'.id');nonempty(issue.title,p+'.title');
      for(const id of issue.factIds)if(!facts.has(id))fail('DANGLING_FACT',p+'.factIds',id);
      for(const id of issue.conceptIds)if(!concepts.has(id))fail('DANGLING_CONCEPT',p+'.conceptIds',id);
      for(const id of issue.sourceIds)if(!sources.has(id))fail('DANGLING_SOURCE',p+'.sourceIds',id);
    }
    const linkPairs=new Set<string>();
    for(const [j,link] of c.links.entries()){
      const p=base+'.links['+j+']';
      addId(link.id,p+'.id');
      if(!facts.has(link.factId))fail('DANGLING_FACT',p+'.factId',link.factId);
      if(!evidence.has(link.evidenceId))fail('DANGLING_EVIDENCE',p+'.evidenceId',link.evidenceId);
      const pair=link.evidenceId+'--'+link.factId+'--'+link.relation;
      if(linkPairs.has(pair))fail('DUPLICATE_LINK',p,'同一证据关系重复');
      linkPairs.add(pair);
      if(link.review==='verified' && c.evidence.find(e=>e.id===link.evidenceId)?.authenticity!=='checked')
        fail('UNVERIFIED_EVIDENCE',p+'.review','来源尚未核查不可标为已核验');
    }
    for(const [j,event] of c.events.entries()){
      const p=base+'.events['+j+']';
      addId(event.id,p+'.id');nonempty(event.title,p+'.title');
      if(!dateOK(event.date))fail('DATE',p+'.date','事件日期无效');
      for(const id of event.evidenceIds)if(!evidence.has(id))
        fail('DANGLING_EVIDENCE',p+'.evidenceIds',id);
    }
  }
  return errors;
}

export function assertValidContent(data: LegalContentRegistry): LegalContentRegistry {
  const diagnostics = validateContent(data);
  if (diagnostics.length) throw new Error(
    'LawLab 内容完整性校验未通过：\n'+diagnostics.map(x=>x.code+' '+x.path+': '+x.message).join('\n')
  );
  return data;
}
