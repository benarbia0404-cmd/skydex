// Flux de vols : données ADS-B réelles (adsb.lol) avec bascule automatique sur une simulation réaliste.
import { MODERN, HISTORIC, RARITIES, getModel } from './catalog.js';
import { state } from './state.js';

// Relais du jeu (server.py ou fonction serverless) : contourne le blocage CORS et partage le cache entre joueurs.
// Repli : appel direct à adsb.lol (fonctionne seulement si le navigateur l'autorise).
const RELAY = (typeof window !== 'undefined' && window.SKYDEX_API) || '/api';
const API = 'https://api.adsb.lol';
export const NM = 1852;

export const AIRLINES = {
  AFR: 'Air France', BAW: 'British Airways', DLH: 'Lufthansa', RYR: 'Ryanair', EZY: 'easyJet', EZS: 'easyJet Switzerland',
  KLM: 'KLM', IBE: 'Iberia', VLG: 'Vueling', TVF: 'Transavia France', TRA: 'Transavia', HOP: 'Air France HOP', TAP: 'TAP Air Portugal',
  UAE: 'Emirates', QTR: 'Qatar Airways', THY: 'Turkish Airlines', SWR: 'Swiss', AUA: 'Austrian', SAS: 'SAS', FIN: 'Finnair',
  NAX: 'Norwegian', WZZ: 'Wizz Air', AAL: 'American Airlines', DAL: 'Delta', UAL: 'United', ACA: 'Air Canada', ETH: 'Ethiopian',
  AIC: 'Air India', SIA: 'Singapore Airlines', CPA: 'Cathay Pacific', ANA: 'ANA', JAL: 'Japan Airlines', QFA: 'Qantas',
  FDX: 'FedEx', UPS: 'UPS', ELY: 'El Al', RAM: 'Royal Air Maroc', DAH: 'Air Algérie', TAR: 'Tunisair', ITY: 'ITA Airways',
  LOT: 'LOT Polish', BEL: 'Brussels Airlines', EIN: 'Aer Lingus', CFE: 'BA CityFlyer', JBU: 'JetBlue', SWA: 'Southwest',
  VIR: 'Virgin Atlantic', EWG: 'Eurowings', TUI: 'TUI', CLX: 'Cargolux', GEC: 'Lufthansa Cargo',
  CRL: 'Corsair', EJU: 'easyJet', EZS: 'easyJet Switzerland', FPO: 'ASL Airlines France', AEA: 'Air Europa', BCS: 'DHL',
  DHK: 'DHL Aviation', BOX: 'AeroLogic', ETD: 'Etihad Airways', SVA: 'Saudia', MSR: 'EgyptAir', KAL: 'Korean Air',
  CCA: 'Air China', CES: 'China Eastern', CSN: 'China Southern', AZA: 'ITA Airways', ROT: 'TAROM', AFL: 'Aeroflot',
  ICE: 'Icelandair', NOZ: 'Norwegian', SXS: 'SunExpress', PGT: 'Pegasus', VOE: 'Volotea', NSZ: 'Norwegian Air Sweden',
  BEE: 'Flybe', LOG: 'Loganair', SWT: 'Swiftair', CFG: 'Condor', TAY: 'ASL Airlines Belgium', ABR: 'ASL Airlines Ireland',
  AFX: 'Air Freight Express', QFA: 'Qantas', EVA: 'EVA Air', THA: 'Thai Airways', MAS: 'Malaysia Airlines',
};

export const AIRPORTS = [
  ['CDG', 'Paris Charles-de-Gaulle', 49.0097, 2.5479],
  ['ORY', 'Paris Orly', 48.7233, 2.3794],
  ['NCE', 'Nice Côte d\'Azur', 43.6584, 7.2159],
  ['LYS', 'Lyon Saint-Exupéry', 45.7256, 5.0811],
  ['MRS', 'Marseille Provence', 43.4393, 5.2214],
  ['TLS', 'Toulouse-Blagnac', 43.6293, 1.3638],
  ['LHR', 'Londres Heathrow', 51.47, -0.4543],
  ['AMS', 'Amsterdam Schiphol', 52.3105, 4.7683],
  ['FRA', 'Francfort', 50.0379, 8.5622],
  ['MUC', 'Munich', 48.3538, 11.7861],
  ['HAM', 'Hambourg', 53.6304, 9.9882],
  ['ZRH', 'Zurich', 47.4647, 8.5492],
  ['GVA', 'Genève', 46.2381, 6.1089],
  ['MAD', 'Madrid Barajas', 40.4983, -3.5676],
  ['BCN', 'Barcelone El Prat', 41.2974, 2.0833],
  ['LIS', 'Lisbonne', 38.7742, -9.1342],
  ['FCO', 'Rome Fiumicino', 41.8003, 12.2389],
  ['VIE', 'Vienne', 48.1103, 16.5697],
  ['BRU', 'Bruxelles', 50.9014, 4.4844],
  ['LUX', 'Luxembourg', 49.6233, 6.2044],
  ['DUB', 'Dublin', 53.4264, -6.2499],
  ['CPH', 'Copenhague', 55.618, 12.6508],
  ['OSL', 'Oslo Gardermoen', 60.1976, 11.1004],
  ['HEL', 'Helsinki Vantaa', 60.3172, 24.9633],
  ['WAW', 'Varsovie Chopin', 52.1657, 20.9671],
  ['IST', 'Istanbul', 41.2753, 28.7519],
  ['CMN', 'Casablanca', 33.3675, -7.5899],
  ['ALG', 'Alger Houari Boumédiène', 36.691, 3.2154],
  ['TUN', 'Tunis Carthage', 36.851, 10.2272],
  ['JFK', 'New York JFK', 40.6413, -73.7781],
  ['BOS', 'Boston Logan', 42.3656, -71.0096],
  ['IAD', 'Washington Dulles', 38.9531, -77.4565],
  ['ORD', 'Chicago O\'Hare', 41.9742, -87.9073],
  ['YYZ', 'Toronto Pearson', 43.6777, -79.6248],
  ['DXB', 'Dubaï', 25.2532, 55.3657],
  ['DOH', 'Doha Hamad', 25.2731, 51.6081],
  ['MCT', 'Mascate', 23.5933, 58.2844],
  ['SIN', 'Singapour Changi', 1.3644, 103.9915],
  ['HND', 'Tokyo Haneda', 35.5494, 139.7798],
  ['KIX', 'Osaka Kansai', 34.4347, 135.244],
  ['FUK', 'Fukuoka', 33.5859, 130.4511],
];

const AP_BY_CODE = Object.fromEntries(AIRPORTS.map(a => [a[0], a]));

const L = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(Math.random() * 26) | 0];
const D = () => '0123456789'[(Math.random() * 10) | 0];

/** Profils réalistes des compagnies : préfixe d'immatriculation national, hubs et flotte réelle. */
const AIRLINE_PROFILES = {
  AFR: { name: 'Air France', reg: () => `F-H${L()}${L()}${L()}`, hubs: ['CDG', 'ORY'], fleet: ['BCS3', 'A318', 'A319', 'A320', 'A321', 'A332', 'A359', 'B772', 'B77W', 'B789'] },
  HOP: { name: 'Air France HOP', reg: () => `F-H${L()}${L()}${L()}`, hubs: ['CDG', 'LYS'], fleet: ['E170', 'E190', 'CRJ9', 'E145'] },
  TVF: { name: 'Transavia France', reg: () => `F-H${L()}${L()}${L()}`, hubs: ['ORY', 'LYS', 'NCE'], fleet: ['B738', 'A20N', 'A21N'] },
  SWR: { name: 'Swiss', reg: () => `HB-J${L()}${L()}`, hubs: ['ZRH', 'GVA'], fleet: ['BCS1', 'BCS3', 'A320', 'A20N', 'A321', 'A21N', 'A333', 'A343', 'B77W'] },
  EZS: { name: 'easyJet Switzerland', reg: () => `HB-J${L()}${L()}`, hubs: ['GVA', 'ZRH'], fleet: ['A319', 'A320', 'A20N'] },
  DLH: { name: 'Lufthansa', reg: () => `D-AI${L()}${L()}`, hubs: ['FRA', 'MUC'], fleet: ['A319', 'A320', 'A20N', 'A321', 'A21N', 'A333', 'A343', 'A346', 'A359', 'A388', 'B744', 'B748', 'B789', 'CRJ9'] },
  EWG: { name: 'Eurowings', reg: () => `D-AE${L()}${L()}`, hubs: ['HAM', 'MUC'], fleet: ['A319', 'A320', 'A20N', 'A321'] },
  GEC: { name: 'Lufthansa Cargo', reg: () => `D-AL${L()}${L()}`, hubs: ['FRA'], fleet: ['B77L', 'A321'] },
  BAW: { name: 'British Airways', reg: () => `G-EU${L()}${L()}`, hubs: ['LHR'], fleet: ['A319', 'A320', 'A20N', 'A321', 'A21N', 'A35K', 'A388', 'B772', 'B77W', 'B788', 'B789', 'B78X'] },
  CFE: { name: 'BA CityFlyer', reg: () => `G-LC${L()}${L()}`, hubs: ['LHR', 'DUB'], fleet: ['E190'] },
  EZY: { name: 'easyJet', reg: () => `G-EZ${L()}${L()}`, hubs: ['LHR', 'CDG', 'NCE', 'AMS'], fleet: ['A319', 'A320', 'A20N', 'A21N'] },
  VIR: { name: 'Virgin Atlantic', reg: () => `G-V${L()}${L()}${L()}`, hubs: ['LHR'], fleet: ['A333', 'A339', 'A35K', 'B789'] },
  KLM: { name: 'KLM', reg: () => `PH-B${L()}${L()}`, hubs: ['AMS'], fleet: ['B737', 'B738', 'B739', 'A21N', 'A332', 'A333', 'B772', 'B77W', 'B789', 'B78X', 'E175', 'E190', 'E295'] },
  TRA: { name: 'Transavia', reg: () => `PH-H${L()}${L()}`, hubs: ['AMS'], fleet: ['B738', 'A21N'] },
  RYR: { name: 'Ryanair', reg: () => `EI-D${L()}${L()}`, hubs: ['DUB', 'MAD', 'BCN', 'FCO'], fleet: ['B738', 'B38M'] },
  EIN: { name: 'Aer Lingus', reg: () => `EI-N${L()}${L()}`, hubs: ['DUB'], fleet: ['A320', 'A20N', 'A21N', 'A332', 'A333', 'AT76'] },
  IBE: { name: 'Iberia', reg: () => `EC-M${L()}${L()}`, hubs: ['MAD'], fleet: ['A319', 'A320', 'A20N', 'A321', 'A21N', 'A332', 'A333', 'A359', 'CRJ9', 'AT76'] },
  VLG: { name: 'Vueling', reg: () => `EC-N${L()}${L()}`, hubs: ['BCN', 'ORY'], fleet: ['A319', 'A320', 'A20N', 'A321', 'A21N'] },
  TAP: { name: 'TAP Air Portugal', reg: () => `CS-T${L()}${L()}`, hubs: ['LIS'], fleet: ['A319', 'A320', 'A20N', 'A21N', 'A332', 'A339', 'E190', 'E195', 'AT76'] },
  ITY: { name: 'ITA Airways', reg: () => `EI-I${L()}${L()}`, hubs: ['FCO'], fleet: ['BCS1', 'BCS3', 'A319', 'A320', 'A20N', 'A21N', 'A332', 'A339', 'A359'] },
  AUA: { name: 'Austrian', reg: () => `OE-L${L()}${L()}`, hubs: ['VIE'], fleet: ['A320', 'A20N', 'A321', 'B763', 'B772', 'B789', 'E195'] },
  BEL: { name: 'Brussels Airlines', reg: () => `OO-S${L()}${L()}`, hubs: ['BRU'], fleet: ['A319', 'A320', 'A20N', 'A333'] },
  CLX: { name: 'Cargolux', reg: () => `LX-V${L()}${L()}`, hubs: ['LUX'], fleet: ['B744', 'B748'] },
  SAS: { name: 'SAS', reg: () => `SE-R${L()}${L()}`, hubs: ['CPH', 'OSL'], fleet: ['A319', 'A320', 'A20N', 'A21N', 'A333', 'A359', 'CRJ9', 'AT76'] },
  NAX: { name: 'Norwegian', reg: () => `LN-N${L()}${L()}`, hubs: ['OSL', 'CPH'], fleet: ['B738', 'B38M'] },
  FIN: { name: 'Finnair', reg: () => `OH-L${L()}${L()}`, hubs: ['HEL'], fleet: ['A319', 'A320', 'A321', 'A333', 'A359', 'E190', 'AT72', 'AT76'] },
  LOT: { name: 'LOT Polish', reg: () => `SP-L${L()}${L()}`, hubs: ['WAW'], fleet: ['B738', 'B38M', 'B788', 'B789', 'E170', 'E75L', 'E190', 'E195', 'E295', 'DH8D'] },
  WZZ: { name: 'Wizz Air', reg: () => `HA-L${L()}${L()}`, hubs: ['WAW', 'VIE', 'FCO'], fleet: ['A320', 'A20N', 'A321', 'A21N'] },
  THY: { name: 'Turkish Airlines', reg: () => `TC-J${L()}${L()}`, hubs: ['IST'], fleet: ['A319', 'A320', 'A321', 'A21N', 'B738', 'B38M', 'B739', 'B39M', 'A332', 'A333', 'A359', 'B77W', 'B789'] },
  UAE: { name: 'Emirates', reg: () => `A6-E${L()}${L()}`, hubs: ['DXB'], fleet: ['A388', 'B77W', 'B77L', 'A359', 'B779'] },
  QTR: { name: 'Qatar Airways', reg: () => `A7-B${L()}${L()}`, hubs: ['DOH'], fleet: ['A320', 'A332', 'A333', 'A359', 'A35K', 'A388', 'B77W', 'B77L', 'B788', 'B789'] },
  RAM: { name: 'Royal Air Maroc', reg: () => `CN-R${L()}${L()}`, hubs: ['CMN'], fleet: ['B738', 'B38M', 'B788', 'B789', 'E190', 'AT76'] },
  DAH: { name: 'Air Algérie', reg: () => `7T-V${L()}${L()}`, hubs: ['ALG'], fleet: ['B737', 'B738', 'A332', 'AT72', 'AT76'] },
  TAR: { name: 'Tunisair', reg: () => `TS-I${L()}${L()}`, hubs: ['TUN'], fleet: ['A319', 'A320', 'A20N', 'A332'] },
  AAL: { name: 'American Airlines', reg: () => `N${D()}${D()}${D()}AA`, hubs: ['JFK'], fleet: ['A319', 'A320', 'A321', 'A21N', 'B738', 'B38M', 'B772', 'B77W', 'B788', 'B789', 'E75L', 'CRJ9'] },
  DAL: { name: 'Delta', reg: () => `N${D()}${D()}${D()}DN`, hubs: ['JFK'], fleet: ['BCS1', 'BCS3', 'A319', 'A320', 'A321', 'A21N', 'B738', 'B739', 'B752', 'B753', 'B763', 'B764', 'A332', 'A333', 'A339', 'A359', 'CRJ9'] },
  UAL: { name: 'United', reg: () => `N${D()}${D()}${D()}UA`, hubs: ['JFK'], fleet: ['A319', 'A320', 'A21N', 'B737', 'B738', 'B38M', 'B739', 'B39M', 'B752', 'B753', 'B763', 'B764', 'B772', 'B77W', 'B788', 'B789', 'B78X', 'E75L', 'CRJ2'] },
  ACA: { name: 'Air Canada', reg: () => `C-F${L()}${L()}${L()}`, hubs: ['YYZ'], fleet: ['BCS3', 'A320', 'A321', 'B38M', 'A333', 'B772', 'B77L', 'B77W', 'B788', 'B789', 'DH8D', 'CRJ9'] },
  SIA: { name: 'Singapore Airlines', reg: () => `9V-S${L()}${L()}`, hubs: ['SIN'], fleet: ['A359', 'A388', 'B77W', 'B78X', 'B744'] },
  ANA: { name: 'ANA', reg: () => `JA${D()}${D()}${D()}A`, hubs: ['HND'], fleet: ['A320', 'A20N', 'A321', 'B738', 'B763', 'B772', 'B77W', 'B788', 'B789', 'B78X', 'A388', 'DH8D'] },
  JAL: { name: 'Japan Airlines', reg: () => `JA${D()}${D()}${D()}J`, hubs: ['HND'], fleet: ['B738', 'B763', 'B772', 'B77W', 'B788', 'B789', 'A359', 'A35K', 'E170', 'E190', 'AT76'] },
  FDX: { name: 'FedEx', reg: () => `N${D()}${D()}${D()}FD`, hubs: ['CDG', 'FRA'], fleet: ['A306', 'B752', 'B763', 'B77L', 'AT72', 'C208'] },
  UPS: { name: 'UPS', reg: () => `N${D()}${D()}${D()}UP`, hubs: ['FRA'], fleet: ['A306', 'B744', 'B748', 'B752', 'B763'] },
  TUI: { name: 'TUI', reg: () => `G-TU${L()}${L()}`, hubs: ['LHR', 'BRU', 'AMS'], fleet: ['B738', 'B38M', 'B788', 'B789'] },
};

/** Appareils militaires, gouvernementaux ou spéciaux qui n'appartiennent à aucune compagnie commerciale. */
const SPECIAL_OPS = {
  K35R: { callsign: () => `RCH${(100 + Math.random() * 899) | 0}`, reg: () => `62-${(3500 + Math.random() * 80) | 0}`, airline: 'Mission militaire', military: true },
  A400: { callsign: () => `CTM${(2010 + Math.random() * 80) | 0}`, reg: () => `F-RBA${L()}`, airline: 'Mission militaire', military: true },
  C17:  { callsign: () => `RCH${(800 + Math.random() * 190) | 0}`, reg: () => `07-71${(10 + Math.random() * 79) | 0}`, airline: 'Mission militaire', military: true },
  C130: { callsign: () => `FAF${(6100 + Math.random() * 90) | 0}`, reg: () => `61-23${(10 + Math.random() * 70) | 0}`, airline: 'Mission militaire', military: true },
  B52:  { callsign: () => `DOOM${(11 + Math.random() * 70) | 0}`, reg: () => `60-00${(10 + Math.random() * 49) | 0}`, airline: 'Mission militaire', military: true },
  B2:   { callsign: () => `SPIRIT${(1 + Math.random() * 9) | 0}`, reg: () => `82-10${(66 + Math.random() * 20) | 0}`, airline: 'Mission militaire', military: true },
  VC25: { callsign: () => 'AF1', reg: () => '82-8000', airline: 'Mission gouvernementale', military: true },
  A310M:{ callsign: () => `GAF${(601 + Math.random() * 80) | 0}`, reg: () => `10+2${(1 + Math.random() * 6) | 0}`, airline: 'Mission militaire', military: true },
  IL76: { callsign: () => `VDA${(4100 + Math.random() * 90) | 0}`, reg: () => `RA-76${(500 + Math.random() * 450) | 0}`, airline: 'Mission cargo spéciale', military: true },
  A3ST: { callsign: () => `BGA${(110 + Math.random() * 40) | 0}F`, reg: () => `F-GST${'ABCDE'[(Math.random() * 5) | 0]}`, airline: 'Airbus Transport', route: ['TLS', 'HAM'] },
  A337: { callsign: () => `BGA${(210 + Math.random() * 40) | 0}X`, reg: () => `F-GXL${'GHIJKL'[(Math.random() * 6) | 0]}`, airline: 'Airbus Transport', route: ['TLS', 'HAM'] },
  A124: { callsign: () => `ADB${(3100 + Math.random() * 400) | 0}`, reg: () => `UR-820${(20 + Math.random() * 59) | 0}`, airline: 'Antonov Airlines', route: ['FRA', 'IST'] },
};

const HISTORIC_OPS = {
  CONC: { callsign: 'AFR001', reg: 'F-BVFF' },
  T144: { callsign: 'AFL144', reg: 'CCCP-77114' },
  SR71: { callsign: 'HABU01', reg: '61-7972' },
  A225: { callsign: 'ADB225', reg: 'UR-82060' },
  B741: { callsign: 'PA001', reg: 'N747PA' },
  DC3:  { callsign: 'DC3H', reg: 'F-AZTE' },
  SPIT: { callsign: 'SPIT9', reg: 'MH434' },
  CONI: { callsign: 'CONI1', reg: 'HB-RSC' },
  COMT: { callsign: 'COMET4', reg: 'G-APDB' },
  B721: { callsign: 'B727H', reg: 'N7001U' },
  DC8:  { callsign: 'DC8H', reg: 'HB-IGH' },
  DC10: { callsign: 'DC10H', reg: 'PH-DTA' },
  L101: { callsign: 'L1011', reg: 'CS-TMP' },
  MD11: { callsign: 'MD11H', reg: 'PH-KCD' },
};

const toRad = d => d * Math.PI / 180, toDeg = r => r * 180 / Math.PI;
export function distKm(a, b, c, d) {
  const R = 6371, dLat = toRad(c - a), dLon = toRad(d - b);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function bearing(a, b, c, d) {
  const y = Math.sin(toRad(d - b)) * Math.cos(toRad(c));
  const x = Math.cos(toRad(a)) * Math.sin(toRad(c)) - Math.sin(toRad(a)) * Math.cos(toRad(c)) * Math.cos(toRad(d - b));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Position extrapolée (dead-reckoning) à l'instant `now`. */
export function posAt(f, now = Date.now()) {
  const dt = Math.min(60, (now - f.t) / 1000);
  const d = (f.gs || 0) * 0.514444 * dt;
  const th = toRad(f.track || 0);
  const lat = f.lat + (d * Math.cos(th)) / 111320;
  const lon = f.lon + (d * Math.sin(th)) / (111320 * Math.max(0.2, Math.cos(toRad(f.lat))));
  return [lat, lon];
}

export function flightProgress(f) {
  if (!f.from || !f.to) return null;
  const [lat, lon] = posAt(f);
  const dFrom = distKm(f.from.lat, f.from.lon, lat, lon);
  const dTo = distKm(lat, lon, f.to.lat, f.to.lon);
  const total = distKm(f.from.lat, f.from.lon, f.to.lat, f.to.lon);
  const pct = Math.max(0.05, Math.min(0.95, dFrom / Math.max(1, dFrom + dTo)));
  const done = total * pct;
  return { total, done, pct };
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = arr => arr[(Math.random() * arr.length) | 0];

/** Choisit une route plausible pour une compagnie et un avion donnés. */
function pickRouteFor(profile, model) {
  const hubCode = pickOne(profile.hubs);
  const hub = AP_BY_CODE[hubCode] || AIRPORTS[0];
  const isWideOrQuad = /wide|quad/.test(model.shape);
  const isRegional = model.shape === 'prop' || (model.range || 3000) < 3600 || /^(BCS1|BCS3|E145|E170|E75L|E190|E195|E295|CRJ2|CRJ9|F100|A318)$/.test(model.id);

  // Distance maximale autorisée selon le type d'appareil (pas d'A220 ou d'A320 sur Lisbonne–New York)
  const maxAllowed = isRegional
    ? Math.min(model.range * 0.65, 2200)
    : !isWideOrQuad
      ? Math.min(model.range * 0.72, 3400)
      : Math.min((model.range || 12000) * 0.88, 14500);

  const minAllowed = isWideOrQuad ? 900 : 220;

  let candidates = AIRPORTS.filter(ap => {
    if (ap[0] === hub[0]) return false;
    const d = distKm(hub[2], hub[3], ap[2], ap[3]);
    return d >= minAllowed && d <= maxAllowed;
  });
  if (!candidates.length) {
    candidates = AIRPORTS.filter(ap => ap[0] !== hub[0] && distKm(hub[2], hub[3], ap[2], ap[3]) <= maxAllowed);
  }
  if (!candidates.length) candidates = AIRPORTS.filter(ap => ap[0] !== hub[0]);

  const other = pickOne(candidates);
  const outbound = Math.random() < 0.5;
  const from = outbound ? hub : other;
  const to = outbound ? other : hub;
  return {
    from: { code: from[0], name: from[1], lat: from[2], lon: from[3] },
    to: { code: to[0], name: to[1], lat: to[2], lon: to[3] },
  };
}

/** Génère altitude (ft), vitesse sol (kt) et taux vertical (ft/min) cohérents avec la phase de vol et le type d'avion. */
function coherentTelemetry(model) {
  const isGa = model.shape === 'ga' && (model.seats || 4) <= 6;
  const isFastTurboprop = /^(PC12|TBM9|BE20)$/.test(model.id);
  const isRegionalProp = model.shape === 'prop' || model.shape === 'quadprop';

  if (isGa && !isFastTurboprop) {
    const phase = Math.random();
    const vr = phase < 0.7 ? 0 : phase < 0.85 ? 500 : -450;
    const alt = Math.round(rnd(25, 85)) * 100;
    const gs = Math.round(rnd(105, 165));
    return { alt, gs, vr };
  }
  if (isFastTurboprop || isRegionalProp) {
    const phase = Math.random();
    const vr = phase < 0.72 ? 0 : phase < 0.86 ? 900 : -800;
    const alt = vr === 0 ? Math.round(rnd(180, 250)) * 100 : Math.round(rnd(80, 160)) * 100;
    const gs = vr === 0 ? Math.round(rnd(250, 335)) : Math.round(rnd(195, 255));
    return { alt, gs, vr };
  }

  // Avions à réaction (jets commerciaux, affaires, militaires)
  const phase = Math.random();
  if (phase < 0.76) {
    // Croisière haute altitude : 31 000 à 40 000 ft, entre 430 et 500 kt
    const fl = pickOne([310, 320, 330, 340, 350, 360, 370, 380, 390, 400]);
    const isLongHaul = /wide|quad/.test(model.shape);
    const gs = isLongHaul ? Math.round(rnd(465, 505)) : Math.round(rnd(430, 485));
    return { alt: fl * 100, gs, vr: 0 };
  }
  if (phase < 0.88) {
    // Montée
    const alt = Math.round(rnd(110, 260)) * 100;
    const gs = Math.round(rnd(290, 385));
    const vr = pickOne([1100, 1400, 1650, 1900]);
    return { alt, gs, vr };
  }
  // Descente / approche
  const alt = Math.round(rnd(80, 230)) * 100;
  const gs = Math.round(rnd(260, 355));
  const vr = pickOne([-900, -1200, -1450, -1700]);
  return { alt, gs, vr };
}

export class FlightFeed {
  constructor() {
    this.flights = new Map();
    this.mode = 'live';       // 'live' | 'sim'
    this.lastOk = 0;
    this.lastTry = 0;
    this.fails = 0;
    this.lastError = '';
    this.view = { lat: 48.85, lon: 2.35, nm: 120 };
    this.home = null;          // position réelle du joueur : sa zone est toujours suivie, même s'il regarde ailleurs
    this.relayOk = true;
    this.listeners = new Set();
  }
  onUpdate(fn) { this.listeners.add(fn); }
  emit() { this.listeners.forEach(f => f(this)); }
  setView(lat, lon, nm) { this.view = { lat, lon, nm: Math.max(20, Math.min(250, nm)) }; }
  setHome(lat, lon) { this.home = { lat, lon }; }

  async fetchArea(lat, lon, nm) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15000);
    try {
      let r = null;
      if (this.relayOk) {
        r = await fetch(`${RELAY}/flights?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&dist=${Math.round(nm)}`, { signal: ctl.signal, cache: 'no-store' });
        if (r.status === 404) { this.relayOk = false; r = null; }   // hébergement sans relais
      }
      if (!r) r = await fetch(`${API}/v2/point/${lat.toFixed(3)}/${lon.toFixed(3)}/${Math.round(nm)}`, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      return data.ac || [];
    } finally { clearTimeout(to); }
  }

  start() {
    this.poll();
    setInterval(() => this.poll(), 7000);
    setInterval(() => this.simTick(), 2000);
  }
  async poll() {
    const forced = state.settings.mode;
    if (forced === 'sim') { this.useSim(); return; }
    if (this.mode === 'sim' && forced === 'auto' && Date.now() - this.lastTry < 30000) { this.simTick(); return; }
    this.lastTry = Date.now();
    try {
      const { lat, lon, nm } = this.view;
      const jobs = [this.fetchArea(lat, lon, nm)];
      // Si le joueur regarde loin de chez lui, on suit aussi sa propre zone de capture (~50 NM)
      if (this.home && distKm(lat, lon, this.home.lat, this.home.lon) > nm * 1.852 * 0.8) jobs.push(this.fetchArea(this.home.lat, this.home.lon, 50));
      const lists = await Promise.all(jobs);
      const byHex = new Map();
      for (const l of lists) for (const a of l) if (a && a.hex) byHex.set(a.hex, a);
      if (this.mode === 'sim') for (const [id, f] of this.flights) if (f.sim) this.flights.delete(id);
      this.ingest([...byHex.values()]);
      this.mode = 'live'; this.fails = 0; this.lastOk = Date.now();
      this.emit();
    } catch (e) {
      this.fails++; this.lastError = String(e.message || e);
      if ((this.fails >= 2 || this.mode === 'sim' || !this.lastOk) && forced !== 'live') this.useSim();
    }
  }
  useSim() {
    if (this.mode !== 'sim') {
      for (const [id, f] of this.flights) if (!f.special && !f.sim) this.flights.delete(id);
      this.mode = 'sim';
    }
    this.simTick(true);
  }

  ingest(list) {
    const seen = new Set();
    for (const a of list) {
      if (a.lat == null || a.lon == null || a.alt_baro === 'ground') continue;
      const id = a.hex;
      seen.add(id);
      let f = this.flights.get(id);
      if (!f) { f = { id, trail: [], sim: false }; this.flights.set(id, f); }
      f.callsign = (a.flight || '').trim() || a.r || id.toUpperCase();
      f.reg = a.r || '—'; f.type = a.t || ''; f.model = getModel(a.t);
      f.lat = a.lat; f.lon = a.lon; f.track = a.track ?? a.true_heading ?? f.track ?? 0;
      f.gs = a.gs ?? 0; f.alt = typeof a.alt_baro === 'number' ? a.alt_baro : (a.alt_geom ?? 0);
      f.vr = a.baro_rate ?? a.geom_rate ?? 0; f.squawk = a.squawk || '—'; f.military = !!(a.dbFlags & 1);
      f.t = Date.now();
      const last = f.trail[f.trail.length - 1];
      if (!last || distKm(last[0], last[1], f.lat, f.lon) > 0.4) { f.trail.push([f.lat, f.lon]); if (f.trail.length > 40) f.trail.shift(); }
      const air = f.callsign.slice(0, 3).toUpperCase();
      f.airline = f.military ? 'Mission militaire' : (/^[A-Z]{3}\d/.test(f.callsign) ? (AIRLINES[air] || air) : null); // code brut si inconnu -> « XYZ-Aero » à l'affichage
    }
    for (const [id, f] of this.flights) if (!f.special && !f.sim && !seen.has(id)) this.flights.delete(id);
    this.fetchRoutes();
  }

  async fetchRoutes() {
    const todo = [...this.flights.values()].filter(f => !f.sim && !f.special && !f.routeTried && /^[A-Z]{3}\d/.test(f.callsign)).slice(0, 25);
    if (!todo.length) return;
    todo.forEach(f => f.routeTried = true);
    try {
      const r = await fetch(this.relayOk ? `${RELAY}/routes` : `${API}/api/0/routeset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planes: todo.map(f => ({ callsign: f.callsign, lat: f.lat, lng: f.lon })) }),
      });
      if (!r.ok) return;
      const arr = await r.json();
      for (const rt of arr || []) {
        const f = todo.find(x => x.callsign === rt.callsign);
        const ap = rt._airports;
        if (!f || !ap || ap.length < 2) continue;
        const mk = a => ({ code: a.iata || a.icao, name: a.location || a.name, lat: a.lat, lon: a.lon });
        f.from = mk(ap[0]); f.to = mk(ap[ap.length - 1]);
      }
      this.emit();
    } catch { /* route facultative */ }
  }

  // ------------- simulation réaliste -------------
  simTick(force) {
    if (this.mode !== 'sim') return;
    const { lat, lon, nm } = this.view;
    const rKm = Math.max(40, nm * 1.852);
    const now = Date.now();
    for (const [id, f] of this.flights) {
      if (!f.sim) continue;
      const [la, lo] = posAt(f, now);
      f.lat = la; f.lon = lo; f.t = now;
      const last = f.trail[f.trail.length - 1];
      if (!last || distKm(last[0], last[1], la, lo) > 0.4) { f.trail.push([la, lo]); if (f.trail.length > 40) f.trail.shift(); }
      if (distKm(lat, lon, la, lo) > rKm * 1.6) this.flights.delete(id);
    }
    const simCount = [...this.flights.values()].filter(f => f.sim).length;
    const want = Math.min(45, Math.round(14 + rKm / 8));
    for (let i = simCount; i < want; i++) this.spawnSim(lat, lon, rKm, force || simCount === 0);
    this.emit();
  }

  spawnSim(clat, clon, rKm, anywhere) {
    const roll = Math.random();
    const rarity = roll < .62 ? 'common' : roll < .86 ? 'uncommon' : roll < .96 ? 'rare' : roll < .993 ? 'epic' : 'legendary';
    const model = pickOne(MODERN.filter(m => m.rarity === rarity));
    const ang = Math.random() * 360, dist = anywhere ? rnd(0, rKm) : rKm * rnd(1.0, 1.3);
    const lat = clat + (dist * Math.cos(toRad(ang))) / 111.32;
    const lon = clon + (dist * Math.sin(toRad(ang))) / (111.32 * Math.cos(toRad(clat)));
    const id = 'sim' + Math.random().toString(36).slice(2, 8);
    const { alt, gs, vr } = coherentTelemetry(model);

    // 1. Appareils militaires, gouvernementaux ou spéciaux (KC-135, A400M, C-17, Beluga…)
    if (SPECIAL_OPS[model.id]) {
      const spec = SPECIAL_OPS[model.id];
      let from = null, to = null, heading = (ang + 180 + rnd(-35, 35) + 360) % 360;
      if (spec.route) {
        const a1 = AP_BY_CODE[spec.route[0]], a2 = AP_BY_CODE[spec.route[1]];
        const rev = Math.random() < 0.5;
        const fa = rev ? a2 : a1, ta = rev ? a1 : a2;
        from = { code: fa[0], name: fa[1], lat: fa[2], lon: fa[3] };
        to = { code: ta[0], name: ta[1], lat: ta[2], lon: ta[3] };
        heading = bearing(lat, lon, to.lat, to.lon);
      }
      this.flights.set(id, {
        id, sim: true, trail: [], t: Date.now(), model, type: model.id,
        callsign: spec.callsign(),
        reg: spec.reg(),
        airline: spec.airline,
        military: !!spec.military,
        lat, lon, track: heading,
        gs, alt, vr, squawk: String((Math.random() * 6000 + 1000) | 0),
        from, to,
      });
      return;
    }

    // 2. Aviation légère ou aviation d'affaires
    const isLightOrBiz = model.shape === 'ga' || model.shape === 'bizjet' || /^(BE20|C208)$/.test(model.id);
    if (isLightOrBiz) {
      const regGen = pickOne([
        () => `F-H${L()}${L()}${L()}`,
        () => `HB-V${L()}${L()}`,
        () => `D-C${L()}${L()}${L()}`,
        () => `G-L${L()}${L()}${L()}`,
        () => `N${D()}${D()}${D()}GA`,
      ]);
      const reg = regGen();
      const isBiz = model.shape === 'bizjet' || /^(PC12|TBM9|BE20)$/.test(model.id);
      let from = null, to = null, heading = (ang + 180 + rnd(-45, 45) + 360) % 360;
      if (isBiz) {
        const euroPool = AIRPORTS.filter(a => distKm(48.8, 2.3, a[2], a[3]) < 2000);
        const fa = pickOne(euroPool);
        const ta = pickOne(euroPool.filter(x => x !== fa));
        from = { code: fa[0], name: fa[1], lat: fa[2], lon: fa[3] };
        to = { code: ta[0], name: ta[1], lat: ta[2], lon: ta[3] };
        heading = bearing(lat, lon, to.lat, to.lon);
      }
      this.flights.set(id, {
        id, sim: true, trail: [], t: Date.now(), model, type: model.id,
        callsign: reg.replace('-', ''),
        reg,
        airline: isBiz ? 'Aviation d\'affaires' : 'Aviation privée',
        lat, lon, track: heading,
        gs, alt, vr, squawk: isBiz ? String((Math.random() * 6000 + 1000) | 0) : '7000',
        from, to,
      });
      return;
    }

    // 3. Compagnies aériennes commerciales : sélection d'une compagnie qui opère réellement ce modèle
    let matchingAirlines = Object.entries(AIRLINE_PROFILES).filter(([, p]) => p.fleet.includes(model.id));
    if (!matchingAirlines.length) {
      // Secours pour les anciens modèles (B733, B734, MD82, MD83, F100, A310, B744…)
      const isLong = /wide|quad/.test(model.shape);
      matchingAirlines = Object.entries(AIRLINE_PROFILES).filter(([code]) =>
        isLong ? ['DLH', 'BAW', 'AFR', 'KLM', 'UAE', 'THY'].includes(code) : ['AFR', 'DLH', 'BAW', 'IBE', 'ITY', 'SAS', 'LOT'].includes(code)
      );
    }
    const [airCode, profile] = pickOne(matchingAirlines);
    const { from, to } = pickRouteFor(profile, model);
    const heading = bearing(lat, lon, to.lat, to.lon);
    const flightNum = (Math.random() * 880 + 101) | 0;

    this.flights.set(id, {
      id, sim: true, trail: [], t: Date.now(), model, type: model.id,
      callsign: `${airCode}${flightNum}`,
      reg: profile.reg(),
      airline: profile.name,
      lat, lon, track: (heading + rnd(-5, 5) + 360) % 360,
      gs, alt, vr, squawk: String((Math.random() * 6000 + 1000) | 0),
      from, to,
    });
  }

  /** Apparition spéciale : un avion historique/légendaire traverse le radar. */
  spawnSpecial(clat, clon) {
    const model = pickOne(HISTORIC.filter(m => RARITIES[m.rarity].order >= 2));
    const ang = Math.random() * 360, dist = rnd(12, 45);
    const lat = clat + (dist * Math.cos(toRad(ang))) / 111.32;
    const lon = clon + (dist * Math.sin(toRad(ang))) / (111.32 * Math.cos(toRad(clat)));
    const id = 'special' + Date.now();
    const spec = HISTORIC_OPS[model.id] || { callsign: model.id, reg: 'N-' + model.id };
    const isSupersonic = model.id === 'CONC' || model.id === 'T144' || model.id === 'SR71';
    const isProp = /prop|ga/.test(model.shape);
    const f = {
      id, special: true, trail: [], t: Date.now(), model, type: model.id,
      callsign: spec.callsign,
      reg: spec.reg,
      airline: 'Vol spécial / exposition',
      lat, lon, track: (ang + 180 + rnd(-40, 40) + 360) % 360,
      gs: isSupersonic ? 580 : isProp ? 195 : 420,
      alt: isSupersonic ? 45000 : isProp ? 6500 : 28000,
      vr: 0, squawk: '7777', expires: Date.now() + 4 * 60 * 1000,
    };
    this.flights.set(id, f);
    this.emit();
    return f;
  }
  pruneSpecial() {
    let changed = false;
    for (const [id, f] of this.flights) if (f.special && f.expires < Date.now()) { this.flights.delete(id); changed = true; }
    if (changed) this.emit();
    return changed;
  }
}
