'use strict';
// ===== 5. Сумо-арена (2–4 игрока) =====
async function sumoRound(n, wins) {
  FX.reset();
  const CX = W / 2, CY = H / 2 + 24, R0 = 290, R1 = 130, DUR = 70, PR = 22;
  const ctrl = [['KeyW', 'KeyS', 'KeyA', 'KeyD'], ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], ['KeyI', 'KeyK', 'KeyJ', 'KeyL'], ['Numpad8', 'Numpad5', 'Numpad4', 'Numpad6']];
  const P = Array.from({ length: n }, (_, i) => { const a = 6.283 * i / n + rnd(-.2, .2); return { i, x: CX + 150 * Math.cos(a), y: CY + 150 * Math.sin(a), vx: 0, vy: 0, alive: true, fall: 0 }; });
  const S = { start: now(), ice: 0, blast: null, next: 0, msg: ['', 0], end: null };
  const arenaR = t => R0 - (R0 - R1) * Math.min(1, (t - S.start) / 1000 / DUR);
  function draw(t) {
    backdrop(t, [16, 50, 110], [8, 26, 70]);
    const ice = t < S.ice, ar = arenaR(t), base = ice ? [140, 196, 240] : [78, 88, 124];
    glow(CX, CY, ar + 40, dark(base, .25));
    for (let rr = ar; rr > 0; rr -= 4) { const k = 1 - rr / ar; disc(CX, CY, rr, base.map(v => Math.min(255, v + k * 40))); }
    const dg = 1 - (ar - R1) / (R0 - R1);
    g.strokeStyle = css([120 + 135 * dg, 160 - 100 * dg, 200 - 140 * dg]); g.lineWidth = 5; g.beginPath(); g.arc(CX, CY, ar, 0, 6.283); g.stroke();
    if (S.blast) { const pl = 1 + .15 * Math.sin(t / 60); g.strokeStyle = 'rgb(255,90,70)'; g.lineWidth = 3; g.beginPath(); g.arc(S.blast[0], S.blast[1], 130 * pl, 0, 6.283); g.stroke(); disc(S.blast[0], S.blast[1], 14 * pl, [255, 150, 70]); }
    for (const p of P) {
      let col = PC[p.i], sc = 1;
      if (!p.alive) { sc = 1 - (t - p.fall) / 700; if (sc <= 0) continue; col = dark(col, Math.max(.2, sc)); }
      const r = PR * sc; if (p.alive) glow(p.x, p.y, 46, dark(col, .5));
      disc(p.x, p.y, r + 2, dark(col, .5)); disc(p.x, p.y, r, col); disc(p.x - r * .3, p.y - r * .3, Math.max(1, r / 4), light(col, 70));
      if (p.alive) text(String(p.i + 1), p.x, p.y, { size: 17, bold: true, color: [12, 14, 28] });
    }
    for (const p of P) chip(n < 4 ? 14 + p.i * 200 : 10 + p.i * 190, 10, `${PN[p.i]}  ${wins[p.i]}`, PC[p.i]);
    if (t < S.msg[1]) pill(S.msg[0], 80);
  }
  if (!await countdown(draw)) return 'menu';
  S.start = now(); S.next = S.start + 6000;
  for (;;) {
    const t = now(), ar = arenaR(t);
    if (pump().keys.some(e => is(e, 'Escape'))) return 'menu';
    const ice = t < S.ice, [fr, acc] = ice ? [.975, .25] : [.9, .55];
    if (t >= S.next && !ice && !S.blast) {
      S.next = t + rnd(6000, 10000);
      if (Math.random() < .5) { S.ice = t + 6000; S.msg = ['ЛЁД! Всё скользит!', t + 2500]; sfx('bonus'); }
      else { const a = rnd(0, 6.283), d = rnd(0, ar * .6); S.blast = [CX + d * Math.cos(a), CY + d * Math.sin(a), t + 1500]; S.msg = ['ВЗРЫВ! Бегите!', t + 1500]; sfx('bad'); }
    }
    for (const p of P) {
      if (p.alive) { const [u, d, l, r] = ctrl[p.i].map(c => held.has(c)); p.vx += (+r - +l) * acc; p.vy += (+d - +u) * acc; p.vx *= fr; p.vy *= fr; } else { p.vx *= .95; p.vy *= .95; }
      p.x += p.vx; p.y += p.vy;
    }
    const bl = S.blast;
    if (bl && t >= bl[2]) {
      for (const p of P) if (p.alive) { const dx = p.x - bl[0], dy = p.y - bl[1], d = Math.hypot(dx, dy) || .01; if (d < 130) { const f = (130 - d) / 130 * 14 + 3; p.vx += dx / d * f; p.vy += dy / d * f; } }
      burst(bl[0], bl[1], [255, 150, 50], 60, 9, 50, 6); FX.shake = 14; sfx('boom'); S.blast = null;
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = P[i], b = P[j]; if (!(a.alive && b.alive)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01;
      if (d < 2 * PR) {
        const nx = dx / d, ny = dy / d, ov = 2 * PR - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
        const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn > 0) { const j2 = 2.2 * vn / 2; a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny; if (vn > 2) { burst((a.x + b.x) / 2, (a.y + b.y) / 2, WHITE, 8, 4, 20); FX.shake = Math.max(FX.shake, Math.min(8, vn)); sfx('hit'); } }
      }
    }
    for (const p of P) if (p.alive && Math.hypot(p.x - CX, p.y - CY) > ar + 4) { p.alive = false; p.fall = t; burst(p.x, p.y, PC[p.i], 25, 5, 40); sfx('bad'); }
    draw(t); updateFx(); drawFx(); await present();
    const alive = P.filter(p => p.alive);
    if (alive.length <= 1 && S.end === null) S.end = t + 1200;
    if (S.end !== null && t >= S.end) {
      if (!alive.length) return endScreen('Ничья!', ['Все улетели в воду']);
      const w = alive[0].i; wins[w]++; return endScreen(`Победил ${PN[w]}!`, P.map(p => `${PN[p.i]}: ${wins[p.i]}`), PC[w]);
    }
  }
}
async function sumo() { const n = await choosePlayers('Сумо-арена', [255, 105, 200]); if (!n) return; const wins = Array(n).fill(0); while (await sumoRound(n, wins) === 'again'); }
