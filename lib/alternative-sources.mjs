// Source addresses only: instructions are fetched anew, never stored as requirements.
export function alternativeSources(url,profile){
  const source=new URL(url);
  if(!['amherst.edu','www.amherst.edu'].includes(source.hostname)||
     profile.level!=='first-year'||!/^\/(?:admission(?:\/|$)|$)/.test(source.pathname)||
     /transfer/i.test(source.pathname))return [];
  return [
    {url:'https://admission.amherst.edu/register/quickpass',text:'Amherst Quick Pass fee-waiver instructions',purpose:'fee-waiver'},
    {url:'https://admission.amherst.edu/register/qbrdsupplement',text:'Amherst QuestBridge Regular Decision supplement',pathway:'questbridge'}
  ];
}
export function sourceScope(url,title=''){
  if(/questbridge|\/register\/qb(?:rd|ed)supplement/i.test(url+' '+title))return 'questbridge';
  if(/finaid|financial[-_]?aid|apply-for-aid|\/\/sfs\./i.test(url))return 'financial-aid';
  return 'admission';
}
export function sourcePurpose(url){
  const source=new URL(url);
  return source.hostname==='admission.amherst.edu'&&source.pathname==='/register/quickpass'?'fee-waiver':'';
}
