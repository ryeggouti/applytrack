import {academicURL,sameInstitution} from "./urls.mjs";
const USER_AGENT="ApplyTrackResearch/1.0 (public admissions page lookup)";
async function limitedText(response,limit=650000){
  if(!response.body)return "";const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error("Page is too large to inspect.");chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
export async function fetchPage(value,root,fetcher=fetch,beforeRequest){
  let url=academicURL(value);
  for(let count=0;count<4;count++){
    if(!sameInstitution(url,root))throw new Error("This page redirects outside the university’s website.");
    if(beforeRequest)await beforeRequest(url);
    const res=await fetcher(url.href,{redirect:"manual",headers:{"User-Agent":USER_AGENT,Accept:"text/html,text/plain;q=0.8"},signal:AbortSignal.timeout(8000)});
    if(res.status>=300&&res.status<400){const loc=res.headers.get("location");if(!loc)throw new Error("Redirect has no destination.");await res.body?.cancel();url=academicURL(new URL(loc,url).href);continue;}
    if(!res.ok)throw new Error("The university returned HTTP "+res.status+".");
    if(!/text\/(html|plain)|application\/xhtml/i.test(res.headers.get("content-type")||""))throw new Error("This is not an HTML page. PDFs need manual review.");
    return {url:url.href,html:await limitedText(res)};
  }throw new Error("Too many redirects.");
}
