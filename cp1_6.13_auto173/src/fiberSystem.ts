import * as THREE from 'three';

const FIBER_COUNT = 30;
const NODES_PER_FIBER = 60;
const TOTAL_NODES = FIBER_COUNT * NODES_PER_FIBER;
const NODE_RADIUS = 2.5;
const MAX_DRAG_DISTANCE = 150;
const ELASTICITY = 0.4;
const DAMPING = 0.7;
const GLOSS_PERIOD = 3;
const GLOSS_SPEED = 50;
const GLOSS_HUE_OFFSET = 30;
const ORBIT_RADIUS = 200;
const ORBIT_ANGULAR_SPEED = 0.3;
const LIGHT_COLORS = [0xff3333, 0xffdd44, 0x33ff33, 0x3399ff, 0xaa66ff];

interface NodeData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  fiberIndex: number;
  nodeIndex: number;
  isDragging: boolean;
  dragIntensity: number;
  isReturning: boolean;
  returnStartTime: number;
  highlightIntensity: number;
}

interface OrbitingLight {
  mesh: THREE.Mesh;
  angle: number;
  elevation: number;
  isFixed: boolean;
  fixedEndTime: number;
  light: THREE.PointLight;
}

export class FiberSystem {
  private nodes: NodeData[] = [];
  private nodeMeshes!: THREE.InstancedMesh;
  private fiberLines: THREE.Line[] = [];
  private orbitingLights: OrbitingLight[] = [];
  private dummy: THREE.Object3D;
  private colors: Float32Array;
  private viewportHeight: number = 800;
  private fiberHeight: number = 600;
  private nodeSpacing: number = 10;
  private baseNodeSpacing: number = 10;
  private time: number = 0;
  private yawAngle: number = 0;
  private targetYawAngle: number = 0;
  private zoomLevel: number = 1;
  private group: THREE.Group;

  constructor(scene: THREE.Scene, _camera: THREE.PerspectiveCamera, viewportHeight: number) {
    this.viewportHeight = viewportHeight;
    this.dummy = new THREE.Object3D();
    this.colors = new Float32Array(TOTAL_NODES * 3);
    this.group = new THREE.Group();
    scene.add(this.group);

    this.calculateDimensions();
    this.initializeNodes();
    this.createNodeMeshes();
    this.createFiberLines();
    this.createOrbitingLights();
  }

  private calculateDimensions(): void {
    this.fiberHeight = Math.max(this.viewportHeight * 0.8, 600);
    this.baseNodeSpacing = this.fiberHeight / (NODES_PER_FIBER - 1);
    this.nodeSpacing = this.baseNodeSpacing;
  }

  private initializeNodes(): void {
    const startColor = new THREE.Color(0x00ffff);
    const endColor = new THREE.Color(0xff00ff);

    for (let fiberIndex = 0; fiberIndex < FIBER_COUNT; fiberIndex++) {
      const angleOffset = (fiberIndex / FIBER_COUNT) * Math.PI * 2;
      const radiusOffset = 8 + Math.random() * 12;
      const colorOffset = (Math.random() - 0.5) * 0.4;
      const fiberX = Math.cos(angleOffset) * radiusOffset;
      const fiberZ = Math.sin(angleOffset) * radiusOffset * 0.5;

      for (let nodeIndex = 0; nodeIndex < NODES_PER_FIBER; nodeIndex++) {
        const t = nodeIndex / (NODES_PER_FIBER - 1);
        const y = this.fiberHeight / 2 - t * this.fiberHeight;
        
        const swayOffset = Math.sin(t * Math.PI * 2 + fiberIndex) * 3;
        const x = fiberX + swayOffset;
        const z = fiberZ + Math.cos(t * Math.PI + fiberIndex) * 2;

        const basePosition = new THREE.Vector3(x, y, z);
        
        const colorT = THREE.MathUtils.clamp(t + colorOffset, 0, 1);
        const baseColor = new THREE.Color().lerpColors(startColor, endColor, colorT);

        const node: NodeData = {
          basePosition: basePosition.clone(),
          currentPosition: basePosition.clone(),
          targetPosition: basePosition.clone(),
          velocity: new THREE.Vector3(),
          baseColor: baseColor.clone(),
          currentColor: baseColor.clone(),
          fiberIndex,
          nodeIndex,
          isDragging: false,
          dragIntensity: 0,
          isReturning: false,
          returnStartTime: 0,
          highlightIntensity: 0
        };

        this.nodes.push(node);
      }
    }
  }

  private createNodeMeshes(): void {
    const geometry = new THREE.SphereGeometry(NODE_RADIUS, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.2,
      emissiveIntensity: 0.5
    });

    this.nodeMeshes = new THREE.InstancedMesh(geometry, material, TOTAL_NODES);
    this.nodeMeshes.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    this.group.add(this.nodeMeshes);
  }

  private createFiberLines(): void {
    const curvePoints = 4;
    
    for (let fiberIndex = 0; fiberIndex < FIBER_COUNT; fiberIndex++) {
      const points: THREE.Vector3[] = [];
      const fiberStart = fiberIndex * NODES_PER_FIBER;
      
      for (let i = 0; i < NODES_PER_FIBER - 1; i++) {
        const node1 = this.nodes[fiberStart + i];
        const node2 = this.nodes[fiberStart + i + 1];
        
        if (i === 0) {
          points.push(node1.currentPosition.clone());
        }
        
        for (let t = 1; t <= curvePoints; t++) {
          const alpha = t / curvePoints;
          const controlPoint = new THREE.Vector3().lerpVectors(
            node1.currentPosition,
            node2.currentPosition,
            alpha
          );
          points.push(controlPoint);
        }
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6
      });

      const line = new THREE.Line(geometry, material);
      this.fiberLines.push(line);
      this.group.add(line);
    }
  }

  private createOrbitingLights(): void {
    const lightGeometry = new THREE.SphereGeometry(4, 16, 16);

    for (let i = 0; i < 6; i++) {
      const color = LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
      
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7
      });

      const mesh = new THREE.Mesh(lightGeometry, lightMaterial);
      
      const light = new THREE.PointLight(color, 1, 100, 2);
      mesh.add(light);

      const angle = (i / 6) * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.6;

      const orbitingLight: OrbitingLight = {
        mesh,
        angle,
        elevation,
        isFixed: false,
        fixedEndTime: 0,
        light
      };

      this.updateOrbitingLightPosition(orbitingLight);
      this.group.add(mesh);
      this.orbitingLights.push(orbitingLight);
    }
  }

  private updateOrbitingLightPosition(light: OrbitingLight): void {
    const x = Math.cos(light.angle) * Math.cos(light.elevation) * ORBIT_RADIUS;
    const y = Math.sin(light.elevation) * ORBIT_RADIUS;
    const z = Math.sin(light.angle) * Math.cos(light.elevation) * ORBIT_RADIUS;
    light.mesh.position.set(x, y, z);
  }

  public update(deltaTime: number, currentTime: number): void {
    this.time = currentTime;
    
    this.updateNodePhysics(deltaTime);
    this.updateGlossEffect();
    this.updateNodeMeshes();
    this.updateFiberLines();
    this.updateOrbitingLights(deltaTime, currentTime);
    this.applyLocalLighting();
    this.updateRotation(deltaTime);
  }

  private updateNodePhysics(deltaTime: number): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      if (node.isReturning && !node.isDragging) {
        const elapsed = this.time - node.returnStartTime;
        const duration = 0.8;
        
        if (elapsed >= duration) {
          node.isReturning = false;
          node.currentPosition.copy(node.basePosition);
          node.targetPosition.copy(node.basePosition);
          node.velocity.set(0, 0, 0);
        } else {
          const t = elapsed / duration;
          const easeT = Math.sin(t * Math.PI / 2);
          node.currentPosition.lerpVectors(
            node.targetPosition,
            node.basePosition,
            easeT
          );
        }
      } else if (!node.isDragging) {
        const force = new THREE.Vector3()
          .subVectors(node.basePosition, node.currentPosition)
          .multiplyScalar(ELASTICITY);
        
        node.velocity.add(force.multiplyScalar(deltaTime * 60));
        node.velocity.multiplyScalar(DAMPING);
        
        node.currentPosition.add(node.velocity.clone().multiplyScalar(deltaTime * 60));
      }

      if (node.highlightIntensity > 0) {
        node.highlightIntensity = Math.max(0, node.highlightIntensity - deltaTime * 2);
      }
    }

    this.updateBottomSway();
  }

  private updateBottomSway(): void {
    const swayAmount = Math.sin(this.time * 2) * 1.5;
    
    for (let fiberIndex = 0; fiberIndex < FIBER_COUNT; fiberIndex++) {
      const fiberStart = fiberIndex * NODES_PER_FIBER;
      for (let nodeIndex = NODES_PER_FIBER - 5; nodeIndex < NODES_PER_FIBER; nodeIndex++) {
        const node = this.nodes[fiberStart + nodeIndex];
        if (!node.isDragging && !node.isReturning) {
          const t = (nodeIndex - (NODES_PER_FIBER - 5)) / 5;
          const sway = swayAmount * t * (1 + Math.sin(fiberIndex + this.time) * 0.3);
          node.currentPosition.x = node.basePosition.x + sway;
          node.currentPosition.z = node.basePosition.z + sway * 0.5;
        }
      }
    }
  }

  private updateGlossEffect(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      
      const baseHSL = { h: 0, s: 0, l: 0 };
      node.baseColor.getHSL(baseHSL);
      
      const timeWave = Math.cos((this.time / GLOSS_PERIOD) * Math.PI * 2);
      const hueOffset = (timeWave * GLOSS_HUE_OFFSET) / 360;
      
      const positionAlongFiber = node.nodeIndex * this.nodeSpacing;
      const flowWave = Math.sin((positionAlongFiber - this.time * GLOSS_SPEED) * 0.02);
      
      const newHue = (baseHSL.h + hueOffset + flowWave * 0.05) % 1;
      const saturation = Math.min(1, baseHSL.s + 0.1 * Math.abs(flowWave));
      const lightness = Math.min(0.9, baseHSL.l + 0.15 * (0.5 + flowWave * 0.5));
      
      node.currentColor.setHSL(
        THREE.MathUtils.clamp(newHue, 0, 1),
        THREE.MathUtils.clamp(saturation, 0.4, 1),
        THREE.MathUtils.clamp(lightness, 0.3, 0.9)
      );

      if (node.highlightIntensity > 0) {
        const highlightColor = new THREE.Color(0xffffff);
        node.currentColor.lerp(highlightColor, node.highlightIntensity);
      }
    }
  }

  private updateNodeMeshes(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      
      const scale = node.highlightIntensity > 0.1 ? 1 + node.highlightIntensity * 0.5 : 1;
      
      this.dummy.position.copy(node.currentPosition);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      
      this.nodeMeshes.setMatrixAt(i, this.dummy.matrix);
      
      const colorIndex = i * 3;
      this.colors[colorIndex] = node.currentColor.r;
      this.colors[colorIndex + 1] = node.currentColor.g;
      this.colors[colorIndex + 2] = node.currentColor.b;
    }
    
    this.nodeMeshes.instanceMatrix.needsUpdate = true;
    (this.nodeMeshes.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  private updateFiberLines(): void {
    for (let fiberIndex = 0; fiberIndex < FIBER_COUNT; fiberIndex++) {
      const line = this.fiberLines[fiberIndex];
      const positions = line.geometry.attributes.position.array as Float32Array;
      const colors = (line.geometry.attributes.color?.array as Float32Array) || 
        new Float32Array(positions.length);
      
      const fiberStart = fiberIndex * NODES_PER_FIBER;
      let posIndex = 0;
      let colorIndex = 0;
      
      for (let nodeIndex = 0; nodeIndex < NODES_PER_FIBER - 1; nodeIndex++) {
        const node1 = this.nodes[fiberStart + nodeIndex];
        const node2 = this.nodes[fiberStart + nodeIndex + 1];
        
        if (nodeIndex === 0) {
          positions[posIndex++] = node1.currentPosition.x;
          positions[posIndex++] = node1.currentPosition.y;
          positions[posIndex++] = node1.currentPosition.z;
          
          colors[colorIndex++] = node1.currentColor.r;
          colors[colorIndex++] = node1.currentColor.g;
          colors[colorIndex++] = node1.currentColor.b;
        }
        
        for (let t = 1; t <= 4; t++) {
          const alpha = t / 4;
          const x = THREE.MathUtils.lerp(node1.currentPosition.x, node2.currentPosition.x, alpha);
          const y = THREE.MathUtils.lerp(node1.currentPosition.y, node2.currentPosition.y, alpha);
          const z = THREE.MathUtils.lerp(node1.currentPosition.z, node2.currentPosition.z, alpha);
          
          positions[posIndex++] = x;
          positions[posIndex++] = y;
          positions[posIndex++] = z;
          
          const r = THREE.MathUtils.lerp(node1.currentColor.r, node2.currentColor.r, alpha);
          const g = THREE.MathUtils.lerp(node1.currentColor.g, node2.currentColor.g, alpha);
          const b = THREE.MathUtils.lerp(node1.currentColor.b, node2.currentColor.b, alpha);
          
          colors[colorIndex++] = r;
          colors[colorIndex++] = g;
          colors[colorIndex++] = b;
        }
      }
      
      line.geometry.attributes.position.needsUpdate = true;
      if (!line.geometry.attributes.color) {
        line.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      } else {
        line.geometry.attributes.color.needsUpdate = true;
      }
    }
  }

  private updateOrbitingLights(deltaTime: number, currentTime: number): void {
    for (const light of this.orbitingLights) {
      if (light.isFixed) {
        if (currentTime > light.fixedEndTime) {
          light.isFixed = false;
          (light.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
        }
      } else {
        light.angle += ORBIT_ANGULAR_SPEED * deltaTime;
        this.updateOrbitingLightPosition(light);
      }
    }
  }

  private applyLocalLighting(): void {
    for (const node of this.nodes) {
      let totalLightIntensity = 0;
      
      for (const orbitingLight of this.orbitingLights) {
        const distance = node.currentPosition.distanceTo(orbitingLight.mesh.position);
        if (distance < 80) {
          const intensity = (1 - distance / 80) * 0.5;
          totalLightIntensity += intensity;
          
          const lightColor = new THREE.Color(orbitingLight.light.color);
          node.currentColor.lerp(lightColor, intensity * 0.3);
        }
      }
      
      node.currentColor.multiplyScalar(1 + totalLightIntensity * 0.5);
    }
  }

  private updateRotation(deltaTime: number): void {
    this.yawAngle += (this.targetYawAngle - this.yawAngle) * deltaTime * 5;
    this.group.rotation.y = this.yawAngle;
  }

  public applyDrag(
    fiberIndex: number,
    nodeIndex: number,
    worldPosition: THREE.Vector3,
    dragDelta: THREE.Vector3
  ): void {
    const node = this.getNode(fiberIndex, nodeIndex);
    if (!node) return;

    node.isDragging = true;
    node.isReturning = false;
    node.highlightIntensity = 1;

    const dragVector = dragDelta.clone();
    const currentDragDistance = dragVector.length();
    
    if (currentDragDistance > MAX_DRAG_DISTANCE) {
      dragVector.normalize().multiplyScalar(MAX_DRAG_DISTANCE);
    }

    node.currentPosition.copy(worldPosition);
    node.targetPosition.copy(node.currentPosition);

    this.propagateDrag(fiberIndex, nodeIndex, dragVector);
  }

  private propagateDrag(
    fiberIndex: number,
    nodeIndex: number,
    dragVector: THREE.Vector3
  ): void {
    const fiberStart = fiberIndex * NODES_PER_FIBER;
    
    for (let offset = 1; offset <= 3; offset++) {
      const aboveIndex = fiberStart + nodeIndex - offset;
      const belowIndex = fiberStart + nodeIndex + offset;
      
      const influence = 1 - offset * 0.25;
      const influencedDrag = dragVector.clone().multiplyScalar(influence);
      
      if (aboveIndex >= fiberStart) {
        const aboveNode = this.nodes[aboveIndex];
        if (!aboveNode.isDragging) {
          aboveNode.currentPosition.copy(aboveNode.basePosition).add(influencedDrag);
          aboveNode.targetPosition.copy(aboveNode.currentPosition);
        }
      }
      
      if (belowIndex < fiberStart + NODES_PER_FIBER) {
        const belowNode = this.nodes[belowIndex];
        if (!belowNode.isDragging) {
          belowNode.currentPosition.copy(belowNode.basePosition).add(influencedDrag);
          belowNode.targetPosition.copy(belowNode.currentPosition);
        }
      }
    }
  }

  public releaseDrag(fiberIndex: number, nodeIndex: number): void {
    const node = this.getNode(fiberIndex, nodeIndex);
    if (!node) return;

    node.isDragging = false;
    node.isReturning = true;
    node.returnStartTime = this.time;
    node.targetPosition.copy(node.currentPosition);

    const fiberStart = fiberIndex * NODES_PER_FIBER;
    for (let offset = 1; offset <= 3; offset++) {
      const aboveIndex = fiberStart + nodeIndex - offset;
      const belowIndex = fiberStart + nodeIndex + offset;
      
      if (aboveIndex >= fiberStart) {
        const aboveNode = this.nodes[aboveIndex];
        if (!aboveNode.isDragging) {
          aboveNode.isReturning = true;
          aboveNode.returnStartTime = this.time;
          aboveNode.targetPosition.copy(aboveNode.currentPosition);
        }
      }
      
      if (belowIndex < fiberStart + NODES_PER_FIBER) {
        const belowNode = this.nodes[belowIndex];
        if (!belowNode.isDragging) {
          belowNode.isReturning = true;
          belowNode.returnStartTime = this.time;
          belowNode.targetPosition.copy(belowNode.currentPosition);
        }
      }
    }
  }

  public setZoom(zoomLevel: number, zoomSpeed: number): void {
    const clampedZoom = THREE.MathUtils.clamp(zoomLevel, 0.5, 3);
    this.zoomLevel = clampedZoom;
    
    const spacingFactor = 0.5 + (clampedZoom - 0.5) / 2.5 * 0.5;
    this.nodeSpacing = this.baseNodeSpacing * spacingFactor;
    
    const rotationMagnitude = Math.min(Math.abs(zoomSpeed) * 0.5, 0.26);
    const rotationDirection = zoomSpeed > 0 ? 1 : -1;
    this.targetYawAngle = rotationDirection * rotationMagnitude;
    
    this.updateNodePositionsForZoom();
  }

  private updateNodePositionsForZoom(): void {
    const factor = this.nodeSpacing / this.baseNodeSpacing;
    
    for (let fiberIndex = 0; fiberIndex < FIBER_COUNT; fiberIndex++) {
      const fiberStart = fiberIndex * NODES_PER_FIBER;
      const centerY = 0;
      
      for (let nodeIndex = 0; nodeIndex < NODES_PER_FIBER; nodeIndex++) {
        const node = this.nodes[fiberStart + nodeIndex];
        const relativeY = node.basePosition.y - centerY;
        const newY = centerY + relativeY * factor;
        
        node.basePosition.y = newY;
        if (!node.isDragging && !node.isReturning) {
          node.currentPosition.y = newY;
        }
      }
    }
  }

  public handleLightClick(worldPosition: THREE.Vector3, currentTime: number): boolean {
    for (const light of this.orbitingLights) {
      const distance = light.mesh.position.distanceTo(worldPosition);
      if (distance < 15) {
        light.isFixed = true;
        light.fixedEndTime = currentTime + 5;
        (light.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        return true;
      }
    }
    return false;
  }

  public getNode(fiberIndex: number, nodeIndex: number): NodeData | null {
    const index = fiberIndex * NODES_PER_FIBER + nodeIndex;
    if (index >= 0 && index < this.nodes.length) {
      return this.nodes[index];
    }
    return null;
  }

  public getAllNodes(): NodeData[] {
    return this.nodes;
  }

  public getNodeMeshes(): THREE.InstancedMesh {
    return this.nodeMeshes;
  }

  public getOrbitingLights(): OrbitingLight[] {
    return this.orbitingLights;
  }

  public resize(viewportHeight: number): void {
    this.viewportHeight = viewportHeight;
    this.calculateDimensions();
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const t = node.nodeIndex / (NODES_PER_FIBER - 1);
      const y = this.fiberHeight / 2 - t * this.fiberHeight;
      node.basePosition.y = y;
      if (!node.isDragging && !node.isReturning) {
        node.currentPosition.y = y;
      }
    }
  }

  public getFiberCount(): number {
    return FIBER_COUNT;
  }

  public getNodesPerFiber(): number {
    return NODES_PER_FIBER;
  }

  public getFiberHeight(): number {
    return this.fiberHeight;
  }

  public getZoomLevel(): number {
    return this.zoomLevel;
  }
}
