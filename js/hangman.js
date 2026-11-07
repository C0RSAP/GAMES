import { WORDS5 } from '../words/words5.js';
import { WORDS6 } from '../words/words6.js';

const ALL_WORDS = [...WORDS5, ...WORDS6];
const ALPHABET = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';

function pickRobotWord() {
  return ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
}

function drawHangman(ctx, wrong, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#c4b5fd';
  ctx.fillStyle = '#c4b5fd';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  // base
  ctx.beginPath();
  ctx.moveTo(30, h - 20);
  ctx.lineTo(170, h - 20);
  ctx.stroke();

  if (wrong < 1) return;
  // pole
  ctx.beginPath();
  ctx.moveTo(60, h - 20);
  ctx.lineTo(60, 30);
  ctx.stroke();

  if (wrong < 2) return;
  // top
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.lineTo(140, 30);
  ctx.stroke();

  if (wrong < 3) return;
  // rope
  ctx.beginPath();
  ctx.moveTo(140, 30);
  ctx.lineTo(140, 55);
  ctx.stroke();

  if (wrong < 4) return;
  // head
  ctx.beginPath();
  ctx.arc(140, 75, 20, 0, Math.PI * 2);
  ctx.stroke();

  if (wrong < 5) return;
  // body
  ctx.beginPath();
  ctx.moveTo(140, 95);
  ctx.lineTo(140, 160);
  ctx.stroke();

  if (wrong < 6) return;
  // arms
  ctx.beginPath();
  ctx.moveTo(140, 115);
  ctx.lineTo(110, 145);
  ctx.moveTo(140, 115);
  ctx.lineTo(170, 145);
  ctx.stroke();

  if (wrong < 7) return;
  // legs
  ctx.beginPath();
  ctx.moveTo(140, 160);
  ctx.lineTo(115, 205);
  ctx.moveTo(140, 160);
  ctx.lineTo(165, 205);
  ctx.stroke();
}

export function startHangman(root, onBack) {
  let mode = null; // 1 robot, 2 player
  let word = '';
  let guessed = new Set();
  let wrong = 0;
  const maxWrong = 7;
  let state = 'play'; // play / win / lose

  function renderMode() {
    root.innerHTML = `
      <h1 class="game-title">ВИСЕЛИЦА</h1>
      <p class="game-sub">Выбери режим</p>
      <div class="mode-cards">
        <button class="mode-card" data-mode="1">
          <strong>1 · Компьютер загадывает</strong>
          <span>Слово из большой базы существительных</span>
        </button>
        <button class="mode-card" data-mode="2">
          <strong>2 · Один загадывает, другой отгадывает</strong>
          <span>Идеально для двоих за одним экраном</span>
        </button>
      </div>
    `;
    root.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = +btn.dataset.mode;
        if (mode === 1) {
          word = pickRobotWord();
          startPlay();
        } else {
          renderInputWord();
        }
      });
    });
  }

  function renderInputWord() {
    root.innerHTML = `
      <h1 class="game-title">ВИСЕЛИЦА</h1>
      <p class="game-sub">Игрок 1 загадывает слово (3–12 букв)</p>
      <div class="panel" style="text-align:center;max-width:400px;margin:0 auto">
        <input class="input-word" id="secret-input" type="text" maxlength="12" autocomplete="off" autofocus placeholder="слово" />
        <p style="color:var(--muted);font-size:13px;margin:8px 0 16px">Только русские буквы · Tab скрывает/показывает</p>
        <button class="btn btn-primary" id="set-word">Загадать</button>
      </div>
    `;
    const input = root.querySelector('#secret-input');
    let hidden = false;
    let real = '';

    input.addEventListener('input', () => {
      const raw = input.value.toLowerCase().replace(/ё/g, 'е').replace(/[^а-я]/g, '');
      real = raw;
      if (hidden) input.value = '*'.repeat(raw.length);
      else input.value = raw;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        hidden = !hidden;
        input.value = hidden ? '*'.repeat(real.length) : real;
      }
      if (e.key === 'Enter') root.querySelector('#set-word').click();
    });

    root.querySelector('#set-word').addEventListener('click', () => {
      const w = real.trim();
      if (w.length < 3 || w.length > 12) {
        alert('Слово должно быть от 3 до 12 букв');
        return;
      }
      word = w;
      root.innerHTML = `
        <h1 class="game-title">ВИСЕЛИЦА</h1>
        <div class="panel" style="text-align:center;max-width:400px;margin:40px auto">
          <p style="font-size:18px;margin-bottom:12px">Слово загадано!</p>
          <p style="color:var(--muted);margin-bottom:24px">Передай управление отгадывающему</p>
          <button class="btn btn-primary" id="go-play">Начать</button>
        </div>
      `;
      root.querySelector('#go-play').addEventListener('click', startPlay);
    });
  }

  function startPlay() {
    guessed = new Set();
    wrong = 0;
    state = 'play';
    renderPlay();
  }

  function renderPlay() {
    const display = [...word].map(c => guessed.has(c) ? c : '_').join(' ');
    const used = [...guessed].sort().join(' ');

    let result = '';
    if (state !== 'play') {
      const isWin = state === 'win';
      result = `
        <div class="result-banner ${isWin ? 'win' : 'lose'}">
          <h3>${isWin ? 'Победа!' : 'Проигрыш'}</h3>
          <p>Слово: <strong>${word.toUpperCase()}</strong></p>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn btn-primary" id="again">Ещё раз</button>
            <button class="btn btn-ghost" id="to-menu">В меню</button>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <h1 class="game-title">ВИСЕЛИЦА</h1>
      <p class="game-sub">${mode === 1 ? 'против компьютера' : 'два игрока'} · ошибки ${wrong}/${maxWrong}</p>
      <div class="hangman-wrap">
        <div class="hangman-canvas-wrap">
          <canvas id="hangman-canvas" width="200" height="240"></canvas>
        </div>
        <div class="hangman-side">
          <div class="word-display">${display}</div>
          <div class="letters-used">${used ? 'Уже: ' + used : ''}</div>
          ${result}
          <div class="hangman-kb" id="hm-kb"></div>
        </div>
      </div>
    `;

    const canvas = root.querySelector('#hangman-canvas');
    const ctx = canvas.getContext('2d');
    drawHangman(ctx, wrong, canvas.width, canvas.height);

    const kb = root.querySelector('#hm-kb');
    if (state === 'play') {
      for (const ch of ALPHABET) {
        const btn = document.createElement('button');
        btn.textContent = ch;
        if (guessed.has(ch)) {
          btn.disabled = true;
          btn.className = word.includes(ch) ? 'right' : 'wrong';
        } else {
          btn.addEventListener('click', () => guessLetter(ch));
        }
        kb.appendChild(btn);
      }
    }

    root.querySelector('#again')?.addEventListener('click', () => {
      if (mode === 1) {
        word = pickRobotWord();
        startPlay();
      } else {
        renderInputWord();
      }
    });
    root.querySelector('#to-menu')?.addEventListener('click', onBack);
  }

  function guessLetter(ch) {
    if (state !== 'play' || guessed.has(ch)) return;
    guessed.add(ch);
    if (!word.includes(ch)) {
      wrong++;
      if (wrong >= maxWrong) state = 'lose';
    } else if ([...word].every(c => guessed.has(c))) {
      state = 'win';
    }
    renderPlay();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { onBack(); return; }
    if (state === 'play') {
      const ch = e.key.toLowerCase().replace('ё', 'е');
      if (ch.length === 1 && ch >= 'а' && ch <= 'я') guessLetter(ch);
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.__gameCleanup = () => window.removeEventListener('keydown', onKeyDown);

  renderMode();
}
