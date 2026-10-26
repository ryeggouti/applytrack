import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"_site");
await fs.mkdir(output,{recursive:true});
await fs.cp(path.join(root,"public"),output,{recursive:true});
const config={
  research:"prototype",
  prototypeURL:"https://applytrack-ryeggouti.maplebison10.chatgpt.site/planner",
};
await fs.writeFile(path.join(output,"hosting.js"),"window.APPLYTRACK_HOSTING = "+JSON.stringify(config)+";\n");
await fs.writeFile(path.join(output,".nojekyll"),"");
console.log("GitHub Pages assets prepared in _site/");
