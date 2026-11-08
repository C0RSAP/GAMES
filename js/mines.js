'use strict';
async function minesMatch() {
    FX.reset();
    const cols = 15, rows = 10, cs = 42, minesCount = 20;
    let grid = Array.from({length: rows}, () => Array.from({length: cols}, () => ({ m: false, r: false, f: false, adj: 0 })));
    let firstClick = true, over = false, win = false, left = cols*rows - minesCount;
    
    const placeMines = (ex, ey) => {
        let placed = 0;
        while(placed < minesCount) {
            let x = rnd(0, cols)|0, y = rnd(0, rows)|0;
            if(!grid[y][x].m && (Math.abs(x-ex)>1 || Math.abs(y-ey)>1)) { grid[y][x].m = true; placed++; }
        }
        for(let r=0; r<rows; r++) for(let c=0; c<cols; c++) {
            if(grid[r][c].m) continue;
            let a = 0;
            for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) {
                if(r+dr>=0 && r+dr<rows && c+dc>=0 && c+dc<cols && grid[r+dr][c+dc].m) a++;
            }
            grid[r][c].adj = a;
        }
    };
    
    const reveal = (r, c) => {
        if(r<0 || r>=rows || c<0 || c>=cols || grid[r][c].r || grid[r][c].f) return;
        grid[r][c].r = true; left--; sfx('beep');
        if(grid[r][c].adj === 0 && !grid[r][c].m) {
            for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) reveal(r+dr, c+dc);
        }
    };
    
    const drawBg = (t) => { 
        backdrop(t, [30, 40, 50], [15, 20, 30]); 
        text(`САПЁР`, W/2, 40, { size: 40, bold: true, color: [100, 200, 255] }); 
        text('ЛКМ — открыть, Пробел + ЛКМ — поставить флажок 🚩', W/2, 75, { color: MUTED }); 
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    const ox = (W - cols*cs)/2, oy = 110;
    const colors = ['#fff', '#4a90e2', '#50c878', '#e74c3c', '#9b59b6', '#f1c40f', '#e67e22', '#34495e', '#000'];
    
    for (;;) {
        const t = now(), { keys, clicks } = pump();
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        let flagMode = held.has('Space');
        
        if(!over && !win) {
            for(let c of clicks) {
                let gx = Math.floor((c.x - ox)/cs), gy = Math.floor((c.y - oy)/cs);
                if(gx>=0 && gx<cols && gy>=0 && gy<rows) {
                    let cell = grid[gy][gx];
                    if(flagMode && !cell.r) { cell.f = !cell.f; sfx('coin'); }
                    else if(!cell.f && !cell.r) {
                        if(firstClick) { placeMines(gx, gy); firstClick = false; }
                        if(cell.m) { over = true; sfx('boom'); FX.shake = 15; burst(c.x, c.y, RED, 30); }
                        else { reveal(gy, gx); if(left === 0) { win = true; sfx('bonus'); } }
                    }
                }
            }
        }
        
        drawBg(t);
        
        panel(ox - 6, oy - 6, cols*cs + 12, rows*cs + 12, { fill: 'rgba(0,0,0,0.5)', r: 10, stroke: 'rgba(255,255,255,0.1)' });
        
        for(let r=0; r<rows; r++) for(let c=0; c<cols; c++) {
            let x = ox + c*cs, y = oy + r*cs, cell = grid[r][c];
            if(cell.r) {
                panel(x+1, y+1, cs-2, cs-2, { fill: 'rgba(255,255,255,0.9)', r: 6 });
                if(cell.m) { text('💣', x+cs/2, y+cs/2+2, { size: 22 }); }
                else if(cell.adj > 0) text(cell.adj, x+cs/2, y+cs/2+2, { size: 26, bold: true, color: css(colors[cell.adj]) });
            } else {
                let hov = inRect(mouse, [x, y, cs, cs]) && !over && !win;
                panel(x+1, y+1, cs-2, cs-2, { fill: hov ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', r: 6, stroke: 'rgba(255,255,255,0.3)' });
                if(cell.f) text('🚩', x+cs/2, y+cs/2+2, { size: 22 });
                if(over && cell.m && !cell.f) text('💣', x+cs/2, y+cs/2+2, { size: 22, alpha: 0.5 });
            }
        }
        
        if(over) { await finishAnim(drawBg, 40); return endScreen('Взорвался!', [], RED); }
        if(win) { await finishAnim(drawBg, 40); return endScreen('Победа!', [], GREEN); }
        
        updateFx(); drawFx(); await present();
    }
}
async function mines() { while(await minesMatch() === 'again'); }
