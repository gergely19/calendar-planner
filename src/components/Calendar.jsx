import React, { useEffect, useRef } from "react";
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

function getColor() {
  const getVibrantComponent = () =>
    Math.floor(128 + Math.random() * 128)
      .toString(16)
      .padStart(2, "0");
  return `#${getVibrantComponent()}${getVibrantComponent()}${getVibrantComponent()}`;
}

function getDay(day) {
  let i = 0;
  switch (day) {
    case "Hétfo":
      i = 1;
      break;
    case "Kedd":
      i = 2;
      break;
    case "Szerda":
      i = 3;
      break;
    case "Csütörtök":
      i = 4;
      break;
    case "Péntek":
      i = 5;
      break;
    default:
      i = 0;
      break;
  }
  return window.DayPilot.Date.today().firstDayOfWeek().addDays(i);
}

function processCourses(courses) {
  const kurzusok = { eloadas: [], gyakorlat: [] };
  courses.forEach((item) => {
    const kurzuskod = parseInt(item.kodok.split("-")[2].split(" ")[0]);
    if (kurzuskod >= 90) {
      kurzusok.eloadas.push(item);
    } else {
      kurzusok.gyakorlat.push(item);
    }
  });

  const colorNameMapping = {};
  function getColorForName(name) {
    if (!colorNameMapping[name]) {
      colorNameMapping[name] = getColor();
    }
    return colorNameMapping[name];
  }

  const events = [];
  ["eloadas", "gyakorlat"].forEach((type) => {
    kurzusok[type].forEach((item) => {
      const kodokParts = item.kodok.split("-");
      const kurzuskod = parseInt(kodokParts[2].split(" ")[0]);
      const targykod = item.kodok.split(" ")[0].replace(/-\d+$/, "");
      if (
        !(targykod in window.errors) ||
        !window.errors[targykod].includes(kurzuskod)
      ) {
        const idopontParts = item.idopont.split(" ");
        if (idopontParts.length > 1) {
          const day = idopontParts[0];
          const [start, end] = idopontParts[1].split("-");
          const [startHour, startMin] = start.split(":");
          const [endHour, endMin] = end.split(":");
          let tantargyName = item.tantargy.replace("Ea+GY", "Ea+Gy");
          const includesBoth = tantargyName.includes("Ea+Gy");
          if (includesBoth) {
            tantargyName =
              type === "eloadas"
                ? tantargyName.replace("+Gy", "")
                : tantargyName.replace("Ea+", "");
          }
          if (!tantargyName.endsWith("Gy") && !tantargyName.endsWith("Ea")) {
            if (type === "eloadas") {
              tantargyName += "   Ea";
            } else {
              tantargyName += " Gy";
            }
          }
          
          const color = getColorForName(tantargyName);
          events.push({
            start: getDay(day).addHours(startHour).addMinutes(startMin),
            end: getDay(day).addHours(endHour).addMinutes(endMin),
            id: window.DayPilot.guid(),
            text: "#" + kurzuskod + " - " + tantargyName,
            barColor: color,
            tags: {
              tanar: item.tanar,
              tantargy: tantargyName,
              kurzuskod: kurzuskod,
            },
          });
        }
      }
    });
  });
  return events;
}

const Calendar = ({ courses, errorCodes }) => {
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
    dp.startDate = getDay("Hétfo");
    dp.eventHoverHandling = "Bubble";

    dp.onBeforeHeaderRender = function (args) {
      var date = args.header.start;
      args.header.html = date.toString("dddd");
    };

    dp.onBeforeTimeHeaderRender = function (args) {
      const hour = DP.Date.today().addTime(args.header.time);
      args.header.html = hour.toString("H:mm");
      args.header.cssClass = "hourheader";
    };

    dp.onBeforeEventRender = function (args) {
      var clickedTags = args.e.tags;
      args.data.bubbleHtml =
        clickedTags["tantargy"] + " - " + clickedTags["tanar"];
    };

    dp.onTimeRangeSelected = function (args) {
      var name = prompt("Új esemény neve:", "Esemény");
      if (!name) return;
      var e = new DP.Event({
        start: args.start,
        end: args.end,
        id: DP.guid(),
        text: name,
      });
      dp.events.add(e);
      dp.clearSelection();
    };

    // Események generálása
    const events = processCourses(courses);
    const deletedEvents = JSON.parse(
      localStorage.getItem("deletedEvents") || "[]"
    );

    dp.events.list = events.filter((e) => {
      return !deletedEvents.some(
        (de) =>
          de.tags.tantargy === e.tags.tantargy &&
          de.tags.kurzuskod === e.tags.kurzuskod
      );
    });

    dp.onEventClick = function (args) {
      const clickedEvent = args.e;
      const clickedTantargy = clickedEvent.data.tags.tantargy;
      const clickedId = clickedEvent.id();
      const clickedBarColor = clickedEvent.data.barColor;
      const clickedTags = clickedEvent.data.tags;

      if (localStorage.getItem(clickedTantargy)) {
        const eventsToRestore = JSON.parse(
          localStorage.getItem(clickedTantargy)
        )["deletedEvents"];
        localStorage.removeItem(clickedTantargy);

        eventsToRestore.forEach((event) => {
          if (event.tags) {
            event.text = `#${event.tags.kurzuskod} - ${event.tags.tantargy}`;
          }
          dp.events.add(event);
        });

        clickedEvent.data.backColor = clickedEvent.data.originalColor || "";
        clickedEvent.data.isSelected = false;
        clickedEvent.data.fontColor = "black";
        clickedEvent.text(
          `#${clickedTags.kurzuskod} - ${clickedTags.tantargy}`
        );
        dp.events.update(clickedEvent);
      } else {
        const eventsToStore = dp.events.list.filter(
          (event) =>
            event.tags.tantargy === clickedTantargy && event.id !== clickedId
        );
        localStorage.setItem(
          clickedTantargy,
          JSON.stringify({
            clickedEvent: clickedEvent.data,
            clickedColor: clickedBarColor,
            deletedEvents: eventsToStore,
          })
        );

        dp.events.list = dp.events.list.filter(
          (ev) => !(ev.tags.tantargy === clickedTantargy && ev.id !== clickedId)
        );

        clickedEvent.data.originalColor = clickedEvent.data.backColor;
        clickedEvent.data.backColor = clickedBarColor;
        clickedEvent.data.isSelected = true;
        clickedEvent.text(
          `#${clickedTags.kurzuskod} - ${clickedTags.tantargy}\n${clickedTags.tanar}`
        );
        dp.events.update(clickedEvent);
      }
    };

    dp.init();

    // ----------------------------
    // Lista kirajzolása
    // ----------------------------
    const coursesDiv = document.getElementById("courses");
    if (coursesDiv) {
      coursesDiv.innerHTML = "";
      const grouped = {};
      events.forEach((e) => {
        if (!grouped[e.tags.tantargy]) {
          grouped[e.tags.tantargy] = [];
        }
        grouped[e.tags.tantargy].push(e);
      });

      Object.entries(grouped).forEach(([tantargy, lista]) => {
        const title = document.createElement("h3");
        title.textContent = tantargy;
        coursesDiv.appendChild(title);

        lista.forEach((event) => {
          const wrapper = document.createElement("label");
          wrapper.style.display = "block";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = event.tags.kurzuskod;
          checkbox.checked = true;

          // Betöltéskor beállítjuk a checked értéket a localStorage alapján
          const deletedEvents = JSON.parse(
            localStorage.getItem("deletedEvents") || "[]"
          );
          if (
            deletedEvents.some(
              (ev) =>
                ev.tags.tantargy === event.tags.tantargy &&
                ev.tags.kurzuskod === event.tags.kurzuskod
            )
          ) {
            checkbox.checked = false;
          }

          checkbox.addEventListener("change", () => {
            let deletedEvents = JSON.parse(
              localStorage.getItem("deletedEvents") || "[]"
            );
            const subjectKey = event.tags.tantargy;
            // Lekérjük a subjectKey adatait
            let subjectData = JSON.parse(
              localStorage.getItem(subjectKey) || "null"
            );
            if (!checkbox.checked) {
              // Hozzáadjuk a törölt eseményekhez
              deletedEvents.push(event);
              dp.events.list = dp.events.list.filter(
                (ev) =>
                  !(
                    ev.tags.tantargy === event.tags.tantargy &&
                    ev.tags.kurzuskod === event.tags.kurzuskod
                  )
              );
              if (subjectData) {
                subjectData.deletedEvents = subjectData.deletedEvents.filter(
                  (ev) =>
                    !(
                      ev.tags.tantargy === event.tags.tantargy &&
                      ev.tags.kurzuskod === event.tags.kurzuskod
                    )
                );

                localStorage.setItem(subjectKey, JSON.stringify(subjectData));
              }
            } else {
              // Kivesszük a törölt események közül
              deletedEvents = deletedEvents.filter(
                (ev) =>
                  !(
                    ev.tags.tantargy === event.tags.tantargy &&
                    ev.tags.kurzuskod === event.tags.kurzuskod
                  )
              );

              if (!subjectData) {
                // Ha nincs ilyen tárgy, létrehozzuk az eventet
                dp.events.add(event);
              } else {
                // Hozzáadjuk az eseményt a tárgy saját deletedEvents listájához
                subjectData.deletedEvents.push(event);
                localStorage.setItem(subjectKey, JSON.stringify(subjectData));
              }
            }
            localStorage.setItem(
              "deletedEvents",
              JSON.stringify(deletedEvents)
            );
            dp.update();
          });

          const text = document.createTextNode(
            ` #${event.tags.kurzuskod} - ${event.tags.tanar}`
          );

          wrapper.appendChild(checkbox);
          wrapper.appendChild(text);
          coursesDiv.appendChild(wrapper);
        });
      });

      // Nem szereplő kurzusok (nincs időpont)
      const scheduledSet = new Set(
        events.map((e) => `${e.tags.tantargy}#${e.tags.kurzuskod}`)
      );

      const unscheduled = courses.filter((c) => {
        const kodokParts = c.kodok.split("-");
        const kurzuskod = parseInt(kodokParts[2].split(" ")[0]);

        // Tantárgy neve + típus meghatározása
        let tantargyNev = c.tantargy;
        let tipus = "";

        if (tantargyNev.endsWith("Ea+Gy")) {
          if (kurzuskod >= 90) {
            tipus = "Ea";
          } else {
            tipus = "Gy";
          }
          tantargyNev = tantargyNev.replace("Ea+Gy", tipus);
        }
        else if (!tantargyNev.endsWith("Ea") && !tantargyNev.endsWith("Gy")) {
          if (kurzuskod >= 90) {
            tipus = "Ea";
          } else {
            tipus = "Gy";
          }
          tantargyNev += " "+ tipus;
        }
        const keresettKulcs = `${tantargyNev}#${kurzuskod}`;

        const deletedEvents = JSON.parse(
          localStorage.getItem("deletedEvents") || "[]"
        );

        return (
          !scheduledSet.has(keresettKulcs) &&
          !deletedEvents.some(
            (de) =>
              de.tags.tantargy === tantargyNev &&
              de.tags.kurzuskod === kurzuskod
          )
        );
      });

      if (unscheduled.length > 0) {
        const noTimeTitle = document.createElement("h1");
        noTimeTitle.textContent = "Időpont nincs meghatározva:";
        coursesDiv.appendChild(noTimeTitle);

        unscheduled.forEach((course) => {
          const kodokParts = course.kodok.split("-");
          const kurzuskod = parseInt(kodokParts[2].split(" ")[0]);

          const wrapper = document.createElement("label");
          wrapper.style.display = "block";

          const text = document.createTextNode(
            ` #${kurzuskod} - ${course.tantargy} - ${course.tanar}`
          );

          wrapper.appendChild(text);
          coursesDiv.appendChild(wrapper);
        });
      }
    }

    return () => {
      if (dpRef.current) {
        dpRef.current.dispose();
        dpRef.current = null;
      }
    };
  }, [courses]);

  useEffect(() => {
    const errorCodesDiv = document.getElementById("errorCodes");
    if (errorCodesDiv && errorCodes.length > 0) {
      errorCodesDiv.innerHTML = "";
      const noCodesTitle = document.createElement("h1");
      noCodesTitle.textContent = "Alábbi kurzusok nem találhatóak:";
      errorCodesDiv.appendChild(noCodesTitle);
      errorCodes.forEach((code) => {
        const codeElement = document.createElement("div");
        codeElement.textContent = code;
        errorCodesDiv.appendChild(codeElement);
      });
    }
  }, [errorCodes]);

  return (
    <div>
      <div id="dp"></div>
      <div id="courses"></div>
      <div id="errorCodes"></div>
    </div>
  );
};

export default Calendar;
