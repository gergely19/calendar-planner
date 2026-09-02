import React, { useEffect, useRef } from "react";
import { parseKodok, groupOfCode } from "../lib/tanrend";
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

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"]/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])
  );
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

function getDay(dayStr) {
  const norm = (dayStr || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let i = 0;
  switch (norm) {
    case "hetfo":
      i = 1;
      break;
    case "kedd":
      i = 2;
      break;
    case "szerda":
      i = 3;
      break;
    case "csutortok":
      i = 4;
      break;
    case "pentek":
      i = 5;
      break;
    default:
      i = 0;
      break;
  }
  return window.DayPilot.Date.today().firstDayOfWeek().addDays(i);
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

    slots.forEach((slot) => {
      events.push({
        start: getDay(slot.dayStr).addHours(slot.startHour).addMinutes(slot.startMin),
        end: getDay(slot.dayStr).addHours(slot.endHour).addMinutes(slot.endMin),
        id: window.DayPilot.guid(),
        text: "#" + kurzuskod + " - " + tantargyName,
        barColor: color,
        backColor: tint(color),
        fontColor: "#17232e",
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
  const dpRef = useRef(null);

  useEffect(() => {
    const DP = window.DayPilot;
    if (!DP) {
      console.error("DayPilot is not loaded!");
      return;
    }

    if (dpRef.current) {
      dpRef.current.dispose();
    }

    const dp = new DP.Calendar("dp");
    dpRef.current = dp;

    dp.days = 5;
    dp.dayBeginsHour = 8;
    dp.dayEndsHour = 21;
    dp.businessBeginsHour = 8;
    dp.businessEndsHour = 21;
    dp.cellDuration = 15;
    dp.cellHeight = 15;
    dp.cellWidthSpec = "Auto"; // az oszlopok kitöltik a rendelkezésre álló szélességet
    dp.startDate = getDay("Hétfo");
    dp.eventHoverHandling = "Bubble";

    // Saját esemény létrehozása kikapcsolva – a naptár csak a kurzusokat mutatja
    dp.timeRangeSelectedHandling = "Disabled";

    const DAY_NAMES = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];

    dp.onBeforeHeaderRender = function (args) {
      const index = args.header.start.getDayOfWeek(); // 0 = vasárnap
      args.header.html =
        DAY_NAMES[index - 1] || args.header.start.toString("dddd");
    };

    dp.onBeforeTimeHeaderRender = function (args) {
      const hour = DP.Date.today().addTime(args.header.time);
      args.header.html = hour.toString("H:mm");
      args.header.cssClass = "hourheader";
    };

    const allEvents = processCourses(courses, groups);
    const selected = readJson(KEY_SELECTED, {});

    dp.onBeforeEventRender = function (args) {
      const t = args.data.tags;
      if (!t) return;

      const isSelected = matchesCourse(selected[t.tantargy], t);
      if (isSelected) {
        args.data.backColor = args.data.barColor;
        args.data.cssClass = "event-selected";
      }

      // Csoportba tett tárgynál a tárgykód is kell, mert több kód kurzusai
      // futnak egy név alatt.
      const second = t["grouped"]
        ? `${t["targykod"]} · ${t["tanar"] || "oktató nincs megadva"}`
        : t["tanar"] || "oktató nincs megadva";

      args.data.html =
        "<div>#" +
        t["kurzuskod"] +
        " &ndash; " +
        escapeHtml(t["tantargy"]) +
        "</div>" +
        '<div style="font-size:11px;opacity:.75;margin-top:1px">' +
        escapeHtml(second) +
        "</div>";

      args.data.bubbleHtml =
        "<b>" +
        escapeHtml(t["tantargy"]) +
        "</b><br>" +
        escapeHtml(t["targykod"] || "") +
        "<br>#" +
        t["kurzuskod"] +
        " &middot; " +
        escapeHtml(t["tanar"] || "oktató nincs megadva") +
        "<br><i>" +
        (isSelected
          ? "Kattints rá a kiválasztás visszavonásához"
          : "Kattints rá a kurzus kiválasztásához") +
        "</i>";
    };

    // A naptár tartalma mindig a mentett állapotból áll össze: a kikapcsolt
    // kurzusok kimaradnak, kiválasztott csoport esetén a tárgy többi csoportja is.
    let initialized = false;
    const renderEvents = () => {
      const hidden = readHidden();
      dp.events.list = allEvents.filter((e) => {
        if (hiddenKeysFor(e.tags).some((key) => hidden.includes(key))) {
          return false;
        }
        const pick = selected[e.tags.tantargy];
        return pick === undefined || matchesCourse(pick, e.tags);
      });
      if (initialized) dp.update(); // init() előtt még nem lehet frissíteni
    };

    dp.onEventClick = function (args) {
      const t = args.e.data.tags;
      if (!t) return;

      if (matchesCourse(selected[t.tantargy], t)) {
        delete selected[t.tantargy]; // kiválasztás visszavonása
      } else {
        selected[t.tantargy] = t.kurzusId;
      }
      localStorage.setItem(KEY_SELECTED, JSON.stringify(selected));
      renderEvents();
      buildCourseList();
    };

    renderEvents();
    dp.init();
    initialized = true;

    // ----------------------------
    // Kurzuslista kirajzolása
    // ----------------------------
    const buildCourseList = () => {
      const coursesDiv = document.getElementById("courses");
      if (coursesDiv) {
        coursesDiv.innerHTML = "";
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

        Object.entries(grouped).forEach(([tantargy, lista]) => {
          const group = document.createElement("div");
          group.className = "course-group";
          coursesDiv.appendChild(group);

          const title = document.createElement("h3");
          title.className = "course-group__title";
          const swatch = document.createElement("span");
          swatch.className = "swatch";
          swatch.style.background = lista[0]?.barColor || "transparent";
          title.appendChild(swatch);
          title.appendChild(document.createTextNode(tantargy));
          group.appendChild(title);

          // A tárgykód a név mellé kell, hogy látszódjon, melyik tárgyról van szó
          const targykodok = [
            ...new Set(lista.map((e) => e.tags.targykod).filter(Boolean)),
          ];
          if (targykodok.length > 0) {
            const codeLine = document.createElement("div");
            codeLine.className = "course-group__code";
            codeLine.textContent = targykodok.join(", ");
            title.insertAdjacentElement("afterend", codeLine);
          }

          lista.forEach((event) => {
            const keys = hiddenKeysFor(event.tags);
            const key = keys[0];
            const isSelected = matchesCourse(
              selected[event.tags.tantargy],
              event.tags
            );

            const wrapper = document.createElement("label");
            wrapper.className = "course-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = event.tags.kurzusId;
            checkbox.checked =
              isSelected ||
              !readHidden().some((hiddenKey) => keys.includes(hiddenKey));
            wrapper.classList.toggle("course-option--off", !checkbox.checked);

            // A naptárban kiválasztott kurzust itt nem lehet kikapcsolni,
            // csak a naptárban, újbóli kattintással.
            if (isSelected) {
              wrapper.classList.add("course-option--selected");
              checkbox.disabled = true;
              wrapper.title =
                "Ez a kurzus a naptárban ki van választva – a visszavonás is ott, újbóli kattintással történik.";
            }

            checkbox.addEventListener("change", () => {
              wrapper.classList.toggle("course-option--off", !checkbox.checked);
              const hidden = readHidden();
              if (checkbox.checked) {
                writeHidden(hidden.filter((k) => !keys.includes(k)));
              } else if (!hidden.includes(key)) {
                writeHidden([...hidden, key]);
              }
              renderEvents();
            });

            const code = document.createElement("span");
            code.className = "course-option__code";
            // ha egy név alatt több tárgykód is fut, itt a teljes kód kell
            code.textContent =
              targykodok.length > 1 && event.tags.targykod
                ? `${event.tags.targykod}-${event.tags.kurzuskod}`
                : `#${event.tags.kurzuskod}`;
            code.title = `${event.tags.targykod || ""}-${
              event.tags.kurzuskod
            }`;

            const text = document.createTextNode(
              ` ${event.tags.tanar || "oktató nincs megadva"}`
            );

            wrapper.appendChild(checkbox);
            wrapper.appendChild(code);
            wrapper.appendChild(text);

            if (isSelected) {
              const badge = document.createElement("span");
              badge.className = "course-badge";
              badge.textContent = "kiválasztva";
              wrapper.appendChild(badge);
            }

            group.appendChild(wrapper);
          });
        });

        if (Object.keys(grouped).length === 0) {
          const empty = document.createElement("p");
          empty.className = "course-empty";
          empty.textContent =
            "Még nincs betöltött kurzus. Indíts egy lekérdezést fentebb.";
          coursesDiv.appendChild(empty);
        }
      }
    };

    buildCourseList();

    // ----------------------------
    // Időpont nélküli kurzusok
    // ----------------------------
    const unscheduledDiv = document.getElementById("unscheduled");
    if (unscheduledDiv) {
      unscheduledDiv.innerHTML = "";

      const labels = groupLabels(courses, groups);
      const scheduledSet = new Set(
        allEvents.map((e) => courseKey(e.tags.tantargy, e.tags.kurzusId))
      );
      const hidden = readHidden();

      const unscheduled = courses.filter((c) => {
        const info = describeCourse(c, groups, labels);
        const key = courseKey(info.tantargy, info.kurzusId);
        return !scheduledSet.has(key) && !hidden.includes(key);
      });

      if (unscheduled.length > 0) {
        const panel = document.createElement("div");
        panel.className = "unscheduled";

        const noTimeTitle = document.createElement("h3");
        noTimeTitle.textContent = "Időpont nélküli kurzusok";
        panel.appendChild(noTimeTitle);

        const hint = document.createElement("p");
        hint.textContent =
          "Ezekhez a tanrend nem ad meg időpontot, ezért nem kerültek a naptárba.";
        panel.appendChild(hint);

        unscheduled.forEach((course) => {
          const parsed = parseKodok(course.kodok);
          const fullCode = parsed.targykod
            ? `${parsed.targykod}-${parsed.kurzuskod}`
            : `#${parsed.kurzuskod}`;
          const row = document.createElement("div");
          row.className = "unscheduled__item";
          row.textContent = `${fullCode} · ${course.tantargy} · ${
            course.tanar || "oktató nincs megadva"
          }`;
          panel.appendChild(row);
        });

        unscheduledDiv.appendChild(panel);
      }
    }

    return () => {
      if (dpRef.current) {
        dpRef.current.dispose();
        dpRef.current = null;
      }
    };
  }, [courses, groups]);

  useEffect(() => {
    const errorCodesDiv = document.getElementById("errorCodes");
    if (!errorCodesDiv) return;
    errorCodesDiv.innerHTML = "";
    if (errorCodes.length === 0) return;

    const panel = document.createElement("div");
    panel.className = "error-panel";

    const noCodesTitle = document.createElement("h3");
    noCodesTitle.textContent = "Nem talált kurzuskódok";
    panel.appendChild(noCodesTitle);

    const hint = document.createElement("p");
    hint.textContent =
      "Ellenőrizd a kód helyesírását és azt, hogy a kiválasztott félévben meg van-e hirdetve.";
    panel.appendChild(hint);

    const list = document.createElement("div");
    list.className = "code-list";
    [...errorCodes]
      .sort((a, b) => a.localeCompare(b, "hu"))
      .forEach((code) => {
        const item = document.createElement("span");
        item.className = "code-item";
        item.textContent = code;
        list.appendChild(item);
      });
    panel.appendChild(list);

    errorCodesDiv.appendChild(panel);
  }, [errorCodes]);

  return (
    <div>
      <div className="calendar-wrapper">
        <div id="dp"></div>
      </div>

      <div id="unscheduled"></div>

      <h3 className="section-title">Kurzuscsoportok</h3>
      <p className="card__hint">
        Tárgyanként az összes meghirdetett csoport, a név alatt a tárgykóddal. A
        pipát kivéve a kurzus eltűnik a naptárból; a beállítás a böngészőben
        megmarad.
      </p>
      <div id="courses"></div>

      <div id="errorCodes"></div>
    </div>
  );
};

export default Calendar;
