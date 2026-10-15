import test from 'node:test';import assert from 'node:assert/strict';import worker,{releaseKey} from '../cloudflare/worker.mjs';import {validateVersion,compareVersions,createManifest,publish} from '../scripts/publish-release.mjs';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('Release routes reject traversal, arbitrary objects and executable extensions',()=>{assert.equal(releaseKey('/downloads/latest.json'),'latest.json');assert.equal(releaseKey('/downloads/releases/2.1.4/app.apk'),'releases/2.1.4/app.apk');for(const value of ['/downloads/secret','/downloads/releases/2.1.4/../key.exe','/downloads/releases/2.1.4/key.js','/downloads/releases/beta/key.exe'])assert.equal(releaseKey(value),null);assert.throws(()=>validateVersion('2.1.999999'));assert.ok(compareVersions('2.1.1000','2.1.999')>0);});
test('Worker serves static app, unavailable release and immutable download correctly',async()=>{let fallback=false;const env={ASSETS:{fetch:()=>{fallback=true;return new Response('app')}},RELEASES:{get:async key=>key==='latest.json'?null:{body:'binary',httpEtag:'hash',writeHttpMetadata:h=>h.set('Content-Type','application/octet-stream')}}};assert.equal(await (await worker.fetch(new Request('https://example.test/'),env)).text(),'app');assert.ok(fallback);assert.equal((await worker.fetch(new Request('https://example.test/downloads/latest.json'),env)).status,503);const response=await worker.fetch(new Request('https://example.test/downloads/releases/2.1.4/app.apk'),env);assert.match(response.headers.get('Content-Disposition'),/app.apk/);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal((await worker.fetch(new Request('https://example.test/downloads/latest.json',{method:'POST'}),env)).status,405);});
test('Release manifest requires both real native file signatures and includes checksums',async()=>{const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-release-'));try {await writeFile(path.join(folder,'KinematikaStudio-2.1.0.exe'),Buffer.concat([Buffer.from('MZ'),Buffer.alloc(1000)]));await assert.rejects(()=>createManifest(folder,'2.1.0'));await writeFile(path.join(folder,'KinematikaStudio-2.1.0.apk'),Buffer.concat([Buffer.from('PK'),Buffer.alloc(1000)]));const manifest=await createManifest(folder,'2.1.0');assert.equal(manifest.files.length,2);assert.equal(manifest.files[0].sha256.length,64);}finally{await rm(folder,{recursive:true,force:true});}});

test('Publishing verifies both uploads before promotion and refuses downgrade or incomplete upload',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-publish-'));
 const objects=new Map(),operations=[];let corrupt=false;
 const fetchMock=async (url,options={})=>{
   assert.equal(new Headers(options.headers).get('Authorization'),'Bearer mock-no-real-token');
   if(!url.includes('/objects/'))return new Response('{}');
   const key=decodeURIComponent(url.split('/objects/')[1]);
   if(options.method==='PUT'){operations.push(key);objects.set(key,Buffer.from(options.body));return new Response('{}');}
   if(!objects.has(key))return new Response('',{status:404});
   return new Response(corrupt&&key.endsWith('.apk')?'bad':objects.get(key));
 };
 const config={CLOUDFLARE_ACCOUNT_ID:' test\n',CLOUDFLARE_API_TOKEN:' mock-no-real-token\r\n'};
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

const {signingValues, prepareSigning} = await import('../scripts/prepare-android-signing.mjs');
const testStore=Buffer.alloc(256,7);testStore[0]=0x30;
const testSigning={ANDROID_KEYSTORE_BASE64:testStore.toString('base64'),ANDROID_KEYSTORE_PASSWORD:'fixture%password',ANDROID_KEY_ALIAS:'fixture-alias'};
test('Android accepts the existing ANDROID_SECRETS JSON bundle and separate secrets take precedence',()=>{
 const json={ANDROID_SECRETS:JSON.stringify(testSigning)};
 assert.deepEqual(signingValues(json).bytes,testStore);
 assert.equal(signingValues({...json,ANDROID_KEYSTORE_PASSWORD:'override'}).password,'override');
 assert.equal(signingValues({...testSigning,ANDROID_SECRETS:'old invalid JSON'}).alias,'fixture-alias');
});
test('Android rejects missing, malformed or unsafe signing values without exposing their contents',()=>{
 assert.throws(()=>signingValues({ANDROID_SECRETS:'private invalid input'}),error=>!error.message.includes('private invalid input')&&error.message.includes('JSON'));
 assert.throws(()=>signingValues({ANDROID_SECRETS:JSON.stringify({ANDROID_KEY_ALIAS:'fixture'})}),/ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD/);
 assert.throws(()=>signingValues({...testSigning,ANDROID_KEYSTORE_PASSWORD:'secret\nINJECT=bad'}),/konce riadkov/);
 assert.throws(()=>signingValues({...testSigning,ANDROID_KEYSTORE_BASE64:'@invalid-base64'}),/Base64/);
 assert.throws(()=>signingValues({...testSigning,ANDROID_KEYSTORE_BASE64:Buffer.alloc(256,80).toString('base64')}),/nie ZIP alebo JSON/);
});
test('Android prepares the same key with restricted permissions and masks JSON fields before publishing job variables',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-signing-'));
 const events=[];
 try {
  const envFile=path.join(folder,'job.env');
  await prepareSigning({ANDROID_SECRETS:JSON.stringify(testSigning),RUNNER_TEMP:folder,GITHUB_ENV:envFile},line=>events.push(line));
  const {readFile,stat}=await import('node:fs/promises');
  assert.deepEqual(await readFile(path.join(folder,'release.keystore')),testStore);
  const output=await readFile(envFile,'utf8');assert.ok(output.includes('KINMO_KEYSTORE_PASSWORD=fixture%password\n'));assert.ok(output.includes('KINMO_KEY_ALIAS=fixture-alias\n'));
  assert.equal(events[1],'::add-mask::fixture%25password');
  assert.ok(events.slice(0,3).every(line=>line.startsWith('::add-mask::')));
  if(process.platform!=='win32')assert.equal((await stat(path.join(folder,'release.keystore'))).mode&0o777,0o600);
 } finally {await rm(folder,{recursive:true,force:true});}
});

const {cloudflareCredentials,prepareCloudflare}=await import('../scripts/prepare-cloudflare.mjs');
test('Cloudflare strips accidental outer whitespace without modifying the source credentials',()=>{
 const input={CLOUDFLARE_ACCOUNT_ID:' test-account\r\n',CLOUDFLARE_API_TOKEN:' \nmock-token\r\n '};
 const before=JSON.stringify(input);assert.deepEqual(cloudflareCredentials(input),{account:'test-account',token:'mock-token'});assert.equal(JSON.stringify(input),before);
});
test('Cloudflare rejects multiline tokens before fetch without echoing secret material',async()=>{
 const token='private-token\nprivate-second-line';let called=false;
 await assert.rejects(()=>ensureReleaseBucket({CLOUDFLARE_API_TOKEN:token},async()=>{called=true;}),error=>error.message.includes('CLOUDFLARE_API_TOKEN')&&!error.message.includes('private-'));
 assert.equal(called,false);
 for(const value of ['Bearer private-token','"private-token"','{"token":"private-token"}'])assert.throws(()=>cloudflareCredentials({CLOUDFLARE_ACCOUNT_ID:'test',CLOUDFLARE_API_TOKEN:value}),/samotný token/);
 assert.throws(()=>cloudflareCredentials({CLOUDFLARE_API_TOKEN:'   \r\n'}),/CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN/);
});
test('Cloudflare exports masked single-line values for subsequent Wrangler steps',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'kinmo-cloudflare-env-'));
 try {
  const file=path.join(folder,'job.env'),events=[];
  await prepareCloudflare({GITHUB_ENV:file,CLOUDFLARE_ACCOUNT_ID:' test-account\n',CLOUDFLARE_API_TOKEN:' mock-token\r\n'},line=>events.push(line));
  const {readFile}=await import('node:fs/promises');
  assert.equal(await readFile(file,'utf8'),'CLOUDFLARE_ACCOUNT_ID=test-account\nCLOUDFLARE_API_TOKEN=mock-token\n');assert.equal(events[0],'::add-mask::mock-token');assert.ok(!events[1].includes('mock-token'));
 }finally{await rm(folder,{recursive:true,force:true});}
});
