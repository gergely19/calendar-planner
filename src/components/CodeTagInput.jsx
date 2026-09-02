import React, { useEffect, useRef, useState } from "react";

// A vágólapra írás: modern API, ha nincs (nem biztonságos kontextus, régi
// böngésző), akkor egy rejtett mezőn keresztül.
async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // jöhet a tartalék megoldás
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

// Tárgykódok címkés beviteli mezője: Enterrel hozzáad, a címkére kattintva
// szerkeszt, az × -szel töröl. Kijelölő módban a címkékre kattintva több kódot
// lehet kiválasztani, majd egyszerre kimásolni vagy törölni. A teljes új listát
// adja vissza a szülőnek.
export default function CodeTagInput({
  codes,
  onChange,
  placeholder,
  emptyPlaceholder,
  inputId,
  disabled,
  onEnterEmpty,
}) {
  const [draft, setDraft] = useState("");
  const [editIndex, setEditIndex] = useState(-1);
  const [editValue, setEditValue] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [flash, setFlash] = useState("");
  const flashTimer = useRef(null);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

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
    onChange(merged);
  };

  const removeCode = (index) => {
    const code = codes[index];
    setPicked((prev) => {
      if (!prev.has(code)) return prev;
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
    onChange(codes.filter((_, i) => i !== index));
  };

  const commitDraft = () => {
    if (!draft.trim()) return false;
    addCodes(draft);
    setDraft("");
    return true;
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (!commitDraft() && e.key === "Enter" && onEnterEmpty) {
        onEnterEmpty();
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

    cancelEdit();
    onChange(next);
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

  // ----- kijelölés, másolás, törlés -----

  // A kijelölést a kód szövege azonosítja, így a lista átrendeződése sem rontja el.
  const pickedList = codes.filter((code) => picked.has(code));

  const showFlash = (message) => {
    clearTimeout(flashTimer.current);
    setFlash(message);
    flashTimer.current = setTimeout(() => setFlash(""), 2000);
  };

  const togglePick = (code) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const enterSelectMode = () => {
    cancelEdit();
    setSelectMode(true);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setPicked(new Set());
  };

  const copyCodes = async (list, label) => {
    if (list.length === 0) return;
    const ok = await writeClipboard(list.join("; "));
    showFlash(
      ok
        ? `${label} kimásolva (${list.length} kód)`
        : "A másolás nem sikerült – jelöld ki és másold kézzel."
    );
  };

  const deletePicked = () => {
    if (pickedList.length === 0) return;
    const count = pickedList.length;
    onChange(codes.filter((code) => !picked.has(code)));
    setPicked(new Set());
    showFlash(`${count} kód törölve`);
  };

  return (
    <div className="tag-field">
      <div className={`tag-input${selectMode ? " tag-input--selecting" : ""}`}>
        {codes.map((code, i) =>
          editIndex === i && !selectMode ? (
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
            <span
              className={`tag${
                selectMode && picked.has(code) ? " tag--picked" : ""
              }`}
              key={`${code}-${i}`}
            >
              <button
                type="button"
                className="tag__text"
                onClick={() => (selectMode ? togglePick(code) : startEdit(i))}
                disabled={disabled}
                aria-pressed={selectMode ? picked.has(code) : undefined}
                title={
                  selectMode
                    ? "Kattints a kijelöléshez"
                    : "Kattints a kód szerkesztéséhez"
                }
              >
                {code}
              </button>
              <button
                type="button"
                className="tag__remove"
                onClick={() => removeCode(i)}
                disabled={disabled}
                aria-label={`${code} eltávolítása`}
                title="Kód eltávolítása"
              >
                ×
              </button>
            </span>
          )
        )}
        {/* kijelölés közben nem lehet gépelni, de a mező megmarad, hogy a
            hozzá tartozó címke ne maradjon cél nélkül */}
        <input
          type="text"
          id={inputId}
          placeholder={
            selectMode
              ? "Kijelölés módban…"
              : codes.length
              ? placeholder
              : emptyPlaceholder
          }
          value={draft}
          disabled={disabled || selectMode}
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

      {codes.length > 0 && (
        <div className="tag-tools">
          {selectMode ? (
            <>
              <strong className="tag-tools__count">
                {pickedList.length} kijelölve
              </strong>
              <button
                type="button"
                className="link-btn"
                onClick={() => setPicked(new Set(codes))}
                disabled={disabled || pickedList.length === codes.length}
              >
                Összes
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => setPicked(new Set())}
                disabled={disabled || pickedList.length === 0}
              >
                Egyik sem
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => copyCodes(pickedList, "A kijelölt kód")}
                disabled={disabled || pickedList.length === 0}
              >
                Másolás
              </button>
              <button
                type="button"
                className="link-btn link-btn--danger"
                onClick={deletePicked}
                disabled={disabled || pickedList.length === 0}
              >
                Törlés
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={exitSelectMode}
              >
                Kész
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="link-btn"
                onClick={enterSelectMode}
                disabled={disabled}
              >
                Kijelölés
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => copyCodes(codes, "Mind a(z) " + codes.length)}
                disabled={disabled}
              >
                Összes másolása
              </button>
            </>
          )}
          {flash && (
            <span className="tag-tools__flash" role="status">
              {flash}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
