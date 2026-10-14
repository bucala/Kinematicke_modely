/* A user's explicit Send is the only call that creates anything in Fusion. */
(function (global) {
  'use strict';
  const ENDPOINT = 'http://127.0.0.1:8765';
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pairingStorageKey = 'kinematika.fusion-pairing.v1';
  function rememberedKey() {
    try {
      const saved = JSON.parse(global.localStorage.getItem(pairingStorageKey) || 'null');
      if(saved?.key)global.KinmoDebug?.protect(saved.key);
      return saved?.endpoint === ENDPOINT && typeof saved.key === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(saved.key) ? saved.key : '';
    } catch { return ''; }
  }
  function rememberPairing(key, remember) {
    try {
      if (!remember) { global.localStorage?.removeItem(pairingStorageKey); return; }
      key = key.trim();
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(key)) throw new Error('Invalid key');
      global.localStorage.setItem(pairingStorageKey, JSON.stringify({ endpoint: ENDPOINT, key }));
    } catch { throw new Error('Spojenie je overené, ale prehliadač neumožňuje uložiť párovanie. Kľúč bude potrebné vložiť znova.'); }
  }
  async function request(path, key, body) {
    if (!['http:', 'https:'].includes(global.location?.protocol)) throw new Error('Priame prepojenie s Fusion vyžaduje HTTP(S), nie file://. Použite lokálny server alebo DXF.');
    if (typeof key === 'string' && !/[\r\n]/.test(key)) key = key.trim();
    if (typeof key !== 'string' || key.length < 20 || key.length > 100 || /[\r\n]/.test(key)) throw new Error('Vložte dočasný párovací kľúč z doplnku Fusion.');
    global.KinmoDebug?.protect(key);
    const started = Date.now();
    global.KinmoDebug?.record('fusion-request',{route:path,method:body?'POST':'GET',entityCount:body?.entities?.length});
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(ENDPOINT + path, {
        method: body ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { 'X-Kinmo-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
      });
      let responseData;
      try { responseData = await response.json(); } catch { responseData = null; }
      global.KinmoDebug?.record('fusion-response',{route:path,status:response.status,durationMs:Date.now()-started,code:responseData?.code,diagnostics:responseData?.diagnostics});
      if (!response.ok) throw new Error(response.status === 401 ? 'Fusion odpovedal 401: párovací kľúč nie je platný. Použite kľúč aktuálneho párovania z Fusion.' : response.status === 403 ? 'Fusion odpovedal 403: pôvod aplikácie nie je povolený. Zastavte a znovu spustite KinmoFusion, zvoľte nové párovanie a povoľte presnú adresu z tohto dialógu.' : response.status === 409 && responseData?.code === 'fusion_event_rejected' ? 'Fusion odmietol udalosť importu (409). Zavrite dialógy vo Fusion, zastavte a znova spustite aktualizovaný doplnok KinmoFusion. Zapnite Debug režim a exportujte záznam po zopakovaní chyby. Výkres nebol prijatý na import.' : response.status === 409 ? 'Fusion odpovedal 409: doplnok je pripojený, ale prebieha iný import alebo Fusion neprijal udalosť. Zavrite vo Fusion okno Scripts and Add-Ins aj ostatné dialógy a dokončite prebiehajúci import. Pred ďalším odoslaním skontrolujte, či už nevznikol dokument. Nejde o chybu párovacieho kľúča.' : `Fusion odpovedal ${response.status}. Skontrolujte rozbehnutý doplnok.`);
      return responseData;
    } catch (error) {
      global.KinmoDebug?.record('fusion-error',{route:path,durationMs:Date.now()-started,type:error.name,message:error.message});
      if (error.name === 'AbortError') throw new Error('Lokálne spojenie s Fusion neodpovedá. Skontrolujte doplnok a port 8765.');
      if (error instanceof TypeError) throw new Error('Prehliadač nedosiahol lokálny doplnok Fusion. V Chrome otvorte ikonu vedľa adresy → Nastavenia webu a povoľte lokálnu sieť, potom zopakujte overenie. Vo Fusion musí bežať KinmoFusion na porte 8765 s presným pôvodom aplikácie uvedeným v dialógu. Ak doplnok povoľuje inú adresu, zastavte ho a pri novom spustení zvoľte nové párovanie. Z prehliadača nemožno rozlíšiť zablokovaný prístup, nesprávny pôvod a zastavený doplnok. Alternatíva: export DXF.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function status(key) {
    const value = await request('/status', key);
    if (!value || value.app !== 'KinmoFusion' || value.version !== 1 || value.referenceOnly !== true) throw new Error('Lokálna služba nie je podporovaný doplnok KinmoFusion.');
    return value;
  }
  async function send(snapshot, key, progress = () => {}) {
    const ready = await status(key);
    progress('Spojenie je overené. Odosielam referenčný výkres…', 'paired');
    if (ready.busy) throw new Error('Fusion ešte spracúva predchádzajúci výkres. Zavrite Scripts and Add-Ins aj ostatné dialógy vo Fusion a počkajte na dokončenie. Ďalší výkres nebol odoslaný.');
    const result = await request('/snapshot', key, snapshot);
    if (!/^[0-9a-f]{32}$/.test(result?.job || '')) throw new Error('Fusion nevrátil platný identifikátor importu.');
    progress('Fusion prijal výkres. Čaká sa na vytvorenie nového dokumentu…');
    const until = Date.now() + 60000;
    let manualShown = false;
    while (Date.now() < until) {
      await delay(500);
      const job = await request(`/jobs/${result.job}`, key);
      if(job.dispatchMode==='manual' && !manualShown){manualShown=true;progress('Fusion neprijal automatickú udalosť. Zavrite dialógy vo Fusion a v Utilities stlačte „Kinmo: importovať čakajúci výkres“. Výkres je už vo fronte; neposielajte ho znova.');}
      if (job.state === 'done') return job;
      if (job.state === 'error') throw new Error('Import zlyhal. Vo Fusion môže zostať neúplný nový dokument. Existujúce návrhy sa nemenili.');
    }
    throw new Error('Fusion ešte nepotvrdil import. Skontrolujte nový dokument vo Fusion pred ďalším odoslaním.');
  }
  global.KinmoCad = Object.freeze({ ENDPOINT, status, send, rememberedKey, rememberPairing });
})(globalThis);
