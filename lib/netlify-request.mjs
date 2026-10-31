export function netlifyRequest(request,context={}) {
  const headers=new Headers(request.headers);
  // Identity comes from Netlify's context, never a browser-provided header.
  headers.set('cf-connecting-ip',context.ip||'anonymous');
  headers.delete('oai-authenticated-user-id');
  return new Request(request,{headers});
}
