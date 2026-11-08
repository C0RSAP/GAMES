'use strict';
// ===== Меню и запуск =====
const GAMES = [
  { n: 'Змейка', d: '2 игрока, бонусы', c: [60, 220, 150], run: snake },
  { n: 'Сбор монет', d: '2-4 игрока', c: [255, 208, 84], run: coins },
  { n: 'Понг+', d: '2 игрока, бонусы', c: [96, 214, 255], run: pong },
  { n: 'Танки', d: '2 игрока, бонусы', c: [255, 140, 90], run: tanksGame },
  { n: 'Сумо-арена', d: '2-4 игрока', c: [255, 107, 190], run: sumo },
  { n: 'Дуэль', d: 'кто быстрее', c: [255, 96, 110], run: duel },
  { n: 'Виселица', d: '1 или 2 игрока', c: [170, 140, 255], run: hangmanLoop },
  { n: 'Wordle', d: '5 или 6 букв', c: [110, 232, 190], run: wordle },
];
const rect = i => [50 + (i % 4) * 220, 170 + (i / 4 | 0) * 190, 200, 170];
async function menu() {
  let sel = 0;
  for (;;) {
    const t = now(), { keys, clicks } = pump();
    for (const e of keys) {
      const d = e.code.match(/^(?:Digit|Numpad)([1-8])$/);
      if (d && GAMES[d[1] - 1].run) return GAMES[d[1] - 1];
      if (is(e, 'ArrowRight')) sel = (sel + 1) % 8; if (is(e, 'ArrowLeft')) sel = (sel + 7) % 8;
      if (is(e, 'ArrowDown')) sel = (sel + 4) % 8; if (is(e, 'ArrowUp')) sel = (sel + 4) % 8;
      if (is(e, 'Enter', 'NumpadEnter') && GAMES[sel].run) return GAMES[sel];
      if (is(e, 'KeyM')) STATE.mute = !STATE.mute;
    }
    for (const c of clicks) GAMES.forEach((gm, i) => { if (gm.run && inRect(c, rect(i))) { sel = i; gm.go = true; } });
    const go = GAMES.find(x => x.go); if (go) { go.go = false; return go; }
    GAMES.forEach((gm, i) => { if (inRect(mouse, rect(i))) sel = i; });
    backdrop(t);
    text('АРКАДА', W / 2, 70, { size: 62, bold: true, color: GOLD }); text('8 игр на одном компьютере', W / 2, 122, { size: 19, color: MUTED });
    GAMES.forEach((gm, i) => {
      const [x, y0, w, h] = rect(i), on = sel === i, y = y0 - (on ? 4 : 0), off = !gm.run;
      panel(x, y, w, h, { fill: `rgba(255,255,255,${on ? .09 : .05})`, stroke: css(gm.c, off ? .15 : on ? .85 : .35), r: 24, lw: 2 });
      glow(x + w / 2, y + 62, 60, dark(gm.c, off ? .12 : .3)); disc(x + w / 2, y + 62, 26, off ? GRAY : gm.c);
      text(String(i + 1), x + w / 2, y + 62, { size: 26, bold: true, color: [14, 16, 30] });
      text(gm.n, x + w / 2, y + 118, { size: 26, bold: true, color: off ? FAINT : INK }); text(gm.d, x + w / 2, y + 146, { size: 15, color: off ? FAINT : MUTED });
    });
    hints([['1-8', 'выбрать'], ['← ↑ → ↓', 'навигация'], ['Enter', 'играть'], ['M', STATE.mute ? 'включить звук' : 'выключить звук']]);
    await present();
  }
}
(async () => { for (;;) { const gm = await menu(); await gm.run(); FX.reset(); } })();
