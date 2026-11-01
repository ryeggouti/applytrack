// Optional live checks. No saved application data is read or changed.
// Run: node scripts/check-research-coverage.mjs > coverage.json
import {research} from '../lib/crawler.mjs';
import {DIRECTORY} from '../lib/universities.mjs';
const names=['Amherst College','Bowdoin College','Brown University','California Institute of Technology','Dartmouth College','Denison University','Duke University','Grinnell College','Harvard University','Princeton University','Rice University','Stanford University','University of Notre Dame','University of Richmond','Washington and Lee University','Williams College','Yale University','Massachusetts Institute of Technology'];
const results=new Array(names.length);let next=0;
await Promise.all(Array.from({length:3},async()=>{
  for(;;){const i=next++;if(i>=names.length)return;const school=DIRECTORY.find(s=>s.name===names[i]);
    if(!school)throw new Error('Missing official starting source: '+names[i]);
    try{const r=await research({url:school.url,applicant:'international',level:'first-year'});results[i]={name:school.name,url:school.url,pages:r.pages.length,documents:r.documents.filter(d=>d.scope!=='financial-aid').length,missing:r.verification.filter(c=>c.status==='not-found').map(c=>c.topic),unclear:r.verification.filter(c=>['mention','conflicting'].includes(c.status)).map(c=>c.topic),failures:r.scan.failures,stopped:r.scan.stopped,pathways:r.pathways?.map(p=>({id:p.id,documents:p.documents.length})),alternativeSources:r.alternativeSources};}
    catch(error){results[i]={name:school.name,url:school.url,error:error.message};}
  }
}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),profile:{applicant:'international',level:'first-year'},note:'Evidence discovery only. A readable page or located topic does not establish a complete checklist or personal eligibility.',results},null,2));
