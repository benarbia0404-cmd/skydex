// SkyDex — relais ADS-B serverless (Vercel : /api/flights?lat=..&lon=..&dist=..)
// Même logique que server.py : zone arrondie + cache court partagé entre joueurs d'un même secteur.
const UPSTREAM = process.env.SKYDEX_ADSB || 'https://api.adsb.lol';
const UA = `SkyDex/1.0 (+jeu de spotting; contact: ${process.env.SKYDEX_CONTACT || 'admin@skydex.local'})`;
const TTL = 5000;
const cache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=4, stale-while-revalidate=10');
  const lat = Math.max(-85, Math.min(85, parseFloat(req.query.lat)));
  const lon = Math.max(-180, Math.min(180, parseFloat(req.query.lon)));
  const dist = Math.max(5, Math.min(250, parseInt(req.query.dist || '60', 10)));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'paramètres lat, lon, dist requis' });
  const key = `${lat.toFixed(1)}/${lon.toFixed(1)}/${Math.ceil(dist / 10) * 10}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return res.status(200).json(hit.data);
  try {
    const r = await fetch(`${UPSTREAM}/v2/point/${key}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    cache.set(key, { t: Date.now(), data });
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    return res.status(200).json(data);
  } catch (e) {
    if (hit) return res.status(200).json(hit.data);
    return res.status(502).json({ error: 'source ADS-B indisponible', detail: String(e.message || e).slice(0, 200) });
  }
}
