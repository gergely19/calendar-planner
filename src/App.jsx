import React, { useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import ColorMapping from "./components/ColorMapping";
import Calendar from "./components/Calendar";
import ResultTable from "./components/ResultTable";
import "./indexstyle.css";

function App() {
  const [courses, setCourses] = useState([]);
  const [name, setName] = useState("IP-18KPROGEG; IP-18MIAE; IP-18cAB2G; IP-18cSZÁMEA2G; IP-18cSZÁMEA2E; IP-18cAB2E; IP-18KVPYEG; IP-24KVSZPDMEG; IP-18cVSZG");
  const [semester, setSemester] = useState("2025-2026-1");
  const API_URL = import.meta.env.VITE_API_URL;

  const fetchData = async () => {
    if (!name) {
      alert("Kérlek, add meg a tantárgyak kódjait!");
      return;
    }
    localStorage.clear(); // Töröljük a helyi tárolót, hogy friss adatokat kapjunk
    // Feltételezzük, hogy a backend elérhető /api/get_data.php útvonalon
    const codes = name.split(";").map(code => code.trim());
    let allCourses = [];
    for (const code of codes) {
      const response = await fetch(`${API_URL}/get_data.php?name=${encodeURIComponent(code)}&semester=${encodeURIComponent(semester)}`);
      const data = await response.json();
      console.log(data);
      if (data.error) {
        alert(data.error);
        return;
      }
      allCourses = allCourses.concat(data);
    }
    setCourses(allCourses);
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
        <Calendar courses={courses} />
        <ResultTable courses={courses} />
      </div>
    </div>
  );
}

export default App;