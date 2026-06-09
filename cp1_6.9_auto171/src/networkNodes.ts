import * as THREE from 'three';

const NODE_COUNT = 100;
const MAX_CONNECT_DISTANCE = 4;
const MAX_LINKS = 500;
const DRIFT_SPEED = 0.05;
const SPHERE_RADIUS = 8;
const RIPPLE_MAX_RADIUS = 12;
const RIPPLE_DURATION = 0.3;

interface NodeData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseSize: number;
  brightness: number;
  blinkTimer: number;
  blinkPeriod: number;
  isConnected: boolean;
  pulseBrightness: number;
}

export class NetworkNodes {
  private scene: THREE.Scene;
  private nodes: THREE.Points;
  private nodeGeometry: THREE.BufferGeometry;
  private nodeMaterial: THREE.PointsMaterial;

  private links: THREE.LineSegments;
  private linkGeometry: THREE.BufferGeometry;
  private linkMaterial: THREE.LineBasicMaterial;

  private ripples: THREE.Mesh[] = [];
  private rippleData: { mesh: THREE.Mesh; age: number; active: boolean }[] = [];

  private nodeData: NodeData[] = [];
  private nodePositions: Float32Array;
  private nodeColors: Float32Array;
  private nodeSizes: Float32Array;

  private linkPositions: Float32Array;
  private linkColors: Float32Array;
  private activeLinkCount: number = 0;

  private workingVector = new THREE.Vector3();
  private workingVector2 = new THREE.Vector3();

  private time: number = 0;
  private wasAtMaxRadius: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.nodeGeometry = new THREE.BufferGeometry();
    this.nodeMaterial = new THREE.PointsMaterial({
      size: 3,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.nodePositions = new Float32Array(NODE_COUNT * 3);
    this.nodeColors = new Float32Array(NODE_COUNT * 3);
    this.nodeSizes = new Float32Array(NODE_COUNT);

    this.initializeNodes();

    this.nodeGeometry.setAttribute('position', new THREE.BufferAttribute(this.nodePositions, 3));
    this.nodeGeometry.setAttribute('color', new THREE.BufferAttribute(this.nodeColors, 3));
    this.nodeGeometry.setAttribute('size', new THREE.BufferAttribute(this.nodeSizes, 1));

    this.nodes = new THREE.Points(this.nodeGeometry, this.nodeMaterial);
    this.scene.add(this.nodes);

    this.linkGeometry = new THREE.BufferGeometry();
    this.linkMaterial = new THREE.LineBasicMaterial({
      color: 0x33ffaa,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.linkPositions = new Float32Array(MAX_LINKS * 2 * 3);
    this.linkColors = new Float32Array(MAX_LINKS * 2 * 3);

    this.linkGeometry.setAttribute('position', new THREE.BufferAttribute(this.linkPositions, 3));
    this.linkGeometry.setAttribute('color', new THREE.BufferAttribute(this.linkColors, 3));
    this.linkGeometry.setDrawRange(0, 0);

    this.links = new THREE.LineSegments(this.linkGeometry, this.linkMaterial);
    this.scene.add(this.links);

    this.initializeRipples();
  }

  private initializeNodes(): void {
    for (let i = 0; i < NODE_COUNT; i++) {
      const radius = Math.random() * SPHERE_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const position = new THREE.Vector3(x, y, z);

      const vTheta = Math.random() * Math.PI * 2;
      const vPhi = Math.acos(2 * Math.random() - 1);
      const velocity = new THREE.Vector3(
        Math.sin(vPhi) * Math.cos(vTheta),
        Math.sin(vPhi) * Math.sin(vTheta),
        Math.cos(vPhi)
      ).multiplyScalar(DRIFT_SPEED);

      const baseSize = 3 + Math.random() * 5;
      const blinkPeriod = 0.5 + Math.random() * 1.5;

      this.nodeData.push({
        position,
        velocity,
        baseSize,
        brightness: 1.0,
        blinkTimer: Math.random() * blinkPeriod,
        blinkPeriod,
        isConnected: false,
        pulseBrightness: 1.0
      });

      this.nodePositions[i * 3] = x;
      this.nodePositions[i * 3 + 1] = y;
      this.nodePositions[i * 3 + 2] = z;

      this.nodeColors[i * 3] = 1;
      this.nodeColors[i * 3 + 1] = 1;
      this.nodeColors[i * 3 + 2] = 1;

      this.nodeSizes[i] = baseSize;
    }
  }

  private initializeRipples(): void {
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.RingGeometry(0, 0.3, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x88ddff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.ripples.push(mesh);
      this.rippleData.push({ mesh, age: RIPPLE_DURATION, active: false });
    }
  }

  private triggerRipple(): void {
    for (const ripple of this.rippleData) {
      if (!ripple.active) {
        ripple.active = true;
        ripple.age = 0;
        ripple.mesh.visible = true;
        ripple.mesh.scale.set(1, 1, 1);
        (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        break;
      }
    }
  }

  public update(deltaTime: number, breathingRadius: number, maxRadius: number, minRadius: number): void {
    this.time += deltaTime;

    const atMaxRadius = breathingRadius >= maxRadius - 0.1;
    if (atMaxRadius && !this.wasAtMaxRadius) {
      this.triggerRipple();
      for (const node of this.nodeData) {
        node.pulseBrightness = 1.5;
      }
    }
    this.wasAtMaxRadius = atMaxRadius;

    for (const ripple of this.rippleData) {
      if (ripple.active) {
        ripple.age += deltaTime;
        const progress = ripple.age / RIPPLE_DURATION;
        if (progress >= 1) {
          ripple.active = false;
          ripple.mesh.visible = false;
        } else {
          const currentRadius = progress * RIPPLE_MAX_RADIUS;
          ripple.mesh.scale.set(currentRadius, currentRadius, 1);
          (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress);
        }
      }
    }

    const radiusScale = breathingRadius / ((maxRadius + minRadius) / 2);

    for (let i = 0; i < NODE_COUNT; i++) {
      const node = this.nodeData[i];
      const i3 = i * 3;

      node.position.addScaledVector(node.velocity, deltaTime);

      const dist = node.position.length();
      const maxDist = breathingRadius * 0.9;
      if (dist > maxDist) {
        node.position.normalize().multiplyScalar(maxDist);
        node.velocity.negate();
      } else if (dist < 1) {
        node.position.normalize().multiplyScalar(1);
        node.velocity.negate();
      }

      this.nodePositions[i3] = node.position.x * radiusScale;
      this.nodePositions[i3 + 1] = node.position.y * radiusScale;
      this.nodePositions[i3 + 2] = node.position.z * radiusScale;

      if (!node.isConnected) {
        node.blinkTimer += deltaTime;
        if (node.blinkTimer >= node.blinkPeriod) {
          node.blinkTimer = 0;
        }
        const blinkProgress = (node.blinkTimer / node.blinkPeriod) * Math.PI * 2;
        node.brightness = 0.1 + (Math.sin(blinkProgress) + 1) * 0.25;
      } else {
        node.brightness = 0.6;
      }

      if (node.pulseBrightness > 1.0) {
        node.pulseBrightness = Math.max(1.0, node.pulseBrightness - deltaTime * 3);
      }

      const finalBrightness = Math.min(node.brightness * node.pulseBrightness, 1.2);
      this.nodeColors[i3] = finalBrightness;
      this.nodeColors[i3 + 1] = finalBrightness;
      this.nodeColors[i3 + 2] = finalBrightness;

      this.nodeSizes[i] = node.baseSize * radiusScale;
    }

    this.updateLinks(breathingRadius);

    (this.nodeGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.nodeGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.nodeGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.linkGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.linkGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateLinks(breathingRadius: number): void {
    this.activeLinkCount = 0;

    for (const node of this.nodeData) {
      node.isConnected = false;
    }

    const scaleFactor = breathingRadius / 8;
    const maxDist = MAX_CONNECT_DISTANCE * scaleFactor;

    for (let i = 0; i < NODE_COUNT && this.activeLinkCount < MAX_LINKS; i++) {
      for (let j = i + 1; j < NODE_COUNT && this.activeLinkCount < MAX_LINKS; j++) {
        const nodeA = this.nodeData[i];
        const nodeB = this.nodeData[j];

        this.workingVector.copy(nodeA.position);
        this.workingVector2.copy(nodeB.position);
        const dist = this.workingVector.distanceTo(this.workingVector2);

        if (dist < maxDist) {
          nodeA.isConnected = true;
          nodeB.isConnected = true;

          const distFactor = 1 - (dist / maxDist);
          const lineWidth = 0.5 + distFactor * 2.5;
          const opacity = 0.15 * (0.3 + distFactor * 0.7);

          const idx = this.activeLinkCount * 2 * 3;
          this.linkPositions[idx] = nodeA.position.x;
          this.linkPositions[idx + 1] = nodeA.position.y;
          this.linkPositions[idx + 2] = nodeA.position.z;
          this.linkPositions[idx + 3] = nodeB.position.x;
          this.linkPositions[idx + 4] = nodeB.position.y;
          this.linkPositions[idx + 5] = nodeB.position.z;

          const r = 0.2 * opacity / 0.15;
          const g = 1.0 * opacity / 0.15;
          const b = 0.7 * opacity / 0.15;
          this.linkColors[idx] = r;
          this.linkColors[idx + 1] = g;
          this.linkColors[idx + 2] = b;
          this.linkColors[idx + 3] = r;
          this.linkColors[idx + 4] = g;
          this.linkColors[idx + 5] = b;

          void lineWidth;
          this.activeLinkCount++;
        }
      }
    }

    this.linkGeometry.setDrawRange(0, this.activeLinkCount * 2);
    this.linkMaterial.opacity = 0.15;
  }

  public dispose(): void {
    this.nodeGeometry.dispose();
    this.nodeMaterial.dispose();
    this.linkGeometry.dispose();
    this.linkMaterial.dispose();
    for (const ripple of this.ripples) {
      ripple.geometry.dispose();
      (ripple.material as THREE.Material).dispose();
      this.scene.remove(ripple);
    }
    this.scene.remove(this.nodes);
    this.scene.remove(this.links);
  }
}
