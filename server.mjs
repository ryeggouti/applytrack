import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createResearchHandler,createUniversityHandler} from "./lib/research-http.mjs";
import {research,academicURL,searchUniversities} from "./lib/admissions.mjs";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"public");
const researchHandler=createResearchHandler({research,validateURL:academicURL});
const universityHandler=createUniversityHandler(searchUniversities);
function json(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(data));}
export const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,process.env.PUBLIC_ORIGIN||"http://"+(req.headers.host||"localhost"));
    if (["/api/universities","/api/research"].includes(url.pathname)) {
      const headers=new Headers(req.headers);
      headers.set("cf-connecting-ip",req.socket.remoteAddress||"local");
      const incoming=new Request(url,{method:req.method,headers,...(req.method==="POST"?{body:req,duplex:"half"}:{})});
      const result=await (url.pathname==="/api/research"?researchHandler:universityHandler)(incoming);
      res.writeHead(result.status,Object.fromEntries(result.headers));
      return res.end(await result.text());
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
