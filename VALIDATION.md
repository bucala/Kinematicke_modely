# Stav overenia

Aktualizované 11. 10. 2026 pre verziu 2.0.0.

## Lokálne kontroly

Prostredie má funkčný PowerShell, Node.js 24.15.0 a Python dodaný s lokálne nainštalovaným Fusion. Pôvodné analytické šablóny a samostatný projekt „Dvojite sklopeny suflik“ zostávajú zachované. Voľná editácia vytvára nezávislé kópie.

- `npm run check`: úspešná kontrola syntaxe aplikácie, modelov, editora, fyziky, exportov, CAD transportu, servera, buildu a JavaScriptových testov.
- `npm test`: **266 úspešných JavaScriptových testov, 0 zlyhaní**. Z toho 208 zdieľaných modelových prípadov, 17 Node integračných prípadov a 41 UI kontrolérskych/regresných prípadov.
- `python -B -m unittest discover -s tests -p test_fusion.py -v`: **20 úspešných testov, 0 zlyhaní**. Izolovaný lokálny transport, validácia, úlohy, ZIP a mock Fusion API, bez zásahu do bežiaceho Fusion. Predchádzajúca cesta k Fusion Pythonu už neexistovala; testy úspešne prešli cez aktuálne nainštalovaný interpreter.
- `tests/browser.html`: **208 / 208 úspešných testov** v zabudovanom Chromium, samostatne cez HTTP aj `file://`, vrátane nových modelových operácií.
- `npm run build`: úspešné vytvorenie `dist/`, vrátane nových modulov, lokálnych PDF assetov, referenčného náčrtu a balíka `cad/KinmoFusion.zip`.
- Devätnásť statických súborov zostavenia sa byte-for-byte zhoduje so zdrojmi, vrátane `interaction.js` a `context-menu.js`. ZIP sa zhoduje s deterministickým generátorom; Python preveril obsah a CRC.
- Zdrojový aj zostavený lokálny server servujú verejné moduly, PDF assety a ZIP s `nosniff`. Nesprístupňujú `.git/`, `.analysis/`, `tmp/` ani Python zdroje doplnku. Zostavený náhľad nesprístupňuje browser testy.
- `git diff --check`: bez chýb whitespace; Git upozorňuje len na lokálne LF → CRLF prevody.
- `push-github.ps1`: syntakticky overený PowerShell parserom; tento pomocný publikačný skript sa nespustil.

### Predpublikačná kontrola a interaktívne README, 11. 10. 2026

Po dokončení README sa znovu spustili `npm run check`, **266 JavaScriptových testov**, **20 izolovaných Python testov** a `npm run build`; všetky prešli. Prehliadačové výsledky 208 / 208 a 46 / 46 desktop / mobil pochádzajú z overenia Click+Select z 10. 10. 2026 a pri dokumentačnej úprave sa neopakovali. Nové PDF ani živý Fusion import sa nevykonali.

README obsahuje klikateľnú navigáciu, dve praktické úvodné úlohy, **20 rozbaľovacích návodov**, FAQ, ovládanie a odkazy na overenie/nasadenie. Lokálna kontrola preverila **42 relatívnych odkazov a 18 jedinečných kotiev**, uzavretie návodov a blokov kódu, SVG XML a neprítomnosť skriptov a externých zdrojov v ilustrácii. Ide o kontrolu zdrojovej štruktúry, nie o tvrdenie o snímke alebo preklikaní README na GitHube.

`docs/readme-overview.svg` je statická ilustračná schéma, nie snímka aplikácie. Je zahrnutá aj v explicitnom publikačnom zozname. Root README a návod priložený k Fusion doplnku vysvetľujú import existujúceho doplnku zo zariadenia, nie vytvorenie prázdnej šablóny. PowerShell parser aj `git diff --check` prešli; kontrola bežných formátov tajomstiev nenašla zhodu.

### Oprava zlyhania CI po publikovaní

Dodané logy pre commit `7a527f6` ukazujú 164 úspešných testov a jeden neúspešný: SHA-256 offline PDF fontov. Lokálny pôvodný súbor má 830 090 bajtov a päť CRLF koncov riadkov; publikovaný Git blob mal 830 085 bajtov a LF. Po odhliadnutí od koncov riadkov sú obsahovo totožné.

`.gitattributes` teraz vypína konverziu koncov riadkov iba pre dve pripnuté PDF distribúcie. Fontový blob sa vracia k pôvodným bajtom; pôvodné očakávané hash hodnoty sa nemenia. Nové regresné overenie v dočasných Git repozitároch kontroluje staging aj checkout pri `core.autocrlf=true`, `input` a `false`. Druhý test kontroluje prítomnosť atribútov v publikačnom zozname.

Rovnaký sled ako v CI prešiel na izolovanom exporte pracovných zmien cez Git index s `core.autocrlf=input`: syntax, **167 JS / 20 Python testov** a statický build. Fonty mali pôvodný kontrolný súčet v indexe, exporte aj `dist`. Ide o lokálnu reprodukciu Git normalizácie, nie tvrdenie o novom vzdialenom behu Ubuntu alebo Cloudflare. Prehliadačové a PDF kontroly nižšie sú výsledky predchádzajúceho overenia nezmenenej aplikácie; pri tejto oprave koncov riadkov sa neopakovali.

### Predchádzajúce úpravy rozhrania

Nasledujúce kontroly panelu, projektovej ponuky a palety pochádzajú z predchádzajúcej úpravy rozhrania, uloženej používateľom v `3194075`. Aktuálne overenie Click+Select je samostatne uvedené nižšie.

Nová sada `tests/ui.test.mjs` vykonáva skutočné privátne funkcie aplikácie v izolovanom VM, s náhradami renderovania a DOM. Kontroluje skrytý panel, ručné otváranie, správanie výberu pri 393/1440 px, návrat fokusu, jediný vstup k projektom, zachovanie šablón, výber textu, Ctrl+A/Meta+A a kompatibilné identifikátory palety. Nenahrádza skutočný prehliadač.

Aktuálne rozhranie bolo samostatne overené v pridelenej Chromium karte: zdroj cez HTTP a finálne `dist/index.html` cez `file://`, na **1 440 × 900** aj **393 × 852**. Kontrolované boli DOM, skutočné vypočítané CSS, rozmery a obsluha udalostí, nie snímky obrazovky:

- Vlastnosti sú skryté pri štarte a načítaní projektu. Výber geometrie, pridanie prvku ani analýza ich neotvoria. Ručné otvorenie, krížik a Escape mimo poľa fungujú; explicitne otvorený panel počas výberu zostáva otvorený.
- V hlavnom rozhraní otvára kombinovanú ponuku iba hlavička. Obsahuje všetky štyri šablóny, samostatnú zásuvku, uložené projekty, import a premenovanie. Mobilný vstup zostáva viditeľný aj s dlhým názvom; dialóg a panel sa zmestia bez horizontálneho pretekania.
- Všetky tri témy sa aplikovali a zapísali do pamäťových preferencií. Krémová téma používa `#F4F3EE`, `#FFFFFF`, `#C15F3C`, `#B1ADA1`; graf sleduje akcent. Teplá tmavá téma používa tmavé plochy a svetlý čitateľný text.
- Hlavička, dialógy a needitovateľné značky majú `user-select: none`. Dokument blokuje `selectstart` a Ctrl+A mimo polí. Skutočné textové pole umožňuje výber cez `input.select()` a syntetické Ctrl+A nie je blokované; vnorený editovateľný aj needitovateľný obsah a formulárové polia zachovávajú správne výnimky.
- Canvas výber bol kontrolovaný syntetickými pointer udalosťami s dočasnou náhradou pointer capture, ktorá sa hneď obnovila. Nie je to úplné natívne ťahanie. Chyby v selektoroch QA skriptu sa opravili; finálne kontroly aplikácie nezaznamenali JavaScriptové chyby.

Finálna syntax, **181 JS testov**, build, zhoda všetkých 17 assetov, deterministický ZIP a parser publikačného skriptu prešli. Publikačný skript sa nespustil. PDF dokumenty ani živý Fusion sa pri tejto úprave UI znovu neoverovali.

### Click+Select a kontextové operácie

Nové modelové prípady vykonávajú skutočné atómové operácie, nie zmenu názvu v ponuke. Pokrývajú samostatné body, sedem typov väzieb, skutočný posuvný kĺb, fixáciu, čistenie závislých odkazov, súradnice, skupinové transformácie, pohon/pivot, pasívne limity, delenie, POI a podzostavy. Regresie kontrolujú aj fixáciu v aktuálnej simulačnej polohe, zastavený vozík C, poradie referencií posuvného kĺbu, vnorené nosiče, nulovú rýchlosť, natívny round-trip a nedotknuté primárne prvky šablóny.

`tests/ui.test.mjs` teraz obsahuje **41** prípadov so skutočnými funkciami aplikácie v izolovanom VM. Overuje centrálny výber bodu/telesa/kĺbu, modifikátory, pravý klik, atómové formuláre, odstránenie, výber pri Späť/znova, klávesnicu, prah ťahania, skupinový posun a jeho zrušenie. Zrušenie pri plnej 60-krokovej histórii zachová všetky predchádzajúce snímky. Explicitné `v`/`ω`, záporný smer, nulová rýchlosť, násobič prehrávania a dorazy sa kontrolujú deterministickými časovými krokmi; nejde o potvrdenie prirodzeného časovania prehliadača.

V skutočnej pridelenej Chromium karte prešlo **33 základných + 13 hraničných kontrol**, samostatne:

| Aplikácia | Viewport | Výsledok |
|---|---|---|
| Zdroj cez HTTP | 1 440 × 900 | 46 / 46 |
| Finálny `dist/index.html` cez `file://` | 393 × 852 | 46 / 46 |

Kontroly používali skutočné dialógy, import cez `File`/`DataTransfer` a exportované Blob dáta znovu načítané natívnym parserom. Zahŕňali:

- Click, Shift/Ctrl multiselect, Escape, potlačenie systémovej ponuky a klávesnicový fokus vlastnej ponuky.
- Fixáciu a F, súradnice so Z = 0, vytvorenie/zmenu/uvoľnenie väzby, priame vedenie a pasívne dorazy.
- Lineárny motor a rotačný motor okolo B s jedným vstupom; explicitná nula zostáva nulou aj po opätovnom otvorení formulára.
- Pridanie bodu/Ground, POI s uloženou trajektóriou, vlastnosti a farbu členu, delenie, odstránenie a Späť, vloženie podzostavy.
- Samostatný výber a odstránenie kĺbu bez odstránenia telies, zachovanie limitov a orientácie pri obrátenom poradí posuvnej väzby.
- Chránenú šablónu a samostatnú voľnú kópiu, manuálne skryté Vlastnosti, ponuku vo viewportoch a jej zatvorenie pri zoomovaní, posune alebo kliknutí mimo.

Pointer udalosti sú **syntetické**, s dočasnou náhradou pointer capture iba na čas konkrétneho gesta. Náhrada sa obnovila, `requestAnimationFrame` zostal natívny a neboli zaznamenané JavaScriptové chyby aplikácie. Tieto kontroly nepredstavujú úplné natívne ťahanie ani vizuálnu kontrolu snímok obrazovky.

Finálna syntax, **266 JS / 20 Python testov**, build, zhoda všetkých **19** assetov, ZIP, serverové allowlisty a parser publikačného skriptu prešli. Nové SVG farby sú ohraničené na bezpečný šesťmiestny hex kód; neplatná farba sa do atribútu neprenesie. PDF definície a distribúcie prešli regresiami, nové PDF ukážky sa pri tejto zmene nevytvárali. Živý Fusion ani vzdialené nasadenie sa neoverovali.

Na konci sa odstránila iba vlastná registrácia pamäťového QA úložiska a zmena viewportu. Nové načítanie potvrdilo natívny Storage, `requestAnimationFrame` a pointer capture bez QA globálnych premenných. Oba vlastné lokálne servery boli zastavené; karta zostala na offline zostavenej aplikácii.

Pokrytie zahŕňa:

- Pôvodné šablóny a 1 001 polôh dvojkulisového projektu, pevnú dĺžku ramena, držiak a rozstup ložísk, pohyblivé kulisy, nadväzujúce fázy, nekompatibilné rozmery a inverzné ťahanie.
- Nezávislé editačné kópie, sedem typov väzieb, miestne súradnice, telesá s nosičom, obrysy, riadiace kóty, trajektórie a kontrolu zostávajúcej voľnosti. Jednostranný doraz sa nezapočíta ako rovnostná väzba a nezakryje neurčený model.
- Štyri typy pružných prvkov, montáž, osové sily, účinky gravitácie, hmotnosti a tlmenia, jednotky, singularity, dorazy a časové obmedzenia odhadovej dynamiky.
- `.kinmo`, starší JSON a preferencie. Kompaktný export oboch projektových formátov odmietne súbor nad 2 MB, rovnako ako import; test obsahuje husté profily.
- SVG v mm, DXF jednotky a vrstvy, CSV, reporty, aktuálne osové sily, montážne body, priemery, predpätie, tlmenie, aktívne parametre, prerušenie blokovaných grafov a skutočný čas na osi dynamiky.
- CAD časové limity, odmietnutie redirectu a chýb autorizácie, pôvod, limity payloadu, jednu čakajúcu úlohu, hlavné Fusion vlákno, nový dokument a mm → cm prevod.
- Kontrolné súčty pripnutých PDF assetov, licencie, manifest doplnku a produkčnú CSP politiku.

## Predchádzajúce interaktívne overenie

Overené v pridelenej karte zabudovaného Chromium na izolovaných lokálnych adresách, nie v produkčnej aplikácii. `agent-browser` CLI nie je dostupné; použitý bol lokálny CDP pomocník. Zápis projektov a preferencií počas QA smeroval do dočasného pamäťového úložiska. Sťahovania boli zachytené ako lokálne Blob dáta, nie tvrdením o súboroch uložených cez bežný download dialóg.

Tento zoznam zachováva predchádzajúce overenie ostatných funkcií a exportov. Nie je tvrdením, že všetky uvedené PDF/PNG či silové scenáre boli znovu vykonané pri Click+Select.

- Prvé otvorenie na novej lokálnej adrese zobrazí prázdny editor, bez automaticky spusteného modelu.
- Katalóg, náčrt, polohy 0 / 60 / 300 mm a uhly 90° / 65° / 65°, obe fázy, obidve trajektórie a pevná / zásuvková sústava.
- Zmena rozmerov, odmietnutie neplatného rozmeru, blokovaná kulisa, späť / znova, oddelené projekty a správanie nedostupného úložiska.
- Editačný / simulačný režim, ponuka šiestich väzieb, pomenovaná trajektória a obrys. Aktuálne potlačenie výberu textu pokrýva celé rozhranie s výnimkami pre polia; syntetické pointer kontroly nenahrádzajú úplné natívne ťahanie.
- Montáž a parametre pružných prvkov, osové sily, graf a ovládanie odhadovej dynamiky.
- Všetky tri vzhľady sa aplikovali a zapísali do pamäťových preferencií. Zostavená aplikácia obnovila z `.kinmo` názov, polohu 70°, vzhľad, vypnutú mriežku a editačný režim.
- Export `.kinmo`, staršieho JSON, oboch CSV, samostatného reportu, milimetrového SVG a DXF. Zachytené projektové dáta prešli opätovným parserom.
- PDF knižnice nie sú načítané vopred. PDF z finálneho zostaveného rozhrania mal **38 620 bajtov** a platný podpis `%PDF-1.3`, bez JavaScriptových chýb.
- PNG z finálneho zostaveného rozhrania mal platný podpis a rozmer **2 000 × 2 387 px**. Pri vysokej pracovnej ploche mal **1 292 × 4 000 px**; limit aj pomer strán boli zachované. Farby a fontové vlastnosti všetkých troch textových značiek testovacej scény sa zhodovali s pracovnou plochou.
- Desktop **1 440 × 900** aj mobil **393 × 852**: bez horizontálneho pretekania. Ovládanie režimov sa neprekrýva; exportný aj Fusion dialóg sa zmestili do viewportu.
- Fusion dialóg obsahuje sťahovanie doplnku, heslové pole, neoznačený súhlas a upozornenie na nový referenčný dokument. Párovací kľúč sa neukladal. Žiadne odoslanie do živého Fusion sa nevykonalo.
- Natívne udalosti myši pri skoršej kontrole posunuli výsuv z 0 na 90 mm; úplná sekvencia ťahania skončila timeoutom.
- Po uvedených finálnych DOM a exportných kontrolách neboli zaznamenané JavaScriptové chyby aplikácie.

## Predchádzajúce PDF dokumenty

Finálne lokálne ukážky boli vytvorené, otvorené PDF parserom a vizuálne prezreté:

| Dokument | Bajty | Strany | Vektorové cesty |
| --- | ---: | ---: | ---: |
| `outputs/mechanism-report.pdf` | 49 147 | 4 | 1 042 |
| `outputs/force-report.pdf` | 39 821 | 4 | 772 |

Oba majú platný PDF podpis, vyberateľný slovenský text, vektorovú kresbu a grafy. Silový report obsahuje časové dáta, montáž, priemer drôtu, tlmenie a lokalizované kóty. Nadpis nastavení simulácie zostáva spolu s tabuľkou; nejde o obrázok celej stránky. Ukážky sú lokálne ignorované výstupy, nie produkčné assety.

### Obmedzenie prehliadača

Zabudovaná karta v tomto prostredí pri prirodzenej sonde nedoručila `requestAnimationFrame` callbacks: počas 700 ms bolo doručených 0 snímok. **Nie je potvrdené prirodzené časovanie ani plynulosť animácie.** Pri neskoršej syntetickej kontrole deviatich callbacks sa dynamický testovací vozík posunul z 0 na 32,3 mm a aktualizoval graf bez chýb. To potvrdzuje prepojenie ovládania s integrátorom, nie reálne časovanie prehliadača.

`Page.captureScreenshot` skončil timeoutom aj po aktivácii lokálnej stránky. Kompletné snímky desktopového a mobilného rozhrania preto neboli overené. Rozloženie bolo kontrolované cez DOM a rozmery prvkov. Generovaný PNG mechanizmu a prezreté PDF dokumenty sú samostatné úspešné kontroly, nie náhrada snímky rozhrania.

Dočasné pamäťové úložisko, syntetické frame callbacks a zmena viewportu boli na konci odstránené. Bolo potvrdené obnovenie natívneho Storage aj `requestAnimationFrame`; karta zostala otvorená na lokálnej aplikácii.

## Manuálne akceptačné kontroly

Na bežnom Chrome/Edge zostáva skontrolovať plynulosť prehrávania a úplné natívne ťahanie telies, bodov a čela, vrátane zrušenia ťahania a absencie výberu textu. V živom Autodesk Fusion treba ručne nainštalovať doplnok, spárovať ho a výslovne potvrdiť vytvorenie nového dokumentu. Mock testy nenahrádzajú tento CAD akceptačný test.

Dynamika je odhad jedného nezávislého pohonu; silové členy sú bezhmotnostné. Nepočítajú sa kontaktné reakcie, pevnosť ani náraz. Voľná kópia dvojkulisového projektu má jednu dodatočnú voľnú súradnicu a neobsahuje pôvodné predpísané uvoľnenie zadnej opory. Rozhranie na to upozorňuje; pružina sama túto chýbajúcu väzbu nenahrádza.

## Publikovanie

Používateľ publikoval rozšírenie v commite `7a527f6` a dodal log zlyhania CI. Následne výslovne schválil commit a push overenej opravy do existujúceho `main`, bez prepisu histórie. Konfigurácia existujúceho Workeru a jeho Git-integrácia sa nemení. Push môže spustiť Workers Builds; úspech nového vzdialeného CI ani nasadenia sa neodvodzuje len z úspešných lokálnych kontrol.

Oprava CI je publikovaná v `fc04c71`. Používateľ následne uložil panel, ponuku, paletu a výber textu do `3194075 update prostredia`, na ktorom začala táto úloha. Dňa 11. 10. 2026 výslovne schválil commit a push Click+Select, kontextového menu, súvisiacich modelových operácií a dokončeného interaktívneho README do existujúceho `main`. Skutočné commity zaznamenáva Git história; schválenie ani lokálne kontroly samy nepotvrdzujú vzdialené CI alebo nasadenie.

Zoznam publikovaných súborov v `push-github.ps1` zahŕňa nové moduly, testy, verejné zdroje doplnku a licencované PDF assety. Pomocné analýzy, lokálna PDF kontrola a CDP testy sú v ignorovaných `.analysis/`, `tmp/` a `outputs/`; nie sú súčasťou aplikácie ani publikovania. Dočasný PDF konverzný skript bol po kontrole odstránený.
