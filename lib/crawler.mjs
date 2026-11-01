import {academicURL,rootDomain,sameInstitution} from "./urls.mjs";
import {fetchPage} from "./transport.mjs";
import {robotAllowed,robotsFor} from "./robots.mjs";
import {parsePage} from "./evidence.mjs";
import {coverageChecks,sourceFailure,pagePurpose} from "./research-coverage.mjs";
import {officialReference} from "./official-references.mjs";
export async function research({url,applicant="international",level="first-year"},fetcher=fetch){
  const start=academicURL(url),root=rootDomain(start.hostname),profile={applicant,level};
  const queue=[{url:start.href,score:100}],visited=new Set(),pages=[],warnings=[],failures=[],manualLinks=[],rules=new Map(),purposes=new Map(),started=Date.now();let attempts=0;
  const checkAccess=async candidate=>{
    if(!rules.has(candidate.origin))rules.set(candidate.origin,robotsFor(candidate,root,fetcher,started+24000));
    if(!robotAllowed(await rules.get(candidate.origin),candidate.pathname+candidate.search))throw new Error("Crawler access is disallowed for "+candidate.href);
  };
  for(;attempts<14&&queue.length&&pages.length<10&&Date.now()-started<24000;attempts++){
    // Once date/fee evidence is present, use remaining slots for checklist coverage.
    const covered=kind=>pages.some(p=>p.records.some(r=>r.kind===kind));
    const lacks=label=>!pages.some(p=>p.records.some(r=>r.kind==='document'&&r.label===label));
    const priority=q=>q.score+(/recommendation|teacher.evaluation|reference.letter/i.test(q.url+' '+(q.text||''))&&(lacks('Teacher recommendations')||lacks('Counselor recommendation'))?40:0)+(/\/(?:apply|first-year|firstyear)\/?$/i.test(new URL(q.url).pathname)?35:0)+(pagePurpose(q.url+' '+(q.text||''))==='general'?0:24)-24*(purposes.get(pagePurpose(q.url+' '+(q.text||'')))||0)-((covered('deadline')&&/deadline|timeline/i.test(q.url+' '+q.text))?45:0)-((covered('fee')&&/fee.waiver|application.fee/i.test(q.url+' '+q.text))?35:0);
    queue.sort((a,b)=>priority(b)-priority(a));
    const next=queue.shift();if(next.score<10&&pages.length)break;if(visited.has(next.url)){attempts--;continue;}visited.add(next.url);
    try{
      const candidate=academicURL(next.url);if(!sameInstitution(candidate,root))continue;
      const fetched=await fetchPage(candidate.href,root,fetcher,checkAccess,{deadline:started+24000}),final=new URL(fetched.url);
      if(pages.some(p=>p.url===final.href))continue;
      visited.add(final.href);
      const page=parsePage(fetched.html,fetched.url,profile);
      if(page.readableText<30&&!page.records.length){const error=new Error('This page has no readable admissions content; it may require scripts or manual review.');error.code='unreadable';throw error;}
      pages.push(page);const purpose=pagePurpose(next.url+' '+(next.text||''));purposes.set(purpose,(purposes.get(purpose)||0)+1);
      manualLinks.push(...page.manualLinks.filter(link=>sameInstitution(new URL(link.url),root)));
      for(const link of page.links)if(sameInstitution(new URL(link.url),root)&&!visited.has(link.url)&&!queue.some(q=>q.url===link.url))queue.push(link);
      if(queue.length>60)queue.sort((a,b)=>b.score-a.score).splice(60);
    }catch(error){warnings.push(error.message);failures.push(sourceFailure(next.url,error));}
  }
  const remaining=queue.filter(q=>!visited.has(q.url));
  const report=reportFromPages(pages,profile,warnings,'fetched');
  report.scan={attempted:attempts,read:pages.length,limit:10,stopped:Date.now()-started>=24000?'time-limit':pages.length>=10?'page-limit':attempts>=14?'attempt-limit':'finished',failures,followUp:[...manualLinks,...remaining.slice(0,10).map(q=>({url:q.url,text:q.text||q.url,reason:'Not inspected within this bounded scan'}))].filter((link,i,all)=>all.findIndex(l=>l.url===link.url)===i).slice(0,15)};
  const reference=failures.length?officialReference(start.href,profile):null;
  if(reference){const saved=reportFromPages(reference.pages,profile,[],'reference');saved.checkedAt=reference.reviewed;saved.referenceCycle=reference.cycle;saved.coverage='Saved summaries of official Amherst instructions, reviewed '+reference.reviewed+' for '+reference.cycle+'. These pages were not fetched by this lookup. Current requirements, fee, deadlines and your personal eligibility remain unverified.';saved.verification=coverageChecks(saved.documents,profile,'reference');report.reference=saved;}
  return report;
}
export function reportFromPages(pages,profile,warnings=[],acquisition='fetched'){
  const unique=new Map();for(const record of pages.flatMap(p=>p.records)){const key=(record.scope||"admission")+"|"+record.kind+"|"+record.label+"|"+record.quote;if(!unique.has(key))unique.set(key,record);}
  const all=[...unique.values()],perKind=kind=>all.filter(r=>r.kind===kind);
  // One checklist suggestion per topic, retaining multiple excerpts when conditions differ.
  const topics=new Map();
  for(const record of all.filter(r=>r.kind==="document")){
    const key=(record.scope||"admission")+"|"+record.label;
    if(!topics.has(key))topics.set(key,[]);
    topics.get(key).push(record);
  }
  const documents=[...topics.values()].map(items=>{
    const rank=r=>(/requirements|checklist/i.test(r.url)?4:0)+(/Required in source/.test(r.qualification)?12:0)+(/Mixed/.test(r.qualification)?20:0)+(/Conditional/.test(r.qualification)?16:0)+(/Optional|Recommended/.test(r.qualification)?6:0);
    items.sort((a,b)=>rank(b)-rank(a));
    const first=items[0],qualifiers=new Set(items.map(r=>r.qualification));
    const conflicting=[...qualifiers].some(q=>q.startsWith("Required"))&&[...qualifiers].some(q=>q.startsWith("Optional")||q.startsWith("Recommended"));
    return {...first,qualification:conflicting?"Mixed conditions — review source":items.some(r=>/^Conditional/.test(r.qualification))?"Conditional — check eligibility":first.qualification,
      additionalEvidence:items.filter(r=>r.quote!==first.quote).slice(0,2).map(({quote,url,title,section,qualification})=>({quote,url,title,section,qualification}))};
  });
  return {checkedAt:new Date().toISOString(),acquisition,profile,verification:coverageChecks(documents,profile,acquisition),pages:pages.map(({title,url})=>({title,url})),documents,deadlines:perKind("deadline",8),fees:perKind("fee",5),warnings:[...new Set(warnings)].slice(0,5),
    coverage:"Limited scan of up to ten public HTML pages, not a complete or verified checklist. Requirements vary by citizenship, schooling, program, admission round, and entry year."};
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
