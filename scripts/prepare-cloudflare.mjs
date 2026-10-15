import {appendFile} from 'node:fs/promises';
import path from 'node:path';

export function cloudflareCredentials(config, fallbackAccount = '') {
  const account = String(config.CLOUDFLARE_ACCOUNT_ID || fallbackAccount).trim();
  const token = String(config.CLOUDFLARE_API_TOKEN || '').trim();
  const missing = [!account && 'CLOUDFLARE_ACCOUNT_ID', !token && 'CLOUDFLARE_API_TOKEN'].filter(Boolean);
  if (missing.length) throw new Error(`Chýbajú GitHub/Cloudflare secrets: ${missing.join(', ')}.`);
  // Never include the supplied value in diagnostics; fetch's native header errors do.
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(token)) throw new Error('CLOUDFLARE_API_TOKEN má neplatný formát. V Repository secrets uložte iba samotný token na jednom riadku, bez úvodzoviek, JSON, príkazu curl alebo textu Bearer.');
  if (!/^[A-Za-z0-9_-]+$/.test(account)) throw new Error('CLOUDFLARE_ACCOUNT_ID má neplatný formát. Uložte iba ID účtu na jednom riadku.');
  return {account, token};
}

export async function prepareCloudflare(env = process.env, log = console.log) {
  const {account, token} = cloudflareCredentials(env);
  if (!env.GITHUB_ENV) throw new Error('Príprava Cloudflare údajov vyžaduje GitHub Actions GITHUB_ENV.');
  log(`::add-mask::${token}`);
  await appendFile(env.GITHUB_ENV, `CLOUDFLARE_ACCOUNT_ID=${account}\nCLOUDFLARE_API_TOKEN=${token}\n`, {mode:0o600});
  log('Cloudflare údaje sú pripravené pre R2 aj Wrangler. Okrajové medzery a konce riadkov boli odstránené.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try { await prepareCloudflare(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
