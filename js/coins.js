/**
 * Сбор монет — 2–4 игрока
 * 1: WASD  2: стрелки  3: IJKL  4: numpad 8456
 */
export function startCoins(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="hud" id="scores"></div>
      <canvas id="c" width="900" height="500"></canvas>
      <div class="hint-bar">
        <button id="btn2" class="btn-sm">2 игрока</button>
        <button id="btn3" class="btn-sm">3 игрока</button>
        <button id="btn4" class="btn-sm">4 игрока</button>
        · ESC — меню
      </div>
    </div>`;

  const canvas = root.querySelector('#c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const names = ['Зелёный', 'Синий', 'Оранжевый', 'Розовый'];
  const colors = ['#4ade80', '#60a5fa', '#fb923c', '#f472b6'];
  const controls = [
    { up: 'w', down: 's', left: 'a', right: 'd' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
    { up: 'i', down: 'k', left: 'j', right: 'l' },
    { up: '8', down: '5', left: '4', right: '6' },
  ];

  let n = 0, players = [], items = [], startTime = 0, running = false, animId = 0;
  const DURATION = 45000;
  const keys = {};

  function start(count) {
    n = count;
    players = [];
    const starts = [[80, 80], [W - 110, H - 110], [W - 110, 80], [80, H - 110]];
    for (let i = 0; i < n; i++) {
      players.push({ x: starts[i][0], y: starts[i][1], score: 0, boost: 0, stun: 0, i });
    }
    items = [];
    startTime = performance.now();
    running = true;
    root.querySelector('.hint-bar').innerHTML = 'Собирай монеты, избегай бомб · ESC — меню';
    updateHud();
  }

  root.querySelector('#btn2').onclick = () => start(2);
  root.querySelector('#btn3').onclick = () => start(3);
  root.querySelector('#btn4').onclick = () => start(4);

  function spawn() {
    const kinds = ['coin', 'coin', 'coin', 'gem', 'bomb', 'potion'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    items.push({
      x: 40 + Math.random() * (W - 80),
      y: 40 + Math.random() * (H - 80),
      kind,
      born: performance.now(),
    });
  }

  function updateHud() {
    const el = root.querySelector('#scores');
    el.innerHTML = players.map(p =>
      `<span style="color:${colors[p.i]}">${names[p.i]}: ${p.score}</span>`
    ).join(' · ');
  }

  function keyDown(e) {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true;
    if (e.key === 'Escape') { cleanup(); onBack(); }
  }
  function keyUp(e) {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
  }

  let lastSpawn = 0;
  function update(now) {
    if (!running) return;
    const left = DURATION - (now - startTime);
    if (left <= 0) {
      running = false;
      return;
    }
    if (now - lastSpawn > 700 && items.length < 16) {
      lastSpawn = now;
      spawn();
    }
    items = items.filter(it => now - it.born < 7000);

    players.forEach(p => {
      if (now < p.stun) return;
      const c = controls[p.i];
      const speed = now < p.boost ? 6.5 : 4;
      let dx = 0, dy = 0;
      if (keys[c.left] || keys[c.left.toUpperCase?.() || '']) dx -= 1;
      if (keys[c.right] || keys[c.right.toUpperCase?.() || '']) dx += 1;
      if (keys[c.up] || keys[c.up.toUpperCase?.() || '']) dy -= 1;
      if (keys[c.down] || keys[c.down.toUpperCase?.() || '']) dy += 1;
      // also raw key names
      if (c.left === 'ArrowLeft' && keys['ArrowLeft']) dx -= 1;
      if (c.right === 'ArrowRight' && keys['ArrowRight']) dx += 1;
      if (c.up === 'ArrowUp' && keys['ArrowUp']) dy -= 1;
      if (c.down === 'ArrowDown' && keys['ArrowDown']) dy += 1;

      p.x = Math.max(15, Math.min(W - 15, p.x + dx * speed));
      p.y = Math.max(15, Math.min(H - 15, p.y + dy * speed));

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (Math.hypot(p.x - it.x, p.y - it.y) < 22) {
          items.splice(i, 1);
          if (it.kind === 'coin') p.score += 1;
          else if (it.kind === 'gem') p.score += 5;
          else if (it.kind === 'bomb') { p.score = Math.max(0, p.score - 3); p.stun = now + 1200; }
          else p.boost = now + 5000;
          updateHud();
        }
      }
    });
  }

  function draw(now) {
    ctx.fillStyle = '#0e1a12';
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = '#1a2e22';
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    items.forEach(it => {
      ctx.beginPath();
      if (it.kind === 'coin') {
        ctx.fillStyle = '#fbbf24';
        ctx.arc(it.x, it.y, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.kind === 'gem') {
        ctx.fillStyle = '#22d3ee';
        ctx.moveTo(it.x, it.y - 14); ctx.lineTo(it.x + 12, it.y); ctx.lineTo(it.x, it.y + 14); ctx.lineTo(it.x - 12, it.y);
        ctx.closePath(); ctx.fill();
      } else if (it.kind === 'bomb') {
        ctx.fillStyle = '#ef4444';
        ctx.arc(it.x, it.y, 12, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#4ade80';
        ctx.arc(it.x, it.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#052e16';
        ctx.font = 'bold 16px Rubik';
        ctx.textAlign = 'center';
        ctx.fillText('+', it.x, it.y + 5);
      }
    });

    players.forEach(p => {
      const col = now < p.stun ? '#666' : colors[p.i];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
      if (now < p.boost) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    if (running) {
      const left = Math.max(0, DURATION - (now - startTime));
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(20, H - 18, W - 40, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(20, H - 18, (W - 40) * left / DURATION, 8);
    } else if (players.length) {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 36px Rubik';
      ctx.textAlign = 'center';
      ctx.fillText(`Победил ${names[sorted[0].i]}!`, W / 2, H / 2 - 20);
      ctx.font = '18px Rubik';
      ctx.fillStyle = '#ddd';
      sorted.forEach((p, i) => {
        ctx.fillText(`${names[p.i]}: ${p.score}`, W / 2, H / 2 + 20 + i * 28);
      });
    } else {
      ctx.fillStyle = '#9b97b8';
      ctx.font = '22px Rubik';
      ctx.textAlign = 'center';
      ctx.fillText('Выбери количество игроков кнопками ниже', W / 2, H / 2);
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
