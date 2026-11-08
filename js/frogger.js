'use strict';
async function froggerMatch() {
    FX.reset();
    const cs = 50;
    let P = { x: W/2, y: H - cs, alive: true, scale: 1 };
    let score = 0;
    
    const lanes = [
        { y: H - 2*cs, speed: -2, type: 'car', w: 60, c: [255,50,50], objs: [] },
        { y: H - 3*cs, speed: 3.5, type: 'car', w: 80, c: [255,200,50], objs: [] },
        { y: H - 4*cs, speed: -4, type: 'car', w: 55, c: [50,150,255], objs: [] },
        { y: H - 6*cs, speed: 2.5, type: 'log', w: 130, objs: [] },
        { y: H - 7*cs, speed: -3, type: 'log', w: 160, objs: [] },
        { y: H - 8*cs, speed: 4, type: 'log', w: 110, objs: [] },
    ];
    
    lanes.forEach(l => { for(let i=0; i<3; i++) l.objs.push(rnd(0, W)); });
    
    const drawBg = (t) => {
        backdrop(t, [20, 30, 20], [10, 15, 10]);
        g.fillStyle = '#222'; g.fillRect(0, H - 4.5*cs, W, 3.5*cs); // Road
        g.fillStyle = 'rgba(255,255,255,0.2)'; // Road lines
        for(let i=0; i<W; i+=60) { g.fillRect(i, H-3.5*cs, 40, 2); g.fillRect(i, H-2.5*cs, 40, 2); }
        
        g.fillStyle = '#1e90ff'; g.fillRect(0, H - 8.5*cs, W, 3.5*cs); // Water
        g.fillStyle = 'rgba(255,255,255,0.1)'; // Waves
        for(let i=0; i<W; i+=80) { g.fillRect((i+t/20)%W, H-6.5*cs, 30, 3); g.fillRect((i-t/15+W)%W, H-7.5*cs, 40, 3); }
        
        g.fillStyle = '#2e8b57'; // Grass
        g.fillRect(0, H - 9.5*cs, W, cs); g.fillRect(0, H - 5.5*cs, W, cs); g.fillRect(0, H - 1.5*cs, W, 1.5*cs);
        
        text(`Счёт: ${score}`, 100, 30, { size: 28, bold: true, color: WHITE, shadow: true });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    let moveBlock = 0;
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (t > moveBlock) {
            let moved = false;
            if (held.has('ArrowLeft') || held.has('KeyA')) { P.x -= cs; moved = true; }
            else if (held.has('ArrowRight') || held.has('KeyD')) { P.x += cs; moved = true; }
            else if (held.has('ArrowUp') || held.has('KeyW')) { P.y -= cs; moved = true; score += 10; }
            else if (held.has('ArrowDown') || held.has('KeyS')) { P.y += cs; moved = true; }
            
            if(moved) {
                P.x = Math.max(cs/2, Math.min(W-cs/2, P.x)); P.y = Math.max(cs/2, Math.min(H-cs/2, P.y));
                sfx('beep'); moveBlock = t + 150; P.scale = 1.4; // Jump animation
            }
        }
        
        P.scale += (1 - P.scale) * 0.2;
        
        drawBg(t);
        
        let onLog = false;
        lanes.forEach(l => {
            for(let i=0; i<l.objs.length; i++) {
                l.objs[i] += l.speed;
                if(l.speed > 0 && l.objs[i] > W) l.objs[i] = -l.w;
                if(l.speed < 0 && l.objs[i] < -l.w) l.objs[i] = W;
                
                let ox = l.objs[i], oy = l.y;
                if(l.type === 'car') {
                    panel(ox, oy+5, l.w, cs-10, { fill: css(l.c), r: 8 });
                    g.fillStyle = 'rgba(255,255,255,0.7)'; // Windows
                    g.fillRect(ox+10, oy+8, l.w-20, cs-16);
                    g.fillStyle = 'rgba(255,255,100,0.8)'; // Headlights
                    if (l.speed > 0) { g.fillRect(ox+l.w-5, oy+10, 5, 8); g.fillRect(ox+l.w-5, oy+cs-18, 5, 8); }
                    else { g.fillRect(ox, oy+10, 5, 8); g.fillRect(ox, oy+cs-18, 5, 8); }
                    
                    if(P.x > ox && P.x < ox+l.w && P.y > oy && P.y < oy+cs) P.alive = false;
                } else {
                    panel(ox, oy+5, l.w, cs-10, { fill: '#8b4513', r: 8, stroke: '#5c2e0b' });
                    g.fillStyle = '#5c2e0b'; g.fillRect(ox+20, oy+15, l.w-40, 3); g.fillRect(ox+10, oy+30, l.w-20, 3);
                    if(P.x > ox && P.x < ox+l.w && Math.abs(P.y - (oy+cs/2)) < cs/2) {
                        onLog = true; P.x += l.speed;
                    }
                }
            }
        });
        
        if (P.y < H - 5.5*cs && P.y > H - 8.5*cs && !onLog) P.alive = false;
        
        // Frog Draw
        g.save(); g.translate(P.x, P.y); g.scale(P.scale, P.scale);
        disc(0, 0, 18, [50, 220, 100]); glow(0, 0, 25, [50, 255, 100]);
        disc(-8, -10, 6, WHITE); disc(8, -10, 6, WHITE);
        disc(-8, -10, 2, [0,0,0]); disc(8, -10, 2, [0,0,0]);
        g.restore();
        
        if (P.y < H - 8.5*cs) { sfx('bonus'); score += 100; P.y = H - cs; }
        
        if (!P.alive) {
            sfx('boom'); FX.shake = 15; burst(P.x, P.y, RED, 40, 8);
            await finishAnim(drawBg, 30);
            return endScreen('Сбило!', [`Счёт: ${score}`], RED);
        }
        
        updateFx(); drawFx(); await present();
    }
}
async function frogger() { while(await froggerMatch() === 'again'); }
