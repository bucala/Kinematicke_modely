import test from 'node:test';import assert from 'node:assert/strict';import worker,{releaseKey} from '../cloudflare/worker.mjs';import {validateVersion,compareVersions,createManifest,publish} from '../scripts/publish-release.mjs';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('Release routes reject traversal, arbitrary objects and executable extensions',()=>{assert.equal(releaseKey('/downloads/latest.json'),'latest.json');assert.equal(releaseKey('/downloads/releases/2.1.4/app.apk'),'releases/2.1.4/app.apk');for(const value of ['/downloads/secret','/downloads/releases/2.1.4/../key.exe','/downloads/releases/2.1.4/key.js','/downloads/releases/beta/key.exe'])assert.equal(releaseKey(value),null);assert.throws(()=>validateVersion('2.1.999999'));assert.ok(compareVersions('2.1.1000','2.1.999')>0);});
test('Worker serves static app, unavailable release and immutable download correctly',async()=>{let fallback=false;const env={ASSETS:{fetch:()=>{fallback=true;return new Response('app')}},RELEASES:{get:async key=>key==='latest.json'?null:{body:'binary',httpEtag:'hash',writeHttpMetadata:h=>h.set('Content-Type','application/octet-stream')}}};assert.equal(await (await worker.fetch(new Request('https://example.test/'),env)).text(),'app');assert.ok(fallback);assert.equal((await worker.fetch(new Request('https://example.test/downloads/latest.json'),env)).status,503);const response=await worker.fetch(new Request('https://example.test/downloads/releases/2.1.4/app.apk'),env);assert.match(response.headers.get('Content-Disposition'),/app.apk/);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal((await worker.fetch(new Request('https://example.test/downloads/latest.json',{method:'POST'}),env)).status,405);});
test('Release manifest requires both real native file signatures and includes checksums',async()=>{const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-release-'));try {await writeFile(path.join(folder,'KinematikaStudio-2.1.0.exe'),Buffer.concat([Buffer.from('MZ'),Buffer.alloc(1000)]));await assert.rejects(()=>createManifest(folder,'2.1.0'));await writeFile(path.join(folder,'KinematikaStudio-2.1.0.apk'),Buffer.concat([Buffer.from('PK'),Buffer.alloc(1000)]));const manifest=await createManifest(folder,'2.1.0');assert.equal(manifest.files.length,2);assert.equal(manifest.files[0].sha256.length,64);}finally{await rm(folder,{recursive:true,force:true});}});

test('Publishing verifies both uploads before promotion and refuses downgrade or incomplete upload',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-publish-'));
 const objects=new Map(),operations=[];let corrupt=false;
 const fetchMock=async (url,options={})=>{
   if(!url.includes('/objects/'))return new Response('{}');
   const key=decodeURIComponent(url.split('/objects/')[1]);
   if(options.method==='PUT'){operations.push(key);objects.set(key,Buffer.from(options.body));return new Response('{}');}
   if(!objects.has(key))return new Response('',{status:404});
   return new Response(corrupt&&key.endsWith('.apk')?'bad':objects.get(key));
 };
 const config={CLOUDFLARE_ACCOUNT_ID:'test',CLOUDFLARE_API_TOKEN:'mock-no-real-token'};
 try {
  for(const extension of ['exe','apk'])await writeFile(path.join(folder,`KinematikaStudio-2.1.0.${extension}`),Buffer.concat([Buffer.from(extension==='exe'?'MZ':'PK'),Buffer.alloc(1000)]));
  corrupt=true;await assert.rejects(()=>publish(folder,'2.1.0',config,fetchMock),/checksum/);assert.ok(!objects.has('latest.json'));
  corrupt=false;await publish(folder,'2.1.0',config,fetchMock);assert.equal(operations.at(-1),'latest.json');assert.equal(JSON.parse(objects.get('latest.json')).files.length,2);
  objects.set('latest.json',Buffer.from(JSON.stringify({version:'2.1.2'})));const previous=operations.length;
  await assert.rejects(()=>publish(folder,'2.1.0',config,fetchMock),/newer/);assert.equal(operations.length,previous);
 }finally{await rm(folder,{recursive:true,force:true});}
});

const {ensureReleaseBucket} = await import('../scripts/ensure-release-bucket.mjs');
const bucketConfig = {CLOUDFLARE_ACCOUNT_ID:'test-account', CLOUDFLARE_API_TOKEN:'mock-not-a-secret'};
test('Deployment preserves an existing R2 bucket without creating or modifying objects', async () => {
  const calls=[];
  const bucket=await ensureReleaseBucket(bucketConfig, async (url,options)=>{calls.push({url,method:options.method||'GET'});return new Response('{}');});
  assert.equal(bucket,'kinematika-releases');
  assert.deepEqual(calls,[{url:'https://api.cloudflare.com/client/v4/accounts/test-account/r2/buckets/kinematika-releases',method:'GET'}]);
});
test('Deployment creates the missing named R2 bucket before Worker upload', async () => {
  const calls=[];
  const result=await ensureReleaseBucket(bucketConfig, async (url,options)=>{
    calls.push({url,...options});return new Response('{}',{status:options.method==='POST'?200:404});
  });
  assert.equal(result,'kinematika-releases');assert.equal(calls.length,2);
  assert.equal(calls[1].method,'POST');assert.deepEqual(JSON.parse(calls[1].body),{name:'kinematika-releases'});
});
test('R2 authorization and account errors stop deployment without creating a replacement bucket', async () => {
  const calls=[];
  await assert.rejects(()=>ensureReleaseBucket(bucketConfig,async (url,options)=>{calls.push(options.method||'GET');return new Response('{}',{status:403});}),/HTTP 403.*Workers R2 Storage: Edit/);
  assert.deepEqual(calls,['GET']);
  let contacted=false;
  await assert.rejects(()=>ensureReleaseBucket({},async()=>{contacted=true;}),/CLOUDFLARE_API_TOKEN/);
  assert.equal(contacted,false);
});
test('A concurrent bucket creation is accepted, while a failed creation reports the required account setup', async () => {
  let count=0;
  assert.equal(await ensureReleaseBucket(bucketConfig,async()=>new Response('{}',{status:[404,409,200][count++]})),'kinematika-releases');
  count=0;
  await assert.rejects(()=>ensureReleaseBucket(bucketConfig,async()=>new Response('{}',{status:[404,403,404][count++]})),/HTTP 403.*aktivujte R2 Object Storage/);
});
