/* Explicit, local diagnostic journal. Never records input contents or credentials. */
(function (global) {
  'use strict';
  const flag = 'kinematika.debug.enabled.v1', limit = 2000, byteLimit = 8 * 1024 * 1024;
  let enabled = false, events = [], frames = [], timer, saving = Promise.resolve(), provider = () => null, storageError = '', loaded = false;
  const protectedValues = new Set();
  try { enabled = global.localStorage.getItem(flag) === 'true'; } catch {}
  function protect(value) { if (typeof value === 'string' && value.length >= 8) protectedValues.add(value); }
  function clean(value, depth = 0) {
    if (depth > 20) return '[depth limit]';
    if (typeof value === 'string') {
      let text = value.slice(0, 10000);
      for (const secret of protectedValues) text = text.split(secret).join('[redacted]');
      return text.replace(/(Bearer\s+|X-Kinmo-Key["\s:=]+)[^\s",]+/gi, '$1[redacted]');
    }
    if (Array.isArray(value)) return value.slice(0, 10000).map(v => clean(v, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, v] of Object.entries(value)) {
        if (/password|pairing|authorization|secret|token|cookie|imageData|dataURL/i.test(key)) { out[key] = '[redacted]'; continue; }
        if (typeof v !== 'function') out[key] = clean(v, depth + 1);
      }
      return out;
    }
    return typeof value === 'number' && !Number.isFinite(value) ? String(value) : value;
  }
  const db = new Promise(resolve => {
    if (!global.indexedDB) { loaded = true; resolve(null); return; }
    let request;try{request=global.indexedDB.open('kinematika-debug-v1',1);}catch{storageError='Priebežné úložisko nie je dostupné; export používa pamäť.';loaded=true;resolve(null);return;}
    request.onupgradeneeded = () => request.result.createObjectStore('journal');
    request.onblocked = () => { storageError = 'Úložisko je blokované inou kartou; export používa záznam v pamäti.'; loaded = true; resolve(null); };
    request.onerror = () => { storageError = 'Priebežné úložisko nie je dostupné; export obsahuje aktuálny záznam v pamäti.'; loaded = true; resolve(null); };
    request.onsuccess = () => {
      const database = request.result, read = database.transaction('journal').objectStore('journal').get('session');
      read.onsuccess = () => {
        const old = read.result;
        if (old?.version === 1) { events = [...old.events || [], ...events].slice(-limit); frames = [...old.frames || [], ...frames].slice(-8); }
        loaded = true; resolve(database);
      };
      read.onerror = () => { loaded = true; resolve(database); };
    };
  });
  function bounded() {
    events = events.slice(-limit); frames = frames.slice(-8);
    let value = { version: 1, events, frames };
    while (JSON.stringify(value).length > byteLimit && (frames.length || events.length > 50)) {
      if (frames.length) frames.shift(); else events.splice(0, Math.ceil(events.length / 4));
    }
    return value;
  }
  function flush() {
    clearTimeout(timer);
    saving = saving.catch(() => {}).then(async () => {
      const database = await db; if (!database) return;
      const value = bounded();
      await new Promise(resolve => {
        try{const tx = database.transaction('journal','readwrite');tx.objectStore('journal').put(value,'session');
        tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>{storageError='Priebežný zápis zlyhal; export je stále dostupný.';resolve();};}
        catch{storageError='Priebežný zápis zlyhal; export je stále dostupný.';resolve();}
      });
    });
    return saving;
  }
  function record(kind, details = {}) {
    if (!enabled) return;
    events.push({ at: new Date().toISOString(), kind: String(kind).slice(0, 80), details: clean(details) }); bounded();
    clearTimeout(timer); timer = setTimeout(flush, 300);
  }
  function checkpoint(reason, force = false) {
    if (!enabled) return;
    let snapshot;try{snapshot=clean(provider());}catch(error){record('snapshot-error',{message:error.message});return;}if(!snapshot)return;
    const signature = value => JSON.stringify({project:value?.project,motion:value?.motion,mode:value?.mode,poses:value?.result?.poses,forceError:value?.forceError});
    if(!force && frames.length && signature(frames.at(-1).snapshot)===signature(snapshot))return;
    frames.push({ at: new Date().toISOString(), reason, snapshot }); record('checkpoint', { reason });
  }
  async function setEnabled(value) {
    enabled = !!value;
    try { global.localStorage.setItem(flag, String(enabled)); } catch { storageError = 'Voľba debug režimu sa nedá zapamätať.'; }
    if (enabled) { record('debug-start', environment()); checkpoint('debug-start', true); }
    await flush();
  }
  function environment() {
    return { build: global.KinmoBuild || null, platform: global.KinmoNative?.platform || 'web', userAgent: global.navigator?.userAgent,
      origin: global.location?.origin, viewport: { width: global.innerWidth, height: global.innerHeight, ratio: global.devicePixelRatio }, language: global.navigator?.language,
      features: { indexedDB: !!global.indexedDB, secureContext: !!global.isSecureContext, webGL: !!global.WebGLRenderingContext } };
  }
  async function bundle(description, includeImages = false, extra = null) {
    await db; checkpoint('export', true); await flush();
    return { format: 'kinematika-debug', version: 1, created: new Date().toISOString(), description: clean(String(description || '').slice(0, 4000)),
      environment: environment(), storageError, enabled, events: clean(events), checkpoints: clean(frames), current: clean(provider()),
      attachment: clean(extra), ...(includeImages ? { reference: provider(true)?.reference || null } : {}) };
  }
  async function clear() { await db; events = []; frames = []; await flush(); }
  function attach(getSnapshot) {
    provider = getSnapshot;global.setInterval?.(()=>checkpoint('runtime'),3000);record('application-ready', environment()); checkpoint('application-ready');
    global.addEventListener?.('error', e => { record('javascript-error', { message: e.message, file: e.filename, line: e.lineno, column: e.colno, stack: e.error?.stack }); checkpoint('javascript-error', true); });
    global.addEventListener?.('unhandledrejection', e => { record('unhandled-rejection', { message: String(e.reason?.message || e.reason), stack: e.reason?.stack }); checkpoint('unhandled-rejection', true); });
    global.addEventListener?.('pagehide', () => { checkpoint('pagehide'); flush(); });
  }
  global.KinmoDebug = Object.freeze({ protect, clean, record, checkpoint, setEnabled, bundle, flush, clear, attach, environment, status: () => ({ enabled, events: events.length, checkpoints: frames.length, storageError, loaded }) });
})(globalThis);
