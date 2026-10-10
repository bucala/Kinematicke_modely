# GitHub a Cloudflare Worker

## Dohodnutý cieľ

- Existujúci verejný repozitár: [bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely).
- Produkčná vetva: `main`. Repozitár obsahuje publikovanú aplikáciu a MIT `LICENSE`; aktuálny stav treba pred každým ďalším pushom načítať Gitom.
- Existujúci Cloudflare Worker: `kinematicke-modely`.
- Cieľový účet: ten z [dodaného Cloudflare odkazu](https://dash.cloudflare.com/065e3003eb4c6bd1bffe7afa184eb5c4/workers/services/edit/kinematicke-modely/production), nastavený v `wrangler.toml`.
- Používateľ výslovne potvrdil nahradenie produkčného Workeru touto aplikáciou.
- Namiesto pôvodne zvažovaného Pages sa použijú **Workers Static Assets** a **Workers Builds** s Git-integráciou.

## Skutočný stav

**Používateľ potvrdil úspešný predchádzajúci push a funkčné nasadenie.** Rozšírený editor, projekt „Dvojite sklopeny suflik“, odhadová dynamika, exporty a Fusion doplnok sú lokálne; nebol vykonaný nový commit, push ani deploy.

Git, Node.js aj PowerShell sú dostupné. Lokálne kontroly, testy a build sú zaznamenané v `VALIDATION.md`. Aktuálnu konfiguráciu Workeru a Git-integrácie táto úprava nemení.

Pred ďalším publikovaním treba overiť GitHub autentifikáciu a skontrolovať diff. Pri commite sa použije už nakonfigurovaná Git identita. Ak chýba, publikovanie sa musí zastaviť, nie vymyslieť autora. Tokeny sa nevkladajú do repozitára, príkazovej histórie ani odpovede.

## Pripravené súbory

- `.node-version`: Node.js 24 pre CI a build.
- `.github/workflows/ci.yml`: syntax, JavaScript regresné testy, izolované Python CAD testy a zostavenie.
- `wrangler.toml`: existujúci Worker, jeho účet a `[assets]` z `dist`.
- `npm run deploy`: syntax, JavaScript testy, build a následné produkčné nasadenie cez Wrangler 4. Lokálny deploy nevyžaduje Python; CAD testy spúšťa GitHub CI.
- `_headers`: bezpečnostné hlavičky, revalidácia nezahashovaných zdrojov a jediný povolený lokálny CAD endpoint `http://127.0.0.1:8765`.
- `.gitignore`: vylúčenie lokálnych tajomstiev, Wrangler dát, závislostí a build výstupov.
- `dist/vendor/pdfmake/`: offline PDF modul, fonty a ich licencie.
- `dist/cad/KinmoFusion.zip`: vytvorený balík štyroch verejných súborov doplnku. Build nekopíruje testy, pracovné analýzy ani vzorové reporty.

Konfiguračné súbory samy nepublikujú aplikáciu ani neprepájajú GitHub s Cloudflare.

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
