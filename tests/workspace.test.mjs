import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8'),context);
test('deadline overview handles today, past, undated and submitted without changing saved records',()=>{
 const records=[{name:'Tomorrow',deadline:'2026-10-30',status:'Planning'},{name:'Today',deadline:'2026-10-29',status:'In progress'},{name:'Past',deadline:'2026-10-28',status:'Planning'},{name:'Missing',deadline:'',status:'Planning'},{name:'Done',deadline:'2026-10-30',status:'Submitted'}];
 const before=JSON.stringify(records);
 const groups=JSON.parse(JSON.stringify(context.ApplyTrackWorkspace.groupDeadlines(records,'2026-10-29')));
 assert.deepEqual(groups.upcoming.map(c=>c.name),['Today','Tomorrow']);
 assert.deepEqual(groups.past.map(c=>c.name),['Past']);
 assert.deepEqual(groups.missing.map(c=>c.name),['Missing']);
 assert.deepEqual(groups.submitted.map(c=>c.name),['Done']);
 assert.equal(JSON.stringify(records),before);
});
