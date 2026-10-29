import {load} from "cheerio";
import {academicURL} from "./urls.mjs";
const normalize=s=>s.replace(/\s+/g," ").trim();
const DOCUMENTS=[
  ["Academic transcripts",/\btranscripts?\b|academic records|school records/i],
  ["School report",/secondary school report|school report|counselor report/i],
  ["Recommendations",/recommendation|reference letters?|teacher evaluations?/i],
  ["Application essays",/\bessays?\b|personal statements?|writing supplements?/i],
  ["SAT / ACT testing",/\bSAT\b|\bACT\b|standardized test/i],
  ["English proficiency",/TOEFL|IELTS|Duolingo|English.proficiency|English.language test/i],
  ["Document translations",/translat(?:ion|ions|ed|e)\b/i],
  ["Financial-aid documents",/CSS Profile|ISFAA|financial.aid application|financial documentation|proof of funds/i],
  ["Portfolio",/\bportfolios?\b/i],
];
export function qualification(text){
  const positive=text.replace(/(?:do not|does not|not|no longer)\s+requir(?:e|ed|es)/gi,"").replace(/not mandatory/gi,"");
  const required=/\brequir(?:e|ed|es)\b|\bmust\b|mandatory/i.test(positive);
  const recommended=/\brecommend(?:ed|s|ing)?\b|\bencourag(?:e|ed|es|ing)\b/i.test(text);
  if(required&&(/optional/i.test(text)||recommended))return "Mixed conditions — review source";
  if(/not requir|no longer requir|do not require|test.optional|optional/i.test(text))return "Optional / not required";
  if(recommended)return "Recommended";
  if(/if applicable|if you|if your|unless|may be required|depending|only if|non.native/i.test(text))return "Conditional — check eligibility";
  if(/\brequir(?:e|ed|es|ement|ements)\b|\bmust\b|mandatory/i.test(text))return "Required in source — verify scope";
  return "Mentioned — verify applicability";
}
export function linkScore(text,profile){
  let score=0;
  if(/admission|apply|application/i.test(text))score+=3;
  if(/requirements?|checklist|documents/i.test(text))score+=6;
  if(/international/i.test(text))score+=profile.applicant==="international"?25:-10;
  if(/first.year|freshman|freshmen|undergraduate/i.test(text))score+=profile.level==="first-year"?5:-10;
  if(/transfer/i.test(text))score+=profile.level==="transfer"?25:-100;
  if(/graduate|postgraduate|masters|phd/i.test(text)&&!/undergraduate/i.test(text))score-=25;
  if(/deadline|timeline|requirements?|instructions|application.fee|fee.waiver/i.test(text))score+=30;
  if(/testing|english|recommendation|transcript/i.test(text))score+=4;
  if(/travel|summer|non.degree|eli.whitney|visiting.undergraduate/i.test(text))score-=60;
  if(/financial|finaid|apply.for.aid|sfs\./i.test(text))score-=50;
  if(/\/(?:apply|first-year|firstyear)\/?(?:[?# ]|$)/i.test(text))score+=25;
  if(/timeline|deadline/i.test(text))score+=20;
  if(/blog|news|event|alumni|donat|jobs|visit|tour/i.test(text))score-=12;return score;
}
export function parsePage(html,url,profile){
  const linkDOM=load(html);
  const $=load(html);$("script,style,nav,header,footer,form,noscript,svg,[aria-hidden=true]").remove();
  const title=normalize($("title").text())||new URL(url).hostname;
  const area=$("main").first().length?$("main").first():$("body");
  const records=[],links=[],seen=new Set();let heading="";
  area.find("h1,h2,h3,h4,p,li,tr").each((_,element)=>{
    const el=$(element),tag=element.tagName?.toLowerCase();
    if(/^h[1-4]$/.test(tag)){heading=normalize(el.text());if(!/\$|fee|deadline/i.test(heading))return;}
    if(el.find("p,li,tr").length)return;
    const text=normalize(el.text());if(text.length<2||text.length>1800||seen.has(text))return;
    const context=[title,url,heading].join(" ");
    if(profile.level==="first-year"&&/transfer/i.test(heading)&&!/first.year|freshman|freshmen/i.test(heading))return;
    if(profile.level==="transfer"&&/first.year|freshman|freshmen/i.test(heading)&&!/transfer/i.test(heading))return;
    if(profile.level==="first-year"&&/transfer/i.test(context)&&!/first.year|freshman|freshmen/i.test(context))return;
    if(profile.level==="transfer"&&/first.year|freshman|freshmen/i.test(context)&&!/transfer/i.test(context))return;
    if(profile.applicant==="domestic"&&/international|non.us|foreign applicants/i.test(context))return;
    if(profile.applicant==="international"&&/domestic applicants only|us citizens only|u\.s\. citizens only/i.test(context))return;
    seen.add(text);const quote=text;
    for(const [label,pattern]of DOCUMENTS)if(pattern.test(text)){
      // A reference to an optional SAT essay is not an application-essay requirement.
      if(label==="Application essays"&&/\bSAT\b|\bACT\b/i.test(text)&&!/application essay|personal statement|writing supplement/i.test(text))continue;
      records.push({kind:"document",label,qualification:qualification(heading+" "+text),quote,url,title,section:heading});
    }
    if(/deadline|due|january|february|march|april|may|june|july|august|september|october|november|december/i.test(text)&&/apply|application|admission|deadline|decision|action/i.test(heading+" "+text))records.push({kind:"deadline",label:"Dates and deadlines",quote,url,title,section:heading});
    if(/application fee|fee waiver|waiv(?:e|er|ing).{0,30}fee|\$\s*\d+.{0,30}fee/i.test(text)||/application fee|fee waiver/i.test(heading))records.push({kind:"fee",label:"Fees and waivers",quote,url,title,section:heading});
  });
  linkDOM("a[href]").each((_,a)=>{
    const el=linkDOM(a),text=normalize(el.text());
    try{const target=academicURL(new URL(el.attr("href"),url).href);if(/\.pdf$|\/blog|\/news|\/events|\/login|\/signin|\/portal/i.test(target.pathname))return;
      const score=linkScore(target.href+" "+text,profile);if(score>0)links.push({url:target.href,score,text});
    }catch{}
  });
  return {url,title,records,links};
}
