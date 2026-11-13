// Tests de logique (sans navigateur) : jsc -m tests/logic.test.mjs
const assert = Object.assign((cond, msg = 'Assertion failed') => { if (!cond) throw new Error(msg); }, {
  equal(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${a} === ${b}`); }
});
globalThis.console = globalThis.console || { log: (...a) => print(a.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ')) };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

const { MODELS, RARITIES, planeSVG, getModel } = await import('../js/catalog.js');
const { cardHTML, cardArtSVG, liveryOf } = await import('../js/cards.js');
const { AIRLINES } = await import('../js/flights.js');
const { rollPack, PACKS, displayRates } = await import('../js/packs.js');
const S = await import('../js/state.js');
const B = await import('../js/brand.js');

// Camouflage juridique : aucune vraie marque affichée
assert.equal(B.fictionAirline('Air France', 'AFR98VD'), 'Azur France');
assert.equal(B.fictionCallsign('AFR98VD'), 'AZF98VD');
assert.equal(B.fictionAirline('Ryanair', 'RYR70PV'), 'Ry-Air');
assert(/^(Trans-DAL|DAL-Aero)$/.test(B.fictionAirline('Delta', 'DAL249')), 'repli compagnie');
assert.equal(B.fictionCallsign('DAL249'), 'DAL249');
assert.equal(getModel('A320').name, 'Aéro-320');
assert.equal(getModel('A320').maker, 'Astra-Aero');
assert.equal(getModel('B38M').name, 'Orion-Max');
assert.equal(getModel('E190').maker, 'Swiftcraft');
assert(!/C152/.test(getModel('C152').name) || getModel('C152').name === 'Skylark 152', 'repli modèle');
assert(!/ZZ9X/.test(getModel('ZZ9X').name), 'type inconnu rendu fictif');
const BRANDS = /Airbus|Boeing|Embraer|Air France|Ryanair|Lufthansa|Emirates|easyJet|Transavia|Concorde|Gulfstream|Cessna|Antonov|Lockheed|Dreamliner|OACI/;
for (const m of MODELS) {
  const html = cardHTML(m, { size: 'md', airline: 'Air France', callsign: 'AFR123', route: 'CDG → JFK' });
  assert(!BRANDS.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'marque réelle visible sur la carte ' + m.id + ' : ' + (html.match(BRANDS) || [])[0]);
}

// Vérification des livrées compagnies aériennes
for (const name of Object.values(AIRLINES)) {
  const liv = liveryOf(name, MODELS[0]);
  assert(liv.c1 && liv.c2 && liv.label === name, 'livrée manquante pour ' + name);
}

// catalogue : ids uniques, raretés valides, silhouettes & illustrations 3D générables
const ids = new Set();
for (const m of MODELS) {
  assert(!ids.has(m.id), 'id dupliqué ' + m.id); ids.add(m.id);
  assert(RARITIES[m.rarity], 'rareté invalide ' + m.id);
  assert(planeSVG(m.shape).includes('<svg'), 'svg ' + m.id);
  assert(cardArtSVG(m).includes('c-svg-art'), 'cardArtSVG ' + m.id);
  assert(cardHTML(m, { size: 'md' }).includes(m.name), 'cardHTML ' + m.id);
}
assert.equal(getModel('ZZZZ').rarity, 'common');

// taux : somme 100 %
for (const p of Object.values(PACKS)) {
  const sum = Object.values(displayRates(p)).reduce((a, b) => a + b, 0);
  assert(Math.abs(sum - 100) < 1e-6);
}

// tirages : garanties respectées, historique = uniquement historiques
const N = 20000, counts = {};
for (const id of Object.keys(PACKS)) {
  const min = RARITIES[PACKS[id].min].order;
  let leg = 0;
  for (let i = 0; i < N / 4; i++) {
    S.state.pity = 0;
    const cards = rollPack(id);
    assert.equal(cards.length, PACKS[id].cards);
    assert(cards.some(c => RARITIES[c.rarity].order >= min), `garantie ${id}`);
    if (id === 'historic') assert(cards.every(c => c.historic), 'historic pool');
    if (id === 'standard') assert(cards.every(c => !c.historic));
    leg += cards.filter(c => c.rarity === 'legendary').length;
  }
  counts[id] = (leg / (N / 4 * PACKS[id].cards) * 100).toFixed(2) + ' % légendaires / carte';
}
console.log('Taux légendaires observés :', counts);

// pitié : au bout de 30 packs premium sans légendaire, on en obtient un
S.state.pity = 29;
assert(rollPack('premium').some(c => c.rarity === 'legendary'), 'pitié');

// collection / doublons / fragments
const a = getModel('A320');
const r1 = S.addCard(a), r2 = S.addCard(a);
assert(r1.isNew && !r2.isNew && r2.count === 2 && r2.fragments === RARITIES.common.fragments);
assert.equal(S.levelInfo(0).lvl, 1);
assert(S.levelInfo(100).lvl === 2);

// missions
S.ensureMissions();
assert.equal(S.state.missions.list.length, 4);
console.log('OK : tous les tests passent');
