// Promote latest only after both native artifacts have been uploaded and verified.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {ensureReleaseBucket} from './ensure-release-bucket.mjs';
import {cloudflareCredentials} from './prepare-cloudflare.mjs';
export function validateVersion(value) { if(!/^\d+\.\d+\.\d+$/.test(value)||value.split('.').some(n=>Number(n)>65535))throw Error('Invalid release version');return value; }
export function compareVersions(a,b) { const x=validateVersion(a).split('.').map(Number),y=validateVersion(b).split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0; }
export async function createManifest(folder,version) {
  validateVersion(version);const files=[];
  for(const [platform,extension] of [['windows','exe'],['android','apk']]) {
    const name=`KinematikaStudio-${version}.${extension}`,bytes=await readFile(path.join(folder,name));
    if(bytes.length<1000 || (extension==='exe' ? bytes.subarray(0,2).toString()!=='MZ' : bytes.subarray(0,2).toString()!=='PK'))throw Error(`Invalid ${extension} artifact`);
    files.push({platform,name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const manifest={version,publishedAt:new Date().toISOString(),files};await writeFile(path.join(folder,'latest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function publish(folder,version,config=process.env,fetchRequest=globalThis.fetch) {
  const {account,token}=cloudflareCredentials(config);
  const bucket=config.KINMO_RELEASE_BUCKET||'kinematika-releases';
  await ensureReleaseBucket(config, fetchRequest);
  const base=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/r2/buckets/${encodeURIComponent(bucket)}/objects/`;
  async function request(key,method='GET',body,contentType) {
    const response=await fetchRequest(base+encodeURIComponent(key),{method,headers:{Authorization:`Bearer ${token}`,...(contentType?{'Content-Type':contentType}:{})},body});
    if(!response.ok && response.status!==404)throw Error(`Cloudflare ${method} failed (${response.status})`);return response;
  }
  const manifest=await createManifest(folder,version);
  const oldResponse=await request('latest.json');let old;
  if(oldResponse.ok){old=await oldResponse.json();if(compareVersions(version,old.version)<=0)throw Error('Release must be newer than published version');}
  for(const file of manifest.files) {
    const key=`releases/${version}/${file.name}`,existing=await request(key);
    if(existing.ok) { const bytes=Buffer.from(await existing.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Immutable version already contains different artifact'); }
    else { const type=file.platform==='android'?'application/vnd.android.package-archive':'application/vnd.microsoft.portable-executable';await request(key,'PUT',await readFile(path.join(folder,file.name)),type); }
    const verify=await request(key);const bytes=Buffer.from(await verify.arrayBuffer());if(!verify.ok||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Uploaded artifact checksum mismatch');
  }
  const json=JSON.stringify(manifest,null,2)+'\n';
  await request(`releases/${version}/manifest.json`,'PUT',json,'application/json');
  await request('latest.json','PUT',json,'application/json');
  console.log(`Published ${version}: Windows and Android`);
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const folder=path.resolve(process.argv[2]||'artifacts'),version=process.env.KINMO_VERSION||JSON.parse(await readFile('package.json')).version;
  if(process.argv.includes('--manifest-only'))await createManifest(folder,version);else await publish(folder,version);
}
