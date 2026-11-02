// Optional live checks. No saved application data is read or changed.
// Run: node scripts/check-research-coverage.mjs > coverage.json
import {research} from '../lib/crawler.mjs';
import {DIRECTORY} from '../lib/universities.mjs';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const cycle=process.argv.find(arg=>arg.startsWith('--cycle='))?.slice(8)||'';
if(cycle&&!/^20\d{2}$/.test(cycle))throw new Error('Use --cycle=2026 for July 2026–June 2027, or omit it to keep yearless dates unassigned.');
const context={URL};vm.createContext(context);vm.runInContext(await fs.readFile(new URL('../public/research-autofill.js',import.meta.url),'utf8'),context);
const names=['Amherst College','Bowdoin College','Brown University','California Institute of Technology','Dartmouth College','Denison University','Duke University','Grinnell College','Harvard University','Princeton University','Rice University','Stanford University','University of Notre Dame','University of Richmond','Washington and Lee University','Williams College','Yale University','Massachusetts Institute of Technology'];
const results=new Array(names.length);let next=0;
await Promise.all(Array.from({length:3},async()=>{
  for(;;){const i=next++;if(i>=names.length)return;const school=DIRECTORY.find(s=>s.name===names[i]);
    if(!school)throw new Error('Missing official starting source: '+names[i]);
    try{const r=await research({url:school.url,applicant:'international',level:'first-year'}),e=context.ApplyTrackResearch.extract(r,cycle);results[i]={name:school.name,url:school.url,pages:r.pages.length,documents:r.documents.filter(d=>d.scope!=='financial-aid').length,missing:r.verification.filter(c=>c.status==='not-found').map(c=>c.topic),unclear:r.verification.filter(c=>['mention','conflicting'].includes(c.status)).map(c=>c.topic),applicationDeadlines:e.deadlines,dateConflicts:e.conflictEvidence,fee:e.fee,waiver:e.waiverStatus,failures:r.scan.failures,stopped:r.scan.stopped,pathways:r.pathways?.map(p=>({id:p.id,documents:p.documents.length})),alternativeSources:r.alternativeSources,...(process.argv.includes('--include-evidence')?{report:r}:{})};}
    catch(error){results[i]={name:school.name,url:school.url,error:error.message};}
  }
}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),cycle:cycle||null,profile:{applicant:'international',level:'first-year'},note:'Evidence discovery only. A readable page or located topic does not establish a complete checklist or personal eligibility. Yearless dates use only the explicit --cycle argument; no saved data is changed.',results},null,2));
