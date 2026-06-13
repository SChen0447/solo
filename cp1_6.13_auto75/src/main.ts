import { GameState, Player } from './gameState';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const turnIndicator = document.getElementById('turnIndicator') as HTMLDivElement;
const redCount = document.getElementById('redCount') as HTMLSpanElement;
const blueCount = document.getElementById('blueCount') as HTMLSpanElement;
const timerText = document.getElementById('timerText') as HTMLDivElement;
const timerProgress = document.getElementById('timerProgress') as unknown as SVGCircleElement;
const logContainer = document.getElementById('logContainer') as HTMLDivElement;
const endBtn = document.getElementById('endBtn') as HTMLButtonElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const menuToggle = document.getElementById('menuToggle') as HTMLButtonElement;
const logPanel = document.getElementById('logPanel') as HTMLDivElement;
const modalContainer = document.getElementById('modalContainer') as HTMLDivElement;

const gameState = new GameState();
const renderer = new Renderer(canvas, gameState);

let lastTime = 0;
let animationId: number;
let logUpdateTimeout: number | null = null;
let victoryModalOpen = false;

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  renderer.render(deltaTime);
  updateTimer();
  checkTurnTimeout();

  animationId = requestAnimationFrame(gameLoop);
}

function updateTimer(): void {
  const remaining = gameState.getTurnTimeRemaining();
  const seconds = Math.ceil(remaining / 1000);
  timerText.textContent = seconds.toString();

  const progress = remaining / gameState.getTurnDuration();
  const circumference = 2 * Math.PI * 35;
  const offset = circumference * (1 - progress);
  timerProgress.style.strokeDashoffset = offset.toString();

  if (seconds <= 5) {
    timerText.style.color = '#EF5350';
    timerProgress.style.stroke = '#EF5350';
  } else {
    timerText.style.color = '#FFD54F';
    timerProgress.style.stroke = '#FFD54F';
  }
}

function checkTurnTimeout(): void {
  if (gameState.getGameStatus() === 'playing' && gameState.getTurnTimeRemaining() <= 0) {
    gameState.timeoutTurn();
    updateUI();
    updateLogs();
  }
}

function updateUI(): void {
  const currentPlayer = gameState.getCurrentPlayer();
  turnIndicator.textContent = `当前回合：${currentPlayer === 'red' ? '红方' : '蓝方'}`;
  turnIndicator.className = `turn-indicator turn-${currentPlayer}`;

  redCount.textContent = gameState.getAlivePieces('red').length.toString();
  blueCount.textContent = gameState.getAlivePieces('blue').length.toString();
}

function updateLogs(): void {
  if (logUpdateTimeout) {
    clearTimeout(logUpdateTimeout);
  }

  logUpdateTimeout = window.setTimeout(() => {
    const logs = gameState.getLogs();
    logContainer.innerHTML = '';

    logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      if (log.includes('⚔️')) {
        div.classList.add('log-attack');
      } else if (log.includes('👣')) {
        div.classList.add('log-move');
      }
      div.textContent = log;
      logContainer.appendChild(div);
    });

    logContainer.scrollTop = logContainer.scrollHeight;
  }, 100);
}

function handleCanvasClick(e: MouseEvent): void {
  if (gameState.getGameStatus() !== 'playing') return;

  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  if (!cell) return;

  const selectedPiece = gameState.getSelectedPiece();

  if (selectedPiece) {
    const result = gameState.movePiece(cell.row, cell.col);

    if (result.success) {
      if (result.attack && result.attack.defender) {
        renderer.addDeadCell(result.attack.defender.row, result.attack.defender.col);
      }

      updateUI();
      updateLogs();

      if (result.gameOver) {
        showVictoryModal(result.gameOver);
      }
    } else {
      const piece = gameState.getPieceAt(cell.row, cell.col);
      if (piece && piece.owner === gameState.getCurrentPlayer() && piece.alive) {
        gameState.selectPiece(cell.row, cell.col);
      } else {
        gameState.deselectPiece();
      }
    }
  } else {
    gameState.selectPiece(cell.row, cell.col);
  }
}

function handleCanvasMouseMove(e: MouseEvent): void {
  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  renderer.setHoveredCell(cell);
}

function handleCanvasMouseLeave(): void {
  renderer.setHoveredCell(null);
}

function showEndModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h2 class="modal-title" style="color: #FFD54F;">确认结束</h2>
      <p class="modal-message">确定要结束当前游戏吗？</p>
      <div class="modal-buttons">
        <button class="btn btn-end btn-modal" id="confirmEndBtn">确认结束</button>
        <button class="btn btn-restart btn-modal" id="cancelEndBtn">继续游戏</button>
      </div>
    </div>
  `;
  modalContainer.appendChild(modal);

  const confirmBtn = modal.querySelector('#confirmEndBtn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#cancelEndBtn') as HTMLButtonElement;

  confirmBtn.addEventListener('click', () => {
    const winner: Player = gameState.getCurrentPlayer() === 'red' ? 'blue' : 'red';
    modal.remove();
    showVictoryModal(winner, true);
  });

  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function showVictoryModal(winner: Player, forced: boolean = false): void {
  if (victoryModalOpen) return;
  victoryModalOpen = true;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'victoryModal';

  const winnerName = winner === 'red' ? '红方' : '蓝方';
  const winnerColor = winner === 'red' ? '#EF5350' : '#42A5F5';
  const message = forced ? '对方认输，' : '';

  modal.innerHTML = `
    <div class="modal-content">
      <h2 class="modal-title" style="color: ${winnerColor};">🎉 ${message}${winnerName}获胜！</h2>
      <p class="modal-message">恭喜${winnerName}取得胜利！</p>
      <div class="modal-buttons">
        <button class="btn btn-restart btn-modal" id="playAgainBtn">再来一局</button>
        <button class="btn btn-end btn-modal" id="closeModalBtn">关闭</button>
      </div>
    </div>
  `;
  modalContainer.appendChild(modal);

  renderer.spawnVictoryParticles();

  const playAgainBtn = modal.querySelector('#playAgainBtn') as HTMLButtonElement;
  const closeModalBtn = modal.querySelector('#closeModalBtn') as HTMLButtonElement;

  const closeModal = () => {
    modal.remove();
    victoryModalOpen = false;
  };

  playAgainBtn.addEventListener('click', () => {
    closeModal();
    restartGame();
  });

  closeModalBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  setTimeout(() => {
    if (document.getElementById('victoryModal')) {
      closeModal();
    }
  }, 5000);
}

function restartGame(): void {
  gameState.reset();
  renderer.clearParticles();
  renderer.clearDeadCells();
  victoryModalOpen = false;
  updateUI();
  updateLogs();
}

function toggleLogPanel(): void {
  logPanel.classList.toggle('open');
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
endBtn.addEventListener('click', showEndModal);
restartBtn.addEventListener('click', restartGame);
menuToggle.addEventListener('click', toggleLogPanel);

updateUI();
updateLogs();

animationId = requestAnimationFrame(gameLoop);

window.addEventListener('beforeunload', () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (logUpdateTimeout) {
    clearTimeout(logUpdateTimeout);
  }
});
