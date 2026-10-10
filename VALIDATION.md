# Stav overenia

Aktualizované 10. 10. 2026 pre lokálnu verziu 2.0.0.

## Lokálne kontroly

Prostredie má funkčný PowerShell, Node.js 24.15.0 a Python dodaný s lokálne nainštalovaným Fusion. Pôvodné analytické šablóny a samostatný projekt „Dvojite sklopeny suflik“ zostávajú zachované. Voľná editácia vytvára nezávislé kópie.

- `npm run check`: úspešná kontrola syntaxe aplikácie, modelov, editora, fyziky, exportov, CAD transportu, servera, buildu a JavaScriptových testov.
- `npm test`: **165 úspešných JavaScriptových testov, 0 zlyhaní**. Z toho 151 zdieľaných modelových prípadov a 14 Node integračných prípadov.
- `python -B -m unittest discover -s tests -p test_fusion.py -v`: **20 úspešných testov, 0 zlyhaní**. Izolovaný lokálny transport, validácia, úlohy, ZIP a mock Fusion API, bez zásahu do bežiaceho Fusion.
- `tests/browser.html`: **151 / 151 úspešných testov** v zabudovanom Chromium, samostatne cez HTTP aj `file://`.
- `npm run build`: úspešné vytvorenie `dist/`, vrátane nových modulov, lokálnych PDF assetov, referenčného náčrtu a balíka `cad/KinmoFusion.zip`.
- Sedemnásť statických súborov zostavenia sa byte-for-byte zhoduje so zdrojmi. ZIP sa zhoduje s deterministickým generátorom; Python preveril obsah a CRC.
- Zdrojový aj zostavený lokálny server servujú verejné moduly, PDF assety a ZIP s `nosniff`. Nesprístupňujú `.git/`, `.analysis/`, `tmp/` ani Python zdroje doplnku. Zostavený náhľad nesprístupňuje browser testy.
- `git diff --check`: bez chýb whitespace; Git upozorňuje len na lokálne LF → CRLF prevody.
- `push-github.ps1`: syntakticky overený PowerShell parserom; publikovanie nebolo spustené.

Pokrytie zahŕňa:

- Pôvodné šablóny a 1 001 polôh dvojkulisového projektu, pevnú dĺžku ramena, držiak a rozstup ložísk, pohyblivé kulisy, nadväzujúce fázy, nekompatibilné rozmery a inverzné ťahanie.
- Nezávislé editačné kópie, šesť typov väzieb, miestne súradnice, telesá s nosičom, obrysy, riadiace kóty, trajektórie a kontrolu zostávajúcej voľnosti.
- Štyri typy pružných prvkov, montáž, osové sily, účinky gravitácie, hmotnosti a tlmenia, jednotky, singularity, dorazy a časové obmedzenia odhadovej dynamiky.
- `.kinmo`, starší JSON a preferencie. Kompaktný export oboch projektových formátov odmietne súbor nad 2 MB, rovnako ako import; test obsahuje husté profily.
- SVG v mm, DXF jednotky a vrstvy, CSV, reporty, aktuálne osové sily, montážne body, priemery, predpätie, tlmenie, aktívne parametre, prerušenie blokovaných grafov a skutočný čas na osi dynamiky.
- CAD časové limity, odmietnutie redirectu a chýb autorizácie, pôvod, limity payloadu, jednu čakajúcu úlohu, hlavné Fusion vlákno, nový dokument a mm → cm prevod.
- Kontrolné súčty pripnutých PDF assetov, licencie, manifest doplnku a produkčnú CSP politiku.

## Interaktívne overenie

Overené v pridelenej karte zabudovaného Chromium na izolovaných lokálnych adresách, nie v produkčnej aplikácii. `agent-browser` CLI nie je dostupné; použitý bol lokálny CDP pomocník. Zápis projektov a preferencií počas QA smeroval do dočasného pamäťového úložiska. Sťahovania boli zachytené ako lokálne Blob dáta, nie tvrdením o súboroch uložených cez bežný download dialóg.

- Prvé otvorenie na novej lokálnej adrese zobrazí prázdny editor, bez automaticky spusteného modelu.
- Katalóg, náčrt, polohy 0 / 60 / 300 mm a uhly 90° / 65° / 65°, obe fázy, obidve trajektórie a pevná / zásuvková sústava.
- Zmena rozmerov, odmietnutie neplatného rozmeru, blokovaná kulisa, späť / znova, oddelené projekty a správanie nedostupného úložiska.
- Editačný / simulačný režim, ponuka šiestich väzieb, pomenovaná trajektória a obrys. Potlačenie výberu textu je obmedzené na ťahanie plátna; test syntetického zrušenia nenahrádza úplné natívne ťahanie.
- Montáž a parametre pružných prvkov, osové sily, graf a ovládanie odhadovej dynamiky.
- Všetky tri vzhľady sa aplikovali a zapísali do pamäťových preferencií. Zostavená aplikácia obnovila z `.kinmo` názov, polohu 70°, vzhľad, vypnutú mriežku a editačný režim.
- Export `.kinmo`, staršieho JSON, oboch CSV, samostatného reportu, milimetrového SVG a DXF. Zachytené projektové dáta prešli opätovným parserom.
- PDF knižnice nie sú načítané vopred. PDF z finálneho zostaveného rozhrania mal **38 620 bajtov** a platný podpis `%PDF-1.3`, bez JavaScriptových chýb.
- PNG z finálneho zostaveného rozhrania mal platný podpis a rozmer **2 000 × 2 387 px**. Pri vysokej pracovnej ploche mal **1 292 × 4 000 px**; limit aj pomer strán boli zachované. Farby a fontové vlastnosti všetkých troch textových značiek testovacej scény sa zhodovali s pracovnou plochou.
- Desktop **1 440 × 900** aj mobil **393 × 852**: bez horizontálneho pretekania. Ovládanie režimov sa neprekrýva; exportný aj Fusion dialóg sa zmestili do viewportu.
- Fusion dialóg obsahuje sťahovanie doplnku, heslové pole, neoznačený súhlas a upozornenie na nový referenčný dokument. Párovací kľúč sa neukladal. Žiadne odoslanie do živého Fusion sa nevykonalo.
- Natívne udalosti myši pri skoršej kontrole posunuli výsuv z 0 na 90 mm; úplná sekvencia ťahania skončila timeoutom.
- Po uvedených finálnych DOM a exportných kontrolách neboli zaznamenané JavaScriptové chyby aplikácie.

## PDF dokumenty

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

Používateľ potvrdil funkčné predchádzajúce nasadenie. Táto úprava zostáva lokálna: nebol vykonaný nový commit, push ani deploy. Konfigurácia existujúceho Workeru a jeho Git-integrácia neboli menené.

Zoznam publikovaných súborov v `push-github.ps1` zahŕňa nové moduly, testy, verejné zdroje doplnku a licencované PDF assety. Pomocné analýzy, lokálna PDF kontrola a CDP testy sú v ignorovaných `.analysis/`, `tmp/` a `outputs/`; nie sú súčasťou aplikácie ani publikovania. Dočasný PDF konverzný skript bol po kontrole odstránený.
