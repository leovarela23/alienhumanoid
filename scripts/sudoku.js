const boardEl = document.getElementById('board');
const bannerEl = document.getElementById('banner');
const timerLabel = document.getElementById('timerLabel');
const mistakesLabel = document.getElementById('mistakesLabel');
const difficultyLabel = document.getElementById('difficultyLabel');
const keypadEl = document.getElementById('keypad');
const notesModeBtn = document.getElementById('notesMode');
const normalModeBtn = document.getElementById('normalMode');
const newGameBtn = document.getElementById('newGameBtn');
const clearBtn = document.getElementById('clearBtn');
const hintBtn = document.getElementById('hintBtn');
const undoBtn = document.getElementById('undoBtn');

const SIZE = 9;
const BOX = 3;
const DIFFICULTY = 'Expert';
let state = null;
let timerId = null;

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function cloneNotes(notes) {
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValid(grid, row, col, value) {
  for (let i = 0; i < SIZE; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let r = startRow; r < startRow + BOX; r++) {
    for (let c = startCol; c < startCol + BOX; c++) {
      if (grid[r][c] === value) return false;
    }
  }
  return true;
}

function fillGrid(grid) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] === 0) {
        for (const value of shuffle([1,2,3,4,5,6,7,8,9])) {
          if (isValid(grid, row, col, value)) {
            grid[row][col] = value;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid, limit = 2) {
  let count = 0;
  function solve() {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (grid[row][col] === 0) {
          for (let value = 1; value <= 9; value++) {
            if (isValid(grid, row, col, value)) {
              grid[row][col] = value;
              solve();
              grid[row][col] = 0;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
    }
    count += 1;
  }
  solve();
  return count;
}

function makePuzzle(solution, givens = 26) {
  const puzzle = cloneGrid(solution);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let remaining = 81;
  for (const index of cells) {
    if (remaining <= givens) break;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;
    const copy = cloneGrid(puzzle);
    if (countSolutions(copy) !== 1) {
      puzzle[row][col] = backup;
    } else {
      remaining -= 1;
    }
  }
  return puzzle;
}

function buildGame() {
  const solution = createEmptyGrid();
  fillGrid(solution);
  const puzzle = makePuzzle(solution, 26);
  const notes = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => new Set()));
  return {
    puzzle,
    solution,
    current: cloneGrid(puzzle),
    notes,
    selected: { row: -1, col: -1 },
    notesMode: false,
    mistakes: 0,
    hintsUsed: 0,
    startedAt: Date.now(),
    history: [],
    gameOver: false,
    won: false,
  };
}

function saveHistory() {
  state.history.push({
    current: cloneGrid(state.current),
    notes: cloneNotes(state.notes),
    mistakes: state.mistakes,
    gameOver: state.gameOver,
    won: state.won,
  });
  if (state.history.length > 100) state.history.shift();
}

function setBanner(message, tone = 'info') {
  bannerEl.textContent = message;
  bannerEl.style.color = tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--accent-2)';
}

function updateStats() {
  mistakesLabel.textContent = `${state.mistakes} / 3`;
  difficultyLabel.textContent = DIFFICULTY;
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const min = String(Math.floor(total / 60)).padStart(2, '0');
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function tick() {
  if (!state || state.gameOver) return;
  timerLabel.textContent = formatTime(Date.now() - state.startedAt);
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
  tick();
}

function createNotesMarkup(row, col) {
  const notes = state.notes[row][col];
  const wrap = document.createElement('div');
  wrap.className = 'notes';
  for (let i = 1; i <= 9; i++) {
    const span = document.createElement('span');
    span.textContent = notes.has(i) ? String(i) : '';
    wrap.appendChild(span);
  }
  return wrap;
}

function isSameGroup(row, col, selectedRow, selectedCol) {
  return row === selectedRow || col === selectedCol || (
    Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
    Math.floor(col / 3) === Math.floor(selectedCol / 3)
  );
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add('block-end');
      const value = state.current[row][col];
      const given = state.puzzle[row][col] !== 0;
      const selected = state.selected.row === row && state.selected.col === col;
      const selectedValue = state.selected.row >= 0 ? state.current[state.selected.row][state.selected.col] : 0;

      if (given) cell.classList.add('given');
      if (selected) cell.classList.add('selected');
      if (!selected && state.selected.row >= 0 && isSameGroup(row, col, state.selected.row, state.selected.col)) {
        cell.classList.add('related');
      }
      if (selectedValue && value === selectedValue && !(selected)) cell.classList.add('same');
      if (value !== 0 && value !== state.solution[row][col]) cell.classList.add('error');
      if (state.won) cell.classList.add('solved');

      if (value !== 0) {
        cell.textContent = String(value);
      } else if (state.notes[row][col].size > 0) {
        cell.appendChild(createNotesMarkup(row, col));
      }

      cell.addEventListener('click', () => {
        if (state.gameOver) return;
        state.selected = { row, col };
        renderBoard();
      });

      boardEl.appendChild(cell);
    }
  }
}

function renderKeypad() {
  keypadEl.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const key = document.createElement('button');
    key.className = 'key';
    key.textContent = String(i);
    key.addEventListener('click', () => inputValue(i));
    keypadEl.appendChild(key);
  }
  const erase = document.createElement('button');
  erase.className = 'key wide';
  erase.textContent = 'Erase';
  erase.addEventListener('click', clearSelection);
  keypadEl.appendChild(erase);
}

function toggleMode(notesMode) {
  state.notesMode = notesMode;
  notesModeBtn.classList.toggle('secondary', !notesMode);
  normalModeBtn.classList.toggle('secondary', notesMode);
  setBanner(notesMode ? 'Notes mode enabled.' : 'Normal mode enabled.');
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.current[r][c] !== state.solution[r][c]) return false;
    }
  }
  state.won = true;
  state.gameOver = true;
  clearInterval(timerId);
  setBanner('Puzzle solved. Nicely done.', 'success');
  return true;
}

function inputValue(value) {
  const { row, col } = state.selected;
  if (row < 0 || col < 0 || state.gameOver) return;
  if (state.puzzle[row][col] !== 0) {
    setBanner('That cell is fixed.');
    return;
  }

  saveHistory();

  if (state.notesMode) {
    const notes = state.notes[row][col];
    if (notes.has(value)) notes.delete(value); else notes.add(value);
    renderBoard();
    return;
  }

  state.notes[row][col].clear();
  state.current[row][col] = value;

  if (value !== state.solution[row][col]) {
    state.mistakes += 1;
    if (state.mistakes >= 3) {
      state.gameOver = true;
      clearInterval(timerId);
      setBanner('Game over. Three mistakes reached.', 'danger');
    } else {
      setBanner('That number does not fit there.', 'danger');
    }
  } else {
    setBanner('Good move.');
  }

  updateStats();
  renderBoard();
  checkWin();
}

function clearSelection() {
  const { row, col } = state.selected;
  if (row < 0 || col < 0 || state.gameOver) return;
  if (state.puzzle[row][col] !== 0) return;
  saveHistory();
  state.current[row][col] = 0;
  state.notes[row][col].clear();
  renderBoard();
  setBanner('Cell cleared.');
}

function useHint() {
  if (state.gameOver) return;
  const empties = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.current[r][c] === 0 || state.current[r][c] !== state.solution[r][c]) {
        empties.push({ row: r, col: c });
      }
    }
  }
  if (!empties.length) return;
  const target = empties[Math.floor(Math.random() * empties.length)];
  saveHistory();
  state.current[target.row][target.col] = state.solution[target.row][target.col];
  state.notes[target.row][target.col].clear();
  state.selected = target;
  renderBoard();
  setBanner('Hint used. One correct value was revealed.');
  checkWin();
}

function undoMove() {
  if (!state.history.length || state.gameOver && state.won) return;
  const previous = state.history.pop();
  state.current = cloneGrid(previous.current);
  state.notes = cloneNotes(previous.notes);
  state.mistakes = previous.mistakes;
  state.gameOver = previous.gameOver;
  state.won = previous.won;
  updateStats();
  renderBoard();
  setBanner('Last move undone.');
}

function newGame() {
  state = buildGame();
  state.selected = { row: 0, col: 0 };
  updateStats();
  renderBoard();
  renderKeypad();
  toggleMode(false);
  startTimer();
  setBanner('Fresh expert puzzle ready.');
}

notesModeBtn.addEventListener('click', () => toggleMode(true));
normalModeBtn.addEventListener('click', () => toggleMode(false));
newGameBtn.addEventListener('click', newGame);
clearBtn.addEventListener('click', clearSelection);
hintBtn.addEventListener('click', useHint);
undoBtn.addEventListener('click', undoMove);

document.addEventListener('keydown', (event) => {
  if (!state) return;
  if (event.key >= '1' && event.key <= '9') {
    inputValue(Number(event.key));
  } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    clearSelection();
  } else if (event.key.toLowerCase() === 'n') {
    toggleMode(!state.notesMode);
  }
});

newGame();
