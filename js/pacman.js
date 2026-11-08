'use strict';
async function pacmanMatch() {
    FX.reset();
    
    // Карта (0 - пусто, 1 - стена, 2 - точка, 3 - энерджайзер)
    const mapLayout = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
        [1,3,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,3,1],
        [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,2,1],
        [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
        [1,1,1,1,1,2,1,1,1,0,0,0,1,1,1,2,1,1,1,1,1],
        [0,0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
        [1,1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1,1],
        [0,0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0,0],
        [1,1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1,1],
        [0,0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
        [1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
        [1,3,2,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,2,3,1],
        [1,1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1,1],
        [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    const cs = 24; 
    const mx = (W - mapLayout[0].length * cs) / 2;
    const my = 80;
    
    const map = mapLayout.map(row => [...row]);
    let dotsTotal = 0;
    map.forEach(row => row.forEach(cell => { if (cell === 2 || cell === 3) dotsTotal++; }));
    
    const P = { cx: 10, cy: 16, x: 0, y: 0, dx: 0, dy: 0, ndx: 0, ndy: 0, speed: 3 };
    P.x = mx + P.cx * cs + cs/2; P.y = my + P.cy * cs + cs/2;
    
    const ghosts = [
        { cx: 9, cy: 10, x: 0, y: 0, dx: 1, dy: 0, c: [255, 50, 50], name: 'Blinky' },
        { cx: 10, cy: 10, x: 0, y: 0, dx: -1, dy: 0, c: [255, 150, 200], name: 'Pinky' },
        { cx: 11, cy: 10, x: 0, y: 0, dx: 1, dy: 0, c: [50, 200, 255], name: 'Inky' },
        { cx: 10, cy: 8, x: 0, y: 0, dx: 0, dy: -1, c: [255, 180, 50], name: 'Clyde' }
    ];
    
    ghosts.forEach(g => {
        g.x = mx + g.cx * cs + cs/2; g.y = my + g.cy * cs + cs/2;
        g.speed = 2; g.frightened = 0;
    });
    
    let score = 0, powerMode = 0;
    
    const isWall = (cx, cy) => {
        if (cy < 0 || cy >= map.length || cx < 0 || cx >= map[0].length) return false;
        return map[cy][cx] === 1;
    };
    
    const drawBg = (t) => {
        backdrop(t, [10, 10, 20], [20, 20, 30]);
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const cell = map[r][c], x = mx + c * cs, y = my + r * cs;
                if (cell === 1) panel(x+2, y+2, cs-4, cs-4, { fill: 'rgba(50,50,200,0.3)', stroke: 'rgba(80,100,250,0.6)', r: 4 });
                else if (cell === 2) disc(x + cs/2, y + cs/2, 3, [255, 200, 150]);
                else if (cell === 3) {
                    const r3 = 7 + 2 * Math.sin(t/100);
                    glow(x + cs/2, y + cs/2, 15, [255, 200, 150]);
                    disc(x + cs/2, y + cs/2, r3, [255, 200, 150]);
                }
            }
        }
        text(`Счёт: ${score}`, W/2, 40, { size: 32, bold: true, color: WHITE });
    };

    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (held.has('ArrowLeft') || held.has('KeyA')) { P.ndx = -1; P.ndy = 0; }
        if (held.has('ArrowRight') || held.has('KeyD')) { P.ndx = 1; P.ndy = 0; }
        if (held.has('ArrowUp') || held.has('KeyW')) { P.ndx = 0; P.ndy = -1; }
        if (held.has('ArrowDown') || held.has('KeyS')) { P.ndx = 0; P.ndy = 1; }
        
        const inCenter = (Math.abs((P.x - mx - cs/2) % cs) < 0.1) && (Math.abs((P.y - my - cs/2) % cs) < 0.1);
        
        if (inCenter) {
            P.cx = Math.round((P.x - mx - cs/2) / cs);
            P.cy = Math.round((P.y - my - cs/2) / cs);
            P.x = mx + P.cx * cs + cs/2;
            P.y = my + P.cy * cs + cs/2;
            
            if (P.cx < 0) { P.cx = map[0].length - 1; P.x = mx + P.cx * cs + cs/2; }
            if (P.cx >= map[0].length) { P.cx = 0; P.x = mx + P.cx * cs + cs/2; }
            
            if (P.ndx !== 0 || P.ndy !== 0) {
                if (!isWall(P.cx + P.ndx, P.cy + P.ndy)) { P.dx = P.ndx; P.dy = P.ndy; }
            }
            if (isWall(P.cx + P.dx, P.cy + P.dy)) { P.dx = 0; P.dy = 0; }
            
            if (P.cy >= 0 && P.cy < map.length && P.cx >= 0 && P.cx < map[0].length) {
                if (map[P.cy][P.cx] === 2) {
                    map[P.cy][P.cx] = 0; score += 10; dotsTotal--; sfx('coin');
                } else if (map[P.cy][P.cx] === 3) {
                    map[P.cy][P.cx] = 0; score += 50; dotsTotal--;
                    powerMode = t + 7000; ghosts.forEach(g => g.frightened = t + 7000);
                    sfx('bonus'); FX.shake = 5;
                }
            }
        }
        
        P.x += P.dx * P.speed; P.y += P.dy * P.speed;
        
        if (dotsTotal <= 0) return endScreen('Победа!', [`Счёт: ${score}`], GREEN);
        
        ghosts.forEach(g => {
            const inGCenter = (Math.abs((g.x - mx - cs/2) % cs) < 0.1) && (Math.abs((g.y - my - cs/2) % cs) < 0.1);
            
            if (inGCenter) {
                g.cx = Math.round((g.x - mx - cs/2) / cs);
                g.cy = Math.round((g.y - my - cs/2) / cs);
                g.x = mx + g.cx * cs + cs/2;
                g.y = my + g.cy * cs + cs/2;
                
                if (g.cx < 0) { g.cx = map[0].length - 1; g.x = mx + g.cx * cs + cs/2; }
                if (g.cx >= map[0].length) { g.cx = 0; g.x = mx + g.cx * cs + cs/2; }
                
                let possible = [];
                const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; 
                dirs.forEach(d => {
                    if (d[0] === -g.dx && d[1] === -g.dy && (g.dx !== 0 || g.dy !== 0)) return; 
                    if (!isWall(g.cx + d[0], g.cy + d[1])) possible.push(d);
                });
                
                if (possible.length === 0) {
                    g.dx *= -1; g.dy *= -1;
                } else {
                    const dir = pick(possible);
                    g.dx = dir[0]; g.dy = dir[1];
                }
            }
            
            const sp = t < g.frightened ? 1 : g.speed;
            g.x += g.dx * sp; g.y += g.dy * sp;
            
            if (Math.hypot(P.x - g.x, P.y - g.y) < cs - 4) {
                if (t < g.frightened) {
                    score += 200; g.x = mx + 10 * cs + cs/2; g.y = my + 10 * cs + cs/2;
                    g.frightened = 0; burst(g.x, g.y, [100, 200, 255], 20, 5, 30); sfx('hit');
                } else {
                    sfx('boom'); FX.shake = 20; burst(P.x, P.y, GOLD, 30, 6, 50, 5);
                    P.alive = false;
                }
            }
        });
        
        if (P.alive === false) {
             await finishAnim(drawBg, 30);
             return endScreen('Съели!', [`Счёт: ${score}`], RED);
        }
        
        drawBg(t);
        
        const mouthAng = 0.2 + 0.5 * Math.abs(Math.sin(t/100));
        let baseAng = 0;
        if (P.dx === 1) baseAng = 0; else if (P.dx === -1) baseAng = Math.PI;
        else if (P.dy === 1) baseAng = Math.PI/2; else if (P.dy === -1) baseAng = -Math.PI/2;
        
        g.fillStyle = css(GOLD); g.beginPath();
        if (P.dx === 0 && P.dy === 0) g.arc(P.x, P.y, 11, 0, Math.PI*2);
        else { g.arc(P.x, P.y, 11, baseAng + mouthAng, baseAng - mouthAng + Math.PI*2); g.lineTo(P.x, P.y); }
        g.fill(); glow(P.x, P.y, 20, GOLD);
        
        ghosts.forEach(g_obj => {
            const isScared = t < g_obj.frightened;
            const gc = isScared ? (t - g_obj.frightened > -2000 && (t/200|0)%2 === 0 ? WHITE : [50, 50, 255]) : g_obj.c;
            g.fillStyle = css(gc); g.beginPath();
            g.arc(g_obj.x, g_obj.y - 2, 10, Math.PI, 0); g.lineTo(g_obj.x + 10, g_obj.y + 10);
            g.lineTo(g_obj.x + 3.3, g_obj.y + 7); g.lineTo(g_obj.x - 3.3, g_obj.y + 10);
            g.lineTo(g_obj.x - 10, g_obj.y + 7); g.closePath(); g.fill();
            if (!isScared) {
                g.fillStyle = '#fff'; g.beginPath(); g.arc(g_obj.x - 4, g_obj.y - 4, 3, 0, Math.PI*2); g.fill();
                g.beginPath(); g.arc(g_obj.x + 4, g_obj.y - 4, 3, 0, Math.PI*2); g.fill();
                g.fillStyle = '#00f'; const ex = g_obj.dx * 1.5, ey = g_obj.dy * 1.5;
                g.beginPath(); g.arc(g_obj.x - 4 + ex, g_obj.y - 4 + ey, 1.5, 0, Math.PI*2); g.fill();
                g.beginPath(); g.arc(g_obj.x + 4 + ex, g_obj.y - 4 + ey, 1.5, 0, Math.PI*2); g.fill();
            } else {
                g.fillStyle = '#f99'; g.fillRect(g_obj.x - 6, g_obj.y - 5, 3, 3); g.fillRect(g_obj.x + 3, g_obj.y - 5, 3, 3);
                g.fillRect(g_obj.x - 6, g_obj.y + 2, 12, 2);
            }
        });
        
        updateFx(); drawFx(); await present();
    }
}
async function pacman() { while(await pacmanMatch() === 'again'); }
