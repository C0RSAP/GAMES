'use strict';
async function memoryMatch() {
    FX.reset();
    const icons = ['👽','🚀','🍕','💎','💣','🍄','🎸','🕹️','🔮','🤖'];
    let deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
    let cards = deck.map((icon, i) => ({ x: W/2 - 320 + (i%5)*135, y: H/2 - 190 + (i/5|0)*125, icon, flipped: false, matched: false, flipA: 0 }));
    let flipped = [], moves = 0, matches = 0, wait = 0;
    
    const drawBg = (t) => {
        backdrop(t, [20, 30, 60], [10, 20, 40]);
        text(`НАЙДИ ПАРУ`, W/2, 50, { size: 42, bold: true, color: [100, 200, 255], shadow: true });
        text(`Ходы: ${moves}   |   Найдено: ${matches}/10`, W/2, 95, { size: 22, color: WHITE });
    };
    
    if (!await countdown(drawBg)) return 'menu';
    
    for (;;) {
        const t = now(), { keys, clicks } = pump();
        for (const e of keys) if (is(e, 'Escape')) return 'menu';
        
        if (wait && t > wait) {
            if (flipped[0].icon === flipped[1].icon) {
                flipped.forEach(c => c.matched = true); matches++; sfx('bonus'); 
                burst(flipped[0].x+50, flipped[0].y+55, GOLD, 25); burst(flipped[1].x+50, flipped[1].y+55, GOLD, 25);
            } else {
                flipped.forEach(c => c.flipped = false); sfx('bad');
            }
            flipped = []; wait = 0;
        }
        
        for (const c of clicks) {
            if (wait) break; // Блокируем клики во время анимации
            for (let card of cards) {
                if (!card.flipped && !card.matched && inRect(c, [card.x, card.y, 100, 110])) {
                    card.flipped = true; flipped.push(card); sfx('beep');
                    if (flipped.length === 2) { moves++; wait = t + 700; }
                    break;
                }
            }
        }
        
        if (matches >= 10) {
            await finishAnim(drawBg, 30);
            return endScreen('Победа!', [`Сделано ходов: ${moves}`], GREEN);
        }
        
        drawBg(t);
        for (let card of cards) {
            // Анимация переворота
            let targetA = (card.flipped || card.matched) ? 1 : 0;
            card.flipA += (targetA - card.flipA) * 0.2;
            let scaleX = Math.abs(Math.cos(card.flipA * Math.PI));
            let isFront = card.flipA > 0.5;
            
            g.save();
            g.translate(card.x + 50, card.y + 55);
            g.scale(scaleX, 1);
            
            if (card.matched) {
                panel(-50, -55, 100, 110, { fill: 'rgba(50, 255, 150, 0.15)', r: 12, stroke: 'rgba(50, 255, 150, 0.5)' });
                text(card.icon, 0, 5, { size: 50 });
            } else if (isFront) {
                panel(-50, -55, 100, 110, { fill: css(WHITE), r: 12, stroke: css([200,200,250], 0.8), lw: 3 });
                text(card.icon, 0, 5, { size: 50 });
            } else {
                let hov = inRect(mouse, [card.x, card.y, 100, 110]) && !wait;
                let yOff = hov ? -5 : 0;
                panel(-50, -55 + yOff, 100, 110, { fill: 'rgba(255,255,255,0.08)', r: 12, stroke: 'rgba(255,255,255,0.3)', lw: 2 });
                text('?', 0, 5 + yOff, { size: 60, bold: true, color: MUTED });
            }
            g.restore();
        }
        
        updateFx(); drawFx(); await present();
    }
}
async function memoryGame() { while(await memoryMatch() === 'again'); }
