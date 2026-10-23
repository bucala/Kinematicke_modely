# Stav overenia

## 2.5.0 · 23. 10. 2026: pevné zostavy a montáž

- Prešlo **830 JavaScriptových testov**, **30 izolovaných Python/Fusion testov**, kontrola syntaxe, statický build a `git diff --check`.
- Nové regresie: zachovanie zobrazených bodov po spojení, rotácia a posun celej pevnej zostavy, rozpojenie a obnova vnútorných väzieb pri zachovaných vonkajších spojoch, natívne uloženie, nezávislé kópie z knižnice, mazanie celého modulu a odmietnutie pozastavenia cudzej väzby. UI kontroluje atómové potvrdenie, Späť, odmietnutie zastaraného náhľadu a mobilnú ponuku výberu.
- Moment motora sa porovnáva s analytickým gravitačným momentom homogénneho ramena a menovitým momentom prevodu. Overené preťaženie, vplyv času rozbehu, opačný smer a trenie, nulové otáčky, voľné telesá a zastavenie pri preťažení. Výpočet používa päťbodové derivácie vrátane krajov rozsahu, aby nevznikal falošný zotrvačný moment na začiatku alebo konci.
- Magic regresie rozlišujú vnútorný otvor, neisté prekrytie dvoch telies, výslovného vlastníka, spoločný čap, samostatné ložisko a vynechanie kruhu. Kontrolujú duplicity montážnych bodov, nemennosť vstupu a skúšku priechodného aj blokovaného ramena s čapom na vnútornom uzle.
- Chromium/CDP zo zostaveného `dist/` pri 1360 × 900 a 390 × 844: viacnásobný výber v strome, pomenované spojenie, skutočné ťahanie zostavy myšou, izolovanie bez prepísania viditeľnosti, rozpojenie, Späť a obnovenie po načítaní. Na mobile prešiel výber cez prepínač, spojenie a rozpojenie. Motor má zbalený strom, oddelené režimy Montáž/Pohon, základné/pokročilé vlastnosti a nezávislú kópiu s krytom. Overenie zobrazilo dostatočný aj preťažený motor; ochrana sa uložila a skutočné prehrávanie preťaženého motora zostalo v počiatočnej polohe. Bez neošetrených výnimiek.
- Skutočný lokálny PNG prešiel dekódovaním, kalibráciou, detekciou, očíslovaným náhľadom vlastníctva otvorov, výslovným výberom a vložením. V tomto obrázku detektor spojil dve ramená do jedného návrhu; skúška správne oznámila chýbajúci pevný čap na pohyblivom telese. Celá automatická rekonštrukcia mechanizmu sa tým nepreukazuje. Úspešné a blokované skúšky piatich polôh pokrývajú modelové regresie.
- Motor je mechanický odhad jedného rotačného pohonu; nezahŕňa elektrické prechodové javy, tepelnú zaťažiteľnosť ani katalógovú momentovú krivku. Skúška importu 0–30° nepreukazuje celý pracovný cyklus. Živý Fusion ani nové natívne balíky sa v tomto kole neoverovali.

## 2.4.1 · 22. 10. 2026: jednoduché zobrazenie motora

- Prešlo **810 JavaScriptových testov**, kontrola syntaxe a build. Regresie preverujú absenciu obrysových úchytov aj ich skrytých zásahových oblastí, jeden rozmerový úchyt, rovnomernú zmenu priemeru z krytu a zachovanie stredu hriadeľa.
- Chromium/CDP pri 1172 × 1027: ikona motora sa líši od vačky, žiadne úchyty vrcholov, jeden úchyt priemeru, skutočné ťahanie rozmeru mení súčasne kryt aj rotor a Späť obnoví rozmer. Spustenie motora viditeľne pohybuje rotorom. Pri 390 × 844 nie sú prítomné obrysové úchyty. Bez neošetrených výnimiek.
- Symbol je zjednodušené schematické zobrazenie. Mechanické referencie zostávajú pôvodné; ilustračné rebrá a svorkovnica nepridávajú telesá, prípojné body ani editovateľné vrcholy. Živý Fusion sa v tomto kole neoveroval.

## 2.4.0 · 22. 10. 2026: motor, opravy väzieb a výber bodov

- Prešli `npm run check`, **808 JavaScriptových testov**, **30 izolovaných Python/Fusion testov**, `npm run build` a `git diff --check`.
- Regresie: upevnený kryt a prenos otáčania cez os na rameno v celom 360° cykle, zachovanie starých ID/väzieb/fázy, uloženie do `.kinmo`, presun a zväčšenie krytu okolo hriadeľa, zastavenie a opätovný štart, samostatné CAD profily, vloženie a kópia s vlastným krytom aj ich Späť.
- Náhľady opráv nemenia model do potvrdenia. Overené uvoľnenie otáčania, zrušenie dorazu, odstránenie vzdialenostnej väzby s vyčistením riadiacej kóty, odmietnutie neplatného návrhu a potvrdenia po zmene modelu. Úprava má jediný krok Späť.
- Chromium/CDP pri 1360 × 900: skutočné vloženie motora kliknutím z palety, viditeľný pohyb rotora pri pevnej väzbe krytu, dialóg pred/po s potvrdením a Späť, natívne ťahanie bodu na dva prekryté ciele a pripojenie vybraného cieľa. Pri 390 × 844 sa dialóg zmestil do viewportu. Bez neošetrených JavaScriptových výnimiek; rovnaký postup prešiel aj zo zostaveného `dist/`, vrátane výberu čísla priamo vo zväčšenom náhľade. Snímky sú v ignorovanom `.analysis/motor-housing-repairs/`.
- Návrh opravy vyhodnocuje aktuálnu polohu bez kolízií; nepreukazuje priechodnosť celého cyklu ani automaticky správny mechanický význam zvolenej väzby. Nový Magic detektor nie je súčasťou tohto balíka. Nasadenie a vzdialené CI sa overujú osobitne po pushi.

Publikačná kontrola zdrojov nad `aa8e933`: znovu prešli kontrola syntaxe, **640 JavaScriptových testov**, statický build a kontrola whitespace. Výsledky prehliadačových postupov nižšie pochádzajú z funkčného overenia pred commitom; pri publikačnej kontrole sa neopakovali. Push zdrojov do `main` nie je potvrdenie produkčného nasadenia.

## Predloha a rozšírené pracovné postupy · 13. 10. 2026 (lokálne overenie)

- `npm run check`, **640 JavaScriptových testov / 0 zlyhaní**, `npm run build` a `git diff --check` prešli. Nový `tests/workflow.test.mjs` má 23 modelových regresií; ďalšie UI regresie vykonávajú skutočné funkcie a obsluhu odoslania formulára.
- Modelové kontroly: kalibrovaný prenos obrázka do `.kinmo`, limity a odmietnutie neplatných predlôh, zarovnanie mierky/rotácie/posunu, rozlíšenie pohybov a nejednoznačných zhôd, spájanie/rezanie obrysov a prenos čapov, štyri zostavy so skutočnými väzbami, jeden pohon, lokálne smery voľnosti, priechod medzipolohami, zastavenie pred blokovaním aj pri úzkej známej vzorke, náhľad závislostí a zachovanie zobrazeného východiska. Fázy: časovanie, zotrvanie, spätný smer, plynulý priebeh, nadväznosť, limity, natívny prenos a odstránenie fáz po zmazaní pohonu.
- Skutočný Chromium/CDP pri 1440 × 960: pripravená zostava, voľnosť, natívne potiahnutie vozíka v skúšobnom režime a presné obnovenie pôvodného modelu; fázy a výber konca na plátne zachovali rozpísaný horný doraz. Pri prirodzenom prehrávaní sa poloha po 300 ms zmenila. Náhľad uloženia sa dal zrušiť bez zmeny modelu, potvrdenie aj Späť prešli.
- Magic import dekódoval skutočný dodaný JPG Kinka. Druhý obrázok bol **ten istý JPG**, zarovnaný pevným úsekom: overuje načítanie/zarovnanie/porovnávací postup, nie presnosť rozpoznania pohybujúceho sa mechanizmu. Odlišné pohybové polohy pokrývajú syntetické modelové prípady. Natívne presunutie skutočného vrcholu návrhu a vrátenie opravy prešli. Finish, prepnutie predlohy, uloženie a obnovenie stránky zachovali obraz. Celá mechanická rekonštrukcia Kinka tým nie je potvrdená.
- Skutočne dekódovaný lokálny PNG a natívne kliknutia na plátno overili dokreslenie obrysu, doplnenie čapu, spojenie fragmentov, rozdelenie, oddelené Späť/Znova, hromadné vloženie a obnovenie pôvodného projektu po zrušení.
- Starší Magic projekt bez obrázka prijal skutočný Kinka JPG. Zarovnanie na X = −10, Y = −20, šírka = 600 mm zachovalo presne pôvodné telesá a väzby. Táto kontrola nepoužila pôvodnú neznámu kalibráciu používateľovho staršieho projektu.
- Pri 393 × 852 boli nastavenia predlohy, editor fáz a zostavy bez vodorovného pretekania. Snímky desktopového editora, zachovanej predlohy a úzkeho formulára boli vizuálne prezreté. Zopakované skoršie natívne vloženie B/CT, spoločné Undo/Redo, HTML5 drag/drop a Alt bez deformácie tiež prešli.
- Zostavené `dist/` prešlo samostatnou HTTP kontrolou nového modulu, vloženia/uloženia skutočnej zostavy a editora fáz bez JS výnimiek. Dočasné skripty a snímky sú v ignorovanom `.analysis/drag-qa/`. Fyzický telefón, živý Fusion, vzdialené CI a produkčný deploy sa v tomto kole neoverovali. Nové offline `file://` overenie sa nevykonalo; predchádzajúci pokus v tomto prostredí blokovala politika Chromium.


## Jednoduchšie vkladanie a väzby · 13. 10. 2026 (lokálne overenie)

- `npm run check`, **613 JavaScriptových testov / 0 zlyhaní**, `npm run build` a `git diff --check` prešli.
- Nové modelové regresie kontrolujú vloženie za montážne body všetkých hlavných typov, nemennosť rozmerov/pôvodného projektu, zadržanie a uvoľnenie snap cieľa, novú identitu náhľadu a konkrétne identity diagnostických odporúčaní.
- UI regresie overujú posun celého ramena cez kruhový bod bez zmeny dĺžky, Alt bez bodových/sieťových krokov vrátane rozmerového úchytu, výber montážneho bodu, spoločnú históriu posunu a spoja, odmietnutie zastaraného potvrdenia a klikateľnú diagnostiku s vycentrovaním.
- Skutočný lokálny Chromium cez CDP pri 1440 × 960: kliknutie/vloženie za B, prepnutie Tab, vloženie vedenia cez CT a prepnutie na pohyblivé vedenie; malá ponuka otočného spoja a jedno Ctrl+Z/Ctrl+Y vracajú/obnovujú celé vloženie so spojom. HTML5 drag začal natívnymi myšacími udalosťami; zachytené DragData sa použili na protokolové dragEnter/dragOver/drop. Náhľad aj vložený prvok zostali dostupné. Natívne ťahanie konca B s Alt presunulo celý 120 mm člen o (17, 13) mm bez zmeny dĺžky. Žiadne aplikačné JS výnimky.
- Pri 393 × 852 sa panel montážnych bodov zmestil do viewportu, neprekrýval sa panelom vybraného prvku a dal sa zrušiť. Klikateľné odporúčania fungovali bez vodorovného pretekania. Desktopový náhľad a ponuka spoja aj úzke vkladanie boli vizuálne prezreté. Snímky a dočasné kontrolné skripty sú v ignorovanom `.analysis/drag-qa/`.
- Zostavené `dist/` prešlo samostatnou HTTP kontrolou vloženia/zrušenia bez JS výnimiek. Pokus o `file://` sa skončil organizačnou blokáciou Chromium ešte pred načítaním aplikácie; offline spustenie sa preto v tomto kole nepotvrdzuje. Fyzický dotykový telefón, vzdialené CI a produkčný deploy sa neoverovali.


## Pevný vozík a uhlové kroky · 13. 10. 2026 (lokálne overenie)

- Syntax, všetkých **603 JavaScriptových testov** a statický build prešli.
- Nové modelové regresie: vedenie v uhloch 0/30/90°, C/CT/CB a nesené body zostávajú pevné, A/B a ich nesené body vykonajú opačný zdvih. Prepnutie pri zobrazenom zdvihu a spätné prepnutie zachovávajú geometriu; `.kinmo` zachová režim. Režim vyžaduje jediný lineárny pohon a nepodporuje samostatne voľne plávajúcu koľajnicu bez pohonu.
- Prichytenie CT k rámu pri zdvihu 0 aj 150, potvrdené pevné spojenie a nasledujúca simulácia cez celý rozsah nemajú zablokovanie. Posun vedenia v editore nepoužije zdvih dvakrát.
- UI regresie: kontextová ponuka prepne režim a Späť ho obnoví; samostatné tlačidlo 10° nemodifikuje sieť ani smart snap, ukladá sa do `.kinmo` a otáčanie zo 17° o 14° končí pri 30° so zapnutím a 31° bez zapnutia. História obnoví pôvodný uhol.
- UI výsledky sú z existujúcich VM testov. Natívne gestá, vzdialené CI a produkčné nasadenie sa v tomto kole neoverovali.


## Kinka: test dodaného JPG · 13. 10. 2026 (lokálne overenie)

- `Kinka.zip` obsahuje skutočný JPG 2752 × 1536 px. Pillow 12.3.0 ho dekódoval a zmenšil na 768 × 429 px; detekcia pri citlivosti 50 beží nad týmito pixelmi. Regresný raster a pôvod sú v `tests/fixtures/kinka.md`. Nejde o test browserového JPEG dekódovania.
- Pôvodný detektor z HEAD: 30 návrhov, 1 predvybraný. Pred poslednou opravou: 49 návrhov, vrátane širokých modrých profilov omylom navrhnutých ako kulisy. Po oprave: **34 návrhov**, 1 predvybraný; 13 ramien, 12 panelov, 5 kruhových návrhov, 2 vedenia, 1 rám a 1 kulisa. Počet návrhov nie je počet skutočných súčiastok.
- Široký modrý obrys s ľavým a stredným pravým otvorom je návrh panelu s montážnymi bodmi. **Štyri z piatich viditeľných kruhových miest sa zhodujú** s detekciou: spoločné ľavé, stredné pravé, spodné pravé a biele v čiernej časti. Malý otvor vľavo dole chýba; ďalší nález pri červenom doraze je pravdepodobne falošný. Modré profily sa vplyvom prekrytia a hrán podkladu stále delia na čiastočné obrysy. Úplná rekonštrukcia ani fyzikálne správne väzby nie sú potvrdené.
- Pridanie všetkých návrhov do nového vlastného projektu, Finish a export/import `.kinmo` prešli: **42 prvkov vrátane montážnych bodov, 19 navrhnutých väzieb, 0 pohonov**. Je to overenie prenosu návrhov, nie ich mechanickej správnosti. Testovacia kalibrácia 500 mm cez šírku obrázka nie je nameraný rozmer. Predvolený výber vloží iba 1 prvok bez väzieb.
- Zastavenie na kroku 2.5 bolo reprodukované: pôvodný prvý návrh čiernej základne mal x = −0,0043527 px mimo rastra (ďalší veľký panel x = −0,8554 px). Import preto odmietol dávku ešte pred prechodom na krok 3. Generované body sa teraz ohraničujú rastrom, rozmery aj počet bodov majú limity importu. Chybová správa identifikuje konkrétny návrh; UI regresia potvrdzuje zachovanie schémy pri chybe a úspešný prechod po odznačení chybného návrhu.
- Syntax, **599 JavaScriptových testov** a statický build prešli. Nová regresia kontroluje skutočné pixely Kinka, široké členy, kruhové miesta, odstránenie sekundárnych jednopixelových hrán a vloženie/export návrhov. Vizuálny prehľad je lokálne v `.analysis/magic-detection-review/Kinka-kontrola.html`; natívne gestá, vzdialené CI a produkčné nasadenie sa neoverovali.


## Magic import: oblasti a montážne body · 13. 10. 2026 (lokálne overenie)

- Syntax, všetkých **597 JavaScriptových testov** a statický build prešli. Nové prípady overujú obrysové dosky inšpirované náhľadom Kinka (syntetický raster, nie jeho JPG), kruhové montážne body, nesenie bodov pri rotácii, otočné spoje, natívny export/import, vypínanie bodov, Späť, výber oblasti a odmietnutie neplatného výrezu.
- Skutočný pribalený PNG bol dekódovaný pomocou Pillow 12.3 a spracovaný cez `detectPixels` pri citlivosti 50. Celý raster 681 × 768 px: pôvodne 10 návrhov (6 predvybraných, žiadna dráha); po úprave 33 návrhov (6 predvybraných, 3 návrhy zakrivených dráh). Väčší počet návrhov sám osebe nedokazuje vyššiu presnosť; nové návrhy vyžadujú kontrolu.
- Výrez prvej polohy v pôvodných pixeloch x=55, y=28, šírka=720, výška=300: pôvodne 7 návrhov; po úprave 21. Zistili sa ďalšie dve malé kruhové oblasti. Priradenie bodov k rámu je predvolene vypnuté; samotná poloha v jeho obryse nepreukazuje fixáciu. Obe úplné kulisy ani správna mechanická topológia nie sú týmto meraním potvrdené.
- V tomto prvom kole presný súbor `Kinka.jpg` ešte nebol dostupný; následný test dodaného ZIP je zaznamenaný vyššie. Natívne prehliadačové QA nebolo dokončené (headless Chromium nevydal výsledok); výsledky UI sú z existujúcich VM testov. Vzdialené CI, živý Fusion a nasadenie sa pri tejto úprave nevykonali.


Rozšírenie nad `5e9798b`, verzia 2.0.0. Funkčné overenie pochádza z 12. 10. 2026; predpublikačná kontrola z 13. 10. je zaznamenaná samostatne. Staršie dátumy a počty sú historické výsledky, nie opätovné overenie aktuálneho rozhrania.

## Rozšírenie: snap, vačka, obrysy a krivkové časti

- `npm run check`: prešlo.
- `npm test`: **591 JavaScriptových testov, 0 zlyhaní**, kompletných sedem sád.
- `npm run build`: prešlo. **25 statických assetov** sa bajtovo zhoduje so zdrojmi, deterministický Fusion ZIP tiež; verejný inventár má **26 súborov**, bez QA príloh.
- Izolované Python/Fusion testy sa v tomto kole nezopakovali. Historických 23 prípadov ani starších 338 / 338 prehliadačových výsledkov nie je počet aktuálnej sady.

### Nové regresie a opravy

- Spoločné prichytávanie pri ťahaní/vkladaní, osi a strednice, hrany, viditeľná trajektória, voľné konce pružín a otočený vozík C/CT/CB; priority skutočných bodov, vylúčenie vlastného telesa, žiadna tichá väzba a nezávislá sieť 5 mm.
- Šablónové vozíky výsuvu, kľuky a dvojkulisovej zásuvky majú CT/CB pred riešením potomkov. Nesený bod sleduje vozík v celom rozsahu a stav správne vyhodnotí bod rodiča.
- Radiálny profil vačky, os A bez fiktívneho B, vedený posúvač a valček, offset podľa polomeru valčeka, **121 polôh kontaktu v plnej otáčke**, uhlový rozsah vrátane 360°, Analýza bodu A, diagnostika/voľnosť, odmietnutie dynamiky, natívny aj CAD export a polygonové ťažisko/zotrvačnosť.
- Detekcia odolná voči zmene farby, tieňovaniu a dvojfarebnému členu; vonkajší dutý obrys, celý konkávny rám, spojitý zakrivený pás vrátane širokého polkruhu, nepredvybrané vetvenie a ohraničená práca. Konkávny import zachová vrcholy v mierke a neplatný polygon odmietne bez čiastočnej zmeny.
- Bézier všetkých 2–32 bodov, samostatné identity P0 až Pn/vrcholov/dráhy, nemenné vloženie/odstránenie, rodičovské súradnice a ochrana originálov. Pravý klik zachová zvýraznenie, ale P2 operácia nezmení iný vybraný uzol alebo teleso.
- Presný 180° polkruh, pravidlo P0/2R a strana, výraz pre R, lokálna úprava bodu, hromadný formulár, natívny round-trip, zmena mierky a CAD strednica/uzavretý referenčný obrys.
- Atómové ťahanie bodu, zrušenie/no-op bez spotrebovania Späť či Znova, aj pri plných 60 krokoch. Klávesnicová ponuka P2 kotví na P2, nie na stred telesa. Sledovanie bodu ponúkne C/CT/CB a pri vačke iba skutočnú os A.
- Náhľad HTML5 drag/drop zachová živú geometriu SVG; opakované aktualizácie menia iba neinteraktívny snap overlay. Odchod a koniec ťahania odstránia náhľad bez výmeny cieľa. Čerstvo vložená vačka hneď nastaví sledovaný bod A.

Nové sondy najskôr zlyhali na chýbajúcich šablónových CT/CB, klasifikácii širokej oblúkovej dráhy, rodičovskom stave, klávesnicovej polohe P2 a nezmenenom R v hromadnom formulári. Po opravách prešli aj celé dotknuté sady a finálna kompletná kontrola. CAD sonda navyše opravila nesprávny názov očakávanej referenčnej vrstvy v samotnom teste.

VM a modelové regresie nenahrádzajú reálne gestá alebo vizuálne rozloženie. Dočasné súbory dvoch posledných používateľských obrázkov už v prostredí nie sú dostupné; toto kolo preto neuvádza nové prehliadačové rozpoznanie týchto príloh. Živý Fusion, fyzický telefón, vzdialené CI a produkčné nasadenie nie sú týmito kontrolami potvrdené. Používateľ 13. 10. výslovne požiadal o commit/push zdrojov do existujúceho `main`; manuálny deploy nie je súčasťou tohto kroku.

### Prehliadačové kontroly aktuálneho kola

Izolovaný `agent-browser` 0.39.0, HeadlessChrome 155 na Windows, nový profil bez prihlásení. Zdroj cez loopback HTTP pri 1 440 × 900 a zostavená aplikácia cez sieťovo vypnuté `file://` pri 393 × 852. Rozloženie nepretieklo vodorovne; Vlastnosti boli zatvorené a inteligentné prichytávanie začalo vypnuté.

- Zdieľaný `tests/browser.html` prešiel **362 / 362** cez HTTP aj offline `file://`. Ide o zdieľané modelové prípady, nie 362 natívnych gest.
- Natívne ťahanie voľného konca pružiny aj bežného ramena ukázalo prichytenie na **CT vozíka**. Potvrdenie **Ponechať iba polohu** nepridalo spoj; Späť obnovilo polohu ramena. Prvá pružinová sekvencia stlačila Späť ešte pri otvorenom potvrdení, preto nie je čistým porovnaním jednej operácie.
- Vypnutá sieť dovolila nezaokrúhlenú polohu P2; zapnutá sieť dala (100, 100) mm. Kreslená mriežka ostala viditeľná a smart snap vypnutý. Osi, hrany, trajektórie a samostatné C/CB majú modelové, nie natívne prehliadačové pokrytie.
- Prvé natívne pretiahnutia z knižnice nevložili prvok. Výslovne označený **syntetický HTML5 fallback** vložil rameno, vedenie a pružinu cez skutočné obsluhy udalostí, bez náhrady modelu, pointer capture alebo `requestAnimationFrame`. Zhodu polohového náhľadu a výsledného natívneho drop tento prvý beh nepotvrdil.
- Natívne ťahanie P2 zmenilo iba jeho lokálne súradnice. Pridanie/odstránenie bodu dalo 4 → 5 → 4; Späť obnovilo bod aj pôvodnú krivku. Dvojitý multivýber vytvorený klávesnicou zostal zvýraznený po pravom kliku na P2 aj pozadie. Shift+F10 ponúkol operácie presného P2. Pôvodné úchyty mali `role="button"` a `tabindex="0"`; novo pridaný úchyt v prvom behu nemal samostatne zachytený tabindex.
- Polkruhový dialóg ponechal neplatné `1/0` otvorené. `8 cm` dalo **R = 80 mm**, dva konce vzdialené 160 mm a nezmenené P0; Späť obnovilo pôvodné štyri Bézierove body. Úzky offline formulár sa zmestil do viewportu.
- Reálny pribalený PNG sa dekódoval na **908 × 1 024 px**, aj offline. Obrysová detekcia pri citlivosti 50 dala **10 návrhov, 6 predvybraných**; vloženie bolo jednou dávkou, jedno Späť ju celú odstránilo a potvrdené zrušenie obnovilo pôvodný projekt. **Rozpoznanie bolo slabé/nejasné:** tri zobrazené polohy a legenda vytvorili opakované rámy či nevhodné čelá; obe kulisy a rameno sa správne nezrekonštruovali. Úspech pracovného postupu nie je úspech funkčného rozpoznania.
- Prvý reálny vačkový príklad vytvoril vedenie, posúvač, valček a kontakt; dynamika správne odmietla kontaktné sily. QA však odhalilo **0–300 mm namiesto 0–360°**, odmietnutých 360°, fiktívne B v Analýze a `undefined` v karte. Po reprodukcii zlyhávajúcimi regresiami sú chyby opravené.

Opakovaný izolovaný beh v `.analysis/qa-followup-20261012-232717-a32e5d5f/` natívne potvrdil skutočných **0°, 90°, 180°, 270° a 360°**, uhlové vstupy s max. 360, zhodnú polohu valčeka pri 0/360 a **121 / 121** vzoriek v celom rozsahu. Analýza označila vačku bodom A a bez dráhy fiktívneho B; karta mala správny popis. Novo pridaný **P4** mal samostatne zachytené `role="button"` a `tabindex="0"`. Zdieľaná sada po rozšírení vačkových kontrol znova prešla 362 / 362 cez HTTP aj offline, so zlyhaním a následným obnovením kontrolného fetchu.

Tento beh ešte odhalil B v predvolenej trajektórii **hneď po vložení**, hoci po uložení/načítaní už bolo A. Vkladanie teraz používa rovnakú spoločnú voľbu fyzického bodu. Pri natívnom ťahaní boli zaznamenané dôveryhodné `dragstart` a prijaté `dragover`, ale nie `drop`. Kontrola kódu a zlyhávajúca regresia ukázali, že náhľad prepisoval SVG a odpojil živý cieľ. Oprava aktualizuje iba neinteraktívny overlay; obe nové sondy, kompletných **591 / 591**, syntax a build prešli. Samotný výsledok ovládača bez `drop` nie je dôkazom jeho jedinej príčiny; finálne natívne výsledky opravy sú nižšie.

#### Finálne natívne potvrdenie opráv

Nový izolovaný beh v `.analysis/qa-final-20261012-234400-636a5b78/` prešiel vo všetkých troch bodoch, bez syntetických udalostí alebo náhrad aplikačného stavu:

- **PASS, čerstvá vačka:** okamžite po kliknutí v knižnici ukázala **Trajektória A**, pred uložením/načítaním alebo výberom iného bodu. Mala iba fyzický úchyt A.
- **PASS, natívny drop ramena:** prijaté `dragover` zachovali pripojený SVG cieľ. Pri uvoľnení nasledoval dôveryhodný `drop` a `dragend`, 0 → 1 teleso. Ctrl+Z obnovilo prázdnu scénu; Znova vrátilo rameno.
- **PASS, snap pri natívnom vložení uzla:** po výslovnom zapnutí smart snap náhľad označil A ramena na **(225, 30) mm**. Výsledný uzol mal presne rovnakú polohu. Voľba **Ponechať iba polohu** zachovala **0 spojov**; Späť odstránilo iba vložený uzol.

Snímky čerstvej vačky, držaného náhľadu a potvrdeného vloženia boli vizuálne prezreté. Neboli zaznamenané aplikačné chyby. Po tejto snímke sa ešte odstránilo nepriehľadné pozadie drop plochy, ktoré zbytočne zosvetľovalo geometriu a snap značku. Zmenil sa iba CSS background, nie rozloženie, udalosti alebo geometria; priehľadnosť má regresiu. Nová snímka po tejto poslednej vizuálnej úprave sa nezachytávala.

Vlastné pomenované prehliadače aj identitou overené servery/obslužné procesy skončili; opakované kontroly portov 5193/5195 nenašli listener. Prvý server na 5191 ukončil rodič až po preukázaní vlastného spustenia. Dôkazy ostali v ignorovanom QA priestore, mimo verejného inventára.

Prvé dôkazy sú v ignorovanom `.analysis/qa-20261012-225218-2f703c81/`, vrátane snímok pravého P2, polkruhu, Analýzy, kontúr a úzkeho offline formulára. Page-error kontroly pri HTTP sade, offline aplikácii a offline sade boli prázdne. Sieťové vypnutie potvrdilo `navigator.onLine === false` aj zlyhanie kontrolného fetchu; po obnovení fetch prešiel. Úzky viewport používal desktopovú myš/klávesnicu, nie fyzické dotykové zariadenie.

Pôvodná pomenovaná relácia prehliadača bola zatvorená. Worker nezastavil pôvodný server, lebo mu nepatril; rodič následne overil väzbu PID na vlastné spustenie a ukončil iba tento vlastný proces. QA dôkazy nie sú verejné assety ani publikované prílohy.

### Predpublikačná kontrola, 13. 10. 2026

Po výslovnej požiadavke na commit/push sa README, changelog a publikačné poznámky zosúladili pre celý rozsah prichytávania, vačky, obrysového importu a krivkových častí. Znovu prešli `npm run check`, **591 JavaScriptových testov** a `npm run build`. Runtime kód sa pri tejto publikačnej príprave nemenil.

Prehliadačových **362 / 362**, natívny drop/prichytenie, vačka 0–360° a ostatné snímky pochádzajú z funkčného overenia 12. 10.; pri úprave dokumentácie sa tieto gestá ani živý Fusion neopakovali. Izolovaná Python sada sa v tomto kole nezopakovala.

Aktuálny vzdialený `main` bol načítaný Gitom a pred commitom zodpovedal `5e9798b`. Používa sa existujúca Git identita, spoluautorský trailer a štandardný push bez `--force`, bez prepisu histórie či prepínania druhého pracovného checkoutu. Vzdialené CI a nasadenie sa z lokálnych kontrol neodvodzujú.

## Historické publikované rozšírenie `5e9798b`: osem požiadaviek

Nasledujúci záznam patrí k staršiemu rozšíreniu nad `6554b75`, nie k aktuálnemu lokálnemu kolu.

- `npm run check`: prešlo, vrátane nového detektora a kontextových regresií.
- `npm test`: **542 JavaScriptových testov, 0 zlyhaní**. Zdieľané modely, VM funkcie skutočného kontroléra, lokálny dekóder, detektor, podponuky, CAD/export integrácie, PDF bajty, SVG snímky a GIF.
- Izolovaný Fusion Python (`python -B tests/test_fusion.py`): **23 testov, 0 zlyhaní**, bez pripojenia k živému Fusion dokumentu. Výsledok je zo skoršieho behu tohto rozšírenia; po posledných CSS/UI opravách sa Python sada nezopakovala.
- `npm run build`: prešlo, `dist/` obsahuje aj `magic-detection.js`.
- `tests/browser.html`: **338 / 338** zdieľaných prípadov cez izolované HTTP aj sieťovo vypnuté `file://` v Chrome 155.

### Nové regresie

- Jedna mierka podľa X/Y/A–B, jednotný prepočet oboch smerov, rodičovské súradnice, konce/obrysy/dráhy, lineárne limity a rýchlosti. Potvrdenie a Späť/znova obnovujú kalibráciu spolu s geometriou.
- Lokálna segmentácia syntetických rasterov, rovné/zakrivené/kruhové kandidáty, limity 768² pixelov / 60 kandidátov / 4 000 komponentov, lokálny Blob dekóder, zrušenie a uvoľnenie. Náhľad nemení projekt; vloženie je atómové.
- Klik mimo dialógu ho nezavrie; oneskorené `close` nevyčistí znovu otvorený formulár.
- Skryté predvolené panely a dostupné prepínače, validované úložisko, samostatné ID kópie, zachovanie neuloženého originálu, potvrdené mazanie, zastavenie autosave a nedotknuté bajty pri chybe zápisu.
- Analýza celého vzorkovaného rozsahu, oddelené mm/° rezíduá, blokované intervaly, statická geometria bez pohonu a plná otáčka cez ±180°.
- Geometrický výber cez prekrytie, vyplnené obrysy, zoznam prekrývajúcich sa entít, podponuky mimo posuvného koreňa, myš/klávesnica a vlastný klik mimo. Odpojenie/fixácia telesa, mazanie iba zvoleného kĺbu alebo kóty.
- Parser bez `eval`, výrazy, čiarka, jednotky, zátvorky, hranice a odmietnutie delenia nulou, kódu či nesprávnej rozmerovej jednotky. Dva body na plátne, zachovanie návrhu formulára, zrušenie, voľný merací bod, A/B/stred aj rodičovské súradnice, pevný B a motor B, projekčné kóty, riadiace väzby a jeden krok Späť.
- Dve doplnené sondy najskôr odhalili chybu zachovania bodu pri úprave kóty počas simulácie. Oprava spätne odpočíta zobrazený účinok pohonu pri zápise návrhových súradníc. Finálne regresie zachovávajú A/B/stred pri otočnom pivote A/B/C, lineárnom posuve aj v otočenom rodičovi; nezapočítajú pohon dvakrát.
- Natívne QA odhalilo ešte tri opravené chyby: návod zachytával klik na uzol, panelový hit-testing volal `.map` na SVG reťazci a prepnutie autodetekcie vymazalo nepotvrdené pixelové súradnice. Každá má regresiu, ktorá najskôr zlyhala a po oprave prešla.
- Presná zhoda **25 statických assetov** so zdrojmi a deterministický Fusion ZIP prešli; verejný inventár má 26 súborov bez súkromných príloh. Zdrojový server servuje detektor a odmieta súkromné cesty. Päť návodov má 78 platných relatívnych odkazov, 27 jedinečných explicitných kotiev a 32 párovaných rozbaľovacích návodov. PowerShell parser publikačného skriptu, kontrola bežných formátov tajomstiev a `git diff --check` prešli; publikačný skript sa nespustil.

VM a zjednodušený DOM neoverujú natívne gestá, rasterovanie ani rozloženie. Aktuálne prehliadačové akceptačné výsledky sú nižšie; pôvodné štyri dočasné snímky už v prostredí nie sú dostupné. Živý Fusion import, vzdialené CI a produkčné nasadenie sa týmito kontrolami neoverili. Používateľ dodatočne autorizoval commit a push do existujúceho `main`; manuálny deploy nie.

### Predpublikačná kontrola, 12. 10. 2026

Po výslovnej požiadavke na commit/push sa README a changelog doplnili pre celý rozsah ôsmich úprav a zosúladili sa publikačné poznámky. Znovu prešli `npm run check`, **542 JS testov**, `npm run build`, 78 relatívnych dokumentačných odkazov a kontrola bežných formátov tajomstiev.

Výsledky **338 / 338** v prehliadači, snímky a **23 Python testov** pochádzajú z predchádzajúcich kontrol tohto rozšírenia; pri poslednom doplnení dokumentácie sa neopakovali. Runtime kód sa pri tejto publikačnej príprave nemenil. Používa sa existujúca Git identita, spoluautorský trailer a štandardný push do `main`, bez prepisu histórie alebo prepínania druhého pracovného checkoutu.

### Finálne prehliadačové overenie tohto rozšírenia

Izolovaný `agent-browser` 0.39.0 s Chrome 155 na Windows, bez používateľského profilu alebo prihlásení. QA nástroj nie je závislosť aplikácie. Zdroj sa otvoril cez vlastný loopback server, mobilné rozloženie cez finálne `dist/index.html`.

| Prostredie | Viewport | Overenie |
|---|---|---|
| Zdroj cez HTTP | 1 440 × 900 | Projekty, skryté/nezávislé panely, kontextové podponuky, úzke mazanie, výber panelu, viazané/voľné kóty a Analýza |
| Zostavený `file://`, sieť vypnutá | 393 × 852 | Projekty, panely, číselný dialóg, viazané body, uhlové meranie, portálová podponuka, Analýza a lokálna detekcia |
| Zdieľané modelové testy | obe rozloženia | 338 / 338 cez HTTP aj sieťovo vypnuté `file://` |

- Natívny pravý klik odstránil pri trojpoložkovom výbere iba vybraný kĺb: 4 → 3 kĺby, všetky 4 telesá zostali; Späť obnovilo 4/4. **Iba vytvorenie multivýberu** použilo syntetické Ctrl pointer udalosti. Model ani pointer capture sa nenahradili.
- Natívna ponuka sprístupnila prekryté vstupné rameno; vyplnený vnútorný bod vybral panel. Dva kliky na jeho A/B otvorili viazanú kótu. Dva voľné body boli iba meracie; uloženie a Späť ponechali existujúce kóty.
- Desktopové uhlové meranie ukázalo 90° a zakázané riadenie. Mobilný dialóg zachoval `300/2` po kliknutí mimo; potvrdenie nastavilo 150 mm a ponechalo B na (190, −240). Viazaný picker ukázal 150 mm; uhlové meranie sa uložilo bez riadenia.
- Portálové podponuky sú priamo v `BODY`, bez orezania. Mobilná podponuka aj číselné dialógy sa zmestili do viewportu. Panely sa prepínali nezávisle a rozloženie nepretieklo vodorovne.
- Analýza na desktope aj mobile ukázala 121 / 121 polôh, 0 mm / 0° a správne tri voľné súradnice pridaného nepripojeného panelu; Vlastnosti zostali skryté.
- Finálny offline sprievodca dekódoval skutočný pribalený PNG. Vstup X = 300 mm pre úsek 907 px dal jednotnú mierku 0,330761 mm/px. Zapnutie autodetekcie zachovalo všetky štyri súradnice aj otvorenú časť formulára. Náhľad mal 60 návrhov a 0 telies; potvrdenie vložilo 60 telies, jedno natívne Ctrl+Z odstránilo celú dávku. Zrušenie obnovilo pôvodných 5 telies. Detekcia neurčuje funkciu mechanizmu.
- Skoršie funkčné sondy zostaveného rozhrania navyše overili duplikovanie/mazanie projektu, odmietnutie `1/0`, problémovú Analýzu (68 priechodných / 53 problémových polôh, 42,3 mm) a prepočet mierky 300 → 600 s potvrdením, Späť a zrušením. Celá táto skoršia sekvencia sa po posledných UI opravách natívne neopakovala.

Snímky boli zachytené a vizuálne prezreté v ignorovanom `.analysis/qa-oct12/`, vrátane editorov, projektov, podponúk, kót, Analýzy, detekcie a oboch finálnych zdieľaných sád. Po opravách zaznamenané aplikačné `error` udalosti zostali prázdne. Staršie no-op HTTP kliknutia a timeouty snímok sa v obnovenom izolovanom prostredí nezopakovali. QA reload sprievodcu vyžadoval prijatie jeho očakávaného natívneho `beforeunload` potvrdenia.

Vypnutie siete bolo overené `navigator.onLine === false` aj zlyhaním kontrolného HTTP fetchu. Po obnovení siete kontrolný fetch prešiel s HTTP 200; dočasné pozorovacie listenery/globálne premenné boli odstránené. **Úplné natívne ťahanie, prirodzené časovanie animácie, skutočné dotykové gestá, nový živý Fusion import a vzdialené CI/deploy zostávajú mimo tohto overenia.** Mobilný výsledok označuje úzky viewport, nie test na fyzickom telefóne.

Vlastná QA relácia prehliadača a loopback server sa ukončili po kontrole identity procesov; port 5189 je voľný. Zdrojové zmeny, zostavenie a ignorované dôkazy zostali zachované. Tieto prehliadačové kontroly sa vykonali pred autorizovaným publikovaním zdrojov; nepotvrdzujú vzdialené CI ani deploy.

## Historické lokálne kontroly, 11. 10. 2026

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

## 2026-10-14 · Fusion/debug/native 2.1

- Syntax celého webu: `npm run check`.
- JS regresie vrátane opt-in/redakcie/bounded debug journalu, fallback importu a release route/manifestu: `npm test` (754 testov).
- Izolovaný lokálny transport a náhradné Fusion API: 29 Python testov. Náhradný toolbar import vytvorí presne jeden nový dokument; opakované prevzatie je blokované aj počas rozpracovania.
- Chromium/CDP: desktop aj 390 px mobil, aktivovanie debug menu, reálny snapshot projektu/solveru, IndexedDB prežitie reloadu, redakcia mock kľúča a mobilný dialóg bez JS výnimiek. Skutočné stiahnutie debug JSON a Android save bridge cez prehliadačový adaptér tiež prešli.
- Windows x64: .NET cross build samostatného PE32+ EXE. Samotné Windows UI/WebView2 tu nebežali; `--self-test` vykoná Windows runner v CI.
- Android: JDK21/Gradle8.10.2/SDK35 release build, APK Signature Scheme v2 overený cez apksigner. UI, ukladanie na fyzickom zariadení a aktualizácia APK zostávajú zariadením overiteľnou akceptáciou.
- Cloudflare: Wrangler dry run zbalil Worker a assets, rozpoznal ASSETS a RELEASES binding. Produkčné nasadenie a vzdialený Actions run zatiaľ neoverené; signing/Cloudflare secrets nastavuje používateľ.

## 2026-10-14 · Fusion obrysy 2.1.1

- Deväť regresií: obrysy dvojitej zásuvky pri 0/60/300 mm, nové voľné kópie, samostatné vedenie otočené o 90° s hrúbkou 80 mm a vozíkom, hrúbka rámu a obe telesá parametrického výsuvu, valec aj obrys piestnice oboch typov piesta.
- Chromium/CDP porovnal vrcholy skutočne vykreslených dielov s CAD snapshotom a overil predvolene vypnutú voľbu trajektórií.
- Náhradné Fusion API importovalo aktuálny dvojkulisový export: 20 hrán korpusu/stola/opory, 6 hrán zásuvky a 7 hrán panelu/držiaka. Bez fiktívneho vozíka či trajektórií.
- Celý balík: 763 JS testov a 30 Python testov; syntax a statický build. Živý import Fusion zostáva manuálnou akceptáciou na používateľovom zariadení.

## 2026-10-14 · 2.2.0

- Nové regresie: vačka s pôvodne pevne uhlovo uloženou osou, nepresne umiestnená deklarovaná os, plochý kontakt vozíka cez celý cyklus, hranice vedenia, zachovanie/sledovanie hrany po zmene rozmerov, stupeň voľnosti vozíka, motorové parametre a menovitý prevod, hriadeľ v CAD, neplatná geometria, číselné jednotky a desatinné čiarky, locale v KINMO.
- Chromium/CDP: skutočné otáčanie vačky a motora, kontaktný formulár/náhľad, motorové vstupy s jednotkami, SK/EN/DE prepínanie a reload, ochrana názvu projektu a nemecký mobilný dialóg pri 390 px. Bez JS výnimiek.
- Celé JS/Python regresie, syntax a statický build. Natívne platformové vydania zostavuje existujúci Actions workflow po pushi; vzdialený CI/deploy sa tu nepotvrdzuje.

Posledná kompletná kontrola 2.2.0: **773 JS testov a 30 Python testov**, bez zlyhania; statický build prešiel.

## 2026-10-15 · 2.2.1

- `npm run check`, `npm test` (773/773) a `npm run build` prešli.
- Chromium: nápoveda nad kulisou v knižnici nie je viditeľná po 1,2 s, po 2,3 s obsahuje správnu tému; na plátne samostatne overená vačka. Odchod kurzora skryje kartu.
- Chromium: kliknutie pred uplynutím oneskorenia zruší naplánovanú kartu. Kontextová ponuka a otvorenie návodu skryjú zobrazenú kartu. Overené umiestnenie vo výreze a otvorenie návodu cez F1.
- Overené všetkých 13 typov knižnice a 29 rozdielnych textov; všetkých 29 SVG schém prešlo XML parserom bez chyby.
- Návod: rozbalenie témy kulisy, vyhľadanie „pruzina“ bez diakritiky (dve pružiny), zobrazenie pri šírke 390 px bez vodorovného pretekania; kontrola svetlého aj tmavého vzhľadu. Žiadne JavaScript výnimky počas týchto scenárov.
- `help.js` je zahrnutý v zdrojovom serveri aj statickom distribučnom balíku; SVG schémy nevyžadujú sieť ani externé obrázky.

## 2026-10-15 · Workers Builds a chýbajúci R2 bucket

- Dodaný produkčný build log: 773 úspešných testov, úspešný statický build/upload, zlyhanie Worker version upload s kódom 10085 (`kinematika-releases` neexistuje). Úspešné nahratie assets neznamenalo úspešné nasadenie aplikácie.
- Oprava: `npm run deploy` pripraví R2 bucket pred Wranglerom. Publikovanie natívnych balíkov používa rovnakú funkciu.
- `npm run check`, `npm test` (777/777) a `npm run build` prešli. Štyri nové regresie preverujú zachovanie existujúceho bucketu, vytvorenie pri 404, odmietnuté oprávnenia/chýbajúci token a súbeh dvoch buildov vrátane neúspešného vytvorenia.
- CLI bez tokenu skončí nenulovým kódom s konkrétnym vysvetlením. Živé vytvorenie R2 a úspešné produkčné nasadenie sa lokálne neoverili: prostredie stále nemá Cloudflare credential binding. Treba overiť následný Workers Builds log.

## 2026-10-15 · Natívne CI: Android SDK a Windows artifact

- ZIP `logs_105113960042.zip` obsahuje beh pre commit `981a631`: Android zlyhal pri inštalácii vyradeného SDK balíka `tools`. Windows `dotnet publish` prešlo, ale nevznikol verzovaný EXE artifact na nahratie; upload skončil iba varovaním. Publikovanie oboch platforiem preto nebolo doložené.
- Workflow opravený: explicitné SDK `platform-tools`, následne platforma 35/build-tools 35.0.0; Windows GUI self-test cez `Start-Process -Wait -PassThru`, kontrola návratového kódu a kopírovaného súboru. Všetky uploady odmietajú prázdny výsledok.
- PyYAML overil syntaktickú správnosť workflow. `npm run build`, príprava oboch natívnych web balíkov a 8 testov publikovania prešli.
- Lokálne `assembleDebug --offline` s JDK 21/Gradle 8.10.2/SDK 35: 32 úloh, build úspešný. APK podpis v2 overený cez `apksigner verify`; APK obsahuje aktuálne index.html, help.js a engine.js. Ide o debug APK, nie produkčnú podpísanú verziu.
- `.NET 8 dotnet publish --no-restore -c Release -r win-x64 --self-contained true` s jednosúborovým výstupom prešlo. Výsledok je Windows x64 GUI PE executable. Windows proces ani PowerShell self-test sa na Linuxe nespúšťali; túto časť a produkčný Android podpis musí potvrdiť nový beh Actions.

## 2026-10-15 · JSON secret ANDROID_SECRETS

- Dodaný screenshot ukazuje Repository secret `ANDROID_SECRETS`; pôvodný workflow čítal iba tri samostatné názvy. Nový ZIP stále končil kontrolou prázdneho `KEYSTORE_BASE64`.
- Workflow teraz volá `scripts/prepare-android-signing.mjs` hneď po príprave Node. Podporuje JSON bundle aj samostatné secrets; Gradle preberá validované KINMO_* hodnoty cez GITHUB_ENV a neprepisuje ich prázdnymi výrazmi secrets.*.
- `npm run check`, `npm test` (780/780), `npm run build` a PyYAML kontrola workflow prešli. Tri nové regresie overujú JSON aj individuálne hodnoty/prednosť, bezpečné odmietnutie chybných vstupov a zápis rovnakého kľúča s maskovaním a oprávneniami 0600. Testovacie údaje sú syntetické.
- Obsah skutočného GitHub secretu nebol dostupný ani vypísaný. Podpísaný produkčný APK a publikovanie musí overiť nový beh workflow z main; opakované spustenie starého behu používa pôvodný workflow.

## 2026-10-15 · Cloudflare credential formatting

- Dodaný ZIP `logs_105147342899.zip`: oba natívne balíky sa stiahli, manifest sa vytvoril a nahral. Publikovanie skončilo pred API požiadavkou chybou `Headers.append ... is an invalid header value`; maskovaná hodnota v hlavičke obsahovala koniec riadka. Tento log nepotvrdzuje prijatie tokenu Cloudflare ani jeho oprávnenia.
- Spoločná funkcia validuje account/token bez uvedenia hodnôt do diagnostiky a normalizuje ich okraje. GitHub prípravný krok maskuje očistený token a cez GITHUB_ENV ho sprístupní R2 publisheru aj Wrangleru.
- `npm run check`, `npm test` (783/783), `npm run build` a YAML parser prešli. Tri nové regresie overujú normalizáciu, bezpečné zastavenie pred fetchom pri viacriadkovom/chybnom vstupe a maskovaný zápis pre ďalšie kroky. Existujúci úplný publish test navyše vytvára skutočné Headers pri každom mock API volaní s okrajovým CRLF na vstupe, vrátane object uploadov a overovania kontrolných súčtov.
- Skutočnú hodnotu GitHub secretu nemožno z maskovaného logu opraviť. Ak obsahuje vnútorný koniec riadka alebo príkaz namiesto tokenu, používateľ ho musí nahradiť jedným platným tokenom. Živé publikovanie týmto lokálnym overením potvrdené nie je.

## 2026-10-15 · Živá diagnostika GitHub Cloudflare credentials

- Diagnostický workflow bol vytvorený v `9c2f9c7` a skutočne spustený v Actions ako run `38809329063`. User token: HTTP 200, active; Accounts: HTTP 200, targetAccount true; Workers: HTTP 200. Account-token verify 401 je očakávané pre používateľský token a nie je povinnou kontrolou.
- R2 bucket aj R2 list: HTTP 403, Cloudflare API **10042**, **Please enable R2 through the Cloudflare Dashboard**. Ide o konkrétnu aktiváciu služby, nie o preukázané chybné GitHub credentials. Token v samostatnom cloudovom prostredí je naďalej odmietaný; nemožno ho zamieňať s platným GitHub secretom.
- Oprava prípravy R2 rozpozná 10042 a zastaví sa s presným odkazom na dashboard. Regresia potvrdzuje jediné GET volanie a žiadny pokus o vytvorenie/deštrukciu bucketu pri neaktivovanej službe.
- `node --test tests/releases.test.mjs`: 15/15; `npm run check` prešlo. Produkčné publikovanie zostáva podmienené aktiváciou R2 vlastníkom účtu v dashboarde.

## 2026-10-16 · Publikovanie iba webu

- Používateľ ukončil tvorbu Windows/Android aplikácií. native-release.yml odstránený, ci.yml obsahuje iba validáciu webu; publikovanie prebieha cez existujúce Workers Builds z main. Žiadny aktívny workflow nepoužíva Android signing, SDK ani .NET.
- `npm run check`, `npm test` (784/784), `npm run build` a YAML parser prešli. Predbežný GitHub krok verzovania bol otestovaný a následne odstránený pri zjednotení publikovania cez Workers Builds. Finálny build používa package.json a automatické SHA commitu.
- Chromium: desktopová ani mobilná ponuka neobsahuje native-downloads; natívny klient sa nenačíta a mobilná ponuka sa otvorí bez JS výnimiek. dist neobsahuje native-client.js a index ho nereferencuje.
- Webový deploy už nevolá ensure-release-bucket ani publish-release. Existujúci R2 binding/archívne endpointy sú zachované pre predchádzajúce odkazy. Aktívna diagnostika už dostupnosť archívneho R2 nevyžaduje.
- Po prvom pushi c03e622 prešiel GitHub webový validate/publish aj produkčná kontrola menu. Produkcia zároveň odhalila druhý deploy cez existujúce Workers Builds. Finálna konfigurácia ponecháva publikovanie iba Workers Builds a GitHub workflow iba validuje; build automaticky zachytí SHA aj v Cloudflare. Výsledok finálneho nasadenia sa overí po pushi.
