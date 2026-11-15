// Rencontre + capture « Spotter Reflex » :
// 1) L'avion réel vole dans le viseur optique avec son du vent en altitude et reflets solaires sur la carlingue.
// 2) Le joueur tourne/glisse la BAGUE DE MISE AU POINT tactile (crans haptiques + clics mécaniques) pour rendre l'avion net.
// 3) Au relâchement : déclic mécanique net d'obturateur + retour haptique + flash lumineux réaliste.
// 4) Le cliché se transforme en Polaroïd, pivote en 3D pour révéler la carte et ses statistiques complètes,
//    puis un Polaroïd avec indicateur de rareté glisse jusque dans l'onglet Collection.
import { RARITIES, ART_MAP, planeSVG } from './catalog.js';
import { state, save, owned, addCard, addXP, levelInfo, missionEvent } from './state.js';
import { cardHTML, cardBackHTML, cardArtSVG, attachSpinner } from './cards.js';
import { sfx, startWindAmbience, stopWindAmbience, vibrate, burst, RAINBOW } from './fx.js';
import { playWalkout } from './cinematic.js';
import { $, $$, wait, toast, esc, iconSVG } from './ui.js';
import { FC, FA, fictionAirline, fictionCallsign } from './brand.js';

export const CATCH_RATE = { common: .97, uncommon: .92, rare: .85, epic: .75, legendary: .62 };
export const MAX_ATTEMPTS = 3;
export const CAUGHT_COOLDOWN = 6 * 3600 * 1000;

export const THROW_BONUS = { excellent: 0.58, great: 0.34, nice: 0.12 };
const THROW_LABEL = { excellent: 'MISE AU POINT PARFAITE !', great: 'NETTETÉ OPTIMALE !', nice: 'CLICHÉ VALIDÉ !' };
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
    return `<div class="vf-art-wrap">
      <img class="vf-art-img" src="${art.src}" alt="${esc(model.name)}" draggable="false"${style}>
      <div class="vf-carlingue-glint"></div>
      <div class="vf-art-tint"></div>
    </div>`;
  }
  return `<div class="vf-art-wrap vf-art-svg">
    ${cardArtSVG(model, { airline: airlineDisp, callsign: callsignDisp })}
    <div class="vf-carlingue-glint"></div>
  </div>`;
}

/** Fait glisser un Polaroïd avec indicateur de rareté depuis la scène jusque dans le bouton Collection. */
function flyPolaroidToCollection(model, r, f, fromRect) {
  const tabBtn = $('#tab-collection');
  if (!tabBtn || !fromRect) return;
  const toRect = tabBtn.getBoundingClientRect();
  const pol = document.createElement('div');
  pol.className = 'flying-polaroid';
  pol.style.setProperty('--rc', r.color);
  pol.style.left = (fromRect.left + fromRect.width / 2 - 48) + 'px';
  pol.style.top = (fromRect.top + fromRect.height / 2 - 60) + 'px';
  pol.innerHTML = `
    <div class="fp-photo">${viewfinderPlaneHTML(model, f)}</div>
    <div class="fp-foot">
      <span class="fp-rar" style="background:${r.color}">${esc(r.label.toUpperCase())}</span>
      <b class="mono">${esc(model.code || model.id)}</b>
    </div>`;
  document.body.appendChild(pol);

  const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
  const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

  sfx('slideToHangar');
  const anim = pol.animate([
    { transform: 'translate(0, 0) scale(1) rotate(-4deg)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.25 - 65}px) scale(0.82) rotate(8deg)`, opacity: 1, offset: 0.48 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.18) rotate(16deg)`, opacity: 0.15 },
  ], { duration: 760, easing: 'cubic-bezier(.22, .9, .32, 1)', fill: 'forwards' });

  anim.onfinish = () => {
    pol.remove();
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

  const ticksHTML = Array.from({ length: 36 }, (_, i) =>
    `<i style="--ti:${i}" class="${i % 3 === 0 ? 'maj' : ''}"></i>`).join('');

  ov.innerHTML = `
    <button class="enc-flee" id="enc-back" aria-label="Retour au radar">✕</button>
    ${ctx.infoHTML ? '<button class="enc-infobtn" id="enc-infobtn" aria-label="Infos du vol">i</button>' : ''}
    <div class="enc-top">
      <div class="enc-rarity">${rarityTag}${isNew ? '<em>NOUVEAU</em>' : ''}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono">${esc(FC(f))}${f.airline ? ' · ' + esc(FA(f)) : ''}${routeStr ? ' · ' + esc(routeStr) : ''} · ${flStr}</div>
    </div>
    <div class="enc-stage" id="enc-stage" style="--ec:${r.color};--rc:${r.color};--lk:0;--blur:6.5px">
      <div class="enc-aura"></div>
      ${r.order >= 3 ? '<div class="enc-rays"></div>' : ''}
      ${orbitsHTML(r.order)}

      <!-- PHASE 1 : Viseur optique reflex + Bague de mise au point autour de l'objectif -->
      <div class="enc-vf" id="enc-vf">
        <div class="vf-outer-ring" id="vf-outer-ring" aria-hidden="true">${ticksHTML}</div>
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
          <div class="vf-iris" id="vf-iris"></div>
          <div class="vf-hud-top mono">
            <span>WIND // ${spdStr}</span>
            <span id="vf-zoom">FOCUS 0%</span>
          </div>
          <div class="vf-reticle" id="enc-reticle">
            <i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>
            <div class="vf-ring"></div>
            <div class="vf-cross"></div>
            <span class="vf-lock-pct mono" id="vf-pct">FLOU · TOURNE LA BAGUE</span>
          </div>
          <div class="vf-hud-bot mono">
            <span>${flStr}</span>
            <span>${spdStr}</span>
            <span>HDG ${hdgStr}</span>
            <span>${distStr}</span>
          </div>
          <div class="vf-polaroid-frame" id="vf-polaroid">
            <div class="vfp-meta">
              <span class="vfp-rar" style="background:${r.color}">${esc(r.label.toUpperCase())}</span>
              <b class="mono">${esc(FC(f))} // ${esc(model.code || model.id)}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- PHASE 2 : Carte 3D holographique + statistiques complètes -->
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
      <i data-step="2">02 · MISE AU POINT</i>
      <i data-step="3">03 · DÉCLIC</i>
    </div>

    <div class="enc-actions" id="enc-actions">
      ${blocked
        ? `<div class="enc-blocked-msg">${blocked}</div>`
        : `<div class="focus-zone" id="focus-zone">
            <div class="shutter-hint" id="shutter-hint">GLISSE la <b>bague de mise au point</b> sur le repère doré puis <b>RELÂCHE</b></div>
            <div class="focus-ring-ctrl" id="focus-dial" role="slider" aria-label="Bague de mise au point optique">
              <div class="frc-scale mono">
                <span>35mm</span><span>50mm</span><span>85mm</span><span>135mm</span><span>200mm</span><span>∞</span>
              </div>
              <div class="frc-track">
                <div class="frc-knurl"></div>
                <div class="frc-sweet" id="frc-sweet"><span>AF ★</span></div>
                <div class="frc-thumb" id="frc-thumb">
                  <i></i><i></i><i></i>
                  <span class="mono" id="frc-val">50mm</span>
                </div>
              </div>
            </div>
            <div class="beacon-rate mono" id="shutter-rate">NETTETÉ <b id="sharp-pct">18%</b> · RELÂCHE QUAND L'AVION EST NET</div>
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
  const outerRing = $('#vf-outer-ring', ov);
  const locksBox = $('#cap-locks', ov), locks = $$('i', locksBox);
  const spinner = attachSpinner($('#enc-spin', ov), { speed: 46, paused: true });

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

  // ------------------------------------------------------------ Bague de mise au point tactile + Reflets carlingue
  const dial = $('#focus-dial', ov), sweetEl = $('#frc-sweet', ov), thumbEl = $('#frc-thumb', ov);
  const valEl = $('#frc-val', ov), sharpEl = $('#sharp-pct', ov);
  const pctEl = $('#vf-pct', ov), zoomEl = $('#vf-zoom', ov);

  // Plus la rareté est élevée, plus la tolérance de netteté AF est fine et plus la cible bouge légèrement
  const TOLERANCES = [0.15, 0.13, 0.11, 0.09, 0.075];
  const oi = Math.min(4, r.order), TOL = TOLERANCES[oi];
  let targetF = 0.62 + (Math.random() * 0.22 - 0.06); // position idéale entre 0.56 et 0.84
  let curF = 0.12;                                     // position initiale de la bague (floue)
  let dragging = false, startX = 0, startF = 0, lastDetent = Math.round(curF * 32), wasInZone = false;

  function renderFocusState() {
    const dist = Math.abs(curF - targetF);
    const sharpness = Math.max(0, Math.min(1, 1 - dist / 0.55));
    const inZ = dist <= TOL;
    const nearZ = dist <= TOL * 1.85;
    // Flou optique réel sur l'avion tant que la mise au point n'est pas faite
    const blurPx = inZ ? 0 : Math.max(0.4, ((dist - TOL * 0.5) * 14));

    stage.style.setProperty('--lk', sharpness.toFixed(3));
    stage.style.setProperty('--blur', blurPx.toFixed(2) + 'px');
    if (outerRing) outerRing.style.transform = `rotate(${(curF * 220 - 110).toFixed(1)}deg)`;
    if (thumbEl) thumbEl.style.left = (curF * 100).toFixed(1) + '%';
    if (sweetEl) {
      sweetEl.style.left = ((targetF - TOL) * 100).toFixed(1) + '%';
      sweetEl.style.width = (TOL * 200).toFixed(1) + '%';
    }
    const mm = Math.round(35 + curF * 165);
    if (valEl) valEl.textContent = `${mm}mm`;
    const spPct = Math.round(sharpness * 100);
    if (sharpEl) sharpEl.textContent = `${spPct}%`;
    if (zoomEl) zoomEl.textContent = `FOCUS ${spPct}% · ${mm}MM`;
    if (pctEl) {
      pctEl.textContent = inZ ? '● AF NET · RELÂCHE !' : nearZ ? 'PRESQUE NET…' : 'FLOU · TOURNE LA BAGUE';
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

  // Turbulence en vol + dérive lente de la distance focale pour les avions rares+
  let driftRaf = 0;
  const driftLoop = now => {
    if (closed || !rig.isConnected) return;
    if (!stage.classList.contains('card-mode')) {
      const dist = Math.abs(curF - targetF);
      const sharp = Math.max(0, Math.min(1, 1 - dist / 0.55));
      const amp = (1 - sharp * 0.78) * (9 + oi * 4);
      const spd = 0.0017 + oi * 0.0004;
      const dx = Math.sin(now * spd) * amp + Math.cos(now * spd * 1.6) * (amp * 0.35);
      const dy = Math.cos(now * spd * 1.25) * (amp * 0.6);
      const bank = Math.sin(now * spd * 1.1) * (3.5 + oi * 1.5) * (1 - sharp * 0.7);
      rig.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${bank.toFixed(1)}deg) scale(${(1 + sharp * 0.14).toFixed(3)})`;
      if (oi >= 2 && !busy) {
        targetF = Math.max(0.45, Math.min(0.86, targetF + Math.sin(now * 0.0014) * 0.0006 * oi));
        renderFocusState();
      }
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
    // Si on touche directement la piste de la bague, on se place sous le doigt
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
    const detent = Math.round(curF * 34);
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
    // Si le joueur relâche encore très loin de la zone dès le tout début, on le laisse ajuster
    if (dist > TOL * 2.6 && curF < 0.25) {
      stage.classList.remove('locking');
      const h = $('#shutter-hint', ov);
      if (h) {
        h.classList.remove('gone', 'nudge'); void h.offsetWidth;
        h.innerHTML = 'Amène la <b>bague de mise au point</b> dans la zone <b>AF ★</b> pour déclencher !';
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

  // La bague tactile ET le viseur permettent de tourner la mise au point
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

    // Netteté instantanée au déclic + fermeture rapide du diaphragme + flash lumineux réaliste
    stage.style.setProperty('--blur', '0px');
    sfx('shutter');
    vibrate([35, 20, 75]);
    $('#vf-iris', ov)?.classList.add('blink');

    const flashEl = document.createElement('div');
    flashEl.className = 'cam-flash';
    ov.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 580);

    const qEl = $('#throw-quality', ov);
    qEl.textContent = THROW_LABEL[quality];
    qEl.className = 'throw-quality show q-' + quality;
    stage.classList.add('snapped');

    const vR = vf.getBoundingClientRect();
    const cx = vR.left + vR.width / 2, cy = vR.top + vR.height / 2;
    burst(cx, cy, quality === 'excellent' ? ['#fde047', '#fff'] : [r.color, '#fff'], quality === 'excellent' ? 44 : 24, 0.95);

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
      sfx('shake' + (i + 1)); vibrate(40);
      await wait(380);
    }
    vf.classList.remove('vf-pulse');
    $('#throw-quality', ov).className = 'throw-quality';

    if (ok) {
      stopWindAmbience();
      locks.forEach(l => l.classList.add('win'));
      sfx('lock');
      await wait(160);

      // Développement du Polaroïd puis pivot 3D vers la Carte et ses statistiques
      sfx('polaroid');
      stage.classList.add('developing');
      await wait(540);

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
      ctx.onCaught && ctx.onCaught(f);

      // Le Polaroïd avec son indicateur de rareté glisse jusque dans la collection !
      setTimeout(() => flyPolaroidToCollection(model, r, f, vR), 420);

      showSummary(res, xpGain, coinGain, lv, quality, state.stats.combo, beforeLv, afterLv, vR);
    } else {
      locks.forEach(l => l.classList.add('fail'));
      sfx('fail'); vibrate(200);
      burst(cx, cy, ['#ef4444', '#fff'], 26, 0.8);
      vf.classList.add('vf-glitch');
      const left = MAX_ATTEMPTS - attempts[f.id];
      const qEl = $('#throw-quality', ov);
      qEl.textContent = left > 0 ? 'MISE AU POINT RATÉE !' : 'PERDU DANS LES NUAGES…';
      qEl.className = 'throw-quality show q-fail';
      await wait(850);
      vf.classList.remove('vf-glitch');
      $('#vf-iris', ov)?.classList.remove('blink');
      qEl.className = 'throw-quality';
      if (left > 0) {
        stage.classList.remove('snapped', 'developing', 'locking');
        curF = 0.14;
        targetF = 0.58 + Math.random() * 0.24;
        renderFocusState();
        dial.classList.remove('disabled');
        $('#shutter-hint').classList.remove('gone');
        $('#shutter-hint').innerHTML = `ENCORE ${left} ESSAI${left > 1 ? 'S' : ''} · Aligne la bague sur <b>AF ★</b>`;
        busy = false;
      } else {
        stopWindAmbience();
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

  function showSummary(res, xpGain, coinGain, lv, quality, combo, beforeLv, afterLv, vR) {
    ov.classList.add('caught');
    $('.enc-top', ov).innerHTML = `
      <div class="enc-rarity">${res.isNew ? '✦ NOUVEAU POLAROÏD DÉVELOPPÉ !' : `CLICHÉ ARCHIVÉ · ×${res.count}`}</div>
      <h2>${esc(model.name)}</h2>
      <div class="enc-sub mono"><span class="sum-stars">${STARS[quality]}</span> ${THROW_LABEL[quality]} · ${esc(FC(f))}</div>`;

    // Pivot 3D de la carte pour révéler les statistiques complètes
    stage.classList.remove('vf-mode', 'snapped', 'locking', 'inzone', 'developing');
    stage.classList.add('live', 'won', 'card-mode');
    card.className = 'enc-card-3d polaroid-in';
    spinner.resume(); spinner.setSpeed(38); spinner.boost(780);
    setTimeout(() => {
      if (!card.isConnected) return;
      card.classList.remove('polaroid-in');
      // S'arrête de face après une rotation 3D complète pour laisser lire les statistiques
      spinner.faceFront(620);
    }, 950);

    const pct0 = Math.round((beforeLv.cur / beforeLv.need) * 100);
    const pct1 = Math.round((afterLv.cur / afterLv.need) * 100);
    const chips = [
      `<span class="rw-chip xp">+${xpGain} XP</span>`,
      `<span class="rw-chip">${iconSVG('coin')} +${coinGain} CR</span>`,
      combo >= 2 ? `<span class="rw-chip combo">🔥 SÉRIE ×${combo}</span>` : '',
      res.fragments ? `<span class="rw-chip frag">${iconSVG('frag')} +${res.fragments}</span>` : '',
    ].join('');

    $('#enc-actions', ov).innerHTML = `
      <div class="win-toolbar">
        <button class="btn-pill dark sm" id="enc-flip-3d">↻ Pivoter la carte 3D (Dos / Stats)</button>
      </div>
      <div class="win-chips">${chips}</div>
      <div class="win-xp-box">
        <div class="win-xp-head mono">
          <span>FL ${afterLv.lvl} ${lv ? '· <b>NIVEAU SUPÉRIEUR !</b>' : ''}</span>
          <span>${afterLv.cur} / ${afterLv.need} XP</span>
        </div>
        <div class="win-xp-bar"><i id="win-xp-fill" style="width:${lv ? 0 : pct0}%"></i></div>
      </div>
      <div class="win-btns">
        <button class="btn gold block" id="enc-ok">Classer &amp; continuer</button>
        <button class="btn ghost block" id="enc-col">Ouvrir ma collection</button>
      </div>`;

    let spinning = false;
    $('#enc-flip-3d', ov).onclick = () => {
      sfx('flip');
      spinning = !spinning;
      if (spinning) { spinner.resume(); spinner.setSpeed(54); spinner.boost(620); }
      else { spinner.faceFront(480); }
    };

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
    $('#enc-ok').onclick = () => {
      sfx('tap');
      const cRect = card.getBoundingClientRect();
      flyPolaroidToCollection(model, r, f, cRect.width ? cRect : vR);
      close();
    };
    $('#enc-col').onclick = () => { close(); document.querySelector('[data-tab=collection]').click(); };
  }
}
