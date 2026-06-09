import p5 from 'p5';
import { Particle, Explosion } from './particle';
import { FlowField } from './flowField';
import { UI } from './ui';

const PALETTE = ['#ff6677', '#66ff77', '#7766ff', '#ffcc66', '#ff66cc'];
const MAX_PARTICLES = 500;

let particles: Particle[] = [];
let explosions: Explosion[] = [];
let flowField: FlowField;
let ui: UI;
let prevMouseX = 0;
let prevMouseY = 0;
let colorIndex = 0;
let paletteColors: p5.Color[] = [];

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.background(0);
    p.noStroke();

    paletteColors = PALETTE.map(c => p.color(c));

    flowField = new FlowField();
    flowField.resize(p);

    ui = new UI();
    ui.updatePosition(p);

    prevMouseX = p.mouseX;
    prevMouseY = p.mouseY;
  };

  p.draw = () => {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 25.5);
    p.rect(0, 0, p.width, p.height);
    p.pop();

    flowField.update();
    flowField.display(p);

    if (p.mouseIsPressed && p.mouseButton === p.LEFT && !ui.isOnPanel(p.mouseX, p.mouseY)) {
      emitParticles(p);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      const flowForce = flowField.getForce(p, particle.pos.x, particle.pos.y);
      const alive = particle.update(p, flowForce);
      if (!alive) {
        particles.splice(i, 1);
      }
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const exp = particles[i].checkCollision(p, particles[j]);
        if (exp) {
          explosions.push(exp);
        }
      }
    }

    for (const particle of particles) {
      particle.display(p);
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      p.push();
      p.drawingContext.shadowBlur = 6;
      p.drawingContext.shadowColor = exp.color.toString();
      p.noStroke();
      const r = p.red(exp.color);
      const g = p.green(exp.color);
      const b = p.blue(exp.color);
      p.fill(r, g, b, 127.5);
      p.ellipse(exp.x, exp.y, 3, 3);
      p.pop();
      exp.life--;
      if (exp.life <= 0) {
        explosions.splice(i, 1);
      }
    }

    ui.handleMouseMove(p);
    ui.display(p);

    if (ui.consumeReset()) {
      particles = [];
      explosions = [];
      p.background(0);
    }

    p.push();
    p.fill(255, 255, 255, 255);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`粒子数量: ${particles.length}`, 20, 20);
    p.pop();

    prevMouseX = p.mouseX;
    prevMouseY = p.mouseY;
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    p.background(0);
    flowField.resize(p);
    ui.updatePosition(p);
  };

  p.mousePressed = () => {
    ui.handleMousePressed(p);
  };

  p.mouseDragged = () => {
    ui.handleMouseDragged(p);
  };

  p.mouseReleased = () => {
    ui.handleMouseReleased();
  };

  const emitParticles = (p: p5) => {
    const count = Math.floor(p.random(5, 9));
    const dx = p.mouseX - prevMouseX;
    const dy = p.mouseY - prevMouseY;
    let baseAngle: number;

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      baseAngle = p.random(p.TWO_PI);
    } else {
      baseAngle = Math.atan2(dy, dx);
    }

    const lifespan = ui.getLifespan();

    for (let i = 0; i < count; i++) {
      const angleOffset = p.random(-p.PI / 6, p.PI / 6);
      const angle = baseAngle + angleOffset;
      const speed = p.random(2, 4);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const color = paletteColors[colorIndex % paletteColors.length];

      const particle = new Particle(p, p.mouseX, p.mouseY, vx, vy, color, lifespan);
      particles.push(particle);

      if (particles.length > MAX_PARTICLES) {
        particles.shift();
      }
    }

    colorIndex++;
  };
};

new p5(sketch);
