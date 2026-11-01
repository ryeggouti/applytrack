// Coverage describes evidence located, never a complete checklist or personal eligibility.
const groups=[
 ['Application form',['Application form']],
 ['Transcripts',['Academic transcripts']],
 ['School / college reports',['School report','College report']],
 ['Recommendations',['Recommendations','Teacher recommendations','Counselor recommendation','Instructor recommendations']],
 ['Essays / writing supplement',['Application essays','Graded written paper']],
 ['Testing policy',['SAT / ACT testing']],
 ['English-language policy',['English proficiency']],
 ['Translations',['Document translations']],
 ['Later school updates',['Mid-year report','Mid-year transcript','Senior-year grades','Final school report','Final transcript']],
 ['Program-specific supplements',['Portfolio','Arts supplement']],
];
export function evidenceStatus(items){
  if(!items.length)return 'not-found';
  if(items.some(i=>/^Mixed/.test(i.qualification)))return 'conflicting';
  if(items.some(i=>/^Conditional/.test(i.qualification)))return 'conditional';
  if(items.some(i=>/^Required/.test(i.qualification)))return 'explicit';
  if(items.some(i=>/^Optional|^Recommended|^Not offered/.test(i.qualification)))return 'policy';
  return 'mention';
}
export function coverageChecks(documents,profile,acquisition='fetched'){
  return groups.map(([topic,labels])=>{
    const evidence=documents.filter(d=>d.scope!=="financial-aid"&&labels.includes(d.label)),status=evidenceStatus(evidence);
    return {topic,status,live:acquisition==='fetched'&&status!=='not-found',sources:[...new Set(evidence.map(e=>e.url))],
      detail:status==='not-found'?'Not established in the inspected material. This does not mean it is required or unnecessary.':status==='mention'?'Mentioned, but no clear requirement or policy was established.':status==='conditional'?'Conditions found; your eligibility has not been determined.':status==='conflicting'?'Different conditions or statements need review.':status==='policy'?'An optional, recommended or exclusion policy was located.':'An explicit instruction was located; check its scope and cycle.'};
  });
}
export function sourceFailure(url,error){
  const message=error.message||'The page could not be read.';
  const code=error.code||(/blocked automated|human verification/i.test(message)?'blocked':/disallowed/i.test(message)?'robots-denied':/crawler access/i.test(message)?'robots-unavailable':/PDF|not an HTML/i.test(message)?'unsupported-format':/timeout|timed out|abort/i.test(message)?'timeout':/HTTP 404/i.test(message)?'not-found':'unavailable');
  return {url,code,message};
}
export function pagePurpose(text){
  if(/checklist|requirements?|application.materials|application.instructions/i.test(text))return 'checklist';
  if(/application.fee|fee.waiver/i.test(text))return 'fees';
  if(/deadline|timeline/i.test(text))return 'deadlines';
  if(/international|english.proficiency|language.test/i.test(text))return 'international';
  if(/transcript|school.report|recommendation|teacher.evaluation/i.test(text))return 'school';
  if(/essays?|writing.supplement/i.test(text))return 'writing';
  if(/standardized|testing|test.policy/i.test(text))return 'testing';
  if(/financial.aid|finaid|apply.for.aid/i.test(text))return 'aid';
  return 'general';
}
