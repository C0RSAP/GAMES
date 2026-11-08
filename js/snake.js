'use strict';
// ===== 1. Змейка (2 игрока: WASD и стрелки) =====
async function snakeRound(wins) {
  FX.reset();
  const CELL = 20, OY = 60, COLS = W / CELL | 0, OX = (W - COLS * CELL) / 2, ROWS = (H - OY) / CELL | 0, mid = ROWS >> 1;
  const P = [
    { name: PN[0], color: PC[0], body: [[6, mid], [5, mid], [4, mid]], dir: [1, 0], keys: { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] } },
    { name: PN[1], color: PC[1], body: [[COLS - 7, mid], [COLS - 6, mid], [COLS - 5, mid]], dir: [-1, 0], keys: { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } }];
  P.forEach(p => Object.assign(p, { grow: 0, last: 0, boost: 0, freeze: 0, alive: true, q: [], nw: null, moving: false }));
  const items = new Map(), K = c => c[0] + ',' + c[1], has = (b, c) => b.some(s => s[0] === c[0] && s[1] === c[1]);
  let msg = ['', 0];
  const dots = document.createElement('canvas'); dots.width = W; dots.height = H - OY;
  const dg = dots.getContext('2d'); dg.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { dg.beginPath(); dg.arc(x * CELL + 10, y * CELL + 10, 1, 0, 6.283); dg.fill(); }
  const cpos = c => [OX + c[0] * CELL + CELL / 2, OY + c[1] * CELL + CELL / 2];
  function addItem(kind) {
    for (let i = 0; i < 500; i++) {
      const c = [Math.random() * COLS | 0, Math.random() * ROWS | 0];
      if (!items.has(K(c)) && P.every(p => !has(p.body, c))) { items.set(K(c), kind); return; }
    }
  }
  const count = k => [...items.values()].filter(v => v === k).length;
  function drawSnake(p, t) {
    const n = p.body.length, base = t < p.freeze ? [170, 222, 255] : p.color;
    for (let j = n - 1; j > 0; j--) {
      const a = cpos(p.body[j]), b = cpos(p.body[j - 1]);
      g.fillStyle = css(mix(base, dark(base, .4), j / Math.max(n - 1, 1) * .9));
      g.beginPath(); g.roundRect(Math.min(a[0], b[0]) - 7, Math.min(a[1], b[1]) - 7, Math.abs(a[0] - b[0]) + 14, Math.abs(a[1] - b[1]) + 14, 6); g.fill();
    }
    const [hx, hy] = cpos(p.body[0]); if (t < p.boost) glow(hx, hy, 40, dark(p.color, .8));
    g.fillStyle = css(light(base, 25)); g.beginPath(); g.roundRect(hx - 9, hy - 9, 18, 18, 7); g.fill();
    const [dx, dy] = p.dir;
    for (const s of [-1, 1]) { const ex = hx + dx * 3 - dy * 4 * s, ey = hy + dy * 3 + dx * 4 * s; disc(ex, ey, 3, WHITE); disc(ex + dx, ey + dy, 1, [10, 10, 20]); }
  }
  function drawScene(t) {
    backdrop(t, [44, 36, 104], [12, 60, 96]); g.drawImage(dots, OX, OY);
    const pulse = Math.sin(t / 200);
    for (const [k, kind] of items) {
      const [x, y] = cpos(k.split(',').map(Number));
      if (kind === 'apple') {
        glow(x, y, 26, [130, 28, 40]); disc(x, y, 8, [255, 82, 98]); disc(x - 3, y - 3, 3, [255, 190, 196]);
        g.strokeStyle = 'rgb(90,220,130)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 4, y - 13); g.stroke();
      } else { glow(x, y, 34, [150, 120, 20]); disc(x, y, 9 + 2 * pulse, GOLD); text('?', x, y, { size: 17, bold: true, color: [80, 46, 0] }); }
    }
    P.forEach(p => drawSnake(p, t));
    chip(16, 12, `${P[0].name}  ${wins[0]}`, P[0].color); chip(W - 16, 12, `${P[1].name}  ${wins[1]}`, P[1].color, 'right');
    if (t < msg[1]) pill(msg[0], 30);
  }
  addItem('apple'); addItem('apple');
  if (!await countdown(drawScene)) return 'menu';
  let t = now(), lastBonus = t; P.forEach(p => p.last = t);
  for (;;) {
    t = now();
    for (const e of pump().keys) {
      if (is(e, 'Escape')) return 'menu';
      for (const p of P) {
        const nd = p.keys[e.code]; if (!nd) continue;
        const ref = p.q.length ? p.q[p.q.length - 1] : p.dir;
        if ((nd[0] !== ref[0] || nd[1] !== ref[1]) && (nd[0] !== -ref[0] || nd[1] !== -ref[1]) && p.q.length < 3) p.q.push(nd);
      }
    }
    if (count('apple') < 2) addItem('apple');
    if (t - lastBonus > 5000) { lastBonus = t; if (!count('bonus') && Math.random() < .7) addItem('bonus'); }
    for (const p of P) { // обе змейки ходят одновременно
      p.moving = false; if (t < p.freeze) continue;
      if (t - p.last >= (t < p.boost ? 68 : 115)) {
        p.last = t; if (p.q.length) p.dir = p.q.shift();
        p.nw = [p.body[0][0] + p.dir[0], p.body[0][1] + p.dir[1]]; p.moving = true;
      }
    }
    const solid = p => (p.moving && p.grow === 0) ? p.body.slice(0, -1) : p.body;
    const crashed = P.filter((p, i) => {
      if (!p.moving) return false; const o = P[1 - i], nh = p.nw;
      return nh[0] < 0 || nh[0] >= COLS || nh[1] < 0 || nh[1] >= ROWS || has(solid(p), nh) || has(solid(o), nh) || (o.moving && o.nw[0] === nh[0] && o.nw[1] === nh[1]);
    });
    P.forEach((p, i) => {
      if (!p.moving) return; if (crashed.includes(p)) { p.alive = false; return; }
      const o = P[1 - i], nw = p.nw; p.body.unshift(nw);
      const kind = items.get(K(nw)); items.delete(K(nw));
      if (kind === 'apple') { p.grow++; burst(...cpos(nw), [255, 90, 100], 10, 3); sfx('coin'); }
      else if (kind === 'bonus') {
        burst(...cpos(nw), GOLD, 22, 5); sfx('bonus');
        const eff = pick(['grow', 'shrink', 'boost', 'freeze']);
        if (eff === 'grow') { p.grow += 4; msg = [`${p.name}: бонус — вырос на 4!`, t + 2500]; }
        else if (eff === 'shrink') { for (let k = 0; k < 3; k++) if (o.body.length > 3) o.body.pop(); msg = [`${p.name}: бонус — враг стал короче!`, t + 2500]; }
        else if (eff === 'boost') { p.boost = t + 5000; msg = [`${p.name}: бонус — УСКОРЕНИЕ!`, t + 2500]; }
        else { o.freeze = t + 2500; msg = [`${p.name}: бонус — враг заморожен!`, t + 2500]; }
      }
      if (p.grow > 0) p.grow--; else p.body.pop();
      if (t < p.boost) { const [x, y] = cpos(p.body[p.body.length - 1]); FX.p.push([x, y, 0, 0, 14, 14, p.color, 5]); }
    });
    drawScene(t); updateFx(); drawFx(); await present();
    const dead = P.filter(p => !p.alive);
    if (dead.length) {
      dead.forEach(p => p.body.forEach(c => burst(...cpos(c), p.color, 2, 4, 50)));
      FX.shake = 14; sfx('boom'); await finishAnim(drawScene, 50);
      if (dead.length === 2) return endScreen('Ничья!', ['Обе змейки разбились']);
      const w = P[0].alive ? 0 : 1; wins[w]++;
      return endScreen(`Победил ${P[w].name}!`, [`Счёт: ${wins[0]} : ${wins[1]}`], P[w].color);
    }
  }
}
async function snake() { const wins = [0, 0]; while (await snakeRound(wins) === 'again'); }
