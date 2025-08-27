// api/submit.js
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // 1) corps JSON
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // 2) honeypot anti-bot (ne renvoie pas d'erreur pour ne pas donner d’indice aux bots)
    if (body.website) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // 3) variables d’environnement (à mettre sur Vercel)
    const secret = process.env.FORM_SECRET;
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (!secret || !n8nUrl) {
      // si ces deux-là sont vides → c’est normal que rien ne parte
      return res.status(500).json({ error: "Missing env vars" });
    }

    // 4) envoi vers n8n
    const forward = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-form-secret": secret
      },
      body: JSON.stringify(body)
    });

    const data = await forward.text(); // on lit la réponse brute (utile en debug)
    // on renvoie vers le client le même code HTTP que n8n
    if (!forward.ok) {
      return res.status(forward.status).send(data || "n8n error");
    }

    // OK → on termine en 200 avec un petit JSON standard
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Proxy error", e);
    return res.status(500).json({ error: "Proxy error" });
  }
}
