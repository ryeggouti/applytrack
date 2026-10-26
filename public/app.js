const KEY = "applytrack-v1";
const $ = id => document.getElementById(id);
let colleges = [], deleteId = null, storageReady = true;
const statuses = ["Planning", "In progress", "Submitted"];
const rounds = ["Regular decision", "Early action", "Early decision", "Rolling admission", "Other"];
const waivers = ["Not needed", "To request", "Requested", "Approved"];
function announce(message) { $("notice").textContent = message; $("notice").hidden = false; }
function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !isNaN(date) && date.toISOString().slice(0, 10) === value;
}
function validate(data) {
  if (!Array.isArray(data) || data.length > 1000) throw new Error("Choose an ApplyTrack backup with up to 1,000 colleges.");
  const ids = new Set();
  return data.map(c => {
    if (!c || typeof c.name !== "string" || !c.name.trim() || c.name.length > 150 ||
        typeof c.id !== "string" || ids.has(c.id) || !statuses.includes(c.status) ||
        !rounds.includes(c.round) || !waivers.includes(c.waiver) ||
        typeof c.deadline !== "string" || !validDate(c.deadline) ||
        typeof c.notes !== "string" || c.notes.length > 5000 ||
        typeof c.website !== "string" || c.website.length > 500 ||
        !(c.fee === "" || (typeof c.fee === "number" && Number.isFinite(c.fee) && c.fee >= 0 && c.fee <= 100000)) ||
        !Array.isArray(c.documents) || c.documents.length > 200 ||
        c.documents.some(d => !d || typeof d.name !== "string" || !d.name.trim() || d.name.length > 300 || typeof d.done !== "boolean")) {
      throw new Error("This backup contains invalid college details. Your current list has not changed.");
    }
    if (c.website && !safeWebsite(c.website)) throw new Error("College websites must use https:// or http://.");
    ids.add(c.id);
    return {id:c.id,name:c.name.trim(),status:c.status,round:c.round,waiver:c.waiver,deadline:c.deadline,notes:c.notes,website:c.website,fee:c.fee,documents:c.documents.map(d=>({name:d.name,done:d.done}))};
  });
}
function safeWebsite(value) { try { return ["https:","http:"].includes(new URL(value).protocol); } catch { return false; } }
function save(next) { colleges=next; return true; }
function node(tag,cls,text) { const n=document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; }
function today() { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); }
function dateLabel(value) { return new Date(value+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function button(text,fn,cls="text-btn") { const b=node("button",cls,text);b.type="button";b.addEventListener("click",fn);return b; }
function render() {
  $("total").textContent=colleges.length;
  $("count").textContent=colleges.length;
  $("submitted").textContent=colleges.filter(c=>c.status==="Submitted").length;
  const documents=colleges.flatMap(c=>c.documents);
  $("docs").textContent=documents.filter(d=>d.done).length+" / "+documents.length;
  const upcoming=colleges.filter(c=>c.status!=="Submitted"&&c.deadline>=today()).sort((a,b)=>a.deadline.localeCompare(b.deadline));
  $("next").textContent=upcoming.length?dateLabel(upcoming[0].deadline):"—";
  const visible=colleges;
  const list=$("list");list.replaceChildren();
  if(!visible.length) {
    const empty=node("div","empty");
    empty.append(node("div","empty-icon","↗"),node("h3","",colleges.length?"No colleges match your search":"Your future has a starting point."));
    empty.append(node("p","",colleges.length?"Try another name or status to find your application.":"Add your first college and turn a big goal into a few clear next steps."));
    empty.append(button(colleges.length?"Clear filters":"Add your first college",()=>{if(colleges.length){$("search").value="";$("filter").value="";render();}else edit();},"primary"));
    if(!colleges.length)empty.append(node("small","","Any college. Any country. Your list."));
    list.append(empty);return;
  }
  for(const c of visible) {
    const card=node("article","card"),top=node("div","card-top"),title=node("div");
    title.append(node("div","college-name",c.name),node("div","round",c.round));
    top.append(title,node("span","badge"+(c.status==="Submitted"?" submitted":""),c.status));card.append(top);
    const meta=node("div","meta");
    meta.append(node("span",c.deadline&&c.deadline<today()&&c.status!=="Submitted"?"due":"",c.deadline?(c.deadline<today()&&c.status!=="Submitted"?"Past deadline · ":"Due · ")+dateLabel(c.deadline):"No deadline set"));
    card.append(meta);
    const ready=c.documents.filter(d=>d.done).length,ph=node("div","progress-head");
    ph.append(node("span","","Document checklist"),node("span","",ready+" of "+c.documents.length+" ready"));card.append(ph);
    const track=node("div","track"),fill=node("span");fill.style.width=(c.documents.length?ready/c.documents.length*100:0)+"%";track.append(fill);card.append(track);
    const checks=node("div","documents");
    c.documents.forEach((d,i)=>{
      const label=node("label","document"),input=node("input");input.type="checkbox";input.checked=d.done;
      input.addEventListener("change",()=>{const next=structuredClone(colleges);next.find(x=>x.id===c.id).documents[i].done=input.checked;if(save(next))render();else input.checked=!input.checked;});
      label.append(input,node("span","",d.name));checks.append(label);
    });
    if(!c.documents.length)checks.append(node("span","round","No documents added yet. Edit this college to add its requirements."));
    card.append(checks);if(c.notes)card.append(node("div","notes",c.notes));
    const bottom=node("div","card-bottom"),site=node("span");
    if(c.website){const a=node("a","","Official website ↗");a.href=c.website;a.target="_blank";a.rel="noopener noreferrer";site.append(a);}
    const actions=node("div","actions");actions.append(button("Edit",()=>edit(c)));
    bottom.append(site,actions);card.append(bottom);list.append(card);
  }
}
function edit(c) {
  const form=$("college-form");form.reset();
  $("dialog-title").textContent=c?"Edit college":"Add a college";
  for(const name of ["id","name","website","deadline","fee","round","waiver","status","notes"]) if(c)form.elements[name].value=c[name];
  form.elements.id.value=c?.id||"";
  form.elements.documents.value=c?c.documents.map(d=>d.name).join("\n"):"";
  $("editor").showModal();form.elements.name.focus();
}
$("add").addEventListener("click",()=>edit());
document.querySelectorAll(".close").forEach(b=>b.addEventListener("click",()=>$("editor").close()));
$("college-form").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget),id=f.get("id")||crypto.randomUUID(),old=colleges.find(c=>c.id===id);
  const names=f.get("documents").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const available=old?old.documents.slice():[];
  const documents=names.map(name=>{const i=available.findIndex(d=>d.name===name),prior=i>=0?available.splice(i,1)[0]:null;return{name,done:prior?.done||false};});
  const c={id,name:f.get("name").trim(),website:f.get("website").trim(),deadline:f.get("deadline"),fee:f.get("fee")===""?"":Number(f.get("fee")),round:f.get("round"),waiver:f.get("waiver"),status:f.get("status"),notes:f.get("notes").trim(),documents};
  try {validate([c]);const next=old?colleges.map(x=>x.id===id?c:x):[...colleges,c];if(save(next)){$("editor").close();render();}}catch(error){announce(error.message);}
});
render();
