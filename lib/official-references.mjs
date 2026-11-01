// Human-reviewed summaries, offered separately when a live source is blocked.
// They are not fetched-page evidence and contain no cached fee or deadline values.
export function officialReference(url,profile){
  if(!['amherst.edu','www.amherst.edu'].includes(new URL(url).hostname)||profile.level!=='first-year'||!/^\/(?:admission(?:\/|$)|$)/.test(new URL(url).pathname))return null;
  const first='https://www.amherst.edu/admission/apply/firstyear',international='https://www.amherst.edu/admission/apply/international';
  const definitions=[
    ['Application form','Required in source — verify scope','Choose one accepted application platform.',first],
    ['Application essays','Required in source — verify scope','Complete Amherst’s writing supplement using an eligible route.',first],
    ['Academic transcripts','Required in source — verify scope','A school official supplies the secondary-school transcript.',first],
    ['School report','Required in source — verify scope','A school official sends the school report.',first],
    ['Counselor recommendation','Required in source — verify scope','Provide a counselor recommendation, separately from teacher references.',first],
    ['Teacher recommendations','Required in source — verify scope','Provide two recommendations from teachers of academic subjects.',first],
    ['Mid-year report','Conditional — check eligibility','The school sends a midyear report when first-term grades become available.',first],
    ['Mid-year transcript','Conditional — check eligibility','The school sends a midyear transcript when first-term grades become available.',first],
    ['Senior-year grades','Conditional — check eligibility','Early Decision applicants supply their initial senior-year marking-period grades.',first],
    ['Early Decision agreement','Conditional — check eligibility','An Early Decision applicant completes the agreement.',first],
    ['SAT / ACT testing','Optional / not required','SAT or ACT submission is optional; check the elected-score reporting rules.',first],
    ['Arts supplement','Optional / not required','Applicants with relevant artistic accomplishments may submit an arts supplement.',first]
  ];
  if(profile.applicant==='international')definitions.push(
    ['English proficiency','Conditional — check eligibility','English-language evidence may be required; native-language and recent English-medium schooling affect waiver eligibility.',international],
    ['Interview','Not offered by the university','Amherst does not offer prospective-student interviews; outside interview submissions have separate conditions.',international]
  );
  const records=definitions.map(([label,qualification,quote,url])=>({kind:'document',label,qualification,quote,url,title:'Amherst official instructions — saved summary',section:'2026–2027 reference; review current official wording',evidenceType:'reviewed-summary'}));
  return {reviewed:'2026-11-01',cycle:'2026–2027',pages:[...new Set(records.map(r=>r.url))].map(url=>({url,title:'Amherst official instructions — saved reference',records:records.filter(r=>r.url===url),links:[]}))};
}
