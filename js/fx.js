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
  }
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
