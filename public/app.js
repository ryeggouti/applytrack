const KEY = "applytrack-v1";
let loadedSnapshot=null;
const BACKUP_KEY = "applytrack-backup-v1";
const $ = id => document.getElementById(id);
let colleges = [], deleteId = null, storageReady = true, pendingImport = null, persistRequested = false;
const expandedCollegeDetails = new Set();
const statuses = ["Planning", "In progress", "Submitted"];
const rounds = ["Regular decision", "Early action", "Early decision", "Early decision I", "Early decision II", "Restrictive early action", "QuestBridge", "Priority", "Rolling admission",
  "UCAS: Oxford, Cambridge & medicine", "UCAS: equal consideration", "OUAC (Ontario)", "Early round", "Main round", "Other"];
const waivers = ["Available — check eligibility", "Review waiver policy", "Unknown", "Not needed", "To request", "Requested", "Approved"];
const currencies = ["USD", "CAD", "GBP", "EUR", "CHF", "AUD", "NZD", "SGD", "HKD", "JPY", "KRW", "CNY", "INR", "AED", "MAD"];
const DAY = 86400000;
function announce(message) {
  const notice=$("notice"),dismiss=button("×",()=>{notice.hidden=true;},"notice-dismiss");
  dismiss.setAttribute("aria-label","Dismiss notification");
  notice.replaceChildren(node("span","",message),dismiss);notice.hidden=false;
}
function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !isNaN(date) && date.toISOString().slice(0, 10) === value;
}
function validZone(zone) {
  if (!zone) return true;
  if (typeof zone !== "string" || zone.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US",{timeZone:zone}); return true; } catch { return false; }
}
function hasSavedResearch(c) {
  return c?.researched===true || /^Official-source research · /m.test(c?.notes||'');
}
function cleanPlanning(value) {
  if(globalThis.ApplyTrackPlanning)return ApplyTrackPlanning.clean(value);
  if(value===undefined)return {};
  throw new Error('Planning could not load. Reload before editing your saved list.');
}
function validate(data) {
  if (!Array.isArray(data) || data.length > 1000) throw new Error("Choose an ApplyTrack backup with up to 1,000 colleges.");
  const ids = new Set();
  return data.map(raw => {
    const c = raw && typeof raw === "object" ? {currency:"USD",deadlineTime:"",deadlineZone:"",...raw} : raw;
    if (!c || typeof c.name !== "string" || !c.name.trim() || c.name.length > 150 ||
        typeof c.id !== "string" || ids.has(c.id) || !statuses.includes(c.status) ||
        !rounds.includes(c.round) || !waivers.includes(c.waiver) ||
        typeof c.deadline !== "string" || !validDate(c.deadline) ||
        typeof c.deadlineTime !== "string" || !(c.deadlineTime === "" || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.deadlineTime)) ||
        !validZone(c.deadlineZone) || !currencies.includes(c.currency) ||
        typeof c.notes !== "string" || c.notes.length > 5000 ||
        typeof c.website !== "string" || c.website.length > 500 ||
        !(c.fee === "" || (typeof c.fee === "number" && Number.isFinite(c.fee) && c.fee >= 0 && c.fee <= 100000)) ||
        !Array.isArray(c.documents) || c.documents.length > 200 ||
        c.documents.some(d => !d || typeof d.name !== "string" || !d.name.trim() || d.name.length > 300 || typeof d.done !== "boolean")) {
      throw new Error("This backup contains invalid college details. Your current list has not changed.");
    }
    if (c.website && !safeWebsite(c.website)) throw new Error("College websites must use https:// or http://.");
    ids.add(c.id);
    return {id:c.id,name:c.name.trim(),status:c.status,round:c.round,waiver:c.waiver,deadline:c.deadline,deadlineTime:c.deadlineTime,deadlineZone:c.deadlineZone||"",
      deadlineReview:globalThis.ApplyTrackTrust?ApplyTrackTrust.clean(c.deadlineReview):c.deadlineReview,planning:cleanPlanning(c.planning),notes:c.notes,website:c.website,fee:c.fee,currency:c.currency,researched:hasSavedResearch(c),documents:c.documents.map(d=>({name:d.name,done:d.done}))};
  });
}
function safeWebsite(value) { try { return ["https:","http:"].includes(new URL(value).protocol); } catch { return false; } }
function zoneOffset(zone, ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:zone,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})
    .formatToParts(new Date(ms)).filter(p=>p.type!=="literal").map(p=>[p.type,+p.value]));
  return Date.UTC(parts.year,parts.month-1,parts.day,parts.hour%24,parts.minute,parts.second) - Math.floor(ms/1000)*1000;
}
function deadlineInstant(c) {
  if (!c.deadline || !c.deadlineTime) return null;
  const [y,m,d] = c.deadline.split("-").map(Number), [h,mi] = c.deadlineTime.split(":").map(Number);
  if (!c.deadlineZone) return new Date(y,m-1,d,h,mi).getTime();
  const guess = Date.UTC(y,m-1,d,h,mi);
  let instant = guess - zoneOffset(c.deadlineZone, guess);
  const second = guess - zoneOffset(c.deadlineZone, instant);
  if (second !== instant) instant = second;
  return instant;
}
function localDay(ms) { const d=new Date(ms);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()); }
function deadlineState(c, now=Date.now()) {
  const instant = deadlineInstant(c);
  if (!c.deadline) return {instant:null,days:null,past:false,label:"",level:""};
  let days, past;
  if (instant === null) {
    // Compare calendar dates only. A selected zone does not establish a cutoff time.
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{...(c.deadlineZone?{timeZone:c.deadlineZone}:{}),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).filter(p=>p.type!=='literal').map(p=>[p.type,+p.value]));
    days = Math.round((Date.parse(c.deadline+'T00:00:00Z')-Date.UTC(parts.year,parts.month-1,parts.day))/DAY);
    past = days < 0;
  } else {
    past = instant < now;
    days = Math.round((localDay(instant)-localDay(now))/DAY);
  }
  let label = "";
  if (past) label = "Past deadline";
  else if (c.deadlineTime && instant-now < 48*3600000) label = "Due in "+Math.max(1,Math.ceil((instant-now)/3600000))+" hours";
  else if (days <= 0) label = "Due today";
  else if (days === 1) label = "Due tomorrow";
  else if (days < 14) label = "In "+days+" days";
  else if (days < 63) label = "In "+Math.floor(days/7)+" weeks";
  const level = past || c.status === "Submitted" ? "" : days <= 3 ? "urgent" : days <= 14 ? "soon" : "";
  return {instant,days,past,label,level};
}
function timeLabel(c) {
  if (!c.deadline || !c.deadlineTime) return "";
  const instant = deadlineInstant(c), options = {hour:"numeric",minute:"2-digit"};
  if (!c.deadlineZone) return new Date(instant).toLocaleTimeString(undefined,options);
  const there = new Date(instant).toLocaleTimeString(undefined,{...options,timeZone:c.deadlineZone,timeZoneName:"short"});
  const sameOffset = zoneOffset(c.deadlineZone,instant) === -new Date(instant).getTimezoneOffset()*60000;
  if (sameOffset) return there;
  const mine = new Date(instant).toLocaleString(undefined,{month:"short",day:"numeric",...options});
  return there+" ("+mine+" your time)";
}
function compareByDeadline(a,b) {
  const rank = c => c.status === "Submitted" ? 3 : !c.deadline ? 1 : deadlineState(c).past ? 2 : 0;
  const order = c => deadlineInstant(c) ?? (c.deadline ? Date.parse(c.deadline+'T12:00:00Z') : Infinity);
  return rank(a)-rank(b) || order(a)-order(b) || a.name.localeCompare(b.name);
}
function upcomingDeadlines(records) {
  return records.filter(c=>c.status!=="Submitted"&&c.deadline&&!deadlineState(c).past).sort(compareByDeadline);
}
try {
  const saved = localStorage.getItem(KEY);loadedSnapshot=saved;
  if (saved) colleges = validate(JSON.parse(saved));
} catch {
  storageReady = false;
  announce("Saved data could not be read. Export a backup before making changes. Your existing storage has not been overwritten.");
}
function backupState() { try { return JSON.parse(localStorage.getItem(BACKUP_KEY)) || {}; } catch { return {}; } }
function updateBackupState(patch) { try { localStorage.setItem(BACKUP_KEY,JSON.stringify({...backupState(),...patch})); } catch {} }
function requestPersistence() {
  if (persistRequested || !navigator.storage?.persist) return;
  persistRequested = true;
  navigator.storage.persisted().then(already=>already||navigator.storage.persist()).catch(()=>{});
}
function save(next) {
  if (!storageReady) { announce("Storage is unavailable or contains unreadable data. Export your current list before trying another browser."); return false; }
  try {
    if(localStorage.getItem(KEY)!==loadedSnapshot){const message='Another tab changed your list. Keep a copy of any unsaved details, then close this form to load the latest list.';announce(message);globalThis.showSaveProblem?.(message);return false;}
    const serialized=JSON.stringify(next);localStorage.setItem(KEY,serialized);loadedSnapshot=serialized;colleges = next;
    const now = new Date().toISOString();
    updateBackupState({lastChange:now,firstChange:backupState().firstChange||now});
    if (next.length) requestPersistence();
    return true;
  }
  catch { announce("Your browser could not save this change. Your list was not changed. Export a backup and check available storage."); return false; }
}
function daysAgo(iso) { return iso ? Math.floor((localDay(Date.now())-localDay(Date.parse(iso)))/DAY) : null; }
function agoLabel(days) { return days===0?"today":days===1?"yesterday":days+" days ago"; }
function renderBackupStatus() {
  const state = backupState(), sinceExport = daysAgo(state.lastExport);
  $("backup-status").textContent = !colleges.length ? "No account needed." : state.lastExport ? "Last backup "+agoLabel(sinceExport)+"." : "Not backed up yet.";
  const changedSinceExport = state.lastChange && (!state.lastExport || state.lastChange > state.lastExport);
  const dismissedRecently = state.dismissedAt && daysAgo(state.dismissedAt) < 3;
  const due = state.lastExport ? sinceExport >= 7 : (colleges.length >= 3 || daysAgo(state.firstChange) >= 2);
  const show = colleges.length > 0 && storageReady && changedSinceExport && due && !dismissedRecently;
  $("backup-nudge").hidden = !show;
  if (show) $("backup-nudge-text").textContent = state.lastExport
    ? "Your last backup was "+agoLabel(sinceExport)+". Your list lives only in this browser, so export a fresh copy now and then."
    : "Your list lives only in this browser. Export a backup so you don’t lose it if browser data is cleared.";
}
function exportBackup() {
  const blob=new Blob([JSON.stringify({format:"ApplyTrack",version:5,colleges},null,2)],{type:"application/json"});
  const a=node("a");const url=URL.createObjectURL(blob);a.href=url;a.download="applytrack-"+today()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  updateBackupState({lastExport:new Date().toISOString()});renderBackupStatus();
}
function node(tag,cls,text) { const n=document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; }
function today() { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); }
function dateLabel(value) { return new Date(value+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function feeLabel(c) {
  if (c.fee === "") return "Fee not entered";
  if (c.fee === 0) return "No application fee";
  try { return new Intl.NumberFormat(undefined,{style:"currency",currency:c.currency||"USD"}).format(c.fee)+" application fee"; }
  catch { return c.fee+" "+c.currency+" application fee"; }
}
function button(text,fn,cls="text-btn") { const b=node("button",cls,text);b.type="button";b.addEventListener("click",fn);return b; }
function urgencyChip(state) {
  if (!state.label) return null;
  return node("span","deadline-chip"+(state.past?" past":state.level?" "+state.level:""),state.label);
}
function documentCaption(name) {
  const match=name.match(/^(.+?) — (Required in source — verify scope|Mentioned — verify applicability)$/);
  if(!match)return node('span','',name);
  const wrap=node('span','document-caption'),details=node('details','document-context');
  details.append(node('summary','','Requirement details'),node('span','',match[2]));
  wrap.append(node('span','',match[1]),details);return wrap;
}
function render() {
  globalThis.renderWorkspaceViews?.(colleges);
  globalThis.renderPlanningViews?.(colleges);
  globalThis.renderRecovery?.();
  renderBackupStatus();
  $("total").textContent=colleges.length;
  $("count").textContent=colleges.length;
  $("submitted").textContent=colleges.filter(c=>c.status==="Submitted").length;
  const documents=colleges.flatMap(c=>c.documents);
  $("docs").textContent=documents.filter(d=>d.done).length+" / "+documents.length;
  const next=upcomingDeadlines(colleges)[0];
  $("next").textContent=next?dateLabel(next.deadline):"—";
  const nextState=next?deadlineState(next):null;
  $("next-relative").textContent=next?(nextState.label?nextState.label+" · ":"")+next.name:"";
  $("next-relative").className="stat-note"+(nextState?.level?" "+nextState.level:"");
  const query=$("search").value.toLocaleLowerCase().trim(), filter=$("filter").value;
  const visible=colleges.filter(c=>c.name.toLocaleLowerCase().includes(query)&&(!filter||c.status===filter))
    .sort($("sort").value==="name"?(a,b)=>a.name.localeCompare(b.name):compareByDeadline);
  const list=$("list");list.replaceChildren();
  if(!visible.length) {
    const empty=node("div","empty");
    empty.append(node("div","empty-icon","↗"),node("h3","",colleges.length?"No colleges match your search":"No colleges yet"));
    empty.append(node("p","",colleges.length?"Try another name or status.":"Add your first college by hand, or research one to pull in its requirements."));
    empty.append(button(colleges.length?"Clear filters":"Add your first college",()=>{if(colleges.length){$("search").value="";$("filter").value="";render();}else edit();},"primary"));
    list.append(empty);return;
  }
  for(const c of visible) {
    const state=deadlineState(c),overdue=state.past&&c.status!=="Submitted";
    const card=node("article","card"+(state.level==="urgent"?" card-urgent":"")),top=node("div","card-top"),title=node("div");
    title.append(node("div","college-name",c.name),node("div","round",c.round));
    top.append(title,node("span","badge"+(c.status==="Submitted"?" submitted":""),c.status));card.append(top);
    const meta=node("div","meta"),due=node("span",overdue?"due":"");
    if(c.deadline){
      due.append((overdue?"Was due ":"Due ")+dateLabel(c.deadline));
      const time=timeLabel(c);if(time)due.append(node("span","deadline-time"," · "+time));
      const chip=c.status==="Submitted"?null:urgencyChip(state);if(chip)due.append(" ",chip);
    } else due.textContent="No deadline set";
    meta.append(due);
    meta.append(node("span","",feeLabel(c)));
    if(c.waiver!=="Not needed"&&c.fee!==0)meta.append(node("span","","Waiver · "+c.waiver));
    card.append(meta);
    globalThis.appendDeadlineTrust?.(card,c);
    const ready=c.documents.filter(d=>d.done).length,ph=node("div","progress-head");
    ph.append(node("span","","Document checklist"),node("span","",ready+" of "+c.documents.length+" ready"));card.append(ph);
    const track=node("div","track"),fill=node("span");fill.style.width=(c.documents.length?ready/c.documents.length*100:0)+"%";track.append(fill);card.append(track);
    const checks=node("div","documents");
    c.documents.forEach((d,i)=>{
      const label=node("label","document"),input=node("input");input.type="checkbox";input.checked=d.done;input.id='application-doc-'+c.id+'-'+i;
      input.addEventListener("change",()=>{const next=structuredClone(colleges);next.find(x=>x.id===c.id).documents[i].done=input.checked;if(save(next))render();else input.checked=!input.checked;});
      label.append(input,documentCaption(d.name));checks.append(label);
    });
    if(!c.documents.length)checks.append(node("span","round","No documents added yet. Edit this college to add its requirements."));
    card.append(checks);
    if(c.notes){
      const details=node("details","college-details"),summary=node("summary","","Details & sources"),notes=node("div","notes",c.notes);
      notes.tabIndex=0;notes.setAttribute("aria-label","Notes and research sources for "+c.name);
      details.open=expandedCollegeDetails.has(c.id);
      details.append(summary,notes);
      details.addEventListener("toggle",()=>{if(details.isConnected){if(details.open)expandedCollegeDetails.add(c.id);else expandedCollegeDetails.delete(c.id);}});
      card.append(details);
    }
    const bottom=node("div","card-bottom"),site=node("span");
    if(c.website){const a=node("a","","Official website ↗");a.href=c.website;a.target="_blank";a.rel="noopener noreferrer";site.append(a);}
    const actions=node("div","actions");
    const editButton=button("Edit",()=>edit(c)),removeButton=button("Remove",()=>{deleteId=c.id;$("confirm").showModal();});
    editButton.setAttribute("aria-label","Edit "+c.name);removeButton.setAttribute("aria-label","Remove "+c.name);
    const planButton=button('Plan work',()=>globalThis.openCollegePlanning?.(c.id));planButton.setAttribute('aria-label','Plan work for '+c.name);
    actions.append(planButton,editButton,removeButton);
    bottom.append(site,actions);card.append(bottom);list.append(card);
  }
}
function edit(c) {
  const form=$("college-form");form.reset();
  form.dataset.researched=String(hasSavedResearch(c));
  globalThis.syncResearchButton?.();
  $("dialog-title").textContent=c?"Edit college":"Add a college";
  for(const name of ["id","name","website","deadline","deadlineTime","deadlineZone","fee","currency","round","waiver","status","notes"]) if(c)form.elements[name].value=c[name]??"";
  form.elements.id.value=c?.id||"";
  if(!c)form.elements.currency.value="USD";
  form.elements.documents.value=c?c.documents.map(d=>d.name).join("\n"):"";
  globalThis.loadDeadlineReview?.(c);globalThis.markFormClean?.(form);
  $('editor').showModal();form.elements.name.focus();
}
$("add").addEventListener("click",()=>edit());
document.querySelectorAll("#editor .close").forEach(b=>b.addEventListener("click",()=>$("editor").close()));
for(const id of ["search","filter","sort"])$(id).addEventListener("input",render);
$("college-form").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget),id=f.get("id")||crypto.randomUUID(),old=colleges.find(c=>c.id===id);
  const names=f.get("documents").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const available=old?old.documents.slice():[];
  const documents=names.map(name=>{const i=available.findIndex(d=>d.name===name),prior=i>=0?available.splice(i,1)[0]:null;return{name,done:prior?.done||false};});
  const c={id,deadlineReview:globalThis.readDeadlineReview?.()??old?.deadlineReview,planning:old?.planning,name:f.get("name").trim(),website:f.get("website").trim(),deadline:f.get("deadline"),deadlineTime:f.get("deadlineTime")||"",deadlineZone:f.get("deadlineZone")||"",
    fee:f.get("fee")===""?"":Number(f.get("fee")),currency:f.get("currency")||"USD",researched:e.currentTarget.dataset.researched==='true',round:f.get("round"),waiver:f.get("waiver"),status:f.get("status"),notes:f.get("notes").trim(),documents};
  try {const [clean]=validate([c]);const next=old?colleges.map(x=>x.id===id?clean:x):[...colleges,clean];if(save(next)){globalThis.markFormClean?.(e.currentTarget);$('editor').close();render();}else globalThis.formError?.(e.currentTarget,$('notice').querySelector('span')?.textContent||'This change could not be saved.');}catch(error){announce(error.message);globalThis.formError?.(e.currentTarget,error.message);}
});
$("cancel-delete").addEventListener("click",()=>$("confirm").close());
$('confirm-delete').addEventListener('click',()=>{const removed=colleges.find(c=>c.id===deleteId);if(!removed||!globalThis.prepareCollegeRecovery?.(removed))return;if(save(colleges.filter(c=>c.id!==deleteId))){$('confirm').close();render();announce('College moved to Recovery in About.');}});
$("export").addEventListener("click",exportBackup);
$("backup-nudge-export").addEventListener("click",exportBackup);
$("backup-nudge-dismiss").addEventListener("click",()=>{updateBackupState({dismissedAt:new Date().toISOString()});renderBackupStatus();});
$("import").addEventListener("click",()=>$("file").click());
function finishImport(next,message){
  if(save(next)){if($("import-dialog").open)$("import-dialog").close();pendingImport=null;render();announce(message);}
}
$("file").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>20000000)throw new Error("Choose a backup smaller than 20 MB.");
    const data=JSON.parse(await file.text());
    if(data.format!=="ApplyTrack"||![1,2,3,4,5].includes(data.version))throw new Error("This doesn’t look like an ApplyTrack backup.");
    const imported=validate(data.colleges);
    if(!colleges.length){finishImport(imported,"Imported "+imported.length+" college"+(imported.length===1?"":"s")+".");return;}
    const existingIds=new Set(colleges.map(c=>c.id)),overlap=imported.filter(c=>existingIds.has(c.id)).length;
    pendingImport=imported;
    $("import-summary").textContent="The backup has "+imported.length+" college"+(imported.length===1?"":"s")+
      (overlap?" ("+overlap+" already on your list)":"")+". You currently have "+colleges.length+".";
    $("import-merge").disabled=imported.length===overlap;
    $("import-dialog").showModal();$("import-replace").focus();
  }catch(error){announce(error instanceof SyntaxError?"This file is not a valid JSON backup. Your list has not changed.":error.message);}
  e.target.value="";
});
$("import-cancel").addEventListener("click",()=>{pendingImport=null;$("import-dialog").close();});
$("import-export-first").addEventListener("click",exportBackup);
$("import-replace").addEventListener("click",()=>{
  if(pendingImport&&globalThis.prepareReplaceRecovery?.())finishImport(pendingImport,"Your list was replaced with the "+pendingImport.length+" colleges from the backup.");
});
$("import-merge").addEventListener("click",()=>{
  if(!pendingImport)return;
  const existingIds=new Set(colleges.map(c=>c.id)),additions=pendingImport.filter(c=>!existingIds.has(c.id));
  if(colleges.length+additions.length>1000){announce("Your combined list cannot exceed 1,000 colleges.");return;}
  finishImport([...colleges,...additions],"Added "+additions.length+" new college"+(additions.length===1?"":"s")+". Colleges already on your list were left as they are.");
});
render();
// Recalculate clock-dependent views without saving or interrupting an open form.
function refreshDeadlineViews() {
  if (document.hidden || document.querySelector('dialog[open]')) return;
  const focused=document.activeElement, focusId=focused?.id;
  // Keep expanded requirement explanations through the refresh, too.
  const openRequirements=[...document.querySelectorAll('.document-context[open]')].map(el=>el.closest('label')?.querySelector('input')?.id).filter(Boolean);
  render();
  for(const id of openRequirements){const details=$(id)?.closest('label')?.querySelector('.document-context');if(details)details.open=true;}
  if(focusId && focused!==document.activeElement)$(focusId)?.focus({preventScroll:true});
}
setInterval(refreshDeadlineViews,60000);
window.addEventListener('focus',refreshDeadlineViews);
document.addEventListener('visibilitychange',refreshDeadlineViews);
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',refreshDeadlineViews));
