import {test} from "node:test";
import assert from "node:assert/strict";
import {academicURL,rootDomain,fetchPage,qualification,robotAllowed,parsePage,research,searchUniversities} from "../lib/admissions.mjs";
const profile={applicant:"international",level:"first-year"};
const html=(body,title="Undergraduate admissions")=>"<html><head><title>"+title+"</title></head><body><main>"+body+"</main></body></html>";
const response=(text,status=200,type="text/html")=>new Response(text,{status,headers:{"content-type":type}});

test("accepts academic domains and rejects unsafe or unrelated addresses",()=>{
  for(const url of ["https://admission.example.edu/","https://www.example.ac.uk/","https://www.example.edu.ma/","https://mitadmissions.org/"])assert.ok(academicURL(url));
  for(const url of ["http://example.edu/","https://localhost/","https://127.0.0.1/","https://[::1]/","https://example.edu.evil.com/","https://user:pass@example.edu/","https://example.edu:444/","file:///etc/passwd","https://example.com/"])assert.throws(()=>academicURL(url));
  assert.equal(rootDomain("admission.example.ac.uk"),"example.ac.uk");
});
test("does not promote optional or mixed requirements to mandatory",()=>{
  assert.equal(qualification("We do not require an English test."),"Optional / not required");
  assert.equal(qualification("An optional portfolio may be submitted."),"Optional / not required");
  assert.equal(qualification("A transcript is required if you studied abroad."),"Conditional — check eligibility");
  assert.equal(qualification("We require two references and recommend a third."),"Mixed conditions — review source");
  assert.equal(qualification("We require the SAT or ACT. We do not require the ACT writing section or the optional SAT essay."),"Mixed conditions — review source");
  assert.equal(qualification("Application requirements: essays, activities, recommendations, and test scores."),"Required in source — verify scope");
});
test("robots applies specific rules, wildcards and allow precedence",()=>{
  assert.equal(robotAllowed("User-agent: *\nDisallow: /private\nAllow: /private/public","/private/public/a"),true);
  assert.equal(robotAllowed("User-agent: *\nDisallow: /*.pdf$","/docs/test.pdf"),false);
  assert.equal(robotAllowed("User-agent: *\nDisallow: /\nUser-agent: ApplyTrackResearch\nAllow: /","/apply"),true);
  assert.equal(robotAllowed("User-agent: *\nDisallow: /","/apply"),false);
});
test("extracts sourced document evidence and ignores script or navigation text",()=>{
  const page=parsePage(html('<nav><p>Required fake portfolio navigation</p></nav><h2>Required documents</h2><p>You must submit your high school transcript.</p><script>Required IELTS test</script>'),"https://example.edu/apply",profile);
  assert.equal(page.records.length,1);assert.equal(page.records[0].label,"Academic transcripts");
  assert.match(page.records[0].quote,/must submit/);assert.equal(page.records[0].url,"https://example.edu/apply");
});
test("separates transfer-only sections from first-year evidence",()=>{
  const page=parsePage(html("<h2>Transfer applicants</h2><p>Transfer applicants must submit a college transcript.</p><h2>First-year applicants</h2><p>You must submit a personal essay with your application.</p>"),"https://example.edu/apply",profile);
  assert.equal(page.records.length,1);assert.equal(page.records[0].label,"Application essays");
});
test("international-only pages are not used for a domestic profile",()=>{
  const page=parsePage(html("<p>You must submit English proficiency test results.</p>","International applicants"),"https://example.edu/international",{applicant:"domestic",level:"first-year"});
  assert.equal(page.records.length,0);
});
test("rejects redirects before making an off-domain or private request",async()=>{
  const calls=[];
  const fetcher=async(url)=>{calls.push(url);return new Response(null,{status:302,headers:{location:"https://127.0.0.1/private"}});};
  await assert.rejects(fetchPage("https://example.edu/","example.edu",fetcher));
  assert.equal(calls.length,1);
});
test("does not fetch a robots-disallowed redirect destination",async()=>{
  const calls=[];
  const fetcher=async url=>{
    calls.push(url);
    if(url.endsWith("/robots.txt"))return response("User-agent: *\nDisallow: /private",200,"text/plain");
    return new Response(null,{status:302,headers:{location:"/private"}});
  };
  const report=await research({url:"https://example.edu/",...profile},fetcher);
  assert.equal(report.pages.length,0);assert.ok(!calls.some(u=>u.endsWith("/private")));assert.ok(report.warnings.length);
});
test("bounded crawl prioritizes international pages and preserves qualifiers",async()=>{
  const fetcher=async url=>{
    if(url.endsWith("/robots.txt"))return response("",404);
    if(url.endsWith("/international"))return response(html("<p>If your transcript is not in English, a certified translation is required.</p>","International first-year applicants"));
    return response(html('<p>An optional portfolio can accompany the application.</p><a href="/international">International requirements</a><a href="https://external.edu/apply">Other university</a>'));
  };
  const report=await research({url:"https://example.edu/",...profile},fetcher);
  assert.equal(report.pages.length,2);assert.ok(report.documents.some(d=>d.label==="Document translations"));
  assert.ok(report.documents.some(d=>d.qualification==="Optional / not required"));assert.ok(report.checkedAt);
});
test("failed scans return unknown coverage, not invented requirements",async()=>{
  const result=await research({url:"https://example.edu/",...profile},async()=>response("",403));
  assert.deepEqual(result.documents,[]);assert.equal(result.pages.length,0);assert.ok(result.warnings.length);assert.match(result.coverage,/not a complete/);
});
test("blocks non-HTML and oversized pages",async()=>{
  await assert.rejects(fetchPage("https://example.edu/","example.edu",async()=>response("pdf",200,"application/pdf")),/not an HTML/);
  await assert.rejects(fetchPage("https://example.edu/","example.edu",async()=>response("a".repeat(650001))),/too large/);
});
test("known university matches work without a third-party search call",async()=>{
  const result=await searchUniversities("MIT",async()=>{throw new Error("must not fetch");});
  assert.equal(result.universities[0].name,"Massachusetts Institute of Technology");
});
test("unavailable university search returns a manual fallback",async()=>{
  const result=await searchUniversities("Nonexistent College",async()=>{throw new Error();});
  assert.equal(result.universities.length,0);assert.match(result.message,/Paste an official/);
});
test("deduplicates pages that redirect to the same final address",async()=>{
  const fetcher=async url=>{
    if(url.endsWith("/robots.txt"))return response("",404);
    if(url.endsWith("/apply"))return new Response(null,{status:302,headers:{location:"/first-year"}});
    return response(html('<p>We require an academic transcript from each school.</p><a href="/first-year">First-year requirements</a>'));
  };
  const result=await research({url:"https://example.edu/apply",...profile},fetcher);
  assert.equal(result.pages.length,1);
});
