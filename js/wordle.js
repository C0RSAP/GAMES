'use strict';
// ===== 8. Wordle (5 или 6 букв, слова не повторяются — хранятся в localStorage) =====
const BLOCKED = new Set(['оргазм', 'пиндос', 'параша', 'нацмен', 'похоть']);
const SECRET = { 5: WORDS5.filter(w => !BLOCKED.has(w)), 6: WORDS6.filter(w => !BLOCKED.has(w)) };
const VOCAB = { 5: new Set(WORDS5), 6: new Set(WORDS6) };
const loadUsed = () => { try { const d = JSON.parse(localStorage.getItem('wordle_used')) || {}; return { 5: new Set(d[5] || []), 6: new Set(d[6] || []) }; } catch (_) { return { 5: new Set(), 6: new Set() }; } };
const saveUsed = u => { try { localStorage.setItem('wordle_used', JSON.stringify({ 5: [...u[5]], 6: [...u[6]] })); } catch (_) { } };
function freshWord(n) {
  const u = loadUsed(); let pool = SECRET[n].filter(w => !u[n].has(w));
  if (!pool.length) { u[n].clear(); pool = SECRET[n]; }
  const w = pick(pool); u[n].add(w); saveUsed(u); return w;
}
const KB = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
const WC = { green: GREEN, yellow: YELLOW, gray: GRAY };

async function wordle() {
  FX.reset();
  const u = loadUsed(), fresh = n => SECRET[n].filter(w => !u[n].has(w)).length, ACC = [110, 232, 190];
  const cards = [[5, [W / 2 - 250, 210, 230, 170]], [6, [W / 2 + 20, 210, 230, 170]]];
  let len = null;
  while (!len) {
    const { keys, clicks } = pump();
    for (const e of keys) { if (is(e, 'Escape')) return; if (is(e, 'Digit5', 'Numpad5')) len = 5; if (is(e, 'Digit6', 'Numpad6')) len = 6; }
    for (const c of clicks) for (const [n, r] of cards) if (inRect(c, r)) len = n;
    backdrop(now(), [20, 80, 70], [30, 40, 110]);
    text('WORDLE', W / 2, 110, { size: 112, bold: true, color: ACC }); text('Выбери длину слова', W / 2, 180, { size: 26, bold: true });
    for (const [n, r] of cards) {
      const hov = inRect(mouse, r), y = r[1] - (hov ? 4 : 0);
      panel(r[0], y, r[2], r[3], { fill: `rgba(255,255,255,${hov ? .09 : .05})`, stroke: css(ACC, hov ? .82 : .31), r: 26, lw: 2 });
      text(String(n), r[0] + r[2] / 2, y + 72, { size: 112, bold: true }); text('букв', r[0] + r[2] / 2, y + 128, { size: 26, bold: true, color: MUTED });
    }
    text(`Новых слов осталось: ${fresh(5)} из ${SECRET[5].length} (5 букв), ${fresh(6)} из ${SECRET[6].length} (6 букв)`, W / 2, 430, { size: 15, color: FAINT });
    text('Использованные слова запоминаются в браузере', W / 2, 456, { size: 15, color: FAINT });
    hints([['5 6', 'выбрать'], ['ESC', 'назад']]); await present();
  }
  const secret = freshWord(len), TRIES = 6, CELL = 54, GAP = 6;
  const grid = Array.from({ length: TRIES }, () => Array(len).fill('')), marks = Array(TRIES).fill(null), status = {};
  const S = { row: 0, col: 0, msg: '', until: 0, shakeUntil: 0 };
  const gx = (W - (len * CELL + (len - 1) * GAP)) / 2, gy = 58;
  const toast = (m, t) => { S.msg = m; S.until = t + 1700; };
  function check(guess) {
    const res = Array(len).fill('gray'), left = {};
    for (const c of secret) left[c] = (left[c] || 0) + 1;
    for (let i = 0; i < len; i++) if (guess[i] === secret[i]) { res[i] = 'green'; left[guess[i]]--; }
    for (let i = 0; i < len; i++) if (res[i] === 'gray' && (left[guess[i]] || 0) > 0) { res[i] = 'yellow'; left[guess[i]]--; }
    return res;
  }
  function draw(t) {
    backdrop(t, [20, 80, 70], [30, 40, 110]); text('WORDLE', W / 2, 30, { size: 26, bold: true, color: ACC });
    for (let r = 0; r < TRIES; r++) {
      const sh = (r === S.row && t < S.shakeUntil) ? Math.sin(t / 22) * 6 : 0;
      for (let c = 0; c < len; c++) {
        const x = gx + c * (CELL + GAP) + sh, y = gy + r * (CELL + GAP), m = marks[r] && marks[r][c], ch = grid[r][c];
        if (m) panel(x, y, CELL, CELL, { fill: css(WC[m]), stroke: null, r: 8 });
        else panel(x, y, CELL, CELL, { fill: 'rgba(255,255,255,.05)', stroke: ch ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.16)', r: 8, lw: 2 });
        if (ch) text(ch.toUpperCase(), x + CELL / 2, y + CELL / 2 + 1, { size: 30, bold: true });
      }
    }
    const ky = 440;
    KB.forEach((row, i) => { const x0 = (W - (row.length * 45 - 5)) / 2; [...row].forEach((ch, j) => {
      const st = status[ch]; panel(x0 + j * 45, ky + i * 47, 40, 42, { fill: st ? css(WC[st]) : 'rgba(255,255,255,.09)', stroke: null, r: 8 });
      text(ch.toUpperCase(), x0 + j * 45 + 20, ky + i * 47 + 21, { size: 17, bold: true });
    }); });
    if (t < S.until) pill(S.msg, 420 - 10, GOLD);
    hints([['Enter', 'отправить'], ['⌫', 'стереть'], ['ESC', 'в меню']], H - 34);
  }
  for (;;) {
    const t = now();
    for (const e of pump().keys) {
      if (is(e, 'Escape')) return;
      if (is(e, 'Backspace')) { if (S.col > 0) grid[S.row][--S.col] = ''; continue; }
      if (is(e, 'Enter', 'NumpadEnter')) {
        if (S.col < len) { toast('Не хватает букв', t); S.shakeUntil = t + 400; sfx('bad'); continue; }
        const guess = grid[S.row].join('');
        if (!VOCAB[len].has(guess)) { toast('Нет такого слова', t); S.shakeUntil = t + 400; sfx('bad'); continue; }
        const res = check(guess); marks[S.row] = res;
        res.forEach((m, i) => { const ch = guess[i], o = status[ch]; if (!o || (o === 'gray') || (o === 'yellow' && m === 'green')) status[ch] = m; });
        sfx('hit'); const won = guess === secret; S.row++; S.col = 0;
        if (won || S.row === TRIES) {
          await finishAnim(draw, 30);
          const r = await endScreen(won ? 'Угадано!' : 'Не угадал', won ? [`Слово: ${secret.toUpperCase()}`, `Попыток: ${S.row} из ${TRIES}`] : [`Слово было: ${secret.toUpperCase()}`], won ? GREEN : RED);
          return r === 'again' ? wordle() : undefined;
        }
        continue;
      }
      const ch = ruLetter(e); if (ch && S.col < len) grid[S.row][S.col++] = ch;
    }
    draw(t); await present();
  }
}
