// SkyDex — point d'entrée : radar, fiche de vol (boarding pass), recherche, filtres, réglages, apparitions spéciales.
import { RARITIES, RARITY_LIST, planeSVG } from './catalog.js';
import { state, save, onChange, owned, resetAll, ensureMissions, missionEvent, grant } from './state.js';
import { FlightFeed, posAt, distKm, flightProgress, NM } from './flights.js';
import { openEncounter } from './encounter.js';
import { PlaneLayer } from './planelayer.js';
import { initCollection, renderCollection, renderMissions, renderShop, refreshAll } from './screens.js';
import { sfx, vibrate } from './fx.js';
import { AIRPORTS } from './flights.js';
import { $, $$, toast, modal, esc, updateHUD, iconSVG } from './ui.js';
import { FC, FA, fictionCallsign, fictionAirline } from './brand.js';

const RANGE_KM = 80;
const feed = new FlightFeed();
let map, meMarker, rangeCircle, sweepMk;
const AP_BONUS_KM = 5;
// Outils de test (dotation, apparition forcée, longue portée, vitrine) : uniquement avec ?dev=1 (mémorisé), jamais en production.
const DEV = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('dev') === '0') localStorage.removeItem('skydex.dev');
    if (q.has('dev') && q.get('dev') !== '0') localStorage.setItem('skydex.dev', '1');
    return localStorage.getItem('skydex.dev') === '1';
  } catch (_) { return false; }
})();
if (!DEV) state.settings.explorer = false;
const watched = new Set(), alerted = new Set();
let me = state.lastPos ? { lat: state.lastPos.lat, lon: state.lastPos.lon, real: false } : { lat: 48.8566, lon: 2.3522, real: false };
let selectedId = null, trailLine = null, routeLine = null, doneLine = null;
const filt = { rarities: new Set(RARITY_LIST.map(r => r.id)), onlyNew: false };

// ----------------------------------------------------------------- Navigation
function initTabs() {
  $$('.tabs button').forEach(b => b.onclick = () => {
    sfx('tap');
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.tab));
    if (b.dataset.tab === 'radar') setTimeout(() => map.invalidateSize(), 50);
    if (b.dataset.tab === 'collection') renderCollection();
    if (b.dataset.tab === 'missions') renderMissions();
    if (b.dataset.tab === 'shop') renderShop();
  });
}

// ----------------------------------------------------------------- Carte
function initMap() {
  map = L.map('map', { center: [me.lat, me.lon], zoom: 8, zoomControl: false, attributionControl: true, minZoom: state.settings.explorer ? 4 : 7, maxZoom: 13, worldCopyJump: true });
  const customTileUrl = window.SKYDEX_TILE_URL || localStorage.getItem('skydex.tileUrl');
  const tileUrl = customTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const addRaster = () => {
    const tiles = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap · ADS-B: adsb.lol',
      maxZoom: 19,
      className: customTileUrl ? 'radar-tiles-custom' : 'radar-tiles-osm',
      updateWhenZooming: false,   // pas de re-chargement à chaque cran de zoom
      updateWhenIdle: true,
      keepBuffer: 4,              // garde les tuiles voisines en mémoire
    }).addTo(map);
    tiles.on('tileerror', e => { if (e && e.tile) e.tile.style.display = 'none'; });
  };
  // Rendu vectoriel (WebGL) : zoom fluide, tuiles ~10x plus légères, mises en cache par le service worker.
  // Repli automatique sur les tuiles raster si WebGL/MapLibre est indisponible.
  let vector = false;
  if (!customTileUrl && window.maplibregl && L.maplibreGL) {
    try {
      const cv = document.createElement('canvas');
      if (cv.getContext('webgl2') || cv.getContext('webgl')) {
        const gl = L.maplibreGL({
          style: 'https://tiles.openfreemap.org/styles/dark',
          attribution: '© OpenStreetMap · OpenFreeMap · ADS-B: adsb.lol',
        }).addTo(map);
        vector = true;
        const mlm = gl.getMaplibreMap && gl.getMaplibreMap();
        if (mlm) mlm.on('error', ev => {
          if (ev && ev.error && /style|Failed to fetch|NetworkError/i.test(String(ev.error.message || ev.error)) && !map._rasterFallback) {
            map._rasterFallback = true; map.removeLayer(gl); addRaster();
          }
        });
      }
    } catch (_) { vector = false; }
  }
  if (!vector) addRaster();
  meMarker = L.marker([me.lat, me.lon], {
    icon: L.divIcon({
      className: 'me-mk',
      html: '<div class="me-wrap"><div class="me-sweep"></div><div class="me-dot"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    }),
    interactive: false,
    zIndexOffset: -1000,
  }).addTo(map);
  rangeCircle = L.circle([me.lat, me.lon], {
    radius: RANGE_KM * 1000,
    color: '#8a94a6',
    weight: 1.2,
    dashArray: '4 6',
    fillColor: '#8a94a6',
    fillOpacity: .02,
    interactive: false,
  }).addTo(map);
  sweepMk = L.marker([me.lat, me.lon], {
    icon: L.divIcon({ className: 'sweep-mk', html: '', iconSize: [0, 0] }),
    interactive: false, zIndexOffset: -3000,
  }).addTo(map);
  map.on('zoomend', sizeSweep);
  sizeSweep();
  map.on('moveend zoomend', () => { syncView(); renderFlights(); });
  planes = new PlaneLayer(map);
  map.on('click', e => {
    const h = planes.hit(e.containerPoint);
    if (h && h.cluster) { map.setView([h.cluster.lat, h.cluster.lon], Math.min(map.getZoom() + 2, 13)); return; }
    if (h) { pickAt(h.id, h.near); return; }
    if (selectedId) deselect();
    closeFilters();
  });
  map.on('mousemove', e => { map.getContainer().style.cursor = planes.hit(e.containerPoint) ? 'pointer' : ''; });
  syncView();
}

function sizeSweep() {
  const el = sweepMk && sweepMk.getElement() && sweepMk.getElement().firstChild;
  if (!el) return;
  const b = rangeCircle.getBounds();
  const p1 = map.latLngToContainerPoint(b.getNorthWest()), p2 = map.latLngToContainerPoint(b.getSouthEast());
  const w = Math.round(Math.abs(p2.x - p1.x));
  el.style.width = el.style.height = w + 'px';
}

// Distance au joueur & temps estimé avant d'entrer dans la zone de capture (projection plane locale)
const distToMe = f => { const [la, lo] = posAt(f); return distKm(me.lat, me.lon, la, lo); };
const inRange = f => state.settings.explorer || distToMe(f) <= RANGE_KM;
function etaToRange(f) {
  const [lat, lon] = posAt(f);
  const kx = 111.32 * Math.cos(me.lat * Math.PI / 180), ky = 110.57;
  const px = (lon - me.lon) * kx, py = (lat - me.lat) * ky;
  const v = (f.gs || 0) * 1.852 / 60, th = (f.track || 0) * Math.PI / 180;
  const vx = v * Math.sin(th), vy = v * Math.cos(th);
  const a = vx * vx + vy * vy, b = 2 * (px * vx + py * vy), c = px * px + py * py - RANGE_KM * RANGE_KM;
  if (c <= 0) return 0;
  if (a < 1e-6) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : null;
}

let viewTimer;
function syncView() {
  if (state.settings.explorer) {
    const c = map.getCenter(), b = map.getBounds();
    feed.setView(c.lat, c.lng, b.getNorthEast().distanceTo(c) / NM * 1.1);
  } else {
    // Mode joueur : on ne charge QUE le ciel autour du joueur (zone de capture), peu importe où regarde la carte
    feed.setView(me.lat, me.lon, Math.ceil(RANGE_KM * 1.15 / 1.852));
  }
  clearTimeout(viewTimer);
  viewTimer = setTimeout(() => feed.poll(), 700);
}

let geoWatch = null;
function placeMe(lat, lon, real) {
  me = { lat, lon, real };
  meMarker.setLatLng([lat, lon]); rangeCircle.setLatLng([lat, lon]); sweepMk.setLatLng([lat, lon]);
  feed.setHome(lat, lon);
  syncView();
  state.lastPos = { lat: +lat.toFixed(3), lon: +lon.toFixed(3) }; // dernière zone connue (reprise rapide au prochain lancement)
  setTimeout(sizeSweep, 60);
}
function locate(first) {
  const center = (lat, lon) => map.setView([lat, lon], first ? 8 : Math.max(map.getZoom(), 8));
  if (!navigator.geolocation) { placeMe(me.lat, me.lon, false); center(me.lat, me.lon); return; }
  navigator.geolocation.getCurrentPosition(
    p => {
      placeMe(p.coords.latitude, p.coords.longitude, true); center(me.lat, me.lon); save();
      feed.lastTry = 0; feed.poll();
      // Suivi continu : la zone de capture suit le joueur quand il se déplace (sans recentrer la carte de force)
      if (geoWatch == null) {
        geoWatch = navigator.geolocation.watchPosition(
          q => { if (distKm(me.lat, me.lon, q.coords.latitude, q.coords.longitude) > 0.15) { placeMe(q.coords.latitude, q.coords.longitude, true); renderFlights(); } },
          () => {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
      }
    },
    () => {
      const lp = state.lastPos;
      if (lp) { placeMe(lp.lat, lp.lon, false); center(lp.lat, lp.lon); if (first) toast('Position indisponible · dernière zone connue'); }
      else { placeMe(me.lat, me.lon, false); center(me.lat, me.lon); if (first) toast('Position refusée · secteur radar par défaut : Paris'); }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

// ----------------------------------------------------------------- Aéroports
let apLayer;
const apMarkers = [];
function initAirports() {
  apLayer = L.layerGroup();
  for (const [code, name, lat, lon] of AIRPORTS) {
    const mk = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'ap-mk',
        html: `<div class="ap-pin"><i>${iconSVG('airport')}</i><b>${code}</b></div>`,
        iconSize: [0, 0],
      }),
      zIndexOffset: -500,
    })
      .on('click', e => { L.DomEvent.stopPropagation(e); airportTap(code, name, lat, lon); })
      .addTo(apLayer);
    apMarkers.push({ mk, lat, lon, code });
  }
  const upd = () => {
    const z = map.getZoom();
    if (z >= 6 && !map.hasLayer(apLayer)) apLayer.addTo(map);
    else if (z < 6 && map.hasLayer(apLayer)) apLayer.remove();
    updateAirportEdgeVisibility();
    refreshAirportPins();
  };
  map.on('zoomend moveend', upd);
  upd();
}

// Aéroports = « spots » : se rendre à moins de 5 km d'un vrai aéroport donne un bonus spotter une fois par jour
const todayStr = () => new Date().toISOString().slice(0, 10);
function refreshAirportPins() {
  const today = todayStr();
  for (const a of apMarkers) {
    const pin = a.mk.getElement() && a.mk.getElement().querySelector('.ap-pin');
    if (pin) pin.classList.toggle('ap-ready', (state.apVisits || {})[a.code] !== today);
  }
}
function airportTap(code, name, lat, lon) {
  state.apVisits = state.apVisits || {};
  const d = distKm(me.lat, me.lon, lat, lon), today = todayStr();
  if (state.apVisits[code] === today) {
    toast(`<b>${esc(code)}</b> · ${esc(name)}<br>Bonus spotter déjà récupéré aujourd'hui`);
  } else if (d <= AP_BONUS_KM || (DEV && state.settings.explorer)) {
    state.apVisits[code] = today;
    grant({ coins: 150, fragments: 25 });
    updateHUD(); sfx('success'); vibrate([60, 30, 90]);
    toast(`Spot <b>${esc(code)}</b> validé ! +150 CR · +25 fragments`, 'gold', 4000);
    refreshAirportPins();
  } else {
    toast(`<b>${esc(code)}</b> · ${esc(name)}<br>Approche-toi à moins de ${AP_BONUS_KM} km pour le bonus spotter (tu es à ${Math.round(d)} km)`, '', 4500);
  }
}

// Alertes : avions surveillés, ou rares jamais capturés, qui vont entrer dans la zone
function alertTick() {
  for (const f of feed.flights.values()) {
    if (alerted.has(f.id)) continue;
    const r = RARITIES[f.model.rarity];
    const wanted = watched.has(f.id) || (r.order >= 2 && !owned(f.model.id));
    if (!wanted) continue;
    const eta = etaToRange(f);
    if (eta == null || eta > 5) continue;
    if (eta === 0 && !watched.has(f.id)) { alerted.add(f.id); continue; } // déjà dedans au chargement : pas d'alerte
    alerted.add(f.id);
    const msg = eta === 0 ? `${FC(f)} · ${f.model.name} est dans ta zone !` : `${f.model.name} (${FC(f)}) entre dans ta zone dans ~${Math.max(1, Math.round(eta))} min`;
    sfx('appear'); vibrate([40, 40, 40]);
    toast(`<b>${r.label.toUpperCase()}</b> · ${esc(msg)}`, 'gold', 5000);
    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      try { new Notification('SkyDex · ' + r.label, { body: msg }); } catch (_) {}
    }
  }
}

function updateAirportEdgeVisibility() {
  if (!map || !map.hasLayer(apLayer)) return;
  const sz = map.getSize();
  for (const a of apMarkers) {
    const el = a.mk.getElement();
    if (!el) continue;
    const pt = map.latLngToContainerPoint([a.lat, a.lon]);
    const inside = pt.x >= 34 && pt.x <= sz.x - 34 && pt.y >= 56 && pt.y <= sz.y - 24;
    el.style.visibility = inside ? 'visible' : 'hidden';
  }
}

// ----------------------------------------------------------------- Marqueurs
function passes(f) {
  const m = f.model;
  if (!filt.rarities.has(m.rarity)) return false;
  if (filt.onlyNew && owned(m.id)) return false;
  return true;
}
const sizeOf = m => ({ ga: 26, prop: 30, bizjet: 28, narrow: 32, wide: 40, wide6: 46, quad: 42, quadprop: 38, delta: 38, stealth: 40 }[m.shape] || 32);

// Rendu Canvas : seuls les avions de la zone visible (+ marge) sont envoyés à la couche de dessin.
// Regroupement dynamique : en zone dense (zoom < 11), les avions communs/peu communs proches fusionnent en bulle.
// Rares+, spéciaux et avion sélectionné restent toujours individuels.
let planes;
const CLUSTER_MIN = 3, CLUSTER_MAX_ZOOM = 11, MAX_DRAW = 3000;
const clusterPx = z => z < 7 ? 84 : z < 9 ? 66 : 56;

function renderFlights() {
  if (!map || !planes) return;
  const z = map.getZoom(), sz = map.getSize(), now = Date.now();
  const b = map.getBounds().pad(z >= 10 ? 0.6 : 0.4);   // marge : pas de « pop-in » pendant le glissement
  const cpx = clusterPx(z), clusterOn = z < CLUSTER_MAX_ZOOM;

  // 1) Filtrage géographique : uniquement ce qui est dans la zone visible
  const vis = [];
  for (const f of feed.flights.values()) {
    const sel = f.id === selectedId;
    if (!sel && !passes(f)) continue;
    const [lat, lon] = posAt(f, now);
    if (!state.settings.explorer && distKm(me.lat, me.lon, lat, lon) > RANGE_KM) continue;   // hors de ta zone : invisible
    if (!sel && !b.contains([lat, lon])) continue;
    vis.push({ f, lat, lon, r: RARITIES[f.model.rarity], sel });
  }

  // 2) Regroupement par cellules écran (index spatial O(n))
  const cells = new Map(), singles = [], clusters = [];
  for (const v of vis) {
    if (!clusterOn || v.sel || v.f.special || v.r.order >= 2) { singles.push(v); continue; }
    const pt = map.latLngToContainerPoint([v.lat, v.lon]);
    const k = Math.floor(pt.x / cpx) + ':' + Math.floor(pt.y / cpx);
    let c = cells.get(k); if (!c) cells.set(k, c = []);
    c.push(v);
  }
  for (const arr of cells.values()) {
    if (arr.length < CLUSTER_MIN) { singles.push(...arr); continue; }
    const best = arr.reduce((a, x) => x.r.order > a.order ? x.r : a, RARITIES.common);
    clusters.push({
      n: arr.length, nNew: arr.filter(x => !owned(x.f.model.id)).length, color: best.color,
      lat: arr.reduce((s, x) => s + x.lat, 0) / arr.length, lon: arr.reduce((s, x) => s + x.lon, 0) / arr.length,
    });
  }

  // 3) Priorité : sélection > spéciaux > rareté ; plafond de sécurité
  singles.sort((a, b) => (b.sel - a.sel) || (!!b.f.special - !!a.f.special) || (b.r.order - a.r.order));
  if (singles.length > MAX_DRAW) singles.length = MAX_DRAW;

  // 4) Étiquettes (anti-chevauchement) + état d'affichage
  const placed = [], items = [];
  const pts = singles.map(v => map.latLngToContainerPoint([v.lat, v.lon]));
  singles.forEach((v, i) => {
    const { f, r, sel } = v, m = f.model, pt = pts[i];
    const have = owned(m.id), size = sizeOf(m);
    const far = !state.settings.explorer && distKm(me.lat, me.lon, v.lat, v.lon) > RANGE_KM;
    const inSafe = pt.x >= 44 && pt.x <= sz.x - 44 && pt.y >= 88 && pt.y <= sz.y - 44 && !(pt.x > sz.x - 82 && pt.y > sz.y - 250);
    const isGa = /^(ga|prop)$/.test(m.shape);
    const wantLabel = sel || (!isGa && state.settings.labels && inSafe && (z >= 9 || (z >= 7 && r.order >= 1) || r.order >= 3));
    let label = null;
    if (wantLabel) {
      const ovLbl = !sel && z < 11 && placed.some(p => Math.abs(p.x - pt.x) < 74 && Math.abs(p.y - pt.y) < 38);
      const ovIcon = !sel && z < 11 && singles.some((o, j) => j !== i && Math.abs(pts[j].x - pt.x) < 42 && (pts[j].y - pt.y) > -6 && (pts[j].y - pt.y) < 38);
      if (!ovLbl && !ovIcon) { label = FC(f); placed.push(pt); }
    }
    items.push({
      f, id: f.id, m, color: r.color, size, have, far, sel,
      hi: r.order >= 2, special: !!f.special, isNew: !have, label,
      badge: r.order >= 2 ? r.code : (have ? '✓' : ''),
    });
  });
  // le sélectionné doit être dessiné en dernier (au-dessus) ; les rares au-dessus des communs
  items.reverse();
  planes.setData(items, clusters);

  updateAirportEdgeVisibility();
  let nIn = 0, nNew = 0, nRare = 0;
  const sky = [];
  for (const f of feed.flights.values()) {
    if (!passes(f) || distToMe(f) > RANGE_KM) continue;
    nIn++;
    const isNew = !owned(f.model.id), ord = RARITIES[f.model.rarity].order;
    if (isNew) nNew++;
    if (ord >= 2) nRare++;
    sky.push({ f, isNew, ord, d: distToMe(f) });
  }
  $('#status span').textContent = `${feed.mode === 'live' ? 'DIRECT' : 'SIMULATION'} · ${nIn} à portée · ${nNew} nouveau${nNew > 1 ? 'x' : ''}${nRare ? ` · ${nRare} rare${nRare > 1 ? 's' : ''}` : ''}`;
  $('#status').title = feed.mode === 'live' ? `ADS-B en direct · ${feed.flights.size} avions suivis` : `Simulation · ${feed.flights.size} avions`;
  renderSkyBar(sky);
  $('#status').className = 'status ' + (feed.mode === 'live' ? 'live' : 'sim');
  if (selectedId) updateSelection();
}

// ----------------------------------------------------------------- Sélection / Fiche de vol (style Carte d'Embarquement)
function select(id) {
  const f = feed.flights.get(id); if (!f) return;
  sfx('tap');
  selectedId = id;
  state.stats.inspected++; missionEvent('inspect');
  const [lat, lon] = posAt(f);
  map.panTo([lat, lon], { animate: true, duration: 0.45 });
  renderFlights();
  // À portée : la carte arrive directement en rotation 3D. Hors portée : fiche spotter (infos + arrivée estimée).
  if (inRange(f)) { $('#sheet').hidden = true; engage(f); }
  else renderSheet(f);
}

// Plusieurs avions superposés sous le doigt : on propose de choisir
function pickAt(id, nearIds) {
  const near = (nearIds && nearIds.length ? nearIds : [id]).map(i => feed.flights.get(i)).filter(Boolean);
  if (near.length <= 1) { select(id); return; }
  sfx('tap');
  near.sort((a, b) => (!owned(b.model.id)) - (!owned(a.model.id)) || RARITIES[b.model.rarity].order - RARITIES[a.model.rarity].order);
  modal(`
    <div class="dossier-top"><span class="sec-kicker">${near.length} AVIONS ICI</span><button class="sh-close" data-close>✕</button></div>
    <div class="pick-list">${near.map(f => {
      const m = f.model, r = RARITIES[m.rarity], isNew = !owned(m.id), far = !inRange(f);
      return `<button class="pick-row${far ? ' far' : ''}" data-id="${esc(f.id)}" style="--rc:${r.color}">
        <span class="pick-ic">${planeSVG(m)}</span>
        <span class="pick-txt"><b>${esc(FC(f))} <small class="mono">${esc(m.code || m.id)}</small></b><small>${esc(m.name)}${f.airline ? ' · ' + esc(FA(f)) : ''}</small></span>
        <span class="pick-tags">${isNew ? '<em class="pick-new">NOUVEAU</em>' : ''}<i class="rtag" style="--rc:${r.color}">${r.code}</i>${far ? '<small class="pick-far">loin</small>' : ''}</span>
      </button>`;
    }).join('')}</div>`, (m, close) => {
    $$('.pick-row', m).forEach(b => b.onclick = () => { close(); select(b.dataset.id); });
  });
}

// Barre « Dans ton ciel » : les avions à portée, nouveaux et rares en premier
let skySig = '';
function renderSkyBar(list) {
  const bar = $('#sky-bar'); if (!bar) return;
  list.sort((a, b) => b.isNew - a.isNew || b.ord - a.ord || a.d - b.d);
  const top = list.slice(0, 14);
  const sig = top.map(x => x.f.id + (x.isNew ? 'n' : 'o')).join(',');
  if (sig === skySig) return;
  skySig = sig;
  bar.hidden = !top.length;
  bar.innerHTML = `<span class="sky-lbl">DANS<br>TON CIEL</span>` + top.map(({ f, isNew }) => {
    const m = f.model, r = RARITIES[m.rarity];
    return `<button class="sky-chip${isNew ? ' is-new' : ''}${r.order >= 2 ? ' is-rare' : ''}" data-id="${esc(f.id)}" style="--rc:${r.color}" title="${esc(FC(f))} · ${esc(m.name)}">
      <span class="sky-ic">${planeSVG(m)}</span><b>${esc(m.code || m.id)}</b>${isNew ? '<i>!</i>' : ''}</button>`;
  }).join('');
  $$('.sky-chip', bar).forEach(b => b.onclick = () => select(b.dataset.id));
}
function deselect() {
  selectedId = null;
  $('#sheet').hidden = true;
  if (trailLine) { trailLine.remove(); trailLine = null; }
  if (routeLine) { routeLine.remove(); routeLine = null; }
  if (doneLine) { doneLine.remove(); doneLine = null; }
  renderFlights();
}

function renderSheet(f) {
  const m = f.model, r = RARITIES[m.rarity], have = owned(m.id);
  const sh = $('#sheet');
  sh.hidden = false; sh.style.setProperty('--rc', r.color);
  sh.innerHTML = `
    <div class="grab"></div>
    <div class="sh-strip-top">
      <span class="sec-kicker">FICHE DE VOL · ${esc(m.code || m.id)}</span>
      <span class="sh-collect-status ${have ? 'owned' : 'new'}">
        ${have ? `EN HANGAR ×${state.cards[m.id].count}` : 'NOUVEL APPAREIL'}
      </span>
    </div>
    <div class="sh-head">
      <div class="sh-ic">${planeSVG(m)}</div>
      <div class="sh-title">
        <div class="sh-callsign-row">
          <h2>${esc(FC(f))}</h2>
          <span class="rtag" style="--rc:${r.color}">${r.code} · ${r.label}</span>
        </div>
        <small>${f.airline ? esc(FA(f)) + ' · ' : ''}${esc(m.name)}</small>
      </div>
      <button class="sh-close" id="sh-close" aria-label="Fermer">✕</button>
    </div>
    <div id="sh-route"></div>
    <div class="sh-perforation"></div>
    <div class="data" id="sh-data"></div>
    <div id="sh-cta"></div>`;
  trailLine && (trailLine.remove(), trailLine = null);
  routeLine && (routeLine.remove(), routeLine = null);
  doneLine && (doneLine.remove(), doneLine = null);
  $('#sh-close').onclick = deselect;
  sh.dataset.far = '';
  updateSelection();
}

function updateSelection() {
  const f = feed.flights.get(selectedId);
  if (!f) { if (selectedId) deselect(); return; }
  const data = $('#sh-data');
  if (!data) return;
  const [lat, lon] = posAt(f);
  const d = distKm(me.lat, me.lon, lat, lon);
  if (!data.dataset.ok) {
    data.dataset.ok = '1';
    data.innerHTML = `
      <div><small>ALTITUDE</small><b id="d-alt"></b></div>
      <div><small>VITESSE SOL</small><b id="d-spd"></b></div>
      <div><small>CAP MAG.</small><b id="d-hdg"></b></div>
      <div><small>TAUX VERT.</small><b id="d-vs"></b></div>
      <div><small>IMMAT.</small><b>${esc(f.reg)}</b></div>
      <div><small>DISTANCE</small><b id="d-dist"></b></div>`;
  }
  $('#d-alt').textContent = Math.round(f.alt).toLocaleString('fr-FR') + ' FT';
  $('#d-spd').textContent = Math.round(f.gs) + ' KT';
  $('#d-hdg').textContent = String(Math.round(f.track || 0)).padStart(3, '0') + '°';
  $('#d-vs').textContent = (f.vr > 0 ? '▲ ' : f.vr < 0 ? '▼ ' : '') + Math.abs(Math.round(f.vr)) + ' FPM';
  $('#d-dist').textContent = Math.round(d) + ' KM';
  // Zone d'action : capturer si à portée, sinon arrivée estimée + alerte
  const cta = $('#sh-cta');
  const far = !inRange(f);
  if (cta && cta.dataset.far !== String(far)) {
    const wasFar = cta.dataset.far === 'true';
    cta.dataset.far = String(far);
    if (!far) {
      if (wasFar) toast(`<b>${esc(FC(f))}</b> est entré dans ta zone !`, 'gold');
      cta.innerHTML = `<button class="btn gold block" id="sh-card">${iconSVG('collection')}<span>CAPTURER LA CARTE</span></button>`;
      $('#sh-card').onclick = () => engage(f);
    } else {
      cta.innerHTML = `<div class="sh-far"><div><b>Hors de portée</b><span id="sh-eta"></span></div>
        <button class="btn sm-btn" id="sh-watch">${watched.has(f.id) ? 'Alerte activée' : "M'alerter"}</button></div>`;
      $('#sh-watch').onclick = e => {
        watched.add(f.id); alerted.delete(f.id);
        e.currentTarget.textContent = 'Alerte activée';
        if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
        toast(`Alerte posée sur <b>${esc(FC(f))}</b>`);
      };
    }
  }
  if (far && $('#sh-eta')) {
    const eta = etaToRange(f);
    $('#sh-eta').textContent = eta == null ? `${Math.round(d - RANGE_KM)} km de ta zone · ne s'en approche pas` : `Entre dans ta zone dans ~${Math.max(1, Math.round(eta))} min`;
    const w = $('#sh-watch'); if (w) w.hidden = eta == null; // l'alerte n'a de sens que s'il se rapproche
  }
  // itinéraire
  const rt = $('#sh-route'), p = flightProgress(f), sig = f.from ? f.from.code + f.to.code : 'none';
  if (rt.dataset.sig !== sig) {
    rt.dataset.sig = sig;
    rt.innerHTML = f.from ? `<div class="route">
        <div class="ap"><small>ORIGINE</small><b>${esc(f.from.code)}</b><span>${esc(f.from.name || '')}</span></div>
        <div class="rbar-wrap">
          <div class="rbar"><i id="rb-i"></i><em id="rb-p">${planeSVG(f.model)}</em></div>
          <div class="rbar-meta" id="rb-t"></div>
        </div>
        <div class="ap right"><small>DEST.</small><b>${esc(f.to.code)}</b><span>${esc(f.to.name || '')}</span></div>
      </div>`
      : `<div class="noroute">${f.special ? 'Vol spécial / exposition' : f.military ? (esc(FA(f)) || 'Mission militaire') : 'Vol local / itinéraire non commercial'}</div>`;
  }
  if (p && $('#rb-i')) {
    $('#rb-i').style.width = p.pct * 100 + '%'; $('#rb-p').style.left = p.pct * 100 + '%';
    const rem = Math.max(0, p.total - p.done);
    $('#rb-t').textContent = `${Math.round(p.done)} KM · RESTE ${Math.round(rem)} KM (~${Math.round(rem / (Math.max(f.gs, 50) * 1.852) * 60)} MIN)`;
  }
  // traînée + trajectoire complète (origine -> avion -> destination)
  const rc = RARITIES[f.model.rarity].color;
  if (state.settings.trails && f.trail.length > 1) {
    const pts = [...f.trail, [lat, lon]];
    if (!trailLine) trailLine = L.polyline(pts, { color: '#e5b84b', weight: 2.5, opacity: .85, dashArray: '2 6', lineCap: 'round', interactive: false }).addTo(map);
    else trailLine.setLatLngs(pts);
  }
  if (f.from) {
    const pts = [[f.from.lat, f.from.lon], [lat, lon]];
    if (!doneLine) doneLine = L.polyline(pts, { color: rc, weight: 2.2, opacity: .75, interactive: false }).addTo(map);
    else doneLine.setLatLngs(pts);
  } else if (doneLine) { doneLine.remove(); doneLine = null; }
  if (f.to) {
    const pts = [[lat, lon], [f.to.lat, f.to.lon]];
    if (!routeLine) routeLine = L.polyline(pts, { color: rc, weight: 1.8, opacity: .55, dashArray: '5 7', interactive: false }).addTo(map);
    else routeLine.setLatLngs(pts);
  } else if (routeLine) { routeLine.remove(); routeLine = null; }
}

// Infos du vol affichées dans l'écran de capture
function flightInfoHTML(f) {
  const [lat, lon] = posAt(f);
  const d = distKm(me.lat, me.lon, lat, lon), p = flightProgress(f);
  const route = f.from ? `<div class="route">
      <div class="ap"><small>ORIGINE</small><b>${esc(f.from.code)}</b><span>${esc(f.from.name || '')}</span></div>
      <div class="rbar-wrap"><div class="rbar"><i style="width:${p ? p.pct * 100 : 0}%"></i><em style="left:${p ? p.pct * 100 : 0}%">${planeSVG(f.model)}</em></div>
        <div class="rbar-meta">${p ? `${Math.round(p.done)} KM · RESTE ${Math.round(Math.max(0, p.total - p.done))} KM` : ''}</div></div>
      <div class="ap right"><small>DEST.</small><b>${esc(f.to.code)}</b><span>${esc(f.to.name || '')}</span></div>
    </div>` : `<div class="noroute">${f.special ? 'Vol spécial / exposition' : f.military ? (esc(FA(f)) || 'Mission militaire') : 'Vol local / itinéraire non commercial'}</div>`;
  const cell = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
  return `${route}<div class="data enc-data">
    ${cell('COMPAGNIE', esc(FA(f) || '—'))}${cell('APPAREIL', esc(f.model.name))}
    ${cell('ALTITUDE', Math.round(f.alt).toLocaleString('fr-FR') + ' FT')}${cell('VITESSE SOL', Math.round(f.gs) + ' KT')}
    ${cell('CAP', String(Math.round(f.track || 0)).padStart(3, '0') + '°')}${cell('TAUX VERT.', (f.vr > 0 ? '▲ ' : f.vr < 0 ? '▼ ' : '') + Math.abs(Math.round(f.vr || 0)) + ' FPM')}
    ${cell('IMMAT.', esc(f.reg || '—'))}${cell('DISTANCE', Math.round(d) + ' KM')}
  </div>`;
}

function engage(f) {
  const [lat, lon] = posAt(f);
  const d = distKm(me.lat, me.lon, lat, lon);
  openEncounter(f, {
    inRange: state.settings.explorer || d <= RANGE_KM, distKm: d, rangeKm: RANGE_KM,
    infoHTML: () => flightInfoHTML(f),
    onCaught: fl => { if (fl.special) feed.flights.delete(fl.id); deselect(); updateBanner(); },
    onFled: fl => { feed.flights.delete(fl.id); deselect(); },
    onClose: () => { deselect(); refreshAll(); renderFlights(); },
  });
}

// ----------------------------------------------------------------- Recherche
function initSearch() {
  const inp = $('#search'), res = $('#search-results'), clr = $('#search-clear');
  const run = () => {
    const q = inp.value.trim().toLowerCase();
    clr.hidden = !q;
    if (q.length < 2) { res.hidden = true; return; }
    const hits = [...feed.flights.values()].filter(f =>
      [f.callsign, FC(f), f.reg, f.model.code, f.model.name, FA(f)].some(v => v && String(v).toLowerCase().includes(q))).slice(0, 8);
    res.hidden = false;
    res.innerHTML = hits.length ? hits.map(f => `<button data-id="${f.id}"><span style="color:${RARITIES[f.model.rarity].color}">${planeSVG(f.model)}</span>
      <span><b class="mono">${esc(FC(f))}</b> · ${esc(f.model.name)} <em class="sr-icao">${esc(f.model.code || f.model.id)}</em><small>${f.airline ? esc(FA(f)) + ' · ' : ''}${esc(RARITIES[f.model.rarity].label)}${f.from ? ` · ${esc(f.from.code)} → ${esc(f.to.code)}` : ''}</small></span></button>`).join('')
      : '<div class="empty" style="padding:14px">Aucun trafic identifié sur ce secteur</div>';
    $$('button', res).forEach(b => b.onclick = () => {
      const f = feed.flights.get(b.dataset.id); if (!f) return;
      const [la, lo] = posAt(f);
      map.setView([la, lo], Math.max(map.getZoom(), 9));
      inp.value = ''; res.hidden = true; clr.hidden = true; inp.blur();
      setTimeout(() => select(f.id), 300);
    });
  };
  inp.addEventListener('input', run);
  clr.onclick = () => { inp.value = ''; run(); };
}

// ----------------------------------------------------------------- Filtres, légende & réglages
function closeFilters() {
  $('#filters').hidden = true;
  const leg = $('#radar-legend');
  if (leg) leg.hidden = true;
}
function initFilters() {
  const box = $('#filters');
  const leg = $('#radar-legend');
  const draw = () => {
    box.innerHTML = `<h4>FILTRES RADAR</h4>
      ${RARITY_LIST.map(r => `<label><input type="checkbox" data-r="${r.id}" ${filt.rarities.has(r.id) ? 'checked' : ''}><span class="rdot" style="background:${r.color}"></span>${r.label}</label>`).join('')}
      <label><input type="checkbox" id="f-new" ${filt.onlyNew ? 'checked' : ''}>Non capturés uniquement</label>
      <label><input type="checkbox" id="f-lbl" ${state.settings.labels ? 'checked' : ''}>Indicatifs de vol</label>
      <label><input type="checkbox" id="f-trl" ${state.settings.trails ? 'checked' : ''}>Sillage radar</label>`;
    $$('[data-r]', box).forEach(c => c.onchange = () => { c.checked ? filt.rarities.add(c.dataset.r) : filt.rarities.delete(c.dataset.r); renderFlights(); });
    $('#f-new').onchange = e => { filt.onlyNew = e.target.checked; renderFlights(); };
    $('#f-lbl').onchange = e => { state.settings.labels = e.target.checked; save(); renderFlights(); };
    $('#f-trl').onchange = e => { state.settings.trails = e.target.checked; save(); if (!e.target.checked && trailLine) { trailLine.remove(); trailLine = null; } };
  };
  $('#btn-filter').onclick = () => {
    if (leg) leg.hidden = true;
    box.hidden = !box.hidden;
    if (!box.hidden) draw();
  };
  const btnLeg = $('#btn-legend');
  if (btnLeg && leg) {
    leg.innerHTML = `<h4>COULEURS DE RARETÉ</h4>
      ${RARITY_LIST.map(r => `<div class="leg-row">
        <span class="leg-dot ${r.order >= 2 ? 'pulse' : ''}" style="--rc:${r.color};background:${r.color}"></span>
        <span class="leg-lbl">${r.label}</span>
        <small class="leg-code">${r.order >= 2 ? 'Halo pulsant' : 'Standard'}</small>
      </div>`).join('')}`;
    btnLeg.onclick = () => {
      box.hidden = true;
      leg.hidden = !leg.hidden;
    };
  }
}

function openSettings() {
  const sw = (id, on) => `<div class="switch ${on ? 'on' : ''}" id="${id}"></div>`;
  modal(`
    <div class="dossier-top">
      <span class="sec-kicker">CONFIGURATION AVIONIQUE</span>
      <button class="sh-close" data-close>✕</button>
    </div>
    <h2>Paramètres Système</h2>
    <div class="setting"><span>Audio &amp; retour haptique</span>${sw('s-sound', state.settings.sound)}</div>
    <div class="setting"><span>Source télémétrique ADS-B</span>
      <select id="s-mode"><option value="auto">Auto (Live → Sim)</option><option value="live">ADS-B Live seul</option><option value="sim">Simulateur local</option></select></div>
    ${DEV ? `<div class="setting"><span>[DEV] Radar longue portée<br><small style="color:var(--mut)">Capturer hors du rayon de ${RANGE_KM} km</small></span>${sw('s-expl', state.settings.explorer)}</div>
    <div class="setting"><span>[DEV] Contact historique</span><button class="btn sm-btn" id="s-spawn">Générer</button></div>
    <div class="setting"><span>[DEV] Dotation</span><button class="btn sm-btn" id="s-coins">+1 000 CR</button></div>` : ''}
    <div class="setting"><span>Registre local</span><button class="btn sm-btn danger" id="s-reset">Réinitialiser</button></div>
    <p class="note">Flux ADS-B : adsb.lol · État : ${feed.mode === 'live' ? 'DIRECT' : 'SIMULATION' + (feed.lastError ? ' (' + esc(feed.lastError) + ')' : '')}.</p>
    <p class="note">SkyDex est un jeu indépendant. Les compagnies, constructeurs et modèles affichés sont des noms <b>fictifs</b>, inspirés de données de vol publiques (ADS-B). Toute ressemblance avec des marques existantes est une transposition ludique ; aucune affiliation ni approbation n'est revendiquée.</p>
    <button class="btn gold block" data-close>Fermer</button>`, (m, close) => {
    $('#s-mode').value = state.settings.mode;
    $('#s-mode').onchange = e => { state.settings.mode = e.target.value; save(); feed.fails = 0; feed.lastTry = 0; feed.poll(); };
    const tog = (id, key) => $(id).onclick = e => { state.settings[key] = !state.settings[key]; e.currentTarget.classList.toggle('on', state.settings[key]); save(); };
    tog('#s-sound', 'sound');
    if (DEV) {
      tog('#s-expl', 'explorer');
      $('#s-spawn').onclick = () => { close(); spawnSpecial(true); };
      $('#s-coins').onclick = () => { state.coins += 1000; save(); updateHUD(); toast('+1 000 CR crédités', 'gold'); };
    }
    $('#s-reset').onclick = () => { if (confirm('Effacer toute ta collection ?')) resetAll(); };
  });
}

// ----------------------------------------------------------------- Apparitions spéciales
function spawnSpecial(force) {
  if ([...feed.flights.values()].some(f => f.special)) { if (force) toast('Un contact historique est déjà sur le radar'); return; }
  const f = feed.spawnSpecial(me.lat, me.lon);
  sfx('appear'); toast(`CONTACT HISTORIQUE DÉTECTÉ : <b>${esc(f.model.name)}</b>`, 'gold', 4500);
  renderFlights(); updateBanner();
}
function updateBanner() {
  const f = [...feed.flights.values()].find(x => x.special), b = $('#special-banner');
  if (!f) { b.hidden = true; return; }
  const left = Math.max(0, Math.round((f.expires - Date.now()) / 1000));
  b.hidden = false;
  b.innerHTML = `<div class="sb-tag">ALERTE RADAR HISTORIQUE</div><b>${esc(f.model.code || f.model.id)} · ${esc(f.model.name)}</b><span>Fenêtre : ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} — Toucher pour verrouiller</span>`;
  b.onclick = () => { const [la, lo] = posAt(f); map.setView([la, lo], Math.max(map.getZoom(), 9)); setTimeout(() => select(f.id), 250); };
}
let lastSpawnCheck = Date.now();
function specialTick() {
  feed.pruneSpecial();
  updateBanner();
  if (Date.now() - lastSpawnCheck > 30000) {
    lastSpawnCheck = Date.now();
    if (Math.random() < 0.06) spawnSpecial();
  }
}

// ----------------------------------------------------------------- Tutoriel de première ouverture
function showOnboarding() {
  const slides = [
    { art: `<div class="ob-radar"><i></i><b style="--a:30deg;--r:38%"></b><b class="r" style="--a:150deg;--r:30%"></b><b class="e" style="--a:250deg;--r:42%"></b></div>`,
      title: 'Ton ciel est un terrain de chasse', text: 'Les vrais avions qui volent au-dessus de toi apparaissent en direct sur ton radar, avec leur compagnie, leur route et leur altitude.' },
    { art: `<div class="ob-vf"><div class="ob-vf-ring"></div><div class="ob-vf-cross"></div><div class="ob-vf-plane">${planeSVG('wide')}</div><span class="ob-vf-tag mono">AF ★ NET</span></div>`,
      title: 'Mise au point, déclic, Polaroïd', text: 'Touche un avion dans ton ciel et glisse la bague de mise au point tactile jusqu’à ce qu’il soit parfaitement net. Relâche pour déclencher le flash : ton Polaroïd pivote en carte 3D et glisse dans ta collection !' },
    { art: `<div class="ob-rar">${RARITY_LIST.map(r => `<span style="--rc:${r.color}">${r.code}</span>`).join('')}</div>`,
      title: 'Complète ton hangar', text: 'Commun, rare, épique… jusqu’aux légendaires comme le géant à double pont ou le supersonique Mach 2. Ouvre des packs, réussis tes missions et deviens le meilleur spotter.' },
    { art: `<div class="ob-pin">${iconSVG('locate')}</div>`,
      title: 'Active ta position', text: 'SkyDex a besoin de ta position pour savoir quels avions passent au-dessus de toi. Elle reste sur ton téléphone et n’est jamais partagée.', last: true },
  ];
  const el = document.createElement('div');
  el.className = 'onboard';
  $('#app').appendChild(el);
  let i = 0;
  const finish = useGeo => {
    state.onboarded = true; save();
    el.classList.add('out'); setTimeout(() => el.remove(), 400);
    if (useGeo) locate(true);
    else { placeMe(me.lat, me.lon, false); toast('Secteur radar par défaut : Paris · active ta position plus tard avec le bouton ◎'); }
  };
  const draw = () => {
    const s = slides[i];
    el.innerHTML = `
      <button class="ob-skip" id="ob-skip">${s.last ? '' : 'Passer'}</button>
      <div class="ob-art">${s.art}</div>
      <div class="ob-text"><h2>${s.title}</h2><p>${s.text}</p></div>
      <div class="ob-dots">${slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="ob-actions">
        ${s.last
          ? `<button class="btn gold block" id="ob-geo">Activer ma position</button><button class="btn ghost" id="ob-later">Plus tard</button>`
          : `<button class="btn gold block" id="ob-next">${i === 0 ? 'C’est parti' : 'Suivant'}</button>`}
      </div>`;
    sfx('tap');
    $('#ob-next', el) && ($('#ob-next', el).onclick = () => { i++; draw(); });
    $('#ob-skip', el).onclick = () => { if (!s.last) { i = slides.length - 1; draw(); } };
    $('#ob-geo', el) && ($('#ob-geo', el).onclick = () => finish(true));
    $('#ob-later', el) && ($('#ob-later', el).onclick = () => finish(false));
  };
  draw();
}

// ----------------------------------------------------------------- Démarrage
function init() {
  const now = Date.now();
  if (DEV && new URLSearchParams(location.search).has('showcase')) {
    const showcase = [
      { id: 'SR71', callsign: 'HABU01', airline: 'Vol spécial / exposition', reg: '61-7972', route: 'EDW → PMD' },
      { id: 'B2',   callsign: 'SPIRIT1', airline: 'Mission militaire', reg: '82-1066', route: 'WHL → WHL' },
      { id: 'A225', callsign: 'ADB225', airline: 'Antonov Airlines', reg: 'UR-82060', route: 'FRA → IST' },
      { id: 'A3ST', callsign: 'BGA114F', airline: 'Airbus Transport', reg: 'F-GSTA', route: 'TLS → HAM' },
      { id: 'A400', callsign: 'CTM2042', airline: 'Mission militaire', reg: 'F-RBAA', route: 'ORL → CDG' },
      { id: 'GLF6', callsign: 'N650GA', airline: 'Aviation privée', reg: 'N650GA', route: 'LHR → JFK' },
      { id: 'AT72', callsign: 'HOP312', airline: 'Air France HOP', reg: 'F-HOPX', route: 'ORY → NCE' },
      { id: 'BCS3', callsign: 'SWR638', airline: 'Swiss', reg: 'HB-JCA', route: 'ZRH → CDG' },
      { id: 'A388', callsign: 'UAE073', airline: 'Emirates', reg: 'A6-EOP', route: 'DXB → CDG' },
    ];
    for (const item of showcase) {
      state.cards[item.id] = {
        id: item.id,
        count: (state.cards[item.id]?.count || 1),
        first: now,
        last: now,
        best: { callsign: item.callsign, reg: item.reg, airline: item.airline, route: item.route, alt: 36000, speed: 460 },
      };
    }
    save();
  }
  for (const k of Object.keys(state.caught)) if (now - state.caught[k] > 24 * 3600 * 1000) delete state.caught[k];
  ensureMissions();
  initTabs(); initMap(); initAirports(); initCollection(); initSearch(); initFilters();
  $('#btn-locate').onclick = () => locate(false);
  $('#btn-settings').onclick = openSettings;
  onChange(() => updateHUD());
  feed.onUpdate(() => renderFlights());
  feed.start();
  if (state.onboarded) locate(true);
  else setTimeout(showOnboarding, 2600); // après l'écran d'accueil
  refreshAll();
  setInterval(renderFlights, 1000);
  setInterval(specialTick, 1000);
  setInterval(alertTick, 4000);
  setInterval(() => { if ($('#view-shop').classList.contains('active')) renderShop(); }, 60000);
}
init();

// Écran d'accueil
(function splash() {
  const sp = $('#splash'); if (!sp) return;
  $('.sp-plane', sp).innerHTML = planeSVG('wide');
  const go = () => { sp.classList.add('gone'); sfx('appear'); setTimeout(() => sp.remove(), 800); };
  setTimeout(go, 2400);
  sp.addEventListener('pointerdown', go, { once: true });
})();
