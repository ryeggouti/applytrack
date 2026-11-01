/* Calendar snapshots contain dates and titles, never private notes or recommender names. */
(() => {
  'use strict';
  const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function fold(line){
    const encoder=new TextEncoder();let result='',part='',length=0;
    for(const char of line){const size=encoder.encode(char).length;if(length+size>75){result+=part+'\r\n';part=' ';length=1;}part+=char;length+=size;}
    return result+part;
  }
  const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const uid=value=>[...new TextEncoder().encode(value)].map(byte=>byte.toString(16).padStart(2,'0')).join('')+'@applytrack.local';
  function build(records,{now=Date.now(),toInstant=()=>null}={}){
    const model=globalThis.ApplyTrackPlanning;
    const rows=model.all(records).filter(r=>r.item.date&&!model.complete(r.type,r.item.status));
    for(const college of records)if(college.deadline&&college.status!=='Submitted')rows.push({college,type:'admissions',item:{id:college.id,title:'Application deadline',date:college.deadline,status:college.status}});
    rows.sort((a,b)=>a.item.date.localeCompare(b.item.date)||a.college.name.localeCompare(b.college.name));
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ApplyTrack//Application Planner//EN','CALSCALE:GREGORIAN'];
    for(const {college,type,item} of rows){
      lines.push('BEGIN:VEVENT','UID:'+uid(type+':'+college.id+':'+item.id),'DTSTAMP:'+stamp(now));
      const instant=type==='admissions'&&college.deadlineTime?toInstant(college):null;
      if(instant!==null&&Number.isFinite(instant))lines.push('DTSTART:'+stamp(instant));
      else{const end=new Date(item.date+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);lines.push('DTSTART;VALUE=DATE:'+item.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+end.toISOString().slice(0,10).replace(/-/g,''));}
      lines.push('SUMMARY:'+escape(college.name+' — '+item.title),'DESCRIPTION:'+escape((model.types[type]?.label||'Admissions')+' · '+item.status+(type==='admissions'?'\nDeadline review: '+(globalThis.ApplyTrackTrust?.status(college)||'Not confirmed'):'')+'\nExported from ApplyTrack. Check the official source for the deadline and any changes.'),'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return {count:rows.length,text:lines.map(fold).join('\r\n')+'\r\n'};
  }
  globalThis.ApplyTrackCalendar={build};
})();
