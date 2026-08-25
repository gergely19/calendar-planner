import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import Calendar from "./components/Calendar";
import "./indexstyle.css";

function App() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorCodes, setErrorCodes] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, eta: null });
  const [formError, setFormError] = useState("");
  const [hasQueried, setHasQueried] = useState(false);
  const [name, setName] = useState("IPM-22fpiPAIEG; IPM-24fpiPETEG; IPM-22fpiIFE; IPM-22fpiIFG; IPM-22fpiDSEG; ELTE-OI-AI; IPM-24fpiMFCE; IPM-22fRMEG; IPM-22fpiDNDEG; IPM-22fpiPCMSG; IPM-22fpiPME"); //IP-18cAB2E; IP-18cSZÁMEA2E;    IP-18KPROGEG  ; IP-18MIAE; IP-18cAB2G; IP-18cSZÁMEA2G;  IP-18KVPYEG; IP-24KVSZPDMEG; IP-18cVSZG

  //IP-18cVSZG; IP-24KVSZPDMEG; IP-18KVIBDAG; IP-18cSZÁMEA2E; IP-18cAB2G; IP-18KVSZPREG; IP-18MIAE; IP-18KPROGEG; IP-18KVPYEG; IP-18cAB2E; IP-18KVELE; IP-18KVSZBGTE; IP-18KVIFSWPROGG; IP-18cSZÁMEA2G
  const [semester, setSemester] = useState("2026-2027-1");
  const API_URL = import.meta.env.VITE_API_URL || "";
  const fetchData = async () => {
    if (!name.trim()) {
      setFormError("Add meg legalább egy tantárgykódot a lekérdezéshez.");
      return;
    }
    setFormError("");
    // A localStorage-t nem töröljük: a kiválasztások, pipák és színek megmaradnak.
    localStorage.setItem("codes", name);

    setLoading(true);

    // Feltételezzük, hogy a backend elérhető /api/get_data.php útvonalon
    const codes = name.split(";").map((code) => code.trim()).filter(Boolean);
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
          const response = await fetch(`/api/elte/tanrendnavigation.php?k=${encodeURIComponent(code)}&m=keres_kod_azon&f=${encodeURIComponent(semester)}`);

          if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
          }

          const htmlString = await response.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, "text/html");
          const entries = doc.querySelectorAll('table[id*="resulttable"] tr');
          const parsedCourses = [];

          entries.forEach(entry => {
            const cols = entry.querySelectorAll('td');
            if (cols.length > 0) {
                const idopont = cols[0]?.textContent?.trim() || "";
                const kodok = cols[1]?.textContent?.trim() || "";
                const tantargy = cols[2]?.textContent?.trim() || "";
                const tanar = cols[5]?.textContent?.trim() || "";

                parsedCourses.push({
                    idopont,
                    tantargy,
                    kodok,
                    tanar
                });
            }
          });

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

  return (
    <>
      <Header />

      {formError && (
        <div className="notice notice--error" role="alert">
          {formError}
        </div>
      )}

      <QueryForm
        name={name}
        semester={semester}
        setName={setName}
        setSemester={setSemester}
        fetchData={fetchData}
        loading={loading}
      />

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
