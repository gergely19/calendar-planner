import React, { useState } from "react";
import { splitCodes, joinCodes, mergeCodes } from "../lib/tanrend";

export default function QueryForm({
  name,
  semester,
  semesters,
  setName,
  setSemester,
  fetchData,
  loading,
}) {
  const [draft, setDraft] = useState("");
  // a szerkesztés alatt álló kód helye a listában (-1 = nincs szerkesztés)
  const [editIndex, setEditIndex] = useState(-1);
  const [editValue, setEditValue] = useState("");

  const codes = splitCodes(name);

  const save = (list) => setName(joinCodes(list));

  // Egyszerre több kód is beilleszthető (pontosvessző, vessző, sortörés mentén)
  const addCodes = (text) => {
    const incoming = text
      .split(/[;,\n\t]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    save(mergeCodes(codes, incoming));
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

  // ----- meglévő kód szerkesztése -----

  const startEdit = (index) => {
    setEditIndex(index);
    setEditValue(codes[index]);
  };

  const cancelEdit = () => {
    setEditIndex(-1);
    setEditValue("");
  };

  const commitEdit = () => {
    if (editIndex < 0) return;
    const value = editValue.trim();
    const next = [...codes];

    if (!value) {
      // kiürített kód: ez törlést jelent
      next.splice(editIndex, 1);
    } else {
      next[editIndex] = value;
      // ha a kód már máshol is szerepel, csak egy példány marad
      const duplicate = next.findIndex(
        (c, i) => i !== editIndex && c.toLowerCase() === value.toLowerCase()
      );
      if (duplicate !== -1) next.splice(duplicate, 1);
    }

    save(next);
    cancelEdit();
  };

  const onEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <section className="card">
      <h2>Tárgykódok</h2>
      <p className="card__hint">
        Add meg a tárgykódokat és a félévet, majd indítsd a lekérdezést. Ha nem
        tudod egy tárgy kódját, keresd meg a másik fülön a neve alapján.
      </p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Tantárgykódok</label>
          <div className="tag-input">
            {codes.map((code, i) =>
              editIndex === i ? (
                <span className="tag tag--editing" key={`edit-${i}`}>
                  <input
                    type="text"
                    className="tag__edit"
                    value={editValue}
                    size={Math.max(editValue.length + 1, 8)}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    onBlur={commitEdit}
                    aria-label={`${code} szerkesztése`}
                  />
                </span>
              ) : (
                <span className="tag" key={`${code}-${i}`}>
                  <button
                    type="button"
                    className="tag__text"
                    onClick={() => startEdit(i)}
                    disabled={loading}
                    title="Kattints a kód szerkesztéséhez"
                  >
                    {code}
                  </button>
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
              )
            )}
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
            Enterrel adod hozzá, a kódra kattintva szerkesztheted, az × -szel
            törölsz egyet. Jelenleg {codes.length} kód.
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
            {semesters.map((s) => (
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
