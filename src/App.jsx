import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import QueryForm from "./components/QueryForm";
import ColorMapping from "./components/ColorMapping";
import Calendar from "./components/Calendar";
import "./indexstyle.css";

function App() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorCodes, setErrorCodes] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [name, setName] = useState("IPM-22fpiPAIEG;IPM-24fpiPETEG;IPM-22fpiIFE;IPM-22fpiIFG;IPM-22fpiDSEG;ELTE-OI-AI;IPM-24fpiMFCE;IPM-22fRMEG;IPM-22fpiDNDEG;IPM-22fpiPCMSG;IPM-22fpiPME"); //IP-18cAB2E; IP-18cSZÁMEA2E;    IP-18KPROGEG  ; IP-18MIAE; IP-18cAB2G; IP-18cSZÁMEA2G;  IP-18KVPYEG; IP-24KVSZPDMEG; IP-18cVSZG

  //IP-18cVSZG; IP-24KVSZPDMEG; IP-18KVIBDAG; IP-18cSZÁMEA2E; IP-18cAB2G; IP-18KVSZPREG; IP-18MIAE; IP-18KPROGEG; IP-18KVPYEG; IP-18cAB2E; IP-18KVELE; IP-18KVSZBGTE; IP-18KVIFSWPROGG; IP-18cSZÁMEA2G
  const [semester, setSemester] = useState("2026-2027-1");
  const API_URL = import.meta.env.VITE_API_URL || "";
  const fetchData = async () => {
    if (!name) {
      alert("Kérlek, add meg a tantárgyak kódjait!");
      return;
    }
    const keepKey = "deletedEvents"; // ezt nem akarjuk törölni
    const keepValue = localStorage.getItem(keepKey); // érték elmentése
    localStorage.clear(); // minden törlése
    localStorage.setItem("codes", name);
    if (keepValue !== null) {
        localStorage.setItem(keepKey, keepValue); // visszaállítás
    }
    
    setLoading(true);
    
    // Feltételezzük, hogy a backend elérhető /api/get_data.php útvonalon
    const codes = name.split(";").map((code) => code.trim());
    setEstimatedTime(`~${Math.round(codes.length * 1.55)} mp`);

    let allCourses = [];
    let errorCodes = [];
    for (const code of codes) {
      let data = [];
      let attempts = 0;

      while (attempts < 3) {
        try {
          const response = await fetch(`/api/elte/tanrendnavigation.php?k=${encodeURIComponent(code)}&m=keres_kod_azon&f=${encodeURIComponent(semester)}`);
          
          if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder('iso-8859-2');
          const htmlString = decoder.decode(buffer);
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, "text/html");
          const entries = doc.querySelectorAll('table[id*="resulttable"] tr');
          const parsedCourses = [];
          
          entries.forEach(entry => {
            const cols = entry.querySelectorAll('td');
            if (cols.length > 0) {
                const idopont = cols[0]?.textContent?.trim() || "";
                const kodok = cols[1]?.textContent?.trim() || "";
                const tantargy = cols[2]?.textContent?.trim() || "";
                const tanar = cols[5]?.textContent?.trim() || "";
                
                parsedCourses.push({
                    idopont,           
                    tantargy,
                    kodok,
                    tanar
                });
            }
          });

          if (parsedCourses.length > 0) {
            data = parsedCourses;
            break;
          }
        } catch (err) {
          console.error("Lekérdezési hiba:", err);
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
    setLoading(false);
  };

  useEffect(() => {
    const savedCodes = localStorage.getItem("codes");
    if (savedCodes) {
      setName(savedCodes);
    }
  }, []);

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
        {loading && (
        <div style={overlayStyle}>
          <div style={boxStyle}>
            <h2 style={{color:"black"}}>Betöltés...</h2>
            <p style={{color:"black"}}>{estimatedTime}</p>
            <div className="spinner" ></div>
          </div>
        </div>
      )}
    </div>
  );
}
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const boxStyle = {
  backgroundColor: "white",
  padding: "40px",
  borderRadius: "8px",
  textAlign: "center",
  minWidth: "300px",
  boxShadow: "0 0 15px rgba(0,0,0,0.3)",
};


export default App;
