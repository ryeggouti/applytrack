/* Optional local preferences. Never changes application records or determines eligibility. */
(() => {
  'use strict';
  const KEY='applytrack-profile-v1';
  function cleanProfile(value={}){
    const p=value&&typeof value==='object'?value:{};
    return {preferredName:typeof p.preferredName==='string'?p.preferredName.replace(/\s+/g,' ').trim().slice(0,50):'',applicant:['international','domestic'].includes(p.applicant)?p.applicant:'',level:['first-year','transfer'].includes(p.level)?p.level:'',cycle:/^20\d{2}$/.test(String(p.cycle||''))?String(p.cycle):'',setupSeen:p.setupSeen===true};
  }
  globalThis.ApplyTrackProfile={cleanProfile};
  if(typeof document==='undefined')return;
  let profile=cleanProfile(),store=null,onDone=null;
  for(const kind of ['localStorage','sessionStorage']){
    try{const s=window[kind],raw=s.getItem(KEY);if(!store)store=s;if(raw){profile=cleanProfile(JSON.parse(raw));store=s;break;}}catch{}
  }
  const get=id=>document.getElementById(id),dialog=get('profile-dialog'),form=get('profile-form');
  function paint(){
    const parts=[profile.preferredName,profile.applicant?profile.applicant==='international'?'International applicant':'Domestic applicant':'',profile.level?profile.level==='first-year'?'First-year undergraduate':'Undergraduate transfer':'',profile.cycle?'July '+profile.cycle+'–June '+(+profile.cycle+1):''].filter(Boolean);
    get('profile-summary').textContent=parts.length?parts.join(' · '):'Add a preferred name and application choices to personalize your workspace.';
    get('edit-profile').textContent=parts.length?'Edit profile':'Set up my profile';
  }
  function write(next){
    profile=cleanProfile(next);let persisted=false;
    try{if(store){store.setItem(KEY,JSON.stringify(profile));persisted=true;}}catch{}
    if(!persisted)try{store=window.sessionStorage;store.setItem(KEY,JSON.stringify(profile));persisted=true;}catch{}
    paint();return persisted;
  }
  function close(saved=false){
    if(!saved)write({...profile,setupSeen:true});
    dialog.close();const callback=onDone;onDone=null;callback?.();
  }
  function open(options={}){
    if(document.querySelector('dialog[open]'))return;
    onDone=options.onDone||null;form.reset();
    for(const key of ['preferredName','applicant','level','cycle'])form.elements[key].value=profile[key];
    get('profile-save-status').hidden=true;get('profile-skip').textContent=profile.setupSeen?'Cancel':'Skip for now';
    dialog.showModal();form.elements.preferredName.focus();
  }
  function applyResearchDefaults(){
    if(profile.applicant)get('research-applicant').value=profile.applicant;
    if(profile.level)get('research-level').value=profile.level;
    if(profile.cycle)get('research-cycle').value=profile.cycle;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();const data=new FormData(form);
    const persisted=write({preferredName:data.get('preferredName'),applicant:data.get('applicant'),level:data.get('level'),cycle:data.get('cycle'),setupSeen:true});
    if(!persisted){get('profile-save-status').textContent='Browser storage is unavailable. These choices will work until this page is closed.';get('profile-save-status').hidden=false;setTimeout(()=>close(true),1800);}else close(true);
  });
  get('edit-profile').addEventListener('click',()=>open());
  get('profile-close').addEventListener('click',()=>close());get('profile-skip').addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  globalThis.ApplyTrackProfile={cleanProfile,read:()=>({...profile}),needsSetup:()=>!profile.setupSeen,open,applyResearchDefaults};
  paint();
})();
