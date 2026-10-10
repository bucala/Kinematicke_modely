# KinmoFusion: lokálne prepojenie s Autodesk Fusion

Doplnok importuje aktuálnu 2D geometriu zo štúdia do **nového, neuloženého referenčného dokumentu**. Starý CAD dokument nemení, neodstraňuje ani neukladá. Nekonvertuje solver na Fusion joints ani na 3D zostavu; profily kulís sú strednice. Kóty sú referenčné čiary a popisy, nie výrobné riadiace parametre.

## Inštalácia a spustenie

1. Stiahnite balík doplnku zo štúdia a rozbaľte ho do vlastného priečinka `KinmoFusion`.
2. Vo Fusion otvorte **Utilities → Scripts and Add-Ins → Add-Ins**. Otvorte **šípku vedľa + → Script or add-in from device** a vyberte priečinok obsahujúci `KinmoFusion.py`, `bridge.py` a `KinmoFusion.manifest`. V niektorých verziách otvorí výber priečinka priamo tlačidlo **+**. Nevytvárajte novú prázdnu šablónu doplnku.
3. Vyberte **KinmoFusion → Run** a spustite ho ručne. Voľba automatického spúšťania zostáva vypnutá. Kód vytvorí tento doplnok, nie iný používateľom vytvorený doplnok.
4. Zadajte presnú adresu pôvodu štúdia, napríklad `http://127.0.0.1:5173` alebo vašu nasadenú `https://…workers.dev` adresu. Bez podadresára, prihlasovacích údajov alebo parametrov.
5. Vo štúdiu otvorte **Exportovať → Autodesk Fusion**. Do poľa vložte dočasný párovací kľúč z Fusion. Kľúč sa v štúdiu neukladá do localStorage ani do projektu / exportu.
6. Stlačte **Overiť spojenie**, označte súhlas a potom **Odoslať nový referenčný výkres**. Týmto výslovne povoľujete vytvorenie nového dokumentu v bežiacom Fusion.
7. Povoľte prístup k lokálnej sieti, ak ho prehliadač vyžiada. Po práci zastavte doplnok vo Fusion.

`file://` priame prepojenie nepodporuje. Otvorte štúdio cez lokálny server alebo HTTPS. Ak prehliadač blokuje lokálne požiadavky, použite DXF zo štúdia a **Insert → Insert DXF**, jednotky **mm**.

## Bezpečnosť a obmedzenia

- Server sa viaže len na `127.0.0.1:8765`, nikdy na `0.0.0.0` ani vzdialené rozhranie. Nie je potrebná zmena firewallu.
- Každé spustenie vytvorí nový náhodný kľúč. Vyžaduje sa aj presný povolený Origin, bez wildcard CORS.
- Nie sú potrebné prihlasovacie údaje Autodesk, osobný API token ani cloudový účet v štúdiu.
- Požiadavky sú ohraničené na 2 MB / 2 000 entít / 30 000 bodov, jedna polyline najviac 1 001 bodov. Naraz čaká iba jeden import. Import prebieha v hlavnom Fusion vlákne cez custom event, nie z HTTP vlákna.
- Doplnok nevykonáva kód z projektu. Prijíma len číselné polylines, kružnice a krátke popisy.
- Kľúč, hlavičky a geometria sa nelogujú. Zastavenie doplnku zavrie server.
- Fusion API používa **cm**. Doplnok prevádza mm na cm delením 10; os Y sa otočí už v CAD exporte.
- Krivky sú referenčné, fixované úsečky. Import s tisíckami bodov môže trvať dlhšie; upravte alebo skryte zbytočne husté profily.
- Pri chybe môže zostať neúplný **nový** dokument. Existujúce dokumenty sa nedotknú. O jeho zatvorení / odstránení rozhodne používateľ.
- Doplnok dokument neukladá do cloudu. Ak ho sami uložíte alebo máte vlastné pravidlá Fusion synchronizácie, platia nastavenia vášho Fusion.

Rozhrania boli porovnané s lokálne nainštalovanými Fusion API definíciami. Automatické testy používajú izolované mock API a lokálny transport. Skutočný import v živom Fusion je manuálny akceptačný test, nie tvrdenie o už vykonanom CAD importe.
