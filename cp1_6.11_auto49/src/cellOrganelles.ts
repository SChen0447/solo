import * as THREE from 'three';

interface OrganelleData {
  name: string;
  nameCN: string;
  desc: string;
  color: THREE.Color;
  glowColor: THREE.Color;
  group: THREE.Group;
  mesh: THREE.Mesh | THREE.Group;
  glowRing: THREE.Group | null;
  pulsePhase: number;
  statusGenerators: (() => { label: string; value: string })[];
}

export class CellOrganelles {
  private scene: THREE.Scene;
  private organelles: OrganelleData[] = [];
  private selectedOrganelle: OrganelleData | null = null;
  private pulseIntensity = 0.05;

  private nucleusGroup!: THREE.Group;
  private mitochondriaGroup!: THREE.Group;
  private erGroup!: THREE.Group;
  private golgiGroup!: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createNucleus();
    this.createMitochondria();
    this.createER();
    this.createGolgi();
  }

  private createNucleus() {
    this.nucleusGroup = new THREE.Group();
    this.nucleusGroup.position.set(0, 0, 0);

    const nucleusGeo = new THREE.SphereGeometry(15, 64, 64);
    const nucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0xcc3399,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x660044,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    this.nucleusGroup.add(nucleusMesh);

    const innerGeo = new THREE.SphereGeometry(12, 32, 32);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0xff66aa,
      transparent: true,
      opacity: 0.3,
      roughness: 0.5,
      emissive: 0x880044,
      emissiveIntensity: 0.2,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.nucleusGroup.add(innerMesh);

    const nucleolusGeo = new THREE.SphereGeometry(4, 16, 16);
    const nucleolusMat = new THREE.MeshPhysicalMaterial({
      color: 0xff99cc,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      emissive: 0xaa3366,
      emissiveIntensity: 0.4,
    });
    const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleolusMesh.position.set(3, 2, -1);
    this.nucleusGroup.add(nucleolusMesh);

    this.scene.add(this.nucleusGroup);

    this.organelles.push({
      name: 'nucleus',
      nameCN: '细胞核',
      desc: '细胞的控制中心，含有遗传物质DNA。调控基因表达，控制细胞分裂、生长和分化。',
      color: new THREE.Color(0xcc3399),
      glowColor: new THREE.Color(0xcc44ff),
      group: this.nucleusGroup,
      mesh: nucleusMesh,
      glowRing: null,
      pulsePhase: 0,
      statusGenerators: [
        () => ({ label: '基因转录速率', value: `${(Math.random() * 50 + 80).toFixed(1)} mRNA/min` }),
        () => ({ label: 'DNA复制进度', value: `${(Math.random() * 10 + 85).toFixed(1)}%` }),
        () => ({ label: '染色质凝聚度', value: `${(Math.random() * 20 + 40).toFixed(1)}%` }),
      ],
    });
  }

  private createMitochondria() {
    this.mitochondriaGroup = new THREE.Group();

    const positions = [
      { x: 30, y: 10, z: -20, ry: 0.3 },
      { x: -25, y: -5, z: 25, ry: 1.2 },
      { x: 15, y: -15, z: 30, ry: 2.1 },
      { x: -35, y: 8, z: -10, ry: 0.8 },
    ];

    positions.forEach((pos) => {
      const mitoGroup = new THREE.Group();

      const capsuleGeo = new THREE.CapsuleGeometry(3, 10, 16, 32);
      const capsuleMat = new THREE.MeshPhysicalMaterial({
        color: 0xff6633,
        transparent: true,
        opacity: 0.7,
        roughness: 0.4,
        emissive: 0xcc4400,
        emissiveIntensity: 0.3,
      });
      const capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
      capsuleMesh.rotation.z = Math.PI / 2;
      mitoGroup.add(capsuleMesh);

      const particleCount = 30;
      const particlesGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const t = (Math.random() - 0.5) * 10;
        particlePositions[i * 3] = t;
        particlePositions[i * 3 + 1] = Math.cos(angle) * 4;
        particlePositions[i * 3 + 2] = Math.sin(angle) * 4;
      }
      particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

      const particleMat = new THREE.PointsMaterial({
        color: 0xff8844,
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(particlesGeo, particleMat);
      mitoGroup.add(particles);

      mitoGroup.position.set(pos.x, pos.y, pos.z);
      mitoGroup.rotation.y = pos.ry;
      this.mitochondriaGroup.add(mitoGroup);
    });

    this.scene.add(this.mitochondriaGroup);

    this.organelles.push({
      name: 'mitochondria',
      nameCN: '线粒体',
      desc: '细胞的能量工厂，通过氧化磷酸化产生ATP。具有双层膜结构，拥有自身的DNA和核糖体。',
      color: new THREE.Color(0xff6633),
      glowColor: new THREE.Color(0xff8800),
      group: this.mitochondriaGroup,
      mesh: this.mitochondriaGroup,
      glowRing: null,
      pulsePhase: Math.PI / 2,
      statusGenerators: [
        () => ({ label: 'ATP产量速率', value: `${(Math.random() * 30 + 60).toFixed(1)} ATP/s` }),
        () => ({ label: '耗氧量', value: `${(Math.random() * 5 + 8).toFixed(2)} μmol/min` }),
        () => ({ label: '膜电位', value: `${(Math.random() * 20 + 150).toFixed(1)} mV` }),
      ],
    });
  }

  private createER() {
    this.erGroup = new THREE.Group();

    const controlPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 49;
      const x = -40 + t * 80;
      const y = Math.sin(t * Math.PI * 3) * 8 + Math.cos(t * Math.PI * 1.5) * 5;
      const z = Math.cos(t * Math.PI * 2) * 15 + Math.sin(t * Math.PI * 4) * 5;
      controlPoints.push(new THREE.Vector3(x, y, z - 30));
    }

    const curve = new THREE.CatmullRomCurve3(controlPoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 200, 1.5, 12, false);
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0x228844,
      transparent: true,
      opacity: 0.6,
      roughness: 0.5,
      wireframe: true,
      emissive: 0x115522,
      emissiveIntensity: 0.2,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.erGroup.add(tubeMesh);

    const controlPoints2: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 49;
      const x = -35 + t * 70;
      const y = Math.cos(t * Math.PI * 2.5) * 10 + Math.sin(t * Math.PI * 3.5) * 4;
      const z = Math.sin(t * Math.PI * 1.8) * 12 + Math.cos(t * Math.PI * 2.2) * 8;
      controlPoints2.push(new THREE.Vector3(x, y, z + 25));
    }

    const curve2 = new THREE.CatmullRomCurve3(controlPoints2);
    const tubeGeo2 = new THREE.TubeGeometry(curve2, 200, 1.2, 12, false);
    const tubeMesh2 = new THREE.Mesh(tubeGeo2, tubeMat.clone());
    this.erGroup.add(tubeMesh2);

    this.erGroup.position.set(0, 0, 0);
    this.scene.add(this.erGroup);

    this.organelles.push({
      name: 'er',
      nameCN: '内质网',
      desc: '细胞内的膜系统，分为粗面内质网（附核糖体，合成蛋白质）和滑面内质网（脂质合成、解毒）。',
      color: new THREE.Color(0x228844),
      glowColor: new THREE.Color(0x00cccc),
      group: this.erGroup,
      mesh: this.erGroup,
      glowRing: null,
      pulsePhase: Math.PI,
      statusGenerators: [
        () => ({ label: '蛋白折叠速率', value: `${(Math.random() * 40 + 100).toFixed(0)} 个/min` }),
        () => ({ label: '钙离子浓度', value: `${(Math.random() * 200 + 400).toFixed(0)} μM` }),
        () => ({ label: '脂质合成率', value: `${(Math.random() * 20 + 30).toFixed(1)} mol/s` }),
      ],
    });
  }

  private createGolgi() {
    this.golgiGroup = new THREE.Group();
    this.golgiGroup.position.set(25, 5, 15);

    const discCount = 5;
    const spacing = 0.2;

    for (let i = 0; i < discCount; i++) {
      const discGeo = new THREE.CylinderGeometry(6 - i * 0.4, 7 - i * 0.3, 0.5, 32);
      const discMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.22 + i * 0.02, 0.7, 0.5),
        transparent: true,
        opacity: 0.65,
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color().setHSL(0.22 + i * 0.02, 0.5, 0.15),
        emissiveIntensity: 0.3,
      });
      const discMesh = new THREE.Mesh(discGeo, discMat);
      discMesh.position.y = i * (0.5 + spacing) - (discCount * (0.5 + spacing)) / 2;
      discMesh.userData.spinSpeed = 0.1 + i * 0.02;
      this.golgiGroup.add(discMesh);
    }

    this.scene.add(this.golgiGroup);

    this.organelles.push({
      name: 'golgi',
      nameCN: '高尔基体',
      desc: '蛋白质加工、分类和运输的枢纽。修饰糖基化，将蛋白质包装成囊泡分泌至目标位置。',
      color: new THREE.Color(0xaacc33),
      glowColor: new THREE.Color(0xffdd00),
      group: this.golgiGroup,
      mesh: this.golgiGroup,
      glowRing: null,
      pulsePhase: Math.PI * 1.5,
      statusGenerators: [
        () => ({ label: '囊泡分泌速率', value: `${(Math.random() * 15 + 20).toFixed(0)} 个/min` }),
        () => ({ label: '糖基化进度', value: `${(Math.random() * 10 + 85).toFixed(1)}%` }),
        () => ({ label: '蛋白质分拣率', value: `${(Math.random() * 5 + 93).toFixed(1)}%` }),
      ],
    });
  }

  update(time: number) {
    this.organelles.forEach((org) => {
      const pulse = Math.sin(time * Math.PI + org.pulsePhase) * this.pulseIntensity;
      org.group.scale.setScalar(1 + pulse);

      if (org.name === 'mitochondria') {
        org.group.children.forEach((mito) => {
          const particles = mito.children[1];
          if (particles) {
            particles.rotation.y += 0.5 * 0.016;
          }
        });
      }

      if (org.name === 'golgi') {
        org.group.children.forEach((disc) => {
          if (disc instanceof THREE.Mesh && disc.userData.spinSpeed) {
            disc.rotation.y += disc.userData.spinSpeed * 0.016;
          }
        });
      }

      if (org.glowRing) {
        org.glowRing.rotation.y += 0.3 * 0.016;
        org.glowRing.rotation.x += 0.15 * 0.016;
      }
    });
  }

  selectOrganelle(name: string): OrganelleData | null {
    const org = this.organelles.find((o) => o.name === name);
    if (!org) return null;

    if (this.selectedOrganelle && this.selectedOrganelle.glowRing) {
      this.scene.remove(this.selectedOrganelle.glowRing);
      this.selectedOrganelle.glowRing = null;
    }

    this.createGlowRing(org);
    this.selectedOrganelle = org;
    return org;
  }

  deselectAll() {
    if (this.selectedOrganelle && this.selectedOrganelle.glowRing) {
      this.scene.remove(this.selectedOrganelle.glowRing);
      this.selectedOrganelle.glowRing = null;
    }
    this.selectedOrganelle = null;
  }

  private createGlowRing(org: OrganelleData) {
    const ringGroup = new THREE.Group();
    const particleCount = 80;
    const ringRadius = 20;

    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const r = ringRadius + (Math.random() - 0.5) * 4;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: org.glowColor,
      size: 1.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ring = new THREE.Points(geo, mat);
    ringGroup.add(ring);

    ringGroup.position.copy(org.group.position);
    this.scene.add(ringGroup);
    org.glowRing = ringGroup;
  }

  getOrganelleInfo(name: string) {
    const org = this.organelles.find((o) => o.name === name);
    if (!org) return null;
    return {
      name: org.nameCN,
      desc: org.desc,
      color: org.glowColor,
      statuses: org.statusGenerators.map((gen) => gen()),
    };
  }

  getOrganelleNames(): string[] {
    return this.organelles.map((o) => o.name);
  }

  getOrganelleGroup(name: string): THREE.Group | null {
    const org = this.organelles.find((o) => o.name === name);
    return org ? org.group : null;
  }

  setPulseIntensity(value: number) {
    this.pulseIntensity = value;
  }

  getMeshesForRaycast(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    this.organelles.forEach((org) => {
      org.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.organelleName = org.name;
          meshes.push(child);
        }
      });
    });
    return meshes;
  }
}
