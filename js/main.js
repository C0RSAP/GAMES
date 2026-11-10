'use strict';
const GAMES = [
  { n: 'Понг+', d: 'Ракетки, 2 игр.', c: [96, 214, 255], run: pong },
  { n: 'Сумо', d: 'Арена, 2-4 игр.', c: [255, 107, 190], run: sumo },
  { n: 'Дуэль', d: 'На реакцию', c: [255, 96, 110], run: duel },
  { n: 'Виселица', d: 'Угадай слово', c: [170, 140, 255], run: hangmanLoop },
  { n: 'Wordle', d: 'Слова 5-6 букв', c: [110, 232, 190], run: wordle },
  { n: 'Гонка', d: 'Синтвейв раннер', c: [255, 60, 150], run: race },
  { n: 'Флаппи', d: 'Прыгающий куб', c: [255, 208, 84], run: flappy },
  { n: 'Пэкмен', d: 'Лабиринт', c: [255, 220, 0], run: pacman },
  { n: 'Сапёр', d: 'Минное поле', c: [255, 80, 80], run: mines },
  { n: 'Бильярд', d: '8-ball, 1-2 игр.', c: [96, 214, 150], run: billiards },
  { n: 'Слоты', d: 'Демо, монеты', c: [255, 90, 160], run: slots },
  { n: 'Морской бой', d: 'Флот, 2 игрока', c: [70, 180, 255], run: battleship },
  { n: 'Крестики', d: '3×3 / 5×5, ИИ', c: [255, 200, 100], run: tictactoe }
];
// Подбираем число колонок так, чтобы сетка была ровной (без одной «висящей» карточки)
const COLS = (() => {
  const n = GAMES.length;
  if (n <= 6) return n;
  if (n <= 8) return 4;
  if (n <= 10) return 5;
  if (n <= 12) return 4;
  if (n <= 15) return 5; // 13 → 5+5+3
  return 6;
})();

const rect = i => {
    const N = GAMES.length;
    const rows = Math.ceil(N / COLS);
    const r = Math.floor(i / COLS);
    const inRow = (r === rows - 1) ? (N - r * COLS) : COLS;
    const c = i % COLS;

    // Карточки чуть компактнее при 5 колонках, с равномерными отступами
    const cardW = COLS >= 5 ? 168 : 190;
    const cardH = COLS >= 5 ? 100 : 108;
    const gapX = COLS >= 5 ? 16 : 20;
    const gapY = 18;

    const rowW = inRow * cardW + (inRow - 1) * gapX;
    const x0 = W / 2 - rowW / 2;
    const totalH = rows * cardH + (rows - 1) * gapY;
    // Сетка по вертикали между заголовком (~130) и подсказками (~H-40)
    const top = 140, bottom = H - 50;
    const y0 = top + Math.max(0, (bottom - top - totalH) / 2);
    return [x0 + c * (cardW + gapX), y0 + r * (cardH + gapY), cardW, cardH];
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
      const N = GAMES.length;
      if (is(e, 'ArrowRight', 'KeyD')) { sel = (sel + 1) % N; sfx('beep'); }
      if (is(e, 'ArrowLeft', 'KeyA')) { sel = (sel + N - 1) % N; sfx('beep'); }
      if (is(e, 'ArrowDown', 'KeyS')) { sel = sel + COLS < N ? sel + COLS : sel % COLS; sfx('beep'); }
      if (is(e, 'ArrowUp', 'KeyW')) { let n = sel - COLS; if (n < 0) { n = sel; while (n + COLS < N) n += COLS; } sel = n; sfx('beep'); }
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
    
    text('13 EXCLUSIVE GAMES • 2027 EDITION', cx, 120, { size: 14, color: [200, 255, 255], bold: true, spacing: 6, shadow: true });
    
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
      const iy = y + Math.round(r_box[3] * 0.32);
      glow(mx, iy, on ? 50 : 20, dark(gm.c, off_s ? .1 : (on ? .8 : .4)));
      disc(mx, iy, 16, off_s ? GRAY : gm.c);
      text(String(i + 1), mx, iy + 1, { size: 15, bold: true, color: [10, 10, 15] });
      
      // Текст
      text(gm.n, mx, y + Math.round(r_box[3] * 0.68), { size: 18, bold: true, color: on ? WHITE : [180,180,190], shadow: on });
      text(gm.d, mx, y + Math.round(r_box[3] * 0.88), { size: 12, color: on ? [220,255,255] : [100,110,130] });
    });
    
    hints([['WASD / Стрелки', 'Навигация'], ['Enter / ЛКМ', 'Играть'], ['M', STATE.mute ? 'Вкл звук' : 'Выкл звук'], ['F11', 'На весь экран']], H - 25);
    await present();
  }
}
(async () => { for (;;) { const gm = await menu(); await gm.run(); FX.reset(); } })();
