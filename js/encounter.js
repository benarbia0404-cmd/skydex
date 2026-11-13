// Rencontre + capture façon Pokémon Go : la carte arrive en tournant, entourée d'orbites selon la rareté,
// un cercle-cible se rétracte, le joueur glisse la « balise radar » vers la carte (ou la touche),
// la carte est aspirée dans la balise, 3 secousses, puis capture ou fuite.
import { RARITIES } from './catalog.js';
import { state, save, owned, addCard, addXP, missionEvent } from './state.js';
import { cardHTML, cardBackHTML, attachSpinner } from './cards.js';
import { sfx, vibrate, burst, RAINBOW } from './fx.js';
import { playWalkout } from './cinematic.js';
import { $, $$, wait, toast, esc, iconSVG } from './ui.js';
import { FC, FA } from './brand.js';

export const CATCH_RATE = { common: .97, uncommon: .92, rare: .85, epic: .75, legendary: .62 };
export const MAX_ATTEMPTS = 3;
export const CAUGHT_COOLDOWN = 6 * 3600 * 1000;

// Bonus de précision (cercle-cible) : réduit la part d'échec restante, sans jamais garantir une légendaire.
export const THROW_BONUS = { excellent: 0.5, great: 0.3, nice: 0.12 };
const THROW_LABEL = { excellent: 'EXCELLENT !', great: 'SUPER !', nice: 'BIEN !' };

export function canCatchAgain(f) {
  const t = state.caught[f.id];
  return !t || Date.now() - t > CAUGHT_COOLDOWN;
}

const attempts = {};

// Balise radar 3D : sphère de verre fumé, gyroscope doré qui tourne à l'intérieur, reflet spéculaire.
const BEACON_SVG = `<div class="bc-sphere">
    <i class="bc-gyro g1"></i><i class="bc-gyro g2"></i><i class="bc-gyro g3"></i>
    <i class="bc-core"></i>
    <i class="bc-gloss"></i>
  </div>`;

function orbitsHTML(order) {
  // 0 commune : simple halo · 1 peu commune : 1 orbite · 2 rare : 2 orbites · 3 épique : 3 · 4 légendaire : 3 + rayons + étincelles
  const n = Math.max(0, Math.min(3, order - 1)); // rare : 1 anneau · épique : 2 · légendaire : 3
  const sats = k => '<i></i>'.repeat(k);
  let html = '';
  for (let i = 0; i < n; i++) {
    const ring = `<div class="orb-ring" style="--od:${7 + i * 2.6}s;--dir:${i % 2 ? -1 : 1}">${sats(i === 0 ? 2 : 1 + (order >= 3 ? 1 : 0))}</div>`;
    html += `<div class="orb back o${i + 1}">${ring}</div><div class="orb front o${i + 1}">${ring}</div>`;
  }
  if (order >= 4) {
    html += `<div class="enc-sparks">${Array.from({ length: 14 }, (_, i) =>
      `<b style="--x:${(Math.random() * 100).toFixed(0)}%;--d:${(Math.random() * 3).toFixed(2)}s;--s:${(0.6 + Math.random() * 0.8).toFixed(2)}"></b>`).join('')}</div>`;
  }
  return html;
}

/**
 * ctx: { inRange, distKm, rangeKm, onCaught(f), onFled(f), onClose() }
 */
export async function openEncounter(f, ctx) {
  const model = f.model, r = RARITIES[model.rarity];
  if (r.order >= 3 || f.special) {
    await playWalkout(model);
  }
  const ov = $('#overlay');
  ov.hidden = false;
  ov.className = 'overlay enc capture2 ' + model.rarity;
  ov.style.setProperty('--ec', r.color);
  const isNew = !owned(model.id);
  const already = !canCatchAgain(f);

  let blocked = '';
  if (already) blocked = 'Déjà capturé sur ce vol · reviens plus tard';
  else if (!ctx.inRange) blocked = `Trop loin (${Math.round(ctx.distKm)} km) · portée ${ctx.rangeKm} km`;

  const routeStr = f.from && f.to ? `${f.from.code} → ${f.to.code}` : '';
  const baseRate = state.stats.captures < 3 ? 1 : CATCH_RATE[model.rarity];
  const rarityTag = r.order >= 4 ? `✦ ${r.label.toUpperCase()} ✦` : r.label.toUpperCase();

  ov.innerHTML = `
    <button class="enc-flee" id="enc-back" aria-label="Retour au radar">✕</button>
    ${ctx.infoHTML ? '<button class="enc-infobtn" id="enc-infobtn" aria-label="Infos du vol">i</button>' : ''}
    <div class="enc-top">
      <div class="enc-rarity">${rarityTag}${isNew ? '<em>NOUVEAU</em>' : ''}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono">${esc(FC(f))}${f.airline ? ' · ' + esc(FA(f)) : ''}${routeStr ? ' · ' + esc(routeStr) : ''} · FL${Math.round(f.alt / 100)}</div>
    </div>
    <div class="enc-stage" style="--ec:${r.color};--rc:${r.color}">
      <div class="enc-aura"></div>
      ${r.order >= 3 ? '<div class="enc-rays"></div>' : ''}
      ${orbitsHTML(r.order)}
      <div class="enc-target" id="enc-target"></div>
      <div class="enc-card-persp"><div class="enc-card-3d" id="enc-card"><div class="showcase-3d-card" id="enc-spin">
        <div class="showcase-face showcase-front">
          ${cardHTML(model, {
            reg: f.reg,
            callsign: f.callsign,
            airline: f.airline,
            route: routeStr,
            size: 'enc',
            isNew,
            count: owned(model.id) ? state.cards[model.id].count : 0,
          })}
        </div>
        <div class="showcase-face showcase-back">
          ${cardBackHTML('enc', model.rarity)}
        </div>
      </div></div></div>
      <div class="throw-quality" id="throw-quality"></div>
    </div>
    <div class="cap-locks" id="cap-locks" hidden><i></i><i></i><i></i></div>
    <div class="enc-actions" id="enc-actions">
      ${blocked
        ? `<div class="enc-blocked-msg">${blocked}</div>`
        : `<div class="beacon-zone" id="beacon-zone">
            <div class="beacon-hint" id="beacon-hint"><span class="bh-arrow">⌃</span> Glisse la balise vers la carte</div>
            <div class="beacon" id="beacon" role="button" aria-label="Lancer la balise radar">${BEACON_SVG}<i class="bc-shadow"></i></div>
            <div class="beacon-rate mono">CHANCE ${Math.round(baseRate * 100)} % · VISE QUAND LE CERCLE EST PETIT</div>
          </div>`}
    </div>`;

  if (ctx.infoHTML) {
    const panel = document.createElement('div');
    panel.className = 'enc-panel'; panel.hidden = true;
    ov.appendChild(panel);
    const openInfo = () => {
      panel.innerHTML = `<div class="enc-panel-in"><div class="enc-panel-head"><b>Infos du vol · ${esc(FC(f))}</b><button class="sh-close" id="enc-panel-x">✕</button></div>${ctx.infoHTML()}</div>`;
      panel.hidden = false; sfx('tap');
      $('#enc-panel-x', panel).onclick = () => { panel.hidden = true; };
    };
    panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });
    $('#enc-infobtn', ov).onclick = () => (panel.hidden ? openInfo() : (panel.hidden = true));
  }
  const stage = $('.enc-stage', ov), card = $('#enc-card', ov), target = $('#enc-target', ov);
  card.classList.add('entering');
  const spinner = attachSpinner($('#enc-spin', ov), { speed: 52, paused: true });
  sfx(model.rarity === 'legendary' ? 'legend' : model.rarity === 'epic' ? 'epic' : 'appear');
  vibrate(r.order >= 3 ? [40, 30, 80] : 30);
  setTimeout(() => {
    if (!card.isConnected) return;
    card.classList.remove('entering'); spinner.resume(); spinner.boost(420);
    stage.classList.add('live');
    const b = card.getBoundingClientRect();
    if (r.order >= 2) {
      burst(b.left + b.width / 2, b.top + b.height / 2, model.rarity === 'legendary' ? RAINBOW : [r.color, '#fff'], 18 + r.order * 12, 0.7 + r.order * 0.12);
      if (r.order >= 3) sfx('shimmer');
    }
  }, 900);

  let busy = false;
  const close = () => { ov.hidden = true; ov.innerHTML = ''; ctx.onClose && ctx.onClose(); };
  $('#enc-back').onclick = () => { if (busy) return; sfx('tap'); close(); };
  if (blocked) return;

  // ------------------------------------------------------------ Geste : glisser / toucher la balise
  const beacon = $('#beacon', ov);
  let drag = null;
  beacon.addEventListener('pointerdown', e => {
    if (busy) return;
    beacon.setPointerCapture(e.pointerId);
    drag = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, dy: 0, lastY: e.clientY, lastT: performance.now(), vy: 0 };
    beacon.classList.add('held');
    sfx('tap');
  });
  beacon.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
    const now = performance.now();
    drag.vy = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT);
    drag.lastY = e.clientY; drag.lastT = now;
    beacon.style.transform = `translate(${drag.dx}px, ${Math.min(30, drag.dy)}px) scale(1.08)`;
  });
  const release = () => {
    if (!drag) return;
    const d = drag; drag = null;
    beacon.classList.remove('held');
    const dist = Math.hypot(d.dx, d.dy), dt = performance.now() - d.t0;
    const isTap = dist < 12 && dt < 350;
    const isFlick = d.dy < -50 || d.vy < -0.6;
    if (isTap || isFlick) throwBeacon(d.dx);
    else { beacon.style.transition = 'transform .35s cubic-bezier(.3,1.6,.5,1)'; beacon.style.transform = ''; setTimeout(() => (beacon.style.transition = ''), 360); }
  };
  beacon.addEventListener('pointerup', release);
  beacon.addEventListener('pointercancel', release);
  // Toucher la carte = l'inspecter (on la saisit, on la fait pivoter). La capture se fait avec la balise.
  card.addEventListener('click', () => {
    const h = $('#beacon-hint', ov); if (!h || busy) return;
    h.classList.remove('nudge'); void h.offsetWidth; h.classList.add('nudge');
    beacon.classList.remove('nudge'); void beacon.offsetWidth; beacon.classList.add('nudge');
  });

  function readQuality() {
    // Taille courante du cercle-cible comparée à la carte : plus il est petit, meilleur est le lancer.
    const tb = target.getBoundingClientRect(), cb = card.getBoundingClientRect();
    const k = tb.width / Math.max(1, cb.height * 1.05);
    return k < 0.62 ? 'excellent' : k < 0.82 ? 'great' : 'nice';
  }

  async function throwBeacon(dx) {
    if (busy) return;
    busy = true;
    const quality = readQuality();
    target.classList.add('frozen');
    const ovR = ov.getBoundingClientRect();
    const bR = beacon.getBoundingClientRect(), cR = card.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'beacon flying';
    fly.innerHTML = BEACON_SVG;
    const sx = bR.left - ovR.left + ov.scrollLeft, sy = bR.top - ovR.top + ov.scrollTop;
    fly.style.left = sx + 'px'; fly.style.top = sy + 'px';
    ov.appendChild(fly);
    beacon.style.visibility = 'hidden';
    $('#beacon-hint')?.classList.add('gone');
    const tx = cR.left + cR.width / 2 - bR.left - bR.width / 2;
    const ty = cR.top + cR.height / 2 - bR.top - bR.height / 2;
    const curve = Math.max(-60, Math.min(60, dx * 0.4));
    sfx('whoosh');
    const anim = fly.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: `translate(${tx * 0.5 + curve}px, ${ty * 0.55 - 90}px) scale(.82) rotate(300deg)`, offset: 0.55 },
      { transform: `translate(${tx}px, ${ty}px) scale(.6) rotate(560deg)` },
    ], { duration: 680, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    await anim.finished;
    // On fige la balise à sa position d'arrivée (sans transform) pour que les secousses CSS s'appliquent proprement
    fly.style.left = (sx + tx) + 'px'; fly.style.top = (sy + ty) + 'px';
    fly.classList.add('landed');
    anim.cancel();

    // Impact : qualité du lancer + flash + la carte est aspirée dans la balise
    const qEl = $('#throw-quality', ov);
    qEl.textContent = THROW_LABEL[quality]; qEl.className = 'throw-quality show q-' + quality;
    sfx('impact'); vibrate(60);
    const cx = cR.left + cR.width / 2, cy = cR.top + cR.height / 2;
    burst(cx, cy, quality === 'excellent' ? ['#fde047', '#fff'] : [r.color, '#fff'], quality === 'excellent' ? 40 : 22, 0.9);
    card.classList.remove('spinning', 'entering', 'popout');
    card.classList.add('absorbing');
    stage.classList.remove('live');
    stage.classList.add('sealed');
    await wait(560);
    await shakeAndResolve(fly, quality, cx, cy);
  }

  async function shakeAndResolve(fly, quality, cx, cy) {
    const locksBox = $('#cap-locks', ov), locks = $$('i', locksBox);
    locks.forEach(l => (l.className = ''));
    locksBox.hidden = false;
    attempts[f.id] = (attempts[f.id] || 0) + 1;
    const rate = Math.min(1, baseRate + (1 - baseRate) * THROW_BONUS[quality]);
    const ok = Math.random() < rate;
    // Suspense : 3 secousses (la 3e n'arrive que si la capture tient)
    const shakes = ok ? 3 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shakes; i++) {
      fly.classList.remove('wobble'); void fly.offsetWidth; fly.classList.add('wobble');
      locks[i].classList.add('on');
      sfx('shake' + (i + 1)); vibrate(55);
      await wait(i < 2 ? 900 : 950);
    }
    fly.classList.remove('wobble');
    $('#throw-quality', ov).className = 'throw-quality';

    if (ok) {
      locks.forEach(l => l.classList.add('win'));
      fly.classList.add('locked');
      sfx('lock');
      await wait(180);
      const flash = document.createElement('div'); flash.className = 'flash'; ov.appendChild(flash);
      burst(cx, cy, model.rarity === 'legendary' ? RAINBOW : [r.color, '#fff', '#fbbf24'], 80 + r.order * 20, 1.2 + r.order * 0.1);
      sfx('success'); vibrate([80, 40, 140]);
      const res = addCard(model, { callsign: f.callsign, reg: f.reg, airline: f.airline, route: routeStr, alt: f.alt, speed: f.gs });
      state.caught[f.id] = Date.now();
      state.stats.captures++;
      missionEvent('capture', model);
      if (res.isNew) missionEvent('new', model); else missionEvent('dup', model);
      const xpGain = res.isNew ? r.xp : Math.ceil(r.xp / 2);
      const coinGain = 10 * (r.order + 1);
      state.coins += coinGain;
      const lv = addXP(xpGain);
      save();
      await wait(650);
      fly.remove();
      locksBox.hidden = true;
      $('#tab-collection').classList.add('catch-pop');
      setTimeout(() => $('#tab-collection').classList.remove('catch-pop'), 700);
      ctx.onCaught && ctx.onCaught(f);
      showSummary(res, xpGain, coinGain, lv, quality);
    } else {
      locks.forEach(l => l.classList.add('fail'));
      sfx('fail'); vibrate(200);
      // La balise s'ouvre, la carte ressort
      fly.classList.add('burst-open');
      burst(cx, cy, ['#ef4444', '#fff'], 26, 0.8);
      card.classList.remove('absorbing'); card.classList.add('popout');
      stage.classList.remove('sealed');
      const left = MAX_ATTEMPTS - attempts[f.id];
      const qEl = $('#throw-quality', ov);
      qEl.textContent = left > 0 ? 'IL S\'EST ÉCHAPPÉ !' : 'SIGNAL PERDU…';
      qEl.className = 'throw-quality show q-fail';
      await wait(900);
      fly.remove();
      locksBox.hidden = true;
      qEl.className = 'throw-quality';
      if (left > 0) {
        card.classList.remove('popout'); spinner.boost(600);
        stage.classList.add('live');
        target.classList.remove('frozen');
        beacon.style.visibility = ''; beacon.style.transform = '';
        $('.beacon-rate', ov).textContent = `ENCORE ${left} ESSAI${left > 1 ? 'S' : ''} · VISE LE PETIT CERCLE`;
        busy = false;
      } else {
        card.classList.remove('popout'); card.classList.add('escape');
        await wait(750);
        delete attempts[f.id];
        state.caught[f.id] = Date.now() - CAUGHT_COOLDOWN + 10 * 60 * 1000; // revient dans 10 min
        save();
        toast('L\'avion s\'est échappé du radar');
        ctx.onFled && ctx.onFled(f);
        busy = false;
        close();
      }
    }
  }

  function showSummary(res, xpGain, coinGain, lv, quality) {
    ov.classList.add('caught');
    $('.enc-top', ov).innerHTML = `
      <div class="enc-rarity">${res.isNew ? 'NOUVELLE CARTE !' : `DOUBLON ×${res.count}`}</div>
      <h2>${esc(model.name)} capturé !</h2>
      <div class="enc-sub mono">${THROW_LABEL[quality]} · ${esc(FC(f))}</div>`;
    // La carte réapparaît, révélée et en rotation, pour savourer la capture
    card.className = 'enc-card-3d reveal';
    stage.classList.remove('sealed');
    stage.classList.add('live', 'won');
    setTimeout(() => { if (card.isConnected) card.classList.remove('reveal'); }, 900); spinner.boost(700);
    const chips = [
      `<span class="rw-chip">+${xpGain} XP</span>`,
      `<span class="rw-chip">${iconSVG('coin')} +${coinGain}</span>`,
      res.fragments ? `<span class="rw-chip">${iconSVG('frag')} +${res.fragments}</span>` : '',
    ].join('');
    $('#enc-actions', ov).innerHTML = `
      <div class="win-chips">${chips}</div>
      <button class="btn gold block" id="enc-ok">Continuer la chasse</button>
      <button class="btn ghost" id="enc-col">Voir ma collection</button>`;
    if (lv) {
      sfx('levelup');
      toast(`FL ${lv.levelUp} atteint · +${lv.coins} CR${lv.pack ? ' + 1 Booster' : ''}`, 'gold', 4000);
    }
    $('#enc-ok').onclick = () => { sfx('tap'); close(); };
    $('#enc-col').onclick = () => { close(); document.querySelector('[data-tab=collection]').click(); };
  }
}
