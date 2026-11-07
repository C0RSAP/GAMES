/**
 * Дуэль — кто быстрее нажмёт после сигнала
 * Игрок 1: A    Игрок 2: L
 */
export function startDuel(root, onBack) {
  root.innerHTML = `
    <div class="game-wrap duel-wrap">
      <div class="hud">
        <span id="d1" style="color:#4ade80">Зелёный: 0</span>
        <span class="title">ДУЭЛЬ</span>
        <span id="d2" style="color:#60a5fa">Синий: 0</span>
      </div>
      <div id="duel-stage" class="duel-stage">
        <div class="cowboy left" id="c1"></div>
        <div class="duel-center">
          <div id="duel-msg" class="duel-msg">Приготовьтесь...</div>
          <div id="duel-sub" class="duel-sub">Жми только на ОГОНЬ</div>
        </div>
        <div class="cowboy right" id="c2"></div>
      </div>
      <div class="hint-bar">Клавиша A vs Клавиша L · до 3 побед · ESC — меню</div>
    </div>`;

  const msg = root.querySelector('#duel-msg');
  const sub = root.querySelector('#duel-sub');
  const c1 = root.querySelector('#c1');
  const c2 = root.querySelector('#c2');
  let scores = [0, 0];
  const TARGET = 3;
  let state = 'wait'; // wait | go | result
  let goAt = 0, goTime = 0, fake = null;
  let finished = false;

  function newRound() {
    state = 'wait';
    finished = false;
    const now = performance.now();
    goAt = now + 2500 + Math.random() * 4000;
    fake = Math.random() < 0.55 ? now + 1000 + Math.random() * Math.max(500, goAt - now - 1500) : null;
    msg.textContent = 'Приготовьтесь...';
    msg.style.color = '#fff';
    sub.textContent = 'Жми только на ОГОНЬ! Раннее нажатие — фальстарт';
    c1.className = 'cowboy left idle';
    c2.className = 'cowboy right idle';
  }

  function key(e) {
    if (e.key === 'Escape') { cleanup(); onBack(); return; }
    if (finished) return;
    const now = performance.now();
    if (state === 'wait' || state === 'go') {
      let i = -1;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') i = 0;
      if (e.key === 'l' || e.key === 'L' || e.key === 'д' || e.key === 'Д') i = 1;
      if (i < 0) return;
      e.preventDefault();
      if (state === 'wait') {
        // фальстарт
        state = 'result';
        finished = true;
        scores[1 - i]++;
        msg.textContent = `Фальстарт! ${i === 0 ? 'Зелёный' : 'Синий'} дёрнулся раньше`;
        msg.style.color = '#f87171';
        sub.textContent = '';
        (i === 0 ? c1 : c2).className += ' dead';
        (i === 0 ? c2 : c1).className = (i === 0 ? 'cowboy right' : 'cowboy left') + ' shoot';
        updateScores();
        setTimeout(() => { if (Math.max(...scores) < TARGET) newRound(); else endMatch(); }, 2200);
      } else {
        // правильный выстрел
        state = 'result';
        finished = true;
        const rt = Math.round(now - goTime);
        scores[i]++;
        msg.textContent = `${i === 0 ? 'Зелёный' : 'Синий'} стреляет первым!`;
        msg.style.color = '#4ade80';
        sub.textContent = `Реакция: ${rt} мс`;
        (i === 0 ? c1 : c2).className = (i === 0 ? 'cowboy left' : 'cowboy right') + ' shoot';
        (i === 0 ? c2 : c1).className = (i === 0 ? 'cowboy right' : 'cowboy left') + ' dead';
        updateScores();
        setTimeout(() => { if (Math.max(...scores) < TARGET) newRound(); else endMatch(); }, 2200);
      }
    }
  }

  function updateScores() {
    root.querySelector('#d1').textContent = `Зелёный: ${scores[0]}`;
    root.querySelector('#d2').textContent = `Синий: ${scores[1]}`;
  }

  function endMatch() {
    const w = scores[0] > scores[1] ? 'Зелёный' : 'Синий';
    msg.textContent = `${w} — лучший стрелок!`;
    msg.style.color = '#ffd54a';
    sub.textContent = `Счёт ${scores[0]} : ${scores[1]} · ESC — меню`;
  }

  let raf = 0;
  function tick(now) {
    if (state === 'wait') {
      if (fake && now >= fake && now < fake + 900) {
        msg.textContent = 'Каркнула ворона... не ведись!';
        msg.style.color = '#fbbf24';
      } else if (now >= goAt) {
        state = 'go';
        goTime = now;
        msg.textContent = 'ОГОНЬ!';
        msg.style.color = '#f87171';
        msg.style.fontSize = '3rem';
        sub.textContent = '';
        c1.className = 'cowboy left aim';
        c2.className = 'cowboy right aim';
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
  }
  window.__gameCleanup = cleanup;
  window.addEventListener('keydown', key);
  newRound();
  raf = requestAnimationFrame(tick);
}
