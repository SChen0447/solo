import p5 from 'p5';
import { Board } from './Board';
import { Piece, PiecePool, ElementType, ELEMENT_COLORS, ELEMENT_SYMBOLS } from './Piece';
import { BackgroundStar, StardustBurst } from './effects';

type TaskShape = 'triangle';

interface GameState {
  currentTask: TaskShape;
  remainingSteps: number;
  completedTriangles: number;
  targetTriangles: number;
  gameWon: boolean;
}

let sketch = (p: p5) => {
  let board: Board;
  let piecePool: PiecePool;
  let backgroundStars: BackgroundStar[] = [];
  let globalBursts: StardustBurst[] = [];
  let draggingPiece: Piece | null = null;
  let gameState: GameState;
  let lastTime: number = 0;
  let flowBorderPhase: number = 0;
  let boardCenterX: number = 0;
  let boardCenterY: number = 0;
  let poolStartX: number = 0;
  let poolY: number = 0;

  function resetGame(): void {
    board.reset();
    piecePool.resetPieces();
    globalBursts = [];
    draggingPiece = null;
    gameState = {
      currentTask: 'triangle',
      remainingSteps: 12,
      completedTriangles: 0,
      targetTriangles: 2,
      gameWon: false
    };
  }

  p.setup = () => {
    const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
    cnv.parent('app');
    p.textFont('Microsoft YaHei');

    boardCenterX = p.width / 2;
    boardCenterY = p.height / 2 - 40;
    poolStartX = p.width / 2 - 310;
    poolY = p.height - 100;

    board = new Board(p, boardCenterX, boardCenterY);
    piecePool = new PiecePool(p);
    piecePool.layout(poolStartX, poolY);

    for (let i = 0; i < 500; i++) {
      backgroundStars.push(new BackgroundStar(p, p.width, p.height));
    }

    board.onTriangleComplete = (color: p5.Color) => {
      gameState.completedTriangles++;
      if (gameState.completedTriangles >= gameState.targetTriangles) {
        gameState.gameWon = true;
        const cx = p.width / 2;
        const cy = p.height / 2 - 40;
        for (let layer = 0; layer < 3; layer++) {
          setTimeout(() => {
            globalBursts.push(new StardustBurst(p, cx, cy, color, 200, 280, 2.0));
          }, layer * 200);
        }
      }
    };

    gameState = {
      currentTask: 'triangle',
      remainingSteps: 12,
      completedTriangles: 0,
      targetTriangles: 2,
      gameWon: false
    };

    lastTime = p.millis() / 1000;
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    boardCenterX = p.width / 2;
    boardCenterY = p.height / 2 - 40;
    poolStartX = p.width / 2 - 310;
    poolY = p.height - 100;
  };

  p.mousePressed = () => {
    if (gameState.gameWon) return;
    const piece = piecePool.getPieceAt(p.mouseX, p.mouseY);
    if (piece) {
      draggingPiece = piece;
      piece.isDragging = true;
      piecePool.layout(poolStartX, poolY);
    }
  };

  p.mouseReleased = () => {
    if (draggingPiece && !gameState.gameWon) {
      const cell = board.getNearestCell(p.mouseX, p.mouseY);
      if (cell) {
        board.placePiece(draggingPiece, cell);
        piecePool.removePiece(draggingPiece);
        gameState.remainingSteps--;
        piecePool.layout(poolStartX, poolY);
      } else {
        draggingPiece.isDragging = false;
        piecePool.layout(poolStartX, poolY);
      }
      draggingPiece = null;
    }
  };

  p.draw = () => {
    const now = p.millis() / 1000;
    const dt = Math.min(now - lastTime, 0.05);
    lastTime = now;
    const t = now;

    drawBackground(t);
    updateBackgroundStars(dt);

    flowBorderPhase += dt;

    board.update(dt, t);
    piecePool.update(dt, p.mouseX, p.mouseY);

    if (draggingPiece) {
      board.highlightCell(p.mouseX, p.mouseY);
    }

    board.render();
    piecePool.render();

    if (draggingPiece) {
      draggingPiece.render();
    }

    for (let i = globalBursts.length - 1; i >= 0; i--) {
      if (!globalBursts[i].update(dt)) {
        globalBursts.splice(i, 1);
      } else {
        globalBursts[i].render();
      }
    }

    drawTaskPanel();

    if (gameState.gameWon) {
      drawVictoryScreen();
    }
  };

  function drawBackground(t: number): void {
    p.push();
    const gradient = p.drawingContext.createRadialGradient(
      p.width / 2, p.height / 2, 0,
      p.width / 2, p.height / 2, Math.max(p.width, p.height) * 0.7
    );
    gradient.addColorStop(0, '#0f0a1a');
    gradient.addColorStop(1, '#070a14');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
    p.pop();

    for (const star of backgroundStars) {
      star.render(p, t);
    }
  }

  function updateBackgroundStars(dt: number): void {
    for (const star of backgroundStars) {
      star.update(dt, p.width, p.height);
    }
  }

  function drawTaskPanel(): void {
    const panelX = 30;
    const panelY = 30;
    const panelW = 240;
    const panelH = 220;

    p.push();

    p.drawingContext.shadowBlur = 15;
    const borderColor1 = p.color(68, 136, 170);
    const borderColor2 = p.color(136, 68, 170);
    const phase = (Math.sin(flowBorderPhase * Math.PI) + 1) / 2;
    const borderR = p.lerp(p.red(borderColor1), p.red(borderColor2), phase);
    const borderG = p.lerp(p.green(borderColor1), p.green(borderColor2), phase);
    const borderB = p.lerp(p.blue(borderColor1), p.blue(borderColor2), phase);
    p.drawingContext.shadowColor = `rgb(${borderR}, ${borderG}, ${borderB})`;
    p.stroke(borderR, borderG, borderB, 220);
    p.strokeWeight(2);

    p.fill(17, 17, 34, 180);
    roundRect(panelX, panelY, panelW, panelH, 12);

    p.pop();

    p.push();
    p.noStroke();
    p.fill(200, 220, 255, 255);
    p.textSize(18);
    p.textAlign(p.LEFT, p.TOP);
    p.text('星痕刻印棋', panelX + 20, panelY + 20);

    p.fill(150, 170, 220, 200);
    p.textSize(14);
    p.text('当前任务', panelX + 20, panelY + 55);

    p.fill(255, 220, 120, 255);
    p.textSize(16);
    p.text('连接出 2 个等边三角形', panelX + 20, panelY + 80);

    p.fill(150, 170, 220, 200);
    p.textSize(14);
    p.text('剩余步数', panelX + 20, panelY + 115);

    p.fill(255, 255, 255, 255);
    p.textSize(28);
    p.textAlign(p.CENTER, p.TOP);
    p.text(`${gameState.remainingSteps}`, panelX + panelW / 2, panelY + 140);

    p.fill(150, 170, 220, 200);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text('完成进度', panelX + 20, panelY + 180);

    p.fill(100, 255, 150, 255);
    p.textSize(16);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`${gameState.completedTriangles} / ${gameState.targetTriangles}`, panelX + panelW - 20, panelY + 180);

    p.pop();

    drawLegend(panelX, panelY + panelH + 20);
  }

  function drawLegend(x: number, y: number): void {
    const elements: ElementType[] = ['fire', 'ice', 'thunder', 'wind'];
    const names: Record<ElementType, string> = {
      fire: '火', ice: '冰', thunder: '雷', wind: '风'
    };

    p.push();
    p.fill(17, 17, 34, 180);
    p.stroke(100, 120, 200, 100);
    p.strokeWeight(1);
    roundRect(x, y, 240, 110, 12);

    p.fill(150, 170, 220, 200);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.noStroke();
    p.text('元素属性', x + 20, y + 15);

    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      const ex = x + 20 + (i % 2) * 110;
      const ey = y + 45 + Math.floor(i / 2) * 35;
      const col = ELEMENT_COLORS[elem];

      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = col.glow;
      p.fill(col.main);
      p.textSize(18);
      p.text(ELEMENT_SYMBOLS[elem], ex, ey - 2);
      p.drawingContext.shadowBlur = 0;
      p.fill(200, 220, 255, 230);
      p.textSize(14);
      p.text(names[elem], ex + 28, ey);
    }
    p.pop();
  }

  function drawVictoryScreen(): void {
    p.push();
    p.fill(0, 0, 0, 150);
    p.rect(0, 0, p.width, p.height);

    p.drawingContext.shadowBlur = 30;
    p.drawingContext.shadowColor = '#ffdd66';
    p.fill(255, 220, 120, 255);
    p.textSize(56);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('星痕闪耀！', p.width / 2, p.height / 2 - 40);

    p.drawingContext.shadowBlur = 15;
    p.fill(200, 220, 255, 255);
    p.textSize(24);
    p.text(`完成 ${gameState.targetTriangles} 个能量三角形`, p.width / 2, p.height / 2 + 20);

    p.fill(150, 255, 180, 255);
    p.textSize(18);
    p.text('点击任意位置重新开始', p.width / 2, p.height / 2 + 70);
    p.pop();

    if (p.mouseIsPressed) {
      resetGame();
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    p.beginShape();
    p.vertex(x + r, y);
    p.vertex(x + w - r, y);
    p.quadraticVertex(x + w, y, x + w, y + r);
    p.vertex(x + w, y + h - r);
    p.quadraticVertex(x + w, y + h, x + w - r, y + h);
    p.vertex(x + r, y + h);
    p.quadraticVertex(x, y + h, x, y + h - r);
    p.vertex(x, y + r);
    p.quadraticVertex(x, y, x + r, y);
    p.endShape(p.CLOSE);
  }

  p.keyPressed = () => {
    if (p.key === 'r' || p.key === 'R') {
      resetGame();
    }
  };
};

new p5(sketch);
