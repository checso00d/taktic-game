const canvas = document.getElementById('board');
const historyDiv = document.getElementById('history');
const ctx = canvas.getContext('2d');
const size = 9;
const cellSize = canvas.width / (size + 1);

const btnNewGame = document.getElementById('newGame');
const btnPrevMove = document.getElementById('prevMove');
const btnNextMove = document.getElementById('nextMove');

let board = [];
let selected = null;
let moves = [];
let turn = 'white';
let history = [];
let historyBoards = [];
let historyIndex = -1;

const icons = {
  K: {white: '▲', black: '△'},
  L: {white: '⏺', black: '●'},
  F: {white: '⧫', black: '⬥'},
  P: {white: '⬟', black: '⬢'},
  S: {white: '⬤', black: '◉'},
  T: {white: '⬩', black: '⬧'}
};

function initBoard() {
  board = Array.from({ length: size }, () => Array(size).fill(null));
  // Белые
  board[8][4] = {type: 'K', color: 'white'};
  board[8][2] = board[8][6] = {type: 'F', color: 'white'};
  [0,1,3,5,7,8].forEach(x => board[8][x] = {type: 'P', color: 'white'});
  board[7][2] = board[7][6] = {type: 'L', color: 'white'};
  board[7][4] = {type: 'T', color: 'white'};
  board[6][4] = {type: 'S', color: 'white'};
  // Чёрные
  board[0][4] = {type: 'K', color: 'black'};
  board[0][2] = board[0][6] = {type: 'F', color: 'black'};
  [0,1,3,5,7,8].forEach(x => board[0][x] = {type: 'P', color: 'black'});
  board[1][2] = board[1][6] = {type: 'L', color: 'black'};
  board[1][4] = {type: 'T', color: 'black'};
  board[2][4] = {type: 'S', color: 'black'};

  selected = null;
  moves = [];
  turn = 'white';
  history = [];
  historyBoards = [copyBoard(board)];
  historyIndex = 0;
  updateHistory();
  drawBoard();
  updateButtons();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${cellSize * 0.6}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Подписи столбцов и строк
  for (let i = 0; i < size; i++) {
    ctx.fillStyle = '#000';
    ctx.fillText(String.fromCharCode(65 + i), (i + 1.5) * cellSize, cellSize * 0.5);
    ctx.fillText(size - i, cellSize * 0.5, (i + 1.5) * cellSize);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 1) * cellSize;
      const py = (y + 1) * cellSize;
      ctx.fillStyle = (x + y) % 2 ? '#eee' : '#fff';
      ctx.fillRect(px, py, cellSize, cellSize);

      // Подсветка доступных ходов
      if (moves.some(m => m.x === x && m.y === y)) {
        ctx.fillStyle = 'rgba(100,200,100,0.5)';
        ctx.fillRect(px, py, cellSize, cellSize);
      }

      ctx.strokeRect(px, py, cellSize, cellSize);

      const p = board[y][x];
      if (p) {
        ctx.fillStyle = p.color === 'white' ? '#000' : '#800';
        ctx.fillText(icons[p.type][p.color], px + cellSize / 2, py + cellSize / 2);
      }

      if (selected && selected.x === x && selected.y === y) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
      }
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function rawMoves(piece, x, y) {
  const list = [];
  const dir = piece.color === 'white' ? -1 : 1;
  if (piece.type === 'K') {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (dx || dy) {
          const nx = x + dx,
            ny = y + dy;
          if (inBounds(nx, ny) && (!board[ny][nx] || board[ny][nx].color !== piece.color)) list.push({ x: nx, y: ny });
        }
      }
  } else if (piece.type === 'P') {
    const ny = y + dir;
    if (inBounds(x, ny) && !board[ny][x]) list.push({ x, y: ny });
    for (let dx of [-1, 1]) {
      const nx = x + dx;
      if (inBounds(nx, ny) && board[ny][nx] && board[ny][nx].color !== piece.color) list.push({ x: nx, y: ny });
    }
  } else if (piece.type === 'L') {
    for (let d of [-1, 1])
      for (let i = 1; i <= 2; i++) {
        const nx = x + d * i;
        if (!inBounds(nx, y)) break;
        if (!board[y][nx]) list.push({ x: nx, y });
        else {
          if (board[y][nx].color !== piece.color) list.push({ x: nx, y });
          break;
        }
      }
    for (let d of [-1, 1])
      for (let i = 1; i <= 2; i++) {
        const ny = y + d * i;
        if (!inBounds(x, ny)) break;
        if (!board[ny][x]) list.push({ x, y: ny });
        else {
          if (board[ny][x].color !== piece.color) list.push({ x, y: ny });
          break;
        }
      }
  } else if (piece.type === 'F') {
    [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [-1, 2],
      [1, -2],
      [-1, -2]
    ].forEach(j => {
      const nx = x + j[0],
        ny = y + j[1];
      if (inBounds(nx, ny) && (!board[ny][nx] || board[ny][nx].color !== piece.color)) list.push({ x: nx, y: ny });
    });
  } else if (piece.type === 'S') {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (dx || dy) {
          const nx = x + dx,
            ny = y + dy;
          if (inBounds(nx, ny) && (!board[ny][nx] || board[ny][nx].color !== piece.color)) list.push({ x: nx, y: ny });
        }
      }
  }
  return list;
}

function copyBoard(b) {
  return b.map(r => r.map(c => (c ? { ...c } : null)));
}

function findKing(color, b = board) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (b[y][x] && b[y][x].type === 'K' && b[y][x].color === color) return { x, y };
}

function isInCheck(color, b = board) {
  const king = findKing(color, b);
  const enemy = color === 'white' ? 'black' : 'white';
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = b[y][x];
      if (p && p.color === enemy) {
        if (rawMoves(p, x, y).some(m => m.x === king.x && m.y === king.y)) return true;
      }
    }
  return false;
}

function getMoves(x, y) {
  const piece = board[y][x];
  if (!piece || piece.color !== turn) return [];
  return rawMoves(piece, x, y).filter(m => {
    const b2 = copyBoard(board);
    b2[m.y][m.x] = piece;
    b2[y][x] = null;
    return !isInCheck(turn, b2);
  });
}

function hasAnyMove(color) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (board[y][x] && board[y][x].color === color && getMoves(x, y).length) return true;
  return false;
}

function saveHistoryBoard() {
  // Обрезаем историю дальше текущей позиции (если откатились назад)
  historyBoards = historyBoards.slice(0, historyIndex + 1);
  historyBoards.push(copyBoard(board));
  historyIndex++;
  updateButtons();
}

function updateButtons() {
  btnPrevMove.disabled = historyIndex <= 0;
  btnNextMove.disabled = historyIndex >= historyBoards.length - 1;
}

function updateHistory() {
  historyDiv.textContent = history.join('  ');
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize) - 1;
  const y = Math.floor((e.clientY - rect.top) / cellSize) - 1;
  if (!inBounds(x, y)) return;
  if (historyIndex !== historyBoards.length - 1) return; // блокируем ход при просмотре истории

  if (!selected) {
    if (board[y][x] && board[y][x].color === turn) {
      selected = { x, y };
      moves = getMoves(x, y);
      drawBoard();
    }
  } else {
    if (moves.some(m => m.x === x && m.y === y)) {
      const p = board[selected.y][selected.x];
      const moveTxt = `${icons[p.type][p.color]}${String.fromCharCode(65 + selected.x)}${9 - selected.y}→${String.fromCharCode(65 + x)}${9 - y}`;
      history.push(moveTxt);
      board[y][x] = p;
      board[selected.y][selected.x] = null;
      selected = null;
      moves = [];
      const next = turn === 'white' ? 'black' : 'white';

      // Проверка шаха и мата
      if (isInCheck(next) && !hasAnyMove(next)) alert(`${next.toUpperCase()} – МАТ! ${turn.toUpperCase()} победил`);
      else if (!hasAnyMove(next)) alert('ПАТ! Ничья');

      turn = next;

      saveHistoryBoard();
      updateHistory();
      drawBoard();
      updateButtons();
    } else {
      // Если кликнули на другую фигуру своего цвета — переключаем выделение
      if (board[y][x] && board[y][x].color === turn) {
        selected = { x, y };
        moves = getMoves(x, y);
        drawBoard();
      } else {
        // Снимаем выделение, если клик не по ходам
        selected = null;
        moves = [];
        drawBoard();
      }
    }
  }
});

btnNewGame.addEventListener('click', () => {
  initBoard();
});

btnPrevMove.addEventListener('click', () => {
  if (historyIndex > 0) {
    historyIndex--;
    board = copyBoard(historyBoards[historyIndex]);
    turn = historyIndex % 2 === 0 ? 'white' : 'black';
    selected = null;
    moves = [];
    updateHistory();
    drawBoard();
    updateButtons();
  }
});

btnNextMove.addEventListener('click', () => {
  if (historyIndex < historyBoards.length - 1) {
    historyIndex++;
    board = copyBoard(historyBoards[historyIndex]);
    turn = historyIndex % 2 === 0 ? 'white' : 'black';
    selected = null;
    moves = [];
    updateHistory();
    drawBoard();
    updateButtons();
  }
});

// Запуск игры
initBoard();
