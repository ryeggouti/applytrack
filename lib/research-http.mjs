export const PAGES_ORIGIN="https://ryeggouti.github.io";
export function allowedOrigin(request){
  const origin=request.headers.get("origin");
  return !origin||origin===new URL(request.url).origin||origin===PAGES_ORIGIN;
}
export function corsHeaders(request){
  const origin=request.headers.get("origin");
  return {Vary:"Origin",...(origin&&allowedOrigin(request)?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"};
}
export function responseJSON(request,data,status=200,extra={}){
  return Response.json(data,{status,headers:{...corsHeaders(request),"Cache-Control":"no-store",...extra}});
}
function preflight(request,method){
  if(!allowedOrigin(request))return responseJSON(request,{error:"This website is not allowed to use this endpoint."},403);
  const requested=request.headers.get("access-control-request-method");
  if(requested&&requested!==method)return responseJSON(request,{error:"Method not allowed."},405);
  return new Response(null,{status:204,headers:corsHeaders(request)});
}
export function createUniversityHandler(search){
  return async request=>{
    if(request.method==="OPTIONS")return preflight(request,"GET");
    if(!allowedOrigin(request))return responseJSON(request,{error:"This website is not allowed to use university search."},403);
    if(request.method!=="GET")return responseJSON(request,{error:"Method not allowed."},405);
    const query=new URL(request.url).searchParams.get("q")?.trim()||"";
    if(query.length<2||query.length>150)return responseJSON(request,{error:"Enter a university name between 2 and 150 characters."},400);
    try{return responseJSON(request,await search(query));}
    catch{return responseJSON(request,{error:"University search is temporarily unavailable."},502);}
  };
}
export function createResearchHandler({research,validateURL}){
  const active=new Set(),attempts=new Map();
  return async request=>{
    if(request.method==="OPTIONS")return preflight(request,"POST");
    if(!allowedOrigin(request))return responseJSON(request,{error:"Use research from ApplyTrack."},403);
    if(request.method!=="POST")return responseJSON(request,{error:"Method not allowed."},405);
    const owner=request.headers.get("cf-connecting-ip")||request.headers.get("oai-authenticated-user-id")||"anonymous";
    if(active.has(owner))return responseJSON(request,{error:"Your previous lookup is still running."},429,{"Retry-After":"5"});
    if(active.size>=4)return responseJSON(request,{error:"Research is busy. Try again shortly."},429,{"Retry-After":"10"});
    const now=Date.now(),recent=(attempts.get(owner)||[]).filter(time=>now-time<60000);
    if(recent.length>=12)return responseJSON(request,{error:"Too many lookups. Please wait a minute."},429,{"Retry-After":"60"});
    if(attempts.size>=2000)attempts.delete(attempts.keys().next().value);
    attempts.set(owner,[...recent,now]);
    active.add(owner);
    try{
      if(Number(request.headers.get("content-length")||0)>3000)return responseJSON(request,{error:"Request too large."},413);
      let raw="";
      if(request.body){
        const reader=request.body.getReader(),decoder=new TextDecoder();let size=0;
        try{
          while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>3000){await reader.cancel();return responseJSON(request,{error:"Request too large."},413);}raw+=decoder.decode(value,{stream:true});}
          raw+=decoder.decode();
        }finally{reader.releaseLock();}
      }
      let data;try{data=JSON.parse(raw);}catch{return responseJSON(request,{error:"Send a valid JSON research request."},400);}
      if(!data||typeof data.url!=="string"||data.url.length>1000||!["domestic","international"].includes(data.applicant)||!["first-year","transfer"].includes(data.level))
        return responseJSON(request,{error:"Choose an official URL, applicant type and entry type."},400);
      validateURL(data.url);
      return responseJSON(request,await research({url:data.url,applicant:data.applicant,level:data.level}));
    }catch(error){return responseJSON(request,{error:error instanceof Error?error.message:"Lookup failed."},400);}
    finally{active.delete(owner);}
  };
}
