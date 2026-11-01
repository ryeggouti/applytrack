(() => {
  'use strict';
  const model=ApplyTrackTrust,form=$('college-form');
  const panel=node('fieldset','deadline-review');panel.append(node('legend','','Check your deadline'));
  const description=node('p','field-help','Research suggests a date; your confirmation records that you checked the date and round. Changing the details clears confirmation.');panel.append(description);
  const sourceLabel=node('label','','Deadline source URL (optional)'),source=node('input');source.type='url';source.name='deadlineSource';source.pattern='https?://.+';source.maxLength=1000;source.placeholder='https://…';sourceLabel.append(source);panel.append(sourceLabel);
  const checkLabel=node('label','review-check'),check=node('input');check.type='checkbox';check.name='deadlineConfirmed';checkLabel.append(check,node('span','','I checked this date and admission round against the source.'));panel.append(checkLabel);
  const reviewStatus=node('p','field-help');panel.append(reviewStatus);form.elements.deadline.closest('.two').after(panel);
  let draft=model.clean(),researchEvidence=null,confirmationTouched=false;
  function record(){return Object.fromEntries(['name','website','deadline','round','deadlineTime','deadlineZone'].map(key=>[key,form.elements[key].value]));}
  globalThis.formError=(f,message)=>{let el=f.querySelector('.save-error');if(!el){el=node('p','research-error save-error');el.setAttribute('role','alert');f.querySelector('.form-actions').before(el);}el.textContent=message;el.hidden=false;};
  globalThis.showSaveProblem=message=>{const dialog=document.querySelector('dialog[open]');if(!dialog||dialog.querySelector('form'))return;let el=dialog.querySelector('.save-problem');if(!el){el=node('p','research-error save-problem');el.setAttribute('role','alert');dialog.append(el);dialog.addEventListener('close',()=>el.remove(),{once:true});}el.textContent=message;};
  globalThis.loadDeadlineReview=c=>{
    const prior=form.querySelector('.save-error');if(prior)prior.hidden=true;
    draft=model.clean(c?.deadlineReview);researchEvidence=null;confirmationTouched=false;source.value=draft.url;check.checked=!!c&&model.confirmed(c);reviewStatus.textContent=c?model.status(c):'Add a date, then confirm it when you have checked the source.';
  };
  globalThis.readDeadlineReview=()=>{
    const current=record(),url=source.value.trim(),urlChanged=url!==draft.url;
    const signature=model.signature(current),confirmedAt=!confirmationTouched&&!urlChanged&&draft.confirmedFor===signature&&draft.confirmedAt?draft.confirmedAt:new Date().toISOString();
    return {...draft,url,origin:urlChanged?'manual':draft.origin,fetchedAt:urlChanged?'':draft.fetchedAt,confirmedAt:check.checked&&current.deadline?confirmedAt:'',confirmedFor:check.checked&&current.deadline?signature:''};
  };
  function capture(report,result){
    if(!result||!form.elements.deadline.value)return;
    const round=form.elements.round.value;
    const match=result.deadlines.find(d=>d.date===form.elements.deadline.value&&(d.round===round||(round==='Early action'&&d.round==='Restrictive early action')||(round==='Early decision'&&d.round==='Early decision I')));
    if(!match)return;
    draft={...model.clean(),origin:'research',url:match.url,fetchedAt:Number.isFinite(Date.parse(report.checkedAt))?report.checkedAt:''};source.value=draft.url;check.checked=false;reviewStatus.textContent='Research suggestion. Open the source and check the date, year and admission round before confirming.';
  }
  globalThis.captureDeadlineEvidence=(report,result)=>{researchEvidence={report,result};capture(report,result);};
  for(const name of ['name','website','deadline','round','deadlineTime','deadlineZone'])form.elements[name].addEventListener('input',()=>{check.checked=false;draft={...draft,origin:'manual',fetchedAt:'',confirmedAt:'',confirmedFor:''};reviewStatus.textContent='Details changed. Check the source again before confirming.';});
  form.elements.round.addEventListener('change',()=>{if(researchEvidence)capture(researchEvidence.report,researchEvidence.result);});
  source.addEventListener('input',()=>{check.checked=false;});
  check.addEventListener('change',()=>{confirmationTouched=true;});
  globalThis.appendDeadlineTrust=(card,c)=>{
    if(!c.deadline)return;
    const review=model.clean(c.deadlineReview),line=node('div','deadline-trust'+(model.confirmed(c)?' confirmed':''));
    line.append(node('span','',model.status(c)));
    if(review.url){const a=node('a','','Check source ↗');a.href=review.url;a.target='_blank';a.rel='noopener noreferrer';line.append(a);}
    if(review.fetchedAt)line.append(node('small','','Research checked '+new Date(review.fetchedAt).toLocaleDateString()));
    if(model.confirmed(c))line.append(node('small','','Confirmed '+new Date(review.confirmedAt).toLocaleDateString()));card.append(line);
  };
  // Protect ordinary edits from accidental close/reload. Nothing is uploaded.
  const tracked=new Map();
  const discard=node('dialog','discard-dialog');discard.setAttribute('aria-labelledby','discard-title');
  const discardTitle=node('h2','','Keep your changes?');discardTitle.id='discard-title';
  discard.append(discardTitle,node('p','form-intro','You have unsaved edits. Keep editing to save them, or discard this draft.'));
  const discardActions=node('div','form-actions');let pendingClose=null;
  discardActions.append(button('Keep editing',()=>discard.close(),'secondary'),button('Discard changes',()=>{const target=pendingClose;discard.close();target?.close();},'danger'));discard.append(discardActions);document.body.append(discard);
  function requestDiscard(dialog){pendingClose=dialog;discard.showModal();discardActions.firstChild.focus();}
  function snapshot(f){return JSON.stringify([...f.elements].filter(e=>e.name).map(e=>[e.name,e.value,e.type==='checkbox'?e.checked:null]));}
  globalThis.markFormClean=f=>tracked.set(f,snapshot(f));
  function dirty(f){return tracked.has(f)&&tracked.get(f)!==snapshot(f);}
  for(const f of [form,$('planning-form')]){
    if(!f)continue;markFormClean(f);const dialog=f.closest('dialog');
    dialog.addEventListener('click',event=>{
      const b=event.target.closest('button');
      if(b&&(b.classList.contains('close')||b.textContent.trim()==='Cancel')&&dirty(f)){event.preventDefault();event.stopImmediatePropagation();requestDiscard(dialog);}
    },true);
    dialog.addEventListener('cancel',event=>{if(dirty(f)){event.preventDefault();requestDiscard(dialog);}});
  }
  window.addEventListener('beforeunload',event=>{if([...tracked.keys()].some(f=>f.closest('dialog')?.open&&dirty(f))){event.preventDefault();event.returnValue='';}});

  // A change from another tab must never be silently overwritten by this one.
  function reconcile(){
    if(document.querySelector('dialog[open]'))return;
    try{const raw=localStorage.getItem(KEY);if(raw===loadedSnapshot)return;const next=validate(raw?JSON.parse(raw):[]);colleges=next;loadedSnapshot=raw;storageReady=true;render();announce('Loaded the latest saved list from another tab.');}
    catch{storageReady=false;announce('Another tab changed storage to an unreadable list. Your data has not been overwritten. Export a backup before continuing.');}
  }
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){if(document.querySelector('dialog[open]'))announce('Another tab changed your saved list. Unsaved edits are protected; close this form to load the latest list.');else reconcile();}});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',reconcile));
  window.addEventListener('focus',reconcile);

  // Recovery is written before destructive changes. A failed write blocks deletion.
  const recoveryKey='applytrack-recovery-v1';
  function readRecovery(){
    const raw=localStorage.getItem(recoveryKey);if(!raw)return {removed:[],previous:[]};
    const value=JSON.parse(raw);if(!value||!Array.isArray(value.removed)||!Array.isArray(value.previous)||value.removed.length>20)throw new Error('Recovery data could not be read.');
    return {removed:value.removed.map(entry=>({at:entry.at,college:validate([entry.college])[0]})),previous:validate(value.previous)};
  }
  function preserve(change){
    try{const current=readRecovery();localStorage.setItem(recoveryKey,JSON.stringify(change(current)));return true;}
    catch{const message='Recovery could not be saved. Export a backup and check browser storage before removing or replacing data.';announce(message);globalThis.showSaveProblem?.(message);return false;}
  }
  globalThis.prepareCollegeRecovery=college=>preserve(state=>({...state,removed:[{at:new Date().toISOString(),college},...state.removed.filter(e=>e.college.id!==college.id)].slice(0,20)}));
  globalThis.prepareReplaceRecovery=()=>!colleges.length||preserve(state=>({...state,previous:colleges}));
  const recovery=node('section','recovery-panel');recovery.append(node('h2','','Recovery'),node('p','field-help','Restore the last 20 removed colleges or recover missing colleges from the list before your most recent replacement. This stays on this device; export backups for long-term safety.'));
  const recoveryList=node('div');recovery.append(recoveryList);$('view-about').append(recovery);
  function restore(records){
    const ids=new Set(colleges.map(c=>c.id)),missing=records.filter(c=>!ids.has(c.id));
    if(!missing.length){announce('Those colleges are already on your list. Existing entries were kept.');return;}
    try{const next=validate([...colleges,...missing]);if(save(next)){render();announce('Restored '+missing.length+' college'+(missing.length===1?'':'s')+' with linked checklists and planning items. Existing colleges were kept.');}}catch(e){announce(e.message);}
  }
  function downloadPrevious(records){const url=URL.createObjectURL(new Blob([JSON.stringify({format:'ApplyTrack',version:4,colleges:records},null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='applytrack-before-replacement.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  globalThis.renderRecovery=()=>{
    recoveryList.replaceChildren();
    try{
      const state=readRecovery(),ids=new Set(colleges.map(c=>c.id));
      if(state.previous.length){const row=node('div','recovery-row'),text=node('div');text.append(node('strong','','Before your last list replacement'),node('p','field-help',state.previous.length+(state.previous.length===1?' college saved':' colleges saved')));row.append(text,button('Restore missing colleges',()=>restore(state.previous),'secondary'),button('Download that list',()=>downloadPrevious(state.previous),'text-btn'));recoveryList.append(row);}
      for(const entry of state.removed){const row=node('div','recovery-row'),text=node('div');text.append(node('strong','',entry.college.name),node('p','field-help',ids.has(entry.college.id)?'Already on your list':'Includes documents and all planning trackers'));const b=button(ids.has(entry.college.id)?'Already restored':'Restore',()=>restore([entry.college]),'secondary');b.disabled=ids.has(entry.college.id);row.append(text,b);recoveryList.append(row);}
      if(!state.previous.length&&!state.removed.length)recoveryList.append(node('p','field-help','Nothing to recover yet. Removed colleges will appear here.'));
    }catch{recoveryList.append(node('p','research-error','Recovery data could not be read. Its stored contents have been left untouched.'));}
  };
  // Animate the real disclosure so keyboard and assistive technology stay native.
  const group=$('work-nav'),summary=group.querySelector('summary'),links=group.querySelector('.work-nav-links');let animation=null,desiredOpen=group.open;
  summary.addEventListener('click',event=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!links.animate)return;
    event.preventDefault();const opening=animation?!desiredOpen:!group.open;desiredOpen=opening;
    const height=links.getBoundingClientRect().height;animation?.cancel();group.open=true;links.style.overflow='hidden';
    animation=links.animate([{height:height+'px',opacity:height?1:0},{height:(opening?links.scrollHeight:0)+'px',opacity:opening?1:0}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
    animation.onfinish=()=>{group.open=opening;links.style.overflow='';animation=null;};
  });
  links.addEventListener('click',event=>{if(event.target.closest('a')){animation?.cancel();animation=null;group.open=true;links.style.overflow='';}});
  renderRecovery();render();
})();
