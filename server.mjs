import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"public");
const active=new Set();
function json(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(data));}
export const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,"http://"+(req.headers.host||"localhost"));
    if (url.pathname === "/api/universities" && req.method === "GET") {
      const query=(url.searchParams.get("q")||"").trim();
      if(query.length<2||query.length>150)return json(res,400,{error:"Enter a university name between 2 and 150 characters."});
      const {searchUniversities}=await import("./lib/universities.mjs");
      return json(res,200,await searchUniversities(query));
    }
    if (url.pathname === "/api/research" && req.method === "POST") {
      const expected=process.env.PUBLIC_ORIGIN||url.origin;
      if(req.headers.origin&&req.headers.origin!==expected)return json(res,403,{error:"Use research from ApplyTrack."});
      const owner=req.socket.remoteAddress||"local";
      if(active.has(owner))return json(res,429,{error:"Your previous lookup is still running."});
      active.add(owner);
      try {
        let raw="";
        for await(const chunk of req){raw+=chunk.toString("utf8");if(Buffer.byteLength(raw)>3000)return json(res,413,{error:"Request too large."});}
        const data=JSON.parse(raw);
        if(typeof data.url!=="string"||data.url.length>1000||!["domestic","international"].includes(data.applicant)||!["first-year","transfer"].includes(data.level))return json(res,400,{error:"Choose an official URL, applicant type and entry type."});
        const {academicURL}=await import("./lib/urls.mjs");academicURL(data.url);
        const {research}=await import("./lib/crawler.mjs");
        return json(res,200,await research(data));
      } catch(error) { return json(res,400,{error:error.message||"Lookup failed."}); }
      finally {active.delete(owner);}
    }
    if(url.pathname.startsWith("/api/"))return json(res,404,{error:"Endpoint not found."});
    if(!["GET","HEAD"].includes(req.method))return json(res,405,{error:"Method not allowed."});
    const requested=["/","/planner","/planner.html"].includes(url.pathname)?"index.html":decodeURIComponent(url.pathname).replace(/^\/+/,"");
    const file=path.resolve(root,requested);
    if(!file.startsWith(root+path.sep))return json(res,403,{error:"Path not allowed."});
    const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".png":"image/png"};
    const data=await fs.readFile(file);
    res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Cache-Control":"no-cache"});
    res.end(req.method==="HEAD"?undefined:data);
  } catch(error) {json(res,error.code==="ENOENT"?404:400,{error:error.code==="ENOENT"?"Not found":"Request could not be processed."});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000),host=process.env.HOST||"127.0.0.1";
  server.listen(port,host,()=>console.log("ApplyTrack: http://"+host+":"+server.address().port));
}
