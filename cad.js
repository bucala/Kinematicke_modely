/* A user's explicit Send is the only call that creates anything in Fusion. */
(function (global) {
  'use strict';
  const ENDPOINT = 'http://127.0.0.1:8765';
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function request(path, key, body) {
    if (!['http:', 'https:'].includes(global.location?.protocol)) throw new Error('Priame prepojenie s Fusion vyžaduje HTTP(S), nie file://. Použite lokálny server alebo DXF.');
    if (typeof key === 'string' && !/[\r\n]/.test(key)) key = key.trim();
    if (typeof key !== 'string' || key.length < 20 || key.length > 100 || /[\r\n]/.test(key)) throw new Error('Vložte dočasný párovací kľúč z doplnku Fusion.');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(ENDPOINT + path, {
        method: body ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { 'X-Kinmo-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Fusion odpovedal 401: párovací kľúč nie je platný. Po reštarte doplnku použite nový kľúč z Fusion.' : response.status === 403 ? 'Fusion odpovedal 403: pôvod aplikácie nie je povolený. Zastavte a znovu spustite KinmoFusion a povoľte presnú adresu z tohto dialógu.' : `Fusion odpovedal ${response.status}. Skontrolujte rozbehnutý doplnok.`);
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Lokálne spojenie s Fusion neodpovedá. Skontrolujte doplnok a port 8765.');
      if (error instanceof TypeError) throw new Error('Prehliadač nedosiahol lokálny doplnok Fusion. V Chrome otvorte ikonu vedľa adresy → Nastavenia webu a povoľte lokálnu sieť, potom zopakujte overenie. Vo Fusion musí bežať KinmoFusion na porte 8765 s presným pôvodom aplikácie uvedeným v dialógu. Ak doplnok povoľuje inú adresu, zastavte ho a spustite znova. Z prehliadača nemožno rozlíšiť zablokovaný prístup, nesprávny pôvod a zastavený doplnok. Alternatíva: export DXF.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function status(key) {
    const value = await request('/status', key);
    if (value.app !== 'KinmoFusion' || value.version !== 1 || value.referenceOnly !== true) throw new Error('Lokálna služba nie je podporovaný doplnok KinmoFusion.');
    return value;
  }
  async function send(snapshot, key, progress = () => {}) {
    await status(key);
    const result = await request('/snapshot', key, snapshot);
    if (!/^[0-9a-f]{32}$/.test(result.job || '')) throw new Error('Fusion nevrátil platný identifikátor importu.');
    progress('Fusion prijal výkres. Čaká sa na vytvorenie nového dokumentu…');
    const until = Date.now() + 60000;
    while (Date.now() < until) {
      await delay(500);
      const job = await request(`/jobs/${result.job}`, key);
      if (job.state === 'done') return job;
      if (job.state === 'error') throw new Error('Import zlyhal. Vo Fusion môže zostať neúplný nový dokument. Existujúce návrhy sa nemenili.');
    }
    throw new Error('Fusion ešte nepotvrdil import. Skontrolujte nový dokument vo Fusion pred ďalším odoslaním.');
  }
  global.KinmoCad = Object.freeze({ ENDPOINT, status, send });
})(globalThis);
