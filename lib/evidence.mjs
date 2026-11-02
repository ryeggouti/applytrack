import {load} from "cheerio";
import {academicURL} from "./urls.mjs";
import {sourceScope,sourcePurpose} from './alternative-sources.mjs';
import {layoutDeadlines} from './deadline-layouts.mjs';
const normalize=s=>s.replace(/\s+/g," ").trim();
const DOCUMENTS=[
  ["Application form",/common application|common app\b|coalition application|questbridge application|application form/i],
  ["College report",/college report|transfer report/i],
  ["Final school report",/final school report/i],
  ["Final transcript",/final (?:high.school |secondary.school |official )?transcripts?/i],
  ["Graded written paper",/graded (?:written )?paper/i],
  ["School profile",/school profile/i],
  ["Arts supplement",/arts? supplements?|auditions?/i],
  ["Interview",/\binterviews?\b/i],
  ["Academic transcripts",/\btranscripts?\b|academic records|school records/i],
  ["School report",/secondary school report|school report|counselor report/i],
  ["Mid-year report",/mid[ -]?year.{0,20}(?:report|grades)|mid[ -]?term report/i],
  ["Mid-year transcript",/mid[ -]?year transcript/i],
  ["Senior-year grades",/first marking period|first.quarter grades|senior.year grades/i],
  ["Early Decision agreement",/early decision agreement/i],
  ["Recommendations",/recommendation|reference letters?|teacher evaluations?/i],
  ["Counselor recommendation",/counselor recommendation|counselor.{0,15}reference|(?:letter|recommendation).{0,35}(?:school |guidance )?counselor/i],
  ["Teacher recommendations",/teacher recommendations?|teacher evaluations?|academic letters? of recommendation/i],
  ["Application essays",/\bessays?\b|personal statements?|writing supplements?/i],
  ["SAT / ACT testing",/\bSAT\b|\bACT\b|standardized test/i],
  ["English proficiency",/TOEFL|IELTS|Duolingo|English.proficiency|English.language test/i],
  ["Document translations",/translat(?:ion|ions|ed|e)\b/i],
  ["Financial-aid documents",/CSS Profile|ISFAA|financial.aid application/i],
  ["Financial certification",/proof of funds|financial documentation|certification of finances|financial declaration/i],
  ["Portfolio",/\bportfolios?\b/i],
];
export function qualification(text){
  const positive=text.replace(/(?:do not|does not|not|no longer)\s+requir(?:e|ed|es)/gi,"").replace(/not mandatory/gi,"");
  const required=/\brequir(?:e|ed|es)\b|\bmust\b|mandatory/i.test(positive);
  const recommended=/\brecommend(?:ed|s|ing)?\b|\bencourag(?:e|ed|es|ing)\b/i.test(text);
  if(required&&(/optional/i.test(text)||recommended))return "Mixed conditions — review source";
  if(/not requir|no longer requir|do not require|test.optional|optional/i.test(text))return "Optional / not required";
  if(recommended)return "Recommended";
  if(/if applicable|if needed|if you|if your|unless|may be required|depending|only if|non.native|for (?:ED|early decision|transfer|international) applicants/i.test(text))return "Conditional — check eligibility";
  if(/\brequir(?:e|ed|es|ement|ements)\b|\bmust\b|mandatory/i.test(text))return "Required in source — verify scope";
  return "Mentioned — verify applicability";
}
function documentQualification(label,context,quote){
  if(label!=='Interview')return qualification(context);
  if(/(?:does not|do not) offer.{0,30}interviews?|interviews? (?:are |is )?not offered/i.test(quote))return 'Not offered by the university';
  if(/interviews?.{0,25}(?:optional|not required)|optional.{0,15}interviews?/i.test(quote))return 'Optional / not required';
  if(/interviews? (?:is |are )?required|must (?:complete|attend) (?:an? )?interview|require (?:an? )?interview/i.test(quote))return qualification(quote);
  return 'Mentioned — verify applicability';
}
export function linkScore(text,profile){
  const first=/first[-_ ]?year|freshman|freshmen/i.test(text),transfer=/transfer/i.test(text);
  if(profile.level==='transfer'&&first&&!transfer)return -100;
  if(profile.level==='first-year'&&transfer&&!first)return -100;
  let score=0;
  if(/admission|apply|application/i.test(text))score+=3;
  if(/requirements?|checklist|documents|application.materials/i.test(text))score+=45;
  if(/international/i.test(text))score+=profile.applicant==="international"?25:-10;
  if(/first.year|freshman|freshmen|undergraduate/i.test(text))score+=profile.level==="first-year"?5:-10;
  if(/transfer/i.test(text))score+=profile.level==="transfer"?25:-100;
  if(/graduate|postgraduate|masters|phd/i.test(text)&&!/undergraduate/i.test(text))score-=25;
  if(/deadline|timeline|requirements?|instructions|application.fee|fee.waiver/i.test(text))score+=30;
  if(/testing|english|recommendation|transcript|essays?|writing.supplement/i.test(text))score+=18;
  if(/travel|summer|non.degree|eli.whitney|visiting.undergraduate|gap.year/i.test(text))score-=60;
  if(/financial|finaid|apply.for.aid|sfs\./i.test(text))score-=12;
  if(/\/(?:apply|first-year|firstyear)\/?(?:[?# ]|$)/i.test(text))score+=25;
  if(/timeline|deadline/i.test(text))score+=20;
  if(/podcast|episode|\/posts\/|student.stories/i.test(text))score-=100;
  if(/blog|news|event|alumni|donat|jobs|visit|tour/i.test(text))score-=12;return score;
}
export function parsePage(html,url,profile){
  const linkDOM=load(html);
  const $=load(html);$("script,style,nav,header,footer,noscript,svg,[aria-hidden=true]").remove();
  // Public instructions can be inside a form (e.g. Slate). Keep prose, discard
  // interactive questions, possible field values and hidden submission data.
  $('form .form_question[data-type]:not([data-type=p]):not([data-type=header]),form input,form select,form textarea,form button,form fieldset,form label,form .form_responses,form .form_action').remove();
  const title=normalize($("title").text())||new URL(url).hostname;
  const area=$("main").first().length?$("main").first():$("body");
  const records=[],links=[],manualLinks=[],seen=new Set(),headings=[];const scope=sourceScope(url,title),purpose=sourcePurpose(url);let heading="";
  area.find("h1,h2,h3,h4,h5,h6,p,li,tr,dt,dd,summary,div").each((_,element)=>{
    const el=$(element),tag=element.tagName?.toLowerCase();
    if(/^h[1-6]$/.test(tag)){heading=normalize(el.text());const level=Number(tag[1]);headings.splice(level-1);headings[level-1]=heading;}
    if(tag!=="li"&&el.find("p,li,tr,dt,dd,summary,div,h1,h2,h3,h4,h5,h6").length)return;
    // Keep a parent checklist label even when it contains nested explanatory paragraphs/lists.
    const own=el.clone();own.find("ul,ol,p,table").remove();
    const text=normalize(own.text());if(text.length<2||text.length>1800||/^loading[.\u2026]*$/i.test(text))return;
    const context=[title,url,...headings.filter(Boolean)].join(" ");
    const levelScope=[...headings].reverse().find(h=>h&&/first.year|freshman|freshmen|transfer/i.test(h))||"";
    if(profile.level==="first-year"&&/transfer/i.test(levelScope)&&!/first.year|freshman|freshmen/i.test(levelScope))return;
    if(profile.level==="transfer"&&/first.year|freshman|freshmen/i.test(levelScope)&&!/transfer/i.test(levelScope))return;
    if(profile.level==="first-year"&&/transfer/i.test(heading)&&!/first.year|freshman|freshmen/i.test(heading))return;
    if(profile.level==="transfer"&&/first.year|freshman|freshmen/i.test(heading)&&!/transfer/i.test(heading))return;
    if(profile.level==="first-year"&&/transfer/i.test(context)&&!/first.year|freshman|freshmen/i.test(context))return;
    if(profile.level==="transfer"&&/first.year|freshman|freshmen/i.test(context)&&!/transfer/i.test(context))return;
    if(profile.applicant==="domestic"&&/international|non.us|foreign applicants/i.test(context))return;
    if(profile.applicant==="international"&&/domestic applicants only|us citizens only|u\.s\. citizens only/i.test(context))return;
    const listScope=el.parents('li').toArray().reverse().map(parent=>{const copy=$(parent).clone();copy.find('ul,ol,p,table').remove();return normalize(copy.text());}).filter(Boolean).join(' — ');
    const container=el.closest('ul,ol,dl'),preceding=container.prev();
    const lead=preceding.is('p')&&preceding.text().length<600&&/following|submit|required|must|optional|include/i.test(preceding.text())?normalize(preceding.text()):'';
    const quote=[lead,listScope,text].filter(Boolean).join(' — ').slice(0,1800);
    const key=heading+'|'+quote;if(seen.has(key))return;seen.add(key);
    const pathwayContext=normalize(el.closest('article').find('.card--native__info-col').text());
    if(profile.level==='first-year'&&/transfer/i.test(pathwayContext)&&!/first.year/i.test(pathwayContext))return;
    const recordScope=scope==='questbridge'||headings.some(h=>/questbridge/i.test(h||''))||/^QuestBridge\b/i.test(quote)||/questbridge/i.test(pathwayContext)?'questbridge':scope;
    const sectionContext=[...headings.filter(Boolean),pathwayContext].filter(Boolean).join(' — ');
    for(const [label,pattern]of DOCUMENTS)if(purpose!=='fee-waiver'&&pattern.test(text)){
      if(label==="Academic transcripts"&&/mid[ -]?year transcript/i.test(text))continue;
      if(label==="School report"&&/mid[ -]?year|mid[ -]?term|final school report/i.test(text))continue;
      if(label==="Recommendations"&&/counselor recommendation|teacher recommendations?|teacher evaluations?|academic letters? of recommendation/i.test(text))continue;
      // A reference to an optional SAT essay is not an application-essay requirement.
      if(label==="Application essays"&&/\bSAT\b|\bACT\b/i.test(text)&&!/application essay|personal statement|writing supplement/i.test(text))continue;
      records.push({kind:"document",label,scope:recordScope==='questbridge'?'questbridge':label==="Financial-aid documents"?"financial-aid":recordScope,qualification:documentQualification(label,headings.slice(1,-1).filter(h=>h&&/required|optional|recommend|conditional/i.test(h)).join(" ")+" "+heading+" "+quote,quote),quote,url,title,section:heading});
    }
    if(purpose!=='fee-waiver'&&/deadline|due|january|february|march|april|may|june|july|august|september|october|november|december/i.test(text)&&/apply|application|admission|deadline|decision|action/i.test(sectionContext+" "+text))records.push({kind:"deadline",scope:recordScope,label:"Dates and deadlines",quote,url,title,section:heading,sectionContext});
    if(/application fee|fee waiver|waiv(?:e|er|ing).{0,30}fee|fee.{0,50}waiv|\$\s*\d+.{0,30}fee/i.test(text)||(purpose!=='fee-waiver'&&/application fee|fee waiver/i.test(heading)))records.push({kind:"fee",scope:recordScope,label:"Fees and waivers",quote,url,title,section:heading});
  });
  if(purpose!=='fee-waiver')records.push(...layoutDeadlines($,area,{url,title,scope,profile}));
  linkDOM("a[href]").each((_,a)=>{
    const el=linkDOM(a),text=normalize(el.text());
    try{const target=academicURL(new URL(el.attr("href"),url).href);if(/\.pdf$/i.test(target.pathname)){if(/admission|application|checklist|requirements?|international|documents/i.test(target.href+" "+text))manualLinks.push({url:target.href,text,reason:"PDF — review manually; not extracted"});return;}if(/\/blog|\/news|\/events|\/login|\/signin|\/portal/i.test(target.pathname))return;
      const score=linkScore(target.href+" "+text,profile);if(score>0)links.push({url:target.href,score,text});
    }catch{}
  });
  return {url,title,scope,purpose,records,links,manualLinks,readableText:normalize(area.text()).length};
}
