'use strict';
// ===== 2. Сбор монет (2–4 игрока) =====
async function coinRush(n) {
  FX.reset();
  const ctrl = [['KeyW', 'KeyS', 'KeyA', 'KeyD'], ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], ['KeyI', 'KeyK', 'KeyJ', 'KeyL'], ['Numpad8', 'Numpad5', 'Numpad4', 'Numpad6']];
  const TOP = 60, R = 16, DUR = 45, st = [[110, 160], [W - 110, H - 100], [W - 110, 160], [110, H - 100]];
  const P = Array.from({ length: n }, (_, i) => ({ i, x: st[i][0], y: st[i][1], score: 0, boost: 0, stun: 0 }));
  let items = [], start = 0, lastSpawn = 0, rain = new Set(), msg = ['', 0];
  const spawn = (kind, t) => {
    if (!kind) { let r = Math.random() * 100; kind = r < 60 ? 'coin' : r < 70 ? 'gem' : r < 88 ? 'bomb' : 'potion'; }
    items.push({ kind, x: rnd(30, W - 30), y: rnd(TOP + 30, H - 30), born: t });
  };
  function draw(t) {
    const left = Math.max(0, DUR - (t - start) / 1000);
    backdrop(t, [16, 70, 60], [16, 40, 96]);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < W; x += 60) g.fillRect(x, TOP, 1, H); for (let y = TOP; y < H; y += 60) g.fillRect(0, y, W, 1);
    for (const it of items) {
      if (t - it.born > 5500 && (t / 150 | 0) % 2) continue;
      const { x, y, kind } = it;
      if (kind === 'coin') { glow(x, y, 30, [120, 96, 10]); const ew = Math.max(3, 12 * Math.abs(Math.cos(t / 180 + it.born))); g.fillStyle = css(GOLD); g.fillRect(x - ew, y - 12, ew * 2, 24); g.strokeStyle = '#fff4b0'; g.lineWidth = 2; g.strokeRect(x - ew, y - 12, ew * 2, 24); }
      else if (kind === 'gem') { glow(x, y, 36, [24, 120, 170]); g.fillStyle = '#60e2ff'; g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 14, y); g.lineTo(x, y + 16); g.lineTo(x - 14, y); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.stroke(); }
      else if (kind === 'bomb') { glow(x, y, 30, (t / 250 | 0) % 2 ? [150, 20, 30] : [90, 12, 20]); disc(x, y, 13, [36, 36, 46]); disc(x - 4, y - 4, 3, [90, 90, 110]); disc(x + 9, y - 18, 3, [255, 96, 50]); }
      else { glow(x, y, 30, [16, 120, 56]); disc(x, y, 13, [72, 228, 110]); text('+', x, y - 1, { size: 26, bold: true, color: [0, 70, 20] }); }
    }
    for (const p of P) {
      const col = t < p.stun ? [130, 134, 150] : PC[p.i];
      glow(p.x, p.y, 46, dark(col, .6)); disc(p.x, p.y, R + 2, dark(col, .55)); disc(p.x, p.y, R, col); disc(p.x - 5, p.y - 5, 5, light(col, 70));
      if (t < p.boost) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, R + 6, 0, 6.283); g.stroke(); }
    }
    for (const p of P) chip(n < 4 ? 16 + p.i * 200 : 12 + p.i * 190, 10, `${PN[p.i]}  ${p.score}`, PC[p.i]);
    g.fillStyle = 'rgb(40,46,78)'; g.fillRect(16, 52, W - 32, 4); g.fillStyle = css(left > 10 ? GOLD : RED); g.fillRect(16, 52, (W - 32) * left / DUR, 4);
    if (t < msg[1]) pill(msg[0], H / 2);
  }
  start = now(); if (!await countdown(draw)) return 'menu';
  start = lastSpawn = now();
  for (;;) {
    const t = now(), el = (t - start) / 1000;
    if (pump().keys.some(e => is(e, 'Escape'))) return 'menu';
    if (t - lastSpawn > 600 && items.length < 18) { lastSpawn = t; spawn(null, t); }
    for (const k of [15, 30]) if (el >= k && !rain.has(k)) { rain.add(k); for (let i = 0; i < 14; i++) spawn('coin', t); msg = ['ЗОЛОТОЙ ДОЖДЬ!', t + 2000]; sfx('bonus'); FX.shake = 6; }
    items = items.filter(it => t - it.born < 7000);
    for (const p of P) {
      if (t < p.stun) continue;
      const [u, d, l, r] = ctrl[p.i].map(c => held.has(c)), sp = t < p.boost ? 7 : 4.6;
      let dx = +r - +l, dy = +d - +u; if (dx && dy) { dx *= .7071; dy *= .7071; }
      p.x = Math.max(R, Math.min(W - R, p.x + dx * sp)); p.y = Math.max(TOP + R, Math.min(H - R, p.y + dy * sp));
      if (dx || dy) FX.p.push([p.x, p.y, 0, 0, 14, 14, PC[p.i], 6]);
      for (const it of [...items]) {
        if ((p.x - it.x) ** 2 + (p.y - it.y) ** 2 >= 841) continue;
        items.splice(items.indexOf(it), 1); const { x, y } = it;
        if (it.kind === 'coin') { p.score++; floater(x, y, '+1', GOLD); burst(x, y, GOLD, 8, 3); sfx('coin'); }
        else if (it.kind === 'gem') { p.score += 5; floater(x, y, '+5', [120, 230, 255]); burst(x, y, [80, 220, 255], 18, 5); sfx('bonus'); }
        else if (it.kind === 'bomb') { p.score = Math.max(0, p.score - 3); p.stun = t + 1200; floater(x, y, '-3', [255, 80, 90]); burst(x, y, [255, 110, 40], 30, 6); FX.shake = 8; sfx('boom'); }
        else { p.boost = t + 5000; floater(x, y, 'СКОРОСТЬ!', [100, 255, 130]); burst(x, y, [80, 255, 120], 14, 4); sfx('bonus'); }
      }
    }
    draw(t); updateFx(); drawFx(); await present();
    if (DUR - el <= 0) {
      const rk = [...P].sort((a, b) => b.score - a.score), tie = rk.length > 1 && rk[0].score === rk[1].score;
      return endScreen(tie ? 'Ничья!' : `Победил ${PN[rk[0].i]}!`, rk.map(q => `${PN[q.i]}: ${q.score}`), tie ? GOLD : PC[rk[0].i]);
    }
  }
}
async function coins() { const n = await choosePlayers('Сбор монет', GOLD); if (!n) return; while (await coinRush(n) === 'again'); }
