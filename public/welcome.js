/* The welcome preference is independent of application records and backups. */
(() => {
  'use strict';
  const KEY='applytrack-welcome-v1';
  const greetings=['Welcome back{name}.','Good to see you again{name}.','Hi{name}. Let’s pick up where you left off.','Welcome back{name}. Ready for the next step?','Hey{name}. Here’s where things stand.','Nice to have you back{name}.','Hi{name}. One step at a time.','Welcome back{name}. Let’s keep going.'];
  function formatGreeting(template,name=''){const clean=String(name).replace(/\s+/g,' ').trim().slice(0,50);return template.replace('{name}',clean?', '+clean:'');}
  const steps=[
    {view:'applications',target:'#add',title:'Start with a college.',text:'Add a college to your list. Its round, deadline, fee and document checklist all live together on one card.'},
    {view:'applications',target:'#research-launch',title:'Let the official pages help.',text:'Research a university to pull in suggested documents, dates and fees, each with a link to its source. You choose what to keep.'},
    {view:'deadlines',target:'#deadline-overview',title:'See what’s due next.',text:'Deadlines shows every saved date in order, flags the ones coming up soon, and lists colleges that still need a date.'},
    {view:'documents',target:'#document-overview',title:'Tick things off.',text:'Documents gathers every checklist in one place. Checking an item here also updates its college.'},
    {view:'about',target:'#about-export',title:'Keep a backup.',text:'Your list is saved only in this browser. Export a backup now and then to keep a copy or move to another device.'}
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
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state={},store=null,index=-1,target=null,returnHash='',returnFocus=null;
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
    if(completed&&globalThis.ApplyTrackProfile?.needsSetup?.())ApplyTrackProfile.open();
  }
  function renderStep(){
    clearTarget();const step=steps[index];
    if(location.hash!=='#'+step.view)location.hash=step.view;
    get('welcome-intro').hidden=true;get('welcome-step').hidden=false;
    dialog.classList.add('tour-guided');
    dialog.setAttribute('aria-labelledby','tour-title');dialog.setAttribute('aria-describedby','tour-description');
    get('tour-progress').textContent='QUICK TOUR · '+(index+1)+' OF '+steps.length;
    get('tour-title').textContent=step.title;get('tour-description').textContent=step.text;
    get('tour-back').disabled=index===0;
    get('tour-next').textContent=index===steps.length-1?'Done':'Next →';
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
    returnHash=location.hash;returnFocus=document.activeElement;index=-1;
    dialog.classList.remove('tour-guided','tour-at-top');get('welcome-intro').hidden=false;get('welcome-step').hidden=true;
    dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-description');
    dialog.showModal();get('start-tour').focus({preventScroll:true});
  }
  get('start-tour').addEventListener('click',()=>{
    index=0;renderStep();
  });
  get('tour-next').addEventListener('click',()=>{if(index===steps.length-1)finish(true);else{index++;renderStep();}});
  get('tour-back').addEventListener('click',()=>{if(index>0){index--;renderStep();}});
  get('skip-welcome').addEventListener('click',()=>finish(false));
  get('skip-tour').addEventListener('click',()=>finish(false));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  get('replay-tour').addEventListener('click',openWelcome);
  function greet(){
    const day=new Date().toDateString();
    if(state.lastGreetingDay===day)return;
    const choice=nextGreeting(state.lastGreeting);remember({lastGreeting:choice,lastGreetingDay:day});
    const toast=document.createElement('div');toast.className='return-greeting';toast.setAttribute('role','status');
    const spark=document.createElement('span');spark.className='greeting-spark';spark.setAttribute('aria-hidden','true');spark.textContent='✦';
    const text=document.createElement('strong');text.textContent=formatGreeting(greetings[choice],globalThis.ApplyTrackProfile?.read?.()?.preferredName||'');
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Dismiss greeting');
    const remove=()=>{toast.classList.add('is-leaving');setTimeout(()=>toast.remove(),reduced?0:200);};
    close.addEventListener('click',remove);
    toast.append(spark,text,close);document.body.append(toast);
    setTimeout(remove,4500);
  }
  if(!state.seen)openWelcome();
  else greet();
})();
