import * as THREE from 'three';
import gsap from 'gsap';

export interface ShardData {
  id: number;
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  homePosition: THREE.Vector3;
  anchorPosition: THREE.Vector2;
  targetRegion: { x: number; y: number; radius: number };
  placed: boolean;
  originalColor: { r: number; g: number; b: number };
  shardIndex: number;
  size: number;
}

export class ShardManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private shards: ShardData[] = [];
  private shardGroup: THREE.Group;
  private anchorMarkers: THREE.Sprite[] = [];
  private selectedShard: ShardData | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private isDragging: boolean = false;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private mirrorRect: { centerX: number; centerY: number; width: number; height: number };
  private audioContext: AudioContext | null = null;
  private onShardPlaced: ((shardId: number, anchorUV: { u: number; v: number }) => void) | null = null;
  private onShardFailed: (() => void) | null = null;
  private onAllPlaced: (() => void) | null = null;
  private hoveredShard: ShardData | null = null;
  private frameTilt: { x: number; y: number } = { x: 0, y: 0 };

  private readonly TOTAL_SHARDS = 12;
  private readonly SNAP_DISTANCE = 0.15;
  private readonly MIRROR_RADIUS_X = 0.6 * 5;
  private readonly MIRROR_RADIUS_Y = 0.4 * 5;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    mirrorRect: { centerX: number; centerY: number; width: number; height: number }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.mirrorRect = mirrorRect;
    this.shardGroup = new THREE.Group();
    this.scene.add(this.shardGroup);
    this.initAudio();
    this.generateShards();
    this.generateAnchorMarkers();
  }

  public setCallbacks(
    onShardPlaced: (shardId: number, anchorUV: { u: number; v: number }) => void,
    onShardFailed: () => void,
    onAllPlaced: () => void
  ) {
    this.onShardPlaced = onShardPlaced;
    this.onShardFailed = onShardFailed;
    this.onAllPlaced = onAllPlaced;
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  private playDingSound() {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.setValueAtTime(1760, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2640, this.audioContext.currentTime + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.8);
  }

  private generateShardTexture(index: number, size: number): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const cx = 128;
    const cy = 128;
    const r = 120;

    const hueStart = 190 + (index * 8) % 40;
    const hueEnd = 260 + (index * 6) % 30;
    const saturation = 70 + (index % 3) * 5;
    const lightness = 75 + (index % 4) * 3;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `hsla(${hueEnd}, ${saturation}%, ${lightness + 5}%, 0.95)`);
    gradient.addColorStop(0.4, `hsla(${hueStart}, ${saturation}%, ${lightness}%, 0.85)`);
    gradient.addColorStop(0.75, `hsla(${hueStart + 10}, ${saturation - 10}%, ${lightness - 5}%, 0.6)`);
    gradient.addColorStop(1, `hsla(${hueEnd}, ${saturation - 15}%, ${lightness - 10}%, 0)`);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.clip();

    this.drawMemorySnippet(ctx, index, canvas.width, canvas.height);
    ctx.restore();

    const haloGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.15);
    haloGrad.addColorStop(0, `hsla(${hueStart}, 80%, 80%, 0.35)`);
    haloGrad.addColorStop(1, `hsla(${hueEnd}, 80%, 80%, 0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 20; i++) {
      const px = cx + (Math.sin(i * 3.7 + index) * r * 0.85);
      const py = cy + (Math.cos(i * 2.3 + index * 1.3) * r * 0.85);
      const pr = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hueStart}, 90%, 90%, ${0.3 + Math.random() * 0.4})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return { canvas, texture };
  }

  private drawMemorySnippet(ctx: CanvasRenderingContext2D, index: number, w: number, h: number) {
    const cx = w / 2;
    const cy = h / 2;
    ctx.save();
    ctx.globalAlpha = 0.55;

    switch (index % 12) {
      case 0:
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#ff9a8b');
        skyGrad.addColorStop(0.5, '#ffb199');
        skyGrad.addColorStop(1, '#ffd6a5');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.arc(cx + 30, cy - 20, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';
        ctx.fill();
        break;
      case 1:
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, h * 0.5, w, h * 0.5);
        ctx.strokeStyle = '#1a3a0a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 40, h * 0.5);
        ctx.quadraticCurveTo(cx, cy - 30, cx + 40, h * 0.5);
        ctx.stroke();
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(cx - 20 + i * 8, cy - 10 - (i % 2) * 8, 3, 2, i * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 2:
        ctx.fillStyle = '#f8edeb';
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.arc(cx, cy + 15, 50, 0, Math.PI * 2);
        ctx.fillStyle = '#eac9c1';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 15, cy, 6, 0, Math.PI * 2);
        ctx.arc(cx + 15, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3a3a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 20, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.strokeStyle = '#c44536';
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      case 3:
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) {
          const sx = Math.random() * w;
          const sy = Math.random() * h;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fill();
        break;
      case 4:
        ctx.fillStyle = '#c9ada7';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9a8c98';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 40, 60, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a4e69';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 25, h * 0.3);
        ctx.lineTo(cx - 15, cy - 5);
        ctx.lineTo(cx + 10, cy - 10);
        ctx.lineTo(cx + 20, h * 0.35);
        ctx.stroke();
        break;
      case 5:
        const petalGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
        petalGrad.addColorStop(0, '#ffc0cb');
        petalGrad.addColorStop(1, '#ff69b4');
        ctx.fillStyle = '#2d4a2d';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((i / 5) * Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(0, -25, 15, 30, 0, 0, Math.PI * 2);
          ctx.fillStyle = petalGrad;
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        break;
      case 6:
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 25; i++) {
          const lx = Math.random() * w;
          const ly = Math.random() * h;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(Math.random() * Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, 3 + Math.random() * 3, 6 + Math.random() * 4, 0, 0, Math.PI * 2);
          const leafColors = ['#dc143c', '#ff4500', '#ff8c00', '#b22222'];
          ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
          ctx.fill();
          ctx.restore();
        }
        break;
      case 7:
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);
        const rainGrad = ctx.createLinearGradient(0, 0, 0, h);
        rainGrad.addColorStop(0, 'rgba(174, 194, 224, 0)');
        rainGrad.addColorStop(1, 'rgba(174, 194, 224, 0.5)');
        ctx.fillStyle = rainGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 30; i++) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 12);
          ctx.stroke();
        }
        break;
      case 8:
        ctx.fillStyle = '#f5e6d3';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#a67c52';
        ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        ctx.strokeStyle = '#5c3a1e';
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        ctx.fillStyle = 'rgba(100, 70, 40, 0.3)';
        ctx.font = 'bold 16px serif';
        ctx.fillText('MEM', w * 0.3, h * 0.5);
        ctx.fillText('ORY', w * 0.35, h * 0.6);
        break;
      case 9:
        ctx.fillStyle = '#b8d4e3';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let c = 0; c < 3; c++) {
          const cxb = 30 + c * 70;
          const cyb = 50 + (c % 2) * 40;
          ctx.beginPath();
          ctx.arc(cxb, cyb, 20, 0, Math.PI * 2);
          ctx.arc(cxb + 18, cyb - 8, 15, 0, Math.PI * 2);
          ctx.arc(cxb + 28, cyb + 5, 18, 0, Math.PI * 2);
          ctx.arc(cxb - 12, cyb + 5, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 10:
        ctx.fillStyle = '#6d6875';
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy + 40);
        ctx.quadraticCurveTo(cx, cy - 60, cx + 50, cy + 40);
        ctx.closePath();
        ctx.fillStyle = '#b5838d';
        ctx.fill();
        ctx.strokeStyle = '#3d3a40';
        ctx.lineWidth = 2;
        ctx.stroke();
        for (let b = 0; b < 5; b++) {
          ctx.beginPath();
          const bx = cx - 30 + b * 15;
          const by = cy + 35 - Math.abs(b - 2) * 12;
          ctx.ellipse(bx, by, 3, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#f4e8c1';
          ctx.fill();
        }
        break;
      case 11:
        const lakeGrad = ctx.createLinearGradient(0, 0, 0, h);
        lakeGrad.addColorStop(0, '#e0fbfc');
        lakeGrad.addColorStop(0.4, '#98c1d9');
        lakeGrad.addColorStop(0.5, '#3d5a80');
        lakeGrad.addColorStop(1, '#293241');
        ctx.fillStyle = lakeGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.45);
        ctx.lineTo(cx * 0.5, h * 0.25);
        ctx.lineTo(cx * 0.8, h * 0.4);
        ctx.lineTo(cx * 1.2, h * 0.2);
        ctx.lineTo(cx * 1.5, h * 0.4);
        ctx.lineTo(w, h * 0.35);
        ctx.lineTo(w, h * 0.5);
        ctx.lineTo(0, h * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#293241';
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  private generateAnchorPositions(): { x: number; y: number; u: number; v: number }[] {
    const positions: { x: number; y: number; u: number; v: number }[] = [];
    const cols = 4;
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const tCol = (col + 0.5) / cols;
        const tRow = (row + 0.5) / rows;
        const angleX = (tCol - 0.5) * Math.PI * 0.7;
        const angleY = (tRow - 0.5) * Math.PI * 0.7;
        const ellipseScaleX = 0.82;
        const ellipseScaleY = 0.82;
        const x = this.mirrorRect.centerX + Math.sin(angleX) * this.MIRROR_RADIUS_X * ellipseScaleX;
        const y = this.mirrorRect.centerY - Math.sin(angleY) * this.MIRROR_RADIUS_Y * ellipseScaleY;
        positions.push({ x, y, u: tCol, v: tRow });
      }
    }
    return positions;
  }

  private generateHomePositions(): { x: number; y: number; z: number }[] {
    const positions: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < this.TOTAL_SHARDS; i++) {
      const angle = (i / this.TOTAL_SHARDS) * Math.PI * 2 + Math.PI * 0.08;
      const radiusVariation = 1 + (Math.sin(i * 2.3) * 0.15);
      const baseRadiusX = 8.5 * radiusVariation;
      const baseRadiusY = 5.2 * radiusVariation;
      let x = this.mirrorRect.centerX + Math.cos(angle) * baseRadiusX;
      let y = this.mirrorRect.centerY + Math.sin(angle) * baseRadiusY;
      const z = 2 + Math.sin(i * 1.7) * 0.5;
      const maxX = 11, minX = -11, maxY = 6.5, minY = -6.5;
      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));
      positions.push({ x, y, z });
    }
    return positions;
  }

  private generateShards() {
    const homePositions = this.generateHomePositions();
    const anchorPositions = this.generateAnchorPositions();

    const indices = Array.from({ length: this.TOTAL_SHARDS }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (let i = 0; i < this.TOTAL_SHARDS; i++) {
      const shardIndex = i;
      const anchorIdx = indices[i];
      const size = 0.35 + (Math.sin(i * 1.9) * 0.5 + 0.5) * 0.45;
      const { texture } = this.generateShardTexture(shardIndex, size);

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      const hp = homePositions[i];
      const ap = anchorPositions[anchorIdx];
      sprite.position.set(hp.x, hp.y, hp.z);
      sprite.scale.set(size, size, 1);
      sprite.renderOrder = 10;
      sprite.userData.shardId = i;

      this.shardGroup.add(sprite);

      this.shards.push({
        id: i,
        sprite,
        texture,
        homePosition: new THREE.Vector3(hp.x, hp.y, hp.z),
        anchorPosition: new THREE.Vector2(ap.x, ap.y),
        targetRegion: { x: ap.u, y: ap.v, radius: 0.12 },
        placed: false,
        originalColor: { r: 0.6, g: 0.7, b: 0.9 },
        shardIndex,
        size,
      });

      gsap.from(sprite.scale, {
        x: 0, y: 0,
        duration: 0.8,
        delay: 0.1 + i * 0.08,
        ease: 'elastic.out(1, 0.6)',
      });
      gsap.from(sprite.position, {
        z: 5,
        duration: 0.6,
        delay: 0.05 + i * 0.05,
        ease: 'power2.out',
      });
    }
  }

  private generateAnchorMarkers() {
    const anchorPositions = this.generateAnchorPositions();
    anchorPositions.forEach((_, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(168, 216, 234, 0)');
      gradient.addColorStop(0.6, 'rgba(168, 216, 234, 0.25)');
      gradient.addColorStop(0.85, 'rgba(168, 216, 234, 0.5)');
      gradient.addColorStop(1, 'rgba(168, 216, 234, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 216, 234, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const marker = new THREE.Sprite(material);
      const ap = anchorPositions[i];
      marker.position.set(ap.x, ap.y, 0.5);
      marker.scale.set(0.7, 0.7, 1);
      marker.renderOrder = 5;
      marker.userData.anchorId = i;
      this.shardGroup.add(marker);
      this.anchorMarkers.push(marker);
    });
  }

  private getMouseWorldPlane(clientX: number, clientY: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, 1);
    const plane = new THREE.Plane(planeNormal, -planePoint.z);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);
    return intersection;
  }

  public onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const sprites = this.shards.filter(s => !s.placed).map(s => s.sprite);
    const intersects = this.raycaster.intersectObjects(sprites, false);

    if (intersects.length > 0) {
      const hitSprite = intersects[0].object as THREE.Sprite;
      const shard = this.shards.find(s => s.sprite === hitSprite);
      if (shard) {
        this.selectedShard = shard;
        this.isDragging = true;
        const worldPos = this.getMouseWorldPlane(event.clientX, event.clientY);
        this.dragOffset.copy(shard.sprite.position).sub(worldPos);
        this.dragOffset.z = 0;
        gsap.to(shard.sprite.scale, {
          x: shard.size * 1.25,
          y: shard.size * 1.25,
          duration: 0.18,
          ease: 'power2.out',
        });
        gsap.to(shard.sprite.position, {
          z: 4,
          duration: 0.18,
          ease: 'power2.out',
        });
        (shard.sprite.material as THREE.SpriteMaterial).opacity = 0.95;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
    }
  }

  public onPointerMove(event: PointerEvent, allowSceneRotate: boolean): { dragging: boolean; sceneRotate: boolean; frameTilt: { x: number; y: number } } {
    let sceneRotate = false;
    if (this.isDragging && this.selectedShard) {
      const worldPos = this.getMouseWorldPlane(event.clientX, event.clientY);
      this.selectedShard.sprite.position.x = worldPos.x + this.dragOffset.x;
      this.selectedShard.sprite.position.y = worldPos.y + this.dragOffset.y;
      this.updateAnchorMarkerVisibility();
      return { dragging: true, sceneRotate: false, frameTilt: { x: 0, y: 0 } };
    } else if (allowSceneRotate) {
      sceneRotate = true;
    }

    if (!this.isDragging) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const sprites = this.shards.filter(s => !s.placed).map(s => s.sprite);
      const intersects = this.raycaster.intersectObjects(sprites, false);
      if (intersects.length > 0) {
        const hitSprite = intersects[0].object as THREE.Sprite;
        const shard = this.shards.find(s => s.sprite === hitSprite);
        if (shard && this.hoveredShard !== shard) {
          if (this.hoveredShard) {
            gsap.to(this.hoveredShard.sprite.scale, {
              x: this.hoveredShard.size,
              y: this.hoveredShard.size,
              duration: 0.2,
              ease: 'power2.out',
            });
          }
          this.hoveredShard = shard;
          gsap.to(shard.sprite.scale, {
            x: shard.size * 1.12,
            y: shard.size * 1.12,
            duration: 0.2,
            ease: 'power2.out',
          });
          this.renderer.domElement.style.cursor = 'grab';
        }
      } else if (this.hoveredShard) {
        gsap.to(this.hoveredShard.sprite.scale, {
          x: this.hoveredShard.size,
          y: this.hoveredShard.size,
          duration: 0.2,
          ease: 'power2.out',
        });
        this.hoveredShard = null;
        if (!allowSceneRotate) {
          this.renderer.domElement.style.cursor = 'default';
        } else {
          this.renderer.domElement.style.cursor = 'move';
        }
      }

      if (allowSceneRotate) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.frameTilt.x = normY * 3;
        this.frameTilt.y = -normX * 3;
      } else {
        this.frameTilt.x = 0;
        this.frameTilt.y = 0;
      }
    }

    return { dragging: this.isDragging, sceneRotate, frameTilt: this.frameTilt };
  }

  private updateAnchorMarkerVisibility() {
    if (!this.selectedShard) {
      this.anchorMarkers.forEach(m => {
        gsap.to(m.material, { opacity: 0, duration: 0.25, ease: 'power2.out' });
      });
      return;
    }

    const pos = this.selectedShard.sprite.position;
    let nearestIdx = -1;
    let nearestDist = Infinity;
    const anchorPositions = this.generateAnchorPositions();

    anchorPositions.forEach((ap, i) => {
      const dx = pos.x - ap.x;
      const dy = pos.y - ap.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });

    const selectedAnchorIdx = this.shards.indexOf(this.selectedShard);
    const markerToShow = nearestDist < 1.2 ? selectedAnchorIdx : -1;

    this.anchorMarkers.forEach((m, i) => {
      const targetOp = (i === markerToShow) ? 0.85 : 0;
      const mat = m.material as THREE.SpriteMaterial;
      if (Math.abs(mat.opacity - targetOp) > 0.05) {
        gsap.to(mat, { opacity: targetOp, duration: 0.2, ease: 'power2.out' });
      }
    });
  }

  public onPointerUp(_event: PointerEvent) {
    if (!this.isDragging || !this.selectedShard) {
      this.isDragging = false;
      this.selectedShard = null;
      return;
    }

    const shard = this.selectedShard;
    const pos = shard.sprite.position;
    const dx = pos.x - shard.anchorPosition.x;
    const dy = pos.y - shard.anchorPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.SNAP_DISTANCE * 6) {
      this.placeShard(shard);
    } else {
      this.failShard(shard);
    }

    this.isDragging = false;
    this.selectedShard = null;
    this.updateAnchorMarkerVisibility();
    this.renderer.domElement.style.cursor = 'default';
  }

  private placeShard(shard: ShardData) {
    shard.placed = true;
    this.playDingSound();

    gsap.to(shard.sprite.position, {
      x: shard.anchorPosition.x,
      y: shard.anchorPosition.y,
      z: 0.3,
      duration: 0.35,
      ease: 'power3.inOut',
    });
    gsap.to(shard.sprite.scale, {
      x: shard.size * 0.85,
      y: shard.size * 0.85,
      duration: 0.35,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.to((shard.sprite.material as THREE.SpriteMaterial), {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
        setTimeout(() => {
          shard.sprite.visible = false;
        }, 400);
      },
    });

    if (this.onShardPlaced) {
      const uv = this.shardToUV(shard);
      this.onShardPlaced(shard.id, uv);
    }

    if (this.shards.every(s => s.placed) && this.onAllPlaced) {
      this.onAllPlaced();
    }
  }

  private failShard(shard: ShardData) {
    if (this.onShardFailed) {
      this.onShardFailed();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const orig = this.generateShardTexture(shard.shardIndex, shard.size);
    ctx.drawImage(orig.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 50, 80, 0.5)';
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalCompositeOperation = 'source-over';
    const glow = ctx.createRadialGradient(128, 128, 80, 128, 128, 130);
    glow.addColorStop(0, 'rgba(255, 50, 80, 0)');
    glow.addColorStop(0.7, 'rgba(255, 50, 80, 0.6)');
    glow.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(128, 128, 130, 0, Math.PI * 2);
    ctx.fill();
    const tempTex = new THREE.CanvasTexture(canvas);
    tempTex.needsUpdate = true;
    (shard.sprite.material as THREE.SpriteMaterial).map = tempTex;

    setTimeout(() => {
      (shard.sprite.material as THREE.SpriteMaterial).map = shard.texture;
    }, 200);

    const hp = shard.homePosition;
    gsap.to(shard.sprite.position, {
      x: hp.x,
      y: hp.y,
      z: hp.z,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)',
    });
    gsap.to(shard.sprite.scale, {
      x: shard.size,
      y: shard.size,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)',
    });
  }

  private shardToUV(shard: ShardData): { u: number; v: number } {
    return { u: shard.targetRegion.x, v: shard.targetRegion.y };
  }

  public reset() {
    this.shards.forEach(shard => {
      shard.placed = false;
      shard.sprite.visible = true;
      (shard.sprite.material as THREE.SpriteMaterial).opacity = 1;
      const hp = shard.homePosition;
      gsap.to(shard.sprite.position, {
        x: hp.x,
        y: hp.y,
        z: hp.z,
        duration: 0.6,
        ease: 'power3.inOut',
      });
      gsap.to(shard.sprite.scale, {
        x: shard.size,
        y: shard.size,
        duration: 0.6,
        ease: 'power3.inOut',
      });
    });
    this.anchorMarkers.forEach(m => {
      (m.material as THREE.SpriteMaterial).opacity = 0;
    });
  }

  public update(delta: number) {
    const time = performance.now() * 0.001;
    this.shards.forEach((shard, i) => {
      if (!shard.placed && this.selectedShard !== shard) {
        shard.sprite.position.y = shard.homePosition.y + Math.sin(time * 0.8 + i * 0.7) * 0.12;
        shard.sprite.position.x = shard.homePosition.x + Math.cos(time * 0.6 + i * 0.5) * 0.06;
        shard.sprite.rotation = Math.sin(time * 0.5 + i) * 0.03;
      }
    });
    void delta;
  }

  public getPlacedCount(): number {
    return this.shards.filter(s => s.placed).length;
  }

  public getTotalShards(): number {
    return this.TOTAL_SHARDS;
  }

  public allPlaced(): boolean {
    return this.shards.every(s => s.placed);
  }
}
