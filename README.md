# Kinematika Studio

Webové štúdio na tvorbu, analýzu a simuláciu rovinných mechanizmov. Rozhranie je v slovenčine a rozmery sa zadávajú v milimetroch a stupňoch.

## Spustenie

**Bez inštalácie:** otvorte `index.html` v aktuálnom Chrome, Edge alebo Firefox. Aplikácia používa klasické skripty, preto funguje aj cez `file://`. Webové fonty sú voliteľné a majú systémový fallback.

**Lokálny server, Node.js 20.11 alebo novší:**

```sh
npm run dev
```

Otvorte `http://localhost:5173`. Balíky netreba inštalovať. Server počúva iba na lokálnom rozhraní.

```sh
npm run check       # Kontrola syntaxe JavaScriptu
npm test           # Automatické testy geometrie a solvera
npm run build      # Statická aplikácia do dist/
npm run preview    # Lokálny náhľad dist/
```

Bez Node.js môžete otvoriť `tests/browser.html`. Spúšťa rovnakú sadu testov ako `npm test`. Pri lokálnom vývojovom serveri je dostupný aj na `http://localhost:5173/tests/browser.html`.

Sada obsahuje 42 testov: geometria kriviek, pevné dĺžky, pohybové limity, čap v kulise, kolízie, vlastné pohony a validácia importovaných projektov.

## GitHub a Cloudflare Workers

Cieľom je existujúci verejný repozitár [bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely) a existujúci produkčný Cloudflare Worker `kinematicke-modely`. Používateľ potvrdil nahradenie jeho produkčného nasadenia touto aplikáciou. Existujúcu Git históriu a MIT licenciu treba zachovať.

Workflow `.github/workflows/ci.yml` kontroluje syntax, spúšťa testy a zostaví aplikáciu pri pushi a pull requeste na `main`. Automatické nasadzovanie sa pripojí cez **Workers Builds** v nastaveniach existujúceho Workeru.

Nastavenia Cloudflare Workers Builds:

| Nastavenie | Hodnota |
|---|---|
| Názov Workeru | `kinematicke-modely` |
| GitHub repozitár | `bucala/Kinematicke_modely` |
| Produkčná vetva | `main` |
| Build command | `npm run check && npm test && npm run build` |
| Deploy command | `npx --yes wrangler@4 deploy --config wrangler.toml` |
| Static assets directory | `dist`, podľa `wrangler.toml` |
| Root directory | koreň repozitára |
| Node.js | `24`, podľa `.node-version` |

`wrangler.toml` viaže názov Workeru, konkrétny Cloudflare účet a priečinok statických súborov. Nie je potrebný vlastný serverový Worker skript. Build pridáva bezpečnostné HTTP hlavičky z `_headers`.

Pri manuálnom nasadení po autorizácii Wrangler spustite:

```sh
npm run deploy
```

Príkaz najprv kontroluje syntax, testuje a zostaví aplikáciu. Až potom nahradí produkčné nasadenie existujúceho Workeru. **Konfiguračné súbory samy neprepájajú Cloudflare s GitHubom.**

**Skutočný stav:** existencia GitHub repozitára bola overená, ale žiadne zmeny neboli pushnuté a Cloudflare nasadenie ani Git-integrácia neboli vykonané. Spúšťanie Gitu a Wrangler blokuje chýbajúci PowerShell. Podrobnosti sú v `DEPLOYMENT.md`.

## Funkcie

- Knižnica prvkov: pevný rám, lineárne vedenie, tiahlo, zakrivená kulisa, ložisko a sklápacie čelo.
- Pridávanie kliknutím alebo drag & drop; výber, posúvanie, prichytávanie na mriežku, zoom a meranie.
- Spájanie uzlov otočnými kĺbmi alebo väzbou čapu vo vedení.
- Inšpektor rozmerov, polohy, uhlov, ložísk, pohybových limitov a kontrolných bodov.
- Ručné ťahanie výsuvu a čela s inverzným kinematickým výpočtom.
- Automatický pohon, nastavenie rýchlosti, trvania cyklu, opakovania a presnej polohy.
- Parametrická kulisa, kruhový oblúk, kubická Bézierova krivka a Catmull–Rom spline.
- Vizualizácia troch polôh a trajektória ľubovoľného dostupného uzlového bodu.
- Živý graf pohybového profilu; kliknutím na graf sa nastaví poloha.
- Detekcia nedosiahnuteľných väzieb, nesprávneho priemeru ložiska, kríženia ramien a kolízie s korpusom.
- Späť/znova, duplikovanie, pomenovanie a viditeľnosť prvkov.
- Automatické lokálne ukladanie, zoznam projektov, validovaný import JSON.
- Export editovateľného projektu JSON, 121 vzoriek pohybu CSV a vektorového výkresu SVG.
- Responzívne rozhranie a klávesové skratky.

## Šablóny

### Výsuv s vyklápacím čelom

Východiskový korpus a vedenie majú dĺžku 390 mm, zdvih 300 mm a čelo dĺžku 160 mm. Ložisko je 65 mm od otočného čapu. Čelo zostáva vertikálne do posuvu 110 mm a následne sa plynulo vyklopí z 90° na 0°.

Pri parametrickom profile sa výrobná drážka odvodí z dráhy ložiska podľa hladkého pohybového zákona. **Pri každej polohe solver rieši priesečník tejto drážky s kružnicou, ktorej stred je otočný čap a polomer je vzdialenosť ložiska.** Pri úprave voľnej krivky sa nedosiahnuteľná poloha označí, nie maskuje presunutím ložiska mimo drážky.

### Štvorkĺbový mechanizmus

Polohy členov sa riešia analytickým priesečníkom kružníc. Dĺžky zostávajú konštantné; solver udržiava rovnakú montážnu vetvu.

### Kľukový mechanizmus

Poloha piesta sa vypočíta z pevnej dĺžky ojnice a osi priamkového vedenia.

### Vlastný mechanizmus

Pridajte pevné body, vedenia, ramená a ložiská. Nástrojom **J** vyberte dva uzly. Kliknutím na drážku a uzol sa vytvorí čap vo vedení. Ložisko sa dá na kulisu naviazať aj priamo v inšpektore.

Lineárne vedenie má riadený uzol **C**. Spojte ho so začiatkom ramena alebo čela. Na vlastnom ramene môžete zapnúť rotačný pohon; jeho začiatočný bod potom zostáva pevný. Aktivácia rotačného pohonu vypne ostatné vlastné pohony.

Vlastné uzavreté reťazce používajú iteratívnu projekciu tuhých telies. Solver nemení dĺžky ramien. Ak nedosiahne toleranciu 0,05 mm, nahlási nesplnenú väzbu. Pri zložitom alebo presne singularitnom reťazci upravte počiatočnú konfiguráciu, dĺžky alebo pevné uloženia.

Súradnice editora používajú SVG konvenciu: X rastie doprava a Y nadol. Kladný uhol otáča rameno proti smeru hodinových ručičiek.

## Skratky

| Skratka | Akcia |
|---|---|
| Medzerník | Prehrať / pozastaviť |
| V / H / J / M | Výber / posun plátna / spojenie / meranie |
| F | Prispôsobiť pohľad |
| Šípky, Shift + šípky | Posuv pohonu o 1 alebo 10 jednotiek |
| Ctrl/Cmd + S | Uložiť lokálne |
| Ctrl/Cmd + Z | Späť |
| Ctrl/Cmd + Shift + Z | Znova |
| Ctrl/Cmd + D | Duplikovať |
| Delete | Odstrániť vlastný prvok a jeho väzby |
| Esc | Zrušiť nástroj alebo zavrieť dialóg |

## Ukladanie a súkromie

Projekty zostávajú v `localStorage` aktuálneho prehliadača. Uchováva sa najviac 20 projektov a 60 krokov histórie. Pri vypnutom úložisku alebo režime súkromného prehliadania použite export JSON. Na zálohovanie a prenos je tiež potrebný export JSON.

Import akceptuje projekt verzie 1, maximálne 120 prvkov a 240 väzieb, s limitom súboru 2 MB. Rozmery, identifikátory a odkazy na uzly sa validujú. Importované názvy sa nevkladajú do HTML bez escapovania.

## Hranice simulácie

Toto je **kinematický polohový solver**, nie fyzikálna dynamika. Nepočíta sily, hmotnosť, trenie, deformácie ani životnosť ložísk. Geometrické kolízie sú vyhodnocované v jednej 2D rovine; pri ramenách ide o kríženie ich stredníc. Ramená v rôznych fyzických rovinách môžu byť v reálnom výrobku priechodné. Kontrola celého zdvihu používa 121 diskrétnych polôh a nie je zárukou kontinuálnej bezkolíznosti.

Pri blokovaní sa automatický pohon zastaví a problém sa zobrazí. Ručným pohonom môžete preskúmať aj neplatnú konfiguráciu. Riadené prvky šablón sa neodstraňujú, aby sa zachoval ich reťazec; na úplne voľnú konštrukciu použite vlastný projekt.

## Súbory

```text
index.html             Vstupný bod, funguje aj bez servera
app.js                 Editor, SVG plátno, pohon, grafy a ukladanie
engine.js              Geometria, kinematické solvery a validácia
styles.css             Responzívne rozhranie
scripts/server.mjs     Bez-závislostný lokálny HTTP server
scripts/build.mjs      Zostavenie statického dist/
tests/cases.js         Spoločná sada testov
tests/kinematics.test.mjs  Node.js test runner
tests/browser.html     Test runner priamo v prehliadači
```
