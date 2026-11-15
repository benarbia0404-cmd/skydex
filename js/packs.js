// Packs : définitions, taux affichés, tirage (avec garanties et pitié légendaire).
import { MODELS, MODERN, HISTORIC, RARITIES } from './catalog.js';
import { state, save } from './state.js';

const ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const PACKS = {
  standard: {
    id: 'standard', name: 'Pack Décollage', icon: '🛫', color: '#4b83b8', cards: 3, pool: 'modern',
    desc: '3 fiches d\'appareils de la flotte actuelle. Au moins 1 Peu commune.',
    rates: { common: 62, uncommon: 26, rare: 9.5, epic: 2.4, legendary: 0.1 }, min: 'uncommon',
    price: { coins: 200, eur: 0.99 },
  },
  premium: {
    id: 'premium', name: 'Pack Long-Courrier', icon: '🛩️', color: '#6e849e', cards: 5, pool: 'all',
    desc: '5 appareils civils ou spéciaux, modernes ou historiques. Au moins 1 Rare.',
    rates: { common: 44, uncommon: 30, rare: 17, epic: 7.5, legendary: 1.5 }, min: 'rare',
    price: { coins: 700, eur: 2.99 },
  },
  historic: {
    id: 'historic', name: 'Pack Archives', icon: '📜', color: '#c87a4b', cards: 3, pool: 'historic',
    desc: '3 avions de légende retirés du service : supersoniques, pionniers du jet et hélices mythiques.',
    rates: { uncommon: 30, rare: 40, epic: 25, legendary: 5 }, min: 'rare',
    price: { coins: 1000, eur: 4.99 },
  },
  legend: {
    id: 'legend', name: 'Pack Prestige', icon: '👑', color: '#d6a648', cards: 5, pool: 'all',
    desc: '5 fiches certifiées dont 1 Épique minimum. Les appareils Légendaires restent d\'une grande rareté.',
    rates: { common: 35, uncommon: 30, rare: 22, epic: 10, legendary: 3 }, min: 'epic', minRates: { epic: 88, legendary: 12 },
    price: { coins: null, eur: 9.99 },
  },
};

export const PITY_LIMIT = 30; // garantit un légendaire dans la fameuse « piste » du pack min Épique

const poolOf = p => p === 'modern' ? MODERN : p === 'historic' ? HISTORIC : MODELS;

function weighted(entries) {
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
}

function pickModel(pool, rarity) {
  let idx = ORDER.indexOf(rarity), list;
  // si la rareté n'existe pas dans le pool, on descend d'un cran
  for (let i = idx; i >= 0 && !(list && list.length); i--) list = pool.filter(m => m.rarity === ORDER[i]);
  if (!list || !list.length) for (let i = idx + 1; i < ORDER.length && !(list && list.length); i++) list = pool.filter(m => m.rarity === ORDER[i]);
  return list[(Math.random() * list.length) | 0];
}

/** Calcule les % réels affichés au joueur (normalisés). */
export function displayRates(pack) {
  const sum = Object.values(pack.rates).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(pack.rates).map(([k, v]) => [k, (v / sum) * 100]));
}

export function rollPack(packId) {
  const pack = PACKS[packId];
  const pool = poolOf(pack.pool);
  const out = [];
  const guaranteedSlot = pack.cards - 1; // la dernière carte est la « garantie » (révélée en dernier = suspense)
  for (let i = 0; i < pack.cards; i++) {
    let rarity;
    if (i === guaranteedSlot) {
      const minIdx = ORDER.indexOf(pack.min);
      const base = pack.minRates || pack.rates;
      const entries = Object.entries(base).filter(([k]) => ORDER.indexOf(k) >= minIdx);
      rarity = weighted(entries);
      if (state.pity >= PITY_LIMIT - 1 && ORDER.indexOf(pack.min) >= 2) rarity = 'legendary';
    } else {
      rarity = weighted(Object.entries(pack.rates));
    }
    out.push(pickModel(pool, rarity));
  }
  // mélange léger : on garde la garantie en dernier, tri croissant des autres par rareté pour le suspense
  const last = out.pop();
  out.sort((a, b) => RARITIES[a.rarity].order - RARITIES[b.rarity].order);
  out.push(last);
  state.pity = out.some(m => m.rarity === 'legendary') ? 0 : state.pity + 1;
  state.stats.packsOpened++;
  save();
  return out;
}
