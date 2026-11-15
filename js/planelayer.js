// SkyDex — rendu Canvas 2D des avions (remplace les marqueurs DOM Leaflet).
// Un seul <canvas> pour des milliers d'entités : sprites SVG pré-rendus en cache, redessin à la demande
// (déplacement/zoom de la carte) + animation ~30 fps seulement s'il y a des halos, sinon ~2,5 fps.
import { posAt } from './flights.js';
import { planeSVG } from './catalog.js';

const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const GOLD = '#d49b38';
const spriteCache = new Map();

function sprite(model, color, size, onLoad) {
  const key = `${model.id}|${color}|${size}`;
  const hit = spriteCache.get(key);
  if (hit) return hit.ok ? hit.img : null;
  const img = new Image();
  const entry = { img, ok: false };
  spriteCache.set(key, entry);
  const px = Math.round(size * 2);   // 2x pour les écrans Retina
  const svg = planeSVG(model, color).replace('<svg ',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" stroke="#05070b" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke" `);
  img.onload = () => { entry.ok = true; onLoad(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return null;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class PlaneLayer {
  constructor(map) {
    this.map = map;
    this.items = [];       // avions individuels à dessiner (déjà filtrés par zone visible / zoom)
    this.clusters = [];    // bulles de regroupement
    this.hits = [];        // zones tactiles de la dernière image
    this.ang = new Map();  // cap lissé par avion
    this.dirty = true; this.last = 0; this.prev = performance.now(); this.needAnim = false;
    const c = this.canvas = document.createElement('canvas');
    c.className = 'plane-canvas';
    map.getContainer().appendChild(c);
    this.ctx = c.getContext('2d');
    this.resize();
    const d = () => { this.dirty = true; };
    map.on('move zoom viewreset', d);
    map.on('resize', () => { this.resize(); d(); });
    map.on('zoomanim', e => this.zoomAnim(e));
    map.on('zoomend', () => { c.style.transition = 'none'; c.style.transform = ''; d(); });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const s = this.map.getSize(), dpr = this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(s.x * dpr));
    this.canvas.height = Math.max(1, Math.round(s.y * dpr));
    this.canvas.style.width = s.x + 'px';
    this.canvas.style.height = s.y + 'px';
  }

  // Pendant l'animation de zoom de Leaflet : on met à l'échelle l'image du canvas comme le fait la carte
  zoomAnim(e) {
    const m = this.map, scale = m.getZoomScale(e.zoom), size = m.getSize(), c = this.canvas;
    if (Math.abs(scale - 1) < 1e-3) return;
    const off = m.latLngToContainerPoint(e.center).subtract(size.divideBy(2)).divideBy(1 - 1 / scale);
    c.style.transition = 'none';
    c.style.transformOrigin = `${size.x / 2 + off.x}px ${size.y / 2 + off.y}px`;
    c.style.transform = '';
    void c.offsetWidth;
    c.style.transition = 'transform .25s cubic-bezier(0,0,.25,1)';
    c.style.transform = `scale(${scale})`;
  }

  setData(items, clusters) {
    this.items = items; this.clusters = clusters;
    this.needAnim = items.some(i => i.hi || i.special || i.sel);
    const ids = new Set(items.map(i => i.id));
    for (const id of this.ang.keys()) if (!ids.has(id)) this.ang.delete(id);
    this.dirty = true;
  }
  redraw() { this.dirty = true; }

  loop(now) {
    requestAnimationFrame(this.loop);
    if (document.hidden) return;
    if (!this.dirty && now - this.last < (this.needAnim ? 33 : 400)) return;
    this.dirty = false; this.last = now;
    this.draw(now);
  }

  // Toucher : bulle de regroupement, ou avion (+ voisins superposés dans 30 px)
  hit(p) {
    let best = null, bd = 1e9;
    for (const h of this.hits) {
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      if (d <= h.r && d <= bd) { best = h; bd = d; }
    }
    if (!best) return null;
    if (best.cluster) return { cluster: best.cluster };
    const near = this.hits.filter(h => h.id && Math.hypot(h.x - best.x, h.y - best.y) <= 30).map(h => h.id);
    return { id: best.id, near };
  }

  draw(now) {
    const m = this.map, sz = m.getSize();
    if (!sz.x || !sz.y) return;
    const ctx = this.ctx, dpr = this.dpr, wall = Date.now();
    const dt = Math.min(0.2, (now - this.prev) / 1000); this.prev = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sz.x, sz.y);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const hits = [];
    const rich = this.items.length < 400;   // ombres/halos floutés seulement quand il y a peu d'avions
    const redraw = () => { this.dirty = true; };

    for (const c of this.clusters) {
      const p = m.latLngToContainerPoint([c.lat, c.lon]);
      if (p.x < -30 || p.y < -30 || p.x > sz.x + 30 || p.y > sz.y + 30) continue;
      const g = ctx.createRadialGradient(p.x - 7, p.y - 8, 2, p.x, p.y, 22);
      g.addColorStop(0, 'rgba(34,46,70,.96)'); g.addColorStop(1, 'rgba(10,14,24,.96)');
      ctx.save();
      ctx.shadowColor = c.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, 21, 0, 6.2832); ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = c.color; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `800 15px ${MONO}`; ctx.fillText(String(c.n), p.x, p.y + 1);
      if (c.nNew) {
        ctx.beginPath(); ctx.arc(p.x + 15, p.y - 15, 9, 0, 6.2832); ctx.fillStyle = GOLD; ctx.fill();
        ctx.fillStyle = '#1a1405'; ctx.font = `800 10px ${MONO}`; ctx.fillText(String(c.nNew), p.x + 15, p.y - 14.5);
      }
      ctx.restore();
      hits.push({ cluster: c, x: p.x, y: p.y, r: 26 });
    }

    for (const it of this.items) {
      const [lat, lon] = posAt(it.f, wall);
      const p = m.latLngToContainerPoint([lat, lon]);
      const box = it.size + 16;
      if (p.x < -box || p.y < -box || p.x > sz.x + box || p.y > sz.y + box) continue;

      let a = this.ang.get(it.id);
      const target = it.f.track || 0;
      if (a == null) a = target;
      else a += ((((target - a) % 360) + 540) % 360 - 180) * Math.min(1, dt / 0.5);
      this.ang.set(it.id, a);

      const alpha = it.far ? (it.have ? 0.28 : 0.38) : (it.have ? 0.55 : 1);
      const sc = it.have ? 0.82 : 1;
      const img = sprite(it.m, it.color, it.size, redraw);

      // halo pulsant (rare+, spécial) ou anneau fixe (sélection)
      if (it.sel) {
        ctx.save(); ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = GOLD;
        if (rich) { ctx.shadowColor = GOLD; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(p.x, p.y, box / 2, 0, 6.2832); ctx.stroke(); ctx.restore();
      } else if (it.hi || it.special) {
        const per = it.special ? 1100 : 1900, t = (now % per) / per, col = it.special ? GOLD : it.color;
        ctx.save(); ctx.globalAlpha = 0.95 * (1 - t) * (it.far ? 0.3 : 1); ctx.lineWidth = 1.8; ctx.strokeStyle = col;
        if (rich) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(p.x, p.y, (box / 2 - 2) * (0.68 + 0.8 * t), 0, 6.2832); ctx.stroke(); ctx.restore();
      }

      if (img) {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(a * Math.PI / 180);
        ctx.globalAlpha = alpha;
        if (rich) { ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3; }
        const s = it.size * sc;
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.restore();
      }

      ctx.save();
      if (it.badge) {
        ctx.font = `800 10px ${MONO}`;
        const w = Math.max(14, ctx.measureText(it.badge).width + 6), x0 = p.x + box / 2 - w + 1, y0 = p.y - box / 2 - 1;
        ctx.globalAlpha = it.far ? 0.6 : 1;
        rr(ctx, x0, y0, w, 14, 7); ctx.fillStyle = '#07080c'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = it.color; ctx.stroke();
        ctx.fillStyle = it.color; ctx.fillText(it.badge, x0 + w / 2, y0 + 7.5);
      }
      if (it.isNew && !it.far) {
        ctx.font = `700 11px ${MONO}`; ctx.fillStyle = GOLD; ctx.fillText('✦', p.x - box / 2 + 3, p.y - box / 2 + 9);
      }
      if (it.label) {
        ctx.font = `700 11px ${MONO}`;
        const w = ctx.measureText(it.label).width + 12, x0 = p.x - w / 2, y0 = p.y + box / 2 - 1;
        ctx.globalAlpha = it.far ? 0.55 : 1;
        rr(ctx, x0, y0, w, 17, 4); ctx.fillStyle = 'rgba(7,8,12,.9)'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = it.sel ? GOLD : 'rgba(255,255,255,.14)'; ctx.stroke();
        ctx.fillStyle = it.sel ? GOLD : '#f3f5f9'; ctx.fillText(it.label, p.x, y0 + 9);
      }
      ctx.restore();

      hits.push({ id: it.id, x: p.x, y: p.y, r: Math.max(24, box / 2 + 6) });
    }
    this.hits = hits;
  }
}
