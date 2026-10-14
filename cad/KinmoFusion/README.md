# KinmoFusion: lokálne prepojenie s Autodesk Fusion

Doplnok importuje aktuálnu 2D geometriu zo štúdia do **nového, neuloženého referenčného dokumentu**. Starý CAD dokument nemení, neodstraňuje ani neukladá. Nekonvertuje solver na Fusion joints ani na 3D zostavu. Profily kulís majú strednice a voliteľné uzavreté referenčné obrysy podľa šírky. Kóty sú referenčné čiary a popisy, nie výrobné riadiace parametre.

## Inštalácia a spustenie

1. Stiahnite balík doplnku zo štúdia a rozbaľte ho do vlastného priečinka `KinmoFusion`.
2. Vo Fusion otvorte **Utilities → Scripts and Add-Ins → Add-Ins**. Otvorte **šípku vedľa + → Script or add-in from device** a vyberte priečinok obsahujúci `KinmoFusion.py`, `bridge.py` a `KinmoFusion.manifest`. V niektorých verziách otvorí výber priečinka priamo tlačidlo **+**. Nevytvárajte novú prázdnu šablónu doplnku.
3. Vyberte **KinmoFusion → Run** a spustite ho ručne. Voľba automatického spúšťania zostáva vypnutá. Kód vytvorí tento doplnok, nie iný používateľom vytvorený doplnok.
4. Predvoľba je `https://kinematicke-modely.marcel-bucala.workers.dev`. Overte, že zodpovedá adrese vášho štúdia. Pre inú inštaláciu zadajte jej presnú adresu pôvodu, napríklad `http://127.0.0.1:5173` alebo vašu nasadenú `https://…workers.dev` adresu. Bez podadresára, prihlasovacích údajov alebo parametrov.
5. Vo štúdiu otvorte **Exportovať → Autodesk Fusion**. Do poľa vložte párovací kľúč z Fusion. Po úspešnom overení ho možno voliteľne zapamätať v localStorage tohto webu. Do projektu ani exportov sa nevkladá.
6. Stlačte **Overiť spojenie**, označte súhlas a potom **Odoslať nový referenčný výkres**. Týmto výslovne povoľujete vytvorenie nového dokumentu v bežiacom Fusion.
7. Povoľte prístup k lokálnej sieti, ak ho prehliadač vyžiada. Po práci zastavte doplnok vo Fusion.

`file://` priame prepojenie nepodporuje. Otvorte štúdio cez lokálny server alebo HTTPS. Ak prehliadač blokuje lokálne požiadavky, použite DXF zo štúdia a **Insert → Insert DXF**, jednotky **mm**.

## Referenčné obrysy drážok

Spoločný prepínač v exportnom a Fusion dialógu pridáva polygonálne uzavreté obrysy podľa zadanej šírky. Strednice ostávajú vo vrstve `SLOT`; vonkajší obrys je `SLOT_REFERENCE_OUTLINE`, prípadný vnútorný obrys uzavretej strednice `SLOT_REFERENCE_INNER`. Vo Fusion vznikajú oddelené fixované referenčné skice; doplnok doplní aj poslednú uzatváraciu hranu.

Otvorená drážka má polygonové zaoblenia, nie presné Fusion oblúky. Obrysy **neoverujú nástroj, vôľu, výrobnú toleranciu, pevnosť ani uloženie**. Pri pretínajúcej sa strednici, prudkom návrate, zrútenom obryse alebo príliš veľkej šírke sa export zastaví ešte pred odoslaním. Opravte geometriu alebo prepínač vypnite a použite strednice. Samostatné referenčné vodidlá obrys nepridávajú.

## Bezpečnosť a obmedzenia

- Server sa viaže len na `127.0.0.1:8765`, nikdy na `0.0.0.0` ani vzdialené rozhranie. Nie je potrebná zmena firewallu.
- Bez zapamätania sa vytvára nový náhodný kľúč. Zapamätané párovanie možno pri ďalšom spustení znovu použiť alebo zrušiť. Vyžaduje sa aj presný povolený Origin, bez wildcard CORS.
- Nie sú potrebné prihlasovacie údaje Autodesk, osobný API token ani cloudový účet v štúdiu.
- Požiadavky sú ohraničené na 2 MB / 2 000 entít / 30 000 bodov, jedna polyline najviac 1 001 bodov. Naraz čaká iba jeden import. Import prebieha v hlavnom Fusion vlákne cez custom event, nie z HTTP vlákna.
- Doplnok nevykonáva kód z projektu. Prijíma len číselné polylines, kružnice a krátke popisy.
- Kľúč, hlavičky a geometria sa nelogujú. Zastavenie doplnku zavrie server.
- Fusion API používa **cm**. Doplnok prevádza mm na cm delením 10; os Y sa otočí už v CAD exporte.
- Krivky sú referenčné, fixované úsečky. Import s tisíckami bodov môže trvať dlhšie; upravte alebo skryte zbytočne husté profily.
- Pri chybe môže zostať neúplný **nový** dokument. Existujúce dokumenty sa nedotknú. O jeho zatvorení / odstránení rozhodne používateľ.
- Doplnok dokument neukladá do cloudu. Ak ho sami uložíte alebo máte vlastné pravidlá Fusion synchronizácie, platia nastavenia vášho Fusion.

Rozhrania boli porovnané s lokálne nainštalovanými Fusion API definíciami. Automatické testy používajú izolované mock API a lokálny transport. Skutočný import v živom Fusion je manuálny akceptačný test, nie tvrdenie o už vykonanom CAD importe.

## História zmien

### 2026-10-11: referenčné obrysy a nové projekty editora

- Export štúdia môže k stredniciam pridať uzavreté vonkajšie a vnútorné obrysy drážok. Doplnok ich importuje ako oddelené fixované referenčné skice.
- Neplatné obrysy sa odmietajú pred odoslaním. Každá polyline má najviac 1 001 bodov; platia aj pôvodné limity celého prenosu.
- Projekt vytvorený cez Magic import sa prenáša ako bežná 2D geometria. Fotografia ani kalibračný podklad sa do Fusion neposiela.
- Inštalačný návod opisuje existujúci doplnok cez **Script or add-in from device**, nie vytvorenie prázdnej šablóny.
- Protokol, lokálny endpoint, presný Origin, dočasné párovanie, výslovný súhlas a vytvorenie nového neuloženého dokumentu zostávajú nezmenené. Nepribudol cloudový upload ani synchronizácia.

### 2026-10-10: lokálny referenčný import

- Ručne spúšťaný doplnok, ohraničený lokálny transport a import na hlavnom Fusion vlákne.
- Referenčné polylines, kružnice a popisy, prevod mm → cm a ochrana už otvorených CAD dokumentov.
- Izolované transportné a mock API testy; živý Fusion zostáva manuálnou akceptáciou.

Pri zmene pôvodu alebo po aktualizácii doplnku zastavte iba **KinmoFusion** a spustite ho znova. Pri spustení môžete použiť zapamätané párovanie; voľba nového párovania vytvorí nový kľúč a odvolá starý. Chrome musí pre stránku povoliť prístup k lokálnej sieti. Tlačidlo **Overiť spojenie** iba overí doplnok a nevytvorí dokument; vytvorenie výkresu spustí až **Odoslať nový referenčný výkres**.


Od verzie **1.1.0** môžete v doplnku potvrdiť zapamätanie párovania. Pôvod a kľúč sa uložia do používateľského profilu (`KinematikaStudio/KinmoFusion/pairing.json` v AppData, Application Support alebo .config). Pri ďalšom Run zvoľte **Áno** pre rovnaké párovanie; **Nie** odstráni uloženie a vytvorí nové párovanie. V prehliadači označte **Zapamätať overený kľúč** a overte spojenie. Uloženie funguje len pre rovnaký web a profil prehliadača. **Zabudnúť kľúč v prehliadači** odstráni iba prehliadačové uloženie; odvolanie starého kľúča vykonajte novým párovaním v doplnku. Kľúč nie je súčasťou ZIPu, projektu ani exportov.

Chyba **409** označuje prebiehajúci import alebo odmietnutú udalosť Fusion, nie neplatný kľúč. Po kopírovaní kľúča zavrite jeho dialóg aj **Scripts and Add-Ins**. Pred ďalším odoslaním overte, či už nevznikol nový dokument. Novší doplnok hlási stav `busy`; aplikácia počas neho ďalší výkres neodošle.

### 1.2.0: diagnostika a náhradné dokončenie importu

Zastavte doplnok a nahraďte celý jeho priečinok aktualizovaným ZIPom, potom znova spustite. Overenie spojenia samo nevytvára dokument. Kľúč môžete ponechať v zapamätanom párovaní.

Ak Fusion odmietne automatickú udalosť, aktualizovaný doplnok ponechá odoslaný výkres vo fronte. Zavrite modalné okná vrátane Scripts and Add-Ins a v **Design → Utilities** kliknite na **Kinmo: importovať čakajúci výkres**. Aplikácia túto možnosť zobrazí počas čakania. Výkres znova neposielajte. Náhradné tlačidlo spracuje iba už odoslaný výkres; prázdny front nič nevytvorí. Ak Fusion panel nie je dostupný, zostáva konkrétna chyba `fusion_event_rejected` a diagnostický záznam.

Import sa potvrdí až po vytvorení dokumentu na hlavnom vlákne. Rovnakú úlohu možno prevziať iba raz; rozpracovaný import blokuje ďalší. `/status` a debug balík obsahujú verziu doplnku, stav úloh a bounded záznam udalostí bez párovacieho kľúča či geometrie.

Windows aplikácia používa vlastný pôvod **https://kinematika.desktop.local**; pri párovaní ho zadajte namiesto webovej adresy. Na Android zariadení lokálny Fusion na počítači nie je dostupný; použite DXF.
