(() => {
  'use strict';
  const empty=()=>({origin:'unknown',url:'',fetchedAt:'',confirmedAt:'',confirmedFor:''});
  function clean(value){
    if(value===undefined)return empty();
    if(!value||typeof value!=='object'||Array.isArray(value)||!['unknown','manual','research'].includes(value.origin))throw new Error('Invalid deadline review details.');
    for(const [key,max] of [['url',1000],['fetchedAt',40],['confirmedAt',40],['confirmedFor',1500]])if(typeof value[key]!=='string'||value[key].length>max)throw new Error('Invalid deadline review details.');
    for(const key of ['fetchedAt','confirmedAt'])if(value[key]&&!Number.isFinite(Date.parse(value[key])))throw new Error('Invalid deadline review date.');
    if(value.url){try{if(!['https:','http:'].includes(new URL(value.url).protocol))throw 0;}catch{throw new Error('Use an http:// or https:// deadline source.');}}
    return {origin:value.origin,url:value.url,fetchedAt:value.fetchedAt,confirmedAt:value.confirmedAt,confirmedFor:value.confirmedFor};
  }
  function signature(c){return JSON.stringify([c.name.trim(),c.website,c.deadline,c.round,c.deadlineTime||'',c.deadlineZone||'']);}
  function confirmed(c){return !!c.deadline&&!!c.deadlineReview?.confirmedAt&&c.deadlineReview.confirmedFor===signature(c);}
  function status(c){return !c.deadline?'No date set':confirmed(c)?'Confirmed by you':c.deadlineReview?.origin==='research'?'Research suggestion · check date':'Needs date confirmation';}
  globalThis.ApplyTrackTrust={clean,signature,confirmed,status};
})();
