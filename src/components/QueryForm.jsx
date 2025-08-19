import React from "react";
export default function QueryForm({ name, semester, setName, setSemester, fetchData }) {
  return (
    <>
      <label htmlFor="name">Tantárgyak kódjai (pontosvesszővel elválasztva): </label>
      <input
        type="text"
        id="name"
        placeholder="Kódok"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <label htmlFor="semester">Félév: </label>
      <select
        id="semester"
        value={semester}
        onChange={e => setSemester(e.target.value)}
      >
        <option value="2025-2026-1">2025/26-1</option>
        <option value="2024-2025-2">2024/25-2</option>
        <option value="2024-2025-1">2024/25-1</option>
      </select>
      <br />
      <button onClick={fetchData}>
        <i className="fas fa-search"></i> Lekérdezés
      </button>
    </>
  );
}