import React, { useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import ColorMapping from "./components/ColorMapping";
import Calendar from "./components/Calendar";
import "./indexstyle.css";

function App() {
  const [courses, setCourses] = useState([]);
  const [errorCodes, setErrorCodes] = useState([]);
  const [name, setName] = useState(
    "IP-18cVSZG; IP-24KVSZPDMEG; IP-18KVIBDAG; IP-18cSZÁMEA2E; IP-18cAB2G; IP-18KVSZPREG; IP-18MIAE; IP-18KPROGEG; IP-18KVPYEG; IP-18cAB2E; IP-18KVELE; IP-18KVSZBGTE; IP-18KVIFSWPROGG; IP-18cSZÁMEA2G"
  ); //IP-18cAB2E; IP-18cSZÁMEA2E;    IP-18KPROGEG  ; IP-18MIAE; IP-18cAB2G; IP-18cSZÁMEA2G;  IP-18KVPYEG; IP-24KVSZPDMEG; IP-18cVSZG

  //összes IP-18cVSZG; IP-24KVSZPDMEG; IP-18KVIBDAG; IP-18cSZÁMEA2E; IP-18cAB2G; IP-18KVSZPREG; IP-18MIAE; IP-18KPROGEG; IP-18KVPYEG; IP-18cAB2E; IP-18KVELE; IP-18KVSZBGTE; IP-18KVIFSWPROGG; IP-18cSZÁMEA2G
  const [semester, setSemester] = useState("2025-2026-1");

  const fetchData = async () => {
    if (!name) {
      alert("Kérlek, add meg a tantárgyak kódjait!");
      return;
    }
    const keepKey = "deletedEvents"; // ezt nem akarjuk törölni
    const keepValue = localStorage.getItem(keepKey); // érték elmentése

    localStorage.clear(); // minden törlése
    if (keepValue !== null) {
        localStorage.setItem(keepKey, keepValue); // visszaállítás
    }

    // Feltételezzük, hogy a backend elérhető /api/get_data.php útvonalon
    const codes = name.split(";").map((code) => code.trim());
    let allCourses = [];
    let errorCodes = [];
    for (const code of codes) {
      let data = [];
      let attempts = 0;

      while (attempts < 3) {
        const response = await fetch(`/api/get_data.php?name=${encodeURIComponent(code)}&semester=${encodeURIComponent(semester)}`);
        
        const json = await response.json();
        console.log(json);

        if (json.error) {
          alert(json.error);
          return;
        }

        if (Array.isArray(json) && json.length > 0) {
          data = json;
          break;
        }

        attempts++;
      }

      if (data.length === 0) {
        errorCodes = errorCodes.concat(code);
      }
      allCourses = allCourses.concat(data);
    }
    setCourses(allCourses);
    setErrorCodes(errorCodes);
  };

  return (
    <div>
      <Header />
      <div className="container">
        <QueryForm
          name={name}
          semester={semester}
          setName={setName}
          setSemester={setSemester}
          fetchData={fetchData}
        />
        <h2>Naptár</h2>
        <ColorMapping />
        <Calendar courses={courses} errorCodes={errorCodes} />
      </div>
    </div>
  );
}

export default App;
