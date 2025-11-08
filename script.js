const ROWS = 6;
const COLS = 5;
const KEYS = [
  'й','ц','у','к','е','н','г','ш','щ','з','х','ъ',
  'ф','ы','в','а','п','р','о','л','д','ж','э',
  'enter','я','ч','с','м','и','т','ь','б','ю','backspace'
];

let WORDS = [];
let DICT = [];
let targetWord = '';
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let currentMode = 'daily';
let infiniteList = [];
let playerName = '';

async function loadInfiniteWords() {
  try {
    const response = await fetch('infinite_words.json');
    if (!response.ok) throw new Error('Ошибка загрузки infinite_words.json');
    infiniteList = await response.json();
    console.log('Infinite list loaded:', infiniteList.length);
  } catch (err) {
    console.error(err);
    infiniteList = [];
  }
}

async function initDict() {
  const res = await fetch('words.json');
  DICT = await res.json();
  WORDS = DICT.filter(w => w.length === COLS);

  setupPlayerName();
  createKeyboard();
  createBoard();
  startMode('daily');

  document.getElementById('daily-btn').addEventListener('click', () => startMode('daily'));
  document.getElementById('infinite-btn').addEventListener('click', () => startMode('infinite'));
  document.addEventListener('keydown', handleKey);
}

function setupPlayerName() {
  const input = document.getElementById('player-name');
  const saveBtn = document.getElementById('save-name');
  const saved = localStorage.getItem('playerName');
  if (saved) {
    playerName = saved;
    input.value = saved;
  }
  saveBtn.addEventListener('click', () => {
    playerName = input.value.trim();
    if (playerName) localStorage.setItem('playerName', playerName);
  });
}

function createBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function createKeyboard() {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';
  let row = document.createElement('div');
  row.className = 'key-row';
  KEYS.forEach((key, i) => {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.textContent = key === 'backspace' ? '←' : key;
    if (key === 'enter' || key === 'backspace') btn.classList.add('wide');
    btn.addEventListener('click', () => handleKey({ key }));
    row.appendChild(btn);
    if (['ъ', 'э', 'backspace'].includes(key)) {
      keyboard.appendChild(row);
      row = document.createElement('div');
      row.className = 'key-row';
    }
  });
}

function startMode(mode) {
  currentMode = mode;
  document.getElementById('daily-btn').classList.toggle('active', mode === 'daily');
  document.getElementById('infinite-btn').classList.toggle('active', mode === 'infinite');
  document.getElementById('reveal-word').textContent = '';
  createBoard();
  currentRow = 0;
  currentTile = 0;
  gameOver = false;

  if (mode === 'daily') {
    const dayIndex = new Date().getDate() % WORDS.length;
    targetWord = WORDS[dayIndex];
  } else {
    targetWord = infiniteList.length
      ? infiniteList[Math.floor(Math.random() * infiniteList.length)]
      : WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  console.log('Target word:', targetWord);
}

function handleKey(e) {
  if (gameOver) return;
  let key = e.key.toLowerCase();
  if (key === 'enter') submitGuess();
  else if (key === 'backspace') removeLetter();
  else if (/^[а-яё]$/.test(key) && currentTile < COLS) addLetter(key);
}

function addLetter(letter) {
  const tile = document.querySelectorAll('.row')[currentRow].children[currentTile];
  tile.textContent = letter.toUpperCase();
  tile.classList.add('filled');
  currentTile++;
}

function removeLetter() {
  if (currentTile === 0) return;
  currentTile--;
  const tile = document.querySelectorAll('.row')[currentRow].children[currentTile];
  tile.textContent = '';
  tile.classList.remove('filled');
}

function submitGuess() {
  if (currentTile < COLS) return;
  const guess = Array.from(document.querySelectorAll('.row')[currentRow].children)
    .map(t => t.textContent.toLowerCase())
    .join('');
  if (!DICT.includes(guess)) {
    shakeRow(currentRow);
    showMessage('Нет такого слова');
    return;
  }

  const tiles = document.querySelectorAll('.row')[currentRow].children;
  const targetArray = targetWord.split('');

  for (let i = 0; i < COLS; i++) {
    const tile = tiles[i];
    const letter = guess[i];
    tile.classList.add('flipping');
    setTimeout(() => {
      if (letter === targetArray[i]) tile.classList.add('correct');
      else if (targetArray.includes(letter)) tile.classList.add('present');
      else tile.classList.add('absent');
      updateKeyState(letter, tile.classList);
    }, i * 200);
  }

  if (guess === targetWord) {
    gameOver = true;
    setTimeout(() => {
      showMessage('Верно!');
      updateStats(true);
    }, 1200);
  } else if (currentRow === ROWS - 1) {
    gameOver = true;
    setTimeout(() => {
      showMessage('Не угадал!');
      document.getElementById('reveal-word').textContent = targetWord.toUpperCase();
      updateStats(false);
    }, 1200);
  } else {
    currentRow++;
    currentTile = 0;
  }
}

function updateKeyState(letter, classes) {
  const keyBtn = Array.from(document.querySelectorAll('.key')).find(
    k => k.textContent.toLowerCase() === letter
  );
  if (!keyBtn) return;
  if (classes.contains('correct')) keyBtn.className = 'key correct';
  else if (classes.contains('present') && !keyBtn.classList.contains('correct'))
    keyBtn.className = 'key present';
  else if (!classes.contains('correct') && !classes.contains('present'))
    keyBtn.className = 'key absent';
}

function shakeRow(rowIndex) {
  const row = document.querySelectorAll('.row')[rowIndex];
  row.style.animation = 'shake 0.6s';
  setTimeout(() => (row.style.animation = ''), 600);
}

function showMessage(text) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  setTimeout(() => (msg.textContent = ''), 2000);
}

function updateStats(win) {
  const stats = JSON.parse(localStorage.getItem('stats') || '{"played":0,"wins":0,"streak":0,"maxstreak":0}');
  stats.played++;
  if (win) {
    stats.wins++;
    stats.streak++;
    if (stats.streak > stats.maxstreak) stats.maxstreak = stats.streak;
  } else {
    stats.streak = 0;
  }
  localStorage.setItem('stats', JSON.stringify(stats));
  showStats(stats);
  saveResult(win);
}

function showStats(stats) {
  const modal = document.getElementById('stats-modal');
  modal.style.display = 'flex';
  document.getElementById('played').textContent = stats.played;
  document.getElementById('wins').textContent = stats.wins;
  document.getElementById('winrate').textContent = ((stats.wins / stats.played) * 100).toFixed(0);
  document.getElementById('currentstreak').textContent = stats.streak;
  document.getElementById('maxstreak').textContent = stats.maxstreak;

  const btns = document.getElementById('stats-buttons');
  btns.innerHTML = '';
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.onclick = () => (modal.style.display = 'none');
  btns.appendChild(okBtn);
}

function saveResult(win) {
  if (!playerName) return;
  const today = new Date().toISOString().slice(0, 10);
  let scores = JSON.parse(localStorage.getItem('scores') || '[]');
  scores.push({ name: playerName, win, date: today });
  scores = scores.filter(s => s.date === today);
  localStorage.setItem('scores', JSON.stringify(scores));
  updateLeaderboard();
}

function updateLeaderboard() {
  const today = new Date().toISOString().slice(0, 10);
  const scores = JSON.parse(localStorage.getItem('scores') || '[]').filter(s => s.date === today);
  const table = {};
  scores.forEach(s => {
    if (!table[s.name]) table[s.name] = 0;
    if (s.win) table[s.name]++;
  });
  const sorted = Object.entries(table).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const list = document.getElementById('top-players');
  list.innerHTML = '';
  sorted.forEach(([name, score]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span><strong>${score}</strong>`;
    list.appendChild(li);
  });
}

// инициализация
document.addEventListener('DOMContentLoaded', async () => {
  await loadInfiniteWords();
  await initDict();
});
