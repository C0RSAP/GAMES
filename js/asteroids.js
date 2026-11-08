'use strict';
async function asteroidsMatch() {
    FX.reset();
    const P = { x: W/2, y: H/2, vx: 0, vy: 0, a: -Math.PI/2, lastShot: 0 };
    let bullets = [], rocks = [], score = 0, stars = [];
    
    for(let i=0; i<150; i++) stars.push({x: rnd(0,W), y: rnd(0,H), s: rnd(1,2.5), a: rnd(0.2, 0.8)});
    
    const spawnRock = (x, y, r, stage) => {
        let a = rnd(0, Math.PI*2);
        let speed = rnd(1, 2.5) * (4 - stage);
        let pts = [];
        for(let i=0; i<10; i++) pts.push(r * rnd(0.75, 1.15));
        rocks.push({ x, y, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, r, stage, pts, rot: 0, rotSpeed: rnd(-0.04, 0.04) });
    };
    
    for(let i=0; i<6; i++) spawnRock(rnd(0, W), rnd(0, H/4), 45, 1);
    
    const drawBg = (t) => {
        backdrop(t, [5, 6, 12], [2, 3, 6]); // Очень глубокий тёмный космос
        stars.forEach(s => {
            g.fillStyle = `rgba(255,255,255,${s.a + Math.sin(t/300 + s.x)*0.2})`;
            g.fillRect(s.x, s.y, s.s, s.s);
        });
        text(`Счёт: ${score}`, 100, 40, { size: 28, bold: true, color: [0, 255, 255], shadow: true });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО: убрали held
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) P.a -= 0.12;
        if (held.has('ArrowRight') || held.has('KeyD')) P.a += 0.12;
        if (held.has('ArrowUp') || held.has('KeyW')) {
            P.vx += Math.cos(P.a) * 0.35; P.vy += Math.sin(P.a) * 0.35;
            burst(P.x - Math.cos(P.a)*15, P.y - Math.sin(P.a)*15, [0, 255, 255], 3, 4, 15, 2);
        }
        
        // Ограничение максимальной скорости корабля
        let speed = Math.hypot(P.vx, P.vy);
        if (speed > 10) { P.vx = (P.vx/speed)*10; P.vy = (P.vy/speed)*10; }
        
        P.vx *= 0.98; P.vy *= 0.98;
        P.x = (P.x + P.vx + W) % W; P.y = (P.y + P.vy + H) % H;
        
        if ((held.has('Space') || held.has('Enter')) && t - P.lastShot > 180) {
            bullets.push({ x: P.x + Math.cos(P.a)*20, y: P.y + Math.sin(P.a)*20, vx: Math.cos(P.a)*15, vy: Math.sin(P.a)*15, life: 45 });
            P.lastShot = t; sfx('shoot');
        }
        
        drawBg(t);
        
        if (Math.random() < 0.005 + score*0.0001) spawnRock(rnd(0, W), -50, 45, 1);
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x = (b.x + b.vx + W) % W; b.y = (b.y + b.vy + H) % H;
            b.life--;
            disc(b.x, b.y, 4, WHITE); glow(b.x, b.y, 15, [0, 255, 255]);
            if (b.life <= 0) bullets.splice(i, 1);
        }
        
        for (let i = rocks.length - 1; i >= 0; i--) {
            let r = rocks[i];
            r.x = (r.x + r.vx + W) % W; r.y = (r.y + r.vy + H) % H;
            r.rot += r.rotSpeed;
            
            g.save(); g.translate(r.x, r.y); g.rotate(r.rot);
            g.strokeStyle = 'rgba(255, 50, 100, 0.9)'; g.lineWidth = 2.5; 
            g.fillStyle = 'rgba(20, 5, 15, 0.8)';
            g.beginPath();
            for(let j=0; j<r.pts.length; j++) {
                let ang = j * (Math.PI*2 / r.pts.length);
                let px = Math.cos(ang) * r.pts[j], py = Math.sin(ang) * r.pts[j];
                if(j===0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath(); g.fill(); g.stroke();
            g.restore();
            glow(r.x, r.y, r.r, [255, 0, 50]); // Неоновое свечение камней
            
            if (Math.hypot(P.x - r.x, P.y - r.y) < r.r + 5) {
                sfx('boom'); FX.shake = 20;
                burst(P.x, P.y, [0,255,255], 50, 8, 60, 6);
                await finishAnim(drawBg, 40);
                return endScreen('Корабль разбит', [`Счёт: ${score}`], [0,255,255]);
            }
            
            let hit = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (Math.hypot(bullets[j].x - r.x, bullets[j].y - r.y) < r.r) {
                    bullets.splice(j, 1); hit = true; score += r.stage * 10;
                    burst(r.x, r.y, [255, 50, 100], 25, 6); sfx('hit');
                    if(r.stage < 3) {
                        spawnRock(r.x, r.y, r.r * 0.6, r.stage+1);
                        spawnRock(r.x, r.y, r.r * 0.6, r.stage+1);
                    }
                    break;
                }
            }
            if (hit) rocks.splice(i, 1);
        }
        
        g.save(); g.translate(P.x, P.y); g.rotate(P.a);
        g.fillStyle = '#fff';
        g.beginPath(); g.moveTo(20, 0); g.lineTo(-15, 12); g.lineTo(-8, 0); g.lineTo(-15, -12); g.closePath(); g.fill();
        glow(0, 0, 40, [0, 255, 255]);
        g.restore();
        
        updateFx(); drawFx(); await present();
    }
}
async function asteroids() { while(await asteroidsMatch() === 'again'); }
