# História zmien

Zmeny Kinematika Studio sú zoradené od najnovších. Dátum a Git commit označujú zmeny zdrojov, nie potvrdenie produkčného nasadenia. Návody sú v [README.md](README.md), rozsah kontrol v [VALIDATION.md](VALIDATION.md).

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
| 2026-10-11 | `5e985fd` | Click+Select, multiselect, kontextové operácie a interaktívne README. |
| 2026-10-10 | `3194075` | Ručne otváraný panel Vlastnosti, jediná projektová ponuka, témy a ochrana pred výberom textu rozhrania. |
| 2026-10-10 | `fc04c71` | Oprava CI: zachovanie pripnutých bajtov PDF fontov pomocou `.gitattributes`. |
| 2026-10-10 | `7a527f6` | Rozšírená editácia, väzby, témy, exporty/reporty, odhadová dynamika a opt-in Fusion prepojenie. |
| 2026-10-09 | `60d92b2` | Základné slovenské štúdio mechanizmov, solvery, ukladanie a exporty bez závislostí. |

Ďalšie podrobnosti a pôvodné súbory zaznamenáva Git história. Vzdialené CI a Workers nasadenie overujte samostatne podľa [DEPLOYMENT.md](DEPLOYMENT.md).
