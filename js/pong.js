'use strict';
// ===== 3. Понг+ (W/S и стрелки вверх/вниз, до 7) =====
async function pongMatch() {
  FX.reset();
  const P = [{ x: 30, y: H / 2 - 50, h: 100, up: 'KeyW', dn: 'KeyS', score: 0, big: 0, small: 0, color: PC[0], name: PN[0] },
    { x: W - 44, y: H / 2 - 50, h: 100, up: 'ArrowUp', dn: 'ArrowDown', score: 0, big: 0, small: 0, color: PC[1], name: PN[1] }];
  const B = { x: W / 2, y: H / 2, vx: 0, vy: 0, last: null, trail: [] }, WIN = 7, PW = 14;
  let orb = null, msg = ['', 0], serveAt = 0;
  const serve = (dir, t) => { const a = rnd(-.7, .7); Object.assign(B, { x: W / 2, y: H / 2, vx: dir * 6 * Math.cos(a), vy: 6 * Math.sin(a), last: null, trail: [] }); serveAt = t + 900; };
  const rdir = () => Math.random() < .5 ? -1 : 1;
  function draw(t) {
    backdrop(t, [34, 40, 120], [84, 26, 96]);
    g.fillStyle = 'rgb(60,66,104)'; for (let y = 10; y < H; y += 32) g.fillRect(W / 2 - 2, y, 4, 16);
    g.fillStyle = 'rgb(70,76,118)'; g.fillRect(0, 0, W, 4); g.fillRect(0, H - 4, W, 4);
    text(String(P[0].score), W / 2 - 120, 100, { size: 112, bold: true, color: dark(P[0].color, .55) }); text(String(P[1].score), W / 2 + 120, 100, { size: 112, bold: true, color: dark(P[1].color, .55) });
    text(`до ${WIN}`, W / 2, 24, { color: FAINT });
    B.trail.forEach(([x, y], i) => disc(x, y, 2 + 7 * (i + 1) / B.trail.length, dark([200, 210, 255], (i + 1) / B.trail.length * .45)));
    glow(B.x, B.y, 40, [110, 116, 170]); disc(B.x, B.y, 9, WHITE);
    if (t < serveAt) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(B.x, B.y, 16 + 8 * Math.sin(t / 90), 0, 6.283); g.stroke(); }
    for (const p of P) { glow(p.x + PW / 2, p.y + p.h / 2, 70, dark(p.color, .5)); g.fillStyle = css(p.color); g.fillRect(p.x, p.y, PW, p.h); g.strokeStyle = css(light(p.color, 70)); g.lineWidth = 2; g.strokeRect(p.x, p.y, PW, p.h); }
    if (orb) { glow(orb.x + 15, orb.y + 15, 44, [150, 120, 20]); disc(orb.x + 15, orb.y + 15, 15, GOLD); text('?', orb.x + 15, orb.y + 15, { size: 20, bold: true, color: [80, 46, 0] }); }
    if (t < msg[1]) pill(msg[0], H - 40);
  }
  serve(rdir(), now()); serveAt = 0; if (!await countdown(draw)) return 'menu'; serve(rdir(), now());
  for (;;) {
    const t = now();
    if (pump().keys.some(e => is(e, 'Escape'))) return 'menu';
    for (const p of P) {
      if (held.has(p.up)) p.y -= 8; if (held.has(p.dn)) p.y += 8;
      const cy = p.y + p.h / 2; p.h = t < p.big ? 170 : t < p.small ? 60 : 100; p.y = Math.max(0, Math.min(H - p.h, cy - p.h / 2));
    }
    if (t >= serveAt) {
      B.x += B.vx; B.y += B.vy; B.trail.push([B.x, B.y]); if (B.trail.length > 16) B.trail.shift();
      if (B.y < 9) { B.y = 9; B.vy = Math.abs(B.vy); sfx('beep'); } if (B.y > H - 9) { B.y = H - 9; B.vy = -Math.abs(B.vy); sfx('beep'); }
      P.forEach((p, i) => {
        const cx = p.x + PW / 2, coming = i === 0 ? B.vx < 0 : B.vx > 0, front = i === 0 ? B.x > cx : B.x < cx;
        if (coming && front && B.x + 9 > p.x && B.x - 9 < p.x + PW && B.y + 9 > p.y && B.y - 9 < p.y + p.h) {
          const off = Math.max(-1, Math.min(1, (B.y - (p.y + p.h / 2)) / (p.h / 2 + 9))), sp = Math.min(Math.hypot(B.vx, B.vy) * 1.06, 16), vy = off * sp * .75;
          B.vx = Math.sqrt(Math.max(sp * sp - vy * vy, 1)) * (i === 0 ? 1 : -1); B.vy = vy; B.x = i === 0 ? p.x + PW + 10 : p.x - 10; B.last = i;
          burst(B.x, B.y, p.color, 12, 5); FX.shake = Math.max(FX.shake, 3); sfx('hit');
        }
      });
      if (!orb && Math.random() < .004) orb = { x: rnd(W / 2 - 250, W / 2 + 220), y: rnd(80, H - 110) };
      if (orb && B.last !== null && B.x + 9 > orb.x && B.x - 9 < orb.x + 30 && B.y + 9 > orb.y && B.y - 9 < orb.y + 30) {
        const me = P[B.last], en = P[1 - B.last], eff = pick(['big', 'small', 'slow', 'fast']);
        if (eff === 'big') { me.big = t + 8000; msg = [`${me.name}: ракетка больше!`, t + 2000]; }
        else if (eff === 'small') { en.small = t + 8000; msg = [`${me.name}: ракетка врага меньше!`, t + 2000]; }
        else if (eff === 'slow') { B.vx *= .6; B.vy *= .6; msg = ['Мяч замедлился', t + 2000]; }
        else { B.vx *= 1.4; B.vy *= 1.4; msg = ['Мяч ускорился!', t + 2000]; }
        burst(orb.x + 15, orb.y + 15, GOLD, 24, 6); sfx('bonus'); orb = null;
      }
      if (B.x < 0 || B.x > W) { const s = B.x < 0 ? 1 : 0; P[s].score++; burst(Math.max(5, Math.min(W - 5, B.x)), B.y, P[s].color, 40, 7, 50); FX.shake = 10; sfx('boom'); serve(s === 1 ? -1 : 1, t); }
    }
    draw(t); updateFx(); drawFx(); await present();
    for (const p of P) if (p.score >= WIN) return endScreen(`Победил ${p.name}!`, [`Счёт: ${P[0].score} : ${P[1].score}`], p.color);
  }
}
async function pong() { while (await pongMatch() === 'again'); }
