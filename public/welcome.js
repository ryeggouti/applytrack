/* The welcome preference is independent of application records and backups. */
(() => {
  'use strict';
  const KEY='applytrack-welcome-v1';
  const greetings=['Welcome back{name}!','Good to have you back{name}.','Nice to see you again{name}.','Welcome home{name}.','Hey{name}. Let’s pick up where you left off.','Your next chapter awaits{name}.','Ready for the next step{name}?','One step closer{name}.','Glad you’re here{name}.','Back for what’s next{name}?','Let’s make a little progress{name}.','Your plans have a place here{name}.','Come on in{name}.','Good things take small steps{name}.','Here’s to your next chapter{name}.','Let’s keep moving{name}.','Make yourself at home{name}.','A fresh start for your plans{name}.','There you are{name}.','Let’s find your next step{name}.'];
  function formatGreeting(template,name=''){const clean=String(name).replace(/\s+/g,' ').trim().slice(0,50);return template.replace('{name}',clean?', '+clean:'');}
  const steps=[
    {view:'applications',target:'#add',title:'Start with a college.',text:'Add a college to your list. Keep its admission round, deadline, fee and document checklist together in one editable card.'},
    {view:'applications',target:'#research-launch',title:'Let the official pages help.',text:'Research a university to find sourced suggestions. Review the documents, choose your application cycle, and check the proposed deadline before saving.'},
    {view:'deadlines',target:'#deadline-overview',title:'See your next dates.',text:'Deadlines brings your saved dates together: what’s coming up, what has passed, and which colleges still need a date.'},
    {view:'documents',target:'#document-overview',title:'Make a little progress.',text:'Documents gathers your checklists in one place. Check an item here and the same item updates on its application card.'},
    {view:'about',target:'#about-export',title:'Keep a copy of your next chapter.',text:'Your list is saved in this browser, on this device. Export a backup to keep a copy or move it elsewhere. You can replay this tour from About ApplyTrack.'}
  ];
  function nextGreeting(last,random=Math.random()){
    const choices=greetings.map((_,i)=>i).filter(i=>i!==last);
    return choices[Math.min(choices.length-1,Math.floor(Math.max(0,random)*choices.length))];
  }
  globalThis.ApplyTrackWelcome={nextGreeting,greetings,formatGreeting};
  if(typeof document==='undefined')return;
  const dialog=document.getElementById('welcome-dialog');
  if(!dialog)return;
  const get=id=>document.getElementById(id);
  function releasePage(){clearTimeout(window.applytrackIntroFallback);document.documentElement.classList.remove('arrival-pending');}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state={},store=null,index=-1,target=null,returnHash='',returnFocus=null,timer=null;
  for(const candidate of ['localStorage','sessionStorage']){
    try{const storage=window[candidate];const raw=storage.getItem(KEY);if(!store)store=storage;if(raw){state=JSON.parse(raw);if(!state||typeof state!=='object')state={};store=storage;break;}}catch{}
  }
  function remember(patch){state={...state,...patch};try{store?.setItem(KEY,JSON.stringify(state));}catch{try{store=window.sessionStorage;store.setItem(KEY,JSON.stringify(state));}catch{/* Welcome remains optional when storage is unavailable. */}}}
  function reveal(){
    if(reduced)return;
    document.body.classList.remove('workspace-reveal');
    requestAnimationFrame(()=>document.body.classList.add('workspace-reveal'));
  }
  function clearTarget(){target?.classList.remove('tour-target');target=null;}
  function finish(completed){
    clearTarget();remember({seen:true,completed:state.completed===true||completed});
    dialog.close();dialog.classList.remove('tour-guided','tour-at-top');
    location.hash=returnHash||'#applications';reveal();
    if(returnFocus?.isConnected&&returnFocus!==document.body)returnFocus.focus({preventScroll:true});
  }
  function renderStep(){
    clearTarget();const step=steps[index];
    if(location.hash!=='#'+step.view)location.hash=step.view;
    get('welcome-intro').hidden=true;get('welcome-step').hidden=false;
    dialog.classList.add('tour-guided');
    dialog.setAttribute('aria-labelledby','tour-title');dialog.setAttribute('aria-describedby','tour-description');
    get('tour-progress').textContent='YOUR QUICK TOUR · '+(index+1)+' OF '+steps.length;
    get('tour-title').textContent=step.title;get('tour-description').textContent=step.text;
    get('tour-back').disabled=index===0;
    get('tour-next').textContent=index===steps.length-1?'I’m ready ✓':'Next →';
    get('tour-dots').replaceChildren(...steps.map((_,i)=>{const dot=document.createElement('span');dot.className=i===index?'current':'';return dot;}));
    // Wait for hash-based navigation to reveal the requested view before highlighting it.
    requestAnimationFrame(()=>{
      if(!dialog.open)return;
      target=document.querySelector(step.target);target?.classList.add('tour-target');
      target?.scrollIntoView({block:'center',behavior:'instant'});
      const rect=target?.getBoundingClientRect();dialog.classList.toggle('tour-at-top',!!rect&&rect.bottom>window.innerHeight-320);
      get('tour-next').focus({preventScroll:true});
    });
  }
  function openWelcome(){
    if(dialog.open||document.querySelector('dialog[open]'))return;
    releasePage();clearTimeout(timer);
    returnHash=location.hash;returnFocus=document.activeElement;index=-1;
    dialog.classList.remove('tour-guided','tour-at-top');get('welcome-intro').hidden=false;get('welcome-step').hidden=true;
    dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-description');
    dialog.showModal();get('start-tour').focus({preventScroll:true});
  }
  get('start-tour').addEventListener('click',()=>{
    const start=()=>{if(!dialog.open)dialog.showModal();index=0;renderStep();};
    if(globalThis.ApplyTrackProfile?.open){dialog.close();ApplyTrackProfile.open({onDone:start});}else start();
  });
  get('tour-next').addEventListener('click',()=>{if(index===steps.length-1)finish(true);else{index++;renderStep();}});
  get('tour-back').addEventListener('click',()=>{if(index>0){index--;renderStep();}});
  get('skip-welcome').addEventListener('click',()=>finish(false));
  get('skip-tour').addEventListener('click',()=>finish(false));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  get('replay-tour').addEventListener('click',openWelcome);
  const arrival=get('arrival-dialog');
  let arriving=false;
  function completeArrival(){
    if(!arriving)return;arriving=false;clearTimeout(timer);
    const done=()=>{arrival.close();arrival.classList.remove('is-leaving');releasePage();reveal();
      if(globalThis.ApplyTrackProfile?.needsSetup?.())ApplyTrackProfile.open();
    };
    if(reduced)done();else{arrival.classList.add('is-leaving');setTimeout(done,180);}
  }
  arrival.addEventListener('cancel',event=>{event.preventDefault();completeArrival();});
  if(!state.seen)openWelcome();
  else{
    const choice=nextGreeting(state.lastGreeting);remember({lastGreeting:choice});
    get('arrival-title').textContent=formatGreeting(greetings[choice],globalThis.ApplyTrackProfile?.read?.()?.preferredName||'');
    arriving=true;arrival.showModal();get('arrival-title').focus({preventScroll:true});
    timer=setTimeout(completeArrival,reduced?500:1200);
  }
})();
