/**
 * Танки — 2 игрока
 * Зелёный: WASD + F/Space   Синий: стрелки + Enter
 */
export function startTanks(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="hud">
        <span id="t1" style="color:#4ade80">Зелёный: 0</span>
        <span class="title">ТАНКИ</span>
        <span id="t2" style="color:#60a5fa">Синий: 0</span>
      </div>
      <canvas id="c" width="900" height="500"></canvas>
      <div class="hint-bar">WASD+F / Space  vs  Стрелки+Enter · ESC — меню · R — новый раунд</div>
    </div>`;

  const canvas = root.querySelector('#c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let wins = [0, 0], running = true, animId = 0;
  const keys = {};

  function makeWalls() {
    const walls = [
      [0, 0, W, 12], [0, H - 12, W, 12], [0, 0, 12, H], [W - 12, 0, 12, H],
    ];
    for (let i = 0; i < 5; i++) {
      const ww = 20 + Math.random() * 120;
      const hh = 20 + Math.random() * 80;
      const x = 100 + Math.random() * (W / 2 - 200);
      const y = 40 + Math.random() * (H - 100);
      walls.push([x, y, ww, 18], [W - x - ww, H - y - 18, ww, 18]);
    }
    return walls;
  }

  let walls = makeWalls();
  let tanks = [
    { x: 80, y: H / 2, ang: 0, color: '#4ade80', name: 'Зелёный', alive: true, last: 0 },
    { x: W - 80, y: H / 2, ang: Math.PI, color: '#60a5fa', name: 'Синий', alive: true, last: 0 },
  ];
  let bullets = [];
  let endAt = null;

  function reset() {
    walls = makeWalls();
    tanks = [
      { x: 80, y: H / 2, ang: 0, color: '#4ade80', name: 'Зелёный', alive: true, last: 0 },
      { x: W - 80, y: H / 2, ang: Math.PI, color: '#60a5fa', name: 'Синий', alive: true, last: 0 },
    ];
    bullets = [];
    endAt = null;
  }

  function keyDown(e) {
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') { cleanup(); onBack(); }
    if (e.key === 'r' || e.key === 'R') { if (endAt) { reset(); } }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  }
  function keyUp(e) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  }

  function circleRect(cx, cy, r, wx, wy, ww, wh) {
    const nx = Math.max(wx, Math.min(cx, wx + ww));
    const ny = Math.max(wy, Math.min(cy, wy + wh));
    return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
  }

  function update(now) {
    if (endAt && now > endAt) return;
    // move tanks
    const ctrls = [
      { left: 'a', right: 'd', fwd: 'w', back: 's', fire: ['f', ' '] },
      { left: 'ArrowLeft', right: 'ArrowRight', fwd: 'ArrowUp', back: 'ArrowDown', fire: ['Enter'] },
    ];
    tanks.forEach((t, i) => {
      if (!t.alive) return;
      const c = ctrls[i];
      if (keys[c.left] || keys[c.left.toLowerCase?.()]) t.ang -= 0.05;
      if (keys[c.right] || keys[c.right.toLowerCase?.()]) t.ang += 0.05;
      const d = ((keys[c.fwd] || keys[c.fwd.toLowerCase?.()] ? 1 : 0) - (keys[c.back] || keys[c.back.toLowerCase?.()] ? 1 : 0)) * 2.2;
      if (d) {
        const nx = t.x + Math.cos(t.ang) * d;
        const ny = t.y + Math.sin(t.ang) * d;
        if (!walls.some(w => circleRect(nx, ny, 16, ...w))) { t.x = nx; t.y = ny; }
      }
      if (c.fire.some(f => keys[f] || keys[f.toLowerCase?.()]) && now - t.last > 400) {
        t.last = now;
        bullets.push({
          x: t.x + Math.cos(t.ang) * 24,
          y: t.y + Math.sin(t.ang) * 24,
          vx: Math.cos(t.ang) * 7,
          vy: Math.sin(t.ang) * 7,
          o: i, b: 0, born: now,
        });
      }
    });

    bullets.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (walls.some(w => circleRect(b.x, b.y, 4, ...w))) {
        b.vx *= -1; b.vy *= -1; b.b++;
        b.x += b.vx; b.y += b.vy;
      }
      if (b.b > 3 || now - b.born > 4000) b.dead = true;
      tanks.forEach((t, i) => {
        if (t.alive && i !== b.o && Math.hypot(b.x - t.x, b.y - t.y) < 18) {
          t.alive = false;
          b.dead = true;
        }
      });
    });
    bullets = bullets.filter(b => !b.dead);

    const alive = tanks.filter(t => t.alive);
    if (alive.length < 2 && !endAt) {
      endAt = now + 1200;
      if (alive.length === 1) {
        const wi = tanks.indexOf(alive[0]);
        wins[wi]++;
        root.querySelector('#t1').textContent = `Зелёный: ${wins[0]}`;
        root.querySelector('#t2').textContent = `Синий: ${wins[1]}`;
      }
    }
  }

  function draw(now) {
    ctx.fillStyle = '#121a12';
    ctx.fillRect(0, 0, W, H);
    walls.forEach(w => {
      ctx.fillStyle = '#3f4a5a';
      ctx.fillRect(...w);
      ctx.strokeStyle = '#6b7a90';
      ctx.strokeRect(...w);
    });
    bullets.forEach(b => {
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    tanks.forEach(t => {
      if (!t.alive) return;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.ang);
      ctx.fillStyle = t.color;
      ctx.fillRect(-16, -12, 32, 24);
      ctx.fillStyle = '#222';
      ctx.fillRect(0, -3, 26, 6);
      ctx.restore();
    });
    if (endAt && now > endAt - 100) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 36px Rubik';
      ctx.textAlign = 'center';
      const alive = tanks.filter(t => t.alive);
      const msg = alive.length === 0 ? 'Ничья!' : `Победил ${alive[0].name}!`;
      ctx.fillText(msg, W / 2, H / 2);
      ctx.font = '16px Rubik';
      ctx.fillStyle = '#ccc';
      ctx.fillText('R — новый раунд', W / 2, H / 2 + 36);
    }
  }

  function loop(now) {
    update(now);
    draw(now);
    animId = requestAnimationFrame(loop);
  }

  function cleanup() {
    cancelAnimationFrame(animId);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  }
  window.__gameCleanup = cleanup;
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  animId = requestAnimationFrame(loop);
}
