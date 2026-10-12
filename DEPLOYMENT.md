# GitHub a Cloudflare Worker

## Dohodnutý cieľ

- Existujúci verejný repozitár: [bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely).
- Produkčná vetva: `main`. Repozitár obsahuje publikovanú aplikáciu a MIT `LICENSE`; aktuálny stav treba pred každým ďalším pushom načítať Gitom.
- Existujúci Cloudflare Worker: `kinematicke-modely`.
- Cieľový účet: ten z [dodaného Cloudflare odkazu](https://dash.cloudflare.com/065e3003eb4c6bd1bffe7afa184eb5c4/workers/services/edit/kinematicke-modely/production), nastavený v `wrangler.toml`.
- Používateľ výslovne potvrdil nahradenie produkčného Workeru touto aplikáciou.
- Namiesto pôvodne zvažovaného Pages sa použijú **Workers Static Assets** a **Workers Builds** s Git-integráciou.

## Skutočný stav

**Používateľ publikoval rozšírený editor v commite `7a527f6`.** Dodané logy GitHub Actions zachytili zlyhanie testu kontrolného súčtu PDF fontov: Git previedol päť CRLF koncov riadkov súboru `vendor/pdfmake/vfs_fonts.js` na LF. Ostatných 164 testov prešlo.

Overená oprava zachováva pôvodné bajty cez `.gitattributes` a zahŕňa tento súbor do publikačného zoznamu. Izolovaný export cez Git s `core.autocrlf=input` prešiel kontrolou syntaxe, 167 JS testami, 20 Python testami a buildom. Používateľ schválil commit a push opravy do existujúceho `main`; vzdialené CI a Workers Builds treba potvrdiť po pushi. Samostatný log z Cloudflare nebol v priloženom ZIP; nižšie uvedený build aj deploy postup používa rovnaké `npm test`.

Oprava bola publikovaná v `fc04c71`; používateľ následne publikoval rozhranie v `3194075 update prostredia`. Dňa 11. 10. 2026 schválil aj commit a push Click+Select, kontextových úprav a interaktívneho README do existujúceho `main`. Aktuálne lokálne výsledky a manuálne akceptačné medzery sú v [VALIDATION.md](VALIDATION.md). Stav vzdialeného CI a Workers Builds treba overiť priamo v službách.

Click+Select a README sú publikované v `5e985fd`. Následné rozšírenie zahŕňa úchyty, diagnostiku, prichytávanie výlučne na požiadanie, vlastné podzostavy, pomenované verzie, referenčné obrysy drážok a Magic import. Dňa 11. 10. 2026 používateľ výslovne požiadal o doplnenie changelogov a README, commit a push celého rozšírenia do existujúceho `main`. Rozsah zdrojových zmien opisuje [CHANGELOG.md](CHANGELOG.md); skutočný commit a stav vetvy potvrdzuje Git.

Git, Node.js aj PowerShell sú dostupné. Lokálne kontroly, testy a build sú zaznamenané v `VALIDATION.md`. Aktuálnu konfiguráciu Workeru a Git-integrácie táto úprava nemení.

Magic import používa iba klientsky raster a existujúce povolenie `img-src blob:`; nepridáva serverový upload, sieťový endpoint ani nový binding. Preneste spolu modul, vstupné HTML, štýly, editor a aktualizované testy. Manuálny deploy cez Wrangler nie je súčasťou tohto publikovania; push môže spustiť existujúcu Git-integráciu Workers Builds. Jej úspech treba overiť samostatne.

Magic import a rozšírenie editora sú publikované v `dc24ef2`. Následné prepínače panelov/popisu, skutočná schéma v PDF a GIF export sú už zaznamenané v Gite v `6554b75`; stav produkcie sa z toho neodvodzuje. `scene-export.js` a `gif-export.js` používajú existujúce Blob obrázky a Canvas, bez uploadového endpointu či nového bindingu.

Dňa 12. 10. 2026 používateľ výslovne autorizoval **commit a push do existujúceho `main`** pre rozšírenie nad `6554b75`: jedna mierka X/Y/A–B, voliteľná detekcia 2.5, stabilné dialógy, projekty, Analýza, kontextové úpravy a inteligentné kóty. Prenášajú sa aj `magic-detection.js`, nové regresie, aplikácia/štýly, README/changelog a explicitné allowlisty. Detekcia funguje lokálne, nepridáva endpoint, externý model ani nový binding. Pravidlá Workeru a pripnuté PDF fonty sa nemenia. Manuálny deploy sa nespúšťa; push môže spustiť existujúce CI a Workers Builds, ktorých výsledok treba overiť samostatne.

Dňa 13. 10. 2026 používateľ výslovne požiadal o README/changelog a **commit/push rozšírenia nad `5e9798b` do existujúceho `main`**: spoločné prichytávanie a samostatná sieť, montážne body, rotačná vačka, obrysový import a presné krivkové časti. Predpublikačná syntax, 591 JS testov a build prešli. Natívne a offline prehliadačové dôkazy sú zo samostatného funkčného overenia 12. 10. Rozšírenie nemení Worker, bindingy, DNS, Git-integráciu ani pripnuté PDF bajty. Manuálny deploy sa nespúšťa; stav CI a Workers Builds treba po pushi overiť samostatne.

Pred ďalším publikovaním treba overiť GitHub autentifikáciu a skontrolovať diff. Pri commite sa použije už nakonfigurovaná Git identita. Ak chýba, publikovanie sa musí zastaviť, nie vymyslieť autora. Tokeny sa nevkladajú do repozitára, príkazovej histórie ani odpovede.

## Pripravené súbory

- `.node-version`: Node.js 24 pre CI a build.
- `.gitattributes`: zachovanie presných bajtov pripnutých PDF distribúcií pri pridaní do Gitu aj pri Windows / Linux checkoute.
- `.github/workflows/ci.yml`: syntax, JavaScript regresné testy, izolované Python CAD testy a zostavenie.
- `wrangler.toml`: existujúci Worker, jeho účet a `[assets]` z `dist`.
- `npm run deploy`: syntax, JavaScript testy, build a následné produkčné nasadenie cez Wrangler 4. Lokálny deploy nevyžaduje Python; CAD testy spúšťa GitHub CI.
- `_headers`: bezpečnostné hlavičky, revalidácia nezahashovaných zdrojov a jediný povolený lokálny CAD endpoint `http://127.0.0.1:8765`.
- `.gitignore`: vylúčenie lokálnych tajomstiev, Wrangler dát, závislostí a build výstupov.
- `dist/vendor/pdfmake/`: offline PDF modul, fonty a ich licencie.
- `dist/cad/KinmoFusion.zip`: vytvorený balík štyroch verejných súborov doplnku. Build nekopíruje testy, pracovné analýzy ani vzorové reporty.
- `workbench.js` a `slot-outline.js`: nové klasické offline-kompatibilné moduly. Build, serverové a publikačné allowlisty ich zahŕňajú; spoločné regresie knižnice a verzií sú v `tests/workbench-cases.js`.
- `magic-import.js`: lokálna kalibrácia a obkresľovanie; zdieľané regresie sú v `tests/magic-import-cases.js` a izolované testy načítania rastra v `tests/magic-import.test.mjs`. Modul je v produkčnom builde, testy iba v zdrojoch.
- `magic-detection.js`: ohraničené offline geometrické návrhy pre voliteľný krok 2.5. Modul patrí do buildu, serverového/cache/publikačného zoznamu; `tests/magic-detection.test.mjs` a `tests/context-menu.test.mjs` zostávajú iba zdrojové testy.
- `scene-export.js` a `gif-export.js`: lokálny štýlovaný snímok a animovaný GIF. Oba sú v build/server/cache/publikačných zoznamoch. Nezávislý `tests/gif-decoder.js` a ostatné testy nie sú produkčné assety.
- `CHANGELOG.md`, root README a história zmien v pribalenom Fusion návode: dokumentácia celého rozšírenia. Root changelog je súčasť zdrojového publikačného zoznamu, nie runtime asset aplikácie.

Konfiguračné súbory samy nepublikujú aplikáciu ani neprepájajú GitHub s Cloudflare.

Pri publikovaní tejto opravy preneste spolu `.gitattributes`, opravené Git bajty `vendor/pdfmake/vfs_fonts.js`, aktualizované testy a `push-github.ps1`. Nestačí pridať iba atribúty: publikovaný fontový blob musí opäť zodpovedať pôvodnému SHA-256 z `vendor/pdfmake/PROVENANCE.md`. Nevypínajte kontrolu súčtu a nemeňte ju na hash poškodený normalizáciou.

## PowerShell skript na push

V PowerShelli spustite:

```powershell
& 'C:\GitHub\Kinematicke_modely\push-github.ps1'
```

Skript vyžaduje Git, Node.js 20.11+ a už nastavenú Git identitu. GitHub autorizáciu používa z existujúceho Git credential managera; pri prvom pushi môže Git vyžiadať prihlásenie. Heslo ani token nevkladajte do skriptu.

Pri neúplnom `PATH` vyhľadáva Git, Node.js a npm aj v uloženom systémovom a používateľskom `PATH` a v bežných inštalačných priečinkoch. Potrebné cesty pridá iba počas behu skriptu a potom pôvodný `PATH` obnoví. Ak Git nie je nainštalovaný, nainštalujte **Git for Windows** z `git-scm.com` alebo pomocou:

```powershell
winget install --id Git.Git --exact --source winget
```

Node.js LTS sa dá nainštalovať z `nodejs.org` alebo príkazom `winget install --id OpenJS.NodeJS.LTS --exact --source winget`. Skript žiadne nástroje sám neinštaluje.

Vytvorí nový dočasný klon existujúceho `main`, zachová jeho históriu a `LICENSE` a prenesie iba explicitne uvedené súbory aplikácie. Pôvodný pracovný priečinok nemení. Kontroluje bežné formáty tajomstiev, spustí kontrolu syntaxe, testy a build. Pred commitom vypíše zmeny a vytvorí kompletný diff na kontrolu. Po kontrole zadajte **PUSH**.

Pri chýbajúcej identite, neúspešných kontrolách, zmene vzdialeného `main` alebo neočakávaných súboroch sa zastaví. Nepoužíva `--force`, nenastavuje autora a nevypína Git hooks. Dočasný klon ponechá aj po zlyhaní. Detekcia tajomstiev nie je úplná, preto vždy skontrolujte diff.

Parameter `-Yes` preskočí iba potvrdenie; nepreskočí testy, kontrolu licencie ani ochranu histórie. Skript nespravuje Cloudflare. Ak už je Workers Builds pripojený, push môže spustiť jeho nakonfigurované nasadenie.

### Spustenie z CMD

V príkazovom riadku CMD spustite:

```cmd
call "C:\GitHub\Kinematicke_modely\push-github.cmd"
```

Spúšťač vyhľadá Windows PowerShell podľa jeho úplnej systémovej cesty, prípadne PowerShell 7 v bežnom inštalačnom priečinku. Nevyžaduje `powershell.exe` v `PATH` a preskočí používateľský PowerShell profil. Používa `RemoteSigned` iba pre nový proces, nie trvalú zmenu systémovej politiky.

Ide o CMD spúšťač existujúceho `push-github.ps1`, nie o novú implementáciu pushu. Zachová všetky kontroly a vráti chybový kód PowerShell skriptu. Oba súbory musia zostať vedľa seba. Po kontrole zmien zadajte **PUSH**.

## Postup ďalšieho publikovania

1. Overiť pracovný priečinok a stav existujúcich aj netrackovaných súborov. Nezahŕňať tokeny, `.env`, kľúče ani osobné dáta.
2. Spustiť `npm run check`, `npm test` a `npm run build`. Pri zlyhaní opraviť príčinu pred publikovaním.
3. Overiť autentifikáciu a právo zapisovať do `bucala/Kinematicke_modely`.
4. Zachovať existujúcu vzdialenú históriu. Ak lokálny priečinok ešte nie je Git repozitár, naklonovať vzdialený repozitár do samostatného nového priečinka a preniesť doň iba overené zdrojové súbory aplikácie. Pôvodný pracovný priečinok ani existujúci `LICENSE` neprepisovať a nemažať. Nenahrádzať vzdialené `main` novou nesúvisiacou históriou. Pred commitom skontrolovať staged diff a status.
5. Vytvoriť commit s existujúcou Git identitou a trailerom:

   ```text
   Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
   ```

6. Pushnúť nový commit do existujúceho `main` bez `--force`. Pri súbežných vzdialených zmenách načítať a bezpečne zlúčiť aktuálny stav, nie prepisovať históriu.
7. V Cloudflare otvoriť existujúci Worker `kinematicke-modely`. Pred nahradením overiť jeho domény, trasy, bindingy a aktuálnu produkčnú verziu. Pôvodné produkčné nasadenie je potrebné identifikovať kvôli prípadnému rollbacku. Nemeniť DNS, existujúce trasy ani oprávnenia nad rámec požadovaného nasadenia.
8. V nastaveniach Workeru pripojiť **Workers Builds** ku GitHub repozitáru `bucala/Kinematicke_modely`. Pri autorizácii GitHub aplikácie povoliť iba tento repozitár a nastaviť:

   ```text
   Worker name:           kinematicke-modely
   GitHub repository:     bucala/Kinematicke_modely
   Production branch:     main
   Build command:         npm run check && npm test && npm run build
   Deploy command:        npm run deploy
   Static assets:         dist, declared in wrangler.toml
   Root directory:        repository root
   ```

9. Overiť, že build používa Node.js 24. Ak platforma nezohľadní `.node-version`, nastaviť build premennú `NODE_VERSION=24`.
   Ak je Build command prázdny, Deploy command musí zostať `npm run deploy`: ten vytvorí `dist` pred spustením Wrangleru. Samotné `npx wrangler deploy` bez buildu končí chybou chýbajúceho priečinka `dist`.
10. Spustiť produkčný build cez Workers Builds alebo po autorizácii lokálne `npm run deploy`. Pred nasadením sa musia úspešne dokončiť kontroly a testy. Použiť skutočnú URL z Cloudflare, nie hádať účet alebo `workers.dev` subdoménu.
11. Overiť načítanie HTML, JS, CSS, ikonky a fontov, simuláciu, export, bezpečnostné hlavičky a konzolu. Overiť úspešné GitHub kontroly a nové produkčné nasadenie v Cloudflare.

Pri použití Workers Builds netreba vytvárať paralelný deploy workflow ani ukladať Cloudflare API token do GitHub Actions. Autorizácia nasadenia sa spravuje v Cloudflare.
