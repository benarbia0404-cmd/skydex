// Capture de carte SkyDex (Format Vraie Carte Verticale 5:7 Full-Art inspiré de Kyara) :
// 1) La vraie carte verticale apparaît à l'écran avec l'avion en vol dans sa fenêtre Full-Art.
// 2) Le joueur ajuste la bague de mise au point (ou maintient le déclencheur) pour cadrer et rendre l'avion net dans la carte.
// 3) Déclic mécanique net + retour haptique + flash lumineux -> l'avion se fige dans la carte collector.
// 4) La carte pivote en 3D pour révéler ses statistiques complètes, puis une vraie carte miniature glisse vers l'onglet Collection.
import { RARITIES, ART_MAP, planeSVG } from './catalog.js';
import { state, save, owned, addCard, addXP, levelInfo, missionEvent } from './state.js';
import { cardHTML, cardBackHTML, cardArtSVG, attachSpinner, liveryOf, serialOf, kindOf } from './cards.js';
import { sfx, startWindAmbience, stopWindAmbience, vibrate, burst } from './fx.js';
import { $, $$, wait, toast, esc, iconSVG } from './ui.js';
import { FC, FA, fictionAirline, fictionCallsign } from './brand.js';

export const CATCH_RATE = { common: .98, uncommon: .94, rare: .88, epic: .80, legendary: .70 };
export const MAX_ATTEMPTS = 3;
export const CAUGHT_COOLDOWN = 6 * 3600 * 1000;

export const THROW_BONUS = { excellent: 0.65, great: 0.40, nice: 0.18 };
const THROW_LABEL = { excellent: 'CADRAGE PARFAIT', great: 'MISE AU POINT NETTE', nice: 'CARTE CAPTURÉE' };
const STARS = { excellent: '★★★', great: '★★☆', nice: '★☆☆' };

export function canCatchAgain(f) {
  const t = state.caught[f.id];
  return !t || Date.now() - t > CAUGHT_COOLDOWN;
}

const attempts = {};

function liveCardArtHTML(model, f) {
  const art = !model.generic && ART_MAP[model.id];
  const airlineDisp = fictionAirline(f.airline, f.callsign);
  const callsignDisp = fictionCallsign(f.callsign);
  if (art) {
    const style = art.filter ? ` style="filter:${art.filter}"` : '';
    return `<div class="vc-art-wrap">
      <img class="vc-art-img" src="assets/planes/${art.src}" alt="${esc(model.name)}" draggable="false"${style}>
      <div class="vc-glint"></div>
    </div>`;
  }
  return `<div class="vc-art-wrap">
    ${cardArtSVG(model, { airline: airlineDisp, callsign: callsignDisp })}
    <div class="vc-glint"></div>
  </div>`;
}

/** Fait glisser une vraie carte verticale miniature jusque dans le bouton Collection. */
function flyCardToCollection(model, r, f, fromRect) {
  const tabBtn = $('#tab-collection');
  if (!tabBtn || !fromRect) return;
  const toRect = tabBtn.getBoundingClientRect();
  const mini = document.createElement('div');
  mini.className = 'flying-card-mini';
  mini.style.setProperty('--rc', r.color);
  mini.style.left = (fromRect.left + fromRect.width / 2 - 46) + 'px';
  mini.style.top = (fromRect.top + fromRect.height / 2 - 66) + 'px';
  mini.innerHTML = `
    <div class="fcm-art">${liveCardArtHTML(model, f)}</div>
    <div class="fcm-plate">
      <span class="fcm-rar" style="background:${r.color}">${esc(r.code)}</span>
      <b class="mono">${esc(model.code || model.id)}</b>
    </div>`;
  document.body.appendChild(mini);

  const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
  const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

  sfx('slideToHangar');
  const anim = mini.animate([
    { transform: 'translate(0, 0) scale(1) rotate(-3deg)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.25 - 60}px) scale(0.84) rotate(6deg)`, opacity: 1, offset: 0.48 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.18) rotate(12deg)`, opacity: 0.15 },
  ], { duration: 740, easing: 'cubic-bezier(.22, .9, .32, 1)', fill: 'forwards' });

  anim.onfinish = () => {
    mini.remove();
    tabBtn.classList.remove('catch-pop'); void tabBtn.offsetWidth;
    tabBtn.classList.add('catch-pop');
    vibrate([25, 30, 50]);
    const badge = document.createElement('div');
    badge.className = 'tab-rar-pop mono';
    badge.style.setProperty('--rc', r.color);
    badge.textContent = `+1 ${r.label.toUpperCase()}`;
    tabBtn.appendChild(badge);
    setTimeout(() => badge.remove(), 1400);
  };
}

/**
 * ctx: { inRange, distKm, rangeKm, onCaught(f), onFled(f), onClose() }
 */
export async function openEncounter(f, ctx) {
  const model = f.model, r = RARITIES[model.rarity] || RARITIES.common;
  const ov = $('#overlay');
  ov.hidden = false;
  ov.className = 'overlay enc capture2 ' + model.rarity;
  ov.style.setProperty('--ec', r.color);
  const isNew = !owned(model.id);
  const already = !canCatchAgain(f);

  let blocked = '';
  if (already) blocked = 'Déjà capturé sur ce vol · reviens plus tard';
  else if (!ctx.inRange) blocked = `Hors de ta zone (${Math.round(ctx.distKm)} km) · rayon actif ${ctx.rangeKm} km`;

  const routeStr = f.from && f.to ? `${f.from.code} → ${f.to.code}` : '';
  const baseRate = state.stats.captures < 3 ? 1 : (CATCH_RATE[model.rarity] ?? 0.88);
  const rarityTag = r.label.toUpperCase();
  const flStr = `FL${Math.max(10, Math.round((f.alt || 32000) / 100))}`;
  const spdStr = `${Math.round((f.gs || 440) * 1.852)} KM/H`;
  const distStr = `${Math.max(1, Math.round(ctx.distKm || 12))} KM`;
  const liv = liveryOf(FA(f), model);
  const serial = String(serialOf(model.id)).padStart(3, '0');

  ov.innerHTML = `
    <button class="enc-flee" id="enc-back" aria-label="Retour au radar">✕</button>
    ${ctx.infoHTML ? '<button class="enc-infobtn" id="enc-infobtn" aria-label="Infos du vol">i</button>' : ''}
    <div class="enc-top">
      <div class="enc-rarity"><span class="er-dot" style="background:${r.color}"></span>${rarityTag}${isNew ? '<em>NOUVELLE CARTE</em>' : ''}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono">${esc(FC(f))}${f.airline ? ' · ' + esc(FA(f)) : ''}${routeStr ? ' · ' + esc(routeStr) : ''} · ${ distStr }</div>
    </div>

    <div class="enc-stage" id="enc-stage" style="--ec:${r.color};--rc:${r.color};--lk:0;--blur:5.5px">
      <!-- PHASE 1 : VRAIE CARTE VERTICALE (Ratio 5:7) EN COURS DE CADRAGE -->
      <div class="enc-vf" id="enc-vf">
        <div class="vcard-viewfinder" style="--rc:${r.color};--lc1:${liv.c1};--lc2:${liv.c2}">
          <div class="vcv-inner">
            <!-- Ciel et avion en mouvement dans la carte verticale -->
            <div class="vcv-art">
              <div class="vf-plane-rig" id="vf-rig">
                ${liveCardArtHTML(model, f)}
              </div>
              <div class="vcv-shade"></div>
            </div>

            <!-- En-tête de la carte verticale -->
            <div class="kyara-top-overlay">
              <div class="kyara-top-row">
                <span class="kyara-rar-pill">
                  <i class="kr-dot" style="background:${r.color}"></i>
                  <b>${rarityTag}</b>
                </span>
                <span class="kyara-serial mono">#${serial}</span>
              </div>
              <div class="kyara-livery-row">
                <div class="c-livery-pill">
                  <span class="c-livery-tail"></span>
                  <span class="c-livery-name">${esc(liv.label)}</span>
                </div>
                <span class="c-flight-pill mono">${esc(FC(f))}</span>
              </div>
            </div>

            <!-- Cadre de mise au point optique au centre de la carte verticale -->
            <div class="vf-reticle" id="enc-reticle">
              <i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>
              <div class="vf-ring"></div>
              <div class="vf-cross"></div>
              <span class="vf-lock-pct mono" id="vf-pct">CADRAGE REQUIS</span>
            </div>

            <!-- Plaque inférieure de la carte verticale -->
            <div class="kyara-plate">
              <div class="kp-livery-accent"></div>
              <div class="kp-head">
                <div class="kp-titles">
                  <span class="kp-kicker">${esc(routeStr ? `${liv.label} · ${routeStr}` : `${model.maker} · ${kindOf(model)}`)}</span>
                  <h3 class="kp-name">${esc(model.name)}</h3>
                </div>
                <span class="kp-icao mono">${esc(model.code || model.id)}</span>
              </div>
              <div class="kp-stats mono">
                <div class="kp-stat"><small>ALTITUDE</small><b>${flStr}</b></div>
                <div class="kp-stat"><small>VITESSE</small><b>${spdStr}</b></div>
                <div class="kp-stat"><small>NETTETÉ</small><b id="vf-zoom">18%</b></div>
              </div>
            </div>
          </div>
          <div class="vf-iris" id="vf-iris"></div>
        </div>
      </div>

      <!-- PHASE 2 : CARTE COLLECTOR 3D INTERACTIVE (Ratio 5:7) -->
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
      <i data-step="1">01 · CADRAGE</i>
      <i data-step="2">02 · NETTETÉ</i>
      <i data-step="3">03 · CAPTURE</i>
    </div>

    <div class="enc-actions" id="enc-actions">
      ${blocked
        ? `<div class="enc-blocked-msg">${blocked}</div>`
        : `<div class="focus-zone" id="focus-zone">
            <div class="shutter-hint" id="shutter-hint">Glisse la <b>bague de mise au point</b> dans la zone <b>NET ★</b> puis relâche pour capturer la carte</div>
            <div class="focus-ring-ctrl" id="focus-dial" role="slider" aria-label="Bague de mise au point">
              <div class="frc-scale mono">
                <span>FLOU</span><span>CADRAGE</span><span>NET ★</span><span>INFINI</span>
              </div>
              <div class="frc-track">
                <div class="frc-knurl"></div>
                <div class="frc-sweet" id="frc-sweet"><span>NET ★</span></div>
                <div class="frc-thumb" id="frc-thumb">
                  <i></i><i></i><i></i>
                  <span class="mono" id="frc-val">18%</span>
                </div>
              </div>
            </div>
            <div class="beacon-rate mono" id="shutter-rate">NETTETÉ <b id="sharp-pct">18%</b> · RELÂCHE POUR PRENDRE LA CARTE</div>
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
  const spinner = attachSpinner($('#enc-spin', ov), { speed: 44, paused: true });

  if (blocked) {
    stage.classList.add('live', 'card-mode');
    locksBox.hidden = true;
    spinner.resume();
  } else {
    stage.classList.add('live', 'vf-mode');
    startWindAmbience();
  }

  sfx(model.rarity === 'legendary' ? 'legend' : model.rarity === 'epic' ? 'epic' : 'appear');
  vibrate(r.order >= 3 ? [40, 30, 80] : 30);

  let busy = false, closed = false;
  const close = () => {
    closed = true;
    stopWindAmbience();
    spinner.destroy();
    ov.hidden = true; ov.innerHTML = '';
    ctx.onClose && ctx.onClose();
  };
  $('#enc-back').onclick = () => { if (busy) return; sfx('tap'); close(); };
  if (blocked) return;

  const dial = $('#focus-dial', ov), sweetEl = $('#frc-sweet', ov), thumbEl = $('#frc-thumb', ov);
  const valEl = $('#frc-val', ov), sharpEl = $('#sharp-pct', ov);
  const pctEl = $('#vf-pct', ov), zoomEl = $('#vf-zoom', ov);

  const TOL = 0.14;
  let targetF = 0.64 + (Math.random() * 0.14 - 0.07);
  let curF = 0.14;
  let dragging = false, startX = 0, startF = 0, lastDetent = Math.round(curF * 30), wasInZone = false;

  function renderFocusState() {
    const dist = Math.abs(curF - targetF);
    const sharpness = Math.max(0, Math.min(1, 1 - dist / 0.55));
    const inZ = dist <= TOL;
    const nearZ = dist <= TOL * 1.85;
    const blurPx = inZ ? 0 : Math.max(0.3, ((dist - TOL * 0.45) * 12));

    stage.style.setProperty('--lk', sharpness.toFixed(3));
    stage.style.setProperty('--blur', blurPx.toFixed(2) + 'px');
    if (thumbEl) thumbEl.style.left = (curF * 100).toFixed(1) + '%';
    if (sweetEl) {
      sweetEl.style.left = ((targetF - TOL) * 100).toFixed(1) + '%';
      sweetEl.style.width = (TOL * 200).toFixed(1) + '%';
    }
    const spPct = Math.round(sharpness * 100);
    if (valEl) valEl.textContent = `${spPct}%`;
    if (sharpEl) sharpEl.textContent = `${spPct}%`;
    if (zoomEl) zoomEl.textContent = `${spPct}%`;
    if (pctEl) {
      pctEl.textContent = inZ ? '● CARTE NETTE · RELÂCHE !' : nearZ ? 'PRESQUE CADRÉ…' : 'GLISSE POUR CADRER';
    }

    locks[0]?.classList.toggle('on', sharpness >= 0.45);
    locks[1]?.classList.toggle('on', nearZ);
    locks[2]?.classList.toggle('on', inZ);

    stage.classList.toggle('inzone', inZ);
    dial.classList.toggle('inzone', inZ);

    if (inZ !== wasInZone) {
      wasInZone = inZ;
      if (inZ && dragging) {
        sfx('focusLock');
        vibrate([22, 18, 42]);
      }
    }
  }

  let driftRaf = 0;
  const driftLoop = now => {
    if (closed || !rig.isConnected) return;
    if (!stage.classList.contains('card-mode')) {
      const dist = Math.abs(curF - targetF);
      const sharp = Math.max(0, Math.min(1, 1 - dist / 0.55));
      const amp = (1 - sharp * 0.85) * 11;
      const spd = 0.0018;
      const dx = Math.sin(now * spd) * amp;
      const dy = Math.cos(now * spd * 1.25) * (amp * 0.65);
      const bank = Math.sin(now * spd * 1.1) * 3.5 * (1 - sharp * 0.8);
      rig.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${bank.toFixed(1)}deg) scale(${(1.02 + sharp * 0.08).toFixed(3)})`;
    }
    driftRaf = requestAnimationFrame(driftLoop);
  };
  renderFocusState();
  driftRaf = requestAnimationFrame(driftLoop);

  const onDown = e => {
    if (busy || dragging) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    dragging = true;
    startX = e.clientX;
    startF = curF;
    stage.classList.add('locking');
    dial.classList.add('held');
    $('#shutter-hint')?.classList.add('gone');
    const rect = dial.getBoundingClientRect();
    if (e.currentTarget === dial && rect.width > 0) {
      curF = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / rect.width));
      startF = curF;
    }
    sfx('focusClick'); vibrate(10);
    renderFocusState();
  };

  const onMove = e => {
    if (!dragging || busy) return;
    const rect = dial.getBoundingClientRect();
    const span = Math.max(180, rect.width || 260);
    if (e.currentTarget === dial) {
      curF = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / span));
    } else {
      const dx = e.clientX - startX;
      curF = Math.max(0.04, Math.min(0.96, startF + dx / (span * 0.85)));
    }
    const detent = Math.round(curF * 30);
    if (detent !== lastDetent) {
      lastDetent = detent;
      sfx('focusClick');
      vibrate(7);
    }
    renderFocusState();
  };

  const onUp = () => {
    if (!dragging || busy) return;
    dragging = false;
    dial.classList.remove('held');
    const dist = Math.abs(curF - targetF);
    if (dist > TOL * 2.6 && curF < 0.24) {
      stage.classList.remove('locking');
      const h = $('#shutter-hint', ov);
      if (h) {
        h.classList.remove('gone', 'nudge'); void h.offsetWidth;
        h.innerHTML = 'Glisse le curseur dans le repère <b>NET ★</b> pour capturer la carte !';
        h.classList.add('nudge');
      }
      return;
    }
    snapPhoto(dist);
  };

  const onCancel = () => {
    if (!dragging || busy) return;
    dragging = false;
    dial.classList.remove('held');
    stage.classList.remove('locking');
  };

  [dial, vf].forEach(el => {
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });

  async function snapPhoto(dist) {
    if (busy) return;
    busy = true;
    const quality = dist <= TOL ? 'excellent' : dist <= TOL * 1.9 ? 'great' : 'nice';
    dial.classList.add('disabled');

    stage.style.setProperty('--blur', '0px');
    sfx('shutter');
    vibrate([35, 20, 75]);
    $('#vf-iris', ov)?.classList.add('blink');

    const flashEl = document.createElement('div');
    flashEl.className = 'cam-flash';
    ov.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 520);

    const qEl = $('#throw-quality', ov);
    qEl.textContent = THROW_LABEL[quality];
    qEl.className = 'throw-quality show q-' + quality;
    stage.classList.add('snapped');

    const vR = vf.getBoundingClientRect();
    const cx = vR.left + vR.width / 2, cy = vR.top + vR.height / 2;
    burst(cx, cy, ['#f8fafc', r.color], 18, 0.8);

    await resolveCapture(quality, cx, cy, vR);
  }

  async function resolveCapture(quality, cx, cy, vR) {
    locks.forEach(l => (l.className = ''));
    attempts[f.id] = (attempts[f.id] || 0) + 1;
    const rate = Math.min(1, baseRate + (1 - baseRate) * THROW_BONUS[quality]);
    const ok = Math.random() < rate;

    const checks = ok ? 3 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < checks; i++) {
      vf.classList.remove('vf-pulse'); void vf.offsetWidth; vf.classList.add('vf-pulse');
      locks[i].classList.add('on');
      sfx('shake' + (i + 1)); vibrate(35);
      await wait(320);
    }
    vf.classList.remove('vf-pulse');
    $('#throw-quality', ov).className = 'throw-quality';

    if (ok) {
      stopWindAmbience();
      locks.forEach(l => l.classList.add('win'));
      sfx('lock');
      await wait(140);

      sfx('polaroid');
      stage.classList.add('developing');
      await wait(440);

      const flash = document.createElement('div'); flash.className = 'flash'; ov.appendChild(flash);
      burst(cx, cy, [r.color, '#f8fafc', '#f59e0b'], 26, 0.9);
      sfx('success'); vibrate([70, 35, 130]);

      const beforeLv = levelInfo();
      const res = addCard(model, { callsign: f.callsign, reg: f.reg, airline: f.airline, route: routeStr, alt: f.alt, speed: f.gs });
      state.caught[f.id] = Date.now();
      state.stats.captures++;
      missionEvent('capture', model);
      if (res.isNew) missionEvent('new', model); else missionEvent('dup', model);

      const qualityMult = quality === 'excellent' ? 1.5 : quality === 'great' ? 1.2 : 1;
      const xpGain = Math.round((res.isNew ? r.xp : Math.ceil(r.xp / 2)) * qualityMult);
      state.stats.combo = (state.stats.combo || 0) + 1;
      if (state.stats.combo >= 2) setTimeout(() => sfx('combo'), 240);
      const comboBonus = Math.min(state.stats.combo - 1, 5) * 5;
      const coinGain = Math.round(10 * (r.order + 1) * qualityMult) + comboBonus;
      state.coins += coinGain;
      const lv = addXP(xpGain);
      const afterLv = levelInfo();
      save();

      cancelAnimationFrame(driftRaf);
      locksBox.hidden = true;
      ctx.onCaught && ctx.onCaught(f);

      setTimeout(() => flyCardToCollection(model, r, f, vR), 380);

      showSummary(res, xpGain, coinGain, lv, quality, state.stats.combo, beforeLv, afterLv, vR);
    } else {
      locks.forEach(l => l.classList.add('fail'));
      sfx('fail'); vibrate(180);
      burst(cx, cy, ['#ef4444', '#fff'], 20, 0.8);
      vf.classList.add('vf-glitch');
      const left = MAX_ATTEMPTS - attempts[f.id];
      const qEl = $('#throw-quality', ov);
      qEl.textContent = left > 0 ? 'CADRAGE MANQUÉ' : 'AVION HORS DE PORTÉE';
      qEl.className = 'throw-quality show q-fail';
      await wait(780);
      vf.classList.remove('vf-glitch');
      $('#vf-iris', ov)?.classList.remove('blink');
      qEl.className = 'throw-quality';
      if (left > 0) {
        stage.classList.remove('snapped', 'developing', 'locking');
        curF = 0.14;
        targetF = 0.58 + Math.random() * 0.22;
        renderFocusState();
        dial.classList.remove('disabled');
        $('#shutter-hint').classList.remove('gone');
        $('#shutter-hint').innerHTML = `Encore ${left} essai${left > 1 ? 's' : ''} · Aligne la bague sur <b>NET ★</b>`;
        busy = false;
      } else {
        stopWindAmbience();
        vf.classList.add('vf-escape');
        await wait(600);
        delete attempts[f.id]; state.stats.combo = 0;
        state.caught[f.id] = Date.now() - CAUGHT_COOLDOWN + 10 * 60 * 1000;
        save();
        toast('L\'avion a quitté le cadre');
        ctx.onFled && ctx.onFled(f);
        busy = false;
        close();
      }
    }
  }

  function showSummary(res, xpGain, coinGain, lv, quality, combo, beforeLv, afterLv, vR) {
    ov.classList.add('caught');
    $('.enc-top', ov).innerHTML = `
      <div class="enc-rarity"><span class="er-dot" style="background:${r.color}"></span>${res.isNew ? 'NOUVELLE CARTE AJOUTÉE' : `CARTE AMÉLIORÉE · ×${res.count}`}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono"><span class="sum-stars">${STARS[quality]}</span> ${THROW_LABEL[quality]} · ${esc(FC(f))}</div>`;

    stage.classList.remove('vf-mode', 'snapped', 'locking', 'inzone', 'developing');
    stage.classList.add('live', 'won', 'card-mode');
    card.className = 'enc-card-3d polaroid-in';
    spinner.resume(); spinner.setSpeed(36); spinner.boost(740);
    setTimeout(() => {
      if (!card.isConnected) return;
      card.classList.remove('polaroid-in');
      spinner.faceFront(600);
    }, 900);

    const pct0 = Math.round((beforeLv.cur / beforeLv.need) * 100);
    const pct1 = Math.round((afterLv.cur / afterLv.need) * 100);
    const chips = [
      `<span class="rw-chip xp">+${xpGain} XP</span>`,
      `<span class="rw-chip">${iconSVG('coin')} +${coinGain} CR</span>`,
      combo >= 2 ? `<span class="rw-chip combo">SÉRIE ×${combo}</span>` : '',
      res.fragments ? `<span class="rw-chip frag">${iconSVG('frag')} +${res.fragments}</span>` : '',
    ].join('');

    $('#enc-actions', ov).innerHTML = `
      <div class="win-toolbar">
        <button class="btn-pill dark sm" id="enc-flip-3d">↻ Tourner la carte 3D (Recto / Verso)</button>
      </div>
      <div class="win-chips">${chips}</div>
      <div class="win-xp-box">
        <div class="win-xp-head mono">
          <span>NIVEAU ${afterLv.lvl} ${lv ? '· <b>NIVEAU SUPÉRIEUR !</b>' : ''}</span>
          <span>${afterLv.cur} / ${afterLv.need} XP</span>
        </div>
        <div class="win-xp-bar"><i id="win-xp-fill" style="width:${lv ? 0 : pct0}%"></i></div>
      </div>
      <div class="win-btns">
        <button class="btn gold block" id="enc-ok">Continuer la chasse</button>
        <button class="btn ghost block" id="enc-col">Voir ma collection</button>
      </div>`;

    let spinning = false;
    $('#enc-flip-3d', ov).onclick = () => {
      sfx('flip');
      spinning = !spinning;
      if (spinning) { spinner.resume(); spinner.setSpeed(52); spinner.boost(600); }
      else { spinner.faceFront(460); }
    };

    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = $('#win-xp-fill', ov);
        if (fill) fill.style.width = pct1 + '%';
      }, 90);
    });

    if (lv) {
      sfx('levelup');
      toast(`Niveau ${lv.levelUp} atteint · +${lv.coins} CR${lv.pack ? ' + 1 Pack' : ''}`, 'gold', 4000);
    }
    $('#enc-ok').onclick = () => {
      sfx('tap');
      const cRect = card.getBoundingClientRect();
      flyCardToCollection(model, r, f, cRect.width ? cRect : vR);
      close();
    };
    $('#enc-col').onclick = () => { close(); document.querySelector('[data-tab=collection]').click(); };
  }
}
