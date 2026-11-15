// Rendu des vraies cartes verticales Full-Art (format portrait 5:7 inspiré de Kyara) + livrées compagnies aériennes + boosters.
import { RARITIES, ART_MAP, MODELS, planeSVG } from './catalog.js';
import { fictionAirline, fictionCallsign, fictionLivery } from './brand.js';

const KIND = {
  narrow: 'Moyen-courrier', wide: 'Gros-porteur', wide6: 'Cargo géant', quad: 'Quadriréacteur', quadprop: 'Quadrimoteur',
  bizjet: 'Jet d\'affaires', prop: 'Turbopropulseur', ga: 'Aviation légère', delta: 'Supersonique', stealth: 'Aile furtive',
};
export const kindOf = m => KIND[m.shape] || 'Appareil';

const fmt = (v, unit = '') => v == null ? '—' : Number(v).toLocaleString('fr-FR') + unit;
const TOTAL_CATALOG = MODELS.length || 93;

export const AIRLINE_LIVERIES = {
  'Air France':          { c1: '#002157', c2: '#ef4444', code: 'AFR' },
  'Air France Hop':      { c1: '#002157', c2: '#e11d48', code: 'HOP' },
  'Air France HOP':      { c1: '#002157', c2: '#e11d48', code: 'HOP' },
  'Transavia France':    { c1: '#00b65e', c2: '#064e3b', code: 'TVF' },
  'Transavia':           { c1: '#00b65e', c2: '#064e3b', code: 'TRA' },
  'Swiss':               { c1: '#dc2626', c2: '#ffffff', code: 'SWR' },
  'Lufthansa':           { c1: '#05164d', c2: '#f59e0b', code: 'DLH' },
  'Lufthansa Cargo':     { c1: '#05164d', c2: '#f59e0b', code: 'GEC' },
  'Eurowings':           { c1: '#7f1d45', c2: '#38bdf8', code: 'EWG' },
  'British Airways':     { c1: '#075aaa', c2: '#eb2226', code: 'BAW' },
  'BA CityFlyer':        { c1: '#075aaa', c2: '#eb2226', code: 'CFE' },
  'easyJet':             { c1: '#ff6600', c2: '#1f2937', code: 'EZY' },
  'easyJet Switzerland': { c1: '#ff6600', c2: '#dc2626', code: 'EZS' },
  'Virgin Atlantic':     { c1: '#be123c', c2: '#f43f5e', code: 'VIR' },
  'TUI':                 { c1: '#0284c7', c2: '#dc2626', code: 'TUI' },
  'KLM':                 { c1: '#00a1de', c2: '#0369a1', code: 'KLM' },
  'Iberia':              { c1: '#d7192d', c2: '#f59e0b', code: 'IBE' },
  'Vueling':             { c1: '#eab308', c2: '#334155', code: 'VLG' },
  'ITA Airways':         { c1: '#004b93', c2: '#16a34a', code: 'ITY' },
  'Ryanair':             { c1: '#073590', c2: '#facc15', code: 'RYR' },
  'Aer Lingus':          { c1: '#006272', c2: '#10b981', code: 'EIN' },
  'TAP Air Portugal':    { c1: '#16a34a', c2: '#dc2626', code: 'TAP' },
  'Brussels Airlines':   { c1: '#1e3a8a', c2: '#ef4444', code: 'BEL' },
  'Austrian Airlines':   { c1: '#dc2626', c2: '#991b1b', code: 'AUA' },
  'Austrian':            { c1: '#dc2626', c2: '#991b1b', code: 'AUA' },
  'SAS':                 { c1: '#000066', c2: '#3b82f6', code: 'SAS' },
  'Norwegian':           { c1: '#d81939', c2: '#0f172a', code: 'NAX' },
  'Finnair':             { c1: '#0b1560', c2: '#93c5fd', code: 'FIN' },
  'LOT Polish Airlines': { c1: '#1e3a8a', c2: '#60a5fa', code: 'LOT' },
  'LOT Polish':          { c1: '#1e3a8a', c2: '#60a5fa', code: 'LOT' },
  'Wizz Air':            { c1: '#be185d', c2: '#2563eb', code: 'WZZ' },
  'Turkish Airlines':    { c1: '#c8102e', c2: '#1f2937', code: 'THY' },
  'Emirates':            { c1: '#d71921', c2: '#d4af37', code: 'UAE' },
  'Qatar Airways':       { c1: '#5c0632', c2: '#cbd5e1', code: 'QTR' },
  'Etihad Airways':      { c1: '#b48327', c2: '#451a03', code: 'ETD' },
  'El Al':               { c1: '#1e3a8a', c2: '#38bdf8', code: 'ELY' },
  'Royal Air Maroc':     { c1: '#c1272d', c2: '#006233', code: 'RAM' },
  'Air Algérie':         { c1: '#dc2626', c2: '#16a34a', code: 'DAH' },
  'Tunisair':            { c1: '#dc2626', c2: '#f8fafc', code: 'TAR' },
  'Ethiopian':           { c1: '#16a34a', c2: '#eab308', code: 'ETH' },
  'Delta Air Lines':     { c1: '#003366', c2: '#e01933', code: 'DAL' },
  'Delta':               { c1: '#003366', c2: '#e01933', code: 'DAL' },
  'United Airlines':     { c1: '#005daa', c2: '#38bdf8', code: 'UAL' },
  'United':              { c1: '#005daa', c2: '#38bdf8', code: 'UAL' },
  'American Airlines':   { c1: '#0078d2', c2: '#dc2626', code: 'AAL' },
  'JetBlue':             { c1: '#003876', c2: '#38bdf8', code: 'JBU' },
  'Southwest':           { c1: '#304cb2', c2: '#facc15', code: 'SWA' },
  'Air Canada':          { c1: '#dc2626', c2: '#0f172a', code: 'ACA' },
  'Air India':           { c1: '#b91c1c', c2: '#f59e0b', code: 'AIC' },
  'ANA':                 { c1: '#0046ad', c2: '#38bdf8', code: 'ANA' },
  'Japan Airlines':      { c1: '#c8102e', c2: '#111827', code: 'JAL' },
  'Singapore Airlines':  { c1: '#1e3a8a', c2: '#f59e0b', code: 'SIA' },
  'Cathay Pacific':      { c1: '#006564', c2: '#5eead4', code: 'CPA' },
  'Korean Air':          { c1: '#0284c7', c2: '#1d4ed8', code: 'KAL' },
  'Qantas':              { c1: '#e40000', c2: '#b91c1c', code: 'QFA' },
  'Cargolux':            { c1: '#dc2626', c2: '#0284c7', code: 'CLX' },
  'FedEx':               { c1: '#312e81', c2: '#ea580c', code: 'FDX' },
  'UPS':                 { c1: '#451a03', c2: '#eab308', code: 'UPS' },
  'DHL Aviation':        { c1: '#eab308', c2: '#dc2626', code: 'DHK' },
  'Airbus Transport':    { c1: '#00205b', c2: '#38bdf8', code: 'BGA' },
  'Antonov Airlines':    { c1: '#0284c7', c2: '#facc15', code: 'ADB' },
  'Mission militaire':        { c1: '#475569', c2: '#94a3b8', code: 'MIL' },
  'Mission gouvernementale':  { c1: '#1e3a8a', c2: '#f59e0b', code: 'GOV' },
  'Mission cargo spéciale':   { c1: '#334155', c2: '#f59e0b', code: 'SPC' },
  'Vol spécial / exposition': { c1: '#b45309', c2: '#f59e0b', code: 'SPC' },
  'Aviation privée':          { c1: '#0f172a', c2: '#f59e0b', code: 'VIP' },
  'Aviation d\'affaires':     { c1: '#0f172a', c2: '#3b82f6', code: 'BIZ' },
  'Aviation générale':        { c1: '#0284c7', c2: '#f59e0b', code: 'VFR' },
  'Airbus':              { c1: '#00205b', c2: '#3b82f6', code: 'AIB' },
  'Boeing':              { c1: '#0039a6', c2: '#60a5fa', code: 'BOE' },
  'Embraer':             { c1: '#004b87', c2: '#f59e0b', code: 'EMB' },
  'Bombardier':          { c1: '#1e293b', c2: '#3b82f6', code: 'BBA' },
  'ATR':                 { c1: '#0284c7', c2: '#ef4444', code: 'ATR' },
  'Dassault':            { c1: '#1e3a8a', c2: '#f59e0b', code: 'DAS' },
  'Gulfstream':          { c1: '#0f172a', c2: '#d4af37', code: 'GLF' },
  'Lockheed':            { c1: '#1e293b', c2: '#ef4444', code: 'LMT' },
  'Antonov':             { c1: '#0284c7', c2: '#facc15', code: 'ADB' },
  'Aérospatiale/BAC':    { c1: '#1e3a8a', c2: '#dc2626', code: 'SSC' },
  'Tupolev':             { c1: '#991b1b', c2: '#38bdf8', code: 'TUP' },
  'Douglas':             { c1: '#7c2d12', c2: '#f59e0b', code: 'DAC' },
  'McDonnell Douglas':   { c1: '#1e3a8a', c2: '#ef4444', code: 'MDC' },
  'Supermarine':         { c1: '#365314', c2: '#eab308', code: 'RAF' },
  'De Havilland':        { c1: '#0f766e', c2: '#f59e0b', code: 'DHC' },
  'Iliouchine':          { c1: '#1d4ed8', c2: '#ef4444', code: 'IL' },
  'Cessna':              { c1: '#0369a1', c2: '#f59e0b', code: 'TXT' },
  'Pilatus':             { c1: '#b91c1c', c2: '#f8fafc', code: 'PIL' },
  'Daher':               { c1: '#0f172a', c2: '#ef4444', code: 'DAH' },
  'Piper':               { c1: '#1d4ed8', c2: '#f59e0b', code: 'PIP' },
  'Cirrus':              { c1: '#0f172a', c2: '#3b82f6', code: 'CIR' },
};

export function liveryOf(airline, model) {
  const clean = airline && airline !== '—' ? airline.trim() : '';
  if (clean && AIRLINE_LIVERIES[clean]) return { label: clean, ...AIRLINE_LIVERIES[clean] };
  const fl = clean && fictionLivery(clean);
  if (fl) return { label: clean, code: '', ...fl };
  const maker = model?.realMaker || model?.maker || 'Airbus';
  if (AIRLINE_LIVERIES[maker]) return { ...AIRLINE_LIVERIES[maker], label: clean || maker, code: '' };
  const r = RARITIES[model?.rarity] || RARITIES.common;
  return { label: clean || maker || 'Flotte SkyDex', c1: r.color, c2: '#3b82f6', code: '' };
}

export function serialOf(id) {
  const idx = MODELS.findIndex(m => m.id === id);
  if (idx >= 0) return idx + 1;
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % TOTAL_CATALOG;
  return s + 1;
}

export function packEmblemSVG(packId) {
  if (packId === 'legend') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="32" r="26" stroke-opacity=".35" stroke-dasharray="4 3"/>
      <polygon points="32 10 38 24 53 26 42 36 45 51 32 43 19 51 22 36 11 26 26 24 32 10" fill="currentColor" fill-opacity=".2"/>
      <circle cx="32" cy="32" r="6" fill="currentColor"/>
    </svg>`;
  }
  if (packId === 'historic') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="32" r="25" stroke-opacity=".4"/>
      <polygon points="32 10 48 48 32 41 16 48 32 10" fill="currentColor" fill-opacity=".22"/>
      <line x1="32" y1="10" x2="32" y2="48"/>
    </svg>`;
  }
  if (packId === 'premium') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="32" r="24" stroke-opacity=".45"/>
      <ellipse cx="32" cy="32" rx="24" ry="10" stroke-opacity=".35"/>
      <path d="M14 38L50 22M32 14l6 18 14 4-14 4-6 14-4-14-14-4 14-4 4-18z" fill="currentColor" fill-opacity=".18"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="32" r="24" stroke-opacity=".35"/>
    <path d="M14 42L50 22M26 26l24-4-10 22-6-10-12-4 4-4z" fill="currentColor" fill-opacity=".2"/>
  </svg>`;
}

/**
 * Illustration verticale Full-Art (portrait 280x400) :
 * L'avion et le ciel occupent toute la hauteur de la vraie carte.
 */
export function cardArtSVG(model, opts = {}) {
  const r = RARITIES[model.rarity] || RARITIES.common;
  const id = model.id || 'GEN';
  const liv = liveryOf(opts.airline, model);
  const dark = id === 'SR71' || id === 'B2' || model.shape === 'stealth';
  const mil = /^(C17|A400|C130|B52|K35R|IL76|A310M)$/.test(id) || opts.airline === 'Mission militaire';
  const spit = id === 'SPIT';
  const beluga = id === 'A3ST' || id === 'A337';
  const trijet = /^(DC10|MD11|L101|B721)$/.test(id);

  // Ciels verticaux profonds et naturels selon la rareté / époque
  const sky = dark
    ? ['#060911', '#0f172a', '#1e293b']
    : model.historic
      ? ['#131824', '#292524', '#78553a']
      : r.order >= 4
        ? ['#0c1426', '#1e293b', '#7c4a1e']
        : r.order === 3
          ? ['#0c1324', '#1e263d', '#5b2338']
          : r.order === 2
            ? ['#081428', '#0f294d', '#1e4e8c']
            : r.order === 1
              ? ['#091724', '#112e38', '#1e4e52']
              : ['#0b1320', '#162438', '#293e5c'];

  const bodyTop = dark ? '#334155' : spit ? '#4d7c0f' : mil ? '#94a3b8' : '#f8fafc';
  const bodyBot = dark ? '#0f172a' : spit ? '#365314' : mil ? '#475569' : '#cbd5e1';
  const tailC1 = dark ? '#1e293b' : spit ? '#365314' : liv.c1;
  const stripe = dark ? '#ef4444' : spit ? '#eab308' : mil ? '#38bdf8' : liv.c2;
  const uid = 'ca_' + id.replace(/[^a-zA-Z0-9]/g, '') + '_' + (liv.code || 'X');

  let plane = '';
  if (model.shape === 'stealth' || id === 'B2') {
    plane = `
      <g transform="translate(140,164) scale(1.28) rotate(-18)">
        <polygon points="-78,18 -10,-28 78,10 52,24 26,12 6,26 -14,14 -38,28" fill="url(#${uid}_b)" stroke="#090d16" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="-62,14 -10,-23 64,8 44,14 -10,-10" fill="#475569" opacity=".55"/>
        <polygon points="-18,-10 -4,-16 12,-10 6,-3 -12,-3" fill="#38bdf8" stroke="#0f172a" stroke-width="1.4"/>
        <line x1="-45" y1="6" x2="35" y2="2" stroke="${stripe}" stroke-width="2" opacity=".8"/>
      </g>`;
  } else if (id === 'SR71') {
    plane = `
      <g transform="translate(142,164) scale(1.28) rotate(-24)">
        <ellipse cx="-58" cy="8" rx="18" ry="5" fill="#fb923c" opacity=".85"/>
        <ellipse cx="-52" cy="-8" rx="18" ry="5" fill="#fb923c" opacity=".85"/>
        <polygon points="-55,14 -10,-8 78,0 12,18" fill="url(#${uid}_b)" stroke="#090d16" stroke-width="2.1"/>
        <ellipse cx="-24" cy="10" rx="26" ry="6.5" fill="#1e293b" stroke="#090d16" stroke-width="1.8"/>
        <ellipse cx="-20" cy="-7" rx="24" ry="5.5" fill="#1e293b" stroke="#090d16" stroke-width="1.8"/>
        <path d="M-62,3 C-20,-6 35,-6 82,0 C35,8 -20,10 -62,3 Z" fill="url(#${uid}_b)" stroke="#090d16" stroke-width="2.2"/>
        <polygon points="-48,0 -34,-18 -26,-16 -36,1" fill="#1e293b" stroke="#090d16" stroke-width="1.6"/>
        <polygon points="-42,4 -28,-14 -20,-12 -30,5" fill="#334155" stroke="#090d16" stroke-width="1.6"/>
        <ellipse cx="42" cy="-1" rx="9" ry="2.6" fill="#38bdf8" stroke="#090d16" stroke-width="1.2"/>
        <path d="M-45,2 L60,0" stroke="#ef4444" stroke-width="1.6" stroke-dasharray="6 4"/>
      </g>`;
  } else if (model.shape === 'delta') {
    plane = `
      <g transform="translate(140,166) scale(1.28) rotate(-22)">
        <path d="M-66,14 L6,26 L38,6 L-36,-14 Z" fill="#e2e8f0" stroke="#0b1230" stroke-width="2"/>
        <polygon points="-64,2 -40,-28 -24,-24 -36,4" fill="url(#${uid}_t)" stroke="#0b1230" stroke-width="2"/>
        <path d="M-68,6 C-30,-6 28,-8 86,-2 L70,5 C24,10 -28,14 -68,6 Z" fill="url(#${uid}_b)" stroke="#0b1230" stroke-width="2.2"/>
        <path d="M-56,5 L58,0" stroke="${stripe}" stroke-width="3" stroke-linecap="round"/>
        <polygon points="50,-3 64,-3 59,1 47,1" fill="#0f172a"/>
      </g>`;
  } else {
    const isQuad = model.shape === 'quad' || model.shape === 'quadprop' || model.shape === 'wide6';
    const isProp = model.shape === 'prop' || model.shape === 'quadprop' || model.shape === 'ga';
    const isGa = model.shape === 'ga';
    const isBiz = model.shape === 'bizjet';
    const rFuse = isGa ? 11 : isBiz ? 12 : /wide|quad/.test(model.shape) ? 18 : 14.5;
    const len = isGa ? 54 : isBiz ? 62 : /wide|quad/.test(model.shape) ? 76 : 68;

    const engPos = isGa ? [] : isBiz ? [] : model.shape === 'wide6'
      ? [[-18, 22], [-2, 28], [14, 34]]
      : isQuad ? [[-14, 22], [8, 31]] : [[-6, 24]];

    const engSVG = engPos.map(([ex, ey]) => isProp
      ? `<g transform="translate(${ex},${ey})">
          <rect x="-8" y="-4" width="16" height="8" rx="4" fill="${tailC1}" stroke="#0b1230" stroke-width="1.8"/>
          <ellipse cx="9" cy="0" rx="2.5" ry="11" fill="#ffffffaa" stroke="#38bdf8" stroke-width="1.1"/>
        </g>`
      : `<g transform="translate(${ex},${ey})">
          <rect x="-10" y="-6.5" width="20" height="13" rx="6" fill="${tailC1}" stroke="#0b1230" stroke-width="2"/>
          <line x1="-8" y1="0" x2="5" y2="0" stroke="${stripe}" stroke-width="1.8"/>
          <ellipse cx="8" cy="0" rx="3.5" ry="5.2" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.2"/>
        </g>`).join('');

    plane = `
      <g transform="translate(138,164) scale(1.26) rotate(-20)">
        <polygon points="-8,-6 28,-30 40,-27 14,-2" fill="#94a3b8" stroke="#0b1230" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="${-len + 4},-2 ${-len - 14},${-rFuse - 26} ${-len + 2},${-rFuse - 24} ${-len + 22},-4" fill="url(#${uid}_t)" stroke="#0b1230" stroke-width="2.2" stroke-linejoin="round"/>
        <line x1="${-len - 9}" y1="${-rFuse - 18}" x2="${-len + 8}" y2="${-rFuse - 10}" stroke="${stripe}" stroke-width="3" stroke-linecap="round"/>
        ${model.shape === 'wide6' ? `<polygon points="${-len - 16},${-rFuse - 18} ${-len - 12},${-rFuse - 30} ${-len - 4},${-rFuse - 28} ${-len - 8},${-rFuse - 14}" fill="${stripe}" stroke="#0b1230" stroke-width="1.8"/>` : ''}
        ${trijet ? `<ellipse cx="${-len + 8}" cy="${-rFuse - 6}" rx="9" ry="4.5" fill="${tailC1}" stroke="#0b1230" stroke-width="1.8"/>` : ''}
        <polygon points="${-len + 2},4 ${-len - 16},16 ${-len - 6},19 ${-len + 14},7" fill="#cbd5e1" stroke="#0b1230" stroke-width="1.8"/>
        <path d="M${-len},2 C${-len + 10},${-rFuse} ${len - 24},${-rFuse} ${len - 4},-2 C${len + 8},2 ${len + 6},${rFuse - 2} ${len - 10},${rFuse} C${len - 30},${rFuse + 2} ${-len + 16},${rFuse - 2} ${-len},2 Z"
          fill="url(#${uid}_b)" stroke="#0b1230" stroke-width="2.3"/>
        ${beluga ? `<path d="M${-len + 18},${-rFuse + 4} C${-len + 28},${-rFuse - 22} ${len - 18},${-rFuse - 24} ${len - 8},${-rFuse + 2} Z" fill="url(#${uid}_b)" stroke="#0b1230" stroke-width="2.2"/>` : ''}
        <path d="M${-len + 6},3 Q0,${rFuse * 0.35} ${len - 8},1" fill="none" stroke="${stripe}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M${-len + 10},6 Q0,${rFuse * 0.55} ${len - 14},4" fill="none" stroke="${tailC1}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
        <path d="M${len - 22},${-rFuse * 0.52} Q${len - 10},${-rFuse * 0.56} ${len - 6},${-rFuse * 0.18} L${len - 18},${-rFuse * 0.14} Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1.1"/>
        ${isGa ? '' : `<line x1="${-len + 24}" y1="-2" x2="${len - 28}" y2="-2" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 5.5" opacity=".75"/>`}
        <polygon points="-14,6 -36,42 -20,45 20,10" fill="#f8fafc" stroke="#0b1230" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="-36,42 -42,36 -37,34 -30,43" fill="${stripe}" stroke="#0b1230" stroke-width="1.5"/>
        ${engSVG}
        ${isBiz ? `<g transform="translate(${-len + 22},-4)"><rect x="-9" y="-4.5" width="18" height="9" rx="4.5" fill="${tailC1}" stroke="#0b1230" stroke-width="1.8"/></g>` : ''}
        ${isGa ? `<ellipse cx="${len + 3}" cy="2" rx="3" ry="15" fill="#ffffffbb" stroke="#38bdf8" stroke-width="1.2"/>` : ''}
      </g>`;
  }

  return `<svg class="c-svg-art" viewBox="0 0 280 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}_s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sky[0]}"/>
        <stop offset="52%" stop-color="${sky[1]}"/>
        <stop offset="100%" stop-color="${sky[2]}"/>
      </linearGradient>
      <linearGradient id="${uid}_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bodyTop}"/>
        <stop offset="65%" stop-color="${bodyTop}"/>
        <stop offset="100%" stop-color="${bodyBot}"/>
      </linearGradient>
      <linearGradient id="${uid}_t" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${tailC1}"/>
        <stop offset="72%" stop-color="${tailC1}"/>
        <stop offset="100%" stop-color="${stripe}"/>
      </linearGradient>
    </defs>
    <rect width="280" height="400" fill="url(#${uid}_s)"/>
    <!-- Lignes de niveau de vol discrètes -->
    <g stroke="#ffffff" stroke-opacity=".05" stroke-width="1">
      <line x1="0" y1="80" x2="280" y2="80" stroke-dasharray="4 6"/>
      <line x1="0" y1="160" x2="280" y2="160" stroke-dasharray="4 6"/>
      <line x1="0" y1="240" x2="280" y2="240" stroke-dasharray="4 6"/>
    </g>
    <!-- Lueur d'horizon atmosphérique -->
    <ellipse cx="140" cy="265" rx="165" ry="70" fill="#ffffff" opacity=".08"/>
    <!-- Bancs de nuages stratosphériques -->
    <g fill="#ffffff" opacity=".11">
      <ellipse cx="55" cy="242" rx="85" ry="18"/>
      <ellipse cx="220" cy="252" rx="95" ry="20"/>
      <ellipse cx="140" cy="268" rx="115" ry="22"/>
    </g>
    <!-- Sillage de condensation -->
    <line x1="-20" y1="226" x2="132" y2="168" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity=".28"/>
    <line x1="-20" y1="242" x2="118" y2="188" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".18"/>
    ${plane}
  </svg>`;
}

function compassPlateSVG() {
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const maj = i % 3 === 0;
    return `<line transform="rotate(${i * 10} 100 100)" x1="100" y1="${maj ? 18 : 21}" x2="100" y2="26" stroke="currentColor" stroke-width="${maj ? 1.6 : 0.9}" stroke-opacity="${maj ? 0.65 : 0.3}"/>`;
  }).join('');
  return `<svg class="cb-plate-svg" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="1"/>
    <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="1" stroke-dasharray="3 3"/>
    ${ticks}
    <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="1"/>
    <line x1="100" y1="36" x2="100" y2="164" stroke="currentColor" stroke-opacity=".12" stroke-width="1"/>
    <line x1="36" y1="100" x2="164" y2="100" stroke="currentColor" stroke-opacity=".12" stroke-width="1"/>
    <g transform="translate(100 100) scale(1.25)">
      <path d="M0 -28 L4 -8 L26 2 L26 7 L4 2 L3 18 L11 24 L11 28 L0 25 L-11 28 L-11 24 L-3 18 L-4 2 L-26 7 L-26 2 L-4 -8 Z" fill="currentColor" fill-opacity=".85"/>
    </g>
  </svg>`;
}

export function cardBackHTML(size = 'fit', rarity = 'common') {
  const r = RARITIES[rarity] || RARITIES.common;
  return `
  <div class="cback-kyara cback-v2 ${size}" style="--rc:${r.color}">
    <div class="cback-inner">
      <div class="cb-top-spec mono">COLLECTION AÉRONAUTIQUE</div>
      <div class="cb-emblem">${compassPlateSVG()}</div>
      <div class="cb-corner tl"></div><div class="cb-corner tr"></div><div class="cb-corner bl"></div><div class="cb-corner br"></div>
      <div class="cb-word">SKYDEX</div>
    </div>
  </div>`;
}

export function attachSpinner(el, opts = {}) {
  let speed = opts.speed ?? 46;
  let angle = opts.start ?? 0, vel = opts.paused ? 0 : speed, tiltX = 0;
  let dragging = false, paused = !!opts.paused, lastX = 0, lastY = 0, lastT = 0, prev = performance.now(), raf = 0;
  const shine = () => el.querySelector('.showcase-front .card-tilt');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const apply = () => {
    el.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${angle.toFixed(2)}deg)`;
    const s = shine();
    if (s) {
      const a = (angle * Math.PI) / 180;
      s.style.setProperty('--mx', (50 + Math.sin(a) * 55).toFixed(0) + '%');
      s.style.setProperty('--my', (40 - tiltX * 2).toFixed(0) + '%');
    }
  };
  const loop = now => {
    if (!el.isConnected) return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!dragging && !paused) {
      vel += (speed - vel) * Math.min(1, dt * 1.3);
      angle += vel * dt;
      tiltX += (Math.sin(now / 1100) * 4 - tiltX) * Math.min(1, dt * 2.5);
    }
    apply();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  el.addEventListener('pointerdown', e => {
    dragging = true; vel = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add('grabbed');
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX, dy = e.clientY - lastY;
    angle += dx * 0.75;
    tiltX = clamp(tiltX - dy * 0.35, -24, 24);
    vel = (dx * 0.75) / Math.max(0.008, (now - lastT) / 1000);
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  });
  const up = () => {
    if (!dragging) return;
    dragging = false; el.classList.remove('grabbed');
    if (performance.now() - lastT > 90) vel = 0;
    vel = clamp(vel, -1100, 1100);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return {
    pause() { paused = true; vel = 0; },
    resume() { paused = false; prev = performance.now(); },
    boost(v = 900) { vel = v; },
    setSpeed(v) { speed = v; },
    faceFront(ms = 450) {
      paused = true; vel = 0;
      const a0 = angle, a1 = Math.round(a0 / 360) * 360, t0 = performance.now(), x0 = tiltX;
      const step = now => {
        const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        angle = a0 + (a1 - a0) * e; tiltX = x0 * (1 - e);
        if (k < 1 && el.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    destroy() { cancelAnimationFrame(raf); },
  };
}

/**
 * Vraie carte de collection verticale Full-Art (ratio 5:7 inspiré de Kyara).
 * opts: { reg, callsign, airline, route, locked, count, size: 'sm'|'md'|'lg'|'fit'|'enc', isNew, isBest }
 */
export function cardHTML(model, opts = {}) {
  const r = RARITIES[model.rarity] || RARITIES.common;
  const locked = opts.locked ? ' locked' : '';
  const airlineDisp = fictionAirline(opts.airline, opts.callsign);
  const callsignDisp = fictionCallsign(opts.callsign);
  opts = { ...opts, airline: airlineDisp, callsign: callsignDisp };
  const liv = liveryOf(airlineDisp, model);
  const art = !model.generic && ART_MAP[model.id];
  const imgStyle = art && art.filter && !opts.locked ? ` style="filter:${art.filter}"` : '';
  const serial = String(serialOf(model.id)).padStart(3, '0');
  const totalStr = String(TOTAL_CATALOG).padStart(3, '0');

  let floatingBadge = '';
  if (opts.isBest) {
    floatingBadge = '<div class="c-badge-pill best">MEILLEURE CARTE</div>';
  } else if (opts.isNew) {
    floatingBadge = '<div class="c-badge-pill">NOUVEAU</div>';
  }

  const callsignTag = opts.callsign && opts.callsign !== '—'
    ? `<span class="c-flight-pill mono">${opts.callsign}</span>`
    : (opts.reg && opts.reg !== '—' ? `<span class="c-flight-pill mono">${opts.reg}</span>` : `<span class="c-flight-pill mono">${model.year || ''}</span>`);

  const routeOrMaker = !opts.locked && opts.route && opts.route !== '—'
    ? `${liv.label} · ${opts.route}`
    : `${model.maker && model.maker !== '—' ? model.maker + ' · ' : ''}${kindOf(model)}`;

  const artLayer = opts.locked
    ? `<div class="c-blueprint">
        <div class="bp-grid"></div>
        <div class="bp-rings"></div>
        <div class="bp-sil">${planeSVG(model, 'currentColor')}</div>
        <div class="bp-stamp mono">NON IDENTIFIÉ</div>
      </div>`
    : `${cardArtSVG(model, opts)}
       ${art ? `<img class="c-img" src="assets/planes/${art.src}"${imgStyle} alt="" draggable="false" loading="lazy" onload="this.parentNode.classList.add('has-art')" onerror="this.remove()">` : ''}
       <div class="c-fullbleed-shade"></div>`;

  return `
  <div class="card kyara-card r-${model.rarity}${locked}${model.historic ? ' historic' : ''} ${opts.size || ''}" style="--rc:${r.color};--lc1:${liv.c1};--lc2:${liv.c2}">
    ${floatingBadge}
    <div class="card-tilt">
      <div class="card-frame">
        <div class="card-inner">
          <!-- Illustration verticale plein-cadre (Full-Art 5:7) -->
          <div class="c-art ${opts.locked ? 'is-blueprint' : 'has-svg'}">
            ${artLayer}
          </div>

          <!-- Bandeau supérieur flottant : Rareté + N° de série + Livrée -->
          <div class="kyara-top-overlay">
            <div class="kyara-top-row">
              <span class="kyara-rar-pill">
                <i class="kr-dot" style="background:${r.color}"></i>
                <b>${r.label.toUpperCase()}</b>
              </span>
              <span class="kyara-serial mono">#${serial}/${totalStr}</span>
            </div>
            ${!opts.locked ? `
            <div class="kyara-livery-row">
              <div class="c-livery-pill" title="Livrée ${liv.label}">
                <span class="c-livery-tail"></span>
                <span class="c-livery-name">${liv.label}</span>
              </div>
              ${callsignTag}
            </div>` : ''}
          </div>

          <!-- Plaque collector inférieure (Modèle, Code OACI, Route & 3 Stats) -->
          <div class="kyara-plate">
            <div class="kp-livery-accent"></div>
            <div class="kp-head">
              <div class="kp-titles">
                <span class="kp-kicker">${routeOrMaker}</span>
                <h3 class="kp-name${model.name.length > 20 ? ' long' : ''}">${model.name}</h3>
              </div>
              <span class="kp-icao mono">${model.code || model.id}</span>
            </div>
            <div class="kp-stats mono">
              <div class="kp-stat">
                <small>VITESSE</small>
                <b>${opts.locked ? '—' : fmt(model.speed, ' km/h')}</b>
              </div>
              <div class="kp-stat">
                <small>RAYON</small>
                <b>${opts.locked ? '—' : fmt(model.range, ' km')}</b>
              </div>
              <div class="kp-stat">
                <small>${model.seats && model.seats > 12 ? 'PLACES' : 'SERVICE'}</small>
                <b>${opts.locked ? '—' : (model.seats && model.seats > 12 ? `${model.seats} pax` : (model.year || '—'))}</b>
              </div>
            </div>
          </div>
        </div>
        <div class="c-shine"></div>
      </div>
      ${opts.count > 1 ? `<div class="c-count">×${opts.count}</div>` : ''}
    </div>
  </div>`;
}

export function attachTilt(root) {
  const el = root.querySelector('.card-tilt');
  if (!el || el.dataset.tilt) return;
  el.dataset.tilt = '1';
  const move = e => {
    const b = el.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width), y = ((e.clientY - b.top) / b.height);
    el.style.setProperty('--ry', ((x - .5) * 20).toFixed(1) + 'deg');
    el.style.setProperty('--rx', ((.5 - y) * 20).toFixed(1) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(0) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(0) + '%');
    el.classList.add('tilting');
  };
  const reset = () => { el.classList.remove('tilting'); ['--rx', '--ry'].forEach(p => el.style.removeProperty(p)); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', reset);
  el.addEventListener('pointerup', () => setTimeout(reset, 600));
}

export function packHTML(pack, opts = {}) {
  const sector = { standard: 'SÉRIE 01 · DÉCOLLAGE', premium: 'SÉRIE 02 · LONG-COURRIER', historic: 'SÉRIE 03 · ARCHIVES', legend: 'SÉRIE 04 · PRESTIGE' }[pack.id] || 'SÉRIE · DOTATION';
  return `
  <div class="pack ${opts.size || ''}" style="--pc:${pack.color}">
    <div class="pack-body">
      <div class="pack-top">
        <span class="pack-sector">${sector}</span>
        <span class="pack-tear-line"></span>
      </div>
      <div class="pack-medallion">
        <div class="pack-icon">${packEmblemSVG(pack.id)}</div>
      </div>
      <div class="pack-info">
        <div class="pack-name">${pack.name}</div>
        <div class="pack-sub">${pack.cards} cartes</div>
      </div>
      <div class="pack-barcode"></div>
    </div>
  </div>`;
}
