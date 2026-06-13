import * as THREE from 'three';

export interface GlassPanel {
  mesh: THREE.Mesh;
  index: number;
  layer: number;
  sector: number;
  baseColor: THREE.Color;
  targetOpacity: number;
  isBreaking: boolean;
  breakTime: number;
  regrowTime: number;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  noteFrequency: number;
  state: 'idle' | 'breaking' | 'regrowing';
  inwardOffset: number;
}

export interface TowerOptions {
  hexRadius: number;
  viewportHeight: number;
}

const WARM_COLORS = [
  new THREE.Color('#ff6b6b'),
  new THREE.Color('#ffa94d'),
  new THREE.Color('#ffd43b'),
  new THREE.Color('#f06595'),
  new THREE.Color('#845ef7'),
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteFrequency(index: number): number {
  const totalSemitones = index;
  return 440 * Math.pow(2, (totalSemitones - 9) / 12);
}

export class GlassTower {
  group: THREE.Group;
  panels: GlassPanel[] = [];
  baseColor = new THREE.Color('#cce7ff');
  edgeColor = new THREE.Color('#7ec8e3');
  options: TowerOptions;
  private edgeLines: THREE.LineSegments[] = [];

  constructor(options: TowerOptions) {
    this.options = options;
    this.group = new THREE.Group();
    this.buildTower();
  }

  private buildTower(): void {
    const { hexRadius, viewportHeight } = this.options;
    const towerHeight = viewportHeight * 0.7;
    const layerCount = 6;
    const panelsPerLayer = 9;
    const panelHeight = towerHeight / layerCount;
    const panelThickness = 2;
    const layerStartY = -towerHeight / 2 + panelHeight / 2;

    for (let layer = 0; layer < layerCount; layer++) {
      for (let sector = 0; sector < panelsPerLayer; sector++) {
        const index = layer * panelsPerLayer + sector;
        const y = layerStartY + layer * panelHeight;
        const hexAngleStep = (Math.PI * 2) / panelsPerLayer;
        const angle = sector * hexAngleStep - Math.PI / 2;
        
        const sectorAngle = hexAngleStep * 0.92;
        const panelWidth = 2 * hexRadius * Math.tan(sectorAngle / 2);

        const geometry = new THREE.BoxGeometry(panelWidth, panelHeight * 0.92, panelThickness);

        const material = new THREE.MeshPhongMaterial({
          color: this.baseColor.clone(),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          shininess: 100,
          specular: new THREE.Color(0x888888),
        });

        const mesh = new THREE.Mesh(geometry, material);

        const radius = hexRadius + panelThickness / 2;
        const posX = Math.cos(angle) * radius;
        const posZ = Math.sin(angle) * radius;
        mesh.position.set(posX, y, posZ);
        mesh.rotation.y = angle + Math.PI / 2;

        mesh.userData.panelIndex = index;

        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: this.edgeColor,
          transparent: true,
          opacity: 0.8,
        });
        const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
        lineSegments.position.copy(mesh.position);
        lineSegments.rotation.copy(mesh.rotation);
        this.edgeLines.push(lineSegments);
        this.group.add(lineSegments);

        this.group.add(mesh);

        const noteIndex = this.getMappedNote(index);
        this.panels.push({
          mesh,
          index,
          layer,
          sector,
          baseColor: this.baseColor.clone(),
          targetOpacity: 0.5,
          isBreaking: false,
          breakTime: 0,
          regrowTime: 0,
          originalPosition: mesh.position.clone(),
          originalRotation: mesh.rotation.clone(),
          noteFrequency: getNoteFrequency(noteIndex),
          state: 'idle',
          inwardOffset: 0,
        });
      }
    }
  }

  private getMappedNote(panelIndex: number): number {
    const c3Midi = 48;
    const f7Midi = 89;
    const totalNotes = 54;
    const range = f7Midi - c3Midi;
    const midi = c3Midi + Math.round((panelIndex / (totalNotes - 1)) * range);
    return midi - 69 + 12;
  }

  getPanelByMesh(mesh: THREE.Mesh): GlassPanel | undefined {
    return this.panels.find(p => p.mesh === mesh);
  }

  getPanelByIndex(index: number): GlassPanel | undefined {
    return this.panels[index];
  }

  breakPanel(panel: GlassPanel): { frequency: number; position: THREE.Vector3; color: THREE.Color } {
    if (panel.state !== 'idle') {
      panel.state = 'breaking';
      panel.isBreaking = true;
      panel.breakTime = 0;
      const warmColor = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
      const material = panel.mesh.material as THREE.MeshPhongMaterial;
      material.color.copy(warmColor);
      material.opacity = 1.0;
      panel.inwardOffset = 0;

      const edgeLine = this.edgeLines[panel.index];
      const edgeMat = edgeLine.material as THREE.LineBasicMaterial;
      edgeMat.color.copy(warmColor);
      edgeMat.opacity = 1.0;

      return {
        frequency: panel.noteFrequency,
        position: panel.mesh.position.clone(),
        color: warmColor.clone(),
      };
    }
    return {
      frequency: 0,
      position: new THREE.Vector3(),
      color: new THREE.Color(),
    };
  }

  update(delta: number, brokenPanels: Set<number>): number {
    let newlyCompleted = 0;
    for (const panel of this.panels) {
      const material = panel.mesh.material as THREE.MeshPhongMaterial;
      const edgeLine = this.edgeLines[panel.index];
      const edgeMat = edgeLine.material as THREE.LineBasicMaterial;

      if (panel.state === 'breaking') {
        panel.breakTime += delta;
        const breakDuration = 0.8;
        const inwardDuration = 0.3;
        const t1 = Math.min(panel.breakTime / breakDuration, 1);
        const tIn = Math.min(panel.breakTime / inwardDuration, 1);
        const inwardDist = 15;
        panel.inwardOffset = tIn * inwardDist;

        const inwardDir = new THREE.Vector3()
          .copy(panel.originalPosition)
          .normalize()
          .negate();
        panel.mesh.position.copy(panel.originalPosition).add(
          inwardDir.multiplyScalar(panel.inwardOffset)
        );
        edgeLine.position.copy(panel.mesh.position);

        material.opacity = 1.0 - t1;
        edgeMat.opacity = 1.0 - t1;
        panel.mesh.scale.setScalar(1 - t1 * 0.3);
        edgeLine.scale.setScalar(1 - t1 * 0.3);

        if (panel.breakTime >= breakDuration) {
          panel.state = 'regrowing';
          panel.regrowTime = 0;
          panel.mesh.visible = false;
          edgeLine.visible = false;
          brokenPanels.add(panel.index);
          newlyCompleted++;
        }
      } else if (panel.state === 'regrowing') {
        panel.regrowTime += delta;
        const regrowDelay = 0.5;
        const fadeInDuration = 2.0;

        if (panel.regrowTime >= regrowDelay) {
          if (!panel.mesh.visible === false) {
            panel.mesh.visible = true;
            edgeLine.visible = true;
            panel.inwardOffset = 0;
            panel.mesh.position.copy(panel.originalPosition);
            edgeLine.position.copy(panel.mesh.position);
            material.color.copy(this.baseColor);
            edgeMat.color.copy(this.edgeColor);
            panel.mesh.scale.setScalar(1);
            edgeLine.scale.setScalar(1);
          }
          const fadeT = Math.min((panel.regrowTime - regrowDelay) / fadeInDuration, 1);
          const opacity = 0.2 + fadeT * 0.3;
          material.opacity = opacity;
          edgeMat.opacity = 0.3 + fadeT * 0.5;
          panel.targetOpacity = 0.5;
          if (panel.regrowTime >= regrowDelay + fadeInDuration) {
            panel.state = 'idle';
            panel.isBreaking = false;
            brokenPanels.delete(panel.index);
          }
        }
      }
    }
    return newlyCompleted;
  }

  getBrokenCount(): number {
    return this.panels.filter(p => p.state !== 'idle').length;
  }

  getActiveBrokenCount(): number {
    return this.panels.filter(p => p.state === 'regrowing' || (p.state === 'breaking' && p.breakTime >= 0.8)).length;
  }

  dispose(): void {
    this.panels.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.edgeLines.forEach(l => {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
  }
}
