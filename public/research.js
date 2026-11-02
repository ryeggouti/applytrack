// Research never writes the college list; it only fills an editable form for review.
let researchReport=null,researchTargetId=null,lookupController=null,lookupSequence=0;
const researchDialog=$("research-dialog");
const researchBase=(window.APPLYTRACK_HOSTING?.apiBase||"").replace(/\/$/,"");
const researchEndpoint=path=>researchBase+path;
const researchLaunch=button("✦ Research a university",()=>openResearch(),"secondary");
researchLaunch.id="research-launch";
const headingActions=node("div","heading-actions");
$("add").before(headingActions);headingActions.append(researchLaunch,$("add"));
const editLaunch=button("✦ Find requirements for this college",()=>openResearch(true),"secondary");
editLaunch.id="research-editor-launch";
$("college-form").querySelector(".form-intro").after(editLaunch);
const refreshLaunch=button('Check sources again',()=>openResearch(true),'text-btn');refreshLaunch.id='research-refresh';editLaunch.after(refreshLaunch);
globalThis.syncResearchButton=()=>{
  const found=$("college-form").dataset.researched==='true';
  editLaunch.disabled=found;refreshLaunch.hidden=!found;
  editLaunch.textContent=found?'✓ Requirements already found':'✦ Find requirements for this college';
  editLaunch.title=found?'Research has already been added to this college. You can edit its details below.':'';
};
syncResearchButton();
function researchStatus(message,error=false){
  const el=$("research-status");el.hidden=false;el.textContent=message;el.className=error?"research-error":"research-info";
  $("research-fallback").hidden=true;
}
function researchUnavailable(){
  $("research-status").hidden=true;$("research-fallback").hidden=false;$("research-fallback").scrollIntoView({block:"nearest"});$("research-manual").focus();
}
const serviceDown=(error,response)=>error instanceof TypeError||(response&&response.status>=500);
$("research-manual").addEventListener("click",()=>{
  const name=$("university-query").value.trim(),url=$("research-url").value.trim(),fromEditor=$("editor").open;
  researchDialog.close();
  if(!fromEditor){edit();const form=$("college-form");form.elements.name.value=name;if(safeWebsite(url))form.elements.website.value=url;}
});
function updateResearchMethod(){
  const pasted=$('research-method').value==='paste';$('research-paste-fields').hidden=!pasted;$('research-page-text').required=pasted;$('research-page-text').disabled=!pasted;
  $('research-run').textContent=pasted?'Review pasted text ↗':'Find requirements ↗';
  const link=$('research-open-source'),url=$('research-url').value.trim();if(safeWebsite(url))link.href=url;else link.removeAttribute('href');
}
$('research-method').addEventListener('change',()=>{stopLookup();clearReport();updateResearchMethod();});
$('research-url').addEventListener('input',updateResearchMethod);
function stopLookup(){lookupSequence++;lookupController?.abort();lookupController=null;$("research-run").disabled=false;}
function clearReport(){researchReport=null;$("research-results").hidden=true;$("research-documents").replaceChildren();}
function openResearch(fromEditor=false){
  stopLookup();clearReport();$("research-method").value="fetch";$("research-page-text").value="";updateResearchMethod();$("research-status").hidden=true;$("research-fallback").hidden=true;
  globalThis.ApplyTrackProfile?.applyResearchDefaults?.();
  researchTargetId=fromEditor?$("college-form").elements.id.value:null;
  const form=$("college-form");
  $("university-query").value=fromEditor?form.elements.name.value:"";
  $("research-url").value=fromEditor?form.elements.website.value:"";
  $("university-matches").replaceChildren();
  researchDialog.showModal();$("university-query").focus();
}
$("research-close").addEventListener("click",()=>researchDialog.close());
researchDialog.addEventListener("close",stopLookup);
researchDialog.addEventListener("cancel",stopLookup);
for(const id of ["research-url","research-applicant","research-level","research-page-text"])$(id).addEventListener("input",()=>{stopLookup();clearReport();$("research-status").hidden=true;});
$("university-search").addEventListener("submit",async e=>{
  e.preventDefault();stopLookup();clearReport();const seq=lookupSequence;
  const submit=e.currentTarget.querySelector("button");submit.disabled=true;
  $("university-matches").replaceChildren();researchStatus("Looking for matching universities…");
  lookupController=new AbortController();let response=null;
  try{
    response=await fetch(researchEndpoint("/api/universities?q="+encodeURIComponent($("university-query").value.trim())),{signal:lookupController.signal,credentials:"omit"});
    const data=await response.json();if(seq!==lookupSequence)return;if(!response.ok)throw new Error(data.error||"University search is unavailable.");
    for(const university of data.universities||[]){
      const match=button("",()=>{
        stopLookup();clearReport();$("research-url").value=university.url;$("research-method").value="fetch";$("research-page-text").value="";updateResearchMethod();
        $("university-query").value=university.name;researchStatus("Selected "+university.name+". Check the address and your applicant type, then choose Find requirements.");
        $("university-matches").replaceChildren();$("research-run").focus();
      },"university-match");
      match.append(node("strong","",university.name),node("span","",university.url),node("small","",university.description+" · "+university.discovery));
      $("university-matches").append(match);
    }
    researchStatus(data.message||"Pick the university you mean. Similar names can belong to different campuses.");
  }catch(error){
    if(error.name==="AbortError"||seq!==lookupSequence)return;
    if(serviceDown(error,response))researchUnavailable();
    else researchStatus(error.message||"University search failed. Paste the admissions-page address instead.",true);
  }
  finally{submit.disabled=false;}
});
$("research-form").addEventListener("submit",async e=>{
  e.preventDefault();stopLookup();clearReport();const seq=lookupSequence;lookupController=new AbortController();
  $("research-run").disabled=true;
  const pasted=$('research-method').value==='paste';
  researchStatus(pasted?'Extracting suggestions from your pasted text…':'Reading official admissions pages… This can take about 30 seconds.');
  const timer=setTimeout(()=>lookupController?.abort(),55000);let response=null;
  try{
    response=await fetch(researchEndpoint("/api/research"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",signal:lookupController.signal,
      body:JSON.stringify({url:$("research-url").value.trim(),applicant:$("research-applicant").value,level:$("research-level").value,...(pasted?{text:$("research-page-text").value}:{})})});
    const data=await response.json();if(seq!==lookupSequence)return;if(!response.ok)throw new Error(data.error||"This university could not be inspected.");
    researchReport=data;renderResearch(data);
    researchStatus(data.pages.length?(data.acquisition==='pasted'?'Suggestions extracted from your pasted text. The page was not fetched.':'Read '+data.pages.length+' official pages. Review the suggestions; missing items are not evidence that they are unnecessary.'):(data.warnings[0]||'No readable source pages were found.')+' Choose Paste page text to continue.',!data.pages.length);
    if(!data.pages.length){$('research-method').value='paste';updateResearchMethod();}
    verificationPanel.scrollIntoView({block:'start'});
  }catch(error){
    if(seq!==lookupSequence)return;
    if(error.name!=="AbortError"&&serviceDown(error,response))researchUnavailable();
    else researchStatus(error.name==="AbortError"?"The lookup timed out. Try a more specific admissions page.":error.message,true);
  }finally{clearTimeout(timer);if(seq===lookupSequence)$("research-run").disabled=false;}
});
function sourceLink(url,title){
  const a=node("a","",title||url);
  if(safeWebsite(url)){a.href=url;a.target="_blank";a.rel="noopener noreferrer";}
  return a;
}
function evidenceCard(item,selectable,index){
  const card=node("div","evidence");
  if(selectable){
    const label=node("label","evidence-choice"),input=node("input");input.type="checkbox";input.value=index;input.dataset.researchIndex=index;input.disabled=/^Not offered/.test(item.qualification);input.dataset.researchScope=item.scope||"admission";input.dataset.researchStrength=/^Mentioned|^Mixed/.test(item.qualification)?"uncertain":"supported";
    label.append(input,node("strong","",item.label));card.append(label,node("span","evidence-tag",item.qualification));
  }else if(item.kind==='document')card.append(node('strong','',item.label),node('span','evidence-tag',item.qualification));
  if(item.deadlineType==='application')card.append(node('span','evidence-tag','Application deadline · '+item.round));
  if(item.evidenceType==='reviewed-summary')card.append(node('span','evidence-tag','Dated reference summary — not live verified'));
  if(item.qualification==='Mentioned — verify applicability')card.append(node('p','field-help','Mention only: this excerpt does not establish a requirement.'));
  if(item.scope==='financial-aid')card.append(node("p","field-help","Financial-aid source: these instructions may apply only if you seek aid. They do not establish an admission requirement."));
  if(item.section)card.append(node("small","evidence-section",item.section));
  card.append(node("blockquote","",item.quote),sourceLink(item.url,"Read source ↗"));
  if(item.additionalEvidence?.length){
    const extra=node("details");extra.append(node("summary","","More context from official pages"));
    for(const evidence of item.additionalEvidence){
      extra.append(node("small","evidence-section",evidence.qualification),node("blockquote","",evidence.quote),sourceLink(evidence.url,"Read source ↗"));
    }
    card.append(extra);
  }
  return card;
}
function deadlinePlan(){
  const existing=$('editor').open?$('college-form').elements.deadline.value:'';
  return ApplyTrackResearch.plan(researchReport,$('research-cycle').value,$('research-round').value,{skipDeadline:$('research-skip-deadline').checked,existingDeadline:existing});
}
function previewResearchDeadline(){
  if(!researchReport)return;
  const plan=deadlinePlan();
  $('research-deadline-preview').textContent=plan.message;
  const source=$('research-deadline-source');source.replaceChildren();
  if(plan.match)source.append(sourceLink(plan.match.url,'Official deadline source ↗'));
}
for(const id of ['research-cycle','research-round','research-skip-deadline'])$(id).addEventListener('input',()=>{previewResearchDeadline();if(researchReport)renderResearchVerification(researchReport);});
const verificationPanel=node('section','research-verification');verificationPanel.id='research-verification';$('research-coverage').after(verificationPanel);
function renderResearchVerification(data){
  verificationPanel.replaceChildren();verificationPanel.append(node('h4','','What still needs checking'));
  const extracted=ApplyTrackResearch.extract(data,$('research-cycle').value);
  const missing=[];
  if(extracted.fee===null)missing.push('Application fee: no unambiguous supported amount established.');
  if(!extracted.waiverStatus)missing.push('Fee waiver: availability or eligibility not established.');else missing.push('Fee waiver: your personal eligibility has not been determined.');
  if(!extracted.deadlines.length)missing.push('Admission deadline: not established for a round and year.');
  if(extracted.deadlines.length)missing.push('Only the admission rounds and years shown in the evidence are covered; other rounds remain unverified.');
  if(extracted.conflicts?.length)missing.push('Different application dates extracted: '+extracted.conflicts.join(', ')+'. Review the source excerpts.');
  if(data.acquisition==='reference')missing.unshift('Live verification failed. These are saved reference summaries from '+data.checkedAt+'; current instructions remain unverified.');
  if(data.acquisition==='pasted')missing.unshift('Pasted text has not been authenticated or fetched. Check it against the original page.');
  const list=node('ul');for(const item of missing)list.append(node('li','',item));verificationPanel.append(list);
  if(extracted.conflictEvidence?.length){const detail=node('details');detail.append(node('summary','','Compare unresolved application dates'));for(const conflict of extracted.conflictEvidence){detail.append(node('h4','',conflict.round));for(const option of conflict.options)detail.append(node('p','field-help',(option.date||option.label)+' · '+option.basis),node('blockquote','',option.quote),sourceLink(option.url,'Review original date ↗'));}verificationPanel.append(detail);}
  if(data.alternativeSources?.length)verificationPanel.append(node('p','field-help','Alternative official Amherst sources were checked automatically because the starting page could not be read. Quick Pass covers fee-waiver instructions only. The general Amherst document checklist remains unverified by this live lookup.'));
  if(data.pages.some(p=>p.scope==='questbridge')||data.pathways?.length)verificationPanel.append(node('p','field-help','QuestBridge-only instructions are shown separately below. They do not verify the general application checklist and are excluded from document selection, fee and deadline autofill.'));
  const checks=data.verification||[],notFound=checks.filter(c=>c.status==='not-found'),uncertain=checks.filter(c=>['mention','conflicting'].includes(c.status));
  if(notFound.length)verificationPanel.append(node('p','field-help','Not established in these sources: '+notFound.map(c=>c.topic).join(', ')+'. Missing evidence does not mean these are requirements—or that they are unnecessary.'));
  if(uncertain.length)verificationPanel.append(node('p','field-help','Only mentions or mixed conditions: '+uncertain.map(c=>c.topic).join(', ')+'.'));
  verificationPanel.append(node('p','field-help','Financial-aid applications, major-specific supplements, personal waiver eligibility and your final portal checklist need separate review. This is not a completeness check.'));
  if(checks.length){const detail=node('details');detail.append(node('summary','','Coverage by topic'));const labels={'explicit':'Instruction located','conditional':'Conditions to review','policy':'Policy located','mention':'Mention only','conflicting':'Mixed conditions','not-found':'Not established'};for(const check of checks){const row=node('div','research-coverage-row');row.append(node('strong','',check.topic),node('span','',labels[check.status]||check.status),node('p','field-help',check.detail));if(check.sources[0])row.append(sourceLink(check.sources[0],'Review source ↗'));detail.append(row);}verificationPanel.append(detail);}
  const scan=data.scan;if(scan){
    verificationPanel.append(node('p','field-help','Live scan: '+scan.read+' pages read; '+scan.failures.length+' failed. '+(scan.stopped==='finished'?(scan.read?'This scan has finished; other pages may still contain requirements.':'The starting source could not be read; live requirements remain unverified.'):'Stopped at the '+scan.stopped.replaceAll('-',' ')+'. More pages may contain requirements.')));
    if(scan.failures.length){const failures=node('details');failures.open=!scan.read;failures.append(node('summary','','Pages that could not be checked'));for(const item of scan.failures){const row=node('div','research-coverage-row');row.append(sourceLink(item.url,item.url),node('p','field-help',item.message));failures.append(row);}verificationPanel.append(failures);}
    if(scan.followUp.length){const follow=node('details');follow.append(node('summary','','Official pages still needing review'));for(const item of scan.followUp)follow.append(sourceLink(item.url,item.text||item.url),node('p','field-help',item.reason));verificationPanel.append(follow);}
  }
  if(data.reference){const box=node('div','research-reference');box.append(node('strong','','Amherst: dated official-source guide'),node('p','field-help','The live lookup was incomplete. A saved guide reviewed '+data.reference.checkedAt+' for '+data.reference.referenceCycle+' is available. It contains document summaries only; fee and deadlines are deliberately left unverified.'));
    box.append(button('Review dated Amherst guide',()=>{researchReport={...data.reference,scan:data.scan,pathways:data.pathways};renderResearch(researchReport);researchStatus('Showing a saved Amherst reference, not a successful live lookup. Check current official instructions before saving.');},'secondary'));if(data.pages.length)verificationPanel.append(box);else verificationPanel.prepend(box);
  }
  for(const pathway of data.pathways||[]){
    const separate=node('details','research-reference');separate.append(node('summary','',pathway.label));
    separate.append(node('p','field-help','Fetched from official pages during this lookup. These instructions concern QuestBridge applicants, not the general Common App / Coalition checklist. They are not added to your college form. Check the pathway, cycle and conditions on the original source.'));
    for(const p of pathway.pages)separate.append(sourceLink(p.url,p.title));
    const dates=pathway.deadlines.filter(item=>/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}\b|\b20\d{2}-\d{2}-\d{2}\b/i.test(item.quote));
    for(const [label,items] of [['Document and policy excerpts',pathway.documents],['QuestBridge dates — not general admission deadlines',dates],['QuestBridge fee information',pathway.fees]]){
      if(!items.length)continue;separate.append(node('h4','',label));for(const item of items)separate.append(evidenceCard(item,false));
    }
    verificationPanel.append(separate);
  }
}

function renderResearch(data){
  $("research-results").hidden=false;
  $('research-coverage').textContent=data.coverage+' '+(data.acquisition==='reference'?'Reference reviewed '+data.checkedAt:'Lookup '+new Date(data.checkedAt).toLocaleString())+'. Profile: '+data.profile.applicant+', '+data.profile.level+'.';
  renderResearchVerification(data);
  const sources=$("research-sources");sources.replaceChildren();
  const details=node("details");details.append(node("summary","",data.acquisition==='reference'?"Saved reference sources (not fetched by this lookup)":data.acquisition==='pasted'?"1 pasted source (not fetched)":data.pages.length+" source "+(data.pages.length===1?"page":"pages")+" inspected"));
  for(const p of data.pages)details.append(sourceLink(p.url,(p.scope==='questbridge'?'QuestBridge only: ':'')+p.title),node("br"));sources.append(details);
  const docs=$("research-documents");docs.replaceChildren();
  if(!data.documents.length)docs.append(node("p","field-help","No document suggestions were extracted. That does not mean this university requires no documents. Use its official checklist."));
  let previousGroup='';
  const entries=data.documents.map((item,i)=>({item,i,group:item.scope==='financial-aid'?'Financial aid — separate eligibility review':/^Mentioned|^Mixed/.test(item.qualification)?'Mentions and mixed conditions — investigate':/^Not offered/.test(item.qualification)?'Unavailable or excluded options':'Instructions and policies located'})).sort((a,b)=>['Instructions and policies located','Mentions and mixed conditions — investigate','Financial aid — separate eligibility review','Unavailable or excluded options'].indexOf(a.group)-['Instructions and policies located','Mentions and mixed conditions — investigate','Financial aid — separate eligibility review','Unavailable or excluded options'].indexOf(b.group));
  for(const {item,i,group} of entries){if(group!==previousGroup){docs.append(node('h4','',group));previousGroup=group;}docs.append(evidenceCard(item,true,i));}
  if(data.documents.length){
    const label=node("label","evidence-choice"),selectAll=node("input");
    selectAll.type="checkbox";
    label.append(selectAll,node("strong","","Select admissions instructions and policies"));
    docs.prepend(label);
    const choices=[...docs.querySelectorAll("input[data-research-index]:not(:disabled):not([data-research-scope=financial-aid]):not([data-research-strength=uncertain])")];
    selectAll.disabled=!choices.length;
    selectAll.addEventListener("change",()=>{
      choices.forEach(input=>{input.checked=selectAll.checked;});
      selectAll.indeterminate=false;
    });
    choices.forEach(input=>input.addEventListener("change",()=>{
      const count=choices.filter(input=>input.checked).length;
      selectAll.checked=count===choices.length;
      selectAll.indeterminate=count>0&&count<choices.length;
    }));
  }
  const other=$("research-other");other.replaceChildren();
  for(const [title,items] of [["Dates and deadlines",data.deadlines],["Fees and waivers",data.fees]]){
    other.append(node("h4","",title));
    if(!items.length)other.append(node("p","field-help","Not confirmed in the pages inspected. Check the official source."));
    for(const item of items)other.append(evidenceCard(item,false));
  }
  const warnings=$("research-warnings");warnings.replaceChildren();
  for(const warning of data.warnings)warnings.append(node("p","field-help","Some pages were not inspected: "+warning));
  const extracted=ApplyTrackResearch.extract(data,$('research-cycle').value);
  const choices=$('research-round');choices.replaceChildren();
  const placeholder=node('option','','Choose a round');placeholder.value='';choices.append(placeholder);
  for(const d of extracted.deadlines){const option=node('option','',d.round);option.value=d.round;choices.append(option);}
  const current=$('editor').open?$('college-form').elements.round.value:'Regular decision';
  choices.value=extracted.deadlines.some(d=>d.round===current)?current:'';
  $('research-skip-deadline').checked=false;
  previewResearchDeadline();
  $("research-apply").disabled=!data.pages.length;
}
$("research-apply").addEventListener("click",()=>{
  if(!researchReport)return;
  const selected=[...$("research-documents").querySelectorAll("input[data-research-index]:checked")].map(input=>researchReport.documents[Number(input.dataset.researchIndex)]);
  const wasEditing=$("editor").open,form=$("college-form");
  // Resolve missing round/year before opening or changing the college draft.
  if(wasEditing && form.elements.id.value!==researchTargetId){researchStatus('The college form changed. Close research and reopen it for that college.',true);return;}
  const plan=deadlinePlan();
  if(!plan.ready){
    researchStatus(plan.message,true);
    $(plan.reason==='cycle'?'research-cycle':plan.reason==='round'?'research-round':'research-skip-deadline').focus();
    return;
  }
  // If launched from the list, create a new draft rather than replace any saved college.
  if(!wasEditing){edit();form.elements.name.value=$("university-query").value.trim();form.elements.website.value=$("research-url").value.trim();}
  else if(form.elements.id.value!==researchTargetId){researchStatus("The college form changed. Close research and reopen it for that college.",true);return;}
  const existing=form.elements.documents.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const labels=selected.map(item=>(item.scope==='financial-aid'?'Financial aid: ':'')+item.label+" — "+item.qualification);
  const baseName=value=>value.split(' — ')[0].trim().toLocaleLowerCase();const known=new Set(existing.map(baseName));
  form.elements.documents.value=[...existing,...labels.filter(label=>{const key=baseName(label);if(known.has(key))return false;known.add(key);return true;})].join('\n');
  const report=researchReport,evidence=ApplyTrackResearch.extract(report,$('research-cycle').value);
  const reference=["Official-source research · "+(report.acquisition==='reference'?"Saved reference, not live verified · ":report.acquisition==='pasted'?"Pasted text, not fetched · ":"")+report.profile.applicant+" / "+report.profile.level+" · "+new Date(report.checkedAt).toLocaleDateString(),
    ...[...new Set(report.pages.map(p=>p.url))],
    "Review the original source for conditions, entry year and admission round. Suggestions are not a verified checklist.",
    ...(report.pathways?.length?["QuestBridge-only sources were inspected separately; their requirements, fees and deadlines were not added to this form."]:[]),
    "Still unverified: "+[evidence.fee===null?"application fee":"",!evidence.deadlines.length?"admission deadline / year":"","personal fee-waiver eligibility"].filter(Boolean).join(", "),
    ...(report.verification?.some(c=>["not-found","mention","conflicting"].includes(c.status))?["Not established or unclear: "+report.verification.filter(c=>["not-found","mention","conflicting"].includes(c.status)).map(c=>c.topic).join(", ")]:[]),
    ...(report.scan?.failures.length?["Live pages not checked: "+report.scan.failures.map(f=>f.url).join(", ")]:[])].join("\n");
  const previousNotes=form.elements.notes.value.trim();
  const combined=previousNotes.includes(reference)?previousNotes:[previousNotes,reference].filter(Boolean).join("\n\n");
  let sourceNotesOverflow=combined.length>5000;
  if(!sourceNotesOverflow){
    form.elements.notes.value=combined;
    for(const item of selected){
      const entry='\n\nDocument evidence: '+item.label+' — '+item.quote+' — '+item.url;
      if(form.elements.notes.value.includes(entry.trim()))continue;
      if(form.elements.notes.value.length+entry.length<=5000)form.elements.notes.value+=entry;else sourceNotesOverflow=true;
    }
  }
  if(plan.reason==='dated')form.elements.round.value=$('research-round').value;
  const filled=globalThis.applyResearchAutofill?.(report,$('research-cycle').value,{skipDeadline:plan.reason==='skipped'});
  globalThis.captureDeadlineEvidence?.(report,filled);
  form.dataset.researched='true';syncResearchButton();
  researchDialog.close();form.elements.documents.focus();
  announce("Research added to the editable form. "+(filled?.fee===null?"Fee not established. ":"")+plan.message+" "+(filled?.waiverStatus?"Fee-waiver policy added; review eligibility in notes. ":"")+((filled?.notesOverflow||sourceNotesOverflow)?"Some evidence could not fit in notes; reopen research to review sources. ":"Source evidence is in notes where available; missing details still need review. ")+"Review, then save.");
});
