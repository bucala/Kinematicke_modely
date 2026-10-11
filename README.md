# Kinematika Studio

[![CI](https://github.com/bucala/Kinematicke_modely/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bucala/Kinematicke_modely/actions/workflows/ci.yml)
[![MIT licencia](https://img.shields.io/badge/licencia-MIT-C15F3C)](LICENSE)

**Navrhnite geometriu. Spojte uzly. Rozhýbte mechanizmus.**

Slovenské webové štúdio na tvorbu, analýzu a simuláciu rovinných mechanizmov. Bez frameworku a bez inštalácie balíkov. Rozmery v **mm**, uhly v **°**, rovina **Z = 0**.

[![Ilustračná schéma štvorčlenu s vybraným uzlom a kontextovou ponukou](docs/readme-overview.svg)](#start)

*Ilustračná schéma, nie snímka aplikácie. Kliknutím prejdete na spustenie.*

**[Rýchly štart](#start)** · **[Stiahnuť zdrojový ZIP](https://github.com/bucala/Kinematicke_modely/archive/refs/heads/main.zip)** · **[Ovládanie](#controls)** · **[História zmien](CHANGELOG.md)** · **[Výsledky overenia](VALIDATION.md)** · **[MIT licencia](LICENSE)**

> Kinematika a odhadová dynamika jedného pohonu, nie pevnostný výpočet ani výrobný výkres. Pred použitím návrhu si prečítajte [hranice simulácie](#limits).

## Nové lokálne úpravy: panely, schéma a animovaný export

Pracovná verzia nad `dc24ef2` pridáva **[nezávislé skrytie profilového grafu, prehrávania a popisov](#view-controls)**, ostrú PDF schému podľa aktuálneho plátna a **[lokálny animovaný GIF](#gif-export)**. Tieto zmeny ešte nie sú novým publikovaným commitom ani potvrdeným nasadením.

## Novinky z 11. 10. 2026

- **[Magic import](#magic-import):** nahrajte náčrt, určte mierku A/B, obkreslite pevné časti, vložte členy a väzby a vytvorte samostatný projekt cez Finish. Obrázok zostáva lokálny; ide o ručné obkreslenie.
- **[Presné úchyty](#handles)** a **[diagnostika väzieb](#diagnostics)** priamo v editore, s oddelenými chybami v mm/°.
- **[Inteligentné prichytávanie](#snapping)** je predvolene vypnuté, zapína sa iba tlačidlom a nový spoj potrebuje potvrdenie.
- **[Vlastné podzostavy](#assemblies)** a **[pomenované verzie](#versions)** s prenosnými kolekciami, porovnaním a zálohou pred obnovením.
- **[Referenčné obrysy drážok](#slot-outlines)** pre DXF/Fusion bez straty stredníc.

Podrobný záznam noviniek, opráv a hraníc je v **[CHANGELOG.md](CHANGELOG.md)**.

<a id="navigation"></a>

## Vyberte, čo potrebujete

| Začínam používať | Chcem upravovať | Chcem preniesť alebo overiť |
|---|---|---|
| [Spustenie](#start) | [Úprava geometrie a voľné kópie](#editing) | [Súbory a reporty](#exports) |
| [Prvých pár minút](#quickstart) | [Výber a kontextové menu](#selection) | [Autodesk Fusion](#fusion) |
| [Šablóny mechanizmov](#templates) | [Skratky a ovládanie](#controls) | [Lokálne testy a vývoj](#development) |
| [Dvojite sklopeny suflik](#drawer) | [Pružiny a odhadová dynamika](#forces) | [GitHub a Cloudflare](#deployment) |
| [Časté otázky](#faq) | [Ukladanie a súkromie](#storage) | [Súbory projektu](#files) |
| [Úchyty a presné rozmery](#handles) | [Diagnostika väzieb](#diagnostics) | [Referenčné obrysy drážok](#slot-outlines) |
| [Prichytávanie na požiadanie](#snapping) | [Vlastné podzostavy](#assemblies) | [Pomenované verzie a porovnanie](#versions) |
| [Magic import z náčrtu](#magic-import) | [Mierka a pevný rám](#magic-import) | [Bezpečné Finish alebo zrušenie](#magic-import) |
| [Skrytie panelov a popisov](#view-controls) | [Aktuálny výrez do PDF](#exports) | [Animovaný GIF](#gif-export) |

Kliknutím na názov rozbaľovacieho návodu ho otvoríte. Navigácia a návody fungujú priamo na GitHube, bez JavaScriptu.

Pri prvom otvorení začína editor prázdny. Uložený projekt sa obnoví bez zmeny. Jedinú ponuku projektov a šablón otvoríte kliknutím na **názov projektu so šípkou v hlavičke**. Obsahuje všeobecné šablóny, samostatný projekt **Dvojite sklopeny suflik**, uložené projekty, import, premenovanie, vlastné podzostavy a pomenované verzie.

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
- **Magic import**: lokálny obrázok, mierka z dvoch bodov, ručne obkreslený rám, členy a väzby, samostatný projekt cez Finish.
- Priame úchyty X/Y, otočenie okolo zvoleného bodu, dĺžka jednoduchého člena a presné číselné zadanie bez otvárania Vlastností.
- Samostatná diagnostika konkrétnych väzieb, oddelené chyby v mm/°, zostávajúca voľnosť a upozornenia na opakované alebo konfliktné požiadavky.
- Inteligentné prichytávanie bodov, stredov, vedení a osí, **iba po zapnutí tlačidlom**. Nový spoj vyžaduje ďalšie potvrdenie.
- Otočný kĺb, posuvný kĺb, čap vo vedení, pevné spojenie, vzdialenosť, rovnobežnosť a relatívny uhol; upraviteľný názov, uzly a hodnota.
- Inšpektor rozmerov, polohy, uhlov, ložísk, pohybových limitov a kontrolných bodov.
- Ručné ťahanie výsuvu a čela s inverzným kinematickým výpočtom.
- Automatický pohon, nastavenie rýchlosti, trvania cyklu, opakovania a presnej polohy.
- Parametrická kulisa, oblúk, Bézierova krivka, spline a polyline; editovateľné vrcholy, nosné teleso a polygonálny obrys.
- Vizualizácia troch polôh a trajektória ľubovoľného dostupného uzlového bodu.
- Živý graf pohybového profilu; kliknutím na graf sa nastaví poloha.
- Nezávislé skrytie profilového grafu a prehrávania časovej osi, s trvalo dostupnými tlačidlami na obnovenie.
- Vypnutie vizuálnych názvov, textov a uhlových anotácií schémy bez zmeny kót, geometrie alebo väzieb.
- Detekcia nedosiahnuteľných väzieb, nesprávneho priemeru ložiska, kríženia ramien a kolízie s korpusom.
- Späť/znova, duplikovanie, pomenovanie a viditeľnosť prvkov.
- Oddelená úprava geometrie a simulácia; samostatná voľná kópia ponechá parametrický originál nezmenený.
- Uložené referenčné a riadiace kóty, pomenované trajektórie a prevod platnej vypočítanej trajektórie na nezávislú vodiacu krivku.
- Sily pružín/piestov, hmotnosť, ťažisko, zotrvačnosť, gravitácia, tlmenie, trenie a jeden vonkajší pohon; odhadová dynamika.
- Automatické lokálne ukladanie, zoznam projektov, validovaný import `.kinmo` aj staršieho JSON.
- Prenosná knižnica vybraných podzostáv s vnútornými väzbami a nezávislými kópiami pri vložení.
- Pomenované verzie, obnovenie so zálohou aktuálneho stavu a porovnanie návrhových rozmerov.
- Export `.kinmo`, JSON, CSV, SVG v mm, PNG, animovaného GIF, DXF a lokálne vytvoreného PDF/HTML reportu.
- PDF so skutočnou ostro vykreslenou schémou, vyberateľným slovenským textom a vektorovými grafmi.
- Tri trvalé vzhľady: biela/čierna, krémová/terakota a teplá tmavá/biela.
- Voliteľný lokálny doplnok Autodesk Fusion na vytvorenie nového referenčného dokumentu.
- DXF/Fusion strednice aj voliteľné uzavreté referenčné obrysy drážok podľa šírky, vrátane vnútorného obrysu uzavretej strednice.
- Samostatný dvojkulisový projekt podľa náčrtu, obe trajektórie v sústave korpusu alebo zásuvky a viditeľné odhadové predpoklady.
- Responzívne rozhranie a klávesové skratky.

</details>

<a id="magic-import"></a>

## Magic import: od ručného náčrtu k mechanizmu

**Magic import** v hlavičke otvorí päťkrokového sprievodcu. Ide o **ručné obkreslenie**, nie automatické rozpoznávanie členov z obrázka. Vytvára samostatný vlastný projekt a funguje aj offline cez `file://`.

<details>
<summary><strong>Nahrať náčrt, určiť mierku a zostaviť schému</strong></summary>

1. **Obrázok:** nahrajte PNG, JPG alebo neanimovaný WebP, prípadne ho pustite na sprievodcu či plátno. Limit je 10 MB, 8 192 px na stranu a 16 miliónov pixelov. SVG, GIF a HEIC najskôr preveďte na podporovaný raster.
2. **Mierka:** kliknite na body **A a B** známeho rozmeru a zadajte ich skutočnú vzdialenosť v **mm**. Súradnice možno zadať aj číselne. Bod A bude začiatkom; X rastie doprava a Y nadol. Kliknite na **Ďalej**.
3. **Pevné časti:** dvoma kliknutiami vytvorte pevnú úsečku/podlahu. **Obrys rámu** kreslite po vrcholoch a uzavrite Enter, tlačidlom alebo kliknutím pri prvom bode. **Pevný bod** vytvorí nepohyblivý uzol. Obrys má najviac 64 vrcholov; ďalšie vrcholy ponúknu uzly na pripojenie členov.
4. **Členy a väzby:** na desktope pretiahnite prvok z knižnice. Na dotykovom zariadení otvorte knižnicu, vyberte typ a kliknite na bod vloženia. Rameno, čelo alebo priame vedenie môžete aj obkresliť dvoma koncami. Upravte voľné členy úchytmi alebo číselným dialógom; **Spojiť uzly (J)** prepojí dva body a **Typ / nová väzba…** nastaví požadovaný typ. **Pohon…** upraví jeden vybraný vstup.
5. **Dokončenie:** zadajte názov, prezrite počty a upozornenia a kliknite na **Finish**. Schéma ostane v editore ako samostatný projekt. Potom prepnite na simuláciu a overte funkciu väzieb.

Pri prekrývajúcich sa uzloch vyberte prvý bod a kliknite znova na rovnaké miesto: druhý bod musí patriť inému členu. Na nastavenie pohonu vyberte telo člena mimo spoločného uzla, potom **Pohon…**.

Vlastnosti sa samy neotvoria. Inteligentné prichytávanie začína vypnuté a zapína sa iba tlačidlom. Pri kreslení Ctrl/Cmd+Z alebo Backspace odoberie posledný rozkreslený vrchol; Escape zruší náhľad. Dokončené časti používajú bežné Späť/znova.

Vyberte dlhý známy úsek, aspoň 2 pixely. Známy rozmer musí byť 0,1–5 000 mm a celý kalibrovaný podklad sa musí zmestiť do rozsahu ±5 000 mm. Jedna mierka **neopravuje perspektívu, natočenie roviny ani skreslenie objektívu**. Kalibrácia neotáča obrázok. Fotografia šikmo odfotenej zostavy nie je presný technický výkres.

</details>

<details>
<summary><strong>Čo zachová Finish a ako bezpečne zrušiť import</strong></summary>

- Počas sprievodcu sa rozpracovaná schéma automaticky neukladá medzi hotové projekty a neprepisuje predvoľby. Geometriu možno samostatne exportovať do `.kinmo` v poslednom kroku.
- **Zrušiť** po kreslení vyžaduje potvrdenie a obnoví pôvodný projekt, výber a celú históriu. Rozpracovaná schéma sa zahodí; ak bol pôvodný projekt neuložený, pokračuje jeho bežné ukladanie.
- **Finish** uloží nový aj potrebný pôvodný projekt oddelene. Pri plnom alebo poškodenom úložisku nevymazáva staršie záznamy. Ak pôvodný stav ešte nie je zachovaný, najskôr ponúkne jeho export a vyžiada potvrdenie zálohy. Dokončenie bez dostupného úložiska ostane iba v pamäti: nový projekt exportujte.
- Obrázok zostáva lokálne ako dočasný podklad. **Neposiela sa na server ani sa neukladá do projektu, CAD či obrazových exportov.** Po Finish alebo zrušení sa uvoľní; projekt uchová len geometriu a poznámku o kalibrácii.
- Po začatí kreslenia je mierka zamknutá aj po Späť, aby sa nerozišli rozmery a väzby. Pre inú mierku sa vráťte na **Obrázok**, vyberte nový podklad a potvrďte čistú schému. Existujúca geometria sa vymaže až po úspešnom načítaní nového obrázka.
- Finish dokončuje geometriu, **nezaručuje správny pohyb ani určitý model**. Upozornenia na chýbajúci pohon, voľné členy alebo konfliktné väzby možno riešiť aj po dokončení.

</details>

[Späť na navigáciu](#navigation)

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

Pri parametrickom profile sa referenčná strednica drážky odvodí z dráhy ložiska podľa hladkého pohybového zákona. **Pri každej polohe solver rieši priesečník tejto drážky s kružnicou, ktorej stred je otočný čap a polomer je vzdialenosť ložiska.** Pri úprave voľnej krivky sa nedosiahnuteľná poloha označí, nie maskuje presunutím ložiska mimo drážky.

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

Vlastné uzavreté reťazce používajú iteratívnu projekciu tuhých telies. Solver nemení dĺžky ramien. Ak nedosiahne polohovú toleranciu 0,05 mm alebo uhlovú toleranciu 0,05°, pomenuje nesplnenú väzbu. Pri zložitom alebo presne singularitnom reťazci upravte počiatočnú konfiguráciu, dĺžky alebo pevné uloženia.

Súradnice editora používajú SVG konvenciu: X rastie doprava a Y nadol. Kladný uhol otáča rameno proti smeru hodinových ručičiek.

</details>

<a id="editing"></a>

## Voľná editácia a kóty

**Úprava geometrie** ponechá navrhnuté polohy bez nútenia väzieb. **Simulácia** vynúti väzby; nekompatibilitu označí. Texty rozhrania sa nedajú označovať, vrátane hlavičky a dialógov. Vstupné polia, textové oblasti a editovateľný obsah naďalej umožňujú výber textu aj Ctrl+A.

Panel **Vlastnosti** je pri otvorení aplikácie a načítaní projektu skrytý. Otvorí sa iba tlačidlom panelu vedľa nastavení. Výber na plátne, pridanie prvku ani prepnutie na analýzu ho neotvoria. Už ručne otvorený panel môžete skryť rovnakým tlačidlom, krížikom alebo Escape mimo vstupného poľa.

Parametrickú šablónu zmeníte bez obmedzení cez **Voľná kópia**. Originál zostane samostatne uložený. Kópia dvojkulisovej zásuvky zachová aktuálnu geometriu a presné profily, **nepreberá však predpísanú funkciu zadnej opory/západky**. Má jednu ďalšiu voľnú súradnicu; pred odhadovou dynamikou treba skutočne doplniť vhodné uloženie.

V inšpektore upravíte obrys, vrcholy krivky, nosné teleso, kóty a uložené trajektórie. Meranie vytvorí referenčnú kótu. Riadiaca dĺžka mení člen alebo vytvorí vzdialenostnú väzbu. Vypočítaná trajektória nie je sama vodiaca väzba; jej prevedená krivka je nezávislá kópia.

<a id="view-controls"></a>

## Skrytie panelov a popisov schémy

Tlačidlá nad plátnom ovládajú **pohybový profil**, **prehrávanie časovej osi** a **texty/názvy/uhly schémy**. Ich popis sa mení na Skryť alebo Zobraziť. Profil a prehrávanie môžete skryť samostatne alebo spolu; tlačidlá na obnovenie zostanú dostupné.

Skrytie panelu rozšíri plátno okolo rovnakého stredu a zachová priblíženie. Nemení polohu, výber, históriu ani bežiace prehrávanie. Skrytie popisov odstráni iba vizuálne anotácie vrátane uhlových oblúkov. **Kóty majú vlastný prepínač**; uzly zostávajú klikateľné a prístupné klávesnicou. Číselné uhly, limity a väzby modelu sa nemažú.

Všetky tri voľby si pamätajú nastavenia pracovného priestoru aj `.kinmo`. PNG, PDF/HTML a GIF preberajú aktuálne viditeľné vrstvy. Medzerník alebo Enter na zameranom tlačidle aktivuje tlačidlo, nie prehrávanie na pozadí.

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

<a id="handles"></a>

## Úchyty a presné číselné úpravy

<details>
<summary><strong>Posun X/Y, dĺžka a otočenie okolo zvoleného bodu</strong></summary>

1. Prepnite na **Úpravu geometrie**, nástroj **Výber** a vyberte odomknutý člen alebo skupinu vo vlastnom modeli.
2. Potiahnite úchyt **X** alebo **Y**. Druhá súradnica zostáva nezmenená. Kliknutie na úchyt, Enter alebo medzerník otvorí presné číselné zadanie.
3. Cez **Bod otáčania** vyberte skutočný uzol A/B/C alebo vlastné X/Y. Otočný úchyt a tlačidlo **Uhol** použijú tento bod.
4. Na jednom jednoduchom ramene, čele, ráme alebo vedení použite **Dĺžka**. Zvoľte, či zostane na mieste koniec A alebo B.
5. Potvrdená zmena tvorí jeden krok **Späť**. Escape alebo zrušenie ťahania obnoví geometriu aj predchádzajúcu históriu.

X/Y zadáva **relatívny posun**, nie absolútnu polohu; absolútne súradnice zostávajú v kontextovej ponuke uzla. Y rastie nadol, kladný uhol otáča proti hodinovým ručičkám. Výber konca ramena úchytom stále upravuje celé tuhé teleso. Nesený potomok sa pri skupinovej zmene nepohne dvakrát.

Úchyty nemenia chránené originály, zamknuté alebo pružné členy. Na rám s polygonálnym obrysom sa jednoduchý dĺžkový úchyt nevzťahuje. Úpravy neotvárajú Vlastnosti.

</details>

<a id="diagnostics"></a>

## Diagnostika konkrétnych väzieb

<details>
<summary><strong>Zistiť, ktorý spoj zlyháva a čo v modeli chýba</strong></summary>

Tlačidlom **Diagnostika väzieb** na plátne otvorte samostatný panel. Každý riadok pomenuje väzbu, polohovú odchýlku v **mm**, uhlovú odchýlku v **°** a jej stav. Kliknutím na názov vyberiete skutočný kĺb; chybný spoj sa zvýrazní.

- V **Úprave geometrie** sa zobrazujú návrhové polohy bez vynútenia väzieb. Odchýlka tu nemusí znamenať neplatný mechanizmus.
- V **Simulácii** panel ukazuje zostávajúcu chybu po riešení a prekročenie pasívnych dorazov.
- Nápoveda upozorní na chýbajúci pohon, voľné členy, neurčené súradnice a opakované či konfliktné hodnoty rovnakého typu väzby.
- Symbolické bodové väzby analytických šablón sú označené **Parametrická**. Nevydávajú sa za samostatne namerané chybné spoje.

Odchýlky mm/° zostávajú oddelené aj v analýze, kinematickom CSV a PDF/HTML reportoch. Uhlové väzby porovnávajú orientáciu modulo 360°; úplné otáčky nevytvárajú fiktívnu odchýlku. Diagnostika nie je všeobecným dôkazom riešiteľnosti všetkých väzieb ani kontrolou výroby.

</details>

<a id="snapping"></a>

## Inteligentné prichytávanie iba na požiadanie

<details>
<summary><strong>Zapnúť náhľad prichytenia a samostatne potvrdiť spoj</strong></summary>

1. **Inteligentné prichytávanie je pri štarte a po každom načítaní projektu vypnuté.** Zapnite ho výslovne jeho tlačidlom na plátne.
2. Pri ťahaní uzla, skupiny alebo X/Y úchytu sa ponúkne blízky koncový bod, stred člena, vodiaca krivka alebo osové zarovnanie. Tolerancia je približne **9 pixelov obrazovky**, aj po zoome.
3. Náhľad upraví polohu, ale **nevytvorí väzbu**. Po uvoľnení sa pri skutočnom bode alebo vedení zobrazí samostatná otázka.
4. Vyberte **Ponechať iba polohu**, alebo potvrďte skutočný otočný kĺb, posuvný kĺb či čap vo vedení. Stredový POI vznikne až po potvrdení.
5. Potvrdenie spojenia je ďalší krok Späť. Jeho zrušenie ponechá prichytenú polohu. Osové zarovnanie spoj nikdy nevytvára.

Vlastné teleso a jeho nesení potomkovia nie sú cieľom pre nadbytočné prichytenie. Neaktuálny náhľad ani duplicitná väzba sa nepotvrdia. Vypnutie tlačidlom zruší aj rozpracované ťahanie.

Toto je samostatná funkcia od bežného **prichytávania na mriežku 5 mm**. Nastavenie inteligentného prichytávania sa neukladá do preferencií, `.kinmo` ani pomenovaných verzií.

</details>

<a id="assemblies"></a>

## Vlastná knižnica podzostáv

<details>
<summary><strong>Uložiť výber a vložiť nezávislú podzostavu</strong></summary>

1. Vo vlastnom modeli alebo voľnej kópii vyberte členy pomocou Shift/Ctrl/Cmd + klik. Výber kĺbu zahŕňa obe jeho telesá.
2. Otvorte **názov projektu → Vlastné podzostavy → Uložiť aktuálny výber**, prípadne použite kontextovú ponuku výberu.
3. Pomenujte podzostavu. Uložia sa celé členy, nesení potomkovia, skryté ukotvenia, vnútorné väzby, kóty a trajektórie.
4. Zvoľte **Vložiť…**, zadajte X/Y a potvrďte **Vložiť kópiu**. Vzniknú nové identifikátory; originál aj knižnica zostanú nezmenené.
5. Vonkajšie väzby doplňte na plátne. Vloženie je jeden krok Späť.

Ukladá sa návrhová geometria, nie okamžitá animovaná poloha. Väzby a montáže na nevybrané telesá sa neprenesú. Chránenú šablónu najskôr preveďte na voľnú kópiu.

Ak model ešte nemá pohon, môžete zachovať jediný pohon podzostavy a jeho rozsah. Inak sa vloží pasívna kópia bez druhého vstupu.

Knižnica má limit **20 položiek a 2 MB spolu**. Export/import používa `.kinmolib`; import pridáva kópie namiesto prepísania rovnakých ID. Pri nedostupnom úložisku použite **Exportovať samostatne**. Odstránenie záznamu vyžaduje potvrdenie a nemá krok Späť.

</details>

<a id="versions"></a>

## Pomenované verzie a porovnanie rozmerov

<details>
<summary><strong>Uložiť variant, porovnať ho a bezpečne obnoviť</strong></summary>

1. Otvorte **názov projektu → Pomenované verzie → Uložiť novú verziu** a zadajte názov.
2. Upravte návrh. Cez **Porovnať rozmery** vyberte dva uložené varianty alebo verziu a aktuálny stav.
3. Tabuľka ukáže rozmery predtým/potom, jednotky, podpísaný rozdiel a pridané či odstránené položky. Predvolene zobrazuje len zmeny.
4. Cez **Obnoviť… → Zálohovať a obnoviť** sa aktuálny stav najskôr uloží ako **Pred obnovením…**.
5. Až po úspešnej zálohe sa načíta vybraná verzia. Plné, poškodené alebo nedostupné úložisko obnovenie zastaví bez zmeny projektu.

Verzia zachová natívny projekt, fyziku, vzhľad, režim a polohu pohonu. Obnovenie nezačne samo prehrávanie; začne novú históriu Späť, skryje Vlastnosti a vypne inteligentné prichytávanie.

Porovnávajú sa **návrhové** súradnice, orientácie, dĺžky, šírky, polomery, parametre, uložené kóty a dorazy, nie aktuálne animované polohy ani sily. Identita členov sa určuje podľa ID; nezávislé kópie sa nepovažujú za totožný člen len podľa mena.

Limit je **40 verzií naprieč projektmi a 2 MB spolu**, vrátane záloh pred obnovením. Staršie položky sa nevymazávajú automaticky. Celú kolekciu alebo jednotlivý záznam prenesiete cez `.kinmoversions`. Samostatný export funguje aj bez lokálneho uloženia.

</details>

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
| GIF | Animovaný celý kinematický rozsah, aktuálny výrez a vzhľad, voľba cyklu a opakovania |
| DXF | Referenčné polylines/kružnice/popisy v mm, os Y otočená na CAD konvenciu, voliteľné uzavreté obrysy drážok |
| PDF / HTML | Aktuálna schéma v skutočnom vzhľade, vektorové grafy, aktívne rozmery, väzby, fyzikálne parametre a tabuľky polôh |
| CSV | Kinematické polohy s oddelenými chybami mm/° alebo sily a posledný časový záznam odhadovej dynamiky |

PDF funguje offline; modul sa načíta lokálne až pri exporte. Hlavná schéma je ostrý PNG raster zo skutočne štýlovaného SVG plátna, nie zjednodušený CAD náhľad. Zachováva aktuálny výrez, farby, vzhľad, kóty a viditeľnosť anotácií, bez editačných úchytov či dočasného fotografického podkladu. Text reportu ostáva vyberateľný a grafy vektorové. HTML report je samostatný, s rovnako štýlovanou SVG schémou, a vhodný na tlač.

**Bežné PDF je statické. Pohyb exportujte ako GIF.** Pre celý výrez použite pred exportom Prispôsobiť pohľad. Samostatné SVG v mm, DXF a Fusion zostávajú referenčnými geometrickými exportmi; nepoužívajú fotografiu plátna. Uzavreté CAD obrysy nie sú hotové výrobné kontúry.

<a id="gif-export"></a>

## Animovaný GIF

<details>
<summary><strong>Vyexportovať pohyb bez zmeny pracovného projektu</strong></summary>

1. Dokončite Magic import, ak je otvorený. Vlastný model musí mať jeden nezávislý motor a priechodný rozsah; pripravené šablóny používajú svoj predpísaný pohon.
2. Nastavte výrez cez **Prispôsobiť pohľad**, vzhľad a viditeľné vrstvy. Schéma počas exportu zostáva na pôvodnej pracovnej polohe.
3. Otvorte **Exportovať → Animovaný pohyb · GIF**. Vyberte šírku 160–1 200 px, trvanie 1–12 s a 5–20 snímok/s, **tam a späť** alebo **jedným smerom** a opakovanie. Odhad ukazuje skutočný rozmer a počet snímok; výška a pri vysokom výreze aj šírka sa primerane zmenšia.
4. Kliknite na **Vytvoriť GIF**. Priebeh zobrazuje prípravu farieb a jednotlivé snímky. Po dokončení sa pripraví jeden `.gif`.
5. **Zrušiť export**, Escape alebo zatvorenie dialógu zastaví prípravu bez čiastočného súboru. Projekt, poloha, výber, Späť/znova a posledné dynamické dáta sa nemenia.

GIF má adaptívnu paletu najviac **256 farieb**, preto nie je bezstratový farebný ekvivalent PNG. Snímky sa kreslia na samostatnom skrytom plátne a priebežne komprimujú lokálne; aplikácia neuchováva celý rad RGBA obrázkov a nič neposiela na server.

Limity: **1 200 × 1 200 px**, **180 snímok**, **60 miliónov pixelov spolu**, **32 MB** a **90 sekúnd prípravy**. Pri prekročení zmenšite rozmer, trvanie alebo frekvenciu. Odmietne sa prázdny alebo neviditeľný model, chýbajúci vlastný pohon, zablokovaná poloha aj séria bez viditeľného pohybu. Frekvencia sa prispôsobí celému cyklu a centisekundovým časom GIF; trvanie zostáva presné.

Ide o **predpísanú kinematickú animáciu**, nie záznam rýchlosti motora či časového priebehu odhadovej dynamiky. Otvorenie exportnej ponuky bežné prehrávanie pozastaví rovnako ako ostatné dialógy. `.gif` ani PDF nenahrádzajú editovateľnú zálohu `.kinmo`.

</details>

<a id="slot-outlines"></a>

## Uzavreté referenčné obrysy drážok

<details>
<summary><strong>Exportovať šírku drážky do DXF alebo Fusion</strong></summary>

V exportnom a Fusion dialógu je spoločná voľba **pridať uzavreté referenčné obrysy podľa šírky drážky**. Pri novom otvorení aplikácie je označená; môžete ju vypnúť a exportovať pôvodné strednice.

| Vrstva | Význam |
|---|---|
| `SLOT` | Pôvodná vzorkovaná strednica, zostáva vždy |
| `SLOT_REFERENCE_OUTLINE` | Uzavretý vonkajší šírkový obrys |
| `SLOT_REFERENCE_INNER` | Vnútorný obrys pri uzavretej strednici |

Otvorená strednica má polygonové zaoblené konce a vonkajšie rohy; uzavretá strednica vytvorí dva obrysy. Šírka pochádza z konkrétnej drážky alebo aktívneho parametra šablóny. Zadná opora dvojkulisovej zásuvky má samostatnú šírku 8 mm. Samostatné referenčné vodidlá zostávajú strednicami.

Vzorkovaná strednica sa na výpočet obrysu zjednodušuje najviac o 0,005 mm; výstup je polygonálny a zaokrúhlený na 0,001 mm. **Nie je to overenie nástroja, vôle, výrobnej tolerancie, pevnosti ani funkcie uloženia.**

Nulové, pretínajúce sa, prekrývajúce sa alebo príliš široké profily sa odmietnu s názvom drážky. Opravte krivku/šírku alebo vypnite voľbu obrysov; export nebude potichu obsahovať chybnú čiastočnú kontúru. Jedna CAD polyline má najviac 1 001 vrcholov, celý výkres najviac 30 000 bodov.

</details>

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

Doplnok počúva len na `127.0.0.1:8765`. Vytvorí **nový, neuložený referenčný dokument** s fixovanými 2D krivkami, strednicami a voliteľnými [referenčnými obrysmi drážok](#slot-outlines); existujúce návrhy nemení ani neukladá. Nevytvára 3D zostavu ani Fusion joints. Priame spojenie potrebuje HTTP(S), nie `file://`; alternatíva je DXF. Limit je 2 MB / 2 000 entít / 30 000 bodov, jedna polyline najviac 1 001 vrcholov. Po práci doplnok zastavte.

Podrobný postup a obmedzenia sú v [`cad/KinmoFusion/README.md`](cad/KinmoFusion/README.md). Skutočný import v živom Fusion zostáva manuálnym akceptačným testom.

<a id="controls"></a>

## Ovládanie a skratky

| Myš / gesto | Akcia |
|---|---|
| Ľavý klik na objekt | Vybrať bod, kĺb alebo člen |
| Shift/Ctrl/Cmd + klik | Pridať alebo odobrať položku výberu |
| Ťahanie vybraného objektu | Posun geometrie alebo skupiny v editačnom režime |
| Ťahanie X/Y, otočného alebo dĺžkového úchytu | Priama úprava návrhovej geometrie |
| Klik / Enter / medzerník na úchyte | Presné číselné zadanie |
| Tlačidlo inteligentného prichytávania | Výslovne zapnúť alebo vypnúť náhľad, predvolene vypnuté |
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
Zamerané tlačidlo si zachováva natívne Enter/Space. Tri samostatné prepínače vrstiev a panelov opisuje [skrytie schémy a prehrávania](#view-controls).

<a id="storage"></a>

## Ukladanie a súkromie

Projekty zostávajú v `localStorage` aktuálneho prehliadača. Uchováva sa najviac 20 projektov a 60 krokov histórie. V samostatných kolekciách je najviac 20 vlastných podzostáv a 40 pomenovaných verzií, každá kolekcia má limit 2 MB a automaticky nevymazáva staršie záznamy. Na zálohovanie a prenos použite `.kinmo`, `.kinmolib` a `.kinmoversions`, najmä pri vypnutom úložisku alebo súkromnom prehliadaní. CSV ani report nenahrádzajú natívny projekt.

Import akceptuje `.kinmo` obálku verzie 2 alebo starší projekt verzie 1: najviac 120 prvkov, 240 väzieb, 120 kót a 60 trajektórií, limit súboru 2 MB. Obrysy majú 3–64 vrcholov a polyline 2–1 001. Validujú sa jednotky, rozsahy, odkazy, cykly nosných telies a fyzikálne parametre. Importované názvy sa escapujú.

Export `.kinmo` aj JSON používa kompaktný zápis a rovnaký limit 2 MB. Príliš veľký projekt odmietne namiesto vytvorenia zálohy, ktorú nemožno znova importovať.

Podklad z **Magic import** je dočasný lokálny raster, nie projektová príloha. Automaticky sa neobnoví po zatvorení stránky. Pred zatvorením rozpracovanú geometriu dokončite alebo exportujte; neuložený sprievodca požiada prehliadač o upozornenie pri zatvorení.

Exporty neopúšťajú zariadenie. Pri explicitnom CAD odoslaní ide geometria do lokálneho doplnku. Aplikácia nepoužíva cloudové CAD prihlasovacie údaje a sama CAD dokument nesynchronizuje; vlastné ukladanie/synchronizáciu Fusion riadi používateľ.

<a id="faq"></a>

## Časté otázky

<details>
<summary><strong>Prečo je plátno prázdne a kde sú projekty?</strong></summary>

Prvé otvorenie je zámerne prázdne. Kliknite na **názov projektu so šípkou v hlavičke**. Je to jediný vstup k šablónam, samostatnej zásuvke, uloženým projektom a importu `.kinmo`. Náčrt otvoríte samostatným tlačidlom **Magic import**. Existujúci uložený projekt sa obnoví automaticky.

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

Otvorte **Diagnostiku väzieb** a pozrite pomenovaný spoj, jeho odchýlku mm/° a zostávajúcu voľnosť modelu. Odhadová dynamika potrebuje jeden nezávislý pohon, určité väzby a použiteľnú hmotnosť. Samostatný nový bod má hmotnosť 0. Pružina ani jednostranný doraz nenahradia chýbajúce uloženie. Pri neplatnej geometrii, singularite alebo doraze sa simulácia zastaví; nevytvára fyzikálny náraz.

</details>

<details>
<summary><strong>Ako preniesť projekt na iný počítač alebo prehliadač?</strong></summary>

Exportujte **.kinmo** a v druhom štúdiu použite import v hlavičkovej ponuke. `localStorage` je viazaný na prehliadač a pôvod stránky; `localhost`, `127.0.0.1`, `file://` a produkčný web môžu mať oddelené úložiská. Vymazanie dát prehliadača môže odstrániť lokálne projekty. PDF, CSV ani DXF nie sú editovateľná záloha projektu.

</details>

<details>
<summary><strong>Prečo sa body automaticky neprichytávajú?</strong></summary>

Inteligentné prichytávanie je zámerne vypnuté pri štarte aj po načítaní projektu. Zapnite jeho tlačidlo na plátne. Bežná mriežka 5 mm je samostatná voľba. Ani zapnutý náhľad nevytvorí spoj bez vášho ďalšieho potvrdenia.

</details>

<details>
<summary><strong>Prečo sa pomenovaná verzia nedá obnoviť alebo CAD obrys odmietne export?</strong></summary>

Obnovenie potrebuje miesto pre zálohu aktuálneho stavu. Exportujte a výslovne odstráňte nepotrebné verzie, alebo povoľte lokálne úložisko. Existujúci projekt sa pri zlyhaní zálohy nemení.

CAD obrys môže odmietnuť nulovú či pretínajúcu sa strednicu, prudký návrat alebo príliš veľkú šírku. Opravte geometriu, alebo vypnite referenčné obrysy a použite strednicový DXF/Fusion export.

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
| Syntax, JavaScript testy a build | 428 JS testov, bez zlyhania |
| Izolovaný Python / Fusion | 23 testov, bez zlyhania |
| Spoločné prehliadačové testy | 299 / 299 cez HTTP aj offline `file://` |
| Magic import | 57 / 57 desktop, 57 / 57 offline mobil |
| Click+Select a nové ovládanie | 90 / 90 desktop, 90 / 90 offline mobil |

Rozsah a dátumy sú v **[VALIDATION.md](VALIDATION.md)**. Pri Magic import sa znovu vykonalo aj všetkých 44 kontrol nového ovládania a 46 regresií Click+Select, spolu 147 kontrol v každom rozložení. Prehliadačové gestá boli syntetické; nenahrádzajú úplné natívne ťahanie. Skorší offline PDF report bol otvorený parserom a vizuálne prezretý, oddelene ukazuje mm/°; pri Magic import sa nový PDF report nevytváral. Plynulosť prirodzenej animácie, kompletné snímky rozhrania a živý Fusion import zostávajú manuálnymi akceptačnými kontrolami. Lokálne výsledky nie sú potvrdením vzdialeného CI alebo nasadenia.

Pri oprave chyby pridajte regresiu do príslušnej sady v [`tests/`](tests/). Zachovajte fungovanie cez HTTP aj `file://`, ochranu originálov a pripnuté bajty PDF distribúcií.

<a id="deployment"></a>

## GitHub a Cloudflare Workers

Zdrojový repozitár je **[bucala/Kinematicke_modely](https://github.com/bucala/Kinematicke_modely)**, produkčná vetva **main** a existujúci Cloudflare Worker **kinematicke-modely**. Táto verzia zahŕňa úchyty, diagnostiku, opt-in prichytávanie, podzostavy, pomenované verzie, referenčné obrysy drážok a Magic import. [História zmien](CHANGELOG.md) opisuje celý rozsah. Podrobný postup publikovania je v **[DEPLOYMENT.md](DEPLOYMENT.md)**.

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
CHANGELOG.md           Novinky, opravy, hranice a publikovaná história
app.js                 Editor, SVG plátno, pohon, grafy a ukladanie
engine.js              Geometria, kinematické solvery a validácia
double-drawer.js       Samostatný odhadový dvojkulisový projekt
editor.js              Návrhové polohy, voľné kópie, kóty a analýza voľnosti
interaction.js         Výberové identity, hit-testing a atómové modelové operácie
workbench.js           Úchyty, diagnostika, opt-in snap, podzostavy a verzie
magic-import.js        Lokálny raster, kalibrácia, obkreslenie a Finish
context-menu.js        Samostatná klávesnicová a responzívna kontextová ponuka
physics.js             Osové sily a odhadová dynamika jedného pohonu
slot-outline.js        Uzavreté polygonálne referenčné odsadenia drážok
scene-export.js        Skutočný štýlovaný SVG snímok a ohraničené lokálne rasterovanie
gif-export.js          Časovanie, adaptívna paleta a lokálny GIF89a/LZW encoder
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
tests/workbench-cases.js  Úchyty, snap, diagnostika, knižnica a verzie
tests/magic-import-cases.js  Mierka, obrázkové hlavičky, členy a Finish
tests/magic-import.test.mjs  Izolované načítanie, chyby a uvoľnenie obrázka
tests/export-cases.js  Prenosné súbory, obrysy drážok a reporty
tests/scene-export.test.mjs  Štýly snímku, limity, zrušenie a Blob URL
tests/gif-cases.js     GIF časovanie, paleta, kompresia a obmedzenia
tests/gif-decoder.js   Nezávislý testovací dekóder, nie runtime aplikácie
tests/kinematics.test.mjs  Node.js test runner
tests/export-integration.test.mjs  Transport, ZIP a offline PDF distribúcia
tests/test_fusion.py   Izolovaný most a náhradné Fusion API
tests/ui.test.mjs      Skutočné UI funkcie v izolovanom VM
tests/browser.html     Test runner priamo v prehliadači
```

</details>

**[Naspäť na navigáciu](#navigation)** · **[Spustenie](#start)** · **[Návod Fusion](cad/KinmoFusion/README.md)** · **[História zmien](CHANGELOG.md)** · **[Overenie](VALIDATION.md)** · **[Nasadenie](DEPLOYMENT.md)**
