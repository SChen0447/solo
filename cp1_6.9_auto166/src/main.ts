import p5 from 'p5';
import { EffectSystem } from './effects';
import { StarSystem, CANVAS_SIZE } from './starSystem';

let effects: EffectSystem;
let starSystem: StarSystem;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSpeedX = 0;
let mouseSpeedY = 0;
let startTime = 0;

const sketch = (s: p5) => {
  s.setup = () => {
    const canvas = s.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    canvas.parent('app');
    s.frameRate(60);

    effects = new EffectSystem(s);
    effects.initBackgroundStars(300, CANVAS_SIZE, CANVAS_SIZE);
    starSystem = new StarSystem(s, effects);
    startTime = s.millis();
  };

  s.draw = () => {
    const now = s.millis();
    const deltaTime = s.deltaTime;
    const time = (now - startTime) / 1000;

    const shake = effects.getScreenShakeOffset();
    s.push();
    s.translate(shake.x, shake.y);

    effects.drawBackground(time);
    effects.update(deltaTime);
    starSystem.update(deltaTime);

    effects.drawShockwaves();
    starSystem.draw(time);
    effects.drawParticles();

    if (!starSystem.isNucleusActive() && !starSystem.gameOver) {
      starSystem.updateNucleusColor(s.mouseX, s.mouseY);
      starSystem.drawAimLine(s.mouseX, s.mouseY);
    }

    s.pop();

    drawUI(s, time);

    if (isDragging) {
      mouseSpeedX = s.mouseX - lastMouseX;
      mouseSpeedY = s.mouseY - lastMouseY;
      lastMouseX = s.mouseX;
      lastMouseY = s.mouseY;
    }
  };

  s.mousePressed = () => {
    if (starSystem.gameOver || starSystem.isNucleusActive()) return;
    if (s.mouseX < 0 || s.mouseX > CANVAS_SIZE || s.mouseY < 0 || s.mouseY > CANVAS_SIZE) return;
    isDragging = true;
    lastMouseX = s.mouseX;
    lastMouseY = s.mouseY;
    mouseSpeedX = 0;
    mouseSpeedY = 0;
  };

  s.mouseReleased = () => {
    if (!isDragging) return;
    isDragging = false;
    const speed = s.sqrt(mouseSpeedX * mouseSpeedX + mouseSpeedY * mouseSpeedY);
    starSystem.launchNucleus(s.mouseX, s.mouseY, speed);
  };
};

function drawUI(s: p5, time: number): void {
  s.textAlign(s.LEFT, s.TOP);
  s.noStroke();

  s.drawingContext.shadowBlur = 8;
  s.drawingContext.shadowColor = '#88aaff';
  s.fill('#eeeeee');
  s.textSize(20);
  s.text(`分数: ${starSystem.score}`, 20, 20);

  s.textAlign(s.RIGHT, s.TOP);
  s.drawingContext.shadowColor = '#88aaff';
  s.fill('#cccccc');
  s.text(`弹射: ${starSystem.shotsLeft}`, CANVAS_SIZE - 20, 20);
  s.drawingContext.shadowBlur = 0;

  if (starSystem.regroupMessageTime > 0) {
    const alpha = s.min(1, starSystem.regroupMessageTime / 0.5);
    s.textAlign(s.CENTER, s.CENTER);
    s.drawingContext.shadowBlur = 15;
    s.drawingContext.shadowColor = '#ffdd88';
    const c = s.color('#ffdd88');
    c.setAlpha(alpha * 255);
    s.fill(c);
    s.textSize(32);
    s.text('星座重组', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    s.drawingContext.shadowBlur = 0;
  }

  if (starSystem.gameOver) {
    s.fill(0, 0, 0, 180);
    s.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    s.textAlign(s.CENTER, s.CENTER);
    s.drawingContext.shadowBlur = 20;
    s.drawingContext.shadowColor = '#ffaa33';
    s.fill('#ffaa33');
    s.textSize(40);
    s.text('游戏结束', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 50);

    s.drawingContext.shadowBlur = 10;
    s.drawingContext.shadowColor = '#ffdd88';
    s.fill('#ffdd88');
    s.textSize(32);
    s.text(`最终得分: ${starSystem.score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
    s.drawingContext.shadowBlur = 0;

    s.fill('#cccccc');
    s.textSize(18);
    s.text('刷新页面重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 70);
  } else if (!starSystem.isNucleusActive()) {
    s.textAlign(s.CENTER, s.BOTTOM);
    const pulse = 0.7 + 0.3 * s.sin(time * 3);
    const c = s.color('#cccccc');
    c.setAlpha(pulse * 255);
    s.fill(c);
    s.textSize(16);
    s.text('拖拽鼠标并释放以弹射星核', CANVAS_SIZE / 2, CANVAS_SIZE - 30);
  }
}

new p5(sketch);
