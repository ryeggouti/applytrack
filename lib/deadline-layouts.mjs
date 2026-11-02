// Preserve semantic date/label relationships before flattening public HTML.
const clean=s=>s.replace(/\s+/g,' ').trim();
export function admissionRound(text){
  if(/early decision\s*(?:I|1)\s*(?:\/|and)\s*(?:II|2)\b/i.test(text))return null;
  if(/questbridge/i.test(text))return 'QuestBridge';
  if(/transfer/i.test(text))return 'Transfer';
  if(/early decision\s*(?:II|2)\b|\bED\s*2\b/i.test(text))return 'Early decision II';
  if(/early decision\s*(?:I|1)\b|\bED\s*1\b/i.test(text))return 'Early decision I';
  if(/restrictive early action|single.choice early action|\bREA\b|\bSCEA\b/i.test(text))return 'Restrictive early action';
  if(/early decision/i.test(text))return 'Early decision';
  if(/early action/i.test(text))return 'Early action';
  if(/regular decision|regular action|\bRD\b/i.test(text))return 'Regular decision';
  return null;
}
const dateText=/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+20\d{2})?\b|\b20\d{2}-\d{2}-\d{2}\b/gi;
function oneDate(text){if(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\s*(?:[-–—]|to)\s*\d{1,2}/i.test(text))return null;const dates=[...text.matchAll(dateText)];return dates.length===1?dates[0][0]:null;}
const excluded=/\baid\b|scholarship|notification|decision (?:by|released)|respond|reply|deposit|enroll|commitment|interview|supporting|supplemental materials|portfolio|test(?:ing)?|score/i;
function applicationLabel(text){return /(?:admissions? )?application(?:s)?(?: (?:submitted|received|submission))?(?: with .{0,90}?)? (?:deadline|due|submitted by)|application for (?:early|regular)|application.*questions.*due/i.test(text)&&!excluded.test(text);}
function headingsBefore($,element){
  // Only headings among preceding siblings of this element/its ancestors.
  // This respects nested cards instead of carrying the last unrelated tab heading.
  for(let el=$(element);el.length&&!el.is('body');el=el.parent()){
    const heading=el.prevAll('h1,h2,h3,h4,h5,h6').first();
    const round=admissionRound(heading.text());if(round)return round;
    const own=el.children('h1,h2,h3,h4,h5,h6').first();
    if(own.length&&own[0]!==element){const r=admissionRound(own.text());if(r)return r;}
  }
  return null;
}
export function layoutDeadlines($,area,{url,title,scope,profile}){
  const records=[],seen=new Set();
  const add=(round,date,label,context='')=>{
    if(!round||!date||/priority|interview/i.test(label))return;
    if(round==='Transfer'&&profile.level!=='transfer'||round!=='Transfer'&&profile.level==='transfer')return;
    if(scope==='financial-aid')return;
    const quote=clean([round,label,date,context].filter(Boolean).join(' — '));
    const key=round+'|'+date+'|'+label;if(seen.has(key))return;seen.add(key);
    records.push({kind:'deadline',label:'Dates and deadlines',scope:round==='QuestBridge'||scope==='questbridge'?'questbridge':'admission',deadlineType:'application',round,dateText:date,quote,url,title,section:'Application deadline — source layout'});
  };
  area.find('table').each((_,table)=>{
    const rows=$(table).find('tr').filter((i,e)=>$(e).closest('table')[0]===table).map((i,e)=>({cells:$(e).children('th,td').toArray().map(c=>clean($(c).text())),elements:$(e).children('th,td').toArray()})).get();
    // Skip merged-cell layouts rather than guessing column positions.
    if($(table).find('[rowspan],[colspan]').toArray().some(e=>Number($(e).attr('rowspan')||1)>1||Number($(e).attr('colspan')||1)>1))return;
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      // Rounds across columns; application deadlines on a labelled row.
      if(applicationLabel(row.cells[0]||'')&&i>0){
        const header=rows.slice(0,i).reverse().find(r=>r.cells.slice(1).some(c=>admissionRound(c)));
        if(header&&header.cells.length===row.cells.length)for(let c=1;c<row.cells.length;c++)add(admissionRound(header.cells[c]),oneDate(row.cells[c]),row.cells[0]);
      }
      // Rounds down rows; select the application column, never aid/reply dates.
      const column=row.cells.findIndex(c=>applicationLabel(c));
      if(column>0){for(const next of rows.slice(i+1)){if(next.cells.length!==row.cells.length)continue;const round=admissionRound(next.cells[0]);if(/priority|interview/i.test(next.cells[0]))continue;add(round,oneDate(next.cells[column]),row.cells[column],next.cells[0]);}}
    }
  });
  // Date paragraph followed by an explicit application item (Duke-style lists).
  area.find('p,dt').each((_,e)=>{
    const text=clean($(e).text()),date=oneDate(text);if(!date||text!==date)return;
    const next=$(e).next('ul,ol,dd');if(!next.length)return;
    const labels=next.is('dd')?[next.text()]:next.children('li').map((i,e)=>{const copy=$(e).clone();copy.children('ul,ol').remove();return clean(copy.text());}).get();
    for(const label of labels)if(applicationLabel(label))add(admissionRound(label)||headingsBefore($,e),date,label);
  });
  // Two-column timeline: headings and detail cells retain the same positions.
  area.find('section.timeline').each((_,section)=>{
    const headers=$(section).find('.timelineHeader h1,.timelineHeader h2,.timelineHeader h3').toArray().map(e=>admissionRound($(e).text()));
    if(headers.length!==2||headers.some(r=>!r))return;
    $(section).find('.container').each((_,block)=>{
      const date=oneDate(clean($(block).find('.timelineDate').text())),cells=$(block).find('.timeLineInfo');if(!date||cells.length!==headers.length)return;
      cells.each((i,cell)=>{for(const p of $(cell).find('p').toArray()){const label=clean($(p).text());if(applicationLabel(label))add(headers[i],date,label);}});
    });
  });
  return records;
}
