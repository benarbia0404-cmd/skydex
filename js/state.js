// État du joueur (sauvegardé dans localStorage) + missions + événements.
import { MODELS, BY_ID, getModel, RARITIES, isWide } from './catalog.js';

const KEY = 'skydex.v1';

const fresh = () => ({
  v: 1, coins: 300, xp: 0, fragments: 0,
  caught: {},                   // id de vol -> timestamp (un même avion ne se capture qu'une fois par 6 h)
  cards: {},                    // modelId -> { id, count, first, last, best:{callsign,reg,alt,speed}, name?, rarity? }
  packs: { standard: 1 },       // inventaire de packs non ouverts
  pity: 0,                      // packs ouverts depuis le dernier légendaire
  freeAt: 0,                    // prochain pack gratuit
  missions: { day: '', list: [] },
  milestones: {},
  apVisits: {},
  onboarded: false,             // tutoriel de première ouverture vu                 // code aéroport -> date du dernier bonus spotter
  stats: { captures: 0, packsOpened: 0, inspected: 0 },
  settings: { sound: true, explorer: false, mode: 'auto', labels: true, trails: true },
});

export let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 1) return { ...fresh(), ...raw, settings: { ...fresh().settings, ...raw.settings } };
  } catch { /* corrompu */ }
  return fresh();
}

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  listeners.forEach(fn => fn(state));
}
export function resetAll() { localStorage.removeItem(KEY); state = fresh(); location.reload(); }

// ---------------- Niveaux ----------------
export function levelInfo(xp = state.xp) {
  let lvl = 1, need = 100, left = xp;
  while (left >= need) { left -= need; lvl++; need = 100 + (lvl - 1) * 60; }
  return { lvl, cur: left, need };
}

export function addXP(n) {
  const before = levelInfo().lvl;
  state.xp += n;
  const after = levelInfo().lvl;
  if (after > before) {
    // récompense de niveau : pièces + parfois pack
    const coins = after * 50;
    state.coins += coins;
    if (after % 5 === 0) state.packs.standard = (state.packs.standard || 0) + 1;
    save();
    return { levelUp: after, coins, pack: after % 5 === 0 };
  }
  return null;
}

// ---------------- Collection ----------------
export function owned(id) { return !!state.cards[id]; }
export function uniqueCount() { return Object.keys(state.cards).length; }
export const TOTAL_MODELS = MODELS.length;

/** Ajoute une carte. Retourne { isNew, count, fragments }. */
export function addCard(model, info = {}) {
  const cur = state.cards[model.id];
  const best = (info.callsign || info.reg || info.airline)
    ? {
        callsign: info.callsign,
        reg: info.reg,
        airline: info.airline,
        route: info.route,
        alt: info.alt,
        speed: info.speed,
      }
    : undefined;
  let isNew = false, fragments = 0;
  if (!cur) {
    isNew = true;
    state.cards[model.id] = { id: model.id, count: 1, first: Date.now(), last: Date.now(), best };
    if (model.generic) Object.assign(state.cards[model.id], { name: model.name, rarity: model.rarity });
  } else {
    cur.count++; cur.last = Date.now();
    if (best) cur.best = best;
    fragments = RARITIES[model.rarity].fragments;
    state.fragments += fragments;
  }
  return { isNew, count: state.cards[model.id].count, fragments };
}

export function modelOf(id) {
  if (BY_ID[id]) return BY_ID[id];
  const c = state.cards[id];
  return c && c.name ? { ...getModel(id), rarity: c.rarity || 'common' } : getModel(id); // nom toujours recalculé (camouflage)
}

// ---------------- Missions ----------------
const TEMPLATES = [
  { id: 'cap3',  text: 'Capture 3 avions',                 goal: 3, ev: 'capture',                     reward: { coins: 100 } },
  { id: 'cap6',  text: 'Capture 6 avions',                 goal: 6, ev: 'capture',                     reward: { pack: 'standard' } },
  { id: 'wide1', text: 'Capture 1 gros-porteur',           goal: 1, ev: 'capture', when: m => isWide(m), reward: { coins: 150 } },
  { id: 'rare1', text: 'Capture une carte Rare ou mieux',  goal: 1, ev: 'capture', when: m => RARITIES[m.rarity].order >= 2, reward: { pack: 'standard' } },
  { id: 'new2',  text: 'Débloque 2 nouvelles cartes',      goal: 2, ev: 'new',                         reward: { coins: 120 } },
  { id: 'look5', text: 'Inspecte 5 vols sur le radar',     goal: 5, ev: 'inspect',                     reward: { coins: 60 } },
  { id: 'dup1',  text: 'Obtiens 1 doublon',                goal: 1, ev: 'dup',                         reward: { fragments: 20 } },
  { id: 'pack1', text: 'Ouvre 1 pack',                     goal: 1, ev: 'pack',                        reward: { coins: 80 } },
  { id: 'prop2', text: 'Capture 2 avions à hélices',       goal: 2, ev: 'capture', when: m => /prop|ga/.test(m.shape), reward: { coins: 130 } },
];

export const MILESTONES = [
  { id: 'u5',  goal: 5,  reward: { pack: 'standard' } },
  { id: 'u10', goal: 10, reward: { pack: 'premium' } },
  { id: 'u20', goal: 20, reward: { pack: 'historic' } },
  { id: 'u35', goal: 35, reward: { pack: 'premium' } },
  { id: 'u50', goal: 50, reward: { pack: 'legend' } },
  { id: 'u70', goal: 70, reward: { pack: 'legend' } },
];

const today = () => new Date().toISOString().slice(0, 10);

export function ensureMissions() {
  if (state.missions.day === today()) return;
  const seed = [...today()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = TEMPLATES.slice();
  const pick = [];
  let s = seed;
  while (pick.length < 4) { s = (s * 9301 + 49297) % 233280; pick.push(pool.splice(s % pool.length, 1)[0]); }
  state.missions = { day: today(), list: pick.map(t => ({ id: t.id, progress: 0, claimed: false })) };
  save();
}

export const templateOf = id => TEMPLATES.find(t => t.id === id);

export function missionEvent(ev, model) {
  ensureMissions();
  for (const m of state.missions.list) {
    const t = templateOf(m.id);
    if (t.ev !== ev || m.progress >= t.goal) continue;
    if (t.when && !(model && t.when(model))) continue;
    m.progress++;
  }
  save();
}

export function grant(reward) {
  if (reward.coins) state.coins += reward.coins;
  if (reward.fragments) state.fragments += reward.fragments;
  if (reward.pack) state.packs[reward.pack] = (state.packs[reward.pack] || 0) + 1;
  save();
}

export function claimMission(id) {
  const m = state.missions.list.find(x => x.id === id);
  const t = templateOf(id);
  if (!m || m.claimed || m.progress < t.goal) return null;
  m.claimed = true; grant(t.reward); return t.reward;
}

export function claimMilestone(id) {
  const ms = MILESTONES.find(x => x.id === id);
  if (!ms || state.milestones[id] || uniqueCount() < ms.goal) return null;
  state.milestones[id] = true; grant(ms.reward); return ms.reward;
}

export const FREE_PACK_EVERY = 8 * 3600 * 1000;
export function freePackReady() { return Date.now() >= state.freeAt; }
export function claimFreePack() {
  if (!freePackReady()) return false;
  state.freeAt = Date.now() + FREE_PACK_EVERY;
  grant({ pack: 'standard' });
  return true;
}

export const FRAGMENTS_PER_PACK = 100;
export function craftPack() {
  if (state.fragments < FRAGMENTS_PER_PACK) return false;
  state.fragments -= FRAGMENTS_PER_PACK; grant({ pack: 'standard' }); return true;
}
