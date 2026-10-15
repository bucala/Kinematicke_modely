# Priame Windows a Android aplikácie

Editor je zabalený lokálne: internet netreba na kreslenie, simuláciu ani súbory. Cloudflare slúži na stiahnutie nových verzií. Uložené projekty ostávajú v profile aplikácie; web, Windows a Android majú samostatné úložiská. Prenášajte ich cez KINMO súbor.

- **Windows x64:** spustite `KinematikaStudio-VERSION.exe`. Samostatný EXE obsahuje .NET runtime a editor. Potrebuje Microsoft Edge WebView2 Runtime (bežne prítomný vo Windows 11). EXE zatiaľ nemá Authenticode podpis; Windows môže zobraziť SmartScreen. Aktualizácia je nahradenie EXE, používateľský profil a projekty zostávajú.
- **Android 8+:** nainštalujte `KinematikaStudio-VERSION.apk` a povoľte inštaláciu z použitého zdroja. APK je podpísané trvalým release kľúčom. Nové verzie musia používať ten istý kľúč a vyšší `versionCode`; inak Android nedovolí aktualizáciu bez odinštalovania. Neinštalujte debug APK na produkčné projekty.
- Windows Fusion párujte s presným pôvodom **`https://kinematika.desktop.local`**. Doplnok povoľuje jeden pôvod naraz; webové párovanie je oddelené. Android komunikuje s lokálnym zariadením, preto Fusion na počítači nepodporuje; preneste DXF.

## Lokálny build

Node 24 a Python 3 pre web/ZIP, .NET SDK 8 pre Windows, JDK 21, Gradle 8.10.2 a Android SDK 35/build-tools 35.0.0 pre Android. Použite systémovú konfiguráciu proxy a dôveryhodných CA; nevypínajte overenie TLS. `JAVA_HOME` musí ukazovať na JDK vrátane `javac`.

```sh
KINMO_VERSION=2.1.0 KINMO_PLATFORM=windows npm run build
node scripts/native-assets.mjs windows
dotnet publish native/windows/Kinematika.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:KinmoVersion=2.1.0 -o artifacts/windows
```

Na Windows použite `PYTHON=python` pre prípravu ZIPu. Cieľový EXE skúša `--self-test`, ktorý overí rozbalenie vloženého editora bez otvorenia UI. Linux overuje kompiláciu; skutočné UI testujte na Windows.

```sh
KINMO_VERSION=2.1.0 KINMO_PLATFORM=android npm run build
node scripts/native-assets.mjs android
# Hodnoty načítajte zo súkromného správcu; heslo nepíšte do histórie terminálu.
# KINMO_KEYSTORE, KINMO_KEYSTORE_PASSWORD, KINMO_KEY_ALIAS
KINMO_VERSION=2.1.0 KINMO_VERSION_CODE=1 gradle -p native/android assembleRelease
apksigner verify native/android/app/build/outputs/apk/release/app-release.apk
```

Aktívny Android signing config odmietne release build bez správneho kľúča. Keystore nikdy nepatrí do Gitu, Cloudflare ani verejných artifactov. Zálohujte ho aj heslo oddelene; pri strate nejde podpísať kompatibilnú aktualizáciu.

## GitHub Actions → Cloudflare

Workflow `.github/workflows/native-release.yml` sa spúšťa po pushi do `main` aj ručne. Zdieľaná verzia je `major.minor.(1000 + github.run_number)` a Android versionCode rovnaké poradové číslo. Balíky oboch platforiem sú artifacty GitHub Actions. Sťahovanie cez Cloudflare používa Worker a R2 bucket `kinematika-releases`; nový `latest.json` sa sprístupní až po uploade a overení oboch SHA-256 kontrolných súčtov. Publikované verzie sa neprepisujú a staršia verzia nemôže nahradiť novšiu.

V **GitHub → Settings → Secrets and variables → Actions** nastavte:

| Secret | Obsah |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 obsahu trvalého release keystore; jeden riadok |
| `ANDROID_KEYSTORE_PASSWORD` | Heslo keystore aj kľúča |
| `ANDROID_KEY_ALIAS` | `kinematika` pre pripravený kľúč |
| `CLOUDFLARE_ACCOUNT_ID` | `065e3003eb4c6bd1bffe7afa184eb5c4` |
| `CLOUDFLARE_API_TOKEN` | Token pre cieľový účet: Workers Scripts Edit, Workers R2 Storage Edit a potrebné čítanie účtu |

Cloudflare musí mať aktivované R2. Workflow vytvorí bucket, ak chýba, a nasadí Worker so statickou aplikáciou a download endpointmi. Git-integrácia Workers Builds musí tiež vedieť vytvoriť alebo používať tento bucket pred deployom aktualizovaného `wrangler.toml`. Ak beží paralelne s Actions, nepoužívajte odlišné zdroje/verzie; na produkčné nasadenie odporúčame tento jeden workflow.

**Cloudflare Workers nevykonávajú Windows/Android kompiláciu.** Platformové buildy vykonávajú GitHub runners; Cloudflare distribuuje výsledky. Chýbajúce secrets spôsobia zreteľné zlyhanie podpisu/publikovania; workflow nesmie vydať APK s náhodným novým kľúčom.

Pri prvom vydaní použite pripravený súkromný podpisový balík. Súbor s heslom neodovzdávajte AI a nikde ho verejne nepublikujte. Nahrajte iba hodnoty do GitHub secrets a zálohu uložte v bezpečnom úložisku.

## Akceptácia na zariadeniach

Pred širšou distribúciou overte nový projekt, KINMO uloženie/otvorenie, Magic import obrázka, simuláciu, debug export, reštart aplikácie a aktualizáciu APK s ponechanými projektmi. Živý Fusion import testujte na Windows s aktualizovaným doplnkom. Cross build a overenie APK podpisu nenahrádzajú tieto testy.

## Diagnostika natívneho CI

- **Android: `Failed to find package 'tools'`:** ide o vyradený SDK balík z predvolených vstupov `android-actions/setup-android@v3`. Workflow explicitne inštaluje `platform-tools`; platformu `android-35` a `build-tools;35.0.0` inštaluje nasledujúci krok. SDK licencie sa akceptujú štandardným mechanizmom akcie.
- **Windows: EXE sa zostavilo, ale `No files were found ... artifacts/*.exe`:** PowerShell pri GUI programe spustenom operátorom `&` nemusí čakať na ukončenie; `$LASTEXITCODE` potom nemusí patriť self-testu. Workflow používa `Start-Process -Wait -PassThru`, kontroluje priamo jeho návratový kód a až potom kopíruje verzované EXE. Self-test pri chybe neotvára blokujúci dialóg.
- Chýbajúce EXE, APK alebo manifest teraz znamenajú chybu upload kroku, nie úspešný job s varovaním. Publikovanie do R2 naďalej vyžaduje oba balíky a ich overenie.
