/* Read-only workspace views share the application's existing records and save path. */
(() => {
  'use strict';
  function groupDeadlines(records,day,isPast=c=>c.deadline<day){
    const groups={upcoming:[],past:[],missing:[],submitted:[]};
    for(const c of records){
      const group=c.status==='Submitted'?'submitted':!c.deadline?'missing':isPast(c)?'past':'upcoming';
      groups[group].push(c);
    }
    const instant=c=>globalThis.deadlineInstant?.(c)??(c.deadline?Date.parse(c.deadline):Infinity);
    for(const items of Object.values(groups))items.sort((a,b)=>(instant(a)-instant(b))||(a.deadline||'9999').localeCompare(b.deadline||'9999')||a.name.localeCompare(b.name));
    groups.past.reverse();
    return groups;
  }
  globalThis.ApplyTrackWorkspace={groupDeadlines};
  if(typeof document==='undefined')return;
  const views=['applications','deadlines','documents','about','week','tasks','essays','activities','recommendations','funding'];
  const titles={applications:'My applications',deadlines:'Deadlines',documents:'Documents',about:'About',week:'This week',tasks:'Tasks',essays:'Essays',activities:'Activities',recommendations:'Recommendations',funding:'Scholarships & aid'};
  function showView(focus=false){
    const requested=location.hash.slice(1),view=views.includes(requested)?requested:'applications';
    for(const section of document.querySelectorAll('[data-workspace-view]'))section.hidden=section.dataset.workspaceView!==view;
    for(const link of document.querySelectorAll('[data-view]')){
      const active=link.dataset.view===view;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    if(['tasks','essays','activities','recommendations','funding'].includes(view))$('work-nav').open=true;
    document.title='ApplyTrack — '+titles[view];
    $('workspace-title').textContent=titles[view];
    if(focus){document.querySelector('#view-'+view+' h1')?.focus({preventScroll:true});window.scrollTo(0,0);}
  }
  globalThis.showWorkspaceView=showView;
  function empty(container,title,description){
    const el=node('div','empty');el.append(node('div','empty-icon','↗'),node('h3','',title),node('p','',description));
    el.append(button('Go to my applications',()=>{location.hash='applications';},'secondary'));container.append(el);
  }
  function badge(id,count){const el=$(id);el.textContent=String(count);el.hidden=!count;}
  globalThis.renderWorkspaceViews=records=>{
    const groups=groupDeadlines(records,today(),c=>deadlineState(c).past);
    $('application-intro').classList.toggle('intro-compact',records.length>0);
    if(records.length){
      const name=globalThis.ApplyTrackProfile?.read?.()?.preferredName;
      $('application-heading').textContent=name?'Your applications, '+name+'.':'Your applications.';
      const active=records.filter(c=>c.status!=='Submitted').length;
      $('application-summary').textContent=active+' application'+(active===1?'':'s')+' in progress · '+records.filter(c=>c.status==='Submitted').length+' submitted';
    }else{
      $('application-heading').textContent='Make room for what’s next.';
      $('application-summary').textContent='Every college’s deadline, fee and document checklist, in one place.';
    }
    const next=groups.upcoming[0];
    $('next-step-title').textContent=next?'Next deadline':'Your next step';
    const nextState=next?deadlineState(next):null;
    document.querySelector('.next-step').classList.toggle('urgent',nextState?.level==='urgent');
    $('next-step-copy').textContent=next?next.name+' · '+dateLabel(next.deadline)+(nextState.label?' · '+nextState.label:''):groups.missing.length?'Add the missing dates for '+groups.missing.length+' college'+(groups.missing.length===1?'':'s')+'.':records.length?'Check your documents and keep your list up to date.':'Add a college to start planning.';
    document.querySelector('.next-step').href=next||groups.missing.length?'#deadlines':records.length?'#documents':'#applications';
    const allDocuments=records.flatMap(c=>c.documents),done=allDocuments.filter(d=>d.done).length;
    badge('nav-deadlines-count',groups.upcoming.length);badge('nav-documents-count',allDocuments.length-done);
    $('deadline-overview').textContent=groups.upcoming.length+' upcoming · '+groups.past.length+' past · '+groups.missing.length+' without a date';
    $('document-overview').textContent=done+' of '+allDocuments.length+' documents ready · '+records.length+(records.length===1?' college':' colleges');
    const deadlines=$('deadline-list');deadlines.replaceChildren();
    if(!records.length)empty(deadlines,'No deadlines yet.','Add a college with its deadline and it will show up here.');
    else for(const [key,title] of [['upcoming','Coming up'],['past','Past deadlines'],['missing','Still needs a date'],['submitted','Already submitted']]){
      if(!groups[key].length)continue;
      const section=node('section','deadline-group');section.append(node('h2','',title));
      for(const c of groups[key]){
        const level=key==='upcoming'?deadlineState(c).level:'',row=node('article','deadline-row'),stamp=node('div','date-stamp'+(key==='past'?' past-date':level?' '+level+'-date':''));
        if(c.deadline){const d=new Date(c.deadline+'T12:00:00');stamp.append(node('span','',d.toLocaleDateString(undefined,{month:'short'})),node('strong','',String(d.getDate())),node('small','',String(d.getFullYear())));}
        else stamp.append(node('strong','','—'),node('small','','No date'));
        const text=node('div','deadline-description'),info=node('p','',c.round+' · '+c.status),state=deadlineState(c),time=timeLabel(c);
        if(time)info.append(' · '+time);
        text.append(node('h3','',c.name),info);globalThis.appendDeadlineTrust?.(text,c);
        if(key==='upcoming'){const chip=urgencyChip(state);if(chip)text.append(chip);}
        row.append(stamp,text,button('Edit college',()=>edit(c),'secondary'));section.append(row);
      }
      deadlines.append(section);
    }
    const docs=$('document-list');docs.replaceChildren();
    if(!records.length)empty(docs,'No checklists yet.','Add a college and its required documents to build your first checklist.');
    else for(const c of records){
      const card=node('article','card'),head=node('div','card-top'),label=node('div');
      label.append(node('h2','college-name',c.name),node('p','round',c.documents.filter(d=>d.done).length+' of '+c.documents.length+' ready'));
      head.append(label,button('Edit checklist',()=>edit(c),'secondary'));card.append(head);
      const checks=node('div','documents workspace-checks');
      c.documents.forEach((d,index)=>{
        const line=node('label','document'),input=node('input');input.type='checkbox';input.checked=d.done;input.id='workspace-doc-'+c.id+'-'+index;
        input.addEventListener('change',()=>{
          const next=structuredClone(colleges),college=next.find(x=>x.id===c.id);
          if(!college?.documents[index])return;
          college.documents[index].done=input.checked;
          if(save(next)){render();$(input.id)?.focus({preventScroll:true});}else input.checked=!input.checked;
        });
        line.append(input,documentCaption(d.name));checks.append(line);
      });
      if(!c.documents.length)checks.append(node('p','field-help','No documents yet. Edit the checklist to add the requirements you have confirmed.'));
      card.append(checks);docs.append(card);
    }
  };
  $('about-export').addEventListener('click',()=>$('export').click());
  window.addEventListener('hashchange',()=>showView(true));
  renderWorkspaceViews(colleges);showView();
})();
