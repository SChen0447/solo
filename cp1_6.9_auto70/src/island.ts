import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

interface ChimePiece {
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  hue: number;
  frequency: number;
  pulsePhase: number;
  swayPhase: number;
  swayOffset: number;
  isHovered: boolean;
  hoverTime: number;
  resonanceTime: number;
}

interface WindChime {
  group: THREE.Group;
  pieces: ChimePiece[];
  swayAngle: number;
  swayDirection: THREE.Vector2;
  swayVelocity: number;
  isResonating: boolean;
  resonanceStartTime: number;
  basePosition: THREE.Vector3;
}

interface Island {
  group: THREE.Group;
  rock: THREE.Mesh;
  vegetation: THREE.Group;
  chime: WindChime;
  position: THREE.Vector3;
}

export class IslandManager {
  public group: THREE.Group;
  public islands: Island[] = [];
  public bridges: THREE.Line[] = [];
  public bridgeGroup: THREE.Group;
  public audioContext: AudioContext | null = null;
  public hueShift: THREE.Color = new THREE.Color(0xffffff);
  public windStrength: number = 1.0;
  public interactiveMeshes: THREE.Mesh[] = [];
  private bridgePhase: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.bridgeGroup = new THREE.Group();
    this.group.add(this.bridgeGroup);
  }

  public initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(frequency: number, duration: number = 0.5, volume: number = 0.1, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  public playChimeSwoosh(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15 * this.windStrength, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  }

  public playHoverTone(frequency: number): void {
    this.playTone(frequency * 2, 0.2, 0.08, 'sine');
  }

  public playClickChord(baseFreq: number): void {
    const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.8, 0.1, 'triangle'), i * 100);
    });
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(color1, color2, t);
  }

  private createRockBase(size: number): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(size, 2);
    const positions = geo.attributes.position;
    const colors: number[] = [];
    const warmColor = new THREE.Color('#e67e22');
    const coolColor = new THREE.Color('#8e44ad');

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const nx = noise3D(x * 2, y * 2, z * 2) * 0.02;
      const ny = noise3D(x * 2 + 100, y * 2 + 100, z * 2) * 0.02;
      const nz = noise3D(x * 2 + 200, y * 2, z * 2 + 200) * 0.02;

      const offset = (Math.random() - 0.5) * 0.2;
      positions.setX(i, x + x * offset + nx);
      positions.setY(i, y + y * offset + ny - Math.abs(y) * 0.15);
      positions.setZ(i, z + z * offset + nz);

      const t = (y / size + 1) / 2;
      const c = this.lerpColor(warmColor, coolColor, 1 - t);
      colors.push(c.r, c.g, c.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  private createVegetation(islandSize: number): THREE.Group {
    const group = new THREE.Group();
    const treeCount = Math.floor(6 + Math.random() * 5);
    const green1 = new THREE.Color('#2ecc71');
    const green2 = new THREE.Color('#27ae60');

    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * islandSize * 0.5;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;

      const trunkHeight = 0.3 + Math.random() * 0.5;
      const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, trunkHeight, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkHeight / 2 + islandSize * 0.5;
      tree.add(trunk);

      const foliageColor = this.lerpColor(green1, green2, Math.random());
      const foliageCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < foliageCount; j++) {
        const fSize = 0.2 + Math.random() * 0.3;
        const foliageGeo = new THREE.IcosahedronGeometry(fSize, 0);
        const foliageMat = new THREE.MeshStandardMaterial({
          color: foliageColor,
          roughness: 0.7,
          flatShading: true
        });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = trunkHeight + islandSize * 0.5 + j * 0.2 + Math.random() * 0.1;
        foliage.scale.set(1 + Math.random() * 0.3, 0.8 + Math.random() * 0.4, 1 + Math.random() * 0.3);
        foliage.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        tree.add(foliage);
      }

      tree.position.set(tx, 0, tz);
      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.scale.setScalar(0.7 + Math.random() * 0.6);
      group.add(tree);
    }

    return group;
  }

  private createHexCrystal(color: THREE.Color): THREE.Mesh {
    const shape = new THREE.Shape();
    const radius = 0.15;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    });

    return new THREE.Mesh(geo, mat);
  }

  private createWindChime(islandSize: number, pos: THREE.Vector3): WindChime {
    const group = new THREE.Group();
    const pieces: ChimePiece[] = [];
    const pieceCount = Math.floor(5 + Math.random() * 3);

    const colors = [
      new THREE.Color('#e74c3c'),
      new THREE.Color('#f1c40f'),
      new THREE.Color('#3498db')
    ];

    const baseFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

    const stringMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.6 });

    for (let i = 0; i < pieceCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)].clone();
      const piece = this.createHexCrystal(color);
      const yOffset = -0.4 - i * 0.35;
      const xOffset = (Math.random() - 0.5) * 0.15;
      const zOffset = (Math.random() - 0.5) * 0.15;

      const stringPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(xOffset, yOffset, zOffset)
      ];
      const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPoints);
      const stringLine = new THREE.Line(stringGeo, stringMat);
      group.add(stringLine);

      piece.position.set(xOffset, yOffset, zOffset);
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * 0.2);
      piece.userData.chimeIndex = i;
      piece.userData.isChimePiece = true;

      const chimePiece: ChimePiece = {
        mesh: piece,
        baseColor: color.clone(),
        hue: Math.random(),
        frequency: baseFreqs[i % baseFreqs.length] * (1 + Math.floor(i / baseFreqs.length)),
        pulsePhase: Math.random() * Math.PI * 2,
        swayPhase: Math.random() * Math.PI * 2,
        swayOffset: i * 0.3,
        isHovered: false,
        hoverTime: 0,
        resonanceTime: -1
      };

      pieces.push(chimePiece);
      group.add(piece);
      this.interactiveMeshes.push(piece);
    }

    group.position.set(0, -islandSize * 0.8, 0);

    return {
      group,
      pieces,
      swayAngle: 0,
      swayDirection: new THREE.Vector2(1, 0),
      swayVelocity: 0,
      isResonating: false,
      resonanceStartTime: 0,
      basePosition: pos.clone()
    };
  }

  private createBridge(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 3 + Math.random() * 2;

    const curve = new THREE.QuadraticBezierCurve3(
      start.clone(),
      mid,
      end.clone()
    );

    const points = curve.getPoints(50);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6
    });

    const line = new THREE.Line(geo, mat);
    (line as any).basePhase = Math.random() * Math.PI * 2;
    return line;
  }

  public createIslands(count: number): void {
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 8 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 4;
      positions.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      const size = 1.2 + Math.random() * 1.5;

      const islandGroup = new THREE.Group();
      islandGroup.position.copy(pos);

      const rock = this.createRockBase(size);
      islandGroup.add(rock);

      const vegetation = this.createVegetation(size);
      islandGroup.add(vegetation);

      const chime = this.createWindChime(size, pos);
      islandGroup.add(chime.group);

      this.group.add(islandGroup);

      this.islands.push({
        group: islandGroup,
        rock,
        vegetation,
        chime,
        position: pos.clone()
      });
    }

    for (let i = 0; i < this.islands.length; i++) {
      for (let j = i + 1; j < this.islands.length; j++) {
        const dist = this.islands[i].position.distanceTo(this.islands[j].position);
        if (dist < 18) {
          const bridge = this.createBridge(
            this.islands[i].position,
            this.islands[j].position
          );
          this.bridges.push(bridge);
          this.bridgeGroup.add(bridge);
        }
      }
    }
  }

  public applyWind(force: THREE.Vector2): void {
    const strength = force.length();
    if (strength < 0.01) return;
    const dir = force.clone().normalize();

    for (const island of this.islands) {
      const chime = island.chime;
      chime.swayDirection.lerp(dir, 0.3);
      chime.swayVelocity = Math.min(chime.swayVelocity + strength * 0.5 * this.windStrength, 0.5);
    }

    if (strength > 0.1) {
      this.playChimeSwoosh();
    }
  }

  public handleHover(mesh: THREE.Mesh, isHovering: boolean): void {
    for (const island of this.islands) {
      for (const piece of island.chime.pieces) {
        if (piece.mesh === mesh) {
          piece.isHovered = isHovering;
          piece.hoverTime = 0;
          if (isHovering) {
            this.playHoverTone(piece.frequency);
          }
          return;
        }
      }
    }
  }

  public handleClick(mesh: THREE.Mesh): void {
    for (const island of this.islands) {
      for (let i = 0; i < island.chime.pieces.length; i++) {
        const piece = island.chime.pieces[i];
        if (piece.mesh === mesh) {
          island.chime.isResonating = true;
          island.chime.resonanceStartTime = performance.now();
          this.playClickChord(piece.frequency);
          return;
        }
      }
    }
  }

  public resetChimes(): void {
    const colors = [
      new THREE.Color('#e74c3c'),
      new THREE.Color('#f1c40f'),
      new THREE.Color('#3498db')
    ];
    const baseFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

    for (const island of this.islands) {
      for (let i = 0; i < island.chime.pieces.length; i++) {
        const piece = island.chime.pieces[i];
        const newColor = colors[Math.floor(Math.random() * colors.length)].clone();
        piece.baseColor.copy(newColor);
        piece.frequency = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * (1 + Math.floor(Math.random() * 2));
        piece.pulsePhase = Math.random() * Math.PI * 2;
        piece.mesh.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => {
          piece.mesh.scale.set(1, 1, 1);
        }, 200);
      }
    }
  }

  public update(time: number, delta: number): void {
    this.bridgePhase += delta * 2;
    for (let i = 0; i < this.bridges.length; i++) {
      const bridge = this.bridges[i];
      const mat = bridge.material as THREE.LineBasicMaterial;
      const phase = (bridge as any).basePhase || 0;
      mat.opacity = 0.4 + 0.5 * Math.abs(Math.sin(this.bridgePhase + phase));
    }

    for (const island of this.islands) {
      const chime = island.chime;

      if (chime.swayVelocity > 0) {
        chime.swayVelocity -= delta * 0.8;
        if (chime.swayVelocity < 0) chime.swayVelocity = 0;
      }

      const targetAngle = chime.swayVelocity * 30 * (Math.PI / 180) * this.windStrength;
      chime.swayAngle += (targetAngle - chime.swayAngle) * delta * 3;
      chime.swayAngle = Math.max(-0.52, Math.min(0.52, chime.swayAngle));

      const swayX = chime.swayDirection.x * chime.swayAngle;
      const swayZ = chime.swayDirection.y * chime.swayAngle;
      chime.group.rotation.z = -swayX;
      chime.group.rotation.x = swayZ;

      for (let i = 0; i < chime.pieces.length; i++) {
        const piece = chime.pieces[i];

        piece.mesh.rotation.y += delta * 0.5;
        piece.mesh.rotation.z = Math.sin(time * 2 + piece.swayPhase + piece.swayOffset) * 0.1 + swayX * 0.3;

        let pulse = 0.3 + 0.15 * Math.sin(time * 1.5 + piece.pulsePhase);

        if (piece.isHovered) {
          piece.hoverTime += delta;
          pulse = 0.8 + 0.3 * Math.sin(time * 8);
          if (piece.hoverTime > 2) {
            piece.isHovered = false;
            piece.hoverTime = 0;
          }
        }

        if (chime.isResonating) {
          const elapsed = (time * 1000 - chime.resonanceStartTime) / 1000;
          const pieceDelay = i * 0.1;
          if (elapsed >= pieceDelay && elapsed < pieceDelay + 0.3) {
            const t = (elapsed - pieceDelay) / 0.3;
            pulse = 1.0 * Math.sin(t * Math.PI);
          }
          if (elapsed > chime.pieces.length * 0.1 + 0.5) {
            chime.isResonating = false;
          }
        }

        const mat = piece.mesh.material as THREE.MeshStandardMaterial;
        const finalColor = piece.baseColor.clone();
        if (this.hueShift.getHex() !== 0xffffff) {
          finalColor.lerp(this.hueShift, 0.5);
        }
        mat.color.copy(finalColor);
        mat.emissive.copy(finalColor);
        mat.emissiveIntensity = pulse;
      }
    }
  }
}
