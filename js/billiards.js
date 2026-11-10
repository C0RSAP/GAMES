'use strict';
// ===== 21. Бильярд: американский пул «8-ball» (1 игрок против компьютера или 2 игрока) =====
// ===CORE-START=== (чистая физика и правила, без рисования — их удобно тестировать отдельно)
const BIL = (() => {
  const TW = 760, TH = 380, R = 10, VMAX = 28, SUB = 8;
  const RAIL = .78, REST = .97, FR = .003, FA = .09, STOP = .045;
  const POCKETS = [[0, 0, 22], [TW / 2, 0, 20], [TW, 0, 22], [0, TH, 22], [TW / 2, TH, 20], [TW, TH, 22]];
  const kind = id => id === 0 ? 'cue' : id === 8 ? 'eight' : id < 8 ? 'solid' : 'stripe';
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mk = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, in: true });

  function rack() { // треугольник: 8 в центре, в углах основания — один сплошной и один полосатый
    const balls = [mk(0, TW * .25, TH / 2)], ax = TW * .72, dx = R * 1.732 + .3, dy = 2 * R + .3, slots = [];
    for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) slots.push([ax + r * dx, TH / 2 + (k - r / 2) * dy]);
    const sol = shuffle([1, 2, 3, 4, 5, 6, 7]), str = shuffle([9, 10, 11, 12, 13, 14, 15]), ids = new Array(15).fill(null);
    ids[4] = 8; ids[10] = sol.pop(); ids[14] = str.pop();
    const rest = shuffle([...sol, ...str]); for (let i = 0; i < 15; i++) if (ids[i] === null) ids[i] = rest.pop();
    slots.forEach((s, i) => balls.push(mk(ids[i], s[0], s[1])));
    return balls;
  }

  function step(balls, dt, ev) { // один подшаг физики
    for (const b of balls) if (b.in) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const b of balls) if (b.in) for (const [px, py, pr] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < pr) {
      b.in = false; b.vx = b.vy = 0; ev.potted.push(b.id); ev.pots.push([px, py, b.id]); break;
    }
    for (const b of balls) {
      if (!b.in) continue;
      let hit = 0;
      if (b.x < R) { b.x = R; hit = Math.abs(b.vx); b.vx = Math.abs(b.vx) * RAIL; }
      else if (b.x > TW - R) { b.x = TW - R; hit = Math.abs(b.vx); b.vx = -Math.abs(b.vx) * RAIL; }
      if (b.y < R) { b.y = R; hit = Math.max(hit, Math.abs(b.vy)); b.vy = Math.abs(b.vy) * RAIL; }
      else if (b.y > TH - R) { b.y = TH - R; hit = Math.max(hit, Math.abs(b.vy)); b.vy = -Math.abs(b.vy) * RAIL; }
      if (hit > .2) { ev.maxRail = Math.max(ev.maxRail, hit); if (ev.first !== null) ev.rail = true; }
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < balls.length; i++) {
      const a = balls[i]; if (!a.in) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j]; if (!b.in) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy, pv = dx * rvx + dy * rvy;
        if (pv >= 0) { // расходятся (или лежат рядом): просто раздвигаем
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
          a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; continue;
        }
        // точный момент касания: откатываем оба шара назад к контакту, бьём, и доигрываем остаток шага
        const vv = rvx * rvx + rvy * rvy; let tau = 0;
        if (vv > 1e-12) tau = Math.min(dt, (pv + Math.sqrt(Math.max(pv * pv - vv * (d2 - 4 * R * R), 0))) / vv);
        a.x -= a.vx * tau; a.y -= a.vy * tau; b.x -= b.vx * tau; b.y -= b.vy * tau;
        const ex = b.x - a.x, ey = b.y - a.y, d = Math.hypot(ex, ey) || 2 * R, nx = ex / d, ny = ey / d;
        const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn > 0) {
          const imp = vn * (1 + REST) / 2;
          a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
          ev.maxHit = Math.max(ev.maxHit, vn);
          if (ev.first === null && (a.id === 0 || b.id === 0)) ev.first = a.id === 0 ? b.id : a.id;
        }
        a.x += a.vx * tau; a.y += a.vy * tau; b.x += b.vx * tau; b.y += b.vy * tau;
      }
    }
    for (const b of balls) if (b.in) { b.x = Math.max(R, Math.min(TW - R, b.x)); b.y = Math.max(R, Math.min(TH - R, b.y)); }
    for (const b of balls) { // трение качения
      if (!b.in) continue; const sp = Math.hypot(b.vx, b.vy); if (!sp) continue;
      const ns = sp * (1 - FR * dt) - FA * dt;
      if (ns < STOP) { b.vx = b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; }
    }
  }
  const frame = (balls, ev) => { for (let k = 0; k < SUB; k++) step(balls, 1 / SUB, ev); };
  const moving = balls => balls.some(b => b.in && (b.vx || b.vy));
  const newEv = (ownBefore, isBreak) => ({ potted: [], pots: [], first: null, rail: false, maxHit: 0, maxRail: 0, ownBefore, isBreak });
  const speed = pw => Math.max(.5, VMAX * Math.pow(pw, 1.6));
  const pwOf = v => Math.min(1, Math.pow(v / VMAX, 1 / 1.6));
  const ownLeft = (balls, grp) => grp ? balls.filter(b => b.in && kind(b.id) === grp).length : 99;

  // Правила: возвращает foul, over/winner, keep (ход остаётся), groups, respot8
  function judge(groups, turn, ev) {
    groups = groups.slice(); const me = groups[turn], potted = ev.potted;
    const cueIn = potted.includes(0); let eight = potted.includes(8), respot8 = false;
    if (ev.isBreak && eight) { respot8 = true; eight = false; }
    const obj = potted.filter(i => i && i !== 8);
    let foul = null;
    if (cueIn) foul = 'биток в лузе';
    else if (ev.first === null) foul = 'нет касания шара';
    else if (me) { const fk = kind(ev.first); if (!(fk === me || (fk === 'eight' && ev.ownBefore === 0))) foul = 'не тот шар'; }
    else if (ev.first === 8) foul = 'не тот шар';
    if (!foul && !obj.length && !eight && !respot8 && !ev.rail) foul = 'нет борта';
    if (eight) {
      const win = me && ev.ownBefore === 0 && !foul;
      return { foul, over: true, winner: win ? turn : 1 - turn, groups, keep: false, respot8, msg: win ? 'Чисто забита чёрная «8»' : (foul ? 'Чёрная «8» + фол' : 'Чёрная «8» забита раньше времени') };
    }
    let assigned = null;
    if (!me && !foul && !ev.isBreak && obj.length) {
      const k = kind(obj[0]); groups[turn] = k; groups[1 - turn] = k === 'solid' ? 'stripe' : 'solid'; assigned = k;
    }
    const g2 = groups[turn];
    const keep = !foul && (g2 ? obj.some(i => kind(i) === g2) : obj.length > 0);
    return { foul, over: false, winner: null, groups, keep, respot8, assigned };
  }

  const freeAt = (balls, x, y, skipCue = true) => x >= R && x <= TW - R && y >= R && y <= TH - R &&
    balls.every(b => !b.in || (skipCue && b.id === 0) || Math.hypot(b.x - x, b.y - y) > 2 * R + .5);
  function findFree(balls, x, y) {
    if (freeAt(balls, x, y)) return [x, y];
    for (let d = 4; d < 400; d += 4) for (let a = 0; a < 6.283; a += .35) {
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (freeAt(balls, px, py)) return [px, py];
    }
    return [TW * .25, TH / 2];
  }

  // Луч прицела: ближайшее препятствие (шар или борт)
  function ray(balls, cx, cy, ang) {
    const dx = Math.cos(ang), dy = Math.sin(ang); let best = { t: 1e9, ball: null };
    for (const b of balls) {
      if (!b.in || b.id === 0) continue;
      const fx = cx - b.x, fy = cy - b.y, bb = fx * dx + fy * dy, c = fx * fx + fy * fy - 4 * R * R, disc = bb * bb - c;
      if (disc < 0) continue; const t = -bb - Math.sqrt(disc); if (t > 0 && t < best.t) best = { t, ball: b };
    }
    const lim = (p, d, lo, hi) => d > 1e-9 ? (hi - p) / d : d < -1e-9 ? (lo - p) / d : 1e9;
    const tw = Math.min(lim(cx, dx, R, TW - R), lim(cy, dy, R, TH - R));
    if (tw < best.t) best = { t: tw, ball: null };
    return { x: cx + dx * best.t, y: cy + dy * best.t, ball: best.ball, t: best.t };
  }

  // ----- компьютерный игрок -----
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const clear = (balls, ax, ay, bx, by, skip, minD) => balls.every(o => !o.in || skip.includes(o.id) || segDist(o.x, o.y, ax, ay, bx, by) >= minD);
  function targets(balls, groups, turn) {
    const me = groups[turn], own = balls.filter(b => b.in && b.id > 0 && b.id !== 8);
    if (!me) return own;
    const mine = own.filter(b => kind(b.id) === me);
    return mine.length ? mine : balls.filter(b => b.in && b.id === 8);
  }
  function bestShot(balls, cx, cy, tg) {
    let best = null;
    for (const t of tg) for (const [px, py] of POCKETS) {
      let tx = px - t.x, ty = py - t.y; const tl = Math.hypot(tx, ty); if (tl < 1) continue; tx /= tl; ty /= tl;
      const gx = t.x - tx * 2 * R, gy = t.y - ty * 2 * R;
      if (gx < R - 1 || gx > TW - R + 1 || gy < R - 1 || gy > TH - R + 1) continue;
      const vx = gx - cx, vy = gy - cy, cl = Math.hypot(vx, vy); if (cl < 1) continue;
      const cosA = (vx / cl) * tx + (vy / cl) * ty; if (cosA < .3) continue;
      if (!clear(balls, cx, cy, gx, gy, [0, t.id], 2 * R - .2)) continue;
      if (!clear(balls, t.x, t.y, px, py, [0, t.id], 2 * R - .2)) continue;
      const corner = Math.abs(px - TW / 2) > 5, inx = corner ? (px ? -1 : 1) / 1.414 : 0, iny = (py ? -1 : 1) / (corner ? 1.414 : 1);
      const ent = tx * -inx + ty * -iny; if (ent < (corner ? .5 : .62)) continue;
      const dist = cl + tl, score = cosA * cosA + ent * .25 - dist / 1600 - (corner ? 0 : .06);
      if (!best || score > best.score) best = { score, ang: Math.atan2(vy, vx), dist, t, cosA };
    }
    return best;
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  const SIGMA = [.05, .02, .006];
  function aiPlan(balls, groups, turn, level, isBreak, sigmaOverride) {
    const c = balls[0], sg = sigmaOverride !== undefined ? sigmaOverride : SIGMA[level];
    if (isBreak) return { ang: Math.atan2(TH / 2 - c.y, TW * .72 - c.x) + gauss() * sg * .5, v: VMAX * .92, shot: false };
    const tg = targets(balls, groups, turn), s = bestShot(balls, c.x, c.y, tg);
    if (s) {
      const v = Math.min(VMAX, (Math.sqrt(.27 * s.dist) + 3.2 + (1 - s.cosA) * 7) * (1 + gauss() * .04 * (2 - level) * .5));
      return { ang: s.ang + gauss() * sg, v, shot: true };
    }
    let near = null; for (const t of tg) { const d = Math.hypot(t.x - c.x, t.y - c.y); if (!near || d < near.d) near = { d, t }; }
    const t = near ? near.t : balls.find(b => b.in && b.id), d = Math.hypot(t.x - c.x, t.y - c.y);
    return { ang: Math.atan2(t.y - c.y, t.x - c.x) + gauss() * sg, v: Math.min(VMAX, 5 + d / 55), shot: false };
  }
  function aiPlace(balls, groups, turn) {
    const tg = targets(balls, groups, turn); let best = null;
    for (let i = 0; i < 40; i++) {
      const x = R + Math.random() * (TW - 2 * R), y = R + Math.random() * (TH - 2 * R); if (!freeAt(balls, x, y)) continue;
      const s = bestShot(balls, x, y, tg), sc = s ? s.score : -9; if (!best || sc > best.sc) best = { x, y, sc };
    }
    return best || { x: findFree(balls, TW * .25, TH / 2)[0], y: findFree(balls, TW * .25, TH / 2)[1] };
  }
  return { TW, TH, R, VMAX, SUB, POCKETS, kind, rack, step, frame, moving, newEv, speed, pwOf, ownLeft, judge, freeAt, findFree, ray, aiPlan, aiPlace, bestShot, targets };
})();
// ===CORE-END===

// ----- рисование -----
const BCOL = [null, [245, 200, 30], [30, 90, 200], [220, 40, 40], [120, 40, 160], [240, 120, 30], [30, 140, 70], [130, 30, 30], [20, 20, 24]];
function bilBall(b, ghost) {
  const R = BIL.R, col = b.id ? BCOL[b.id > 8 ? b.id - 8 : b.id] : null;
  g.save(); g.translate(b.x, b.y); if (ghost) g.globalAlpha = ghost;
  g.beginPath(); g.arc(2.5, 3.5, R, 0, 6.283); g.fillStyle = 'rgba(0,0,0,.32)'; g.fill();
  g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.clip();
  g.fillStyle = (b.id === 0 || b.id > 8) ? '#f4f4ec' : css(col); g.fillRect(-R, -R, 2 * R, 2 * R);
  if (b.id > 8) { g.fillStyle = css(col); g.fillRect(-R, -R * .56, 2 * R, R * 1.12); }
  if (b.id) { g.beginPath(); g.arc(0, 0, R * .48, 0, 6.283); g.fillStyle = '#f6f6f0'; g.fill(); text(String(b.id), 0, .6, { size: 8.5, bold: true, color: [20, 20, 20] }); }
  const gr = g.createRadialGradient(-3.5, -4, 1, 0, 0, R); gr.addColorStop(0, 'rgba(255,255,255,.6)'); gr.addColorStop(.35, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.38)');
  g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R); g.restore();
}
function bilTable() {
  const { TW, TH, POCKETS } = BIL;
  let gr = g.createLinearGradient(0, -40, 0, TH + 40); gr.addColorStop(0, '#6b3f1e'); gr.addColorStop(.5, '#4a2810'); gr.addColorStop(1, '#2f1809');
  g.beginPath(); g.roundRect(-42, -42, TW + 84, TH + 84, 26); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,220,170,.25)'; g.stroke();
  g.fillStyle = 'rgba(255,235,200,.7)';
  const dia = (x, y) => { g.save(); g.translate(x, y); g.rotate(.785); g.fillRect(-2.5, -2.5, 5, 5); g.restore(); };
  for (let i = 1; i < 8; i++) if (i !== 4) { dia(TW * i / 8, -27); dia(TW * i / 8, TH + 27); }
  for (let i = 1; i < 4; i++) if (i !== 2) { dia(-27, TH * i / 4); dia(TW + 27, TH * i / 4); }
  g.beginPath(); g.roundRect(-15, -15, TW + 30, TH + 30, 10); g.fillStyle = '#0a5030'; g.fill();
  gr = g.createRadialGradient(TW / 2, TH / 2, 40, TW / 2, TH / 2, TW * .62); gr.addColorStop(0, '#1fa860'); gr.addColorStop(1, '#0d7440');
  g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(TW * .25, 0); g.lineTo(TW * .25, TH); g.stroke();
  disc(TW * .25, TH / 2, 2.5, [255, 255, 255]); disc(TW * .72, TH / 2, 2.5, [255, 255, 255]);
  for (const [px, py, pr] of POCKETS) { disc(px, py, pr + 2, [40, 24, 12]); disc(px, py, pr, [4, 6, 10]); }
}
function bilCue(c, ang, pull) {
  const gap = BIL.R + 4 + pull, L = 310; g.save(); g.translate(c.x, c.y); g.rotate(ang + Math.PI);
  const gr = g.createLinearGradient(gap, 0, gap + L, 0); gr.addColorStop(0, '#f1d9a8'); gr.addColorStop(.7, '#c58a4a'); gr.addColorStop(1, '#3a2312');
  g.beginPath(); g.moveTo(gap + 6, -1.9); g.lineTo(gap + L, -4.4); g.lineTo(gap + L, 4.4); g.lineTo(gap + 6, 1.9); g.closePath(); g.fillStyle = gr; g.fill();
  g.fillStyle = '#5aa8ff'; g.fillRect(gap, -1.9, 6, 3.8); g.restore();
}
async function bilMenu() {
  const cards = [['Компьютер', 'Лёгкий', 0], ['Компьютер', 'Средний', 1], ['Компьютер', 'Сложный', 2], ['2 игрока', 'Один экран', null]];
  const rc = i => [W / 2 - 430 + i * 220, 190, 200, 190], ACC = [96, 214, 150];
  for (;;) {
    const { keys, clicks } = pump();
    for (const e of keys) { if (is(e, 'Escape')) return null; for (let i = 0; i < 4; i++) if (is(e, 'Digit' + (i + 1), 'Numpad' + (i + 1))) return { ai: cards[i][2] }; }
    for (const c of clicks) cards.forEach((cd, i) => { if (inRect(c, rc(i))) cards.go = { ai: cd[2] }; });
    if (cards.go) { const r = cards.go; cards.go = null; return r; }
    backdrop(now(), [20, 80, 60], [14, 40, 90]);
    text('БИЛЬЯРД', W / 2, 80, { size: 40, bold: true, color: ACC }); text('Американский пул «8-ball»: выбери соперника', W / 2, 135, { size: 22, bold: true });
    cards.forEach((cd, i) => {
      const r = rc(i), hov = inRect(mouse, r), y = r[1] - (hov ? 4 : 0);
      panel(r[0], y, r[2], r[3], { fill: `rgba(255,255,255,${hov ? .09 : .05})`, stroke: css(ACC, hov ? .85 : .3), r: 24, lw: 2 });
      text(String(i + 1), r[0] + 100, y + 55, { size: 64, bold: true, color: i < 3 ? PC[1] : PC[0] });
      text(cd[0], r[0] + 100, y + 120, { size: 24, bold: true }); text(cd[1], r[0] + 100, y + 152, { size: 18, color: MUTED });
    });
    text('Забей все свои шары, затем чёрную «8». Фол — соперник ставит биток куда угодно.', W / 2, 450, { size: 18, color: MUTED });
    hints([['1-4', 'выбрать'], ['ESC', 'назад']]); await present();
  }
}

async function billiardsMatch(mode) {
  FX.reset();
  const B = BIL, { TW, TH, R } = B, ai = mode.ai, names = [PN[0], ai !== null ? 'Компьютер' : PN[1]], cols = [PC[0], PC[1]];
  const GN = { solid: 'Сплошные', stripe: 'Полосатые' };
  let balls = B.rack(), groups = [null, null], turn = 0, state = 'aim', isBreak = true, inHand = false, ev = null;
  let ang = 0, pw = 0, charging = false, charge0 = 0, needRel = false, lastM = [-9, -9], msg = ['', 0], aiS = null, rollF = 0, potsSeen = 0, over = null;
  const cue = () => balls[0], org = () => [W / 2 - TW / 2, 322 - TH / 2], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const normA = a => { while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; return a; };

  function beginTurn() {
    needRel = mouse.down; charging = false; pw = 0;
    const live = balls.filter(b => b.in && b.id), c = cue();
    ang = live.length ? Math.atan2(live.reduce((s, b) => s + b.y, 0) / live.length - c.y, live.reduce((s, b) => s + b.x, 0) / live.length - c.x) : 0;
    if (turn === 1 && ai !== null) { state = 'ai'; aiS = { phase: 'think', t: now() + 900 }; }
    else state = inHand ? 'place' : 'aim';
  }
  function shoot(a, v) {
    const c = cue(); c.vx = Math.cos(a) * v; c.vy = Math.sin(a) * v;
    ev = B.newEv(B.ownLeft(balls, groups[turn]), isBreak); state = 'roll'; pw = 0; rollF = 0; potsSeen = 0;
    tone(260, 70, .25, 'triangle', -600);
  }
  function settle(t) {
    const r = B.judge(groups, turn, ev); groups = r.groups;
    if (r.respot8) { const e = balls.find(b => b.id === 8), p = B.findFree(balls, TW * .72, TH / 2); e.in = true; e.x = p[0]; e.y = p[1]; e.vx = e.vy = 0; }
    if (r.over) { over = { winner: r.winner, msg: r.msg }; state = 'over'; return; }
    inHand = !!r.foul; isBreak = false;
    if (r.foul) { msg = [`Фол: ${r.foul} • шар в руке`, t + 3500]; sfx('bad'); }
    else if (r.assigned) msg = [`${names[turn]}: ${GN[r.assigned]}`, t + 3000];
    else if (r.respot8) msg = ['«8» возвращена на стол', t + 2500];
    if (!r.keep) turn = 1 - turn;
    const c = cue(); if (!c.in) { c.in = true; c.x = TW * .25; c.y = TH / 2; c.vx = c.vy = 0; }
    beginTurn();
  }
  function draw(t) {
    const [ox, oy] = org();
    backdrop(t, [16, 70, 60], [14, 34, 80]);
    // шапка: два игрока
    [0, 1].forEach(i => {
      const x = i ? W / 2 + 120 : W / 2 - 420, act = turn === i && state !== 'over', grp = groups[i];
      panel(x, 16, 300, 62, { fill: act ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', stroke: css(cols[i], act ? .9 : .25), r: 16, lw: act ? 2 : 1 });
      if (act) glow(x + 150, 47, 150, dark(cols[i], .22));
      disc(x + 20, 34, 7, cols[i]); text(names[i], x + 36, 34, { align: 'left', bold: true, size: 19 });
      text(grp ? GN[grp] : 'стол открыт', x + 288, 34, { align: 'right', size: 15, color: MUTED });
      for (let k = 0; k < 7 && grp; k++) {
        const id = grp === 'solid' ? k + 1 : k + 9, inPlay = balls.find(b => b.id === id).in;
        bilBall({ id, x: x + 28 + k * 36, y: 62 }, inPlay ? 1 : .22);
      }
    });
    text('8-BALL', W / 2, 47, { size: 24, bold: true, color: [150, 240, 190] });
    g.save(); g.translate(ox, oy);
    bilTable();
    const c = cue();
    if (state === 'place') { // шар в руке
      const ok = B.freeAt(balls, c.x, c.y); glow(c.x, c.y, 26, ok ? [60, 255, 150] : [255, 70, 70]);
    }
    for (const b of balls) if (b.in && b.id) bilBall(b);
    if (c.in) bilBall(c);
    if ((state === 'aim' || (state === 'ai' && aiS.phase !== 'think')) && c.in) {
      const r = B.ray(balls, c.x, c.y, ang), dx = Math.cos(ang), dy = Math.sin(ang);
      g.save(); g.setLineDash([6, 6]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.6)';
      g.beginPath(); g.moveTo(c.x + dx * R, c.y + dy * R); g.lineTo(r.x, r.y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(r.x, r.y, R, 0, 6.283); g.stroke();
      if (r.ball) {
        let nx = r.ball.x - r.x, ny = r.ball.y - r.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        g.strokeStyle = 'rgba(255,235,140,.75)'; g.beginPath(); g.moveTo(r.ball.x, r.ball.y); g.lineTo(r.ball.x + nx * 70, r.ball.y + ny * 70); g.stroke();
        const dot = dx * nx + dy * ny, tx = dx - dot * nx, ty = dy - dot * ny;
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x + tx * 34, r.y + ty * 34); g.stroke();
      }
      g.restore(); bilCue(c, ang, pw * 70);
    }
    if (state === 'roll' || state === 'over') { /* кий убран */ }
    g.restore();
    if (t < msg[1]) pill(msg[0], 112, GOLD);
    // шкала силы
    const bx = W / 2 - 150, by = 566;
    panel(bx, by, 300, 14, { fill: 'rgba(255,255,255,.07)', stroke: 'rgba(255,255,255,.2)', r: 7 });
    if (pw > 0) { const gr = g.createLinearGradient(bx, 0, bx + 300, 0); gr.addColorStop(0, '#3ddc84'); gr.addColorStop(.6, '#ffd054'); gr.addColorStop(1, '#ff606e'); g.beginPath(); g.roundRect(bx + 1, by + 1, 298 * pw, 12, 6); g.fillStyle = gr; g.fill(); }
    text('СИЛА', bx - 30, by + 8, { size: 13, bold: true, color: MUTED });
    if (state === 'place') hints([['Мышь', 'поставить биток'], ['Клик', 'подтвердить'], ['ESC', 'меню']]);
    else if (state === 'aim') hints([['Мышь / A D', 'прицел'], ['Держать ЛКМ / Пробел', 'сила'], ['Отпустить', 'удар'], ['ESC', 'меню']]);
    else if (state === 'ai') text('Компьютер думает…', W / 2, H - 23, { size: 17, color: MUTED });
    else hints([['ESC', 'меню']]);
  }

  turn = 0; beginTurn();
  if (!await countdown(draw)) return 'menu';
  for (;;) {
    const t = now(), { keys, clicks } = pump(); let confirm = false;
    for (const e of keys) { if (is(e, 'Escape')) return 'menu'; if (is(e, 'Enter', 'NumpadEnter', 'Space')) confirm = true; }
    const [ox, oy] = org(), mx = mouse.x - ox, my = mouse.y - oy, c = cue(), moved = mouse.x !== lastM[0] || mouse.y !== lastM[1];
    if (moved) lastM = [mouse.x, mouse.y];
    if (state === 'aim') {
      if (moved && !charging && mouse.x >= 0 && Math.hypot(mx - c.x, my - c.y) > 6) ang = Math.atan2(my - c.y, mx - c.x);
      if (!charging) {
        const sp = (held.has('ShiftLeft') || held.has('ShiftRight')) ? .0025 : .014;
        if (held.has('KeyA') || held.has('ArrowLeft')) ang -= sp; if (held.has('KeyD') || held.has('ArrowRight')) ang += sp;
      }
      const press = (mouse.down && mouse.x >= 0) || held.has('Space');
      if (needRel) { if (!press) needRel = false; }
      else if (!charging && press) { charging = true; charge0 = t; }
      if (charging) { pw = Math.min(1, (t - charge0) / 1200); if (!press) { charging = false; if (pw > .04) shoot(ang, B.speed(pw)); else pw = 0; } }
    } else if (state === 'place') {
      if (moved && mouse.x >= 0) { c.x = clamp(mx, R, TW - R); c.y = clamp(my, R, TH - R); }
      const sp = (held.has('ShiftLeft') || held.has('ShiftRight')) ? 1 : 3.5;
      if (held.has('KeyA') || held.has('ArrowLeft')) c.x -= sp; if (held.has('KeyD') || held.has('ArrowRight')) c.x += sp;
      if (held.has('KeyW') || held.has('ArrowUp')) c.y -= sp; if (held.has('KeyS') || held.has('ArrowDown')) c.y += sp;
      c.x = clamp(c.x, R, TW - R); c.y = clamp(c.y, R, TH - R);
      if ((clicks.length || confirm) && B.freeAt(balls, c.x, c.y)) { inHand = false; state = 'aim'; needRel = true; sfx('beep'); }
    } else if (state === 'ai') {
      if (aiS.phase === 'think' && t > aiS.t) {
        if (inHand) { const p = B.aiPlace(balls, groups, turn); c.x = p.x; c.y = p.y; inHand = false; }
        aiS.plan = B.aiPlan(balls, groups, turn, ai, isBreak); aiS.phase = 'aim'; aiS.t = t; aiS.a0 = ang; aiS.d = normA(aiS.plan.ang - ang);
      } else if (aiS.phase === 'aim') {
        const k = Math.min(1, (t - aiS.t) / 700); ang = aiS.a0 + aiS.d * ease(k); if (k >= 1) { aiS.phase = 'pull'; aiS.t = t; }
      } else if (aiS.phase === 'pull') {
        const k = Math.min(1, (t - aiS.t) / 500); pw = B.pwOf(aiS.plan.v) * k; if (k >= 1) shoot(aiS.plan.ang, aiS.plan.v);
      }
    } else if (state === 'roll') {
      B.frame(balls, ev); rollF++;
      if (ev.maxHit > .4) { tone(300 + ev.maxHit * 25, 45, Math.min(.3, ev.maxHit / 30), 'sine'); } if (ev.maxRail > .5) tone(130, 40, Math.min(.25, ev.maxRail / 40), 'square');
      ev.maxHit = 0; ev.maxRail = 0;
      for (; potsSeen < ev.pots.length; potsSeen++) { const [px, py, id] = ev.pots[potsSeen]; burst(px + ox, py + oy, id ? BCOL[id > 8 ? id - 8 : id] : WHITE, 14, 3, 30, 3); sfx('coin'); }
      if (!B.moving(balls) || rollF > 2400) { for (const b of balls) b.vx = b.vy = 0; settle(t); }
    }
    if (state === 'over') {
      await finishAnim(draw, 40);
      const w = over.winner, human = ai === null || w === 0;
      return endScreen(ai === null ? 'Победа!' : (human ? 'Победа!' : 'Поражение'), [ai === null ? names[w] + ' выиграл' : (human ? 'Ты выиграл!' : 'Выиграл компьютер'), over.msg], human ? cols[w] : RED);
    }
    draw(t); updateFx(); drawFx(); await present();
  }
}
async function billiards() {
  for (;;) {
    const mode = await bilMenu(); if (!mode) return;
    while (await billiardsMatch(mode) === 'again');
  }
}
