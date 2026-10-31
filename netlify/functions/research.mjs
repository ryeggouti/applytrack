import {createResearchHandler} from '../../lib/research-http.mjs';
import {research,academicURL} from '../../lib/admissions.mjs';
import {netlifyRequest} from '../../lib/netlify-request.mjs';
const handle=createResearchHandler({research,validateURL:academicURL});
export default (request,context)=>handle(netlifyRequest(request,context));
export const config={path:'/api/research'};
