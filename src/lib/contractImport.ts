/** Browser-only contract text import. Never uploads the original document to LawLab or an AI API. */
export type ContractFormat = 'txt'|'doc'|'docx'|'pdf';
export type ContractIntegrity='complete'|'needs-review'|'blocked';
export type ContractPageSpan={page:number;start:number;end:number};
export type ContractImportResult = {
  name:string;format:ContractFormat;text:string;warnings:string[];
  pages?:number;pageSpans?:ContractPageSpan[];integrity:ContractIntegrity
};

export const MAX_CONTRACT_FILE_BYTES=8*1024*1024;
export const MAX_CONTRACT_TEXT_CHARS=120000;
export const MAX_CONTRACT_PDF_PAGES=80;
const CFB_MAGIC=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];

export function contractFormat(name:string):ContractFormat{
  const ext=name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if(ext==='txt'||ext==='doc'||ext==='docx'||ext==='pdf')return ext;
  throw new Error('请选择 .txt、.doc、.docx 或 .pdf 文件。');
}
export function validContractHeader(format:ContractFormat,head:Uint8Array):boolean{
  if(format==='txt')return true;
  if(format==='pdf')return head.length>=5 && String.fromCharCode(...head.slice(0,5))==='%PDF-';
  if(format==='doc')return CFB_MAGIC.every((v,i)=>head[i]===v);
  return head.length>=4&&head[0]===0x50&&head[1]===0x4b&&
    ((head[2]===3&&head[3]===4)||(head[2]===5&&head[3]===6));
}
export function normalizeContractText(text:string):string{
  // Strip null/control characters without destroying clause boundaries or tabs.
  return text.replace(/\u0000/g,'').replace(/\r\n?/g,'\n')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
    // PDF.js often splits Chinese words into individual text items.
    .replace(/(?<=\p{Script=Han})[ \t]+(?=\p{Script=Han})/gu,'')
    .replace(/[ \t]+\n/g,'').replace(/\n{4,}/g,'\n\n\n').trim();
}
export function validatedContractText(raw:string):string{
  const text=normalizeContractText(raw);
  if(text.length<20)throw new Error('提取到的合同文字过少，无法可靠审查。扫描件需先 OCR，或改用可选择文字的文件。');
  if(text.length>MAX_CONTRACT_TEXT_CHARS)throw new Error('合同全文超过 12 万字符上限，无法完整审查。请拆分文件后分别导入，不会自动截断条款。');
  return text;
}
/** Bound DOCX decompression before invoking Mammoth; only standard single-disk ZIP files. */
export function inspectDocxZip(data:Uint8Array):void{
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  let end=-1;
  for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){
    if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  }
  if(end<0||end+22>data.length)throw new Error('Word 文件 ZIP 结构不完整，无法读取。');
  if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0)throw new Error('不支持多分卷 Word 文件。');
  const count=view.getUint16(end+10,true),cdSize=view.getUint32(end+12,true),cdOffset=view.getUint32(end+16,true);
  if(count===0||count>400||cdOffset+cdSize>data.length)throw new Error('Word 文件结构超出安全限制。');
  let offset=cdOffset,total=0,documentFound=false;
  const decoder=new TextDecoder();
  for(let i=0;i<count;i++){
    if(offset+46>data.length||view.getUint32(offset,true)!==0x02014b50)throw new Error('Word 文件目录结构无效。');
    const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true);
    if(flags&1||![0,8].includes(method))throw new Error('Word 文档使用加密或不支持的压缩格式。');
    const compressed=view.getUint32(offset+20,true),uncompressed=view.getUint32(offset+24,true);
    const nameLen=view.getUint16(offset+28,true),extraLen=view.getUint16(offset+30,true),commentLen=view.getUint16(offset+32,true);
    if(compressed===0xffffffff||uncompressed===0xffffffff)throw new Error('暂不支持 ZIP64 Word 文件。');
    total+=uncompressed;
    if(uncompressed>12*1024*1024||total>18*1024*1024||uncompressed>Math.max(256,compressed*180)){
      throw new Error('Word 文件解压大小或压缩比超出安全限制。');
    }
    const next=offset+46+nameLen+extraLen+commentLen;
    if(next>data.length)throw new Error('Word 文件目录结构无效。');
    const entry=decoder.decode(data.subarray(offset+46,offset+46+nameLen));
    if(entry==='word/document.xml')documentFound=true;
    offset=next;
  }
  if(offset!==cdOffset+cdSize||!documentFound)throw new Error('未找到 Word 正文内容，请检查是否选择了真正的 .docx 文件。');
}
/** Text-only physical PDF page coordinates; blank pages contribute no characters. */
export function flattenPdfTextPages(parts:readonly string[]):{text:string;pageSpans:ContractPageSpan[]} {
  const chunks:string[]=[];const pageSpans:ContractPageSpan[]=[];
  let cursor=0;
  for(let i=0;i<parts.length;i++){
    if(!parts[i])continue;
    if(chunks.length){chunks.push('\n\n');cursor+=2;}
    const start=cursor;chunks.push(parts[i]);cursor+=parts[i].length;
    pageSpans.push({page:i+1,start,end:cursor});
  }
  return {text:chunks.join(''),pageSpans};
}

async function extractPdf(data:Uint8Array):Promise<{
  text:string;pages:number;warnings:string[];pageSpans:ContractPageSpan[];integrity:ContractIntegrity
}>{
  const [{getDocument,GlobalWorkerOptions},{default:workerSrc}]=await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  GlobalWorkerOptions.workerSrc=workerSrc;
  const task=getDocument({data,useSystemFonts:true});
  let doc:Awaited<typeof task.promise>;
  try{doc=await task.promise;}
  catch{throw new Error('PDF 无法读取，可能已加密、损坏或格式不受支持。');}
  const parts:string[]=[],blank:number[]=[];let extractedChars=0;
  try{
    if(doc.numPages>MAX_CONTRACT_PDF_PAGES)throw new Error('PDF 超过 80 页的完整解析上限。请拆分文件，不会截断后直接审查。');
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);
      const data=await page.getTextContent();
      const segment=data.items.map(item=>'str' in item&&typeof item.str==='string'
        ?item.str+(('hasEOL' in item&&item.hasEOL)?'\n':' '):'').join('');
      const text=normalizeContractText(segment);
      if(text.length<8)blank.push(i);
      parts.push(text);extractedChars+=text.length;
      if(extractedChars+2*Math.max(0,parts.length-1)>MAX_CONTRACT_TEXT_CHARS){
        throw new Error('PDF 文字超过 12 万字符上限，已停止解析。请拆分文件后分别审查。');
      }
      page.cleanup();
    }
  }finally{await doc.destroy();}
  if(blank.length===parts.length)throw new Error('PDF 没有足够的可提取文字，可能是扫描件。请先 OCR 再上传。');
  const {text:flattened,pageSpans}=flattenPdfTextPages(parts);
  const warnings=blank.length?[('第 '+blank.slice(0,8).join('、')+' 页'+(blank.length>8?'等':'')+'正文极少或未提取到正文；这份文档可能包含扫描页面，审查范围不完整。')]:[];
  return {text:flattened,pages:parts.length,warnings,pageSpans,
    integrity:blank.length?'needs-review':'complete'};
}
export async function importContractFile(file:File):Promise<ContractImportResult>{
  const format=contractFormat(file.name);
  if(!file.size||file.size>MAX_CONTRACT_FILE_BYTES){
    throw new Error('仅支持大于 0 且不超过 8 MB 的合同文件。');
  }
  const buffer=await file.arrayBuffer();
  const bytes=new Uint8Array(buffer);
  if(!validContractHeader(format,bytes.subarray(0,8))){
    throw new Error('文件内容与扩展名不符。请确认不是误命名的其他格式。');
  }
  let text='',pages:number|undefined,pageSpans:ContractPageSpan[]|undefined;
  let integrity:ContractIntegrity='complete';
  const warnings:string[]=[];
  try{
    if(format==='txt'){
      text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    }else if(format==='doc'){
      const {default:readDoc}=await import('./vendor/docToText.js');
      const extracted=readDoc(bytes);
      if(typeof extracted!=='string')throw new Error('无法解析旧版 .doc，可能是加密、损坏或早期 Word 文件。请在 Word 中另存为 .docx 后重试。');
      text=extracted;
      warnings.push('旧版 .doc 只提取主要正文；请人工核对批注、页眉页脚、图片、脚注及表格的遗漏风险。');
      integrity='needs-review';
    }else if(format==='docx'){
      inspectDocxZip(bytes);
      const mammoth=await import('mammoth');
      const result=await mammoth.extractRawText({arrayBuffer:buffer});
      text=result.value;
      warnings.push('Word 格式、图片及修订痕迹不会参与规则筛查，请核对原件中的表格、批注和修订内容。');
      integrity='needs-review';
    }else{
      const result=await extractPdf(bytes);
      text=result.text;pages=result.pages;pageSpans=result.pageSpans;
      integrity=result.integrity;warnings.push(...result.warnings);
    }
  }catch(e){
    if(e instanceof Error && /无法|超过|不支持|未找到|解压|结构|加密|OCR|过少|损坏|不完整|安全限制|错误/.test(e.message))throw e;
    throw new Error('文件正文解析失败，请确认文件未加密且包含可选择文字。');
  }
  const validated=validatedContractText(text);
  // PDF coordinates must reference exactly the validated text, never pre-normalized bytes.
  if(pageSpans?.length){
    const mapped=pageSpans.map(span=>({...span}));
    const originalChunks=mapped.map(span=>text.slice(span.start,span.end));
    if(validated!==text||originalChunks.some((chunk,i)=>validated.slice(mapped[i].start,mapped[i].end)!==chunk)){
      pageSpans=undefined;
      integrity='needs-review';
      warnings.push('正文经过额外规范化，原 PDF 页码映射不可可靠还原；请核对原件。');
    }else{pageSpans=mapped;}
  }
  return {name:file.name,format,text:validated,warnings,pages,pageSpans,integrity};
}
