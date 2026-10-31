import {test} from 'node:test';
import assert from 'node:assert/strict';
import research,{config as researchConfig} from '../netlify/functions/research.mjs';
import universities from '../netlify/functions/universities.mjs';
import {netlifyRequest} from '../lib/netlify-request.mjs';

test('Netlify uses trusted context identity and preserves POST bodies',async()=>{
  const request=netlifyRequest(new Request('https://applytrack.netlify.app/api/research',{method:'POST',headers:{'cf-connecting-ip':'spoofed','oai-authenticated-user-id':'spoofed'},body:'{}'}),{ip:'192.0.2.1'});
  assert.equal(request.headers.get('cf-connecting-ip'),'192.0.2.1');
  assert.equal(request.headers.get('oai-authenticated-user-id'),null);
  assert.equal(await request.text(),'{}');
});
test('Netlify functions serve known university lookup and enforce research validation',async()=>{
  assert.equal(researchConfig.path,'/api/research');
  const response=await universities(new Request('https://applytrack.netlify.app/api/universities?q=MIT'));
  assert.equal(response.status,200);assert.equal((await response.json()).universities[0].name,'Massachusetts Institute of Technology');
  const invalid=await research(new Request('https://applytrack.netlify.app/api/research',{method:'POST',headers:{Origin:'https://applytrack.netlify.app','Content-Type':'application/json'},body:'{}'}),{ip:'192.0.2.2'});
  assert.equal(invalid.status,400);
  const foreign=await research(new Request('https://applytrack.netlify.app/api/research',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),{ip:'192.0.2.3'});
  assert.equal(foreign.status,403);
});
