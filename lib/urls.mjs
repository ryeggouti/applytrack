export const UNIVERSITY_DOMAINS = new Set([
  "utoronto.ca","mcgill.ca","ubc.ca","uwaterloo.ca","queensu.ca","uottawa.ca","yorku.ca","mcmaster.ca",
  "ualberta.ca","ucalgary.ca","uwo.ca","sfu.ca","concordia.ca","dal.ca","umontreal.ca","torontomu.ca",
  "carleton.ca","uvic.ca","usask.ca","umanitoba.ca","ulaval.ca","uoguelph.ca","wlu.ca","unb.ca","mun.ca",
  "ethz.ch","epfl.ch","uzh.ch","unige.ch","unil.ch","unibas.ch","unisg.ch",
  "tum.de","lmu.de","uni-heidelberg.de","fu-berlin.de","hu-berlin.de","tu-berlin.de","rwth-aachen.de","uni-mannheim.de",
  "sorbonne-universite.fr","sciencespo.fr","psl.eu","universite-paris-saclay.fr","u-paris.fr",
  "uva.nl","tudelft.nl","uu.nl","universiteitleiden.nl","eur.nl","rug.nl","maastrichtuniversity.nl","tue.nl","utwente.nl","ru.nl","vu.nl",
  "kuleuven.be","ugent.be","uclouvain.be","ulb.be",
  "tcd.ie","ucd.ie","universityofgalway.ie","ucc.ie",
  "ku.dk","dtu.dk","au.dk","cbs.dk",
  "kth.se","lu.se","su.se","uu.se","chalmers.se","ki.se",
  "uio.no","ntnu.no","helsinki.fi","aalto.fi",
  "unibocconi.it","unibocconi.eu","polimi.it","unibo.it","uniroma1.it","unimi.it",
  "uc3m.es","uam.es","tuwien.at","uni.lu","ulisboa.pt","up.pt",
  "aui.ma","um6p.ma",
  "hku.hk","ust.hk","waseda.jp",
  "mitadmissions.org"
]);
const ACADEMIC_SUFFIX = /\.(?:edu|ac)\.[a-z]{2,3}$/;
const UNIVERSITY_PATTERN = /(?:^|\.)(?:uni|univ|universite|universita|universidad|universitat)-[a-z0-9-]+\.(?:de|fr|at|it|es|ch)$/;

export function rootDomain(host){
  host=host.toLowerCase();
  if(ACADEMIC_SUFFIX.test(host))return host.split(".").slice(-3).join(".");
  const labels=host.split(".");
  for(let i=0;i<labels.length-1;i++){const candidate=labels.slice(i).join(".");if(UNIVERSITY_DOMAINS.has(candidate))return candidate;}
  return labels.slice(-2).join(".");
}
export function isUniversityHost(host){
  host=host.toLowerCase();
  return host.endsWith(".edu")||ACADEMIC_SUFFIX.test(host)||UNIVERSITY_DOMAINS.has(rootDomain(host))||UNIVERSITY_PATTERN.test(host);
}
export function academicURL(value) {
  const url=new URL(value),host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||!isUniversityHost(host))
    throw new Error("Research works with university websites (.edu, .ac.uk and similar, plus many universities in Canada, Europe and elsewhere). If yours isn’t supported yet, add its requirements manually.");
  url.hash="";if(url.search.length>200)throw new Error("Use a shorter admissions-page URL.");return url;
}
export function sameInstitution(url,root){const other=rootDomain(url.hostname);return other===root||(["mit.edu","mitadmissions.org"].includes(root)&&["mit.edu","mitadmissions.org"].includes(other));}
