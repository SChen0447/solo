import * as THREE from 'three';
import { PlantConfig, GrowthStage, interpolateStage } from './plantConfig';

export interface PlantMeshParts {
  group: THREE.Group;
  base: THREE.Mesh;
  stem: THREE.Mesh;
  leaves: THREE.Group;
  flowers: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
}

export class PlantGenerator {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createPlant(config: PlantConfig): PlantMeshParts {
    const group = new THREE.Group();
    const materials: THREE.MeshStandardMaterial[] = [];

    const base = this.createBase(config);
    group.add(base);
    materials.push(base.material as THREE.MeshStandardMaterial);

    const stem = this.createStem(config);
    group.add(stem);
    materials.push(stem.material as THREE.MeshStandardMaterial);

    const leaves = new THREE.Group();
    group.add(leaves);

    const flowers = new THREE.Group();
    group.add(flowers);

    this.scene.add(group);
    group.visible = false;

    return { group, base, stem, leaves, flowers, materials };
  }

  private createBase(config: PlantConfig): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      config.baseRadius,
      config.baseRadius * 1.2,
      0.15,
      12
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x5d4e37,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.075;
    return mesh;
  }

  private createStem(config: PlantConfig): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 2, 0)
    ]);
    const geometry = new THREE.TubeGeometry(curve, config.stemSegments, 0.2, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0x90ee90,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  createLeaves(
    config: PlantConfig,
    stage: GrowthStage,
    leavesGroup: THREE.Group,
    materials: THREE.MeshStandardMaterial[]
  ): void {
    while (leavesGroup.children.length > 0) {
      const child = leavesGroup.children[0] as THREE.Mesh;
      leavesGroup.remove(child);
      child.geometry?.dispose();
    }

    if (stage.leafCount === 0) return;

    const color = new THREE.Color(
      stage.color.r / 255,
      stage.color.g / 255,
      stage.color.b / 255
    );

    if (config.leafShape === 'spine') {
      this.createCactusSpines(stage, leavesGroup, materials, color);
    } else if (config.leafShape === 'flat') {
      this.createFlatLeaves(config, stage, leavesGroup, materials, color);
    } else {
      this.createCompoundLeaves(config, stage, leavesGroup, materials, color);
    }
  }

  private createCactusSpines(
    stage: GrowthStage,
    leavesGroup: THREE.Group,
    materials: THREE.MeshStandardMaterial[],
    color: THREE.Color
  ): void {
    const count = stage.leafCount;
    const height = stage.height;

    for (let i = 0; i < count; i++) {
      const yRatio = (i + 1) / (count + 1);
      const angle = (i * 2.399) % (Math.PI * 2);
      const y = 0.2 + height * yRatio;
      const radius = stage.stemDiameter * 0.55;

      const spineGeo = new THREE.ConeGeometry(0.015, 0.12, 4);
      const spineMat = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.7),
        roughness: 0.8,
        transparent: true,
        opacity: 0.9
      });
      materials.push(spineMat);
      const spine = new THREE.Mesh(spineGeo, spineMat);

      spine.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      spine.rotation.z = Math.PI / 2;
      spine.rotation.y = angle;

      leavesGroup.add(spine);
    }
  }

  private createFlatLeaves(
    config: PlantConfig,
    stage: GrowthStage,
    leavesGroup: THREE.Group,
    materials: THREE.MeshStandardMaterial[],
    color: THREE.Color
  ): void {
    const points: THREE.Vector2[] = [];
    const segments = 10;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const width = Math.sin(t * Math.PI) * 0.25;
      points.push(new THREE.Vector2(width, t * stage.height * 0.5));
    }

    const count = stage.leafCount;
    for (let i = 0; i < count; i++) {
      const angleRad = (i / count) * Math.PI * 2;
      const yPos = 0.3 + (i / Math.max(1, count - 1)) * stage.height * 0.6;

      const leafGeo = new THREE.LatheGeometry(points, 6);
      const leafMat = new THREE.MeshStandardMaterial({
        color: color.clone().lerp(new THREE.Color(0xffffff), 0.1),
        roughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      materials.push(leafMat);
      const leaf = new THREE.Mesh(leafGeo, leafMat);

      leaf.position.set(
        Math.cos(angleRad) * config.baseRadius * 0.3,
        yPos,
        Math.sin(angleRad) * config.baseRadius * 0.3
      );
      leaf.rotation.y = angleRad;
      leaf.rotation.z = THREE.MathUtils.degToRad(stage.leafAngle - 90);

      leavesGroup.add(leaf);
    }
  }

  private createCompoundLeaves(
    config: PlantConfig,
    stage: GrowthStage,
    leavesGroup: THREE.Group,
    materials: THREE.MeshStandardMaterial[],
    color: THREE.Color
  ): void {
    const count = stage.leafCount;

    for (let i = 0; i < count; i++) {
      const angleRad = (i / count) * Math.PI * 2;
      const yPos = 0.2 + (i / Math.max(1, count - 1)) * stage.height * 0.8;

      const featherPoints: THREE.Vector2[] = [];
      const featherSeg = 8;
      for (let j = 0; j <= featherSeg; j++) {
        const t = j / featherSeg;
        const w = Math.sin(t * Math.PI) * 0.15 * (1 - t * 0.3);
        featherPoints.push(new THREE.Vector2(w, t * stage.height * 0.45));
      }

      const leafGeo = new THREE.LatheGeometry(featherPoints, 4);
      const leafMat = new THREE.MeshStandardMaterial({
        color: color.clone(),
        roughness: 0.7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });
      materials.push(leafMat);
      const leaf = new THREE.Mesh(leafGeo, leafMat);

      leaf.position.set(
        Math.cos(angleRad) * config.baseRadius * 0.2,
        yPos,
        Math.sin(angleRad) * config.baseRadius * 0.2
      );
      leaf.rotation.y = angleRad + Math.PI / 2;
      leaf.rotation.z = THREE.MathUtils.degToRad(stage.leafAngle - 80);

      leavesGroup.add(leaf);
    }
  }

  createFlowers(
    config: PlantConfig,
    stage: GrowthStage,
    flowersGroup: THREE.Group,
    materials: THREE.MeshStandardMaterial[]
  ): THREE.Vector3[] {
    while (flowersGroup.children.length > 0) {
      const child = flowersGroup.children[0] as THREE.Mesh;
      flowersGroup.remove(child);
      child.geometry?.dispose();
    }

    const bloomPositions: THREE.Vector3[] = [];
    if (!config.hasFlowers || stage.bloomProbability < 0.1) return bloomPositions;

    const petalColor = new THREE.Color(
      config.petalColor.r / 255,
      config.petalColor.g / 255,
      config.petalColor.b / 255
    );

    const flowerCount = config.id === 'orchid' ? 3 : 1;
    const openRad = THREE.MathUtils.degToRad(stage.petalOpenAngle);

    for (let f = 0; f < flowerCount; f++) {
      const flowerGroup = new THREE.Group();
      const yOffset = stage.height * (0.7 + f * 0.1);
      const angleOffset = (f / flowerCount) * Math.PI * 2;
      flowerGroup.position.set(
        Math.cos(angleOffset) * stage.stemDiameter * 0.3,
        yOffset,
        Math.sin(angleOffset) * stage.stemDiameter * 0.3
      );

      const petalCount = 5;
      for (let p = 0; p < petalCount; p++) {
        const petalGeo = new THREE.SphereGeometry(0.08, 6, 4);
        petalGeo.scale(1, 0.4, 1.6);
        const petalMat = new THREE.MeshStandardMaterial({
          color: petalColor.clone(),
          roughness: 0.4,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
        materials.push(petalMat);
        const petal = new THREE.Mesh(petalGeo, petalMat);

        const pAngle = (p / petalCount) * Math.PI * 2;
        petal.position.set(
          Math.cos(pAngle) * Math.sin(openRad) * 0.12,
          Math.cos(openRad) * 0.05,
          Math.sin(pAngle) * Math.sin(openRad) * 0.12
        );
        petal.rotation.y = -pAngle;
        petal.rotation.x = openRad * 0.5;

        flowerGroup.add(petal);
      }

      const centerGeo = new THREE.SphereGeometry(0.05, 6, 4);
      const centerMat = new THREE.MeshStandardMaterial({
        color: petalColor.clone().multiplyScalar(0.7),
        roughness: 0.5,
        transparent: true,
        opacity: 0.95
      });
      materials.push(centerMat);
      const center = new THREE.Mesh(centerGeo, centerMat);
      flowerGroup.add(center);

      flowersGroup.add(flowerGroup);
      bloomPositions.push(flowerGroup.getWorldPosition(new THREE.Vector3()));
    }

    return bloomPositions;
  }

  updatePlantGeometry(
    parts: PlantMeshParts,
    config: PlantConfig,
    progress: number,
    light: number,
    moisture: number
  ): GrowthStage {
    const stage = interpolateStage(config, progress);

    const stemGeo = parts.stem.geometry as THREE.TubeGeometry;
    const oldCurve = (stemGeo.parameters as { path: THREE.CatmullRomCurve3 }).path;
    const height = stage.height;
    const newCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(0, height * 0.4, 0),
      new THREE.Vector3(0, height * 0.75, 0),
      new THREE.Vector3(0, height, 0)
    ]);
    stemGeo.dispose();
    const newStemGeo = new THREE.TubeGeometry(
      newCurve,
      config.stemSegments,
      stage.stemDiameter * 0.5,
      8,
      false
    );
    parts.stem.geometry = newStemGeo;

    const stemMat = parts.stem.material as THREE.MeshStandardMaterial;
    const baseColor = new THREE.Color(
      stage.color.r / 255,
      stage.color.g / 255,
      stage.color.b / 255
    );

    const lightBoost = (light - 50) / 50;
    const adjustedColor = baseColor.clone().offsetHSL(0, 0, lightBoost * 0.15);
    stemMat.color.copy(adjustedColor);

    this.createLeaves(config, stage, parts.leaves, parts.materials);

    const lightTilt = THREE.MathUtils.degToRad(((light - 50) / 50) * 30);
    parts.group.rotation.z = lightTilt;

    const moistureScale = moisture < 30 ? 0.8 + (moisture / 30) * 0.2 : 1;
    parts.leaves.scale.setScalar(moistureScale);

    const leafDroop = light < 30 ? THREE.MathUtils.degToRad((30 - light) / 30 * 45) : 0;
    parts.leaves.rotation.x = -leafDroop;

    return stage;
  }

  disposePlant(parts: PlantMeshParts): void {
    this.scene.remove(parts.group);
    parts.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    parts.materials.forEach((m) => m.dispose());
  }
}
