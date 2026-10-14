const cors={'Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
export function releaseKey(path) {
  if(path==='/downloads/latest.json') return 'latest.json';
  const match=/^\/downloads\/releases\/(\d+\.\d+\.\d+)\/([A-Za-z0-9_.-]+\.(?:exe|apk|json|sha256))$/.exec(path);
  return match ? `releases/${match[1]}/${match[2]}` : null;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/downloads/'))return env.ASSETS.fetch(request);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:cors});
    const key=releaseKey(url.pathname);if(!key)return new Response('Not found',{status:404,headers:cors});
    const object=await env.RELEASES?.get(key);
    if(!object)return Response.json({error:'Release not published yet'},{status:key==='latest.json'?503:404,headers:cors});
    const headers=new Headers(cors);object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
    headers.set('Cache-Control',key==='latest.json'?'no-store':'public, max-age=31536000, immutable');
    if(key.endsWith('.exe')||key.endsWith('.apk'))headers.set('Content-Disposition',`attachment; filename="${key.split('/').at(-1)}"`);
    return new Response(request.method==='HEAD'?null:object.body,{headers});
  }
};
