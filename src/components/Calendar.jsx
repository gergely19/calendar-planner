import React, { useMemo, useState } from "react";
import WeekGrid from "./WeekGrid";
import { parseKodok, groupOfCode, sameCode } from "../lib/tanrend";
import "../indexstyle.css";

let errors = window.errors || {};
window.errors = errors;

/*
errors  = {
  "IP-18cSZÁMEA2G": [1,2,7,8,9,10],
  "IP-18KPROGEG": [1,2,3,4,5],
  "IP-18cVSZG": [1],
  "IP-18cAB2G": [1,5,6,16],
}

*/

// localStorage kulcsok – minden felhasználói döntés itt marad meg újratöltés után is
const KEY_HIDDEN = "deletedEvents"; // kikapcsolt (pipa nélküli) kurzusok
const KEY_SELECTED = "selectedCourses"; // tárgyanként a kiválasztott kurzuskód
const KEY_COLORS = "courseColors"; // tárgyanként a szín, hogy ne változzon

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function courseKey(tantargy, kurzusId) {
  return `${tantargy}#${kurzusId}`;
}

// Egy kurzus azonosítója. Tárgycsoportnál több tárgykód kurzusai kerülnek egy
// tárgy alá, ott a puszta kurzuskód (#1) már nem lenne egyedi.
function courseId(targykod, kurzuskod) {
  return targykod ? `${targykod}-${kurzuskod}` : String(kurzuskod);
}

// A korábbi mentések csak a kurzuskódot tárolták, ezért mindkét alakot elfogadjuk.
function matchesCourse(stored, tags) {
  if (stored === undefined || stored === null) return false;
  const value = String(stored);
  return value === String(tags.kurzusId) || value === String(tags.kurzuskod);
}

function hiddenKeysFor(tags) {
  return [
    courseKey(tags.tantargy, tags.kurzusId),
    courseKey(tags.tantargy, tags.kurzuskod),
  ];
}

// A korábbi verzió teljes esemény-objektumokat tárolt, az újabb csak kulcsokat.
function readHidden() {
  const raw = readJson(KEY_HIDDEN, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      typeof item === "string"
        ? item
        : item?.tags
        ? courseKey(item.tags.tantargy, item.tags.kurzuskod)
        : null
    )
    .filter(Boolean);
}

function writeHidden(list) {
  localStorage.setItem(KEY_HIDDEN, JSON.stringify(list));
}

// A tanrend többféle alakban jelöli a típust: "Ea", "Ea.", "Ea+Gy", vagy sehogy.
// Egységesítjük: a név mindig pontosan egy " Ea" vagy " Gy" végződést kap.
function courseLabel(tantargy, isEloadas) {
  const suffix = isEloadas ? "Ea" : "Gy";
  let name = (tantargy || "").replace("Ea+GY", "Ea+Gy");

  if (name.includes("Ea+Gy")) {
    name = suffix === "Ea" ? name.replace("+Gy", "") : name.replace("Ea+", "");
  }

  // meglévő típusjelölés levágása (csak szóköz/pont után, hogy pl. a "Nagy" ne sérüljön)
  name = name.replace(/[\s.]+(Ea|Gy)\.?\s*$/i, "").trim();

  return `${name} ${suffix}`;
}

function isEloadasCourse(item, parsed) {
  const tipus = (parsed.tipus || "").toLowerCase();
  if (tipus.includes("előadás") || tipus.includes("ea")) return true;
  if (tipus.includes("gyakorlat") || tipus.includes("gy")) return false;

  const tantargy = (item.tantargy || "").toLowerCase();
  if (/\bea\.?\b/i.test(tantargy) || tantargy.includes("előadás")) return true;
  if (/\bgy\.?\b/i.test(tantargy) || tantargy.includes("gyakorlat")) return false;

  if (parsed.targykod) {
    if (parsed.targykod.endsWith("E") || parsed.targykod.endsWith("Ea")) return true;
    if (parsed.targykod.endsWith("G") || parsed.targykod.endsWith("Gy")) return false;
  }

  return parsed.kurzuskod >= 90;
}

function parseTimeSlots(idopontStr) {
  const slots = [];
  if (!idopontStr) return slots;
  const regex = /(Hétfő|Hétfo|Kedd|Szerda|Csütörtök|Csutortok|Péntek|Pentek)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/gi;
  let match;
  while ((match = regex.exec(idopontStr)) !== null) {
    const dayStr = match[1];
    const [startHour, startMin] = match[2].split(":").map(Number);
    const [endHour, endMin] = match[3].split(":").map(Number);
    slots.push({ dayStr, startHour, startMin, endHour, endMin });
  }
  return slots;
}

function getColor() {
  const getVibrantComponent = () =>
    Math.floor(128 + Math.random() * 128)
      .toString(16)
      .padStart(2, "0");
  return `#${getVibrantComponent()}${getVibrantComponent()}${getVibrantComponent()}`;
}

// Világosabb változat ugyanabból a színből – így a naptár olvasható marad,
// a bal oldali sáv pedig megadja a tárgy azonosító színét.
function tint(hex, amount = 0.62) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// A hét napja sorszámként: 1 = hétfő … 5 = péntek. Ami nem esik ide (0), az
// nem kerül ki a naptárba, de a kurzuslistában ugyanúgy ott marad.
function getDay(dayStr) {
  const norm = (dayStr || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  switch (norm) {
    case "hetfo":
      return 1;
    case "kedd":
      return 2;
    case "szerda":
      return 3;
    case "csutortok":
      return 4;
    case "pentek":
      return 5;
    default:
      return 0;
  }
}

// Csoportonként egyetlen tárgynév kell, hogy az alternatív kódok kurzusai egy
// tárgy alá kerüljenek. Ha a felhasználó nem adott nevet, a tanrendből vesszük
// a legrövidebb (legáltalánosabb) kurzusnevet.
function groupLabels(courses, groups) {
  const labels = {};

  (groups || []).forEach((group) => {
    if (group.label.trim()) {
      labels[group.id] = group.label.trim();
      return;
    }

    const names = courses
      .filter((item) => {
        const { targykod } = parseKodok(item.kodok);
        return group.codes.some(
          (c) => c.toLowerCase() === (targykod || "").toLowerCase()
        );
      })
      .map((item) => item.tantargy)
      .filter(Boolean)
      .sort((a, b) => a.length - b.length);

    labels[group.id] = names[0] || group.codes[0] || "Tárgycsoport";
  });

  return labels;
}

// Egy tanrendsor értelmezése: melyik tárgyhoz tartozik és mi az azonosítója.
function describeCourse(item, groups, labels) {
  const parsed = parseKodok(item.kodok);
  const isEa = isEloadasCourse(item, parsed);
  const group = groupOfCode(groups, parsed.targykod);
  const baseName = group ? labels[group.id] : item.tantargy;

  return {
    parsed,
    isEa,
    group,
    tantargy: courseLabel(baseName, isEa),
    kurzusId: courseId(parsed.targykod, parsed.kurzuskod),
  };
}

function processCourses(courses, groups) {
  const labels = groupLabels(courses, groups);
  const colorNameMapping = readJson(KEY_COLORS, {});
  let colorsChanged = false;
  function getColorForName(name) {
    if (!colorNameMapping[name]) {
      colorNameMapping[name] = getColor();
      colorsChanged = true;
    }
    return colorNameMapping[name];
  }

  const events = [];
  let seq = 0;

  courses.forEach((item) => {
    const { parsed, group, tantargy: tantargyName, kurzusId } = describeCourse(
      item,
      groups,
      labels
    );
    const kurzuskod = parsed.kurzuskod;
    const targykod = parsed.targykod;

    if (
      targykod in window.errors &&
      window.errors[targykod].includes(kurzuskod)
    ) {
      return;
    }

    const slots = parseTimeSlots(item.idopont);
    const color = getColorForName(tantargyName);

    // A naptár a nap perceivel dolgozik, ebből számol pozíciót és magasságot.
    slots.forEach((slot) => {
      events.push({
        id: `ev-${seq++}`,
        day: getDay(slot.dayStr),
        start: slot.startHour * 60 + slot.startMin,
        end: slot.endHour * 60 + slot.endMin,
        barColor: color,
        backColor: tint(color),
        // Csoportba tett tárgynál a tárgykód is kell, mert több kód kurzusai
        // futnak egy név alatt.
        subtitle: group
          ? `${targykod} · ${item.tanar || "oktató nincs megadva"}`
          : item.tanar || "oktató nincs megadva",
        tags: {
          tanar: item.tanar,
          tantargy: tantargyName,
          kurzuskod: kurzuskod,
          targykod: targykod,
          kurzusId: kurzusId,
          grouped: !!group,
        },
      });
    });
  });

  if (colorsChanged) {
    localStorage.setItem(KEY_COLORS, JSON.stringify(colorNameMapping));
  }

  return events;
}

const Calendar = ({ courses, errorCodes, groups }) => {
  // Minden felhasználói döntés állapotként él, és a localStorage-ból indul.
  const [hidden, setHidden] = useState(readHidden);
  const [selected, setSelected] = useState(() => readJson(KEY_SELECTED, {}));

  const allEvents = useMemo(
    () => processCourses(courses, groups),
    [courses, groups]
  );

  const isSelected = (tags) => matchesCourse(selected[tags.tantargy], tags);

  // A naptár tartalma mindig a mentett állapotból áll össze: a kikapcsolt
  // kurzusok kimaradnak, kiválasztott csoport esetén a tárgy többi csoportja is.
  const visibleEvents = useMemo(
    () =>
      allEvents.filter((e) => {
        if (hiddenKeysFor(e.tags).some((key) => hidden.includes(key))) {
          return false;
        }
        const pick = selected[e.tags.tantargy];
        return pick === undefined || matchesCourse(pick, e.tags);
      }),
    [allEvents, hidden, selected]
  );

  const toggleSelected = (event) => {
    const t = event.tags;
    if (!t) return;

    const next = { ...selected };
    if (matchesCourse(next[t.tantargy], t)) {
      delete next[t.tantargy]; // kiválasztás visszavonása
    } else {
      next[t.tantargy] = t.kurzusId;
    }
    localStorage.setItem(KEY_SELECTED, JSON.stringify(next));
    setSelected(next);
  };

  const setCourseVisible = (tags, visible) => {
    const keys = hiddenKeysFor(tags);
    const next = visible
      ? hidden.filter((k) => !keys.includes(k))
      : hidden.includes(keys[0])
      ? hidden
      : [...hidden, keys[0]];
    writeHidden(next);
    setHidden(next);
  };

  // ----------------------------
  // Kurzuslista: tárgyanként az összes csoport
  // ----------------------------
  const courseGroups = useMemo(() => {
    const grouped = {};
    allEvents.forEach((e) => {
      if (!grouped[e.tags.tantargy]) {
        grouped[e.tags.tantargy] = [];
      }
      if (
        !grouped[e.tags.tantargy].some(
          (item) => item.tags.kurzusId === e.tags.kurzusId
        )
      ) {
        grouped[e.tags.tantargy].push(e);
      }
    });

    return Object.entries(grouped).map(([tantargy, lista]) => ({
      tantargy,
      lista,
      color: lista[0]?.barColor || "transparent",
      // A tárgykód a név mellé kell, hogy látszódjon, melyik tárgyról van szó
      targykodok: [
        ...new Set(lista.map((e) => e.tags.targykod).filter(Boolean)),
      ],
    }));
  }, [allEvents]);

  // ----------------------------
  // Időpont nélküli kurzusok
  // ----------------------------
  const unscheduled = useMemo(() => {
    const labels = groupLabels(courses, groups);
    const scheduledSet = new Set(
      allEvents.map((e) => courseKey(e.tags.tantargy, e.tags.kurzusId))
    );

    return courses.filter((c) => {
      const info = describeCourse(c, groups, labels);
      const key = courseKey(info.tantargy, info.kurzusId);
      return !scheduledSet.has(key) && !hidden.includes(key);
    });
  }, [courses, groups, allEvents, hidden]);

  // Tárgycsoportban elég, ha a csoport egyik kódjára van meghirdetés: a többi
  // kód üres találata ilyenkor nem hiba, ezért nem is soroljuk fel.
  const { sortedErrorCodes, coveredByGroup } = useMemo(() => {
    const loadedCodes = new Set(
      courses.map((c) => (parseKodok(c.kodok).targykod || "").toLowerCase())
    );

    const covered = [];
    const missing = [];

    errorCodes.forEach((code) => {
      const group = groupOfCode(groups, code);
      const groupHasCourses =
        group &&
        group.codes.some(
          (c) => !sameCode(c, code) && loadedCodes.has(c.toLowerCase())
        );
      (groupHasCourses ? covered : missing).push(code);
    });

    return {
      sortedErrorCodes: missing.sort((a, b) => a.localeCompare(b, "hu")),
      coveredByGroup: covered.length,
    };
  }, [errorCodes, groups, courses]);

  return (
    <div>
      <div className="calendar-wrapper">
        <WeekGrid
          events={visibleEvents}
          isSelected={isSelected}
          onEventClick={toggleSelected}
        />
      </div>

      <div id="unscheduled">
        {unscheduled.length > 0 && (
          <div className="unscheduled">
            <h3>Időpont nélküli kurzusok</h3>
            <p>
              Ezekhez a tanrend nem ad meg időpontot, ezért nem kerültek a
              naptárba.
            </p>
            {unscheduled.map((course, i) => {
              const parsed = parseKodok(course.kodok);
              const fullCode = parsed.targykod
                ? `${parsed.targykod}-${parsed.kurzuskod}`
                : `#${parsed.kurzuskod}`;
              return (
                <div className="unscheduled__item" key={`${fullCode}-${i}`}>
                  {`${fullCode} · ${course.tantargy} · ${
                    course.tanar || "oktató nincs megadva"
                  }`}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h3 className="section-title">Kurzuscsoportok</h3>
      <p className="card__hint">
        Tárgyanként az összes meghirdetett csoport, a név alatt a tárgykóddal. A
        pipát kivéve a kurzus eltűnik a naptárból; a beállítás a böngészőben
        megmarad.
      </p>
      <div id="courses">
        {courseGroups.map(({ tantargy, lista, color, targykodok }) => (
          <div className="course-group" key={tantargy}>
            <h3 className="course-group__title">
              <span className="swatch" style={{ background: color }} />
              {tantargy}
            </h3>
            {targykodok.length > 0 && (
              <div className="course-group__code">{targykodok.join(", ")}</div>
            )}

            {lista.map((event) => {
              const keys = hiddenKeysFor(event.tags);
              const picked = isSelected(event.tags);
              const checked =
                picked || !hidden.some((hiddenKey) => keys.includes(hiddenKey));

              return (
                <label
                  key={event.tags.kurzusId}
                  className={`course-option${
                    checked ? "" : " course-option--off"
                  }${picked ? " course-option--selected" : ""}`}
                  // A naptárban kiválasztott kurzust itt nem lehet kikapcsolni,
                  // csak a naptárban, újbóli kattintással.
                  title={
                    picked
                      ? "Ez a kurzus a naptárban ki van választva – a visszavonás is ott, újbóli kattintással történik."
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    value={event.tags.kurzusId}
                    checked={checked}
                    disabled={picked}
                    onChange={(e) =>
                      setCourseVisible(event.tags, e.target.checked)
                    }
                  />
                  <span
                    className="course-option__code"
                    title={`${event.tags.targykod || ""}-${
                      event.tags.kurzuskod
                    }`}
                  >
                    {/* ha egy név alatt több tárgykód is fut, itt a teljes kód kell */}
                    {targykodok.length > 1 && event.tags.targykod
                      ? `${event.tags.targykod}-${event.tags.kurzuskod}`
                      : `#${event.tags.kurzuskod}`}
                  </span>
                  {` ${event.tags.tanar || "oktató nincs megadva"}`}
                  {picked && <span className="course-badge">kiválasztva</span>}
                </label>
              );
            })}
          </div>
        ))}

        {courseGroups.length === 0 && (
          <p className="course-empty">
            Még nincs betöltött kurzus. Indíts egy lekérdezést fentebb.
          </p>
        )}
      </div>

      <div id="errorCodes">
        {sortedErrorCodes.length > 0 && (
          <div className="error-panel">
            <h3>Nem talált kurzuskódok</h3>
            <p>
              Ellenőrizd a kód helyesírását és azt, hogy a kiválasztott félévben
              meg van-e hirdetve.
            </p>
            <div className="code-list">
              {sortedErrorCodes.map((code) => (
                <span className="code-item" key={code}>
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        {coveredByGroup > 0 && (
          <p className="card__hint">
            További {coveredByGroup} kódra nincs meghirdetés, de a
            tárgycsoportjukban másik kód meghozta a kurzusokat, ezért ez nem
            hiba.
          </p>
        )}
      </div>
    </div>
  );
};

export default Calendar;
