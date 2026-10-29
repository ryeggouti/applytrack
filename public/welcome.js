/* The welcome preference is independent of application records and backups. */
(() => {
  'use strict';
  const KEY='applytrack-welcome-v1';
  const greetings=['Welcome back!','Good to have you back!','Nice to see you again!','Welcome home!'];
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
  globalThis.ApplyTrackWelcome={nextGreeting,greetings};
  if(typeof document==='undefined')return;
  const dialog=document.getElementById('welcome-dialog');
  if(!dialog)return;
  const get=id=>document.getElementById(id);
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
    get('return-greeting').hidden=true;clearTimeout(timer);
    returnHash=location.hash;returnFocus=document.activeElement;index=-1;
    dialog.classList.remove('tour-guided','tour-at-top');get('welcome-intro').hidden=false;get('welcome-step').hidden=true;
    dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-description');
    dialog.showModal();get('start-tour').focus({preventScroll:true});
  }
  get('start-tour').addEventListener('click',()=>{index=0;renderStep();});
  get('tour-next').addEventListener('click',()=>{if(index===steps.length-1)finish(true);else{index++;renderStep();}});
  get('tour-back').addEventListener('click',()=>{if(index>0){index--;renderStep();}});
  get('skip-welcome').addEventListener('click',()=>finish(false));
  get('skip-tour').addEventListener('click',()=>finish(false));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  get('replay-tour').addEventListener('click',openWelcome);
  get('dismiss-greeting').addEventListener('click',()=>{get('return-greeting').hidden=true;clearTimeout(timer);});
  if(!state.seen)openWelcome();
  else{
    reveal();const choice=nextGreeting(state.lastGreeting);remember({lastGreeting:choice});
    get('return-greeting-title').textContent=greetings[choice];get('return-greeting').hidden=false;
    timer=setTimeout(()=>{get('return-greeting').hidden=true;},5000);
  }
})();
