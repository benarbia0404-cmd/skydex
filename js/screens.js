// Écrans : Collection (Hangar OACI), Missions (Tableau des Départs FIDS), Boutique (Terminal Boosters) & Ouverture de packs.
import { MODELS, RARITIES, RARITY_LIST, planeSVG } from './catalog.js';
import {
  state, save, owned, uniqueCount, TOTAL_MODELS, modelOf, ensureMissions, templateOf, claimMission, MILESTONES, claimMilestone,
  claimFreePack, freePackReady, FRAGMENTS_PER_PACK, craftPack, addCard, addXP, missionEvent, grant,
} from './state.js';
import { PACKS, rollPack, displayRates, PITY_LIMIT } from './packs.js';
import { cardHTML, cardBackHTML, attachTilt, attachSpinner, packHTML, packEmblemSVG, kindOf, serialOf } from './cards.js';
import { sfx, vibrate, burst, RAINBOW } from './fx.js';
import { playWalkout } from './cinematic.js';
import { $, $$, wait, toast, modal, esc, updateHUD, iconSVG } from './ui.js';

const rewardHTML = r => [
  r.coins && `<span class="rw-chip">${iconSVG('coin')} <b>${r.coins}</b> CR</span>`,
  r.fragments && `<span class="rw-chip">${iconSVG('frag')} <b>${r.fragments}</b> FRAG</span>`,
  r.pack && `<span class="rw-chip rw-pack">${iconSVG('pack')} <b>${PACKS[r.pack].name}</b></span>`,
].filter(Boolean).join(' ');

const rewardTxt = r => [
  r.coins && `${r.coins} CR`,
  r.fragments && `${r.fragments} FRAG`,
  r.pack && PACKS[r.pack].name,
].filter(Boolean).join(' + ');

// =====================================================================
// ONGLET 02 : COLLECTION (HANGAR & REGISTRE OACI)
// =====================================================================
let colFilter = 'all';
let colRarity = 'all';
let colSearch = '';

export function renderCollection() {
  const list = MODELS.slice();
  for (const id of Object.keys(state.cards)) {
    if (!list.find(m => m.id === id)) list.push(modelOf(id));
  }

  const q = colSearch.trim().toLowerCase();
  const shown = list
    .filter(m => colFilter === 'all' || (colFilter === 'historic' ? m.historic : !m.historic))
    .filter(m => colRarity === 'all' || m.rarity === colRarity)
    .filter(m => !q || [m.id, m.code, m.name, m.maker, kindOf(m)].some(v => v && v.toLowerCase().includes(q)))
    .sort((a, b) => (owned(b.id) - owned(a.id)) || RARITIES[b.rarity].order - RARITIES[a.rarity].order || a.name.localeCompare(b.name));

  const u = uniqueCount();
  const pct = ((u / TOTAL_MODELS) * 100).toFixed(1).replace('.', ',');
  const dups = Object.values(state.cards).reduce((acc, c) => acc + Math.max(0, (c.count || 1) - 1), 0);

  $('#col-progress').innerHTML = `<span>FLOTTE</span> <b>${u}</b> <small>/ ${TOTAL_MODELS}</small>`;

  const kpisEl = $('#col-kpis');
  if (kpisEl) {
    const canCraft = state.fragments >= FRAGMENTS_PER_PACK;
    kpisEl.innerHTML = `
      <div class="kpi-block">
        <b>${u}<span>/${TOTAL_MODELS}</span></b>
        <small>APPAREILS UNIQUES</small>
      </div>
      <div class="kpi-block gold">
        <b>${pct} %</b>
        <small>COMPLÉTION FLOTTE</small>
      </div>
      <div class="kpi-block">
        <b>${dups}</b>
        <small>DOUBLONS CAPTURÉS</small>
      </div>
      <div class="kpi-action">
        <button class="btn-pill ${canCraft ? 'gold' : 'dark'}" id="col-craft-btn" ${canCraft ? '' : 'disabled'}>
          ${iconSVG('frag')}
          <span>Assembler un pack · <b>${state.fragments}/${FRAGMENTS_PER_PACK}</b></span>
        </button>
      </div>`;
    const craftBtn = $('#col-craft-btn', kpisEl);
    if (craftBtn) {
      craftBtn.onclick = () => {
        if (craftPack()) {
          sfx('success');
          toast('Pack Décollage assemblé dans ta soute', 'gold');
          refreshAll();
        }
      };
    }
  }

  // Barres de progression par constructeur / flotte
  const fleetsEl = $('#col-fleets');
  if (fleetsEl) {
    const fleets = [
      { label: 'ASTRA-AERO', filter: m => !m.historic && m.realMaker === 'Airbus' },
      { label: 'ORION FLIGHT', filter: m => !m.historic && m.realMaker === 'Boeing' },
      { label: 'RÉGIONAUX', filter: m => !m.historic && /Embraer|ATR|Bombardier|De Havilland|Saab|Antonov|Iliouchine|Soukhoï|COMAC|Tupolev/.test(m.realMaker) },
      { label: 'AFFAIRES & LÉGERS', filter: m => !m.historic && /Cessna|Piper|Cirrus|Diamond|Beechcraft|Pilatus|Dassault|Gulfstream|Learjet|Lockheed|Airbus Defence/.test(m.realMaker) },
      { label: 'HISTORIQUES', filter: m => m.historic },
    ];
    fleetsEl.innerHTML = fleets.map(fl => {
      const tot = MODELS.filter(fl.filter).length || 1;
      const have = MODELS.filter(m => fl.filter(m) && owned(m.id)).length;
      const w = Math.min(100, (have / tot) * 100);
      return `<div class="fleet-row">
        <span class="fleet-name">${fl.label}</span>
        <div class="fleet-track"><i style="width:${w}%"></i></div>
        <span class="fleet-val">${have}/${tot}</span>
      </div>`;
    }).join('');
  }

  // Filtres de rareté style pilules sombres avec point coloré
  $('#col-bar').innerHTML = `
    <button class="r-pill ${colRarity === 'all' ? 'on' : ''}" data-r="all">
      <span class="rdot all-dot"></span>
      <span>Toutes</span>
      <b>${u}/${TOTAL_MODELS}</b>
    </button>
    ${RARITY_LIST.map(r => {
      const tot = MODELS.filter(m => m.rarity === r.id).length;
      const have = MODELS.filter(m => m.rarity === r.id && owned(m.id)).length;
      return `<button class="r-pill ${colRarity === r.id ? 'on' : ''}" data-r="${r.id}" style="--rc:${r.color}">
        <span class="rdot" style="background:${r.color}"></span>
        <span>${r.label}</span>
        <b>${have}/${tot}</b>
      </button>`;
    }).join('')}`;

  $$('#col-bar .r-pill').forEach(b => b.onclick = () => {
    sfx('tap');
    colRarity = b.dataset.r;
    renderCollection();
  });

  const grid = $('#col-grid');
  if (!shown.length) {
    grid.innerHTML = `<div class="empty-hangar">Aucun appareil ne correspond aux critères de recherche.</div>`;
    return;
  }
  grid.innerHTML = shown.map(m => {
    const isOwned = owned(m.id);
    const entry = isOwned ? state.cards[m.id] : null;
    const cnt = entry ? entry.count : 0;
    const best = entry && entry.best ? entry.best : {};
    const rar = RARITIES[m.rarity] || RARITIES.common;
    return `<div class="cell" data-id="${m.id}">
      ${cardHTML(m, {
        size: 'sm',
        locked: !isOwned,
        count: cnt,
        reg: best.reg || '',
        callsign: best.callsign || '',
        airline: best.airline || '',
        route: best.route || '',
      })}
      <div class="cell-foot">
        <span class="cell-code">TYPE · ${m.code || m.id}</span>
        <span class="cell-status ${isOwned ? 'ok' : ''}">${isOwned ? `EN HANGAR ×${cnt}` : rar.label}</span>
      </div>
    </div>`;
  }).join('');

  $$('.cell', grid).forEach(c => c.onclick = () => {
    sfx('tap');
    showCardDetail(modelOf(c.dataset.id));
  });
}

export function initCollection() {
  $$('#col-tabs button').forEach(b => b.onclick = () => {
    sfx('tap');
    $$('#col-tabs button').forEach(x => x.classList.toggle('on', x === b));
    colFilter = b.dataset.f;
    renderCollection();
  });
  const searchInp = $('#col-search');
  if (searchInp) {
    searchInp.addEventListener('input', e => {
      colSearch = e.target.value;
      renderCollection();
    });
  }
}

function showCardDetail(model) {
  const have = owned(model.id), c = state.cards[model.id];
  const best = have && c && c.best ? c.best : {};
  const r = RARITIES[model.rarity];
  sfx('tap');
  modal(`
    <div class="card-showcase-wrap" style="--rc:${r.color}" data-close>
      <button class="showcase-close" data-close aria-label="Fermer">✕</button>
      <div class="showcase-aura"></div>
      <div class="showcase-3d-stage">
        <div class="showcase-3d-card" id="showcase-spin">
          <div class="showcase-face showcase-front">
            ${cardHTML(model, {
              size: 'lg',
              locked: !have,
              reg: best.reg || '',
              callsign: best.callsign || '',
              airline: best.airline || '',
              route: best.route || '',
              count: have ? c.count : 0,
            })}
          </div>
          <div class="showcase-face showcase-back">
            ${cardBackHTML('lg', model.rarity)}
          </div>
        </div>
      </div>
    </div>`, (m, close) => {
    const box = m.querySelector('.modal');
    if (box) box.classList.add('showcase-only');
    const card3d = m.querySelector('#showcase-spin');
    if (card3d) {
      attachSpinner(card3d, { speed: 40 });
      card3d.addEventListener('click', e => e.stopPropagation());
    }
    const hint = document.createElement('div');
    hint.className = 'showcase-hint';
    hint.textContent = 'Fais tourner la carte avec ton doigt';
    m.querySelector('.card-showcase-wrap')?.appendChild(hint);
    const bg = m.querySelector('.card-showcase-wrap');
    if (bg) bg.addEventListener('click', e => { if (e.target === bg) close(); });
  });
}

// =====================================================================
// ONGLET 03 : MISSIONS & SOUTE (TABLEAU DES DÉPARTS FIDS)
// =====================================================================
let selectedSoutePack = null;

export function renderMissions() {
  ensureMissions();
  const inv = Object.entries(state.packs).filter(([, n]) => n > 0);
  const totalPacks = inv.reduce((sum, [, n]) => sum + n, 0);
  if (inv.length && (!selectedSoutePack || !(state.packs[selectedSoutePack] > 0))) {
    selectedSoutePack = inv[0][0];
  }
  const activePackId = inv.length ? selectedSoutePack : null;
  const activePack = activePackId ? PACKS[activePackId] : null;
  const activeCount = activePackId ? (state.packs[activePackId] || 0) : 0;

  const canCraft = state.fragments >= FRAGMENTS_PER_PACK;
  const ready = state.missions.list.some(m => !m.claimed && m.progress >= templateOf(m.id).goal) || MILESTONES.some(ms => !state.milestones[ms.id] && uniqueCount() >= ms.goal);
  $('#dot-missions').hidden = !(ready || canCraft || inv.length);

  const fragPct = Math.min(100, (state.fragments / FRAGMENTS_PER_PACK) * 100);

  // Éventail de packs en soute si plusieurs packs possédés
  let fanGhosts = '';
  if (totalPacks === 2) {
    const secondId = inv.length > 1 ? inv.find(([id]) => id !== activePackId)?.[0] || activePackId : activePackId;
    fanGhosts = `<div class="soute-fan-ghost" style="--fan-i:1">${packHTML(PACKS[secondId], { size: 'lg' })}</div>`;
  } else if (totalPacks >= 3) {
    const leftId = inv[1] ? inv[1][0] : activePackId;
    const rightId = inv[2] ? inv[2][0] : activePackId;
    fanGhosts = `
      <div class="soute-fan-ghost" style="--fan-i:-1">${packHTML(PACKS[leftId], { size: 'lg' })}</div>
      <div class="soute-fan-ghost" style="--fan-i:1">${packHTML(PACKS[rightId], { size: 'lg' })}</div>`;
  }

  $('#missions-body').innerHTML = `
    <!-- Soute à packs (BLOC 7.1 : grand et centré >= 60%, halo radial, flottement, éventail + badge ×N) -->
    <div class="sec">
      <span>Packs en soute</span>
      <small>${inv.length ? `${totalPacks} pack${totalPacks > 1 ? 's' : ''} prêt${totalPacks > 1 ? 's' : ''} à ouvrir` : 'Soute vide'}</small>
    </div>
    ${inv.length ? `
      <div class="soute-showcase" style="--pc:${activePack.color}">
        <div class="soute-glow"></div>
        ${inv.length > 1 ? `
          <div class="soute-selector">
            ${inv.map(([id, n]) => `
              <button class="soute-pill ${id === activePackId ? 'active' : ''}" data-select-soute="${id}" style="--pc:${PACKS[id].color}">
                ${PACKS[id].name} · ×${n}
              </button>`).join('')}
          </div>` : ''}
        <div class="soute-fan" data-pack="${activePackId}">
          ${fanGhosts}
          <div class="soute-fan-main">
            ${packHTML(activePack, { size: 'lg' })}
          </div>
          ${totalPacks > 1 ? `<span class="soute-qty-badge">×${activeCount > 1 ? activeCount : totalPacks}</span>` : ''}
        </div>
        <div class="soute-meta">
          <h4>${esc(activePack.name)}</h4>
          <p>${esc(activePack.desc)}</p>
          <button class="btn gold" data-pack="${activePackId}">Ouvrir ce pack (${activeCount} restant${activeCount > 1 ? 's' : ''})</button>
        </div>
      </div>`
    : `<div class="panel cargo-panel">
        <div class="empty-cargo">
          <div class="empty-ic">${iconSVG('pack')}</div>
          <div>
            <b>Aucun pack en soute</b>
            <p>Complète les vols du tableau des départs, recycle tes doublons ou passe à la Boutique.</p>
          </div>
        </div>
      </div>`}

    <!-- Atelier d'assemblage (piste de progression) -->
    <div class="sec">
      <span>Atelier d'ingénierie</span>
      <small>Recyclage des doublons</small>
    </div>
    <div class="panel craft-runway-card">
      <div class="craft-head">
        <div class="craft-ic">${iconSVG('frag')}</div>
        <div class="craft-info">
          <b>FRAGMENTS DE PLANS : <span class="mono">${state.fragments} / ${FRAGMENTS_PER_PACK}</span></b>
          <small>Chaque doublon capturé fournit des pièces détachées. ${FRAGMENTS_PER_PACK} fragments assemblent 1 Pack Décollage.</small>
        </div>
        <button class="btn ${canCraft ? 'gold' : ''}" id="btn-craft" ${canCraft ? '' : 'disabled'}>Assembler</button>
      </div>
      <div class="runway-bar">
        <span class="rw-thr">09L</span>
        <div class="rw-track"><i style="width:${fragPct}%"></i></div>
        <span class="rw-thr">27R</span>
      </div>
    </div>

    <!-- Tableau des départs (Missions quotidiennes style FIDS d'aéroport) -->
    <div class="sec">
      <span>Missions du jour</span>
      <small>Actualisation quotidienne 00:00 UTC</small>
    </div>
    <div class="fids-board">
      <div class="fids-head">
        <span>VOL</span>
        <span>DIRECTIVE OPÉRATIONNELLE</span>
        <span>ÉTAT / DOTATION</span>
      </div>
      ${state.missions.list.map((m, idx) => {
        const t = templateOf(m.id), done = m.progress >= t.goal;
        const pct = Math.min(100, (m.progress / t.goal) * 100);
        const flightNo = `SDX-${104 + idx * 112}`;
        const statusCls = m.claimed ? 'landed' : done ? 'boarding' : 'enroute';
        return `<div class="fids-row ${statusCls}">
          <div class="fids-flight">
            <span class="flap-code">${flightNo}</span>
            <small class="fids-gate">GATE B0${idx + 1}</small>
          </div>
          <div class="fids-main">
            <div class="fids-title">${esc(t.text)}</div>
            <div class="runway-bar sm">
              <div class="rw-track"><i style="width:${pct}%"></i></div>
              <span class="fids-count">${Math.min(m.progress, t.goal)}/${t.goal}</span>
            </div>
            <div class="fids-reward">${rewardHTML(t.reward)}</div>
          </div>
          <div class="fids-action">
            ${m.claimed
              ? `<span class="fids-status-pill ok">${iconSVG('check')} ATTERRI</span>`
              : done
                ? `<button class="btn gold sm-btn" data-claim="${m.id}">RÉCUPÉRER</button>`
                : `<span class="fids-status-pill">EN VOL</span>`}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Paliers d'homologation -->
    <div class="sec">
      <span>Carnet d'homologation</span>
      <small>${uniqueCount()} / ${TOTAL_MODELS} modèles identifiés</small>
    </div>
    <div class="panel milestones-panel">
      ${MILESTONES.map(ms => {
        const claimed = state.milestones[ms.id], done = uniqueCount() >= ms.goal;
        return `<div class="ms-row ${claimed ? 'done' : done ? 'ready' : ''}">
          <div class="ms-code">FL-${ms.goal}</div>
          <div class="ms-info">
            <b>Homologuer ${ms.goal} appareils uniques</b>
            <div class="ms-rw">${rewardHTML(ms.reward)}</div>
          </div>
          <div class="ms-act">
            ${claimed
              ? `<span class="fids-status-pill ok">${iconSVG('check')} VALIDÉ</span>`
              : `<button class="btn ${done ? 'gold' : ''} sm-btn" data-ms="${ms.id}" ${done ? '' : 'disabled'}>${done ? 'RÉCUPÉRER' : `${uniqueCount()}/${ms.goal}`}</button>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  $$('[data-select-soute]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    sfx('tap');
    selectedSoutePack = btn.dataset.selectSoute;
    renderMissions();
  });
  $$('[data-pack]').forEach(el => el.onclick = () => openPackFlow(el.dataset.pack));
  const craft = $('#btn-craft');
  if (craft) {
    craft.onclick = () => {
      if (craftPack()) {
        sfx('success');
        toast('Pack Décollage assemblé avec succès', 'gold');
        refreshAll();
      }
    };
  }
  $$('[data-claim]').forEach(b => b.onclick = () => {
    const r = claimMission(b.dataset.claim);
    if (r) {
      sfx('success');
      toast('Dotation reçue : ' + rewardTxt(r), 'gold');
      refreshAll();
    }
  });
  $$('[data-ms]').forEach(b => b.onclick = () => {
    const r = claimMilestone(b.dataset.ms);
    if (r) {
      sfx('success');
      toast('Homologation validée : ' + rewardTxt(r), 'gold');
      refreshAll();
    }
  });
}

// =====================================================================
// ONGLET 04 : BOUTIQUE & SÉLECTEUR DE PACKS
// =====================================================================
const fmtEur = n => n.toFixed(2).replace('.', ',') + ' €';
let selectedShopPack = 'standard';
let freeTimerId = null;

function formatFreeCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `Prochain dans ${hh}:${mm}:${ss}`;
}

function startFreePackCountdown() {
  if (freeTimerId) clearInterval(freeTimerId);
  freeTimerId = setInterval(() => {
    const el = $('#free-countdown');
    const st = $('#free-status-lbl');
    if (!el && !st) return;
    const rem = Math.max(0, state.freeAt - Date.now());
    if (rem <= 0) {
      clearInterval(freeTimerId);
      freeTimerId = null;
      renderShop();
      return;
    }
    const txt = formatFreeCountdown(rem);
    if (el) el.textContent = txt;
  }, 1000);
}

export function renderShop() {
  const free = freePackReady();
  const left = Math.max(0, state.freeAt - Date.now());
  const countdownTxt = formatFreeCountdown(left);
  const selPack = PACKS[selectedShopPack] || PACKS.standard;
  const selRates = displayRates(selPack);
  const pityLeft = Math.max(1, PITY_LIMIT - state.pity);
  const lacksCoins = Boolean(selPack.price.coins && state.coins < selPack.price.coins);

  $('#shop-body').innerHTML = `
    <!-- Carte d'embarquement : Pack Quotidien Gratuit -->
    <div class="boarding-pass ${free ? 'ready' : ''}">
      <div class="bp-main">
        <div class="bp-header">
          <span class="bp-airline">SKYDEX AIRWAYS // PACK QUOTIDIEN</span>
          <span class="bp-class">PRIORITÉ</span>
        </div>
        <div class="bp-route">
          <div class="bp-city"><b>HGR</b><small>HANGAR</small></div>
          <div class="bp-plane-line"><i></i>${planeSVG('wide')}<i></i></div>
          <div class="bp-city"><b>PCK</b><small>PACK</small></div>
        </div>
        <div class="bp-meta-row">
          <div><small>VOL</small><b>SDX-FREE</b></div>
          <div><small>PORTE</small><b>G-01</b></div>
          <div><small>STATUT</small><b id="free-status-lbl" class="${free ? 'txt-gold' : ''}">${free ? 'DISPONIBLE MAINTENANT' : 'EMBARQUEMENT FERMÉ'}</b></div>
        </div>
      </div>
      <div class="bp-stub">
        <div class="bp-barcode-v"></div>
        ${free
          ? `<button class="btn gold" id="btn-free">Récupérer le pack gratuit</button>`
          : `<span class="bp-countdown" id="free-countdown">${countdownTxt}</span>`}
      </div>
    </div>

    <!-- Sélecteur de Packs + Inspecteur -->
    <div class="sec">
      <span>Choisis ton pack</span>
      <small>Touche un pack pour voir ses chances</small>
    </div>

    <div class="shop-showcase">
      <div class="shop-packs-grid">
        ${Object.values(PACKS).map(p => {
          const isSel = p.id === selPack.id;
          const ownedCnt = state.packs[p.id] || 0;
          return `<div class="shop-pack-tile ${isSel ? 'selected' : ''}" data-select-pack="${p.id}" style="--pc:${p.color}">
            ${ownedCnt > 0 ? `<div class="tile-owned-badge">${ownedCnt} EN SOUTE</div>` : ''}
            ${packHTML(p, { size: '' })}
            <div class="tile-price-row">
              ${p.price.coins
                ? `<span class="tile-price">${iconSVG('coin')} ${p.price.coins}</span>
                   <span class="tile-eur">${fmtEur(p.price.eur)}</span>`
                : `<span class="tile-price">${fmtEur(p.price.eur)}</span>`}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Panneau d'inspection détaillé du pack sélectionné -->
      <aside class="shop-inspector" style="--pc:${selPack.color}">
        <div class="insp-head">
          <div class="insp-emblem" style="color:${selPack.color}">${packEmblemSVG(selPack.id)}</div>
          <div>
            <h3>${selPack.name}</h3>
            <p>${selPack.desc}</p>
          </div>
        </div>

        <div class="insp-kpis">
          <div class="insp-box">
            <b>${selPack.cards}</b>
            <small>cartes</small>
          </div>
          <div class="insp-box">
            <b style="color:${RARITIES[selPack.min].color}">${RARITIES[selPack.min].label}</b>
            <small>ou mieux garantie</small>
          </div>
          <div class="insp-box">
            <b class="txt-gold">${pityLeft}</b>
            <small>avant Légendaire sûr</small>
          </div>
          <div class="insp-box">
            <b>${selPack.pool === 'historic' ? 'Historiques' : selPack.pool === 'modern' ? 'Flotte actuelle' : 'Tous avions'}</b>
            <small>Flotte actuelle</small>
          </div>
        </div>

        <div class="insp-odds">
          <div class="insp-odds-title">Chances par carte</div>
          ${RARITY_LIST.filter(r => selRates[r.id]).map(r => {
            const val = selRates[r.id];
            const txt = val < 1 ? val.toFixed(2).replace('.', ',') : val.toFixed(1).replace('.', ',');
            return `<div class="odd-row">
              <span class="odd-lbl"><i class="rdot" style="background:${r.color}"></i> ${r.label}</span>
              <div class="odd-bar"><i style="width:${Math.min(100, Math.max(3, val))}%;background:${r.color}"></i></div>
              <b class="odd-pct">${txt} %</b>
            </div>`;
          }).join('')}
        </div>

        <div class="insp-actions">
          ${(state.packs[selPack.id] || 0) > 0
            ? `<button class="btn gold block" data-open-owned="${selPack.id}">
                OUVRIR DEPUIS LA SOUTE · ${state.packs[selPack.id]} RESTANT${state.packs[selPack.id] > 1 ? 'S' : ''}
              </button>`
            : ''}
          <div class="insp-buy-row">
            ${selPack.price.coins ? `
              <button class="btn ${lacksCoins ? '' : 'gold'} flex-1" data-buy="${selPack.id}" data-m="coins" ${lacksCoins ? 'disabled' : ''}>
                ${lacksCoins
                  ? `<span>Pas assez de pièces</span>`
                  : `<span>Acheter</span><span class="btn-div">|</span><span>${iconSVG('coin')} ${selPack.price.coins} CR</span>`}
              </button>` : ''}
            <button class="btn ${selPack.price.coins ? 'btn-eur-outline' : 'gold'} flex-1" data-buy="${selPack.id}" data-m="eur">
              <span>${selPack.price.coins ? fmtEur(selPack.price.eur) : `Obtenir · ${fmtEur(selPack.price.eur)}`}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <p class="note">Garantie Légendaire : un appareil Légendaire est garanti au bout de ${PITY_LIMIT} ouvertures sans Légendaire (compteur actuel : ${state.pity}/${PITY_LIMIT}). Les achats en € sont simulés (mode démo).</p>`;

  const btnFree = $('#btn-free');
  if (btnFree) {
    btnFree.onclick = () => {
      if (claimFreePack()) {
        refreshAll();
        openPackFlow('standard');
      }
    };
  }
  if (!free) {
    startFreePackCountdown();
  } else if (freeTimerId) {
    clearInterval(freeTimerId);
    freeTimerId = null;
  }

  $$('[data-select-pack]').forEach(el => el.onclick = () => {
    sfx('tap');
    selectedShopPack = el.dataset.selectPack;
    renderShop();
    const insp = $('.shop-inspector');
    if (insp && insp.scrollIntoView) insp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $$('[data-open-owned]').forEach(b => b.onclick = () => openPackFlow(b.dataset.openOwned));
  $$('[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy, b.dataset.m));
  $$('[data-odds]').forEach(b => b.onclick = () => showOdds(b.dataset.odds));
}

function buy(id, method) {
  const p = PACKS[id];
  if (method === 'coins') {
    if (state.coins < p.price.coins) return;
    state.coins -= p.price.coins;
    grant({ pack: id });
    sfx('tap');
    refreshAll();
    openPackFlow(id);
  } else {
    modal(`
      <div class="dossier-top">
        <span class="sec-kicker">PAIEMENT // SIMULATION</span>
        <button class="sh-close" data-close>✕</button>
      </div>
      <h2>Confirmer l'achat</h2>
      <p><b>${esc(p.name)}</b> (${p.cards} cartes) — <b class="txt-gold">${fmtEur(p.price.eur)}</b></p>
      <p class="note">Mode démonstration : aucun débit réel n'est effectué. Le pack est immédiatement ajouté et ouvert.</p>
      <div class="row">
        <button class="btn ghost" data-close>Annuler</button>
        <button class="btn gold" id="ok-buy">Autoriser &amp; Ouvrir</button>
      </div>`,
      (m, close) => {
        $('#ok-buy').onclick = () => {
          close();
          grant({ pack: id });
          refreshAll();
          openPackFlow(id);
        };
      });
  }
}

function showOdds(id) {
  const p = PACKS[id], rates = displayRates(p);
  modal(`
    <h2>${esc(p.name)}</h2>
    <table class="rates">${RARITY_LIST.filter(r => rates[r.id]).map(r => `<tr><td><span class="rdot" style="background:${r.color}"></span> ${r.label}</td><td>${rates[r.id] < 1 ? rates[r.id].toFixed(2) : rates[r.id].toFixed(1)} %</td></tr>`).join('')}</table>
    <p class="note">Contenu : ${p.cards} cartes — ${p.pool === 'historic' ? 'avions historiques uniquement' : p.pool === 'modern' ? 'flotte actuelle' : 'flotte actuelle et historiques'}.<br>
    Garantie : 1 carte ${RARITIES[p.min].label} minimum${p.minRates ? ` (dans cette carte : ${p.minRates.epic}% Épique / ${p.minRates.legendary}% Légendaire)` : ''}.</p>
    <button class="btn block" data-close>Fermer</button>`);
}

// =====================================================================
// OUVERTURE DE PACK (PILE 3D + TIMELINE + ÉVENTAIL FINAL)
// =====================================================================
export function openPackFlow(packId) {
  if (!(state.packs[packId] > 0)) return;
  const pack = PACKS[packId];
  state.packs[packId]--;
  save();
  const ov = $('#overlay');
  ov.hidden = false;
  ov.className = 'overlay packo';
  ov.style.setProperty('--pc', pack.color);
  ov.innerHTML = `
    <div class="packo-top-bar">
      <span class="sec-kicker">OUVERTURE DE PACK // ${esc(pack.name.toUpperCase())}</span>
    </div>
    <div class="packo-stage">
      ${packHTML(pack, { size: 'lg' })}
    </div>
    <div class="packo-hint">Touche le pack pour l'ouvrir</div>`;

  const pk = $('.pack', ov);
  pk.classList.add('shaking');
  sfx('appear');
  let opened = false;
  ov.onclick = async () => {
    if (opened) return;
    opened = true;
    ov.onclick = null;
    sfx('tear');
    vibrate(80);
    pk.classList.remove('shaking');
    pk.classList.add('tear');
    const f = document.createElement('div');
    f.className = 'flash';
    ov.appendChild(f);
    const h = $('.packo-hint', ov);
    if (h) h.remove();
    const models = rollPack(packId);
    const results = models.map(m => ({ model: m, ...addCard(m) }));
    results.forEach(r => { if (r.isNew) missionEvent('new', r.model); else missionEvent('dup', r.model); });
    missionEvent('pack');
    let xp = 0;
    results.forEach(r => xp += Math.ceil(RARITIES[r.model.rarity].xp / (r.isNew ? 3 : 6)));
    const lv = addXP(xp);
    save();
    await wait(580);
    reveal(results, pack, lv);
  };
}

function reveal(results, pack, lv) {
  const ov = $('#overlay');
  let i = 0;

  const renderMiniTimeline = (activeIdx, activeShown) => results.map((item, idx) => {
    const done = idx < activeIdx || (idx === activeIdx && activeShown);
    const rar = RARITIES[item.model.rarity];
    return `<div class="rv-mini ${done ? 'done' : ''} ${idx === activeIdx ? 'current' : ''}" style="--rc:${done ? rar.color : '#2a3042'}">
      ${done ? `<span style="color:${rar.color}">${rar.code}</span>` : ''}
    </div>`;
  }).join('');

  const step = () => {
    if (i >= results.length) return summary();
    const r = results[i], rar = RARITIES[r.model.rarity], hot = rar.order >= 2;
    const remBehind = Math.max(0, results.length - 1 - i);
    ov.className = 'overlay packo';
    ov.style.setProperty('--pc', hot ? rar.color : pack.color);

    const stackLayers = Array.from({ length: Math.min(4, remBehind) }, (_, k) =>
      `<div class="deck-ghost" style="--k:${k + 1}"></div>`
    ).join('');

    ov.innerHTML = `
      <div class="rv-topbar">
        <div class="packo-count"><b>${i + 1}</b><span>/${results.length}</span></div>
        <div class="rv-pack-title">
          <span class="rv-pack-ic" style="color:${pack.color}">${packEmblemSVG(pack.id)}</span>
          <span>${esc(pack.name)}</span>
        </div>
        <button class="btn-pill dark sm" id="rv-skip-top">Tout révéler</button>
      </div>

      <div class="reveal-wrap">
        <div class="deck-stack">
          ${stackLayers}
          <div class="flip" style="--rc:${hot ? rar.color : '#52607a'}">
            <div class="cback-wrap ${hot ? 'aura' : ''}">
              ${cardBackHTML('fit', r.model.rarity)}
            </div>
            <div class="face">
              ${cardHTML(r.model, { size: 'fit', isNew: r.isNew })}
            </div>
          </div>
        </div>
      </div>

      <div class="rv-caption" id="rv-caption">
        <div class="rv-rar-lbl" id="rv-rar">&nbsp;</div>
        <div class="rv-model-lbl" id="rv-name">CARTE VERROUILLÉE</div>
        <div class="rv-sub-lbl" id="rv-sub">Touche la carte pour l'identifier</div>
      </div>

      <div class="rv-bottom">
        <div class="rv-timeline" id="rv-timeline">${renderMiniTimeline(i, false)}</div>
        <div class="rv-controls">
          <span class="packo-hint" id="rv-hint">Touche la carte pour la retourner</span>
          <button class="btn-pill dark" id="rv-all">Tout révéler</button>
        </div>
      </div>`;

    const flip = $('.flip', ov);
    let shown = false;

    const skipAll = async e => {
      if (e) e.stopPropagation();
      sfx('flip');
      const bestUnseen = results.slice(i).find(x => RARITIES[x.model.rarity].order >= 3);
      if (bestUnseen && !shown) await playWalkout(bestUnseen.model);
      summary();
    };
    $('#rv-all', ov).onclick = skipAll;
    $('#rv-skip-top', ov).onclick = skipAll;

    flip.onclick = async e => {
      e.stopPropagation();
      if (!shown) {
        shown = true;
        if (rar.order >= 3) await playWalkout(r.model);
        flip.classList.add('shown');
        attachTilt(flip);
        sfx('flip');
        await wait(480);
        const b = flip.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        if (rar.order >= 3) {
          burst(cx, cy, rar.order === 4 ? RAINBOW : rar.color, rar.order === 4 ? 140 : 80, 1.4);
          ov.classList.add('shakescreen');
          vibrate([100, 50, 200]);
        } else if (rar.order === 2) {
          burst(cx, cy, rar.color, 40);
        }
        $('#rv-rar', ov).innerHTML = `<span style="color:${rar.color}">${rar.label}</span>`;
        $('#rv-name', ov).textContent = r.model.name;
        $('#rv-sub', ov).innerHTML = r.isNew
          ? `${esc(r.model.maker)} · <b>TYPE · ${esc(r.model.code || r.model.id)}</b>`
          : `Doublon recyclé · <b>+${r.fragments} FRAGMENTS</b>`;
        $('#rv-timeline', ov).innerHTML = renderMiniTimeline(i, true);
        $('#rv-hint', ov).textContent = 'Touche la carte pour continuer';
      } else {
        i++;
        step();
      }
    };
  };
  step();

  function summary() {
    ov.className = 'overlay packo recap-mode';
    ov.style.setProperty('--pc', pack.color);

    // Identifier la meilleure carte du tirage (rareté max, puis vitesse)
    let bestIdx = 0;
    results.forEach((r, idx) => {
      const curOrder = RARITIES[r.model.rarity].order;
      const bestOrder = RARITIES[results[bestIdx].model.rarity].order;
      if (curOrder > bestOrder || (curOrder === bestOrder && (r.model.speed || 0) > (results[bestIdx].model.speed || 0))) {
        bestIdx = idx;
      }
    });

    const newCount = results.filter(r => r.isNew).length;
    const mid = (results.length - 1) / 2;
    const remPacks = state.packs[pack.id] || 0;
    const canBuyAnother = pack.price.coins && state.coins >= pack.price.coins;

    ov.innerHTML = `
      <div class="recap-top">
        <div class="rv-pack-title">
          <span class="rv-pack-ic" style="color:${pack.color}">${packEmblemSVG(pack.id)}</span>
          <span>${esc(pack.name)}</span>
        </div>
        <h1>${ esc(pack.name) }</h1>
        <div class="recap-sub-pill">${newCount > 0 ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} carte${newCount > 1 ? 's' : ''}` : `${results.length} appareils extraits`}</div>
      </div>

      <div class="revealed-list recap-fan count-${results.length}">
        ${results.map((r, idx) => {
          const offset = idx - mid;
          const isBest = idx === bestIdx;
          return `<div class="fan-slot ${isBest ? 'is-best' : ''}" style="--idx:${offset};--abs:${Math.abs(offset)}">
            ${cardHTML(r.model, { size: 'md', isNew: r.isNew && !isBest, isBest })}
            ${!r.isNew ? `<div class="dup-frag-pill">+${r.fragments} FRAG</div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <div class="recap-actions">
        ${remPacks > 0 ? `
          <button class="btn gold pill-cta" id="pk-again-owned">
            <span>Ouvrir un autre</span>
            <span class="btn-div">|</span>
            <span>En soute · ${remPacks} restant${remPacks > 1 ? 's' : ''}</span>
          </button>` : canBuyAnother ? `
          <button class="btn gold pill-cta" id="pk-again-buy">
            <span>Ouvrir un autre</span>
            <span class="btn-div">|</span>
            <span>${iconSVG('coin')} ${pack.price.coins} CR</span>
          </button>` : ''}
        <button class="btn-pill dark" id="pk-done">Continuer</button>
        <button class="btn-pill dark" id="pk-col">Voir la collection</button>
      </div>`;

    $$('.fan-slot', ov).forEach(s => attachTilt(s));
    sfx('success');
    if (lv) {
      sfx('levelup');
      toast(`FL ${lv.levelUp} atteint · +${lv.coins} CR${lv.pack ? ' + 1 Booster' : ''}`, 'gold', 4000);
    }

    const closeRecap = () => { ov.hidden = true; ov.innerHTML = ''; refreshAll(); };
    $('#pk-done', ov).onclick = closeRecap;
    $('#pk-col', ov).onclick = () => {
      closeRecap();
      const tab = document.querySelector('[data-tab="collection"]');
      if (tab) tab.click();
    };
    const btnOwned = $('#pk-again-owned', ov);
    if (btnOwned) btnOwned.onclick = () => { refreshAll(); openPackFlow(pack.id); };
    const btnBuy = $('#pk-again-buy', ov);
    if (btnBuy) {
      btnBuy.onclick = () => {
        if (state.coins >= pack.price.coins) {
          state.coins -= pack.price.coins;
          grant({ pack: pack.id });
          refreshAll();
          openPackFlow(pack.id);
        }
      };
    }
  }
}

export function refreshAll() {
  updateHUD();
  renderCollection();
  renderMissions();
  renderShop();
}
