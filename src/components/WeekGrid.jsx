import React, { useRef, useState } from "react";

// Saját heti naptárrács – ez váltja ki a DayPilot.Calendar-t.
// Fix 5 napos (hétfő–péntek) nézet, órasávos háttérrel, abszolút pozicionált
// eseményekkel, átfedéskezeléssel és hover-buborékkal.

const DAY_NAMES = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];
const DAYS = [1, 2, 3, 4, 5];

// Egy oszlopon belül az egymást átfedő órák egymás mellé kerülnek.
// Először összefüggő "fürtökre" bontjuk az eseményeket (ahol nincs rés),
// majd fürtön belül mindegyik a legelső szabad sávot kapja meg.
function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );

  const placed = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columnEnds = []; // sávonként az utolsó vége
    cluster.forEach((item) => {
      let col = columnEnds.findIndex((end) => item.event.start >= end);
      if (col === -1) {
        columnEnds.push(item.event.end);
        col = columnEnds.length - 1;
      } else {
        columnEnds[col] = item.event.end;
      }
      item.col = col;
    });
    cluster.forEach((item) => {
      placed.push({ ...item, colCount: columnEnds.length });
    });
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((event) => {
    if (cluster.length > 0 && event.start >= clusterEnd) flush();
    cluster.push({ event, col: 0 });
    clusterEnd = Math.max(clusterEnd, event.end);
  });
  flush();

  return placed;
}

function formatHour(hour) {
  return `${hour}:00`;
}

// A nap perceiből olvasható idő: 495 -> "8:15"
function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const WeekGrid = ({
  events,
  isSelected,
  onEventClick,
  dayBeginsHour = 8,
  dayEndsHour = 21,
  hourHeight = 60,
}) => {
  const rootRef = useRef(null);
  const [bubble, setBubble] = useState(null);

  const dayStart = dayBeginsHour * 60;
  const dayEnd = dayEndsHour * 60;
  const totalHeight = ((dayEnd - dayStart) / 60) * hourHeight;

  const hours = [];
  for (let h = dayBeginsHour; h < dayEndsHour; h++) hours.push(h);

  const showBubble = (mouseEvent, event, selected) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = mouseEvent.clientX - rect.left;
    const y = mouseEvent.clientY - rect.top;
    setBubble({
      event,
      selected,
      // a jobb szélen a buborék befelé fordul, hogy ne lógjon ki
      x: Math.min(x + 14, rect.width - 250),
      y: y + 16,
    });
  };

  return (
    <div className="wk" ref={rootRef} style={{ "--wk-hour": `${hourHeight}px` }}>
      <div className="wk__head">
        <div className="wk__corner" />
        {DAYS.map((day) => (
          <div className="wk__day" key={day}>
            {DAY_NAMES[day - 1]}
          </div>
        ))}
      </div>

      <div className="wk__body">
        <div className="wk__times">
          {hours.map((hour) => (
            <div className="wk__time" key={hour}>
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {DAYS.map((day) => {
          const placed = layoutDay(events.filter((e) => e.day === day));
          return (
            <div
              className="wk__col"
              key={day}
              style={{ height: `${totalHeight}px` }}
            >
              {placed.map(({ event, col, colCount }) => {
                const top =
                  ((Math.max(event.start, dayStart) - dayStart) / 60) *
                  hourHeight;
                const bottom =
                  ((Math.min(event.end, dayEnd) - dayStart) / 60) * hourHeight;
                const selected = isSelected(event.tags);
                const width = 100 / colCount;

                return (
                  <div
                    key={event.id}
                    className={`wk__event${
                      selected ? " wk__event--selected" : ""
                    }`}
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(bottom - top, 14)}px`,
                      left: `calc(${col * width}% + 1px)`,
                      width: `calc(${width}% - 3px)`,
                      background: selected ? event.barColor : event.backColor,
                      borderLeftColor: event.barColor,
                    }}
                    onClick={() => onEventClick(event)}
                    onMouseEnter={(m) => showBubble(m, event, selected)}
                    onMouseMove={(m) => showBubble(m, event, selected)}
                    onMouseLeave={() => setBubble(null)}
                  >
                    <div className="wk__event__title">
                      #{event.tags.kurzuskod} &ndash; {event.tags.tantargy}
                    </div>
                    <div className="wk__event__sub">{event.subtitle}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {bubble && (
        <div
          className="wk__bubble"
          style={{ left: `${bubble.x}px`, top: `${bubble.y}px` }}
        >
          <b>{bubble.event.tags.tantargy}</b>
          <br />
          <span className="wk__bubble__time">
            {DAY_NAMES[bubble.event.day - 1]}{" "}
            {formatMinutes(bubble.event.start)}&ndash;
            {formatMinutes(bubble.event.end)}
          </span>
          <br />
          {bubble.event.tags.targykod || ""}
          <br />#{bubble.event.tags.kurzuskod} &middot;{" "}
          {bubble.event.tags.tanar || "oktató nincs megadva"}
          <br />
          <i>
            {bubble.selected
              ? "Kattints rá a kiválasztás visszavonásához"
              : "Kattints rá a kurzus kiválasztásához"}
          </i>
        </div>
      )}
    </div>
  );
};

export default WeekGrid;
