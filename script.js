import { RUWORDS } from './dictionary.js';

// === Глобальные ===
let WORDS = {};
let DICT = new Set();
let targetWord = "ПЕНИС";
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let currentMode = 'daily';
let infiniteList = [];
let playerName = localStorage.getItem('playerName') || '';

const ROWS = 6;
const COLS = 5;

const KEYS = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['ENTER', 'Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', 'BACKSPACE']
];

const dailyBtn = document.getElementById('daily-btn');
const infiniteBtn = document.getElementById('infinite-btn');
dailyBtn.addEventListener('click', () => startMode('daily'));
infiniteBtn.addEventListener('click', () => startMode('infinite'));

// === Переключатель темы ===
const themeToggle = document.createElement('button');
themeToggle.textContent = 'Светлая';
themeToggle.style.marginLeft = '10px';
themeToggle.style.padding = '8px 12px';
themeToggle.style.background = '#eee';
themeToggle.style.border = '1px solid #ccc';
themeToggle.style.borderRadius = '4px';
themeToggle.style.cursor = 'pointer';
document.querySelector('header').appendChild(themeToggle);

themeToggle.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? '' : 'dark');
  themeToggle.textContent = isDark ? 'Светлая' : 'Тёмная';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.setAttribute('data-theme', 'dark');
  themeToggle.textContent = 'Тёмная';
}

// === Загрузка ===
fetch('words.json')
  .then(r => r.json())
  .then(data => { WORDS = data; initDict(); })
  .catch(() => initDict());

function initDict() {
  RUWORDS.forEach(word => { if (word.length === 5) DICT.add(word.toUpperCase()); });

  fetch('infinite_words.json')
    .then(r => r.json())
    .then(data => {
      infiniteList = data.map(w => w.toUpperCase());
      localStorage.setItem('infiniteList', JSON.stringify(infiniteList));
    })
    .catch(() => {
      const saved = localStorage.getItem('infiniteList');
      if (saved) infiniteList = JSON.parse(saved);
    })
    .finally(() => {
      createBoard();
      createKeyboard();
      setupPlayerName();
      updateLeaderboard();
      startMode('daily');
    });
}

// === Режимы ===
function startMode(mode) {
  currentMode = mode;
  dailyBtn.classList.toggle('active', mode === 'daily');
  infiniteBtn.classList.toggle('active', mode === 'infinite');

  // ЧИСТЫЙ ЛИСТ ПРИ КАЖДОМ ЗАПУСКЕ
  localStorage.removeItem(mode + 'State');

  gameOver = false;
  currentRow = 0;
  currentTile = 0;

  createBoard();
  createKeyboard();
  updateLeaderboard();

  if (mode === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    targetWord = (WORDS[today] && DICT.has(WORDS[today].toUpperCase())) ? WORDS[today].toUpperCase() : "ПЕНИС";
  } else {
    if (infiniteList.length === 0) {
      showMessage("Список слов не загружен!");
      startMode('daily');
      return;
    }
    const index = Math.floor(Math.random() * infiniteList.length);
    targetWord = infiniteList[index];
    localStorage.setItem('infiniteProgress', index);
  }

  showMessage("Угадай слово из 5 букв!");
}

// === Доска ===
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
    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.textContent = key;
      if (key === 'ENTER' || key === 'BACKSPACE') btn.classList.add('wide');
      if (key === 'BACKSPACE') btn.innerHTML = '←';
      btn.addEventListener('click', () => handleKey(key));
      keyRow.appendChild(btn);
    });
    kb.appendChild(keyRow);
  });
}

function highlightCurrentTile() {
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('current'));
  if (currentTile < COLS && currentRow < ROWS) {
    const tile = document.querySelector(`#row-${currentRow} .tile:nth-child(${currentTile + 1})`);
    if (tile) tile.classList.add('current');
  }
}

// === Ввод ===
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
  else if (/[А-ЯЁ]/.test(k)) handleKey(k);
});

function addLetter(letter) {
  if (currentTile >= COLS || currentRow >= ROWS) return;
  const tile = document.querySelector(`#row-${currentRow} .tile:nth-child(${currentTile + 1})`);
  tile.textContent = letter;
  tile.classList.add('filled');
  currentTile++;
  highlightCurrentTile();
}

function removeLetter() {
  if (currentTile === 0) return;
  currentTile--;
  const tile = document.querySelector(`#row-${currentRow} .tile:nth-child(${currentTile + 1})`);
  tile.textContent = '';
  tile.classList.remove('filled');
  highlightCurrentTile();
}

// === Проверка с анимацией переворота ===
async function submitGuess() {
  if (currentTile < COLS) {
    showMessage("Недостаточно букв!");
    return;
  }

  const guess = Array.from(document.querySelectorAll(`#row-${currentRow} .tile`))
    .map(t => t.textContent).join('');

  if (!DICT.has(guess)) {
    showMessage("Слово не в словаре!");
    shakeRow(currentRow);
    return;
  }

  const tiles = document.querySelectorAll(`#row-${currentRow} .tile`);
  const count = {};
  for (let c of targetWord) count[c] = (count[c] || 0) + 1;

  const states = Array(COLS).fill(null);

  // Сначала определяем состояния
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === targetWord[i]) {
      states[i] = 'correct';
      count[guess[i]]--;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (states[i]) continue;
    if (targetWord.includes(guess[i]) && count[guess[i]] > 0) {
      states[i] = 'present';
      count[guess[i]]--;
    } else {
      states[i] = 'absent';
    }
  }

  // Анимация переворота по одной
  for (let i = 0; i < COLS; i++) {
    const tile = tiles[i];
    tile.classList.add('flipping');
    await new Promise(r => setTimeout(r, 100));
    tile.classList.remove('flipping');
    tile.dataset.state = states[i];
    tile.className = `tile ${states[i]}`;
    updateKeyState(guess[i], states[i]);
  }

  const won = guess === targetWord;
  if (won || currentRow === ROWS - 1) {
    gameOver = true;
    if (!won) {
	document.getElementById('reveal-word').innerHTML = `Слово было: <strong>${targetWord}</strong>`;
	}
    updateStats(won, currentRow + 1);
	updateLeaderboard(); // ← НОВОЕ
    setTimeout(() => showStats(won ? currentRow + 1 : null), 1500);
  } else {
    currentRow++;
    currentTile = 0;
    highlightCurrentTile();
  }
}

// === Остальные функции (без изменений) ===
function updateKeyState(letter, state) {
  const key = Array.from(document.querySelectorAll('.key')).find(k => k.textContent === letter);
  if (!key) return;
  const priority = { correct: 3, present: 2, absent: 1 };
  const current = priority[key.dataset.state] || 0;
  if (priority[state] > current) {
    key.dataset.state = state;
    key.className = `key ${state}`;
  }
}

function updateStats(won, attempts) {
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

    // Сохраняем в рейтинг
    saveResult(true, attempts);
  } else {
    stats.currentStreak = 0;
  }
  localStorage.setItem(key, JSON.stringify(stats));

  if (currentMode === 'infinite' && won) {
    const next = (parseInt(localStorage.getItem('infiniteProgress') || '0') + 1) % infiniteList.length;
    localStorage.setItem('infiniteProgress', next);
  }
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
  const chart = dist.map((v, i) => `${i+1}: ${'█'.repeat(Math.round(v / max * 20))} ${v}`).join('<br>');
  document.getElementById('dist-chart').innerHTML = chart;

  const buttons = document.getElementById('stats-buttons');
  buttons.innerHTML = '';

  if (currentMode === 'daily') {
    const btn = document.createElement('button');
    btn.textContent = 'Бесконечный режим';
    btn.onclick = () => { document.getElementById('stats-modal').style.display = 'none'; startMode('infinite'); };
    buttons.appendChild(btn);
  } else {
    const btn1 = document.createElement('button');
    btn1.textContent = 'Ещё одна';
    btn1.onclick = () => { document.getElementById('stats-modal').style.display = 'none'; startMode('infinite'); };
    const btn2 = document.createElement('button');
    btn2.textContent = 'Ежедневный';
    btn2.onclick = () => { document.getElementById('stats-modal').style.display = 'none'; startMode('daily'); };
    buttons.appendChild(btn1);
    buttons.appendChild(btn2);
  }

  const close = document.createElement('button');
  close.textContent = 'Закрыть';
  close.onclick = () => document.getElementById('stats-modal').style.display = 'none';
  buttons.appendChild(close);

  document.getElementById('stats-modal').style.display = 'flex';
}

// === Имя игрока ===
function setupPlayerName() {
  const input = document.getElementById('player-name');
  const btn = document.getElementById('save-name');
  input.value = playerName;

  btn.addEventListener('click', () => {
    const name = input.value.trim() || 'Игрок';
    playerName = name;
    localStorage.setItem('playerName', name);
    showMessage(`Привет, ${name}!`);
  });
}

// === Рейтинг ===
function saveResult(won, attempts) {
  if (!won) return;

  const today = new Date().toISOString().slice(0, 10);
  let key, value;

  if (currentMode === 'daily') {
    key = `leaderboard_daily_${today}`;
    value = { name: playerName, attempts };
  } else {
    key = `leaderboard_infinite`;
    value = { name: playerName, wins: 1 };
  }

  const board = JSON.parse(localStorage.getItem(key) || '[]');
  const existing = board.find(p => p.name === playerName);

  if (existing) {
    if (currentMode === 'daily') {
      if (attempts < existing.attempts) existing.attempts = attempts;
    } else {
      existing.wins += 1;
    }
  } else {
    board.push(value);
  }

  if (currentMode === 'daily') {
    board.sort((a, b) => a.attempts - b.attempts);
  } else {
    board.sort((a, b) => b.wins - a.wins);
  }

  localStorage.setItem(key, JSON.stringify(board.slice(0, 10)));
  updateLeaderboard();
}

function updateLeaderboard() {
  const list = document.getElementById('top-players');
  list.innerHTML = '';

  let board = [];
  if (currentMode === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    board = JSON.parse(localStorage.getItem(`leaderboard_daily_${today}`) || '[]');
    document.querySelector('#leaderboard h3').textContent = 'Топ за сегодня';
  } else {
    board = JSON.parse(localStorage.getItem('leaderboard_infinite') || '[]');
    document.querySelector('#leaderboard h3').textContent = 'Топ в бесконечном';
  }

  if (board.length === 0) {
    list.innerHTML = '<li>Пока никто не угадал</li>';
    return;
  }

  board.slice(0, 10).forEach((p, i) => {
    const li = document.createElement('li');
    if (currentMode === 'daily') {
      li.innerHTML = `<span>${i + 1}. ${p.name}</span> <strong>${p.attempts} поп.</strong>`;
    } else {
      li.innerHTML = `<span>${i + 1}. ${p.name}</span> <strong>${p.wins} ${p.wins === 1 ? 'слово' : p.wins < 5 ? 'слова' : 'слов'}</strong>`;
    }
    list.appendChild(li);
  });
}

function showMessage(text, time = 1500) {
  const msg = document.getElementById('message');
  msg.innerHTML = text;
  if (time > 0) {
    setTimeout(() => msg.innerHTML = '', time);
  }
}

function shakeRow(row) {
  const r = document.getElementById(`row-${row}`);
  r.style.animation = 'shake 0.5s';
  setTimeout(() => r.style.animation = '', 500);
}
