import p5 from 'p5';

export class FlowField {
  private time: number;
  private readonly scale: number;
  private cols: number;
  private rows: number;

  constructor() {
    this.time = 0;
    this.scale = 40;
    this.cols = 0;
    this.rows = 0;
  }

  resize(p: p5): void {
    this.cols = Math.ceil(p.width / this.scale) + 2;
    this.rows = Math.ceil(p.height / this.scale) + 2;
  }

  update(): void {
    this.time += 0.003;
  }

  getForce(p: p5, x: number, y: number): p5.Vector {
    const col = Math.floor(x / this.scale);
    const row = Math.floor(y / this.scale);
    const noiseVal = p.noise(col * 0.1, row * 0.1, this.time);
    const angle = noiseVal * p.TWO_PI * 2;
    const magnitude = p.map(noiseVal, 0, 1, 0.2, 0.5);
    return p.createVector(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  display(p: p5): void {
    p.push();
    p.stroke(51, 68, 102, 38);
    p.strokeWeight(0.3);
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x = i * this.scale;
        const y = j * this.scale;
        const force = this.getForce(p, x, y);
        const len = force.mag() * 10;
        const angle = force.heading();
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        p.line(x, y, x2, y2);
      }
    }
    p.pop();
  }
}
