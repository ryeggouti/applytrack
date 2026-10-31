import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const output=new URL('dist-netlify/',root);
await fs.mkdir(output,{recursive:true});
await fs.cp(new URL('public/',root),output,{recursive:true});
// Keep this independent of the Pages configuration and its existing API host.
await fs.writeFile(new URL('hosting.js',output),'window.APPLYTRACK_HOSTING = { apiBase: "" };\n');
console.log('Standalone Netlify planner prepared in '+fileURLToPath(output));
