import p5 from 'p5';
import { TotemManager, ActivateEvent, ElementType, ELEMENT_SYMBOLS } from './TotemManager';
import { Animator } from './Animator';

type GameState = 'playing' | 'victory';

const sketch = (p: p5) => {
  let canvasWidth: number;
  let canvasHeight: number;
  let totemManager: TotemManager;
  let animator: Animator;
  let gameState: GameState = 'playing';
  let lastTime: number = 0;
  let lastElement: ElementType = 'fire';

  p.setup = () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    p.createCanvas(canvasWidth, canvasHeight);
    p.frameRate(60);
    p.noStroke();

    totemManager = new TotemManager(canvasWidth, canvasHeight);
    animator = new Animator(p, canvasWidth, canvasHeight);

    totemManager.onEvent((event: ActivateEvent) => {
      if (event.type === 'success') {
        animator.addLightBeam(event.totem);
        lastElement = event.totem.element;
      } else if (event.type === 'failure') {
        animator.addErrorFlash(event.totem);
      } else if (event.type === 'complete') {
        gameState = 'victory';
        animator.triggerVictory(lastElement);
      }
    });

    lastTime = performance.now();
  };

  p.draw = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    p.clear();

    totemManager.update(dt);
    animator.update(dt, p.mouseX, p.mouseY);
    animator.draw(totemManager.getTotems());

    drawSequenceHint();
  };

  const drawSequenceHint = () => {
    const sequence = totemManager.getCorrectSequence();
    const step = totemManager.getCurrentStep();
    const hintText = sequence
      .map((el, i) => (i < step ? `[${ELEMENT_SYMBOLS[el]}]` : `(${ELEMENT_SYMBOLS[el]})`))
      .join(' → ');

    p.push();
    p.fill(180, 180, 220, 180);
    p.textSize(14);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text('唤醒顺序: ' + hintText, 20, canvasHeight - 20);

    if (gameState === 'playing') {
      p.fill(150, 150, 180, 120);
      p.textAlign(p.RIGHT, p.BOTTOM);
      p.text('提示: 按正确顺序点击四块石碑唤醒魂兽', canvasWidth - 20, canvasHeight - 20);
    } else if (gameState === 'victory') {
      p.fill(255, 221, 136, 200);
      p.textAlign(p.RIGHT, p.BOTTOM);
      p.text('移动鼠标控制元素球，快速移动会留下尾迹', canvasWidth - 20, canvasHeight - 20);
    }
    p.pop();
  };

  p.mousePressed = () => {
    if (gameState === 'playing') {
      totemManager.handleClick(p.mouseX, p.mouseY);
    }
  };

  p.mouseMoved = () => {
    const hovering = totemManager.isHoveringTotem(p.mouseX, p.mouseY);
    const canvasEl = document.querySelector('#app canvas') as HTMLCanvasElement | null;
    if (canvasEl) {
      canvasEl.style.cursor = hovering ? 'pointer' : 'default';
    }
  };

  p.windowResized = () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    p.resizeCanvas(canvasWidth, canvasHeight);
  };
};

new p5(sketch, document.getElementById('app')!);
