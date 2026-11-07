import { WORDS5 } from '../words/words5.js';
import { WORDS6 } from '../words/words6.js';

const USED_KEY = 'arcade_wordle_used';

function loadUsed() {
  try {
    return JSON.parse(localStorage.getItem(USED_KEY) || '{"5":[],"6":[]}');
  } catch {
    return { '5': [], '6': [] };
  }
}

function saveUsed(data) {
  localStorage.setItem(USED_KEY, JSON.stringify(data));
}

function pickWord(len) {
  const used = loadUsed();
  const pool = len === 5 ? WORDS5 : WORDS6;
  const usedSet = new Set(used[String(len)] || []);
  let available = pool.filter(w => !usedSet.has(w));
  if (available.length === 0) {
    used[String(len)] = [];
    saveUsed(used);
    available = pool.slice();
  }
  const word = available[Math.floor(Math.random() * available.length)];
  used[String(len)] = [...(used[String(len)] || []), word];
  saveUsed(used);
  return word;
}

function checkGuess(guess, secret) {
  const len = secret.length;
  const res = Array(len).fill('gray');
  const counts = {};
  for (const c of secret) counts[c] = (counts[c] || 0) + 1;
  for (let i = 0; i < len; i++) {
    if (guess[i] === secret[i]) {
      res[i] = 'green';
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < len; i++) {
    if (res[i] === 'gray' && counts[guess[i]] > 0) {
      res[i] = 'yellow';
      counts[guess[i]]--;
    }
  }
  return res;
}

function toast(msg, ms = 1600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function startWordle(root, onBack) {
  let length = null;
  let secret = '';
  let row = 0;
  let col = 0;
  let grid = [];
  let colors = [];
  let letterStatus = {};
  let finished = false;
  const maxTries = 6;

  const KB_ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];

  function renderChoice() {
    root.innerHTML = `
      <h1 class="game-title">WORDLE</h1>
      <p class="game-sub">Выбери длину слова · слова не повторяются</p>
      <div class="mode-cards">
        <button class="mode-card" data-len="5">
          <strong>5 букв</strong>
          <span>${WORDS5.length.toLocaleString('ru')} слов в базе</span>
        </button>
        <button class="mode-card" data-len="6">
          <strong>6 букв</strong>
          <span>${WORDS6.length.toLocaleString('ru')} слов в базе</span>
        </button>
      </div>
    `;
    root.querySelectorAll('[data-len]').forEach(btn => {
      btn.addEventListener('click', () => {
        length = +btn.dataset.len;
        secret = pickWord(length);
        grid = Array.from({ length: maxTries }, () => Array(length).fill(''));
        colors = Array.from({ length: maxTries }, () => Array(length).fill(''));
        letterStatus = {};
        row = 0; col = 0; finished = false;
        renderGame();
      });
    });
  }

  function renderGame() {
    const cellSize = length === 5 ? 54 : 48;
    let rowsHtml = '';
    for (let r = 0; r < maxTries; r++) {
      let cells = '';
      for (let c = 0; c < length; c++) {
        const ch = grid[r][c];
        const st = colors[r][c];
        cells += `<div class="wordle-cell ${st || ''} ${ch ? 'filled' : ''}" style="width:${cellSize}px;height:${cellSize}px">${ch}</div>`;
      }
      rowsHtml += `<div class="wordle-row">${cells}</div>`;
    }

    let kbHtml = KB_ROWS.map((rowStr, ri) => {
      let keys = '';
      if (ri === 2) keys += `<button class="kb-key wide" data-key="Enter">↵</button>`;
      for (const ch of rowStr) {
        const st = letterStatus[ch] || '';
        keys += `<button class="kb-key ${st}" data-key="${ch}">${ch}</button>`;
      }
      if (ri === 2) keys += `<button class="kb-key wide" data-key="Backspace">⌫</button>`;
      return `<div class="kb-row">${keys}</div>`;
    }).join('');

    let result = '';
    if (finished) {
      const win = grid[row - (finished === 'win' ? 1 : 0)]?.join('') === secret || grid.some(r => r.join('') === secret);
      const isWin = finished === 'win';
      result = `
        <div class="result-banner ${isWin ? 'win' : 'lose'}">
          <h3>${isWin ? 'Отлично!' : 'Не вышло'}</h3>
          <p>${isWin ? `Угадано за ${row} ${row === 1 ? 'попытку' : row < 5 ? 'попытки' : 'попыток'}` : `Слово: <strong>${secret.toUpperCase()}</strong>`}</p>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn btn-primary" id="again">Ещё раз</button>
            <button class="btn btn-ghost" id="to-menu">В меню</button>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <h1 class="game-title">WORDLE · ${length} букв</h1>
      <p class="game-sub">Вводи слово и жми Enter</p>
      <div class="wordle-grid">${rowsHtml}</div>
      ${result}
      <div class="keyboard">${kbHtml}</div>
    `;

    root.querySelectorAll('.kb-key').forEach(btn => {
      btn.addEventListener('click', () => handleKey(btn.dataset.key));
    });
    root.querySelector('#again')?.addEventListener('click', () => {
      secret = pickWord(length);
      grid = Array.from({ length: maxTries }, () => Array(length).fill(''));
      colors = Array.from({ length: maxTries }, () => Array(length).fill(''));
      letterStatus = {};
      row = 0; col = 0; finished = false;
      renderGame();
    });
    root.querySelector('#to-menu')?.addEventListener('click', onBack);
  }

  function handleKey(key) {
    if (finished) return;
    if (key === 'Backspace') {
      if (col > 0) {
        col--;
        grid[row][col] = '';
        renderGame();
      }
      return;
    }
    if (key === 'Enter') {
      if (col < length) return;
      const guess = grid[row].join('');
      const dict = length === 5 ? WORDS5 : WORDS6;
      if (!dict.includes(guess) && guess !== secret) {
        toast('Нет такого слова в словаре');
        return;
      }
      const res = checkGuess(guess, secret);
      colors[row] = res;
      res.forEach((st, i) => {
        const ch = guess[i];
        const prev = letterStatus[ch];
        if (st === 'green' || (st === 'yellow' && prev !== 'green') || (st === 'gray' && !prev)) {
          letterStatus[ch] = st;
        }
      });
      if (guess === secret) {
        finished = 'win';
        row++;
      } else {
        row++;
        col = 0;
        if (row >= maxTries) finished = 'lose';
      }
      renderGame();
      return;
    }
    // letter
    const ch = key.toLowerCase().replace('ё', 'е');
    if (ch.length === 1 && ch >= 'а' && ch <= 'я' && col < length) {
      grid[row][col] = ch;
      col++;
      renderGame();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { onBack(); return; }
    if (finished && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
      secret = pickWord(length);
      grid = Array.from({ length: maxTries }, () => Array(length).fill(''));
      colors = Array.from({ length: maxTries }, () => Array(length).fill(''));
      letterStatus = {};
      row = 0; col = 0; finished = false;
      renderGame();
      return;
    }
    if (e.key === 'Backspace') handleKey('Backspace');
    else if (e.key === 'Enter') handleKey('Enter');
    else if (e.key.length === 1) handleKey(e.key);
  }

  window.addEventListener('keydown', onKeyDown);
  window.__gameCleanup = () => window.removeEventListener('keydown', onKeyDown);

  renderChoice();
}
