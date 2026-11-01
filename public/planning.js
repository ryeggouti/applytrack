(() => {
  'use strict';
  const model=ApplyTrackPlanning, sections={},lists={},filters={};
  const copy={tasks:['Small steps. Real progress.','Break applications into manageable tasks with their own dates.'],essays:['Give every draft a place.','Keep prompts, word limits and draft links together. Your writing stays in your document editor.'],recommendations:['A little help, well organized.','Track who you asked, when you asked, and what has arrived.'],funding:['Make room for opportunity.','Scholarship and financial-aid dates have their own place, separate from admission deadlines.']};
  const root=$('planning-views');
  function option(value,label){const o=node('option','',label);o.value=value;return o;}
  function makeView(type,title,description){
    const section=node('section','workspace-view planning-view');section.id='view-'+type;section.dataset.workspaceView=type;section.hidden=true;
    const head=node('div','planning-heading'),text=node('div','view-heading'),h=node('h1','',title);h.id=type+'-heading';h.tabIndex=-1;section.setAttribute('aria-labelledby',h.id);
    text.append(h,node('p','',description));head.append(text);section.append(head);root.append(section);sections[type]=section;return {section,head};
  }
  const week=makeView('week','A clear start to your week.','Your next seven calendar days, plus anything overdue. All dates come from your saved entries.');
  function exportCalendar(){
    const result=ApplyTrackCalendar.build(colleges,{toInstant:deadlineInstant});
    if(!result.count){announce('Add a date to an unfinished application or planning item before exporting a calendar.');return;}
    const url=URL.createObjectURL(new Blob([result.text],{type:'text/calendar;charset=utf-8'})),link=node('a');
    link.href=url;link.download='applytrack-dates-'+today()+'.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    announce('Calendar exported with '+result.count+' dates. Import the file into your calendar. Re-export after changing dates; this is a snapshot, not a live sync.');
  }
  const quickActions=node('div','heading-actions week-actions');quickActions.append(button('+ Add task',()=>open('tasks'),'primary'),button('Export calendar',exportCalendar,'secondary'));week.head.append(quickActions);
  const deadlineExport=button('Export calendar',exportCalendar,'secondary');deadlineExport.id='deadline-calendar-export';$('deadline-overview').before(deadlineExport);
  const weekStats=node('div','planning-stats');week.section.append(weekStats);
  const calendarHelp=node('details','calendar-help');calendarHelp.append(node('summary','','How calendar export works'),node('p','field-help','Exports all unfinished dated work, including dates beyond this week. Notes and recommender-name fields stay out. Import the file into your calendar and re-export after changes; it is a snapshot, not a live sync. Dates still need to be checked against official sources.'));week.section.append(calendarHelp);
  const weekList=node('div');week.section.append(weekList);
  for(const [type,definition] of Object.entries(model.types)){
    const {section,head}=makeView(type,...copy[type]);
    head.append(button('+ Add '+definition.singular,()=>open(type),'primary'));
    const toolbar=node('div','toolbar planning-toolbar'),college=node('select'),state=node('select');
    college.setAttribute('aria-label','Filter '+definition.label+' by college');state.setAttribute('aria-label','Filter '+definition.label+' by progress');
    state.append(option('open','Still to do'),option('all','All items'),option('complete','Ready / completed'));
    const searchLabel=node('label','search planning-search'),query=node('input');query.type='search';query.placeholder='Search '+definition.label.toLowerCase()+'…';query.setAttribute('aria-label','Search '+definition.label);searchLabel.append(query);
    toolbar.append(searchLabel,college,state);section.append(toolbar);filters[type]={college,state,query};query.addEventListener('input',()=>renderPlanningViews(colleges));
    college.addEventListener('change',()=>renderPlanningViews(colleges));state.addEventListener('change',()=>renderPlanningViews(colleges));
    const summary=node('p','field-help');const list=node('div','planning-list');section.append(summary,list);lists[type]={list,summary};
  }
  const dialog=node('dialog','planning-dialog');dialog.id='planning-dialog';dialog.setAttribute('aria-labelledby','planning-dialog-title');
  const form=node('form');form.id='planning-form';
  const head=node('div','dialog-head'),heading=node('h2');heading.id='planning-dialog-title';head.append(heading,button('×',()=>dialog.close(),'close'));
  head.lastChild.setAttribute('aria-label','Close planning form');form.append(head,node('p','form-intro','Keep the next step clear. Everything stays in this browser and is included in your backup.'));
  const inputs={},labels={};
  function field(name,label,kind='input',attrs={}){
    const wrap=node('label','',label),input=node(kind);input.name=name;
    for(const [key,value] of Object.entries(attrs))input[key]=value;
    wrap.append(input);form.append(wrap);inputs[name]=input;labels[name]=wrap;return input;
  }
  field('college','College','select',{required:true});
  field('title','Task','input',{required:true,maxLength:200});
  field('kind','Deadline type','select').append(option('Scholarship','Scholarship'),option('Financial aid','Financial aid'));
  field('person','Recommender name','input',{maxLength:150});
  field('date','Due date (optional)','input',{type:'date'});
  field('askedOn','Date requested (optional)','input',{type:'date'});
  field('status','Progress','select');
  field('wordLimit','Word limit (optional)','input',{type:'number',min:'1',max:'100000',step:'1'});
  field('url','Document or official page link (optional)','input',{type:'url',maxLength:1000,placeholder:'https://…'});
  field('notes','Notes','textarea',{rows:5,maxLength:5000});
  const error=node('p','research-error');error.hidden=true;error.setAttribute('role','alert');form.append(error);
  const actions=node('div','form-actions');actions.append(button('Cancel',()=>dialog.close(),'text-btn'));const submit=node('button','primary','Save');submit.type='submit';actions.append(submit);form.append(actions);dialog.append(form);document.body.append(dialog);
  let editing=null;
  function open(type,collegeId='',itemId=''){
    if(!colleges.length){announce('Add a college first, then create its tasks, essays and other plans.');location.hash='applications';$('add').focus();return;}
    const item=colleges.find(c=>c.id===collegeId)?.planning?.[type]?.find(i=>i.id===itemId);
    editing={type,collegeId,itemId};form.reset();error.hidden=true;
    inputs.college.replaceChildren(...colleges.map(c=>option(c.id,c.name)));inputs.college.value=collegeId||colleges[0].id;inputs.college.disabled=!!item;
    heading.textContent=(item?'Edit ':'Add ')+model.types[type].singular;
    // Change the text node only, preserving its associated input.
    labels.title.firstChild.textContent={tasks:'Task',essays:'Essay title or prompt',recommendations:'Recommendation / role',funding:'Scholarship or aid program'}[type];
    labels.notes.firstChild.textContent=type==='essays'?'Full prompt and notes':'Notes';
    inputs.status.replaceChildren(...model.types[type].states.map(s=>option(s,s)));
    for(const name of ['kind','person','askedOn','wordLimit'])labels[name].hidden=!(name==='kind'?type==='funding':name==='wordLimit'?type==='essays':type==='recommendations');
    if(item)for(const name of ['title','date','status','notes','url','person','askedOn','wordLimit','kind'])inputs[name].value=item[name];
    globalThis.markFormClean?.(form);dialog.showModal();inputs.title.focus();
  }
  function persist(next){try{const clean=validate(next);if(!save(clean)){error.textContent=$('notice').querySelector('span')?.textContent||'This change could not be saved. Export a backup and check browser storage.';error.hidden=false;return false;}render();return true;}catch(e){error.textContent=e.message;error.hidden=false;return false;}}
  form.addEventListener('submit',event=>{
    event.preventDefault();const {type,collegeId,itemId}=editing,next=structuredClone(colleges),college=next.find(c=>c.id===(itemId?collegeId:inputs.college.value));
    if(!college){error.textContent='This college no longer exists. Close and reopen this form.';error.hidden=false;return;}
    const item={id:itemId||crypto.randomUUID(),title:inputs.title.value.trim(),date:inputs.date.value,status:inputs.status.value,notes:inputs.notes.value.trim(),url:inputs.url.value.trim(),person:inputs.person.value.trim(),askedOn:inputs.askedOn.value,wordLimit:inputs.wordLimit.value===''?'':Number(inputs.wordLimit.value),kind:inputs.kind.value||'Scholarship'};
    college.planning=model.clean(college.planning);const index=college.planning[type].findIndex(i=>i.id===itemId);
    if(itemId&&index<0){error.textContent='This item no longer exists. Close and reopen this form.';error.hidden=false;return;}
    if(index<0)college.planning[type].push(item);else college.planning[type][index]=item;
    if(persist(next)){globalThis.markFormClean?.(form);dialog.close();announce(model.types[type].singular[0].toUpperCase()+model.types[type].singular.slice(1)+' saved.');}
  });
  function remove(type,college,item){
    const next=structuredClone(colleges),target=next.find(c=>c.id===college.id);target.planning[type]=target.planning[type].filter(i=>i.id!==item.id);
    if(!persist(next))return;
    announce('Removed “'+item.title+'”.');
    $('notice').append(button('Undo',()=>{
      const restored=structuredClone(colleges),c=restored.find(c=>c.id===college.id);
      if(!c){announce('The college no longer exists. Restore it from a backup to recover its items.');return;}
      c.planning=model.clean(c.planning);if(!c.planning[type].some(i=>i.id===item.id))c.planning[type].push(item);
      if(persist(restored))announce('Item restored.');
    },'secondary'));
  }
  function empty(list,title,description,action){const box=node('div','empty planning-empty');box.append(node('div','empty-icon','✧'),node('h3','',title),node('p','',description));if(action)box.append(action);list.append(box);}
  function rowCard({college,type,item},compact=false){
    const card=node('article','card planning-card'),top=node('div','card-top'),text=node('div');
    text.append(node('p','planning-college',college.name+(type==='funding'?' · '+item.kind:'')),node('h2','college-name',item.title));
    top.append(text,node('span','badge',type==='admissions'?'Admission':item.status));card.append(top);
    const meta=node('div','planning-meta');
    if(item.date)meta.append(node('span',item.date<today()&&!model.complete(type==='admissions'?'tasks':type,item.status)?'due':'',dateLabel(item.date)+(item.date<today()?' · Past date':'')));else meta.append(node('span','','No date set'));
    if(type==='recommendations'){if(item.person)meta.append(node('span','','Recommender: '+item.person));if(item.askedOn)meta.append(node('span','','Requested '+dateLabel(item.askedOn)));}
    if(type==='essays'&&item.wordLimit)meta.append(node('span','',item.wordLimit+' words max'));
    if(compact)meta.append(node('span','',model.types[type]?.label||'Admissions'));
    card.append(meta);if(type==='admissions')globalThis.appendDeadlineTrust?.(card,college);
    if(!compact&&item.notes){const details=node('details','planning-notes');details.id='planning-notes-'+college.id+'-'+type+'-'+item.id;details.append(node('summary','',type==='essays'?'Prompt & notes':'Notes'),node('p','',item.notes));card.append(details);}
    const bottom=node('div','planning-actions');
    if(item.url){const link=node('a','planning-link',type==='essays'?'Open draft / source ↗':'Open link ↗');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';bottom.append(link);}
    if(type==='tasks'&&!compact){const label=node('label','task-complete'),check=node('input');check.id='planning-check-'+college.id+'-'+item.id;check.type='checkbox';check.checked=item.status==='Done';check.setAttribute('aria-label','Mark '+item.title+' done');check.addEventListener('change',()=>{const next=structuredClone(colleges);next.find(c=>c.id===college.id).planning.tasks.find(i=>i.id===item.id).status=check.checked?'Done':'Not started';if(!persist(next))check.checked=!check.checked;});label.append(check,node('span','','Done'));bottom.append(label);}
    const editButton=button('Edit',()=>type==='admissions'?edit(college):open(type,college.id,item.id),'secondary');editButton.id='planning-edit-'+(compact?'week-':'tracker-')+college.id+'-'+type+'-'+item.id;editButton.setAttribute('aria-label','Edit '+item.title);bottom.append(editButton);
    if(!compact)bottom.append(button('Remove',()=>remove(type,college,item),'text-btn'));
    card.append(bottom);return card;
  }
  globalThis.renderPlanningViews=records=>{
    const opened=[...root.querySelectorAll('.planning-notes[open]')].map(el=>el.id);
    const rows=model.all(records);
    for(const [type,definition] of Object.entries(model.types)){
      const {college,state,query}=filters[type],previous=college.value;college.replaceChildren(option('','All colleges'),...records.map(c=>option(c.id,c.name)));college.value=records.some(c=>c.id===previous)?previous:'';
      const relevant=rows.filter(r=>r.type===type&&(!college.value||r.college.id===college.value)),done=relevant.filter(r=>model.complete(type,r.item.status)).length;
      lists[type].summary.textContent=relevant.length+' '+(relevant.length===1?definition.singular:(type==='funding'?'funding deadlines':definition.label.toLowerCase()))+' · '+done+' ready / completed';
      const visible=relevant.filter(r=>(state.value==='all'||model.complete(type,r.item.status)===(state.value==='complete'))&&[r.item.title,r.item.notes,r.item.person,r.college.name].join(' ').toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())).sort((a,b)=>(a.item.date||'9999').localeCompare(b.item.date||'9999')||a.item.title.localeCompare(b.item.title));
      if(query.value.trim())lists[type].summary.textContent=visible.length+' matching · '+relevant.length+' total';
      lists[type].list.replaceChildren();
      if(!visible.length)empty(lists[type].list,relevant.length?'Nothing in this view.':'Your '+definition.label.toLowerCase()+' start here.',relevant.length?'Try another search, college or progress filter.':'Add '+(type==='essays'?'an ':'a ')+definition.singular+' and give your next step a little structure.',button('+ Add '+definition.singular,()=>open(type,college.value),'secondary'));
      else for(const row of visible)lists[type].list.append(rowCard(row));
    }
    const undated=rows.filter(r=>!r.item.date&&!model.complete(r.type,r.item.status));
    for(const college of records)if(!college.deadline&&college.status!=='Submitted')undated.push({college,type:'admissions',item:{id:college.id,title:'Application deadline',date:'',status:college.status}});
    const previousUndated=weekList.querySelector('.week-undated')?.open;
    const grouped=model.week(records,today(),c=>deadlineState(c).past);weekList.replaceChildren();weekStats.replaceChildren();
    for(const [label,count] of [['Due in seven days',grouped.upcoming.length],['Overdue',grouped.overdue.length],['Without a date',undated.length]]){const stat=label==='Without a date'&&count?button('',()=>{const details=weekList.querySelector('.week-undated');if(details){details.open=true;details.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});details.querySelector('summary').focus({preventScroll:true});}},'stat-action'):node('div');stat.append(node('span','',label),node('strong','',String(count)));weekStats.append(stat);}
    for(const [title,items] of [['Needs your attention',grouped.overdue],['Coming up',grouped.upcoming]]){if(!items.length)continue;const section=node('section','week-group');section.append(node('h2','',title));for(const row of items)section.append(rowCard(row,true));weekList.append(section);}
    if(!grouped.overdue.length&&!grouped.upcoming.length)empty(weekList,undated.length?'Your next steps need dates.':'A little breathing room.',undated.length?'Review the undated work below to decide what comes next.':'No open items have a date in the next seven days. Add a task whenever you’re ready.',button('Plan a task',()=>{location.hash='tasks';open('tasks');},'secondary'));
    if(undated.length){const details=node('details','week-undated'),summary=node('summary','','Without a date · '+undated.length);details.open=previousUndated??(!grouped.upcoming.length&&!grouped.overdue.length);details.append(summary,node('p','field-help','A date helps put this work in your weekly plan. Leave it blank until you can confirm it.'));for(const row of undated)details.append(rowCard(row,true));weekList.append(details);}
    for(const id of opened){const el=$(id);if(el)el.open=true;}
  };
  globalThis.openCollegePlanning=collegeId=>{location.hash='tasks';filters.tasks.college.value=collegeId;filters.tasks.state.value='open';filters.tasks.query.value='';renderPlanningViews(colleges);};
  // Direct links work because these sections exist before navigation is re-evaluated.
  renderPlanningViews(colleges);showWorkspaceView();
})();
