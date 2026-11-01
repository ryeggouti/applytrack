import {academicURL} from "./urls.mjs";
const USER_AGENT="ApplyTrackResearch/1.0 (public admissions page lookup)";
export const DIRECTORY = [
  ["Amherst College","Amherst","https://www.amherst.edu/admission/apply/firstyear"],
  ["Massachusetts Institute of Technology","MIT","https://mitadmissions.org/apply/firstyear/"],
  ["Harvard University","Harvard","https://college.harvard.edu/admissions/apply"],
  ["Stanford University","Stanford","https://admission.stanford.edu/apply/"],
  ["Princeton University","Princeton","https://admission.princeton.edu/apply"],
  ["Yale University","Yale","https://admissions.yale.edu/"],
  ["Columbia University","Columbia","https://undergrad.admissions.columbia.edu/apply"],
  ["University of Pennsylvania","Penn UPenn","https://admissions.upenn.edu/"],
  ["California Institute of Technology","Caltech","https://www.admissions.caltech.edu/apply"],
  ["University of Chicago","UChicago","https://collegeadmissions.uchicago.edu/apply"],
  ["Duke University","Duke","https://admissions.duke.edu/apply/"],
  ["Brown University","Brown","https://admission.brown.edu/"],
  ["Cornell University","Cornell","https://admissions.cornell.edu/"],
  ["Northwestern University","Northwestern","https://admissions.northwestern.edu/"],
  ["Johns Hopkins University","Johns Hopkins JHU","https://apply.jhu.edu/"],
  ["University of California, Berkeley","UC Berkeley","https://admissions.berkeley.edu/"],
  ["University of California, Los Angeles","UCLA","https://admission.ucla.edu/"],
  ["University of Michigan","Michigan UMich","https://admissions.umich.edu/"],
  ["New York University","NYU","https://www.nyu.edu/admissions/undergraduate-admissions.html"],
  ["Carnegie Mellon University","CMU","https://www.cmu.edu/admission/"],
  ["University of Southern California","USC","https://admission.usc.edu/"],
].map(([name,aliases,url])=>({name,aliases,url}));

export async function searchUniversities(query,fetcher=fetch){
  const q=query.toLowerCase().trim();
  const known=DIRECTORY.filter(c=>(c.name+" "+c.aliases).toLowerCase().includes(q)).slice(0,6).map(({name,url})=>({name,url,description:"Admissions starting page",discovery:"ApplyTrack directory"}));
  if(known.length)return {universities:known};
  try{
    const endpoint=new URL("https://www.wikidata.org/w/api.php");
    endpoint.search=new URLSearchParams({action:"wbsearchentities",search:query,language:"en",format:"json",limit:"6"}).toString();
    const res=await fetcher(endpoint,{headers:{"User-Agent":USER_AGENT},signal:AbortSignal.timeout(7000)});if(!res.ok)throw new Error();
    const matches=(await res.json()).search?.filter(c=>/university|college|institute of technology|higher education/i.test(c.description||""))||[];
    if(!matches.length)return {universities:[],message:"No match found. Paste the official admissions-page URL instead."};
    endpoint.search=new URLSearchParams({action:"wbgetentities",ids:matches.map(c=>c.id).join("|"),props:"claims",format:"json"}).toString();
    const detail=await fetcher(endpoint,{headers:{"User-Agent":USER_AGENT},signal:AbortSignal.timeout(7000)});if(!detail.ok)throw new Error();
    const entities=(await detail.json()).entities||{};
    const universities=matches.flatMap(c=>{
      for(const claim of entities[c.id]?.claims?.P856||[]){try{const url=academicURL(String(claim.mainsnak.datavalue.value).replace(/^http:/,"https:")).href;return [{name:c.label,url,description:c.description,discovery:"Wikidata official-website listing; confirm the match"}];}catch{}}
      return [];
    });
    return {universities,message:universities.length?"":"The listed website is outside supported academic domains. Add this college manually."};
  }catch{return {universities:[],message:"University search is unavailable. Paste an official admissions URL, or add the college manually."};}
}
