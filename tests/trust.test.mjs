import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({URL});
for(const file of ['trust-model.js','planning-model.js'])vm.runInContext(fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),ctx);
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/\r/g,'');
vm.runInContext(source.slice(0,source.indexOf('try {\n  const saved')),ctx);
const model=ctx.ApplyTrackTrust;
const college=()=>({id:'college',name:'Example University',website:'https://example.edu',deadline:'2027-01-02',round:'Regular decision',deadlineTime:'',deadlineZone:'',status:'Planning',waiver:'Unknown',fee:'',notes:'',documents:[]});
test('old records are unconfirmed until a person explicitly confirms the exact details',()=>{
  const c=ctx.validate([college()])[0];assert.equal(model.confirmed(c),false);assert.equal(model.status(c),'Needs date confirmation');
  c.deadlineReview={...model.clean(),origin:'research',url:'https://example.edu/apply',confirmedAt:'2026-10-31T12:00:00Z',confirmedFor:model.signature(c)};
  assert.equal(model.confirmed(c),true);
  for(const patch of [{deadline:'2027-01-03'},{round:'Early action'},{deadlineTime:'17:00'},{deadlineZone:'America/New_York'},{name:'Another college'},{website:'https://another.edu'}])assert.equal(model.confirmed({...c,...patch}),false);
});
test('review details survive backup validation and reject unsafe source links',()=>{
  const c=college();c.deadlineReview={...model.clean(),origin:'research',url:'https://example.edu/apply',fetchedAt:'2026-10-31T12:00:00Z'};
  const result=ctx.validate(JSON.parse(JSON.stringify(ctx.validate([c]))));assert.equal(result[0].deadlineReview.url,c.deadlineReview.url);
  assert.throws(()=>model.clean({...c.deadlineReview,url:'javascript:alert(1)'}));assert.throws(()=>model.clean({...c.deadlineReview,confirmedAt:'bad date'}));
});
test('unrelated saves preserve the actual confirmation date and edited sources lose research timestamps',()=>{
  const ui=fs.readFileSync(new URL('../public/trust.js',import.meta.url),'utf8');const c=college();
  c.deadlineReview={...model.clean(),origin:'research',url:'https://example.edu/apply',fetchedAt:'2026-10-01T12:00:00Z',confirmedAt:'2026-10-02T12:00:00Z',confirmedFor:model.signature(c)};
  ctx.model=model;ctx.form={elements:Object.fromEntries(['name','website','deadline','round','deadlineTime','deadlineZone'].map(k=>[k,{value:c[k]}])),querySelector:()=>null};ctx.source={value:''};ctx.check={checked:false};ctx.reviewStatus={};ctx.draft=model.clean();ctx.researchEvidence=null;ctx.confirmationTouched=false;
  vm.runInContext(ui.slice(ui.indexOf('  function record()'),ui.indexOf('  function capture(')),ctx);
  ctx.loadDeadlineReview(c);assert.equal(ctx.readDeadlineReview().confirmedAt,c.deadlineReview.confirmedAt);
  ctx.source.value='https://example.edu/new';ctx.check.checked=false;
  const changed=ctx.readDeadlineReview();assert.equal(changed.origin,'manual');assert.equal(changed.fetchedAt,'');assert.equal(changed.confirmedAt,'');
});
test('stale tabs cannot overwrite newer storage and successful saves advance the snapshot',()=>{
  let stored='newer',writes=0;ctx.localStorage={getItem:()=>stored,setItem:(key,value)=>{stored=value;writes++;}};ctx.announce=()=>{};ctx.showSaveProblem=()=>{};ctx.requestPersistence=()=>{};ctx.updateBackupState=()=>{};ctx.backupState=()=>({});
  vm.runInContext(source.slice(source.indexOf('function save(next)'),source.indexOf('function daysAgo')),ctx);
  vm.runInContext("loadedSnapshot='older'",ctx);assert.equal(ctx.save([]),false);assert.equal(writes,0);assert.equal(stored,'newer');
  vm.runInContext("loadedSnapshot='newer'",ctx);assert.equal(ctx.save([]),true);assert.equal(writes,1);assert.equal(vm.runInContext('loadedSnapshot',ctx),'[]');
});
test('recovery retains linked work, caps recent removals and refuses quota failures',()=>{
  const entries=new Map();let fail=false;
  ctx.localStorage={getItem:key=>entries.get(key)||null,setItem:(key,value)=>{if(fail)throw new Error('quota');entries.set(key,value);}};ctx.announce=()=>{};
  const ui=fs.readFileSync(new URL('../public/trust.js',import.meta.url),'utf8');
  vm.runInContext("const recoveryKey='applytrack-recovery-v1';\n"+ui.slice(ui.indexOf('  function readRecovery()'),ui.indexOf("  const recovery=node('section'")),ctx);
  const c=college();c.planning=ctx.ApplyTrackPlanning.clean();c.planning.tasks.push({id:'task',title:'Keep this task',date:'',status:'Not started',notes:'',url:'',person:'',askedOn:'',wordLimit:'',kind:'Scholarship'});
  assert.equal(ctx.prepareCollegeRecovery(c),true);assert.equal(ctx.readRecovery().removed[0].college.planning.tasks[0].title,'Keep this task');
  ctx.fixture=[c];vm.runInContext('colleges=validate(fixture)',ctx);assert.equal(ctx.prepareReplaceRecovery(),true);assert.equal(ctx.readRecovery().previous.length,1);
  for(let i=0;i<21;i++)assert.equal(ctx.prepareCollegeRecovery({...college(),id:'removed-'+i}),true);
  assert.equal(ctx.readRecovery().removed.length,20);assert.equal(ctx.readRecovery().removed[0].college.id,'removed-20');
  const before=entries.get('applytrack-recovery-v1');fail=true;assert.equal(ctx.prepareCollegeRecovery(college()),false);assert.equal(entries.get('applytrack-recovery-v1'),before);
});
