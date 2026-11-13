// Walkout cinématique pour les cartes Épiques / Légendaires (suspense → passage de l'avion → impact).
import { RARITIES, planeSVG } from './catalog.js';
import { sfx, vibrate, burst, RAINBOW } from './fx.js';
import { wait } from './ui.js';

/** Joue la séquence puis résout. Toucher l'écran la passe. */
export async function playWalkout(model) {
  const r = RARITIES[model.rarity];
  const legend = model.rarity === 'legendary';
  const el = document.createElement('div');
  el.className = 'walkout ' + (legend ? 'legend' : 'epic');
  el.style.setProperty('--rc', r.color);
  el.innerHTML = `
    <div class="wo-bars"></div>
    <div class="wo-streaks">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i};--d:${(Math.random() * .8).toFixed(2)}s;--t:${(8 + Math.random() * 78).toFixed(0)}%"></i>`).join('')}</div>
    <div class="wo-plane">${planeSVG(model)}</div>
    <div class="wo-text"><small>${model.historic ? 'Avion historique' : 'Carte rare'}</small><b>${r.label}</b></div>
    <div class="wo-ring"></div>`;
  document.getElementById('app').appendChild(el);

  let skip = false;
  el.addEventListener('pointerdown', () => { skip = true; });
  const pause = async ms => { const t0 = Date.now(); while (!skip && Date.now() - t0 < ms) await wait(40); };

  sfx('rumble'); vibrate([40, 60, 40, 60, 40]);
  await pause(legend ? 1500 : 900);
  el.classList.add('fly');
  sfx('whoosh');
  await pause(900);
  el.classList.add('hit');
  sfx('impact'); sfx(legend ? 'shimmer' : 'epic'); vibrate([150, 40, 250]);
  burst(innerWidth / 2, innerHeight / 2, legend ? RAINBOW : r.color, legend ? 160 : 90, 1.5);
  await pause(legend ? 900 : 500);
  el.classList.add('out');
  await wait(350);
  el.remove();
}
