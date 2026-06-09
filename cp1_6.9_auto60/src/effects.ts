import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  type: 'splash' | 'ice';
  angularVelocity: THREE.Vector3;
}

interface AuroraBand {
  mesh: THREE.Mesh;
  phase: number;
  speed: number;
  colorOffset: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private auroraBands: AuroraBand[] = [];
  private skyGroup!: THREE.Group;
  private hoverHighlight!: THREE.Mesh;
  private readonly MAX_PARTICLES = 100;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSky();
    this.createAurora();
    this.createHoverHighlight();
  }

  private createSky(): void {
    this.skyGroup = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.5, '#1a0a40');
    gradient.addColorStop(1, '#00ff88');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const skyGeom = new THREE.SphereGeometry(80, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.95
    });
    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.skyGroup.add(sky);

    const starCount = 300;
    const starGeom = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45 + Math.PI * 0.05;
      const r = 70;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeom, starMat);
    this.skyGroup.add(stars);

    this.scene.add(this.skyGroup);
  }

  private createAurora(): void {
    const auroraColors = [
      new THREE.Color(0x00ff88),
      new THREE.Color(0xaa44ff),
      new THREE.Color(0xff66aa),
      new THREE.Color(0x44aaff),
      new THREE.Color(0x88ffcc)
    ];

    for (let i = 0; i < 5; i++) {
      const curvePoints: THREE.Vector3[] = [];
      const segments = 20;
      const baseRadius = 25 + i * 1.5;
      const baseY = 10 + i * 2;
      const amplitude = 2 + i * 0.8;

      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const angle = t * Math.PI * 1.2 - Math.PI * 0.6;
        const x = Math.cos(angle) * baseRadius;
        const z = Math.sin(angle) * baseRadius - 10;
        const y = baseY + Math.sin(angle * 3 + i) * amplitude + Math.sin(t * 5) * 0.8;
        curvePoints.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeom = new THREE.TubeGeometry(curve, 40, 0.6 + i * 0.15, 8, false);

      const auroraMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: auroraColors[i % auroraColors.length] },
          uColorB: { value: auroraColors[(i + 2) % auroraColors.length] },
          uOffset: { value: i * 0.3 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform float uOffset;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            float noise = sin(vUv.x * 20.0 + uTime * 2.0 + uOffset) * 0.5 + 0.5;
            float colorMix = sin(uTime * 0.3 + uOffset) * 0.5 + 0.5;
            vec3 color = mix(uColorA, uColorB, colorMix);
            float alpha = sin(vUv.x * 3.14159) * 0.35 * (0.6 + noise * 0.4);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const band = new THREE.Mesh(tubeGeom, auroraMat);
      this.skyGroup.add(band);

      this.auroraBands.push({
        mesh: band,
        phase: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.1,
        colorOffset: i * 0.3
      });
    }
  }

  private createHoverHighlight(): void {
    const geom = new THREE.SphereGeometry(0.35, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.hoverHighlight = new THREE.Mesh(geom, mat);
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);
  }

  public showHoverHighlight(position: THREE.Vector3): void {
    this.hoverHighlight.visible = true;
    this.hoverHighlight.position.copy(position);
    const mat = this.hoverHighlight.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3;
  }

  public hideHoverHighlight(): void {
    this.hoverHighlight.visible = false;
  }

  public spawnSplash(position: THREE.Vector3): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;

      const size = 0.04 + Math.random() * 0.04;
      const geom = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const upward = 1.5 + Math.random() * 2;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upward,
          Math.sin(angle) * speed
        ),
        life: 0.1,
        maxLife: 0.1,
        type: 'splash',
        angularVelocity: new THREE.Vector3()
      });
    }
  }

  public spawnCollisionIce(position: THREE.Vector3, normal: THREE.Vector3): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;

      const size = 0.03;
      const geom = new THREE.TetrahedronGeometry(size);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const fanAngle = Math.PI * 0.6;
      const baseAngle = Math.atan2(normal.z, normal.x);
      const spreadAngle = baseAngle + (Math.random() - 0.5) * fanAngle;
      const speed = 0.5 + Math.random() * 1;
      const upward = 0.2 + Math.random() * 0.8;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(spreadAngle) * speed,
          upward,
          Math.sin(spreadAngle) * speed
        ),
        life: 0.5,
        maxLife: 0.5,
        type: 'ice',
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        )
      });
    }
  }

  public update(dt: number, elapsed: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.type === 'splash') {
        p.velocity.y -= 15 * dt;
      } else {
        p.velocity.y -= 4 * dt;
        p.mesh.rotation.x += p.angularVelocity.x * dt;
        p.mesh.rotation.y += p.angularVelocity.y * dt;
        p.mesh.rotation.z += p.angularVelocity.z * dt;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);

      const alpha = Math.max(0, p.life / p.maxLife);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha * (p.type === 'splash' ? 0.9 : 0.95);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.particles.splice(i, 1);
      }
    }

    for (const band of this.auroraBands) {
      const mat = band.mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = elapsed;

      band.mesh.position.y = Math.sin(elapsed * band.speed + band.phase) * 0.5;
      band.mesh.rotation.y = Math.sin(elapsed * band.speed * 0.5 + band.phase) * 0.05;
    }

    if (this.hoverHighlight.visible) {
      const mat = this.hoverHighlight.material as THREE.MeshBasicMaterial;
      const pulse = 0.25 + Math.sin(elapsed * 4) * 0.08;
      mat.opacity = pulse;
      const s = 1 + Math.sin(elapsed * 3) * 0.1;
      this.hoverHighlight.scale.setScalar(s);
    }
  }
}
