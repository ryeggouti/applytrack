/* Shared activities are independent of colleges and use the same atomic save. */
(() => {
  'use strict';
  const states=['Planning','Ongoing','Completed'];
  const text=(v,max)=>typeof v==='string'&&v.length<=max;
  function clean(value=[]){
    if(!Array.isArray(value)||value.length>200)throw new Error('Keep up to 200 activities in your planning list.');
    const ids=new Set();
    return value.map(a=>{
      if(!a||!text(a.id,100)||!a.id||ids.has(a.id)||!text(a.title,150)||!a.title.trim()||!text(a.role,50)||!text(a.organization,100)||!text(a.type,60)||!text(a.description,150)||!text(a.impact,2000)||!text(a.nextStep,1000)||!text(a.notes,5000)||!states.includes(a.status)||!Array.isArray(a.grades)||new Set(a.grades).size!==a.grades.length||a.grades.some(g=>!['9','10','11','12','Post-graduate'].includes(g))||!['','School year','School break','All year'].includes(a.timing)||![a.hours,a.weeks].every((v,i)=>v===''||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=[168,52][i])||typeof a.shortlisted!=='boolean')throw new Error('An activity has invalid details. Your saved work has not changed.');
      ids.add(a.id);return {id:a.id,title:a.title.trim(),role:a.role,organization:a.organization,type:a.type,description:a.description,impact:a.impact,nextStep:a.nextStep,notes:a.notes,status:a.status,grades:[...a.grades],timing:a.timing,hours:a.hours,weeks:a.weeks,shortlisted:a.shortlisted};
    });
  }
  function merge(current,incoming){const ids=new Set(current.map(a=>a.id));return clean([...current,...incoming.filter(a=>!ids.has(a.id))]);}
  globalThis.ApplyTrackActivities={clean,merge,states};
})();
