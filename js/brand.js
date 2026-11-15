// SkyDex — Identité aéronautique authentique (vrais modèles, vrais constructeurs, vraies compagnies et codes OACI).

export const AIRLINE_LIVERY_COLORS = {
  AFR: { name: 'Air France',          c1: '#002157', c2: '#ef4444' },
  HOP: { name: 'Air France HOP',      c1: '#002157', c2: '#e11d48' },
  TVF: { name: 'Transavia France',    c1: '#00b65e', c2: '#064e3b' },
  TRA: { name: 'Transavia',           c1: '#00b65e', c2: '#064e3b' },
  EJU: { name: 'easyJet',             c1: '#ff6600', c2: '#1f2937' },
  EZY: { name: 'easyJet',             c1: '#ff6600', c2: '#1f2937' },
  EZS: { name: 'easyJet Switzerland', c1: '#ff6600', c2: '#dc2626' },
  RYR: { name: 'Ryanair',             c1: '#073590', c2: '#facc15' },
  VLG: { name: 'Vueling',             c1: '#eab308', c2: '#334155' },
  VOE: { name: 'Volotea',             c1: '#c81e56', c2: '#1e293b' },
  DLH: { name: 'Lufthansa',           c1: '#05164d', c2: '#f59e0b' },
  BAW: { name: 'British Airways',     c1: '#075aaa', c2: '#eb2226' },
  UAE: { name: 'Emirates',            c1: '#d71921', c2: '#d4af37' },
  QTR: { name: 'Qatar Airways',       c1: '#5c0632', c2: '#cbd5e1' },
  SWR: { name: 'Swiss',               c1: '#dc2626', c2: '#f8fafc' },
  KLM: { name: 'KLM',                 c1: '#00a1de', c2: '#0369a1' },
  IBE: { name: 'Iberia',              c1: '#d7192d', c2: '#f59e0b' },
  TAP: { name: 'TAP Air Portugal',    c1: '#16a34a', c2: '#dc2626' },
  ITY: { name: 'ITA Airways',         c1: '#004b93', c2: '#16a34a' },
  THY: { name: 'Turkish Airlines',    c1: '#c8102e', c2: '#1f2937' },
  RAM: { name: 'Royal Air Maroc',     c1: '#c1272d', c2: '#006233' },
  DAH: { name: 'Air Algérie',         c1: '#dc2626', c2: '#16a34a' },
  TAR: { name: 'Tunisair',            c1: '#dc2626', c2: '#f8fafc' },
  AAL: { name: 'American Airlines',   c1: '#0078d2', c2: '#dc2626' },
  DAL: { name: 'Delta Air Lines',     c1: '#003366', c2: '#e01933' },
  UAL: { name: 'United Airlines',     c1: '#005daa', c2: '#38bdf8' },
  ACA: { name: 'Air Canada',          c1: '#dc2626', c2: '#0f172a' },
  SIA: { name: 'Singapore Airlines',  c1: '#1e3a8a', c2: '#f59e0b' },
  ANA: { name: 'ANA',                 c1: '#0046ad', c2: '#38bdf8' },
  JAL: { name: 'Japan Airlines',      c1: '#c8102e', c2: '#111827' },
};

export const AIRLINE_FICTION = AIRLINE_LIVERY_COLORS;
export const MAKER_FICTION = {};
export const MODEL_FICTION = {};

const CATEGORY = {
  narrow: 'Moyen-courrier',
  wide: 'Gros-porteur long-courrier',
  wide6: 'Cargo stratégique géant',
  quad: 'Quadriréacteur long-courrier',
  quadprop: 'Transport tactique',
  bizjet: 'Jet d\'affaires',
  prop: 'Turbopropulseur régional',
  ga: 'Aviation légère',
  delta: 'Supersonique Mach 2+',
  stealth: 'Aile volante furtive',
};

export function fictionAirline(name, callsign = '') {
  if (name && name !== '—') return name;
  const m = /^([A-Z]{3})\d/.exec(callsign || '');
  if (m && AIRLINE_LIVERY_COLORS[m[1]]) return AIRLINE_LIVERY_COLORS[m[1]].name;
  return name || '';
}

export function fictionCallsign(cs) {
  return cs || '—';
}

export function fictionLivery(displayName) {
  if (!displayName) return null;
  for (const a of Object.values(AIRLINE_LIVERY_COLORS)) {
    if (a.name.toLowerCase() === displayName.toLowerCase()) return { c1: a.c1, c2: a.c2 };
  }
  return null;
}

export const FC = f => (f && f.callsign) ? f.callsign : '—';
export const FA = f => fictionAirline(f?.airline, f?.callsign);
export const scrambleCode = code => String(code || '').toUpperCase();

/** Enrichit le modèle avec ses métadonnées tout en conservant les vrais noms aéronautiques et codes OACI. */
export function applyModelFiction(m) {
  if (!m) return m;
  m.realName = m.name;
  m.realMaker = m.maker;
  m.code = m.id || 'GEN';
  m.category = CATEGORY[m.shape] || 'Appareil';
  return m;
}
