// Rencontre + capture « Spotter » :
// 1) L'avion réel vole dans un viseur téléobjectif / HUD de cockpit (nuages, traînées, télémétrie, turbulence).
// 2) Le joueur MAINTIENT pour verrouiller (bip radar qui s'accélère, réticule qui se resserre) et RELÂCHE dans la zone dorée.
// 3) Flash photo « SPOT ! » -> le cliché se développe façon Polaroid et se transforme en Carte 3D holographique manipulable.
import { RARITIES, ART_MAP, planeSVG } from './catalog.js';
import { state, save, owned, addCard, addXP, levelInfo, missionEvent } from './state.js';
import { cardHTML, cardBackHTML, cardArtSVG, attachSpinner } from './cards.js';
import { sfx, lockPulse, vibrate, burst, RAINBOW } from './fx.js';
import { playWalkout } from './cinematic.js';
import { $, $$, wait, toast, esc, iconSVG } from './ui.js';
import { FC, FA, fictionAirline, fictionCallsign } from './brand.js';

export const CATCH_RATE = { common: .97, uncommon: .92, rare: .85, epic: .75, legendary: .62 };
export const MAX_ATTEMPTS = 3;
export const CAUGHT_COOLDOWN = 6 * 3600 * 1000;

// Bonus de précision (timing dans la zone dorée) : réduit la part d'échec restante.
export const THROW_BONUS = { excellent: 0.55, great: 0.32, nice: 0.12 };
const THROW_LABEL = { excellent: 'SPOT PARFAIT !', great: 'SUPER SPOT !', nice: 'SPOT VALIDÉ !' };
const STARS = { excellent: '★★★', great: '★★☆', nice: '★☆☆' };

export function canCatchAgain(f) {
  const t = state.caught[f.id];
  return !t || Date.now() - t > CAUGHT_COOLDOWN;
}

const attempts = {};

function orbitsHTML(order) {
  const n = Math.max(0, Math.min(3, order - 1));
  const sats = k => '<i></i>'.repeat(k);
  let html = '';
  for (let i = 0; i < n; i++) {
    const ring = `<div class="orb-ring" style="--od:${7 + i * 2.6}s;--dir:${i % 2 ? -1 : 1}">${sats(i === 0 ? 2 : 1 + (order >= 3 ? 1 : 0))}</div>`;
    html += `<div class="orb back o${i + 1}">${ring}</div><div class="orb front o${i + 1}">${ring}</div>`;
  }
  if (order >= 4) {
    html += `<div class="enc-sparks">${Array.from({ length: 14 }, () =>
      `<b style="--x:${(Math.random() * 100).toFixed(0)}%;--d:${(Math.random() * 3).toFixed(2)}s;--s:${(0.6 + Math.random() * 0.8).toFixed(2)}"></b>`).join('')}</div>`;
  }
  return html;
}

function viewfinderPlaneHTML(model, f) {
  const art = !model.generic && ART_MAP[model.id];
  const airlineDisp = fictionAirline(f.airline, f.callsign);
  const callsignDisp = fictionCallsign(f.callsign);
  if (art) {
    const style = art.filter ? ` style="filter:${art.filter}"` : '';
    return `<div class="vf-art-wrap"><img class="vf-art-img" src="${art.src}" alt="${esc(model.name)}" draggable="false"${style}><div class="vf-art-tint"></div></div>`;
  }
  return `<div class="vf-art-wrap vf-art-svg">${cardArtSVG(model, { airline: airlineDisp, callsign: callsignDisp })}</div>`;
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
  const flStr = `FL${Math.max(10, Math.round((f.alt || 32000) / 100))}`;
  const spdStr = `${Math.round(f.gs || 440)} KT`;
  const hdgStr = `${String(Math.round(f.track || 0)).padStart(3, '0')}°`;
  const distStr = `${Math.max(1, Math.round(ctx.distKm || 12))} KM`;

  ov.innerHTML = `
    <button class="enc-flee" id="enc-back" aria-label="Retour au radar">✕</button>
    ${ctx.infoHTML ? '<button class="enc-infobtn" id="enc-infobtn" aria-label="Infos du vol">i</button>' : ''}
    <div class="enc-top">
      <div class="enc-rarity">${rarityTag}${isNew ? '<em>NOUVEAU</em>' : ''}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono">${esc(FC(f))}${f.airline ? ' · ' + esc(FA(f)) : ''}${routeStr ? ' · ' + esc(routeStr) : ''} · ${flStr}</div>
    </div>
    <div class="enc-stage" id="enc-stage" style="--ec:${r.color};--rc:${r.color};--lk:0">
      <div class="enc-aura"></div>
      ${r.order >= 3 ? '<div class="enc-rays"></div>' : ''}
      ${orbitsHTML(r.order)}

      <!-- PHASE 1 : Viseur optique / cockpit sur l'avion en vol -->
      <div class="enc-vf" id="enc-vf">
        <div class="vf-lens">
          <div class="vf-sky">
            <div class="vf-speedlines"></div>
            <div class="vf-cloud c1"></div>
            <div class="vf-cloud c2"></div>
            <div class="vf-ladder"><i></i><i></i><i></i></div>
          </div>
          <div class="vf-plane-rig" id="vf-rig">
            ${viewfinderPlaneHTML(model, f)}
            <div class="vf-contrail t1"></div>
            <div class="vf-contrail t2"></div>
            <div class="vf-plane-sil">${planeSVG(model)}</div>
          </div>
          <div class="vf-hud-top mono">
            <span>REC ● LIVE ADS-B</span>
            <span id="vf-zoom">ZOOM 1.0×</span>
          </div>
          <div class="vf-reticle" id="enc-reticle">
            <i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>
            <div class="vf-ring"></div>
            <div class="vf-cross"></div>
            <span class="vf-lock-pct mono" id="vf-pct">PRÊT</span>
          </div>
          <div class="vf-hud-bot mono">
            <span>${flStr}</span>
            <span>${spdStr}</span>
            <span>HDG ${hdgStr}</span>
            <span>${distStr}</span>
          </div>
          <div class="vf-polaroid-frame">
            <span class="mono">${esc(FC(f))} // ${esc(model.code || model.id)}</span>
          </div>
        </div>
      </div>

      <!-- PHASE 2 : Carte 3D holographique (révélée après le développement Polaroid) -->
      <div class="enc-card-persp" id="enc-card-persp">
        <div class="enc-card-3d" id="enc-card">
          <div class="showcase-3d-card" id="enc-spin">
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
          </div>
        </div>
      </div>
      <div class="throw-quality" id="throw-quality"></div>
    </div>

    <div class="cap-locks" id="cap-locks">
      <i data-step="1">01 · SIGNAL</i>
      <i data-step="2">02 · FOCUS</i>
      <i data-step="3">03 · SPOT</i>
    </div>

    <div class="enc-actions" id="enc-actions">
      ${blocked
        ? `<div class="enc-blocked-msg">${blocked}</div>`
        : `<div class="shutter-zone" id="shutter-zone">
            <div class="shutter-hint" id="shutter-hint">MAINTIENS pour verrouiller · RELÂCHE dans la <b>zone dorée</b></div>
            <div class="shutter-bar" id="shutter-bar">
              <div class="sb-fill" id="sb-fill"></div>
              <div class="sb-sweet" id="sb-sweet"><span>SPOT ★</span></div>
            </div>
            <div class="shutter" id="shutter" role="button" aria-label="Maintenir pour verrouiller puis relâcher dans la zone dorée">
              <svg class="sh-gauge" viewBox="0 0 120 120" aria-hidden="true">
                <circle class="g-track" cx="60" cy="60" r="52" pathLength="100"/>
                <circle class="g-zone" id="g-zone" cx="60" cy="60" r="52" pathLength="100"/>
                <circle class="g-prog" id="g-prog" cx="60" cy="60" r="52" pathLength="100"/>
              </svg>
              <div class="sh-core">
                <i class="sh-aperture"></i>
                <span id="sh-label">HOLD</span>
                <small id="sh-sub">VERROUILLER</small>
              </div>
            </div>
            <div class="beacon-rate mono" id="shutter-rate">CHANCE ${Math.round(baseRate * 100)} % · ZONE DORÉE = BONUS MAX</div>
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

  const stage = $('#enc-stage', ov), card = $('#enc-card', ov), vf = $('#enc-vf', ov), rig = $('#vf-rig', ov);
  const locksBox = $('#cap-locks', ov), locks = $$('i', locksBox);
  const spinner = attachSpinner($('#enc-spin', ov), { speed: 52, paused: true });

  // Si bloqué (déjà capturé ou hors portée) : on montre directement la carte 3D en mode consultation
  if (blocked) {
    stage.classList.add('live', 'card-mode');
    locksBox.hidden = true;
    spinner.resume();
  } else {
    stage.classList.add('live', 'vf-mode');
  }

  sfx(model.rarity === 'legendary' ? 'legend' : model.rarity === 'epic' ? 'epic' : 'appear');
  vibrate(r.order >= 3 ? [40, 30, 80] : 30);

  let busy = false, closed = false;
  const close = () => {
    closed = true;
    spinner.destroy();
    ov.hidden = true; ov.innerHTML = '';
    ctx.onClose && ctx.onClose();
  };
  $('#enc-back').onclick = () => { if (busy) return; sfx('tap'); close(); };
  if (blocked) return;

  // ------------------------------------------------------------ Mouvement de l'avion dans le viseur + Verrouillage
  const shutter = $('#shutter', ov), gProg = $('#g-prog', ov), gZone = $('#g-zone', ov);
  const sbFill = $('#sb-fill', ov), sbSweet = $('#sb-sweet', ov);
  const lab = $('#sh-label', ov), subLab = $('#sh-sub', ov), pctEl = $('#vf-pct', ov), zoomEl = $('#vf-zoom', ov);

  // Plus la rareté est haute, plus la zone dorée est exigeante et le balayage nerveux
  const ZONES = [[.58, .93], [.62, .92], [.66, .91], [.71, .90], [.75, .89]];
  const FILLS = [1850, 1700, 1520, 1360, 1220];
  const oi = Math.min(4, r.order), Z = ZONES[oi], FILL = FILLS[oi];

  gZone.style.strokeDasharray = `${((Z[1] - Z[0]) * 100).toFixed(1)} 100`;
  gZone.style.strokeDashoffset = String(-Z[0] * 100);
  if (sbSweet) {
    sbSweet.style.left = (Z[0] * 100).toFixed(1) + '%';
    sbSweet.style.width = ((Z[1] - Z[0]) * 100).toFixed(1) + '%';
  }

  let hold = null, raf = 0, wasZone = false;

  // Turbulence douce de l'avion en vol (se stabilise quand on verrouille)
  let driftRaf = 0;
  const driftLoop = now => {
    if (closed || !rig.isConnected) return;
    if (!stage.classList.contains('card-mode')) {
      const p = hold ? Math.min(1, (now - hold.t0) / FILL) : 0;
      const amp = (1 - p * 0.82) * (10 + oi * 4.5);
      const spd = 0.0018 + oi * 0.00045;
      const dx = Math.sin(now * spd) * amp + Math.cos(now * spd * 1.7) * (amp * 0.4);
      const dy = Math.cos(now * spd * 1.3) * (amp * 0.65);
      const bank = Math.sin(now * spd * 1.1) * (4 + oi * 1.8) * (1 - p * 0.75);
      rig.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${bank.toFixed(1)}deg) scale(${(1 + p * 0.14).toFixed(3)})`;
    }
    driftRaf = requestAnimationFrame(driftLoop);
  };
  driftRaf = requestAnimationFrame(driftLoop);

  const setP = p => {
    gProg.style.strokeDashoffset = String(100 - p * 100);
    if (sbFill) sbFill.style.width = (p * 100).toFixed(1) + '%';
    stage.style.setProperty('--lk', p.toFixed(3));
    if (pctEl) pctEl.textContent = p > 0 ? `LOCK ${Math.round(p * 100)}%` : 'PRÊT';
    if (zoomEl) zoomEl.textContent = `ZOOM ${(1 + p * 2.5).toFixed(1)}×`;
    locks[0]?.classList.toggle('on', p >= 0.22);
    locks[1]?.classList.toggle('on', p >= 0.50);
    locks[2]?.classList.toggle('on', p >= Z[0] && p <= Z[1]);
  };

  const qualityAt = p => (p >= Z[0] && p <= Z[1]) ? 'excellent' : ((p >= Z[0] - .14 && p < Z[0]) || p > Z[1]) ? 'great' : 'nice';

  function resetLock() {
    hold = null; cancelAnimationFrame(raf); wasZone = false; setP(0);
    shutter.classList.remove('held', 'inzone'); stage.classList.remove('locking', 'inzone');
    locks.forEach(l => (l.className = ''));
    lab.textContent = 'HOLD';
    if (subLab) subLab.textContent = 'VERROUILLER';
  }

  const tick = now => {
    if (!hold) return;
    const p = Math.min(1, (now - hold.t0) / FILL);
    setP(p);
    const inZ = p >= Z[0] && p <= Z[1];
    lockPulse(p, inZ);
    if (inZ !== wasZone) {
      wasZone = inZ;
      shutter.classList.toggle('inzone', inZ);
      stage.classList.toggle('inzone', inZ);
      lab.textContent = inZ ? 'SPOT !' : p > Z[1] ? 'TROP TARD' : 'LOCK…';
      if (subLab) subLab.textContent = inZ ? 'RELÂCHE !' : p > Z[1] ? 'VITE !' : 'MAINTIENS';
      if (inZ) vibrate([25, 15, 45]);
    }
    if (now - hold.lastV > 220 - p * 175) {
      hold.lastV = now;
      vibrate(8 + Math.round(p * 18));
    }
    if (p >= 1) { snap(1); return; }
    raf = requestAnimationFrame(tick);
  };

  const startHold = e => {
    if (busy || hold) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    hold = { t0: performance.now(), lastV: 0 };
    shutter.classList.add('held'); stage.classList.add('locking');
    lab.textContent = 'LOCK…';
    if (subLab) subLab.textContent = 'MAINTIENS';
    $('#shutter-hint')?.classList.add('gone');
    sfx('tap'); vibrate(15);
    raf = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (!hold) return;
    const dt = performance.now() - hold.t0;
    // Simple appui très bref (< 150 ms) : on guide le joueur à maintenir
    if (dt < 150) {
      resetLock();
      const h = $('#shutter-hint', ov);
      if (h) {
        h.classList.remove('gone', 'nudge'); void h.offsetWidth;
        h.innerHTML = 'MAINTIENS appuyé puis RELÂCHE dans la <b>zone dorée</b> !';
        h.classList.add('nudge');
      }
      return;
    }
    snap(Math.min(1, dt / FILL));
  };

  const cancelHold = () => {
    if (hold && !busy) { resetLock(); $('#shutter-hint')?.classList.remove('gone'); }
  };

  // On peut maintenir sur le bouton déclencheur OU directement sur le viseur optique
  [shutter, vf].forEach(el => {
    el.addEventListener('pointerdown', startHold);
    el.addEventListener('pointerup', endHold);
    el.addEventListener('pointercancel', cancelHold);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });

  async function snap(p) {
    if (busy || !hold) return;
    busy = true;
    const quality = qualityAt(p);
    hold = null; cancelAnimationFrame(raf);
    shutter.classList.remove('held'); shutter.classList.add('disabled');

    // Déclenchement photo : son d'obturateur + flash optique
    sfx('shutter'); vibrate(75);
    const flashEl = document.createElement('div'); flashEl.className = 'cam-flash'; ov.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 520);

    const qEl = $('#throw-quality', ov);
    qEl.textContent = THROW_LABEL[quality]; qEl.className = 'throw-quality show q-' + quality;
    stage.classList.add('snapped');

    const vR = vf.getBoundingClientRect();
    const cx = vR.left + vR.width / 2, cy = vR.top + vR.height / 2;
    burst(cx, cy, quality === 'excellent' ? ['#fde047', '#fff'] : [r.color, '#fff'], quality === 'excellent' ? 42 : 24, 0.95);

    await resolveCapture(quality, cx, cy);
  }

  async function resolveCapture(quality, cx, cy) {
    locks.forEach(l => (l.className = ''));
    attempts[f.id] = (attempts[f.id] || 0) + 1;
    const rate = Math.min(1, baseRate + (1 - baseRate) * THROW_BONUS[quality]);
    const ok = Math.random() < rate;

    // 3 vérifications télémétriques rapides (suspense du développement)
    const checks = ok ? 3 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < checks; i++) {
      vf.classList.remove('vf-pulse'); void vf.offsetWidth; vf.classList.add('vf-pulse');
      locks[i].classList.add('on');
      sfx('shake' + (i + 1)); vibrate(45);
      await wait(420);
    }
    vf.classList.remove('vf-pulse');
    $('#throw-quality', ov).className = 'throw-quality';

    if (ok) {
      locks.forEach(l => l.classList.add('win'));
      sfx('lock');
      await wait(140);

      // Développement Polaroid -> transformation en Carte 3D holographique !
      sfx('polaroid');
      stage.classList.add('developing');
      await wait(520);

      const flash = document.createElement('div'); flash.className = 'flash'; ov.appendChild(flash);
      burst(cx, cy, model.rarity === 'legendary' ? RAINBOW : [r.color, '#fff', '#fbbf24'], 85 + r.order * 22, 1.25 + r.order * 0.1);
      sfx('success'); vibrate([80, 40, 150]);

      const beforeLv = levelInfo();
      const res = addCard(model, { callsign: f.callsign, reg: f.reg, airline: f.airline, route: routeStr, alt: f.alt, speed: f.gs });
      state.caught[f.id] = Date.now();
      state.stats.captures++;
      missionEvent('capture', model);
      if (res.isNew) missionEvent('new', model); else missionEvent('dup', model);

      const qualityMult = quality === 'excellent' ? 1.5 : quality === 'great' ? 1.2 : 1;
      const xpGain = Math.round((res.isNew ? r.xp : Math.ceil(r.xp / 2)) * qualityMult);
      state.stats.combo = (state.stats.combo || 0) + 1;
      if (state.stats.combo >= 2) setTimeout(() => sfx('combo'), 260);
      const comboBonus = Math.min(state.stats.combo - 1, 5) * 5;
      const coinGain = Math.round(10 * (r.order + 1) * qualityMult) + comboBonus;
      state.coins += coinGain;
      const lv = addXP(xpGain);
      const afterLv = levelInfo();
      save();

      cancelAnimationFrame(driftRaf);
      locksBox.hidden = true;
      $('#tab-collection').classList.add('catch-pop');
      setTimeout(() => $('#tab-collection').classList.remove('catch-pop'), 700);
      ctx.onCaught && ctx.onCaught(f);
      showSummary(res, xpGain, coinGain, lv, quality, state.stats.combo, beforeLv, afterLv);
    } else {
      locks.forEach(l => l.classList.add('fail'));
      sfx('fail'); vibrate(200);
      burst(cx, cy, ['#ef4444', '#fff'], 26, 0.8);
      vf.classList.add('vf-glitch');
      const left = MAX_ATTEMPTS - attempts[f.id];
      const qEl = $('#throw-quality', ov);
      qEl.textContent = left > 0 ? 'FLOU ! IL A BOUGÉ' : 'SIGNAL PERDU…';
      qEl.className = 'throw-quality show q-fail';
      await wait(850);
      vf.classList.remove('vf-glitch');
      qEl.className = 'throw-quality';
      if (left > 0) {
        stage.classList.remove('snapped', 'developing');
        resetLock();
        shutter.classList.remove('disabled');
        $('#shutter-hint').classList.remove('gone');
        $('#shutter-hint').innerHTML = 'RECADRE · RELÂCHE dans la <b>zone dorée</b>';
        $('#shutter-rate', ov).textContent = `ENCORE ${left} ESSAI${left > 1 ? 'S' : ''} · VISE LA ZONE DORÉE`;
        busy = false;
      } else {
        vf.classList.add('vf-escape');
        await wait(650);
        delete attempts[f.id]; state.stats.combo = 0;
        state.caught[f.id] = Date.now() - CAUGHT_COOLDOWN + 10 * 60 * 1000;
        save();
        toast('L\'avion est sorti du viseur');
        ctx.onFled && ctx.onFled(f);
        busy = false;
        close();
      }
    }
  }

  function showSummary(res, xpGain, coinGain, lv, quality, combo, beforeLv, afterLv) {
    ov.classList.add('caught');
    $('.enc-top', ov).innerHTML = `
      <div class="enc-rarity">${res.isNew ? '✦ NOUVELLE CARTE DÉVELOPPÉE !' : `CLICHÉ ARCHIVÉ · ×${res.count}`}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono"><span class="sum-stars">${STARS[quality]}</span> ${THROW_LABEL[quality]} · ${esc(FC(f))}</div>`;

    // Bascule du viseur vers la Carte 3D holographique révélée en rotation
    stage.classList.remove('vf-mode', 'snapped', 'locking', 'inzone', 'developing');
    stage.classList.add('live', 'won', 'card-mode');
    card.className = 'enc-card-3d polaroid-in';
    spinner.resume(); spinner.setSpeed(48); spinner.boost(640);
    setTimeout(() => { if (card.isConnected) card.classList.remove('polaroid-in'); }, 950);

    const pct0 = Math.round((beforeLv.cur / beforeLv.need) * 100);
    const pct1 = Math.round((afterLv.cur / afterLv.need) * 100);
    const chips = [
      `<span class="rw-chip xp">+${xpGain} XP</span>`,
      `<span class="rw-chip">${iconSVG('coin')} +${coinGain} CR</span>`,
      combo >= 2 ? `<span class="rw-chip combo">🔥 SÉRIE ×${combo}</span>` : '',
      res.fragments ? `<span class="rw-chip frag">${iconSVG('frag')} +${res.fragments}</span>` : '',
    ].join('');

    $('#enc-actions', ov).innerHTML = `
      <div class="win-chips">${chips}</div>
      <div class="win-xp-box">
        <div class="win-xp-head mono">
          <span>FL ${afterLv.lvl} ${lv ? '· <b>NIVEAU SUPÉRIEUR !</b>' : ''}</span>
          <span>${afterLv.cur} / ${afterLv.need} XP</span>
        </div>
        <div class="win-xp-bar"><i id="win-xp-fill" style="width:${lv ? 0 : pct0}%"></i></div>
      </div>
      <div class="win-btns">
        <button class="btn gold block" id="enc-ok">Continuer la chasse</button>
        <button class="btn ghost block" id="enc-col">Voir dans mon hangar</button>
      </div>`;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = $('#win-xp-fill', ov);
        if (fill) fill.style.width = pct1 + '%';
      }, 90);
    });

    if (lv) {
      sfx('levelup');
      toast(`FL ${lv.levelUp} atteint · +${lv.coins} CR${lv.pack ? ' + 1 Booster' : ''}`, 'gold', 4000);
    }
    $('#enc-ok').onclick = () => { sfx('tap'); close(); };
    $('#enc-col').onclick = () => { close(); document.querySelector('[data-tab=collection]').click(); };
  }
}
