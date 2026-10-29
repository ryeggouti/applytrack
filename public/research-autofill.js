/* Evidence-only extraction. No clock-based year inference, storage writes or network calls. */
(() => {
  'use strict';
  const unique = values => [...new Set(values)];
  const monthNames = 'January February March April May June July August September October November December'.split(' ');
  const roundPatterns = [
    ['Early decision II', /\b(?:early decision\s*(?:II|2)|ED\s*2)\b/gi],
    ['Early decision I', /\b(?:early decision\s*(?:I|1)|ED\s*1)\b/gi],
    ['Restrictive early action', /\b(?:restrictive early action|single.choice early action|SCEA|REA)\b/gi],
    ['Early action', /\bearly action\b/gi],
    ['Early decision', /\bearly decision\b/gi],
    ['Regular decision', /\bregular (?:decision|action)\b/gi],
    ['QuestBridge', /\bQuestBridge(?: National College Match)?\b/gi],
    ['Rolling admission', /\brolling admissions?\b/gi],
    ['Priority', /\bpriority\b/gi]
  ];
  function roundMentions(text) {
    const found = [];
    for (const [round, pattern] of roundPatterns) {
      for (const m of text.matchAll(pattern)) {
        if (!found.some(x => m.index >= x.index && m.index < x.end)) found.push({round,index:m.index,end:m.index+m[0].length});
      }
    }
    return found.sort((a,b)=>a.index-b.index);
  }
  function dates(text, cycle) {
    const pattern = /\b(20\d{2})-(\d{2})-(\d{2})\b|\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b|\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(20\d{2}))?\b/gi;
    return [...text.matchAll(pattern)].flatMap(m => {
      const month = m[2] ? +m[2] : monthNames.findIndex(x=>x.slice(0,3).toLowerCase()===(m[4]||m[8]).slice(0,3).toLowerCase())+1;
      const day = +(m[3]||m[5]||m[7]);
      const explicitYear = m[1]||m[6]||m[9];
      const year = explicitYear ? +explicitYear : cycle ? +cycle+(month<7?1:0) : null;
      const iso = year ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
      const check = new Date(`${year||2000}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T12:00:00Z`);
      if (isNaN(check)||check.getUTCMonth()+1!==month||check.getUTCDate()!==day) return [];
      return [{index:m.index,end:m.index+m[0].length,month,day,date:iso,label:m[0],basis:explicitYear?'Source year':cycle?`User-selected July ${cycle}–June ${+cycle+1} cycle`:'Year not established'}];
    });
  }
  function extract(report, cycle='') {
    if (!/^20\d{2}$/.test(String(cycle))) cycle='';
    const urls = new Set((report.pages||[]).map(p=>p.url));
    const sourced = item => urls.has(item.url) && /^https:\/\//.test(item.url);
    const candidates=[];
    for (const item of (report.deadlines||[]).filter(sourced)) {
      // Separate sentences and semicolon-delimited clauses before pairing rounds and dates.
      for (const clause of item.quote.split(/;|\n|\s+and\s+(?=(?:admission )?decisions|receive notification|hear from)|(?<=[.!?])\s+(?=[A-Z])/i)) {
        if (/financial aid|test(?:ing)?|scores|notification|decisions? (?:are |will be )?released|reply|enrollment|deposit/i.test(clause)) continue;
        if (!/deadline|due|apply by|applications? (?:must|should|are to) be (?:submitted|received)/i.test(clause+' '+item.section)) continue;
        if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\s*(?:[-–—]|to)\s*\d{1,2}/i.test(clause)) continue;
        const mentions=roundMentions(clause);
        let ds=dates(clause,cycle);
        // Harvard and many other sites put the date in the heading above the round.
        // Use a date-only heading; never mix arbitrary heading dates into a quote.
        if(!ds.length && unique(mentions.map(r=>r.round)).length===1){
          const headingDates=dates(item.section||'',cycle);
          if(headingDates.length===1 && (item.section||'').trim()===headingDates[0].label) ds=headingDates;
        }
        if (mentions.length===0) {
          const rs=unique(roundMentions(item.section||'').map(x=>x.round));
          if(rs.length===1&&ds.length===1)candidates.push({...ds[0],round:rs[0],url:item.url,quote:item.quote});
        } else if(ds.length===1&&unique(mentions.map(x=>x.round)).length===1) {
          candidates.push({...ds[0],round:mentions[0].round,url:item.url,quote:item.quote});
        } else if(mentions.length>1 && ds[0]?.index < mentions[0].index) {
          mentions.forEach((r,i)=>{
            const local=ds.filter(d=>d.index>=(mentions[i-1]?.end??0)&&d.end<=r.index&&/^\s*for\s*$/i.test(clause.slice(d.end,r.index)));
            if(local.length===1)candidates.push({...local[0],round:r.round,url:item.url,quote:item.quote});
          });
        } else if(mentions.length>1) {
          // Each round must have exactly one date in its own following clause.
          mentions.forEach((r,i)=>{
            const local=ds.filter(d=>d.index>=r.end&&d.index<(mentions[i+1]?.index??Infinity));
            if(local.length===1)candidates.push({...local[0],round:r.round,url:item.url,quote:item.quote});
          });
        }
      }
    }
    const deadlines=[],conflicts=[];
    for(const round of unique(candidates.map(x=>x.round))) {
      const values=candidates.filter(x=>x.round===round);
      if(unique(values.map(x=>x.date||x.month+'-'+x.day)).length===1)deadlines.push(values[0]);
      else conflicts.push(round);
    }
    const amounts=[],feeEvidence=[],waiverEvidence=[];
    for(const item of (report.fees||[]).filter(sourced)) {
      const text=item.quote,context=(item.section||'')+' '+text;
      const host=new URL(item.url).hostname;
      const usd=/\.edu$/.test(host)||host==='mitadmissions.org'||/\bUSD\b|US dollars|U\.S\. dollars/i.test(context);
      if(/fee waiver|waiv(?:e|er|ing).{0,40}fee/i.test(context))waiverEvidence.push(item);
      if(!usd||/tuition|deposit|international.{0,40}\$|domestic.{0,40}\$|\b(?:CAD|AUD|NZD|HKD|SGD)\b/i.test(context))continue;
      const before= /\$\s*(\d{1,3}(?:\.\d{2})?)\s*(?:non.refundable\s+)?(?:application\s+)?fee\b/gi;
      const after= /application fee\s*(?:of|is|:|costs)?\s*\$\s*(\d{1,3}(?:\.\d{2})?)(?![\d,.])/gi;
      const matches=[...text.matchAll(before),...text.matchAll(after)];
      if(!matches.length&&/application fee/i.test(item.section||''))matches.push(...text.matchAll(/\$\s*(\d{1,3}(?:\.\d{2})?)(?![\d,.])/g));
      for(const m of matches){amounts.push(+m[1]);feeEvidence.push(item);}
      if(!/\bif\b|\bfor\b|unless|eligible|qualif|waiv/i.test(text)&&/\bno application fee\b|application fee (?:is )?(?:not required|zero)/i.test(text)){amounts.push(0);feeEvidence.push(item);}
    }
    // Availability is conditional evidence, never a determination of personal eligibility.
    return {deadlines,conflicts,fee:unique(amounts).length===1?amounts[0]:null,feeEvidence,waiverEvidence};
  }
  function plan(report,cycle,round,{skipDeadline=false,existingDeadline=''}={}) {
    const result=extract(report,cycle);
    const match=result.deadlines.find(d=>d.round===round);
    if(existingDeadline)return {ready:true,reason:'preserved',message:'Your existing deadline will be kept.',result,match};
    if(skipDeadline)return {ready:true,reason:'skipped',message:'Deadline will be left for you to enter.',result,match};
    if(!result.deadlines.length)return {ready:false,reason:'unknown',message:result.conflicts.length?'Official dates conflict. Review the sources or choose to continue without a deadline.':'No application deadline was established. Try a specific official deadline page, or choose to continue without a deadline.',result};
    if(!match)return {ready:false,reason:'round',message:'Choose one of the admission rounds found on the official pages.',result};
    if(!match.date)return {ready:false,reason:'cycle',message:match.round+': '+match.label+'. The source omits the year. Enter your application-cycle start year to complete the date.',result,match};
    return {ready:true,reason:'dated',message:match.round+': '+match.date+' will fill the college form.',result,match};
  }
  globalThis.ApplyTrackResearch={extract,plan};
  if(typeof document==='undefined')return;
  const form=document.getElementById('college-form');
  let active=null,generated='';
  form.addEventListener('reset',()=>{active=null;generated='';});
  form.elements.deadline.addEventListener('input',()=>{generated='';active=null;});
  function fillDeadline(){
    if(!active)return;
    const round=form.elements.round.value;
    const match=active.deadlines.find(d=>d.round===round) || active.deadlines.find(d=>(round==='Early action'&&d.round==='Restrictive early action')||(round==='Early decision'&&d.round==='Early decision I'));
    if(!form.elements.deadline.value||form.elements.deadline.value===generated){
      form.elements.deadline.value=match?.date||'';generated=form.elements.deadline.value;
    }
  }
  form.elements.round.addEventListener('change',fillDeadline);
  globalThis.applyResearchAutofill=(report,cycle,{skipDeadline=false}={})=>{
    const result=extract(report,cycle);result.notesOverflow=false;active=result;generated='';
    if(result.fee!==null&&form.elements.fee.value.trim()==='')form.elements.fee.value=String(result.fee);
    if(!skipDeadline)fillDeadline();
    else active=null;
    const entries=[
      ...result.deadlines.map(d=>`${d.round}: ${d.date||d.label} (${d.basis}) — ${d.url}`),
      ...result.conflicts.map(r=>`${r}: conflicting dates; check sources`),
      ...result.feeEvidence.map(e=>`Fee evidence: ${e.quote} — ${e.url}`),
      ...result.waiverEvidence.map(e=>`Fee-waiver conditions (eligibility not determined): ${e.quote} — ${e.url}`)
    ];
    const block=entries.length?'Fee and deadline evidence:\n'+unique(entries).join('\n'):'';
    const notes=form.elements.notes;
    if(block&&!notes.value.includes(block)){
      const combined=[notes.value,block].filter(Boolean).join('\n\n');
      if(combined.length<=5000)notes.value=combined;
      else result.notesOverflow=true;
    }
    return result;
  };
})();
