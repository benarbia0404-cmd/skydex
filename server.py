#!/usr/bin/env python3
"""
SkyDex — serveur du jeu + relais ADS-B (aucune dépendance, Python 3.8+).

  python3 server.py            -> http://localhost:3000

Rôles :
  1. Sert les fichiers du jeu (index.html, js/, css/, assets/).
  2. /api/flights?lat=..&lon=..&dist=..  -> avions réels autour d'un point (relais vers adsb.lol,
     contourne le blocage CORS du navigateur). dist en milles nautiques (max 250).
  3. /api/routes (POST)                  -> origine/destination des vols (relais adsb.lol routeset).

Le relais met en cache chaque zone quelques secondes (les joueurs proches partagent la même requête)
et limite le débit par joueur, pour respecter le service gratuit adsb.lol (données ODbL, attribution
« ADS-B : adsb.lol » affichée sur la carte).
"""
import json, os, sys, time, threading, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', '3000'))
ROOT = os.path.dirname(os.path.abspath(__file__))
UPSTREAM = os.environ.get('SKYDEX_ADSB', 'https://api.adsb.lol')
UA = 'SkyDex/1.0 (+jeu de spotting; contact: ' + os.environ.get('SKYDEX_CONTACT', 'admin@skydex.local') + ')'
CACHE_TTL = 5.0            # secondes : une zone n'est demandée qu'une fois toutes les 5 s, quel que soit le nombre de joueurs
MIN_INTERVAL = 2.0         # secondes entre deux requêtes d'un même joueur

_cache, _lock, _last_by_ip = {}, threading.Lock(), {}


_conn_lock = threading.Lock()
_conn = {'c': None}


def fetch_json(url, body=None, timeout=20):
    """Connexion HTTPS persistante vers la source : la négociation TLS (lente) n'est faite qu'une fois."""
    import http.client
    u = urlparse(url)
    headers = {'User-Agent': UA, 'Accept': 'application/json', 'Connection': 'keep-alive'}
    if body:
        headers['Content-Type'] = 'application/json'
    path = u.path + (('?' + u.query) if u.query else '')
    with _conn_lock:
        for attempt in range(2):
            c = _conn['c']
            if c is None:
                c = http.client.HTTPSConnection(u.hostname, u.port or 443, timeout=timeout)
                _conn['c'] = c
            try:
                c.request('POST' if body else 'GET', path, body=body, headers=headers)
                r = c.getresponse()
                return r.status, r.read()
            except Exception:
                try:
                    c.close()
                finally:
                    _conn['c'] = None
                if attempt == 1:
                    raise


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write('[api] ' + (fmt % args) + '\n')

    def end_headers(self):
        p = urlparse(self.path).path
        if p.endswith(('.js', '.css', '.html', '.webmanifest')) or p == '/':
            self.send_header('Cache-Control', 'no-cache')
        if p == '/sw.js':
            self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def _json(self, status, payload, extra=None):
        data = payload if isinstance(payload, (bytes, bytearray)) else json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _throttled(self):
        ip = self.client_address[0]
        now = time.time()
        last = _last_by_ip.get(ip, 0)
        _last_by_ip[ip] = now
        return now - last < MIN_INTERVAL * 0.5   # tolérance : on ne bloque que les rafales

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/flights':
            return self.api_flights(parse_qs(u.query))
        if u.path == '/api/health':
            return self._json(200, {'ok': True, 'upstream': UPSTREAM})
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path == '/api/routes':
            return self.api_routes()
        self._json(404, {'error': 'not found'})

    def api_flights(self, q):
        try:
            lat = max(-85.0, min(85.0, float(q['lat'][0])))
            lon = max(-180.0, min(180.0, float(q['lon'][0])))
            dist = max(5, min(250, int(float(q.get('dist', ['60'])[0]))))
        except Exception:
            return self._json(400, {'error': 'paramètres lat, lon, dist requis'})
        # Zone arrondie : les joueurs d'un même secteur partagent le cache
        key = (round(lat, 1), round(lon, 1), (dist + 9) // 10 * 10)
        now = time.time()
        with _lock:
            hit = _cache.get(key)
        if hit and now - hit[0] < CACHE_TTL:
            return self._json(200, hit[1], {'X-SkyDex-Cache': 'hit'})
        if self._throttled() and hit:
            return self._json(200, hit[1], {'X-SkyDex-Cache': 'stale'})
        urls = [
            f'{UPSTREAM}/v2/point/{key[0]:.1f}/{key[1]:.1f}/{key[2]}',
            f'https://api.airplanes.live/v2/point/{key[0]:.1f}/{key[1]:.1f}/{key[2]}',
            f'https://opendata.adsb.fi/api/v2/lat/{key[0]:.1f}/lon/{key[1]:.1f}/dist/{key[2]}',
        ]
        last_err = None
        for u in urls:
            try:
                status, body = fetch_json(u)
                if status == 200 and body:
                    with _lock:
                        _cache[key] = (now, body)
                        if len(_cache) > 500:
                            for k in sorted(_cache, key=lambda k: _cache[k][0])[:100]:
                                _cache.pop(k, None)
                    return self._json(200, body, {'X-SkyDex-Cache': 'miss'})
            except Exception as e:
                last_err = e
        if hit:
            return self._json(200, hit[1], {'X-SkyDex-Cache': 'stale'})
        return self._json(502, {'error': 'source ADS-B indisponible', 'detail': str(last_err)[:200]})

    def api_routes(self):
        try:
            n = min(int(self.headers.get('Content-Length', '0')), 20000)
            body = self.rfile.read(n)
            json.loads(body)  # validation
        except Exception:
            return self._json(400, {'error': 'JSON invalide'})
        try:
            status, data = fetch_json(f'{UPSTREAM}/api/0/routeset', body=body)
            return self._json(status, data)
        except Exception as e:
            return self._json(502, {'error': 'routes indisponibles', 'detail': str(e)[:200]})


if __name__ == '__main__':
    srv = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'SkyDex sur http://localhost:{PORT}  (relais ADS-B : {UPSTREAM})')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
