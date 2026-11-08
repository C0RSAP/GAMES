'use strict';
// ===== 7. Виселица (против компьютера или вдвоём) =====
const KB_ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
const KB_COL = { none: [46, 50, 82], green: GREEN, yellow: YELLOW, gray: [26, 28, 46], red: [150, 52, 72] };
function drawKeyboard(top, status, kw = 40, kh = 42, gap = 5) { // возвращает {буква: [x,y,w,h]} для кликов
  const rects = {};
  KB_ROWS.forEach((row, ri) => {
    let x = (W - (row.length * kw + gap * (row.length - 1))) / 2; const y = top + ri * (kh + gap);
    for (const ch of row) {
      const r = [x, y, kw, kh], st = status[ch]; rects[ch] = r;
      let col = KB_COL[st || 'none']; if (inRect(mouse, r)) col = light(col, 18);
      panel(x, y, kw, kh, { fill: css(col), stroke: null, r: 9 }); text(ch.toUpperCase(), x + kw / 2, y + kh / 2, { size: 17, bold: true, color: st === 'gray' ? MUTED : INK });
      x += kw + gap;
    }
  });
  return rects;
}
async function hangman() {
  FX.reset(); let mode = null; const BG = [[70, 44, 130], [20, 50, 100]], VIO = [200, 170, 255];
  const cards = [[1, [W / 2 - 400, 220, 380, 190], 'Компьютер загадывает', 'Играй один против словаря', [120, 230, 170]], [2, [W / 2 + 20, 220, 380, 190], 'Два игрока', 'Один загадывает, другой отгадывает', [130, 180, 255]]];
  while (!mode) {
    const { keys, clicks } = pump();
    for (const e of keys) { if (is(e, 'Escape')) return 'menu'; if (is(e, 'Digit1', 'Numpad1')) mode = 1; if (is(e, 'Digit2', 'Numpad2')) mode = 2; }
    for (const c of clicks) for (const [n, r] of cards) if (inRect(c, r)) mode = n;
    backdrop(now(), ...BG); text('ВИСЕЛИЦА', W / 2, 110, { size: 62, bold: true, color: VIO }); text('Выбери режим', W / 2, 170, { size: 26, bold: true });
    for (const [, r, title, sub, col] of cards) {
      const hov = inRect(mouse, r), y = r[1] - (hov ? 4 : 0), n = cards.find(c => c[1] === r)[0];
      panel(r[0], y, r[2], r[3], { fill: `rgba(255,255,255,${hov ? .09 : .05})`, stroke: css(col, hov ? .82 : .31), r: 26, lw: 2 });
      text(String(n), r[0] + r[2] / 2, y + 70, { size: 112, bold: true, color: col }); text(title, r[0] + r[2] / 2, y + 132, { size: 26, bold: true }); text(sub, r[0] + r[2] / 2, y + 162, { size: 15, color: MUTED });
    }
    hints([['1 2', 'выбрать'], ['ESC', 'назад']]); await present();
  }
  let word = null;
  if (mode === 2) {
    let buf = '', hide = true, toast = 0;
    while (!word) {
      const t = now();
      for (const e of pump().keys) {
        if (is(e, 'Escape')) return 'menu';
        if (is(e, 'Enter', 'NumpadEnter')) { if (buf.length >= 3 && buf.length <= 12) word = buf; else { toast = t + 1800; sfx('bad'); } }
        else if (is(e, 'Backspace')) buf = buf.slice(0, -1); else if (is(e, 'Tab')) hide = !hide;
        else { const ch = ruLetter(e); if (ch && buf.length < 12) buf += ch; }
      }
      backdrop(t, ...BG); text('Игрок 1 загадывает слово', W / 2, 130, { size: 38, bold: true }); text('Второй игрок — отвернись!', W / 2, 178, { color: MUTED });
      const n = Math.max(buf.length, 1), sw = Math.min(58, (W - 200 - 8 * (n - 1)) / n), x0 = (W - (n * sw + 8 * (n - 1))) / 2;
      for (let i = 0; i < n; i++) { panel(x0 + i * (sw + 8), 270, sw, sw + 10, { fill: 'rgba(255,255,255,.06)', stroke: css(VIO, .47), r: 12, lw: 2 }); if (i < buf.length) text(hide ? '•' : buf[i].toUpperCase(), x0 + i * (sw + 8) + sw / 2, 270 + (sw + 10) / 2, { size: 38, bold: true, color: GOLD }); }
      text(`${buf.length} из 12 (минимум 3). Только русские буквы`, W / 2, 380, { color: MUTED });
      if (t < toast) pill('Нужно от 3 до 12 букв', 430, RED);
      hints([['Enter', 'готово'], ['Tab', 'показать / скрыть'], ['ESC', 'назад']]); await present();
    }
    for (let wait = true; wait;) {
      for (const e of pump().keys) { if (is(e, 'Escape')) return 'menu'; if (is(e, 'Space', 'Enter', 'NumpadEnter')) wait = false; }
      backdrop(now(), ...BG); text('Слово загадано!', W / 2, 240, { size: 62, bold: true, color: GOLD }); text('Передай клавиатуру отгадывающему', W / 2, 320, { size: 26, bold: true });
      hints([['Пробел', 'начать']], 400); await present();
    }
  } else word = pick(pick([SECRET[5], SECRET[6]]));
  const LETTERS = 'абвгдежзийклмнопрстуфхцчшщъыьэюя', MAX = 7, guessed = new Set(), S = { wrong: 0, state: 'play' }, PX = 40, PY = 70;
  let kb = {};
  const guess = ch => {
    if (S.state !== 'play' || guessed.has(ch) || !LETTERS.includes(ch)) return; guessed.add(ch);
    if (!word.includes(ch)) { S.wrong++; sfx('bad'); FX.shake = 6; if (S.wrong >= MAX) { S.state = 'lose'; sfx('boom'); } }
    else { sfx('coin'); if ([...word].every(c => guessed.has(c))) { S.state = 'win'; sfx('bonus'); burst(685, 170, GOLD, 40, 6); } }
  };
  function gallows(w) {
    const wood = [186, 146, 104], body = [238, 208, 176], p = (x, y) => [PX + x, PY + y];
    ln(...p(30, 370), ...p(350, 370), [70, 60, 90], 6);
    const parts = [() => ln(...p(90, 370), ...p(90, 50), wood, 7), () => { ln(...p(90, 50), ...p(250, 50), wood, 7); ln(...p(90, 100), ...p(140, 50), wood, 5); }, () => ln(...p(250, 50), ...p(250, 95), wood, 4),
      () => { g.strokeStyle = css(body); g.lineWidth = 4; g.beginPath(); g.arc(PX + 250, PY + 122, 27, 0, 6.283); g.stroke(); }, () => ln(...p(250, 149), ...p(250, 255), body, 5),
      () => { ln(...p(250, 175), ...p(205, 225), body, 5); ln(...p(250, 175), ...p(295, 225), body, 5); }, () => { ln(...p(250, 255), ...p(212, 330), body, 5); ln(...p(250, 255), ...p(288, 330), body, 5); }];
    for (let i = 0; i < Math.min(w, parts.length); i++) parts[i]();
  }
  for (;;) {
    const t = now(), { keys, clicks } = pump();
    for (const e of keys) { if (is(e, 'Escape')) return 'menu'; if (S.state !== 'play') { if (is(e, 'KeyR', 'Enter', 'NumpadEnter')) return 'again'; continue; } const ch = ruLetter(e); if (ch) guess(ch); }
    for (const c of clicks) if (S.state === 'play') for (const [ch, r] of Object.entries(kb)) if (inRect(c, r)) guess(ch);
    backdrop(t, ...BG); panel(PX, PY, 380, 404, { fill: 'rgba(255,255,255,.05)', stroke: 'rgba(255,255,255,.16)', r: 26 }); gallows(S.wrong);
    text(mode === 1 ? 'против компьютера' : 'два игрока', 685, 92, { size: 15, color: MUTED });
    const n = word.length, sw = Math.min(56, (470 - 8 * (n - 1)) / n), x0 = 450 + (470 - (n * sw + 8 * (n - 1))) / 2;
    [...word].forEach((c, i) => {
      const x = x0 + i * (sw + 8), miss = S.state === 'lose' && !guessed.has(c);
      panel(x, 140, sw, sw + 12, { fill: 'rgba(255,255,255,.06)', stroke: css(VIO, .43), r: 12, lw: 2 });
      if (guessed.has(c) || S.state === 'lose') text(c.toUpperCase(), x + sw / 2, 140 + (sw + 12) / 2, { size: 38, bold: true, color: miss ? RED : INK });
    });
    for (let i = 0; i < MAX; i++) disc(685 - (MAX - 1) * 14 + i * 28, 250, 7, i < S.wrong ? RED : [50, 54, 86]);
    text(`Ошибки: ${S.wrong} / ${MAX}`, 685, 282, { color: MUTED });
    const status = {}; for (const c of guessed) status[c] = word.includes(c) ? 'green' : 'red';
    kb = drawKeyboard(486, status, 36, 40, 5);
    if (S.state === 'play') text('Жми буквы на клавиатуре или мышью', 685, 330, { size: 15, color: FAINT });
    else { text(S.state === 'win' ? 'ПОБЕДА!' : 'ПРОИГРЫШ', 685, 350, { size: 62, bold: true, color: S.state === 'win' ? GREEN : RED, shadow: true }); hints([['R', 'ещё раз'], ['ESC', 'меню']], 400); }
    updateFx(); drawFx(); await present();
  }
}
async function hangmanLoop() { while (await hangman() === 'again'); }
