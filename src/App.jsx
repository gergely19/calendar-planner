import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import NameSearch from "./components/NameSearch";
import Calendar from "./components/Calendar";
import InfoHint from "./components/InfoHint";
import PairingModal from "./components/PairingModal";
import Footer from "./components/Footer";
import {
  SEMESTERS,
  KEY_GROUPS,
  tanrendUrl,
  parseCoursesFromHtml,
  parseKodok,
  splitCodes,
  joinCodes,
  mergeCodes,
  readGroups,
  sameName,
  KEY_COLORS,
  readDismissed,
  writeDismissed,
  sameCode,
  groupOfCode,
  newGroupId,
  codeHead,
  commonPrefixLength,
  isPlausibleSuggestion,
  suggestionFragments,
} from "./lib/tanrend";
import "./indexstyle.css";

const KEY_TAB = "activeTab";
const KEY_AUTO_SAME_NAME = "autoSameName";

const TABS = [
  { id: "codes", label: "Tárgykódok" },
  { id: "search", label: "Keresés név alapján" },
];

function App() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorCodes, setErrorCodes] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, eta: null });
  const [formError, setFormError] = useState("");
  const [hasQueried, setHasQueried] = useState(false);
  const [tab, setTab] = useState("codes");
  const [name, setName] = useState("IPM-22fpiPAIEG; IPM-24fpiPETEG; IPM-22fpiIFE; IPM-22fpiIFG; IPM-22fpiDSEG; ELTE-OI-AI; IPM-24fpiMFCE; IPM-22fRMEG; IPM-22fpiDNDEG; IPM-22fpiPCMSG; IPM-22fpiPME"); //IP-18cAB2E; IP-18cSZÁMEA2E;    IP-18KPROGEG  ; IP-18MIAE; IP-18cAB2G; IP-18cSZÁMEA2G;  IP-18KVPYEG; IP-24KVSZPDMEG; IP-18cVSZG

  //IP-18cVSZG; IP-24KVSZPDMEG; IP-18KVIBDAG; IP-18cSZÁMEA2E; IP-18cAB2G; IP-18KVSZPREG; IP-18MIAE; IP-18KPROGEG; IP-18KVPYEG; IP-18cAB2E; IP-18KVELE; IP-18KVSZBGTE; IP-18KVIFSWPROGG; IP-18cSZÁMEA2G
  const [semester, setSemester] = useState("2026-2027-1");

  // Tárgycsoportok: egy tárgy több kódon is meghirdetve, egy kurzussal.
  const [groups, setGroups] = useState([]);

  // Lekérdezéskor a pontosan ugyanilyen nevű kurzusok automatikus behozása.
  const [autoSameName, setAutoSameName] = useState(true);

  // Nem talált kódokhoz: tárgykód -> [{kod, nev}] tippek.
  const [suggestions, setSuggestions] = useState({});

  // Lekérdezés után feljön a párosító ablak, ha van mit párosítani.
  const [pairingOpen, setPairingOpen] = useState(false);

  // Amit egyszer elvetettél, azt többé nem kínáljuk fel.
  const [dismissed, setDismissed] = useState({});

  // A „Színek cseréje” gomb ezt lépteti, amitől a naptár újrasorsolja a színeket.
  const [colorSeed, setColorSeed] = useState(0);

  const shuffleColors = () => {
    localStorage.removeItem(KEY_COLORS);
    setColorSeed((seed) => seed + 1);
  };

  const codes = splitCodes(name);

  // A névkeresés fülről ide kerülnek be a talált tárgykódok.
  const addCodes = (incoming) => setName(joinCodes(mergeCodes(codes, incoming)));

  const updateGroups = (next) => {
    setGroups(next);
    localStorage.setItem(KEY_GROUPS, JSON.stringify(next));
  };

  // A tipp ugyanaz a tárgy másik szak kódján, ezért nem elég felvenni a kódot:
  // a régivel egy tárgycsoportba tesszük, a tárgy nevével. Így a naptárban egy
  // tárgyként viselkednek, és elég közülük egy kurzust felvenni.
  const acceptSuggestions = (pairs) => {
    if (pairs.length === 0) return;

    const nextCodes = mergeCodes(
      codes,
      pairs.map((p) => p.tip.kod)
    );
    const nextName = joinCodes(nextCodes);
    setName(nextName);

    // A csoportlistát végiggörgetjük, hogy több párosítás se dolgozzon elavult
    // állapottal.
    let next = groups;

    pairs.forEach(({ code, tip }) => {
      const pair = [code, tip.kod];
      const target = groupOfCode(next, code) || groupOfCode(next, tip.kod);
      const label = (tip.nev || "").trim();

      next = next.map((group) => {
        if (target && group.id === target.id) {
          return {
            ...group,
            label: group.label.trim() || label,
            codes: mergeCodes(group.codes, pair),
          };
        }
        // egy kód csak egy csoportban lehet
        return {
          ...group,
          codes: group.codes.filter((c) => !pair.some((p) => sameCode(p, c))),
        };
      });

      if (!target) next = [...next, { id: newGroupId(), label, codes: pair }];
    });

    updateGroups(next);

    // A nem választott lehetőségeket elvetjük, különben a következő
    // lekérdezésnél ugyanezek jönnének fel újra.
    const nextDismissed = { ...dismissed };
    pairs.forEach(({ code, tip }) => {
      const key = code.toLowerCase();
      const others = (suggestions[code] || [])
        .filter((t) => !sameCode(t.kod, tip.kod))
        .map((t) => t.kod.toLowerCase());
      nextDismissed[key] = [
        ...new Set([...(nextDismissed[key] || []), ...others]),
      ];
    });
    setDismissed(nextDismissed);
    writeDismissed(nextDismissed);

    // A párosított kód megoldott: eltűnik a tippek közül itt és a mentésből is.
    const paired = new Set(pairs.map((p) => p.code));
    setSuggestions((prev) => {
      const rest = { ...prev };
      paired.forEach((code) => delete rest[code]);
      return rest;
    });

    try {
      const cache = JSON.parse(localStorage.getItem("coursesCache"));
      if (cache?.suggestions) {
        paired.forEach((code) => delete cache.suggestions[code]);
        localStorage.setItem("coursesCache", JSON.stringify(cache));
      }
    } catch {
      // hibás cache esetén nincs mit frissíteni
    }

    // A párosított kódok kurzusai csak új lekérdezéssel jönnek be, ezért azt
    // rögtön el is indítjuk – a friss állapotot átadva, mert a React csak a
    // következő renderben frissítené.
    fetchData({ name: nextName, groups: next, dismissed: nextDismissed });
  };

  const acceptSuggestion = (failedCode, tip) =>
    acceptSuggestions([{ code: failedCode, tip }]);

  const updateAutoSameName = (value) => {
    setAutoSameName(value);
    localStorage.setItem(KEY_AUTO_SAME_NAME, String(value));
  };

  // A párosítás utáni automatikus újralekérdezés még a React állapotfrissítés
  // előtt indul, ezért a friss kódlistát, csoportokat és elvetéseket át lehet
  // adni felülírásként.
  const fetchData = async (override) => {
    const activeName = override?.name ?? name;
    const activeCodes = splitCodes(activeName);
    const activeGroups = override?.groups ?? groups;
    const activeDismissed = override?.dismissed ?? dismissed;

    if (!activeName.trim()) {
      setFormError("Add meg legalább egy tantárgykódot a lekérdezéshez.");
      return;
    }
    setFormError("");
    // A localStorage-t nem töröljük: a kiválasztások, pipák és színek megmaradnak.
    localStorage.setItem("codes", activeName);

    setLoading(true);

    setProgress({ done: 0, total: activeCodes.length, eta: null });
    const startedAt = performance.now();
    let done = 0;

    let allCourses = [];
    let errorCodes = [];
    for (const code of activeCodes) {
      let data = [];
      let attempts = 0;

      while (attempts < 3) {
        try {
          const response = await fetch(
            tanrendUrl("keres_kod_azon", code, semester)
          );

          if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
          }

          const parsedCourses = parseCoursesFromHtml(await response.text());

          if (parsedCourses.length > 0) {
            data = parsedCourses;
            break;
          }
        } catch (err) {
          console.error("Lekérdezési hiba:", err);
        }
        attempts++;
      }

      if (data.length === 0) {
        errorCodes = errorCodes.concat(code);
      }
      allCourses = allCourses.concat(data);

      // becsült hátralévő idő a tényleges átlagos kódonkénti időből
      done++;
      const avgMs = (performance.now() - startedAt) / done;
      setProgress({
        done,
        total: activeCodes.length,
        eta: Math.max(
          0,
          Math.round((avgMs * (activeCodes.length - done)) / 1000)
        ),
      });
    }

    // 2. fázis: a megtalált tárgyak pontosan ugyanilyen nevű kurzusai. Ugyanazt
    // a tárgyat több kódon is meghirdethetik, ezeket nem kell kézzel felvenni.
    let extraCodes = [];
    if (autoSameName && allCourses.length > 0) {
      const known = new Set(activeCodes.map((c) => c.toLowerCase()));
      const names = [
        ...new Set(
          allCourses
            .map((c) => (c.tantargy || "").trim())
            .filter((n) => n.length >= 4)
        ),
      ];
      const seen = new Set(
        allCourses.map((c) => `${c.kodok}|${c.idopont}`)
      );
      const found = new Set();

      setProgress({
        done,
        total: activeCodes.length + names.length,
        eta: null,
        phase: "names",
      });

      for (const courseName of names) {
        try {
          const response = await fetch(
            tanrendUrl("keresnevre", courseName, semester)
          );
          if (response.ok) {
            const rows = parseCoursesFromHtml(await response.text());
            rows.forEach((row) => {
              if (!sameName(row.tantargy, courseName)) return;

              const { targykod } = parseKodok(row.kodok);
              if (!targykod || known.has(targykod.toLowerCase())) return;

              const rowId = `${row.kodok}|${row.idopont}`;
              if (seen.has(rowId)) return;

              seen.add(rowId);
              found.add(targykod);
              allCourses = allCourses.concat(row);
            });
          }
        } catch (err) {
          console.error("Névegyeztetési hiba:", err);
        }

        done++;
        const avgMs = (performance.now() - startedAt) / done;
        const total = activeCodes.length + names.length;
        setProgress({
          done,
          total,
          eta: Math.max(0, Math.round((avgMs * (total - done)) / 1000)),
          phase: "names",
        });
      }

      extraCodes = [...found].sort((a, b) => a.localeCompare(b, "hu"));
    }

    // 3. fázis: tipp a nem talált kódokhoz. A tanrend kódkeresője részstringre
    // illeszt, ezért a kód végével rákeresve előjönnek ugyanannak a tárgynak a
    // más szakos meghirdetései – tipikusan csak a kód közepe tér el.
    const suggestions = {};
    if (errorCodes.length > 0) {
      const known = new Set(
        [...activeCodes, ...extraCodes].map((c) => c.toLowerCase())
      );

      // Amelyik kód már egy tárgycsoportban van, és a csoport másik kódja
      // meghozta a kurzusokat, az meg van oldva – oda nem kell több tipp.
      const loaded = new Set(
        allCourses.map((c) => (parseKodok(c.kodok).targykod || "").toLowerCase())
      );
      const isCovered = (code) => {
        const group = groupOfCode(activeGroups, code);
        return (
          !!group &&
          group.codes.some(
            (c) => !sameCode(c, code) && loaded.has(c.toLowerCase())
          )
        );
      };

      setProgress({ done: 0, total: errorCodes.length, eta: null, phase: "tips" });
      let tipsDone = 0;

      for (const code of errorCodes) {
        const rejected = activeDismissed[code.toLowerCase()] || [];

        // Előre az kerül, aminek az évszámmal együtt is stimmel az eleje;
        // utána a hosszabb közös kezdet, végül a hasonlóbb hossz dönt
        // (IPM-24ATIDSEG közelebb van, mint IPM-24ATCTDSEG).
        const head = codeHead(code).toLowerCase();
        const headScore = (kod) =>
          head.length > 0 && kod.toLowerCase().startsWith(head) ? 1 : 0;

        if (!isCovered(code)) {
          // A leghosszabb végződéssel kezdjük, és az első értelmes találatnál
          // megállunk – így a legpontosabb egyezés nyer.
          for (const fragment of suggestionFragments(code)) {
            try {
              const response = await fetch(
                tanrendUrl("keres_kod_azon", fragment, semester)
              );
              if (!response.ok) continue;

              const rows = parseCoursesFromHtml(await response.text());
              const found = new Map();

              rows.forEach((row) => {
                const { targykod } = parseKodok(row.kodok);
                if (!targykod) return;
                if (!isPlausibleSuggestion(code, targykod, fragment)) return;
                if (known.has(targykod.toLowerCase())) return;
                if (rejected.includes(targykod.toLowerCase())) return;
                if (!found.has(targykod)) found.set(targykod, row.tantargy || "");
              });

              const list = [...found.entries()]
                .map(([kod, nev]) => ({ kod, nev }))
                .sort(
                  (a, b) =>
                    headScore(b.kod) - headScore(a.kod) ||
                    commonPrefixLength(code, b.kod) -
                      commonPrefixLength(code, a.kod) ||
                    Math.abs(a.kod.length - code.length) -
                      Math.abs(b.kod.length - code.length)
                )
                .slice(0, 3);

              if (list.length > 0) {
                suggestions[code] = list;
                break;
              }
            } catch (err) {
              console.error("Tippkeresési hiba:", err);
            }
          }
        }

        tipsDone++;
        setProgress({
          done: tipsDone,
          total: errorCodes.length,
          eta: null,
          phase: "tips",
        });
      }
    }

    localStorage.setItem(
      "coursesCache",
      JSON.stringify({
        semester,
        courses: allCourses,
        errorCodes,
        extraCodes,
        suggestions,
      })
    );

    setCourses(allCourses);
    setErrorCodes(errorCodes);
    setSuggestions(suggestions);
    setPairingOpen(Object.keys(suggestions).length > 0);
    setHasQueried(true);
    setLoading(false);
  };

  useEffect(() => {
    const savedCodes = localStorage.getItem("codes");
    if (savedCodes) {
      setName(savedCodes);
    }

    const savedTab = localStorage.getItem(KEY_TAB);
    if (TABS.some((t) => t.id === savedTab)) {
      setTab(savedTab);
    }

    setGroups(readGroups());

    setDismissed(readDismissed());

    const savedAuto = localStorage.getItem(KEY_AUTO_SAME_NAME);
    if (savedAuto !== null) setAutoSameName(savedAuto === "true");

    // Az utolsó lekérdezés eredménye is megmarad, így újratöltés után
    // azonnal ott van az órarend a kiválasztásokkal együtt.
    try {
      const cache = JSON.parse(localStorage.getItem("coursesCache"));
      if (cache && Array.isArray(cache.courses) && cache.courses.length > 0) {
        if (cache.semester) setSemester(cache.semester);
        setCourses(cache.courses);
        setErrorCodes(Array.isArray(cache.errorCodes) ? cache.errorCodes : []);
        setSuggestions(
          cache.suggestions && typeof cache.suggestions === "object"
            ? cache.suggestions
            : {}
        );
        setHasQueried(true);
      }
    } catch {
      // hibás cache esetén egyszerűen üresen indulunk
    }
  }, []);

  const selectTab = (id) => {
    setTab(id);
    localStorage.setItem(KEY_TAB, id);
  };

  return (
    <>
      <Header />

      {formError && (
        <div className="notice notice--error" role="alert">
          {formError}
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Lekérdezés módja">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`tab${tab === t.id ? " tab--active" : ""}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
            {t.id === "codes" && codes.length > 0 && (
              <span className="tab__count">{codes.length}</span>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "codes" ? (
          <QueryForm
            name={name}
            semester={semester}
            semesters={SEMESTERS}
            groups={groups}
            autoSameName={autoSameName}
            setName={setName}
            setGroups={updateGroups}
            setAutoSameName={updateAutoSameName}
            setSemester={setSemester}
            fetchData={fetchData}
            loading={loading}
            shuffleColors={shuffleColors}
            hasCourses={courses.length > 0}
          />
        ) : (
          <NameSearch
            semester={semester}
            setSemester={setSemester}
            semesters={SEMESTERS}
            codes={codes}
            addCodes={addCodes}
            fetchData={fetchData}
            loading={loading}
          />
        )}
      </div>

      <section className="card">
        <h2>
          Órarend
          <InfoHint>
            Kattints egy órára: kiválasztod azt a kurzust, és a tárgy többi
            csoportja eltűnik a naptárból. Újra rákattintva visszaáll az összes.
            Az órára húzva a kurzus időpontja és oktatója is megjelenik.
          </InfoHint>
        </h2>

        {!hasQueried && (
          <div className="notice">
            Még nincs betöltött kurzus – indíts egy lekérdezést fentebb.
          </div>
        )}

        <Calendar
          courses={courses}
          errorCodes={errorCodes}
          groups={groups}
          suggestions={suggestions}
          onAcceptSuggestion={acceptSuggestion}
          colorSeed={colorSeed}
        />
      </section>

      <Footer />

      {pairingOpen && !loading && (
        <PairingModal
          suggestions={suggestions}
          onPair={(pairs) => {
            acceptSuggestions(pairs);
            setPairingOpen(false);
          }}
          onClose={() => setPairingOpen(false)}
        />
      )}

      {loading && (
        <div className="overlay" role="status" aria-live="polite">
          <div className="overlay__box">
            <h2>
              {progress.phase === "names"
                ? "Azonos nevű kurzusok keresése"
                : progress.phase === "tips"
                ? "Tipp keresése a nem talált kódokhoz"
                : "Kurzusok betöltése"}
            </h2>
            <p>
              {progress.done} / {progress.total} lekérdezés
            </p>
            <p>
              {progress.eta === null
                ? "Hátralévő idő számítása…"
                : progress.eta > 0
                ? `Kb. ${progress.eta} másodperc van hátra`
                : "Mindjárt kész"}
            </p>
            <div className="spinner"></div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
