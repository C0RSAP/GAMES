import { startWordle } from './wordle.js';
import { startHangman } from './hangman.js';
import { startSnake } from './snake.js';
import { startPong } from './pong.js';
import { startCoins } from './coins.js';
import { startTanks } from './tanks.js';
import { startSumo } from './sumo.js';
import { startDuel } from './duel.js';

const GAMES = [
  { id: 'snake',   title: 'Змейка',      players: '2 игрока',    hint: 'WASD vs стрелки', color: '#4ade80', play: startSnake },
  { id: 'coins',   title: 'Сбор монет',  players: '2–4 игрока',  hint: 'бомбы, алмазы, золотой дождь', color: '#fbbf24', play: startCoins },
  { id: 'pong',    title: 'Понг+',       players: '2 игрока',    hint: 'W/S vs ↑/↓', color: '#60a5fa', play: startPong },
  { id: 'tanks',   title: 'Танки',       players: '2 игрока',    hint: 'рикошеты, стрельба', color: '#fb923c', play: startTanks },
  { id: 'sumo',    title: 'Сумо-арена',  players: '2–4 игрока',  hint: 'столкни всех за край', color: '#f472b6', play: startSumo },
  { id: 'duel',    title: 'Дуэль',       players: '2 игрока',    hint: 'кто быстрее нажмёт', color: '#fcd34d', play: startDuel },
  { id: 'hangman', title: 'Виселица',    players: '1–2 игрока',  hint: 'компьютер или друг загадывает', color: '#c084fc', play: startHangman },
  { id: 'wordle',  title: 'Wordle',      players: '1 игрок',     hint: '5/6 букв · огромная база · без повторов', color: '#22d3ee', play: startWordle },
];

const menu = document.getElementById('menu');
const gameScreen = document.getElementById('game-screen');
const gameRoot = document.getElementById('game-root');
const btnBack = document.getElementById('btn-back');
const grid = document.getElementById('games-grid');

function showMenu() {
  gameScreen.classList.remove('active');
  menu.classList.add('active');
  gameRoot.innerHTML = '';
  window.__gameCleanup?.();
  window.__gameCleanup = null;
}

function openGame(game) {
  menu.classList.remove('active');
  gameScreen.classList.add('active');
  gameRoot.innerHTML = '';
  game.play(gameRoot, showMenu);
}

btnBack.addEventListener('click', showMenu);

GAMES.forEach((g, i) => {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.style.setProperty('--accent', g.color);
  card.innerHTML = `
    <div class="num">${i + 1}</div>
    <h2>${g.title}</h2>
    <div class="players">${g.players}</div>
    <div class="hint">${g.hint}</div>
  `;
  card.tabIndex = 0;
  card.addEventListener('click', () => openGame(g));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openGame(g);
  });
  grid.appendChild(card);
});
