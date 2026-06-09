import * as THREE from 'three';
import { Mineral } from './minerals';

export interface Robot {
  group: THREE.Group;
  body: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftClaw: THREE.Group;
  rightClaw: THREE.Group;
  spotlight: THREE.SpotLight;
  isGrabbing: boolean;
  grabProgress: number;
  grabDuration: number;
  velocity: THREE.Vector3;
  moveSpeed: number;
}

function createArm(side: 'left' | 'right'): { arm: THREE.Group; claw: THREE.Group } {
  const group = new THREE.Group();
  
  const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
  const armMat = new THREE.MeshStandardMaterial({
    color: 0x7a8a9a,
    metalness: 0.7,
    roughness: 0.6
  });
  const armMesh = new THREE.Mesh(armGeo, armMat);
  armMesh.position.y = -0.2;
  armMesh.castShadow = true;
  group.add(armMesh);
  
  const claw = new THREE.Group();
  
  const clawBaseGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const clawBaseMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a7a,
    metalness: 0.8,
    roughness: 0.5
  });
  const clawBase = new THREE.Mesh(clawBaseGeo, clawBaseMat);
  clawBase.position.y = -0.4;
  clawBase.castShadow = true;
  claw.add(clawBase);
  
  const fingerGeo = new THREE.BoxGeometry(0.03, 0.12, 0.02);
  const fingerMat = new THREE.MeshStandardMaterial({
    color: 0x4a5a6a,
    metalness: 0.8,
    roughness: 0.4
  });
  
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const finger = new THREE.Mesh(fingerGeo, fingerMat);
    finger.position.set(
      Math.cos(angle) * 0.06,
      -0.48,
      Math.sin(angle) * 0.06
    );
    finger.rotation.z = Math.cos(angle) * 0.3;
    finger.rotation.x = Math.sin(angle) * 0.3;
    finger.castShadow = true;
    finger.name = 'finger';
    claw.add(finger);
  }
  
  group.add(claw);
  
  const offset = side === 'left' ? 0.35 : -0.35;
  group.position.set(offset, 0.1, 0);
  group.rotation.z = side === 'left' ? 0.3 : -0.3;
  
  return { arm: group, claw };
}

export function createRobot(scene: THREE.Scene): Robot {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x7a8a9a,
    metalness: 0.7,
    roughness: 0.6
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  
  const windowGeo = new THREE.BoxGeometry(0.25, 0.2, 0.02);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x4488cc,
    emissiveIntensity: 0.5,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8
  });
  const window = new THREE.Mesh(windowGeo, windowMat);
  window.position.set(0, 0.05, 0.26);
  group.add(window);
  
  const thrusterGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a7a,
    metalness: 0.8,
    roughness: 0.5
  });
  
  const leftThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  leftThruster.rotation.x = Math.PI / 2;
  leftThruster.position.set(-0.3, -0.15, -0.2);
  leftThruster.castShadow = true;
  group.add(leftThruster);
  
  const rightThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  rightThruster.rotation.x = Math.PI / 2;
  rightThruster.position.set(0.3, -0.15, -0.2);
  rightThruster.castShadow = true;
  group.add(rightThruster);
  
  const thrusterGlowGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const thrusterGlowMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.6
  });
  
  const leftGlow = new THREE.Mesh(thrusterGlowGeo, thrusterGlowMat);
  leftGlow.position.set(-0.3, -0.15, -0.32);
  group.add(leftGlow);
  
  const rightGlow = new THREE.Mesh(thrusterGlowGeo, thrusterGlowMat);
  rightGlow.position.set(0.3, -0.15, -0.32);
  group.add(rightGlow);
  
  const { arm: leftArm, claw: leftClaw } = createArm('left');
  const { arm: rightArm, claw: rightClaw } = createArm('right');
  group.add(leftArm);
  group.add(rightArm);
  
  const spotlight = new THREE.SpotLight(0xffffcc, 0.8, 20, 0.5, 0.4, 1);
  spotlight.position.set(0, 0.8, 0);
  spotlight.target.position.set(0, 0, 5);
  spotlight.castShadow = true;
  spotlight.shadow.mapSize.width = 512;
  spotlight.shadow.mapSize.height = 512;
  spotlight.shadow.camera.near = 0.5;
  spotlight.shadow.camera.far = 20;
  group.add(spotlight);
  group.add(spotlight.target);
  
  group.position.set(6, 1.5, 6);
  
  scene.add(group);
  
  return {
    group,
    body,
    leftArm,
    rightArm,
    leftClaw,
    rightClaw,
    spotlight,
    isGrabbing: false,
    grabProgress: 0,
    grabDuration: 0.5,
    velocity: new THREE.Vector3(),
    moveSpeed: 1.5
  };
}

export function updateRobot(robot: Robot, delta: number) {
  const keys = (window as any).__robotKeys as Record<string, boolean>;
  if (!keys) return;
  
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(robot.group.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(robot.group.quaternion);
  
  const moveDir = new THREE.Vector3();
  
  if (keys['w']) moveDir.add(forward);
  if (keys['s']) moveDir.sub(forward);
  if (keys['a']) moveDir.sub(right);
  if (keys['d']) moveDir.add(right);
  
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    robot.group.position.addScaledVector(moveDir, robot.moveSpeed * delta);
    
    const targetRotation = Math.atan2(moveDir.x, moveDir.z);
    const currentRotation = robot.group.rotation.y;
    let diff = targetRotation - currentRotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    robot.group.rotation.y += diff * Math.min(1, delta * 8);
  }
  
  const bounds = 9.5;
  robot.group.position.x = THREE.MathUtils.clamp(robot.group.position.x, -bounds, bounds);
  robot.group.position.z = THREE.MathUtils.clamp(robot.group.position.z, -bounds, bounds);
  robot.group.position.y = Math.max(1, robot.group.position.y);
  
  if (robot.isGrabbing) {
    robot.grabProgress += delta / robot.grabDuration;
    
    if (robot.grabProgress >= 1) {
      robot.isGrabbing = false;
      robot.grabProgress = 0;
    }
    
    const t = robot.grabProgress;
    const openAmount = Math.sin(t * Math.PI) * 0.5;
    
    robot.leftArm.rotation.x = -0.8 + openAmount * 0.3;
    robot.rightArm.rotation.x = -0.8 + openAmount * 0.3;
    
    robot.leftArm.children.forEach((child) => {
      if (child.name === 'finger') {
        child.rotation.x = openAmount * 0.8;
      }
    });
    robot.rightArm.children.forEach((child) => {
      if (child.name === 'finger') {
        child.rotation.x = -openAmount * 0.8;
      }
    });
    
    robot.leftClaw.children.forEach((child) => {
      if (child.name === 'finger') {
        child.rotation.z = openAmount * 0.6;
      }
    });
    robot.rightClaw.children.forEach((child) => {
      if (child.name === 'finger') {
        child.rotation.z = -openAmount * 0.6;
      }
    });
  }
  
  const time = performance.now() / 1000;
  robot.group.position.y += Math.sin(time * 2) * delta * 0.05;
}

export function tryGrabMineral(
  robot: Robot,
  minerals: Mineral[],
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): Mineral | null {
  if (robot.isGrabbing) return null;
  
  const grabRange = 1.0;
  let closestMineral: Mineral | null = null;
  let closestDist = Infinity;
  
  const robotPos = robot.group.position.clone();
  
  for (const mineral of minerals) {
    if (!mineral.collected && mineral.group.visible) {
      const dist = robotPos.distanceTo(mineral.group.position);
      if (dist < grabRange && dist < closestDist) {
        closestDist = dist;
        closestMineral = mineral;
      }
    }
  }
  
  if (!closestMineral) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(mouse, camera);
    
    const allMeshes: THREE.Mesh[] = [];
    minerals.forEach(m => {
      if (!m.collected) {
        m.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) allMeshes.push(obj);
        });
      }
    });
    
    const intersects = raycaster.intersectObjects(allMeshes, false);
    
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      for (const mineral of minerals) {
        if (!mineral.collected) {
          let found = false;
          mineral.group.traverse((obj) => {
            if (obj === hitObj) found = true;
          });
          if (found) {
            const dist = robotPos.distanceTo(mineral.group.position);
            if (dist < grabRange * 2) {
              closestMineral = mineral;
              break;
            }
          }
        }
      }
    }
  }
  
  if (closestMineral) {
    robot.isGrabbing = true;
    robot.grabProgress = 0;
    
    const targetPos = closestMineral.group.position.clone();
    const direction = targetPos.sub(robotPos).normalize();
    const angle = Math.atan2(direction.x, direction.z);
    
    let rotDiff = angle - robot.group.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    robot.group.rotation.y += rotDiff * 0.8;
    
    const mineral = closestMineral;
    
    setTimeout(() => {
      if (!mineral.collected) {
        mineral.collected = true;
        mineral.group.visible = false;
        
        mineral.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        
        const inventory = (window as any).__mineralInventory as Record<string, number>;
        if (inventory) {
          inventory[mineral.config.id] = (inventory[mineral.config.id] || 0) + 1;
        }
      }
    }, 250);
    
    return closestMineral;
  }
  
  return null;
}
