/**
 * Понг+ — 2 игрока
 * Игрок 1: W/S   Игрок 2: ↑/↓
 */
export function startPong(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="hud">
        <span id="p1s" style="color:#4ade80">0</span>
        <span class="title">ПОНГ+</span>
        <span id="p2s" style="color:#60a5fa">0</span>
      </div>
      <canvas id="c" width="900" height="520"></canvas>
      <div class="hint-bar">W/S vs ↑/↓ · до 7 очков · ESC — меню</div>
    </div>`;

  const canvas = root.querySelector('#c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let scores = [0, 0];
  const WIN = 7;
  let running = true, animId = 0;

  const paddles = [
    { x: 30, y: H / 2 - 50, w: 14, h: 100, color: '#4ade80' },
    { x: W - 44, y: H / 2 - 50, w: 14, h: 100, color: '#60a5fa' },
  ];
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  const keys = {};

  function serve(dir) {
    const a = (Math.random() - 0.5) * 1.2;
    ball = { x: W / 2, y: H / 2, vx: dir * 6, vy: Math.sin(a) * 5 };
  }
  serve(Math.random() < 0.5 ? 1 : -1);

  function keyDown(e) {
    keys[e.key] = true;
    if (e.key === 'Escape') { cleanup(); onBack(); }
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  }
  function keyUp(e) { keys[e.key] = false; }

  function update() {
    if (keys['w'] || keys['W']) paddles[0].y -= 8;
    if (keys['s'] || keys['S']) paddles[0].y += 8;
    if (keys['ArrowUp']) paddles[1].y -= 8;
    if (keys['ArrowDown']) paddles[1].y += 8;
    paddles.forEach(p => { p.y = Math.max(0, Math.min(H - p.h, p.y)); });

    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < 10 || ball.y > H - 10) { ball.vy *= -1; ball.y = Math.max(10, Math.min(H - 10, ball.y)); }

    paddles.forEach((p, i) => {
      if (ball.x > p.x && ball.x < p.x + p.w && ball.y > p.y && ball.y < p.y + p.h) {
        const off = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 14);
        ball.vy = off * speed * 0.8;
        ball.vx = Math.sqrt(Math.max(speed * speed - ball.vy * ball.vy, 1)) * (i === 0 ? 1 : -1);
        ball.x = i === 0 ? p.x + p.w + 2 : p.x - 2;
      }
    });

    if (ball.x < 0) { scores[1]++; updateScore(); serve(1); }
    if (ball.x > W) { scores[0]++; updateScore(); serve(-1); }
  }

  function updateScore() {
    root.querySelector('#p1s').textContent = scores[0];
    root.querySelector('#p2s').textContent = scores[1];
    if (scores[0] >= WIN || scores[1] >= WIN) {
      running = false;
    }
  }

  function draw() {
    ctx.fillStyle = '#0c0b18';
    ctx.fillRect(0, 0, W, H);
    // center line
    ctx.strokeStyle = '#2a2748';
    ctx.setLineDash([12, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    paddles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
    ctx.fill();

    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 40px Rubik';
      ctx.textAlign = 'center';
      const win = scores[0] >= WIN ? 'Зелёный' : 'Синий';
      ctx.fillText(`Победил ${win}!`, W / 2, H / 2);
    }
  }

  function loop() {
    if (!running && scores[0] < WIN && scores[1] < WIN) return;
    if (running) update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function cleanup() {
    running = false;
    cancelAnimationFrame(animId);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  }
  window.__gameCleanup = cleanup;
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  loop();
}
