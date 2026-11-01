import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({URL});
vm.runInContext(fs.readFileSync(new URL('../public/planning-model.js',import.meta.url),'utf8'),context);
const model=context.ApplyTrackPlanning;
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/\r/g,'');
vm.runInContext(source.slice(0,source.indexOf('try {\n  const saved')),context);
const item=(patch={})=>({id:'item',title:'Draft essay',date:'2026-12-31',status:'Not started',notes:'Prompt\nSecond paragraph',url:'https://docs.example.com/draft',person:'',askedOn:'',wordLimit:'',kind:'Scholarship',...patch});
const college=(planning)=>({id:'college',name:'Example University',status:'Planning',round:'Regular decision',waiver:'Unknown',deadline:'2027-01-02',notes:'Existing notes',website:'https://example.edu',fee:90,documents:[{name:'Transcript',done:true}],...(planning?{planning}:{})});
const plain=value=>JSON.parse(JSON.stringify(value));
test('old colleges and backups acquire empty trackers without changing existing fields',()=>{
  const old=college(),before=JSON.stringify(old),restored=plain(context.validate([old]))[0];
  assert.deepEqual(restored.planning,{tasks:[],essays:[],recommendations:[],funding:[]});
  assert.equal(restored.notes,old.notes);assert.deepEqual(restored.documents,old.documents);assert.equal(JSON.stringify(old),before);
});
test('all tracker details survive a backup round trip and unrelated college edits',()=>{
  const plan=model.clean();plan.tasks.push(item());plan.essays.push(item({status:'Reviewing',wordLimit:650}));plan.recommendations.push(item({status:'Requested',person:'Teacher',askedOn:'2026-10-31'}));plan.funding.push(item({status:'In progress',kind:'Financial aid'}));
  const saved=context.validate([college(plan)]),backup=JSON.parse(JSON.stringify({format:'ApplyTrack',version:3,colleges:saved}));
  const restored=plain(context.validate(backup.colleges));assert.deepEqual(restored,plain(saved));
  restored[0].name='Edited college';assert.deepEqual(plain(context.validate(restored))[0].planning,plain(model.clean(plan)));
});
test('malformed items and unsafe links fail validation without modifying source data',()=>{
  for(const bad of [{date:'2026-02-30'},{url:'javascript:alert(1)'},{status:'Unknown'},{wordLimit:-1},{title:''}]){
    const plan=model.clean();plan.tasks.push(item(bad));const data=[college(plan)],before=JSON.stringify(data);
    assert.throws(()=>context.validate(data));assert.equal(JSON.stringify(data),before);
  }
  assert.throws(()=>model.clean({tasks:[item(),item()]}));
});
test('This week crosses year boundaries, excludes completed work and retains aid after application submission',()=>{
  const plan=model.clean();plan.tasks.push(item({id:'late',date:'2026-12-29'}),item({id:'open',date:'2027-01-03'}),item({id:'done',status:'Done',date:'2026-12-31'}),item({id:'later',date:'2027-01-06'}));plan.funding.push(item({id:'aid',date:'2027-01-04'}));
  const data=[college(plan)],before=JSON.stringify(data),week=model.week(data,'2026-12-30');
  assert.equal(week.last,'2027-01-05');assert.deepEqual(plain(week.overdue).map(r=>r.item.id),['late']);
  assert.deepEqual(plain(week.upcoming).map(r=>r.item.id),['college','open','aid']);assert.equal(JSON.stringify(data),before);
  data[0].status='Submitted';assert.ok(model.week(data,'2026-12-30').upcoming.some(r=>r.item.id==='aid'));
  assert.ok(!model.week(data,'2026-12-30').upcoming.some(r=>r.type==='admissions'));
});
test('weekly admission grouping can respect a confirmed cutoff earlier today',()=>{
  const data=[{...college(),deadline:'2026-12-30'}];
  const week=model.week(data,'2026-12-30',()=>true);
  assert.equal(week.overdue.length,1);assert.equal(week.upcoming.length,0);
});

test('focused task and essay fields survive saves without rewriting legacy notes',()=>{
  const plan=model.clean();plan.tasks.push(item({category:'Documents',priority:'High',nextStep:'Ask the school office to send the transcript.'}));plan.essays.push(item({prompt:'Describe an experience.',draft:'A first draft.\nSecond paragraph.',revision:'Make the opening more specific.',notes:'Legacy prompt stays here',wordLimit:5}));
  const saved=plain(context.validate([college(plan)]));const restored=plain(context.validate(JSON.parse(JSON.stringify(saved))));assert.deepEqual(restored,saved);assert.equal(restored[0].planning.essays[0].notes,'Legacy prompt stays here');assert.equal(model.wordCount(restored[0].planning.essays[0].draft),5);
  assert.equal(model.wordCount('  '),0);assert.equal(model.wordCount('one\ntwo   three'),3);
  for(const patch of [{priority:'Urgent'},{category:'Made up'},{draft:'x'.repeat(30001)},{prompt:123},{revision:123}]){const bad=model.clean();bad.essays.push(item(patch));assert.throws(()=>model.clean(bad));}
});
