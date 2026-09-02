import React, { useState } from "react";
import {
  parseCoursesFromHtml,
  parseKodok,
  tanrendUrl,
  normalize,
  hasCode,
} from "../lib/tanrend";

// Tárgykód szerinti csoportosítás: egy tárgykódhoz több kurzus (csoport)
// tartozik, a kereséskor viszont a kód és a hozzá tartozó név érdekes.
function groupByTargykod(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const { targykod } = parseKodok(row.kodok);
    if (!targykod) return;

    if (!map.has(targykod)) {
      map.set(targykod, {
        targykod,
        names: new Set(),
        teachers: new Set(),
        groups: 0,
      });
    }

    const entry = map.get(targykod);
    if (row.tantargy) entry.names.add(row.tantargy);
    if (row.tanar) entry.teachers.add(row.tanar);
    entry.groups += 1;
  });

  return [...map.values()]
    .map((entry) => {
      const names = [...entry.names].sort((a, b) => a.length - b.length);
      return {
        targykod: entry.targykod,
        // a legrövidebb név a legáltalánosabb, az azonosításhoz az a legjobb
        name: names[0] || entry.targykod,
        otherNames: Math.max(0, names.length - 1),
        teachers: [...entry.teachers],
        groups: entry.groups,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "hu"));
}

export default function NameSearch({
  semester,
  setSemester,
  semesters,
  codes,
  addCodes,
  fetchData,
  loading,
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // null = még nem volt keresés
  const [lastQuery, setLastQuery] = useState("");
  const [looseMatch, setLooseMatch] = useState(false);

  const fetchRows = async (key) => {
    const response = await fetch(tanrendUrl("keresnevre", key, semester));
    if (!response.ok) throw new Error(`HTTP hiba: ${response.status}`);
    return parseCoursesFromHtml(await response.text());
  };

  const runSearch = async () => {
    const text = query.trim();
    if (!text) {
      setError("Írd be a tárgy nevét vagy annak egy részét.");
      return;
    }

    setError("");
    setSearching(true);
    setLooseMatch(false);

    try {
      const words = text.split(/\s+/).filter(Boolean);
      let rows = await fetchRows(text);

      // A tanrend csak összefüggő szövegrészre keres. Ha így nincs találat,
      // újrapróbáljuk a leghosszabb szóval, és a többire utólag szűrünk.
      if (rows.length === 0 && words.length > 1) {
        const longest = [...words].sort((a, b) => b.length - a.length)[0];
        rows = await fetchRows(longest);
      }

      // Ékezet- és kisbetű-érzéketlen szűrés: minden beírt szónak szerepelnie
      // kell a kurzusnévben vagy a kódban.
      const needles = words.map(normalize);
      const filtered = rows.filter((row) => {
        const hay = normalize(`${row.tantargy} ${row.kodok}`);
        return needles.every((needle) => hay.includes(needle));
      });

      if (filtered.length === 0 && rows.length > 0) {
        setLooseMatch(true);
      }

      setResults(groupByTargykod(filtered.length > 0 ? filtered : rows));
      setLastQuery(text);
    } catch (err) {
      console.error("Névkeresési hiba:", err);
      setError("A keresés nem sikerült. Próbáld újra egy kicsit később.");
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!searching) runSearch();
    }
  };

  const missing = results
    ? results.filter((r) => !hasCode(codes, r.targykod)).map((r) => r.targykod)
    : [];

  return (
    <section className="card">
      <h2>Keresés tárgynév alapján</h2>
      <p className="card__hint">
        Nem kell pontosan egyeznie: elég a név egy része, és az ékezetek, a
        kis- vagy nagybetűk sem számítanak. A találatoknál ott van a tárgykód
        is, amit egy kattintással felvehetsz a lekérdezésbe.
      </p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="course-name">Tárgy neve</label>
          <input
            type="text"
            id="course-name"
            placeholder="pl. analizis, prog alapjai, mesterséges intelligencia"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <small>
            Több szót is beírhatsz, mindegyiknek szerepelnie kell a névben.
          </small>
        </div>

        <div className="field">
          <label htmlFor="search-semester">Félév</label>
          <select
            id="search-semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {semesters.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <small>A keresés is csak ennek a félévnek a kurzusait nézi.</small>
        </div>
      </div>

      <div className="form-actions">
        <button onClick={runSearch} disabled={searching || !query.trim()}>
          {searching ? "Keresés…" : "Keresés"}
        </button>
        {missing.length > 1 && (
          <button
            className="secondary"
            onClick={() => addCodes(missing)}
            disabled={loading}
          >
            Mind hozzáadása ({missing.length})
          </button>
        )}
        <span>Jelenleg {codes.length} kód van a lekérdezésben.</span>
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}

      {results && !error && (
        <div className="results">
          <h3 className="section-title">
            {results.length === 0
              ? `Nincs találat erre: ${lastQuery}`
              : `${results.length} tárgy erre: ${lastQuery}`}
          </h3>

          {looseMatch && results.length > 0 && (
            <p className="card__hint">
              A beírt szavak együtt nem jöttek ki, ezért a tanrend legközelebbi
              találatai láthatók.
            </p>
          )}

          {results.length === 0 && (
            <p className="card__hint">
              Próbáld egy rövidebb szóval, vagy ellenőrizd, hogy a tárgyat
              meghirdették-e ebben a félévben.
            </p>
          )}

          {results.map((result) => {
            const added = hasCode(codes, result.targykod);
            return (
              <div className="result" key={result.targykod}>
                <div className="result__info">
                  <div className="result__main">
                    <span className="result__code">{result.targykod}</span>
                    <span className="result__name">{result.name}</span>
                  </div>
                  <div className="result__meta">
                    {result.groups} kurzus
                    {result.teachers.length > 0 &&
                      ` · ${result.teachers.slice(0, 2).join(", ")}${
                        result.teachers.length > 2 ? " …" : ""
                      }`}
                    {result.otherNames > 0 &&
                      ` · további ${result.otherNames} kurzusnév ezzel a kóddal`}
                  </div>
                </div>
                <button
                  className={added ? "secondary" : ""}
                  onClick={() => addCodes([result.targykod])}
                  disabled={added || loading}
                  title={
                    added
                      ? "Ez a kód már szerepel a lekérdezésben"
                      : "Kód felvétele a lekérdezésbe"
                  }
                >
                  {added ? "Hozzáadva" : "Hozzáadás"}
                </button>
              </div>
            );
          })}

          {results.length > 0 && (
            <div className="form-actions">
              <button
                onClick={fetchData}
                disabled={loading || codes.length === 0}
              >
                {loading ? "Lekérdezés…" : "Órarend lekérdezése"}
              </button>
              <span>
                A felvett kódok a Tárgykódok fülön is megjelennek, ott
                szerkesztheted őket.
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
