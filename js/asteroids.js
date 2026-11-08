'use strict';
async function asteroidsMatch() {
    FX.reset();
    const P = { x: W/2, y: H/2, vx: 0, vy: 0, a: -Math.PI/2, lastShot: 0 };
    let bullets = [], rocks = [], score = 0, stars = [];
    
    for(let i=0; i<100; i++) stars.push({x: rnd(0,W), y: rnd(0,H), s: rnd(1,3)});
    
    const spawnRock = (x, y, r, stage) => {
        let a = rnd(0, Math.PI*2);
        let speed = rnd(1, 3) * (4 - stage);
        let pts = [];
        for(let i=0; i<8; i++) pts.push(r * rnd(0.7, 1.2));
        rocks.push({ x, y, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, r, stage, pts, rot: 0, rotSpeed: rnd(-0.05, 0.05) });
    };
    
    for(let i=0; i<5; i++) spawnRock(rnd(0, W), rnd(0, H/4), 45, 1);
    
    const drawBg = (t) => {
        backdrop(t, [5, 5, 15], [0, 0, 5]);
        g.fillStyle = 'rgba(255,255,255,0.4)';
        stars.forEach(s => g.fillRect(s.x, s.y, s.s, s.s));
        text(`Счёт: ${score}`, 100, 40, { size: 28, bold: true, color: [100, 220, 255], shadow: true });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys, held } = pump();
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) P.a -= 0.12;
        if (held.has('ArrowRight') || held.has('KeyD')) P.a += 0.12;
        if (held.has('ArrowUp') || held.has('KeyW')) {
            P.vx += Math.cos(P.a) * 0.25; P.vy += Math.sin(P.a) * 0.25;
            burst(P.x - Math.cos(P.a)*15, P.y - Math.sin(P.a)*15, [255,150,50], 3, 3, 15, 2);
        }
        
        P.vx *= 0.98; P.vy *= 0.98;
        P.x = (P.x + P.vx + W) % W; P.y = (P.y + P.vy + H) % H;
        
        if ((held.has('Space') || held.has('Enter')) && t - P.lastShot > 200) {
            bullets.push({ x: P.x + Math.cos(P.a)*20, y: P.y + Math.sin(P.a)*20, vx: Math.cos(P.a)*12, vy: Math.sin(P.a)*12, life: 50 });
            P.lastShot = t; sfx('shoot');
        }
        
        drawBg(t);
        
        if (Math.random() < 0.005 + score*0.0001) spawnRock(rnd(0, W), -40, 45, 1);
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x = (b.x + b.vx + W) % W; b.y = (b.y + b.vy + H) % H;
            b.life--;
            disc(b.x, b.y, 3, WHITE); glow(b.x, b.y, 12, [50,255,150]);
            if (b.life <= 0) bullets.splice(i, 1);
        }
        
        for (let i = rocks.length - 1; i >= 0; i--) {
            let r = rocks[i];
            r.x = (r.x + r.vx + W) % W; r.y = (r.y + r.vy + H) % H;
            r.rot += r.rotSpeed;
            
            g.save(); g.translate(r.x, r.y); g.rotate(r.rot);
            g.strokeStyle = '#ff5050'; g.lineWidth = 2.5; g.fillStyle = 'rgba(20,5,10,0.8)';
            g.beginPath();
            for(let j=0; j<8; j++) {
                let ang = j * Math.PI / 4;
                let px = Math.cos(ang) * r.pts[j], py = Math.sin(ang) * r.pts[j];
                if(j===0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath(); g.fill(); g.stroke();
            g.restore();
            glow(r.x, r.y, r.r, [255, 50, 50]);
            
            if (Math.hypot(P.x - r.x, P.y - r.y) < r.r + 5) {
                sfx('boom'); FX.shake = 20;
                burst(P.x, P.y, [100,200,255], 40, 7, 50, 6);
                await finishAnim(drawBg, 40);
                return endScreen('Корабль разбит', [`Счёт: ${score}`], RED);
            }
            
            let hit = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (Math.hypot(bullets[j].x - r.x, bullets[j].y - r.y) < r.r) {
                    bullets.splice(j, 1); hit = true; score += r.stage * 10;
                    burst(r.x, r.y, [255,100,50], 20, 5); sfx('hit');
                    if(r.stage < 3) {
                        spawnRock(r.x, r.y, r.r/1.5, r.stage+1);
                        spawnRock(r.x, r.y, r.r/1.5, r.stage+1);
                    }
                    break;
                }
            }
            if (hit) rocks.splice(i, 1);
        }
        
        g.save(); g.translate(P.x, P.y); g.rotate(P.a);
        g.fillStyle = '#0ff';
        g.beginPath(); g.moveTo(20, 0); g.lineTo(-15, 12); g.lineTo(-10, 0); g.lineTo(-15, -12); g.closePath(); g.fill();
        glow(0, 0, 30, [0, 255, 255]);
        g.restore();
        
        updateFx(); drawFx(); await present();
    }
}
async function asteroids() { while(await asteroidsMatch() === 'again'); }
