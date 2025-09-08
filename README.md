# Órarendtervező

Ez a projekt egy webes alkalmazás, amely segít egyetemi órarendek tervezésében, tantárgykódok alapján. A felhasználó megadhatja a tantárgyak kódjait, majd a rendszer automatikusan lekéri az ELTE tanrend oldaláról az órák időpontjait, és vizuálisan megjeleníti azokat egy naptárban.
(Ideigelenes elérhető az alábbi linken: https://calendar-planner.infinityfree.me)

## Fő funkciók

- Tantárgykódok megadása és félév kiválasztása
- Órarend automatikus lekérése és vizuális megjelenítése (DayPilot naptár)
- Kurzusok színkódolása, listázása, szűrése
- Hiányzó vagy hibás kódok visszajelzése
- Események ideiglenes eltávolítása/visszaállítása (localStorage segítségével)
- Betöltési idő becslése, spinner animáció

## Mappa felépítése

```
calendar-planner/
│
├── api/                  # Backend PHP API (adatlekérés ELTE tanrendről)
│   └── get_data.php
│
├── public/               # Publikus statikus fájlok (pl. DayPilot, ikon)
│   ├── daypilot-all.min.js
│   └── icon.png
│
├── src/                  # Frontend React forráskód
│   ├── App.jsx           # Fő alkalmazás komponens
│   ├── main.jsx          # Belépési pont (React root)
│   ├── index.css         # Alapértelmezett stílusok
│   ├── indexstyle.css    # Egyedi, alkalmazás-specifikus stílusok
│   ├── components/       # UI komponensek
│   │   ├── Calendar.jsx      # Naptár és kurzuslista megjelenítés
│   │   ├── ColorMapping.jsx  # Színkódolás magyarázata
│   │   ├── Header.jsx        # Fejléc
│   │   └── QueryForm.jsx     # Kereső űrlap
│   └── api/
│       └── get_data.php      # (fejlesztői példány, élesben az api/ mappát használja)
│
├── .env.development      # Fejlesztői környezet API URL
├── .env.production       # Éles környezet API URL
├── index.html            # Alap HTML sablon
├── package.json          # Node.js projekt metaadatok, scriptek
├── vite.config.js        # Vite konfiguráció
├── init.bat              # Telepítési/építési segédlet Windows-hoz
└── README.md             # Ez a dokumentáció
```

## Telepítés és futtatás

### 1. Előfeltételek

- Node.js és npm telepítve
- XAMPP vagy más PHP szerver (a backend API-hoz)
- Internetkapcsolat (ELTE tanrend oldal eléréséhez)

### 2. Fejlesztői környezet indítása

```sh
npm install
npm run dev
```
Ezután a böngészőben a [http://localhost:5173](http://localhost:5173) címen érhető el az alkalmazás.

### 3. Backend API beállítása

A `get_data.php` fájlt a `api/` mappából a PHP szervered megfelelő helyére kell másolni (pl. `C:\xampp\htdocs\api\get_data.php`).  
A fejlesztői környezetben az `.env.development` fájlban állítható az API URL (pl. `VITE_API_URL=http://localhost`).

### 4. Build és élesítés

Windows alatt használható az [init.bat](init.bat) script, amely:

- Telepíti a függőségeket
- Elkészíti a buildet
- Kimásolja a szükséges fájlokat a XAMPP mappába

```sh
init.bat
```

Ezután az éles verzió a [http://localhost/build/index.html](http://localhost/build/index.html) címen érhető el.

## Használat

1. Add meg a tantárgyak kódjait pontosvesszővel elválasztva (pl. `IP-18cAB2E; IP-18KPROGEG`)
2. Válaszd ki a félévet
3. Kattints a "Lekérdezés" gombra
4. A naptárban színes blokkokként jelennek meg az órák, a lista alatt pedig a kurzusok részletei
5. A kurzusok melletti checkboxokkal ideiglenesen elrejtheted/megmutathatod az eseményeket
6. A hibás vagy nem található kódokat külön listázza az alkalmazás

## Technológiák

- React 19
- Vite
- DayPilot (naptár)
- PHP (adatlekérő API)
- LocalStorage (felhasználói beállítások tárolása)

## Fejlesztői tippek

- A frontend kód a `src/` mappában található, minden fő komponens külön fájlban van.
- A backend API-t (PHP) fejlesztéskor a `src/api/get_data.php`-ban is szerkesztheted, de élesítéshez a gyökér `api/` mappába kell másolni.
- A stílusokat az `indexstyle.css` és `index.css` fájlokban találod.

---
