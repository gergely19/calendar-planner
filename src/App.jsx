import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import NameSearch from "./components/NameSearch";
import Calendar from "./components/Calendar";
import {
  SEMESTERS,
  tanrendUrl,
  parseCoursesFromHtml,
  splitCodes,
  joinCodes,
  mergeCodes,
} from "./lib/tanrend";
import "./indexstyle.css";

const KEY_TAB = "activeTab";

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

  const codes = splitCodes(name);

  // A névkeresés fülről ide kerülnek be a talált tárgykódok.
  const addCodes = (incoming) => setName(joinCodes(mergeCodes(codes, incoming)));

  const fetchData = async () => {
    if (!name.trim()) {
      setFormError("Add meg legalább egy tantárgykódot a lekérdezéshez.");
      return;
    }
    setFormError("");
    // A localStorage-t nem töröljük: a kiválasztások, pipák és színek megmaradnak.
    localStorage.setItem("codes", name);

    setLoading(true);

    setProgress({ done: 0, total: codes.length, eta: null });
    const startedAt = performance.now();
    let done = 0;

    let allCourses = [];
    let errorCodes = [];
    for (const code of codes) {
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
        total: codes.length,
        eta: Math.max(0, Math.round((avgMs * (codes.length - done)) / 1000)),
      });
    }
    localStorage.setItem(
      "coursesCache",
      JSON.stringify({ semester, courses: allCourses, errorCodes })
    );

    setCourses(allCourses);
    setErrorCodes(errorCodes);
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

    // Az utolsó lekérdezés eredménye is megmarad, így újratöltés után
    // azonnal ott van az órarend a kiválasztásokkal együtt.
    try {
      const cache = JSON.parse(localStorage.getItem("coursesCache"));
      if (cache && Array.isArray(cache.courses) && cache.courses.length > 0) {
        if (cache.semester) setSemester(cache.semester);
        setCourses(cache.courses);
        setErrorCodes(Array.isArray(cache.errorCodes) ? cache.errorCodes : []);
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
            setName={setName}
            setSemester={setSemester}
            fetchData={fetchData}
            loading={loading}
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
        <h2>Órarend</h2>
        <p className="card__hint">
          Kattints egy órára: kiválasztod azt a kurzust, és a tárgy többi
          csoportja eltűnik a naptárból. Újra rákattintva visszaáll az összes.
        </p>

        {!hasQueried && (
          <div className="notice">
            Még nincs betöltött kurzus – indíts egy lekérdezést fentebb.
          </div>
        )}

        <Calendar courses={courses} errorCodes={errorCodes} />
      </section>

      {loading && (
        <div className="overlay" role="status" aria-live="polite">
          <div className="overlay__box">
            <h2>Kurzusok betöltése</h2>
            <p>
              {progress.done} / {progress.total} kód
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
