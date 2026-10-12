# História zmien

Zmeny Kinematika Studio sú zoradené od najnovších. Dátum a Git commit označujú zmeny zdrojov, nie potvrdenie produkčného nasadenia. Návody sú v [README.md](README.md), rozsah kontrol v [VALIDATION.md](VALIDATION.md).

## 2026-10-13: prichytávanie, vačka, obrysy a krivkové časti

Rozšírenie nad `5e9798b`. Používateľ výslovne požiadal o aktualizované README/changelog, commit a štandardný push do existujúceho `main`, bez prepisu histórie. Skutočný commit a stav vetvy potvrdzuje Git. Manuálny deploy nie je súčasťou tohto publikovania.

- **Spoločný snap pri drag/drop:** skutočné body pred osami/strednicami, hranami a viditeľnými trajektóriami, rovnaký náhľad a výsledná poloha pri vložení. Vlastné teleso a nesení potomkovia sa vylúčia. Prichytenie samo nevytvára spoj.
- **Samostatná sieť 5 mm:** prepínač mení iba zaokrúhľovanie polohy. Inteligentné prichytávanie aj viditeľnosť kreslenej mriežky zostávajú nezávislé.
- **Pružiny a vozíky:** voľné konce pružín sa upravujú a prichytávajú; namontované sú chránené. Vozík má otočený obrys a montážne C/CT/CB. Šablónové polohy ich doplnia ešte pred riešením nesených prvkov; stav bodu zohľadní montážny bod rodiča.
- **Rotačná vačka:** uzavretý harmonický radiálny profil R/h/fáza, jediná fyzická os A, otočný pohon, vedený posúvač a valček. `cam-contact` používa polomer valčeka, solver, diagnostiku a lokálnu analýzu voľnosti. Odhadová dynamika tento model výslovne odmietne.
- **Obrysová detekcia:** spojitá geometria nezávislá od odtieňa a tieňovania, vonkajšie obrysy, spojitá strednica zakrivenej dráhy a zachovanie konkávneho rámu. Nejasné/rozvetvené tvary nie sú predvybrané; doplnková segmentácia podľa hrán je nízkodôverná. Import prenesie validovaný obrys v kalibrovanej lokálnej sústave. Ohraničené komponenty, kontúry, návrhy a práca zjednodušovania; stále bez uploadu a automatického pohonu.
- **Presné časti a pravý klik:** samostatné identity riadiaceho bodu, vrcholu a dráhy. Ponuka kliknutej časti zachová zvýraznené telesá a odstránenie P2 neodstráni kulisu. Pravé pozadie neruší výber. Klávesnicové zameranie a Shift+F10 používajú presnú geometriu časti.
- **Skutočný Bézier:** všetky 2–32 body, nie iba prvé štyri. Pridanie/odstránenie mení stupeň; vnútorné body nie sú interpolované ani montážne uzly. Lokálne súradnice, otočený rodič a číselné výrazy sa spracujú atómovo.
- **Presný polkruh s R:** 180° profil s dvoma koncami, voľba strany. Predvolený R zachová konce; zmenený R zachová P0 a nastaví tetivu na 2R. Úprava konca alebo hromadný formulár prepočíta R. Mierka, natívny round-trip a CAD profil zachovajú geometriu.
- **História a export:** ťahanie bodov vytvorí jeden krok až po skutočnej zmene; zrušenie, zlyhanie a no-op zachovajú aj plnú 60-krokovú históriu. CAD pridáva `CAM`, `CAM_AXIS` a `RAIL_CARRIAGE`; vačka má polygonové ťažisko a zotrvačnosť. Výber sledovaného bodu zahŕňa C/CT/CB a rešpektuje skutočné body prvku.
- **Opravy z reálneho QA:** pohon vačky používa správny uhlový rozsah vrátane 360°, Analýza a predvolená trajektória sledujú fyzické A aj po čerstvom vložení a karta vačky má popis namiesto `undefined`. Rozšírené regresie najskôr zlyhali a po oprave prešli.
- **Stabilný cieľ dropu:** náhľad už neprepisuje celé SVG počas HTML5 ťahania. Mení iba neinteraktívnu vrstvu prichytenia a zachová živý cieľ prehliadača. Priehľadná drop plocha nezakrýva geometriu ani snap značku. Samostatná regresia kontroluje opakovaný náhľad aj jeho vyčistenie bez výmeny geometrie.
- **Overenie:** kompletných **591 JS testov**, syntax a build prešli aj pri predpublikačnej kontrole 13. 10. 2026. Zdieľaná prehliadačová sada pri funkčnom overení 12. 10. prešla **362 / 362** cez HTTP aj offline `file://`; pri publikačnej príprave sa gestá neopakovali. 25 statických assetov sa zhoduje so zdrojmi; verejný inventár má 26 súborov a deterministický Fusion ZIP. Natívne gestá, syntetický drop a presné hranice sú oddelené v [VALIDATION.md](VALIDATION.md).

Vačkový kontakt predpokladá trvalý dotyk, nie reakčné sily alebo odskok. Detektor navrhuje geometriu, nie preukázanú mechanickú funkciu. CAD obrysy nie sú výrobné kontúry. Nové lokálne výsledky nepotvrdzujú vzdialené CI alebo nasadenie.

## Publikované `5e9798b`, 2026-10-12: mierka, detekcia, projekty, analýza a kóty

Rozšírenie nad `6554b75` je publikované štandardným push do existujúcej vetvy `main`. Manuálny deploy sa nespustil. Úspech vzdialeného CI a Workers Builds sa z lokálnych výsledkov neodvodzuje.

- **Jedna mierka X/Y/A–B:** jeden známy rozmer prepočíta celý obrázok bez zmeny pomeru strán. Neskoršia zmena vyžaduje potvrdenie prepočtu geometrie a lineárnych parametrov; Späť/znova obnovia mierku aj geometriu spolu.
- **Voliteľný krok 2.5:** lokálna detekcia hrubých geometrických návrhov, náhľad, výber a oprava typov pred atómovým vložením. Raster do 768 × 768 px, najviac 60 kandidátov, zrušenie a uvoľnenie dekódera/plátna. Žiadny upload ani automatický pohon.
- **Stabilné dialógy:** kliknutie mimo neukončí číselný formulár a nestratí vstup. Oneskorená udalosť zatvorenia nevyčistí už znovu otvorený dialóg.
- **Profil a časová os:** predvolene skryté; prepínače pri diagnostike zostávajú dostupné.
- **Mechanizmy a projekty:** Magic import v spoločnej ponuke, nezávislé duplikovanie aj neuloženého stavu a potvrdené mazanie. Mazanie aktívneho projektu zastaví staré autosave. Plné alebo poškodené úložisko nikdy nevymaže starší projekt.
- **Samostatná Analýza:** priechodnosť celého vzorkovaného rozsahu, kritické intervaly a polohy, oddelené mm/° chyby, pohyby členov, voľnosť a odhad síl/momentu. Fit View má ikonu bez stredového kruhu.
- **Výber a pravé menu:** hit-testing bodov, čiar aj vyplnených obrysov, výber prekrývajúcich sa entít a podponuky mimo posuvného koreňa. Teleso možno odpojiť, fixovať alebo priradiť pohon jeho koncu. Mazanie kĺbu či kóty sa týka iba danej entity.
- **Inteligentné kóty:** bezpečný ohraničený parser bez `eval`, čiarka, výrazy, mm/cm/m a uhlové vstupy v °/deg/rad. Dva kliky na plátne vyberú A/B a otvoria nezapísaný návrh. Riadenie jednoduchého člena zachová A, B alebo stred; vodorovná/zvislá kóta správne mení projekciu. Úprava počas simulácie spätne odpočíta otočný/lineárny pohon, zachová zobrazený bod a nezapočíta motor dvakrát, ani v otočenom rodičovi. Neplatný vstup nemení projekt ani históriu.
- **Opravy z natívneho QA:** návod na plátne neblokuje kliknutia, hit-testing panelu používa body namiesto SVG textu a zapnutie autodetekcie nestratí rozpísané kalibračné súradnice.
- **Overenie:** syntax, 542 JS testov a build prešli; skorší izolovaný Python beh mal 23 úspešných testov. Zdieľané prípady prešli 338 / 338 cez HTTP aj so sieťovo vypnutým `file://`. Natívne desktopové/mobilné kontroly a ich hranice sú v [VALIDATION.md](VALIDATION.md).

Detekcia nezaručuje správne členy ani funkciu mechanizmu. Jedna mierka neopravuje perspektívu. Analýza vzorkuje polohy, nie všetky možné stavy medzi nimi. Geometrické úpravy nenahrádzajú overenie vonkajších väzieb v simulácii.

## Commit `6554b75`: panely, skutočná schéma v PDF a animovaný GIF

Zmeny nad `dc24ef2` sú už zaznamenané v Gite v `6554b75`. Existencia commitu sama osebe nepotvrdzuje produkčné nasadenie.

### Pridané a zlepšené

- Nezávislé prepínače profilového grafu a prehrávania časovej osi. Obnovenie je trvalo dostupné; plátno sa zväčší okolo rovnakého stredu bez zmeny priblíženia, polohy alebo histórie.
- Prepínač vizuálnych názvov, textov, uhlov a uhlových oblúkov. Kóty, dostupnosť uzlov a výpočtové údaje ostávajú samostatné. Všetky tri nové voľby sú v preferenciách aj `.kinmo`.
- `scene-export.js`: snímok skutočného SVG s vypočítanými farbami, fontmi, viditeľnosťou a mierkou čiar. PNG, PDF/HTML a GIF nezahŕňajú editačné úchyty ani dočasný podklad; externý a aktívny SVG obsah sa odmieta.
- PDF používa ostrú rasterizovanú schému pracovného plátna, vyberateľný slovenský text a vektorové grafy/tabuľky. HTML zachová rovnakú SVG kresbu. Geometrický milimetrový SVG/CAD export ostáva oddelený.
- `gif-export.js`: závislosťami nezaťažený GIF89a encoder, LZW, adaptívna 256-farebná paleta, presné trvanie, oba smery a voliteľné opakovanie.
- GIF nastavenia, odhad náročnosti, priebeh, zrušenie a ohraničenie 1 200 × 1 200 px / 180 snímok / 60 miliónov bodov / 32 MB / 90 sekúnd. Prázdny, nehybný, neviditeľný, nepoháňaný vlastný alebo zablokovaný model sa neexportuje.
- Snímky používajú rovnaké kreslenie na samostatnom skrytom SVG a jednom opakovane využitom rasterovom plátne. Export nemení projekt, aktuálnu polohu, výber, históriu ani dynamický záznam.

### Regresie a hranice

- Vyriešené CSS premenné sa odstránia aj z pôvodných prezentačných atribútov SVG. Snímok nemení zdrojové plátno a dočasné URL sa uvoľnia pri chybe, zrušení aj dokončení.
- Zámok editora počas GIF dovolí vlastné Blob sťahovanie. Zatvorenie dialógu zruší úlohu aj pri oneskorenom doručení natívnej udalosti `close`; čiastočné súbory sa nestiahnu.
- Natívne Enter/Space na tlačidlách neovládajú prehrávanie na pozadí. Zaokrúhlenie GIF cyklu neprekročí 20 snímok/s.
- Encoder kontroluje nezávislý testovací dekóder vrátane 9–12-bitových prechodov a resetu slovníka. Reálne výstupy kontroluje aj natívny dekóder Chromium, nie iba rovnaký encoder.
- **PDF je statické. GIF zobrazuje predpísaný kinematický rozsah, nie časový záznam odhadovej dynamiky alebo skutočnú rýchlosť motora.** Paleta môže zmeniť jemné odtiene. Aktuálny výrez sa zámerne zachová; pred exportom ho prispôsobte.

## 2026-10-11: Magic import a rozšírenie editora

Rozšírenie nadväzuje na `5e985fd` a zahŕňa požadované funkcie 2 až 7 aj sprievodcu importom náčrtu. Obdĺžnikový výber nie je súčasťou tejto zmeny.

### Pridané

- **Magic import:** lokálny PNG/JPG/neanimovaný WebP → mierka z dvoch bodov A/B → pevný rám, podlaha a body → členy a väzby → Finish. Ide o ručné obkreslenie, nie automatické rozpoznávanie fotografie.
- Podklad s priehľadnosťou a možnosťou skrytia. Kalibrácia používa mm, začiatok v A a existujúcu os Y nadol; po začatí geometrie sa zamkne. Raster zostáva dočasný a nevstupuje do projektu ani exportov.
- Izolovaný rozpracovaný projekt, samostatný Finish, obnovenie originálu a histórie pri zrušení, export geometrie a záloha pôvodného neuloženého projektu pri nedostupnom úložisku.
- Priame **úchyty X/Y, rotácie, pivotu a dĺžky**, aj číselné dialógy. Panel Vlastnosti sa naďalej otvára iba ručne.
- **Diagnostika väzieb:** pomenované spoje, samostatné chyby v mm/°, výber problémového kĺbu, zostávajúca voľnosť a upozornenia na opakované alebo konfliktné požiadavky.
- **Inteligentné prichytávanie iba na požiadanie:** body, stredy, vedenia a osi v tolerancii 9 px. Začína vypnuté a zapína sa len tlačidlom. Prichytenie nevytvára väzbu bez samostatného potvrdenia.
- **Knižnica podzostáv** s prenosom `.kinmolib`, novými ID a zachovaním vnútorných väzieb. Vloženie je samostatná nezávislá kópia a jeden krok Späť.
- **Pomenované verzie a porovnanie** rozmerov so znamienkom rozdielu, prenos `.kinmoversions` a povinná záloha pred obnovením.
- Voliteľné uzavreté **referenčné obrysy drážok v DXF a Fusion**, vrátane vonkajšej/vnútornej vrstvy uzavretej strednice. Strednice zostávajú zachované.
- Klasické moduly `workbench.js`, `slot-outline.js` a `magic-import.js`, zahrnuté do offline buildu aj explicitných serverových a publikačných zoznamov.

### Opravené a spevnené

- Solver správne normalizuje kladné aj záporné úplné otáčky. Uhlové, rovnobežné, pevné a posuvné väzby sa zhodujú s diagnostikou; hranice ±180° zachovávajú znamienko.
- Prevody SVG udalostí a kalibrácia zachovávajú X/Y z prototypových accessors, nie iba vlastné vlastnosti objektu.
- Pri spájaní presne prekrývajúcich sa uzlov druhý klik vyberá iný prvok, nie opakovane prvý bod. Bežná priorita samostatných bodov sa nemení.
- Kolízie ID, plné alebo poškodené kolekcie a zlyhanie zápisu neprepisujú staršie záznamy. Knižnica má limit 20 podzostáv, kolekcia 40 verzií, každá najviac 2 MB.
- Import rastera kontroluje formát a rozmery pred dekódovaním: najviac 10 MB, 8 192 px na stranu a 16 miliónov pixelov. Chybové a zastarané načítania uvoľňujú vlastné Blob URL.
- Obrysy odmietajú pretínanie, zrútenie a neplatnú šírku. Export jednej polyline ostáva ohraničený na 1 001 vrcholov; husté strednice sa zjednodušujú iba v stanovenej tolerancii.

### Dokumentácia a overenie

- README obsahuje návody pre Magic import, úchyty, diagnostiku, snap, podzostavy, verzie a referenčné obrysy. Návod pribalený k Fusion má vlastnú históriu zmien.
- Funkčná verzia prešla **428 JS a 23 izolovanými Python testami**, kontrolou syntaxe a statickým buildom.
- Zdieľané prehliadačové prípady: **299 / 299** cez HTTP aj offline `file://`.
- Rozhranie: **147 / 147** kontrol v každom rozložení, desktop 1 440 × 900 a offline mobil 393 × 852. Z toho 57 kontrol Magic import a 90 regresií editora.
- Gestá boli syntetické. Natívne ťahanie, prirodzené časovanie animácie, snímky rozhrania a živý Fusion import zostávajú manuálnymi akceptačnými kontrolami.

### Hranice

Jedna mierka neopravuje perspektívu ani skreslenie fotografie. Finish dokončuje geometriu, nie dôkaz správnej funkcie. Diagnostika nie je úplný symbolický dôkaz určitosti. CAD obrysy sú referenčné, nie overená výrobná kontúra. Prepojenie s Fusion stále vyžaduje lokálny doplnok, presný Origin, dočasný kľúč a výslovný súhlas s novým dokumentom.

## Predchádzajúce publikované zmeny

| Dátum | Commit | Zmena |
|---|---|---|
| 2026-10-12 | `5e9798b` | Mierka obrázka, voliteľná detekcia, projekty, samostatná Analýza a inteligentné kóty. |
| 2026-10-11 | `5e985fd` | Click+Select, multiselect, kontextové operácie a interaktívne README. |
| 2026-10-10 | `3194075` | Ručne otváraný panel Vlastnosti, jediná projektová ponuka, témy a ochrana pred výberom textu rozhrania. |
| 2026-10-10 | `fc04c71` | Oprava CI: zachovanie pripnutých bajtov PDF fontov pomocou `.gitattributes`. |
| 2026-10-10 | `7a527f6` | Rozšírená editácia, väzby, témy, exporty/reporty, odhadová dynamika a opt-in Fusion prepojenie. |
| 2026-10-09 | `60d92b2` | Základné slovenské štúdio mechanizmov, solvery, ukladanie a exporty bez závislostí. |

Ďalšie podrobnosti a pôvodné súbory zaznamenáva Git história. Vzdialené CI a Workers nasadenie overujte samostatne podľa [DEPLOYMENT.md](DEPLOYMENT.md).
