import type p5 from 'p5';

interface Tree {
  x: number;
  width: number;
  height: number;
}

interface Grass {
  x: number;
  y: number;
  height: number;
  blades: number;
}

interface FireflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class Forest {
  width: number;
  height: number;
  groundY: number;
  trees: Tree[];
  grasses: Grass[];
  particles: FireflyParticle[];
  maxParticles: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.groundY = height - 80;
    this.trees = [];
    this.grasses = [];
    this.particles = [];
    this.maxParticles = 30;
    this.generate();
  }

  generate(): void {
    const treeCount = 6 + Math.floor(Math.random() * 5);
    this.trees = [];
    for (let i = 0; i < treeCount; i++) {
      this.trees.push({
        x: 30 + Math.random() * (this.width - 60),
        width: 8 + Math.random() * 7,
        height: 80 + Math.random() * 70
      });
    }

    this.grasses = [];
    const grassCount = 25 + Math.floor(Math.random() * 15);
    for (let i = 0; i < grassCount; i++) {
      this.grasses.push({
        x: Math.random() * this.width,
        y: this.groundY,
        height: 20 + Math.random() * 20,
        blades: 3 + Math.floor(Math.random() * 4)
      });
    }

    this.particles = [];
  }

  addParticle(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.3 - Math.random() * 0.5,
      life: 1,
      maxLife: 120 + Math.random() * 60
    });
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawBackground(p: p5): void {
    const c1 = p.color('#0a2a0a');
    const c2 = p.color('#1a4a1a');
    for (let y = 0; y < this.height; y++) {
      const t = y / this.height;
      const c = p.lerpColor(c1, c2, t);
      p.stroke(c);
      p.line(0, y, this.width, y);
    }
  }

  drawGround(p: p5): void {
    p.push();
    p.noStroke();
    const groundGrad = p.drawingContext.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#4a3a2a');
    groundGrad.addColorStop(1, '#2a1a0a');
    p.drawingContext.fillStyle = groundGrad;
    p.rect(0, this.groundY, this.width, this.height - this.groundY);
    p.pop();
  }

  drawTrees(p: p5): void {
    for (const tree of this.trees) {
      const treeTop = this.groundY - tree.height;
      const grad = p.drawingContext.createLinearGradient(tree.x, treeTop, tree.x, this.groundY);
      grad.addColorStop(0, 'rgba(58, 42, 26, 0.75)');
      grad.addColorStop(1, 'rgba(42, 26, 10, 0.75)');

      p.push();
      p.noStroke();
      p.drawingContext.fillStyle = grad;
      p.rect(tree.x - tree.width / 2, treeTop, tree.width, tree.height);

      p.noStroke();
      const canopyColor = p.color('#2a4a2a');
      canopyColor.setAlpha(150);
      p.fill(canopyColor);
      p.ellipse(tree.x, treeTop, tree.width * 4, tree.width * 3.5);

      canopyColor.setAlpha(100);
      p.fill(canopyColor);
      p.ellipse(tree.x - tree.width, treeTop + 10, tree.width * 3, tree.width * 2.5);
      p.ellipse(tree.x + tree.width, treeTop + 10, tree.width * 3, tree.width * 2.5);

      p.pop();
    }
  }

  drawGrasses(p: p5): void {
    for (const grass of this.grasses) {
      p.push();
      for (let b = 0; b < grass.blades; b++) {
        const angle = -Math.PI / 2 + ((b - (grass.blades - 1) / 2) * 0.25);
        const gx = grass.x;
        const gy = grass.y;
        const gh = grass.height * (0.7 + Math.random() * 0.3);

        const grassColor = p.color('#4a8a4a');
        grassColor.setAlpha(180);
        p.stroke(grassColor);
        p.strokeWeight(1.5);
        p.noFill();
        p.arc(gx, gy, gh * 2, gh * 2, angle - 0.1, angle + 0.1, p.OPEN);
      }
      p.pop();
    }
  }

  drawParticles(p: p5): void {
    for (const particle of this.particles) {
      p.push();
      const c = p.color('#ffffaa');
      c.setAlpha(particle.life * 180);
      p.noStroke();
      p.fill(c);
      p.ellipse(particle.x, particle.y, 3, 3);
      p.pop();
    }
  }

  draw(p: p5): void {
    this.drawBackground(p);
    this.drawTrees(p);
    this.drawGround(p);
    this.drawGrasses(p);
    this.drawParticles(p);
  }
}
