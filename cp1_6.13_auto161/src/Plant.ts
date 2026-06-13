import * as THREE from 'three';
import gsap from 'gsap';
import { ParticleSystem } from './ParticleSystem';

interface StemNode {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  targetDirection: THREE.Vector3;
  length: number;
  thickness: number;
  parentId: number | null;
  children: number[];
  mesh: THREE.Mesh | null;
  leafMesh: THREE.Mesh | null;
  leafAngle: number;
  leafSwayPhase: number;
  leafSwaySpeed: number;
  leafSwayAmount: number;
  hasFlower: boolean;
  flowerMesh: THREE.Group | null;
  flowerGlow: THREE.Mesh | null;
  leafGoldProgress: number;
  leafHoverStartTime: number;
  depth: number;
  color: THREE.Color;
}

interface FlowerPetal {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Plant {
  private scene: THREE.Scene;
  private nodes: Map<number, StemNode> = new Map();
  private nextNodeId: number = 0;
  private rootNodeId: number = 0;
  private growthSpeed: number = 1;
  private flowerPrimaryColor: THREE.Color = new THREE.Color(0xff6699);
  private particleSystem: ParticleSystem;
  
  private isDragging: boolean = false;
  private dragStartPos: THREE.Vector3 = new THREE.Vector3();
  private dragCurrentPos: THREE.Vector3 = new THREE.Vector3();
  private dragDistance: number = 0;
  private activeBranchNodeId: number = 0;
  private lastBranchDistance: number = 0;
  
  private selectedNodeId: number | null = null;
  private isAdjustingAngle: boolean = false;
  private angleAdjustStart: THREE.Vector3 = new THREE.Vector3();
  
  private baseColor: THREE.Color = new THREE.Color(0x88ccff);
  private tipColor: THREE.Color = new THREE.Color(0xcc88ff);
  
  private flowerPetals: FlowerPetal[] = [];
  
  private clickableObjects: THREE.Object3D[] = [];
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNDC: THREE.Vector2 = new THREE.Vector2();
  private camera: THREE.Camera;
  
  private plantContainer: THREE.Group = new THREE.Group();
  
  private initialHeight: number = 5;
  
  private mouseWorldPos: THREE.Vector3 = new THREE.Vector3();
  private mouseSpeed: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.camera = camera;
    this.particleSystem = particleSystem;
    
    this.scene.add(this.plantContainer);
    
    this.raycaster.far = 1000;
    
    this.createInitialSeedling();
  }

  public getPlantContainer(): THREE.Group {
    return this.plantContainer;
  }

  private createInitialSeedling(): void {
    const rootPos = new THREE.Vector3(0, -200, 0);
    
    const rootNode: StemNode = {
      id: this.nextNodeId++,
      position: rootPos.clone(),
      direction: new THREE.Vector3(0, 1, 0),
      targetDirection: new THREE.Vector3(0, 1, 0),
      length: this.initialHeight,
      thickness: 2,
      parentId: null,
      children: [],
      mesh: null,
      leafMesh: null,
      leafAngle: 0,
      leafSwayPhase: Math.random() * Math.PI * 2,
      leafSwaySpeed: 0.8 + Math.random() * 0.4,
      leafSwayAmount: 5 + Math.random() * 10,
      hasFlower: false,
      flowerMesh: null,
      flowerGlow: null,
      leafGoldProgress: 0,
      leafHoverStartTime: 0,
      depth: 0,
      color: this.baseColor.clone()
    };
    
    this.nodes.set(rootNode.id, rootNode);
    this.rootNodeId = rootNode.id;
    this.activeBranchNodeId = rootNode.id;
    
    this.createStemMesh(rootNode);
    
    this.growFromNode(rootNode.id, 1, new THREE.Vector3(0, 1, 0));
  }

  private createStemMesh(node: StemNode): void {
    if (node.mesh) {
      this.plantContainer.remove(node.mesh);
      node.mesh.geometry.dispose();
      (node.mesh.material as THREE.Material).dispose();
    }
    
    if (node.parentId === null) return;
    
    const parentNode = this.nodes.get(node.parentId);
    if (!parentNode) return;
    
    const length = node.position.distanceTo(parentNode.position);
    const geometry = new THREE.CylinderGeometry(
      node.thickness * 0.8,
      node.thickness,
      length,
      8
    );
    
    const material = new THREE.MeshPhongMaterial({
      color: node.color,
      transparent: true,
      opacity: 0.9,
      emissive: node.color,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    const midPoint = parentNode.position.clone().add(node.position).multiplyScalar(0.5);
    mesh.position.copy(midPoint);
    
    const direction = node.position.clone().sub(parentNode.position).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);
    
    node.mesh = mesh;
    this.plantContainer.add(mesh);
    this.clickableObjects.push(mesh);
  }

  private createLeaf(node: StemNode): void {
    if (node.leafMesh) {
      this.plantContainer.remove(node.leafMesh);
      node.leafMesh.geometry.dispose();
      (node.leafMesh.material as THREE.Material).dispose();
    }
    
    const leafSize = 8 + Math.random() * 7;
    
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(leafSize * 0.3, leafSize);
    shape.lineTo(-leafSize * 0.3, leafSize);
    shape.lineTo(0, 0);
    
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.center();
    
    const material = new THREE.MeshPhongMaterial({
      color: node.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      emissive: node.color,
      emissiveIntensity: 0.2
    });
    
    const leafMesh = new THREE.Mesh(geometry, material);
    
    const angle = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 30);
    node.leafAngle = angle;
    
    leafMesh.position.copy(node.position);
    leafMesh.rotation.y = THREE.MathUtils.degToRad(angle);
    leafMesh.rotation.x = THREE.MathUtils.degToRad(-20);
    
    node.leafMesh = leafMesh;
    this.plantContainer.add(leafMesh);
  }

  private createFlower(node: StemNode): void {
    if (node.flowerMesh) {
      this.plantContainer.remove(node.flowerMesh);
    }
    
    const flowerGroup = new THREE.Group();
    const flowerSize = 10 + Math.random() * 8;
    
    const petalCount = 5;
    
    const hueShift = Math.random() * 0.1;
    const petalColor = this.flowerPrimaryColor.clone();
    petalColor.offsetHSL(hueShift, 0.1, Math.random() * 0.2);
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      
      const petalShape = new THREE.Shape();
      petalShape.moveTo(0, 0);
      petalShape.quadraticCurveTo(flowerSize * 0.5, flowerSize * 0.5, 0, flowerSize);
      petalShape.quadraticCurveTo(-flowerSize * 0.5, flowerSize * 0.5, 0, 0);
      
      const petalGeometry = new THREE.ShapeGeometry(petalShape);
      petalGeometry.center();
      
      const petalMaterial = new THREE.MeshPhongMaterial({
        color: petalColor,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        emissive: petalColor,
        emissiveIntensity: 0.4
      });
      
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.y = flowerSize * 0.3;
      petal.rotation.z = angle;
      petal.rotation.x = THREE.MathUtils.degToRad(45);
      
      flowerGroup.add(petal);
    }
    
    const centerGeometry = new THREE.SphereGeometry(flowerSize * 0.3, 8, 8);
    const centerMaterial = new THREE.MeshPhongMaterial({
      color: 0xffcc00,
      emissive: 0xffcc00,
      emissiveIntensity: 0.6
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    flowerGroup.add(center);
    
    const glowGeometry = new THREE.SphereGeometry(flowerSize * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: petalColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    flowerGroup.add(glow);
    
    flowerGroup.position.copy(node.position);
    flowerGroup.position.add(node.direction.clone().multiplyScalar(node.length * 0.3));
    
    node.flowerMesh = flowerGroup;
    node.flowerGlow = glow;
    this.plantContainer.add(flowerGroup);
    this.clickableObjects.push(flowerGroup);
    node.hasFlower = true;
  }

  private growFromNode(nodeId: number, segments: number, direction: THREE.Vector3): void {
    let currentNodeId = nodeId;
    let currentDirection = direction.clone().normalize();
    
    for (let i = 0; i < segments; i++) {
      const currentNode = this.nodes.get(currentNodeId);
      if (!currentNode) break;
      
      const length = 10 + Math.random() * 10;
      const thickness = 2 + Math.random() * 2;
      
      const newPos = currentNode.position.clone().add(
        currentDirection.clone().multiplyScalar(length)
      );
      
      const depth = currentNode.depth + 1;
      const colorT = Math.min(1, depth / 20);
      const color = this.baseColor.clone().lerp(this.tipColor, colorT);
      
      const newNode: StemNode = {
        id: this.nextNodeId++,
        position: newPos,
        direction: currentDirection.clone(),
        targetDirection: currentDirection.clone(),
        length,
        thickness,
        parentId: currentNodeId,
        children: [],
        mesh: null,
        leafMesh: null,
        leafAngle: 0,
        leafSwayPhase: Math.random() * Math.PI * 2,
        leafSwaySpeed: 0.8 + Math.random() * 0.4,
        leafSwayAmount: 5 + Math.random() * 10,
        hasFlower: false,
        flowerMesh: null,
        flowerGlow: null,
        leafGoldProgress: 0,
        leafHoverStartTime: 0,
        depth,
        color
      };
      
      this.nodes.set(newNode.id, newNode);
      currentNode.children.push(newNode.id);
      
      this.createStemMesh(newNode);
      
      if (depth % 2 === 0 && depth > 0) {
        this.createLeaf(newNode);
      }
      
      if (depth > 0 && depth % 5 === 0 && Math.random() > 0.3) {
        this.createFlower(newNode);
      }
      
      currentNodeId = newNode.id;
    }
    
    this.activeBranchNodeId = currentNodeId;
  }

  public setGrowthSpeed(speed: number): void {
    this.growthSpeed = speed;
  }

  public setFlowerColor(color: THREE.Color): void {
    this.flowerPrimaryColor.copy(color);
    
    this.nodes.forEach((node) => {
      if (node.hasFlower && node.flowerMesh) {
        this.plantContainer.remove(node.flowerMesh);
        node.flowerMesh = null;
        node.flowerGlow = null;
        node.hasFlower = false;
      }
    });
    
    this.nodes.forEach((node) => {
      if (node.depth > 0 && node.depth % 5 === 0) {
        this.createFlower(node);
      }
    });
  }

  public onMouseDown(worldPos: THREE.Vector3, ndc: THREE.Vector2): void {
    this.mouseNDC.copy(ndc);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);
    
    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      
      let hitNode: StemNode | null = null;
      let hitFlower = false;
      
      for (const node of this.nodes.values()) {
        if (node.mesh === hitObject || node.mesh === hitObject.parent) {
          hitNode = node;
        }
        if (node.flowerMesh) {
          if (node.flowerMesh === hitObject || node.flowerMesh.children.includes(hitObject as THREE.Mesh)) {
            hitFlower = true;
            hitNode = node;
          }
        }
        if (node.leafMesh === hitObject) {
          hitNode = node;
        }
      }
      
      if (hitFlower && hitNode) {
        this.triggerFlowerBurst(hitNode);
        return;
      }
      
      if (hitNode && hitNode.parentId !== null) {
        this.selectedNodeId = hitNode.id;
        this.isAdjustingAngle = true;
        this.angleAdjustStart.copy(worldPos);
        this.highlightNode(hitNode, true);
        return;
      }
    }
    
    this.isDragging = true;
    this.dragStartPos.copy(worldPos);
    this.dragCurrentPos.copy(worldPos);
    this.dragDistance = 0;
    this.lastBranchDistance = 0;
  }

  public onMouseMove(worldPos: THREE.Vector3, ndc: THREE.Vector2, speed: number, deltaTime: number): void {
    this.mouseWorldPos.copy(worldPos);
    this.mouseSpeed = speed;
    this.mouseNDC.copy(ndc);
    
    if (this.isAdjustingAngle && this.selectedNodeId !== null) {
      const node = this.nodes.get(this.selectedNodeId);
      if (node && node.parentId !== null) {
        const parentNode = this.nodes.get(node.parentId);
        if (parentNode) {
          const delta = worldPos.clone().sub(this.angleAdjustStart);
          
          const currentDir = node.targetDirection.clone();
          const horizontalAxis = new THREE.Vector3(1, 0, 0);
          const verticalAxis = new THREE.Vector3(0, 0, 1);
          
          const angleX = delta.x * 0.01 * this.growthSpeed;
          const angleZ = -delta.y * 0.01 * this.growthSpeed;
          
          const quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle(verticalAxis, angleX);
          quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(horizontalAxis, angleZ));
          
          const newDir = currentDir.clone().applyQuaternion(quaternion).normalize();
          
          gsap.to(node.targetDirection, {
            x: newDir.x,
            y: newDir.y,
            z: newDir.z,
            duration: 0.5,
            ease: "power2.out",
            onUpdate: () => {
              this.updateNodeDirection(node);
            }
          });
          
          this.angleAdjustStart.copy(worldPos);
        }
      }
    }
    
    if (this.isDragging) {
      const prevPos = this.dragCurrentPos.clone();
      this.dragCurrentPos.copy(worldPos);
      
      const moveDelta = worldPos.clone().sub(prevPos);
      const moveDistance = moveDelta.length();
      this.dragDistance += moveDistance;
      
      if (moveDistance > 0.1 && this.activeBranchNodeId !== null) {
        const direction = moveDelta.clone().normalize();
        direction.y = Math.max(0.2, direction.y);
        direction.normalize();
        
        const growAmount = Math.min(moveDistance * this.growthSpeed * 0.5, 20);
        
        if (growAmount > 1) {
          const activeNode = this.nodes.get(this.activeBranchNodeId);
          if (activeNode) {
            const currentDir = activeNode.direction.clone();
            const targetDir = direction.clone();
            const blendDir = currentDir.clone().lerp(targetDir, 0.1).normalize();
            
            const segments = Math.max(1, Math.floor(growAmount / 15));
            this.growFromNode(this.activeBranchNodeId, segments, blendDir);
          }
        }
        
        if (this.dragDistance - this.lastBranchDistance > 100) {
          this.lastBranchDistance = this.dragDistance;
          this.createBranch(this.activeBranchNodeId, direction);
        }
      }
    }
    
    this.checkLeafHover(deltaTime);
  }

  public onMouseUp(): void {
    if (this.isAdjustingAngle && this.selectedNodeId !== null) {
      const node = this.nodes.get(this.selectedNodeId);
      if (node) {
        this.highlightNode(node, false);
      }
      this.selectedNodeId = null;
      this.isAdjustingAngle = false;
    }
    
    this.isDragging = false;
  }

  private createBranch(nodeId: number, mouseDirection: THREE.Vector3): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const angle = THREE.MathUtils.degToRad(30 + Math.random() * 30);
    const side = Math.random() > 0.5 ? 1 : -1;
    
    const axis = new THREE.Vector3(0, 0, 1);
    const perpAxis = new THREE.Vector3().crossVectors(mouseDirection, axis).normalize();
    
    if (perpAxis.length() < 0.1) {
      perpAxis.set(1, 0, 0);
    }
    
    const branchDir = mouseDirection.clone()
      .applyAxisAngle(perpAxis, angle * side)
      .normalize();
    
    this.growFromNode(nodeId, 1, branchDir);
  }

  private updateNodeDirection(node: StemNode): void {
    if (node.parentId === null) return;
    
    const parentNode = this.nodes.get(node.parentId);
    if (!parentNode) return;
    
    const newPos = parentNode.position.clone().add(
      node.targetDirection.clone().multiplyScalar(node.length)
    );
    
    gsap.to(node.position, {
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      duration: 0.5,
      ease: "power2.out"
    });
    
    gsap.to(node.direction, {
      x: node.targetDirection.x,
      y: node.targetDirection.y,
      z: node.targetDirection.z,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        this.updateStemMesh(node);
        this.updateChildrenPositions(node);
      }
    });
  }

  private updateStemMesh(node: StemNode): void {
    if (!node.mesh || node.parentId === null) return;
    
    const parentNode = this.nodes.get(node.parentId);
    if (!parentNode) return;
    
    const midPoint = parentNode.position.clone().add(node.position).multiplyScalar(0.5);
    node.mesh.position.copy(midPoint);
    
    const direction = node.position.clone().sub(parentNode.position).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    node.mesh.quaternion.copy(quaternion);
    
    if (node.leafMesh) {
      node.leafMesh.position.copy(node.position);
    }
    
    if (node.flowerMesh) {
      node.flowerMesh.position.copy(node.position);
      node.flowerMesh.position.add(node.direction.clone().multiplyScalar(node.length * 0.3));
    }
  }

  private updateChildrenPositions(node: StemNode): void {
    for (const childId of node.children) {
      const child = this.nodes.get(childId);
      if (!child) continue;
      
      const newPos = node.position.clone().add(
        child.direction.clone().multiplyScalar(child.length)
      );
      
      child.position.copy(newPos);
      this.updateStemMesh(child);
      this.updateChildrenPositions(child);
    }
  }

  private highlightNode(node: StemNode, highlight: boolean): void {
    if (node.mesh) {
      const material = node.mesh.material as THREE.MeshPhongMaterial;
      gsap.to(material, {
        emissiveIntensity: highlight ? 1.0 : 0.3,
        duration: 0.3,
        ease: "power2.out"
      });
      gsap.to(material.color, {
        r: highlight ? 1 : node.color.r,
        g: highlight ? 1 : node.color.g,
        b: highlight ? 1 : node.color.b,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }

  private triggerFlowerBurst(node: StemNode): void {
    if (!node.flowerMesh) return;
    
    const flowerPos = node.flowerMesh.position.clone();
    
    for (let i = 0; i < 15; i++) {
      const size = 3 + Math.random() * 4;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      
      const color = this.flowerPrimaryColor.clone();
      color.offsetHSL(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2);
      
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(flowerPos);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2 + Math.random() * 3,
        Math.sin(angle) * speed
      );
      
      this.flowerPetals.push({
        mesh,
        velocity,
        life: 1.5,
        maxLife: 1.5
      });
      
      this.scene.add(mesh);
    }
    
    const originalFlower = node.flowerMesh;
    gsap.to(originalFlower.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1,
      ease: "back.in",
      onComplete: () => {
        if (originalFlower.parent) {
          originalFlower.parent.remove(originalFlower);
        }
        node.flowerMesh = null;
        node.flowerGlow = null;
        node.hasFlower = false;
      }
    });
    
    setTimeout(() => {
      if (this.nodes.has(node.id) && !node.hasFlower) {
        this.createFlower(node);
        if (node.flowerMesh) {
          node.flowerMesh.scale.set(0, 0, 0);
          gsap.to(node.flowerMesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1,
            ease: "back.out"
          });
        }
      }
    }, 3000);
  }

  private checkLeafHover(deltaTime: number): void {
    this.nodes.forEach((node) => {
      if (!node.leafMesh) return;
      
      const distance = node.position.distanceTo(this.mouseWorldPos);
      const nearThreshold = 30;
      
      if (distance < nearThreshold) {
        if (node.leafHoverStartTime === 0) {
          node.leafHoverStartTime = performance.now();
        }
        
        const hoverDuration = (performance.now() - node.leafHoverStartTime) / 1000;
        if (hoverDuration > 1) {
          node.leafGoldProgress = Math.min(1, (hoverDuration - 1) / 2);
          
          const material = node.leafMesh.material as THREE.MeshPhongMaterial;
          const goldColor = new THREE.Color(0xffd700);
          const currentColor = node.color.clone().lerp(goldColor, node.leafGoldProgress);
          material.color.copy(currentColor);
          material.emissive.copy(currentColor);
          material.emissiveIntensity = 0.2 + node.leafGoldProgress * 0.3;
        }
      } else {
        if (node.leafHoverStartTime > 0 && node.leafGoldProgress > 0) {
          node.leafGoldProgress = Math.max(0, node.leafGoldProgress - deltaTime * 0.5);
          
          const material = node.leafMesh.material as THREE.MeshPhongMaterial;
          const goldColor = new THREE.Color(0xffd700);
          const currentColor = node.color.clone().lerp(goldColor, node.leafGoldProgress);
          material.color.copy(currentColor);
          material.emissive.copy(currentColor);
          material.emissiveIntensity = 0.2 + node.leafGoldProgress * 0.3;
          
          if (node.leafGoldProgress <= 0) {
            node.leafHoverStartTime = 0;
          }
        } else {
          node.leafHoverStartTime = 0;
        }
      }
    });
  }

  public update(time: number, deltaTime: number): void {
    this.nodes.forEach((node) => {
      if (node.leafMesh) {
        const swayAngle = Math.sin(time * node.leafSwaySpeed + node.leafSwayPhase) * node.leafSwayAmount;
        const proximityFactor = this.mouseSpeed * 3;
        const totalSway = swayAngle + proximityFactor * node.leafSwayAmount;
        
        node.leafMesh.rotation.z = THREE.MathUtils.degToRad(node.leafAngle + totalSway);
        
        const windEffect = Math.sin(time * 2 + node.leafSwayPhase * 0.5) * 5;
        node.leafMesh.rotation.x = THREE.MathUtils.degToRad(-20 + windEffect);
      }
      
      if (node.flowerMesh) {
        node.flowerMesh.rotation.y = time * 0.5;
        
        if (node.flowerGlow) {
          const pulse = (Math.sin(time * 2) + 1) / 2;
          const glowScale = 1 + pulse * 0.5;
          node.flowerGlow.scale.setScalar(glowScale);
          
          const glowMaterial = node.flowerGlow.material as THREE.MeshBasicMaterial;
          glowMaterial.opacity = 0.1 + pulse * 0.2;
        }
      }
    });
    
    for (let i = this.flowerPetals.length - 1; i >= 0; i--) {
      const petal = this.flowerPetals[i];
      petal.life -= deltaTime;
      
      if (petal.life <= 0) {
        this.scene.remove(petal.mesh);
        petal.mesh.geometry.dispose();
        (petal.mesh.material as THREE.Material).dispose();
        this.flowerPetals.splice(i, 1);
        continue;
      }
      
      petal.velocity.y -= 0.05;
      petal.mesh.position.add(petal.velocity.clone().multiplyScalar(deltaTime * 60));
      petal.mesh.rotation.x += deltaTime * 2;
      petal.mesh.rotation.y += deltaTime * 3;
      
      const material = petal.mesh.material as THREE.MeshBasicMaterial;
      if (petal.life < 0.5) {
        material.opacity = petal.life * 2;
      }
    }
  }

  public reset(): Promise<void> {
    return new Promise((resolve) => {
      const nodeIds = Array.from(this.nodes.keys()).filter(id => id !== this.rootNodeId);
      
      gsap.to(this.plantContainer.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 3,
        ease: "power2.inOut",
        onComplete: () => {
          this.nodes.forEach((node) => {
            if (node.mesh) {
              this.plantContainer.remove(node.mesh);
              node.mesh.geometry.dispose();
              (node.mesh.material as THREE.Material).dispose();
            }
            if (node.leafMesh) {
              this.plantContainer.remove(node.leafMesh);
              node.leafMesh.geometry.dispose();
              (node.leafMesh.material as THREE.Material).dispose();
            }
            if (node.flowerMesh) {
              this.plantContainer.remove(node.flowerMesh);
            }
          });
          
          for (const petal of this.flowerPetals) {
            this.scene.remove(petal.mesh);
            petal.mesh.geometry.dispose();
            (petal.mesh.material as THREE.Material).dispose();
          }
          this.flowerPetals = [];
          
          this.nodes.clear();
          this.clickableObjects = [];
          this.nextNodeId = 0;
          
          this.plantContainer.scale.set(1, 1, 1);
          
          this.createInitialSeedling();
          
          this.plantContainer.scale.set(0.01, 0.01, 0.01);
          gsap.to(this.plantContainer.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.5,
            ease: "back.out",
            onComplete: () => {
              resolve();
            }
          });
        }
      });
    });
  }

  public getTipPosition(): THREE.Vector3 {
    const activeNode = this.nodes.get(this.activeBranchNodeId);
    if (activeNode) {
      return activeNode.position.clone();
    }
    return new THREE.Vector3();
  }
}
