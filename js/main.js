'use strict';
const GAMES = [
  { n: 'Змейка', d: '2 игрока', c: [60, 220, 150], run: snake },
  { n: 'Монеты', d: '2-4 игрока', c: [255, 208, 84], run: coins },
  { n: 'Понг+', d: '2 игрока', c: [96, 214, 255], run: pong },
  { n: 'Танки', d: '2 игрока', c: [255, 140, 90], run: tanksGame },
  { n: 'Сумо', d: '2-4 игрока', c: [255, 107, 190], run: sumo },
  { n: 'Дуэль', d: 'реакция', c: [255, 96, 110], run: duel },
  { n: 'Виселица', d: 'слова', c: [170, 140, 255], run: hangmanLoop },
  { n: 'Wordle', d: '5-6 букв', c: [110, 232, 190], run: wordle },
  { n: 'Гонка', d: 'уклонение', c: [255, 60, 60], run: race },
  { n: 'Флаппи', d: 'прыжки', c: [255, 208, 84], run: flappy },
  { n: 'Арканоид', d: 'блоки', c: [130, 200, 255], run: arkanoid },
  { n: 'Космос', d: 'шутер', c: [200, 100, 255], run: shooter },
  { n: 'Пэкмен', d: 'лабиринт', c: [255, 220, 0], run: pacman },
  { n: 'Тетрис', d: 'классика', c: [150, 255, 100], run: tetris },
  { n: '2048', d: 'цифры', c: [250, 150, 50], run: game2048 },
  { n: 'Астероиды', d: 'космос', c: [180, 180, 200], run: asteroids },
  { n: 'Мемори', d: 'пары', c: [50, 255, 200], run: memoryGame },
  { n: 'Сапёр', d: 'мины', c: [255, 80, 80], run: mines },
  { n: 'Лягушка', d: 'дорога', c: [50, 200, 50], run: frogger },
  { n: 'Прыгун', d: 'вверх', c: [150, 200, 255], run: doodle }
];

const rect = i => {
    const c = i % 5, r = Math.floor(i / 5);
    return [(W - 900) / 2 + c * 185, 150 + r * 115, 160, 100];
};

async function menu() {
  let sel = 0, particles = [];
  for(let i=0; i<40; i++) particles.push({x:rnd(0,W), y:rnd(0,H), s:rnd(1.5,3.5), vx:rnd(-0.5,0.5), vy:rnd(-1, -0.2), c:pick([GOLD, [130,200,255], [255,100,200]])});
  
  for (;;) {
    applySize(); const t = now(), { keys, clicks } = pump();
    for (const e of keys) {
      if (is(e, 'ArrowRight', 'KeyD')) sel = (sel + 1) % 20; 
      if (is(e, 'ArrowLeft', 'KeyA')) sel = (sel + 19) % 20;
      if (is(e, 'ArrowDown', 'KeyS')) sel = (sel + 5) % 20; 
      if (is(e, 'ArrowUp', 'KeyW')) sel = (sel + 15) % 20;
      if (is(e, 'Enter', 'NumpadEnter', 'Space') && GAMES[sel].run) return GAMES[sel];
      if (is(e, 'KeyM')) STATE.mute = !STATE.mute;
    }
    for (const c of clicks) GAMES.forEach((gm, i) => { if (gm.run && inRect(c, rect(i))) { sel = i; gm.go = true; } });
    const go = GAMES.find(x => x.go); if (go) { go.go = false; return go; }
    GAMES.forEach((gm, i) => { if (inRect(mouse, rect(i))) sel = i; });
    
    // Dynamic BG
    backdrop(t, [15, 18, 30], [5, 8, 15]);
    particles.forEach(p => {
       p.x += p.vx; p.y += p.vy;
       if(p.x < 0) p.x = W; if(p.x > W) p.x = 0;
       if(p.y < 0) p.y = H; if(p.y > H) p.y = 0;
       glow(p.x, p.y, p.s*5, p.c); disc(p.x, p.y, p.s, WHITE);
    });
    
    // Dynamic Glitch Title
    const title = 'АРКАДА';
    g.font = `900 68px ${FF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = W/2, cy = 60, off = Math.sin(t/150)*3;
    g.fillStyle = 'rgba(0, 255, 255, 0.7)'; g.fillText(title, cx - off, cy);
    g.fillStyle = 'rgba(255, 0, 255, 0.7)'; g.fillText(title, cx + off, cy);
    g.fillStyle = css(WHITE); g.fillText(title, cx, cy);
    
    text('20 ИГР • 2027 EDITION', W / 2, 110, { size: 16, color: [200, 220, 255], bold: true, spacing: 6 });
    
    GAMES.forEach((gm, i) => {
      const r_box = rect(i), on = sel === i, y = r_box[1] - (on ? 6 : 0), off_s = !gm.run;
      const x = r_box[0], w = r_box[2], h = r_box[3];
      
      // Modern glassmorphism card
      panel(x, y, w, h, { fill: on ? `rgba(255,255,255,0.15)` : `rgba(255,255,255,0.06)`, stroke: css(gm.c, off_s ? .15 : on ? .9 : .4), r: 16, lw: on ? 3 : 1.5 });
      const mx = x + w / 2;
      glow(mx, y + 35, on ? 60 : 30, dark(gm.c, off_s ? .1 : (on ? .6 : .4))); 
      disc(mx, y + 35, 18, off_s ? GRAY : gm.c);
      
      text(String(i + 1), mx, y + 36, { size: 18, bold: true, color: [14, 16, 30] });
      text(gm.n, mx, y + 70, { size: 19, bold: true, color: off_s ? FAINT : WHITE }); 
      text(gm.d, mx, y + 88, { size: 13, color: off_s ? FAINT : [180, 190, 210] });
    });
    
    hints([['WASD / Стрелки', 'выбор'], ['Enter / Мышь', 'запуск'], ['M', STATE.mute ? 'вкл звук' : 'выкл звук'], ['F11', 'фуллскрин']], H - 25);
    await present();
  }
}
(async () => { for (;;) { const gm = await menu(); await gm.run(); FX.reset(); } })();
