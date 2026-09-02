import React, { useEffect, useRef, useState } from "react";

// Hosszabb magyarázatok ide kerülnek: alapból csak egy ⓘ gomb látszik, a szöveg
// kattintásra nyílik ki egy buborékban. Így a felület tiszta marad, de a
// magyarázat egy kattintással elérhető.
//
// A buborék a gombhoz képest van pozicionálva, ezért bárhová beilleszthető:
// címsorba, mezőcímke mellé, sorba a gombokkal.
export default function InfoHint({ children, label = "Magyarázat" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Kívülre kattintva és Escape-re is záródjon – különben nyitva ragadhat.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span className="info" ref={rootRef}>
      <button
        type="button"
        className={`info__btn${open ? " info__btn--open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={label}
        title={open ? "Bezárás" : label}
      >
        i
      </button>
      {open && <span className="info__text">{children}</span>}
    </span>
  );
}
