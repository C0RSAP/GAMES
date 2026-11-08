/* ============================================================
   АРКАДА — WEB. Главный движок + все 8 игр.
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const W = 960, H = 640;
const canvas = $('#game-canvas');
const ctx = canvas.getContext('2d');
const domGame = $('#dom-game');
const overlay = $('#overlay');
const gameTitle = $('#game-title');
const hud = $('#game-hud');
const menuEl = $('#menu');
const gameScreen = $('#game-screen');

const COLORS = {
  ink: '#ecf0fc', muted: '#8e96b4', faint: '#545c7c',
  gold: '#ffd054', green: '#2ecc84', red: '#ff606e',
  cyan: '#60d6ff', white: '#ffffff'
};
const PLAYER_NAMES = ['Зелёный', 'Синий', 'Оранжевый', 'Розовый'];
const PLAYER_COLORS = [
  [52, 232, 158], [88, 166, 255], [255, 159, 67], [255, 107, 190]
];
const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`;

/* ─── ЗВУК ─── */
let audioCtx = null;
let soundOn = true;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function beep(freq = 440, dur = 0.1, type = 'square', vol = 0.1, slide = 0) {
  if (!soundOn) return;
  try {
    initAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
const sfx = {
  coin: () => beep(880, 0.06, 'square', 0.1, 1500),
  hit: () => beep(220, 0.08, 'square', 0.15, -400),
  boom: () => beep(90, 0.3, 'sawtooth', 0.2),
  shoot: () => beep(700, 0.06, 'square', 0.1, -2000),
  bonus: () => beep(500, 0.2, 'sine', 0.15, 1500),
  bad: () => beep(160, 0.2, 'square', 0.15, -100),
  go: () => beep(1000, 0.3, 'square', 0.15),
  beep: () => beep(440, 0.1, 'sine', 0.1),
};

/* ─── ВВОД ─── */
const keys = new Set();
document.addEventListener('keydown', e => {
  // не блокируем стрелки / пробел
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (!e.repeat) keys.add(e.code);
  if (currentGame && currentGame.onKeyDown) currentGame.onKeyDown(e);
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Escape' && currentGame) { goToMenu(); }
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('click', e => {
  if (!currentGame || !currentGame.onClick) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  currentGame.onClick(x, y);
});
document.addEventListener('click', e => {
  if (!currentGame || !currentGame.onDomClick) return;
  // для DOM-игр
  const btn = e.target.closest('[data-key]');
  if (btn) currentGame.onDomClick(btn.dataset.key);
});

/* ─── ИГРОВОЙ ЦИКЛ ─── */
let currentGame = null;
let lastTime = 0;
let running = false;

function loop(t) {
  if (!running) return;
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;
  if (currentGame) {
    if (currentGame.update) currentGame.update(dt);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (currentGame.render) currentGame.render(ctx, dt);
    ctx.restore();
  }
  requestAnimationFrame(loop);
}

/* ─── МЕНЮ ─── */
const GAMES = [
  { id: 'snake', title: 'Змейка', players: '2 игрока', desc: 'Дуэль змеек с бонусами', icon: '🐍', accent: '#34e89e', accentGlow: 'rgba(52,232,158,0.4)', factory: () => new SnakeGame() },
  { id: 'coins', title: 'Сбор монет', players: '2–4 игрока', desc: 'Монеты, алмазы и бомбы', icon: '🪙', accent: '#ffd054', accentGlow: 'rgba(255,208,84,0.4)', factory: () => new CoinsGame() },
  { id: 'pong', title: 'Понг+', players: '2 игрока', desc: 'Классика с бонусами', icon: '🏓', accent: '#60aaff', accentGlow: 'rgba(96,170,255,0.4)', factory: () => new PongGame() },
  { id: 'tanks', title: 'Танки', players: '2 игрока', desc: 'Рикошеты и бонусы', icon: '🎯', accent: '#ff7c4c', accentGlow: 'rgba(255,124,76,0.4)', factory: () => new TanksGame() },
  { id: 'sumo', title: 'Сумо-арена', players: '2–4 игрока', desc: 'Столкни всех в воду', icon: '🤼', accent: '#ff6ec4', accentGlow: 'rgba(255,110,196,0.4)', factory: () => new SumoGame() },
  { id: 'duel', title: 'Дуэль', players: '2 игрока', desc: 'Кто быстрее нажмёт', icon: '🤠', accent: '#ffbe54', accentGlow: 'rgba(255,190,84,0.4)', factory: () => new DuelGame() },
  { id: 'hangman', title: 'Виселица', players: '1–2 игрока', desc: 'Угадай слово', icon: '🪢', accent: '#c8a4ff', accentGlow: 'rgba(200,164,255,0.4)', factory: () => new HangmanGame() },
  { id: 'wordle', title: 'Wordle', players: '1 игрок', desc: 'Слова из 5 или 6 букв', icon: '🟩', accent: '#68e2b8', accentGlow: 'rgba(104,226,184,0.4)', factory: () => new WordleGame() },
];

function buildMenu() {
  const grid = $('#games-grid');
  grid.innerHTML = '';
  GAMES.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.style.setProperty('--accent', g.accent);
    card.style.setProperty('--accent-glow', g.accentGlow);
    card.style.animationDelay = (i * 0.05) + 's';
    card.innerHTML = `
      <span class="num">${i + 1}</span>
      <span class="icon">${g.icon}</span>
      <div class="name">${g.title}</div>
      <div class="players">${g.players}</div>
      <div class="desc">${g.desc}</div>
    `;
    card.addEventListener('click', () => startGame(i));
    grid.appendChild(card);
  });
}

function startGame(idx) {
  const g = GAMES[idx];
  closeOverlay();
  menuEl.classList.remove('active');
  gameScreen.classList.add('active');
  gameTitle.textContent = g.title;
  hud.innerHTML = '';
  domGame.innerHTML = '';
  domGame.classList.remove('active');
  canvas.classList.remove('hidden');
  currentGame = g.factory();
  currentGame.gameIndex = idx;
  if (currentGame.start) currentGame.start();
  if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(loop); }
}

function goToMenu() {
  closeOverlay();
  currentGame = null;
  menuEl.classList.add('active');
  gameScreen.classList.remove('active');
  running = false;
}

function closeOverlay() { overlay.classList.add('hidden'); overlay.innerHTML = ''; }

function showOverlay(title, lines, accent = '#ffd054', buttons = null) {
  overlay.innerHTML = '';
  overlay.style.setProperty('--accent', accent);
  const card = document.createElement('div');
  card.className = 'overlay-card';
  card.innerHTML = `<h3>${title}</h3>${lines.map(l => `<p>${l}</p>`).join('')}`;
  const btns = document.createElement('div');
  btns.className = 'btns';
  (buttons || [
    { label: 'Ещё раз (R)', primary: true, action: 'restart' },
    { label: 'В меню (Esc)', action: 'menu' }
  ]).forEach(b => {
    const el = document.createElement('button');
    el.className = 'btn' + (b.primary ? ' btn-primary' : '');
    el.textContent = b.label;
    el.addEventListener('click', () => {
      if (b.action === 'restart') { closeOverlay(); const idx = currentGame.gameIndex; startGame(idx); }
      else if (b.action === 'menu') goToMenu();
      else if (typeof b.action === 'function') b.action();
    });
    btns.appendChild(el);
  });
  card.appendChild(btns);
  overlay.appendChild(card);
  overlay.classList.remove('hidden');
}

// Горячие клавиши для оверлея (R / Enter / Esc)
document.addEventListener('keydown', e => {
  if (overlay.classList.contains('hidden')) return;
  if (e.code === 'KeyR' || e.code === 'Enter') {
    const btn = overlay.querySelector('.btn-primary');
    if (btn) btn.click();
  }
});

function toggleSound() {
  soundOn = !soundOn;
  $('#sound-chip').textContent = soundOn ? '🔊 Звук: вкл' : '🔇 Звук: выкл';
}

// Кнопка "назад"
$('#back-btn').addEventListener('click', goToMenu);

/* ─── ОБЩИЕ ХЕЛПЕРЫ ─── */
function countdown(drawFn, secs = 3, doneFn) {
  let t0 = performance.now();
  let lastStep = -1;
  let cancelled = false;
  function tick() {
    if (cancelled || !currentGame) return;
    const el = (performance.now() - t0) / 1000;
    if (el >= secs + 0.5) { doneFn && doneFn(); return; }
    ctx.save();
    drawFn && drawFn();
    ctx.restore();
    const step = el < secs ? Math.floor(el) : secs;
    if (step !== lastStep) { lastStep = step; sfx[step === secs ? 'go' : 'beep'](); }
    const frac = el < secs ? (el % 1) : (el - secs) / 0.5;
    const label = el < secs ? String(secs - step) : 'GO!';
    const col = el < secs ? COLORS.gold : COLORS.green;
    const scale = 1.25 - 0.25 * Math.min(1, frac * 2);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.font = '900 112px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1 - Math.max(0, frac - 0.55) / 0.45;
    ctx.fillStyle = col;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return () => { cancelled = true; };
}

/* ============================================================
   ИГРА 1 — ЗМЕЙКА
   ============================================================ */
class SnakeGame {
  constructor() {
    this.CELL = 20;
    this.OY = 60;
    this.COLS = Math.floor(W / this.CELL);
    this.ROWS = Math.floor((H - this.OY) / this.CELL);
    this.wins = [0, 0];
  }
  start() {
    const mid = Math.floor(this.ROWS / 2);
    this.P = [
      { name: PLAYER_NAMES[0], color: PLAYER_COLORS[0], body: [[6, mid], [5, mid], [4, mid]], dir: [1, 0], keys: { KeyW: [0,-1], KeyS: [0,1], KeyA: [-1,0], KeyD: [1,0] }, grow: 0, last: 0, boost: 0, freeze: 0, alive: true, q: [] },
      { name: PLAYER_NAMES[1], color: PLAYER_COLORS[1], body: [[this.COLS-7, mid], [this.COLS-6, mid], [this.COLS-5, mid]], dir: [-1, 0], keys: { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] }, grow: 0, last: 0, boost: 0, freeze: 0, alive: true, q: [] }
    ];
    this.items = new Map();
    this.msg = ['', 0];
    this.lastBonus = 0;
    this.addItem('apple'); this.addItem('apple');
    this.lastBonus = performance.now();
    this.P.forEach(p => p.last = performance.now());
    this.renderHud();
    const self = this;
    this.cdCancel = countdown(() => self.drawScene(), 3, () => {
      self.P.forEach(p => p.last = performance.now());
      self.lastBonus = performance.now();
    });
  }
  renderHud() {
    hud.innerHTML = `<span class="chip" style="color:${rgb(PLAYER_COLORS[0])}">${PLAYER_NAMES[0]} ${this.wins[0]}</span>
      <span class="chip" style="color:${rgb(PLAYER_COLORS[1])}">${PLAYER_NAMES[1]} ${this.wins[1]}</span>`;
  }
  addItem(kind) {
    for (let i = 0; i < 500; i++) {
      const c = [Math.floor(Math.random()*this.COLS), Math.floor(Math.random()*this.ROWS)];
      if ([...this.items.keys()].some(k => k[0]===c[0] && k[1]===c[1])) continue;
      if (this.P.some(p => p.body.some(b => b[0]===c[0] && b[1]===c[1]))) continue;
      this.items.set(c, kind); return;
    }
  }
  cpos(c) { return [c[0]*this.CELL + this.CELL/2, this.OY + c[1]*this.CELL + this.CELL/2]; }
  onKeyDown(e) {
    const now = performance.now();
    for (const p of this.P) {
      const nd = p.keys[e.code];
      if (!nd) continue;
      const ref = p.q.length ? p.q[p.q.length-1] : p.dir;
      if ((nd[0] !== ref[0] || nd[1] !== ref[1]) && (nd[0] !== -ref[0] || nd[1] !== -ref[1]) && p.q.length < 3) {
        p.q.push(nd);
      }
    }
  }
  drawScene() {
    this.drawBg();
    const now = performance.now();
    for (const [k, kind] of this.items) {
      const [x, y] = this.cpos(k);
      if (kind === 'apple') {
        ctx.fillStyle = '#ff5262'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#90ee90'; ctx.fillRect(x - 1, y - 13, 2, 5);
      } else {
        ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(now/200)*2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#804600'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y);
      }
    }
    for (const p of this.P) {
      const base = now < p.freeze ? [170,222,255] : p.color;
      for (let j = p.body.length - 1; j > 0; j--) {
        const a = this.cpos(p.body[j]), b = this.cpos(p.body[j-1]);
        const k = j / p.body.length;
        ctx.fillStyle = rgb([base[0]*(1-k*0.4), base[1]*(1-k*0.4), base[2]*(1-k*0.4)]);
        ctx.fillRect(Math.min(a[0],b[0])-7, Math.min(a[1],b[1])-7, Math.abs(a[0]-b[0])+14, Math.abs(a[1]-b[1])+14);
      }
      const [hx, hy] = this.cpos(p.body[0]);
      ctx.fillStyle = rgb([Math.min(255, base[0]+25), Math.min(255, base[1]+25), Math.min(255, base[2]+25)]);
      ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx-3, hy-3, 2.5, 0, Math.PI*2); ctx.fill();
    }
    if (now < this.msg[1]) {
      ctx.fillStyle = 'rgba(12,14,32,0.9)';
      const mw = ctx.measureText(this.msg[0]).width;
      ctx.font = 'bold 22px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.gold; ctx.fillText(this.msg[0], W/2, 30);
    }
  }
  drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0d20'); g.addColorStop(1, '#14102e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < this.COLS; x++) for (let y = 0; y < this.ROWS; y++)
      ctx.fillRect(x*this.CELL+this.CELL/2-1, this.OY+y*this.CELL+this.CELL/2-1, 2, 2);
  }
  update() {
    if (this.cdCancel && performance.now() - this.P[0].last < 100) return; // wait
    const now = performance.now();
    if ([...this.items.values()].filter(v => v === 'apple').length < 2) this.addItem('apple');
    if (now - this.lastBonus > 5000) {
      this.lastBonus = now;
      if (![...this.items.values()].includes('bonus') && Math.random() < 0.7) this.addItem('bonus');
    }
    const moving = [false, false];
    for (let i = 0; i < 2; i++) {
      const p = this.P[i];
      if (now < p.freeze) continue;
      const speed = now < p.boost ? 68 : 115;
      if (now - p.last >= speed) {
        p.last = now;
        if (p.q.length) p.dir = p.q.shift();
        const [hx, hy] = p.body[0];
        p.new = [hx + p.dir[0], hy + p.dir[1]];
        moving[i] = true;
      }
    }
    const solid = (p, moving) => moving ? p.body.slice(0, -1) : p.body;
    const crashed = [false, false];
    for (let i = 0; i < 2; i++) {
      if (!moving[i]) continue;
      const o = this.P[1-i];
      const nh = this.P[i].new;
      const outOfBounds = nh[0] < 0 || nh[0] >= this.COLS || nh[1] < 0 || nh[1] >= this.ROWS;
      const hitsSelf = solid(this.P[i], true).some(b => b[0]===nh[0] && b[1]===nh[1]);
      const hitsOther = solid(o, moving[1-i]).some(b => b[0]===nh[0] && b[1]===nh[1]);
      const headOn = moving[1-i] && o.new[0]===nh[0] && o.new[1]===nh[1];
      if (outOfBounds || hitsSelf || hitsOther || headOn) crashed[i] = true;
    }
    for (let i = 0; i < 2; i++) {
      if (!moving[i]) continue;
      const p = this.P[i];
      if (crashed[i]) { p.alive = false; continue; }
      p.body.unshift(p.new);
      const key = [...this.items.keys()].find(k => k[0]===p.new[0] && k[1]===p.new[1]);
      if (key) {
        const kind = this.items.get(key);
        this.items.delete(key);
        if (kind === 'apple') { p.grow++; sfx.coin(); }
        else if (kind === 'bonus') {
          sfx.bonus();
          const eff = ['grow','shrink','boost','freeze'][Math.floor(Math.random()*4)];
          const o = this.P[1-i];
          if (eff === 'grow') { p.grow += 4; this.msg = [p.name + ': вырос на 4!', now + 2500]; }
          else if (eff === 'shrink') { for (let k = 0; k < 3; k++) if (o.body.length > 3) o.body.pop(); this.msg = [p.name + ': враг короче!', now + 2500]; }
          else if (eff === 'boost') { p.boost = now + 5000; this.msg = [p.name + ': ускорение!', now + 2500]; }
          else { o.freeze = now + 2500; this.msg = [p.name + ': враг заморожен!', now + 2500]; }
        }
      }
      if (p.grow > 0) p.grow--; else p.body.pop();
    }
    if (!this.P[0].alive || !this.P[1].alive) {
      const bothDead = !this.P[0].alive && !this.P[1].alive;
      const winner = bothDead ? -1 : (this.P[0].alive ? 0 : 1);
      if (winner >= 0) { this.wins[winner]++; this.renderHud(); }
      const self = this;
      setTimeout(() => {
        if (bothDead) showOverlay('Ничья!', ['Обе змейки разбились'], '#ffd054');
        else showOverlay('Победил ' + PLAYER_NAMES[winner] + '!', ['Счёт: ' + self.wins[0] + ' : ' + self.wins[1]], rgb(PLAYER_COLORS[winner]));
        sfx.boom();
      }, 500);
      this.update = () => {};
    }
  }
}

/* ============================================================
   ИГРА 2 — СБОР МОНЕТ
   ============================================================ */
class CoinsGame {
  start() {
    this.n = 2;
    this.showPlayerModal();
  }
  showPlayerModal() {
    canvas.classList.add('hidden');
    domGame.classList.add('active');
    domGame.innerHTML = `<div class="players-modal">
      <h3 style="color:${COLORS.gold}">Сбор монет</h3>
      <p class="sub">Сколько игроков?</p>
      <div class="player-cards">
        ${[2,3,4].map(n => `<div class="player-card" data-n="${n}">
          <div class="big-num" style="color:${COLORS.gold}">${n}</div>
          <div class="dots">${Array.from({length:n},(_,i)=>`<span class="dot" style="background:${rgb(PLAYER_COLORS[i])}"></span>`).join('')}</div>
        </div>`).join('')}
      </div>
    </div>`;
    domGame.querySelectorAll('.player-card').forEach(c => {
      c.addEventListener('click', () => {
        this.n = parseInt(c.dataset.n);
        domGame.classList.remove('active');
        domGame.innerHTML = '';
        canvas.classList.remove('hidden');
        this.initGame();
      });
    });
  }
  initGame() {
    const starts = [[110,160],[W-110,H-100],[W-110,160],[110,H-100]];
    this.players = Array.from({length: this.n}, (_, i) => ({
      i, x: starts[i][0], y: starts[i][1], score: 0, boost: 0, stun: 0,
      ctrl: [[['KeyW'],['KeyS'],['KeyA'],['KeyD']],
             [['ArrowUp'],['ArrowDown'],['ArrowLeft'],['ArrowRight']],
             [['KeyI'],['KeyK'],['KeyJ'],['KeyL']],
             [['Numpad8'],['Numpad5'],['Numpad4'],['Numpad6']]][i]
    }));
    this.items = [];
    this.startTime = performance.now();
    this.lastSpawn = 0;
    this.DURATION = 45;
    this.rain = new Set();
    this.msg = ['', 0];
    this.TOP = 60;
    this.renderHud();
    const self = this;
    countdown(() => self.drawScene(), 3);
  }
  renderHud() {
    hud.innerHTML = this.players.map(p =>
      `<span class="chip" style="color:${rgb(PLAYER_COLORS[p.i])}">${PLAYER_NAMES[p.i]} ${p.score}</span>`
    ).join('');
  }
  onKeyDown() {}
  spawn(kind = null) {
    if (!kind) {
      const r = Math.random();
      kind = r < 0.6 ? 'coin' : r < 0.7 ? 'gem' : r < 0.88 ? 'bomb' : 'potion';
    }
    this.items.push({ kind, x: 30 + Math.random()*(W-60), y: this.TOP+30 + Math.random()*(H-this.TOP-60), born: performance.now() });
  }
  drawScene() {
    ctx.fillStyle = '#0b0d20'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, this.TOP); ctx.lineTo(x, H); ctx.stroke(); }
    const now = performance.now();
    for (const it of this.items) {
      if (now - it.born > 5500 && Math.floor(now/150) % 2) continue;
      if (it.kind === 'coin') {
        ctx.fillStyle = COLORS.gold;
        const ew = Math.max(3, Math.abs(Math.cos(now/180 + it.born/1000))*12);
        ctx.beginPath(); ctx.ellipse(it.x, it.y, ew, 12, 0, 0, Math.PI*2); ctx.fill();
      } else if (it.kind === 'gem') {
        ctx.fillStyle = '#60d6ff';
        ctx.beginPath(); ctx.moveTo(it.x, it.y-16); ctx.lineTo(it.x+14, it.y); ctx.lineTo(it.x, it.y+16); ctx.lineTo(it.x-14, it.y); ctx.closePath(); ctx.fill();
      } else if (it.kind === 'bomb') {
        ctx.fillStyle = '#242430'; ctx.beginPath(); ctx.arc(it.x, it.y, 13, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff6030'; ctx.beginPath(); ctx.arc(it.x+9, it.y-18, 3, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = '#48e46e'; ctx.beginPath(); ctx.arc(it.x, it.y, 13, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#003a10'; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', it.x, it.y);
      }
    }
    for (const p of this.players) {
      const col = now < p.stun ? [130,134,150] : PLAYER_COLORS[p.i];
      ctx.fillStyle = rgb(col);
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = rgb([Math.min(255,col[0]+70),Math.min(255,col[1]+70),Math.min(255,col[2]+70)]);
      ctx.beginPath(); ctx.arc(p.x-5, p.y-5, 5, 0, Math.PI*2); ctx.fill();
    }
    // Таймер
    const left = Math.max(0, this.DURATION - (now - this.startTime)/1000);
    ctx.fillStyle = '#282e4e'; ctx.fillRect(16, 52, W-32, 4);
    ctx.fillStyle = left > 10 ? COLORS.gold : COLORS.red;
    ctx.fillRect(16, 52, (W-32)*(left/this.DURATION), 4);
    if (now < this.msg[1]) {
      ctx.font = 'bold 38px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.gold; ctx.fillText(this.msg[0], W/2, H/2);
    }
  }
  update(dt) {
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;
    if (elapsed > this.DURATION) {
      if (!this.ended) {
        this.ended = true;
        const rank = [...this.players].sort((a,b) => b.score - a.score);
        const tie = rank.length > 1 && rank[0].score === rank[1].score;
        showOverlay(tie ? 'Ничья!' : 'Победил ' + PLAYER_NAMES[rank[0].i] + '!',
          rank.map(p => PLAYER_NAMES[p.i] + ': ' + p.score),
          tie ? COLORS.gold : rgb(PLAYER_COLORS[rank[0].i]));
      }
      return;
    }
    if (now - this.lastSpawn > 600 && this.items.length < 18) { this.lastSpawn = now; this.spawn(); }
    for (const t of [15, 30]) {
      if (elapsed >= t && !this.rain.has(t)) {
        this.rain.add(t);
        for (let i = 0; i < 14; i++) this.spawn('coin');
        this.msg = ['ЗОЛОТОЙ ДОЖДЬ!', now + 2000];
        sfx.bonus();
      }
    }
    this.items = this.items.filter(it => now - it.born < 7000);
    for (const p of this.players) {
      if (now < p.stun) continue;
      const speed = now < p.boost ? 7 : 4.6;
      let dx = (p.ctrl[3].some(k => keys.has(k)) ? 1 : 0) - (p.ctrl[2].some(k => keys.has(k)) ? 1 : 0);
      let dy = (p.ctrl[1].some(k => keys.has(k)) ? 1 : 0) - (p.ctrl[0].some(k => keys.has(k)) ? 1 : 0);
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      p.x = Math.max(16, Math.min(W-16, p.x + dx*speed));
      p.y = Math.max(this.TOP+16, Math.min(H-16, p.y + dy*speed));
      for (let i = this.items.length-1; i >= 0; i--) {
        const it = this.items[i];
        if ((p.x-it.x)**2 + (p.y-it.y)**2 < 29**2) {
          this.items.splice(i, 1);
          if (it.kind === 'coin') { p.score += 1; sfx.coin(); }
          else if (it.kind === 'gem') { p.score += 5; sfx.bonus(); }
          else if (it.kind === 'bomb') { p.score = Math.max(0, p.score - 3); p.stun = now + 1200; sfx.boom(); }
          else { p.boost = now + 5000; sfx.bonus(); }
          this.renderHud();
        }
      }
    }
  }
  render() { if (this.startTime) this.drawScene(); }
}

/* ============================================================
   ИГРА 3 — ПОНГ+
   ============================================================ */
class PongGame {
  start() {
    this.P = [
      { rect: { x: 30, y: H/2-50, w: 14, h: 100 }, up: 'KeyW', down: 'KeyS', score: 0, big: 0, small: 0, color: PLAYER_COLORS[0], name: PLAYER_NAMES[0] },
      { rect: { x: W-44, y: H/2-50, w: 14, h: 100 }, up: 'ArrowUp', down: 'ArrowDown', score: 0, big: 0, small: 0, color: PLAYER_COLORS[1], name: PLAYER_NAMES[1] }
    ];
    this.ball = { x: W/2, y: H/2, vx: 0, vy: 0, trail: [] };
    this.WIN = 7;
    this.orb = null;
    this.msg = ['', 0];
    this.serveAt = 0;
    this.renderHud();
    const self = this;
    countdown(() => self.drawScene(), 3, () => self.serve(Math.random()<0.5 ? -1 : 1));
  }
  renderHud() {
    hud.innerHTML = `<span class="chip" style="color:${rgb(PLAYER_COLORS[0])}">${this.P[0].score}</span>
      <span class="chip">до ${this.WIN}</span>
      <span class="chip" style="color:${rgb(PLAYER_COLORS[1])}">${this.P[1].score}</span>`;
  }
  serve(dir) {
    const a = (Math.random()-0.5) * 1.2;
    this.ball.x = W/2; this.ball.y = H/2;
    this.ball.vx = dir * 6 * Math.cos(a);
    this.ball.vy = 6 * Math.sin(a);
    this.ball.trail = [];
    this.serveAt = performance.now() + 900;
  }
  drawScene() {
    ctx.fillStyle = '#0b0d20'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3e4268';
    for (let y = 10; y < H; y += 32) ctx.fillRect(W/2-2, y, 4, 16);
    ctx.font = '900 112px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgb(PLAYER_COLORS[0].map(c => c*0.55));
    ctx.fillText(this.P[0].score, W/2-120, 100);
    ctx.fillStyle = rgb(PLAYER_COLORS[1].map(c => c*0.55));
    ctx.fillText(this.P[1].score, W/2+120, 100);
    const now = performance.now();
    this.ball.trail.forEach((t, i) => {
      const k = (i+1)/this.ball.trail.length;
      ctx.fillStyle = `rgba(200,210,255,${k*0.8})`;
      ctx.beginPath(); ctx.arc(t[0], t[1], 2 + 7*k, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, 9, 0, Math.PI*2); ctx.fill();
    for (const p of this.P) {
      ctx.fillStyle = rgb(p.color);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h, 7); else ctx.rect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
      ctx.fill();
    }
    if (this.orb) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath(); ctx.arc(this.orb.x + 15, this.orb.y + 15, 15, 0, Math.PI*2); ctx.fill();
    }
    if (now < this.msg[1]) {
      ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gold; ctx.fillText(this.msg[0], W/2, H-40);
    }
  }
  update() {
    const now = performance.now();
    for (const p of this.P) {
      const r = p.rect;
      if (keys.has(p.up)) r.y -= 8;
      if (keys.has(p.down)) r.y += 8;
      const h = now < p.big ? 170 : (now < p.small ? 60 : 100);
      const cy = r.y + r.h/2;
      r.h = h; r.y = cy - h/2;
      r.y = Math.max(0, Math.min(H-h, r.y));
    }
    if (now < this.serveAt) return;
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.trail.push([this.ball.x, this.ball.y]);
    if (this.ball.trail.length > 16) this.ball.trail.shift();
    if (this.ball.y < 9) { this.ball.y = 9; this.ball.vy = Math.abs(this.ball.vy); sfx.beep(); }
    if (this.ball.y > H-9) { this.ball.y = H-9; this.ball.vy = -Math.abs(this.ball.vy); sfx.beep(); }
    const br = 9;
    for (let i = 0; i < 2; i++) {
      const p = this.P[i], r = p.rect;
      const coming = i === 0 ? this.ball.vx < 0 : this.ball.vx > 0;
      const inFront = i === 0 ? this.ball.x > r.x + r.w/2 : this.ball.x < r.x + r.w/2;
      if (coming && inFront && this.ball.x + br > r.x && this.ball.x - br < r.x + r.w && this.ball.y + br > r.y && this.ball.y - br < r.y + r.h) {
        const off = Math.max(-1, Math.min(1, (this.ball.y - (r.y + r.h/2)) / (r.h/2 + 9)));
        const speed = Math.min(Math.hypot(this.ball.vx, this.ball.vy) * 1.06, 16);
        const vy = off * speed * 0.75;
        const vx = Math.sqrt(Math.max(speed*speed - vy*vy, 1)) * (i === 0 ? 1 : -1);
        this.ball.vx = vx; this.ball.vy = vy;
        this.ball.x = i === 0 ? r.x + r.w + 10 : r.x - 10;
        this.ball.last = i;
        sfx.hit();
      }
    }
    if (this.orb === null && Math.random() < 0.004) {
      this.orb = { x: W/2-250 + Math.random()*470, y: 80 + Math.random()*(H-190) };
    }
    if (this.orb && this.ball.x + br > this.orb.x && this.ball.x - br < this.orb.x + 30 && this.ball.y + br > this.orb.y && this.ball.y - br < this.orb.y + 30 && this.ball.last !== undefined) {
      const me = this.P[this.ball.last], enemy = this.P[1 - this.ball.last];
      const eff = ['big','small','slow','fast'][Math.floor(Math.random()*4)];
      if (eff === 'big') { me.big = now + 8000; this.msg = [me.name + ': ракетка больше!', now + 2000]; }
      else if (eff === 'small') { enemy.small = now + 8000; this.msg = [me.name + ': ракетка врага меньше!', now + 2000]; }
      else if (eff === 'slow') { this.ball.vx *= 0.6; this.ball.vy *= 0.6; this.msg = ['Мяч замедлился', now + 2000]; }
      else { this.ball.vx *= 1.4; this.ball.vy *= 1.4; this.msg = ['Мяч ускорился!', now + 2000]; }
      sfx.bonus();
      this.orb = null;
    }
    if (this.ball.x < 0 || this.ball.x > W) {
      const scorer = this.ball.x < 0 ? 1 : 0;
      this.P[scorer].score++;
      this.renderHud();
      sfx.boom();
      this.serve(scorer === 1 ? -1 : 1);
    }
    for (const p of this.P) {
      if (p.score >= this.WIN && !this.ended) {
        this.ended = true;
        showOverlay('Победил ' + p.name + '!', ['Счёт: ' + this.P[0].score + ' : ' + this.P[1].score], rgb(p.color));
      }
    }
  }
  render() { this.drawScene(); }
}

/* ============================================================
   ИГРА 4 — ТАНКИ
   ============================================================ */
class TanksGame {
  start() {
    this.TOP = 56;
    this.walls = this.makeWalls();
    const midY = (this.TOP + H) / 2;
    this.tanks = [
      { x: 90, y: midY, ang: 0, color: PLAYER_COLORS[0], name: PLAYER_NAMES[0], left: 'KeyA', right: 'KeyD', fwd: 'KeyW', back: 'KeyS', fire: ['KeyF','Space'], alive: true, last: 0, shield: false, triple: 0, fast: 0 },
      { x: W-90, y: midY, ang: Math.PI, color: PLAYER_COLORS[1], name: PLAYER_NAMES[1], left: 'ArrowLeft', right: 'ArrowRight', fwd: 'ArrowUp', back: 'ArrowDown', fire: ['Enter','ShiftRight','Numpad0'], alive: true, last: 0, shield: false, triple: 0, fast: 0 }
    ];
    this.bullets = [];
    this.crate = null;
    this.msg = ['', 0];
    this.wins = [0, 0];
    this.endAt = null;
    this.renderHud();
    const self = this;
    countdown(() => self.drawScene(), 3);
  }
  renderHud() {
    hud.innerHTML = `<span class="chip" style="color:${rgb(PLAYER_COLORS[0])}">${PLAYER_NAMES[0]} ${this.wins[0]}</span>
      <span class="chip" style="color:${rgb(PLAYER_COLORS[1])}">${PLAYER_NAMES[1]} ${this.wins[1]}</span>`;
  }
  makeWalls() {
    const walls = [
      { x: 0, y: this.TOP, w: W, h: 14 },
      { x: 0, y: H-14, w: W, h: 14 },
      { x: 0, y: this.TOP, w: 14, h: H - this.TOP },
      { x: W-14, y: this.TOP, w: 14, h: H - this.TOP }
    ];
    const mid = (this.TOP + H) / 2;
    const spawns = [{ x: 40, y: mid-90, w: 160, h: 180 }, { x: W-200, y: mid-90, w: 160, h: 180 }];
    for (let i = 0; i < 4 + Math.floor(Math.random()*3); i++) {
      for (let t = 0; t < 30; t++) {
        let w, h;
        if (Math.random() < 0.5) { w = 80 + Math.random()*120; h = 24; }
        else { w = 24; h = 80 + Math.random()*100; }
        const x = 120 + Math.random()*(W/2 - 40 - w - 120);
        const y = this.TOP + 40 + Math.random()*(H - 90 - h - this.TOP - 40);
        const a = { x, y, w, h };
        const b = { x: W - x - w, y: this.TOP + H - y - h, w, h };
        const okA = spawns.every(s => !this.rectsOverlap(a, { x: s.x-30, y: s.y-30, w: s.w+60, h: s.h+60 }));
        const okB = spawns.every(s => !this.rectsOverlap(b, { x: s.x-30, y: s.y-30, w: s.w+60, h: s.h+60 }));
        if (okA && okB) { walls.push(a, b); break; }
      }
    }
    return walls;
  }
  rectsOverlap(a, b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  circleRect(cx, cy, r, rect) {
    const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    return (cx-nx)**2 + (cy-ny)**2 < r*r;
  }
  free(x, y) { return !this.walls.some(w => this.circleRect(x, y, 16, w)); }
  drawScene() {
    ctx.fillStyle = '#0b0d20'; ctx.fillRect(0, 0, W, H);
    for (const w of this.walls) {
      ctx.fillStyle = '#46506e'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#7a82aa'; ctx.lineWidth = 2; ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    if (this.crate) {
      ctx.fillStyle = '#d4a046'; ctx.fillRect(this.crate.x, this.crate.y, this.crate.w, this.crate.h);
      ctx.fillStyle = '#7a3c00'; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', this.crate.x + 13, this.crate.y + 13);
    }
    const now = performance.now();
    for (const b of this.bullets) {
      ctx.fillStyle = '#ffe68a';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    }
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const c = Math.cos(t.ang), s = Math.sin(t.ang);
      const rot = (px, py) => [t.x + px*c - py*s, t.y + px*s + py*c];
      // гусеницы
      for (const sy of [-14, 14]) {
        const [x1, y1] = rot(-19, sy);
        const [x2, y2] = rot(19, sy);
        ctx.strokeStyle = '#12141e'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // корпус
      ctx.fillStyle = rgb(t.color);
      ctx.beginPath();
      const corners = [[-18,-11],[18,-11],[18,11],[-18,11]].map(p => rot(p[0], p[1]));
      ctx.moveTo(corners[0][0], corners[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
      ctx.closePath(); ctx.fill();
      // ствол
      const [bx, by] = rot(28, 0);
      ctx.strokeStyle = '#eef0fa'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(bx, by); ctx.stroke();
      // башня
      ctx.fillStyle = rgb([Math.min(255, t.color[0]+50), Math.min(255, t.color[1]+50), Math.min(255, t.color[2]+50)]);
      ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI*2); ctx.fill();
      if (t.shield) {
        ctx.strokeStyle = '#7ce2ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, 26 + Math.sin(now/120)*2, 0, Math.PI*2); ctx.stroke();
      }
    }
    if (now < this.msg[1]) {
      ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gold; ctx.fillText(this.msg[0], W/2, 28);
    }
  }
  update() {
    const now = performance.now();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (keys.has(t.left)) t.ang -= 0.065;
      if (keys.has(t.right)) t.ang += 0.065;
      const d = ((keys.has(t.fwd) ? 1 : 0) - (keys.has(t.back) ? 1 : 0)) * (now < t.fast ? 3.4 : 2.4);
      if (d) {
        const nx = t.x + Math.cos(t.ang) * d, ny = t.y + Math.sin(t.ang) * d;
        if (this.free(nx, ny)) { t.x = nx; t.y = ny; }
        else if (this.free(nx, t.y)) t.x = nx;
        else if (this.free(t.x, ny)) t.y = ny;
      }
      if (t.fire.some(k => keys.has(k)) && now - t.last > 450 && this.bullets.filter(b => b.owner === t).length < 6) {
        t.last = now; sfx.shoot();
        const angles = now < t.triple ? [-0.28, 0, 0.28] : [0];
        for (const da of angles) {
          const a = t.ang + da;
          const bx = t.x + Math.cos(a)*26, by = t.y + Math.sin(a)*26;
          if (!this.walls.some(w => this.rectsOverlap({ x: bx-3, y: by-3, w: 6, h: 6 }, w)))
            this.bullets.push({ x: bx, y: by, vx: Math.cos(a)*7, vy: Math.sin(a)*7, b: 0, born: now, owner: t });
        }
      }
    }
    // столкновения танков
    const [a, b] = this.tanks;
    if (a.alive && b.alive) {
      const dx = b.x-a.x, dy = b.y-a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      if (dist < 34) {
        const push = (34-dist)/2;
        const ux = dx/dist*push, uy = dy/dist*push;
        if (this.free(a.x-ux, a.y-uy)) { a.x -= ux; a.y -= uy; }
        if (this.free(b.x+ux, b.y+uy)) { b.x += ux; b.y += uy; }
      }
    }
    // пули
    for (const bl of this.bullets) {
      if (bl.dead) continue;
      bl.x += bl.vx;
      if (this.walls.some(w => this.rectsOverlap({ x: bl.x-3, y: bl.y-3, w: 6, h: 6 }, w))) { bl.x -= bl.vx; bl.vx = -bl.vx; bl.b++; }
      bl.y += bl.vy;
      if (this.walls.some(w => this.rectsOverlap({ x: bl.x-3, y: bl.y-3, w: 6, h: 6 }, w))) { bl.y -= bl.vy; bl.vy = -bl.vy; bl.b++; }
      if (bl.b > 3 || now - bl.born > 5000) { bl.dead = true; continue; }
      for (const t of this.tanks) {
        if (t.alive && t !== bl.owner && (bl.x-t.x)**2 + (bl.y-t.y)**2 < 19**2) {
          bl.dead = true;
          if (t.shield) { t.shield = false; sfx.hit(); }
          else { t.alive = false; sfx.boom(); }
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);
    // ящик
    if (!this.crate && Math.random() < 0.003) {
      for (let i = 0; i < 30; i++) {
        const r = { x: 60 + Math.random()*(W-150), y: this.TOP+30 + Math.random()*(H-this.TOP-70), w: 26, h: 26 };
        if (!this.walls.some(w => this.rectsOverlap({ x: r.x-20, y: r.y-20, w: r.w+40, h: r.h+40 }, w))) { this.crate = r; break; }
      }
    }
    if (this.crate) {
      for (const t of this.tanks) {
        if (t.alive && this.circleRect(t.x, t.y, 16, this.crate)) {
          const eff = ['triple','shield','fast'][Math.floor(Math.random()*3)];
          if (eff === 'triple') t.triple = now + 6000;
          else if (eff === 'shield') t.shield = true;
          else t.fast = now + 6000;
          sfx.bonus();
          this.crate = null;
          break;
        }
      }
    }
    if (this.tanks.filter(t => t.alive).length < 2 && this.endAt === null) this.endAt = now + 1400;
    if (this.endAt && now >= this.endAt && !this.ended) {
      this.ended = true;
      const alive = this.tanks.filter(t => t.alive);
      if (alive.length === 0) showOverlay('Ничья!', ['Оба танка уничтожены']);
      else {
        const w = this.tanks.indexOf(alive[0]);
        this.wins[w]++;
        showOverlay('Победил ' + PLAYER_NAMES[w] + '!', ['Счёт: ' + this.wins[0] + ' : ' + this.wins[1]], rgb(PLAYER_COLORS[w]));
      }
    }
  }
  render() { this.drawScene(); }
}

/* ============================================================
   ИГРА 5 — СУМО
   ============================================================ */
class SumoGame {
  start() { this.n = 2; this.showPlayerModal(); }
  showPlayerModal() {
    canvas.classList.add('hidden'); domGame.classList.add('active');
    domGame.innerHTML = `<div class="players-modal">
      <h3 style="color:#ff6ec4">Сумо-арена</h3>
      <p class="sub">Сколько игроков?</p>
      <div class="player-cards">
        ${[2,3,4].map(n => `<div class="player-card" data-n="${n}" style="--accent:#ff6ec4">
          <div class="big-num" style="color:#ff6ec4">${n}</div>
          <div class="dots">${Array.from({length:n},(_,i)=>`<span class="dot" style="background:${rgb(PLAYER_COLORS[i])}"></span>`).join('')}</div>
        </div>`).join('')}
      </div>
    </div>`;
    domGame.querySelectorAll('.player-card').forEach(c => c.addEventListener('click', () => {
      this.n = parseInt(c.dataset.n);
      domGame.classList.remove('active'); domGame.innerHTML = ''; canvas.classList.remove('hidden');
      this.initGame();
    }));
  }
  initGame() {
    this.CX = W/2; this.CY = H/2 + 24;
    this.R0 = 290; this.R1 = 130; this.DUR = 70;
    this.PR = 22;
    this.wins = new Array(this.n).fill(0);
    const ctrls = [
      [['KeyW'],['KeyS'],['KeyA'],['KeyD']],
      [['ArrowUp'],['ArrowDown'],['ArrowLeft'],['ArrowRight']],
      [['KeyI'],['KeyK'],['KeyJ'],['KeyL']],
      [['Numpad8'],['Numpad5'],['Numpad4'],['Numpad6']]
    ];
    this.ctrl = ctrls.slice(0, this.n);
    this.startTime = performance.now();
    this.iceUntil = 0; this.blast = null; this.nextEvent = this.startTime + 6000;
    this.msg = ['', 0]; this.endAt = null;
    this.resetPlayers();
    this.renderHud();
    const self = this;
    countdown(() => self.drawScene(), 3, () => { self.startTime = performance.now(); });
  }
  resetPlayers() {
    this.players = Array.from({length: this.n}, (_, i) => {
      const a = Math.PI*2 * i / this.n + (Math.random()-0.5)*0.4;
      return { i, x: this.CX + 150*Math.cos(a), y: this.CY + 150*Math.sin(a), vx: 0, vy: 0, alive: true, fall: 0 };
    });
  }
  renderHud() {
    hud.innerHTML = this.players.map(p => `<span class="chip" style="color:${rgb(PLAYER_COLORS[p.i])}">${PLAYER_NAMES[p.i]} ${this.wins[p.i]}</span>`).join('');
  }
  arenaRadius(now) { return this.R0 - (this.R0 - this.R1) * Math.min(1, (now - this.startTime)/1000/this.DUR); }
  drawScene() {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    const now = performance.now();
    const ice = now < this.iceUntil;
    const ar = this.arenaRadius(now);
    const base = ice ? [140,196,240] : [78,88,124];
    for (let rr = Math.floor(ar); rr > 0; rr -= 8) {
      const k = 1 - rr / Math.max(ar, 1);
      ctx.fillStyle = rgb(base.map(c => Math.min(255, c + k*40)));
      ctx.beginPath(); ctx.arc(this.CX, this.CY, rr, 0, Math.PI*2); ctx.fill();
    }
    const danger = 1 - (ar - this.R1) / (this.R0 - this.R1);
    ctx.strokeStyle = `rgb(${120+135*danger},${160-100*danger},${200-140*danger})`;
    ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(this.CX, this.CY, ar, 0, Math.PI*2); ctx.stroke();
    if (this.blast) {
      const pulse = 1 + 0.15 * Math.sin(now/60);
      ctx.strokeStyle = '#ff5a46'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.blast[0], this.blast[1], 130*pulse, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#ff9646';
      ctx.beginPath(); ctx.arc(this.blast[0], this.blast[1], 14*pulse, 0, Math.PI*2); ctx.fill();
    }
    for (const p of this.players) {
      let col = PLAYER_COLORS[p.i], scale = 1;
      if (!p.alive) {
        scale = 1 - (now - p.fall) / 700;
        if (scale <= 0) continue;
        col = col.map(c => c * Math.max(0.2, scale));
      }
      const r = this.PR * scale;
      ctx.fillStyle = rgb(col);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(p.x-r*0.3, p.y-r*0.3, r/4, 0, Math.PI*2); ctx.fill();
    }
    if (now < this.msg[1]) {
      ctx.font = 'bold 34px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.gold; ctx.fillText(this.msg[0], W/2, 80);
    }
  }
  update() {
    const now = performance.now();
    const ar = this.arenaRadius(now);
    const ice = now < this.iceUntil;
    const fr = ice ? 0.975 : 0.90;
    const acc = ice ? 0.25 : 0.55;
    if (now >= this.nextEvent && !ice && !this.blast) {
      this.nextEvent = now + 6000 + Math.random()*4000;
      if (Math.random() < 0.5) {
        this.iceUntil = now + 6000;
        this.msg = ['ЛЁД! Всё скользит!', now + 2500];
        sfx.bonus();
      } else {
        const a = Math.random()*Math.PI*2;
        const d = Math.random()*ar*0.6;
        this.blast = [this.CX + d*Math.cos(a), this.CY + d*Math.sin(a), now + 1500];
        this.msg = ['ВЗРЫВ! Бегите!', now + 1500];
        sfx.bad();
      }
    }
    for (const p of this.players) {
      if (p.alive) {
        const c = this.ctrl[p.i];
        p.vx += ((c[3].some(k=>keys.has(k))?1:0) - (c[2].some(k=>keys.has(k))?1:0)) * acc;
        p.vy += ((c[1].some(k=>keys.has(k))?1:0) - (c[0].some(k=>keys.has(k))?1:0)) * acc;
        p.vx *= fr; p.vy *= fr;
      } else { p.vx *= 0.95; p.vy *= 0.95; }
      p.x += p.vx; p.y += p.vy;
    }
    if (this.blast && now >= this.blast[2]) {
      for (const p of this.players) {
        if (!p.alive) continue;
        const dx = p.x - this.blast[0], dy = p.y - this.blast[1];
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 130) {
          const force = (130-d)/130 * 14 + 3;
          p.vx += dx/d * force; p.vy += dy/d * force;
        }
      }
      sfx.boom();
      this.blast = null;
    }
    // столкновения
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i+1; j < this.players.length; j++) {
        const a = this.players[i], b = this.players[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x-a.x, dy = b.y-a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 2*this.PR) {
          const nx = dx/d, ny = dy/d;
          const overlap = 2*this.PR - d;
          a.x -= nx*overlap/2; a.y -= ny*overlap/2;
          b.x += nx*overlap/2; b.y += ny*overlap/2;
          const vn = (a.vx - b.vx)*nx + (a.vy - b.vy)*ny;
          if (vn > 0) {
            const jimp = (1+1.2)*vn/2;
            a.vx -= jimp*nx; a.vy -= jimp*ny;
            b.vx += jimp*nx; b.vy += jimp*ny;
            if (vn > 2) sfx.hit();
          }
        }
      }
    }
    for (const p of this.players) {
      if (p.alive && Math.hypot(p.x - this.CX, p.y - this.CY) > ar + 4) {
        p.alive = false; p.fall = now;
        sfx.bad();
      }
    }
    const alive = this.players.filter(p => p.alive);
    if (alive.length <= 1 && this.endAt === null) this.endAt = now + 1200;
    if (this.endAt && now >= this.endAt && !this.ended) {
      this.ended = true;
      if (alive.length === 0) showOverlay('Ничья!', ['Все улетели в воду']);
      else {
        const w = alive[0].i;
        this.wins[w]++;
        showOverlay('Победил ' + PLAYER_NAMES[w] + '!', this.players.map(p => PLAYER_NAMES[p.i] + ': ' + this.wins[p.i]), rgb(PLAYER_COLORS[w]));
      }
    }
  }
  render() { this.drawScene(); }
}

/* ============================================================
   ИГРА 6 — ДУЭЛЬ
   ============================================================ */
class DuelGame {
  start() {
    this.scores = [0, 0];
    this.TARGET = 3;
    this.GY = 470;
    this.colors = [[70,210,130], [96,156,255]];
    this.renderHud();
    this.newRound();
  }
  renderHud() {
    hud.innerHTML = `<span class="chip" style="color:${rgb(this.colors[0])}">${PLAYER_NAMES[0]} ${this.scores[0]}</span>
      <span class="chip">до ${this.TARGET}</span>
      <span class="chip" style="color:${rgb(this.colors[1])}">${PLAYER_NAMES[1]} ${this.scores[1]}</span>`;
  }
  newRound() {
    const now = performance.now();
    this.goAt = now + 2500 + Math.random()*4000;
    this.fake = Math.random() < 0.6 ? [now + 1000 + Math.random()*2500, 0] : null;
    if (this.fake) this.fake[1] = this.fake[0] + 800;
    this.state = 'wait';
    this.goTime = 0;
    this.winner = null;
    this.text = '';
    this.rt = null;
    this.tRes = 0;
  }
  onKeyDown(e) {
    const idx = e.code === 'KeyA' ? 0 : e.code === 'KeyL' ? 1 : -1;
    if (idx < 0) return;
    const now = performance.now();
    if (this.state === 'wait') {
      this.state = 'result'; this.winner = 1-idx; this.tRes = now;
      this.text = 'Фальстарт! ' + PLAYER_NAMES[idx] + ' дёрнулся раньше';
      this.scores[1-idx]++;
      this.renderHud();
      sfx.bad();
    } else if (this.state === 'go') {
      this.state = 'result'; this.winner = idx; this.rt = now - this.goTime; this.tRes = now;
      this.text = PLAYER_NAMES[idx] + ' стреляет первым!';
      this.scores[idx]++;
      this.renderHud();
      sfx.boom();
    }
  }
  drawCowboy(x, y, color, facing, mode, now) {
    const skin = '#eecca8', dark = '#281c1e';
    if (mode === 'dead') {
      ctx.fillStyle = rgb(color); ctx.fillRect(x-40, y-16, 70, 16);
      ctx.fillStyle = dark; ctx.fillRect(x+30, y-12, 26, 10);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x-52, y-10, 12, 0, Math.PI*2); ctx.fill();
      return;
    }
    ctx.fillStyle = dark;
    ctx.fillRect(x-13, y-42, 11, 42); ctx.fillRect(x+2, y-42, 11, 42);
    ctx.fillStyle = rgb(color);
    ctx.fillRect(x-17, y-92, 34, 54);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, y-106, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x-13, y-132, 26, 22);
    const ay = mode === 'idle' ? y-70 : y-84;
    const reach = mode === 'idle' ? 12 : 36;
    const ax = x + facing*reach;
    ctx.strokeStyle = skin; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x, y-82); ctx.lineTo(ax, ay); ctx.stroke();
    if (mode === 'aim' || mode === 'shoot') {
      const gx = ax + facing*26;
      ctx.strokeStyle = '#1e1e24'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(gx, ay); ctx.stroke();
      if (mode === 'shoot') {
        ctx.fillStyle = '#fff096';
        ctx.beginPath(); ctx.arc(gx + facing*10, ay, 12, 0, Math.PI*2); ctx.fill();
      }
    }
  }
  drawScene() {
    const now = performance.now();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ff9c5c'); g.addColorStop(0.4, '#7a3d7a'); g.addColorStop(1, '#14102e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe296';
    ctx.beginPath(); ctx.arc(W/2, 330, 90, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#38201e';
    ctx.fillRect(0, this.GY, W, H - this.GY);
    ctx.fillStyle = '#603838';
    ctx.fillRect(0, this.GY, W, 8);
    let m0 = 'idle', m1 = 'idle';
    if (this.state === 'go') m0 = m1 = 'aim';
    else if (this.state === 'result' && this.winner !== null) {
      m0 = this.winner === 0 ? 'shoot' : 'dead';
      m1 = this.winner === 1 ? 'shoot' : 'dead';
    }
    this.drawCowboy(250, this.GY, this.colors[0], 1, m0, now);
    this.drawCowboy(W-250, this.GY, this.colors[1], -1, m1, now);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.state === 'wait') {
      ctx.font = '900 62px Inter'; ctx.fillStyle = '#fff';
      ctx.fillText('Приготовьтесь...', W/2, 120);
      ctx.font = '500 20px Inter'; ctx.fillStyle = 'rgba(255,240,220,0.85)';
      ctx.fillText('Жми только на ОГОНЬ!', W/2, 180);
      if (this.fake && this.fake[0] <= now && now < this.fake[1]) {
        ctx.font = '500 22px Inter'; ctx.fillStyle = '#fff0d2';
        ctx.fillText('Ворона каркнула... не ведись!', W/2, 230);
      }
    } else if (this.state === 'go') {
      ctx.font = '900 112px Inter'; ctx.fillStyle = '#ff4638';
      ctx.fillText('ОГОНЬ!', W/2, 150);
    } else if (this.state === 'result') {
      ctx.font = '700 26px Inter'; ctx.fillStyle = '#fff';
      ctx.fillText(this.text, W/2, 150);
      if (this.rt !== null) {
        ctx.font = '700 22px Inter'; ctx.fillStyle = COLORS.gold;
        ctx.fillText('Реакция: ' + this.rt + ' мс', W/2, 200);
      }
    }
    // Клавиши
    ctx.font = 'bold 14px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('A', 250, this.GY + 40);
    ctx.fillText('L', W-250, this.GY + 40);
  }
  update() {
    const now = performance.now();
    if (this.state === 'wait' && now >= this.goAt) { this.state = 'go'; this.goTime = now; sfx.go(); }
    if (this.state === 'go' && now - this.goTime > 3500) {
      this.state = 'result'; this.winner = null; this.rt = null; this.tRes = now;
      this.text = 'Никто не выстрелил — раунд без очков';
    }
    if (this.state === 'result' && now - this.tRes > 2600 && !this.ended) {
      if (Math.max(...this.scores) >= this.TARGET) {
        this.ended = true;
        const w = this.scores.indexOf(Math.max(...this.scores));
        showOverlay(PLAYER_NAMES[w] + ' — лучший стрелок!', ['Счёт: ' + this.scores[0] + ' : ' + this.scores[1]], rgb(this.colors[w]));
      } else this.newRound();
    }
  }
  render() { this.drawScene(); }
}

/* ============================================================
   ИГРА 7 — ВИСЕЛИЦА
   ============================================================ */
class HangmanGame {
  start() {
    canvas.classList.add('hidden');
    domGame.classList.add('active');
    this.showModeSelect();
  }
  showModeSelect() {
    domGame.innerHTML = `<div class="players-modal">
      <h3 style="color:#c8a4ff">ВИСЕЛИЦА</h3>
      <p class="sub">Выбери режим</p>
      <div class="player-cards">
        <div class="player-card" data-mode="1" style="--accent:#68e2b8;width:260px">
          <div class="big-num" style="color:#68e2b8;font-size:40px">1</div>
          <div style="color:#8e96b4;font-size:13px;text-align:center;padding:0 12px">Компьютер<br>загадывает</div>
        </div>
        <div class="player-card" data-mode="2" style="--accent:#7eb4ff;width:260px">
          <div class="big-num" style="color:#7eb4ff;font-size:40px">2</div>
          <div style="color:#8e96b4;font-size:13px;text-align:center;padding:0 12px">Два игрока:<br>один загадывает</div>
        </div>
      </div>
    </div>`;
    domGame.querySelectorAll('.player-card').forEach(c => c.addEventListener('click', () => {
      const m = parseInt(c.dataset.mode);
      if (m === 1) { this.word = this.pickRandom(); this.startGame(); }
      else this.promptWord();
    }));
  }
  pickRandom() {
    const pool = Math.random() < 0.5 ? WORDS5 : WORDS6;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  promptWord() {
    domGame.innerHTML = `<div style="padding:40px;text-align:center">
      <h3 style="color:#c8a4ff;font-size:32px;margin-bottom:20px">Игрок 1, загадай слово</h3>
      <input id="word-input" type="text" maxlength="12" autocomplete="off" autofocus
        style="padding:16px 24px;font-size:24px;border-radius:14px;border:2px solid rgba(200,164,255,0.4);background:rgba(20,22,46,0.9);color:#ecf0fc;text-align:center;letter-spacing:8px;text-transform:uppercase;outline:none;width:min(400px,80vw);font-family:inherit">
      <div style="margin-top:12px;color:#8e96b4;font-size:13px">Только русские буквы, от 3 до 12</div>
      <div style="margin-top:20px"><button id="word-ok" class="btn btn-primary" style="--accent:#c8a4ff;color:#111">Готово</button></div>
      <div style="margin-top:40px;color:#8e96b4;font-size:13px">Второй игрок — отвернись!</div>
    </div>`;
    const input = document.getElementById('word-input');
    const go = () => {
      const w = input.value.trim().toLowerCase().replace(/ё/g, 'е');
      if (w.length >= 3 && w.length <= 12 && /^[а-я]+$/.test(w)) { this.word = w; this.startGame(); }
      else { input.style.borderColor = '#ff606e'; input.focus(); setTimeout(() => input.style.borderColor = 'rgba(200,164,255,0.4)', 800); }
    };
    document.getElementById('word-ok').onclick = go;
    input.onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => input.focus(), 50);
  }
  startGame() {
    this.guessed = new Set();
    this.wrong = 0;
    this.MAX_WRONG = 7;
    this.state = 'play';
    this.rendered = false;
    this.render();
  }
  render() {
    if (this.rendered) return;
    this.rendered = true;
    const word = this.word;
    const n = word.length;
    let wordHtml = '';
    for (let i = 0; i < n; i++) {
      const ch = word[i];
      wordHtml += `<div class="tile ${this.guessed.has(ch) || this.state === 'lose' ? (this.state==='lose' && !this.guessed.has(ch) ? 'filled' : 'filled') : ''}" data-idx="${i}" style="width:52px;height:60px;font-size:26px;${this.guessed.has(ch) && word[i] === ch ? '' : ''}">${this.guessed.has(ch) || this.state === 'lose' ? ch.toUpperCase() : ''}</div>`;
    }
    const kbRows = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
    domGame.innerHTML = `<div class="hangman-wrap">
      <div class="hangman-panel">
        <svg viewBox="0 0 300 400" style="width:100%;height:auto;max-height:380px">
          <line x1="20" y1="380" x2="280" y2="380" stroke="#46506e" stroke-width="6"/>
          <line x1="80" y1="380" x2="80" y2="50" stroke="#8a6a4a" stroke-width="7"/>
          <line x1="80" y1="50" x2="220" y2="50" stroke="#8a6a4a" stroke-width="7"/>
          <line x1="80" y1="100" x2="120" y2="50" stroke="#8a6a4a" stroke-width="5"/>
          <line x1="220" y1="50" x2="220" y2="95" stroke="#8a6a4a" stroke-width="4"/>
          ${this.wrong >= 4 ? '<circle cx="220" cy="120" r="26" fill="none" stroke="#ecd0b0" stroke-width="4"/>' : ''}
          ${this.wrong >= 5 ? '<line x1="220" y1="146" x2="220" y2="252" stroke="#ecd0b0" stroke-width="5"/>' : ''}
          ${this.wrong >= 6 ? '<line x1="220" y1="170" x2="180" y2="220" stroke="#ecd0b0" stroke-width="5"/><line x1="220" y1="170" x2="260" y2="220" stroke="#ecd0b0" stroke-width="5"/>' : ''}
          ${this.wrong >= 7 ? '<line x1="220" y1="252" x2="185" y2="325" stroke="#ecd0b0" stroke-width="5"/><line x1="220" y1="252" x2="255" y2="325" stroke="#ecd0b0" stroke-width="5"/>' : ''}
        </svg>
      </div>
      <div class="hangman-right">
        <div class="wordle-grid" style="gap:8px">${wordHtml}</div>
        <div style="text-align:center;margin-top:20px;color:#8e96b4;font-size:14px">Ошибки: <strong style="color:#ff606e">${this.wrong}</strong> / ${this.MAX_WRONG}</div>
        <div id="hangman-msg" style="text-align:center;font-size:22px;font-weight:800;margin-top:8px;min-height:30px"></div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px" id="kb-wrap">
          ${kbRows.map(row => `<div class="kb-row">${[...row].map(c => `<button class="key" data-key="${c}">${c.toUpperCase()}</button>`).join('')}</div>`).join('')}
        </div>
        <div class="hint-text">Жми буквы. Используй физическую клавиатуру тоже</div>
      </div>
    </div>`;
    domGame.querySelectorAll('.key').forEach(k => k.addEventListener('click', () => this.guess(k.dataset.key)));
  }
  guess(ch) {
    if (this.state !== 'play' || this.guessed.has(ch) || !/[а-яё]/.test(ch)) return;
    ch = ch.replace('ё', 'е');
    this.guessed.add(ch);
    if (!this.word.includes(ch)) {
      this.wrong++; sfx.bad();
      if (this.wrong >= this.MAX_WRONG) { this.state = 'lose'; this.finish(); return; }
    } else {
      sfx.coin();
      if ([...this.word].every(c => this.guessed.has(c))) { this.state = 'win'; this.finish(); return; }
    }
    this.rendered = false;
    this.render();
  }
  finish() {
    this.rendered = false;
    this.render();
    const msg = document.getElementById('hangman-msg');
    if (this.state === 'win') { msg.textContent = '🎉 ПОБЕДА!'; msg.style.color = '#2ecc84'; sfx.bonus(); }
    else { msg.textContent = '💀 ПРОИГРЫШ. Слово: ' + this.word.toUpperCase(); msg.style.color = '#ff606e'; sfx.boom(); }
    domGame.querySelectorAll('.key').forEach(k => {
      const c = k.dataset.key.replace('ё', 'е');
      if (this.guessed.has(c)) {
        k.classList.add(this.word.includes(c) ? 'green' : 'red');
      }
    });
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Ещё раз (R)';
    btn.style.cssText = 'margin-top:14px;--accent:#c8a4ff;color:#111';
    btn.onclick = () => this.startGame();
    domGame.querySelector('.hangman-right').appendChild(btn);
  }
  onDomClick(key) { this.guess(key); }
  onKeyDown(e) {
    if (e.code === 'KeyR' && (this.state === 'win' || this.state === 'lose')) { this.startGame(); return; }
    if (this.state !== 'play') return;
    let ch = null;
    if (e.key && /[а-яё]/i.test(e.key)) ch = e.key.toLowerCase();
    else if (e.code && e.code.startsWith('Key')) {
      const map = { KeyQ:'й',KeyW:'ц',KeyE:'у',KeyR:'к',KeyT:'е',KeyY:'н',KeyU:'г',KeyI:'ш',KeyO:'щ',KeyP:'з',
        KeyA:'ф',KeyS:'ы',KeyD:'в',KeyF:'а',KeyG:'п',KeyH:'р',KeyJ:'о',KeyK:'л',KeyL:'д',
        KeyZ:'я',KeyX:'ч',KeyC:'с',KeyV:'м',KeyB:'и',KeyN:'т',KeyM:'ь' };
      ch = map[e.code];
    }
    if (ch) this.guess(ch);
  }
}

/* ============================================================
   ИГРА 8 — WORDLE
   ============================================================ */
class WordleGame {
  start() {
    canvas.classList.add('hidden');
    domGame.classList.add('active');
    this.showLengthSelect();
  }
  showLengthSelect() {
    domGame.innerHTML = `<div class="players-modal">
      <h3 style="color:#68e2b8">WORDLE</h3>
      <p class="sub">Выбери длину слова</p>
      <div class="player-cards">
        ${[5,6].map(n => `<div class="player-card" data-len="${n}" style="--accent:#68e2b8;width:200px">
          <div class="big-num" style="color:#68e2b8">${n}</div>
          <div style="color:#8e96b4;font-size:13px">букв</div>
        </div>`).join('')}
      </div>
    </div>`;
    domGame.querySelectorAll('.player-card').forEach(c => c.addEventListener('click', () => {
      this.length = parseInt(c.dataset.len);
      this.initGame();
    }));
  }
  initGame() {
    const pool = this.length === 5 ? WORDS5 : WORDS6;
    this.secret = pool[Math.floor(Math.random()*pool.length)];
    this.vocab = new Set(pool);
    this.TRIES = 6;
    this.grid = Array.from({length: this.TRIES}, () => Array(this.length).fill(''));
    this.marks = Array(this.TRIES).fill(null);
    this.status = {};
    this.row = 0; this.col = 0;
    this.state = 'play';
    this.rendered = false;
    this.render();
  }
  render() {
    if (this.rendered && !this.forceRender) return;
    this.rendered = true;
    const n = this.length;
    let gridHtml = '';
    for (let r = 0; r < this.TRIES; r++) {
      let rowHtml = '';
      for (let c = 0; c < n; c++) {
        const ch = this.grid[r][c];
        const mk = this.marks[r] && this.marks[r][c];
        const cls = mk ? mk : (ch ? 'filled' : '');
        rowHtml += `<div class="tile ${cls}">${ch.toUpperCase()}</div>`;
      }
      gridHtml += `<div class="wordle-row">${rowHtml}</div>`;
    }
    const kbRows = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
    domGame.innerHTML = `<div class="wordle-wrap">
      <div class="wordle-left" style="flex:1.3">
        <div class="wordle-grid">${gridHtml}</div>
        <div id="wordle-msg" style="text-align:center;font-size:18px;font-weight:700;color:#ffd054;margin-top:16px;min-height:24px"></div>
      </div>
      <div class="wordle-right">
        <div id="kb-wrap" style="display:flex;flex-direction:column;gap:5px">
          ${kbRows.map((row, ri) => {
            let extra = '';
            if (ri === 2) extra = `<button class="key wide" data-key="back">⌫ Стереть</button>`;
            return `<div class="kb-row">
              ${ri === 2 ? `<button class="key wide" data-key="enter">Ввод</button>` : ''}
              ${[...row].map(c => {
                const st = this.status[c];
                return `<button class="key ${st || ''}" data-key="${c}">${c.toUpperCase()}</button>`;
              }).join('')}
              ${extra}
            </div>`;
          }).join('')}
        </div>
        <div class="hint-text">Enter — проверить · Backspace — стереть</div>
      </div>
    </div>`;
    domGame.querySelectorAll('.key').forEach(k => k.addEventListener('click', () => this.pressKey(k.dataset.key)));
  }
  pressKey(k) {
    if (this.state !== 'play') return;
    if (k === 'enter') this.submit();
    else if (k === 'back') { if (this.col > 0) { this.col--; this.grid[this.row][this.col] = ''; this.rendered = false; this.render(); } }
    else if (k.length === 1) {
      if (this.col < this.length) {
        this.grid[this.row][this.col] = k;
        this.col++;
        this.rendered = false;
        this.render();
      }
    }
  }
  submit() {
    if (this.col < this.length) { this.toast('Не хватает букв'); sfx.bad(); return; }
    const guess = this.grid[this.row].join('');
    if (!this.vocab.has(guess) && guess !== this.secret) { this.toast('Нет такого слова'); sfx.bad(); return; }
    const res = this.checkWord(guess);
    this.marks[this.row] = res;
    for (let i = 0; i < this.length; i++) {
      const ch = guess[i], st = res[i];
      const prev = this.status[ch];
      const rank = { gray: 0, yellow: 1, green: 2 };
      if (!prev || rank[st] > rank[prev]) this.status[ch] = st;
    }
    if (guess === this.secret) { this.state = 'win'; sfx.bonus(); }
    else { this.row++; this.col = 0; if (this.row >= this.TRIES) { this.state = 'lose'; sfx.boom(); } }
    this.rendered = false;
    this.render();
    if (this.state === 'win') {
      const msg = document.getElementById('wordle-msg');
      msg.innerHTML = `<span style="color:#2ecc84">🎉 Отгадано за ${this.row+1} из ${this.TRIES}!</span>`;
      const btn = document.createElement('button'); btn.className = 'btn btn-primary'; btn.textContent = 'Ещё (R)';
      btn.style.cssText = 'margin-top:12px;--accent:#68e2b8;color:#111';
      btn.onclick = () => this.initGame();
      document.getElementById('wordle-msg').appendChild(btn);
    } else if (this.state === 'lose') {
      const msg = document.getElementById('wordle-msg');
      msg.innerHTML = `<span style="color:#ff606e">Слово было: ${this.secret.toUpperCase()}</span>`;
      const btn = document.createElement('button'); btn.className = 'btn btn-primary'; btn.textContent = 'Ещё (R)';
      btn.style.cssText = 'margin-top:12px;--accent:#68e2b8;color:#111';
      btn.onclick = () => this.initGame();
      document.getElementById('wordle-msg').appendChild(btn);
    }
  }
  checkWord(guess) {
    const res = Array(this.length).fill('gray');
    const left = {};
    for (const c of this.secret) left[c] = (left[c] || 0) + 1;
    for (let i = 0; i < this.length; i++) if (guess[i] === this.secret[i]) { res[i] = 'green'; left[guess[i]]--; }
    for (let i = 0; i < this.length; i++) if (res[i] === 'gray' && left[guess[i]] > 0) { res[i] = 'yellow'; left[guess[i]]--; }
    return res;
  }
  toast(m) {
    const el = document.getElementById('wordle-msg');
    if (el) { el.textContent = m; setTimeout(() => { if (el.textContent === m) el.textContent = ''; }, 1600); }
  }
  onKeyDown(e) {
    if (e.code === 'KeyR' && (this.state === 'win' || this.state === 'lose')) { this.initGame(); return; }
    if (this.state !== 'play') return;
    if (e.code === 'Enter') this.submit();
    else if (e.code === 'Backspace') { e.preventDefault(); this.pressKey('back'); }
    else {
      let ch = null;
      if (e.key && /[а-яё]/i.test(e.key)) ch = e.key.toLowerCase().replace('ё','е');
      else if (e.code && e.code.startsWith('Key')) {
        const map = { KeyQ:'й',KeyW:'ц',KeyE:'у',KeyR:'к',KeyT:'е',KeyY:'н',KeyU:'г',KeyI:'ш',KeyO:'щ',KeyP:'з',
          KeyA:'ф',KeyS:'ы',KeyD:'в',KeyF:'а',KeyG:'п',KeyH:'р',KeyJ:'о',KeyK:'л',KeyL:'д',
          KeyZ:'я',KeyX:'ч',KeyC:'с',KeyV:'м',KeyB:'и',KeyN:'т',KeyM:'ь' };
        ch = map[e.code];
      }
      if (ch) this.pressKey(ch);
    }
  }
  onDomClick(key) { this.pressKey(key); }
}

/* ============================================================
   BOOT
   ============================================================ */
buildMenu();
</script>