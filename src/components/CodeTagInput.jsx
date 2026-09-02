import React, { useState } from "react";

// Tárgykódok címkés beviteli mezője: Enterrel hozzáad, a címkére kattintva
// szerkeszt, az × -szel töröl. A teljes új listát adja vissza a szülőnek.
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

  const removeCode = (index) => onChange(codes.filter((_, i) => i !== index));

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

  return (
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
              disabled={disabled}
              title="Kattints a kód szerkesztéséhez"
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
      <input
        type="text"
        id={inputId}
        placeholder={codes.length ? placeholder : emptyPlaceholder}
        value={draft}
        disabled={disabled}
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
  );
}
