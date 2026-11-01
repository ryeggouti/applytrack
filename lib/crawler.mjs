import {academicURL,rootDomain,sameInstitution} from "./urls.mjs";
import {fetchPage} from "./transport.mjs";
import {robotAllowed,robotsFor} from "./robots.mjs";
import {parsePage} from "./evidence.mjs";
export async function research({url,applicant="international",level="first-year"},fetcher=fetch){
  const start=academicURL(url),root=rootDomain(start.hostname),profile={applicant,level};
  const queue=[{url:start.href,score:100}],visited=new Set(),pages=[],warnings=[],rules=new Map(),started=Date.now();
  const checkAccess=async candidate=>{
    if(!rules.has(candidate.origin))rules.set(candidate.origin,await robotsFor(candidate,root,fetcher));
    if(!robotAllowed(rules.get(candidate.origin),candidate.pathname+candidate.search))throw new Error("Crawler access is disallowed for "+candidate.href);
  };
  for(let attempts=0;attempts<10&&queue.length&&pages.length<8&&Date.now()-started<24000;attempts++){
    // Once date/fee evidence is present, use remaining slots for checklist coverage.
    const covered=kind=>pages.some(p=>p.records.some(r=>r.kind===kind));
    const priority=q=>q.score-((covered('deadline')&&/deadline|timeline/i.test(q.url+' '+q.text))?45:0)-((covered('fee')&&/fee.waiver|application.fee/i.test(q.url+' '+q.text))?35:0);
    queue.sort((a,b)=>priority(b)-priority(a));
    const next=queue.shift();if(next.score<10&&pages.length)break;if(visited.has(next.url)){attempts--;continue;}visited.add(next.url);
    try{
      const candidate=academicURL(next.url);if(!sameInstitution(candidate,root))continue;
      const fetched=await fetchPage(candidate.href,root,fetcher,checkAccess),final=new URL(fetched.url);
      if(pages.some(p=>p.url===final.href))continue;
      visited.add(final.href);
      const page=parsePage(fetched.html,fetched.url,profile);pages.push(page);
      for(const link of page.links)if(sameInstitution(new URL(link.url),root)&&!visited.has(link.url)&&!queue.some(q=>q.url===link.url))queue.push(link);
      if(queue.length>60)queue.sort((a,b)=>b.score-a.score).splice(60);
    }catch(error){warnings.push(error.message);}
  }
  return reportFromPages(pages,profile,warnings);
}
export function reportFromPages(pages,profile,warnings=[],acquisition='fetched'){
  const unique=new Map();for(const record of pages.flatMap(p=>p.records)){const key=record.kind+"|"+record.label+"|"+record.quote;if(!unique.has(key))unique.set(key,record);}
  const all=[...unique.values()],perKind=kind=>all.filter(r=>r.kind===kind);
  // One checklist suggestion per topic, retaining multiple excerpts when conditions differ.
  const topics=new Map();
  for(const record of all.filter(r=>r.kind==="document")){
    if(!topics.has(record.label))topics.set(record.label,[]);
    topics.get(record.label).push(record);
  }
  const documents=[...topics.values()].map(items=>{
    const rank=r=>(/requirements|checklist/i.test(r.url)?4:0)+(/Required in source/.test(r.qualification)?12:0)+(/Mixed/.test(r.qualification)?10:0)+(/Optional|Recommended|Conditional/.test(r.qualification)?6:0);
    items.sort((a,b)=>rank(b)-rank(a));
    const first=items[0],qualifiers=new Set(items.map(r=>r.qualification));
    const conflicting=[...qualifiers].some(q=>q.startsWith("Required"))&&[...qualifiers].some(q=>q.startsWith("Optional")||q.startsWith("Recommended"));
    return {...first,qualification:conflicting?"Mixed conditions — review source":first.qualification,
      additionalEvidence:items.filter(r=>r.quote!==first.quote).slice(0,2).map(({quote,url,title,section,qualification})=>({quote,url,title,section,qualification}))};
  });
  return {checkedAt:new Date().toISOString(),acquisition,profile,pages:pages.map(({title,url})=>({title,url})),documents,deadlines:perKind("deadline",8),fees:perKind("fee",5),warnings:[...new Set(warnings)].slice(0,5),
    coverage:"Limited scan of up to eight public HTML pages, not a complete or verified checklist. Requirements vary by citizenship, schooling, program, admission round, and entry year."};
}

// User-supplied plain text is never fetched or executed, and is explicitly labelled.
export function inspectText({url,text,applicant='international',level='first-year'}){
  const source=academicURL(url).href;
  if(typeof text!=='string'||text.trim().length<50||text.length>60000)throw new Error('Paste 50–60,000 characters from the official admissions page.');
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const html='<html><head><title>Pasted admissions page</title></head><body><main>'+text.split(/\r?\n/).filter(s=>s.trim()).map(s=>'<p>'+escape(s)+'</p>').join('')+'</main></body></html>';
  const report=reportFromPages([parsePage(html,source,{applicant,level})],{applicant,level},[],'pasted');
  report.coverage='Extracted from text you pasted and linked to an official URL. ApplyTrack did not fetch or authenticate this text. Review it against the original page; this is not a complete or verified checklist.';
  return report;
}
