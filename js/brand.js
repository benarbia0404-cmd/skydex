// SkyDex — couche de « camouflage » juridique.
// Les données de vol restent RÉELLES en interne (position, type, indicatif, routes, rareté, captures),
// mais tout ce qui est AFFICHÉ au joueur passe par ce module : compagnies, constructeurs, modèles,
// codes de type et préfixes d'indicatif deviennent des équivalents fictifs, stables et immersifs.

// ------------------------------------------------------------------ 1. Compagnies (France / Paris en priorité)
// code OACI réel -> { name: nom fictif, icao: préfixe d'indicatif fictif, c1/c2: livrée fictive }
export const AIRLINE_FICTION = {
  AFR: { name: 'Azur France',      icao: 'AZF', c1: '#0b2a6b', c2: '#e23c4b' },
  TVF: { name: 'Tranz-Horizon',    icao: 'TZH', c1: '#13c76a', c2: '#0d3b2a' },
  TRA: { name: 'Tranz-Horizon',    icao: 'TZH', c1: '#13c76a', c2: '#0d3b2a' },
  EJU: { name: 'SwiftJet',         icao: 'SWJ', c1: '#ff7a1a', c2: '#2a2f3a' },
  EZY: { name: 'SwiftJet',         icao: 'SWJ', c1: '#ff7a1a', c2: '#2a2f3a' },
  EZS: { name: 'Swift-Alpine',     icao: 'SWA', c1: '#ff7a1a', c2: '#d6283a' },
  RYR: { name: 'Ry-Air',           icao: 'RYA', c1: '#123f9c', c2: '#f5c518' },
  VLG: { name: 'Vol-Express',      icao: 'VXP', c1: '#f2c80f', c2: '#3b4252' },
  VOE: { name: 'Aéro-Volt',        icao: 'AVT', c1: '#d4145a', c2: '#2b2d42' },
  HOP: { name: "P'tit Azur",       icao: 'PTZ', c1: '#0b2a6b', c2: '#c8102e' },
  DLH: { name: 'Rhin-Aero',        icao: 'RHA', c1: '#0a1f5c', c2: '#f2a900' },
  BAW: { name: 'Britt-Aero',       icao: 'BRT', c1: '#1b5fb4', c2: '#d72631' },
  UAE: { name: 'Émirats-Ciel',     icao: 'EMC', c1: '#c3122f', c2: '#c9a54c' },
  AZA: { name: 'Italia-Cielo',     icao: 'ITC', c1: '#0d57a6', c2: '#1f9d55' },
  ITY: { name: 'Italia-Cielo',     icao: 'ITC', c1: '#0d57a6', c2: '#1f9d55' },
  FWI: { name: 'Caraïbes Express', icao: 'CRX', c1: '#1d9bd7', c2: '#f28c28' },
  CRL: { name: "L'Île Bleue",      icao: 'ILB', c1: '#1b3a8c', c2: '#e6e9f0' },
  RAM: { name: 'Atlas-Fly',        icao: 'ATF', c1: '#b5222d', c2: '#0f6b3a' },
  DAH: { name: 'Dz-Aero',          icao: 'DZA', c1: '#d0262f', c2: '#139a4b' },
  TAR: { name: 'Tunis-Sky',        icao: 'TNS', c1: '#cf2030', c2: '#f4f4f4' },
};

// Opérateurs génériques déjà neutres (aucune marque) : affichés tels quels
const GENERIC_OPS = new Set([
  'Mission militaire', 'Mission gouvernementale', 'Mission cargo spéciale', 'Vol spécial / exposition',
  'Aviation privée', "Aviation d'affaires", 'Aviation générale',
]);
// Noms réels sans code exploitable -> équivalent fictif
const NAME_FIX = {
  'Airbus Transport': 'Astra Logistique', 'Antonov Airlines': 'Antares Cargo',
  'Air France': 'Azur France', 'Air France HOP': "P'tit Azur", 'Air France Hop': "P'tit Azur",
  'Transavia': 'Tranz-Horizon', 'Transavia France': 'Tranz-Horizon', 'easyJet': 'SwiftJet',
  'easyJet Switzerland': 'Swift-Alpine', 'Ryanair': 'Ry-Air', 'Vueling': 'Vol-Express', 'Volotea': 'Aéro-Volt',
  'Lufthansa': 'Rhin-Aero', 'British Airways': 'Britt-Aero', 'Emirates': 'Émirats-Ciel', 'ITA Airways': 'Italia-Cielo',
  'Air Caraïbes': 'Caraïbes Express', 'Corsair': "L'Île Bleue", 'Royal Air Maroc': 'Atlas-Fly',
  'Air Algérie': 'Dz-Aero', 'Tunisair': 'Tunis-Sky',
};
const FICTION_NAMES = new Set(Object.values(AIRLINE_FICTION).map(a => a.name).concat(Object.values(NAME_FIX)));

const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const codeFromCallsign = cs => { const m = /^([A-Z]{3})\d/.exec(cs || ''); return m ? m[1] : null; };

// 3. Règle de repli : compagnie inconnue XYZ -> « XYZ-Aero » ou « Trans-XYZ » (stable pour un même code)
function genAirline(code) {
  const c = (code || 'SKY').toUpperCase().slice(0, 3);
  return hash(c) % 2 ? `${c}-Aero` : `Trans-${c}`;
}

/** Nom de compagnie à afficher. `callsign` (réel) sert à retrouver le code OACI. */
export function fictionAirline(name, callsign = '') {
  if (!name || name === '—') return name;
  if (GENERIC_OPS.has(name) || FICTION_NAMES.has(name) || /^Trans-[A-Z]{3}$|^[A-Z]{3}-Aero$/.test(name)) return name;
  const code = codeFromCallsign(callsign);
  if (code && AIRLINE_FICTION[code]) return AIRLINE_FICTION[code].name;
  if (NAME_FIX[name]) return NAME_FIX[name];
  if (code) return genAirline(code);
  return genAirline(name.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3));
}

/** Indicatif à afficher : préfixe fictif pour les compagnies traduites (AFR98VD -> AZF98VD), inchangé sinon. */
export function fictionCallsign(cs) {
  const m = /^([A-Z]{3})(\d.*)$/.exec(cs || '');
  if (!m) return cs;
  const fic = AIRLINE_FICTION[m[1]];
  return fic ? fic.icao + m[2] : cs;
}

/** Livrée fictive (couleurs) d'une compagnie affichée, ou palette stable générée. */
export function fictionLivery(displayName) {
  for (const a of Object.values(AIRLINE_FICTION)) if (a.name === displayName) return { c1: a.c1, c2: a.c2 };
  if (!displayName || GENERIC_OPS.has(displayName)) return null;
  const h = hash(displayName);
  const hues = [210, 0, 145, 28, 265, 190, 340, 48];
  const h1 = hues[h % hues.length], h2 = hues[(h >> 3) % hues.length];
  return { c1: `hsl(${h1} 70% 32%)`, c2: `hsl(${h2} 80% 55%)` };
}

// Raccourcis pour un vol (objet f du radar)
export const FC = f => fictionCallsign(f.callsign);
export const FA = f => fictionAirline(f.airline, f.callsign);

// ------------------------------------------------------------------ 2. Constructeurs & modèles
export const MAKER_FICTION = {
  Airbus: 'Astra-Aero', Boeing: 'Orion Flight', Embraer: 'Swiftcraft', ATR: 'Vortex', Bombardier: 'Borealis',
  'De Havilland': 'Hawkland', Cessna: 'Skylark Works', Piper: 'Pipit Aero', Cirrus: 'Nimbus Aircraft',
  Pilatus: 'Alpina', Daher: 'Dauphin Aero', Dassault: 'Faucon Industries', Gulfstream: 'Jetstream Corp',
  Lockheed: 'Locksley Dynamics', Northrop: 'Nordstar', 'McDonnell Douglas': 'Meridian', Douglas: 'Dakota Works',
  Antonov: 'Antares', Iliouchine: 'Ilyon', Tupolev: 'Tupal', 'Aérospatiale/BAC': 'Franco-British Supersonic',
  Supermarine: 'Seawind', Fokker: 'Falke', Beechcraft: 'Beechwood', Learjet: 'Lynx Jets', Saab: 'Saga',
};
const MAKER_PREFIX = {
  'Astra-Aero': 'AS', 'Orion Flight': 'OR', Swiftcraft: 'SW', Vortex: 'VX', Borealis: 'BO', Hawkland: 'HK',
  'Skylark Works': 'SK', 'Pipit Aero': 'PP', 'Nimbus Aircraft': 'NB', Alpina: 'AL', 'Dauphin Aero': 'DP',
  'Faucon Industries': 'FC', 'Jetstream Corp': 'JS', 'Locksley Dynamics': 'LK', Nordstar: 'NS', Meridian: 'MD',
  'Dakota Works': 'DK', Antares: 'AN', Ilyon: 'IL', Tupal: 'TP', 'Franco-British Supersonic': 'FB', Seawind: 'SE',
  Falke: 'FK', Beechwood: 'BW', 'Lynx Jets': 'LX', Saga: 'SG',
};

// Noms fictifs par code de type réel (familles demandées + tout le catalogue SkyDex)
export const MODEL_FICTION = {
  // Famille A320 -> Astra-Aero
  A318: 'Aéro-318', A319: 'Aéro-319', A320: 'Aéro-320', A20N: 'A-32 Neo', A321: 'Aéro-321', A21N: 'Aéro-321 Neo',
  BCS1: 'Aéro-220', BCS3: 'Aéro-220 L',
  A332: 'Aéro-330', A333: 'Aéro-330 L', A339: 'Aéro-330 Neo', A338: 'Aéro-330 Neo C',
  A359: 'Astra-350', A35K: 'Astra-350 XL', A343: 'Aéro-340', A346: 'Aéro-340 L',
  A306: 'Aéro-300', A310: 'Aéro-310', A310M: 'Aéro-310 Ravitailleur',
  A388: 'Astra-380 Titan', A3ST: 'Astra Baleine', A337: 'Astra Baleine XL', A400: 'Astra Titan-400',
  // Famille 737 -> Orion Flight
  B737: 'Orion-737', B738: 'O-738', B739: 'O-739', B733: 'O-733', B734: 'O-734', B38M: 'Orion-Max', B39M: 'Orion-Max 9',
  B752: 'Orion-757', B753: 'Orion-757 L', B763: 'Orion-767', B764: 'Orion-767 ER',
  B772: 'Orion-777', B77W: 'Orion-777 ER', B77L: 'Orion-777 LR', B779: 'Orion-777 X',
  B788: 'Dream-787', B789: 'Dream-787 L', B78X: 'Dream-787 XL',
  B744: 'Orion-747 Jumbo', B748: 'Orion-747 Reine', B741: 'Orion-747 Classic', VC25: 'Orion-747 « Force Un »',
  B721: 'Orion-727', B52: 'Orion-52 Forteresse', K35R: 'Orion KC Ravitailleur', C17: 'Orion Globe-17',
  // Régionaux
  AT72: 'Vortex-72', AT76: 'Vortex-72 Neo', AT75: 'Vortex-72 S',
  E190: 'Swift-190', E170: 'Swift-170', E75L: 'Swift-175', E195: 'Swift-195', E295: 'Swift-195 E2', E145: 'Swift-145',
  E55P: 'Swift P-300', E35L: 'Swift L-600',
  CRJ9: 'Borealis RJ-900', CRJ2: 'Borealis RJ-200', GLEX: 'Borealis Globe-X', DH8D: 'Hawkland Q-400', COMT: 'Hawkland Météore',
  F100: 'Falke-100', MD82: 'Meridian-82', MD83: 'Meridian-83', MD11: 'Meridian-11', DC10: 'Meridian-10',
  // Affaires & légers
  GLF6: 'Jetstream G-650', FA7X: 'Faucon 7X', F2TH: 'Faucon 2000', C25A: 'Skylark CJ-2', C25C: 'Skylark CJ-4',
  C510: 'Skylark M-510', C56X: 'Skylark X-56', C172: 'Skylark 172', C152: 'Skylark 152', C208: 'Skylark 208 Cargo',
  PA28: 'Pipit-28', SR22: 'Nimbus-22', PC12: 'Alpina-12', TBM9: 'Dauphin-930', BE20: 'Beechwood 200', LJ45: 'Lynx-45',
  // Historiques & militaires
  CONC: 'Mach-2 Delta', T144: 'Delta-144 Soviétique', SR71: 'Ombre Mach-3', B2: 'Aile Fantôme',
  A225: 'Antares-225 Rêve', A124: 'Antares-124 Titan', IL76: 'Ilyon-76', C130: 'Locksley H-130', L101: 'Locksley Tri-Jet',
  SPIT: 'Seawind Chasseur 38', DC3: 'Dakota-3', DC8: 'Dakota-8', CONI: 'Meridian Trident',
};
// Codes de type fictifs particuliers (sinon : préfixe constructeur + chiffres du code réel)
const CODE_FICTION = {
  BCS1: 'AS221', BCS3: 'AS223', CONC: 'FB2', T144: 'TP144', SR71: 'LK3', B2: 'NS2', SPIT: 'SE38', CONI: 'MD3T',
  COMT: 'HK4', GLEX: 'BOGX', VC25: 'OR74F', A3ST: 'ASBL', A337: 'ASBX', A310M: 'AS31R',
};

// Substitution de lettres pour « rendre fictif » un code inconnu (C152 -> K-152)
const SUB = { A: 'V', B: 'Q', C: 'K', D: 'T', E: 'R', F: 'Z', G: 'N', H: 'X', I: 'Y', J: 'G', K: 'C', L: 'M', M: 'W', N: 'P', O: 'U', P: 'S', Q: 'J', R: 'H', S: 'F', T: 'D', U: 'O', V: 'B', W: 'L', X: 'E', Y: 'I', Z: 'A' };
export const scrambleCode = code => String(code || '').toUpperCase().replace(/[A-Z]/g, ch => SUB[ch] || ch);

const CATEGORY = {
  narrow: 'Moyen-courrier', wide: 'Gros-porteur', wide6: 'Cargo géant', quad: 'Quadriréacteur', quadprop: 'Cargo militaire',
  bizjet: 'Jet privé de luxe', prop: 'Turbopropulseur régional', ga: 'Avion de tourisme', delta: 'Supersonique', stealth: 'Appareil furtif',
};

/** Applique le camouflage à un modèle du catalogue (conserve realName / realMaker en interne). */
export function applyModelFiction(m) {
  if (m.realName) return m;
  m.realName = m.name;
  m.realMaker = m.maker;
  if (m.generic) {
    // Repli : type inconnu -> code rendu fictif + catégorie générique
    const t = String(m.id || 'GEN');
    const fic = t === 'GEN' ? 'X-000' : scrambleCode(t).replace(/^([A-Z]+)(\d)/, '$1-$2');
    m.name = MODEL_FICTION[t] || (t === 'GEN' ? 'Appareil non identifié' : `Appareil ${fic}`);
    m.maker = '—';
    m.code = CODE_FICTION[t] || scrambleCode(t);
    return m;
  }
  const maker = MAKER_FICTION[m.maker] || (m.maker && m.maker !== '—' ? `${m.maker.slice(0, 4)}-Aero` : '—');
  const pre = MAKER_PREFIX[maker] || maker.slice(0, 2).toUpperCase();
  const tail = /^[A-Z]+\d/.test(m.id) ? m.id.replace(/^[A-Z]+/, '') : scrambleCode(m.id);
  m.maker = maker;
  m.code = CODE_FICTION[m.id] || pre + tail;
  m.name = MODEL_FICTION[m.id] || `${maker.split(/[ -]/)[0]}-${tail}`;
  m.category = CATEGORY[m.shape] || 'Appareil';
  return m;
}
