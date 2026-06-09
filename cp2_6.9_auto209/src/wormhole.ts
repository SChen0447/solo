import * as THREE from 'three';

export interface WormholeConfig {
  startNode: { position: THREE.Vector3; color: THREE.Color };
  endNode: { position: THREE.Vector3; color: THREE.Color };
  distortionStrength: number;
  particleDensity: number;
  colorSaturation: number;
}

interface ParticleData {
  position: THREE.Vector3;
  t: number;
  speed: number;
  size: number;
  spiralOffset: number;
}

export class Wormhole {
  public config: WormholeConfig;
  public group: THREE.Group;
  private tube: THREE.Mesh | null = null;
  private tubeMaterial: THREE.MeshBasicMaterial | null = null;
  private particles: THREE.Points | null = null;
  private particleData: ParticleData[] = [];
  private curve: THREE.Curve<THREE.Vector3> | null = null;
  private tubeGeometry: THREE.TubeGeometry | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particleCount: number = 0;
  public highlighted: boolean = false;

  constructor(config: WormholeConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.init();
  }

  private init(): void {
    this.createCurve();
    this.createTube();
    this.createParticles();
  }

  private createCurve(): void {
    const { startNode, endNode, distortionStrength } = this.config;
    const start = startNode.position.clone();
    const end = endNode.position.clone();

    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 0.001) {
      dir.set(1, 0, 0);
    } else {
      dir.normalize();
    }

    const up = new THREE.Vector3(0, 1, 0);
    let tangent1 = new THREE.Vector3();
    if (Math.abs(dir.dot(up)) < 0.9) {
      tangent1.crossVectors(dir, up);
    } else {
      tangent1.crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    tangent1.normalize();
    const tangent2 = new THREE.Vector3().crossVectors(dir, tangent1).normalize();

    const offsetScale = distortionStrength * Math.max(len * 0.25, 0.5);
    const offset1 = tangent1.clone().multiplyScalar(offsetScale * (0.7 + Math.random() * 0.6));
    const offset2 = tangent2.clone().multiplyScalar(offsetScale * (0.7 + Math.random() * 0.6));

    const quarter = start.clone().lerp(end, 0.25).add(offset1);
    const threeQuarter = start.clone().lerp(end, 0.75).add(offset2);

    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    const bezier1 = new THREE.CubicBezierCurve3(
      start,
      start.clone().lerp(quarter, 0.5),
      quarter.clone().lerp(threeQuarter, 0.2),
      quarter
    );
    const bezier2 = new THREE.CubicBezierCurve3(
      quarter,
      quarter.clone().lerp(threeQuarter, 0.5),
      threeQuarter.clone().lerp(end, 0.5),
      threeQuarter
    );
    const bezier3 = new THREE.CubicBezierCurve3(
      threeQuarter,
      threeQuarter.clone().lerp(end, 0.6),
      end.clone().lerp(threeQuarter, 0.3),
      end
    );
    curvePath.add(bezier1);
    curvePath.add(bezier2);
    curvePath.add(bezier3);

    this.curve = curvePath;
  }

  private createTube(): void {
    if (!this.curve) return;

    this.tubeGeometry = new THREE.TubeGeometry(this.curve, 64, 0.08, 8, false);

    const colors = new Float32Array(this.tubeGeometry.attributes.position.count * 3);
    const vertexCount = this.tubeGeometry.attributes.position.count;

    for (let i = 0; i < vertexCount; i++) {
      const t = i / vertexCount;
      const color = new THREE.Color().lerpColors(
        this.config.startNode.color,
        this.config.endNode.color,
        t
      );
      this.applySaturation(color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.tubeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.tubeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    this.tube = new THREE.Mesh(this.tubeGeometry, this.tubeMaterial);
    this.tube.visible = true;
    this.group.add(this.tube);
  }

  private createParticles(): void {
    const baseCount = Math.floor(20 + Math.random() * 31);
    this.particleCount = Math.floor(baseCount * this.config.particleDensity);
    this.particleCount = Math.min(this.particleCount, 200);

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    this.particleData = [];

    for (let i = 0; i < this.particleCount; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const t = Math.random();
      const speed = (0.5 + Math.random() * 1.0) / 10;

      this.particleData.push({
        position: new THREE.Vector3(),
        t,
        speed,
        size,
        spiralOffset: Math.random() * Math.PI * 2
      });

      sizes[i] = size;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particles);
  }

  private applySaturation(color: THREE.Color): THREE.Color {
    const sat = this.config.colorSaturation;
    const gray = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    color.r = gray + (color.r - gray) * sat;
    color.g = gray + (color.g - gray) * sat;
    color.b = gray + (color.b - gray) * sat;
    color.r = Math.min(1, Math.max(0, color.r));
    color.g = Math.min(1, Math.max(0, color.g));
    color.b = Math.min(1, Math.max(0, color.b));
    return color;
  }

  public update(deltaTime: number, cameraParallax: number = 0): void {
    if (!this.curve || !this.particles || !this.particleGeometry) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const speedMultiplier = this.highlighted ? 2.0 : 1.0;

    for (let i = 0; i < this.particleData.length; i++) {
      const pd = this.particleData[i];
      pd.t += pd.speed * deltaTime * 60 * speedMultiplier;
      if (pd.t > 1) pd.t -= 1;

      const pathPos = new THREE.Vector3();
      this.curve.getPointAt(pd.t, pathPos);

      const tangent = new THREE.Vector3();
      this.curve.getTangentAt(pd.t, tangent);
      tangent.normalize();

      const perp = new THREE.Vector3(
        tangent.y * 1 - tangent.z * 0,
        tangent.z * 0 - tangent.x * 1,
        tangent.x * 0 - tangent.y * 0
      ).normalize();
      const perp2 = new THREE.Vector3().crossVectors(tangent, perp).normalize();

      const spiralAngle = pd.spiralOffset + pd.t * Math.PI * 2 * 2;
      const spiralRadius = 0.1;
      const spiralOffset = new THREE.Vector3()
        .addScaledVector(perp, Math.cos(spiralAngle) * spiralRadius)
        .addScaledVector(perp2, Math.sin(spiralAngle) * spiralRadius);

      const parallaxOffset = new THREE.Vector3(
        Math.sin(cameraParallax) * 0.05,
        Math.cos(cameraParallax) * 0.05,
        0
      );

      pd.position.copy(pathPos).add(spiralOffset).add(parallaxOffset);

      positions[i * 3] = pd.position.x;
      positions[i * 3 + 1] = pd.position.y;
      positions[i * 3 + 2] = pd.position.z;

      const gradientT = pd.t;
      const particleColor = new THREE.Color(0xffffff);
      const endColor = new THREE.Color().lerpColors(
        this.config.startNode.color,
        this.config.endNode.color,
        gradientT
      );
      this.applySaturation(endColor);
      particleColor.lerp(endColor, 0.6);

      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  public updateConfig(
    distortionStrength: number,
    particleDensity: number,
    colorSaturation: number
  ): void {
    const needsRebuildTube =
      this.config.distortionStrength !== distortionStrength;
    const needsRebuildParticles =
      this.config.particleDensity !== particleDensity;

    this.config.distortionStrength = distortionStrength;
    this.config.particleDensity = particleDensity;
    this.config.colorSaturation = colorSaturation;

    if (needsRebuildTube) {
      if (this.tube) {
        this.group.remove(this.tube);
        this.tubeGeometry?.dispose();
        this.tubeMaterial?.dispose();
      }
      this.createCurve();
      this.createTube();
    } else if (this.tube && this.tubeGeometry) {
      const colors = this.tubeGeometry.attributes.color.array as Float32Array;
      const vertexCount = this.tubeGeometry.attributes.position.count;
      for (let i = 0; i < vertexCount; i++) {
        const t = i / vertexCount;
        const color = new THREE.Color().lerpColors(
          this.config.startNode.color,
          this.config.endNode.color,
          t
        );
        this.applySaturation(color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      this.tubeGeometry.attributes.color.needsUpdate = true;
    }

    if (needsRebuildParticles) {
      if (this.particles) {
        this.group.remove(this.particles);
        this.particleGeometry?.dispose();
        this.particleMaterial?.dispose();
      }
      this.createParticles();
    }

    this.setHighlighted(this.highlighted);
  }

  public setHighlighted(highlighted: boolean): void {
    this.highlighted = highlighted;
    if (this.tubeMaterial) {
      this.tubeMaterial.opacity = highlighted ? 0.6 : 0.3;
    }
  }

  public dispose(): void {
    if (this.tube) {
      this.group.remove(this.tube);
      this.tubeGeometry?.dispose();
      this.tubeMaterial?.dispose();
    }
    if (this.particles) {
      this.group.remove(this.particles);
      this.particleGeometry?.dispose();
      this.particleMaterial?.dispose();
    }
    this.group.clear();
  }
}
