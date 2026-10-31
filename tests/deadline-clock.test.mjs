import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/\r/g,'');
const context=vm.createContext({});
vm.runInContext(source.slice(0,source.indexOf('try {\n  const saved')).replace(/\r/g,''),context);
const call=(name,...args)=>context[name](...args);

test('date-only deadlines have no invented instant or displayed time',()=>{
  const record={name:'Example',status:'Planning',deadline:'2027-01-02',deadlineTime:'',deadlineZone:'America/New_York'};
  const before=JSON.stringify(record);
  assert.equal(call('deadlineInstant',record),null);
  assert.equal(call('timeLabel',record),'');
  assert.equal(call('deadlineState',record,Date.parse('2027-01-03T04:59:59Z')).label,'Due today');
  assert.equal(call('deadlineState',record,Date.parse('2027-01-03T05:00:00Z')).past,true);
  assert.equal(JSON.stringify(record),before);
});

test('confirmed zoned times change from upcoming to past at the actual cutoff',()=>{
  const record={name:'Example',status:'Planning',deadline:'2027-01-02',deadlineTime:'17:00',deadlineZone:'America/New_York'};
  assert.equal(call('deadlineInstant',record),Date.parse('2027-01-02T22:00:00Z'));
  assert.equal(call('deadlineState',record,Date.parse('2027-01-02T21:00:00Z')).label,'Due in 1 hours');
  assert.equal(call('deadlineState',record,Date.parse('2027-01-02T22:00:01Z')).past,true);
});

test('live refresh runs on the clock and return to tab, preserving saved data and open forms',()=>{
  let interval, tick, renders=0;
  const events={},docEvents={},focus={id:'search'};
  const document={hidden:false,activeElement:focus,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(event,fn)=>docEvents[event]=fn};
  const live=vm.createContext({document,window:{addEventListener:(event,fn)=>events[event]=fn},setInterval:(fn,ms)=>{tick=fn;interval=ms;},render:()=>renders++,$:()=>focus});
  vm.runInContext(source.slice(source.indexOf('// Recalculate clock-dependent views')),live);
  assert.equal(interval,60000);
  tick();events.focus();docEvents.visibilitychange();
  assert.equal(renders,3);
  document.hidden=true;tick();assert.equal(renders,3);
  document.hidden=false;document.querySelector=()=>({open:true});tick();assert.equal(renders,3);
});
