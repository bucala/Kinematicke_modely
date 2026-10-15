// Both Workers Builds and native releases may run first; prepare their shared bucket.
import path from 'node:path';
import {cloudflareCredentials} from './prepare-cloudflare.mjs';

export const RELEASE_BUCKET = 'kinematika-releases';

async function checkR2Activation(response, account) {
  let details;
  try { details = await response.clone().json(); } catch { return; }
  if (details?.errors?.some(error => Number(error.code) === 10042)) {
    throw new Error(`Cloudflare R2 nie je aktivované v cieľovom účte (API 10042, HTTP ${response.status}). Dokončite aktiváciu R2 Object Storage v https://dash.cloudflare.com/${encodeURIComponent(account)}/r2/overview a potom zopakujte publish job. Táto chyba nežiada zmenu API tokenu; bucket sa vytvorí automaticky po aktivácii služby.`);
  }
}

export async function ensureReleaseBucket(config = process.env, fetchRequest = globalThis.fetch) {
  const {account, token} = cloudflareCredentials(config, '065e3003eb4c6bd1bffe7afa184eb5c4');
  const bucket = config.KINMO_RELEASE_BUCKET || RELEASE_BUCKET;
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/r2/buckets`;
  const url = `${base}/${encodeURIComponent(bucket)}`;
  const headers = { Authorization: `Bearer ${token}` };
  const exists = await fetchRequest(url, { headers });
  if (exists.ok) return bucket;
  await checkR2Activation(exists, account);
  if (exists.status !== 404) throw new Error(`Kontrola R2 úložiska ${bucket} zlyhala (HTTP ${exists.status}). Overte cieľový účet, aktiváciu R2 a oprávnenie tokenu Workers R2 Storage: Edit.`);
  const created = await fetchRequest(base, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: bucket }),
  });
  if (!created.ok) {
    await checkR2Activation(created, account);
    // Another pipeline can create it between the GET and POST. Never delete/recreate it.
    const concurrent = await fetchRequest(url, { headers });
    if (concurrent.ok) return bucket;
    throw new Error(`Vytvorenie R2 úložiska ${bucket} zlyhalo (HTTP ${created.status}). V Cloudflare aktivujte R2 Object Storage a povoľte tokenu Workers R2 Storage: Edit, prípadne jednorazovo vytvorte bucket ${bucket} v tomto účte. Existujúce dáta sa nemenili.`);
  }
  return bucket;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try {
    const bucket = await ensureReleaseBucket();
    console.log(`R2 úložisko ${bucket} je pripravené na nasadenie.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
