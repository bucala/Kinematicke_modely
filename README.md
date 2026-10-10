# Kinematika Studio

Webové štúdio na tvorbu, analýzu a simuláciu rovinných mechanizmov. Rozhranie je v slovenčine a rozmery sa zadávajú v milimetroch a stupňoch.

Pri prvom otvorení začína editor prázdny. Uložený projekt sa obnoví bez zmeny. Samostatný projekt **Dvojite sklopeny suflik** nájdete v ponuke **Projekty**, nie medzi všeobecnými šablónami.

## Spustenie

**Bez inštalácie:** otvorte `index.html` v aktuálnom Chrome, Edge alebo Firefox. Aplikácia používa klasické skripty, preto funguje aj cez `file://`. Webové fonty sú voliteľné a majú systémový fallback.

**Lokálny server, Node.js 20.11 alebo novší:**

```sh
npm run dev
```

Otvorte `http://localhost:5173`. Balíky netreba inštalovať. Server počúva iba na lokálnom rozhraní.

```sh
npm run check       # Kontrola syntaxe JavaScriptu
npm test           # Solver, editor, fyzika, exporty a CAD transport
npm run build      # Statická aplikácia do dist/
npm run preview    # Lokálny náhľad dist/
```

Bez Node.js môžete otvoriť `tests/browser.html`. Spúšťa spoločné výpočtové testy; transportné a archivačné testy bežia v Node.js. Pri lokálnom vývojovom serveri je dostupný aj na `http://localhost:5173/tests/browser.html`.

Sada pokrýva geometriu, šesť typov väzieb, editačné kópie, kóty a trajektórie, štyri pružné prvky, odhadovú dynamiku, natívne súbory, SVG/DXF/reporty a ochrany CAD transportu. Aktuálne výsledky sú v `VALIDATION.md`. Voliteľne spustite `python -B tests/test_fusion.py` s Pythonom 3.10+: izolované testy lokálneho mosta a náhradného Fusion API, bez otvorenia CAD aplikácie.

## GitHub a Cloudflare Workers

Cieľom je existujúci verejný repozitár [bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely) a existujúci produkčný Cloudflare Worker `kinematicke-modely`. Používateľ potvrdil nahradenie jeho produkčného nasadenia touto aplikáciou. Existujúcu Git históriu a MIT licenciu treba zachovať.

Workflow `.github/workflows/ci.yml` kontroluje syntax, JavaScript aj izolované Python CAD testy a zostaví aplikáciu pri pushi a pull requeste na `main`. Automatické nasadzovanie sa pripojí cez **Workers Builds** v nastaveniach existujúceho Workeru.

Nastavenia Cloudflare Workers Builds:

| Nastavenie | Hodnota |
|---|---|
| Názov Workeru | `kinematicke-modely` |
| GitHub repozitár | `bucala/Kinematicke_modely` |
| Produkčná vetva | `main` |
| Build command | `npm run check && npm test && npm run build` |
| Deploy command | `npm run deploy` |
| Static assets directory | `dist`, podľa `wrangler.toml` |
| Root directory | koreň repozitára |
| Node.js | `24`, podľa `.node-version` |

`wrangler.toml` viaže názov Workeru, konkrétny Cloudflare účet a priečinok statických súborov. Nie je potrebný vlastný serverový Worker skript. Build pridáva bezpečnostné HTTP hlavičky z `_headers`.

Pri manuálnom nasadení po autorizácii Wrangler spustite:

```sh
npm run deploy
```

Príkaz najprv kontroluje syntax, testuje a zostaví aplikáciu. Až potom nahradí produkčné nasadenie existujúceho Workeru. **Konfiguračné súbory samy neprepájajú Cloudflare s GitHubom.**

**Stav publikovania:** používateľ potvrdil funkčné predchádzajúce nasadenie. Rozšírený editor, dvojkulisový projekt, dynamika, exporty a Fusion doplnok sú zatiaľ lokálne, bez nového pushu alebo nasadenia. Podrobnosti overenia sú v `VALIDATION.md`.

## Funkcie

- Knižnica prvkov: pevný rám, lineárne vedenie, tiahlo, kulisa, ložisko, čelo, tlačná/ťažná pružina a tlačný/ťažný piest.
- Pridávanie kliknutím alebo drag & drop; výber, posúvanie, prichytávanie na mriežku, zoom a meranie.
- Otočný kĺb, čap vo vedení, pevné spojenie, vzdialenosť, rovnobežnosť a relatívny uhol; upraviteľný názov, uzly a hodnota.
- Inšpektor rozmerov, polohy, uhlov, ložísk, pohybových limitov a kontrolných bodov.
- Ručné ťahanie výsuvu a čela s inverzným kinematickým výpočtom.
- Automatický pohon, nastavenie rýchlosti, trvania cyklu, opakovania a presnej polohy.
- Parametrická kulisa, oblúk, Bézierova krivka, spline a polyline; editovateľné vrcholy, nosné teleso a polygonálny obrys.
- Vizualizácia troch polôh a trajektória ľubovoľného dostupného uzlového bodu.
- Živý graf pohybového profilu; kliknutím na graf sa nastaví poloha.
- Detekcia nedosiahnuteľných väzieb, nesprávneho priemeru ložiska, kríženia ramien a kolízie s korpusom.
- Späť/znova, duplikovanie, pomenovanie a viditeľnosť prvkov.
- Oddelená úprava geometrie a simulácia; samostatná voľná kópia ponechá parametrický originál nezmenený.
- Uložené referenčné a riadiace kóty, pomenované trajektórie a prevod platnej vypočítanej trajektórie na nezávislú vodiacu krivku.
- Sily pružín/piestov, hmotnosť, ťažisko, zotrvačnosť, gravitácia, tlmenie, trenie a jeden vonkajší pohon; odhadová dynamika.
- Automatické lokálne ukladanie, zoznam projektov, validovaný import `.kinmo` aj staršieho JSON.
- Export `.kinmo`, JSON, CSV, SVG v mm, PNG, DXF a lokálne vytvoreného PDF/HTML reportu.
- Tri trvalé vzhľady: biela/čierna, sivá/oranžová a tmavosivá/biela.
- Voliteľný lokálny doplnok Autodesk Fusion na vytvorenie nového referenčného dokumentu.
- Samostatný dvojkulisový projekt podľa náčrtu, obe trajektórie v sústave korpusu alebo zásuvky a viditeľné odhadové predpoklady.
- Responzívne rozhranie a klávesové skratky.

## Samostatný projekt: Dvojite sklopeny suflik

Otvorte **Projekty → Dvojite sklopeny suflik**. Obe zakrivené kulisy sa posúvajú so zásuvkou. Modré rameno má pevnú dĺžku a ložiská A/B pevný rozstup. Model najprv sklopí čelo z 90° na odhadových 65° počas 60 mm zdvihu, potom pokračuje spoločným posuvom do 300 mm bez zmeny uhlov.

Trajektórie zobrazujú oba vodiace body. V sústave zásuvky ležia v jej kulisách a po sklopení sa už nepredlžujú; v sústave korpusu zahŕňajú aj posuv. Graf obsahuje uhol čela aj ramena. CSV export pridáva obe ložiská v oboch sústavách, uhol ramena, fázu a označenie odhadových rozmerov.

**Geometria je odhadová, nie výrobný výkres.** Zadná opora, plynulé uvoľnenie čapu a pevný výrez stola sú doplnené predpoklady, nie zmerané detaily. Rozmery aj oba profily možno upraviť v inšpektore; nezlučiteľné kulisy vyvolajú blokovanie. Každé otvorenie pripraveného projektu vytvorí nový exemplár a neprepíše predchádzajúce úpravy.

Podrobný rozbor a pôvodný náčrt: [`projects/dvojite-sklopeny-suflik.md`](projects/dvojite-sklopeny-suflik.md). V aplikácii ich otvoríte cez **Odhadové rozmery · predpoklady**.

## Šablóny mechanizmov

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

## Voľná editácia a kóty

**Úprava geometrie** ponechá navrhnuté polohy bez nútenia väzieb. **Simulácia** vynúti väzby; nekompatibilitu označí. Počas ťahania sa potlačí výber textu iba na pracovnej ploche a počas zachyteného presunu; vstupné polia zostávajú editovateľné.

Parametrickú šablónu zmeníte bez obmedzení cez **Voľná kópia**. Originál zostane samostatne uložený. Kópia dvojkulisovej zásuvky zachová aktuálnu geometriu a presné profily, **nepreberá však predpísanú funkciu zadnej opory/západky**. Má jednu ďalšiu voľnú súradnicu; pred odhadovou dynamikou treba skutočne doplniť vhodné uloženie.

V inšpektore upravíte obrys, vrcholy krivky, nosné teleso, kóty a uložené trajektórie. Meranie vytvorí referenčnú kótu. Riadiaca dĺžka mení člen alebo vytvorí vzdialenostnú väzbu. Vypočítaná trajektória nie je sama vodiaca väzba; jej prevedená krivka je nezávislá kópia.

## Pružiny, piesty a odhadová dynamika

Pridajte pružný prvok a nastavte montážne body A/B v inšpektore. Zadajte minimálnu, maximálnu a voľnú dĺžku, priemer, silu alebo tuhosť, predpätie a osové tlmenie. Piest má aj priemer tyče a pomer progresie 1–3. **F je v N, k v N/mm, osové tlmenie v N·s/m, hmotnosť v kg a zotrvačnosť v kg·m².**

- Tlačná pružina: $F = k \max(0, L_0-L)$.
- Ťažná pružina: $F = -(F_0+k(L-L_0))$ pri $L \ge L_0$, inak nulová sila.
- Tlačný piest rozťahuje, ťažný sťahuje; voliteľná lineárna progresia a osové tlmenie.
- Hodnota F pružiny je sila pri pracovnej hranici. Pri explicitnej tuhosti rozhoduje k; F je len referenčný údaj.

V **Nastaveniach** vyberte odhadovú dynamiku a nastavte gravitáciu, tlmenie, trenie, počiatočnú rýchlosť, vonkajšiu silu/moment a trvanie. Hmotnosť, ťažisko a zotrvačnosť patria jednotlivým telesám. Práca síl sa premieta do **jednej nezávislej súradnice** numerickými deriváciami polôh. Zobrazuje sa aj vyrovnávacia sila N alebo moment N·m a časový záznam.

Solver odmietne chýbajúci pohon, neurčené voľné členy, singularitu a nepoužiteľnú hmotnosť. Na doraze, pri neplatnej geometrii alebo pracovnej dĺžke sa zastaví bez modelu nárazu či odrazu. Podrobné limity platia nižšie.

Pružiny a piesty sa počítajú ako bezhmotnostné silové členy. Ich vlastnú hmotnosť pridajte k príslušnému nosnému telesu.

Katalógové príklady a zdroje sú v inšpektore pružných prvkov: Gutekunst D-001 a RZ-001I. Predpätie RZ-001I je odvodené, nie samostatne overené. Plynová vzpera 400 N je **modelový príklad, nie identifikovaný katalógový výrobok**. Výber a montáž overte u výrobcu.

## Vzhľady, súbory a reporty

V **Nastaveniach → Vzhľad aplikácie** vyberte bielu/čiernu, sivú/oranžovú alebo tmavosivú/bielu. Nastavenia sa uchovajú lokálne. Mechanické farby členov a upozornení si zachovávajú význam vo všetkých vzhľadoch.

**Exportovať** ponúka:

| Formát | Obsah |
|---|---|
| `.kinmo` | Geometria, väzby, kóty, trajektórie, fyzika, odhadový pôvod, vzhľad, editačný režim a aktuálna poloha |
| JSON | Starší projekt verzie 1, bez pracovného vzhľadu a polohy |
| SVG | Referenčný výkres s fyzickými rozmermi v mm, kótami a trajektóriami |
| PNG | Aktuálny pohľad pracovnej plochy, najviac 2 000 × 4 000 px so zachovaním pomeru strán |
| DXF | Referenčné polylines/kružnice/popisy v mm, os Y otočená na CAD konvenciu |
| PDF / HTML | Vektorový výkres, grafy, aktívne rozmery, väzby, fyzikálne parametre a tabuľky polôh |
| CSV | Kinematické polohy alebo sily a posledný časový záznam odhadovej dynamiky |

PDF funguje offline; modul sa načíta lokálne až pri exporte. HTML report je samostatný a vhodný na tlač. Krivky vo výkresoch sú strednice a kóty referenčné, nie hotové výrobné kontúry.

## Autodesk Fusion

Otvorte **Exportovať → Autodesk Fusion**, stiahnite ZIP a doplnok spustite ručne vo Fusion. Povoľte presný pôvod aplikácie, vložte dočasný kľúč, overte spojenie, označte súhlas a odošlite výkres. Kľúč sa neukladá.

Doplnok počúva len na `127.0.0.1:8765`. Vytvorí **nový, neuložený referenčný dokument** s fixovanými 2D krivkami; existujúce návrhy nemení ani neukladá. Nevytvára 3D zostavu ani Fusion joints. Priame spojenie potrebuje HTTP(S), nie `file://`; alternatíva je DXF. Limit je 2 MB / 2 000 entít / 30 000 bodov. Po práci doplnok zastavte.

Podrobný postup a obmedzenia sú v [`cad/KinmoFusion/README.md`](cad/KinmoFusion/README.md). Skutočný import v živom Fusion zostáva manuálnym akceptačným testom.

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

Projekty zostávajú v `localStorage` aktuálneho prehliadača. Uchováva sa najviac 20 projektov a 60 krokov histórie. Na zálohovanie a prenos použite `.kinmo`, najmä pri vypnutom úložisku alebo súkromnom prehliadaní. CSV ani report nenahrádzajú natívny projekt.

Import akceptuje `.kinmo` obálku verzie 2 alebo starší projekt verzie 1: najviac 120 prvkov, 240 väzieb, 120 kót a 60 trajektórií, limit súboru 2 MB. Obrysy majú 3–64 vrcholov a polyline 2–1 001. Validujú sa jednotky, rozsahy, odkazy, cykly nosných telies a fyzikálne parametre. Importované názvy sa escapujú.

Export `.kinmo` aj JSON používa kompaktný zápis a rovnaký limit 2 MB. Príliš veľký projekt odmietne namiesto vytvorenia zálohy, ktorú nemožno znova importovať.

Exporty neopúšťajú zariadenie. Pri explicitnom CAD odoslaní ide geometria do lokálneho doplnku. Aplikácia nepoužíva cloudové CAD prihlasovacie údaje a sama CAD dokument nesynchronizuje; vlastné ukladanie/synchronizáciu Fusion riadi používateľ.

## Hranice simulácie

Kinematika je polohový solver. Voliteľná dynamika je **odhad jedného pohonu**, nie všeobecná viacstupňová fyzika, pevnostný výpočet či overenie výrobku. Nezahŕňa kontaktné reakcie, pružné deformácie tuhých telies, nárazy, funkciu západky, teplotu plynu ani životnosť ložísk.

Geometrické kolízie sa vyhodnocujú v jednej 2D rovine; pri ramenách ide o kríženie stredníc. Vlastné polygonálne obrysy slúžia na kreslenie/CAD, nie na všeobecnú kontaktnú fyziku. Ramená v rôznych rovinách môžu byť v skutočnom výrobku priechodné. 121 diskrétnych polôh nezaručuje kontinuálnu bezkolízovosť.

Predpísané uvoľnenie opory dvojkulisového projektu **nie je dynamicky overené**. Jeho voľná kópia potrebuje doplniť chýbajúce uloženie; pripojenie pružiny samo neodstráni neurčený stupeň voľnosti.

Pri blokovaní sa pohon zastaví a problém sa zobrazí. Ručným pohonom možno preskúmať aj neplatnú konfiguráciu. Riadené členy šablón zostávajú chránené; na ľubovoľnú zmenu použite samostatnú voľnú kópiu.

## Súbory

```text
index.html             Vstupný bod, funguje aj bez servera
app.js                 Editor, SVG plátno, pohon, grafy a ukladanie
engine.js              Geometria, kinematické solvery a validácia
double-drawer.js       Samostatný odhadový dvojkulisový projekt
editor.js              Návrhové polohy, voľné kópie, kóty a analýza voľnosti
physics.js             Osové sily a odhadová dynamika jedného pohonu
exports.js             .kinmo, SVG, DXF, CSV a PDF/HTML reporty
cad.js                 Výslovný prenos do lokálneho Fusion doplnku
cad/KinmoFusion/       Doplnok, transport a návod
vendor/pdfmake/        Offline PDF modul a licencie MIT / SIL OFL
projects/              Referenčný náčrt a rozbor projektu
styles.css             Responzívne rozhranie
scripts/server.mjs     Bez-závislostný lokálny HTTP server
scripts/build.mjs      Zostavenie statického dist/
scripts/archive.mjs    Deterministický ZIP doplnku
tests/cases.js         Spoločná sada testov
tests/kinematics.test.mjs  Node.js test runner
tests/export-integration.test.mjs  Transport, ZIP a offline PDF distribúcia
tests/test_fusion.py   Izolovaný most a náhradné Fusion API
tests/browser.html     Test runner priamo v prehliadači
```
