import React from "react";
import CodeTagInput from "./CodeTagInput";
import InfoHint from "./InfoHint";
import {
  splitCodes,
  joinCodes,
  mergeCodes,
  groupOfCode,
  sameCode,
  newGroupId,
} from "../lib/tanrend";

export default function QueryForm({
  name,
  semester,
  semesters,
  groups,
  autoSameName,
  setName,
  setGroups,
  setAutoSameName,
  setSemester,
  fetchData,
  loading,
  shuffleColors,
  hasCourses,
}) {
  const codes = splitCodes(name);
  const ungrouped = codes.filter((code) => !groupOfCode(groups, code));

  const save = (list) => setName(joinCodes(list));

  // A lekérdezés a teljes kódlistából megy, a csoportok csak azt írják le,
  // mely kódok tartoznak ugyanahhoz a tárgyhoz. Ezért minden változásnál a
  // kikerült kódokat kivesszük, az újakat pedig hozzáfűzzük a listához.
  const applyCodes = (before, after) => {
    const removed = before.filter((code) => !after.some((c) => sameCode(c, code)));
    const kept = codes.filter((code) => !removed.some((r) => sameCode(r, code)));
    save(mergeCodes(kept, after));
  };

  const saveGroups = (list) => setGroups(list);

  const addGroup = () =>
    saveGroups([...groups, { id: newGroupId(), label: "", codes: [] }]);

  const renameGroup = (id, label) =>
    saveGroups(groups.map((g) => (g.id === id ? { ...g, label } : g)));

  const changeGroupCodes = (id, next) => {
    const target = groups.find((g) => g.id === id);
    if (!target) return;

    const nextGroups = groups.map((group) => {
      if (group.id === id) return { ...group, codes: next };
      // egy kód csak egy csoportban lehet
      return {
        ...group,
        codes: group.codes.filter((c) => !next.some((n) => sameCode(n, c))),
      };
    });

    saveGroups(nextGroups);
    applyCodes(target.codes, next);
  };

  // Szétbontáskor a kódok megmaradnak a lekérdezésben, csak külön tárgyak lesznek.
  const dissolveGroup = (id) => saveGroups(groups.filter((g) => g.id !== id));

  const submitIfPossible = () => {
    if (!loading && codes.length > 0) fetchData();
  };

  return (
    <section className="card">
      <h2>
        Tárgykódok
        <InfoHint>
          Add meg a tárgykódokat és a félévet, majd indítsd a lekérdezést. Ha
          nem tudod egy tárgy kódját, keresd meg a másik fülön a neve alapján.
        </InfoHint>
      </h2>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Tantárgykódok</label>
          <CodeTagInput
            codes={ungrouped}
            onChange={(next) => applyCodes(ungrouped, next)}
            inputId="name"
            placeholder="További kód…"
            emptyPlaceholder="pl. IPM-22fpiIFE"
            disabled={loading}
            onEnterEmpty={submitIfPossible}
          />
          <small>
            Összesen {codes.length} kód
            {groups.length > 0 && `, ebből ${codes.length - ungrouped.length} csoportban`}.
            <InfoHint label="Hogyan használd">
              Enterrel adod hozzá, a kódra kattintva szerkesztheted, az × -szel
              törölsz egyet. A <strong>Kijelölés</strong> gombbal több kódot
              egyszerre másolhatsz vagy törölhetsz. Több kódot egyszerre is
              beilleszthetsz, például:{" "}
              <code>IPM-22fpiIFE; IPM-22fpiIFG; IPM-22fpiPME</code>
            </InfoHint>
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
        </div>
      </div>

      <label className="option-row">
        <input
          type="checkbox"
          checked={autoSameName}
          onChange={(e) => setAutoSameName(e.target.checked)}
          disabled={loading}
        />
        <span>
          <strong>Azonos nevű kurzusok automatikus behozása.</strong>
          <InfoHint>
            A lekérdezés után megkeresi a tanrendben a pontosan ugyanilyen nevű
            kurzusokat, és azokat is betölti – így nem kell kézzel felvenned a
            többi kódot. Kicsit hosszabb lekérdezés.
          </InfoHint>
        </span>
      </label>

      <div className="field code-groups">
        <label>
          Tárgycsoportok
          <InfoHint>
            Ha ugyanazt a tárgyat több kódon is meghirdették, és csak az egyik
            kurzust kell felvenni, tedd a kódokat egy csoportba. A naptárban egy
            tárgyként jelennek meg: ha kiválasztod az egyik kurzust, a csoport
            összes többi lehetősége eltűnik.
          </InfoHint>
        </label>

        {groups.map((group) => (
          <div className="code-group" key={group.id}>
            <input
              type="text"
              className="code-group__label"
              value={group.label}
              placeholder="A tárgy neve (nem kötelező, üresen a tanrendből veszi)"
              onChange={(e) => renameGroup(group.id, e.target.value)}
              disabled={loading}
              aria-label="A tárgycsoport neve"
            />
            <CodeTagInput
              codes={group.codes}
              onChange={(next) => changeGroupCodes(group.id, next)}
              placeholder="További kód a csoportba…"
              emptyPlaceholder="ide illeszd be a tárgy kódjait"
              disabled={loading}
            />
            <div className="code-group__actions">
              <small>
                {group.codes.length} kód – ebből egy kurzust kell felvenni.
              </small>
              <button
                type="button"
                className="secondary"
                onClick={() => dissolveGroup(group.id)}
                disabled={loading}
                title="A kódok megmaradnak, de külön tárgyak lesznek"
              >
                Csoport szétbontása
              </button>
            </div>
          </div>
        ))}

        <div>
          <button
            type="button"
            className="secondary"
            onClick={addGroup}
            disabled={loading}
          >
            + Új tárgycsoport
          </button>
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
        <button
          className="secondary"
          onClick={shuffleColors}
          disabled={loading || !hasCourses}
          title="Minden tárgy új színt kap a naptárban"
        >
          Színek cseréje
        </button>
        <InfoHint label="A lekérdezésről">
          A lekérdezés felülírja a naptár tartalmát, és kódonként pár másodperc.
          A kiválasztásaid, a pipák és a színek megmaradnak.
        </InfoHint>
      </div>
    </section>
  );
}
