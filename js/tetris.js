'use strict';
async function tetrisMatch() {
    FX.reset();
    const cols = 10, rows = 20, cs = 26;
    const board = Array.from({length: rows}, () => Array(cols).fill(0));
    
    const SHAPES = [
        [],
        { m: [[1,1,1,1]], c: [0, 255, 255] },     
        { m: [[1,1,1],[0,1,0]], c: [200, 0, 255] }, 
        { m: [[1,1],[1,1]], c: [255, 255, 0] },     
        { m: [[0,1,1],[1,1,0]], c: [0, 255, 0] },   
        { m: [[1,1,0],[0,1,1]], c: [255, 0, 0] },   
        { m: [[1,0,0],[1,1,1]], c: [0, 0, 255] },   
        { m: [[0,0,1],[1,1,1]], c: [255, 128, 0] }  
    ];
    
    let score = 0, lines = 0, level = 1;
    let dropCounter = 0, dropInterval = 1000;
    
    const newPiece = () => {
        const type = Math.floor(Math.random() * 7) + 1;
        return { m: SHAPES[type].m.map(r=>[...r]), c: SHAPES[type].c, x: 3, y: 0, type };
    };
    
    let piece = newPiece(), nextPiece = newPiece();
    
    const collide = (b, p, dx=0, dy=0) => {
        for(let y=0; y<p.m.length; y++) {
            for(let x=0; x<p.m[y].length; x++) {
                if (p.m[y][x] !== 0) {
                    let nx = p.x + x + dx, ny = p.y + y + dy;
                    if (nx < 0 || nx >= cols || ny >= rows) return true;
                    if (ny >= 0 && b[ny][nx] !== 0) return true;
                }
            }
        }
        return false;
    };
    
    const rotate = (m) => {
        const nm = Array.from({length: m[0].length}, () => Array(m.length).fill(0));
        for(let y=0; y<m.length; y++) {
            for(let x=0; x<m[y].length; x++) {
                nm[x][m.length-1-y] = m[y][x];
            }
        }
        return nm;
    };
    
    const merge = () => {
        for(let y=0; y<piece.m.length; y++) {
            for(let x=0; x<piece.m[y].length; x++) {
                if (piece.m[y][x]) {
                    if (piece.y + y < 0) return true; // Game Over
                    board[piece.y + y][piece.x + x] = piece.type;
                }
            }
        }
        sfx('hit');
        return false;
    };
    
    const clearLines = () => {
        let linesCleared = 0;
        outer: for(let y = rows-1; y >= 0; y--) {
            for(let x = 0; x < cols; x++) {
                if (board[y][x] === 0) continue outer;
            }
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++; 
            linesCleared++;
        }
        if (linesCleared > 0) {
            lines += linesCleared;
            score += [0, 100, 300, 500, 800][linesCleared] * level;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            sfx('bonus'); FX.shake = linesCleared * 3; burst(W/2, H/2, GOLD, 20 + linesCleared*10, 5);
        }
    };
    
    const ox = (W - cols * cs) / 2, oy = (H - rows * cs) / 2;
    
    const drawBg = (t) => {
        backdrop(t, [30, 20, 50], [10, 10, 30]);
        panel(ox - 4, oy - 4, cols*cs + 8, rows*cs + 8, { fill: 'rgba(0,0,0,0.6)', stroke: css(WHITE, 0.4), r: 8, lw: 2 });
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for(let i=1; i<cols; i++) g.fillRect(ox + i*cs - 1, oy, 2, rows*cs);
        for(let i=1; i<rows; i++) g.fillRect(ox, oy + i*cs - 1, cols*cs, 2);
        
        text(`Счёт`, ox - 100, oy + 50, { size: 24, bold: true, color: MUTED }); text(`${score}`, ox - 100, oy + 80, { size: 32, bold: true, color: WHITE });
        text(`Уровень`, ox - 100, oy + 150, { size: 24, bold: true, color: MUTED }); text(`${level}`, ox - 100, oy + 180, { size: 32, bold: true, color: WHITE });
        text(`Линии`, ox - 100, oy + 250, { size: 24, bold: true, color: MUTED }); text(`${lines}`, ox - 100, oy + 280, { size: 32, bold: true, color: WHITE });
        text(`След.`, ox + cols*cs + 100, oy + 50, { size: 24, bold: true, color: MUTED });
    };

    if (!await countdown(drawBg)) return 'menu';
    
    let lastTime = performance.now();
    let moveTimer = 0, moveInterval = 100;

    for (;;) {
        const t = performance.now(), dt = t - lastTime;
        lastTime = t;
        
        const { keys } = pump(); // ИСПРАВЛЕНО
        for (const e of keys) {
            if (is(e, 'Escape')) return 'menu';
            if ((is(e, 'ArrowUp') || is(e, 'KeyW'))) {
                const nm = rotate(piece.m), old = piece.m;
                piece.m = nm;
                if (collide(board, piece)) piece.m = old; else sfx('beep');
            }
            if ((is(e, 'Space') || is(e, 'Enter'))) {
                while(!collide(board, piece, 0, 1)) piece.y++;
                dropCounter = dropInterval;
            }
        }
        
        moveTimer += dt;
        if (moveTimer > moveInterval) {
            if ((held.has('ArrowLeft') || held.has('KeyA')) && !collide(board, piece, -1, 0)) { piece.x--; moveTimer = 0; }
            if ((held.has('ArrowRight') || held.has('KeyD')) && !collide(board, piece, 1, 0)) { piece.x++; moveTimer = 0; }
            if ((held.has('ArrowDown') || held.has('KeyS')) && !collide(board, piece, 0, 1)) { piece.y++; score += 1; moveTimer = 0; }
        }
        
        dropCounter += dt;
        if (dropCounter > dropInterval) {
            dropCounter = 0;
            if (!collide(board, piece, 0, 1)) {
                piece.y++;
            } else {
                let go = merge();
                clearLines();
                if (go || collide(board, nextPiece)) { sfx('boom'); return endScreen('Конец Игры', [`Счёт: ${score}`, `Уровень: ${level}`], RED); }
                piece = nextPiece; nextPiece = newPiece();
            }
        }
        
        drawBg(t);
        for(let r=0; r<rows; r++) for(let c=0; c<cols; c++) {
            if (board[r][c] !== 0) {
                panel(ox + c*cs, oy + r*cs, cs, cs, { fill: css(SHAPES[board[r][c]].c), r: 4, stroke: css(dark(SHAPES[board[r][c]].c, 0.5)) });
                panel(ox + c*cs + 2, oy + r*cs + 2, cs-8, cs-8, { fill: css(light(SHAPES[board[r][c]].c, 20)), r: 2 });
            }
        }
        
        let ghostY = piece.y;
        while(!collide(board, piece, 0, ghostY - piece.y + 1)) ghostY++;
        for(let r=0; r<piece.m.length; r++) for(let c=0; c<piece.m[r].length; c++) {
            if (piece.m[r][c]) panel(ox + (piece.x + c)*cs, oy + (ghostY + r)*cs, cs, cs, { fill: css(piece.c, 0.2), r: 4, stroke: css(piece.c, 0.5) });
        }
        for(let r=0; r<piece.m.length; r++) for(let c=0; c<piece.m[r].length; c++) {
            if (piece.m[r][c]) {
                panel(ox + (piece.x + c)*cs, oy + (piece.y + r)*cs, cs, cs, { fill: css(piece.c), r: 4, stroke: css(dark(piece.c, 0.5)) });
                panel(ox + (piece.x + c)*cs + 2, oy + (piece.y + r)*cs + 2, cs-8, cs-8, { fill: css(light(piece.c, 20)), r: 2 });
            }
        }
        for(let r=0; r<nextPiece.m.length; r++) for(let c=0; c<nextPiece.m[r].length; c++) {
            if (nextPiece.m[r][c]) {
                panel(ox + cols*cs + 100 - (nextPiece.m[0].length*cs)/2 + c*cs, oy + 90 + r*cs, cs, cs, { fill: css(nextPiece.c), r: 4, stroke: css(dark(nextPiece.c, 0.5)) });
                panel(ox + cols*cs + 100 - (nextPiece.m[0].length*cs)/2 + c*cs + 2, oy + 90 + r*cs + 2, cs-8, cs-8, { fill: css(light(nextPiece.c, 20)), r: 2 });
            }
        }
        
        updateFx(); drawFx(); await present();
    }
}
async function tetris() { while(await tetrisMatch() === 'again'); }
