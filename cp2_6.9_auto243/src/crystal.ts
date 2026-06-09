import * as THREE from 'three';

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface AsteroidData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitTilt: number;
  rotationSpeed: number;
}

export class CrystalBallSystem {
  private scene: THREE.Scene;
  public crystalBall: THREE.Mesh;
  private glowCanvas: HTMLCanvasElement;
  private glowTexture: THREE.CanvasTexture;
  private glowCtx: CanvasRenderingContext2D;
  private glowTime: number = 0;
  private asteroids: AsteroidData[] = [];
  public asteroidGroup: THREE.Group;
  public platform: THREE.Mesh;
  private platformRing: THREE.Mesh;
  private platformTime: number = 0;
  private symbolMesh: THREE.Mesh | null = null;
  private symbolTime: number = 0;
  private symbolActive: boolean = false;
  private ballRadius: number = 2;
  private stars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = 512;
    this.glowCanvas.height = 512;
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.glowTexture = new THREE.CanvasTexture(this.glowCanvas);
    this.glowTexture.wrapS = THREE.RepeatWrapping;
    this.glowTexture.wrapT = THREE.RepeatWrapping;

    this.createStarfield();
    this.crystalBall = this.createCrystalBall();
    this.asteroidGroup = this.createAsteroids();
    this.platform = this.createDivinationPlatform();
    this.scene.add(this.crystalBall);
    this.scene.add(this.asteroidGroup);
    this.scene.add(this.platform);
    this.scene.add(this.platformRing);
  }

  private createStarfield(): void {
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.05 + Math.random() * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private createCrystalBall(): THREE.Mesh {
    this.updateGlowTexture(0);
    const geometry = new THREE.SphereGeometry(this.ballRadius, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      shininess: 120,
      specular: 0x8866ff,
      emissive: 0x331155,
      emissiveIntensity: 0.4,
      reflectivity: 0.5,
      combine: THREE.AddOperation,
      map: this.glowTexture
    });

    const ball = new THREE.Mesh(geometry, material);
    ball.position.set(0, 0.8, 0);

    const innerLight = new THREE.PointLight(0xaa66ff, 1.8, 8, 2);
    innerLight.position.set(0, 0.8, 0);
    ball.add(innerLight);

    const coreGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xd4aaff,
      transparent: true,
      opacity: 0.7
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    ball.add(core);

    return ball;
  }

  private updateGlowTexture(time: number): void {
    const ctx = this.glowCtx;
    const w = this.glowCanvas.width;
    const h = this.glowCanvas.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(180, 120, 255, 0.15)');
    grad.addColorStop(0.5, 'rgba(90, 40, 180, 0.08)');
    grad.addColorStop(1, 'rgba(30, 10, 60, 0.02)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 5; i++) {
      const cx = (w / 2) + Math.sin(time * 0.3 + i * 1.7) * (w * 0.35);
      const cy = (h / 2) + Math.cos(time * 0.25 + i * 2.3) * (h * 0.35);
      const r = 60 + Math.sin(time * 0.5 + i) * 30;
      const hue = (260 + i * 30 + time * 8) % 360;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.55)`);
      rg.addColorStop(0.6, `hsla(${hue + 20}, 80%, 55%, 0.2)`);
      rg.addColorStop(1, `hsla(${hue + 40}, 70%, 40%, 0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(i * 12.9898 + time * 0.1) * 43758.5453) % 1;
      const y = (Math.cos(i * 78.233 + time * 0.08) * 43758.5453) % 1;
      const px = ((x + 1) % 1) * w;
      const py = ((y + 1) % 1) * h;
      const pr = 2 + Math.sin(time + i) * 1.5;
      ctx.fillStyle = `hsla(${280 + (i % 5) * 20}, 80%, 80%, 0.8)`;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    this.glowTexture.needsUpdate = true;
  }

  private createAsteroids(): THREE.Group {
    const group = new THREE.Group();
    const colors = [0xFFD700, 0xFF6B6B, 0x00C9FF];

    for (let i = 0; i < 6; i++) {
      const color = colors[i % 3];
      const geo = new THREE.IcosahedronGeometry(0.1, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);

      const orbitRadius = 2.8 + Math.random() * 0.6;
      const orbitSpeed = 0.3 + Math.random() * 0.4;
      const orbitAngle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const orbitTilt = (Math.random() - 0.5) * 0.8;
      const rotationSpeed = (Math.random() * 2 + 2) * (Math.PI * 2) / 5;

      this.asteroids.push({
        mesh,
        orbitRadius,
        orbitSpeed,
        orbitAngle,
        orbitTilt,
        rotationSpeed
      });
      group.add(mesh);
    }
    group.position.set(0, 0.8, 0);
    return group;
  }

  private createDivinationPlatform(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(1.2, 1.4, 0.15, 64);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x0B2D4D,
      transparent: true,
      opacity: 0.75,
      shininess: 80,
      specular: 0x4488ff,
      emissive: 0x0a1a3a,
      emissiveIntensity: 0.4
    });
    const platform = new THREE.Mesh(geo, mat);
    platform.position.set(0, -1.6, 0);

    const ringGeo = new THREE.TorusGeometry(1.3, 0.04, 16, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.8
    });
    this.platformRing = new THREE.Mesh(ringGeo, ringMat);
    this.platformRing.position.set(0, -1.52, 0);
    this.platformRing.rotation.x = Math.PI / 2;

    return platform;
  }

  private generateSymbolShape(): THREE.Shape {
    const shape = new THREE.Shape();
    const style = Math.floor(Math.random() * 5);
    const scale = 1.2;

    if (style === 0) {
      shape.moveTo(0, -scale);
      shape.bezierCurveTo(scale * 0.8, -scale * 0.5, scale, scale * 0.2, 0, scale);
      shape.bezierCurveTo(-scale, scale * 0.2, -scale * 0.8, -scale * 0.5, 0, -scale);
    } else if (style === 1) {
      const pts: THREE.Vector2[] = [];
      const spikes = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? scale : scale * 0.45;
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      }
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const cx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 0.2;
        const cy = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 0.2;
        shape.quadraticCurveTo(cx, cy, p1.x, p1.y);
      }
    } else if (style === 2) {
      shape.moveTo(0, -scale);
      shape.bezierCurveTo(scale * 1.2, -scale * 0.3, scale * 0.6, scale, 0, scale * 0.5);
      shape.bezierCurveTo(-scale * 0.6, scale, -scale * 1.2, -scale * 0.3, 0, -scale);
    } else if (style === 3) {
      shape.moveTo(-scale * 0.8, scale * 0.6);
      shape.bezierCurveTo(0, scale * 1.3, scale * 0.8, scale * 0.6, scale * 0.6, 0);
      shape.bezierCurveTo(scale * 0.4, -scale * 0.8, 0, -scale * 1.1, -scale * 0.6, 0);
      shape.bezierCurveTo(-scale * 0.4, -scale * 0.8, -scale * 0.8, scale * 0.6, -scale * 0.8, scale * 0.6);
    } else {
      shape.moveTo(0, -scale);
      shape.bezierCurveTo(scale * 0.7, -scale * 0.7, scale, 0, 0, scale);
      shape.bezierCurveTo(-scale, 0, -scale * 0.7, -scale * 0.7, 0, -scale);
      shape.moveTo(-scale * 0.6, 0);
      shape.bezierCurveTo(-scale * 0.2, -scale * 0.4, scale * 0.2, scale * 0.4, scale * 0.6, 0);
    }

    return shape;
  }

  public showDivinationSymbol(): void {
    if (this.symbolMesh) {
      this.crystalBall.remove(this.symbolMesh);
      this.symbolMesh.geometry.dispose();
      (this.symbolMesh.material as THREE.Material).dispose();
    }

    const shape = this.generateSymbolShape();
    const points = shape.getPoints(80);
    const geo = new THREE.BufferGeometry().setFromPoints(points);

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 2
    });

    const line = new THREE.Line(geo, mat);
    line.scale.setScalar(1.5);
    line.position.set(0, 0, this.ballRadius * 0.98);
    line.lookAt(0, 0.8, 10);

    this.symbolMesh = line as unknown as THREE.Mesh;
    this.crystalBall.add(this.symbolMesh);
    this.symbolActive = true;
    this.symbolTime = 0;
  }

  public regenerateGlow(): void {
    this.glowTime = 0;
  }

  public update(delta: number): void {
    this.glowTime += delta;
    this.updateGlowTexture(this.glowTime);
    if (this.glowTexture) {
      this.glowTexture.offset.x = this.glowTime * 0.05;
      this.glowTexture.offset.y = this.glowTime * 0.03;
    }

    for (const ast of this.asteroids) {
      ast.orbitAngle += ast.orbitSpeed * delta;
      const x = Math.cos(ast.orbitAngle) * ast.orbitRadius;
      const z = Math.sin(ast.orbitAngle) * ast.orbitRadius;
      const y = Math.sin(ast.orbitAngle * 1.3 + ast.orbitTilt) * 0.4 + ast.orbitTilt * 0.6;
      ast.mesh.position.set(x, y, z);
      ast.mesh.rotation.x += ast.rotationSpeed * delta;
      ast.mesh.rotation.y += ast.rotationSpeed * 0.7 * delta;
    }
    this.asteroidGroup.rotation.y += delta * 0.08;

    this.platformTime += delta;
    const ringPulse = 0.5 + 0.5 * Math.sin(this.platformTime * (Math.PI * 2) / 1.5);
    (this.platformRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + ringPulse * 0.6;
    (this.platformRing.material as THREE.MeshBasicMaterial).color.setHSL(0.6 + ringPulse * 0.1, 0.9, 0.5 + ringPulse * 0.2);
    this.platformRing.scale.setScalar(1 + ringPulse * 0.04);

    this.crystalBall.position.y = 0.8 + Math.sin(this.glowTime * 1.2) * 0.08;

    if (this.symbolActive && this.symbolMesh) {
      this.symbolTime += delta;
      const total = 2.0;
      let t = Math.min(this.symbolTime / total, 1);
      if (t < 0.25) {
        (this.symbolMesh.material as THREE.LineBasicMaterial).opacity = easeInOutCubic(t / 0.25) * 1.0;
      } else if (t > 0.75) {
        (this.symbolMesh.material as THREE.LineBasicMaterial).opacity = easeInOutCubic((1 - t) / 0.25) * 1.0;
      } else {
        (this.symbolMesh.material as THREE.LineBasicMaterial).opacity = 1.0;
      }
      if (t >= 1) {
        this.symbolActive = false;
      }
    }

    this.stars.rotation.y += delta * 0.01;
  }

  public dispose(): void {
    if (this.symbolMesh) {
      this.symbolMesh.geometry.dispose();
      (this.symbolMesh.material as THREE.Material).dispose();
    }
    this.crystalBall.geometry.dispose();
    (this.crystalBall.material as THREE.Material).dispose();
    this.glowTexture.dispose();
    for (const ast of this.asteroids) {
      ast.mesh.geometry.dispose();
      (ast.mesh.material as THREE.Material).dispose();
    }
    this.platform.geometry.dispose();
    (this.platform.material as THREE.Material).dispose();
    this.platformRing.geometry.dispose();
    (this.platformRing.material as THREE.Material).dispose();
  }
}
