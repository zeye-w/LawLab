import { getDocument,GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {MAX_PAGE_CHARS,MAX_PAGES,MAX_TOTAL_CHARS,type SourcePassage} from '../../worker/grounding';

GlobalWorkerOptions.workerSrc=workerSrc;
export const MAX_PDF_BYTES=8*1024*1024;
export type ExtractedPDF={fileName:string;totalPages:number;passages:SourcePassage[];sampledCharacters:number};
export async function extractPdfPages(file:File):Promise<ExtractedPDF>{
  if(!/\.pdf$/i.test(file.name))throw new Error('请选择 PDF 格式的文献。');
  if(file.size===0||file.size>MAX_PDF_BYTES)throw new Error('PDF 文件大小必须在 8 MB 以内。');
  const data=new Uint8Array(await file.arrayBuffer());
  const task=getDocument({data,useSystemFonts:true});
  const doc=await task.promise;
  const passages:SourcePassage[]=[];let total=0;
  try{
    for(let p=1;p<=Math.min(doc.numPages,MAX_PAGES);p++){
      const page=await doc.getPage(p);
      const text=await page.getTextContent();
      const content=text.items.map(item=>'str' in item && typeof item.str==='string'?item.str:'')
        .join(' ').replace(/\s+/g,' ').trim().slice(0,MAX_PAGE_CHARS);
      if(content.length>0 && total+content.length<=MAX_TOTAL_CHARS){
        passages.push({page:p,text:content});
        total+=content.length;
      }
      page.cleanup();
    }
  }finally{await doc.destroy();}
  if(total<180)throw new Error('可提取文字不足。该文献可能是扫描版或加密 PDF，目前需要先做 OCR。');
  return {fileName:file.name,totalPages:doc.numPages,passages,sampledCharacters:total};
}
