/* Read-only workspace views share the application's existing records and save path. */
(() => {
  'use strict';
  function groupDeadlines(records,day){
    const groups={upcoming:[],past:[],missing:[],submitted:[]};
    for(const c of records){
      const group=c.status==='Submitted'?'submitted':!c.deadline?'missing':c.deadline<day?'past':'upcoming';
      groups[group].push(c);
    }
    for(const items of Object.values(groups))items.sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999')||a.name.localeCompare(b.name));
    return groups;
  }
  globalThis.ApplyTrackWorkspace={groupDeadlines};
  if(typeof document==='undefined')return;
  const views=['applications','deadlines','documents','about'];
  const titles={applications:'Your next chapter',deadlines:'Deadlines',documents:'Documents',about:'About'};
  function showView(focus=false){
    const requested=location.hash.slice(1),view=views.includes(requested)?requested:'applications';
    for(const section of document.querySelectorAll('[data-workspace-view]'))section.hidden=section.dataset.workspaceView!==view;
    for(const link of document.querySelectorAll('[data-view]')){
      const active=link.dataset.view===view;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    document.title='ApplyTrack — '+titles[view];
    if(focus){document.querySelector('#view-'+view+' h1')?.focus({preventScroll:true});window.scrollTo(0,0);}
  }
  function empty(container,title,description){
    const el=node('div','empty');el.append(node('div','empty-icon','↗'),node('h3','',title),node('p','',description));
    el.append(button('Go to my applications',()=>{location.hash='applications';},'secondary'));container.append(el);
  }
  function badge(id,count){const el=$(id);el.textContent=String(count);el.hidden=!count;}
  globalThis.renderWorkspaceViews=records=>{
    const groups=groupDeadlines(records,today());
    const allDocuments=records.flatMap(c=>c.documents),done=allDocuments.filter(d=>d.done).length;
    badge('nav-deadlines-count',groups.upcoming.length);badge('nav-documents-count',allDocuments.length-done);
    $('deadline-overview').textContent=groups.upcoming.length+' upcoming · '+groups.past.length+' past · '+groups.missing.length+' without a date';
    $('document-overview').textContent=done+' of '+allDocuments.length+' documents ready · '+records.length+(records.length===1?' college':' colleges');
    const deadlines=$('deadline-list');deadlines.replaceChildren();
    if(!records.length)empty(deadlines,'Your next dates start here.','Add colleges and their confirmed deadlines to see them here.');
    else for(const [key,title] of [['upcoming','Coming up'],['past','Past deadlines'],['missing','Still needs a date'],['submitted','Already submitted']]){
      if(!groups[key].length)continue;
      const section=node('section','deadline-group');section.append(node('h2','',title));
      for(const c of groups[key]){
        const row=node('article','deadline-row'),stamp=node('div','date-stamp'+(key==='past'?' past-date':''));
        if(c.deadline){const d=new Date(c.deadline+'T12:00:00');stamp.append(node('span','',d.toLocaleDateString(undefined,{month:'short'})),node('strong','',String(d.getDate())),node('small','',String(d.getFullYear())));}
        else stamp.append(node('strong','','—'),node('small','','No date'));
        const text=node('div','deadline-description');text.append(node('h3','',c.name),node('p','',c.round+' · '+c.status));
        row.append(stamp,text,button('Edit college',()=>edit(c),'secondary'));section.append(row);
      }
      deadlines.append(section);
    }
    const docs=$('document-list');docs.replaceChildren();
    if(!records.length)empty(docs,'A little progress starts with a list.','Add a college and its documents to build your first checklist.');
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
        line.append(input,node('span','',d.name));checks.append(line);
      });
      if(!c.documents.length)checks.append(node('p','field-help','No documents yet. Edit the checklist to add the requirements you have confirmed.'));
      card.append(checks);docs.append(card);
    }
  };
  $('about-export').addEventListener('click',()=>$('export').click());
  window.addEventListener('hashchange',()=>showView(true));
  renderWorkspaceViews(colleges);showView();
})();
