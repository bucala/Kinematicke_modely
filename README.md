# Kinematika Studio

[![CI](https://github.com/bucala/Kinematicke_modely/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bucala/Kinematicke_modely/actions/workflows/ci.yml)
[![MIT licencia](https://img.shields.io/badge/licencia-MIT-C15F3C)](LICENSE)

**Navrhnite geometriu. Spojte uzly. Rozhýbte mechanizmus.**

Slovenské webové štúdio na tvorbu, analýzu a simuláciu rovinných mechanizmov. Bez frameworku a bez inštalácie balíkov. Rozmery v **mm**, uhly v **°**, rovina **Z = 0**.

[![Ilustračná schéma štvorčlenu s vybraným uzlom a kontextovou ponukou](docs/readme-overview.svg)](#start)

*Ilustračná schéma, nie snímka aplikácie. Kliknutím prejdete na spustenie.*

**[Rýchly štart](#start)** · **[Stiahnuť zdrojový ZIP](https://github.com/bucala/Kinematicke_modely/archive/refs/heads/main.zip)** · **[Ovládanie](#controls)** · **[Výsledky overenia](VALIDATION.md)** · **[MIT licencia](LICENSE)**

> Kinematika a odhadová dynamika jedného pohonu, nie pevnostný výpočet ani výrobný výkres. Pred použitím návrhu si prečítajte [hranice simulácie](#limits).

<a id="navigation"></a>

## Vyberte, čo potrebujete

| Začínam používať | Chcem upravovať | Chcem preniesť alebo overiť |
|---|---|---|
| [Spustenie](#start) | [Úprava geometrie a voľné kópie](#editing) | [Súbory a reporty](#exports) |
| [Prvých pár minút](#quickstart) | [Výber a kontextové menu](#selection) | [Autodesk Fusion](#fusion) |
| [Šablóny mechanizmov](#templates) | [Skratky a ovládanie](#controls) | [Lokálne testy a vývoj](#development) |
| [Dvojite sklopeny suflik](#drawer) | [Pružiny a odhadová dynamika](#forces) | [GitHub a Cloudflare](#deployment) |
| [Časté otázky](#faq) | [Ukladanie a súkromie](#storage) | [Súbory projektu](#files) |

Kliknutím na názov rozbaľovacieho návodu ho otvoríte. Navigácia a návody fungujú priamo na GitHube, bez JavaScriptu.

Pri prvom otvorení začína editor prázdny. Uložený projekt sa obnoví bez zmeny. Jedinú ponuku projektov a šablón otvoríte kliknutím na **názov projektu so šípkou v hlavičke**. Obsahuje všeobecné šablóny, samostatný projekt **Dvojite sklopeny suflik**, uložené projekty, import a premenovanie.

<a id="start"></a>

## Spustenie

<details open>
<summary><strong>Bez inštalácie: stiahnuť, rozbaliť a otvoriť</strong></summary>

1. [Stiahnite zdrojový ZIP](https://github.com/bucala/Kinematicke_modely/archive/refs/heads/main.zip) alebo použite vlastný klon repozitára.
2. ZIP rozbaľte. Súbory a priečinky ponechajte spolu.
3. Otvorte `index.html` v aktuálnom Chrome, Edge alebo Firefox.
4. V hlavičke kliknite na **názov projektu so šípkou** a vyberte šablónu alebo vlastný mechanizmus.

Aplikácia používa klasické skripty, preto funguje aj cez `file://`. Pri otvorení súboru na GitHube sa zobrazí jeho zdroj, nie spustená aplikácia. Webové fonty sú voliteľné a majú systémový fallback; PDF modul aj jeho fonty sú lokálne.

Priame prepojenie s Fusion potrebuje [lokálny server alebo HTTPS](#fusion). Ostatné projektové a výkresové exporty fungujú aj bez servera.

</details>

<details>
<summary><strong>Lokálny server: Node.js 20.11 alebo novší</strong></summary>

V termináli otvorte koreň tohto repozitára a spustite:

```sh
npm run dev
```

Otvorte **[http://localhost:5173](http://localhost:5173)**. Balíky netreba inštalovať. Server počúva iba na lokálnom rozhraní; zastavíte ho cez Ctrl+C. CI používa Node.js 24 podľa [`.node-version`](.node-version).

Lokálny odkaz je dostupný až po spustení servera. Pre Fusion použite presne rovnaký pôvod aplikácie ako v adresnom riadku; `localhost` a `127.0.0.1` nie sú rovnaký Origin.

</details>

[Späť na navigáciu](#navigation)

<a id="quickstart"></a>

## Prvých pár minút

<details>
<summary><strong>Prezrieť hotový mechanizmus a vytvoriť vlastnú kópiu</strong></summary>

1. Kliknite na **názov projektu so šípkou v hlavičke → Štvorkĺbový mechanizmus**.
2. Vyberte **Simulácia**. Posuvníkom skúmajte polohy alebo medzerníkom spustite prehrávanie.
3. Kliknite na uzol alebo člen. Skúste **Shift + klik** na ďalší objekt a pravé tlačidlo.
4. Ak chcete meniť chránenú geometriu, zvoľte **Voľná kópia**. Originál zostane samostatný.
5. V **Úprave geometrie** upravte kópiu; potom v **Simulácii** overte jej väzby a upozornenia.
6. Cez **Exportovať → .kinmo** vytvorte prenosnú zálohu. Lokálne uloženie cez Ctrl/Cmd+S samo nevytvorí súbor.

</details>

<details>
<summary><strong>Vytvoriť vlastný bod s posuvným kĺbom a lineárnym pohonom</strong></summary>

1. V hlavičkovej ponuke otvorte **Vlastný mechanizmus**.
2. Pravým kliknutím na prázdne plátno pridajte samostatný voľný uzol.
3. Na uzle otvorte **Zmeniť typ väzby → Posuvný kĺb (Prismatic)**.
4. V dialógu kliknite na **Pridať nové lineárne vedenie**. Vznikne pevné priame vedenie od polohy uzla. Vyberte jeho dráhu a potvrďte **Použiť**.
5. Na uzle otvorte **Priradiť / upraviť pohon…** a nastavte:

   | Pole | Hodnota |
   |---|---|
   | Typ | Lineárny |
   | Rýchlosť | `40` mm/s |
   | Smer | `0`° |
   | Začiatok / koniec zdvihu | `0` / `100` mm |

6. Potvrďte, prepnite na **Simulácia** a spustite prehrávanie. Pri opakovaní sa smer na konci zdvihu obráti.

Toto je kinematický príklad. Nový bod má predvolene nulovú hmotnosť; samotný príklad preto nie je pripravený na odhadovú dynamiku. `v = 0` drží polohu. Záporné `v` určí počiatočný opačný smer.

</details>

[Späť na navigáciu](#navigation)

<a id="features"></a>

## Funkcie

<details>
<summary><strong>Rozbaliť celý prehľad funkcií</strong></summary>

- Knižnica prvkov: samostatný bod, pevný rám, lineárne vedenie, tiahlo, kulisa, ložisko, čelo, tlačná/ťažná pružina a tlačný/ťažný piest.
- Click+Select bodov, koncov členov, väzieb a telies; Shift/Ctrl multiselect, skupinový posun a kontextové menu.
- Pridávanie kliknutím alebo drag & drop, prichytávanie na mriežku, zarovnanie, zoom a meranie.
- Otočný kĺb, posuvný kĺb, čap vo vedení, pevné spojenie, vzdialenosť, rovnobežnosť a relatívny uhol; upraviteľný názov, uzly a hodnota.
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
- Tri trvalé vzhľady: biela/čierna, krémová/terakota a teplá tmavá/biela.
- Voliteľný lokálny doplnok Autodesk Fusion na vytvorenie nového referenčného dokumentu.
- Samostatný dvojkulisový projekt podľa náčrtu, obe trajektórie v sústave korpusu alebo zásuvky a viditeľné odhadové predpoklady.
- Responzívne rozhranie a klávesové skratky.

</details>

<a id="drawer"></a>

## Samostatný projekt: Dvojite sklopeny suflik

Otvorte **názov projektu so šípkou v hlavičke → Dvojite sklopeny suflik**. Obe zakrivené kulisy sa posúvajú so zásuvkou. Modré rameno má pevnú dĺžku a ložiská A/B pevný rozstup. Model najprv sklopí čelo z 90° na odhadových 65° počas 60 mm zdvihu, potom pokračuje spoločným posuvom do 300 mm bez zmeny uhlov.

| Výsuv | Uhol čela | Fáza |
|---|---|---|
| 0 mm | 90° | Zatvorené |
| 60 mm | 65° | Dokončené sklopenie |
| 300 mm | 65° | Spoločný posuv, otvorené |

Trajektórie zobrazujú oba vodiace body. V sústave zásuvky ležia v jej kulisách a po sklopení sa už nepredlžujú; v sústave korpusu zahŕňajú aj posuv. Graf obsahuje uhol čela aj ramena. CSV export pridáva obe ložiská v oboch sústavách, uhol ramena, fázu a označenie odhadových rozmerov.

**Geometria je odhadová, nie výrobný výkres.** Zadná opora, plynulé uvoľnenie čapu a pevný výrez stola sú doplnené predpoklady, nie zmerané detaily. Rozmery aj oba profily možno upraviť v inšpektore; nezlučiteľné kulisy vyvolajú blokovanie. Každé otvorenie pripraveného projektu vytvorí nový exemplár a neprepíše predchádzajúce úpravy.

Podrobný rozbor a pôvodný náčrt: [`projects/dvojite-sklopeny-suflik.md`](projects/dvojite-sklopeny-suflik.md). V aplikácii ich otvoríte cez **Odhadové rozmery · predpoklady**.

<a id="templates"></a>

## Šablóny mechanizmov

<details>
<summary><strong>Výsuv s vyklápacím čelom</strong></summary>

Východiskový korpus a vedenie majú dĺžku 390 mm, zdvih 300 mm a čelo dĺžku 160 mm. Ložisko je 65 mm od otočného čapu. Čelo zostáva vertikálne do posuvu 110 mm a následne sa plynulo vyklopí z 90° na 0°.

Pri parametrickom profile sa výrobná drážka odvodí z dráhy ložiska podľa hladkého pohybového zákona. **Pri každej polohe solver rieši priesečník tejto drážky s kružnicou, ktorej stred je otočný čap a polomer je vzdialenosť ložiska.** Pri úprave voľnej krivky sa nedosiahnuteľná poloha označí, nie maskuje presunutím ložiska mimo drážky.

</details>

<details>
<summary><strong>Štvorkĺbový mechanizmus</strong></summary>

Polohy členov sa riešia analytickým priesečníkom kružníc. Dĺžky zostávajú konštantné; solver udržiava rovnakú montážnu vetvu.

</details>

<details>
<summary><strong>Kľukový mechanizmus</strong></summary>

Poloha piesta sa vypočíta z pevnej dĺžky ojnice a osi priamkového vedenia.

</details>

<details>
<summary><strong>Vlastný mechanizmus a jeho solver</strong></summary>

Pridajte pevné body, vedenia, ramená a ložiská. Nástrojom **J** vyberte dva uzly. Kliknutím na drážku a uzol sa vytvorí čap vo vedení. Ložisko sa dá na kulisu naviazať aj priamo v inšpektore.

Lineárne vedenie má riadený uzol **C**. Spojte ho so začiatkom ramena alebo čela. Na vlastnom ramene môžete zapnúť rotačný pohon; jeho začiatočný bod potom zostáva pevný. Aktivácia rotačného pohonu vypne ostatné vlastné pohony.

Vlastné uzavreté reťazce používajú iteratívnu projekciu tuhých telies. Solver nemení dĺžky ramien. Ak nedosiahne toleranciu 0,05 mm, nahlási nesplnenú väzbu. Pri zložitom alebo presne singularitnom reťazci upravte počiatočnú konfiguráciu, dĺžky alebo pevné uloženia.

Súradnice editora používajú SVG konvenciu: X rastie doprava a Y nadol. Kladný uhol otáča rameno proti smeru hodinových ručičiek.

</details>

<a id="editing"></a>

## Voľná editácia a kóty

**Úprava geometrie** ponechá navrhnuté polohy bez nútenia väzieb. **Simulácia** vynúti väzby; nekompatibilitu označí. Texty rozhrania sa nedajú označovať, vrátane hlavičky a dialógov. Vstupné polia, textové oblasti a editovateľný obsah naďalej umožňujú výber textu aj Ctrl+A.

Panel **Vlastnosti** je pri otvorení aplikácie a načítaní projektu skrytý. Otvorí sa iba tlačidlom panelu vedľa nastavení. Výber na plátne, pridanie prvku ani prepnutie na analýzu ho neotvoria. Už ručne otvorený panel môžete skryť rovnakým tlačidlom, krížikom alebo Escape mimo vstupného poľa.

Parametrickú šablónu zmeníte bez obmedzení cez **Voľná kópia**. Originál zostane samostatne uložený. Kópia dvojkulisovej zásuvky zachová aktuálnu geometriu a presné profily, **nepreberá však predpísanú funkciu zadnej opory/západky**. Má jednu ďalšiu voľnú súradnicu; pred odhadovou dynamikou treba skutočne doplniť vhodné uloženie.

V inšpektore upravíte obrys, vrcholy krivky, nosné teleso, kóty a uložené trajektórie. Meranie vytvorí referenčnú kótu. Riadiaca dĺžka mení člen alebo vytvorí vzdialenostnú väzbu. Vypočítaná trajektória nie je sama vodiaca väzba; jej prevedená krivka je nezávislá kópia.

<a id="selection"></a>

## Výber a kontextové úpravy

Ľavým kliknutím vyberiete bod, kĺb alebo telo členu. Koncové body majú prednosť pred telesom a približovanie nemení veľkosť ich klikateľnej oblasti. **Shift/Ctrl/Cmd + klik** pridá alebo odoberie položku. Kliknutie na prázdne plátno výber zruší. Symboly a kurzor odlišujú pevné, voľné a poháňané body; akcent zvýrazňuje výber.

**Pravé tlačidlo** otvorí vlastnú ponuku, nie ponuku prehliadača. Pravý klik na už vybraný objekt zachová skupinu. Ponuka sa zmestí do viewportu a zavrie sa kliknutím mimo nej, Escape, posunom alebo priblížením plátna. Klávesnica podporuje Shift+F10, šípky, Home/End, Enter a Escape. Výber ani kontextové formuláre automaticky neotvárajú Vlastnosti.

| Cieľ ponuky | Operácie |
|---|---|
| Bod / kĺb | Otočný alebo posuvný kĺb, odpojenie, fixácia, pohon, limity, absolútne XYZ, mriežka 5 mm, zarovnanie, trajektória a odstránenie |
| Telo jednoduchého ramena | Rozdelenie v strede na dva členy s otočným uzlom, pripojený POI s trajektóriou, dĺžka, referenčná tuhosť, farba a odstránenie |
| Prázdne plátno | Samostatný bod, pevný Ground bod, priame vedenie, štvorkĺbová alebo kľuková podzostava a prispôsobenie pohľadu |

<details>
<summary><strong>Čo presne zmenia fixácia, väzby, pohon a odstránenie</strong></summary>

- Samostatný bod má dve polohové súradnice, nulovú predvolenú hmotnosť a žiadnu fiktívnu rotáciu. Jeho fixácia odoberie obe súradnice. Fixácia jedného konca ramena ponechá ramenu otáčanie okolo neho.
- **Posuvný kĺb** vyžaduje priame vedenie. Bod môže ísť iba po priamke; orientovaný posúvač navyše zachová relatívny uhol. **Čap vo vedení** naopak umožňuje rotáciu a aj zakrivenú kulisu.
- Pohon používa `v` v mm/s alebo `ω` v °/s, vybraný pivot A/B/C a jeden nezávislý vstup. Záporná rýchlosť začína na hornom limite a určí počiatočný opačný smer. Nula drží polohu. Pri opakovaní sa smer na doraze obracia. Starší pohon bez zadanej rýchlosti používa trvanie cyklu; odhadová dynamika sa stále počíta zo síl.
- Limity pasívneho otočného kĺbu sú relatívny uhol B − A, od −180° do 180°. Limity posuvného kĺbu sú vzdialenosti od začiatku vedenia. Sú to jednostranné dorazy, nie dodatočné rovnostné väzby, ktoré by odstránili neurčenú voľnosť.
- Fixácia počas simulácie zachová aktuálnu polohu. Zastavený vlastný vozík C si pamätá posuv; jeho uvoľnenie obnoví lineárny pohon, iba ak model nemá ďalší nezávislý pohon.
- Delenie je dostupné pre jednoduché, voľne upraviteľné rameno bez obrysu. Hmotnosť sa rozdelí rovnomerne; operácia pridá skutočné členy, bod a väzby. Geometrické delenie prepne do návrhového režimu.
- **Odstránenie konca členu odstráni celý jeho vlastný člen**, nie izolovaný vrchol tuhého telesa. Dialóg to oznámi. Samostatný bod odstráni iba bod, kĺb iba väzbu. Závislé odkazy sa vyčistia a oddelené POI zachovajú polohu.
- Skupinové úpravy sú atómové: neplatná zmena neprepíše model ani históriu. Ťahanie vytvorí jeden krok Späť; jednoduchý klik, návrat na začiatok a zrušené ťahanie nepridajú prázdny krok. Späť/znova obnovia aj výber.
- Riadené originály sú chránené. Ich ponuka umožní vytvoriť samostatnú **Voľnú kópiu**, nie potichu prepísať šablónu.

</details>

Editor zostáva **2D, Z = 0**. Referenčná tuhosť tuhého ramena sa ukladá ako údaj, ale nemení deformáciu ani vypočítanú silu. Na silový účinok použite pružinu. Farba sa zachová v natívnom projekte, na plátne a v SVG/PDF/HTML výkrese; DXF a Fusion používajú referenčné vrstvy, nie plný vzhľad editora.

[Späť na navigáciu](#navigation)

<a id="forces"></a>

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

<a id="exports"></a>

## Vzhľady, súbory a reporty

V **Nastaveniach → Vzhľad aplikácie** vyberte bielu/čiernu, krémovú/terakotu alebo teplú tmavú/bielu. Krémový vzhľad vychádza z [palety Claude](https://mobbin.com/colors/brand/claude): Pampas `#F4F3EE`, biela `#FFFFFF`, terakota Crail `#C15F3C` a Cloudy `#B1ADA1` pre hlavné čiary mriežky. Drobný text používa tmavší odtieň kvôli čitateľnosti. Existujúce nastavenie `orange` automaticky použije novú krémovú paletu; identifikátory súborov a nastavení sa nemenia. Mechanické farby členov a upozornení si zachovávajú význam vo všetkých vzhľadoch.

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

<a id="fusion"></a>

## Autodesk Fusion

Otvorte **Exportovať → Autodesk Fusion**, stiahnite ZIP a doplnok spustite ručne vo Fusion. Povoľte presný pôvod aplikácie, vložte dočasný kľúč, overte spojenie, označte súhlas a odošlite výkres. Kľúč sa neukladá.

<details>
<summary><strong>Inštalácia doplnku a párovací kód krok za krokom</strong></summary>

1. Rozbaľte ZIP do priečinka `KinmoFusion`, napríklad `C:\KinmoFusion`. V ňom musia byť priamo `KinmoFusion.py`, `bridge.py` a `KinmoFusion.manifest`.
2. Vo Fusion otvorte **Utilities → Scripts and Add-Ins → Add-Ins**.
3. Otvorte **šípku vedľa + → Script or add-in from device** a vyberte tento priečinok. V niektorých verziách otvorí výber zariadenia priamo tlačidlo **+**. Nevytvárajte novú prázdnu šablónu doplnku.
4. Vyberte **KinmoFusion → Run**. Zadajte presný HTTP(S) pôvod otvoreného štúdia, bez cesty alebo parametrov.
5. Kód z bežiaceho **KinmoFusion** vložte do štúdia cez **Exportovať → Autodesk Fusion → Overiť spojenie**.
6. Až po overení označte súhlas a zvoľte **Odoslať nový referenčný výkres**.

Ak sa kód nezobrazí, skontrolujte, že beží **KinmoFusion**, nie vlastný prázdny doplnok s iným názvom. `file://` na párovanie nestačí. Pri blokovaní lokálnych požiadaviek použite **DXF → Insert DXF**, jednotky mm.

</details>

Doplnok počúva len na `127.0.0.1:8765`. Vytvorí **nový, neuložený referenčný dokument** s fixovanými 2D krivkami; existujúce návrhy nemení ani neukladá. Nevytvára 3D zostavu ani Fusion joints. Priame spojenie potrebuje HTTP(S), nie `file://`; alternatíva je DXF. Limit je 2 MB / 2 000 entít / 30 000 bodov. Po práci doplnok zastavte.

Podrobný postup a obmedzenia sú v [`cad/KinmoFusion/README.md`](cad/KinmoFusion/README.md). Skutočný import v živom Fusion zostáva manuálnym akceptačným testom.

<a id="controls"></a>

## Ovládanie a skratky

| Myš / gesto | Akcia |
|---|---|
| Ľavý klik na objekt | Vybrať bod, kĺb alebo člen |
| Shift/Ctrl/Cmd + klik | Pridať alebo odobrať položku výberu |
| Ťahanie vybraného objektu | Posun geometrie alebo skupiny v editačnom režime |
| Klik na prázdne plátno | Zrušiť výber |
| Pravý klik | Ponuka bodu, členu, kĺbu alebo plátna |
| Pravý klik na vybraný objekt | Zachovať skupinu a otvoriť jej ponuku |
| Koliesko | Priblížiť / oddialiť plátno |
| Klik na graf | Nastaviť polohu pohonu |

| Skratka | Akcia |
|---|---|
| Medzerník | Prehrať / pozastaviť |
| V / H / J / M | Výber / posun plátna / spojenie / meranie |
| F | Fixovať / uvoľniť vybrané body |
| Shift + F | Prispôsobiť pohľad |
| Shift + F10 | Kontextová ponuka vybraného objektu / plátna |
| Šípky, Shift + šípky | Posuv pohonu o 1 alebo 10 jednotiek |
| Ctrl/Cmd + S | Uložiť lokálne |
| Ctrl/Cmd + Z | Späť |
| Ctrl/Cmd + Shift + Z | Znova |
| Ctrl/Cmd + D | Duplikovať |
| Delete / Backspace | Odstrániť výber vrátane závislých odkazov |
| Esc | Zavrieť ponuku, zrušiť ťahanie / výber alebo zavrieť dialóg |

V otvorenej kontextovej ponuke použite šípky, Home/End, Enter a Escape. Vo vstupnom poli majú textové skratky prednosť; Ctrl/Cmd+A tam označí text, nie celý editor.

<a id="storage"></a>

## Ukladanie a súkromie

Projekty zostávajú v `localStorage` aktuálneho prehliadača. Uchováva sa najviac 20 projektov a 60 krokov histórie. Na zálohovanie a prenos použite `.kinmo`, najmä pri vypnutom úložisku alebo súkromnom prehliadaní. CSV ani report nenahrádzajú natívny projekt.

Import akceptuje `.kinmo` obálku verzie 2 alebo starší projekt verzie 1: najviac 120 prvkov, 240 väzieb, 120 kót a 60 trajektórií, limit súboru 2 MB. Obrysy majú 3–64 vrcholov a polyline 2–1 001. Validujú sa jednotky, rozsahy, odkazy, cykly nosných telies a fyzikálne parametre. Importované názvy sa escapujú.

Export `.kinmo` aj JSON používa kompaktný zápis a rovnaký limit 2 MB. Príliš veľký projekt odmietne namiesto vytvorenia zálohy, ktorú nemožno znova importovať.

Exporty neopúšťajú zariadenie. Pri explicitnom CAD odoslaní ide geometria do lokálneho doplnku. Aplikácia nepoužíva cloudové CAD prihlasovacie údaje a sama CAD dokument nesynchronizuje; vlastné ukladanie/synchronizáciu Fusion riadi používateľ.

<a id="faq"></a>

## Časté otázky

<details>
<summary><strong>Prečo je plátno prázdne a kde sú projekty?</strong></summary>

Prvé otvorenie je zámerne prázdne. Kliknite na **názov projektu so šípkou v hlavičke**. Je to jediný vstup k šablónam, samostatnej zásuvke, uloženým projektom a importu. Existujúci uložený projekt sa obnoví automaticky.

</details>

<details>
<summary><strong>Prečo sa Vlastnosti po výbere neotvoria?</strong></summary>

Panel je zámerne manuálny. Otvorte ho tlačidlom **Vlastnosti** vedľa nastavení. Výber, pridanie prvku ani analýza ho sami neotvárajú. Bežné úpravy uzla nájdete aj v jeho kontextovej ponuke.

</details>

<details>
<summary><strong>Prečo nemožno upraviť alebo odstrániť člen šablóny?</strong></summary>

Riadené originály sú chránené. Použite **Voľná kópia** a upravujte nezávislý projekt. Nová kópia neprepíše originál; pri dvojkulisovej zásuvke však nepreberie predpísanú zadnú oporu/západku.

</details>

<details>
<summary><strong>Čím sa líši posuvný kĺb od čapu vo vedení?</strong></summary>

**Posuvný kĺb** vyžaduje priamku a pri orientovanom telese bráni aj relatívnej rotácii. **Čap vo vedení** sleduje aj zakrivenú dráhu a rotáciu umožňuje. Samostatný bod nemá rotačnú súradnicu. Tieto väzby nie sú iba rôzne názvy rovnakej operácie.

</details>

<details>
<summary><strong>Prečo solver blokuje pohyb alebo odmieta dynamiku?</strong></summary>

Pozrite upozornenia a zostávajúcu voľnosť modelu. Odhadová dynamika potrebuje jeden nezávislý pohon, určité väzby a použiteľnú hmotnosť. Samostatný nový bod má hmotnosť 0. Pružina ani jednostranný doraz nenahradia chýbajúce uloženie. Pri neplatnej geometrii, singularite alebo doraze sa simulácia zastaví; nevytvára fyzikálny náraz.

</details>

<details>
<summary><strong>Ako preniesť projekt na iný počítač alebo prehliadač?</strong></summary>

Exportujte **.kinmo** a v druhom štúdiu použite import v hlavičkovej ponuke. `localStorage` je viazaný na prehliadač a pôvod stránky; `localhost`, `127.0.0.1`, `file://` a produkčný web môžu mať oddelené úložiská. Vymazanie dát prehliadača môže odstrániť lokálne projekty. PDF, CSV ani DXF nie sú editovateľná záloha projektu.

</details>

[Späť na navigáciu](#navigation)

<a id="limits"></a>

## Hranice simulácie

Kinematika je polohový solver. Voliteľná dynamika je **odhad jedného pohonu**, nie všeobecná viacstupňová fyzika, pevnostný výpočet či overenie výrobku. Nezahŕňa kontaktné reakcie, pružné deformácie tuhých telies, nárazy, funkciu západky, teplotu plynu ani životnosť ložísk.

Geometrické kolízie sa vyhodnocujú v jednej 2D rovine; pri ramenách ide o kríženie stredníc. Vlastné polygonálne obrysy slúžia na kreslenie/CAD, nie na všeobecnú kontaktnú fyziku. Ramená v rôznych rovinách môžu byť v skutočnom výrobku priechodné. 121 diskrétnych polôh nezaručuje kontinuálnu bezkolízovosť.

Predpísané uvoľnenie opory dvojkulisového projektu **nie je dynamicky overené**. Jeho voľná kópia potrebuje doplniť chýbajúce uloženie; pripojenie pružiny samo neodstráni neurčený stupeň voľnosti.

Pri blokovaní sa pohon zastaví a problém sa zobrazí. Ručným pohonom možno preskúmať aj neplatnú konfiguráciu. Riadené členy šablón zostávajú chránené; na ľubovoľnú zmenu použite samostatnú voľnú kópiu.

<a id="development"></a>

## Lokálne testy a vývoj

<details>
<summary><strong>Príkazy na kontrolu, testy a zostavenie</strong></summary>

Spúšťajte v koreni repozitára. Nie je potrebné `npm install`.

```sh
npm run check       # Kontrola syntaxe JavaScriptu
npm test           # Solver, editor, fyzika, UI, exporty a CAD transport
npm run build      # Statická aplikácia do dist/
npm run preview    # Lokálny náhľad dist/, predtým spustite build
```

Voliteľne s Pythonom 3.10+:

```sh
python -B tests/test_fusion.py
```

Python testy používajú izolovaný lokálny most a náhradné Fusion API. Neotvárajú CAD aplikáciu.

Bez Node.js môžete otvoriť `tests/browser.html`. Spúšťa spoločné výpočtové testy; transportné, archivačné a VM UI testy bežia v Node.js. Pri vývojovom serveri otvorte [prehliadačové testy](http://localhost:5173/tests/browser.html).

</details>

| Posledné zaznamenané lokálne overenie | Výsledok |
|---|---|
| Syntax, JavaScript testy a build | 266 JS testov, bez zlyhania |
| Izolovaný Python / Fusion | 20 testov, bez zlyhania |
| Spoločné prehliadačové testy | 208 / 208 cez HTTP aj `file://` |
| Click+Select v prehliadači | 46 / 46 desktop, 46 / 46 mobil |

Rozsah a dátumy sú v **[VALIDATION.md](VALIDATION.md)**. Prehliadačové gestá boli syntetické; nenahrádzajú úplné natívne ťahanie. Plynulosť prirodzenej animácie, kompletné snímky rozhrania a živý Fusion import zostávajú manuálnymi akceptačnými kontrolami. Lokálne výsledky nie sú potvrdením vzdialeného CI alebo nasadenia.

Pri oprave chyby pridajte regresiu do príslušnej sady v [`tests/`](tests/). Zachovajte fungovanie cez HTTP aj `file://`, ochranu originálov a pripnuté bajty PDF distribúcií.

<a id="deployment"></a>

## GitHub a Cloudflare Workers

Zdrojový repozitár je **[bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely)**, produkčná vetva **main** a existujúci Cloudflare Worker **kinematicke-modely**. Táto verzia zahŕňa Click+Select, kontextové operácie a ich testy. Podrobný postup publikovania je v **[DEPLOYMENT.md](DEPLOYMENT.md)**.

[GitHub Actions](https://github.com/bucala/Kinematicke_modely/actions/workflows/ci.yml) kontrolujú syntax, JavaScript, izolované Python CAD testy a build pri pushi a pull requeste na `main`. Nasadzovanie cez **Workers Builds** sa pripája v nastaveniach existujúceho Workeru.

<details>
<summary><strong>Nastavenia Workers Builds a manuálne nasadenie</strong></summary>

| Nastavenie | Hodnota |
|---|---|
| Názov Workeru | `kinematicke-modely` |
| GitHub repozitár | `bucala/Kinematicke_modely` |
| Produkčná vetva | `main` |
| Build command | `npm run check && npm test && npm run build` |
| Deploy command | `npm run deploy` |
| Static assets directory | `dist`, podľa [`wrangler.toml`](wrangler.toml) |
| Root directory | koreň repozitára |
| Node.js | `24`, podľa [`.node-version`](.node-version) |

`wrangler.toml` viaže existujúci Worker, jeho účet a statické súbory. Build pridáva bezpečnostné HTTP hlavičky z [`_headers`](_headers). Netreba vlastný serverový Worker skript.

Pri výslovne schválenom manuálnom nasadení a po autorizácii Wrangler:

```sh
npm run deploy
```

Príkaz najprv kontroluje syntax, testuje a zostaví aplikáciu; potom **nahradí produkčné nasadenie**. Git commit alebo push nie sú samostatným lokálnym deploy príkazom. Konfiguračné súbory samy neprepájajú Cloudflare s GitHubom.

</details>

Stav vzdialeného CI overte v GitHub Actions; aktuálny Workers build a skutočnú produkčnú URL v Cloudflare. Úspech nasadenia sa neodvodzuje z lokálnych testov. [História overenia a publikovania](VALIDATION.md).

<a id="files"></a>

## Súbory

<details>
<summary><strong>Rozbaliť mapu zdrojov</strong></summary>

```text
index.html             Vstupný bod, funguje aj bez servera
app.js                 Editor, SVG plátno, pohon, grafy a ukladanie
engine.js              Geometria, kinematické solvery a validácia
double-drawer.js       Samostatný odhadový dvojkulisový projekt
editor.js              Návrhové polohy, voľné kópie, kóty a analýza voľnosti
interaction.js         Výberové identity, hit-testing a atómové modelové operácie
context-menu.js        Samostatná klávesnicová a responzívna kontextová ponuka
physics.js             Osové sily a odhadová dynamika jedného pohonu
exports.js             .kinmo, SVG, DXF, CSV a PDF/HTML reporty
cad.js                 Výslovný prenos do lokálneho Fusion doplnku
cad/KinmoFusion/       Doplnok, transport a návod
vendor/pdfmake/        Offline PDF modul a licencie MIT / SIL OFL
projects/              Referenčný náčrt a rozbor projektu
docs/readme-overview.svg  Ilustračný prehľad pre GitHub README
styles.css             Responzívne rozhranie
scripts/server.mjs     Bez-závislostný lokálny HTTP server
scripts/build.mjs      Zostavenie statického dist/
scripts/archive.mjs    Deterministický ZIP doplnku
tests/cases.js         Spoločná sada testov
tests/interaction-cases.js  Modelové regresie výberu a kontextových operácií
tests/kinematics.test.mjs  Node.js test runner
tests/export-integration.test.mjs  Transport, ZIP a offline PDF distribúcia
tests/test_fusion.py   Izolovaný most a náhradné Fusion API
tests/ui.test.mjs      Skutočné UI funkcie v izolovanom VM
tests/browser.html     Test runner priamo v prehliadači
```

</details>

**[Naspäť na navigáciu](#navigation)** · **[Spustenie](#start)** · **[Návod Fusion](cad/KinmoFusion/README.md)** · **[Overenie](VALIDATION.md)** · **[Nasadenie](DEPLOYMENT.md)**
