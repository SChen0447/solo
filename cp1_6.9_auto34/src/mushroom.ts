import * as THREE from 'three';

export interface MushroomMeshes {
  group: THREE.Group;
  cap: THREE.Mesh;
  stem: THREE.Mesh;
  glow: THREE.Mesh;
  hoverGlow: THREE.Mesh;
  capMat: THREE.ShaderMaterial;
  glowMat: THREE.MeshBasicMaterial;
  hoverGlowMat: THREE.MeshBasicMaterial;
}

export class Mushroom {
  public id: string;
  public position: THREE.Vector3;
  public color: THREE.Color;
  public capRadius: number;
  public capHeight: number;
  public stemHeight: number;
  public stemRadius: number = 0.03;

  public frequency: number;
  public phase: number;
  public targetFrequency: number;
  public freqTransitionProgress: number = 1;
  public freqTransitionDuration: number = 0.5;
  public initialFrequency: number = 0;

  public isDominant: boolean = false;
  public isGrowing: boolean = false;
  public growProgress: number = 1;
  public growDuration: number = 0.6;

  public burstProgress: number = 0;
  public isBursting: boolean = false;
  public burstDuration: number = 0.3;

  public hoverProgress: number = 0;
  public isHovered: boolean = false;

  public meshes: MushroomMeshes;
  public userData: Record<string, unknown> = {};

  private static idCounter: number = 0;

  constructor(
    position: THREE.Vector3,
    color: THREE.Color,
    capRadius: number = 0.35,
    capHeight: number = 0.2,
    stemHeight: number = 0.35
  ) {
    Mushroom.idCounter++;
    this.id = `mushroom_${Mushroom.idCounter}_${Date.now()}`;
    this.position = position.clone();
    this.color = color.clone();
    this.capRadius = capRadius;
    this.capHeight = capHeight;
    this.stemHeight = stemHeight;

    this.frequency = 0.8 + Math.random() * 0.7;
    this.phase = Math.random() * Math.PI * 2;
    this.targetFrequency = this.frequency;

    this.meshes = this.createMeshes();
    this.meshes.group.position.copy(position);
    this.meshes.group.userData.mushroom = this;
  }

  private createFresnelShader(): THREE.ShaderMaterial {
    const color = this.color;
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color.r, color.g, color.b) },
        uGlowIntensity: { value: 1.0 },
        uTime: { value: 0 },
        uPulse: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDirection = normalize(-mvPosition.xyz);
          vPosition = position;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uGlowIntensity;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDirection)), 2.5);
          float edgeGlow = fresnel * 1.5;

          vec3 baseColor = uColor * 0.6;
          vec3 glowColor = uColor;
          float pulseBoost = 1.0 + uPulse * 0.6;

          vec3 finalColor = mix(baseColor, glowColor, edgeGlow * 0.8 + 0.2) * pulseBoost;
          float alpha = 0.75 + edgeGlow * 0.25;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  public createMeshes(): MushroomMeshes {
    const group = new THREE.Group();

    const stemGeo = new THREE.CylinderGeometry(
      this.stemRadius * 0.7,
      this.stemRadius,
      this.stemHeight,
      12
    );
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = this.stemHeight / 2;
    group.add(stem);

    const capGeo = this.createCapGeometry(this.capRadius, this.capHeight);
    const capMat = this.createFresnelShader();
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = this.stemHeight + this.capHeight * 0.35;
    group.add(cap);

    const glowGeo = this.createCapGeometry(this.capRadius * 1.35, this.capHeight * 1.15);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(cap.position);
    group.add(glow);

    const hoverGeo = this.createCapGeometry(this.capRadius * 1.6, this.capHeight * 1.3);
    const hoverGlowMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    const hoverGlow = new THREE.Mesh(hoverGeo, hoverGlowMat);
    hoverGlow.position.copy(cap.position);
    group.add(hoverGlow);

    return { group, cap, stem, glow, hoverGlow, capMat, glowMat, hoverGlowMat };
  }

  private createCapGeometry(radius: number, height: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const scale = Math.max(0.05, y / radius);
      positions.setY(i, y * (height / radius) * (0.7 + scale * 0.3));
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  public startGrowth(): void {
    this.isGrowing = true;
    this.growProgress = 0;
    this.meshes.group.scale.set(0.01, 0.01, 0.01);
    this.meshes.group.position.y = this.position.y - 0.05;
  }

  public smoothTransitionToFrequency(targetFreq: number, duration: number = 0.5): void {
    this.initialFrequency = this.frequency;
    this.targetFrequency = targetFreq;
    this.freqTransitionProgress = 0;
    this.freqTransitionDuration = duration;
  }

  public triggerBurst(): void {
    this.isBursting = true;
    this.burstProgress = 0;
  }

  public setHover(active: boolean): void {
    this.isHovered = active;
  }

  public setDominant(dominant: boolean): void {
    this.isDominant = dominant;
    if (dominant) {
      this.meshes.glowMat.opacity = 0.5;
      this.meshes.glow.scale.setScalar(1.5);
    } else {
      this.meshes.glow.scale.setScalar(1);
    }
  }

  public updatePulse(deltaTime: number): void {
    if (this.freqTransitionProgress < 1) {
      this.freqTransitionProgress = Math.min(
        1,
        this.freqTransitionProgress + deltaTime / this.freqTransitionDuration
      );
      const t = this.easeInOutCubic(this.freqTransitionProgress);
      this.frequency = this.initialFrequency + (this.targetFrequency - this.initialFrequency) * t;
    }

    this.phase += this.frequency * deltaTime * Math.PI * 2;
    if (this.phase > Math.PI * 2) {
      this.phase -= Math.PI * 2;
    }

    const pulse = 0.5 + 0.5 * Math.sin(this.phase);

    let growScale = 1;
    if (this.isGrowing) {
      this.growProgress = Math.min(1, this.growProgress + deltaTime / this.growDuration);
      const t = this.easeOutBack(this.growProgress);
      growScale = t;
      this.meshes.group.position.y = this.position.y - 0.05 + 0.05 * t;
      if (this.growProgress >= 1) {
        this.isGrowing = false;
      }
    }

    let burstScale = 1;
    if (this.isBursting) {
      this.burstProgress = Math.min(1, this.burstProgress + deltaTime / this.burstDuration);
      if (this.burstProgress < 0.5) {
        burstScale = 1 + this.burstProgress * 2 * 0.5;
      } else {
        burstScale = 1.5 - (this.burstProgress - 0.5) * 2 * 0.5;
      }
      if (this.burstProgress >= 1) {
        this.isBursting = false;
      }
    }

    if (this.isHovered && this.hoverProgress < 1) {
      this.hoverProgress = Math.min(1, this.hoverProgress + deltaTime / 0.15);
    } else if (!this.isHovered && this.hoverProgress > 0) {
      this.hoverProgress = Math.max(0, this.hoverProgress - deltaTime / 0.15);
    }

    const baseScale = growScale * burstScale;
    const pulseScale = 1 + pulse * 0.15;

    this.meshes.cap.scale.setScalar(baseScale * pulseScale);
    this.meshes.glow.scale.setScalar(baseScale * pulseScale * (this.isDominant ? 1.5 : 1));
    this.meshes.hoverGlow.scale.setScalar(baseScale * pulseScale);

    this.meshes.capMat.uniforms.uPulse.value = pulse;
    this.meshes.capMat.uniforms.uTime.value += deltaTime;

    this.meshes.glowMat.opacity = (this.isDominant ? 0.45 : 0.22) * (0.7 + pulse * 0.3);
    this.meshes.hoverGlowMat.opacity = this.hoverProgress * 0.35;

    this.meshes.stem.scale.setY(growScale);
    this.meshes.stem.position.y = (this.stemHeight / 2) * growScale;
    this.meshes.stem.material.opacity = 0.6 + 0.25 * growScale;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
