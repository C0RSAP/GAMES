'use strict';
async function shooterMatch() {
    FX.reset();
    const P = { x: W/2, y: H - 50, speed: 7, lastShot: 0 };
    let bullets = [], enemies = [], score = 0;
    
    const drawBg = (t) => {
        backdrop(t, [5, 5, 15], [10, 20, 35]);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i=0; i<40; i++) g.fillRect((i * 123 + t * 0.05) % W, (i * 321 + t * 0.2) % H, 2, 2);
        g.fillStyle = css([100, 200, 255]);
        g.beginPath(); g.moveTo(P.x, P.y - 20); g.lineTo(P.x + 20, P.y + 15); g.lineTo(P.x - 20, P.y + 15); g.fill();
        text(`Счёт: ${score}`, 80, 40, { size: 24, bold: true, color: WHITE });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) P.x -= P.speed;
        if (held.has('ArrowRight') || held.has('KeyD')) P.x += P.speed;
        P.x = Math.max(20, Math.min(W - 20, P.x));
        
        if ((held.has('Space') || held.has('ArrowUp') || held.has('KeyW') || held.has('Enter')) && t - P.lastShot > 200) {
            bullets.push({ x: P.x, y: P.y - 20 });
            P.lastShot = t;
            sfx('shoot');
        }
        
        if (Math.random() < 0.03 + score * 0.0005) {
            enemies.push({ x: rnd(20, W-20), y: -30, hp: 1, speed: rnd(2, 5) + score * 0.05, r: rnd(15, 25) });
        }
        
        backdrop(t, [5, 5, 15], [10, 20, 35]);
        
        g.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i=0; i<40; i++) {
            g.fillRect((i * 123 + t * 0.05) % W, (i * 321 + t * 0.2) % H, 2, 2);
        }
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.y -= 12;
            glow(b.x, b.y, 15, [100, 200, 255]);
            disc(b.x, b.y, 4, WHITE);
            if (b.y < -10) bullets.splice(i, 1);
        }
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            let en = enemies[i];
            en.y += en.speed;
            
            g.fillStyle = css(RED);
            g.beginPath(); g.arc(en.x, en.y, en.r, 0, Math.PI*2); g.fill();
            g.fillStyle = 'rgba(0,0,0,0.4)';
            g.beginPath(); g.arc(en.x - en.r*0.2, en.y - en.r*0.2, en.r*0.4, 0, Math.PI*2); g.fill();
            
            if (Math.hypot(P.x - en.x, P.y - en.y) < en.r + 15) {
                sfx('boom');
                FX.shake = 20;
                burst(P.x, P.y, [100,200,255], 30, 6, 50, 5);
                await finishAnim((tm) => { backdrop(tm, [5,5,15], [10,20,35]); drawFx(); }, 40);
                return endScreen('Корабль уничтожен', [`Счёт: ${score}`], RED);
            }
            
            let hit = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (Math.hypot(bullets[j].x - en.x, bullets[j].y - en.y) < en.r + 5) {
                    bullets.splice(j, 1);
                    hit = true;
                    score++;
                    burst(en.x, en.y, [255, 100, 50], 15, 4, 30);
                    sfx('hit');
                    break;
                }
            }
            
            if (hit || en.y > H + 30) enemies.splice(i, 1);
        }
        
        g.fillStyle = css([100, 200, 255]);
        g.beginPath(); g.moveTo(P.x, P.y - 20); g.lineTo(P.x + 20, P.y + 15); g.lineTo(P.x - 20, P.y + 15); g.fill();
        
        text(`Счёт: ${score}`, 80, 40, { size: 24, bold: true, color: WHITE });
        
        updateFx(); drawFx();
        await present();
    }
}
async function shooter() { while(await shooterMatch() === 'again'); }
