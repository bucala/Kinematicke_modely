// Read-only probes run where deployment credentials actually live (GitHub Actions).
import {appendFile} from 'node:fs/promises';
import {cloudflareCredentials} from './prepare-cloudflare.mjs';
const {account,token}=cloudflareCredentials(process.env);
const results=[];
for(const [label,route,required] of [
 ['User token','/user/tokens/verify',false],
 ['Account token',`/accounts/${account}/tokens/verify`,false],
 ['Account','/accounts',false],
 ['R2 bucket',`/accounts/${account}/r2/buckets/kinematika-releases`,false],
 ['R2 list',`/accounts/${account}/r2/buckets`,false],
 ['Workers',`/accounts/${account}/workers/scripts`,true],
]) {
 try {
  const response=await fetch('https://api.cloudflare.com/client/v4'+route,{headers:{Authorization:'Bearer '+token}});
  const data=await response.json();
  const errors=(data.errors||[]).map(error=>({code:error.code,message:String(error.message||'').replaceAll(token,'[hidden]').replace(/[\r\n]/g,' ').slice(0,500)}));
  const visibleAccounts=label==='Account'&&Array.isArray(data.result)?data.result.map(value=>({targetAccount:value.id===account})):undefined;
  const result={label,http:response.status,success:data.success,errors,required,...(visibleAccounts?{visibleAccounts}:{}),...(label.includes('token')?{active:data.result?.status==='active'}:{})};
  results.push(result);console.log(JSON.stringify(result));
 }catch(error){const result={label,required,error:error.name};results.push(result);console.log(JSON.stringify(result));}
}
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## Cloudflare access check\n\n```json\n'+JSON.stringify(results,null,2)+'\n```\n');
if(results.some(result=>result.required&&!result.success&&result.http!==404))process.exitCode=1;
