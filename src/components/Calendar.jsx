import React, { useEffect, useRef } from 'react';
import '../indexstyle.css';

const errors = {
    "IP-18KVIKWPROGEG": [2,5,6,8,9,10],
    "IP-18eKVIHJEG": [],
    "IP-18KVISZWPROGEG": [4],
    "IP-18KVSZKRBG": [],
    "IP-24KVSZKBIZTE": [1],
    "IP-18KVPYEG": [4, 5, 6],
    "IP-24KVIMWADEG":  [1],
    "IP-18cSZÁMEA1G": [1, 2, 12, 5],
    "IP-18cNM1G": [1, 2, 3],
    "IP-18AB1G": [1, 2, 6, 8, 7, 13, 15, 14, 17, 16,20],
    "IP-18OPREG": [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 20],
    "IP-18cSZTEG": [1, 2, 3]
};

function getColor() {
    const getVibrantComponent = () => Math.floor(128 + Math.random() * 128).toString(16).padStart(2, '0');
    return `#${getVibrantComponent()}${getVibrantComponent()}${getVibrantComponent()}`;
}

function getDay(day) {
    let i = 0;
    switch (day) {
        case "Hétfo": i = 1; break;
        case "Kedd": i = 2; break;
        case "Szerda": i = 3; break;
        case "Csütörtök": i = 4; break;
        case "Péntek": i = 5; break;
        default: i = 0; break;
    }
    return window.DayPilot.Date.today().firstDayOfWeek().addDays(i);
}

function processCourses(courses) {
    const kurzusok = { eloadas: [], gyakorlat: [] };
    courses.forEach(item => {
        const kurzuskod = parseInt(item.kodok.split('-')[2].split(' ')[0]);
        if (kurzuskod >= 90) {
            kurzusok.eloadas.push(item);
        } else {
            kurzusok.gyakorlat.push(item);
        }
    });

    // Tantárgy név -> szín mapping
    const colorNameMapping = {};

    // Segéd: színt ad vissza, ha már van, ugyanazt, ha nincs, generál egyet
    function getColorForName(name) {
        if (!colorNameMapping[name]) {
            colorNameMapping[name] = getColor();
        }
        return colorNameMapping[name];
    }

    const events = [];
    ["eloadas", "gyakorlat"].forEach(type => {
        kurzusok[type].forEach(item => {
            const kodokParts = item.kodok.split('-');
            const kurzuskod = parseInt(kodokParts[2].split(' ')[0]);
            const targykod = item.kodok.split(' ')[0].replace(/-\d+$/, "");
            if (!(targykod in errors) || !errors[targykod].includes(kurzuskod)) {
                const idopontParts = item.idopont.split(" ");
                if (idopontParts.length > 1) {
                    const day = idopontParts[0];
                    const [start, end] = idopontParts[1].split("-");
                    const [startHour, startMin] = start.split(":");
                    const [endHour, endMin] = end.split(":");
                    let tantargyName = item.tantargy.replace("Ea+GY", "Ea+Gy");
                    const includesBoth = tantargyName.includes("Ea+Gy");
                    if (includesBoth) {
                        tantargyName = type === "eloadas"
                            ? tantargyName.replace("+Gy", "")
                            : tantargyName.replace("Ea+", "");
                    }
                    // Szín hozzárendelése a tantárgy névhez
                    const color = getColorForName(tantargyName);
                    events.push({
                        start: getDay(day).addHours(startHour).addMinutes(startMin),
                        end: getDay(day).addHours(endHour).addMinutes(endMin),
                        id: window.DayPilot.guid(),
                        text: tantargyName + " #" + kurzuskod,
                        barColor: color,
                        tags: {
                            tanar: item.tanar,
                            tantargy: tantargyName,
                            kurzuskod: "#" + kurzuskod
                        }
                    });
                }
            }
        });
    });
    return events;
}

const Calendar = ({ courses }) => {
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
            args.data.bubbleHtml = clickedTags["tantargy"] + " - " + clickedTags["tanar"];
        };

        dp.onTimeRangeSelected = function (args) {
            var name = prompt("Új esemény neve:", "Esemény");
            if (!name) return;
            var e = new DP.Event({
                start: args.start,
                end: args.end,
                id: DP.guid(),
                text: name
            });
            dp.events.add(e);
            dp.clearSelection();
        };

        // --- ESEMÉNYEK HOZZÁADÁSA ---
        dp.events.list = processCourses(courses);

        dp.onEventClick = function (args) {
    const clickedEvent = args.e;
    const clickedTantargy = clickedEvent.data.tags.tantargy;
    const clickedId = clickedEvent.id();
    const clickedBarColor = clickedEvent.data.barColor;
    const clickedTags = clickedEvent.data.tags;

    // Ha már van localStorage-ban, visszaállítjuk az eseményeket
    if (localStorage.getItem(clickedTantargy)) {
        const eventsToRestore = JSON.parse(localStorage.getItem(clickedTantargy))["deletedEvents"];
        localStorage.removeItem(clickedTantargy);

        eventsToRestore.forEach(event => {
            // Visszaállítjuk az eredeti szöveget: kurzuskód + tantárgy + oktató
            if (event.tags) {
                event.text = `${event.tags.kurzuskod} - ${event.tags.tantargy}`; //\n${event.tags.tanar}
            }
            dp.events.add(event);
        });

        // Visszaállítjuk a kattintott esemény eredeti színét és szövegét
        clickedEvent.data.backColor = clickedEvent.data.originalColor || "";
        clickedEvent.data.isSelected = false;
        clickedEvent.data.fontColor = "black";
        clickedEvent.text(`${clickedTags.kurzuskod} - ${clickedTags.tantargy}`); //\n${clickedTags.tanar}
        dp.events.update(clickedEvent);
    } else {
        // Csak az adott tantárgyhoz tartozó eseményeket töröljük
        const eventsToStore = dp.events.list.filter(event =>
            event.tags.tantargy === clickedTantargy && event.id !== clickedId
        );
        localStorage.setItem(clickedTantargy, JSON.stringify({
            "clickedEvent": clickedEvent.data,
            "clickedColor": clickedBarColor,
            "deletedEvents": eventsToStore
        }));

        // Töröljük az adott tantárgyhoz tartozó eseményeket, kivéve a kattintottat
        dp.events.list = dp.events.list.filter(ev =>
            !(ev.tags.tantargy === clickedTantargy && ev.id !== clickedId)
        );

        // Kiemelés: szín, szöveg módosítás
        clickedEvent.data.originalColor = clickedEvent.data.backColor;
        clickedEvent.data.backColor = clickedBarColor;
        clickedEvent.data.isSelected = true;
        clickedEvent.text(`${clickedTags.kurzuskod} - ${clickedTags.tantargy}\n${clickedTags.tanar}`);
        dp.events.update(clickedEvent);
    }
};

        dp.init();

        return () => {
            if (dpRef.current) {
                dpRef.current.dispose();
                dpRef.current = null;
            }
        };
    }, [courses]); 

    return (
        <div>
            <div id="dp"></div>
        </div>
    );
};

export default Calendar;