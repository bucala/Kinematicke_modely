# Stav overenia

Aktualizované 11. 10. 2026 pre verziu 2.0.0.

## Lokálne kontroly

Prostredie má funkčný PowerShell, Node.js 24.15.0 a Python dodaný s lokálne nainštalovaným Fusion. Pôvodné analytické šablóny a samostatný projekt „Dvojite sklopeny suflik“ zostávajú zachované. Voľná editácia vytvára nezávislé kópie.

- `npm run check`: úspešná kontrola syntaxe aplikácie, modelov, editora, fyziky, exportov, CAD transportu, servera, buildu a JavaScriptových testov.
- `npm test`: **428 úspešných JavaScriptových testov, 0 zlyhaní**. Z toho 299 zdieľaných modelových prípadov, 17 Node integračných prípadov, 105 UI kontrolérskych/regresných prípadov a 7 asynchrónnych testov načítania obrázka.
- `python -B tests/test_fusion.py`: **23 úspešných testov, 0 zlyhaní**. Izolovaný lokálny transport, validácia, úlohy, ZIP a mock Fusion API, bez zásahu do bežiaceho Fusion. Nové prípady importujú skutočné obrysové snapshoty vytvorené JavaScriptom, kontrolujú uzatvorenie, vrstvy, pevné hrany a mm → cm.
- `tests/browser.html`: **299 / 299 úspešných testov** v zabudovanom Chromium, samostatne cez HTTP aj offline `file://`. Pri offline kontrole bolo sieťovanie vlastnej QA karty vypnuté.
- `npm run build`: úspešné vytvorenie `dist/`, vrátane nových modulov, lokálnych PDF assetov, referenčného náčrtu a balíka `cad/KinmoFusion.zip`.
- Dvadsaťdva statických súborov zostavenia sa byte-for-byte zhoduje so zdrojmi, vrátane `workbench.js`, `magic-import.js` a `slot-outline.js`. ZIP sa zhoduje s deterministickým generátorom; Python preveril obsah a CRC.
- Zdrojový aj zostavený lokálny server servujú verejné moduly, PDF assety a ZIP s `nosniff`. Nesprístupňujú `.git/`, `.analysis/`, `tmp/` ani Python zdroje doplnku. Zostavený náhľad nesprístupňuje browser testy.
- `git diff --check`: bez chýb whitespace; Git upozorňuje len na lokálne LF → CRLF prevody.
- `push-github.ps1`: syntakticky overený PowerShell parserom; tento pomocný publikačný skript sa nespustil.

### Predpublikačná kontrola a changelogy, 11. 10. 2026

Po výslovnej požiadavke na commit/push sa doplnil `CHANGELOG.md` pre celý rozsah nad `5e985fd`, prehľad noviniek v README a história zmien v pribalenom Fusion návode. Changelog je aj v explicitnom publikačnom zozname a integračnom regresnom teste.

Znovu prešli `npm run check`, **428 JS testov**, **23 izolovaných Python testov** a `npm run build`. Kontrola piatich dokumentačných súborov preverila **70 relatívnych odkazov, 25 jedinečných kotiev a 30 rozbaľovacích návodov**, bezpečnú statickú SVG ilustráciu a publikačný zoznam. PowerShell parser aj `git diff --check` prešli.

Prehliadačové výsledky 299 / 299 a 147 / 147 v oboch rozloženiach pochádzajú z finálneho funkčného overenia uvedeného nižšie. Pri doplnení dokumentácie sa tieto gestá ani PDF/Fusion akceptácia neopakovali. Používa sa existujúca Git identita a štandardný push do `main`, bez prepisu histórie. Samostatný manuálny deploy sa nespúšťa.

### Magic import: lokálny obrázok a ručné obkreslenie

Päťkrokový sprievodca **Obrázok → Mierka → Pevné časti → Členy a väzby → Dokončenie** vytvára nezávislý vlastný projekt. Nejde o automatické rozpoznávanie z fotografie. Podklad sa neposiela na server, neukladá do projektu ani nevstupuje do exportov.

Nové zdieľané, asynchrónne a skutočné UI kontrolérske regresie pokrývajú:

- PNG/JPEG/neanimovaný WebP, kontrolu podpisu a rozmerov pred dekódovaním, odmietnutie SVG/GIF/APNG/animovaného WebP, 10 MB, 8 192 px na stranu a 16 miliónov pixelov. Časový limit dekódovania a chybové či staré načítania uvoľnia vlastný Blob URL.
- Dvojbodovú mierku v mm, minimálne dva pixely, začiatok v A, oba smery prevodu a hranice ±5 000 mm. Jedna mierka neopravuje perspektívu. Kalibrácia aj prevod SVG udalosti zachovajú X/Y zdedené cez prototypové accessors.
- Podlahu, uzavretý pevný rám, pevné body, pripojovacie uzly vrcholov, členy podľa dvoch koncov, kliknutie/umiestnenie aj drop z palety. Neplatný obrys zostáva rozkreslený bez pridania chybnej geometrie alebo histórie.
- Navigáciu, zamknutie mierky po začatí geometrie aj po Späť, zrušenie rozkreslenia, sedem natívnych typov väzieb, pohon, úchyty, ručne skryté Vlastnosti a klávesnicu vrátane Enter/Space na tlačidlách.
- Izoláciu rozpracovaného projektu od automatického ukladania projektov a preferencií. Zrušenie obnoví pôvodnú geometriu, výber a históriu; neúspešná výmena obrázka ponechá pôvodný podklad aj geometriu.
- Finish s kontrolou mierky, názvu, platného projektu a uložených záznamov. Nový a pôvodný projekt sú oddelené; plné, poškodené alebo nedostupné úložisko nevymaže staršie projekty. Neuložený originál vyžaduje výslovnú zálohu pred dokončením iba v pamäti.
- Vylúčenie rastera a Blob URL z natívnych/exportovaných dát, samostatný export geometrie a presnej zálohy neuloženého originálu.

Skutočná Chromium kontrola odhalila dva problémy, ktoré sú opravené a pokryté regresiami: spread SVGPoint strácal prototypové X/Y a druhý klik pri presne prekrývajúcich sa uzloch opakovane vyberal prvý prvok. Druhý bod spojenia teraz vyberá iný prvok, bez zmeny bežnej priority samostatných bodov. Dve regresie prekrytia najskôr zlyhali, po oprave prešli vrátane Späť/znova, výberu tela a riešenia skutočného pohonu.

#### Finálne rozhranie v Chromium

| Aplikácia | Viewport | Magic import | Úchyty/knižnice/CAD | Click+Select |
|---|---|---|---|---|
| Zdroj cez izolované HTTP | 1 440 × 900 | 57 / 57 | 44 / 44 | 33 + 13 / 46 |
| Finálne `dist/index.html`, offline `file://` | 393 × 852 | 57 / 57 | 44 / 44 | 33 + 13 / 46 |

Spolu **147 / 147 kontrol v každom rozložení**, bez JavaScriptových chýb aplikácie. Všetky ovládacie kontroly sa vykonali po finálnej oprave prekrývajúcich sa uzlov.

Sprievodca použil skutočne dekódovaný lokálne vytvorený PNG, kliknutie na kalibračné body a skutočné formuláre. Kontroly overili všetkých päť rozložení bez horizontálneho pretekania, použiteľnú plochu plátna, kontrast značiek vo všetkých troch témach, podlahu/rám/bod, Späť/znova, drop aj kliknutie/umiestnenie, pomenovanú väzbu, pohon, priehľadnosť/skrytie obrázka, zamknutú mierku, presné zrušenie, nezávislý Finish a zachovanie bajtov úložiska pri quota zlyhaní. Dokončený člen s otočnou väzbou funguje v skutočnom solveri pri 45°.

Pointer a drop udalosti boli **syntetické**, s obnovenou dočasnou náhradou pointer capture; `requestAnimationFrame` zostal natívny. Tieto výsledky nepotvrdzujú úplné natívne ťahanie, prirodzené časovanie animácie ani snímku rozhrania. Nové PDF alebo živý Fusion import sa pri Magic import nevykonali.

Pri offline overení zlyhala kontrolná lokálna sieťová požiadavka; po obnovení sieťovania prešla s HTTP 200. Odstránila sa iba vlastná registrácia pamäťového QA úložiska a zmena viewportu. Nové načítanie finálneho offline buildu potvrdilo dostupný Magic import, natívny Storage, `requestAnimationFrame` aj pointer capture bez QA globálnych premenných. Oba vlastné servery a ich obslužné procesy skončili po kontrole identity; porty 5185/5186 sú voľné. Karta zostala otvorená.

Kontrola dokumentácie preverila **54 relatívnych odkazov, 25 jedinečných kotiev a 30 rozbaľovacích návodov**. Presná zhoda 22 verejných assetov, inventár bez súkromných súborov, deterministický Fusion ZIP a allowlisty zdrojového aj zostaveného servera prešli.

### Úchyty, diagnostika, opt-in snap, podzostavy, verzie a CAD obrysy

Nasledujúci záznam zachováva overenie rozšírenia 2 až 7 pred pridaním Magic import, z 11. 10. 2026. Jeho ovládacie kontroly sa znovu vykonali na aktuálnej verzii podľa tabuľky vyššie. Obdĺžnikový výber nebol súčasťou požiadavky. Nové moduly sú klasické skripty bez závislostí a fungujú cez HTTP aj `file://`.

Výpočtové a skutočné VM ovládacie regresie pokrývajú:

- X/Y úchyty, rotáciu okolo vlastného bodu alebo uzla, dĺžku so zachovaním A/B, vnorené nosiče, skryté ukotvenia, nemenné zdroje a ochranu originálov.
- Samostatné mm/° rezíduá solvera, diagnostické riadky a výber kĺbu, voľné súradnice, chýbajúci vstup a opakované alebo konfliktné požiadavky rovnakého typu. Analytické symbolické bodové väzby sa nepovažujú za namerané chyby.
- Kladné aj záporné úplné otáčky v uhlovej, rovnobežnej, pevnej a posuvnej väzbe. Solver, diagnostika a reporty sa zhodujú; projekcia nepridáva zbytočnú celú otáčku a pasívne dorazy zachovávajú znamienko hranice ±180°.
- Inteligentné prichytávanie predvolene vypnuté, iba explicitný toggle; žiadne zapnutie z preferencií, natívneho súboru ani pri obnovení verzie. Body, stredy, vedenia, osové zarovnanie, 9 px tolerancia, vlastné teleso, zrušenie, starý náhľad a samostatne potvrdené spojenie.
- Podzostavy so všetkými vnútornými odkazmi, prenos `.kinmolib`, nové ID, odpojené vonkajšie väzby, jeden vstup a atómové vloženie. Pomenované verzie, `.kinmoversions`, návrhové porovnanie, podpísané rozdiely a záloha pred obnovením.
- Limity 20 podzostáv / 40 verzií a 2 MB na kolekciu, validované jednotky a dátumy, kolízie ID bez prepísania, poškodené či nedostupné úložisko bez straty pôvodných bajtov. Neúspešná záloha zastaví obnovenie.
- Rovné, otočené, zakrivené, husté aj uzavreté drážky, vonkajší/vnútorný obrys, mm a CAD os Y, uzavreté DXF flags a referenčné Fusion skice. Nulové, pretínajúce sa, prudko vratné či príliš široké obrysy sa odmietajú; strednicový export zostáva dostupný.
- Oba zásuvkové modely s obrysmi v začiatku, strede a na konci zdvihu. Zadná drážka používa vlastnú šírku 8 mm. Jedna CAD polyline sa odmietne nad 1 001 vrcholov, aj keď neprekročila globálnych 30 000 bodov.

#### Skutočná Chromium karta

`agent-browser` CLI nie je v tomto prostredí dostupné. Kontroly použili lokálny CDP pomocník cez už pridelený, pomenovaný endpoint Factory, bez vyhľadávania debugger URL alebo pripojenia k používateľovým CAD dokumentom.

| Aplikácia | Viewport | Nové ovládanie | Click+Select regresie |
|---|---|---|---|
| Zdroj cez izolované HTTP | 1 440 × 900 | 44 / 44 | 33 + 13 / 46 |
| Finálne `dist/index.html`, offline `file://` | 393 × 852 | 44 / 44 | 33 + 13 / 46 |

Spolu **90 / 90 kontrol v každom rozložení**. Použili skutočné dialógy a formuláre, import cez `File`/`DataTransfer`, zachytené lokálne Blob exporty a ich opätovnú validáciu. Overili presné X/Y, dĺžku, pivot B, rotáciu/Späť, zrušenie ťahania, diagnostiku, knižnicu, import bez prepísania, zálohované obnovenie, zlyhanie zálohy, mm rozdiely, off/on snap bez automatickej väzby, potvrdenie a samostatné Späť, CAD checkbox, oba DXF varianty, Fusion súhlas a rozloženie bez horizontálneho pretekania.

Pointer gestá boli syntetické; dočasná náhrada pointer capture sa vždy obnovila. `requestAnimationFrame` sa nenahradil. Neboli zistené JavaScriptové chyby aplikácie. **Natívny drag probe skončil timeoutom `Input.dispatchMouseEvent`**, geometria zostala nezmenená. Prirodzená sonda doručila **0 rAF callbacks za 300 ms**. `Page.captureScreenshot` tiež skončil timeoutom. Natívne ťahanie, prirodzená animácia a snímky rozhrania preto nie sú označené za overené.

Po oprave úplných otáčok sa zopakovali všetky modelové, integračné, VM, Python aj uvedené Chromium kontroly a build. Offline sieťovanie bolo navyše overené lokálnou kontrolnou požiadavkou: pri vypnutí zlyhala, po obnovení prešla. Na konci sa odstránila iba vlastná registrácia pamäťového QA úložiska a zmena viewportu, obnovilo sa sieťovanie a nové načítanie potvrdilo natívny Storage, `requestAnimationFrame` a pointer capture bez QA globálnych premenných. Oba vlastné servery aj ich obslužné procesy skončili; karta zostala otvorená na offline `dist/index.html`.

#### Dokumentácia a PDF

README má **24 jedinečných kotiev a 28 rozbaľovacích návodov**. Kontrola štyroch návodových súborov preverila **50 relatívnych odkazov**, párovanie details/summary, bloky kódu, bezpečnú statickú SVG ilustráciu a publikačný zoznam. Root aj pribalený Fusion návod opisujú import existujúceho doplnku zo zariadenia a nové referenčné obrysy.

Nový PDF export z finálneho offline rozhrania mal **35 689 bajtov**, podpis `%PDF-1.3` a nevytvoril JavaScriptové chyby. Samostatný kontrolný report `outputs/features-report.pdf` má **35 622 bajtov a 3 strany**; bol otvorený PDF parserom a vizuálne prezretý. Má vektorový výkres, vyberateľný slovenský text, opakované hlavičky tabuliek a správne oddelené hodnoty **0 mm / 20°**, nie 20 mm. Ide o ignorovaný QA výstup, nie verejný asset alebo výrobnú dokumentáciu.

Predchádzajúce kontroly nižšie zostávajú historickým záznamom a ich staršie počty nie sú počtami aktuálnej sady. Živý Fusion import, vzdialené CI a Workers nasadenie sa pri tomto rozšírení nevykonali.

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

Click+Select a interaktívne README sú publikované v `5e985fd`. Dňa 11. 10. 2026 používateľ výslovne požiadal o changelogy, aktualizované README a commit/push rozšírenia 2 až 7 aj Magic import do existujúceho `main`. Rozsah je v [CHANGELOG.md](CHANGELOG.md); skutočný commit a stav publikovania zaznamenáva Git. Manuálny Wrangler deploy nie je súčasťou tohto kroku a vzdialené CI ani Workers nasadenie sa neodvodzujú z lokálnych kontrol.

Zoznam publikovaných súborov v `push-github.ps1` zahŕňa nové moduly, testy, verejné zdroje doplnku a licencované PDF assety. Pomocné analýzy, lokálna PDF kontrola a CDP testy sú v ignorovaných `.analysis/`, `tmp/` a `outputs/`; nie sú súčasťou aplikácie ani publikovania. Dočasný PDF konverzný skript bol po kontrole odstránený.
