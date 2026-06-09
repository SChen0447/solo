import p5 from 'p5';
import { ParticleSystem } from './particles';
import { TextManager } from './text';
import { Book } from './book';

const sketch = (p: p5): void => {
  let particles: ParticleSystem;
  let textManager: TextManager;
  let book: Book;
  let lastTime = 0;

  p.setup = (): void => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(1);
    p.frameRate(60);

    particles = new ParticleSystem(p);
    textManager = new TextManager(p);
    book = new Book(p, particles, textManager);

    lastTime = p.millis();
  };

  p.draw = (): void => {
    const now = p.millis();
    const deltaTime = now - lastTime;
    lastTime = now;

    p.clear();

    book.update(deltaTime);
    particles.update(deltaTime);

    book.draw(deltaTime);
    particles.draw();
  };

  p.windowResized = (): void => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    book.resize();
  };

  p.mousePressed = (): void => {
    book.handleMousePressed();
  };

  p.mouseDragged = (): void => {
    book.handleMouseDragged();
  };

  p.mouseReleased = (): void => {
    book.handleMouseReleased();
  };
};

new p5(sketch);
