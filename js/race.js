'use strict';
async function raceMatch() {
  FX.reset();
  const P = { x: W / 2 - 20, y: H - 100, w: 40, h: 70, speed: 8 };
  let obs = [], score = 0, frames = 0, speedMult = 1;
  
  if (!await countdown((tm) => { backdrop(tm, [30, 30, 40], [15, 15, 20]); })) return 'menu';
  
  for (;;) {
    const t = now(), { keys } = pump(); // ИСПРАВЛЕНО: убрали held из деструктуризации
    for (const e of keys) if (is(e, 'Escape')) return 'menu';
    
    if (held.has('ArrowLeft') || held.has('KeyA')) P.x -= P.speed;
    if (held.has('ArrowRight') || held.has('KeyD')) P.x += P.speed;
    P.x = Math.max(0, Math.min(W - P.w, P.x));
    
    speedMult = 1 + score * 0.015;
    
    if (Math.random() < Math.min(0.08, 0.02 + score * 0.001)) {
        obs.push({ x: rnd(0, W - 50), y: -100, w: rnd(40, 80), h: rnd(60, 100), speed: rnd(4, 7) * speedMult, c: pick([RED, YELLOW, [255,100,200], [100, 200, 255]]) });
    }
    
    backdrop(t, [30, 30, 40], [15, 15, 20]);
    
    g.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for(let i=0; i<H+100; i+=80) {
        const yOff = (i + frames * 6 * speedMult) % (H + 100) - 100;
        g.fillRect(W * 0.33, yOff, 6, 40);
        g.fillRect(W * 0.66, yOff, 6, 40);
    }
    
    for (let i = obs.length - 1; i >= 0; i--) {
      let o = obs[i];
      o.y += o.speed;
      
      panel(o.x, o.y, o.w, o.h, { fill: css(o.c), r: 8 });
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(o.x + 4, o.y + 10, o.w - 8, 15);
      
      if (P.x < o.x + o.w - 5 && P.x + P.w > o.x + 5 && P.y < o.y + o.h - 5 && P.y + P.h > o.y + 5) {
        sfx('boom');
        FX.shake = 15;
        burst(P.x + P.w/2, P.y + P.h/2, RED, 30, 6, 50, 5);
        await finishAnim((tm) => { backdrop(tm, [30,30,40], [15,15,20]); drawFx(); }, 40);
        return endScreen('Авария!', [`Счёт: ${Math.floor(score)}`], RED);
      }
      if (o.y > H + 20) { obs.splice(i, 1); score += 1; sfx('coin'); }
    }
    
    panel(P.x, P.y, P.w, P.h, { fill: css(PC[1]), r: 8, stroke: css(WHITE, 0.5) });
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(P.x + 4, P.y + 15, P.w - 8, 15); 
    g.fillStyle = '#ff3333'; g.fillRect(P.x + 4, P.y + P.h - 6, 8, 6); g.fillRect(P.x + P.w - 12, P.y + P.h - 6, 8, 6);
    
    frames++;
    text(`Счёт: ${Math.floor(score)}`, W / 2, 40, { size: 32, bold: true, color: WHITE, shadow: true });
    
    updateFx(); drawFx();
    await present();
  }
}
async function race() { while(await raceMatch() === 'again'); }
