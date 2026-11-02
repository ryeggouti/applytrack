import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parsePage} from '../lib/evidence.mjs';
import {reportFromPages} from '../lib/crawler.mjs';
const context={URL};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../public/research-autofill.js',import.meta.url),'utf8'),context);
const profile={applicant:'international',level:'first-year'};
const analyze=(html,url='https://example.edu/apply',cycle='2026')=>{
  const page=parsePage(html,url,profile),report=reportFromPages([page],profile);
  return {page,report,result:JSON.parse(JSON.stringify(context.ApplyTrackResearch.extract(report,cycle)))};
};
const expectations={
  bowdoin:[['Early decision I','2026-11-15'],['Early decision II','2027-01-05'],['Regular decision','2027-01-05']],
  grinnell:[['Early decision I','2026-11-15'],['Early decision II','2027-01-05'],['Regular decision','2027-01-15']],
  princeton:[['Restrictive early action','2026-11-01'],['Regular decision','2027-01-01']],
  rice:[['Early decision I','2026-11-01'],['Early decision II','2027-01-04'],['Regular decision','2027-01-04']],
  duke:[['Early decision','2026-11-02'],['Regular decision','2027-01-04']],
  stanford:[['Restrictive early action','2026-11-01'],['Regular decision','2027-01-05']],
  wlu:[['Early decision I','2026-11-01'],['Early decision II','2027-01-05'],['Regular decision','2027-01-05']]
};
for(const fixture of JSON.parse(fs.readFileSync(new URL('./fixtures/deadline-layouts.json',import.meta.url),'utf8'))){
  test('official '+fixture.name+' layout retains application dates and excludes other date categories',()=>{
    const {result}=analyze(fixture.html,fixture.url);
    assert.deepEqual(result.conflicts,[]);assert.deepEqual(result.deadlines.map(d=>[d.round,d.date]).sort(),expectations[fixture.name].sort());
    assert.ok(result.deadlines.every(d=>d.url===fixture.url&&d.quote));
  });
}
test('unrelated grades, testing clauses, commitments and gap-year dates cannot conflict with an application deadline',()=>{
  const {result}=analyze('<main><h2>Regular Decision Deadlines</h2><p>Regular Decision application deadline: January 5.</p><p>Commitment deadline for Regular Decision candidates: May 1.</p><p>First Quarter Grades (submit via Optional Report; will accept through November 20)</p><p>SAT and/or ACT Scores (last testing dates are December 5 for SAT; December 12 for ACT).</p><p>June 1 — Deadline to request a Gap Year</p><p>Admitted students have until May 1 to accept our offer.</p><p>On or before April 1</p></main>');
  assert.deepEqual(result.deadlines.map(d=>d.date),['2027-01-05']);assert.deepEqual(result.conflicts,[]);
});
test('Caltech-style bare QuestBridge rows stay in the separate pathway, never general choices',()=>{
  const {report,result}=analyze('<main><h2>What is the deadline to submit proof of certification?</h2><p>QuestBridge Monday, November 2, 2026</p><h2>Application deadlines</h2><p>Regular Decision application deadline: January 4, 2027.</p></main>');
  assert.ok(report.pathways[0].deadlines.some(d=>/November 2/.test(d.quote)));assert.deepEqual(result.deadlines.map(d=>d.round),['Regular decision']);
});
test('Dartmouth-style pathway cards do not lend QuestBridge dates to the general round',()=>{
  const {report,result}=analyze('<main><h2>Learn about applying</h2><article><div><h4>Learn more about the process if you:</h4><p>The Binding Early Decision deadline is November 1 and the Regular Decision deadline is January 2.</p></div><div class="card--native__info-col">QuestBridge Non-Finalists</div></article><h2>Regular Decision</h2><p>Regular Decision applicants submit their application by January 1.</p></main>');
  assert.ok(report.pathways[0].deadlines.length);assert.deepEqual(result.deadlines.map(d=>d.date),['2027-01-01']);assert.deepEqual(result.conflicts,[]);
});
test('ambiguous merged columns, date ranges and unlabelled dates remain unassigned',()=>{
  for(const html of ['<table><tr><th>Plan</th><th colspan="2">Application Deadline</th></tr><tr><td>Regular Decision</td><td>January 4</td><td>January 5</td></tr></table>','<table><tr><th>Plan</th><th>Application Deadline</th></tr><tr><td>Regular Decision</td><td>January 4–5</td></tr></table>','<h2>Regular Decision Deadline</h2><p>January 5</p>'])assert.equal(analyze('<main>'+html+'</main>').result.deadlines.length,0);
});
test('real conflicting application statements stay unresolved with source excerpts',()=>{
  const {result}=analyze('<main><p>Regular Decision application deadline: January 4, 2027.</p><p>Regular Decision application deadline: January 5, 2027.</p></main>');
  assert.deepEqual(result.deadlines,[]);assert.deepEqual(result.conflicts,['Regular decision']);assert.equal(result.conflictEvidence[0].options.length,2);assert.ok(result.conflictEvidence[0].options.every(o=>o.quote&&o.url));
});
test('yearless layout dates still require an explicit cycle and invalid calendar dates are rejected',()=>{
  const html='<main><table><tr><th>Plan</th><th>Application Deadline</th></tr><tr><td>Early Decision</td><td>November 2</td></tr><tr><td>Regular Decision</td><td>February 30</td></tr></table></main>';
  const {result}=analyze(html,undefined,'');assert.equal(result.deadlines.length,1);assert.equal(result.deadlines[0].date,null);assert.equal(result.deadlines[0].basis,'Year not established');
});
test('admission-round deadline lists remain usable while optional arts deadlines do not become general deadlines',()=>{
  const {result}=analyze('<main><h2>Admission Rounds &amp; Deadlines</h2><ul><li>Early Decision 1: November 15</li><li>Early Decision 2: January 15</li><li>Regular Decision: January 15</li></ul><h2>Other dates</h2><p>Regular Decision optional Arts Supplement is due January 8.</p><p>Single-Choice Early Action optional Arts Supplement is due November 6.</p></main>');
  assert.deepEqual(result.deadlines.map(d=>d.date),['2026-11-15','2027-01-15','2027-01-15']);assert.deepEqual(result.conflicts,[]);
});
test('an unscoped QuestBridge record from a legacy response is also excluded defensively',()=>{
  const result=context.ApplyTrackResearch.extract({pages:[{url:'https://example.edu/apply'}],deadlines:[{url:'https://example.edu/apply',quote:'QuestBridge application deadline: November 2, 2026.',section:'Application deadlines'}],fees:[]},'2026');assert.equal(result.deadlines.length,0);
});
test('a matching yearless restatement uses the explicit source year without a false conflict',()=>{
  const html='<main><p>Restrictive Early Action application deadline: November 1.</p><p>Restrictive Early Action application deadline: November 1, 2026.</p></main>';
  const {result}=analyze(html,undefined,'');assert.deepEqual(result.conflicts,[]);assert.equal(result.deadlines[0].date,'2026-11-01');assert.equal(result.deadlines[0].basis,'Source year');
  const conflict=analyze(html,undefined,'2027').result;assert.deepEqual(conflict.deadlines,[]);assert.deepEqual(conflict.conflicts,['Restrictive early action']);
});
