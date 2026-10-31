import {createUniversityHandler} from '../../lib/research-http.mjs';
import {searchUniversities} from '../../lib/admissions.mjs';
const handle=createUniversityHandler(searchUniversities);
export default request=>handle(request);
export const config={path:'/api/universities'};
