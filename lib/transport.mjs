import {academicURL,sameInstitution} from "./urls.mjs";
const USER_AGENT="ApplyTrackResearch/1.0 (public admissions page lookup)";
async function limitedText(response,limit=650000){
  if(!response.body)return "";const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error("Page is too large to inspect.");chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
export async function fetchPage(value,root,fetcher=fetch,beforeRequest,{deadline}={}){
  let url=academicURL(value);
  const timeout=()=>{if(deadline&&Date.now()>=deadline){const e=new Error('The research time limit was reached before this page could be checked.');e.code='timeout';throw e;}return Math.min(8000,deadline?Math.max(1,deadline-Date.now()):8000);};
  for(let count=0;count<4;count++){
    if(!sameInstitution(url,root))throw new Error("This page redirects outside the university’s website.");
    timeout();if(beforeRequest)await beforeRequest(url);
    const res=await fetcher(url.href,{redirect:"manual",headers:{"User-Agent":USER_AGENT,Accept:"text/html,text/plain;q=0.8"},signal:AbortSignal.timeout(timeout())});
    if(res.status>=300&&res.status<400){const loc=res.headers.get("location");if(!loc)throw new Error("Redirect has no destination.");await res.body?.cancel();const target=new URL(loc,url);
      // Some universities emit old HTTP Location headers. Try HTTPS only;
      // retain academic-host, same-institution, robots and certificate checks.
      if(target.protocol==='http:')target.protocol='https:';
      url=academicURL(target.href);continue;}
    if(!res.ok){await res.body?.cancel();throw new Error([401,403,405,429].includes(res.status)?"The university blocked automated access (HTTP "+res.status+"). Open the official page and use Paste page text instead.":"The university returned HTTP "+res.status+".");}
    if(!/text\/(html|plain)|application\/xhtml/i.test(res.headers.get("content-type")||"")){await res.body?.cancel();throw new Error("This is not an HTML page. PDFs need manual review.");}
    const html=await limitedText(res);
    if(/<title[^>]*>[^<]*(?:human verification|just a moment|access denied|robot check)/i.test(html))throw new Error("The university requires human verification. Open the official page and use Paste page text instead.");
    return {url:url.href,html};
  }throw new Error("Too many redirects.");
}
