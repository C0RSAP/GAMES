'use strict';
// ===== 4. Танки (WASD+F/Пробел и стрелки+Enter) =====
const TTOP = 56;
const circleRect = (cx, cy, r, [x, y, w, h]) => { const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h)); return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r; };
const rectsHit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const inflate = (r, d) => [r[0] - d / 2, r[1] - d / 2, r[2] + d, r[3] + d];
function makeWalls() {
  const walls = [[0, TTOP, W, 14], [0, H - 14, W, 14], [0, TTOP, 14, H - TTOP], [W - 14, TTOP, 14, H - TTOP]];
  const mid = (TTOP + H) / 2 | 0, spawns = [[40, mid - 90, 160, 180], [W - 200, mid - 90, 160, 180]], n = 4 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) for (let t = 0; t < 30; t++) {
    let w, h; if (Math.random() < .5) { w = rnd(80, 200) | 0; h = 24; } else { w = 24; h = rnd(80, 180) | 0; }
    const x = rnd(120, W / 2 - 40 - w) | 0, y = rnd(TTOP + 40, H - 90 - h) | 0, a = [x, y, w, h], b = [W - x - w, TTOP + H - y - h, w, h]; // зеркало
    if (!spawns.some(s => rectsHit(inflate(a, 30), s) || rectsHit(inflate(b, 30), s))) { walls.push(a, b); break; }
  }
  return walls;
}
async function tankRound(wins) {
  FX.reset();
  const walls = makeWalls(), midY = (TTOP + H) / 2;
  const T = [
    { x: 90, y: midY, ang: 0, color: PC[0], name: PN[0], l: 'KeyA', r: 'KeyD', f: 'KeyW', b: 'KeyS', fire: ['KeyF', 'Space'] },
    { x: W - 90, y: midY, ang: Math.PI, color: PC[1], name: PN[1], l: 'ArrowLeft', r: 'ArrowRight', f: 'ArrowUp', b: 'ArrowDown', fire: ['Enter', 'ShiftRight', 'Numpad0', 'NumpadEnter'] }];
  T.forEach(t => Object.assign(t, { alive: true, last: 0, shield: false, triple: 0, fast: 0 }));
  let bullets = [], crate = null, msg = ['', 0], endAt = null;
  const free = (x, y) => !walls.some(w => circleRect(x, y, 16, w));
  const wallAt = (x, y) => walls.some(w => rectsHit([x - 3, y - 3, 6, 6], w));
  function drawTank(t, tm) {
    g.save(); g.translate(t.x, t.y); g.rotate(t.ang);
    glow(0, 0, 46, dark(t.color, .45));
    g.lineCap = 'round'; g.strokeStyle = '#12141e'; g.lineWidth = 7;
    for (const sy of [-14, 14]) { g.beginPath(); g.moveTo(-19, sy); g.lineTo(19, sy); g.stroke(); }
    g.beginPath(); g.roundRect(-18, -11, 36, 22, 4); g.fillStyle = css(t.color); g.fill(); g.strokeStyle = css(dark(t.color, .5)); g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#eef0fa'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(28, 0); g.stroke();
    disc(0, 0, 10, light(t.color, 50)); disc(0, 0, 5, dark(t.color, .6)); g.restore();
    if (t.shield) { g.strokeStyle = 'rgb(120,226,255)'; g.lineWidth = 2; g.beginPath(); g.arc(t.x, t.y, 26 + 2 * Math.sin(tm / 120), 0, 6.283); g.stroke(); }
    if (tm < t.triple) disc(t.x, t.y - 22, 4, [255, 120, 60]); if (tm < t.fast) disc(t.x + 8, t.y - 22, 4, [110, 255, 140]);
  }
  function draw(tm) {
    backdrop(tm, [26, 60, 52], [20, 36, 90]);
    g.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 48) g.fillRect(x, TTOP, 1, H); for (let y = TTOP; y < H; y += 48) g.fillRect(0, y, W, 1);
    for (const w of walls) { g.beginPath(); g.roundRect(w[0], w[1], w[2], w[3], 5); g.fillStyle = 'rgb(70,78,110)'; g.fill(); g.strokeStyle = 'rgb(120,130,170)'; g.lineWidth = 2; g.stroke(); }
    if (crate) { glow(crate[0] + 13, crate[1] + 13, 40, [150, 120, 20]); g.beginPath(); g.roundRect(crate[0], crate[1], 26, 26, 6); g.fillStyle = 'rgb(212,160,70)'; g.fill(); g.strokeStyle = 'rgb(255,226,130)'; g.stroke(); text('?', crate[0] + 13, crate[1] + 13, { size: 17, bold: true, color: [70, 34, 0] }); }
    for (const b of bullets) { glow(b.x, b.y, 16, [150, 116, 30]); disc(b.x, b.y, 4, [255, 238, 150]); }
    T.forEach(t => t.alive && drawTank(t, tm));
    chip(16, 10, `${T[0].name}  ${wins[0]}`, T[0].color); chip(W - 16, 10, `${T[1].name}  ${wins[1]}`, T[1].color, 'right');
    if (tm < msg[1]) pill(msg[0], 28); else text('огонь: F / Enter', W / 2, 28, { size: 15, color: FAINT });
  }
  if (!await countdown(draw)) return 'menu';
  for (;;) {
    const tm = now();
    if (pump().keys.some(e => is(e, 'Escape'))) return 'menu';
    for (const t of T) {
      if (!t.alive) continue;
      if (held.has(t.l)) t.ang -= .065; if (held.has(t.r)) t.ang += .065;
      const d = (+held.has(t.f) - +held.has(t.b)) * (tm < t.fast ? 3.4 : 2.4);
      if (d) { const nx = t.x + Math.cos(t.ang) * d, ny = t.y + Math.sin(t.ang) * d; if (free(nx, ny)) { t.x = nx; t.y = ny; } else if (free(nx, t.y)) t.x = nx; else if (free(t.x, ny)) t.y = ny; }
      if (t.fire.some(k => held.has(k)) && tm - t.last > 450 && bullets.filter(b => b.o === t).length < 6) {
        t.last = tm; sfx('shoot');
        for (const da of tm < t.triple ? [-.28, 0, .28] : [0]) {
          const a = t.ang + da, bx = t.x + Math.cos(a) * 26, by = t.y + Math.sin(a) * 26;
          if (!wallAt(bx, by)) bullets.push({ x: bx, y: by, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, b: 0, born: tm, o: t });
        }
      }
    }
    const [a, b] = T;
    if (a.alive && b.alive) {
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || .01;
      if (dist < 34) { const push = (34 - dist) / 2, ux = dx / dist * push, uy = dy / dist * push; if (free(a.x - ux, a.y - uy)) { a.x -= ux; a.y -= uy; } if (free(b.x + ux, b.y + uy)) { b.x += ux; b.y += uy; } }
    }
    for (const bl of bullets) {
      bl.x += bl.vx; if (wallAt(bl.x, bl.y)) { bl.x -= bl.vx; bl.vx = -bl.vx; bl.b++; burst(bl.x, bl.y, [255, 220, 120], 4, 2, 15, 3); }
      bl.y += bl.vy; if (wallAt(bl.x, bl.y)) { bl.y -= bl.vy; bl.vy = -bl.vy; bl.b++; burst(bl.x, bl.y, [255, 220, 120], 4, 2, 15, 3); }
      if (bl.b > 3 || tm - bl.born > 5000) { bl.dead = true; continue; }
      for (const t of T) if (t.alive && (bl.x - t.x) ** 2 + (bl.y - t.y) ** 2 < 361) {
        bl.dead = true;
        if (t.shield) { t.shield = false; burst(t.x, t.y, [120, 226, 255], 20, 5); sfx('hit'); }
        else { t.alive = false; burst(t.x, t.y, t.color, 50, 7, 55, 5); burst(t.x, t.y, [255, 170, 60], 30, 5, 40, 4); FX.shake = 14; sfx('boom'); }
        break;
      }
    }
    bullets = bullets.filter(b => !b.dead);
    if (!crate && Math.random() < .003) for (let k = 0; k < 30; k++) { const r = [rnd(60, W - 90) | 0, rnd(TTOP + 30, H - 70) | 0, 26, 26]; if (!walls.some(w => rectsHit(inflate(r, 20), w))) { crate = r; break; } }
    if (crate) for (const t of T) if (t.alive && circleRect(t.x, t.y, 16, crate)) {
      const eff = pick(['triple', 'shield', 'fast']);
      if (eff === 'triple') { t.triple = tm + 6000; msg = [`${t.name}: тройной выстрел!`, tm + 2200]; } else if (eff === 'shield') { t.shield = true; msg = [`${t.name}: щит!`, tm + 2200]; } else { t.fast = tm + 6000; msg = [`${t.name}: турбо!`, tm + 2200]; }
      burst(crate[0] + 13, crate[1] + 13, GOLD, 20, 5); sfx('bonus'); crate = null; break;
    }
    draw(tm); updateFx(); drawFx(); await present();
    const alive = T.filter(t => t.alive);
    if (alive.length < 2 && endAt === null) endAt = tm + 1400;
    if (endAt !== null && tm >= endAt) {
      if (!alive.length) return endScreen('Ничья!', ['Оба танка уничтожены']);
      const w = T[0].alive ? 0 : 1; wins[w]++; return endScreen(`Победил ${T[w].name}!`, [`Счёт: ${wins[0]} : ${wins[1]}`], T[w].color);
    }
  }
}
async function tanksGame() { const wins = [0, 0]; while (await tankRound(wins) === 'again'); }
