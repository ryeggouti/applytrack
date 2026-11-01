/* Optional planning records live inside each college and travel with its backup. */
(() => {
  'use strict';
  const types={
    tasks:{label:'Tasks',singular:'task',states:['Not started','In progress','Done']},
    essays:{label:'Essays',singular:'essay',states:['Not started','Drafting','Reviewing','Ready','Submitted']},
    recommendations:{label:'Recommendations',singular:'recommendation',states:['Not asked','Requested','Received','Submitted']},
    funding:{label:'Scholarships & aid',singular:'funding deadline',states:['Not started','In progress','Submitted','Awarded','Closed']}
  };
  function date(value){if(typeof value!=='string')return false;if(!value)return true;return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
  function text(value,max){return typeof value==='string'&&value.length<=max;}
  const categories=['Application','Documents','Testing','Writing','Financial aid','Portal follow-up','Other'];
  const priorities=['Normal','High','Low'];
  function wordCount(value){return (value.trim().match(/\S+/gu)||[]).length;}
  function clean(value){
    if(value===undefined)return Object.fromEntries(Object.keys(types).map(key=>[key,[]]));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid planning records. Your saved list has not changed.');
    const result={};
    for(const [type,definition] of Object.entries(types)){
      const items=value[type]??[];
      if(!Array.isArray(items)||items.length>200)throw new Error('Each college can have up to 200 items in each tracker.');
      const ids=new Set();
      result[type]=items.map(item=>{
        if(!item||!text(item.id,100)||!item.id||ids.has(item.id)||!text(item.title,200)||!item.title.trim()||!date(item.date)||!definition.states.includes(item.status)||!text(item.notes,5000)||!text(item.url,1000)||!text(item.person,150)||!date(item.askedOn)||!(item.wordLimit===''||Number.isInteger(item.wordLimit)&&item.wordLimit>=1&&item.wordLimit<=100000)||!['Scholarship','Financial aid'].includes(item.kind))throw new Error('A planning item has invalid details. Your saved list has not changed.');
        if(item.url){try{if(!['http:','https:'].includes(new URL(item.url).protocol))throw 0;}catch{throw new Error('Use an http:// or https:// link for planning items.');}}
        const extra={category:item.category??'Application',priority:item.priority??'Normal',nextStep:item.nextStep??'',prompt:item.prompt??'',draft:item.draft??'',revision:item.revision??''};
        if(!categories.includes(extra.category)||!priorities.includes(extra.priority)||!text(extra.nextStep,1000)||!text(extra.prompt,5000)||!text(extra.draft,30000)||!text(extra.revision,2000))throw new Error('A task or essay has invalid details. Your saved list has not changed.');
        ids.add(item.id);
        return {id:item.id,title:item.title.trim(),date:item.date,status:item.status,notes:item.notes,url:item.url,person:item.person,askedOn:item.askedOn,wordLimit:item.wordLimit,kind:item.kind,...extra};
      });
    }
    return result;
  }
  function complete(type,status){return {tasks:['Done'],essays:['Ready','Submitted'],recommendations:['Received','Submitted'],funding:['Submitted','Awarded','Closed']}[type].includes(status);}
  function all(records){return records.flatMap(college=>Object.keys(types).flatMap(type=>(college.planning?.[type]||[]).map(item=>({college,type,item}))));}
  function week(records,day,isPastAdmission=c=>c.deadline<day){
    const end=new Date(day+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const last=end.toISOString().slice(0,10);
    const work=all(records).filter(row=>!complete(row.type,row.item.status)&&row.item.date);
    const admissions=records.filter(c=>c.status!=='Submitted'&&c.deadline).map(college=>({college,type:'admissions',item:{id:college.id,title:'Application deadline',date:college.deadline,status:college.status}}));
    const rows=[...work,...admissions].sort((a,b)=>a.item.date.localeCompare(b.item.date)||a.college.name.localeCompare(b.college.name)||a.item.title.localeCompare(b.item.title));
    const past=r=>r.type==='admissions'?isPastAdmission(r.college):r.item.date<day;
    return {overdue:rows.filter(past),upcoming:rows.filter(r=>!past(r)&&r.item.date<=last),last};
  }
  globalThis.ApplyTrackPlanning={types,categories,priorities,wordCount,clean,complete,all,week,date};
})();
