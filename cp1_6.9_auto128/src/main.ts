import p5 from 'p5';
import { Ecosystem } from './ecosystem';
import { OrganismType } from './organism';

const SKETCH_WIDTH = 800;
const SKETCH_HEIGHT = 600;
const SPHERE_DIAMETER = 500;
const SPHERE_RADIUS = SPHERE_DIAMETER / 2;
const SPHERE_CENTER_X = SKETCH_WIDTH / 2 + 50;
const SPHERE_CENTER_Y = SKETCH_HEIGHT / 2;

const TOOLBAR_X = 30;
const TOOLBAR_Y = 150;
const TOOLBAR_WIDTH = 80;
const TOOLBAR_HEIGHT = 260;
const BUTTON_SIZE = 50;
const BUTTON_SPACING = 20;

const ENERGY_BAR_X = SPHERE_CENTER_X - 200;
const ENERGY_BAR_Y = 60;
const ENERGY_BAR_WIDTH = 400;
const ENERGY_BAR_HEIGHT = 12;

const RESET_BUTTON_X = SPHERE_CENTER_X + SPHERE_RADIUS - 40;
const RESET_BUTTON_Y = SPHERE_CENTER_Y + SPHERE_RADIUS - 40;
const RESET_BUTTON_RADIUS = 20;

type ToolButton = {
  type: OrganismType;
  x: number;
  y: number;
  hoverScale: number;
  pressed: boolean;
  color: string;
  label: string;
};

const sketch = (p: p5) => {
  let ecosystem: Ecosystem;
  let selectedType: OrganismType | null = null;
  let toolButtons: ToolButton[] = [];
  let resetHover = false;
  let resetPressed = false;

  p.setup = () => {
    const canvas = p.createCanvas(SKETCH_WIDTH, SKETCH_HEIGHT);
    canvas.parent('app');
    p.frameRate(60);
    ecosystem = new Ecosystem(SPHERE_CENTER_X, SPHERE_CENTER_Y, SPHERE_RADIUS);

    const startY = TOOLBAR_Y + 30;
    toolButtons = [
      { type: 'producer', x: TOOLBAR_X + TOOLBAR_WIDTH / 2, y: startY, hoverScale: 1, pressed: false, color: '#66bb6a', label: '生产' },
      { type: 'consumer', x: TOOLBAR_X + TOOLBAR_WIDTH / 2, y: startY + BUTTON_SIZE + BUTTON_SPACING, hoverScale: 1, pressed: false, color: '#42a5f5', label: '消费' },
      { type: 'decomposer', x: TOOLBAR_X + TOOLBAR_WIDTH / 2, y: startY + (BUTTON_SIZE + BUTTON_SPACING) * 2, hoverScale: 1, pressed: false, color: '#ef5350', label: '分解' }
    ];
  };

  p.draw = () => {
    p.clear();
    p.background(0, 0);

    const totalCount = ecosystem.getTotalOrganismCount();
    if (totalCount > 30) {
      p.frameRate(30);
    } else {
      p.frameRate(60);
    }

    ecosystem.update(p);
    drawSphereBackground(p);
    ecosystem.render(p);
    drawSphereBorder(p);
    drawToolbar(p);
    drawEnergyBar(p);
    drawCounters(p);
    drawResetButton(p);
    drawCursorHint(p);
  };

  const drawSphereBackground = (p: p5) => {
    p.push();
    p.drawingContext.shadowColor = 'rgba(150, 200, 255, 0.4)';
    p.drawingContext.shadowBlur = 10;
    p.pop();

    const cx = SPHERE_CENTER_X;
    const cy = SPHERE_CENTER_Y;
    const r = SPHERE_RADIUS;

    const grad = p.drawingContext.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#e0f0ff');
    grad.addColorStop(0.4, '#c0d8f0');
    grad.addColorStop(0.7, '#a0c0e0');
    grad.addColorStop(0.9, '#8aa8c8');
    grad.addColorStop(1, '#6a8a6a');

    p.noStroke();
    p.drawingContext.fillStyle = grad;
    p.ellipse(cx, cy, r * 2, r * 2);

    const refractionGrad = p.drawingContext.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    refractionGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    refractionGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    refractionGrad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    p.drawingContext.fillStyle = refractionGrad;
    p.ellipse(cx, cy, r * 2, r * 2);
  };

  const drawSphereBorder = (p: p5) => {
    p.noFill();
    p.stroke(255, 255, 255, 130);
    p.strokeWeight(2);
    p.ellipse(SPHERE_CENTER_X, SPHERE_CENTER_Y, SPHERE_DIAMETER, SPHERE_DIAMETER);

    p.noFill();
    p.stroke(255, 255, 255, 40);
    p.strokeWeight(4);
    p.ellipse(SPHERE_CENTER_X, SPHERE_CENTER_Y, SPHERE_DIAMETER + 4, SPHERE_DIAMETER + 4);
  };

  const drawToolbar = (p: p5) => {
    p.noStroke();
    p.fill(30, 40, 60, 200);
    p.rect(TOOLBAR_X, TOOLBAR_Y, TOOLBAR_WIDTH, TOOLBAR_HEIGHT, 12);

    for (const btn of toolButtons) {
      const mx = p.mouseX;
      const my = p.mouseY;
      const dx = mx - btn.x;
      const dy = my - btn.y;
      const isHover = Math.sqrt(dx * dx + dy * dy) < BUTTON_SIZE / 2 + 5;

      if (isHover && !btn.pressed) {
        btn.hoverScale = p.lerp(btn.hoverScale, 1.2, 0.15);
      } else if (btn.pressed) {
        btn.hoverScale = p.lerp(btn.hoverScale, 0.95, 0.3);
      } else {
        btn.hoverScale = p.lerp(btn.hoverScale, 1, 0.1);
      }

      const size = BUTTON_SIZE * btn.hoverScale;
      const isSelected = selectedType === btn.type;

      if (isHover || isSelected) {
        p.noFill();
        p.stroke(btn.color);
        p.strokeWeight(isSelected ? 3 : 2);
        p.ellipse(btn.x, btn.y, size + 8, size + 8);
      }

      p.noStroke();
      p.fill(50, 65, 90, 200);
      p.ellipse(btn.x, btn.y, size, size);

      drawOrganismIcon(p, btn.type, btn.x, btn.y, size * 0.6);

      p.fill(200, 220, 255);
      p.textSize(11);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(btn.label, btn.x, btn.y + size / 2 + 12);
    }
  };

  const drawOrganismIcon = (p: p5, type: OrganismType, x: number, y: number, s: number) => {
    switch (type) {
      case 'producer':
        p.noStroke();
        p.fill(102, 187, 106);
        p.ellipse(x, y, s, s);
        p.fill(150, 230, 150, 120);
        p.ellipse(x - s * 0.1, y - s * 0.1, s * 0.6, s * 0.6);
        break;
      case 'consumer':
        p.push();
        p.translate(x, y);
        p.noStroke();
        p.fill(66, 165, 245);
        p.ellipse(0, 0, s, s * 0.55);
        p.triangle(-s * 0.45, 0, -s * 0.85, -s * 0.35, -s * 0.85, s * 0.35);
        p.fill(255, 255, 255);
        p.ellipse(s * 0.25, -s * 0.1, s * 0.18, s * 0.18);
        p.fill(0, 0, 0);
        p.ellipse(s * 0.28, -s * 0.1, s * 0.09, s * 0.09);
        p.pop();
        break;
      case 'decomposer':
        p.noStroke();
        p.fill(239, 83, 80);
        p.rectMode(p.CENTER);
        p.rect(x, y, s * 0.7, s * 0.7);
        p.fill(255, 150, 150, 100);
        p.rect(x - s * 0.06, y - s * 0.06, s * 0.4, s * 0.4);
        p.rectMode(p.CORNER);
        break;
    }
  };

  const drawEnergyBar = (p: p5) => {
    p.noStroke();
    p.fill(51, 68, 102, 200);
    p.rect(ENERGY_BAR_X - 5, ENERGY_BAR_Y - 5, ENERGY_BAR_WIDTH + 10, ENERGY_BAR_HEIGHT + 10, 6);

    p.noStroke();
    p.fill(51, 68, 102);
    p.rect(ENERGY_BAR_X, ENERGY_BAR_Y, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT, 4);

    const totalEnergy = ecosystem.getTotalEnergy();
    const maxEnergy = ecosystem.getMaxEnergy();
    const ratio = p.constrain(totalEnergy / maxEnergy, 0, 1);

    let barColor: string;
    if (ratio < 0.3) {
      barColor = '#ff4444';
    } else if (ratio < 0.7) {
      barColor = '#ffcc44';
    } else {
      barColor = '#44ff44';
    }

    p.noStroke();
    p.fill(barColor);
    p.rect(ENERGY_BAR_X, ENERGY_BAR_Y, ENERGY_BAR_WIDTH * ratio, ENERGY_BAR_HEIGHT, 4);

    p.fill(220, 230, 255);
    p.textSize(12);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('能量', ENERGY_BAR_X - 45, ENERGY_BAR_Y + ENERGY_BAR_HEIGHT / 2);

    p.fill(220, 230, 255, 180);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(`${Math.floor(totalEnergy)}`, ENERGY_BAR_X + ENERGY_BAR_WIDTH + 10, ENERGY_BAR_Y + ENERGY_BAR_HEIGHT / 2);
  };

  const drawCounters = (p: p5) => {
    const counterY = ENERGY_BAR_Y + ENERGY_BAR_HEIGHT + 25;
    const counterSpacing = 100;
    const startX = SPHERE_CENTER_X - counterSpacing;

    const counters = [
      { type: 'producer' as OrganismType, count: ecosystem.getProducerCount(), color: '#66bb6a' },
      { type: 'consumer' as OrganismType, count: ecosystem.getConsumerCount(), color: '#42a5f5' },
      { type: 'decomposer' as OrganismType, count: ecosystem.getDecomposerCount(), color: '#ef5350' }
    ];

    for (let i = 0; i < counters.length; i++) {
      const cx = startX + i * counterSpacing;
      p.noStroke();
      p.fill(counters[i].color);
      p.ellipse(cx, counterY, 18, 18);

      p.fill(255, 255, 255);
      p.textSize(12);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(counters[i].count.toString(), cx, counterY);

      p.fill(200, 210, 230, 150);
      p.textSize(10);
      const labels = ['生产者', '消费者', '分解者'];
      p.text(labels[i], cx, counterY + 20);
    }
  };

  const drawResetButton = (p: p5) => {
    const mx = p.mouseX;
    const my = p.mouseY;
    const dx = mx - RESET_BUTTON_X;
    const dy = my - RESET_BUTTON_Y;
    resetHover = Math.sqrt(dx * dx + dy * dy) < RESET_BUTTON_RADIUS + 5;

    p.noStroke();
    if (resetPressed) {
      p.fill(100, 100, 150);
    } else if (resetHover) {
      p.fill(136, 136, 204);
    } else {
      p.fill(102, 102, 170);
    }
    p.ellipse(RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS * 2, RESET_BUTTON_RADIUS * 2);

    p.stroke(255, 255, 255, 220);
    p.strokeWeight(2.5);
    p.noFill();
    const r = RESET_BUTTON_RADIUS * 0.5;
    p.arc(RESET_BUTTON_X, RESET_BUTTON_Y, r * 2, r * 2, p.HALF_PI * 0.3, p.TWO_PI - p.HALF_PI * 0.3);
    p.push();
    p.translate(RESET_BUTTON_X, RESET_BUTTON_Y);
    p.rotate(-p.HALF_PI * 0.3);
    p.triangle(r, 0, r - 5, -5, r - 5, 5);
    p.pop();

    p.fill(255, 255, 255);
    p.noStroke();
    p.textSize(10);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('重置', RESET_BUTTON_X, RESET_BUTTON_Y + RESET_BUTTON_RADIUS + 12);
  };

  const drawCursorHint = (p: p5) => {
    if (!selectedType) return;

    const dx = p.mouseX - SPHERE_CENTER_X;
    const dy = p.mouseY - SPHERE_CENTER_Y;
    const inside = Math.sqrt(dx * dx + dy * dy) < SPHERE_RADIUS - 10;
    const canAdd = ecosystem.canAddOrganism(selectedType);

    if (inside && canAdd) {
      p.push();
      p.noStroke();
      p.drawingContext.globalAlpha = 0.6;
      drawOrganismIcon(p, selectedType, p.mouseX, p.mouseY, 40);
      p.pop();
    } else {
      p.noFill();
      p.stroke(255, 100, 100, 180);
      p.strokeWeight(2);
      p.ellipse(p.mouseX, p.mouseY, 20, 20);
      p.line(p.mouseX - 12, p.mouseY - 12, p.mouseX + 12, p.mouseY + 12);
    }
  };

  p.mousePressed = () => {
    const mx = p.mouseX;
    const my = p.mouseY;

    for (const btn of toolButtons) {
      const dx = mx - btn.x;
      const dy = my - btn.y;
      if (Math.sqrt(dx * dx + dy * dy) < BUTTON_SIZE / 2 + 5) {
        btn.pressed = true;
        return;
      }
    }

    const rdx = mx - RESET_BUTTON_X;
    const rdy = my - RESET_BUTTON_Y;
    if (Math.sqrt(rdx * rdx + rdy * rdy) < RESET_BUTTON_RADIUS + 5) {
      resetPressed = true;
      return;
    }

    if (selectedType && ecosystem.isInsideSphere(mx, my)) {
      ecosystem.tryAddOrganism(selectedType, mx, my);
    }
  };

  p.mouseReleased = () => {
    const mx = p.mouseX;
    const my = p.mouseY;

    for (const btn of toolButtons) {
      if (btn.pressed) {
        const dx = mx - btn.x;
        const dy = my - btn.y;
        if (Math.sqrt(dx * dx + dy * dy) < BUTTON_SIZE / 2 + 5) {
          selectedType = selectedType === btn.type ? null : btn.type;
        }
        btn.pressed = false;
      }
    }

    if (resetPressed) {
      const rdx = mx - RESET_BUTTON_X;
      const rdy = my - RESET_BUTTON_Y;
      if (Math.sqrt(rdx * rdx + rdy * rdy) < RESET_BUTTON_RADIUS + 5) {
        ecosystem.reset();
        selectedType = null;
      }
      resetPressed = false;
    }
  };
};

new p5(sketch);
