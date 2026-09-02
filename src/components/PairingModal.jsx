import React, { useEffect, useState } from "react";

// Lekérdezés után feljön: a nem talált kódokhoz a tanrend ugyanazt a tárgyat
// megtalálta másik szak kódján. Itt lehet eldönteni, melyiket párosítsuk.
export default function PairingModal({ suggestions, onPair, onClose }) {
  const codes = Object.keys(suggestions).sort((a, b) => a.localeCompare(b, "hu"));

  // kódonként a választott tipp, és hogy egyáltalán kérjük-e
  const [chosen, setChosen] = useState(() => {
    const start = {};
    codes.forEach((code) => {
      start[code] = suggestions[code][0]?.kod;
    });
    return start;
  });
  const [skipped, setSkipped] = useState(() => new Set());

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggleSkip = (code) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selected = codes.filter((code) => !skipped.has(code));

  const confirm = () => {
    const pairs = selected
      .map((code) => ({
        code,
        tip: suggestions[code].find((t) => t.kod === chosen[code]),
      }))
      .filter((p) => p.tip);
    onPair(pairs);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pairing-title">
      <div className="modal__box">
        <h2 id="pairing-title">Párosítsuk ezeket a kódokat?</h2>
        <p className="modal__lead">
          Ezekre a kódokra nincs meghirdetés, de a tanrend ugyanazt a tárgyat
          megtalálta másik szak kódján. Párosítva egy tárgycsoportba kerülnek a
          tárgy nevével, tehát a naptárban egy tárgyként jelennek meg – elég
          közülük egy kurzust felvenni.
        </p>

        <div className="modal__list">
          {codes.map((code) => {
            const tips = suggestions[code];
            const on = !skipped.has(code);
            return (
              <div
                className={`pair-row${on ? "" : " pair-row--off"}`}
                key={code}
              >
                <label className="pair-row__pick">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleSkip(code)}
                  />
                  <span className="pair-row__old">{code}</span>
                </label>

                <span className="pair-row__arrow" aria-hidden="true">
                  →
                </span>

                <div className="pair-row__tips">
                  {tips.map((tip) => (
                    <label
                      className={`pair-tip${
                        chosen[code] === tip.kod ? " pair-tip--on" : ""
                      }`}
                      key={tip.kod}
                    >
                      {tips.length > 1 && (
                        <input
                          type="radio"
                          name={`tip-${code}`}
                          checked={chosen[code] === tip.kod}
                          disabled={!on}
                          onChange={() =>
                            setChosen((prev) => ({ ...prev, [code]: tip.kod }))
                          }
                        />
                      )}
                      <span className="pair-tip__code">{tip.kod}</span>
                      {tip.nev && (
                        <span className="pair-tip__name">{tip.nev}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal__actions">
          <button onClick={confirm} disabled={selected.length === 0}>
            Párosítás ({selected.length})
          </button>
          <button className="secondary" onClick={onClose}>
            Most nem
          </button>
          <span className="modal__note">
            A párosítás után a lekérdezés magától újraindul, hogy az új kódok
            kurzusai is bejöjjenek.
          </span>
        </div>
      </div>
    </div>
  );
}
