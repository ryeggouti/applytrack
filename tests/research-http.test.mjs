import {test} from "node:test";
import assert from "node:assert/strict";
import {createResearchHandler,createUniversityHandler,PAGES_ORIGIN} from "../lib/research-http.mjs";
import {academicURL} from "../lib/urls.mjs";
const payload={url:"https://example.edu/apply",applicant:"international",level:"first-year"};
const request=(body=payload,extra={})=>new Request("https://api.example/api/research",{
  method:"POST",headers:{Origin:PAGES_ORIGIN,"Content-Type":"application/json",...extra},
  body:typeof body==="string"?body:JSON.stringify(body),
});
const handler=research=>createResearchHandler({research,validateURL:academicURL});
test("Pages preflight permits JSON research without cookies",async()=>{
  const response=await handler(async()=>({}))(new Request("https://api.example/api/research",{method:"OPTIONS",headers:{Origin:PAGES_ORIGIN,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type"}}));
  assert.equal(response.status,204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"),PAGES_ORIGIN);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"),null);
  assert.match(response.headers.get("Access-Control-Allow-Headers"),/Content-Type/);
});
test("Pages receives research and only explicit research inputs are forwarded",async()=>{
  let received;
  const response=await handler(async value=>{received=value;return{documents:[]};})(request({...payload,notes:"do not forward",colleges:["private"]}));
  assert.equal(response.status,200);assert.deepEqual(received,payload);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"),PAGES_ORIGIN);
});
test("unrelated origins receive no usable CORS permission",async()=>{
  let called=false;
  const response=await handler(async()=>{called=true;})(request(payload,{Origin:"https://other.example"}));
  assert.equal(response.status,403);assert.equal(called,false);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"),null);
});
test("validation errors retain CORS headers for the Pages UI",async()=>{
  const response=await handler(async()=>({}))(request("not json"));
  assert.equal(response.status,400);assert.equal(response.headers.get("Access-Control-Allow-Origin"),PAGES_ORIGIN);
});
test("oversized bodies are rejected before invoking the crawler",async()=>{
  const response=await handler(async()=>{throw new Error("must not run");})(request("a".repeat(3001)));
  assert.equal(response.status,413);
});
test("claims concurrent-request slots before awaiting the body",async()=>{
  let finish;
  const handle=handler(()=>new Promise(resolve=>{finish=resolve;}));
  const first=handle(request());
  await new Promise(resolve=>setImmediate(resolve));
  const second=await handle(request());
  assert.equal(second.status,429);
  finish({documents:[]});assert.equal((await first).status,200);
});
test("failed crawls release their active slot",async()=>{
  const handle=handler(async()=>{throw new Error("Website unavailable");});
  assert.equal((await handle(request())).status,400);
  assert.equal((await handle(request())).status,400);
});
test("public lookups are bounded per client and per minute",async()=>{
  const handle=handler(async()=>({documents:[]}));
  for(let i=0;i<12;i++)assert.equal((await handle(request())).status,200);
  const result=await handle(request());
  assert.equal(result.status,429);assert.equal(result.headers.get("Retry-After"),"60");
});
test("Pages university discovery returns CORS-enabled JSON",async()=>{
  const handle=createUniversityHandler(async q=>({universities:[{name:q}]}));
  const response=await handle(new Request("https://api.example/api/universities?q=MIT",{headers:{Origin:PAGES_ORIGIN}}));
  assert.equal(response.status,200);assert.equal(response.headers.get("Access-Control-Allow-Origin"),PAGES_ORIGIN);
  assert.equal((await response.json()).universities[0].name,"MIT");
});
test("preflight refuses unsupported methods",async()=>{
  const handle=createUniversityHandler(async()=>({}));
  const response=await handle(new Request("https://api.example/api/universities",{method:"OPTIONS",headers:{Origin:PAGES_ORIGIN,"Access-Control-Request-Method":"DELETE"}}));
  assert.equal(response.status,405);
});
