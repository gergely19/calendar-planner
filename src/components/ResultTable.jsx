import React from "react";
export default function ResultTable({ courses }) {
  return (
    <table id="resulttable">
      <thead>
        <tr>
          <th scope="col">Időpont</th>
          <th scope="col">Tantárgy</th>
        </tr>
      </thead>
      <tbody style={{ color: "black" }}>
        {courses.map((course, idx) => (
          <tr key={idx}>
            <td>{course.idopont}</td>
            <td>{course.tantargy}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}