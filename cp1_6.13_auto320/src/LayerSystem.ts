import * as THREE from 'three';
import gsap from 'gsap';

export interface LayerData {
  index: number;
  name: string;
  eraName: string;
  innerRadius: number;
  outerRadius: number;
  thickness: number;
  color: THREE.Color;
  baseY: number;
}

export interface LayerRuntime {
  data: LayerData;
  mesh: THREE.Mesh;
  glowInner: THREE.Mesh;
  glowOuter: THREE.Mesh;
  currentOpacity: number;
  currentThicknessScale: number;
  targetOpacity: number;
  targetThicknessScale: number;
}

const GEOLOGICAL_ERAS = [
  { name: '前寒武纪', year: 5.0, color: '#d35400' },
  { name: '寒武纪', year: 4.9, color: '#e67e22' },
  { name: '奥陶纪', year: 4.8, color: '#e67e22' },
  { name: '志留纪', year: 4.4, color: '#f39c12' },
  { name: '泥盆纪', year: 4.2, color: '#f1c40f' },
  { name: '石炭纪', year: 3.6, color: '#9b59b6' },
  { name: '二叠纪', year: 3.0, color: '#8e44ad' },
  { name: '三叠纪', year: 2.5, color: '#3498db' },
  { name: '侏罗纪', year: 2.0, color: '#2980b9' },
  { name: '白垩纪', year: 1.4, color: '#1abc9c' },
  { name: '古近纪', year: 0.66, color: '#16a085' },
  { name: '新近纪-第四纪', year: 0.23, color: '#2ecc71' }
];

export class LayerSystem {
  private scene: THREE.Scene;
  public layers: LayerRuntime[] = [];
  private group: THREE.Group;
  private currentTimeline: number = 0;
  public onLayersChanged?: () => void;

  private warmColor = new THREE.Color('#d35400');
  private midColor1 = new THREE.Color('#e67e22');
  private midColor2 = new THREE.Color('#8e44ad');
  private coolColor = new THREE.Color('#3498db');

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.generateLayers();
  }

  private lerpColor(t: number): THREE.Color {
    if (t < 0.33) {
      return this.warmColor.clone().lerp(this.midColor1, t / 0.33);
    } else if (t < 0.66) {
      return this.midColor1.clone().lerp(this.midColor2, (t - 0.33) / 0.33);
    } else {
      return this.midColor2.clone().lerp(this.coolColor, (t - 0.66) / 0.34);
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private generateLayers(): void {
    const count = GEOLOGICAL_ERAS.length;
    let cumulativeY = 0;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const era = GEOLOGICAL_ERAS[i];

      const innerRadius = this.randomRange(5 + t * 3, 10 + t * 5);
      const outerRadius = this.randomRange(22 + t * 10, 42 + t * 12);
      const thickness = this.randomRange(5, 20);
      const color = this.lerpColor(t);

      const data: LayerData = {
        index: i,
        name: `岩层 ${i + 1}`,
        eraName: era.name,
        innerRadius,
        outerRadius,
        thickness,
        color,
        baseY: cumulativeY
      };

      cumulativeY += thickness * 0.5;

      const layer = this.createLayerMesh(data);
      this.layers.push(layer);
      this.group.add(layer.mesh);
      this.group.add(layer.glowInner);
      this.group.add(layer.glowOuter);
    }

    this.group.position.y = -cumulativeY * 0.45;
  }

  private createRingGeometry(
    innerRadius: number,
    outerRadius: number,
    thickness: number,
    radialSegments: number = 96,
    irregular: boolean = true
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();

    const pointsOuter: THREE.Vector2[] = [];
    const pointsInner: THREE.Vector2[] = [];

    for (let i = 0; i <= radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const noiseOut = irregular
        ? 1 + Math.sin(angle * 3 + i * 0.1) * 0.04 + Math.sin(angle * 7 + i * 0.2) * 0.02
        : 1;
      const noiseIn = irregular
        ? 1 + Math.cos(angle * 5 + i * 0.15) * 0.05 + Math.sin(angle * 11 + i * 0.08) * 0.025
        : 1;
      pointsOuter.push(
        new THREE.Vector2(
          Math.cos(angle) * outerRadius * noiseOut,
          Math.sin(angle) * outerRadius * noiseOut
        )
      );
      pointsInner.push(
        new THREE.Vector2(
          Math.cos(angle) * innerRadius * noiseIn,
          Math.sin(angle) * innerRadius * noiseIn
        )
      );
    }

    shape.moveTo(pointsOuter[0].x, pointsOuter[0].y);
    for (let i = 1; i < pointsOuter.length; i++) {
      shape.lineTo(pointsOuter[i].x, pointsOuter[i].y);
    }

    const hole = new THREE.Path();
    hole.moveTo(pointsInner[0].x, pointsInner[0].y);
    for (let i = 1; i < pointsInner.length; i++) {
      hole.lineTo(pointsInner[i].x, pointsInner[i].y);
    }
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: radialSegments
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.center();

    return geometry;
  }

  private createLayerMesh(data: LayerData): LayerRuntime {
    const geometry = this.createRingGeometry(
      data.innerRadius,
      data.outerRadius,
      data.thickness
    );

    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      transparent: true,
      opacity: 0,
      roughness: 0.55,
      metalness: 0.15,
      emissive: data.color.clone().multiplyScalar(0.15),
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = data.baseY;
    mesh.renderOrder = data.index;

    const glowInnerGeom = this.createRingGeometry(
      data.innerRadius * 0.96,
      data.innerRadius * 1.04,
      data.thickness * 1.15,
      48,
      false
    );
    const glowOuterGeom = this.createRingGeometry(
      data.outerRadius * 0.96,
      data.outerRadius * 1.04,
      data.thickness * 1.15,
      48,
      false
    );

    const glowColor = data.color.clone();
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const glowInner = new THREE.Mesh(glowInnerGeom, glowMaterial.clone());
    glowInner.position.y = data.baseY;
    glowInner.renderOrder = data.index + 100;

    const glowOuter = new THREE.Mesh(glowOuterGeom, glowMaterial.clone());
    glowOuter.position.y = data.baseY;
    glowOuter.renderOrder = data.index + 100;

    return {
      data,
      mesh,
      glowInner,
      glowOuter,
      currentOpacity: 0,
      currentThicknessScale: 1.0,
      targetOpacity: 0,
      targetThicknessScale: 1.0
    };
  }

  public update(timeline: number): void {
    this.currentTimeline = Math.max(0, Math.min(1, timeline));
    const totalLayers = this.layers.length;
    const visibleCountFloat = this.currentTimeline * totalLayers;

    for (let i = 0; i < totalLayers; i++) {
      const layer = this.layers[i];
      const layerProgress = visibleCountFloat - i;

      let targetOpacity = 0;
      let targetThicknessScale = 1.0;

      if (layerProgress <= 0) {
        targetOpacity = 0;
        targetThicknessScale = 1.0;
      } else if (layerProgress >= 1) {
        targetOpacity = 0.68;
        targetThicknessScale = 1.0 + 0.2 * Math.min(1, (this.currentTimeline - (i / totalLayers)) * totalLayers * 0.3 + 0.7);
      } else {
        const eased = 1 - Math.pow(1 - layerProgress, 3);
        targetOpacity = eased * 0.68;
        targetThicknessScale = 1.0 + 0.2 * eased;
      }

      layer.targetOpacity = targetOpacity;
      layer.targetThicknessScale = targetThicknessScale;
      this.applyLayerState(layer, targetOpacity, targetThicknessScale);
    }

    this.animateGroupTilt();
    if (this.onLayersChanged) {
      this.onLayersChanged();
    }
  }

  private applyLayerState(
    layer: LayerRuntime,
    opacity: number,
    thicknessScale: number
  ): void {
    const mat = layer.mesh.material as THREE.MeshStandardMaterial;
    if (Math.abs(mat.opacity - opacity) > 0.001) {
      mat.opacity = opacity;
    }

    const scaleY = thicknessScale;
    if (Math.abs(layer.mesh.scale.y - scaleY) > 0.001) {
      layer.mesh.scale.y = scaleY;
      layer.glowInner.scale.y = scaleY;
      layer.glowOuter.scale.y = scaleY;
    }

    const glowOpacity = opacity * 0.3;
    (layer.glowInner.material as THREE.MeshBasicMaterial).opacity = glowOpacity;
    (layer.glowOuter.material as THREE.MeshBasicMaterial).opacity = glowOpacity;

    layer.currentOpacity = opacity;
    layer.currentThicknessScale = thicknessScale;
  }

  private animateGroupTilt(): void {
    const t = this.currentTimeline;
    this.group.rotation.y = t * Math.PI * 0.35 - Math.PI * 0.12;
  }

  public animateTo(timeline: number): void {
    const self = this;
    gsap.to(
      { t: this.currentTimeline },
      {
        t: Math.max(0, Math.min(1, timeline)),
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: function () {
          self.update((this.targets()[0] as { t: number }).t);
        }
      }
    );
  }

  public getVisibleLayers(): LayerRuntime[] {
    return this.layers.filter((l) => l.currentOpacity > 0.05);
  }

  public getVisibleCount(): number {
    return this.getVisibleLayers().length;
  }

  public getAverageColor(): THREE.Color {
    const visible = this.getVisibleLayers();
    if (visible.length === 0) return new THREE.Color('#8e44ad');

    let r = 0,
      g = 0,
      b = 0;
    let totalWeight = 0;

    for (const layer of visible) {
      const weight = layer.currentOpacity;
      r += layer.data.color.r * weight;
      g += layer.data.color.g * weight;
      b += layer.data.color.b * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return new THREE.Color('#8e44ad');
    return new THREE.Color(r / totalWeight, g / totalWeight, b / totalWeight);
  }

  public getCurrentEraName(): string {
    const idx = Math.min(
      GEOLOGICAL_ERAS.length - 1,
      Math.max(0, Math.floor(this.currentTimeline * GEOLOGICAL_ERAS.length))
    );
    return GEOLOGICAL_ERAS[idx].name;
  }

  public getYearsAgo(): string {
    const t = 1 - this.currentTimeline;
    const years = 5.0 * t;
    if (years < 0.01) return '现代';
    return `${years.toFixed(2)} 亿年前`;
  }

  public getTimelineFromYears(yearsAgo: number): number {
    return Math.max(0, Math.min(1, 1 - yearsAgo / 5.0));
  }

  public getTotalLayerCount(): number {
    return this.layers.length;
  }

  public dispose(): void {
    for (const layer of this.layers) {
      layer.mesh.geometry.dispose();
      (layer.mesh.material as THREE.Material).dispose();
      layer.glowInner.geometry.dispose();
      (layer.glowInner.material as THREE.Material).dispose();
      layer.glowOuter.geometry.dispose();
      (layer.glowOuter.material as THREE.Material).dispose();
    }
    this.scene.remove(this.group);
  }
}

export { GEOLOGICAL_ERAS };
