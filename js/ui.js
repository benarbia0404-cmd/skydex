// Utilitaires d'interface partagés + iconographie vectorielle aéronautique.
import { state, levelInfo } from './state.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Icônes vectorielles aéronautiques (remplace tous les emojis système). */
const ICONS = {
  radar: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke-opacity=".5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 12L18.36 5.64"/><circle cx="16" cy="9" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  collection: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="14" height="18" rx="2.5"/><path d="M4 7v11a2.5 2.5 0 0 0 2.5 2.5H15" stroke-opacity=".6"/><path d="M13 8l1.2 2.6L17 11l-2.8.4L13 14l-1.2-2.6L9 11l2.8-.4L13 8z"/></svg>`,
  missions: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M7 7h2m4 0h4M7 14h3m4 0h3M7 17h5"/></svg>`,
  shop: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10L12 4l9 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10z"/><path d="M7 21v-7h10v7"/><path d="M9 10h6"/></svg>`,
  coin: `<svg class="ui-ic ic-coin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6M3 12h6m6 0h6m-15.36-6.36l4.24 4.24m6.24 6.24l4.24 4.24m0-14.72l-4.24 4.24m-6.24 6.24l-4.24 4.24"/></svg>`,
  frag: `<svg class="ui-ic ic-frag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 20.5 7 20.5 17 12 22 3.5 17 3.5 7 12 2"/><polygon points="12 7 16.5 9.6 16.5 14.4 12 17 7.5 14.4 7.5 9.6 12 7" stroke-opacity=".6"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  pack: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M5 7h14M5 17h14" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  locate: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`,
  filter: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="#0b0d14"/><circle cx="15" cy="12" r="2" fill="#0b0d14"/><circle cx="10" cy="18" r="2" fill="#0b0d14"/></svg>`,
  settings: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  search: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/><path d="M11 8v6M8 11h6" stroke-opacity=".5"/></svg>`,
  airport: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21L9 3m6 0l3 18"/><path d="M12 6v2m0 4v2m0 4v2"/></svg>`,
  star: `<svg class="ui-ic" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 14.8 9.2 22 12 14.8 14.8 12 22 9.2 14.8 2 12 9.2 9.2 12 2"/></svg>`,
  check: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  lock: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>`,
  ticket: `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9z"/><path d="M15 7v10" stroke-dasharray="2 2"/></svg>`,
  bolt: `<svg class="ui-ic" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>`,
};

export const iconSVG = name => ICONS[name] || '';

export function toast(msg, cls = '', ms = 3000) {
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms + 500);
}

let lastCoins = null, lastFrag = null;
export function updateHUD() {
  const { lvl, cur, need } = levelInfo();
  $('#hud-lvl').textContent = lvl;
  $('#hud-xp').style.width = (cur / need * 100) + '%';
  $('#hud-xp-txt').textContent = `${cur} / ${need} XP`;
  $('#hud-coins b').textContent = state.coins.toLocaleString('fr-FR');
  $('#hud-frag b').textContent = state.fragments;
  if (lastCoins !== null && lastCoins !== state.coins) bump('#hud-coins');
  if (lastFrag !== null && lastFrag !== state.fragments) bump('#hud-frag');
  lastCoins = state.coins; lastFrag = state.fragments;
}
function bump(sel) { const e = $(sel); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

/** Ouvre une modale générique. Retourne une fonction close(). */
export function modal(html, onMount) {
  const m = $('#modal');
  m.hidden = false;
  m.innerHTML = `<div class="modal">${html}</div>`;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = e => { if (e.target === m) close(); };
  $$('[data-close]', m).forEach(b => b.addEventListener('click', close));
  if (onMount) onMount(m, close);
  return close;
}
