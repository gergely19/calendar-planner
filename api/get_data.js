export default async function handler(req, res) {
  const { name, semester } = req.query;
  if (!name || !semester) {
    return res.status(400).json({ error: "Hiányzó paraméterek" });
  }

  const targetUrl = `https://calendar-planner.infinityfree.me/api/get_data.php?name=${encodeURIComponent(name)}&semester=${encodeURIComponent(semester)}`;

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      const text = await response.text(); // hibaszöveg, nem JSON
      return res.status(response.status).json({ error: "Hiba a távoli szerverről", details: text });
    }

    const text = await response.text();

    // Próbáld meg JSON-ként parse-olni a választ, hogy debugolj:
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({ error: "Nem JSON választ kaptunk a szervertől", rawResponse: text });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
