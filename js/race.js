'use strict';
async function raceMatch() {
  FX.reset();
  const P = { x: W / 2, y: H - 120, w: 46, h: 80, speed: 9, vx: 0 };
  let obs = [], score = 0, frames = 0, speedMult = 1;
  
  const drawBg = (t) => {
      backdrop(t, [15, 5, 25], [5, 2, 10]);
      
      // Synthwave Неоновая сетка 
      g.strokeStyle = 'rgba(255, 0, 150, 0.3)';
      g.lineWidth = 2;
      g.beginPath();
      // Вертикальные линии
      for(let i=0; i<=W; i+=60) { g.moveTo(i, 0); g.lineTo(i, H); }
      // Горизонтальные бегущие линии
      for(let i=0; i<=H+100; i+=60) { 
          let y = (i + frames * 10 * speedMult) % (H + 100) - 100;
          g.moveTo(0, y); g.lineTo(W, y); 
      }
      g.stroke();
      
      text(`Счёт: ${Math.floor(score)}`, W / 2, 50, { size: 38, bold: true, color: WHITE, shadow: true });
  };
  
  if (!await countdown(drawBg)) return 'menu';
  
  for (;;) {
    const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
    for (const e of keys) if (is(e, 'Escape')) return 'menu';
    
    // Плавное физичное управление
    if (held.has('ArrowLeft') || held.has('KeyA')) P.vx -= 1.8;
    if (held.has('ArrowRight') || held.has('KeyD')) P.vx += 1.8;
    P.vx *= 0.82; // Трение
    P.x += P.vx;
    P.x = Math.max(20, Math.min(W - P.w - 20, P.x));
    
    speedMult = 1 + score * 0.01;
    
    // Спавн трафика
    if (Math.random() < Math.min(0.06, 0.02 + score * 0.0008)) {
        let ow = rnd(40, 60), oh = rnd(70, 100);
        obs.push({ x: rnd(20, W - 20 - ow), y: -150, w: ow, h: oh, speed: rnd(4, 9) * speedMult, c: pick([[255,0,100], [0,255,255], [255,255,0], [255,100,0]]) });
    }
    
    drawBg(t);
    
    // Трафик
    for (let i = obs.length - 1; i >= 0; i--) {
      let o = obs[i];
      o.y += o.speed;
      
      // Неоновый кузов
      glow(o.x + o.w/2, o.y + o.h/2, 40, o.c);
      panel(o.x, o.y, o.w, o.h, { fill: css(dark(o.c, 0.2)), r: 12, stroke: css(o.c, 0.8), lw: 2 });
      
      // Стёкла
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(o.x + 6, o.y + 15, o.w - 12, 20);
      g.fillRect(o.x + 6, o.y + o.h - 25, o.w - 12, 15);
      
      // Фары задние
      g.fillStyle = 'rgb(255, 0, 50)';
      g.fillRect(o.x + 4, o.y + 4, 10, 4); g.fillRect(o.x + o.w - 14, o.y + 4, 10, 4);
      
      // Столкновение с небольшим прощением (margin)
      let m = 6; 
      if (P.x + m < o.x + o.w - m && P.x + P.w - m > o.x + m && 
          P.y + m < o.y + o.h - m && P.y + P.h - m > o.y + m) {
        sfx('boom');
        FX.shake = 20;
        burst(P.x + P.w/2, P.y + P.h/2, [0, 255, 255], 60, 8, 60, 6);
        await finishAnim((tm) => { drawBg(tm); drawFx(); }, 40);
        return endScreen('Авария!', [`Счёт: ${Math.floor(score)}`], [0, 255, 255]);
      }
      if (o.y > H + 50) { obs.splice(i, 1); score += 1; sfx('coin'); }
    }
    
    // Игрок (Стильный Cyberpunk болид)
    glow(P.x + P.w/2, P.y + P.h/2, 50, [0, 255, 255]);
    panel(P.x, P.y, P.w, P.h, { fill: 'rgba(0, 30, 40, 0.95)', r: 14, stroke: 'rgb(0, 255, 255)', lw: 2 });
    
    // Выхлоп
    burst(P.x + P.w/2, P.y + P.h, [0, 255, 255], 2, 2, 12, 4);
    
    // Стёкла игрока
    g.fillStyle = 'rgba(0,0,0,0.8)';
    g.beginPath(); g.roundRect(P.x + 8, P.y + 20, P.w - 16, 25, 4); g.fill();
    g.beginPath(); g.roundRect(P.x + 8, P.y + P.h - 20, P.w - 16, 12, 4); g.fill();
    
    // Передние фары светят вперёд
    glow(P.x + 8, P.y - 15, 35, [255, 255, 255]); glow(P.x + P.w - 8, P.y - 15, 35, [255, 255, 255]);
    g.fillStyle = '#fff';
    g.fillRect(P.x + 4, P.y + 2, 8, 6); g.fillRect(P.x + P.w - 12, P.y + 2, 8, 6);
    
    frames++;
    updateFx(); drawFx();
    await present();
  }
}
async function race() { while(await raceMatch() === 'again'); }
