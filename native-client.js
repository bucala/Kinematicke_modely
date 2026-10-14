(function (global) {
  'use strict';
  const native = global.KinmoNativeFiles;
  if (native?.platform) global.KinmoNative = Object.freeze({platform:String(native.platform()),version:String(native.version())});
  else if (global.chrome?.webview) global.KinmoNative = Object.freeze({platform:'windows'});
  const releaseOrigin = 'https://kinematicke-modely.marcel-bucala.workers.dev';
  async function openDownloads(modal) {
    modal('Windows a Android aplikácie', '<p id="native-release-status" role="status">Načítavam poslednú zverejnenú verziu…</p>');
    const target = global.document.querySelector('#native-release-status');
    try {
      const response = await fetch((global.KinmoNative ? releaseOrigin : global.location.origin) + '/downloads/latest.json', {cache:'no-store'});
      if(!response.ok)throw Error('Verzia ešte nie je zverejnená na Cloudflare.');
      const release = await response.json().catch(()=>{throw Error('Verzia ešte nie je zverejnená na Cloudflare.');});
      if(!/^\d+\.\d+\.\d+$/.test(release.version)||!Array.isArray(release.files))throw Error('Neplatný manifest verzie.');
      const links = release.files.filter(f=>['windows','android'].includes(f.platform)&&/^[A-Za-z0-9_.-]+\.(exe|apk)$/.test(f.name));
      if(!target.isConnected)return;
      target.textContent = `Verzia ${release.version}. Stiahnite balík pre svoje zariadenie.`;
      for(const file of links){const link=global.document.createElement('a');link.className='button button-secondary';link.textContent=file.platform==='windows'?'Stiahnuť Windows .exe':'Stiahnuť Android .apk';link.href=releaseOrigin+'/downloads/releases/'+release.version+'/'+file.name;link.target='_blank';link.rel='noopener';target.parentElement.append(link);}
    } catch(error){if(target.isConnected)target.textContent=error.message;}
  }
  if (native?.saveFile) {
    global.document.addEventListener('click', async event => {
      const link=event.target.closest?.('a[download]');if(!link?.href?.startsWith('blob:'))return;
      event.preventDefault();
      try {const blob=await(await fetch(link.href)).blob();if(blob.size>32*1024*1024)throw Error('Súbor je väčší než 32 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});native.saveFile(link.download||'kinematika-export',data,blob.type||'application/octet-stream');}catch(error){global.KinmoDebug?.record('native-download-error',{message:error.message});alert('Export sa nepodarilo uložiť: '+error.message);}
    }, true);
  }
  global.KinmoNativeClient=Object.freeze({openDownloads});
})(globalThis);
