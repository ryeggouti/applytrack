import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../public/profile.js',import.meta.url),'utf8'),ctx);
vm.runInContext(fs.readFileSync(new URL('../public/welcome.js',import.meta.url),'utf8'),ctx);
test('optional profile keeps only supported preferences and normalizes names',()=>{
 const clean=JSON.parse(JSON.stringify(ctx.ApplyTrackProfile.cleanProfile({preferredName:'  Rayane   Yeggouti  ',applicant:'international',level:'first-year',cycle:2026,setupSeen:true,passport:'not retained'})));
 assert.deepEqual(clean,{preferredName:'Rayane Yeggouti',applicant:'international',level:'first-year',cycle:'2026',setupSeen:true});
 const empty=ctx.ApplyTrackProfile.cleanProfile({applicant:'unknown',level:'graduate',cycle:3000,preferredName:7});
 assert.equal(empty.preferredName,'');assert.equal(empty.applicant,'');assert.equal(empty.level,'');assert.equal(empty.cycle,'');
});
test('greetings personalize optional names without inventing one',()=>{
 const format=ctx.ApplyTrackWelcome.formatGreeting;
 assert.equal(format('Welcome back{name}!','Rayane'),'Welcome back, Rayane!');
 assert.equal(format('Welcome back{name}!',''),'Welcome back!');
 assert.equal(format('Welcome home{name}.','  Rayane '),'Welcome home, Rayane.');
 assert.ok(ctx.ApplyTrackWelcome.greetings.length>=6);
});
