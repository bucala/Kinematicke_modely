import {writeFile, appendFile} from 'node:fs/promises';
import path from 'node:path';

export function signingValues(env) {
  const names = ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS'];
  let bundle = {};
  if (env.ANDROID_SECRETS && names.some(name => !env[name])) {
    try {
      bundle = JSON.parse(env.ANDROID_SECRETS);
      if (!bundle || Array.isArray(bundle) || typeof bundle !== 'object') throw new Error();
    } catch {
      // JSON.parse errors can contain the secret itself. Never forward their text.
      throw new Error('ANDROID_SECRETS musí obsahovať JSON objekt s položkami ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD a ANDROID_KEY_ALIAS. Nevkladajte celý ZIP ani názov súboru.');
    }
  }
  const values = Object.fromEntries(names.map(name => [name, env[name] || bundle[name]]));
  const missing = names.filter(name => typeof values[name] !== 'string' || !values[name].length);
  if (missing.length) throw new Error(`Chýbajú podpisové údaje: ${missing.join(', ')}. Nastavte samostatné Repository secrets alebo ich JSON objekt v secrete ANDROID_SECRETS.`);
  const password = values.ANDROID_KEYSTORE_PASSWORD, alias = values.ANDROID_KEY_ALIAS;
  if (/[\r\n\0]/.test(password + alias)) throw new Error('Heslo ani alias nesmú obsahovať konce riadkov alebo nulové znaky.');
  const encoded = values.ANDROID_KEYSTORE_BASE64.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1 || encoded.length > 2_000_000) throw new Error('ANDROID_KEYSTORE_BASE64 nie je platný Base64 obsah podpisového keystore.');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('ANDROID_KEYSTORE_BASE64 obsahuje poškodené Base64 dáta.');
  const magic = bytes.length >= 4 ? bytes.readUInt32BE(0) : 0;
  if (bytes.length < 32 || !(bytes[0] === 0x30 || magic === 0xfeedfeed || magic === 0xcececece)) throw new Error('ANDROID_KEYSTORE_BASE64 musí obsahovať súbor PKCS12/JKS keystore, nie ZIP alebo JSON.');
  return {bytes, encoded, password, alias};
}

export async function prepareSigning(env = process.env, log = console.log) {
  if (!env.RUNNER_TEMP || !env.GITHUB_ENV) throw new Error('Príprava podpisu vyžaduje GitHub Actions RUNNER_TEMP a GITHUB_ENV.');
  const {bytes, encoded, password, alias} = signingValues(env);
  const mask = value => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  // Values inside a JSON secret are not automatically masked individually by GitHub.
  for (const value of [encoded, password, alias]) log(`::add-mask::${mask(value)}`);
  const keystore = path.join(env.RUNNER_TEMP, 'release.keystore');
  await writeFile(keystore, bytes, {mode:0o600});
  await appendFile(env.GITHUB_ENV, `KINMO_KEYSTORE=${keystore}\nKINMO_KEYSTORE_PASSWORD=${password}\nKINMO_KEY_ALIAS=${alias}\n`, {mode:0o600});
  log('Podpisový keystore je pripravený. Používa sa existujúci kľúč; nový sa negeneruje.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try { await prepareSigning(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
