// Catalogue des avions : raretés, modèles, silhouettes SVG.
import { applyModelFiction } from './brand.js';

export const RARITIES = {
  common:    { id: 'common',    code: 'C', label: 'Commune',      color: '#9aa7b5', weight: 60,  fragments: 5,   xp: 10,  order: 0 },
  uncommon:  { id: 'uncommon',  code: 'U', label: 'Peu commune',  color: '#4ade80', weight: 25,  fragments: 10,  xp: 20,  order: 1 },
  rare:      { id: 'rare',      code: 'R', label: 'Rare',         color: '#38bdf8', weight: 10,  fragments: 25,  xp: 50,  order: 2 },
  epic:      { id: 'epic',      code: 'E', label: 'Épique',       color: '#c084fc', weight: 4,   fragments: 60,  xp: 120, order: 3 },
  legendary: { id: 'legendary', code: 'L', label: 'Légendaire',   color: '#fbbf24', weight: 1,   fragments: 150, xp: 300, order: 4 },
};
export const RARITY_LIST = Object.values(RARITIES);

// id = code type ICAO (celui renvoyé par l'ADS-B)
const m = (id, name, maker, rarity, year, speed, range, seats, shape, historic = false) =>
  ({ id, name, maker, rarity, year, speed, range, seats, shape, historic });

export const MODELS = [
  // ---- Communes : le pain quotidien du ciel
  m('A320', 'Airbus A320',       'Airbus', 'common', 1988, 830, 6150, 180, 'narrow'),
  m('A319', 'Airbus A319',       'Airbus', 'common', 1995, 830, 6850, 144, 'narrow'),
  m('A20N', 'Airbus A320neo',    'Airbus', 'common', 2016, 833, 6500, 186, 'narrow'),
  m('A321', 'Airbus A321',       'Airbus', 'common', 1993, 830, 5950, 220, 'narrow'),
  m('B737', 'Boeing 737-700',    'Boeing', 'common', 1998, 830, 6370, 149, 'narrow'),
  m('B738', 'Boeing 737-800',    'Boeing', 'common', 1998, 842, 5765, 189, 'narrow'),
  m('B38M', 'Boeing 737 MAX 8',  'Boeing', 'common', 2017, 839, 6570, 178, 'narrow'),
  m('C172', 'Cessna 172 Skyhawk','Cessna', 'common', 1956, 226, 1289, 4,   'ga'),
  m('PA28', 'Piper PA-28 Cherokee','Piper','common', 1961, 230, 1000, 4,   'ga'),
  m('SR22', 'Cirrus SR22',       'Cirrus', 'common', 2001, 340, 1900, 4,   'ga'),
  // ---- Peu communes
  m('A21N', 'Airbus A321neo',    'Airbus', 'uncommon', 2017, 828, 7400, 244, 'narrow'),
  m('A318', 'Airbus A318 « Baby Bus »','Airbus','uncommon', 2003, 828, 7800, 132, 'narrow'),
  m('E190', 'Embraer E190',      'Embraer','uncommon', 2004, 823, 4500, 114, 'narrow'),
  m('E170', 'Embraer E170',      'Embraer','uncommon', 2004, 823, 3982, 80,  'narrow'),
  m('E75L', 'Embraer E175',      'Embraer','uncommon', 2005, 823, 4000, 88,  'narrow'),
  m('CRJ9', 'Bombardier CRJ-900','Bombardier','uncommon', 2003, 870, 2870, 90, 'narrow'),
  m('CRJ2', 'Bombardier CRJ-200','Bombardier','uncommon', 1992, 830, 3000, 50, 'narrow'),
  m('AT72', 'ATR 72-500',        'ATR',    'uncommon', 1997, 510, 1665, 70,  'prop'),
  m('AT76', 'ATR 72-600',        'ATR',    'uncommon', 2010, 510, 1665, 78,  'prop'),
  m('DH8D', 'Dash 8 Q400',       'De Havilland','uncommon', 2000, 667, 2040, 78, 'prop'),
  m('B752', 'Boeing 757-200',    'Boeing', 'uncommon', 1983, 850, 7250, 200, 'narrow'),
  m('C25A', 'Cessna Citation CJ2','Cessna','uncommon', 2000, 720, 2900, 8,   'bizjet'),
  m('PC12', 'Pilatus PC-12',     'Pilatus','uncommon', 1994, 528, 3400, 9,   'ga'),
  m('TBM9', 'Daher TBM 930',     'Daher',  'uncommon', 2016, 611, 3300, 6,   'ga'),
  // ---- Rares : les gros porteurs
  m('A332', 'Airbus A330-200',   'Airbus', 'rare', 1998, 871, 13450, 246, 'wide'),
  m('A333', 'Airbus A330-300',   'Airbus', 'rare', 1992, 871, 11750, 277, 'wide'),
  m('A339', 'Airbus A330-900neo','Airbus', 'rare', 2018, 871, 13300, 287, 'wide'),
  m('A359', 'Airbus A350-900',   'Airbus', 'rare', 2015, 903, 15000, 325, 'wide'),
  m('B763', 'Boeing 767-300',    'Boeing', 'rare', 1986, 851, 11070, 250, 'wide'),
  m('B772', 'Boeing 777-200',    'Boeing', 'rare', 1995, 892, 9700, 313, 'wide'),
  m('B77W', 'Boeing 777-300ER',  'Boeing', 'rare', 2004, 892, 13650, 396, 'wide'),
  m('B788', 'Boeing 787-8 Dreamliner','Boeing','rare', 2011, 903, 13530, 242, 'wide'),
  m('B789', 'Boeing 787-9 Dreamliner','Boeing','rare', 2014, 903, 14140, 290, 'wide'),
  m('GLF6', 'Gulfstream G650',   'Gulfstream','rare', 2012, 904, 12970, 19, 'bizjet'),
  m('K35R', 'Boeing KC-135 Stratotanker','Boeing','rare', 1957, 851, 2419, 3, 'wide'),
  // ---- Épiques
  m('A35K', 'Airbus A350-1000',  'Airbus', 'epic', 2018, 903, 16100, 410, 'wide'),
  m('B78X', 'Boeing 787-10 Dreamliner','Boeing','epic', 2018, 903, 11910, 330, 'wide'),
  m('B744', 'Boeing 747-400 « Jumbo Jet »','Boeing','epic', 1989, 913, 13450, 416, 'quad'),
  m('A343', 'Airbus A340-300',   'Airbus', 'epic', 1993, 880, 13500, 295, 'quad'),
  m('A346', 'Airbus A340-600',   'Airbus', 'epic', 2002, 905, 13900, 380, 'quad'),
  m('C17',  'Boeing C-17 Globemaster III','Boeing','epic', 1991, 830, 4482, 102, 'quad'),
  m('A400', 'Airbus A400M Atlas','Airbus', 'epic', 2013, 780, 8900, 116, 'quadprop'),
  m('C130', 'Lockheed C-130 Hercules','Lockheed','epic', 1956, 590, 3800, 92, 'quadprop'),
  // ---- Légendaires
  m('A388', 'Airbus A380-800',   'Airbus', 'legendary', 2007, 945, 15200, 853, 'quad'),
  m('B748', 'Boeing 747-8 Intercontinental','Boeing','legendary', 2011, 933, 14815, 467, 'quad'),
  m('A3ST', 'Airbus Beluga',     'Airbus', 'legendary', 1994, 750, 2780, 2, 'wide'),
  m('A337', 'Airbus BelugaXL',   'Airbus', 'legendary', 2018, 737, 4000, 2, 'wide'),
  m('B52',  'Boeing B-52 Stratofortress','Boeing','legendary', 1952, 1000, 14100, 5, 'quad'),
  m('B2',   'Northrop B-2 Spirit','Northrop','legendary', 1989, 1010, 11100, 2, 'stealth'),
  m('VC25', 'Boeing VC-25 « Air Force One »','Boeing','legendary', 1990, 920, 12550, 102, 'quad'),
  // ---- Autres types fréquents dans le ciel réel (pour que le radar soit riche)
  m('B733', 'Boeing 737-300',    'Boeing', 'common', 1984, 800, 4400, 140, 'narrow'),
  m('B734', 'Boeing 737-400',    'Boeing', 'common', 1988, 800, 5000, 168, 'narrow'),
  m('B739', 'Boeing 737-900',    'Boeing', 'common', 2001, 840, 5900, 189, 'narrow'),
  m('B39M', 'Boeing 737 MAX 9',  'Boeing', 'common', 2018, 839, 6570, 220, 'narrow'),
  m('E145', 'Embraer ERJ-145',   'Embraer','common', 1996, 830, 2800, 50,  'narrow'),
  m('BE20', 'Beechcraft King Air 200','Beechcraft','common', 1974, 536, 3000, 9, 'prop'),
  m('C208', 'Cessna 208 Caravan','Cessna', 'common', 1984, 344, 1980, 9,   'prop'),
  m('BCS1', 'Airbus A220-100',   'Airbus', 'uncommon', 2016, 828, 6100, 133, 'narrow'),
  m('BCS3', 'Airbus A220-300',   'Airbus', 'uncommon', 2016, 828, 6300, 160, 'narrow'),
  m('E195', 'Embraer E195',      'Embraer','uncommon', 2004, 823, 4260, 124, 'narrow'),
  m('E295', 'Embraer E195-E2',   'Embraer','uncommon', 2019, 833, 4800, 146, 'narrow'),
  m('MD82', 'McDonnell Douglas MD-82','McDonnell Douglas','uncommon', 1981, 811, 4000, 172, 'narrow'),
  m('MD83', 'McDonnell Douglas MD-83','McDonnell Douglas','uncommon', 1985, 811, 4630, 172, 'narrow'),
  m('F100', 'Fokker 100',        'Fokker', 'uncommon', 1988, 845, 3170, 109, 'narrow'),
  m('C510', 'Cessna Citation Mustang','Cessna','uncommon', 2006, 630, 2130, 4, 'bizjet'),
  m('C56X', 'Cessna Citation Excel','Cessna','uncommon', 1998, 815, 3700, 9, 'bizjet'),
  m('E55P', 'Embraer Phenom 300','Embraer','uncommon', 2009, 839, 3650, 10, 'bizjet'),
  m('F2TH', 'Dassault Falcon 2000','Dassault','uncommon', 1994, 850, 5700, 10, 'bizjet'),
  m('A306', 'Airbus A300-600',   'Airbus', 'rare', 1983, 833, 7500, 266, 'wide'),
  m('A310', 'Airbus A310',       'Airbus', 'rare', 1983, 850, 9600, 240, 'wide'),
  m('B753', 'Boeing 757-300',    'Boeing', 'rare', 1999, 850, 6000, 243, 'narrow'),
  m('B764', 'Boeing 767-400ER',  'Boeing', 'rare', 2000, 851, 10415, 304, 'wide'),
  m('B77L', 'Boeing 777-200LR',  'Boeing', 'rare', 2006, 892, 15843, 301, 'wide'),
  m('B779', 'Boeing 777-9',      'Boeing', 'rare', 2020, 905, 13500, 426, 'wide'),
  m('FA7X', 'Dassault Falcon 7X','Dassault','rare', 2007, 900, 11000, 14, 'bizjet'),
  m('GLEX', 'Bombardier Global Express','Bombardier','rare', 1996, 904, 11100, 19, 'bizjet'),
  m('IL76', 'Iliouchine Il-76',  'Iliouchine','rare', 1971, 850, 4000, 5, 'quad'),
  m('A124', 'Antonov An-124 Ruslan','Antonov','epic', 1982, 800, 4800, 88, 'quad'),
  m('A310M', 'Airbus A310 MRTT', 'Airbus', 'epic', 2011, 860, 8000, 5, 'wide'),
  // ---- HISTORIQUES : uniquement via packs & apparitions spéciales
  m('B721', 'Boeing 727-100',    'Boeing', 'uncommon', 1963, 960, 4170, 131, 'narrow', true),
  m('DC8',  'Douglas DC-8',      'Douglas','rare', 1959, 933, 9800, 189, 'quad', true),
  m('DC10', 'McDonnell Douglas DC-10','McDonnell Douglas','rare', 1971, 982, 9900, 380, 'wide', true),
  m('L101', 'Lockheed L-1011 TriStar','Lockheed','rare', 1972, 964, 7500, 400, 'wide', true),
  m('MD11', 'McDonnell Douglas MD-11','McDonnell Douglas','rare', 1990, 876, 12670, 410, 'wide', true),
  m('B741', 'Boeing 747-100',    'Boeing', 'epic', 1970, 895, 9800, 366, 'quad', true),
  m('DC3',  'Douglas DC-3',      'Douglas','epic', 1935, 333, 2400, 32, 'prop', true),
  m('COMT', 'de Havilland Comet','De Havilland','epic', 1952, 788, 2800, 36, 'quad', true),
  m('CONI', 'Lockheed Constellation','Lockheed','epic', 1943, 555, 8700, 62, 'quadprop', true),
  m('SPIT', 'Supermarine Spitfire','Supermarine','epic', 1938, 594, 1840, 1, 'ga', true),
  m('CONC', 'Concorde',          'Aérospatiale/BAC','legendary', 1969, 2179, 7220, 100, 'delta', true),
  m('T144', 'Tupolev Tu-144',    'Tupolev','legendary', 1968, 2120, 6500, 140, 'delta', true),
  m('A225', 'Antonov An-225 Mriya','Antonov','legendary', 1988, 800, 15400, 6, 'wide6', true),
  m('SR71', 'Lockheed SR-71 Blackbird','Lockheed','legendary', 1966, 3540, 5400, 2, 'delta', true),
];

// Camouflage juridique : noms, constructeurs et codes affichés deviennent fictifs (vrais noms gardés en interne)
MODELS.forEach(applyModelFiction);

export const BY_ID = Object.fromEntries(MODELS.map(x => [x.id, x]));
export const MODERN = MODELS.filter(x => !x.historic);
export const HISTORIC = MODELS.filter(x => x.historic);

// Le modèle d'un type ADS-B (inconnu => carte générique commune).
export function getModel(type) {
  if (type && BY_ID[type]) return BY_ID[type];
  const t = type || 'GEN';
  return applyModelFiction({ id: t, name: type ? `Appareil ${type}` : 'Appareil inconnu', maker: '—', rarity: 'common',
           year: null, speed: null, range: null, seats: null, shape: 'narrow', historic: false, generic: true });
}

export function isWide(model) { return /wide|quad/.test(model.shape); }

// ------------------------------------------------------------------
// Illustrations photoréalistes validées (100 % conformes : nombre de moteurs,
// silhouette entière, train rentré, zéro cartoon) + variantes de même architecture.
// ------------------------------------------------------------------
export const ART_MAP = {
  // Règle « passionnés » : une photo n'est utilisée QUE pour son modèle exact ou une variante quasi identique.
  // Les autres modèles utilisent l'illustration vectorielle aux couleurs de la compagnie (jamais un autre avion).
  BCS3: { src: 'BCS3.jpg' },
  BCS1: { src: 'BCS3.jpg' },                                 // A220-100 : même silhouette, fuselage plus court
  A332: { src: 'A332.jpg' },
  A333: { src: 'A332.jpg' },
  A339: { src: 'A332.jpg' },
  AT72: { src: 'AT72.jpg' },
  AT76: { src: 'AT72.jpg' },
  GLF6: { src: 'GLF6.jpg' },
  A400: { src: 'A400.jpg' },
  K35R: { src: 'K35R.jpg' },
  // A337 (« AIRBUS BELUGA XL » peint), A225 (« ANTONOV »), SR71 (« U.S. AIR FORCE ») retirés : textes de marque visibles, à régénérer
  B2:   { src: 'B2.jpg' },
};

// ------------------------------------------------------------------
// Silhouettes vues de dessus aérodynamiques (nez vers le haut), viewBox 100x100
// 13 familles distinctes :
//  1. narrow     : biréacteur court/moyen-courrier (A320, B737, E190...)
//  2. wide       : biréacteur long-courrier (A350, B777, B787, A330...)
//  3. quad       : quadriréacteur long-courrier (B747, A340, DC-8...)
//  4. a380       : Airbus A380 (double-pont massif, ailes géantes à forte corde)
//  5. beluga     : Airbus Beluga / BelugaXL (fuselage cargo bulbeux + empennage en H)
//  6. wide6      : Cargo géant An-124 / An-225 (ailes hautes larges, 4 à 6 réacteurs, double dérive)
//  7. delta      : Supersonique Concorde / Tu-144 (aile delta ogivale + nez pointu)
//  8. sr71       : Lockheed SR-71 Blackbird (fuselage chines + nacelles J58 à cônes d'entrée)
//  9. stealth    : Northrop B-2 Spirit (aile volante furtive en W)
// 10. prop       : Turbopropulseur régional (ATR 72, Q400, King Air : aile droite haute + hélices)
// 11. bizjet     : Jet d'affaires (Gulfstream, Falcon, Citation : moteurs arrière + winglets)
// 12. vintage    : Avion à hélice ancien (Spitfire aile elliptique, DC-3, Constellation triple dérive)
// 13. military   : Militaire de transport / stratégique (C-17, A400M, C-130, Il-76, B-52, KC-135)
// ------------------------------------------------------------------
export function resolvePlaneFamily(input = 'narrow') {
  const id = typeof input === 'object' && input !== null ? (input.id || '') : String(input || '');
  const shape = typeof input === 'object' && input !== null ? (input.shape || 'narrow') : String(input || 'narrow');

  if (id === 'A388' || shape === 'a380') return 'a380';
  if (id === 'A3ST' || id === 'A337' || shape === 'beluga') return 'beluga';
  if (id === 'A225' || id === 'A124' || shape === 'wide6') return 'wide6';
  if (id === 'SR71' || shape === 'sr71') return 'sr71';
  if (id === 'B2' || shape === 'stealth') return 'stealth';
  if (id === 'CONC' || id === 'T144' || shape === 'delta') return 'delta';
  if (id === 'SPIT' || id === 'DC3' || id === 'CONI' || shape === 'vintage') return 'vintage';
  if (/^(C17|A400|C130|K35R|IL76|B52|A310M)$/.test(id) || shape === 'military' || shape === 'quadprop') return 'military';
  if (shape === 'bizjet') return 'bizjet';
  if (shape === 'prop' || shape === 'ga') return 'prop';
  if (shape === 'quad') return 'quad';
  if (shape === 'wide') return 'wide';
  return 'narrow';
}

export function planeSVG(modelOrShape = 'narrow', fill = 'currentColor') {
  const id = typeof modelOrShape === 'object' && modelOrShape !== null ? (modelOrShape.id || '') : String(modelOrShape || '');
  const fam = resolvePlaneFamily(modelOrShape);

  // 7. Supersonique Concorde / Tu-144 (aile delta ogivale fluide + nez aiguille)
  if (fam === 'delta') {
    const canards = id === 'T144'
      ? `<polygon points="46.5,20 39,26 39,28 46.5,25"/><polygon points="53.5,20 61,26 61,28 53.5,25"/>`
      : '';
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      ${canards}
      <path d="M50,3 L52.2,17 C53.5,28 58,42 79,76 L79,82 L54.5,78 L52.5,93 L50,97 L47.5,93 L45.5,78 L21,82 L21,76 C42,42 46.5,28 47.8,17 Z"/>
      <rect x="34" y="75" width="6" height="8" rx="1.2"/>
      <rect x="60" y="75" width="6" height="8" rx="1.2"/>
      <path d="M48.5,12 L51.5,12 L52,19 L48,19 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 8. Lockheed SR-71 Blackbird (double delta + nacelles moteurs J58 déportées + double dérive)
  if (fam === 'sr71') {
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <path d="M50,4 L53,16 L54.5,34 L63,46 L63,29 L65.5,24 L68,29 L68,52 L83,76 L83,81 L68,79 L68,87 L63,87 L63,79 L54,80 L52,93 L50,96 L48,93 L46,80 L37,79 L37,87 L32,87 L32,79 L17,81 L17,76 L32,52 L32,29 L34.5,24 L37,29 L37,46 L45.5,34 L47,16 Z"/>
      <circle cx="50" cy="18" r="1.8" fill="#0b1230" opacity=".6"/>
    </svg>`;
  }

  // 9. Northrop B-2 Spirit (aile volante furtive en dents de scie)
  if (fam === 'stealth') {
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <polygon points="50,18 96,58 82,67 69,56 58,68 50,60 42,68 31,56 18,67 4,58"/>
      <polygon points="44,28 50,24 56,28 54,32 46,32" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 4. Airbus A380 (double-pont massif, ailes très larges à forte corde à l'emplanture, 4 gros réacteurs)
  if (fam === 'a380') {
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <path d="M43,32 L5,56 L5,63 L14,61 L43,53 Z"/>
      <path d="M57,32 L95,56 L95,63 L86,61 L57,53 Z"/>
      <polygon points="5,54 3,58 3,64 5,63"/>
      <polygon points="95,54 97,58 97,64 95,63"/>
      <rect x="27" y="38" width="6" height="11" rx="2.6"/>
      <rect x="14" y="46" width="6" height="11" rx="2.6"/>
      <rect x="67" y="38" width="6" height="11" rx="2.6"/>
      <rect x="80" y="46" width="6" height="11" rx="2.6"/>
      <polygon points="45,76 23,88 23,93 46,87"/>
      <polygon points="55,76 77,88 77,93 54,87"/>
      <path d="M50,6 C55,6 57.5,12 57.5,20 L57.5,74 C57.5,83 54,91 50,95 C46,91 42.5,83 42.5,74 L42.5,20 C42.5,12 45,6 50,6 Z"/>
      <path d="M46,12 Q50,9 54,12 L55,16 Q50,14 45,16 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 5. Airbus Beluga / BelugaXL (fuselage cargo géant bulbeux à l'avant + empennage en H à stabilisateurs verticaux)
  if (fam === 'beluga') {
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <path d="M41,36 L12,53 L12,58 L41,50 Z"/>
      <path d="M59,36 L88,53 L88,58 L59,50 Z"/>
      <rect x="25" y="40" width="5.2" height="10" rx="2.3"/>
      <rect x="69.8" y="40" width="5.2" height="10" rx="2.3"/>
      <polygon points="46,76 26,85 26,90 46,84"/>
      <polygon points="54,76 74,85 74,90 54,84"/>
      <rect x="24.5" y="82" width="3" height="10" rx="1"/>
      <rect x="72.5" y="82" width="3" height="10" rx="1"/>
      <path d="M50,7 C58,7 61.5,15 61.5,28 C61.5,44 58.5,58 55,74 C53.5,82 52,89 50,94 C48,89 46.5,82 45,74 C41.5,58 38.5,44 38.5,28 C38.5,15 42,7 50,7 Z"/>
      <path d="M45,15 Q50,12 55,15 L56,19 Q50,17 44,19 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 6. Cargo géant An-124 / An-225 Mriya (ailes hautes à flèche modérée, 6/4 réacteurs, empennage bidérive en H sur An-225)
  if (fam === 'wide6') {
    const is225 = id === 'A225';
    const engines = is225 ? [0.24, 0.42, 0.60] : [0.30, 0.54];
    let engs = '';
    for (const k of engines) {
      for (const sg of [-1, 1]) {
        const ex = 50 + sg * 45 * k;
        const ey = 32 + 16 * k;
        engs += `<rect x="${ex - 2.3}" y="${ey - 5}" width="4.6" height="10" rx="2"/>`;
      }
    }
    const tail = is225
      ? `<polygon points="45,76 22,83 22,88 46,84"/><polygon points="55,76 78,83 78,88 54,84"/>
         <rect x="20.5" y="79" width="3.2" height="12" rx="1.2"/><rect x="76.3" y="79" width="3.2" height="12" rx="1.2"/>`
      : `<polygon points="45,76 24,86 24,91 46,84"/><polygon points="55,76 76,86 76,91 54,84"/>`;
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <path d="M43,29 L4,48 L4,55 L43,46 Z"/>
      <path d="M57,29 L96,48 L96,55 L57,46 Z"/>
      ${engs}
      ${tail}
      <path d="M50,5 C55,5 57.5,11 57.5,19 L57.5,74 C57.5,83 54,90 50,95 C46,90 42.5,83 42.5,74 L42.5,19 C42.5,11 45,5 50,5 Z"/>
      <path d="M46,12 Q50,9 54,12 L55,16 Q50,14 45,16 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 12. Avion à hélice ancien (Spitfire elliptique / Constellation triple dérive / DC-3 Dakota)
  if (fam === 'vintage') {
    if (id === 'SPIT') {
      return `<svg viewBox="0 0 100 100" fill="${fill}">
        <rect x="42" y="10" width="16" height="2" rx="1"/>
        <path d="M46,34 C22,33 8,40 8,47 C8,54 24,58 46,54 Z"/>
        <path d="M54,34 C78,33 92,40 92,47 C92,54 76,58 54,54 Z"/>
        <path d="M47,76 C35,76 28,80 28,84 C28,87 36,89 47,86 Z"/>
        <path d="M53,76 C65,76 72,80 72,84 C72,87 64,89 53,86 Z"/>
        <path d="M50,11 C53,11 54.5,18 54.5,32 L53,82 C52,89 51,93 50,95 C49,93 48,89 47,82 L45.5,32 C45.5,18 47,11 50,11 Z"/>
        <ellipse cx="50" cy="46" rx="2.4" ry="5" fill="#0b1230" opacity=".55"/>
      </svg>`;
    }
    if (id === 'CONI') {
      return `<svg viewBox="0 0 100 100" fill="${fill}">
        <path d="M45,35 L6,42 L6,49 L45,48 Z"/>
        <path d="M55,35 L94,42 L94,49 L55,48 Z"/>
        <rect x="29" y="33" width="3.8" height="10" rx="1.6"/><rect x="25" y="32" width="11.8" height="1.6" rx=".8"/>
        <rect x="16" y="35" width="3.8" height="10" rx="1.6"/><rect x="12" y="34" width="11.8" height="1.6" rx=".8"/>
        <rect x="67.2" y="33" width="3.8" height="10" rx="1.6"/><rect x="63.2" y="32" width="11.8" height="1.6" rx=".8"/>
        <rect x="80.2" y="35" width="3.8" height="10" rx="1.6"/><rect x="76.2" y="34" width="11.8" height="1.6" rx=".8"/>
        <polygon points="46,77 25,82 25,87 46,85"/>
        <polygon points="54,77 75,82 75,87 54,85"/>
        <rect x="24" y="78" width="2.6" height="11" rx="1"/>
        <rect x="48.7" y="78" width="2.6" height="12" rx="1"/>
        <rect x="73.4" y="78" width="2.6" height="11" rx="1"/>
        <path d="M50,9 C53.5,9 55.5,18 55.5,34 C55.5,52 53.5,72 50,93 C46.5,72 44.5,52 44.5,34 C44.5,18 46.5,9 50,9 Z"/>
      </svg>`;
    }
    // DC-3 Dakota (ailes basses trapézoïdales à bord d'attaque fléchi + 2 moteurs en étoile)
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <polygon points="45,32 7,44 7,50 45,49"/>
      <polygon points="55,32 93,44 93,50 55,49"/>
      <rect x="31" y="29" width="5" height="11" rx="2"/><rect x="26" y="27.5" width="15" height="1.8" rx=".9"/>
      <rect x="64" y="29" width="5" height="11" rx="2"/><rect x="59" y="27.5" width="15" height="1.8" rx=".9"/>
      <polygon points="46,75 28,82 28,87 47,85"/>
      <polygon points="54,75 72,82 72,87 53,85"/>
      <path d="M50,11 C54,11 55.5,17 55.5,28 L54,78 C53,86 51.5,91 50,93 C48.5,91 47,86 46,78 L44.5,28 C44.5,17 46,11 50,11 Z"/>
      <path d="M46.5,16 Q50,14 53.5,16 L54,19 Q50,18 46,19 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 13. Militaire de transport / stratégique (C-17, A400M, C-130, B-52, Il-76, KC-135)
  if (fam === 'military') {
    const isPropMil = id === 'A400' || id === 'C130';
    const isB52 = id === 'B52';
    if (isB52) {
      return `<svg viewBox="0 0 100 100" fill="${fill}">
        <polygon points="46,26 4,56 4,61 46,38"/>
        <polygon points="54,26 96,56 96,61 54,38"/>
        <rect x="28" y="34" width="5" height="9" rx="1.5"/>
        <rect x="15" y="43" width="5" height="9" rx="1.5"/>
        <rect x="67" y="34" width="5" height="9" rx="1.5"/>
        <rect x="80" y="43" width="5" height="9" rx="1.5"/>
        <polygon points="46,78 30,88 30,92 47,86"/>
        <polygon points="54,78 70,88 70,92 53,86"/>
        <path d="M50,6 C53,6 54.2,12 54.2,20 L54.2,80 C54.2,88 52,93 50,96 C48,93 45.8,88 45.8,80 L45.8,20 C45.8,12 47,6 50,6 Z"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <polygon points="43,30 7,${isPropMil ? 36 : 46} 7,${isPropMil ? 44 : 53} 43,45"/>
      <polygon points="57,30 93,${isPropMil ? 36 : 46} 93,${isPropMil ? 44 : 53} 57,45"/>
      ${isPropMil
        ? `<rect x="28" y="29" width="4" height="10" rx="1.5"/><rect x="23.5" y="27.5" width="13" height="1.8" rx=".9"/>
           <rect x="15" y="31" width="4" height="10" rx="1.5"/><rect x="10.5" y="29.5" width="13" height="1.8" rx=".9"/>
           <rect x="68" y="29" width="4" height="10" rx="1.5"/><rect x="63.5" y="27.5" width="13" height="1.8" rx=".9"/>
           <rect x="81" y="31" width="4" height="10" rx="1.5"/><rect x="76.5" y="29.5" width="13" height="1.8" rx=".9"/>`
        : `<rect x="28" y="34" width="5" height="10" rx="2.2"/>
           <rect x="16" y="40" width="5" height="10" rx="2.2"/>
           <rect x="67" y="34" width="5" height="10" rx="2.2"/>
           <rect x="79" y="40" width="5" height="10" rx="2.2"/>`}
      <polygon points="45,76 24,84 24,90 46,86"/>
      <polygon points="55,76 76,84 76,90 54,86"/>
      <path d="M50,9 C55.5,9 58,15 58,23 L58,68 C58,77 54.5,86 50,93 C45.5,86 42,77 42,68 L42,23 C42,15 44.5,9 50,9 Z"/>
      <path d="M45.5,15 Q50,12 54.5,15 L55.5,19 Q50,17 44.5,19 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 10. Turbopropulseur régional / aviation légère (ATR 72, Dash 8 Q400, King Air, Cessna)
  if (fam === 'prop') {
    const single = id === 'C172' || id === 'PA28' || id === 'SR22' || id === 'PC12' || id === 'TBM9' || id === 'C208' || modelOrShape === 'ga';
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      ${single ? `<rect x="42" y="12" width="16" height="2" rx="1"/>` : ''}
      <polygon points="46,36 9,39 9,46 46,46"/>
      <polygon points="54,36 91,39 91,46 54,46"/>
      ${single ? '' : `
        <rect x="29" y="31" width="4" height="11" rx="1.8"/><rect x="23" y="29.5" width="16" height="1.8" rx=".9"/>
        <rect x="67" y="31" width="4" height="11" rx="1.8"/><rect x="61" y="29.5" width="16" height="1.8" rx=".9"/>
      `}
      <polygon points="46.5,76 30,81 30,86 47,84"/>
      <polygon points="53.5,76 70,81 70,86 53,84"/>
      <path d="M50,13 C53.2,13 54.5,18 54.5,25 L54.5,74 C54.5,82 52.2,88 50,91 C47.8,88 45.5,82 45.5,74 L45.5,25 C45.5,18 46.8,13 50,13 Z"/>
      <path d="M47,18 Q50,16 53,18 L53.5,22 Q50,20 46.5,22 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 11. Jet d'affaires (Gulfstream, Falcon, Citation : nez effilé, ailes basses à winglets, réacteurs arrière sur fuselage)
  if (fam === 'bizjet') {
    return `<svg viewBox="0 0 100 100" fill="${fill}">
      <polygon points="46.5,42 18,58 18,63 46.5,54"/>
      <polygon points="53.5,42 82,58 82,63 53.5,54"/>
      <polygon points="18,56 16,60 16,65 18,63"/>
      <polygon points="82,56 84,60 84,65 82,63"/>
      <rect x="41.5" y="64" width="4.2" height="10" rx="2"/>
      <rect x="54.3" y="64" width="4.2" height="10" rx="2"/>
      <polygon points="47,76 32,85 32,89 47.5,83"/>
      <polygon points="53,76 68,85 68,89 52.5,83"/>
      <path d="M50,14 C52.8,14 54,21 54,29 L54,74 C54,82 52,88 50,91 C48,88 46,82 46,74 L46,29 C46,21 47.2,14 50,14 Z"/>
      <path d="M47.2,21 Q50,18.5 52.8,21 L53.2,24.5 Q50,23 46.8,24.5 Z" fill="#0b1230" opacity=".55"/>
    </svg>`;
  }

  // 1, 2, 3. Jets commerciaux : narrow (biréacteur court-courrier), wide (biréacteur long-courrier), quad (quadriréacteur B747/A340)
  const CFG = {
    narrow: { len: 74, w: 8.6,  span: 68, sweep: 17, eng: [0.38], tail: 19, winglet: true },
    wide:   { len: 84, w: 11.2, span: 86, sweep: 22, eng: [0.36], tail: 24, winglet: true },
    quad:   { len: 86, w: 11.6, span: 88, sweep: 24, eng: [0.30, 0.56], tail: 25, winglet: true },
  };
  const s = CFG[fam] || CFG.narrow;
  const cx = 50;
  const top = 50 - s.len / 2, bot = 50 + s.len / 2;
  const wy = 50 - s.len * 0.12;
  const h = s.w / 2;
  let g = '';
  for (const sg of [-1, 1]) {
    const tipX = cx + sg * (s.span / 2);
    const tipY = wy + s.sweep;
    g += `<path d="M${cx + sg * (h - 0.5)},${wy - 2} L${tipX},${tipY} L${tipX},${tipY + 5.5} L${cx + sg * (h - 0.5)},${wy + 17} Z"/>`;
    if (s.winglet) {
      g += `<polygon points="${tipX},${tipY - 1.5} ${tipX + sg * 2.2},${tipY + 2} ${tipX + sg * 2.2},${tipY + 7} ${tipX},${tipY + 5.5}"/>`;
    }
  }
  for (const sg of [-1, 1]) {
    g += `<polygon points="${cx + sg * (h * 0.7)},${bot - 15} ${cx + sg * s.tail},${bot - 4} ${cx + sg * s.tail},${bot + 0.5} ${cx + sg * (h * 0.5)},${bot - 5}"/>`;
  }
  for (const k of s.eng) {
    for (const sg of [-1, 1]) {
      const ex = cx + sg * (s.span / 2) * k;
      const ey = wy + s.sweep * k + 1.5;
      g += `<rect x="${ex - 2.5}" y="${ey - 5.5}" width="5" height="10.8" rx="2.3"/>`;
    }
  }
  const noseH = Math.min(14, s.len * 0.22);
  const tailH = Math.min(16, s.len * 0.24);
  g += `<path d="M${cx},${top} C${cx + h * 0.75},${top + 2} ${cx + h},${top + noseH * 0.6} ${cx + h},${top + noseH}
    L${cx + h},${bot - tailH} C${cx + h},${bot - tailH * 0.35} ${cx + h * 0.45},${bot - 2} ${cx},${bot}
    C${cx - h * 0.45},${bot - 2} ${cx - h},${bot - tailH * 0.35} ${cx - h},${bot - tailH}
    L${cx - h},${top + noseH} C${cx - h},${top + noseH * 0.6} ${cx - h * 0.75},${top + 2} ${cx},${top} Z"/>`;
  g += `<path d="M${cx - h * 0.52},${top + noseH * 0.52} Q${cx},${top + noseH * 0.28} ${cx + h * 0.52},${top + noseH * 0.52}
    L${cx + h * 0.62},${top + noseH * 0.78} Q${cx},${top + noseH * 0.62} ${cx - h * 0.62},${top + noseH * 0.78} Z" fill="#0b1230" opacity=".55"/>`;
  g += `<rect x="${cx - 0.9}" y="${bot - 15}" width="1.8" height="13" rx=".9" opacity=".7"/>`;
  return `<svg viewBox="0 0 100 100" fill="${fill}">${g}</svg>`;
}
