# História zmien

## 2026-10-13: viac polôh, predloha a pracovné postupy

- Magic import porovná prvý obrázok a ďalšie tri polohy po zarovnaní rovnakým pevným úsekom. Zhodu a odhad pevnej/posuvnej/otočnej časti oddelí od skóre geometrie; nejednoznačné zhody nepotvrdí automaticky.
- Návrhy možno opraviť ťahaním koncov, vrcholov a čapov, doplniť čap, rozlíšiť otvor/samostatný čap, spojiť fragmenty, rozdeliť teleso alebo dokresliť obrys. Opravy majú oddelené Späť/Znova. Opakovaná detekcia potvrdzuje nahradenie opráv.
- Finish archivuje zmenšenú kalibrovanú predlohu prvého obrázka v projekte, `.kinmo` aj JSON. Tlačidlo Predloha je dostupné pre Magic projekty; upraví viditeľnosť, priehľadnosť a zarovnanie. Starší projekt môže doplniť pôvodný obrázok bez zmeny existujúcej geometrie.
- Voľnosť zobrazuje lokálne možné smery vybraného telesa. Skúšobný pohyb prechádza medzipolohy a vzorky analýzy, označí blokovanie a zachová poslednú funkčnú polohu; ukončenie obnoví režim/polohu bez zmeny modelu.
- Štyri pripravené mechanické zostavy majú nastaviteľné rozmery, montážne body, skutočné väzby a voliteľný jediný pohon. Vloženie je atómové.
- Úpravy uloženia s naviazanými závislosťami, odpojenie a mazanie ponúkajú konkrétne dôsledky a zachovanie zobrazeného východiska. Zrušenie model nemení.
- Až 12 pomenovaných nadväzujúcich fáz jedného pohonu: dorazy, trvanie, plynulý/lineárny priebeh, zotrvanie, spätný smer a zachytenie konca na plátne. Plán a predloha sa validujú a prenášajú natívnym súborom; podzostavy nekopírujú celý projektový podklad/plán.


## 2026-10-13: jednoduchšie vkladanie a väzby

- Vloženie kliknutím alebo drag & drop ukazuje tvar prvku a umožňuje zvoliť montážny bod A/B/C/CT/CB. Tab a Shift+Tab prepínajú bod, Zrušiť/Escape ukončí náhľad bez zásahu do modelu.
- Kruhový montážny bod presúva celé tuhé teleso bez deformácie. Rozmery sa menia samostatnými úchytmi. Alt dočasne obíde bodové, sieťové a uhlové prichytávanie.
- Stabilné prichytenie používa vstupnú toleranciu 8 px a uvoľnenie pri 12 px. Popis určuje cieľový prvok a bod. Pri bode je malá ponuka kompatibilných spojov; vloženie/posun a potvrdený spoj majú spoločný krok Späť.
- Panel Spojenia/Uloženie/Pohon rozlišuje bodovú fixáciu a uloženie telesa. Pri vedení ponúka pohyblivý vozík alebo vedenie. Klikateľné odporúčania vyberú a vycentrujú prvok či konfliktné kĺby a otvoria príslušnú úpravu.


## 2026-10-13: pevný vozík, pohyblivé vedenie a uhlové kroky

- Samostatné vlastné vedenie podporuje režim pevného vozíka a lineárne poháňanej koľajnice. Kontextová ponuka alebo F na pôvodne pevnom A/B prepne uloženie celej zostavy; spätné prepnutie, história a natívny export/import zachovajú režim a zobrazenú polohu.
- Prichytávanie C/CT/CB umožňuje upraviť pozdĺžnu polohu vozíka aj priečnu polohu vedenia. Potvrdenie ponúka pevné spojenie a používa aktuálny zdvih. Žiadny spoj nevzniká bez potvrdenia.
- Tlačidlo 10° je samostatné od siete 5 mm a smart snap. Otáčanie/ťahanie smeru používa absolútny uhol po 10°, číselné vstupy sú presné. Preferencie a export si voľbu pamätajú.


## 2026-10-13: Magic import, oblasti a montážne body

- Výber jednej oblasti dvoma rohmi v kroku 2.5, bez zmeny kalibrácie; celý obrázok a Escape obnovia spracovanie celého podkladu.
- Oblasti oddelené hranami, úzke biele vnútorné pásy a malé kruhové otvory dopĺňajú pôvodné obrysové návrhy. Rozlíšenie duplicitných telies používa obrys, nie iba vzdialenosť koncov hrubého člena.
- Montážne body vo vnútri ramena/čela sú nesené uzly. Voliteľné otočné spoje používajú ich polohy. Body sú viditeľné pred vložením, pri každom telese sa dajú vypnúť; rám ich vyžaduje výslovne zapnúť. Vloženie aj s bodmi zostáva jedným krokom Späť.
- Testy pokrývajú prekrývajúce sa obrysové dosky, čiernobiely variant, vnútorné čapy, prenos mierky a súradníc výrezu, import/export, históriu a odmietnutie chybných bodov. Opravené zastavenie na kroku 2.5: návrh nemôže mať body mimo obrázka ani prekročiť limity importu; chyby označia konkrétny riadok a po odznačení možno pokračovať. Následný test na skutočnom JPG Kinka doplnil regresný raster a opravil zámeny širokého zakriveného člena za kulisu aj jednopixelové JPEG návrhy. Úplné obrysy oboch modrých členov a mechanická topológia zostávajú neoverené.


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

## 2026-10-14 · 2.1: Fusion, debug a priame aplikácie

- Fusion 1.2.0: samostatné chyby zaneprázdnenia/udalosti, bezpečná diagnostika, kontrola registrácie handlera a náhradné dokončenie už odoslaného výkresu tlačidlom vo Fusion. Import sa prevezme iba raz aj pri súbehu udalostí.
- Voliteľný debug režim v menu: priebežný IndexedDB záznam, JS chyby, akcie a snímky projektu, export JSON, obmedzenie veľkosti a redakcia kľúčov. Predloha Magic importu len na výslovný výber.
- Windows x64 EXE (.NET/WebView2) a podpísaný Android APK (WebView), lokálny editor, zachovanie profilu pri aktualizáciách a Android výber/ukladanie súborov.
- Automatické platformové buildy a verzie cez Actions; Cloudflare Worker/R2 download endpointy, kontrolné súčty a publikovanie oboch balíkov pred aktualizáciou latest manifestu. Aktivácia vyžaduje súkromné signing a Cloudflare secrets.

## 2026-10-14 · 2.1.1: správne obrysy Fusion exportu

- Korpus dvojitej zásuvky je jeden spojitý uzavretý obrys bez prekrývajúcich sa rohov; zadná opora zachová šírku 6 mm, zásuvka svoj L profil a držiak trojuholník.
- Obrysy template dielov zdieľajú editor, export aj nové voľné kópie. Samostatné vedenie zachová slotWidth a vozík; rám a ramená exportujú fyzickú hrúbku aj zaoblené konce. Piestnica má samostatný uzavretý obrys podľa rodDiameter. Parametrická zásuvka neexportuje fiktívny štandardný vozík.
- Pomocné trajektórie do Fusion sú samostatná predvolene vypnutá voľba. Kóty a referenčné kulisové dráhy ostávajú voliteľné.
- KinmoFusion 1.2.1 vypína zobrazovanie jednotlivých bodov skíc, ak túto vlastnosť podporuje API. Jednotky, párovanie a referencia v novom dokumente zostávajú zachované.

## 2026-10-14 · 2.2.0: vačka, plochy, motor a jazyky

- Priame otáčanie vačky/motora, centrovanie na pevnej osi, oprava pevného uhlového uloženia osi a periodické otáčanie bez zmeny smeru. Limitované pohony zachovávajú spätný chod. Parametrické šablóny vytvoria voľnú kópiu.
- Kontaktná definícia bod/valček/plochá hrana, náhľad obrysu a zvýraznenie hrany; uloženie lokálnej plochy a indexu hrany. Pasívny vozík má samostatnú súradnicu po pevnom vedení, rešpektuje konce a rozmerové zmeny. Diagnostika aj kreslenie používajú tú istú kontaktnú geometriu.
- Elektromotor ako nový prvok: rozmerové a menovité elektrické/mechanické údaje, redukcia, smer, otáčanie a osový bod pre pevné prepojenie. Dáta sa uchovajú v natívnom súbore, CAD má obrys telesa a hriadeľa. Číselný vstup podporuje desatinnú čiarku a W/kW, V/mV/kV, rpm.
- Prepínanie SK/EN/DE, slovenčina predvolene, lokálny katalóg UI a zachovanie používateľských dát. Aktualizované dynamické texty sa prekladajú bez servera. Nezaradené technické texty používajú SK fallback.

## 2026-10-15 · 2.2.1: obrázkový návod a kontextová nápoveda

- Otáznik v hlavičke alebo F1 otvorí vyhľadateľný návod s 29 témami: všetkých 13 typov prvkov a 16 pracovných postupov. Každá téma má vlastnú SVG schému, vysvetlenie a postup. Vyhľadávanie rozumie aj textu bez diakritiky.
- Skrátený obsah rovnakého návodu sa zobrazí po 2 sekundách nad prvkom v knižnici, telesom alebo uzlom na plátne a podporovanými ovládacími tlačidlami. Pri kliknutí, ťahaní, rolovaní alebo otvorení ponuky sa skryje; pri prehrávaní a na dotykových vstupoch sa neotvára.
- Návod rešpektuje aktívnu farebnú tému a na mobile používa jeden stĺpec. Klávesové skratky zostávajú súčasťou návodu.

## 2026-10-15 · Oprava nasadenia pri chýbajúcom R2 úložisku

- Workers Builds teraz pripravia `kinematika-releases` ešte pred nasadením Workeru; chýbajúci bucket už nemusí najprv vytvoriť natívny release workflow. Existujúce objekty sa nemenia.
- Spoločná príprava R2 pre web a natívne aplikácie bezpečne zvláda súbežné vytvorenie úložiska. Pri chýbajúcom tokene, neaktívnom R2 alebo nedostatočných oprávneniach vypíše potrebné kroky.
