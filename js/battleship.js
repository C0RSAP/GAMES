'use strict';
// ===== Морской бой: 2 игрока за одним компьютером (hotseat) =====
// Классический флот: 4, 3, 3, 2, 2, 2, 1, 1, 1, 1 · поле 10×10
const BS = (() => {
  const SIZE = 10;
  const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
  const NAMES = { 4: 'Линкор', 3: 'Крейсер', 2: 'Эсминец', 1: 'Катер' };
  const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  // 0 пусто, 1 корабль, 2 промах, 3 попадание, 4 потоплен
  function cellsOf(board, id) {
    const out = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (board[y][x] === id) out.push([x, y]);
    return out;
  }
  function canPlace(board, x, y, len, horiz) {
    const cells = [];
    for (let i = 0; i < len; i++) {
      const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i);
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) return null;
      // нельзя касаться других кораблей (включая углы)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && board[ny][nx] === 1) return null;
      }
      cells.push([cx, cy]);
    }
    return cells;
  }
  function place(board, x, y, len, horiz) {
    const cells = canPlace(board, x, y, len, horiz);
    if (!cells) return false;
    cells.forEach(([cx, cy]) => { board[cy][cx] = 1; });
    return true;
  }
  function autoPlace(board) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) board[y][x] = 0;
    for (const len of FLEET) {
      let ok = false;
      for (let tries = 0; tries < 400 && !ok; tries++) {
        const horiz = Math.random() < .5;
        const x = Math.floor(Math.random() * SIZE), y = Math.floor(Math.random() * SIZE);
        ok = place(board, x, y, len, horiz);
      }
      if (!ok) return autoPlace(board); // редкий тупик — переразместить
    }
    return true;
  }
  function shipCellsAround(board, x, y) {
    // BFS по попаданиям/кораблям — найти все клетки одного корабля
    const seen = new Set(), q = [[x, y]], cells = [];
    const key = (a, b) => a + ',' + b;
    while (q.length) {
      const [cx, cy] = q.pop();
      if (seen.has(key(cx, cy))) continue;
      seen.add(key(cx, cy));
      if (board[cy][cx] !== 1 && board[cy][cx] !== 3 && board[cy][cx] !== 4) continue;
      cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) q.push([nx, ny]);
      }
    }
    return cells;
  }
  function fire(board, x, y) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return 'invalid';
    const v = board[y][x];
    if (v === 2 || v === 3 || v === 4) return 'already';
    if (v === 0) { board[y][x] = 2; return 'miss'; }
    // попадание
    board[y][x] = 3;
    const cells = shipCellsAround(board, x, y);
    const alive = cells.some(([cx, cy]) => board[cy][cx] === 1);
    if (!alive) {
      cells.forEach(([cx, cy]) => { board[cy][cx] = 4; });
      // отметить воду вокруг потопленного
      cells.forEach(([cx, cy]) => {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && board[ny][nx] === 0) board[ny][nx] = 2;
        }
      });
      return 'sunk';
    }
    return 'hit';
  }
  function allSunk(board) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (board[y][x] === 1) return false;
    return true;
  }
  function remaining(board) {
    // сколько «живых» кораблей: считаем компоненты из 1/3
    const seen = new Set(), key = (a, b) => a + ',' + b;
    let n = 0;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if ((board[y][x] === 1 || board[y][x] === 3) && !seen.has(key(x, y))) {
        n++;
        const q = [[x, y]];
        while (q.length) {
          const [cx, cy] = q.pop();
          if (seen.has(key(cx, cy))) continue;
          seen.add(key(cx, cy));
          if (board[cy][cx] !== 1 && board[cy][cx] !== 3) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) q.push([nx, ny]);
          }
        }
      }
    }
    return n;
  }
  return { SIZE, FLEET, NAMES, emptyBoard, canPlace, place, autoPlace, fire, allSunk, remaining };
})();

async function battleshipMatch() {
  FX.reset();
  applySize();
  const C1 = PC[0], C2 = PC[1];
  const players = [
    { name: 'Игрок 1', color: C1, board: BS.emptyBoard() },
    { name: 'Игрок 2', color: C2, board: BS.emptyBoard() }
  ];

  // ---------- helpers ----------
  function boardGeom(cx, cy, cell) {
    const s = BS.SIZE, side = cell * s;
    return { x0: cx - side / 2, y0: cy - side / 2, cell, side, s };
  }
  function cellAt(geom, mx, my) {
    const x = Math.floor((mx - geom.x0) / geom.cell);
    const y = Math.floor((my - geom.y0) / geom.cell);
    if (x < 0 || y < 0 || x >= geom.s || y >= geom.s) return null;
    return [x, y];
  }
  function drawBoard(geom, board, opts = {}) {
    const { showShips = true, ghost = null, hover = null, title = '', accent = GOLD } = opts;
    const { x0, y0, cell, side, s } = geom;
    // рамка
    panel(x0 - 8, y0 - 36, side + 16, side + 48, { fill: 'rgba(8,12,28,.75)', stroke: css(accent, .35), r: 14, lw: 2 });
    if (title) text(title, x0 + side / 2, y0 - 18, { size: 16, bold: true, color: accent });
    // сетка
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const px = x0 + x * cell, py = y0 + y * cell;
      const v = board[y][x];
      let fill = 'rgba(20,30,55,.9)';
      if (v === 1 && showShips) fill = css(accent, .55);
      if (v === 2) fill = 'rgba(40,50,80,.95)';
      if (v === 3) fill = 'rgba(220,80,70,.9)';
      if (v === 4) fill = 'rgba(120,40,50,.95)';
      g.fillStyle = fill;
      g.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      g.strokeStyle = 'rgba(80,100,140,.35)';
      g.lineWidth = 1;
      g.strokeRect(px + .5, py + .5, cell - 1, cell - 1);
      // маркеры
      if (v === 2) {
        g.fillStyle = css(MUTED, .9);
        g.beginPath(); g.arc(px + cell / 2, py + cell / 2, Math.max(2, cell * .12), 0, 7); g.fill();
      }
      if (v === 3 || v === 4) {
        g.fillStyle = v === 4 ? css([255, 180, 80], .95) : css([255, 230, 120], .95);
        const cx = px + cell / 2, cy = py + cell / 2, r = cell * .28;
        g.beginPath();
        g.moveTo(cx, cy - r); g.lineTo(cx + r * .3, cy - r * .3); g.lineTo(cx + r, cy);
        g.lineTo(cx + r * .3, cy + r * .3); g.lineTo(cx, cy + r);
        g.lineTo(cx - r * .3, cy + r * .3); g.lineTo(cx - r, cy);
        g.lineTo(cx - r * .3, cy - r * .3); g.closePath(); g.fill();
      }
    }
    // буквы / цифры
    const letters = 'АБВГДЕЖЗИК';
    for (let i = 0; i < s; i++) {
      text(letters[i], x0 + i * cell + cell / 2, y0 + side + 12, { size: 11, color: MUTED });
      text(String(i + 1), x0 - 12, y0 + i * cell + cell / 2, { size: 11, color: MUTED });
    }
    // призрак корабля при расстановке
    if (ghost) {
      const { x, y, len, horiz, ok } = ghost;
      for (let i = 0; i < len; i++) {
        const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i);
        if (cx < 0 || cy < 0 || cx >= s || cy >= s) continue;
        const px = x0 + cx * cell, py = y0 + cy * cell;
        g.fillStyle = ok ? css([80, 220, 160], .45) : css([255, 80, 80], .4);
        g.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    }
    // hover при выстреле
    if (hover) {
      const [hx, hy] = hover;
      const px = x0 + hx * cell, py = y0 + hy * cell;
      g.strokeStyle = css(GOLD, .9);
      g.lineWidth = 2;
      g.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
    }
  }

  async function handoff(toName, color, msg) {
    const t0 = now();
    for (;;) {
      const { keys, clicks } = pump();
      for (const e of keys) {
        if (is(e, 'Escape')) return 'menu';
        if (is(e, 'Enter', 'NumpadEnter', 'Space')) { sfx('beep'); return 'ok'; }
      }
      if (clicks.length) { sfx('beep'); return 'ok'; }
      const t = now();
      backdrop(t, dark(color, .35), [10, 20, 50]);
      const pulse = .5 + .5 * Math.sin(t / 300);
      glow(W / 2, H / 2 - 40, 180, dark(color, .4 * pulse));
      text('СЕКРЕТНЫЙ ХОД', W / 2, 120, { size: 18, bold: true, color: MUTED, spacing: 4 });
      text(toName, W / 2, H / 2 - 50, { size: 56, bold: true, color: color });
      text(msg || 'Передайте управление и нажмите Enter', W / 2, H / 2 + 20, { size: 22, color: INK });
      text('Соперник — не подглядывай!', W / 2, H / 2 + 55, { size: 16, color: MUTED });
      hints([['Enter / ЛКМ', 'продолжить'], ['ESC', 'в меню']]);
      await present();
    }
  }

  // ---------- PLACEMENT ----------
  async function placePhase(player, idx) {
    const board = player.board;
    let fleetIdx = 0, horiz = true, cursor = [0, 0];
    const cell = Math.min(42, Math.floor((Math.min(W - 80, 520)) / 10));
    let done = false;

    while (!done) {
      applySize();
      const geom = boardGeom(W * 0.38, H / 2 + 16, cell);
      const need = BS.FLEET[fleetIdx];
      const hoverCell = cellAt(geom, mouse.x, mouse.y);
      if (hoverCell) cursor = hoverCell;
      const [cx, cy] = cursor;
      const okPlace = need ? !!BS.canPlace(board, cx, cy, need, horiz) : false;
      const ghost = need ? { x: cx, y: cy, len: need, horiz, ok: okPlace } : null;

      const { keys, clicks } = pump();
      for (const e of keys) {
        if (is(e, 'Escape')) return 'menu';
        if (is(e, 'KeyR', 'Space')) { horiz = !horiz; sfx('beep'); }
        if (is(e, 'KeyA')) {
          BS.autoPlace(board); fleetIdx = BS.FLEET.length; sfx('bonus');
        }
        if (is(e, 'ArrowLeft')) cursor[0] = Math.max(0, cursor[0] - 1);
        if (is(e, 'ArrowRight')) cursor[0] = Math.min(9, cursor[0] + 1);
        if (is(e, 'ArrowUp')) cursor[1] = Math.max(0, cursor[1] - 1);
        if (is(e, 'ArrowDown')) cursor[1] = Math.min(9, cursor[1] + 1);
        if (is(e, 'Enter', 'NumpadEnter') && fleetIdx >= BS.FLEET.length) { sfx('go'); done = true; }
        else if (is(e, 'Enter', 'NumpadEnter') && need && okPlace) {
          BS.place(board, cx, cy, need, horiz); fleetIdx++; sfx('hit');
          if (fleetIdx >= BS.FLEET.length) sfx('bonus');
        }
      }
      // mouse place
      // клики по полю (кнопки панели обрабатываются ниже, после отрисовки hit-box)
      const boardClicks = [];
      for (const c of clicks) {
        const cellPos = cellAt(geom, c.x, c.y);
        if (cellPos && need) {
          const [bx, by] = cellPos;
          if (BS.place(board, bx, by, need, horiz)) {
            fleetIdx++; sfx('hit');
            if (fleetIdx >= BS.FLEET.length) sfx('bonus');
          } else sfx('beep');
        } else {
          boardClicks.push(c);
        }
      }
      // сохраняем клики вне поля — обработаем после расчёта кнопок
      clicks.length = 0;
      clicks.push(...boardClicks);

      const t = now();
      backdrop(t, dark(player.color, .3), [8, 16, 40]);
      text('РАССТАНОВКА КОРАБЛЕЙ', W / 2, 36, { size: 14, bold: true, color: MUTED, spacing: 3 });
      text(player.name, W / 2, 68, { size: 32, bold: true, color: player.color });

      drawBoard(geom, board, { showShips: true, ghost, accent: player.color, title: 'Ваше поле' });

      // боковая панель — фиксированные отступы, без наложений
      const px = Math.min(W - 200, W / 2 + geom.side / 2 + 36);
      const panelX = px - 12, panelY = 110, panelW = 184, panelH = 420;
      panel(panelX, panelY, panelW, panelH, { fill: 'rgba(10,14,30,.85)', stroke: css(player.color, .35), r: 14, lw: 2 });

      const cxp = panelX + panelW / 2;
      let ty = panelY + 28;

      if (need) {
        text('Сейчас ставится', cxp, ty, { size: 13, color: MUTED }); ty += 26;
        text(`${BS.NAMES[need]}`, cxp, ty, { size: 22, bold: true, color: player.color }); ty += 26;
        text(`длина ${need}`, cxp, ty, { size: 14, color: FAINT }); ty += 28;
        // ориентация — отдельная плашка, не кнопка
        panel(panelX + 16, ty - 14, panelW - 32, 32, { fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.15)', r: 10 });
        text(horiz ? '↔  горизонтально' : '↕  вертикально', cxp, ty + 2, { size: 14, bold: true, color: INK });
        ty += 40;
      } else {
        text('Все корабли', cxp, ty, { size: 18, bold: true, color: GREEN }); ty += 26;
        text('на месте!', cxp, ty, { size: 18, bold: true, color: GREEN }); ty += 36;
      }

      const btn = (x, y, w, h, label, col, active = true) => {
        const hov = active && inRect(mouse, [x, y, w, h]);
        panel(x, y, w, h, { fill: `rgba(255,255,255,${hov ? .14 : .07})`, stroke: css(col, hov ? .9 : .4), r: 12, lw: 2 });
        text(label, x + w / 2, y + h / 2, { size: 15, bold: true, color: active ? col : MUTED });
        return [x, y, w, h];
      };

      const rotBtn = btn(panelX + 12, ty, panelW - 24, 40, 'R · Повернуть', GOLD, !!need);
      ty += 52;
      const autoBtn = btn(panelX + 12, ty, panelW - 24, 40, 'A · Авто', [120, 200, 255], true);
      ty += 56;

      let readyBtn = null;
      if (fleetIdx >= BS.FLEET.length) {
        readyBtn = btn(panelX + 12, ty, panelW - 24, 46, 'Готово ✓', GREEN, true);
      } else {
        text(`Осталось: ${BS.FLEET.length - fleetIdx}`, cxp, ty + 6, { size: 14, color: MUTED });
        ty += 28;
        const sizes = {};
        BS.FLEET.forEach((l, i) => { if (i >= fleetIdx) sizes[l] = (sizes[l] || 0) + 1; });
        Object.keys(sizes).sort((a, b) => b - a).forEach(l => {
          text(`${BS.NAMES[l]}  ×${sizes[l]}`, cxp, ty, { size: 13, color: FAINT });
          ty += 20;
        });
      }

      // клики по кнопкам панели (переопределяем hit-test относительно актуальных координат)
      for (const c of clicks) {
        if (need && inRect(c, rotBtn)) { horiz = !horiz; sfx('beep'); }
        if (inRect(c, autoBtn)) { BS.autoPlace(board); fleetIdx = BS.FLEET.length; sfx('bonus'); }
        if (readyBtn && inRect(c, readyBtn)) { sfx('go'); done = true; }
      }

      hints([
        ['ЛКМ / Enter', 'поставить'],
        ['R', 'повернуть'],
        ['A', 'авто'],
        ['ESC', 'меню']
      ]);
      await present();
    }
    return 'ok';
  }

  // ---------- BATTLE ----------
  async function battle() {
    let turn = 0; // 0 or 1 — кто стреляет
    let lastMsg = '', lastColor = GOLD;
    let flash = null; // {x,y,type,t0}

    // первый handoff уже был после расстановки P2
    {
      const r = await handoff(players[0].name, players[0].color, 'Начинает Игрок 1 — стреляйте по полю соперника');
      if (r === 'menu') return 'menu';
    }

    for (;;) {
      applySize();
      const me = players[turn];
      const enemy = players[1 - turn];
      const cell = Math.min(36, Math.floor((Math.min(W / 2 - 50, 400)) / 10));
      const left = boardGeom(W * .27, H / 2 + 16, cell);
      const right = boardGeom(W * .73, H / 2 + 16, cell);
      const hover = cellAt(right, mouse.x, mouse.y);

      const { keys, clicks } = pump();
      let shot = null;
      for (const e of keys) {
        if (is(e, 'Escape')) return 'menu';
      }
      for (const c of clicks) {
        const pos = cellAt(right, c.x, c.y);
        if (pos) shot = pos;
      }

      if (shot) {
        const [sx, sy] = shot;
        const res = BS.fire(enemy.board, sx, sy);
        if (res === 'already' || res === 'invalid') {
          sfx('beep');
        } else {
          flash = { x: sx, y: sy, type: res, t0: now() };
          if (res === 'miss') {
            sfx('beep');
            lastMsg = 'Мимо!';
            lastColor = MUTED;
            // показать результат, потом handoff
            for (let i = 0; i < 35; i++) {
              pump();
              drawBattleFrame(me, enemy, left, right, turn, lastMsg, lastColor, null, flash);
              await present();
            }
            turn = 1 - turn;
            const hr = await handoff(players[turn].name, players[turn].color, 'Ваш ход — стреляйте по правому полю');
            if (hr === 'menu') return 'menu';
            lastMsg = '';
            flash = null;
          } else if (res === 'hit') {
            sfx('hit'); FX.shake = 6;
            lastMsg = 'Попадание! Стреляйте ещё';
            lastColor = [255, 140, 90];
            burst(right.x0 + sx * right.cell + right.cell / 2, right.y0 + sy * right.cell + right.cell / 2, [255, 120, 60], 18, 5);
            // ход остаётся
          } else if (res === 'sunk') {
            sfx('boom'); FX.shake = 12;
            lastMsg = 'Корабль потоплен! Стреляйте ещё';
            lastColor = GOLD;
            burst(right.x0 + sx * right.cell + right.cell / 2, right.y0 + sy * right.cell + right.cell / 2, GOLD, 28, 7);
            if (BS.allSunk(enemy.board)) {
              for (let i = 0; i < 40; i++) {
                pump();
                drawBattleFrame(me, enemy, left, right, turn, 'Все корабли уничтожены!', GOLD, null, flash);
                await present();
              }
              return endScreen(`Победил ${me.name}!`, [
                `${players[0].name}: осталось ${BS.remaining(players[0].board)} кор.`,
                `${players[1].name}: осталось ${BS.remaining(players[1].board)} кор.`
              ], me.color);
            }
          }
        }
      }

      drawBattleFrame(me, enemy, left, right, turn, lastMsg, lastColor, hover, flash);
      await present();
    }
  }

  function drawBattleFrame(me, enemy, left, right, turn, lastMsg, lastColor, hover, flash) {
    const t = now();
    backdrop(t, dark(me.color, .25), [6, 12, 32]);
    text('МОРСКОЙ БОЙ', W / 2, 28, { size: 14, bold: true, color: MUTED, spacing: 4 });
    text(`Ход: ${me.name}`, W / 2, 58, { size: 28, bold: true, color: me.color });
    if (lastMsg) pill(lastMsg, 92, lastColor);

    // своё поле — корабли видны
    drawBoard(left, me.board, {
      showShips: true,
      accent: me.color,
      title: 'Ваш флот'
    });
    // поле врага — только выстрелы
    drawBoard(right, enemy.board, {
      showShips: false,
      accent: enemy.color,
      title: 'Поле соперника',
      hover: hover && enemy.board[hover[1]][hover[0]] < 2 ? hover : null
    });

    // счётчик живых кораблей
    text(`Кораблей: ${BS.remaining(me.board)}`, left.x0 + left.side / 2, left.y0 + left.side + 28, { size: 14, color: MUTED });
    text(`Кораблей: ${BS.remaining(enemy.board)}`, right.x0 + right.side / 2, right.y0 + right.side + 28, { size: 14, color: MUTED });

    hints([['ЛКМ', 'выстрел по правому полю'], ['ESC', 'в меню']]);
    updateFx(); drawFx();
  }

  // ---------- FLOW ----------
  {
    const r = await handoff(players[0].name, players[0].color, 'Расставьте свой флот. Соперник — отвернитесь!');
    if (r === 'menu') return 'menu';
  }
  {
    const r = await placePhase(players[0], 0);
    if (r === 'menu') return 'menu';
  }
  {
    const r = await handoff(players[1].name, players[1].color, 'Расставьте свой флот. Соперник — отвернитесь!');
    if (r === 'menu') return 'menu';
  }
  {
    const r = await placePhase(players[1], 1);
    if (r === 'menu') return 'menu';
  }
  return await battle();
}

async function battleship() {
  while (await battleshipMatch() === 'again');
}
