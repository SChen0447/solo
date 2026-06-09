import * as THREE from 'three';

export interface GearConfig {
  teeth: number;
  radius: number;
  colorStart: string;
  colorEnd: string;
  diameter: number;
}

export const GEAR_PRESETS: GearConfig[] = [
  { teeth: 16, radius: 40, colorStart: '#CD7F32', colorEnd: '#B8860B', diameter: 80 },
  { teeth: 24, radius: 60, colorStart: '#C47830', colorEnd: '#A87A09', diameter: 120 },
  { teeth: 32, radius: 80, colorStart: '#B87028', colorEnd: '#986808', diameter: 160 },
  { teeth: 40, radius: 100, colorStart: '#A86020', colorEnd: '#885808', diameter: 200 },
  { teeth: 48, radius: 120, colorStart: '#8B4513', colorEnd: '#6B4423', diameter: 240 }
];

export class Gear {
  public mesh: THREE.Group;
  public teeth: number;
  public radius: number;
  public diameter: number;
  public rpm: number = 0;
  public baseRpm: number = 0;
  public direction: 1 | -1 = 1;
  public id: number;
  public isDriving: boolean = false;
  public meshedWith: Gear[] = [];

  private toothHighlight: THREE.Mesh;
  private rotationSpeed: number = 0;
  private shadowOffset: THREE.Mesh;

  private static nextId: number = 1;

  constructor(config: GearConfig) {
    this.id = Gear.nextId++;
    this.teeth = config.teeth;
    this.radius = config.radius;
    this.diameter = config.diameter;
    this.mesh = this.createGearMesh(config);
    this.toothHighlight = this.createToothHighlight();
    this.shadowOffset = this.createShadowLayer();
    this.mesh.add(this.shadowOffset);
    this.mesh.add(this.toothHighlight);
    this.mesh.userData.gear = this;
  }

  private createGearMesh(config: GearConfig): THREE.Group {
    const group = new THREE.Group();
    const toothHeight = config.radius * 0.12;
    const toothWidth = (2 * Math.PI * config.radius) / config.teeth * 0.45;
    const thickness = config.radius * 0.18;

    const bodyRadius = config.radius - toothHeight * 0.5;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    gradient.addColorStop(0, config.colorStart);
    gradient.addColorStop(1, config.colorEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.05})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.moveTo(128 + Math.cos(angle) * 30, 128 + Math.sin(angle) * 30);
      ctx.lineTo(128 + Math.cos(angle) * 120, 128 + Math.sin(angle) * 120);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, thickness, 64);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.85,
      roughness: 0.35
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const toothGeo = new THREE.BoxGeometry(toothWidth, thickness, toothHeight);
    const toothMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.9,
      roughness: 0.3
    });
    for (let i = 0; i < config.teeth; i++) {
      const angle = (i / config.teeth) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.x = Math.cos(angle) * (bodyRadius + toothHeight * 0.45);
      tooth.position.y = Math.sin(angle) * (bodyRadius + toothHeight * 0.45);
      tooth.rotation.z = angle;
      group.add(tooth);
    }

    const hubRadius = bodyRadius * 0.25;
    const hubGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, thickness * 1.3, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a20,
      metalness: 0.7,
      roughness: 0.4
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    group.add(hub);

    const holeGeo = new THREE.CylinderGeometry(hubRadius * 0.4, hubRadius * 0.4, thickness * 1.4, 16);
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      metalness: 0.9,
      roughness: 0.2
    });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.rotation.x = Math.PI / 2;
    group.add(hole);

    const spokeCount = Math.min(6, Math.floor(config.teeth / 6));
    const spokeWidth = thickness * 0.7;
    const spokeHeight = thickness * 0.6;
    const spokeMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.8,
      roughness: 0.35
    });
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeLen = bodyRadius - hubRadius - toothHeight * 0.3;
      const spokeGeo = new THREE.BoxGeometry(spokeLen, spokeWidth, spokeHeight);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.x = Math.cos(angle) * (hubRadius + spokeLen / 2);
      spoke.position.y = Math.sin(angle) * (hubRadius + spokeLen / 2);
      spoke.rotation.z = angle;
      group.add(spoke);
    }

    return group;
  }

  private createToothHighlight(): THREE.Mesh {
    const highlightGeo = new THREE.RingGeometry(
      this.radius * 0.92,
      this.radius * 1.04,
      128
    );
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.rotation.x = -Math.PI / 2;
    highlight.position.z = 0.1;
    return highlight;
  }

  private createShadowLayer(): THREE.Mesh {
    const shadowGeo = new THREE.CircleGeometry(this.radius * 1.1, 64);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.z = -1;
    shadow.position.x = this.radius * 0.04;
    shadow.position.y = -this.radius * 0.04;
    return shadow;
  }

  public setRPM(rpm: number): void {
    this.baseRpm = rpm;
    if (this.isDriving || this.meshedWith.length === 0) {
      this.rpm = rpm;
    }
  }

  public setDirection(dir: 1 | -1): void {
    this.direction = dir;
  }

  public setDriving(isDriving: boolean): void {
    this.isDriving = isDriving;
    if (isDriving) {
      this.rpm = this.baseRpm;
    }
  }

  public update(deltaTime: number, frameCount: number): void {
    this.rotationSpeed = (this.rpm * 2 * Math.PI) / 60;
    this.mesh.rotation.z += this.rotationSpeed * this.direction * deltaTime;

    const highlightOpacity = 0.1 + Math.sin(frameCount * 0.05) * 0.05;
    (this.toothHighlight.material as THREE.MeshBasicMaterial).opacity = highlightOpacity;

    const wobble = Math.sin(frameCount * 0.03) * 0.5;
    this.shadowOffset.position.x = this.radius * 0.04 + wobble;
    this.shadowOffset.position.y = -this.radius * 0.04 - wobble * 0.5;
  }

  public getCircumference(): number {
    return 2 * Math.PI * this.radius;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public setPosition(x: number, y: number): void {
    this.mesh.position.x = x;
    this.mesh.position.y = y;
  }

  public addMesh(gear: Gear): void {
    if (!this.meshedWith.includes(gear)) {
      this.meshedWith.push(gear);
    }
  }

  public removeMesh(gear: Gear): void {
    const idx = this.meshedWith.indexOf(gear);
    if (idx !== -1) {
      this.meshedWith.splice(idx, 1);
    }
  }

  public clearMeshes(): void {
    this.meshedWith = [];
  }

  public getMeshStatusText(): string {
    if (this.meshedWith.length === 0) {
      return '未与任何齿轮啮合';
    }
    const parts: string[] = [];
    for (const m of this.meshedWith) {
      const pos = m.getPosition();
      const myPos = this.getPosition();
      let side = '';
      if (pos.x < myPos.x - 5) side = '左侧';
      else if (pos.x > myPos.x + 5) side = '右侧';
      else if (pos.y < myPos.y - 5) side = '下方';
      else if (pos.y > myPos.y + 5) side = '上方';
      else side = '邻近';
      parts.push(`${side}与#${m.id}齿轮啮合`);
    }
    return parts.join('；');
  }
}

export function createGearMesh(teeth: number, radius: number, color: string): THREE.Group {
  const config: GearConfig = {
    teeth,
    radius,
    colorStart: color,
    colorEnd: color,
    diameter: radius * 2
  };
  const gear = new Gear(config);
  return gear.mesh;
}
