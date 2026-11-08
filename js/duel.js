'use strict';
// ===== 6. Дуэль (A и L — выстрел на сигнал «ОГОНЬ») =====
const rr = (x, y, w, h, r, c) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = css(c); g.fill(); };
const ell = (x, y, w, h, c) => { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 6.283); g.fillStyle = css(c); g.fill(); };
const ln = (x1, y1, x2, y2, c, w) => { g.strokeStyle = css(c); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
function keycapC(label, cx, y) { const w = Math.max(28, tw(label, 17, true) + 18); panel(cx - w / 2, y, w, 26, { fill: 'rgba(255,255,255,.09)', stroke: 'rgba(255,255,255,.27)', r: 8 }); text(label, cx, y + 13, { size: 17, bold: true }); }
function drawCowboy(x, y, color, f, mode) {
  const skin = [238, 204, 168], dk = [40, 28, 30];
  if (mode === 'dead') { rr(x - 40, y - 16, 70, 16, 8, color); rr(x + 30, y - 12, 26, 10, 5, dk); disc(x - 52, y - 10, 12, skin); ell(x - 70, y - 24, 40, 9, dk); return; }
  rr(x - 13, y - 42, 11, 42, 4, dk); rr(x + 2, y - 42, 11, 42, 4, dk); rr(x - 17, y - 92, 34, 54, 10, color);
  g.fillStyle = css(dark(color, .6)); g.fillRect(x - 17, y - 56, 34, 6);
  disc(x, y - 106, 14, skin); ell(x - 27, y - 114, 54, 11, dk); rr(x - 13, y - 132, 26, 22, 6, dk);
  const ay = mode === 'idle' ? y - 70 : y - 84, ax = x + f * (mode === 'idle' ? 12 : 36);
  ln(x, y - 82, ax, ay, skin, 8);
  if (mode === 'aim' || mode === 'shoot') {
    const gx = ax + f * 26; ln(ax, ay, gx, ay, [30, 30, 36], 7);
    if (mode === 'shoot') { glow(gx + f * 14, ay, 60, [255, 200, 80]); disc(gx + f * 10, ay, 12, [255, 240, 150]); }
  }
}
async function duelMatch() {
  FX.reset();
  const keys = ['KeyA', 'KeyL'], colors = [[70, 210, 130], [96, 156, 255]], scores = [0, 0], TARGET = 3, GY = 470; let R = {};
  const newRound = () => {
    const t = now(), goAt = t + rnd(2500, 6500) | 0; let fake = null;
    if (Math.random() < .6) { const fs = t + rnd(1000, Math.max(1100, goAt - t - 1200)); fake = [fs, fs + 800]; }
    R = { state: 'wait', goAt, fake, goTime: 0, winner: null, text: '', rt: null, tRes: 0 };
  };
  newRound();
  for (;;) {
    const t = now();
    for (const e of pump().keys) {
      if (is(e, 'Escape')) return 'menu';
      const i = keys.indexOf(e.code);
      if (i >= 0 && (R.state === 'wait' || R.state === 'go')) {
        if (R.state === 'wait') { Object.assign(R, { state: 'result', winner: 1 - i, rt: null, tRes: t, text: `Фальстарт! ${PN[i]} дёрнулся раньше времени` }); scores[1 - i]++; sfx('bad'); }
        else { Object.assign(R, { state: 'result', winner: i, rt: Math.round(t - R.goTime), tRes: t, text: `${PN[i]} стреляет первым!` }); scores[i]++; sfx('boom'); }
        FX.shake = 10; for (let k = 0; k < 2; k++) burst(250 + k * (W - 500), GY - 70, [255, 200, 80], 20, 5);
      }
    }
    if (R.state === 'wait' && t >= R.goAt) { R.state = 'go'; R.goTime = t; sfx('go'); }
    if (R.state === 'go' && t - R.goTime > 3500) Object.assign(R, { state: 'result', winner: null, rt: null, tRes: t, text: 'Никто не выстрелил — раунд без очков' });
    if (R.state === 'result' && t - R.tRes > 2600) {
      if (Math.max(...scores) >= TARGET) { const w = scores.indexOf(Math.max(...scores)); return endScreen(`${PN[w]} — лучший стрелок!`, [`Счёт: ${scores[0]} : ${scores[1]}`], colors[w]); }
      newRound();
    }
    backdrop(t, [120, 50, 90], [60, 24, 90], 'rgb(255,156,92)', 'rgb(64,24,76)');
    disc(W / 2, 330, 90, [255, 226, 150]); g.fillStyle = 'rgb(56,30,44)'; g.fillRect(0, GY, W, H - GY); g.fillStyle = 'rgb(96,56,56)'; g.fillRect(0, GY, W, 8);
    for (const cx of [90, W - 110, W / 2 + 40]) { const cc = [34, 70, 56]; rr(cx, GY - 90, 16, 90, 7, cc); g.fillStyle = css(cc); g.fillRect(cx - 16, GY - 66, 12, 8); rr(cx - 16, GY - 66, 8, 30, 4, cc); g.fillRect(cx + 20, GY - 56, 12, 8); rr(cx + 24, GY - 56, 8, 28, 4, cc); }
    const st = R.state; let modes = ['idle', 'idle'];
    if (st === 'go') modes = ['aim', 'aim']; else if (st === 'result' && R.winner !== null) { modes[R.winner] = 'shoot'; modes[1 - R.winner] = 'dead'; }
    drawCowboy(250, GY, colors[0], 1, modes[0]); drawCowboy(W - 250, GY, colors[1], -1, modes[1]);
    const sh = { shadow: true };
    if (st === 'wait') {
      text('Приготовьтесь...', W / 2, 120, { size: 62, bold: true, ...sh }); text('Жми только на ОГОНЬ! Раньше времени — фальстарт', W / 2, 180, { color: [255, 240, 220], ...sh });
      if (R.fake && R.fake[0] <= t && t < R.fake[1]) {
        const bx = W / 2 + Math.sin(t / 90) * 20, k = [15, 15, 20]; ell(bx - 24, 260, 48, 22, k);
        g.fillStyle = css(k); g.beginPath(); g.moveTo(bx - 24, 268); g.lineTo(bx - 50, 250); g.lineTo(bx - 14, 262); g.fill(); g.beginPath(); g.moveTo(bx + 24, 268); g.lineTo(bx + 50, 250); g.lineTo(bx + 14, 262); g.fill();
        text('Каркнула ворона... не ведись!', W / 2, 230, { size: 26, bold: true, color: [255, 240, 210], ...sh });
      }
    } else if (st === 'go') {
      if (t - R.goTime < 120) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgb(110,0,0)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      text('ОГОНЬ!', W / 2, 150, { size: 112, bold: true, color: [255, 70, 56], ...sh });
    } else { text(R.text, W / 2, 150, { size: 26, bold: true, ...sh }); if (R.rt !== null) text(`Реакция: ${R.rt} мс`, W / 2, 200, { size: 26, bold: true, color: GOLD, ...sh }); }
    chip(16, 14, `${PN[0]}  ${scores[0]}`, colors[0]); chip(W - 16, 14, `${PN[1]}  ${scores[1]}`, colors[1], 'right');
    text(`до ${TARGET} побед`, W / 2, 32, { color: [255, 240, 220], ...sh }); keycapC('A', 250, GY + 28); keycapC('L', W - 250, GY + 28);
    updateFx(); drawFx(); await present();
  }
}
async function duel() { while (await duelMatch() === 'again'); }
