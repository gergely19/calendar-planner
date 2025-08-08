// api/get_data.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Preflight kérés kezelése - csak válaszolunk és kilépünk
    res.status(200).end();
    return;
  }
  const { name, semester } = req.query;

  if (!name || !semester) {
    res.status(400).json({ error: "Hiányzó paraméterek" });
    return;
  }

  // Végső API URL (InfinityFree PHP script)
  const targetUrl = `https://calendar-planner.infinityfree.me/api/get_data.php?name=${encodeURIComponent(name)}&semester=${encodeURIComponent(semester)}`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();

    // CORS engedélyezése, hogy a frontend elérhesse ezt a végpontot
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Hiba történt a proxy kérés során" });
  }
}
