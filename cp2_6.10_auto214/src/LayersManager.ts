import * as THREE from 'three';
import { LAYER_PROFILES, TEMPERATURE_CURVE, TOTAL_HEIGHT_KM, LayerProfile, TempPoint } from './profiles';

export interface LayerObject {
  id: string;
  profile: LayerProfile;
  mesh: THREE.Mesh;
  boundaryLines: THREE.Line[];
  temperatureLine: THREE.Line;
  baseOpacity: number;
  currentOpacity: number;
  labelSprite?: THREE.Sprite;
}

export class LayersManager {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private layerObjects: LayerObject[] = [];
  private readonly INNER_RADIUS = 3;
  private readonly OUTER_RADIUS = 6;
  private readonly WORLD_HEIGHT = 20;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  private altitudeToY(altitudeKm: number): number {
    const ratio = altitudeKm / TOTAL_HEIGHT_KM;
    return -this.WORLD_HEIGHT / 2 + ratio * this.WORLD_HEIGHT;
  }

  private createLayerMesh(profile: LayerProfile): THREE.Mesh {
    const yStart = this.altitudeToY(profile.minAltitude);
    const yEnd = this.altitudeToY(Math.min(profile.maxAltitude, TOTAL_HEIGHT_KM));
    const height = yEnd - yStart;

    const geometry = new THREE.CylinderGeometry(
      this.OUTER_RADIUS,
      this.OUTER_RADIUS,
      height,
      48,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    );

    const color = new THREE.Color(profile.color[0], profile.color[1], profile.color[2]);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: profile.color[3],
      side: THREE.DoubleSide,
      emissive: new THREE.Color(profile.emissive[0], profile.emissive[1], profile.emissive[2]),
      emissiveIntensity: 0.3,
      depthWrite: false,
      shininess: 20
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = yStart + height / 2;
    mesh.userData.layerId = profile.id;
    mesh.userData.isLayer = true;
    return mesh;
  }

  private createBoundaryLine(altitudeKm: number): THREE.Line {
    const y = this.altitudeToY(altitudeKm);
    const segments = 48;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / segments;
      points.push(new THREE.Vector3(
        Math.cos(angle) * (this.OUTER_RADIUS + 0.02),
        y,
        Math.sin(angle) * (this.OUTER_RADIUS + 0.02)
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });

    return new THREE.Line(geometry, material);
  }

  private createTemperatureLine(profile: LayerProfile): THREE.Line {
    const layerPoints: TempPoint[] = TEMPERATURE_CURVE.filter(
      (p) => p.altitude >= profile.minAltitude && p.altitude <= Math.min(profile.maxAltitude, TOTAL_HEIGHT_KM)
    );

    if (layerPoints.length === 0) {
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.LineBasicMaterial({ color: 0xff4444 });
      return new THREE.Line(geom, mat);
    }

    const allTemps = TEMPERATURE_CURVE.map((p) => p.temperature);
    const minTemp = Math.min(...allTemps);
    const maxTemp = Math.max(...allTemps);
    const tempRange = maxTemp - minTemp;

    const innerR = this.INNER_RADIUS + 0.3;
    const outerR = this.OUTER_RADIUS - 0.3;
    const radialRange = outerR - innerR;

    const points: THREE.Vector3[] = [];
    for (const p of layerPoints) {
      const tempNorm = p.temperature - minTemp;
      const r = innerR + (tempNorm / tempRange) * radialRange;
      const y = this.altitudeToY(p.altitude);
      const angle = -Math.PI / 2 + Math.PI * 0.85;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    line.userData.isTemperatureLine = true;
    return line;
  }

  private createLabelSprite(profile: LayerProfile): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(profile.name, canvas.width / 2, 28);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`${profile.minAltitude}-${profile.maxAltitude} km`, canvas.width / 2, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);

    const midY = this.altitudeToY((profile.minAltitude + Math.min(profile.maxAltitude, TOTAL_HEIGHT_KM)) / 2);
    sprite.position.set(0, midY, -this.OUTER_RADIUS + 1.5);

    return sprite;
  }

  build(): LayerObject[] {
    this.layerObjects = [];

    for (const profile of LAYER_PROFILES) {
      const maxAlt = Math.min(profile.maxAltitude, TOTAL_HEIGHT_KM);

      if (maxAlt <= profile.minAltitude) continue;

      const mesh = this.createLayerMesh(profile);
      this.group.add(mesh);

      const boundaryLines: THREE.Line[] = [];
      const bottomLine = this.createBoundaryLine(profile.minAltitude);
      const topLine = this.createBoundaryLine(maxAlt);
      boundaryLines.push(bottomLine, topLine);
      this.group.add(bottomLine);
      this.group.add(topLine);

      const temperatureLine = this.createTemperatureLine(profile);
      this.group.add(temperatureLine);

      const labelSprite = this.createLabelSprite(profile);
      this.group.add(labelSprite);

      this.layerObjects.push({
        id: profile.id,
        profile,
        mesh,
        boundaryLines,
        temperatureLine,
        baseOpacity: profile.color[3],
        currentOpacity: profile.color[3],
        labelSprite
      });
    }

    return this.layerObjects;
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layerObjects.find((l) => l.id === layerId);
    if (!layer) return;

    const material = layer.mesh.material as THREE.MeshPhongMaterial;
    material.opacity = opacity;
    layer.currentOpacity = opacity;

    const lineMaterial = layer.temperatureLine.material as THREE.LineBasicMaterial;
    lineMaterial.opacity = opacity * 0.9;

    for (const bl of layer.boundaryLines) {
      (bl.material as THREE.LineBasicMaterial).opacity = Math.max(0.15, opacity * 0.7);
    }

    if (layer.labelSprite && layer.labelSprite.material) {
      (layer.labelSprite.material as THREE.SpriteMaterial).opacity = Math.min(1, opacity * 1.5);
    }
  }

  highlightLayer(layerId: string, highlighted: boolean): void {
    const layer = this.layerObjects.find((l) => l.id === layerId);
    if (!layer) return;

    const material = layer.mesh.material as THREE.MeshPhongMaterial;
    if (highlighted) {
      material.opacity = 0.6;
      material.emissiveIntensity = 0.6;
    } else {
      material.opacity = layer.baseOpacity;
      material.emissiveIntensity = 0.3;
    }
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    const layer = this.layerObjects.find((l) => l.id === layerId);
    if (!layer) return;

    layer.mesh.visible = visible;
    layer.temperatureLine.visible = visible;
    if (layer.labelSprite) layer.labelSprite.visible = visible;
    for (const bl of layer.boundaryLines) {
      bl.visible = visible;
    }
  }

  updateTemperaturePulse(time: number): void {
    for (const layer of this.layerObjects) {
      const pulse = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * Math.PI));
      const material = layer.temperatureLine.material as THREE.LineBasicMaterial;
      material.opacity = pulse * layer.currentOpacity;
    }
  }

  getLayerObjects(): LayerObject[] {
    return this.layerObjects;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    for (const layer of this.layerObjects) {
      layer.mesh.geometry.dispose();
      (layer.mesh.material as THREE.Material).dispose();
      layer.temperatureLine.geometry.dispose();
      (layer.temperatureLine.material as THREE.Material).dispose();
      for (const bl of layer.boundaryLines) {
        bl.geometry.dispose();
        (bl.material as THREE.Material).dispose();
      }
      if (layer.labelSprite) {
        const sm = layer.labelSprite.material as THREE.SpriteMaterial;
        sm.map?.dispose();
        sm.dispose();
      }
    }
    this.scene.remove(this.group);
  }
}
