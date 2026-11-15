// Effets : sons synthétisés (WebAudio) et particules (canvas).
import { state } from './state.js';

let ctx;
function audio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* pas d'audio */ } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0, slideTo = null) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// Bruit filtré qui balaie de f0 à f1 (souffle, réacteur, impact).
function noise(dur = 0.6, f0 = 400, f1 = 3000, vol = 0.1) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, a.currentTime); f.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  src.connect(f).connect(g).connect(a.destination); src.start();
}

export function sfx(name) {
  if (!state.settings.sound) return;
  switch (name) {
    case 'tap':    tone(520, 0.06, 'triangle', 0.08); break;
    case 'shake':  tone(180, 0.09, 'square', 0.07); break;
    case 'shake1': tone(190, 0.11, 'triangle', 0.11, 0, 240); tone(380, 0.08, 'sine', 0.06, 0.04); break;
    case 'shake2': tone(240, 0.11, 'triangle', 0.12, 0, 310); tone(480, 0.08, 'sine', 0.07, 0.04); break;
    case 'shake3': tone(310, 0.13, 'triangle', 0.14, 0, 420); tone(620, 0.09, 'sine', 0.08, 0.04); break;
    case 'lock':   tone(880, 0.08, 'sine', 0.12); tone(1320, 0.14, 'triangle', 0.12, 0.06); break;
    case 'appear': tone(300, 0.25, 'sine', 0.1, 0, 900); break;
    case 'success':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.09)); break;
    case 'fail':   tone(330, 0.35, 'sawtooth', 0.08, 0, 110); break;
    case 'tear':   tone(900, 0.3, 'sawtooth', 0.06, 0, 120); break;
    case 'flip':   tone(440, 0.1, 'triangle', 0.1, 0, 880); break;
    case 'epic':   [392, 494, 587, 784].forEach((f, i) => tone(f, 0.25, 'square', 0.07, i * 0.1)); break;
    case 'legend':
      [392, 494, 587, 784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.4, 'triangle', 0.13, i * 0.1)); break;
    case 'whoosh': noise(0.9, 400, 4200, 0.16); break;
    case 'rumble': tone(48, 1.8, 'sawtooth', 0.14, 0, 130); noise(1.8, 120, 900, 0.07); break;
    case 'impact': tone(70, 0.6, 'sine', 0.3, 0, 30); noise(0.5, 2000, 150, 0.2); break;
    case 'shimmer': [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.5, 'sine', 0.045, i * 0.07)); break;
    case 'levelup': [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.12, i * 0.08)); break;
    case 'shutter':
      // Déclic mécanique net d'obturateur reflex (miroir + rideau + bip AF)
      tone(2200, 0.018, 'square', 0.14);
      noise(0.038, 2400, 700, 0.28);
      tone(180, 0.045, 'triangle', 0.16, 0.012, 75);
      noise(0.042, 900, 3200, 0.22);
      tone(1650, 0.022, 'square', 0.11, 0.055);
      break;
    case 'focusClick':
      // Cran mécanique de la bague de mise au point
      tone(1350, 0.016, 'triangle', 0.065, 0, 680);
      break;
    case 'focusLock':
      // Double bip cristallin de confirmation de netteté AF
      tone(1760, 0.055, 'sine', 0.11);
      tone(2349, 0.075, 'sine', 0.12, 0.06);
      break;
    case 'polaroid':
      noise(0.32, 600, 2400, 0.08);
      [587, 740, 880, 1175, 1480].forEach((f, i) => tone(f, 0.28, 'triangle', 0.09, i * 0.065));
      break;
    case 'slideToHangar':
      noise(0.42, 500, 2800, 0.11);
      [784, 1046, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, 0.18 + i * 0.06));
      break;
    case 'combo':
      [659, 880, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.11, i * 0.055));
      break;
  }
}

let windNode = null;
/** Démarre le souffle d'ambiance du vent en altitude + réacteur lointain. */
export function startWindAmbience() {
  stopWindAmbience();
  if (!state.settings.sound) return;
  const a = audio(); if (!a) return;
  try {
    const dur = 3.0, n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.950 * b2 + w * 0.045;
      d[i] = (b0 + b1 + b2) * 0.35;
    }
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    const flt = a.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 380; flt.Q.value = 0.85;
    const lfo = a.createOscillator(), lfoGain = a.createGain();
    lfo.frequency.value = 0.28; lfoGain.gain.value = 180;
    lfo.connect(flt.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.linearRampToValueAtTime(0.055, a.currentTime + 0.6);
    src.connect(flt).connect(g).connect(a.destination);
    src.start(); lfo.start();
    windNode = { src, lfo, g, a };
  } catch (_) {}
}

/** Coupe proprement le souffle d'ambiance du vent. */
export function stopWindAmbience() {
  if (!windNode) return;
  const { src, lfo, g, a } = windNode;
  windNode = null;
  try {
    const t = a.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    setTimeout(() => { try { src.stop(); lfo.stop(); } catch (_) {} }, 280);
  } catch (_) {}
}

let lastLockBeep = 0;
/** Bip de verrouillage radar dynamique pendant que le joueur maintient le viseur. */
export function lockPulse(p, inZone) {
  if (!state.settings.sound) return;
  const now = performance.now();
  const interval = inZone ? 75 : Math.max(85, 230 - p * 145);
  if (now - lastLockBeep < interval) return;
  lastLockBeep = now;
  const f = inZone ? 1568 : Math.round(520 + p * 680);
  tone(f, inZone ? 0.065 : 0.05, inZone ? 'triangle' : 'sine', inZone ? 0.11 : 0.075);
  if (inZone) tone(2093, 0.06, 'sine', 0.07, 0.02);
}

export function vibrate(p) { if (state.settings.sound && navigator.vibrate) navigator.vibrate(p); }

// ---------------- Particules ----------------
let canvas, g2, parts = [], raf = 0;
function ensureCanvas() {
  if (canvas) return;
  canvas = document.getElementById('fx');
  g2 = canvas.getContext('2d');
  const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
  resize(); addEventListener('resize', resize);
}

export function burst(x, y, color = '#fbbf24', count = 40, power = 1) {
  ensureCanvas();
  const dpr = devicePixelRatio;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 7) * power * dpr;
    parts.push({
      x: x * dpr, y: y * dpr, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2 * dpr,
      life: 1, decay: 0.012 + Math.random() * 0.016, size: (3 + Math.random() * 5) * dpr,
      color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
      star: Math.random() < 0.4, rot: Math.random() * 6,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  g2.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.18 * devicePixelRatio; p.vx *= 0.99;
    p.life -= p.decay; p.rot += 0.15;
    g2.globalAlpha = Math.max(0, p.life);
    g2.fillStyle = p.color;
    g2.save(); g2.translate(p.x, p.y); g2.rotate(p.rot);
    if (p.star) {
      g2.beginPath();
      for (let k = 0; k < 8; k++) { const r = k % 2 ? p.size * 0.4 : p.size; g2.lineTo(Math.cos(k * Math.PI / 4) * r, Math.sin(k * Math.PI / 4) * r); }
      g2.closePath(); g2.fill();
    } else g2.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    g2.restore();
  }
  g2.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; g2.clearRect(0, 0, canvas.width, canvas.height); }
}

export const RAINBOW = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc', '#f472b6'];
