import * as THREE from 'three';
import { Particles } from './Particles';

export enum CellPhase {
  INTERPHASE = 0,
  PROPHASE = 1,
  METAPHASE = 2,
  ANAPHASE = 3,
  TELOPHASE = 4
}

export class Cell {
  public group: THREE.Group;
  private cellRadius: number = 1;
  private currentProgress: number = 0;
  private currentPhase: CellPhase = CellPhase.INTERPHASE;

  private membrane!: THREE.Mesh;
  private membraneWireframe!: THREE.LineSegments;
  private nucleus!: THREE.Mesh;
  private nucleusMembrane!: THREE.Mesh;
  private chromosomes: THREE.Group;
  private cytoplasmParticles!: THREE.Points;
  private spindleFibers!: THREE.LineSegments;
  private microtubuleParticles!: Particles;

  private chromosomeCount: number = 8;
  private chromosomeMeshes: THREE.Mesh[] = [];
  private chromosomeTargetPositions: THREE.Vector3[] = [];
  private spindlePolePositions: THREE.Vector3[] = [
    new THREE.Vector3(0, 0.8, 0),
    new THREE.Vector3(0, -0.8, 0)
  ];

  private daughterCells: THREE.Group[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.chromosomes = new THREE.Group();

    this.createMembrane();
    this.createNucleus();
    this.createChromosomes();
    this.createCytoplasmParticles();
    this.createSpindleFibers();
    this.createMicrotubuleParticles();
    this.createDaughterCells();

    this.group.add(this.membrane);
    this.group.add(this.membraneWireframe);
    this.group.add(this.nucleus);
    this.group.add(this.nucleusMembrane);
    this.group.add(this.chromosomes);
    this.group.add(this.cytoplasmParticles);
    this.group.add(this.spindleFibers);
    this.group.add(this.microtubuleParticles.mesh);

    this.updatePhase(0);
  }

  private createMembrane(): void {
    const geometry = new THREE.SphereGeometry(this.cellRadius, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 0.1
    });
    this.membrane = new THREE.Mesh(geometry, material);

    const wireframeGeometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(this.cellRadius * 1.001, 32, 16));
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.2
    });
    this.membraneWireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
  }

  private createNucleus(): void {
    const nucleusRadius = this.cellRadius * 0.5;
    const geometry = new THREE.SphereGeometry(nucleusRadius, 48, 48);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x90caf9,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      roughness: 0.3,
      transmission: 0.5
    });
    this.nucleus = new THREE.Mesh(geometry, material);

    const membraneGeometry = new THREE.SphereGeometry(nucleusRadius * 1.02, 48, 48);
    const membraneMaterial = new THREE.MeshBasicMaterial({
      color: 0x64b5f6,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      wireframe: false
    });
    this.nucleusMembrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
  }

  private createChromosomes(): void {
    const nucleusRadius = this.cellRadius * 0.5;

    for (let i = 0; i < this.chromosomeCount; i++) {
      const angle = (i / this.chromosomeCount) * Math.PI * 2;
      const radius = nucleusRadius * 0.5;

      const chromosomeGroup = new THREE.Group();

      const chromatinGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
      const chromatinMaterial = new THREE.MeshBasicMaterial({
        color: 0x7b1fa2,
        transparent: true,
        opacity: 0.8
      });

      for (let j = 0; j < 5; j++) {
        const strand = new THREE.Mesh(chromatinGeometry, chromatinMaterial);
        strand.rotation.z = (Math.random() - 0.5) * 0.5;
        strand.position.x = (Math.random() - 0.5) * 0.1;
        strand.position.y = (Math.random() - 0.5) * 0.1;
        strand.position.z = (Math.random() - 0.5) * 0.1;
        chromosomeGroup.add(strand);
      }

      const condensedGeometry = new THREE.CapsuleGeometry(0.04, 0.2, 8, 16);
      const condensedMaterial = new THREE.MeshBasicMaterial({
        color: 0x9c27b0,
        transparent: true,
        opacity: 0
      });
      const condensedChromosome = new THREE.Mesh(condensedGeometry, condensedMaterial);
      condensedChromosome.visible = false;
      chromosomeGroup.add(condensedChromosome);

      chromosomeGroup.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * radius * 0.5,
        Math.sin(angle) * radius
      );
      chromosomeGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.chromosomes.add(chromosomeGroup);
      this.chromosomeMeshes.push(condensedChromosome);
      this.chromosomeTargetPositions.push(new THREE.Vector3());
    }
  }

  private createCytoplasmParticles(): void {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = (this.cellRadius * 0.9) * Math.cbrt(Math.random());

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.5, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    this.cytoplasmParticles = new THREE.Points(geometry, material);
  }

  private createSpindleFibers(): void {
    const fiberCount = 16;
    const positions = new Float32Array(fiberCount * 2 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });

    this.spindleFibers = new THREE.LineSegments(geometry, material);
  }

  private createMicrotubuleParticles(): void {
    this.microtubuleParticles = new Particles(this.cellRadius);
  }

  private createDaughterCells(): void {
    for (let i = 0; i < 2; i++) {
      const daughterCell = new THREE.Group();

      const membraneGeo = new THREE.SphereGeometry(this.cellRadius * 0.6, 48, 48);
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        roughness: 0.1,
        transmission: 0.6
      });
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      daughterCell.add(membrane);

      const nucleusGeo = new THREE.SphereGeometry(this.cellRadius * 0.3, 32, 32);
      const nucleusMat = new THREE.MeshPhysicalMaterial({
        color: 0x90caf9,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        roughness: 0.3
      });
      const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      daughterCell.add(nucleus);

      daughterCell.visible = false;
      this.daughterCells.push(daughterCell);
      this.group.add(daughterCell);
    }
  }

  public setProgress(progress: number): void {
    this.currentProgress = Math.max(0, Math.min(1, progress));
    this.updatePhase(this.currentProgress);
  }

  public getProgress(): number {
    return this.currentProgress;
  }

  public getPhase(): CellPhase {
    return this.currentPhase;
  }

  public getPhaseName(): string {
    const names = ['间期', '前期', '中期', '后期', '末期'];
    return names[this.currentPhase];
  }

  private updatePhase(progress: number): void {
    if (progress < 0.2) {
      this.currentPhase = CellPhase.INTERPHASE;
      this.updateInterphase(progress / 0.2);
    } else if (progress < 0.4) {
      this.currentPhase = CellPhase.PROPHASE;
      this.updateProphase((progress - 0.2) / 0.2);
    } else if (progress < 0.6) {
      this.currentPhase = CellPhase.METAPHASE;
      this.updateMetaphase((progress - 0.4) / 0.2);
    } else if (progress < 0.8) {
      this.currentPhase = CellPhase.ANAPHASE;
      this.updateAnaphase((progress - 0.6) / 0.2);
    } else {
      this.currentPhase = CellPhase.TELOPHASE;
      this.updateTelophase((progress - 0.8) / 0.2);
    }

    this.microtubuleParticles.setPhase(progress);
    this.updateSpindleFibers();
    this.updateChromosomePositionsArray();
  }

  private updateChromosomePositionsArray(): void {
    const positions: THREE.Vector3[] = [];
    this.chromosomeMeshes.forEach((mesh) => {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      this.group.worldToLocal(worldPos);
      positions.push(worldPos);
    });
    this.microtubuleParticles.setChromosomePositions(positions);
    this.microtubuleParticles.setSpindlePolePositions(this.spindlePolePositions);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private updateInterphase(t: number): void {
    const easeT = this.easeInOut(t);

    (this.nucleus.material as THREE.MeshPhysicalMaterial).opacity = 0.2 + easeT * 0.1;
    (this.nucleusMembrane.material as THREE.MeshBasicMaterial).opacity = 0.3;
    (this.membrane.material as THREE.MeshPhysicalMaterial).opacity = 0.15;

    (this.spindleFibers.material as THREE.LineBasicMaterial).opacity = 0;

    this.chromosomes.children.forEach((group, i) => {
      const chromatinStrands = group.children.filter((_, idx) => idx < 5);
      const condensed = group.children[5] as THREE.Mesh;

      chromatinStrands.forEach((strand) => {
        ((strand as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8;
        strand.visible = true;
      });

      condensed.visible = false;
      (condensed.material as THREE.MeshBasicMaterial).opacity = 0;
    });

    this.daughterCells.forEach((cell) => {
      cell.visible = false;
    });

    this.membrane.scale.setScalar(1);
    this.membrane.position.set(0, 0, 0);
  }

  private updateProphase(t: number): void {
    const easeT = this.easeInOut(t);

    (this.nucleus.material as THREE.MeshPhysicalMaterial).opacity = 0.3 * (1 - easeT);
    (this.nucleusMembrane.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - easeT * easeT);
    (this.nucleusMembrane.material as THREE.MeshBasicMaterial).transparent = true;

    (this.spindleFibers.material as THREE.LineBasicMaterial).opacity = easeT * 0.4;

    this.chromosomes.children.forEach((group, i) => {
      const chromatinStrands = group.children.filter((_, idx) => idx < 5);
      const condensed = group.children[5] as THREE.Mesh;

      chromatinStrands.forEach((strand) => {
        ((strand as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - easeT);
      });

      condensed.visible = true;
      (condensed.material as THREE.MeshBasicMaterial).opacity = easeT * 0.9;

      const angle = (i / this.chromosomeCount) * Math.PI * 2;
      const radius = this.cellRadius * 0.35;
      const targetX = Math.cos(angle) * radius;
      const targetY = (Math.random() - 0.5) * 0.1;
      const targetZ = Math.sin(angle) * radius;

      group.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), easeT * 0.05);
    });
  }

  private updateMetaphase(t: number): void {
    const easeT = this.easeInOut(t);

    (this.nucleus.material as THREE.MeshPhysicalMaterial).opacity = 0;
    (this.nucleusMembrane.material as THREE.MeshBasicMaterial).opacity = 0;

    (this.spindleFibers.material as THREE.LineBasicMaterial).opacity = 0.4 + easeT * 0.2;

    this.chromosomes.children.forEach((group, i) => {
      const condensed = group.children[5] as THREE.Mesh;
      condensed.visible = true;
      (condensed.material as THREE.MeshBasicMaterial).opacity = 0.9;

      const angle = (i / this.chromosomeCount) * Math.PI * 2;
      const radius = this.cellRadius * 0.3;
      const targetX = Math.cos(angle) * radius;
      const targetY = 0;
      const targetZ = Math.sin(angle) * radius;

      group.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05);
      const targetRot = new THREE.Euler(0, angle, Math.PI / 2);
      group.rotation.x += (targetRot.x - group.rotation.x) * 0.05;
      group.rotation.y += (targetRot.y - group.rotation.y) * 0.05;
      group.rotation.z += (targetRot.z - group.rotation.z) * 0.05;
    });
  }

  private updateAnaphase(t: number): void {
    const easeT = this.easeInOut(t);

    (this.spindleFibers.material as THREE.LineBasicMaterial).opacity = 0.6 - easeT * 0.2;

    this.chromosomes.children.forEach((group, i) => {
      const condensed = group.children[5] as THREE.Mesh;
      condensed.visible = true;

      const angle = (i / this.chromosomeCount) * Math.PI * 2;
      const radius = this.cellRadius * 0.3;

      const poleOffset = easeT * this.cellRadius * 0.6;
      const poleY = i % 2 === 0 ? poleOffset : -poleOffset;

      const targetX = Math.cos(angle) * radius * (1 - easeT * 0.5);
      const targetY = poleY;
      const targetZ = Math.sin(angle) * radius * (1 - easeT * 0.5);

      group.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05);
    });

    this.spindlePolePositions[0].y = 0.8 + easeT * 0.5;
    this.spindlePolePositions[1].y = -0.8 - easeT * 0.5;
  }

  private updateTelophase(t: number): void {
    const easeT = this.easeInOut(t);

    const membraneMat = this.membrane.material as THREE.MeshPhysicalMaterial;
    membraneMat.opacity = 0.15 * (1 - easeT * 0.5);

    (this.spindleFibers.material as THREE.LineBasicMaterial).opacity = 0.4 * (1 - easeT);

    const splitY = easeT * this.cellRadius * 0.8;
    const cellScale = 0.6 + easeT * 0.35;

    this.chromosomes.children.forEach((group, i) => {
      const condensed = group.children[5] as THREE.Mesh;
      (condensed.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - easeT * 0.3);

      const poleY = i % 2 === 0 ? splitY : -splitY;
      group.position.lerp(new THREE.Vector3(group.position.x * 0.7, poleY, group.position.z * 0.7), 0.05);
    });

    const cytoplasmMat = this.cytoplasmParticles.material as THREE.PointsMaterial;
    cytoplasmMat.opacity = 0.6 * (1 - easeT * 0.3);

    this.daughterCells.forEach((cell, index) => {
      cell.visible = true;
      const yOffset = index === 0 ? splitY : -splitY;
      cell.position.y = yOffset;
      cell.scale.setScalar(cellScale);

      const membrane = cell.children[0] as THREE.Mesh;
      const nucleus = cell.children[1] as THREE.Mesh;

      (membrane.material as THREE.MeshPhysicalMaterial).opacity = easeT * 0.15;
      (nucleus.material as THREE.MeshPhysicalMaterial).opacity = easeT * 0.2;
    });

    const positions = this.cytoplasmParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      if (easeT > 0.3) {
        const ySign = y >= 0 ? 1 : -1;
        positions[i + 1] = y + ySign * easeT * 0.1;
      }
    }
    this.cytoplasmParticles.geometry.attributes.position.needsUpdate = true;

    this.createCleavageFurrow(easeT);
  }

  private createCleavageFurrow(t: number): void {
    if (t <= 0) return;

    const positions = this.membrane.geometry.attributes.position.array as Float32Array;
    const originalPositions = (this.membrane.geometry as any)._originalPositions;

    if (!originalPositions) {
      (this.membrane.geometry as any)._originalPositions = new Float32Array(positions);
      return;
    }

    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const y = originalPositions[i + 1];
      const z = originalPositions[i + 2];

      const distFromEquator = Math.abs(y);
      const furrowDepth = t * 0.3;
      const furrowFactor = Math.exp(-distFromEquator * distFromEquator * 8);

      const scale = 1 - furrowDepth * furrowFactor;

      positions[i] = x * scale;
      positions[i + 1] = y;
      positions[i + 2] = z * scale;
    }

    this.membrane.geometry.attributes.position.needsUpdate = true;
    this.membrane.geometry.computeVertexNormals();
  }

  private updateSpindleFibers(): void {
    const positions = this.spindleFibers.geometry.attributes.position.array as Float32Array;
    const fiberCount = positions.length / 6;

    for (let i = 0; i < fiberCount; i++) {
      const chromoIndex = Math.floor(i / 2) % this.chromosomeCount;
      const poleIndex = i % 2;

      const polePos = this.spindlePolePositions[poleIndex];
      const chromoPos = new THREE.Vector3();
      if (this.chromosomeMeshes[chromoIndex]) {
        this.chromosomeMeshes[chromoIndex].getWorldPosition(chromoPos);
        this.group.worldToLocal(chromoPos);
      }

      positions[i * 6] = polePos.x;
      positions[i * 6 + 1] = polePos.y;
      positions[i * 6 + 2] = polePos.z;
      positions[i * 6 + 3] = chromoPos.x;
      positions[i * 6 + 4] = chromoPos.y;
      positions[i * 6 + 5] = chromoPos.z;
    }

    this.spindleFibers.geometry.attributes.position.needsUpdate = true;
  }

  public update(deltaTime: number, speed: number = 1): void {
    this.microtubuleParticles.update(deltaTime, speed);

    const time = Date.now() * 0.001;
    this.chromosomes.children.forEach((group, i) => {
      if (this.currentPhase === CellPhase.INTERPHASE || this.currentPhase === CellPhase.PROPHASE) {
        const chromatinStrands = group.children.filter((_, idx) => idx < 5);
        chromatinStrands.forEach((strand, j) => {
          strand.rotation.z = Math.sin(time * 0.5 + i + j) * 0.1;
          strand.position.x = Math.sin(time * 0.3 + i * 0.5 + j) * 0.02;
        });
      }
    });

    const cytopositions = this.cytoplasmParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < cytopositions.length; i += 3) {
      cytopositions[i] += Math.sin(time + i * 0.01) * 0.0001;
      cytopositions[i + 1] += Math.cos(time * 0.7 + i * 0.01) * 0.0001;
      cytopositions[i + 2] += Math.sin(time * 0.5 + i * 0.01) * 0.0001;
    }
    this.cytoplasmParticles.geometry.attributes.position.needsUpdate = true;

    this.membraneWireframe.rotation.y += deltaTime * 0.02;
  }

  public reset(): void {
    this.setProgress(0);

    if ((this.membrane.geometry as any)._originalPositions) {
      const originalPositions = (this.membrane.geometry as any)._originalPositions;
      const positions = this.membrane.geometry.attributes.position.array as Float32Array;
      positions.set(originalPositions);
      this.membrane.geometry.attributes.position.needsUpdate = true;
      this.membrane.geometry.computeVertexNormals();
    }

    this.membrane.scale.setScalar(1);
    this.membrane.position.set(0, 0, 0);

    this.spindlePolePositions = [
      new THREE.Vector3(0, 0.8, 0),
      new THREE.Vector3(0, -0.8, 0)
    ];
  }

  public dispose(): void {
    this.membrane.geometry.dispose();
    (this.membrane.material as THREE.Material).dispose();
    this.membraneWireframe.geometry.dispose();
    (this.membraneWireframe.material as THREE.Material).dispose();
    this.nucleus.geometry.dispose();
    (this.nucleus.material as THREE.Material).dispose();
    this.nucleusMembrane.geometry.dispose();
    (this.nucleusMembrane.material as THREE.Material).dispose();
    this.cytoplasmParticles.geometry.dispose();
    (this.cytoplasmParticles.material as THREE.Material).dispose();
    this.spindleFibers.geometry.dispose();
    (this.spindleFibers.material as THREE.Material).dispose();

    this.chromosomeMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    this.daughterCells.forEach((cell) => {
      cell.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });

    this.microtubuleParticles.dispose();
  }
}
