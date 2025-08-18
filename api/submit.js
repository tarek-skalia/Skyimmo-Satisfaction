// api/submit.js — route API pour Vercel
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // Body peut être string ou objet selon l'environnement
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // Anti-bot: si le champ caché est rempli, on répond OK sans rien faire
    if (body.website) {
      return res.status(200).json({ ok: true });
    }

    const secret = process.env.FORM_SECRET;
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (!secret || !n8nUrl) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const forward = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-form-secret": secret
      },
      body: JSON.stringify(body)
    });

    // n8n peut répondre avec du JSON ou rien
    let data = {};
    try { data = await forward.json(); } catch (_) {}
    return res.status(forward.status).json(Object.keys(data).length ? data : { ok: forward.ok });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Proxy error" });
  }
}
