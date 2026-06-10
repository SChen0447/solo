import * as THREE from 'three';

export interface BookData {
  id: number;
  group: THREE.Group;
  particles: THREE.Points;
  originalPositions: Float32Array;
  originalColors: Float32Array;
  isHovered: boolean;
  isClicked: boolean;
  hoverProgress: number;
  rotationSpeed: number;
  explodeVelocities: Float32Array | null;
  position: THREE.Vector3;
}

const COLS = 8;
const ROWS = 12;
const PARTICLE_SPACING = 0.15;
const BOOK_WIDTH = 1.5;
const BOOK_HEIGHT = 2.5;
const TOTAL_PARTICLES_PER_BOOK = COLS * ROWS;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

const COLOR_START = hexToRgb('#4a8cff');
const COLOR_END = hexToRgb('#ff66cc');
const HOVER_COLOR_START = hexToRgb('#aaeeff');
const HOVER_COLOR_END = hexToRgb('#ffaaff');
const DARK_GRAY = hexToRgb('#333333');

export class BookManager {
  public books: BookData[] = [];
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onBookClickCallback: (book: BookData) => void;

  constructor(
    scene: THREE.Scene,
    raycaster: THREE.Raycaster,
    mouse: THREE.Vector2,
    onBookClick: (book: BookData) => void
  ) {
    this.scene = scene;
    this.raycaster = raycaster;
    this.mouse = mouse;
    this.onBookClickCallback = onBookClick;
  }

  public createBooks(): void {
    const bookCount = 30;
    const shelfRadius = 8;
    const shelfHeight = 5;
    const arcAngle = Math.PI * 0.8;
    const startAngle = Math.PI / 2 - arcAngle / 2;

    for (let i = 0; i < bookCount; i++) {
      const angle = startAngle + (arcAngle * i) / (bookCount - 1);
      const x = Math.cos(angle) * shelfRadius;
      const z = Math.sin(angle) * shelfRadius;
      const y = (i % 3) * (shelfHeight / 2.5) - shelfHeight / 5;

      const book = this.createSingleBook(i);
      book.group.position.set(x, y, z);
      book.group.rotation.y = -angle + Math.PI / 2;
      book.position.set(x, y, z);
      this.books.push(book);
      this.scene.add(book.group);
    }
  }

  private createSingleBook(id: number): BookData {
    const group = new THREE.Group();
    const positions = new Float32Array(TOTAL_PARTICLES_PER_BOOK * 3);
    const colors = new Float32Array(TOTAL_PARTICLES_PER_BOOK * 3);
    const originalPositions = new Float32Array(TOTAL_PARTICLES_PER_BOOK * 3);
    const originalColors = new Float32Array(TOTAL_PARTICLES_PER_BOOK * 3);

    const startX = -BOOK_WIDTH / 2 + PARTICLE_SPACING / 2;
    const startY = -BOOK_HEIGHT / 2 + PARTICLE_SPACING / 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (row * COLS + col) * 3;
        const px = startX + col * PARTICLE_SPACING;
        const py = startY + row * PARTICLE_SPACING;
        positions[idx] = px;
        positions[idx + 1] = py;
        positions[idx + 2] = 0;
        originalPositions[idx] = px;
        originalPositions[idx + 1] = py;
        originalPositions[idx + 2] = 0;

        const t = (row * COLS + col) / (TOTAL_PARTICLES_PER_BOOK - 1);
        const c = lerpColor(COLOR_START, COLOR_END, t);
        colors[idx] = c.r;
        colors[idx + 1] = c.g;
        colors[idx + 2] = c.b;
        originalColors[idx] = c.r;
        originalColors[idx + 1] = c.g;
        originalColors[idx + 2] = c.b;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    group.add(particles);

    return {
      id,
      group,
      particles,
      originalPositions,
      originalColors,
      isHovered: false,
      isClicked: false,
      hoverProgress: 0,
      rotationSpeed: 0.02,
      explodeVelocities: null,
      position: new THREE.Vector3(),
    };
  }

  public handleMouseMove(): void {
    this.raycaster.setFromCamera(this.mouse, window.gameCamera);
    for (const book of this.books) {
      if (book.isClicked) continue;
      const intersects = this.raycaster.intersectObject(book.particles);
      if (intersects.length > 0) {
        book.isHovered = true;
      } else {
        book.isHovered = false;
      }
    }
  }

  public handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, window.gameCamera);
    for (const book of this.books) {
      if (book.isClicked) continue;
      const intersects = this.raycaster.intersectObject(book.particles);
      if (intersects.length > 0) {
        this.explodeBook(book);
        this.onBookClickCallback(book);
        break;
      }
    }
  }

  private explodeBook(book: BookData): void {
    book.isClicked = true;
    book.isHovered = false;
    const velocities = new Float32Array(TOTAL_PARTICLES_PER_BOOK * 3);

    for (let i = 0; i < TOTAL_PARTICLES_PER_BOOK; i++) {
      const idx = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 0.3 + Math.random() * 0.5;

      velocities[idx] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[idx + 1] = Math.cos(phi) * speed;
      velocities[idx + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    book.explodeVelocities = velocities;
  }

  public update(delta: number): void {
    for (const book of this.books) {
      if (book.isClicked && book.explodeVelocities) {
        this.updateExplosion(book, delta);
      } else if (!book.isClicked) {
        this.updateHover(book, delta);
      }
    }
  }

  private updateHover(book: BookData, delta: number): void {
    const targetProgress = book.isHovered ? 1 : 0;
    book.hoverProgress += (targetProgress - book.hoverProgress) * delta * 4;

    const positions = book.particles.geometry.attributes.position.array as Float32Array;
    const colors = book.particles.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < TOTAL_PARTICLES_PER_BOOK; i++) {
      const idx = i * 3;
      const t = i / (TOTAL_PARTICLES_PER_BOOK - 1);

      const originalX = book.originalPositions[idx];
      const originalY = book.originalPositions[idx + 1];
      const originalZ = book.originalPositions[idx + 2];

      const scale = 1 + book.hoverProgress * 0.2;
      positions[idx] = originalX * scale;
      positions[idx + 1] = originalY * scale;
      positions[idx + 2] = originalZ * scale;

      const baseColor = lerpColor(COLOR_START, COLOR_END, t);
      const hoverColor = lerpColor(HOVER_COLOR_START, HOVER_COLOR_END, t);
      const c = lerpColor(baseColor, hoverColor, book.hoverProgress);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    if (book.isHovered) {
      book.particles.rotation.y += book.rotationSpeed;
    }

    book.particles.geometry.attributes.position.needsUpdate = true;
    book.particles.geometry.attributes.color.needsUpdate = true;
  }

  private updateExplosion(book: BookData, delta: number): void {
    if (!book.explodeVelocities) return;

    const positions = book.particles.geometry.attributes.position.array as Float32Array;
    const colors = book.particles.geometry.attributes.color.array as Float32Array;
    const velocities = book.explodeVelocities;

    for (let i = 0; i < TOTAL_PARTICLES_PER_BOOK; i++) {
      const idx = i * 3;
      positions[idx] += velocities[idx] * delta;
      positions[idx + 1] += velocities[idx + 1] * delta;
      positions[idx + 2] += velocities[idx + 2] * delta;

      velocities[idx + 1] -= 0.5 * delta;

      colors[idx] = DARK_GRAY.r;
      colors[idx + 1] = DARK_GRAY.g;
      colors[idx + 2] = DARK_GRAY.b;
    }

    const material = book.particles.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, material.opacity - delta * 0.3);

    book.particles.geometry.attributes.position.needsUpdate = true;
    book.particles.geometry.attributes.color.needsUpdate = true;
  }

  public getClickedCount(): number {
    return this.books.filter((b) => b.isClicked).length;
  }

  public isAllClicked(): boolean {
    return this.books.every((b) => b.isClicked);
  }
}
