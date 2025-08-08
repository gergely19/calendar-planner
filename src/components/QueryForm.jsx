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
      <input
        type="text"
        id="semester"
        placeholder="Add meg a félévet"
        value={semester}
        onChange={e => setSemester(e.target.value)}
      />
      <button onClick={fetchData}>
        <i className="fas fa-search"></i> Lekérdezés
      </button>
    </>
  );
}