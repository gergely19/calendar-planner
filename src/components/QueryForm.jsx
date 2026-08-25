import React, { useState } from "react";

const SEMESTERS = [
  { value: "2026-2027-1", label: "2026/27 ősz" },
  { value: "2025-2026-2", label: "2025/26 tavasz" },
  { value: "2025-2026-1", label: "2025/26 ősz" },
  { value: "2024-2025-2", label: "2024/25 tavasz" },
  { value: "2024-2025-1", label: "2024/25 ősz" },
];

export default function QueryForm({
  name,
  semester,
  setName,
  setSemester,
  fetchData,
  loading,
}) {
  const [draft, setDraft] = useState("");

  const codes = name
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  const save = (list) => setName(list.join("; "));

  // Egyszerre több kód is beilleszthető (pontosvessző, vessző, sortörés mentén)
  const addCodes = (text) => {
    const incoming = text
      .split(/[;,\n\t]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const merged = [...codes];
    incoming.forEach((code) => {
      if (!merged.some((c) => c.toLowerCase() === code.toLowerCase())) {
        merged.push(code);
      }
    });
    save(merged);
  };

  const removeCode = (index) => save(codes.filter((_, i) => i !== index));

  const commitDraft = () => {
    if (!draft.trim()) return false;
    addCodes(draft);
    setDraft("");
    return true;
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (!commitDraft() && e.key === "Enter" && !loading && codes.length > 0) {
        fetchData();
      }
    } else if (e.key === "Backspace" && !draft && codes.length > 0) {
      removeCode(codes.length - 1);
    }
  };

  return (
    <section className="card">
      <h2>Tantárgyak</h2>
      <p className="card__hint">
        Add meg a tárgykódokat és a félévet, majd indítsd a lekérdezést.
      </p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Tantárgykódok</label>
          <div className="tag-input">
            {codes.map((code, i) => (
              <span className="tag" key={`${code}-${i}`}>
                {code}
                <button
                  type="button"
                  className="tag__remove"
                  onClick={() => removeCode(i)}
                  disabled={loading}
                  aria-label={`${code} eltávolítása`}
                  title="Kód eltávolítása"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              id="name"
              placeholder={codes.length ? "További kód…" : "pl. IPM-22fpiIFE"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={commitDraft}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/[;,\n\t]/.test(text)) {
                  e.preventDefault();
                  addCodes(text);
                }
              }}
            />
          </div>
          <small>
            Enterrel adod hozzá, az × -szel törölsz egyet. Jelenleg{" "}
            {codes.length} kód.
          </small>
          <small className="example">
            Több kódot egyszerre is beilleszthetsz, például:{" "}
            <code>IPM-22fpiIFE; IPM-22fpiIFG; IPM-22fpiPME</code>
          </small>
        </div>

        <div className="field">
          <label htmlFor="semester">Félév</label>
          <select
            id="semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {SEMESTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <small>Csak ennek a félévnek a kurzusai jelennek meg.</small>
        </div>
      </div>

      <div className="form-actions">
        <button onClick={fetchData} disabled={loading || codes.length === 0}>
          {loading ? "Lekérdezés…" : "Lekérdezés"}
        </button>
        <button
          className="secondary"
          onClick={() => save([])}
          disabled={loading || codes.length === 0}
        >
          Összes kód törlése
        </button>
        <span>
          A lekérdezés felülírja a naptár tartalmát, és kódonként pár másodperc.
        </span>
      </div>
    </section>
  );
}
