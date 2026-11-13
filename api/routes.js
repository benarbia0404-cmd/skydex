// SkyDex — relais serverless des routes (Vercel : POST /api/routes)
const UPSTREAM = process.env.SKYDEX_ADSB || 'https://api.adsb.lol';
const UA = `SkyDex/1.0 (+jeu de spotting; contact: ${process.env.SKYDEX_CONTACT || 'admin@skydex.local'})`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (body.length > 20000) return res.status(413).json({ error: 'requête trop grande' });
    const r = await fetch(`${UPSTREAM}/api/0/routeset`, {
      method: 'POST', body,
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'routes indisponibles', detail: String(e.message || e).slice(0, 200) });
  }
}
