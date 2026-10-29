import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../public/welcome.js',import.meta.url),'utf8'),context);
test('returning greetings vary without immediately repeating the last message',()=>{
 const {nextGreeting,greetings}=context.ApplyTrackWelcome;
 for(const last of [undefined,0,1,2,3])for(const sample of [0,.25,.5,.75,.999999]){
  const next=nextGreeting(last,sample);assert.ok(next>=0&&next<greetings.length);assert.notEqual(next,last);
 }
});
