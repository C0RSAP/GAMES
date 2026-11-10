'use strict';
// ===== Крестики-нолики: 3×3 / 5×5 · 1 на 1 или против робота =====

const TTT = (() => {
  const empty = n => Array.from({ length: n }, () => Array(n).fill(0));
  function winner(b, need) {
    const n = b.length;
    const lines = [];
    for (let y = 0; y < n; y++) lines.push([...Array(n)].map((_, x) => [x, y]));
    for (let x = 0; x < n; x++) lines.push([...Array(n)].map((_, y) => [x, y]));
    // диагонали всех длин need
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      // вправо-вниз
      if (x + need <= n && y + need <= n)
        lines.push([...Array(need)].map((_, i) => [x + i, y + i]));
      // вправо-вверх
      if (x + need <= n && y - need + 1 >= 0)
        lines.push([...Array(need)].map((_, i) => [x + i, y - i]));
    }
    // для строк/столбцов тоже режем на окна need
    const windows = [];
    for (const line of lines) {
      if (line.length === need) windows.push(line);
      else if (line.length > need) {
        for (let i = 0; i <= line.length - need; i++) windows.push(line.slice(i, i + need));
      }
    }
    for (const w of windows) {
      const v = b[w[0][1]][w[0][0]];
      if (v && w.every(([x, y]) => b[y][x] === v)) return { player: v, cells: w };
    }
    return null;
  }
  function full(b) {
    for (const row of b) for (const c of row) if (!c) return false;
    return true;
  }
  function moves(b) {
    const m = [];
    for (let y = 0; y < b.length; y++) for (let x = 0; x < b.length; x++) if (!b[y][x]) m.push([x, y]);
    return m;
  }
  // оценка позиции для AI
  function scoreBoard(b, need, ai, human) {
    const w = winner(b, need);
    if (w) return w.player === ai ? 10000 : -10000;
    // эвристика: сколько почти-линий
    let s = 0;
    const n = b.length;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      for (const [dx, dy] of dirs) {
        let aiC = 0, huC = 0, empty = 0, ok = true;
        for (let i = 0; i < need; i++) {
          const nx = x + dx * i, ny = y + dy * i;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) { ok = false; break; }
          const v = b[ny][nx];
          if (v === ai) aiC++;
          else if (v === human) huC++;
          else empty++;
        }
        if (!ok) continue;
        if (aiC && huC) continue;
        if (aiC === need - 1 && empty === 1) s += 50;
        else if (aiC === need - 2 && empty === 2) s += 10;
        else if (aiC > 0) s += aiC;
        if (huC === need - 1 && empty === 1) s -= 55;
        else if (huC === need - 2 && empty === 2) s -= 12;
        else if (huC > 0) s -= huC;
      }
    }
    return s;
  }
  function minimax(b, need, depth, maxing, ai, human, alpha, beta) {
    const w = winner(b, need);
    if (w) return w.player === ai ? 1000 - depth : -1000 + depth;
    if (full(b) || depth > (b.length === 3 ? 9 : 3)) return scoreBoard(b, need, ai, human);
    const ms = moves(b);
    // центр и углы чуть раньше
    const mid = (b.length - 1) / 2;
    ms.sort((a, b2) => {
      const da = Math.abs(a[0] - mid) + Math.abs(a[1] - mid);
      const db = Math.abs(b2[0] - mid) + Math.abs(b2[1] - mid);
      return da - db;
    });
    if (maxing) {
      let best = -1e9;
      for (const [x, y] of ms) {
        b[y][x] = ai;
        best = Math.max(best, minimax(b, need, depth + 1, false, ai, human, alpha, beta));
        b[y][x] = 0;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = 1e9;
      for (const [x, y] of ms) {
        b[y][x] = human;
        best = Math.min(best, minimax(b, need, depth + 1, true, ai, human, alpha, beta));
        b[y][x] = 0;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }
  function bestMove(b, need, ai, human) {
    const ms = moves(b);
    if (!ms.length) return null;
    // 3×3 — полный minimax; 5×5 — ограниченная глубина + эвристика
    let best = null, bestScore = -1e9;
    const mid = (b.length - 1) / 2;
    // шафл для разнообразия при равных
    for (let i = ms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ms[i], ms[j]] = [ms[j], ms[i]];
    }
    ms.sort((a, c) => (Math.abs(a[0] - mid) + Math.abs(a[1] - mid)) - (Math.abs(c[0] - mid) + Math.abs(c[1] - mid)));
    for (const [x, y] of ms) {
      b[y][x] = ai;
      // мгновенный выигрыш
      if (winner(b, need)) { b[y][x] = 0; return [x, y]; }
      b[y][x] = 0;
    }
    // блок угрозы
    for (const [x, y] of ms) {
      b[y][x] = human;
      if (winner(b, need)) { b[y][x] = 0; return [x, y]; }
      b[y][x] = 0;
    }
    for (const [x, y] of ms) {
      b[y][x] = ai;
      const sc = minimax(b, need, 0, false, ai, human, -1e9, 1e9);
      b[y][x] = 0;
      if (sc > bestScore) { bestScore = sc; best = [x, y]; }
    }
    return best || ms[0];
  }
  return { empty, winner, full, moves, bestMove };
})();

async function tttMenu() {
  // возвращает { size, need, vsAI } или null
  let size = 3, vsAI = true;
  for (;;) {
    applySize();
    const { keys, clicks } = pump();
    for (const e of keys) {
      if (is(e, 'Escape')) return null;
      if (is(e, 'Digit3', 'Numpad3')) size = 3;
      if (is(e, 'Digit5', 'Numpad5')) size = 5;
      if (is(e, 'Digit1', 'Numpad1')) vsAI = false;
      if (is(e, 'Digit2', 'Numpad2')) vsAI = true;
      if (is(e, 'Enter', 'NumpadEnter', 'Space')) {
        sfx('go');
        return { size, need: size === 3 ? 3 : 4, vsAI };
      }
    }
    const cards = [
      { label: '3 × 3', sub: 'классика · 3 в ряд', val: 3, r: [W / 2 - 310, 150, 280, 120] },
      { label: '5 × 5', sub: '4 в ряд до победы', val: 5, r: [W / 2 + 30, 150, 280, 120] },
      { label: '1 на 1', sub: 'двое за компьютером', val: false, r: [W / 2 - 310, 310, 280, 120], kind: 'opp' },
      { label: 'Против робота', sub: 'умный компьютер', val: true, r: [W / 2 + 30, 310, 280, 120], kind: 'opp' }
    ];
    for (const c of clicks) {
      for (const card of cards) {
        if (inRect(c, card.r)) {
          sfx('beep');
          if (card.kind === 'opp') vsAI = card.val;
          else size = card.val;
        }
      }
      // start button
      if (inRect(c, [W / 2 - 120, 480, 240, 52])) {
        sfx('go');
        return { size, need: size === 3 ? 3 : 4, vsAI };
      }
    }
    const t = now();
    backdrop(t, [40, 30, 90], [20, 50, 100]);
    text('КРЕСТИКИ-НОЛИКИ', W / 2, 50, { size: 18, bold: true, color: MUTED, spacing: 4 });
    text('Выберите режим', W / 2, 90, { size: 32, bold: true });

    for (const card of cards) {
      const sel = card.kind === 'opp' ? vsAI === card.val : size === card.val;
      const hov = inRect(mouse, card.r);
      const col = sel ? GOLD : (hov ? [180, 200, 255] : MUTED);
      panel(card.r[0], card.r[1] - (hov || sel ? 3 : 0), card.r[2], card.r[3], {
        fill: sel ? 'rgba(255,208,84,.12)' : `rgba(255,255,255,${hov ? .09 : .05})`,
        stroke: css(col, sel ? .9 : .35), r: 18, lw: 2
      });
      text(card.label, card.r[0] + card.r[2] / 2, card.r[1] + 48, { size: 28, bold: true, color: sel ? GOLD : INK });
      text(card.sub, card.r[0] + card.r[2] / 2, card.r[1] + 82, { size: 15, color: MUTED });
    }

    const startHov = inRect(mouse, [W / 2 - 120, 480, 240, 52]);
    panel(W / 2 - 120, 480, 240, 52, {
      fill: startHov ? 'rgba(46,204,132,.25)' : 'rgba(46,204,132,.12)',
      stroke: css(GREEN, startHov ? .95 : .55), r: 16, lw: 2
    });
    text('Играть', W / 2, 506, { size: 24, bold: true, color: GREEN });

    hints([['3 / 5', 'размер'], ['1 / 2', 'соперник'], ['Enter', 'старт'], ['ESC', 'назад']]);
    await present();
  }
}

async function tttMatch(cfg) {
  FX.reset();
  applySize();
  const { size, need, vsAI } = cfg;
  const board = TTT.empty(size);
  const P1 = 1, P2 = 2; // X и O
  const names = vsAI ? ['Вы', 'Робот'] : ['Игрок 1', 'Игрок 2'];
  const cols = [PC[0], PC[1]];
  let turn = P1;
  let winInfo = null;
  let aiThinking = false;
  let msg = '';

  const cellSize = Math.min(72, Math.floor(420 / size));
  const side = cellSize * size;
  const geom = () => ({
    x0: W / 2 - side / 2,
    y0: H / 2 - side / 2 + 20,
    cell: cellSize, side, n: size
  });

  function cellAt(g, mx, my) {
    const x = Math.floor((mx - g.x0) / g.cell);
    const y = Math.floor((my - g.y0) / g.cell);
    if (x < 0 || y < 0 || x >= g.n || y >= g.n) return null;
    return [x, y];
  }

  function draw(t) {
    backdrop(t, dark(cols[turn - 1], .25), [12, 18, 40]);
    text('КРЕСТИКИ-НОЛИКИ', W / 2, 28, { size: 14, bold: true, color: MUTED, spacing: 3 });
    const sub = size === 3 ? '3×3 · три в ряд' : '5×5 · четыре в ряд';
    text(sub + (vsAI ? ' · vs робот' : ' · 1 на 1'), W / 2, 52, { size: 16, color: FAINT });

    // имена
    chip(40, 70, names[0] + ' ✕', cols[0]);
    chip(W - 40, 70, names[1] + ' ○', cols[1], 'right');

    if (!winInfo && !TTT.full(board)) {
      text(aiThinking ? 'Робот думает…' : `Ход: ${names[turn - 1]}`, W / 2, 100, {
        size: 22, bold: true, color: cols[turn - 1]
      });
    } else if (msg) {
      pill(msg, 100, winInfo ? cols[winInfo.player - 1] : MUTED);
    }

    const g0 = geom();
    // поле
    panel(g0.x0 - 12, g0.y0 - 12, g0.side + 24, g0.side + 24, {
      fill: 'rgba(8,12,28,.8)', stroke: 'rgba(100,120,180,.35)', r: 16, lw: 2
    });
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = g0.x0 + x * g0.cell, py = g0.y0 + y * g0.cell;
      const hov = !winInfo && !aiThinking && (!vsAI || turn === P1);
      const over = hov && inRect(mouse, [px, py, g0.cell, g0.cell]) && !board[y][x];
      g.fillStyle = over ? 'rgba(255,255,255,.1)' : 'rgba(20,28,50,.9)';
      g.fillRect(px + 2, py + 2, g0.cell - 4, g0.cell - 4);
      g.strokeStyle = 'rgba(70,90,130,.4)';
      g.lineWidth = 1;
      g.strokeRect(px + 2.5, py + 2.5, g0.cell - 5, g0.cell - 5);

      const v = board[y][x];
      if (v === 1) {
        // X
        const m = g0.cell * .28, cx = px + g0.cell / 2, cy = py + g0.cell / 2;
        g.strokeStyle = css(cols[0]); g.lineWidth = Math.max(3, g0.cell * .08); g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx - m, cy - m); g.lineTo(cx + m, cy + m);
        g.moveTo(cx + m, cy - m); g.lineTo(cx - m, cy + m); g.stroke();
      } else if (v === 2) {
        const m = g0.cell * .28, cx = px + g0.cell / 2, cy = py + g0.cell / 2;
        g.strokeStyle = css(cols[1]); g.lineWidth = Math.max(3, g0.cell * .08);
        g.beginPath(); g.arc(cx, cy, m, 0, 7); g.stroke();
      }
    }

    // линия победы
    if (winInfo) {
      const cells = winInfo.cells;
      const a = cells[0], b = cells[cells.length - 1];
      const ax = g0.x0 + a[0] * g0.cell + g0.cell / 2;
      const ay = g0.y0 + a[1] * g0.cell + g0.cell / 2;
      const bx = g0.x0 + b[0] * g0.cell + g0.cell / 2;
      const by = g0.y0 + b[1] * g0.cell + g0.cell / 2;
      g.strokeStyle = css(cols[winInfo.player - 1], .9);
      g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }

    hints([['ЛКМ', 'ход'], ['ESC', 'в меню']]);
  }

  function place(x, y) {
    if (board[y][x]) return false;
    board[y][x] = turn;
    sfx('hit');
    winInfo = TTT.winner(board, need);
    if (winInfo) {
      sfx('bonus'); FX.shake = 8;
      msg = `${names[winInfo.player - 1]} победил!`;
      return true;
    }
    if (TTT.full(board)) {
      sfx('beep');
      msg = 'Ничья!';
      return true;
    }
    turn = turn === P1 ? P2 : P1;
    return false;
  }

  for (;;) {
    applySize();
    const g0 = geom();
    const { keys, clicks } = pump();
    for (const e of keys) if (is(e, 'Escape')) return 'menu';

    // ход человека
    if (!winInfo && !TTT.full(board) && !aiThinking) {
      const humanTurn = !vsAI || turn === P1;
      if (humanTurn) {
        for (const c of clicks) {
          const pos = cellAt(g0, c.x, c.y);
          if (pos) {
            const over = place(pos[0], pos[1]);
            if (over) {
              for (let i = 0; i < 45; i++) { pump(); draw(now()); updateFx(); drawFx(); await present(); }
              return endScreen(msg, [
                size === 3 ? 'Поле 3×3' : 'Поле 5×5',
                vsAI ? (winInfo && winInfo.player === P1 ? 'Победа над роботом!' : (winInfo ? 'Робот оказался сильнее' : 'Боевая ничья')) : 'Партия окончена'
              ], winInfo ? cols[winInfo.player - 1] : MUTED);
            }
          }
        }
      }
    }

    // ход робота
    if (vsAI && turn === P2 && !winInfo && !TTT.full(board) && !aiThinking) {
      aiThinking = true;
      // небольшая пауза «думает»
      const thinkUntil = now() + 350 + Math.random() * 400;
      while (now() < thinkUntil) {
        for (const e of pump().keys) if (is(e, 'Escape')) return 'menu';
        draw(now()); await present();
      }
      const mv = TTT.bestMove(board, need, P2, P1);
      aiThinking = false;
      if (mv) {
        const over = place(mv[0], mv[1]);
        if (over) {
          for (let i = 0; i < 45; i++) { pump(); draw(now()); updateFx(); drawFx(); await present(); }
          return endScreen(msg, [
            size === 3 ? 'Поле 3×3' : 'Поле 5×5',
            winInfo && winInfo.player === P1 ? 'Победа над роботом!' : (winInfo ? 'Робот оказался сильнее' : 'Боевая ничья')
          ], winInfo ? cols[winInfo.player - 1] : MUTED);
        }
      }
    }

    draw(now());
    updateFx(); drawFx();
    await present();
  }
}

async function tictactoe() {
  for (;;) {
    const cfg = await tttMenu();
    if (!cfg) return;
    const r = await tttMatch(cfg);
    if (r !== 'again') return;
  }
}
