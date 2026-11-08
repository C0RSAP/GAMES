'use strict';
// ===== Движок: холст 960x640, ввод по физическим клавишам, звук, эффекты =====
let W = 960; const H = 640, cv = document.getElementById('game'); // ширина подстраивается под экран, высота логическая 640
// Игра занимает весь экран: логическая ширина W подстраивается под пропорции окна (высота 640),
// буфер холста — под реальный размер на экране × плотность пикселей, поэтому картинка остаётся чёткой.
const g = cv.getContext('2d');
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H), cw = W * s, ch = H * s;
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const k = Math.min(4096 / W, Math.max(1, cw * (window.devicePixelRatio || 1) / W));
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
}
// Меняем W только в безопасные моменты (меню, начало игры/раунда), чтобы не сломать поле посреди партии
function applySize() {
  const asp = Math.max(1.5, Math.min(2.4, innerWidth / innerHeight)), Wn = asp > 1.5 ? Math.round(H * asp) : 960;
  if (Wn !== W) { W = Wn; fit(); }
}
applySize(); fit(); addEventListener('resize', fit); document.addEventListener('fullscreenchange', fit);
const toggleFull = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (_) { } };
cv.addEventListener('dblclick', toggleFull);
const FF = '"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';
const INK = [236, 239, 252], MUTED = [142, 150, 180], FAINT = [84, 92, 124], GOLD = [255, 208, 84],
  GREEN = [46, 204, 132], YELLOW = [245, 184, 65], GRAY = [62, 66, 92], RED = [255, 96, 110], WHITE = [255, 255, 255];
const PN = ['Зелёный', 'Синий', 'Оранжевый', 'Розовый'];
const PC = [[52, 232, 158], [88, 166, 255], [255, 159, 67], [255, 107, 190]];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const dark = (c, k) => c.map(v => v * k);
const light = (c, d = 60) => c.map(v => Math.min(255, v + d));
const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const now = () => performance.now();

// ----- ввод -----
const held = new Set(), keyQ = [], clickQ = [], mouse = { x: -1, y: -1 };
const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
addEventListener('keydown', e => {
  if (e.code === 'F11') { e.preventDefault(); toggleFull(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Backspace') e.preventDefault();
  if (!e.repeat) { held.add(e.code); keyQ.push(e); }
});
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());
cv.addEventListener('pointerdown', e => { clickQ.push(pos(e)); });
cv.addEventListener('pointermove', e => Object.assign(mouse, pos(e)));
const pump = () => ({ keys: keyQ.splice(0), clicks: clickQ.splice(0) });
const is = (e, ...codes) => codes.includes(e.code);
const inRect = (p, r) => p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3];
const RU = { KeyQ: 'й', KeyW: 'ц', KeyE: 'у', KeyR: 'к', KeyT: 'е', KeyY: 'н', KeyU: 'г', KeyI: 'ш', KeyO: 'щ', KeyP: 'з', BracketLeft: 'х', BracketRight: 'ъ', KeyA: 'ф', KeyS: 'ы', KeyD: 'в', KeyF: 'а', KeyG: 'п', KeyH: 'р', KeyJ: 'о', KeyK: 'л', KeyL: 'д', Semicolon: 'ж', Quote: 'э', KeyZ: 'я', KeyX: 'ч', KeyC: 'с', KeyV: 'м', KeyB: 'и', KeyN: 'т', KeyM: 'ь', Comma: 'б', Period: 'ю', Backquote: 'е' };
function ruLetter(e) { // русская буква при любой раскладке; ё -> е
  const k = (e.key || '').toLowerCase();
  if (k.length === 1 && /[а-яё]/.test(k)) return k === 'ё' ? 'е' : k;
  if (k.length === 1 && !/[a-z]/.test(k)) return null;
  return RU[e.code] || null;
}

// ----- звук (WebAudio) -----
let ac = null; const STATE = { mute: false };
function tone(f, ms, vol = .2, type = 'square', slide = 0) {
  if (STATE.mute) return;
  try {
    ac = ac || new AudioContext(); if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime, d = ms / 1000;
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(Math.max(20, f + slide * d), t + d);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(v).connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (_) { }
}
const SND = { shoot: [700, 100, .16, 'square', -4000], coin: [880, 80, .18, 'square', 2500], hit: [220, 90, .26, 'square', -600], boom: [90, 350, .4, 'sawtooth', -60], bonus: [500, 220, .22, 'sine', 2500], bad: [160, 250, .26, 'square', -250], go: [1000, 300, .26, 'square', 0], beep: [440, 120, .18, 'sine', 0] };
const sfx = n => tone(...SND[n]);

// ----- эффекты -----
const FX = { p: [], f: [], shake: 0, reset() { applySize(); this.p.length = 0; this.f.length = 0; this.shake = 0; } };
function burst(x, y, c, n = 14, speed = 4, life = 40, size = 4) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(.3, 1) * speed; FX.p.push([x, y, Math.cos(a) * s, Math.sin(a) * s, life, life, c, size]); }
}
function floater(x, y, s, c) { FX.f.push([x, y, s, c, 48]); }
function updateFx() { for (const f of FX.f) { f[1] -= 1.1; f[4]--; } FX.f = FX.f.filter(f => f[4] > 0); for (const p of FX.p) { p[0] += p[2]; p[1] += p[3]; p[2] *= .96; p[3] *= .96; p[4]--; } FX.p = FX.p.filter(p => p[4] > 0); }
function drawFx() { for (const [x, y, s, c, l] of FX.f) text(s, x, y, { size: 26, bold: true, color: c, shadow: true, alpha: Math.min(1, l / 28) }); for (const [x, y, , , l, m, c, s] of FX.p) { g.fillStyle = css(c, l / m); g.beginPath(); g.arc(x, y, Math.max(1, s * l / m), 0, 6.283); g.fill(); } }

// ----- рисование -----
function text(s, x, y, o = {}) {
  const { size = 19, bold = false, color = INK, align = 'center', base = 'middle', alpha = 1, shadow = false } = o;
  g.font = `${bold ? '700 ' : ''}${size}px ${FF}`; g.textAlign = align; g.textBaseline = base;
  if (shadow) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(s, x + 1, y + 2); }
  g.globalAlpha = alpha; g.fillStyle = css(color); g.fillText(s, x, y); g.globalAlpha = 1;
}
const tw = (s, size = 19, bold = false) => { g.font = `${bold ? '700 ' : ''}${size}px ${FF}`; return g.measureText(s).width; };
function panel(x, y, w, h, o = {}) {
  const { fill = 'rgba(255,255,255,.05)', stroke = 'rgba(255,255,255,.13)', r = 18, lw = 1 } = o;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill();
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function disc(x, y, r, c) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.283); g.fillStyle = css(c); g.fill(); }
function glow(x, y, r, c) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(c, .9)); gr.addColorStop(1, css(c, 0));
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
}
function backdrop(t, a = [54, 38, 120], b = [14, 62, 100], top = '#080914', bot = '#14102a') {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const k = t / 5200;
  glow(W * .18 + Math.sin(k) * 70, H * .22 + Math.cos(k * .8) * 40, 280, a);
  glow(W * .85 + Math.cos(k * .9) * 70, H * .82 + Math.sin(k * .7) * 40, 280, b);
  const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .65); v.addColorStop(0, 'rgba(0,0,8,0)'); v.addColorStop(1, 'rgba(0,0,8,.7)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
function hints(items, y = H - 36) {
  const parts = items.map(([k, l]) => [k, l, Math.max(28, tw(k, 17, true) + 18), tw(l, 15)]);
  let x = (W - (parts.reduce((s, p) => s + p[2] + 8 + p[3] + 24, 0) - 24)) / 2;
  for (const [k, l, kw, lw] of parts) {
    panel(x, y, kw, 26, { fill: 'rgba(255,255,255,.09)', stroke: 'rgba(255,255,255,.27)', r: 8 });
    text(k, x + kw / 2, y + 13, { size: 17, bold: true });
    text(l, x + kw + 8, y + 13, { size: 15, color: MUTED, align: 'left' });
    x += kw + 8 + lw + 24;
  }
}
function chip(x, y, label, c, align = 'left') {
  const w = tw(label, 19) + 46, rx = align === 'left' ? x : x - w;
  panel(rx, y, w, 36, { fill: 'rgba(12,14,32,.8)', stroke: css(c, .6), r: 18 });
  disc(rx + 19, y + 18, 6, c); text(label, rx + 33, y + 18, { align: 'left' });
}
function pill(label, y, c = GOLD) {
  const w = tw(label, 19) + 40; panel(W / 2 - w / 2, y - 18, w, 36, { fill: 'rgba(12,14,32,.85)', stroke: css(c, .5), r: 18 });
  text(label, W / 2, y, { color: c });
}
const frame = () => new Promise(requestAnimationFrame);
async function present() {
  if (FX.shake > .5) { cv.style.transform = `translate(${rnd(-1, 1) * FX.shake}px,${rnd(-1, 1) * FX.shake}px)`; FX.shake *= .88; }
  else { FX.shake = 0; cv.style.transform = ''; }
  await frame();
}
async function finishAnim(draw, frames = 45) { for (let i = 0; i < frames; i++) { pump(); draw(now()); updateFx(); drawFx(); await present(); } }
async function countdown(draw, secs = 3) { // 3-2-1-GO; false если нажали Esc
  const t0 = now(); let last = -1;
  for (;;) {
    if (pump().keys.some(e => is(e, 'Escape'))) return false;
    const t = now(), el = (t - t0) / 1000;
    if (el >= secs + .5) return true;
    draw(t);
    const step = el < secs ? Math.floor(el) : secs;
    if (step !== last) { last = step; sfx(step === secs ? 'go' : 'beep'); }
    const fr = el < secs ? el % 1 : (el - secs) / .5;
    g.save(); g.translate(W / 2, H / 2); const k = 1.25 - .25 * ease(fr * 2); g.scale(k, k);
    g.globalAlpha = 1 - Math.max(0, fr - .55) / .45;
    text(el < secs ? String(secs - step) : 'GO!', 0, 0, { size: 112, bold: true, color: el < secs ? GOLD : GREEN });
    g.restore(); await present();
  }
}
async function endScreen(title, lines, accent = GOLD) {
  const snap = document.createElement('canvas'); snap.width = cv.width; snap.height = cv.height; snap.getContext('2d').drawImage(cv, 0, 0);
  sfx('bonus'); const t0 = now();
  for (;;) {
    for (const e of pump().keys) { if (is(e, 'KeyR', 'Enter', 'NumpadEnter', 'Space')) return 'again'; if (is(e, 'Escape')) return 'menu'; }
    const k = ease((now() - t0) / 380);
    g.drawImage(snap, 0, 0, W, H); g.fillStyle = 'rgba(5,6,16,.69)'; g.fillRect(0, 0, W, H);
    const ch = 150 + 38 * lines.length, cy = H / 2 - 10 + (1 - k) * 30 - ch / 2;
    panel(W / 2 - 290, cy, 580, ch, { fill: 'rgba(20,22,46,.93)', stroke: css(accent, .63), r: 30, lw: 2 });
    glow(W / 2, cy, 150, dark(accent, .28));
    text(title, W / 2, cy + 62, { size: tw(title, 62, true) < 520 ? 62 : 38, bold: true, color: accent });
    lines.forEach((l, i) => text(l, W / 2, cy + 124 + i * 38, { size: 26, bold: true }));
    hints([['R', 'ещё раз'], ['ESC', 'в меню']], cy + ch + 22);
    await present();
  }
}

async function choosePlayers(title, accent) { // 2-4 игрока; null при Esc
  const cards = [2, 3, 4].map((n, i) => [n, [W / 2 - 330 + i * 230, 190, 200, 150]]);
  const KEYS = ['W A S D', 'Стрелки', 'I J K L', 'Num 8 4 5 6'];
  for (;;) {
    const { keys, clicks } = pump();
    for (const e of keys) { if (is(e, 'Escape')) return null; for (const n of [2, 3, 4]) if (is(e, 'Digit' + n, 'Numpad' + n)) return n; }
    for (const c of clicks) for (const [n, r] of cards) if (inRect(c, r)) return n;
    backdrop(now(), dark(accent, .3), [14, 40, 90]);
    text(title, W / 2, 80, { size: 38, bold: true, color: accent }); text('Сколько игроков?', W / 2, 140, { size: 26, bold: true });
    for (const [n, r] of cards) {
      const hov = inRect(mouse, r), y = r[1] - (hov ? 4 : 0);
      panel(r[0], y, r[2], r[3], { fill: `rgba(255,255,255,${hov ? .09 : .05})`, stroke: css(accent, hov ? .8 : .3), r: 24, lw: 2 });
      text(String(n), r[0] + 100, y + 65, { size: 112, bold: true });
      for (let j = 0; j < n; j++) disc(r[0] + 100 - (n - 1) * 12 + j * 24, y + 124, 7, PC[j]);
    }
    for (let i = 0; i < 4; i++) { const y = 390 + i * 40; disc(W / 2 - 190, y, 8, PC[i]); text(PN[i], W / 2 - 168, y, { align: 'left' }); text(KEYS[i], W / 2 + 190, y, { align: 'right', color: MUTED }); }
    hints([['2 3 4', 'выбрать'], ['ESC', 'назад']]); await present();
  }
}
