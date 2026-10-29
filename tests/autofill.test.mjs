import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parsePage,linkScore} from '../lib/evidence.mjs';
const source=fs.readFileSync(new URL('../public/research-autofill.js',import.meta.url),'utf8');
const context=vm.createContext({URL});vm.runInContext(source,context);
const extract=(report,year='')=>JSON.parse(JSON.stringify(context.ApplyTrackResearch.extract(report,year)));
const url='https://admissions.example.edu/apply';
const report=(quotes=[],fees=[])=>({pages:[{url}],deadlines:quotes.map(quote=>({quote,url,section:'Application deadlines'})),fees:fees.map(quote=>({quote,url,section:'Application requirements'}))});
test('yearless Yale dates need an explicitly chosen cycle; all rounds retained',()=>{
 const r=report(['Single-Choice Early Action (Deadline: November 1)','QuestBridge National College Match (Deadline: November 1)','Regular Decision (Deadline: January 2)']);
 assert.equal(extract(r).deadlines[2].date,null);
 assert.deepEqual(extract(r,'2026').deadlines.map(d=>[d.round,d.date]),[['Restrictive early action','2026-11-01'],['QuestBridge','2026-11-01'],['Regular decision','2027-01-02']]);
});
test('ED I, ED II and regular dates stay paired in combined excerpts',()=>{
 const r=extract(report(['Early Decision I deadline: Nov. 1, 2026; Early Decision II deadline: January 5, 2027; Regular Decision deadline: January 15, 2027']));
 assert.deepEqual(r.deadlines.map(d=>d.date),['2026-11-01','2027-01-05','2027-01-15']);
});
test('rejects invalid, conflicting and ungrounded dates',()=>{
 assert.equal(extract(report(['Regular Decision deadline: February 30, 2027'])).deadlines.length,0);
 const r=extract(report(['Regular Decision deadline: January 2, 2027','Regular Decision deadline: January 3, 2027']));
 assert.deepEqual(r.conflicts,['Regular decision']);assert.equal(r.deadlines.length,0);
 const ungrounded=report(['Regular Decision deadline: January 2, 2027']);ungrounded.pages=[];
 assert.equal(extract(ungrounded).deadlines.length,0);
});
test('MIT and Harvard application dates exclude decision, testing and aid dates',()=>{
 const r=extract(report(['Early Action (EA) applications are due November 1 and admission decisions are released in mid-December.','Regular Decision candidates apply by January 1 and receive notification by the end of March.','Financial aid Early Action deadline: November 30','Regular Decision test scores deadline: January 31']),2026);
 assert.deepEqual(r.deadlines.map(d=>d.date),['2026-11-01','2027-01-01']);
});
test('fee extraction handles both orders, zero, conflicts, foreign currencies and deposits',()=>{
 for(const q of ['$80 application fee','Application fee of $80','$80 non-refundable application fee','$80 fee (or request a fee waiver)'])assert.equal(extract(report([],[q])).fee,80);
 assert.equal(extract(report([],['No application fee is required.'])).fee,0);
 for(const fees of [['$80 application fee','$90 application fee'],['The tuition is $8000 and application fee is $80'],['Application fee is CAD $80'],['Application fee is $1000']])assert.equal(extract(report([],fees)).fee,null);
 const canadian=report([],['$80 application fee']);canadian.pages=[{url:'https://example.ac.uk/apply'}];canadian.fees[0].url=canadian.pages[0].url;
 assert.equal(extract(canadian).fee,null);
});
test('waiver conditions and negations are retained without inferring eligibility',()=>{
 const q='No fee waivers are available for international applicants.';
 assert.equal(extract(report([],[q])).waiverEvidence[0].quote,q);
});
test('crawler retains short fee entries and fee headings and prioritizes relevant sources',()=>{
 const p=parsePage('<main><h2>Application fee</h2><p>$80</p><h2>Deadlines</h2><p>Regular Decision deadline: January 2</p></main>',url,{applicant:'international',level:'first-year'});
 assert.equal(extract({pages:[{url}],fees:p.records.filter(x=>x.kind==='fee'),deadlines:p.records.filter(x=>x.kind==='deadline')}).fee,80);
 const profile={applicant:'international',level:'first-year'};
 assert.ok(linkScore('https://example.edu/timelines',profile)>linkScore('https://oisp.example.edu/travel-resources/international',profile));
});
function formContext(){
 const listeners={};const field=value=>({value,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
 const form={elements:{fee:field(''),deadline:field(''),round:field('Regular decision'),notes:field('Personal note'),waiver:field('Approved')},addEventListener(k,fn){listeners[k]=fn;}};
 const ctx=vm.createContext({URL,document:{getElementById(){return form;}},announce(){}});vm.runInContext(source,ctx);return {form,ctx,listeners};
}
test('form transfer preserves manual values, waiver status and notes; changing round fills blank date',()=>{
 const {form,ctx,listeners}=formContext();
 form.elements.fee.value='12';form.elements.deadline.value='2028-02-03';
 const r=report(['Early Action deadline: November 1','Regular Decision deadline: January 2'],['$80 application fee']);
 ctx.applyResearchAutofill(r,'2026');
 assert.equal(form.elements.fee.value,'12');assert.equal(form.elements.deadline.value,'2028-02-03');assert.equal(form.elements.waiver.value,'Approved');assert.match(form.elements.notes.value,/Personal note/);assert.match(form.elements.notes.value,/Early action: 2026-11-01/);
 listeners.reset();form.elements.deadline.value='';form.elements.fee.value='';ctx.applyResearchAutofill(r,'2026');
 assert.equal(form.elements.deadline.value,'2027-01-02');assert.equal(form.elements.fee.value,'80');
 form.elements.round.value='Early action';form.elements.round.listeners.change();assert.equal(form.elements.deadline.value,'2026-11-01');
 form.elements.deadline.value='2029-03-04';form.elements.deadline.listeners.input();form.elements.round.value='Regular decision';form.elements.round.listeners.change();assert.equal(form.elements.deadline.value,'2029-03-04');
});
test('transfer is invoked within the guarded main handler, never as a second click listener',()=>{
 const s=fs.readFileSync(new URL('../public/research.js',import.meta.url),'utf8');
 assert.ok(s.indexOf('form.elements.id.value!==researchTargetId')<s.indexOf('globalThis.applyResearchAutofill'));
 assert.doesNotMatch(source,/research-apply.*addEventListener/);
});

test('captured official Yale, Harvard and MIT responses fill every extracted application round',()=>{
 for(const [name,fee,expected] of [['yale',null,['2026-11-01','2026-11-01','2027-01-02']],['harvard',95,['2026-11-01','2027-01-01']],['mit',75,['2026-11-01','2027-01-04']]]){
  const r=JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}-research.json`,import.meta.url),'utf8'));
  const result=extract(r,'2026');assert.equal(result.fee,fee,name);assert.deepEqual(result.deadlines.map(d=>d.date).sort(),expected.sort(),name);assert.ok(result.waiverEvidence.length,name);
 }
});
test('date ranges and ambiguous multi-date excerpts are not assigned a single day',()=>{
 assert.equal(extract(report(['Early Action deadline: November 1–15, 2026'])).deadlines.length,0);
 assert.equal(extract(report(['Early Action deadline: November 1, 2026 or November 15, 2026'])).deadlines.length,0);
});
test('date headings pair with their own admission round text',()=>{
 const r={pages:[{url}],fees:[],deadlines:[{url,section:'January 1',quote:'Regular Decision application deadline'},{url,section:'November 1',quote:'Restrictive Early Action application deadline - learn more about Restrictive Early Action.'}]};
 // Repeated mentions of the same round do not make the heading ambiguous.
 const result=extract(r,'2026');
 assert.deepEqual(result.deadlines.map(d=>d.date),['2027-01-01','2026-11-01']);
});
test('transfer plan requires a cycle, keeps existing deadlines and supports explicit skip',()=>{
 const r=report(['Regular Decision deadline: January 2']);
 assert.equal(context.ApplyTrackResearch.plan(r,'','Regular decision').reason,'cycle');
 assert.equal(context.ApplyTrackResearch.plan(r,'','Regular decision').ready,false);
 assert.equal(context.ApplyTrackResearch.plan(r,'2026','Regular decision').match.date,'2027-01-02');
 assert.equal(context.ApplyTrackResearch.plan(r,'2026','Early decision').reason,'round');
 assert.equal(context.ApplyTrackResearch.plan(r,'','Regular decision',{skipDeadline:true}).reason,'skipped');
 assert.equal(context.ApplyTrackResearch.plan(r,'','Regular decision',{existingDeadline:'2028-01-05'}).reason,'preserved');
 assert.equal(context.ApplyTrackResearch.plan(report(),'2026','Regular decision').reason,'unknown');
});
test('the exact Harvard URL from the screenshot supplies both heading-based deadlines',()=>{
 const r=JSON.parse(fs.readFileSync(new URL('./fixtures/harvard-apply-research.json',import.meta.url),'utf8'));
 const result=extract(r,'2026');
 assert.deepEqual(result.deadlines.map(d=>[d.round,d.date]).sort(),[['Regular decision','2027-01-01'],['Restrictive early action','2026-11-01']]);
});
test('waiver availability is filled from affirmative official policies, never from mere mentions',()=>{
 for(const q of ['Fee waivers are available for both domestic and international applicants.','$95 fee (or request a fee waiver)','If the application fee presents a hardship, the fee will be waived.','Yale does not issue its own fee waivers, but it is easy to apply for free if you meet the eligibility criteria.'])assert.equal(extract(report([],[q])).waiverStatus,'Available — check eligibility');
 for(const q of ['Fee waivers','How can I request a fee waiver?','We link to application fee waiver information.'])assert.equal(extract(report([],[q])).waiverStatus,null);
 assert.equal(extract(report([],['No fee waivers are available for international applicants.'])).waiverStatus,'Review waiver policy');
 assert.equal(extract(report([],['Fee waivers are available.','No fee waivers are available for international applicants.'])).waiverStatus,'Review waiver policy');
});
test('Yale, Harvard and MIT official responses establish conditional availability',()=>{
 for(const name of ['yale','harvard','mit']){
  const r=JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}-research.json`,import.meta.url),'utf8'));
  assert.equal(extract(r).waiverStatus,'Available — check eligibility',name);
 }
});
test('waiver autofill preserves personal statuses and manual choices and resets between drafts',()=>{
 const {form,ctx,listeners}=formContext();
 const r=report([],['Fee waivers are available for both domestic and international applicants.']);
 for(const status of ['Approved','Requested','To request','Not needed']){
  form.elements.waiver.value=status;ctx.applyResearchAutofill(r,'2026');assert.equal(form.elements.waiver.value,status);
 }
 form.elements.waiver.value='Unknown';ctx.applyResearchAutofill(r,'2026');assert.equal(form.elements.waiver.value,'Available — check eligibility');
 form.elements.waiver.value='Unknown';form.elements.waiver.listeners.change();ctx.applyResearchAutofill(r,'2026');assert.equal(form.elements.waiver.value,'Unknown');
 listeners.reset();ctx.applyResearchAutofill(r,'2026');assert.equal(form.elements.waiver.value,'Available — check eligibility');
 assert.match(form.elements.notes.value,/Fee-waiver conditions/);
});
