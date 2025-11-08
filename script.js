// script.js — ЧИСТЫЙ, БЫСТРЫЙ, РАБОЧИЙ WORDLE

import { RUWORDS } from './dictionary.js';

let WORDS = {};
let DICT = new Set(RUWORDS.filter(w => w.length === 5).map(w => w.toUpperCase()));
let targetWord = "ПЕНИС";
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let currentMode = 'daily';
let playerName = localStorage.getItem('playerName') || 'Игрок';
let infiniteList = [];

const ROWS = 6, COLS = 5;
const KEYS = [
  ['Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х','Ъ'],
  ['Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э'],
  ['ENTER','Я','Ч','С','М','И','Т','Ь','Б','Ю','BACKSPACE']
];

// === ИНИТ ===
document.getElementById('daily-btn').onclick = () => startMode('daily');
document.getElementById('infinite-btn').onclick = () => startMode('infinite');
document.getElementById('save-name').onclick = () => {
  playerName = document.getElementById('player-name').value.trim() || 'Игрок';
  localStorage.setItem('playerName', playerName);
  showMessage(`Привет, ${playerName}!`);
  updateLeaderboard();
};

// Загрузка words.json
fetch('words.json').then(r => r.json()).then(data => { WORDS = data; init(); }).catch(() => init());

// Загрузка infinite_words.json
fetch('infinite_words.json')
  .then(r => r.json())
  .then(list => {
    infiniteList = list.map(w => w.toUpperCase());
    localStorage.setItem('infiniteList', JSON.stringify(infiniteList));
  })
  .catch(() => {
    const saved = localStorage.getItem('infiniteList');
    if (saved) infiniteList = JSON.parse(saved);
  })
  .finally(() => {
    if (!infiniteList.length) showMessage("Слова для бесконечного режима не загружены!");
  });

function init() {
  createBoard();
  createKeyboard();
  updateLeaderboard();
  startMode('daily');
}

// === РЕЖИМЫ ===
function startMode(mode) {
  currentMode = mode;
  document.getElementById('daily-btn').classList.toggle('active', mode === 'daily');
  document.getElementById('infinite-btn').classList.toggle('active', mode === 'infinite');

  gameOver = false;
  currentRow = currentTile = 0;
  createBoard();
  createKeyboard();

  if (mode === 'daily') {
    const today = new Date().toISOString().slice(0,10);
    targetWord = (WORDS[today] && DICT.has(WORDS[today].toUpperCase())) ? WORDS[today].toUpperCase() : "ПЕНИС";
  } else {
    if (!infiniteList.length) {
      showMessage("Нет слов для бесконечного режима!");
      startMode('daily');
      return;
    }
    const idx = Math.floor(Math.random() * infiniteList.length);
    targetWord = infiniteList[idx];
  }

  showMessage("Угадай слово из 5 букв!");
  updateLeaderboard();
}

// === ДОСКА ===
function createBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let i = 0; i < ROWS; i++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${i}`;
    for (let j = 0; j < COLS; j++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function createKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  KEYS.forEach(row => {
    const keyRow = document.createElement('div');
    keyRow.className = 'key-row';
    row.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.textContent = k === 'BACKSPACE' ? '←' : k;
      if (k === 'ENTER' || k === 'BACKSPACE') btn.classList.add('wide');
      btn.onclick = () => handleKey(k);
      keyRow.appendChild(btn);
    });
    kb.appendChild(keyRow);
  });
}

// === ВВОД ===
function handleKey(key) {
  if (gameOver) return;
  if (key === 'ENTER') submitGuess();
  else if (key === 'BACKSPACE') removeLetter();
  else if (/[А-ЯЁ]/.test(key)) addLetter(key);
}

document.addEventListener('keydown', e => {
  if (gameOver) return;
  const k = e.key.toUpperCase();
  if (k === 'ENTER') { e.preventDefault(); handleKey('ENTER'); }
  else if (k === 'BACKSPACE') { e.preventDefault(); handleKey('BACKSPACE'); }
  else if (/[А-ЯЁ]/.test(k)) { e.preventDefault(); handleKey(k); }
});

function addLetter(letter) {
  if (currentTile >= COLS) return;
  const tile = document.querySelector(`#row-${currentRow} .tile:nth-child(${currentTile + 1})`);
  tile.textContent = letter;
  tile.classList.add('filled');
  currentTile++;
}

function removeLetter() {
  if (currentTile === 0) return;
  currentTile--;
  const tile = document.querySelector(`#row-${currentRow} .tile:nth-child(${currentTile + 1})`);
  tile.textContent = '';
  tile.classList.remove('filled');
}

// === ПРОВЕРКА — БЫСТРАЯ АНИМАЦИЯ ===
async function submitGuess() {
  if (currentTile < COLS) return showMessage("Недостаточно букв!");

  const guess = Array.from(document.querySelectorAll(`#row-${currentRow} .tile`))
    .map(t => t.textContent).join('');

  if (!DICT.has(guess)) return showMessage("Слово не в словаре!"), shakeRow(currentRow);

  const tiles = document.querySelectorAll(`#row-${currentRow} .tile`);
  const count = {}; 
  targetWord.split('').forEach(c => count[c] = (count[c] || 0) + 1);
  const states = Array(COLS).fill('absent');

  // 1. correct
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === targetWord[i]) {
      states[i] = 'correct';
      count[guess[i]]--;
    }
  }
  // 2. present
  for (let i = 0; i < COLS; i++) {
    if (states[i] !== 'correct' && targetWord.includes(guess[i]) && count[guess[i]] > 0) {
      states[i] = 'present';
      count[guess[i]]--;
    }
  }

  // === ПЕРЕВОРОТ ПО ОДНОЙ БУКВЕ ===
  for (let i = 0; i < COLS; i++) {
    const tile = tiles[i];
    tile.classList.add('flipping');

    await new Promise(resolve => {
      setTimeout(() => {
        tile.classList.remove('flipping');
        tile.dataset.state = states[i];
        tile.className = `tile ${states[i]}`;
        updateKey(guess[i], states[i]);
        resolve();
      }, 300); // 0.3 сек на переворот
    });

    await new Promise(r => setTimeout(r, 100)); // пауза между буквами
  }

  const won = guess === targetWord;
  if (won || currentRow === ROWS - 1) {
    gameOver = true;
    if (!won) document.getElementById('reveal-word').innerHTML = `Слово: <strong>${targetWord}</strong>`;
    saveStats(won, currentRow + 1);
    setTimeout(() => showStats(won ? currentRow + 1 : null), 600);
  } else {
    currentRow++;
    currentTile = 0;
  }
}

function updateKey(letter, state) {
  const key = Array.from(document.querySelectorAll('.key')).find(k => k.textContent === letter);
  if (!key) return;
  const priority = { correct: 3, present: 2, absent: 1 };
  const cur = priority[key.dataset.state] || 0;
  if (priority[state] > cur) {
    key.dataset.state = state;
    key.className = `key ${state}`;
  }
}

// === СТАТИСТИКА И ЛИДЕРБОРД ===
function saveStats(won, attempts) {
  const key = currentMode + 'Stats';
  const stats = JSON.parse(localStorage.getItem(key) || '{}');
  stats.played = (stats.played || 0) + 1;
  if (won) {
    stats.wins = (stats.wins || 0) + 1;
    stats.currentStreak = (stats.currentStreak || 0) + 1;
    stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);
    const dist = stats.dist || Array(6).fill(0);
    dist[attempts - 1]++;
    stats.dist = dist;
  } else stats.currentStreak = 0;
  localStorage.setItem(key, JSON.stringify(stats));

  if (won) saveLeaderboard(attempts);
}

function saveLeaderboard(attempts) {
  const today = new Date().toISOString().slice(0,10);
  const key = currentMode === 'daily' ? `leaderboard_daily_${today}` : 'leaderboard_infinite';
  const board = JSON.parse(localStorage.getItem(key) || '[]');
  const entry = currentMode === 'daily' ? { name: playerName, attempts } : { name: playerName, wins: 1 };

  const existing = board.find(p => p.name === playerName);
  if (existing) {
    if (currentMode === 'daily') existing.attempts = Math.min(existing.attempts, attempts);
    else existing.wins++;
  } else board.push(entry);

  board.sort((a,b) => currentMode === 'daily' ? a.attempts - b.attempts : b.wins - a.wins);
  localStorage.setItem(key, JSON.stringify(board.slice(0,10)));
  updateLeaderboard();
}

function updateLeaderboard() {
  const list = document.getElementById('top-players');
  list.innerHTML = '';
  const today = new Date().toISOString().slice(0,10);
  const key = currentMode === 'daily' ? `leaderboard_daily_${today}` : 'leaderboard_infinite';
  const board = JSON.parse(localStorage.getItem(key) || '[]');

  document.querySelector('#leaderboard h3').textContent = currentMode === 'daily' ? 'Топ за сегодня' : 'Топ в бесконечном';

  if (board.length === 0) {
    list.innerHTML = '<li>Пока никто не угадал</li>';
    return;
  }

  board.forEach((p, i) => {
    const li = document.createElement('li');
    if (currentMode === 'daily') {
      li.innerHTML = `<span>${i+1}. ${p.name}</span> <strong>${p.attempts} поп.</strong>`;
    } else {
      const w = p.wins === 1 ? 'слово' : p.wins < 5 ? 'слова' : 'слов';
      li.innerHTML = `<span>${i+1}. ${p.name}</span> <strong>${p.wins} ${w}</strong>`;
    }
    list.appendChild(li);
  });
}

function showStats(attempts) {
  const key = currentMode + 'Stats';
  const stats = JSON.parse(localStorage.getItem(key) || '{}');
  document.getElementById('stats-title').textContent = currentMode === 'daily' ? 'Ежедневная статистика' : 'Бесконечный режим';
  document.getElementById('played').textContent = stats.played || 0;
  document.getElementById('wins').textContent = stats.wins || 0;
  document.getElementById('winrate').textContent = stats.played ? Math.round((stats.wins || 0) / stats.played * 100) : 0;
  document.getElementById('currentstreak').textContent = stats.currentStreak || 0;
  document.getElementById('maxstreak').textContent = stats.maxStreak || 0;

  const dist = stats.dist || Array(6).fill(0);
  const max = Math.max(...dist, 1);
  document.getElementById('dist-chart').innerHTML = dist.map((v,i) => `${i+1}: ${'█'.repeat(Math.round(v/max*20))} ${v}`).join('<br>');

  const btns = document.getElementById('stats-buttons');
  btns.innerHTML = '';
  if (currentMode === 'daily') {
    const b = document.createElement('button'); b.textContent = 'Бесконечный'; b.onclick = () => { closeStats(); startMode('infinite'); }; btns.appendChild(b);
  } else {
    const b1 = document.createElement('button'); b1.textContent = 'Ещё'; b1.onclick = () => { closeStats(); startMode('infinite'); }; btns.appendChild(b1);
    const b2 = document.createElement('button'); b2.textContent = 'Ежедневный'; b2.onclick = () => { closeStats(); startMode('daily'); }; btns.appendChild(b2);
  }
  const close = document.createElement('button'); close.textContent = 'Закрыть'; close.onclick = closeStats; btns.appendChild(close);
  document.getElementById('stats-modal').style.display = 'flex';
}
function closeStats() { document.getElementById('stats-modal').style.display = 'none'; }

// === УТИЛЫ ===
function showMessage(text, time = 1500) {
  const msg = document.getElementById('message');
  msg.innerHTML = text;
  if (time > 0) setTimeout(() => msg.innerHTML = '', time);
}
function shakeRow(row) {
  const r = document.getElementById(`row-${row}`);
  r.style.animation = 'shake 0.5s';
  setTimeout(() => r.style.animation = '', 500);
}
