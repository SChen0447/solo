import * as THREE from 'three';
import { gsap } from 'gsap';

const ASTROLABE_CONFIG = {
  DIAMETER_RATIO_DESKTOP: 0.45,
  DIAMETER_RATIO_MOBILE: 0.6,
  MIN_DIAMETER: 320,
  THICKNESS_RATIO: 0.08,
  ROTATION_SPEED: 0.01,
  EDGE_THICKNESS: 4,
  STONE_COLOR_FROM: 0x4a3b32,
  STONE_COLOR_TO: 0x2d231c,
  EDGE_COLOR: 0x7a5c3a,
};

const RUNE_CONFIG = {
  MIN_COUNT: 40,
  MAX_COUNT: 50,
  CURVES_PER_RUNE: [2, 3],
  COLORS: ['#00e5ff', '#a64dff', '#ff6b6b', '#ffcc00'],
  IDLE_COLOR: 0x8a8a8a,
  IDLE_OPACITY: 0.3,
  ACTIVE_OPACITY: 1.0,
  HOVER_TRANSITION: 0.6,
  PULSE_PERIOD: 1.5,
  PULSE_MIN: 0.8,
  PULSE_MAX: 1.2,
  PULSE_SCALE: 1.5,
  CHAIN_DISTANCE: 80,
  CHAIN_DELAY: 0.3,
  CHAIN_MIN_COUNT: 3,
  CHAIN_MAX_COUNT: 5,
  RING_WIDTH: 6,
  RING_MAX_RADIUS: 150,
  RING_DURATION: 1.2,
};

interface RuneData {
  id: number;
  position: THREE.Vector2;
  rotation: number;
  color: string;
  curves: THREE.CatmullRomCurve3[];
  mesh: THREE.Group;
  lineMaterials: THREE.LineBasicMaterial[];
  state: 'idle' | 'hover' | 'active' | 'chain';
  targetBrightness: number;
  currentBrightness: number;
  pulsePhase: number;
  hitbox: THREE.Mesh;
}

interface ExpansionRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxRadius: number;
}

interface AstrolabeOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  diameter: number;
  onRuneActivate?: (rune: RuneData, worldPosition: THREE.Vector3) => void;
}

export class Astrolabe {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private diameter: number;
  private thickness: number;
  private group: THREE.Group;
  private diskMesh!: THREE.Mesh;
  private edgeMesh!: THREE.Mesh;
  private runes: RuneData[] = [];
  private expansionRings: ExpansionRing[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredRune: RuneData | null = null;
  private onRuneActivate?: (rune: RuneData, worldPosition: THREE.Vector3) => void;
  private runeHitboxes: THREE.Mesh[] = [];

  constructor(options: AstrolabeOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.diameter = options.diameter * 0.01;
    this.thickness = this.diameter * ASTROLABE_CONFIG.THICKNESS_RATIO;
    this.onRuneActivate = options.onRuneActivate;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.group = new THREE.Group();

    this.createStoneDisk();
    this.createEdge();
    this.createRunes();

    this.scene.add(this.group);
  }

  private createNoiseTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    const colorFrom = new THREE.Color(ASTROLABE_CONFIG.STONE_COLOR_FROM);
    const colorTo = new THREE.Color(ASTROLABE_CONFIG.STONE_COLOR_TO);
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = this.perlinNoise(
        (i / 4) % size * 0.05,
        Math.floor(i / 4 / size) * 0.05,
        0
      );
      const t = (noise + 1) / 2;
      
      const r = Math.floor(colorFrom.r * 255 * (1 - t) + colorTo.r * 255 * t);
      const g = Math.floor(colorFrom.g * 255 * (1 - t) + colorTo.g * 255 * t);
      const b = Math.floor(colorFrom.b * 255 * (1 - t) + colorTo.b * 255 * t);
      
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private perlinNoise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const hash = (n: number) => {
      const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
        140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
        247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
        57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
        74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
        60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
        65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
        200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
        52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
        207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
        119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
        129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
        218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
        81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
        184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
        222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
      return p[(n + p[X]) & 255];
    };
    
    const A = hash(X) + Y;
    const AA = hash(A) + Z;
    const AB = hash(A + 1) + Z;
    const B = hash(X + 1) + Y;
    const BA = hash(B) + Z;
    const BB = hash(B + 1) + Z;
    
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(hash(AA), x, y, z), this.grad(hash(BA), x - 1, y, z)),
        this.lerp(u, this.grad(hash(AB), x, y - 1, z), this.grad(hash(BB), x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(hash(AA + 1), x, y, z - 1), this.grad(hash(BA + 1), x - 1, y, z - 1)),
        this.lerp(u, this.grad(hash(AB + 1), x, y - 1, z - 1), this.grad(hash(BB + 1), x - 1, y - 1, z - 1))
      )
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private createStoneDisk(): void {
    const geometry = new THREE.CylinderGeometry(
      this.diameter / 2,
      this.diameter / 2,
      this.thickness,
      64
    );
    
    const texture = this.createNoiseTexture();
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1,
    });
    
    this.diskMesh = new THREE.Mesh(geometry, material);
    this.diskMesh.rotation.x = Math.PI / 2;
    this.group.add(this.diskMesh);
  }

  private createEdge(): void {
    const edgeThickness = ASTROLABE_CONFIG.EDGE_THICKNESS * 0.01;
    const outerRadius = this.diameter / 2 + edgeThickness;
    const innerRadius = this.diameter / 2;
    
    const geometry = new THREE.TorusGeometry(
      (outerRadius + innerRadius) / 2,
      (outerRadius - innerRadius) / 2,
      16,
      100
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: ASTROLABE_CONFIG.EDGE_COLOR,
      roughness: 0.6,
      metalness: 0.8,
    });
    
    this.edgeMesh = new THREE.Mesh(geometry, material);
    this.edgeMesh.rotation.x = Math.PI / 2;
    this.group.add(this.edgeMesh);
  }

  private createRunes(): void {
    const runeCount = Math.floor(
      this.randomRange(RUNE_CONFIG.MIN_COUNT, RUNE_CONFIG.MAX_COUNT)
    );
    
    const radius = this.diameter / 2 * 0.85;
    
    for (let i = 0; i < runeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      
      const color = RUNE_CONFIG.COLORS[Math.floor(Math.random() * RUNE_CONFIG.COLORS.length)];
      const rotation = Math.random() * Math.PI * 2;
      
      const curveCount = Math.floor(this.randomRange(RUNE_CONFIG.CURVES_PER_RUNE[0], RUNE_CONFIG.CURVES_PER_RUNE[1] + 1));
      const curves: THREE.CatmullRomCurve3[] = [];
      
      for (let j = 0; j < curveCount; j++) {
        const points: THREE.Vector3[] = [];
        const curveLength = this.randomRange(0.1, 0.2);
        const startAngle = (j / curveCount) * Math.PI * 2 + Math.random() * 0.5;
        
        for (let k = 0; k < 4; k++) {
          const t = k / 3;
          const px = Math.cos(startAngle + t * 0.8) * curveLength * t;
          const py = Math.sin(startAngle + t * 0.8) * curveLength * t + (Math.random() - 0.5) * 0.03;
          const pz = 0;
          points.push(new THREE.Vector3(px, py, pz));
        }
        
        curves.push(new THREE.CatmullRomCurve3(points));
      }
      
      const runeGroup = new THREE.Group();
      const lineMaterials: THREE.LineBasicMaterial[] = [];
      
      for (const curve of curves) {
        const points = curve.getPoints(20);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
          color: RUNE_CONFIG.IDLE_COLOR,
          transparent: true,
          opacity: RUNE_CONFIG.IDLE_OPACITY,
          linewidth: 2,
        });
        
        const line = new THREE.Line(geometry, material);
        runeGroup.add(line);
        lineMaterials.push(material);
      }
      
      runeGroup.position.set(x, y, this.thickness / 2 + 0.001);
      runeGroup.rotation.z = rotation;
      
      const hitboxGeometry = new THREE.CircleGeometry(0.08, 16);
      const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      hitbox.position.set(x, y, this.thickness / 2 + 0.002);
      hitbox.rotation.x = -Math.PI / 2;
      hitbox.userData.runeId = i;
      
      const runeData: RuneData = {
        id: i,
        position: new THREE.Vector2(x, y),
        rotation,
        color,
        curves,
        mesh: runeGroup,
        lineMaterials,
        state: 'idle',
        targetBrightness: RUNE_CONFIG.IDLE_OPACITY,
        currentBrightness: RUNE_CONFIG.IDLE_OPACITY,
        pulsePhase: Math.random() * Math.PI * 2,
        hitbox,
      };
      
      this.runes.push(runeData);
      this.runeHitboxes.push(hitbox);
      this.group.add(runeGroup);
      this.group.add(hitbox);
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public onRaycast(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.runeHitboxes);
    
    if (intersects.length > 0) {
      const hitbox = intersects[0].object as THREE.Mesh;
      const runeId = hitbox.userData.runeId;
      const rune = this.runes[runeId];
      
      if (this.hoveredRune && this.hoveredRune !== rune) {
        this.setRuneState(this.hoveredRune, 'idle');
      }
      
      if (rune.state === 'idle') {
        this.setRuneState(rune, 'hover');
      }
      
      this.hoveredRune = rune;
    } else {
      if (this.hoveredRune && this.hoveredRune.state === 'hover') {
        this.setRuneState(this.hoveredRune, 'idle');
      }
      this.hoveredRune = null;
    }
  }

  public onClick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.runeHitboxes);
    
    if (intersects.length > 0) {
      const hitbox = intersects[0].object as THREE.Mesh;
      const runeId = hitbox.userData.runeId;
      const rune = this.runes[runeId];
      
      if (rune.state === 'hover' || rune.state === 'active' || rune.state === 'chain') {
        this.activateRune(rune, true);
      }
    }
  }

  private setRuneState(rune: RuneData, state: 'idle' | 'hover' | 'active' | 'chain'): void {
    rune.state = state;
    
    if (state === 'idle') {
      rune.targetBrightness = RUNE_CONFIG.IDLE_OPACITY;
    } else {
      rune.targetBrightness = RUNE_CONFIG.ACTIVE_OPACITY;
    }
  }

  private activateRune(rune: RuneData, isPrimary: boolean): void {
    this.setRuneState(rune, isPrimary ? 'active' : 'chain');
    
    const worldPos = new THREE.Vector3();
    rune.mesh.getWorldPosition(worldPos);
    
    this.createExpansionRing(rune.position, rune.color);
    
    gsap.to(rune.mesh.scale, {
      x: RUNE_CONFIG.PULSE_SCALE,
      y: RUNE_CONFIG.PULSE_SCALE,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(rune.mesh.scale, {
          x: 1,
          y: 1,
          duration: 0.4,
          ease: 'power2.inOut',
        });
      },
    });
    
    if (this.onRuneActivate) {
      this.onRuneActivate(rune, worldPos);
    }
    
    if (isPrimary) {
      this.triggerChainReaction(rune);
    }
  }

  private createExpansionRing(position: THREE.Vector2, color: string): void {
    const colorHex = parseInt(color.replace('#', ''), 16);
    
    const geometry = new THREE.RingGeometry(
      0.01,
      0.01 + RUNE_CONFIG.RING_WIDTH * 0.001,
      64
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(position.x, position.y, this.thickness / 2 + 0.01);
    ring.rotation.x = -Math.PI / 2;
    
    this.group.add(ring);
    
    this.expansionRings.push({
      mesh: ring,
      life: RUNE_CONFIG.RING_DURATION,
      maxLife: RUNE_CONFIG.RING_DURATION,
      maxRadius: RUNE_CONFIG.RING_MAX_RADIUS * 0.01,
    });
  }

  private triggerChainReaction(originRune: RuneData): void {
    const nearbyRunes = this.runes
      .filter(r => r.id !== originRune.id && r.state === 'idle')
      .map(r => ({
        rune: r,
        distance: r.position.distanceTo(originRune.position),
      }))
      .filter(r => r.distance < RUNE_CONFIG.CHAIN_DISTANCE * 0.01)
      .sort((a, b) => a.distance - b.distance);
    
    const chainCount = Math.min(
      nearbyRunes.length,
      Math.floor(this.randomRange(RUNE_CONFIG.CHAIN_MIN_COUNT, RUNE_CONFIG.CHAIN_MAX_COUNT + 1))
    );
    
    const selectedRunes = nearbyRunes.slice(0, chainCount);
    
    selectedRunes.forEach((item, index) => {
      setTimeout(() => {
        if (item.rune.state === 'idle') {
          this.activateRune(item.rune, false);
        }
      }, (index + 1) * RUNE_CONFIG.CHAIN_DELAY * 1000);
    });
  }

  public update(deltaTime: number): void {
    this.group.rotation.y += ASTROLABE_CONFIG.ROTATION_SPEED * deltaTime;
    
    for (const rune of this.runes) {
      if (rune.currentBrightness < rune.targetBrightness) {
        rune.currentBrightness = Math.min(
          rune.currentBrightness + deltaTime / RUNE_CONFIG.HOVER_TRANSITION,
          rune.targetBrightness
        );
      } else if (rune.currentBrightness > rune.targetBrightness) {
        rune.currentBrightness = Math.max(
          rune.currentBrightness - deltaTime / RUNE_CONFIG.HOVER_TRANSITION,
          rune.targetBrightness
        );
      }
      
      let brightness = rune.currentBrightness;
      
      if (rune.state !== 'idle') {
        rune.pulsePhase += deltaTime * (Math.PI * 2) / RUNE_CONFIG.PULSE_PERIOD;
        const pulse = RUNE_CONFIG.PULSE_MIN + (Math.sin(rune.pulsePhase) * 0.5 + 0.5) * (RUNE_CONFIG.PULSE_MAX - RUNE_CONFIG.PULSE_MIN);
        brightness *= pulse;
      }
      
      const color = rune.state === 'idle' 
        ? new THREE.Color(RUNE_CONFIG.IDLE_COLOR)
        : new THREE.Color(rune.color);
      
      for (const material of rune.lineMaterials) {
        material.opacity = brightness;
        material.color.copy(color);
      }
    }
    
    for (let i = this.expansionRings.length - 1; i >= 0; i--) {
      const ring = this.expansionRings[i];
      ring.life -= deltaTime;
      
      if (ring.life <= 0) {
        this.group.remove(ring.mesh);
        (ring.mesh.geometry as THREE.BufferGeometry).dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.expansionRings.splice(i, 1);
        continue;
      }
      
      const progress = 1 - ring.life / ring.maxLife;
      const currentRadius = ring.maxRadius * progress;
      const ringWidth = RUNE_CONFIG.RING_WIDTH * 0.001;
      
      const newGeometry = new THREE.RingGeometry(
        Math.max(0.01, currentRadius - ringWidth / 2),
        currentRadius + ringWidth / 2,
        64
      );
      
      ring.mesh.geometry.dispose();
      ring.mesh.geometry = newGeometry;
      
      const material = ring.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - progress;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.scene.remove(this.group);
    
    (this.diskMesh.geometry as THREE.BufferGeometry).dispose();
    (this.diskMesh.material as THREE.Material).dispose();
    
    (this.edgeMesh.geometry as THREE.BufferGeometry).dispose();
    (this.edgeMesh.material as THREE.Material).dispose();
    
    for (const rune of this.runes) {
      for (const material of rune.lineMaterials) {
        material.dispose();
      }
      rune.mesh.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
        }
      });
      (rune.hitbox.geometry as THREE.BufferGeometry).dispose();
      (rune.hitbox.material as THREE.Material).dispose();
    }
    
    for (const ring of this.expansionRings) {
      (ring.mesh.geometry as THREE.BufferGeometry).dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
  }
}

export { ASTROLABE_CONFIG, RUNE_CONFIG };
export type { RuneData };
