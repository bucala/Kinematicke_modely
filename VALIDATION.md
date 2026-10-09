# Stav overenia

## Pripravené kontroly

- `npm run check`: kontrola syntaxe aplikácie, solvera, pomocných skriptov a testov.
- `npm test`: 42 regresných testov solvera a validácie projektov.
- `tests/browser.html`: rovnakých 42 testov, priamo v prehliadači bez Node.js.
- `npm run build`: skopírovanie statických súborov do `dist/`.

## Overenie v tomto pracovnom prostredí

Zdrojové súbory, vstupný HTML dokument, odkazy na skripty, výpočtové väzby a testovacie prípady boli skontrolované čítaním zdrojového kódu.

Pokusy o `npm test`, `npm run check`, `npm run build` a overenie stavu Gitu sa skončili **pred spustením príslušného nástroja**. Prostredie hlási:

```text
No Windows PowerShell executable is available in PATH.
Tried: pwsh.exe, powershell.exe.
```

Preto nemáme potvrdené výsledky automatických testov, zostavenia ani vizuálneho a interaktívneho overenia v prehliadači. Nejde o zaznamenané zlyhanie testov solvera, ale o chýbajúci spúšťací nástroj prostredia.

## Publikovanie

Verejný náhľad `bucala/Kinematicke_modely` bol načítaný a overená bola existencia vetvy `main`, počiatočnej histórie a MIT licencie. Nebol vykonaný commit ani push.

Konfigurácia bola zmenená na používateľom potvrdený produkčný Worker `kinematicke-modely`. `wrangler.toml`, build/deploy príkazy a dokumentácia boli skontrolované čítaním zdrojov. Konfigurácia existujúceho Workeru, Git-integrácia, Wrangler autorizácia, produkčné nasadenie a verejná URL zatiaľ neboli overené.

## PowerShell skript

`push-github.ps1` bol skontrolovaný čítaním zdrojov: používa nový klon existujúceho `main`, explicitný zoznam súborov, zachováva licenciu aj pôvodný pracovný priečinok, kontroluje výsledky príkazov a pred pushom vyžaduje úspešné testy. Nenastavuje Git identitu, nepoužíva force push ani vypínanie hooks.

Pokus o syntaktickú kontrolu cez PowerShell parser bol zablokovaný rovnakým chýbajúcim PowerShellom. Skript preto nebol syntakticky potvrdený parserom ani spustený. Pred použitím je potrebný funkčný PowerShell 5.1+ a existujúca GitHub autorizácia.

`push-github.cmd` je CMD spúšťač toho istého PowerShell skriptu. Úplné cesty, úvodzovky, vyhľadanie spúšťacieho súboru a prenos chybového kódu boli skontrolované čítaním zdrojov. V tomto prostredí nebol spustený.

## Zostávajúce overenie

1. V funkčnom termináli s Node.js 20.11+ spustiť `npm run check`, `npm test` a `npm run build`.
2. Otvoriť `index.html` alebo spustiť `npm run dev`.
3. Overiť ručné ťahanie čela a výsuvu, animáciu a tri prednastavené polohy.
4. Upraviť rozmer čela, priemer ložiska a profil kulisy; overiť aktualizáciu geometrie a indikáciu blokovania.
5. Pretiahnuť vlastné prvky, spojiť uzly a zapnúť vlastný lineárny alebo rotačný pohon.
6. Overiť uloženie, obnovenie po načítaní stránky, import JSON a export JSON/CSV/SVG.
7. Overiť rozloženie pri desktopovej aj mobilnej šírke.
