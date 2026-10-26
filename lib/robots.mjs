import {fetchPage} from "./transport.mjs";
export function robotAllowed(text,path){
  const groups=[];let group=null,hasRules=false;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,"").trim(),split=line.indexOf(":");if(split<0)continue;
    const key=line.slice(0,split).trim().toLowerCase(),value=line.slice(split+1).trim();
    if(key==="user-agent"){if(!group||hasRules){group={agents:[],rules:[]};groups.push(group);hasRules=false;}group.agents.push(value.toLowerCase());}
    else if(group&&(key==="allow"||key==="disallow")){hasRules=true;if(value)group.rules.push({allow:key==="allow",path:value});}
  }
  const specific=groups.filter(g=>g.agents.some(a=>a!=="*"&&"applytrackresearch".includes(a)));
  const selected=specific.length?specific:groups.filter(g=>g.agents.includes("*"));
  const matches=selected.flatMap(g=>g.rules).filter(r=>{
    const end=r.path.endsWith("$"),literal=end?r.path.slice(0,-1):r.path;
    const pattern=literal.split("*").map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*");
    return new RegExp("^"+pattern+(end?"$":"")).test(path);
  }).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !matches.length||matches[0].allow;
}
export async function robotsFor(url,root,fetcher){
  try{return (await fetchPage(new URL("/robots.txt",url).href,root,fetcher)).html;}
  catch(error){if(error.message.includes("HTTP 404"))return "";throw new Error("Could not confirm crawler access for "+new URL(url).hostname+". Try another official page.");}
}
