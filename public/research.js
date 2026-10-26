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
function researchStatus(message,error=false){
  const el=$("research-status");el.hidden=false;el.textContent=message;el.className=error?"research-error":"research-info";
}
function stopLookup(){lookupSequence++;lookupController?.abort();lookupController=null;$("research-run").disabled=false;}
function clearReport(){researchReport=null;$("research-results").hidden=true;$("research-documents").replaceChildren();}
function openResearch(fromEditor=false){
  stopLookup();clearReport();$("research-status").hidden=true;
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
for(const id of ["research-url","research-applicant","research-level"])$(id).addEventListener("input",()=>{stopLookup();clearReport();$("research-status").hidden=true;});
$("university-search").addEventListener("submit",async e=>{
  e.preventDefault();stopLookup();clearReport();const seq=lookupSequence;
  const submit=e.currentTarget.querySelector("button");submit.disabled=true;
  $("university-matches").replaceChildren();researchStatus("Looking for matching universities…");
  lookupController=new AbortController();
  try{
    const response=await fetch(researchEndpoint("/api/universities?q="+encodeURIComponent($("university-query").value.trim())),{signal:lookupController.signal,credentials:"omit"});
    const data=await response.json();if(seq!==lookupSequence)return;if(!response.ok)throw new Error(data.error||"University search is unavailable.");
    for(const university of data.universities||[]){
      const match=button("",()=>{
        stopLookup();clearReport();$("research-url").value=university.url;
        $("university-query").value=university.name;researchStatus("Selected "+university.name+". Confirm the URL and applicant type, then find requirements.");
        $("university-matches").replaceChildren();$("research-run").focus();
      },"university-match");
      match.append(node("strong","",university.name),node("span","",university.url),node("small","",university.description+" · "+university.discovery));
      $("university-matches").append(match);
    }
    researchStatus(data.message||"Select the university you mean. Similar names can refer to different campuses.");
  }catch(error){if(error.name!=="AbortError"&&seq===lookupSequence)researchStatus("University search failed. Paste the official admissions URL instead.",true);}
  finally{submit.disabled=false;}
});
$("research-form").addEventListener("submit",async e=>{
  e.preventDefault();stopLookup();clearReport();const seq=lookupSequence;lookupController=new AbortController();
  $("research-run").disabled=true;
  researchStatus("Reading official admissions pages… This can take about 30 seconds.");
  const timer=setTimeout(()=>lookupController?.abort(),55000);
  try{
    const response=await fetch(researchEndpoint("/api/research"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",signal:lookupController.signal,
      body:JSON.stringify({url:$("research-url").value.trim(),applicant:$("research-applicant").value,level:$("research-level").value})});
    const data=await response.json();if(seq!==lookupSequence)return;if(!response.ok)throw new Error(data.error||"This university could not be inspected.");
    researchReport=data;renderResearch(data);
    researchStatus(data.pages.length?"Read "+data.pages.length+" official pages. Suggestions are ready to review.":"No readable source pages were found. Try a more specific official admissions URL.",!data.pages.length);
  }catch(error){
    if(seq===lookupSequence)researchStatus(error.name==="AbortError"?"The lookup timed out. Try a more specific admissions page.":error.message,true);
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
    const label=node("label","evidence-choice"),input=node("input");input.type="checkbox";input.value=index;input.dataset.researchIndex=index;
    label.append(input,node("strong","",item.label));card.append(label,node("span","evidence-tag",item.qualification));
  }
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
function renderResearch(data){
  $("research-results").hidden=false;
  $("research-coverage").textContent=data.coverage+" Checked "+new Date(data.checkedAt).toLocaleString()+". Profile: "+data.profile.applicant+", "+data.profile.level+".";
  const sources=$("research-sources");sources.replaceChildren();
  const details=node("details");details.append(node("summary","",data.pages.length+" source pages inspected"));
  for(const p of data.pages)details.append(sourceLink(p.url,p.title),node("br"));sources.append(details);
  const docs=$("research-documents");docs.replaceChildren();
  if(!data.documents.length)docs.append(node("p","field-help","No document suggestions were extracted. That does not mean this university requires no documents. Use its official checklist."));
  data.documents.forEach((item,i)=>docs.append(evidenceCard(item,true,i)));
  const other=$("research-other");other.replaceChildren();
  for(const [title,items] of [["Dates and deadlines",data.deadlines],["Fees and waivers",data.fees]]){
    other.append(node("h4","",title));
    if(!items.length)other.append(node("p","field-help","Not confirmed in the pages inspected. Check the official source."));
    for(const item of items)other.append(evidenceCard(item,false));
  }
  const warnings=$("research-warnings");warnings.replaceChildren();
  for(const warning of data.warnings)warnings.append(node("p","field-help","Some pages were not inspected: "+warning));
  $("research-apply").disabled=!data.pages.length;
}
$("research-apply").addEventListener("click",()=>{
  if(!researchReport)return;
  const selected=[...$("research-documents").querySelectorAll("input:checked")].map(input=>researchReport.documents[Number(input.dataset.researchIndex)]);
  const wasEditing=$("editor").open,form=$("college-form");
  // If launched from the list, create a new draft rather than replace any saved college.
  if(!wasEditing){edit();form.elements.name.value=$("university-query").value.trim();form.elements.website.value=$("research-url").value.trim();}
  else if(form.elements.id.value!==researchTargetId){researchStatus("The college form changed. Close research and reopen it for that college.",true);return;}
  const existing=form.elements.documents.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const labels=selected.map(item=>item.label+" — "+item.qualification);
  form.elements.documents.value=[...new Set([...existing,...labels])].join("\n");
  const report=researchReport;
  const reference=["Official-source research · "+report.profile.applicant+" / "+report.profile.level+" · "+new Date(report.checkedAt).toLocaleDateString(),
    ...[...new Set(report.pages.map(p=>p.url))],
    "Review the original source for conditions, entry year and admission round. Suggestions are not a verified checklist."].join("\n");
  const combined=[form.elements.notes.value.trim(),reference].filter(Boolean).join("\n\n");
  if(combined.length<=5000)form.elements.notes.value=combined;
  researchDialog.close();form.elements.documents.focus();
  announce("Research suggestions added to the college form. Review all fields, then save. No deadline or fee was guessed.");
});
