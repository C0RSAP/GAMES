/**
 * Змейка — 2 игрока на одной клавиатуре
 * Игрок 1: WASD   Игрок 2: стрелки
 */
export function startSnake(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="hud">
        <span id="s1" style="color:#4ade80">Зелёный: 0</span>
        <span class="title">ЗМЕЙКА</span>
        <span id="s2" style="color:#60a5fa">Синий: 0</span>
      </div>
      <canvas id="c" width="900" height="540"></canvas>
      <div class="hint-bar">WASD vs Стрелки · ESC — меню · R — рестарт раунда</div>
    </div>`;

  const canvas = root.querySelector('#c');
  const ctx = canvas.getContext('2d');
  const CELL = 20;
  const COLS = 45, ROWS = 25;
  let wins = [0, 0];
  let running = true;
  let animId = 0;

  function resetRound() {
    return {
      players: [
        { body: [[6, 12], [5, 12], [4, 12]], dir: [1, 0], next: [1, 0], color: '#4ade80', name: 'Зелёный', alive: true, grow: 0 },
        { body: [[38, 12], [39, 12], [40, 12]], dir: [-1, 0], next: [-1, 0], color: '#60a5fa', name: 'Синий', alive: true, grow: 0 },
      ],
      apples: [],
      tick: 0,
      over: false,
      winner: null,
    };
  }

  let state = resetRound();
  for (let i = 0; i < 3; i++) spawnApple(state);

  function spawnApple(s) {
    for (let t = 0; t < 50; t++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (s.players.every(p => !p.body.some(b => b[0] === x && b[1] === y)) &&
          !s.apples.some(a => a[0] === x && a[1] === y)) {
        s.apples.push([x, y]);
        return;
      }
    }
  }

  function key(e) {
    if (e.key === 'Escape') { cleanup(); onBack(); return; }
    if (e.key === 'r' || e.key === 'R') {
      if (state.over) {
        state = resetRound();
        for (let i = 0; i < 3; i++) spawnApple(state);
      }
      return;
    }
    if (state.over) return;
    const map = {
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    const p = (e.key.length === 1) ? state.players[0] : state.players[1];
    if (d[0] + p.dir[0] !== 0 || d[1] + p.dir[1] !== 0) p.next = d;
  }

  function step() {
    if (state.over) return;
    state.tick++;
    if (state.tick % 6 !== 0) return;

    state.players.forEach((p, i) => {
      if (!p.alive) return;
      p.dir = p.next;
      const head = [p.body[0][0] + p.dir[0], p.body[0][1] + p.dir[1]];
      const other = state.players[1 - i];
      if (head[0] < 0 || head[0] >= COLS || head[1] < 0 || head[1] >= ROWS ||
          p.body.some(b => b[0] === head[0] && b[1] === head[1]) ||
          other.body.some(b => b[0] === head[0] && b[1] === head[1])) {
        p.alive = false;
        return;
      }
      p.body.unshift(head);
      const ai = state.apples.findIndex(a => a[0] === head[0] && a[1] === head[1]);
      if (ai >= 0) {
        state.apples.splice(ai, 1);
        p.grow += 1;
        spawnApple(state);
      }
      if (p.grow > 0) p.grow--;
      else p.body.pop();
    });

    const dead = state.players.filter(p => !p.alive);
    if (dead.length) {
      state.over = true;
      if (dead.length === 2) state.winner = -1;
      else {
        state.winner = state.players[0].alive ? 0 : 1;
        wins[state.winner]++;
        root.querySelector('#s1').textContent = `Зелёный: ${wins[0]}`;
        root.querySelector('#s2').textContent = `Синий: ${wins[1]}`;
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // grid
    ctx.strokeStyle = '#1a1830';
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }
    state.apples.forEach(([x, y]) => {
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(x * CELL + 10, y * CELL + 10, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    state.players.forEach(p => {
      p.body.forEach((b, i) => {
        const k = 1 - i / Math.max(p.body.length, 1) * 0.5;
        ctx.fillStyle = p.alive ? p.color : '#555';
        ctx.globalAlpha = k;
        ctx.fillRect(b[0] * CELL + 1, b[1] * CELL + 1, CELL - 2, CELL - 2);
      });
      ctx.globalAlpha = 1;
    });
    if (state.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 36px Rubik';
      ctx.textAlign = 'center';
      const msg = state.winner < 0 ? 'Ничья!' : `Победил ${state.players[state.winner].name}!`;
      ctx.fillText(msg, canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '18px Rubik';
      ctx.fillStyle = '#ccc';
      ctx.fillText('R — ещё раунд', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    if (!running) return;
    step();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function cleanup() {
    running = false;
    cancelAnimationFrame(animId);
    window.removeEventListener('keydown', key);
  }
  window.__gameCleanup = cleanup;
  window.addEventListener('keydown', key);
  loop();
}
