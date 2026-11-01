import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"_site");
await fs.mkdir(output,{recursive:true});
await fs.cp(path.join(root,"public"),output,{recursive:true});
const config={
  apiBase:"https://zesty-quokka-213e5b.netlify.app",
};
await fs.writeFile(path.join(output,"hosting.js"),"window.APPLYTRACK_HOSTING = "+JSON.stringify(config)+";\n");
const versions={};
for(const file of ["activities-model.js","activities.js","prompt-data.js","prompts.js","trust-model.js","trust.js","calendar.js","planning-model.js","planning.js","theme.js","hosting.js","app.js","research.js","research-autofill.js","workspace.js","welcome.js","profile.js","favicon.svg","style.css"]){
  versions[file]=createHash("sha256").update(await fs.readFile(path.join(output,file))).digest("hex").slice(0,12);
}
const html=await fs.readFile(path.join(output,"index.html"),"utf8");
await fs.writeFile(path.join(output,"index.html"),html.replace(/(src|href)="(activities-model\.js|activities\.js|prompt-data\.js|prompts\.js|trust-model\.js|trust\.js|calendar\.js|planning-model\.js|planning\.js|theme\.js|hosting\.js|app\.js|research\.js|research-autofill\.js|workspace\.js|welcome\.js|profile\.js|favicon\.svg|style\.css)"/g,(_,attribute,file)=>attribute+'="'+file+'?v='+versions[file]+'"'));
await fs.writeFile(path.join(output,".nojekyll"),"");
console.log("GitHub Pages assets prepared in _site/");
