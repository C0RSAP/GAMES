'use strict';
// ===== 22. Слоты (ДЕМО): 5 барабанов × 3 ряда, 10 линий, WILD и SCATTER. Только виртуальные монеты! =====
// ===CORE-START=== (чистая математика, без рисования; отдача проверена симуляцией ≈ 94%)
const SLOT = (() => {
  const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1]];
  const WILD = 7, SC = 8, SEVEN = 6;
  // выплаты за 3 / 4 / 5 символов на линии, в долях «ставки на линию» (ставка / 10)
  const PAY = { 0: [5, 16, 55], 1: [5, 16, 55], 2: [9, 28, 90], 3: [9, 28, 90], 4: [16, 55, 170], 5: [32, 110, 430], 6: [65, 270, 1100], 7: [65, 270, 1100] };
  const SCAT = [5, 22, 110]; // за 3 / 4 / 5 «звёзд» где угодно, в долях ОБЩЕЙ ставки
  // веса символов на каждом барабане: вишня, лимон, арбуз, виноград, колокол, алмаз, семёрка, WILD, SCATTER
  const COUNTS = [[7, 7, 6, 6, 4, 3, 2, 0, 2], [7, 7, 6, 6, 4, 3, 2, 2, 2], [7, 7, 6, 6, 4, 3, 2, 2, 2], [7, 7, 6, 6, 4, 3, 2, 2, 2], [7, 7, 6, 6, 4, 3, 2, 0, 2]];
  const draw = c => { let r = Math.random() * c.reduce((a, b) => a + b, 0); for (let i = 0; i < c.length; i++) { r -= c[i]; if (r < 0) return i; } return 0; };
  const spin = () => COUNTS.map(c => [draw(c), draw(c), draw(c)]); // grid[барабан][ряд]
  function evaluate(grid) {
    const wins = [];
    LINES.forEach((ln, li) => {
      const sy = ln.map((r, i) => grid[i][r]); if (sy[0] === SC) return;
      let wr = 0; while (wr < 5 && sy[wr] === WILD) wr++;
      const payW = wr >= 3 ? PAY[WILD][wr - 3] : 0; let payB = 0, cnt = 0, base = null;
      if (wr < 5 && sy[wr] !== SC) { base = sy[wr]; cnt = wr; while (cnt < 5 && (sy[cnt] === base || sy[cnt] === WILD)) cnt++; if (cnt >= 3) payB = PAY[base][cnt - 3]; }
      const pay = Math.max(payW, payB); if (!pay) return;
      const n = payW > payB ? wr : cnt;
      wins.push({ line: li, sym: payW > payB ? WILD : base, count: n, mult: pay, cells: ln.slice(0, n).map((r, i) => [i, r]) });
    });
    const cells = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === SC) cells.push([i, r]); }));
    if (cells.length >= 3) wins.push({ line: -1, sym: SC, count: cells.length, mult: SCAT[Math.min(cells.length, 5) - 3] * 10, cells });
    return wins;
  }
  return { LINES, PAY, SCAT, COUNTS, WILD, SC, SEVEN, spin, evaluate, draw };
})();
// ===CORE-END===

const SLOT_EMO = ['🍒', '🍋', '🍉', '🍇', '🔔', '💎', null, '👑', '⭐'];
const SLOT_BETS = [10, 20, 50, 100, 200, 500];
const SLOT_KEY = 'arcada_slots_balance';
function slotSym(id, x, y, s = 1, alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  if (id === SLOT.SEVEN) {
    g.font = `italic 900 ${Math.round(78 * s)}px ${FF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6 * s; g.lineJoin = 'round'; g.strokeStyle = 'rgb(255,208,84)'; g.strokeText('7', x, y + 4); g.fillStyle = 'rgb(235,40,60)'; g.fillText('7', x, y + 4);
  } else text(SLOT_EMO[id], x, y + 2, { size: Math.round(60 * s) });
  if (id === SLOT.WILD) text('WILD', x, y + 38 * s, { size: 12 * s, bold: true, color: GOLD });
  if (id === SLOT.SC) text('SCATTER', x, y + 38 * s, { size: 11 * s, bold: true, color: [140, 230, 255] });
  g.restore();
}
const money = n => Math.round(n).toLocaleString('ru-RU');
const fmtX = m => { const v = m / 10; return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.', ','); };

async function slotsMatch() {
  FX.reset();
  const CW = 118, CH = 100, GAP = 6, VS = .62;
  // Баланс всегда сбрасывается при каждом заходе в игру / на сайт
  try { localStorage.removeItem(SLOT_KEY); } catch (_) { }
  let balance = 1000, bet = 20, dispBal = 0, dispWin = 0, winAmt = 0, wins = [], fr = 0, auto = false, showPay = false;
  const save = () => {}; // не сохраняем между сессиями
  dispBal = balance;
  const reels = [0, 1, 2, 3, 4].map(i => ({ i, off: 0, v: 0, phase: 'idle', map: new Map([[0, SLOT.draw(SLOT.COUNTS[i])], [1, SLOT.draw(SLOT.COUNTS[i])], [2, SLOT.draw(SLOT.COUNTS[i])]]), stopAt: 0, res: null, o0: 0, dl: 0, dur: 1, sf: 0, F: 0 }));
  let state = 'idle', winStart = 0, idleSince = 0, banner = null, quick = false, result = null;
  const L = () => { const cx = W / 2, x0 = cx - (5 * CW + 4 * GAP) / 2, y0 = 112, sx = cx - 323; return { cx, x0, y0, sx, bal: [sx, 462, 150, 74], bt: [sx + 162, 462, 190, 74], win: [sx + 364, 462, 150, 74], spin: [sx + 594, 499, 44], auto: [cx - 150, 548, 130, 30], pay: [cx + 20, 548, 130, 30] }; };
  const cellXY = (l, i, r) => [l.x0 + i * (CW + GAP) + CW / 2, l.y0 + r * CH + CH / 2];
  const symAt = (rl, k) => { if (!rl.map.has(k)) rl.map.set(k, SLOT.draw(SLOT.COUNTS[rl.i])); return rl.map.get(k); };
  const lineBet = () => bet / 10;

  const fitBet = () => { if (balance < bet) { const ok = SLOT_BETS.filter(b => b <= balance); if (ok.length) bet = ok[ok.length - 1]; } };
  fitBet();
  function startSpin(t) {
    fitBet(); if (state === 'spin' || balance < bet) return;
    balance -= bet; save(); winAmt = 0; wins = []; dispWin = 0; banner = null; quick = false; state = 'spin';
    result = SLOT.spin();
    reels.forEach((r, i) => { r.phase = 'spin'; r.v = 0; r.res = result[i]; r.stopAt = fr + 14 + i * 7 + 52 + i * 14; r.delay = fr + i * 5; });
    // интрига: если на первых барабанах уже две звезды — последние барабаны тормозят дольше
    const early = result.slice(0, 3).reduce((s, c) => s + c.filter(x => x === SLOT.SC).length, 0);
    if (early >= 2) { reels[3].stopAt += 22; reels[4].stopAt += 44; }
    tone(220, 90, .22, 'sawtooth', 900);
  }
  function endSpin(t) {
    state = 'result'; wins = SLOT.evaluate(result); winStart = fr; idleSince = fr;
    const total = wins.reduce((s, w) => s + w.mult, 0); winAmt = Math.round(total * lineBet());
    if (winAmt > 0) {
      balance += winAmt; save(); sfx('bonus'); const l = L();
      wins.forEach(w => w.cells.forEach(([i, r]) => { const [x, y] = cellXY(l, i, r); burst(x, y, GOLD, 8, 4, 36, 3); }));
      const k = winAmt / bet;
      if (k >= 10) {
        banner = { text: k >= 50 ? 'МЕГА ВЫИГРЫШ!' : k >= 25 ? 'ОГРОМНЫЙ ВЫИГРЫШ!' : 'БОЛЬШОЙ ВЫИГРЫШ!', f: fr };
        FX.shake = 6; for (let i = 0; i < 6; i++) setTimeout(() => tone(500 + i * 120, 120, .2, 'square', 300), i * 110);
      } else for (let i = 0; i < 3; i++) setTimeout(() => sfx('coin'), i * 90);
    }
    fitBet();
  }
  function updateReels() {
    let allDone = state === 'spin';
    for (const r of reels) {
      if (r.phase === 'spin') {
        allDone = false;
        if (fr >= r.delay) r.v += (VS - r.v) * .22;
        r.off += r.v;
        if (fr >= r.stopAt && r.v > VS * .9) {
          r.o0 = r.off; r.dl = Math.ceil(r.o0) - r.o0 + 5; r.F = r.o0 + r.dl;
          for (let row = 0; row < 3; row++) r.map.set(-r.F + row, r.res[row]);
          r.dur = Math.max(10, Math.round(3 * r.dl / r.v)); r.sf = 0; r.phase = 'stop';
        }
      } else if (r.phase === 'stop') {
        allDone = false; r.sf++; const p = Math.min(1, r.sf / r.dur);
        r.off = r.o0 + r.dl * (1 - Math.pow(1 - p, 3)); r.v = VS * (1 - p);
        if (p >= 1) { r.off = r.F; r.phase = 'settle'; r.sf = 0; r.v = 0; tone(150, 60, .22, 'square', -200); if (result[r.i].includes(SLOT.SC)) tone(900, 120, .18, 'sine', 600); }
      } else if (r.phase === 'settle') {
        r.sf++; const k = r.sf / 12; r.off = r.F + .07 * Math.sin(k * Math.PI) * (1 - k);
        if (r.sf >= 12) { r.map = new Map([[0, r.res[0]], [1, r.res[1]], [2, r.res[2]]]); r.off = 0; r.phase = 'idle'; }
      }
    }
    if (state === 'spin' && reels.every(r => r.phase === 'idle')) endSpin(now());
  }
  function drawReels(l, t) {
    // рамка и лампочки
    const fx = l.x0 - 16, fy = l.y0 - 16, fw = 5 * CW + 4 * GAP + 32, fh = 3 * CH + 32;
    glow(l.cx, l.y0 + 1.5 * CH, 420, [60, 30, 110]);
    panel(fx, fy, fw, fh, { fill: 'rgba(14,10,30,.95)', stroke: 'rgb(255,208,84)', r: 22, lw: 3 });
    for (let k = 0; k < 26; k++) {
      const on = (k + (fr / 14 | 0)) % 2 === 0, x = fx + 18 + k * (fw - 36) / 25; disc(x, fy - 1, 3, on ? GOLD : [90, 70, 30]); disc(x, fy + fh + 1, 3, on ? [90, 70, 30] : GOLD);
    }
    reels.forEach((rl, i) => {
      const x = l.x0 + i * (CW + GAP);
      g.save(); g.beginPath(); g.roundRect(x, l.y0, CW, 3 * CH, 8); g.clip();
      const gr = g.createLinearGradient(0, l.y0, 0, l.y0 + 3 * CH); gr.addColorStop(0, '#171230'); gr.addColorStop(.5, '#2a2152'); gr.addColorStop(1, '#171230'); g.fillStyle = gr; g.fillRect(x, l.y0, CW, 3 * CH);
      const k0 = Math.floor(-rl.off) - 1, mov = rl.phase === 'spin' || rl.phase === 'stop';
      for (let k = k0; k <= k0 + 4; k++) {
        const cy = l.y0 + (rl.off + k) * CH + CH / 2; if (cy < l.y0 - CH || cy > l.y0 + 4 * CH) continue;
        g.save(); g.translate(x + CW / 2, cy); if (mov) g.scale(1, 1 + rl.v * .5);
        slotSym(symAt(rl, k), 0, 0, 1, mov ? .8 : 1); g.restore();
      }
      const sh = g.createLinearGradient(0, l.y0, 0, l.y0 + 3 * CH); sh.addColorStop(0, 'rgba(0,0,0,.6)'); sh.addColorStop(.22, 'rgba(0,0,0,0)'); sh.addColorStop(.78, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.6)');
      g.fillStyle = sh; g.fillRect(x, l.y0, CW, 3 * CH); g.restore();
      if (i) { g.fillStyle = 'rgba(255,208,84,.25)'; g.fillRect(x - GAP / 2 - .5, l.y0, 1, 3 * CH); }
    });
    // подсветка выигрышных линий
    if (state === 'result' && wins.length) {
      const el = fr - winStart, all = el < 50, cur = all ? null : wins[Math.floor((el - 50) / 60) % wins.length], list = all ? wins : [cur], pul = .55 + .45 * Math.sin(fr / 5);
      for (const w of list) {
        if (w.line >= 0) {
          g.beginPath(); SLOT.LINES[w.line].forEach((r, i) => { const [x, y] = cellXY(l, i, r); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.lineWidth = 4; g.strokeStyle = `rgba(255,208,84,${all ? .35 : .75})`; g.lineJoin = 'round'; g.stroke();
        }
        for (const [i, r] of w.cells) { const [x, y] = cellXY(l, i, r); g.lineWidth = 3; g.strokeStyle = `rgba(255,236,150,${pul})`; g.beginPath(); g.roundRect(x - CW / 2 + 3, y - CH / 2 + 3, CW - 6, CH - 6, 10); g.stroke(); }
      }
      if (cur) { const nm = cur.line >= 0 ? `Линия ${cur.line + 1}` : 'SCATTER'; pill(`${nm}: ${cur.count}× = ${money(cur.mult * lineBet())}`, 84, GOLD); }
      else pill(`Выигрыш: ${wins.length} ${wins.length === 1 ? 'комбинация' : 'комбинации'}`, 84, GOLD);
    }
  }
  function box(r, label, val, col = INK) {
    panel(r[0], r[1], r[2], r[3], { fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,208,84,.35)', r: 16 });
    text(label, r[0] + r[2] / 2, r[1] + 20, { size: 13, bold: true, color: MUTED }); text(val, r[0] + r[2] / 2, r[1] + 50, { size: 28, bold: true, color: col });
  }
  function drawUI(l, t) {
    box(l.bal, 'БАЛАНС', money(dispBal)); box(l.win, 'ВЫИГРЫШ', money(dispWin), dispWin > 0 ? GOLD : INK);
    const b = l.bt; panel(b[0], b[1], b[2], b[3], { fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,208,84,.35)', r: 16 });
    text('СТАВКА', b[0] + b[2] / 2, b[1] + 20, { size: 13, bold: true, color: MUTED }); text(money(bet), b[0] + b[2] / 2, b[1] + 50, { size: 28, bold: true });
    const dis = state === 'spin';
    for (const [dx, s] of [[16, '−'], [b[2] - 16, '+']]) { const hov = inRect(mouse, [b[0] + dx - 16, b[1] + 30, 32, 34]) && !dis; disc(b[0] + dx, b[1] + 48, 14, hov ? [255, 208, 84] : dis ? [50, 52, 70] : [90, 96, 130]); text(s, b[0] + dx, b[1] + 48, { size: 22, bold: true, color: [10, 10, 20] }); }
    const [sx, sy, sr] = l.spin, broke = balance < SLOT_BETS[0], hov = Math.hypot(mouse.x - sx, mouse.y - sy) < sr, busy = state === 'spin';
    glow(sx, sy, 70, busy ? [60, 60, 90] : broke ? [255, 150, 60] : [40, 200, 120]);
    disc(sx, sy, sr + 4, [255, 208, 84]); disc(sx, sy, sr, busy ? [70, 74, 100] : broke ? [230, 120, 40] : hov ? [60, 230, 140] : [40, 190, 115]);
    if (broke && !busy) { text('+1000', sx, sy - 6, { size: 20, bold: true, color: [20, 20, 30] }); text('монет', sx, sy + 14, { size: 13, bold: true, color: [20, 20, 30] }); }
    else { text(busy ? 'СТОП' : 'СПИН', sx, sy, { size: busy ? 19 : 22, bold: true, color: [10, 20, 14] }); }
    for (const [r, s, on] of [[l.auto, 'АВТО: ' + (auto ? 'ВКЛ' : 'ВЫКЛ'), auto], [l.pay, 'ТАБЛИЦА ВЫПЛАТ', showPay]]) {
      const h = inRect(mouse, r); panel(r[0], r[1], r[2] + (r === l.pay ? 20 : 0), r[3], { fill: on ? 'rgba(255,208,84,.2)' : `rgba(255,255,255,${h ? .1 : .05})`, stroke: css(on ? GOLD : MUTED, .5), r: 15 });
      text(s, r[0] + (r[2] + (r === l.pay ? 20 : 0)) / 2, r[1] + 15, { size: 13, bold: true, color: on ? GOLD : MUTED });
    }
  }
  function drawPay(l) {
    g.fillStyle = 'rgb(4,4,14)'; g.fillRect(0, 0, W, H);
    panel(l.cx - 330, 26, 660, 560, { fill: 'rgba(22,18,46,.98)', stroke: 'rgba(255,208,84,.6)', r: 26, lw: 2 });
    text('ТАБЛИЦА ВЫПЛАТ', l.cx, 62, { size: 28, bold: true, color: GOLD }); text('значения — множитель ставки (за 3 / 4 / 5 символов на линии)', l.cx, 90, { size: 14, color: MUTED });
    [7, 6, 5, 4, 3, 2, 1, 0].forEach((id, k) => {
      const y = 140 + k * 50; slotSym(id, l.cx - 240, y, .5);
      [0, 1, 2].forEach(c => { text(['3×', '4×', '5×'][c], l.cx - 140 + c * 150, y - 12, { size: 12, color: MUTED }); text('×' + fmtX(SLOT.PAY[id][c]), l.cx - 140 + c * 150, y + 8, { size: 22, bold: true }); });
    });
    slotSym(SLOT.SC, l.cx - 240, 560, .5); text('SCATTER — в любом месте экрана:', l.cx - 160, 548, { size: 13, color: MUTED, align: 'left' });
    text(`3 → ×${SLOT.SCAT[0]}    4 → ×${SLOT.SCAT[1]}    5 → ×${SLOT.SCAT[2]} от всей ставки`, l.cx - 160, 570, { size: 17, bold: true, color: [140, 230, 255], align: 'left' });
    text('WILD заменяет любой символ, кроме SCATTER • 10 линий • выплаты слева направо', l.cx, 106, { size: 13, color: FAINT });
    hints([['P / ESC', 'закрыть']], H - 32);
  }
  function drawAll(t) {
    const l = L(); backdrop(t, [70, 30, 120], [20, 50, 110]);
    text('ДЕМО-СЛОТЫ', l.cx, 40, { size: 34, bold: true, color: GOLD, shadow: true });
    if (!(state === 'result' && wins.length)) text('виртуальные монеты • играем только для развлечения, без реальных денег', l.cx, 78, { size: 14, color: MUTED });
    drawReels(l, t); drawUI(l, t);
    if (banner) { // табло крупного выигрыша
      const k = fr - banner.f; if (k < 170) {
        const sc = 1 + .08 * Math.sin(k / 4), a = Math.min(1, k / 12) * Math.min(1, (170 - k) / 25);
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(5,4,16,.55)'; g.fillRect(0, l.y0 + 90, W, 120); g.translate(l.cx, l.y0 + 118); g.scale(sc, sc);
        glow(0, 0, 220, [255, 170, 40]); text(banner.text, 0, 0, { size: 46, bold: true, color: GOLD, shadow: true }); g.restore();
        text('+' + money(winAmt), l.cx, l.y0 + 178, { size: 40, bold: true, shadow: true, alpha: a });
        if (k % 4 === 0) burst(rnd(l.x0, l.x0 + 600), l.y0 - 10, GOLD, 3, 3, 50, 4);
      }
    }
    hints([['Пробел', 'крутить / стоп'], ['↑ ↓', 'ставка'], ['A', 'авто'], ['P', 'выплаты'], ['ESC', 'меню']], H - 32);
    updateFx(); drawFx();
    if (showPay) drawPay(l);
  }

  for (;;) {
    fr++; const t = now(), { keys, clicks } = pump(), l = L(); let spinPress = false, betD = 0;
    for (const e of keys) {
      if (is(e, 'Escape')) { if (showPay) showPay = false; else return 'menu'; }
      else if (is(e, 'KeyP')) showPay = !showPay;
      else if (showPay) continue;
      else if (is(e, 'Space', 'Enter', 'NumpadEnter')) spinPress = true;
      else if (is(e, 'ArrowUp', 'KeyW')) betD = 1; else if (is(e, 'ArrowDown', 'KeyS')) betD = -1;
      else if (is(e, 'KeyA')) { auto = !auto; sfx('beep'); }
      else if (is(e, 'KeyM')) STATE.mute = !STATE.mute;
    }
    for (const c of clicks) {
      if (showPay) { showPay = false; continue; }
      if (Math.hypot(c.x - l.spin[0], c.y - l.spin[1]) < l.spin[2]) spinPress = true;
      else if (inRect(c, [l.bt[0], l.bt[1] + 30, 40, 34])) betD = -1; else if (inRect(c, [l.bt[0] + l.bt[2] - 40, l.bt[1] + 30, 40, 34])) betD = 1;
      else if (inRect(c, l.auto)) { auto = !auto; sfx('beep'); } else if (inRect(c, [l.pay[0], l.pay[1], l.pay[2] + 20, l.pay[3]])) showPay = true;
    }
    if (betD && state !== 'spin') { const ix = Math.max(0, Math.min(SLOT_BETS.length - 1, SLOT_BETS.indexOf(bet) + betD)); if (SLOT_BETS[ix] <= balance || ix === 0) { bet = SLOT_BETS[ix]; sfx('beep'); } }
    if (spinPress) {
      if (state === 'spin') { if (!quick) { quick = true; reels.forEach(r => { if (r.phase === 'spin') r.stopAt = Math.min(r.stopAt, fr + 2 + r.i * 5); }); } }
      else if (balance < SLOT_BETS[0]) { balance = 1000; bet = 20; save(); sfx('bonus'); }
      else startSpin(t);
    }
    if (auto && state !== 'spin' && balance >= bet && fr - idleSince > (state === 'idle' ? 0 : winAmt ? (banner ? 190 : 110) : 45)) startSpin(t);
    if (auto && balance < bet) auto = false;
    updateReels();
    dispBal += (balance - dispBal) * .12; if (Math.abs(balance - dispBal) < 1) dispBal = balance;
    const target = state === 'result' ? winAmt : 0; dispWin += (target - dispWin) * .1; if (Math.abs(target - dispWin) < 1) dispWin = target;
    drawAll(t); await present();
  }
}
async function slots() { await slotsMatch(); }
