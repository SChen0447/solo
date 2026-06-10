import * as THREE from 'three';
import { MineScene, GemSpot } from './MineScene';
import { EffectsManager } from './EffectsManager';

export interface GemData {
  id: number;
  mesh: THREE.Mesh;
  color: THREE.Color;
  colorHex: string;
  colorName: string;
  name: string;
  rarity: string;
  size: number;
  layer: number;
  shelfIndex: number;
  floatPhase: number;
  hueOffset: number;
  isResonance: boolean;
  haloMesh?: THREE.Mesh;
}

export interface ConsecutiveColor {
  colorHex: string;
  gems: GemData[];
}

const RARITY_NAMES = ['普通', '稀有', '史诗', '传说'];
const COLOR_NAMES: Record<string, string> = {
  '#ff4466': '红宝石',
  '#4488ff': '蓝宝石',
  '#44ff88': '祖母绿',
  '#aa66ff': '紫水晶',
  '#ff8833': '黄玉',
};

export class GemManager {
  public scene: THREE.Scene;
  public mineScene: MineScene;
  public effectsManager: EffectsManager;
  public gems: GemData[] = [];
  public gemsByLayer: (GemData | null)[][] = [[], [], []];
  public consecutiveColors: ConsecutiveColor[] = [];
  public onScoreUpdate?: (score: number) => void;
  public onGemCountUpdate?: (count: number) => void;
  public onResonanceTrigger?: () => void;
  public onShowInfo?: (gem: GemData, screenX: number, screenY: number) => void;
  public onHideInfo?: () => void;
  public onShelfGlow?: () => void;

  private score: number = 0;
  private nextGemId: number = 0;
  private gemsAnimating: Map<number, {
    targetPos: THREE.Vector3;
    startPos: THREE.Vector3;
    progress: number;
    duration: number;
    type: 'float-up' | 'to-shelf' | 'resonance' | 'fusion';
  }> = new Map();
  private resonanceActive: boolean = false;
  private resonanceGems: GemData[] = [];
  private resonancePhase: number = 0;
  private resonanceTimer: number = 0;

  constructor(scene: THREE.Scene, mineScene: MineScene, effectsManager: EffectsManager) {
    this.scene = scene;
    this.mineScene = mineScene;
    this.effectsManager = effectsManager;
  }

  private createGemGeometry(faces: number = 40): THREE.BufferGeometry {
    const geometry = new THREE.IcosahedronGeometry(0.35, 1);
    const positions = geometry.attributes.position;
    const posArray = positions.array as Float32Array;
    for (let i = 0; i < posArray.length; i += 3) {
      const noise = 0.85 + Math.random() * 0.15;
      posArray[i] *= noise;
      posArray[i + 1] *= noise;
      posArray[i + 2] *= noise;
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  private generateRarity(): { rarity: string; rarityIndex: number } {
    const r = Math.random();
    let rarityIndex = 0;
    if (r < 0.5) rarityIndex = 0;
    else if (r < 0.8) rarityIndex = 1;
    else if (r < 0.95) rarityIndex = 2;
    else rarityIndex = 3;
    return { rarity: RARITY_NAMES[rarityIndex], rarityIndex };
  }

  public digGem(spot: GemSpot): GemData | null {
    if (this.resonanceActive) return null;

    const geometry = this.createGemGeometry();
    const { rarity, rarityIndex } = this.generateRarity();
    const sizeMultiplier = 0.9 + rarityIndex * 0.15;

    const material = new THREE.MeshPhysicalMaterial({
      color: spot.color,
      emissive: spot.color,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(sizeMultiplier);
    mesh.position.copy(spot.position);
    mesh.castShadow = true;

    const colorName = COLOR_NAMES[spot.colorHex] || '宝石';
    const gem: GemData = {
      id: this.nextGemId++,
      mesh,
      color: spot.color.clone(),
      colorHex: spot.colorHex,
      colorName,
      name: `${rarity}${colorName}`,
      rarity,
      size: sizeMultiplier,
      layer: -1,
      shelfIndex: -1,
      floatPhase: Math.random() * Math.PI * 2,
      hueOffset: Math.random() * 360,
      isResonance: false,
    };

    this.gems.push(gem);
    this.scene.add(mesh);

    this.effectsManager.createExplosion(spot.position, spot.color);
    this.effectsManager.createGemParticles(gem);

    const targetPos = spot.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.gemsAnimating.set(gem.id, {
      targetPos,
      startPos: spot.position.clone(),
      progress: 0,
      duration: 0.8,
      type: 'float-up',
    });

    const baseScore = 10 + rarityIndex * 20;
    this.score += baseScore;
    this.onScoreUpdate?.(this.score);
    this.onGemCountUpdate?.(this.gems.length);

    this.checkConsecutiveColor(spot.colorHex, gem);

    return gem;
  }

  private checkConsecutiveColor(colorHex: string, gem: GemData): void {
    if (this.consecutiveColors.length === 0) {
      this.consecutiveColors.push({ colorHex, gems: [gem] });
    } else {
      const last = this.consecutiveColors[this.consecutiveColors.length - 1];
      if (last.colorHex === colorHex) {
        last.gems.push(gem);
        if (last.gems.length >= 3) {
          this.triggerResonance(last.gems.slice(-3));
          last.gems = [];
        }
      } else {
        this.consecutiveColors.push({ colorHex, gems: [gem] });
      }
    }
  }

  private triggerResonance(gems: GemData[]): void {
    this.resonanceActive = true;
    this.resonanceGems = gems;
    this.resonancePhase = 0;
    this.resonanceTimer = 0;

    for (const gem of gems) {
      this.gemsAnimating.set(gem.id, {
        targetPos: new THREE.Vector3(0, 2, 0),
        startPos: gem.mesh.position.clone(),
        progress: 0,
        duration: 0.6,
        type: 'resonance',
      });
    }

    this.effectsManager.createResonanceParticles(new THREE.Vector3(0, 2, 0), gems[0].color);
    this.playResonanceSound();
    this.onResonanceTrigger?.();
  }

  private playResonanceSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [261.63, 329.63, 392.00];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.8);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.8);
      });
    } catch (e) {
    }
  }

  private findShelfSlot(): { layer: number; index: number } | null {
    for (let layer = 0; layer < 3; layer++) {
      for (let idx = 0; idx < 5; idx++) {
        if (!this.gemsByLayer[layer][idx]) {
          return { layer, index: idx };
        }
      }
    }
    return null;
  }

  public moveGemToShelf(gem: GemData): void {
    const slot = this.findShelfSlot();
    if (!slot) return;

    gem.layer = slot.layer;
    gem.shelfIndex = slot.index;
    this.gemsByLayer[slot.layer][slot.index] = gem;

    const targetPos = this.mineScene.getShelfPosition(slot.layer, slot.index);
    this.gemsAnimating.set(gem.id, {
      targetPos,
      startPos: gem.mesh.position.clone(),
      progress: 0,
      duration: 0.5,
      type: 'to-shelf',
    });

    this.onShelfGlow?.();
  }

  private createResonanceGem(gems: GemData[]): GemData {
    const baseGem = gems[0];
    const geometry = this.createGemGeometry(50);
    const material = new THREE.MeshPhysicalMaterial({
      color: baseGem.color,
      emissive: baseGem.color,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.05,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(baseGem.size * 1.5);
    mesh.position.set(0, 2, 0);
    mesh.castShadow = true;

    const haloGeometry = new THREE.TorusGeometry(0.6, 0.03, 8, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: baseGem.color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.set(0, 2, 0);
    mesh.add(halo);

    const gem: GemData = {
      id: this.nextGemId++,
      mesh,
      color: baseGem.color.clone(),
      colorHex: baseGem.colorHex,
      colorName: baseGem.colorName,
      name: `共鸣${baseGem.colorName}`,
      rarity: '传说',
      size: baseGem.size * 1.5,
      layer: 2,
      shelfIndex: 2,
      floatPhase: Math.random() * Math.PI * 2,
      hueOffset: Math.random() * 360,
      isResonance: true,
      haloMesh: halo,
    };

    return gem;
  }

  private finishResonance(): void {
    const newGem = this.createResonanceGem(this.resonanceGems);

    for (const g of this.resonanceGems) {
      if (g.layer >= 0 && g.shelfIndex >= 0) {
        this.gemsByLayer[g.layer][g.shelfIndex] = null;
      }
      this.scene.remove(g.mesh);
      this.effectsManager.removeGemParticles(g);
      const idx = this.gems.indexOf(g);
      if (idx >= 0) this.gems.splice(idx, 1);
    }

    this.gemsByLayer[2][2] = newGem;
    this.gems.push(newGem);
    this.scene.add(newGem.mesh);
    this.effectsManager.createGemParticles(newGem);

    const targetPos = this.mineScene.getShelfPosition(2, 2);
    this.gemsAnimating.set(newGem.id, {
      targetPos,
      startPos: new THREE.Vector3(0, 2, 0),
      progress: 0,
      duration: 0.6,
      type: 'fusion',
    });

    this.score += 250;
    this.onScoreUpdate?.(this.score);

    this.resonanceActive = false;
    this.resonanceGems = [];
    this.onShelfGlow?.();
  }

  public handleClick(raycaster: THREE.Raycaster, camera: THREE.Camera): boolean {
    const clickables = this.gems.filter(g => g.layer >= 0).map(g => g.mesh);
    const hits = raycaster.intersectObjects(clickables);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const gem = this.gems.find(g => g.mesh === hitMesh);
      if (gem) {
        const screenPos = gem.mesh.position.clone().project(camera);
        const screenX = (screenPos.x + 1) / 2 * window.innerWidth;
        const screenY = (-screenPos.y + 1) / 2 * window.innerHeight;
        this.onShowInfo?.(gem, screenX, screenY);
        return true;
      }
    }
    return false;
  }

  public update(time: number, delta: number): void {
    for (const gem of this.gems) {
      const anim = this.gemsAnimating.get(gem.id);
      if (anim) {
        anim.progress += delta;
        const t = Math.min(anim.progress / anim.duration, 1);
        let eased: number;

        if (anim.type === 'float-up') {
          eased = 1 - Math.pow(1 - t, 3);
          const bounce = Math.sin(t * Math.PI) * 0.2;
          const pos = anim.startPos.clone().lerp(anim.targetPos, eased);
          pos.y += bounce;
          gem.mesh.position.copy(pos);
        } else {
          eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          gem.mesh.position.copy(anim.startPos.clone().lerp(anim.targetPos, eased));
        }

        gem.mesh.rotation.y += delta * 2;

        if (t >= 1) {
          if (anim.type === 'float-up') {
            this.moveGemToShelf(gem);
          } else {
            this.gemsAnimating.delete(gem.id);
          }
        }
      } else if (gem.layer >= 0 && !this.resonanceActive) {
        gem.mesh.position.y += Math.sin(time * 2 + gem.floatPhase) * delta * 0.1;
        gem.mesh.rotation.y += delta * 0.5;
        gem.mesh.rotation.x += delta * 0.2;
      }

      const mat = gem.mesh.material as THREE.MeshPhysicalMaterial;
      const hue = (time * 90 + gem.hueOffset) % 360;
      const tempColor = new THREE.Color().setHSL(hue / 360, 0.6, 0.6);
      mat.color.copy(gem.color).lerp(tempColor, 0.25);
      mat.emissive.copy(gem.color).lerp(tempColor, 0.15);
      mat.emissiveIntensity = 0.3 + Math.sin(time * 1.5 + gem.floatPhase) * 0.15;

      if (gem.isResonance && gem.haloMesh) {
        gem.haloMesh.rotation.z += delta * 2;
        gem.haloMesh.rotation.x = Math.sin(time) * 0.3;
        const haloMat = gem.haloMesh.material as THREE.MeshBasicMaterial;
        haloMat.opacity = 0.4 + Math.sin(time * 2) * 0.2;
      }
    }

    if (this.resonanceActive && this.resonanceGems.length === 3) {
      this.resonanceTimer += delta;
      this.resonancePhase += delta * 3;

      const center = new THREE.Vector3(0, 2, 0);
      const radius = 1.2;
      for (let i = 0; i < 3; i++) {
        const angle = this.resonancePhase + (i * Math.PI * 2) / 3;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        this.resonanceGems[i].mesh.position.set(x, center.y + Math.sin(time * 5 + i) * 0.2, z);
        this.resonanceGems[i].mesh.rotation.y += delta * 5;
        this.resonanceGems[i].mesh.rotation.x += delta * 3;
      }

      if (this.resonanceTimer >= 2) {
        this.finishResonance();
      }
    }
  }
}
