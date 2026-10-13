# Práca s obrázkami a mechanizmami

## Viac polôh v Magic importe

V kroku Mierka alebo Autodetekcia možno pridať ďalšie tri obrázky. Prvý obrázok určuje mierku a geometriu návrhu. Na každom ďalšom vyberte tie isté dva body **pevného** kalibračného úseku. Kliknutia na obrázok doplnia A a B, súradnice možno opraviť číselne. Zarovnanie zohľadní posun, otočenie a zmenu mierky; perspektívu neodstráni.

Rozpoznať prvky spracuje aj zarovnané polohy. Návrhy s podobnými rozmermi a tvarom sa porovnajú jeden k jednému. Nejednoznačné zhody ostanú bez priradenia. Pri prvku sa ukáže odhad pevnej časti, posuvnej alebo otočnej väzby a počet zhodných polôh. **Použiť odhad pevnej časti** zmení typ až po kliknutí.

Skóre tvaru je geometrický odhad, nie kalibrovaná pravdepodobnosť správneho rozpoznania. Kruhový nález môže byť otvor alebo samostatný čap. Rovnaká poloha na dvoch obrázkoch sama osebe nepreukazuje fixáciu. Návrhy nepredpisujú pohon a nepotvrdzujú mechanickú topológiu.

## Opraviť návrhy pred vložením

- **Upraviť** zobrazí konce, vrcholy obrysu a montážne body. Potiahnutím bodu opravíte jeho polohu na obrázku.
- **Pridať čap** a klik na obrázok doplnia montážny bod zvoleného telesa.
- Pri kruhovom náleze vyberte **Otvor na vybranom telese** alebo **Samostatný čap**. Pre otvor najskôr vyberte Upraviť na jeho telese.
- **Spojiť vybrané fragmenty** vytvorí ich vonkajší konvexný obal a zachová odlišné montážne body. Skontrolujte obal, najmä pri konkávnych tvaroch.
- **Rozdeliť** a klik medzi koncami rozdelia návrh priečnym rezom cez zvolené miesto; body sa priradia k príslušnej časti.
- **Dokresliť obrys**: klikajte vrcholy, Enter alebo Dokončiť obrys uzavrie nový návrh. Escape rozkreslenie zruší.

Opravy majú vlastné Späť/Znova, aj Ctrl+Z/Ctrl+Shift+Z. Menia návrhy, nie hotovú geometriu projektu. Opakovaná detekcia si vyžiada potvrdenie nahradenia opráv. Až Pridať vybrané prvky vloží celú dávku do modelu jedným krokom Späť. Limity sú 60 návrhov, 64 vrcholov obrysu a 24 montážnych bodov na návrh.

## Zachovaná predloha

Finish uloží zmenšený raster prvého obrázka aj jeho kalibrovanú polohu do projektu. Obrázok sa neposiela na server. Je súčasťou `.kinmo` aj JSON zálohy. Ďalšie obrázky slúžia na porovnanie v sprievodcovi; Finish ich samostatne nearchivuje.

**Predloha** sa zobrazí pri projektoch z Magic importu. Zapína a vypína obrázok bez zmeny mechanizmu. Susedné tlačidlo nastavení upraví viditeľnosť, priehľadnosť, ľavý/horný okraj v mm a šírku pri zachovaní pomeru strán. Možno vymeniť obrázok. Voľby sa ukladajú do projektu a dajú sa vrátiť cez Späť.

Pri staršom Magic projekte bez uloženého obrázka tlačidlo Predloha vyžiada pôvodný súbor a ponúkne zarovnanie. Existujúce telesá a väzby zostanú zachované. Bez pôvodného súboru sa obrázok nedá spätne obnoviť.

Predloha má najviac 1280 px na dlhšej strane; podľa veľkosti sa ďalej zmenší, aby vložený JPEG zostal do 350 000 znakov. Projekt má naďalej limit 2 MB. Obraz je editačná predloha, nezahrnie sa do CAD ani čistých obrazových/reportových exportov. Podzostavy do knižnice nekopírujú celý fotografický podklad alebo plán prehrávania projektu; pomenovaná verzia projektu ich zachová.

## Voľnosť a skúšobný pohyb

**Voľnosť** zobrazí pri vybranom telese možné smery posuvu a otáčania. Smery vychádzajú z lokálnej linearizácie skutočných väzieb. Môžu byť navzájom previazané s pohybom ďalších telies; nejde o samostatné ovládacie osi. Poháňaný člen je označený ako riadený pohonom. Výsledok platí v zobrazenej polohe, pri singularite sa môže meniť.

**Skúšobný pohyb** prepne na riešenie kinematiky. Potiahnite vozík alebo rameno. Vlastný model potrebuje jeden pohon a určený pohyb ostatných telies. Kontrola prejde medzipolohy aj existujúce vzorky analýzy. Pri zablokovaní ponechá poslednú nájdenú funkčnú polohu a zvýrazní dotknuté prvky. Nejde o dôkaz spojitej bezkolíznosti medzi všetkými vzorkami.

Vypnutie skúšobného pohybu obnoví pôvodný režim a polohu. Skúšanie nemení model ani históriu. Kolízna kontrola rešpektuje svoj samostatný prepínač.

## Zostavy a náhľad dôsledkov

**Zostavy** ponúkajú vozík s vedením a doskou, rameno s pevným čapom, čap v kulise s ramenom a sklápacie čelo s čapom. Nastavte rozmery, prípadne jediný pohon. Zostava sa vloží do stredu pohľadu so skutočnými väzbami a novými identitami. Vonkajšie pripojenia doplňte cez montážne body. Kulisa ostáva pasívna, aby ste jej pohyb pripojili k existujúcemu mechanizmu.

Odstránenie koncového uzla alebo člena s väzbami, odpojenie uzla a úprava uloženia ponúknu náhľad dotknutých prvkov, väzieb, kót, trajektórií a pohonu. Model sa zmení až po potvrdení. Voľba zachovania zobrazeného východiska prepočíta polohy zostávajúcich telies. Zrušenie ponechá model nedotknutý; potvrdenie tvorí jeden krok Späť. Jednoduchá fixácia bez naviazaných závislostí zostáva priamou operáciou.

## Fázy pohybu

**Fázy pohybu** určujú postupnosť polôh jedného existujúceho pohonu. Zadajte názov, začiatok, koniec, trvanie a lineárny alebo plynulý priebeh. Rovnaký začiatok a koniec vytvoria zotrvanie. Koniec fázy musí nadväzovať na začiatok nasledujúcej; celkom možno uložiť 12 fáz.

Koniec možno vybrať na plátne: potiahnite mechanizmus alebo použite posuvník a potvrďte Použiť polohu. Rozpísané fázy aj dorazy zostanú zachované. Nastavte dolný a horný doraz v jednotkách pohonu. Prehrávať postupnosť fáz aktivuje časovanie; pri blokovaní sa pohyb zastaví. Vypnutie voľby vráti bežné prehrávanie celého rozsahu.

Fázy pomenované napríklad Sklopiť/Vysunúť riadia ten istý vstup; výsledné sklopenie a výsuv musia zabezpečiť skutočné väzby alebo existujúci parametrický zákon. Nepridávajú ďalšie nezávislé pohony. Názvy a koncové polohy sú dostupné na plátne; dlhší zoznam sa vodorovne posúva. Plán sa uloží do projektu a natívnej zálohy. Po odstránení alebo zmene druhu pohonu sa nekompatibilné fázy odstránia spolu s úpravou a možno ich vrátiť cez Späť.
