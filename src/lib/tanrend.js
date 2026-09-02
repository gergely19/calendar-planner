// Az ELTE tanrend lekérdezéseinek közös rétege: URL-építés, HTML-táblázat
// feldolgozás és a tárgykódlista kezelése. A kód- és a névkeresés ugyanezt
// a szerkezetet kapja vissza, így a naptár mindkettővel tud dolgozni.

export const SEMESTERS = [
  { value: "2026-2027-1", label: "2026/27 ősz" },
  { value: "2025-2026-2", label: "2025/26 tavasz" },
  { value: "2025-2026-1", label: "2025/26 ősz" },
  { value: "2024-2025-2", label: "2024/25 tavasz" },
  { value: "2024-2025-1", label: "2024/25 ősz" },
];

// A tanrend keresési módjai:
//   keres_kod_azon – pontos tárgykód szerint
//   keresnevre     – tárgynév szerint, részleges egyezéssel is
export function tanrendUrl(mode, key, semester) {
  return `/api/elte/tanrendnavigation.php?k=${encodeURIComponent(
    key
  )}&m=${mode}&f=${encodeURIComponent(semester)}`;
}

export function parseCoursesFromHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const entries = doc.querySelectorAll('table[id*="resulttable"] tr');
  const rows = [];

  entries.forEach((entry) => {
    const cols = entry.querySelectorAll("td");
    if (cols.length === 0) return;
    rows.push({
      idopont: cols[0]?.textContent?.trim() || "",
      kodok: cols[1]?.textContent?.trim() || "",
      tantargy: cols[2]?.textContent?.trim() || "",
      tanar: cols[5]?.textContent?.trim() || "",
    });
  });

  return rows;
}

export function parseKodok(kodokStr) {
  const str = (kodokStr || "").trim();
  // pl. "IPM-22fpiIFG-1 (gyakorlat)" vagy "ELTE-OI-AI-90 (előadás)"
  const match = str.match(/^(.+)-(\d+)(?:\s*\((.*?)\))?$/);
  if (match) {
    return {
      targykod: match[1].trim(),
      kurzuskod: parseInt(match[2], 10),
      tipus: (match[3] || "").trim(),
    };
  }
  const parts = str.split(/\s*\(/);
  const codePart = parts[0].trim();
  const tipus = parts[1] ? parts[1].replace(/\)$/, "").trim() : "";
  const lastHyphenIndex = codePart.lastIndexOf("-");
  if (lastHyphenIndex !== -1) {
    const targykod = codePart.substring(0, lastHyphenIndex).trim();
    const kurzuskod = parseInt(codePart.substring(lastHyphenIndex + 1), 10) || 0;
    return { targykod, kurzuskod, tipus };
  }
  return { targykod: str, kurzuskod: 0, tipus: "" };
}

// Ékezetek és kisbetű-nagybetű nélküli alak – így a névkeresés akkor is
// talál, ha a beírt szöveg nem egyezik pontosan.
export function normalize(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // az NFD által leválasztott ékezetek
    .toLowerCase();
}

// ----- tárgykódlista (a mezőben pontosvesszővel elválasztva tároljuk) -----

export function splitCodes(value) {
  return (value || "")
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function joinCodes(list) {
  return list.join("; ");
}

export function mergeCodes(list, incoming) {
  const merged = [...list];
  incoming.forEach((code) => {
    const clean = code.trim();
    if (!clean) return;
    if (!merged.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      merged.push(clean);
    }
  });
  return merged;
}

export function hasCode(list, code) {
  return list.some((c) => c.toLowerCase() === (code || "").toLowerCase());
}
