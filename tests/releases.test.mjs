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
