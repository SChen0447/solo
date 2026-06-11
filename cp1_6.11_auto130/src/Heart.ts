import * as THREE from 'three';

export class Heart {
  public group: THREE.Group;
  public ventricle: THREE.Mesh;
  public pumps: THREE.Mesh[] = [];
  public pumpRods: THREE.Mesh[] = [];
  private basePositions: THREE.Vector3[] = [];
  private baseVentricleScale = 1;
  private brassMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    this.brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfa144,
      metalness: 0.8,
      roughness: 0.3,
    });

    this.createVentricle();
    this.createPumps();
    this.createConnectors();
  }

  private createGearTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#cfa144';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#8a6a24';
    ctx.lineWidth = 3;

    for (let ring = 0; ring < 6; ring++) {
      const radius = 30 + ring * 40;
      const teethCount = 12 + ring * 6;
      for (let i = 0; i < teethCount; i++) {
        const angle = (i / teethCount) * Math.PI * 2;
        const x1 = size / 2 + Math.cos(angle) * radius;
        const y1 = size / 2 + Math.sin(angle) * radius;
        const x2 = size / 2 + Math.cos(angle) * (radius + 15);
        const y2 = size / 2 + Math.sin(angle) * (radius + 15);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createBumpMap(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#888');
    gradient.addColorStop(1, '#444');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    for (let ring = 0; ring < 6; ring++) {
      const radius = 30 + ring * 40;
      const teethCount = 12 + ring * 6;
      for (let i = 0; i < teethCount; i++) {
        const angle = (i / teethCount) * Math.PI * 2;
        const x1 = size / 2 + Math.cos(angle) * radius;
        const y1 = size / 2 + Math.sin(angle) * radius;
        const x2 = size / 2 + Math.cos(angle) * (radius + 15);
        const y2 = size / 2 + Math.sin(angle) * (radius + 15);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createVentricle(): void {
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    const ventriMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfa144,
      metalness: 0.85,
      roughness: 0.25,
      map: this.createGearTexture(),
      bumpMap: this.createBumpMap(),
      bumpScale: 0.05,
    });

    this.ventricle = new THREE.Mesh(geometry, ventriMaterial);
    this.ventricle.scale.setScalar(1);
    this.group.add(this.ventricle);

    const ringGeometry = new THREE.TorusGeometry(1.02, 0.04, 16, 64);
    const ring1 = new THREE.Mesh(ringGeometry, this.brassMaterial);
    ring1.rotation.x = Math.PI / 2;
    this.group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeometry, this.brassMaterial);
    ring2.rotation.y = Math.PI / 2;
    this.group.add(ring2);

    const ring3 = new THREE.Mesh(ringGeometry, this.brassMaterial);
    this.group.add(ring3);
  }

  private createPumps(): void {
    const pumpCount = 8;
    const pumpRadius = 0.25;
    const orbitRadius = 1.6;

    for (let i = 0; i < pumpCount; i++) {
      const angle = (i / pumpCount) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;

      this.basePositions.push(new THREE.Vector3(x, 0, z));

      const cylinderGeom = new THREE.CylinderGeometry(pumpRadius, pumpRadius * 1.2, 0.8, 24);
      const pump = new THREE.Mesh(cylinderGeom, this.brassMaterial);
      pump.position.set(x, 0, z);
      pump.lookAt(0, 0, 0);
      pump.rotateX(Math.PI / 2);
      this.group.add(pump);
      this.pumps.push(pump);

      const pistonGeom = new THREE.CylinderGeometry(pumpRadius * 0.7, pumpRadius * 0.7, 0.3, 24);
      const pistonMat = new THREE.MeshStandardMaterial({
        color: 0xa08040,
        metalness: 0.9,
        roughness: 0.2,
      });
      const piston = new THREE.Mesh(pistonGeom, pistonMat);
      piston.position.set(x, 0, z);
      piston.lookAt(0, 0, 0);
      piston.rotateX(Math.PI / 2);
      this.group.add(piston);
      this.pumpRods.push(piston);
    }
  }

  private createConnectors(): void {
    const orbitRadius = 1.6;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;

      const pipeGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12);
      const pipe = new THREE.Mesh(pipeGeom, this.brassMaterial);
      pipe.position.set(x * 0.6, 0, z * 0.6);
      pipe.lookAt(0, 0, 0);
      pipe.rotateX(Math.PI / 2);
      this.group.add(pipe);
    }

    const boltGeom = new THREE.SphereGeometry(0.08, 12, 12);
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a24,
      metalness: 0.9,
      roughness: 0.15,
    });
    for (let i = 0; i < 12; i++) {
      const angle1 = (i / 12) * Math.PI * 2;
      const angle2 = (i + 3) % 12 / 12 * Math.PI * 2;
      const x1 = Math.cos(angle1) * 1.05;
      const y1 = Math.sin(angle2) * 1.05;
      const bolt1 = new THREE.Mesh(boltGeom, boltMat);
      bolt1.position.set(x1, y1 * 0.3, Math.sin(angle1) * 1.05);
      this.group.add(bolt1);
    }
  }

  public update(beatFrequency: number, time: number): number {
    const bps = beatFrequency / 60;
    const phase = time * bps * Math.PI * 2;

    const beatWave = Math.sin(phase);
    const beatSharp = Math.pow(Math.max(0, beatWave), 3);
    const ventricleScale = 1 + beatSharp * 0.1;
    this.ventricle.scale.setScalar(ventricleScale);

    const pistonStroke = 0.3;
    for (let i = 0; i < this.pumps.length; i++) {
      const base = this.basePositions[i];
      const dirToCenter = base.clone().normalize();
      const offset = beatSharp * pistonStroke * 0.5 + Math.sin(phase + i * 0.3) * pistonStroke * 0.1;
      this.pumpRods[i].position.copy(base).add(dirToCenter.multiplyScalar(-offset));
    }

    this.group.rotation.y = time * 0.1;

    return beatSharp;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }
}
