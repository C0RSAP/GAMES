'use strict';
async function game2048Match() {
    FX.reset();
    let grid = Array.from({length: 4}, () => Array(4).fill(0));
    let score = 0, state = 'play';
    
    const addCell = () => {
        let empty = [];
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) if(!grid[r][c]) empty.push([r,c]);
        if(empty.length) {
            let [r,c] = pick(empty);
            grid[r][c] = Math.random() < 0.9 ? 2 : 4;
            burst(W/2 - 165 + c*85 + 42, H/2 - 145 + r*85 + 42, WHITE, 5, 2);
        }
    };
    addCell(); addCell();
    
    const rotateRight = (g) => {
        let res = Array.from({length: 4}, () => Array(4).fill(0));
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) res[c][3-r] = g[r][c];
        return res;
    };
    
    const slide = (row) => {
        let arr = row.filter(v => v);
        let moved = false;
        for(let i=0; i<arr.length-1; i++) {
            if(arr[i] === arr[i+1]) {
                arr[i] *= 2; score += arr[i]; arr.splice(i+1, 1); moved = true;
                sfx('coin');
            }
        }
        while(arr.length < 4) arr.push(0);
        return { arr, moved: moved || arr.join(',') !== row.join(',') };
    };
    
    const move = (dir) => {
        let rots = dir === 'Left' ? 0 : dir === 'Down' ? 1 : dir === 'Right' ? 2 : 3;
        for(let i=0; i<rots; i++) grid = rotateRight(grid);
        let moved = false;
        for(let r=0; r<4; r++) {
            let s = slide(grid[r]);
            grid[r] = s.arr;
            if(s.moved) moved = true;
        }
        for(let i=0; i<(4-rots)%4; i++) grid = rotateRight(grid);
        if(moved) { sfx('beep'); addCell(); }
    };
    
    const checkOver = () => {
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) {
            if(!grid[r][c]) return false;
            if(r<3 && grid[r][c] === grid[r+1][c]) return false;
            if(c<3 && grid[r][c] === grid[r][c+1]) return false;
        }
        return true;
    };
    
    const drawBg = (t) => {
        backdrop(t, [25, 20, 35], [15, 10, 20]);
        text(`2048`, W/2, 60, { size: 54, bold: true, color: GOLD, shadow: true });
        text(`Счёт: ${score}`, W/2, 110, { size: 28, bold: true, color: WHITE });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    const cols = {
        0: 'rgba(255,255,255,0.05)', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
        16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
        256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
    };
    
    for (;;) {
        const t = now(), { keys } = pump();
        for (const e of keys) {
            if (is(e, 'Escape')) return 'menu';
            if (state === 'play') {
                if (is(e, 'ArrowLeft', 'KeyA')) move('Left');
                if (is(e, 'ArrowRight', 'KeyD')) move('Right');
                if (is(e, 'ArrowUp', 'KeyW')) move('Up');
                if (is(e, 'ArrowDown', 'KeyS')) move('Down');
                if (checkOver()) { state = 'over'; sfx('bad'); FX.shake = 10; }
            }
        }
        
        drawBg(t);
        
        const ox = W/2 - 170, oy = H/2 - 145, cs = 85;
        panel(ox - 10, oy - 10, 350, 350, { fill: '#bbada0', r: 12, stroke: 'rgba(255,255,255,0.1)' });
        
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) {
            let v = grid[r][c];
            panel(ox + c*cs, oy + r*cs, cs-10, cs-10, { fill: cols[v] || '#3c3a32', r: 8 });
            if(v) text(v, ox + c*cs + 37, oy + r*cs + 39, { size: v > 100 ? 24 : 32, bold: true, color: v > 4 ? WHITE : [100,100,100] });
        }
        
        if (state === 'over') {
            await finishAnim(drawBg, 30);
            return endScreen('Игра окончена', [`Счёт: ${score}`], RED);
        }
        
        updateFx(); drawFx(); await present();
    }
}
async function game2048() { while(await game2048Match() === 'again'); }
