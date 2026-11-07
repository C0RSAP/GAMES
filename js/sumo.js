/**
 * Сумо-арена — 2–4 игрока, столлкивай всех за край
 */
export function startSumo(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="hud" id="scores"></div>
      <canvas id="c" width="900" height="500"></canvas>
      <div class="hint-bar">
        <button class="btn-sm" data-n="2">2</button>
        <button class="btn-sm" data-n="3">3</button>
        <button class="btn-sm" data-n="4">4</button>
        игрока · ESC — меню
      </div>
    </div>`;

  const canvas = root.querySelector('#c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2 + 10;
  const names = ['Зелёный', 'Синий', 'Оранжевый', 'Розовый'];
  const colors = ['#4ade80', '#60a5fa', '#fb923c', '#f472b6'];
  const ctrl = [
    { u: 'w', d: 's', l: 'a', r: 'd' },
    { u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight' },
    { u: 'i', d: 'k', l: 'j', r: 'l' },
    { u: '8', d: '5', l: '4', r: '6' },
  ];
  let players = [], wins = [0,0,0,0], running = false, startT = 0, animId = 0;
  const keys = {};
  const R0 = 210, R1 = 90, DUR = 60000;

  root.querySelectorAll('[data-n]').forEach(btn => {
    btn.onclick = () => start(+btn.dataset.n);
  });

  function start(n) {
    players = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n;
      players.push({
        i, x: CX + 100 * Math.cos(a), y: CY + 100 * Math.sin(a),
        vx: 0, vy: 0, alive: true,
      });
    }
    startT = performance.now();
    running = true;
    root.querySelector('.hint-bar').textContent = 'Толкай других за край арены · ESC — меню';
    updateHud();
  }

  function updateHud() {
    root.querySelector('#scores').innerHTML = players.map(p =>
      `<span style="color:${colors[p.i]}">${names[p.i]}: ${wins[p.i]}</span>`
    ).join(' · ');
  }

  function keyDown(e) {
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') { cleanup(); onBack(); }
  }
  function keyUp(e) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  }

  function update(now) {
    if (!running) return;
    const t = (now - startT) / 1000;
    const arenaR = R0 - (R0 - R1) * Math.min(1, t / (DUR / 1000));

    players.forEach(p => {
      if (!p.alive) return;
      const c = ctrl[p.i];
      let ax = 0, ay = 0;
      if (keys[c.l] || keys[c.l.toLowerCase?.()]) ax -= 1;
      if (keys[c.r] || keys[c.r.toLowerCase?.()]) ax += 1;
      if (keys[c.u] || keys[c.u.toLowerCase?.()]) ay -= 1;
      if (keys[c.d] || keys[c.d.toLowerCase?.()]) ay += 1;
      if (c.l === 'ArrowLeft' && keys['ArrowLeft']) ax -= 1;
      if (c.r === 'ArrowRight' && keys['ArrowRight']) ax += 1;
      if (c.u === 'ArrowUp' && keys['ArrowUp']) ay -= 1;
      if (c.d === 'ArrowDown' && keys['ArrowDown']) ay += 1;
      p.vx += ax * 0.45;
      p.vy += ay * 0.45;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx;
      p.y += p.vy;
    });

    // collisions
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 40) {
          const nx = dx / d, ny = dy / d;
          const overlap = 40 - d;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          b.x += nx * overlap / 2; b.y += ny * overlap / 2;
          const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (vn > 0) {
            a.vx -= vn * nx * 1.1; a.vy -= vn * ny * 1.1;
            b.vx += vn * nx * 1.1; b.vy += vn * ny * 1.1;
          }
        }
      }
    }

    players.forEach(p => {
      if (p.alive && Math.hypot(p.x - CX, p.y - CY) > arenaR + 6) {
        p.alive = false;
      }
    });

    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) {
      running = false;
      if (alive.length === 1) {
        wins[alive[0].i]++;
        updateHud();
      }
    }
  }

  function draw(now) {
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(0, 0, W, H);
    const t = (now - startT) / 1000;
    const arenaR = running ? R0 - (R0 - R1) * Math.min(1, t / (DUR / 1000)) : R1;

    // arena
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, arenaR);
    g.addColorStop(0, '#1e3a5f');
    g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY, arenaR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    players.forEach(p => {
      if (!p.alive) return;
      ctx.fillStyle = colors[p.i];
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Rubik';
      ctx.textAlign = 'center';
      ctx.fillText(String(p.i + 1), p.x, p.y + 5);
    });

    if (!running && players.length) {
      const alive = players.filter(p => p.alive);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 36px Rubik';
      ctx.textAlign = 'center';
      const msg = alive.length === 0 ? 'Ничья!' : `Победил ${names[alive[0].i]}!`;
      ctx.fillText(msg, W / 2, H / 2);
    } else if (!players.length) {
      ctx.fillStyle = '#9b97b8';
      ctx.font = '22px Rubik';
      ctx.textAlign = 'center';
      ctx.fillText('Выбери количество игроков', W / 2, H / 2);
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
