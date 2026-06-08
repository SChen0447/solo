import * as THREE from 'three';
import { getStars, getConstellations, generateBackgroundStars, generateNebulaParticles, StarData, ConstellationData } from './data/constellations';

export class StarSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private starData: StarData[] = [];
  private constellationData: ConstellationData[] = [];
  private starsGroup: THREE.Group;
  private constellationLinesGroup: THREE.Group;
  private backgroundStars: THREE.Points;
  private nebulaParticles: THREE.Points;
  private nebulaData: { x: number; y: number; z: number; size: number; speed: number }[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedStar: StarData | null = null;
  private highlightedConstellation: string | null = null;
  private highlightTimeout: number | null = null;
  private glowSprites: { [key: string]: THREE.Sprite } = {};
  private time: number = 0;

  public onStarHover: ((star: StarData | null, screenPos: { x: number; y: number }) => void) | null = null;
  public onConstellationChange: ((constellation: ConstellationData) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.starsGroup = new THREE.Group();
    this.constellationLinesGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.backgroundStars = new THREE.Points();
    this.nebulaParticles = new THREE.Points();

    this.init();
  }

  private init() {
    this.starData = getStars();
    this.constellationData = getConstellations();

    this.createStarParticles();
    this.createConstellationLines();
    this.createBackgroundStars();
    this.createNebulaParticles();

    this.scene.add(this.starsGroup);
    this.scene.add(this.constellationLinesGroup);
  }

  private createStarTexture(size: number, color: string, hasGlow: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size * 4;
    canvas.height = size * 4;
    const ctx = canvas.getContext('2d')!;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (hasGlow) {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(0.4, color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  private createStarParticles() {
    const brightStars: StarData[] = [];
    const normalStars: StarData[] = [];

    this.starData.forEach(star => {
      if (star.magnitude < 2.5) {
        brightStars.push(star);
      } else {
        normalStars.push(star);
      }
    });

    normalStars.forEach(star => {
      const geometry = new THREE.SphereGeometry(this.getStarSize(star.magnitude) * 0.5, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(star.color),
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(star.x, star.y, star.z);
      mesh.userData = { starId: star.id, type: 'star' };
      this.starsGroup.add(mesh);
    });

    brightStars.forEach(star => {
      const size = this.getStarSize(star.magnitude);
      
      const glowTexture = this.createStarTexture(64, star.color, true);
      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.position.set(star.x, star.y, star.z);
      glowSprite.scale.set(size * 3, size * 3, 1);
      glowSprite.userData = { starId: star.id, type: 'glow' };
      this.starsGroup.add(glowSprite);
      this.glowSprites[star.id] = glowSprite;

      const coreGeometry = new THREE.SphereGeometry(size * 0.8, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 0.95
      });
      const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      coreMesh.position.set(star.x, star.y, star.z);
      coreMesh.userData = { starId: star.id, type: 'star' };
      this.starsGroup.add(coreMesh);
    });
  }

  private getStarSize(magnitude: number): number {
    const baseSize = 0.8;
    const size = baseSize * Math.pow(1.5, -magnitude + 2);
    return Math.max(0.2, Math.min(size, 4));
  }

  private createConstellationLines() {
    this.constellationData.forEach(constellation => {
      const starPositions: THREE.Vector3[] = [];
      constellation.starIds.forEach(starId => {
        const star = this.starData.find(s => s.id === starId);
        if (star) {
          starPositions.push(new THREE.Vector3(star.x, star.y, star.z));
        }
      });

      constellation.lines.forEach(([startIdx, endIdx]) => {
        if (startIdx < starPositions.length && endIdx < starPositions.length) {
          const start = starPositions[startIdx];
          const end = starPositions[endIdx];
          
          const points = [start.clone(), end.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          
          const material = new THREE.LineBasicMaterial({
            color: new THREE.Color('#5a6fd1'),
            transparent: true,
            opacity: 0.35
          });
          
          const line = new THREE.Line(geometry, material);
          line.userData = { constellationId: constellation.id, type: 'constellation-line' };
          this.constellationLinesGroup.add(line);
        }
      });
    });
  }

  private createBackgroundStars() {
    const bgStars = generateBackgroundStars(2000);
    const positions = new Float32Array(bgStars.length * 3);
    const colors = new Float32Array(bgStars.length * 3);
    const sizes = new Float32Array(bgStars.length);

    bgStars.forEach((star, i) => {
      positions[i * 3] = star.x;
      positions[i * 3 + 1] = star.y;
      positions[i * 3 + 2] = star.z;
      
      const color = new THREE.Color(star.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = star.size;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const spriteTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  private createNebulaParticles() {
    const nebula = generateNebulaParticles(300);
    this.nebulaData = nebula.map(p => ({ x: p.x, y: p.y, z: p.z, size: p.size, speed: p.speed }));
    
    const positions = new Float32Array(nebula.length * 3);
    const colors = new Float32Array(nebula.length * 3);

    nebula.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      
      const color = new THREE.Color(p.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 8,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6
    });

    this.nebulaParticles = new THREE.Points(geometry, material);
    this.scene.add(this.nebulaParticles);
  }

  public update(deltaTime: number, cameraDistance: number) {
    this.time += deltaTime;

    const pulseScale = 1 + Math.sin(this.time * 1.5) * 0.15;
    this.constellationLinesGroup.children.forEach(child => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;
        const constellationId = child.userData.constellationId;
        
        if (this.highlightedConstellation === constellationId) {
          material.opacity = 0.7 + Math.sin(this.time * 3) * 0.2;
          material.color.setHex(0xFFD54F);
        } else {
          material.opacity = 0.25 + Math.sin(this.time * 1.5 + child.position.x * 0.01) * 0.1;
          material.color.setHex(0x5a6fd1);
        }
      }
    });

    Object.values(this.glowSprites).forEach(sprite => {
      const baseScale = sprite.scale.x;
      const scale = baseScale * (1 + Math.sin(this.time * 2 + sprite.position.x * 0.01) * 0.1);
      sprite.scale.set(scale, scale, 1);
    });

    const positions = this.nebulaParticles.geometry.attributes.position.array as Float32Array;
    this.nebulaData.forEach((p, i) => {
      positions[i * 3 + 1] = p.y + Math.sin(this.time * p.speed + p.x * 0.01) * 5;
    });
    this.nebulaParticles.geometry.attributes.position.needsUpdate = true;
  }

  public handleMouseMove(clientX: number, clientY: number, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.starsGroup.children, false);

    if (intersects.length > 0) {
      const first = intersects[0].object;
      const starId = first.userData.starId;
      const star = this.starData.find(s => s.id === starId);
      
      if (star && star !== this.selectedStar) {
        this.selectedStar = star;
        const screenPos = this.worldToScreen(star.x, star.y, star.z, container);
        if (this.onStarHover) {
          this.onStarHover(star, screenPos);
        }
      } else if (star && this.onStarHover) {
        const screenPos = this.worldToScreen(star.x, star.y, star.z, container);
        this.onStarHover(star, screenPos);
      }
    } else {
      if (this.selectedStar) {
        this.selectedStar = null;
        if (this.onStarHover) {
          this.onStarHover(null, { x: 0, y: 0 });
        }
      }
    }
  }

  private worldToScreen(x: number, y: number, z: number, container: HTMLElement): { x: number; y: number } {
    const vector = new THREE.Vector3(x, y, z);
    vector.project(this.camera);
    
    const rect = container.getBoundingClientRect();
    return {
      x: (vector.x * 0.5 + 0.5) * rect.width,
      y: (-vector.y * 0.5 + 0.5) * rect.height
    };
  }

  public highlightConstellation(constellationId: string, duration: number = 3000) {
    this.highlightedConstellation = constellationId;
    
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    
    this.highlightTimeout = window.setTimeout(() => {
      this.highlightedConstellation = null;
      this.highlightTimeout = null;
    }, duration);

    const constellation = this.constellationData.find(c => c.id === constellationId);
    if (constellation && this.onConstellationChange) {
      this.onConstellationChange(constellation);
    }
  }

  public getConstellationCenter(constellationId: string): THREE.Vector3 {
    const constellation = this.constellationData.find(c => c.id === constellationId);
    if (!constellation) return new THREE.Vector3(0, 0, 100);

    let center = new THREE.Vector3();
    let count = 0;
    
    constellation.starIds.forEach(starId => {
      const star = this.starData.find(s => s.id === starId);
      if (star) {
        center.x += star.x;
        center.y += star.y;
        center.z += star.z;
        count++;
      }
    });

    if (count > 0) {
      center.divideScalar(count);
    }

    return center;
  }

  public getStarData(): StarData[] {
    return this.starData;
  }

  public getConstellations(): ConstellationData[] {
    return this.constellationData;
  }

  public getStarsGroup(): THREE.Group {
    return this.starsGroup;
  }
}
