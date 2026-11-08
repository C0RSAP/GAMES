'use strict';
async function doodleMatch() {
    FX.reset();
    let P = { x: W/2, y: H - 150, vy: -15, scaleY: 1 };
    let plats = [{ x: W/2 - 40, y: H - 50, w: 80 }];
    let score = 0, camY = 0;
    
    for(let i=1; i<20; i++) plats.push({ x: rnd(50, W-130), y: H - 50 - i*80, w: rnd(60, 100) });
    
    const drawBg = (t) => {
        backdrop(t, [30, 25, 45], [15, 10, 25]);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for(let i=0; i<W; i+=60) g.fillRect(i, 0, 1, H);
        for(let i=(camY%60); i<H; i+=60) g.fillRect(0, i, W, 1);
        text(`Счёт: ${Math.floor(score)}`, 100, 40, { size: 28, bold: true, color: GOLD, shadow: true });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) P.x -= 7;
        if (held.has('ArrowRight') || held.has('KeyD')) P.x += 7;
        if (P.x < -20) P.x = W + 20; if (P.x > W + 20) P.x = -20;
        
        P.vy += 0.45; P.y += P.vy;
        
        if (P.y < H/2) {
            let diff = H/2 - P.y;
            P.y = H/2; camY += diff; score += diff/10;
            plats.forEach(p => p.y += diff);
        }
        
        plats.forEach(p => {
            if(P.vy > 0 && P.x+15 > p.x && P.x-15 < p.x+p.w && P.y+20 > p.y && P.y-20 < p.y+15) {
                P.vy = -14; sfx('beep'); burst(P.x, p.y, GREEN, 10, 3); P.scaleY = 0.5; // squash
            }
        });
        
        P.scaleY += (1 - P.scaleY) * 0.15; // stretch back
        
        if(plats[plats.length-1].y > 0) plats.push({ x: rnd(50, W-130), y: plats[plats.length-1].y - rnd(70, 100), w: rnd(60, 100) });
        plats = plats.filter(p => p.y < H + 50);
        
        drawBg(t);
        plats.forEach(p => {
            panel(p.x, p.y, p.w, 14, { fill: css(GREEN), r: 7, stroke: css(light(GREEN,40)) });
            glow(p.x+p.w/2, p.y+7, 20, dark(GREEN, 0.4));
        });
        
        g.save(); g.translate(P.x, P.y); g.scale(1/P.scaleY, P.scaleY);
        panel(-15, -20, 30, 40, { fill: css(GOLD), r: 15, stroke: css(WHITE, 0.8), lw: 2 });
        glow(0, 0, 30, GOLD);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-6, -8, 4, 0, Math.PI*2); g.arc(6, -8, 4, 0, Math.PI*2); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(-6+P.vx*0.2, -8+P.vy*0.1, 1.5, 0, Math.PI*2); g.arc(6+P.vx*0.2, -8+P.vy*0.1, 1.5, 0, Math.PI*2); g.fill();
        g.restore();
        
        if (P.y > H + 50) {
            sfx('bad'); FX.shake = 15;
            await finishAnim(drawBg, 30);
            return endScreen('Упал!', [`Счёт: ${Math.floor(score)}`], RED);
        }
        
        updateFx(); drawFx(); await present();
    }
}
async function doodle() { while(await doodleMatch() === 'again'); }
