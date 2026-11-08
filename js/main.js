'use strict';
const GAMES = [
  { n: 'Змейка', d: 'Классика, 2 игр.', c: [60, 220, 150], run: snake },
  { n: 'Монеты', d: 'Сбор, 2-4 игр.', c: [255, 208, 84], run: coins },
  { n: 'Понг+', d: 'Ракетки, 2 игр.', c: [96, 214, 255], run: pong },
  { n: 'Танки', d: 'Война, 2 игр.', c: [255, 140, 90], run: tanksGame },
  { n: 'Сумо', d: 'Арена, 2-4 игр.', c: [255, 107, 190], run: sumo },
  { n: 'Дуэль', d: 'На реакцию', c: [255, 96, 110], run: duel },
  { n: 'Виселица', d: 'Угадай слово', c: [170, 140, 255], run: hangmanLoop },
  { n: 'Wordle', d: 'Слова 5-6 букв', c: [110, 232, 190], run: wordle },
  { n: 'Гонка', d: 'Синтвейв раннер', c: [255, 60, 150], run: race },
  { n: 'Флаппи', d: 'Прыгающий куб', c: [255, 208, 84], run: flappy },
  { n: 'Арканоид', d: 'Разбей блоки', c: [130, 200, 255], run: arkanoid },
  { n: 'Космос', d: 'Отстрел', c: [200, 100, 255], run: shooter },
  { n: 'Пэкмен', d: 'Лабиринт', c: [255, 220, 0], run: pacman },
  { n: 'Тетрис', d: 'Падающие блоки', c: [150, 255, 100], run: tetris },
  { n: '2048', d: 'Слияние цифр', c: [250, 150, 50], run: game2048 },
  { n: 'Астероиды', d: 'Космо-шутер', c: [0, 255, 255], run: asteroids },
  { n: 'Мемори', d: 'Найди пары', c: [50, 255, 200], run: memoryGame },
  { n: 'Сапёр', d: 'Минное поле', c: [255, 80, 80], run: mines },
  { n: 'Лягушка', d: 'Переход дороги', c: [50, 200, 50], run: frogger },
  { n: 'Прыгун', d: 'Прыжки вверх', c: [150, 200, 255], run: doodle }
];

const rect = i => {
    const c = i % 5, r = Math.floor(i / 5);
    return [W/2 - 430 + c * 175, 150 + r * 110, 160, 95];
};

async function menu() {
  let sel = 0, bgParticles = [], waveOffset = 0;
  
  for(let i=0; i<80; i++) {
      bgParticles.push({
          x: rnd(0, W), y: rnd(0, H), 
          z: rnd(0.1, 1.5), 
          c: pick([[0, 255, 255], [255, 0, 255], [255, 255, 0], [0, 255, 100]])
      });
  }
  
  for (;;) {
    applySize(); const t = now(), { keys, clicks } = pump();
    
    for (const e of keys) {
      if (is(e, 'ArrowRight', 'KeyD')) { sel = (sel + 1) % 20; sfx('beep'); }
      if (is(e, 'ArrowLeft', 'KeyA')) { sel = (sel + 19) % 20; sfx('beep'); }
      if (is(e, 'ArrowDown', 'KeyS')) { sel = (sel + 5) % 20; sfx('beep'); }
      if (is(e, 'ArrowUp', 'KeyW')) { sel = (sel + 15) % 20; sfx('beep'); }
      if (is(e, 'Enter', 'NumpadEnter', 'Space') && GAMES[sel].run) return GAMES[sel];
      if (is(e, 'KeyM')) STATE.mute = !STATE.mute;
    }
    
    for (const c of clicks) GAMES.forEach((gm, i) => { if (gm.run && inRect(c, rect(i))) { sel = i; gm.go = true; } });
    const go = GAMES.find(x => x.go); if (go) { go.go = false; return go; }
    
    let mouseHovered = false;
    GAMES.forEach((gm, i) => { if (inRect(mouse, rect(i))) { if (sel !== i) sfx('beep'); sel = i; mouseHovered = true; } });
    
    // 1. ДИМИНАЧНЫЙ ФОН: Глубокий градиент
    const bgGrad = g.createRadialGradient(W/2, H/2, 0, W/2, H/2, W);
    bgGrad.addColorStop(0, '#100820');
    bgGrad.addColorStop(0.5, '#050410');
    bgGrad.addColorStop(1, '#000000');
    g.fillStyle = bgGrad; g.fillRect(0, 0, W, H);
    
    // 2. ДИНАМИЧНЫЙ ФОН: Перспективная неоновая сетка (Ретровейв стайл)
    waveOffset = (waveOffset + 1.5) % 40;
    g.strokeStyle = 'rgba(0, 255, 255, 0.15)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= W; i += 60) {
        g.moveTo(W/2, H/2 + 20); 
        g.lineTo(i - W/2 + W/2, H); 
    }
    for (let i = H/2 + 20; i <= H + 40; i += 40) {
        let y = i + (waveOffset * ((i - H/2) / 200)); 
        if (y > H/2 + 20) {
            g.moveTo(0, y); g.lineTo(W, y);
        }
    }
    g.stroke();

    // 3. ДИНАМИЧНЫЙ ФОН: Летящие на нас звезды / частицы
    bgParticles.forEach(p => {
        p.z += 0.01; 
        if (p.z > 2) { p.z = 0.1; p.x = rnd(0, W); p.y = rnd(0, H); }
        let px = (p.x - W/2) * p.z + W/2;
        let py = (p.y - H/2) * p.z + H/2;
        let s = p.z * 2;
        if (px > 0 && px < W && py > 0 && py < H) {
            glow(px, py, s*4, p.c);
            g.fillStyle = '#fff'; g.fillRect(px, py, s, s);
        }
    });
    
    const cx = W/2, cy = 60;
    
    // 4. ЗАГОЛОВОК: Супер-яркий хромированный неон с пульсацией
    const pulse = 1 + Math.sin(t/150) * 0.05;
    g.save();
    g.translate(cx, cy);
    g.scale(pulse, pulse);
    
    const title = 'A R C A D E';
    g.font = `900 52px "Arial Black", impact, sans-serif`; 
    g.textAlign = 'center'; g.textBaseline = 'middle';
    
    // Внешнее свечение
    glow(0, 0, 100, [0, 255, 255]);
    glow(0, 0, 50, [255, 0, 255]);
    
    // Неоновые отблески (Снизу розовый, сверху голубой)
    g.fillStyle = 'rgba(255, 0, 255, 0.8)'; g.fillText(title, 2, 2);
    g.fillStyle = 'rgba(0, 255, 255, 0.8)'; g.fillText(title, -2, -2);
    
    // Хромированный градиент самого текста
    const textGrad = g.createLinearGradient(0, -25, 0, 25);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.4, '#a0d8ef');
    textGrad.addColorStop(0.5, '#000000'); // Резкий переход для эффекта металла
    textGrad.addColorStop(0.55, '#ff80ff');
    textGrad.addColorStop(1, '#ffffff');
    
    g.fillStyle = textGrad; 
    g.fillText(title, 0, 0);
    g.restore();
    
    text('20 EXCLUSIVE GAMES • 2027 EDITION', cx, 120, { size: 14, color: [200, 255, 255], bold: true, spacing: 6, shadow: true });
    
    // 5. КАРТОЧКИ ИГР: Неоновый контур, который бегает при наведении
    GAMES.forEach((gm, i) => {
      const r_box = rect(i), on = sel === i, y = r_box[1] - (on ? 6 : 0), off_s = !gm.run;
      const x = r_box[0], w = r_box[2], h = r_box[3];
      const mx = x + w / 2;
      
      g.save();
      // Заливка карточки
      g.beginPath(); g.roundRect(x, y, w, h, 12);
      g.fillStyle = on ? 'rgba(30, 40, 60, 0.8)' : 'rgba(10, 15, 25, 0.6)';
      g.fill();
      
      if (on) {
          glow(mx, y + h/2, 80, gm.c); // Мощное свечение под выбранной игрой
          
          // Бегающий неоновый контур (Анимация)
          g.lineWidth = 3;
          const dashOffset = -t / 15;
          g.setLineDash([30, 30]);
          g.lineDashOffset = dashOffset;
          g.strokeStyle = css(gm.c);
          g.stroke();
          g.setLineDash([]); // Сброс
      } else {
          g.lineWidth = 1;
          g.strokeStyle = css(gm.c, off_s ? 0.1 : 0.3);
          g.stroke();
      }
      g.restore();
      
      // Иконка / Номер
      glow(mx, y + 30, on ? 50 : 20, dark(gm.c, off_s ? .1 : (on ? .8 : .4))); 
      disc(mx, y + 30, 16, off_s ? GRAY : gm.c);
      text(String(i + 1), mx, y + 31, { size: 16, bold: true, color: [10, 10, 15] });
      
      // Текст
      text(gm.n, mx, y + 65, { size: 18, bold: true, color: on ? WHITE : [180,180,190], shadow: on }); 
      text(gm.d, mx, y + 82, { size: 12, color: on ? [220,255,255] : [100,110,130] });
    });
    
    hints([['WASD / Стрелки', 'Навигация'], ['Enter / ЛКМ', 'Играть'], ['M', STATE.mute ? 'Вкл звук' : 'Выкл звук'], ['F11', 'На весь экран']], H - 25);
    await present();
  }
}
(async () => { for (;;) { const gm = await menu(); await gm.run(); FX.reset(); } })();
