import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({TextEncoder,URL});
for(const file of ['planning-model.js','calendar.js'])vm.runInContext(fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),ctx);
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/\r/g,'');
vm.runInContext(source.slice(0,source.indexOf('try {\n  const saved')),ctx);
const item=patch=>({id:'task',title:'Draft essay',date:'2026-12-31',status:'Not started',notes:'PRIVATE NOTES',person:'PRIVATE NAME',...patch});
function college(patch={}){return {id:'college',name:'Example University',deadline:'2027-01-02',status:'Planning',planning:{tasks:[item()],essays:[],recommendations:[],funding:[]},...patch};}
const build=records=>ctx.ApplyTrackCalendar.build(records,{now:Date.parse('2026-10-31T12:00:00Z'),toInstant:ctx.deadlineInstant});
const unfold=text=>text.replace(/\r\n /g,'');
test('calendar exports active dates with exclusive all-day ends and no private fields',()=>{
  const c=college();c.planning.tasks.push(item({id:'done',status:'Done'}),item({id:'undated',date:''}));
  const before=JSON.stringify(c),result=build([c]),text=unfold(result.text);
  assert.equal(result.count,2);assert.match(text,/DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101/);
  assert.doesNotMatch(text,/PRIVATE NOTES|PRIVATE NAME/);assert.equal(JSON.stringify(c),before);
  assert.ok(result.text.endsWith('END:VCALENDAR\r\n'));
});
test('confirmed admission times export in UTC while missing times remain all-day',()=>{
  const c=college({deadlineTime:'17:00',deadlineZone:'America/New_York'});
  assert.match(unfold(build([c]).text),/DTSTART:20270102T220000Z/);
  c.deadlineTime='';assert.match(unfold(build([c]).text),/DTSTART;VALUE=DATE:20270102/);
});
test('calendar text escapes injected properties, folds UTF-8 lines and keeps stable event IDs',()=>{
  const c=college({name:'Université '+ 'é'.repeat(80)});c.planning.tasks[0].title='Title, semicolon; slash\\\r\nBEGIN:VEVENT';
  const first=build([c]).text,unfolded=unfold(first);
  for(const line of first.split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75);
  assert.equal(first.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,2);
  assert.match(unfolded,/Title\\, semicolon\\; slash\\\\\\nBEGIN:VEVENT/);
  assert.deepEqual(unfolded.match(/^UID:.*$/gm),unfold(build([c]).text).match(/^UID:.*$/gm));
});
test('completed admissions are excluded while unfinished funding still exports',()=>{
  const c=college({status:'Submitted'});c.planning.tasks=[];c.planning.funding=[item({status:'In progress',title:'Aid forms'})];
  assert.equal(build([c]).count,1);assert.doesNotMatch(unfold(build([c]).text),/Application deadline/);
});
