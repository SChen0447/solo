import * as THREE from 'three';

interface SpoolData {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  particles: THREE.Points;
  baseColor: THREE.Color;
  originalScale: number;
}

export class Loom {
  private group: THREE.Group;
  private spools: SpoolData[] = [];
  private hoveredSpool: THREE.Mesh | null = null;
  private frameGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.frameGroup = new THREE.Group();
    this.group.add(this.frameGroup);

    this.buildFrame();
    this.buildSpools();
  }

  private buildFrame(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const bronzeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd7f32,
      roughness: 0.4,
      metalness: 0.7
    });

    const frameWidth = 6;
    const frameHeight = 5;
    const frameDepth = 0.4;
    const beamThickness = 0.3;

    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, beamThickness, frameDepth),
      woodMaterial
    );
    topBeam.position.y = frameHeight / 2;
    topBeam.castShadow = true;
    topBeam.receiveShadow = true;
    this.frameGroup.add(topBeam);

    const bottomBeam = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, beamThickness, frameDepth),
      woodMaterial
    );
    bottomBeam.position.y = -frameHeight / 2;
    bottomBeam.castShadow = true;
    bottomBeam.receiveShadow = true;
    this.frameGroup.add(bottomBeam);

    const leftBeam = new THREE.Mesh(
      new THREE.BoxGeometry(beamThickness, frameHeight, frameDepth),
      woodMaterial
    );
    leftBeam.position.x = -frameWidth / 2;
    leftBeam.castShadow = true;
    leftBeam.receiveShadow = true;
    this.frameGroup.add(leftBeam);

    const rightBeam = new THREE.Mesh(
      new THREE.BoxGeometry(beamThickness, frameHeight, frameDepth),
      woodMaterial
    );
    rightBeam.position.x = frameWidth / 2;
    rightBeam.castShadow = true;
    rightBeam.receiveShadow = true;
    this.frameGroup.add(rightBeam);

    this.addCarvings();

    const cornerSize = 0.5;
    const corners = [
      { x: -frameWidth / 2, y: frameHeight / 2 },
      { x: frameWidth / 2, y: frameHeight / 2 },
      { x: -frameWidth / 2, y: -frameHeight / 2 },
      { x: frameWidth / 2, y: -frameHeight / 2 }
    ];

    corners.forEach((pos) => {
      const corner = new THREE.Mesh(
        new THREE.BoxGeometry(cornerSize, cornerSize, frameDepth + 0.1),
        bronzeMaterial
      );
      corner.position.set(pos.x, pos.y, 0.05);
      corner.castShadow = true;
      this.frameGroup.add(corner);
    });

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(frameWidth * 1.2, frameHeight * 1.2),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    shadowPlane.position.z = -0.5;
    shadowPlane.receiveShadow = true;
    this.frameGroup.add(shadowPlane);
  }

  private addCarvings(): void {
    const carvingMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4e0a,
      roughness: 0.8,
      metalness: 0.05
    });

    for (let i = 0; i < 5; i++) {
      const x = -2.5 + i * 1.25;
      const carving = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.03, 8, 16),
        carvingMaterial
      );
      carving.position.set(x, 2.3, 0.22);
      carving.rotation.x = Math.PI / 2;
      this.frameGroup.add(carving);
    }

    for (let i = 0; i < 4; i++) {
      const y = -1.5 + i * 1.2;
      const carving = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.025, 8, 16),
        carvingMaterial
      );
      carving.position.set(-2.8, y, 0.22);
      carving.rotation.y = Math.PI / 2;
      this.frameGroup.add(carving);
    }

    for (let i = 0; i < 4; i++) {
      const y = -1.5 + i * 1.2;
      const carving = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.025, 8, 16),
        carvingMaterial
      );
      carving.position.set(2.8, y, 0.22);
      carving.rotation.y = Math.PI / 2;
      this.frameGroup.add(carving);
    }
  }

  private buildSpools(): void {
    const spoolPositions = [
      { x: -2.5, y: 2, z: 0.5, color: new THREE.Color(0x66ccff) },
      { x: 2.5, y: 2, z: 0.5, color: new THREE.Color(0xff99cc) },
      { x: -2.5, y: -2, z: 0.5, color: new THREE.Color(0xffcc66) },
      { x: 2.5, y: -2, z: 0.5, color: new THREE.Color(0x99ffcc) }
    ];

    spoolPositions.forEach((pos, index) => {
      const spoolData = this.createSpool(pos.color, index);
      spoolData.mesh.position.set(pos.x, pos.y, pos.z);
      spoolData.glow.position.set(pos.x, pos.y, pos.z);
      spoolData.particles.position.set(pos.x, pos.y, pos.z);
      spoolData.originalScale = 1;

      this.spools.push(spoolData);
      this.group.add(spoolData.mesh);
      this.group.add(spoolData.glow);
      this.group.add(spoolData.particles);
    });
  }

  private createSpool(color: THREE.Color, index: number): SpoolData {
    const sphereGeometry = new THREE.SphereGeometry(0.35, 32, 32);

    const spoolMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
      emissive: color,
      emissiveIntensity: 0.3
    });

    const spoolMesh = new THREE.Mesh(sphereGeometry, spoolMaterial);
    spoolMesh.castShadow = true;
    spoolMesh.userData.isSpool = true;
    spoolMesh.userData.spoolIndex = index;
    spoolMesh.userData.spoolColor = color.clone();

    const glowGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.userData.isGlow = true;

    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.15 + Math.random() * 0.15;

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ));
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.03,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    (particles as any).velocities = velocities;

    return {
      mesh: spoolMesh,
      glow: glowMesh,
      particles: particles,
      baseColor: color.clone(),
      originalScale: 1
    };
  }

  public handleHover(raycaster: THREE.Raycaster): void {
    const spoolMeshes = this.spools.map((s) => s.mesh);
    const intersects = raycaster.intersectObjects(spoolMeshes);

    if (intersects.length > 0) {
      const hovered = intersects[0].object as THREE.Mesh;
      if (this.hoveredSpool !== hovered) {
        if (this.hoveredSpool) {
          this.setSpoolHover(this.hoveredSpool, false);
        }
        this.hoveredSpool = hovered;
        this.setSpoolHover(hovered, true);
      }
      document.body.style.cursor = 'pointer';
    } else {
      if (this.hoveredSpool) {
        this.setSpoolHover(this.hoveredSpool, false);
        this.hoveredSpool = null;
      }
      document.body.style.cursor = 'default';
    }
  }

  private setSpoolHover(spool: THREE.Mesh, isHovered: boolean): void {
    const spoolData = this.spools.find((s) => s.mesh === spool);
    if (!spoolData) return;

    const targetScale = isHovered ? 1.4 : 1;
    const targetEmissive = isHovered ? 0.6 : 0.3;

    const material = spoolData.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = targetEmissive;

    spoolData.glow.scale.setScalar(targetScale);
    const glowMat = spoolData.glow.material as THREE.MeshBasicMaterial;
    glowMat.opacity = isHovered ? 0.25 : 0.15;
  }

  public getHoveredSpool(): THREE.Mesh | null {
    return this.hoveredSpool;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public update(_delta: number, elapsed: number): void {
    this.spools.forEach((spool, index) => {
      const baseY = [2, 2, -2, -2][index];
      const floatOffset = Math.sin(elapsed * 0.8 + index * 1.5) * 0.08;

      spool.mesh.position.y = baseY + floatOffset;
      spool.glow.position.y = baseY + floatOffset;
      spool.particles.position.y = baseY + floatOffset;

      const baseX = [-2.5, 2.5, -2.5, 2.5][index];
      const floatX = Math.cos(elapsed * 0.6 + index * 2) * 0.04;
      spool.mesh.position.x = baseX + floatX;
      spool.glow.position.x = baseX + floatX;
      spool.particles.position.x = baseX + floatX;

      spool.mesh.rotation.y = elapsed * 0.3 + index;
      spool.glow.rotation.y = elapsed * 0.2 + index;

      const velocities = (spool.particles as any).velocities as THREE.Vector3[];
      const positions = spool.particles.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

        const dist = Math.sqrt(
          positions[i * 3] ** 2 +
          positions[i * 3 + 1] ** 2 +
          positions[i * 3 + 2] ** 2
        );

        if (dist > 0.3) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = 0.15 + Math.random() * 0.1;
          positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
          positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
          positions[i * 3 + 2] = Math.cos(phi) * r;

          velocities[i].set(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
          );
        }
      }
      spool.particles.geometry.attributes.position.needsUpdate = true;

      const pulse = 1 + Math.sin(elapsed * 2 + index) * 0.08;
      spool.mesh.scale.setScalar(pulse);

      const baseGlowScale = spool.mesh === this.hoveredSpool ? 1.4 : 1;
      spool.glow.scale.setScalar(baseGlowScale * pulse);
    });
  }

  public getSpoolColor(spool: THREE.Mesh): THREE.Color | null {
    const spoolData = this.spools.find((s) => s.mesh === spool);
    return spoolData ? spoolData.baseColor : null;
  }
}
