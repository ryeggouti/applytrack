export function academicURL(value) {
  const url=new URL(value),host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||
    !(host.endsWith(".edu")||/\.(?:edu|ac)\.[a-z]{2,3}$/.test(host)||host==="mitadmissions.org"||host.endsWith(".mitadmissions.org")))
    throw new Error("Use an official HTTPS address ending in .edu, .edu.country, or .ac.country. Other universities can still be added manually.");
  url.hash="";if(url.search.length>200)throw new Error("Use a shorter admissions-page URL.");return url;
}
export function rootDomain(host){return host.toLowerCase().split(".").slice(/\.(?:edu|ac)\.[a-z]{2,3}$/.test(host)?-3:-2).join(".");}
export function sameInstitution(url,root){const other=rootDomain(url.hostname);return other===root||(["mit.edu","mitadmissions.org"].includes(root)&&["mit.edu","mitadmissions.org"].includes(other));}
