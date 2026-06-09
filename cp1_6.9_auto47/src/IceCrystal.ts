import * as THREE from 'three';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playIceCrackSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const duration = 0.1;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500 + Math.random() * 1500;
    filter.Q.value = 8 + Math.random() * 6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  } catch (e) {
    // ignore audio errors
  }
}

export class IceCrystal {
  public mesh: THREE.Group;
  public light: THREE.PointLight;
  public particles: THREE.Points | null = null;
  public haloMesh: THREE.Mesh | null = null;

  public position: THREE.Vector3;
  public hue: number;
  public color: THREE.Color;

  public isGrowing: boolean = false;
  public isGrown: boolean = false;
  public isHovered: boolean = false;

  private baseHeight: number;
  private targetHeight: number;
  private growthProgress: number = 0;
  private growthDuration: number = 2.0;

  private branches: THREE.Group[] = [];
  private targetBranches: number = 0;

  private resonancePhase: number = 0;
  private isResonating: boolean = false;
  private resonanceTimer: number = 0;
  private resonanceDuration: number = 0.5;
  private baseScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  private particleRotation: number = 0;

  private static prismGeometry: THREE.CylinderGeometry | null = null;
  private static branchGeometry: THREE.CylinderGeometry | null = null;
  private static leafGeometry: THREE.PlaneGeometry | null = null;

  private static getPrismGeometry(): THREE.CylinderGeometry {
    if (!IceCrystal.prismGeometry) {
      IceCrystal.prismGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    }
    return IceCrystal.prismGeometry;
  }

  private static getBranchGeometry(): THREE.CylinderGeometry {
    if (!IceCrystal.branchGeometry) {
      IceCrystal.branchGeometry = new THREE.CylinderGeometry(0.15, 0.08, 1, 5, 1);
    }
    return IceCrystal.branchGeometry;
  }

  private static getLeafGeometry(): THREE.PlaneGeometry {
    if (!IceCrystal.leafGeometry) {
      IceCrystal.leafGeometry = new THREE.PlaneGeometry(0.25, 0.35, 1, 1);
    }
    return IceCrystal.leafGeometry;
  }

  constructor(position: THREE.Vector3, hue: number) {
    this.position = position.clone();
    this.hue = hue;
    this.color = new THREE.Color().setHSL(hue, 0.8, 0.65);

    this.baseHeight = 0.05 + Math.random() * 0.05;
    this.targetHeight = 0.3 + Math.random() * 0.5;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.mesh.userData.crystal = this;

    const prismRadius = 0.05 + Math.random() * 0.05;
    const prismGeo = IceCrystal.getPrismGeometry();
    const prismMat = new THREE.MeshPhongMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
      shininess: 100,
      specular: 0xffffff,
      emissive: this.color,
      emissiveIntensity: 0.1,
      flatShading: true
    });

    const prism = new THREE.Mesh(prismGeo, prismMat);
    prism.scale.set(prismRadius, this.baseHeight, prismRadius);
    prism.position.y = this.baseHeight / 2;
    prism.name = 'prism';
    this.mesh.add(prism);

    const lightColor = new THREE.Color(0x88ccff);
    this.light = new THREE.PointLight(lightColor, 0, 0.5, 2);
    this.light.position.y = 0.02;
    this.mesh.add(this.light);

    this.baseScale.set(prismRadius, this.baseHeight, prismRadius);
  }

  public startGrowth(): void {
    if (this.isGrowing || this.isGrown) return;
    this.isGrowing = true;
    this.growthProgress = 0;
    this.targetBranches = 5 + Math.floor(Math.random() * 4);
    playIceCrackSound();

    setTimeout(() => {
      this.light.intensity = 0.3 + Math.random() * 0.2;
      this.light.distance = 0.5;
    }, 100);
  }

  public triggerResonance(): void {
    this.isResonating = true;
    this.resonanceTimer = 0;
    this.resonancePhase = 0;
  }

  public updateHover(state: boolean): void {
    if (this.isHovered === state) return;
    this.isHovered = state;

    if (state && !this.particles) {
      this.createParticles();
      this.createHalo();
    } else if (!state && this.particles) {
      this.mesh.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;

      if (this.haloMesh) {
        this.mesh.remove(this.haloMesh);
        this.haloMesh.geometry.dispose();
        (this.haloMesh.material as THREE.Material).dispose();
        this.haloMesh = null;
      }
    }
  }

  private createParticles(): void {
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.2;
      const y = 0.05 + (Math.random() - 0.5) * 0.1;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      colors[i * 3] = this.color.r;
      colors[i * 3 + 1] = this.color.g;
      colors[i * 3 + 2] = this.color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.mesh.add(this.particles);
  }

  private createHalo(): void {
    const geometry = new THREE.RingGeometry(0.08, 0.3, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.haloMesh = new THREE.Mesh(geometry, material);
    this.haloMesh.rotation.x = -Math.PI / 2;
    this.haloMesh.position.y = 0.01;
    this.mesh.add(this.haloMesh);
  }

  private createBranches(): void {
    if (this.branches.length > 0) return;

    const prism = this.mesh.getObjectByName('prism') as THREE.Mesh;
    if (!prism) return;

    const currentHeight = (prism.scale as THREE.Vector3).y;

    for (let i = 0; i < this.targetBranches; i++) {
      const branchGroup = new THREE.Group();
      const angle = (i / this.targetBranches) * Math.PI * 2 + Math.random() * 0.3;
      const heightRatio = 0.35 + Math.random() * 0.45;
      const branchLength = 0.1 + Math.random() * 0.12;
      const tiltAngle = 0.3 + Math.random() * 0.4;

      const branchMat = new THREE.MeshPhongMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.7,
        shininess: 100,
        specular: 0xffffff,
        emissive: this.color,
        emissiveIntensity: 0.15,
        flatShading: true
      });

      const branch = new THREE.Mesh(IceCrystal.getBranchGeometry(), branchMat);
      branch.scale.y = branchLength;
      branch.position.y = branchLength / 2;

      const leafMat = new THREE.MeshPhongMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.65,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide,
        emissive: this.color,
        emissiveIntensity: 0.2
      });

      const leaf = new THREE.Mesh(IceCrystal.getLeafGeometry(), leafMat);
      leaf.position.y = branchLength + 0.05;
      leaf.rotation.y = Math.random() * Math.PI;

      branchGroup.add(branch);
      branchGroup.add(leaf);

      branchGroup.position.y = currentHeight * heightRatio;
      branchGroup.rotation.y = angle;
      branchGroup.rotation.z = -tiltAngle;
      branchGroup.position.x = Math.cos(angle) * 0.03;
      branchGroup.position.z = Math.sin(angle) * 0.03;

      this.mesh.add(branchGroup);
      this.branches.push(branchGroup);
    }
  }

  public update(delta: number): void {
    if (this.isGrowing && !this.isGrown) {
      this.growthProgress += delta / this.growthDuration;
      if (this.growthProgress >= 1) {
        this.growthProgress = 1;
        this.isGrowing = false;
        this.isGrown = true;
      }

      const t = this.growthProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const prism = this.mesh.getObjectByName('prism') as THREE.Mesh;
      if (prism) {
        const newHeight = this.baseHeight + (this.targetHeight - this.baseHeight) * easeT;
        (prism.scale as THREE.Vector3).y = newHeight;
        prism.position.y = newHeight / 2;
      }

      if (this.growthProgress > 0.5 && this.branches.length === 0) {
        this.createBranches();
      }
    }

    if (this.isResonating) {
      this.resonanceTimer += delta;
      this.resonancePhase += delta * Math.PI * 2 * 6;

      if (this.resonanceTimer >= this.resonanceDuration) {
        this.isResonating = false;
        this.resonanceTimer = 0;
        this.resonancePhase = 0;

        const prism = this.mesh.getObjectByName('prism') as THREE.Mesh;
        if (prism) {
          prism.scale.x = this.baseScale.x;
          prism.scale.z = this.baseScale.z;
        }
        this.branches.forEach(b => {
          b.scale.set(1, 1, 1);
        });
      } else {
        const pulseAmount = 0.1 * Math.sin(this.resonancePhase) * (1 - this.resonanceTimer / this.resonanceDuration);
        const prism = this.mesh.getObjectByName('prism') as THREE.Mesh;
        if (prism) {
          prism.scale.x = this.baseScale.x * (1 + pulseAmount);
          prism.scale.z = this.baseScale.z * (1 + pulseAmount);
        }
        this.branches.forEach(b => {
          b.scale.setScalar(1 + pulseAmount * 0.8);
        });
      }
    }

    if (this.isHovered && this.particles) {
      this.particleRotation += 0.01;
      this.particles.rotation.y = this.particleRotation;

      if (this.haloMesh) {
        const pulse = 0.9 + 0.1 * Math.sin(this.particleRotation * 3);
        this.haloMesh.scale.setScalar(pulse);
      }
    }
  }

  public dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry && obj.geometry !== IceCrystal.prismGeometry &&
            obj.geometry !== IceCrystal.branchGeometry && obj.geometry !== IceCrystal.leafGeometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
  }
}
