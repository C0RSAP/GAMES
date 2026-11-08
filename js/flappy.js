'use strict';
async function flappyMatch() {
  FX.reset();
  let y = H / 2, vy = 0, pipes = [], score = 0, frames = 0, over = false;
  
  const drawBg = (t) => backdrop(t, [50, 140, 220], [30, 80, 150]);
  if (!await countdown(drawBg)) return 'menu';

  for (;;) {
    const t = now(), { keys } = pump();
    for (const e of keys) {
      if (is(e, 'Escape')) return 'menu';
      if (!over && (is(e, 'Space') || is(e, 'ArrowUp') || is(e, 'KeyW') || is(e, 'Enter', 'NumpadEnter'))) { vy = -9.5; sfx('beep'); burst(215, y + 15, WHITE, 5, 2, 15, 2); }
    }
    
    if (!over) {
      vy += 0.55;
      y += vy;
      if (frames % 100 === 0) {
        let gap = 200 - Math.min(100, score * 3);
        let pY = rnd(50, H - gap - 50);
        pipes.push({ x: W, y: pY, gap: gap, passed: false });
      }
      if (y > H || y < -30) over = true;
    }
    
    drawBg(t);
    
    for (let i = pipes.length - 1; i >= 0; i--) {
      let p = pipes[i];
      if (!over) p.x -= 4.5;
      
      const pW = 70;
      panel(p.x, 0, pW, p.y, { fill: css(GREEN), r: 4, stroke: css(dark(GREEN, 0.5)) });
      panel(p.x - 5, p.y - 20, pW + 10, 20, { fill: css(light(GREEN, 20)), r: 4 });
      
      panel(p.x, p.y + p.gap, pW, H - p.y - p.gap, { fill: css(GREEN), r: 4, stroke: css(dark(GREEN, 0.5)) });
      panel(p.x - 5, p.y + p.gap, pW + 10, 20, { fill: css(light(GREEN, 20)), r: 4 });
      
      if (!over && 200 < p.x + pW && 230 > p.x && (y < p.y || y + 30 > p.y + p.gap)) {
          over = true; FX.shake = 12; burst(215, y+15, GOLD, 30, 5, 40, 5); sfx('boom');
      }
      if (!over && !p.passed && p.x + pW < 200) { p.passed = true; score++; sfx('coin'); }
      if (p.x < -100) pipes.splice(i, 1);
    }
    
    if (!over) {
        g.save(); g.translate(215, y + 15); g.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, vy * 0.08)));
        panel(-15, -15, 30, 30, { fill: css(GOLD), r: 6, stroke: css(WHITE, 0.8) });
        g.fillStyle = '#000'; g.fillRect(2, -5, 6, 6);
        g.restore();
    }
    
    if (over) {
      await finishAnim((tm) => { drawBg(tm); drawFx(); }, 30);
      return endScreen('Упал!', [`Счёт: ${score}`], GOLD);
    }
    
    text(`${score}`, W / 2, 80, { size: 64, bold: true, color: WHITE, shadow: true });
    frames++;
    
    updateFx(); drawFx();
    await present();
  }
}
async function flappy() { while (await flappyMatch() === 'again'); }
