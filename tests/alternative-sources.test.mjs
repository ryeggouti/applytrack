import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parsePage} from '../lib/evidence.mjs';
import {research,reportFromPages} from '../lib/crawler.mjs';
import {alternativeSources} from '../lib/alternative-sources.mjs';
import {fetchPage} from '../lib/transport.mjs';
import {searchUniversities} from '../lib/universities.mjs';
const profile={applicant:'international',level:'first-year'},start='https://www.amherst.edu/admission/apply/firstyear',quick='https://admission.amherst.edu/register/quickpass',qb='https://admission.amherst.edu/register/qbrdsupplement';
const html=(title,body)=>`<title>${title}</title><main><form><input type="hidden" value="secret"><div class="form_question" data-type="p">${body}</div><div class="form_question" data-type="text"><p>Required portfolio: PRIVATE QUESTION</p><input value="private answer"></div><fieldset><label>Required transcript: PRIVATE FIELD</label><input value="private answer"></fieldset><select><option>PRIVATE CHOICE</option></select><textarea>PRIVATE DRAFT</textarea></form></main>`;
const quickHTML=html('Quick Pass Application Fee Waiver','<div>Amherst utilizes an institutional fee waiver option – Quick Pass. Complete the form to see if you qualify for an application fee waiver.</div><div>We cannot issue refunds for retroactive fee waivers.</div>');
const qbHTML=html('Amherst College Regular Decision Supplement to the QB App 2027','<p>This form is for QuestBridge students only and is due January 5, 2027 for Regular Decision consideration.</p><p>Standardized testing (SAT or ACT) is optional.</p><h2>Writing supplement</h2><p>Amherst requires a writing supplement. You may submit a graded written paper.</p><p>Optional arts supplements may be submitted.</p><p>The application fee is $0 for this pathway.</p><a href="/another-pathway">Application requirements</a>');
const response=(text,status=200)=>new Response(text,{status,headers:{'content-type':'text/html'}});
const context={URL};vm.createContext(context);vm.runInContext(readFileSync(new URL('../public/research-autofill.js',import.meta.url),'utf8'),context);

test('public form prose survives but fields, questionnaire prompts and answers are excluded',()=>{
  const page=parsePage(qbHTML,qb,profile),text=page.records.map(r=>r.quote).join(' ');
  assert.ok(page.readableText>30);assert.match(text,/writing supplement/);assert.doesNotMatch(text,/PRIVATE|private answer|secret/);
  assert.ok(page.records.some(r=>r.label==='SAT / ACT testing'));assert.ok(page.records.every(r=>r.scope==='questbridge'));
});
test('blocked main Amherst source automatically reads both alternatives but never mixes pathways',async()=>{
  const calls=[];const r=await research({url:start,...profile},async url=>{calls.push(url);if(url.startsWith('https://www.'))return response('Blocked',405);if(url.endsWith('/robots.txt'))return response('',404);return response(url===quick?quickHTML:qbHTML);});
  assert.deepEqual(r.pages.map(p=>p.url).sort(),[quick,qb].sort());assert.equal(r.scan.read,2);assert.equal(r.scan.failures.length,1);assert.equal(r.scan.attempted,3);
  assert.ok(r.fees.some(f=>/Quick Pass/.test(f.quote)));assert.deepEqual(r.documents,[]);assert.deepEqual(r.deadlines,[]);
  assert.equal(r.pathways[0].id,'questbridge');assert.ok(r.pathways[0].documents.some(d=>d.label==='Graded written paper'));assert.ok(r.pathways[0].deadlines.some(d=>/January 5, 2027/.test(d.quote)));
  const extracted=context.ApplyTrackResearch.extract(r);assert.equal(extracted.fee,null);assert.equal(extracted.deadlines.length,0);assert.ok(extracted.waiverStatus);assert.ok(r.verification.every(c=>c.status==='not-found'));
  assert.ok(!calls.some(u=>u.includes('another-pathway')));assert.ok(r.reference);
});
test('Quick Pass establishes only a fee-waiver policy, not a school checklist or eligibility',()=>{
  const p=parsePage(quickHTML,quick,profile);assert.ok(p.records.length);assert.ok(p.records.every(r=>r.kind==='fee'));const r=reportFromPages([p],profile),e=context.ApplyTrackResearch.extract(r);assert.equal(e.fee,null);assert.equal(e.waiverStatus,'Available — check eligibility');assert.equal(e.deadlines.length,0);
});
test('QuestBridge sources entered directly stay isolated, including dates and fees',async()=>{
  const r=await research({url:qb,...profile},async url=>url.endsWith('robots.txt')?response('',404):response(qbHTML));
  assert.equal(r.pages.length,1);assert.deepEqual(r.documents,[]);assert.deepEqual(r.deadlines,[]);assert.deepEqual(r.fees,[]);assert.ok(r.pathways[0].documents.length);assert.equal(context.ApplyTrackResearch.extract(r).fee,null);
});
test('alternatives respect robots and never apply to transfers, unrelated paths or another university',async()=>{
  for(const [url,p] of [['https://umass.edu/admission',profile],[start,{...profile,level:'transfer'}],['https://www.amherst.edu/admission/apply/transfer',profile],['https://www.amherst.edu/news',profile]])assert.deepEqual(alternativeSources(url,p),[]);
  let formCalls=0;const r=await research({url:start,...profile},async url=>{if(url.startsWith('https://www.'))return response('Blocked',405);if(url.endsWith('robots.txt'))return response('User-agent: *\nDisallow: /register/');formCalls++;return response(qbHTML);});assert.equal(formCalls,0);assert.equal(r.pages.length,0);assert.equal(r.scan.failures.filter(f=>f.code==='robots-denied').length,2);
});
test('mixed general pages keep QuestBridge sections out of general coverage and autofill',()=>{
  const p=parsePage('<title>Admission requirements</title><main><h2>General application</h2><p>A transcript is required.</p><h2>QuestBridge applicants</h2><p>Early Decision deadline: November 1, 2026.</p><p>The application fee is $0.</p><h2>Other applicants</h2><p>Teacher recommendations are required.</p></main>','https://example.edu/apply',profile);
  const r=reportFromPages([p],profile);assert.ok(r.documents.some(d=>d.label==='Academic transcripts'));assert.ok(r.documents.some(d=>d.label==='Teacher recommendations'));assert.deepEqual(r.deadlines,[]);assert.deepEqual(r.fees,[]);assert.ok(r.pathways[0].deadlines.length);
});
test('legacy HTTP redirects are tried over HTTPS only and still enforce institution and robots checks',async()=>{
  const calls=[];const fetcher=async url=>{calls.push(url);return url.endsWith('/apply')?new Response(null,{status:301,headers:{location:'http://example.edu/requirements'}}):response('<main>A transcript is required.</main>');};
  const p=await fetchPage('https://example.edu/apply','example.edu',fetcher);assert.equal(p.url,'https://example.edu/requirements');assert.ok(calls.every(u=>u.startsWith('https://')));
  await assert.rejects(fetchPage('https://example.edu/apply','example.edu',async()=>new Response(null,{status:301,headers:{location:'http://external.edu/requirements'}})),/outside/);
  const blocked=[];await assert.rejects(fetchPage('https://example.edu/apply','example.edu',fetcher,async url=>{blocked.push(url.href);if(url.pathname==='/requirements')throw new Error('Crawler access is disallowed');}),/disallowed/);assert.equal(blocked.length,2);
});
test('the complete US coverage set resolves to official directory sources without external discovery',async()=>{
  for(const name of ['Amherst','Bowdoin','Brown','Caltech','Dartmouth','Denison','Duke','Grinnell','Harvard','Princeton','Rice','Stanford','Notre Dame','Richmond','Washington and Lee','Williams','Yale','MIT']){
    const result=await searchUniversities(name,()=>{throw new Error('Should use known source');});assert.equal(result.universities.length,1,name);assert.match(result.universities[0].url,/^https:\/\//);assert.equal(result.universities[0].discovery,'ApplyTrack directory');
  }
});
test('financial-aid deadlines cannot become general application dates',()=>{
  const url='https://aid.example.edu/apply';const e=context.ApplyTrackResearch.extract({pages:[{url}],documents:[],fees:[],deadlines:[{scope:'financial-aid',url,quote:'Priority application deadline: April 1, 2027.'}]});assert.equal(e.deadlines.length,0);
});
