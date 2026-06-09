import p5 from 'p5';

interface Tree {
  x: number;
  baseY: number;
  width: number;
  height: number;
  branches: { x: number; y: number; len: number; angle: number }[];
  cracked: boolean;
  crackProgress: number;
  crackStartTime: number;
}

interface Fern {
  x: number;
  y: number;
  size: number;
  brightness: number;
  phase: number;
}

export class ForestManager {
  private p: p5;
  trees: Tree[];
  ferns: Fern[];
  fogParticles: { x: number; y: number; size: number; alpha: number; speed: number }[];

  constructor(p: p5) {
    this.p = p;
    this.trees = [];
    this.ferns = [];
    this.fogParticles = [];
    this.generateForest();
  }

  generateForest() {
    const p = this.p;
    const w = p.width || window.innerWidth;
    const h = p.height || window.innerHeight;

    const treeCount = 12;
    for (let i = 0; i < treeCount; i++) {
      const x = (w / treeCount) * i + p.random(-40, 40);
      const baseY = h - p.random(20, 100);
      const width = 30 + p.random(30, 60);
      const height = h * (0.5 + p.random(0.3));

      const branches: { x: number; y: number; len: number; angle: number }[] = [];
      const branchCount = 2 + Math.floor(p.random(3));
      for (let j = 0; j < branchCount; j++) {
        branches.push({
          x: x + (p.random() - 0.5) * width * 0.3,
          y: baseY - height * (0.3 + p.random(0.5)),
          len: 40 + p.random(80),
          angle: p.random(-0.8, 0.8) + (p.random() > 0.5 ? 1 : -1) * 0.3,
        });
      }

      this.trees.push({
        x,
        baseY,
        width,
        height,
        branches,
        cracked: false,
        crackProgress: 0,
        crackStartTime: -1,
      });
    }

    this.trees.sort((a, b) => a.baseY - b.baseY);

    const fernCount = 40;
    for (let i = 0; i < fernCount; i++) {
      this.ferns.push({
        x: p.random(w),
        y: h - p.random(10, 80),
        size: 15 + p.random(25),
        brightness: 0.3 + p.random(0.3),
        phase: p.random(p.TWO_PI),
      });
    }

    const fogCount = 30;
    for (let i = 0; i < fogCount; i++) {
      this.fogParticles.push({
        x: p.random(w),
        y: p.random(h * 0.3, h),
        size: 100 + p.random(200),
        alpha: 0.02 + p.random(0.04),
        speed: 0.05 + p.random(0.15),
      });
    }
  }

  handleClick(x: number, y: number): { hit: boolean; treeX: number; treeY: number } {
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const tree = this.trees[i];
      const topY = tree.baseY - tree.height;
      if (
        x > tree.x - tree.width / 2 - 20 &&
        x < tree.x + tree.width / 2 + 20 &&
        y > topY - 20 &&
        y < tree.baseY + 20
      ) {
        tree.cracked = true;
        tree.crackStartTime = this.p.millis() / 1000;
        return { hit: true, treeX: tree.x, treeY: tree.baseY - tree.height * 0.5 };
      }
    }
    return { hit: false, treeX: 0, treeY: 0 };
  }

  drawBackground() {
    const p = this.p;
    const w = p.width;
    const h = p.height;

    p.noStroke();
    for (let y = 0; y < h; y += 2) {
      const t = y / h;
      const r = p.lerp(10, 0, t);
      const g = p.lerp(26, 17, t);
      const b = p.lerp(10, 0, t);
      p.fill(r, g, b);
      p.rect(0, y, w, 2);
    }

    for (let i = 0; i < 5; i++) {
      const gradientY = h * (0.3 + i * 0.1);
      p.fill(26, 58, 26, 8 - i);
      p.ellipse(w / 2, gradientY, w * 1.5, h * 0.6);
    }
  }

  drawGround() {
    const p = this.p;
    const w = p.width;
    const h = p.height;

    p.noStroke();
    for (let y = h - 150; y < h; y += 2) {
      const t = (y - (h - 150)) / 150;
      p.fill(p.lerp(10, 5, t), p.lerp(26, 10, t), p.lerp(10, 5, t));
      p.rect(0, y, w, 2);
    }
  }

  drawTrees(time: number) {
    const p = this.p;

    for (const tree of this.trees) {
      if (tree.cracked && tree.crackStartTime > 0) {
        const elapsed = time - tree.crackStartTime;
        tree.crackProgress = Math.min(1, elapsed / 2);
      }

      const topY = tree.baseY - tree.height;

      p.noStroke();
      p.fill(20, 38, 20, 200);
      p.ellipse(tree.x, topY - tree.height * 0.1, tree.width * 3, tree.height * 0.6);
      p.fill(16, 32, 16, 170);
      p.ellipse(tree.x - tree.width, topY, tree.width * 2, tree.height * 0.45);
      p.ellipse(tree.x + tree.width, topY, tree.width * 2, tree.height * 0.45);

      p.noStroke();
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * (tree.width / 6);
        const tw = tree.width / 3;
        const t = i / 4;
        const shade = p.lerp(35, 60, t);
        p.fill(shade * 0.55, shade * 0.85, shade * 0.5);
        p.rect(tree.x + offset - tw / 2, topY, tw, tree.height, 4);
      }

      for (const branch of tree.branches) {
        p.stroke(40, 60, 40);
        p.strokeWeight(3);
        p.noFill();
        p.push();
        p.translate(branch.x, branch.y);
        p.rotate(branch.angle);
        p.line(0, 0, branch.len, -branch.len * 0.3);
        p.line(branch.len * 0.4, -branch.len * 0.12, branch.len * 0.6, -branch.len * 0.5);
        p.pop();
      }

      if (tree.cracked && tree.crackProgress > 0) {
        const cp = tree.crackProgress;
        const crackCenterY = tree.baseY - tree.height * 0.5;
        const crackWidth = 5 + cp * 15;
        const crackHeight = tree.height * 0.3 * cp;

        p.noStroke();
        const glowAlpha = 100 * cp;
        for (let i = 5; i >= 1; i--) {
          p.fill(255, 136, 51, glowAlpha / i);
          p.ellipse(tree.x, crackCenterY, crackWidth * i * 3, crackHeight * i * 2);
        }

        p.fill(255, 180, 100, 200 * cp);
        p.beginShape();
        p.vertex(tree.x - crackWidth / 2, crackCenterY - crackHeight / 2);
        p.vertex(tree.x - crackWidth / 3, crackCenterY);
        p.vertex(tree.x - crackWidth / 2, crackCenterY + crackHeight / 2);
        p.vertex(tree.x + crackWidth / 2, crackCenterY + crackHeight / 2);
        p.vertex(tree.x + crackWidth / 3, crackCenterY);
        p.vertex(tree.x + crackWidth / 2, crackCenterY - crackHeight / 2);
        p.endShape(p.CLOSE);

        for (let i = 0; i < 3; i++) {
          p.stroke(255, 200, 100, 180 * cp);
          p.strokeWeight(1 + cp);
          p.noFill();
          p.line(
            tree.x,
            crackCenterY,
            tree.x + (p.noise(time * 2 + i) - 0.5) * 40 * cp,
            crackCenterY - crackHeight / 2 - (10 + i * 8) * cp,
          );
          p.line(
            tree.x,
            crackCenterY,
            tree.x + (p.noise(time * 2 + i + 10) - 0.5) * 40 * cp,
            crackCenterY + crackHeight / 2 + (10 + i * 8) * cp,
          );
        }
      }
    }
  }

  drawFerns(time: number) {
    const p = this.p;

    for (const fern of this.ferns) {
      const flicker = 0.5 + 0.5 * Math.sin(time * 1.5 + fern.phase);
      const brightness = 0.3 + 0.3 * flicker;

      p.noStroke();
      for (let i = 3; i >= 1; i--) {
        p.fill(136, 255, 136, (brightness / i) * 80);
        p.ellipse(fern.x, fern.y, fern.size * i * 0.8, fern.size * 0.4 * i);
      }

      p.fill(136, 255, 136, brightness * 255);
      p.ellipse(fern.x, fern.y, 3, 3);

      p.noFill();
      p.stroke(136, 255, 136, brightness * 120);
      p.strokeWeight(1);
      for (let i = 0; i < 5; i++) {
        const angle = (-p.PI / 2) + (i - 2) * 0.35;
        const len = fern.size * (0.6 + Math.abs(i - 2) * -0.08);
        p.push();
        p.translate(fern.x, fern.y);
        p.rotate(angle);
        p.line(0, 0, 0, -len);
        for (let j = 1; j < 4; j++) {
          const ly = -len * (j / 4);
          const lw = len * 0.15 * (1 - j / 5);
          p.line(-lw * 0.5, ly, lw * 0.5, ly);
        }
        p.pop();
      }
    }
  }

  drawFog(time: number) {
    const p = this.p;
    const w = p.width;

    p.noStroke();
    for (const fog of this.fogParticles) {
      fog.x += fog.speed;
      if (fog.x - fog.size > w) {
        fog.x = -fog.size;
      }
      const pulseY = Math.sin(time * 0.3 + fog.x * 0.01) * 10;
      p.fill(30, 60, 30, fog.alpha * 255);
      p.ellipse(fog.x, fog.y + pulseY, fog.size, fog.size * 0.3);
    }
  }

  drawForest(p: p5, time: number) {
    this.drawBackground();
    this.drawFog(time);
    this.drawGround();
    this.drawTrees(time);
    this.drawFerns(time);
  }
}
