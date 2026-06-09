import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { LavaLampParameters, HSLColor } from './Parameters';
import { vertexShader, fragmentShader } from './shaders';

interface FluidBlob {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  velocity: THREE.Vector3;
  radius: number;
  baseRadius: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  colorBlendFactor: number;
  isBlending: boolean;
  blendStartTime: number;
}

interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  radius: number;
  createdAt: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  createdAt: number;
  lifetime: number;
}

interface GlowEffect {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  createdAt: number;
  lifetime: number;
  maxRadius: number;
}

export class LavaLamp {
  private scene: THREE.Scene;
  private parameters: LavaLampParameters;

  private container: THREE.Group;
  private glassMesh!: THREE.Mesh;
  private liquidMesh!: THREE.Mesh;

  private blobs: FluidBlob[] = [];
  private bubbles: Bubble[] = [];
  private burstParticles: BurstParticle[] = [];
  private glowEffects: GlowEffect[] = [];

  private simplex: SimplexNoise;
  private time: number = 0;
  private lastBubbleTime: number = 0;

  private readonly LAMP_RADIUS = 3;
  private readonly LAMP_HEIGHT = 8;
  private readonly MAX_BLOBS = 120;
  private readonly MIN_BLOBS = 80;
  private readonly MAX_BUBBLES = 20;
  private readonly BURST_LIFETIME = 0.5;
  private readonly COLOR_BLEND_DURATION = 0.3;

  private blobGeometry: THREE.IcosahedronGeometry;

  private spotLight!: THREE.SpotLight;
  private spotLightTarget!: THREE.Object3D;

  private _onBlobSelected?: (hsl: HSLColor) => void;
  private raycaster = new THREE.Raycaster();

  constructor(scene: THREE.Scene, parameters: LavaLampParameters) {
    this.scene = scene;
    this.parameters = parameters;
    this.container = new THREE.Group();
    this.scene.add(this.container);
    this.blobGeometry = new THREE.IcosahedronGeometry(1, 3);
    this.simplex = new SimplexNoise();
    this.init();
  }

  private init(): void {
    this.createGlassContainer();
    this.createLiquid();
    this.createLighting();
    this.createInitialBlobs();
  }

  private createGlassContainer(): void {
    const glassGeo = new THREE.CylinderGeometry(
      this.LAMP_RADIUS, this.LAMP_RADIUS * 0.95, this.LAMP_HEIGHT, 48, 1, true
    );
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.5,
      side: THREE.DoubleSide
    });
    this.glassMesh = new THREE.Mesh(glassGeo, glassMat);
    this.glassMesh.position.y = 0;
    this.container.add(this.glassMesh);

    const topGeo = new THREE.CircleGeometry(this.LAMP_RADIUS * 0.95, 48);
    const topMat = new THREE.MeshPhysicalMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.5
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = this.LAMP_HEIGHT / 2;
    this.container.add(top);

    const bottomGeo = new THREE.CircleGeometry(this.LAMP_RADIUS, 48);
    const bottomMat = new THREE.MeshPhysicalMaterial({
      color: 0x222233,
      roughness: 0.4,
      metalness: 0.6
    });
    const bottom = new THREE.Mesh(bottomGeo, bottomMat);
    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -this.LAMP_HEIGHT / 2;
    this.container.add(bottom);
  }

  private createLiquid(): void {
    const liquidGeo = new THREE.CylinderGeometry(
      this.LAMP_RADIUS - 0.1, (this.LAMP_RADIUS - 0.1) * 0.95,
      this.LAMP_HEIGHT - 0.4, 48
    );
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#80d0d0'),
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.05,
      transmission: 0.6
    });
    this.liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    this.liquidMesh.position.y = -0.1;
    this.container.add(this.liquidMesh);
  }

  private createLighting(): void {
    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0, 0);
    this.container.add(this.spotLightTarget);

    this.spotLight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 5, 0.4, 1);
    this.updateLightPosition();
    this.spotLight.target = this.spotLightTarget;
    this.container.add(this.spotLight);

    const ambient = new THREE.AmbientLight(0x404050, 0.6);
    this.container.add(ambient);

    const fillLight = new THREE.PointLight(0x6688ff, 0.4, 20);
    fillLight.position.set(-5, 2, 5);
    this.container.add(fillLight);

    const bottomGlow = new THREE.PointLight(0xff6600, 0.8, 8);
    bottomGlow.position.set(0, -this.LAMP_HEIGHT / 2 + 0.5, 0);
    this.container.add(bottomGlow);
  }

  private updateLightPosition(): void {
    const angleRad = (this.parameters.lightAngle * Math.PI) / 180;
    const radius = 10;
    this.spotLight.position.set(
      Math.cos(angleRad) * radius,
      5 + Math.sin(angleRad * 0.5) * 3,
      Math.sin(angleRad) * radius
    );
  }

  private createInitialBlobs(): void {
    const count = this.MIN_BLOBS + Math.floor(Math.random() * (this.MAX_BLOBS - this.MIN_BLOBS + 1));
    for (let i = 0; i < count; i++) {
      this.createBlob();
    }
  }

  private createBlob(position?: THREE.Vector3, radius?: number, color?: THREE.Color): FluidBlob {
    const r = radius ?? (0.5 + Math.random() * 1.0);

    const colorStart = new THREE.Color('#ff5500');
    const colorEnd = new THREE.Color('#ffcc00');
    const t = Math.random();
    const blobColor = color ?? colorStart.clone().lerp(colorEnd, t);

    const uniforms = {
      uTime: { value: 0 },
      uNoiseScale: { value: 1.2 },
      uNoiseStrength: { value: 0.18 },
      uTemperature: { value: this.parameters.temperature },
      uColor: { value: new THREE.Color(blobColor) },
      uColorTarget: { value: new THREE.Color(blobColor) },
      uBlendFactor: { value: 0 },
      uGlowIntensity: { value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(this.blobGeometry, material);
    mesh.scale.setScalar(r);

    if (position) {
      mesh.position.copy(position);
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.LAMP_RADIUS - r - 0.3);
      mesh.position.set(
        Math.cos(angle) * dist,
        -this.LAMP_HEIGHT / 2 + 1 + Math.random() * (this.LAMP_HEIGHT - 2),
        Math.sin(angle) * dist
      );
    }

    this.container.add(mesh);

    const blob: FluidBlob = {
      mesh,
      material,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.3) * 0.5,
        (Math.random() - 0.5) * 0.3
      ),
      radius: r,
      baseRadius: r,
      color: blobColor.clone(),
      targetColor: blobColor.clone(),
      colorBlendFactor: 0,
      isBlending: false,
      blendStartTime: 0
    };

    this.blobs.push(blob);
    return blob;
  }

  private createBubble(): void {
    if (this.bubbles.length >= this.MAX_BUBBLES) {
      const oldest = this.bubbles.shift();
      if (oldest) {
        this.container.remove(oldest.mesh);
      }
    }

    const radius = 0.1 + Math.random() * 0.2;
    const colorStart = new THREE.Color('#ffffff');
    const colorEnd = new THREE.Color('#ffffaa');
    const bubbleColor = colorStart.clone().lerp(colorEnd, Math.random());

    const geo = new THREE.SphereGeometry(radius, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: bubbleColor,
      transparent: true,
      opacity: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.LAMP_RADIUS - radius - 0.5);
    mesh.position.set(
      Math.cos(angle) * dist,
      -this.LAMP_HEIGHT / 2 + 0.3,
      Math.sin(angle) * dist
    );

    this.container.add(mesh);

    this.bubbles.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        0.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 0.2
      ),
      radius,
      createdAt: this.time
    });
  }

  private createBurstParticles(position: THREE.Vector3, color: THREE.Color): void {
    const count = 5 + Math.floor(Math.random() * 4);
    const size = 0.05;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.8 + Math.random() * 0.8;

      this.container.add(mesh);
      this.burstParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed * 0.5,
          Math.cos(phi) * speed
        ),
        createdAt: this.time,
        lifetime: this.BURST_LIFETIME
      });
    }
  }

  private createGlowEffect(position: THREE.Vector3, color: THREE.Color, radius: number, lifetime: number): void {
    const geo = new THREE.SphereGeometry(0.1, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.container.add(mesh);

    this.glowEffects.push({
      mesh,
      material: mat,
      createdAt: this.time,
      lifetime,
      maxRadius: radius
    });
  }

  public update(delta: number): void {
    this.time += delta;
    this.updateLightPosition();

    this.updateBlobs(delta);
    this.checkBlobCollisions();
    this.updateBubbles(delta);
    this.updateBurstParticles(delta);
    this.updateGlowEffects(delta);

    if (this.parameters.temperature > 50) {
      const rate = 1 + (this.parameters.temperature - 50) / 15;
      const interval = 1 / rate;
      if (this.time - this.lastBubbleTime > interval) {
        this.createBubble();
        this.lastBubbleTime = this.time;
      }
    }

    this.trySplitOrMerge();
  }

  private updateBlobs(delta: number): void {
    const baseRiseSpeed = 0.3 + ((this.parameters.temperature - 20) / 10) * 0.15;

    for (const blob of this.blobs) {
      const pos = blob.mesh.position;

      const noisePos = new THREE.Vector3(
        pos.x * 0.4 + this.time * 0.1,
        pos.y * 0.4,
        pos.z * 0.4 + this.time * 0.15
      );
      const noiseX = this.simplex.noise3D(noisePos.x, noisePos.y, noisePos.z);
      const noiseY = this.simplex.noise3D(noisePos.x + 100, noisePos.y + 100, noisePos.z + 100);
      const noiseZ = this.simplex.noise3D(noisePos.x + 200, noisePos.y + 200, noisePos.z + 200);

      blob.velocity.x += noiseX * 0.3 * delta;
      blob.velocity.y += (noiseY * 0.2 + baseRiseSpeed * 0.3) * delta;
      blob.velocity.z += noiseZ * 0.3 * delta;

      blob.velocity.y += baseRiseSpeed * 0.05 * delta;

      const buoyancy = (pos.y + this.LAMP_HEIGHT / 2) / this.LAMP_HEIGHT;
      blob.velocity.y += (0.5 - buoyancy) * baseRiseSpeed * 0.2 * delta;

      const damping = 0.97;
      blob.velocity.multiplyScalar(damping);

      const maxSpeed = baseRiseSpeed * 2;
      if (blob.velocity.length() > maxSpeed) {
        blob.velocity.setLength(maxSpeed);
      }

      pos.add(blob.velocity.clone().multiplyScalar(delta));

      const topLimit = this.LAMP_HEIGHT / 2 - blob.radius - 0.3;
      const bottomLimit = -this.LAMP_HEIGHT / 2 + blob.radius + 0.3;
      if (pos.y > topLimit) {
        pos.y = topLimit;
        blob.velocity.y *= -0.5;
      }
      if (pos.y < bottomLimit) {
        pos.y = bottomLimit;
        blob.velocity.y = Math.abs(blob.velocity.y) * 0.5;
      }

      const horizontalDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const maxHorizontalDist = this.LAMP_RADIUS - blob.radius - 0.3;
      if (horizontalDist > maxHorizontalDist) {
        const norm = maxHorizontalDist / horizontalDist;
        pos.x *= norm;
        pos.z *= norm;
        const perpX = -pos.z;
        const perpZ = pos.x;
        const len = Math.sqrt(perpX * perpX + perpZ * perpZ);
        blob.velocity.x = (perpX / len) * Math.abs(blob.velocity.x) * 0.5;
        blob.velocity.z = (perpZ / len) * Math.abs(blob.velocity.z) * 0.5;
      }

      blob.material.uniforms.uTime.value = this.time;
      blob.material.uniforms.uTemperature.value = this.parameters.temperature;

      if (blob.isBlending) {
        const elapsed = this.time - blob.blendStartTime;
        blob.colorBlendFactor = Math.min(elapsed / this.COLOR_BLEND_DURATION, 1);
        blob.material.uniforms.uBlendFactor.value = blob.colorBlendFactor;
        if (blob.colorBlendFactor >= 1) {
          blob.color.copy(blob.targetColor);
          blob.material.uniforms.uColor.value.copy(blob.targetColor);
          blob.isBlending = false;
          blob.colorBlendFactor = 0;
          blob.material.uniforms.uBlendFactor.value = 0;
        }
      }

      const pulse = 1 + Math.sin(this.time * 1.5 + pos.x * 0.5 + pos.z * 0.5) * 0.05;
      blob.mesh.scale.setScalar(blob.radius * pulse);
    }
  }

  private checkBlobCollisions(): void {
    const collidedPairs: Set<string> = new Set();
    const collisionEvents: { a: FluidBlob; b: FluidBlob; point: THREE.Vector3 }[] = [];

    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        const a = this.blobs[i];
        const b = this.blobs[j];
        const dist = a.mesh.position.distanceTo(b.mesh.position);
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          const collisionPoint = a.mesh.position.clone().lerp(b.mesh.position, 0.5);
          collisionEvents.push({ a, b, point: collisionPoint });
          collidedPairs.add(`${i}-${j}`);

          const overlap = (minDist - dist) / 2;
          const dirA = a.mesh.position.clone().sub(b.mesh.position).normalize();
          a.mesh.position.add(dirA.clone().multiplyScalar(overlap));
          b.mesh.position.add(dirA.clone().multiplyScalar(-overlap));

          const relVel = a.velocity.clone().sub(b.velocity);
          const velAlongNormal = relVel.dot(dirA);
          if (velAlongNormal > 0) {
            const restitution = 0.3;
            const impulse = (-(1 + restitution) * velAlongNormal) / 2;
            a.velocity.add(dirA.clone().multiplyScalar(impulse));
            b.velocity.add(dirA.clone().multiplyScalar(-impulse));
          }
        }
      }
    }

    const processedBlobs: Set<number> = new Set();
    for (let i = 0; i < this.blobs.length; i++) {
      if (processedBlobs.has(i)) continue;

      const cluster: number[] = [i];
      processedBlobs.add(i);

      for (let j = i + 1; j < this.blobs.length; j++) {
        if (processedBlobs.has(j)) continue;
        let inCluster = false;
        for (const idx of cluster) {
          const dist = this.blobs[idx].mesh.position.distanceTo(this.blobs[j].mesh.position);
          if (dist < 1) {
            inCluster = true;
            break;
          }
        }
        if (inCluster) {
          cluster.push(j);
          processedBlobs.add(j);
        }
      }

      if (cluster.length >= 3) {
        let center = new THREE.Vector3();
        let mixedColor = new THREE.Color(0, 0, 0);
        for (const idx of cluster) {
          center.add(this.blobs[idx].mesh.position);
          mixedColor.r += this.blobs[idx].color.r;
          mixedColor.g += this.blobs[idx].color.g;
          mixedColor.b += this.blobs[idx].color.b;
        }
        center.divideScalar(cluster.length);
        mixedColor.r /= cluster.length;
        mixedColor.g /= cluster.length;
        mixedColor.b /= cluster.length;

        this.createGlowEffect(center, mixedColor, 1.5, 0.5);

        for (const idx of cluster) {
          this.startBlendColor(this.blobs[idx], mixedColor);
        }
      }
    }

    for (const event of collisionEvents) {
      if (!event.a.isBlending || !event.b.isBlending) {
        const blendedColor = new THREE.Color(
          (event.a.color.r + event.b.color.r) / 2,
          (event.a.color.g + event.b.color.g) / 2,
          (event.a.color.b + event.b.color.b) / 2
        );

        this.createGlowEffect(event.point, blendedColor, 1, 0.1);

        if (!event.a.isBlending) this.startBlendColor(event.a, blendedColor);
        if (!event.b.isBlending) this.startBlendColor(event.b, blendedColor);
      }
    }
  }

  private startBlendColor(blob: FluidBlob, targetColor: THREE.Color): void {
    blob.material.uniforms.uColor.value.copy(blob.color);
    blob.material.uniforms.uColorTarget.value.copy(targetColor);
    blob.targetColor.copy(targetColor);
    blob.isBlending = true;
    blob.blendStartTime = this.time;
    blob.colorBlendFactor = 0;
    blob.material.uniforms.uBlendFactor.value = 0;
  }

  private trySplitOrMerge(): void {
    const splitProbability = (11 - this.parameters.viscosity) / 200;
    const mergeProbability = this.parameters.viscosity / 400;

    if (Math.random() < splitProbability && this.blobs.length < this.MAX_BLOBS) {
      const largeBlobs = this.blobs.filter(b => b.radius > 1.0);
      if (largeBlobs.length > 0) {
        const blob = largeBlobs[Math.floor(Math.random() * largeBlobs.length)];
        const newRadius = blob.radius * 0.6;
        blob.radius = newRadius;

        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        );
        this.createBlob(
          blob.mesh.position.clone().add(offset),
          newRadius,
          blob.color.clone()
        );
      }
    }

    if (Math.random() < mergeProbability && this.blobs.length > this.MIN_BLOBS) {
      for (let i = 0; i < this.blobs.length; i++) {
        for (let j = i + 1; j < this.blobs.length; j++) {
          const a = this.blobs[i];
          const b = this.blobs[j];
          const dist = a.mesh.position.distanceTo(b.mesh.position);
          if (dist < (a.radius + b.radius) * 1.1 && a.radius < 1.0 && b.radius < 1.0) {
            const mergedColor = new THREE.Color(
              (a.color.r + b.color.r) / 2,
              (a.color.g + b.color.g) / 2,
              (a.color.b + b.color.b) / 2
            );
            a.radius = Math.min(a.radius + b.radius * 0.5, 1.5);
            a.color.copy(mergedColor);
            a.material.uniforms.uColor.value.copy(mergedColor);
            this.container.remove(b.mesh);
            this.blobs.splice(j, 1);
            return;
          }
        }
      }
    }
  }

  private updateBubbles(delta: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      const pos = bubble.mesh.position;

      const noiseX = this.simplex.noise3D(pos.x * 2 + this.time, pos.y * 2, pos.z * 2);
      const noiseZ = this.simplex.noise3D(pos.x * 2 + 50, pos.y * 2, pos.z * 2 + 50);
      bubble.velocity.x += noiseX * 0.5 * delta;
      bubble.velocity.z += noiseZ * 0.5 * delta;

      pos.add(bubble.velocity.clone().multiplyScalar(delta));

      for (const blob of this.blobs) {
        const dist = pos.distanceTo(blob.mesh.position);
        const minDist = bubble.radius + blob.radius;
        if (dist < minDist) {
          const pushDir = pos.clone().sub(blob.mesh.position).normalize();
          const overlap = minDist - dist;
          pos.add(pushDir.multiplyScalar(overlap + 0.05));
          bubble.velocity.x += pushDir.x * 0.5;
          bubble.velocity.y = Math.max(bubble.velocity.y * 0.5, 0.3);
          bubble.velocity.z += pushDir.z * 0.5;
        }
      }

      const horizontalDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const maxHDist = this.LAMP_RADIUS - bubble.radius - 0.3;
      if (horizontalDist > maxHDist) {
        const norm = maxHDist / horizontalDist;
        pos.x *= norm;
        pos.z *= norm;
      }

      if (pos.y > this.LAMP_HEIGHT / 2 - 0.5) {
        const bubbleColor = (bubble.mesh.material as THREE.MeshBasicMaterial).color;
        this.createBurstParticles(pos.clone(), bubbleColor);
        this.container.remove(bubble.mesh);
        this.bubbles.splice(i, 1);
        continue;
      }

      bubble.velocity.multiplyScalar(0.98);
      bubble.velocity.y = Math.min(bubble.velocity.y + 0.1 * delta, 2);
    }
  }

  private updateBurstParticles(delta: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      const elapsed = this.time - p.createdAt;

      if (elapsed >= p.lifetime) {
        this.container.remove(p.mesh);
        this.burstParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.95);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - elapsed / p.lifetime);
    }
  }

  private updateGlowEffects(delta: number): void {
    for (let i = this.glowEffects.length - 1; i >= 0; i--) {
      const g = this.glowEffects[i];
      const elapsed = this.time - g.createdAt;

      if (elapsed >= g.lifetime) {
        this.container.remove(g.mesh);
        this.glowEffects.splice(i, 1);
        continue;
      }

      const t = elapsed / g.lifetime;
      const currentRadius = g.maxRadius * t;
      g.mesh.scale.setScalar(currentRadius * 10);
      g.material.opacity = 0.8 * (1 - t);
    }
  }

  public handleClick(ray: THREE.Ray): HSLColor | null {
    this.raycaster.set(ray.origin, ray.direction);
    const meshes = this.blobs.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const blob = this.blobs.find(b => b.mesh === hitMesh);
      if (blob) {
        const hsl = { h: 0, s: 0, l: 0 };
        blob.color.getHSL(hsl);
        return {
          h: Math.round(hsl.h * 360),
          s: Math.round(hsl.s * 100),
          l: Math.round(hsl.l * 100)
        };
      }
    }
    return null;
  }

  public getBlobCount(): number {
    return this.blobs.length;
  }

  public getBubbleCount(): number {
    return this.bubbles.length;
  }

  public setParameters(params: LavaLampParameters): void {
    this.parameters = { ...params };
  }

  public dispose(): void {
    for (const blob of this.blobs) {
      this.container.remove(blob.mesh);
      blob.material.dispose();
    }
    for (const bubble of this.bubbles) {
      this.container.remove(bubble.mesh);
      (bubble.mesh.material as THREE.Material).dispose();
      bubble.mesh.geometry.dispose();
    }
    for (const p of this.burstParticles) {
      this.container.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
      p.mesh.geometry.dispose();
    }
    for (const g of this.glowEffects) {
      this.container.remove(g.mesh);
      g.material.dispose();
      g.mesh.geometry.dispose();
    }
    this.blobGeometry.dispose();
    this.scene.remove(this.container);
  }
}
