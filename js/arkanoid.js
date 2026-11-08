'use strict';
async function arkanoidMatch() {
    FX.reset();
    const P = { x: W/2 - 60, y: H - 40, w: 120, h: 16, speed: 12 };
    const B = { x: W/2, y: H - 56, vx: 0, vy: 0, r: 8, active: false };
    let bricks = [], score = 0;
    const cols = 12, rows = 6, bw = (W - 100) / cols, bh = 24;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            bricks.push({ x: 50 + c * bw, y: 70 + r * bh, w: bw - 4, h: bh - 4, color: PC[r % 4], active: true });
        }
    }
    
    const drawBg = (t) => {
        backdrop(t, [10, 20, 40], [20, 40, 80]);
        panel(P.x, P.y, P.w, P.h, { fill: css(WHITE), r: 8 });
        for (let br of bricks) {
            if (br.active) panel(br.x, br.y, br.w, br.h, { fill: css(br.color), r: 4 });
        }
        text(`Счёт: ${score}`, W/2, 30, { size: 24, bold: true, color: WHITE });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) P.x -= P.speed;
        if (held.has('ArrowRight') || held.has('KeyD')) P.x += P.speed;
        P.x = Math.max(0, Math.min(W - P.w, P.x));
        
        if (!B.active) {
            B.x = P.x + P.w/2;
            if (held.has('Space') || held.has('ArrowUp') || held.has('KeyW') || held.has('Enter')) {
                B.active = true;
                B.vx = pick([-6, 6]); B.vy = -7;
            }
        } else {
            B.x += B.vx; B.y += B.vy;
            if (B.x < B.r || B.x > W - B.r) { B.vx *= -1; B.x = Math.max(B.r, Math.min(W - B.r, B.x)); sfx('beep'); }
            if (B.y < B.r) { B.vy *= -1; B.y = B.r; sfx('beep'); }
            
            if (B.y > H) {
                sfx('bad');
                return endScreen('Мяч упущен', [`Счёт: ${score}`], RED);
            }
            
            if (B.vy > 0 && B.y + B.r > P.y && B.y - B.r < P.y + P.h && B.x > P.x - B.r && B.x < P.x + P.w + B.r) {
                B.vy = -Math.abs(B.vy);
                B.vx = ((B.x - (P.x + P.w/2)) / (P.w/2)) * 8; 
                B.y = P.y - B.r;
                sfx('hit');
            }
            
            let activeBricks = 0;
            for (let br of bricks) {
                if (!br.active) continue;
                activeBricks++;
                if (B.x + B.r > br.x && B.x - B.r < br.x + br.w && B.y + B.r > br.y && B.y - B.r < br.y + br.h) {
                    br.active = false;
                    score += 10;
                    let overlapX = Math.min(B.x + B.r - br.x, br.x + br.w - (B.x - B.r));
                    let overlapY = Math.min(B.y + B.r - br.y, br.y + br.h - (B.y - B.r));
                    if (overlapX < overlapY) B.vx *= -1; else B.vy *= -1;
                    
                    burst(br.x + br.w/2, br.y + br.h/2, br.color, 10, 3, 20);
                    sfx('coin');
                    break; 
                }
            }
            if (activeBricks === 0) return endScreen('Победа!', [`Счёт: ${score}`], GREEN);
        }
        
        drawBg(t);
        disc(B.x, B.y, B.r, GOLD); glow(B.x, B.y, 20, GOLD);
        
        if(!B.active) text('ПРОБЕЛ - запуск', W/2, H - 70, { size: 16, color: MUTED });
        
        updateFx(); drawFx();
        await present();
    }
}
async function arkanoid() { while(await arkanoidMatch() === 'again'); }
