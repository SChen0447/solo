import * as THREE from 'three';

type MaterialPreset = 'matte' | 'metal' | 'glossy';

const PRESETS: Record<MaterialPreset, { roughness: number; metalness: number }> = {
  matte: { roughness: 0.9, metalness: 0.0 },
  metal: { roughness: 0.3, metalness: 0.9 },
  glossy: { roughness: 0.1, metalness: 0.3 },
};

function createPartMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.0,
  });
}

export function createBuilding() {
  const group = new THREE.Group();

  const wallMat = createPartMaterial('#e0c9a6');
  const wallGeo = new THREE.BoxGeometry(4, 3, 3);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 1.5;
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.name = 'wall';
  group.add(wall);

  const roofMat = createPartMaterial('#8b4513');
  const roofGeo = new THREE.ConeGeometry(2.8, 1.6, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.8;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  roof.name = 'roof';
  group.add(roof);

  const windowMat = createPartMaterial('#87ceeb');
  const windowGeo = new THREE.BoxGeometry(0.6, 0.7, 0.05);

  const win1 = new THREE.Mesh(windowGeo, windowMat);
  win1.position.set(-1, 2, 1.51);
  win1.name = 'window';
  group.add(win1);

  const win2 = new THREE.Mesh(windowGeo, windowMat);
  win2.position.set(1, 2, 1.51);
  win2.name = 'window';
  group.add(win2);

  const win3 = new THREE.Mesh(windowGeo, windowMat.clone());
  win3.position.set(-1, 2, -1.51);
  win3.rotation.y = Math.PI;
  win3.name = 'window';
  group.add(win3);

  const win4 = new THREE.Mesh(windowGeo, windowMat.clone());
  win4.position.set(1, 2, -1.51);
  win4.rotation.y = Math.PI;
  win4.name = 'window';
  group.add(win4);

  const sideWindowGeo = new THREE.BoxGeometry(0.05, 0.7, 0.6);
  const win5 = new THREE.Mesh(sideWindowGeo, windowMat.clone());
  win5.position.set(2.01, 2, 0);
  win5.rotation.y = 0;
  win5.name = 'window';
  group.add(win5);

  const win6 = new THREE.Mesh(sideWindowGeo, windowMat.clone());
  win6.position.set(-2.01, 2, 0);
  win6.rotation.y = 0;
  win6.name = 'window';
  group.add(win6);

  const doorMat = createPartMaterial('#5c3317');
  const doorGeo = new THREE.BoxGeometry(0.8, 1.4, 0.05);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.7, 1.51);
  door.name = 'door';
  group.add(door);

  let roofVisible = true;
  let roofAnimating = false;
  let roofAnimProgress = 1;
  let roofAnimDirection: 'in' | 'out' = 'in';

  function setColor(part: 'wall' | 'roof' | 'window' | 'door', color: string) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === part) {
        (child.material as THREE.MeshStandardMaterial).color.set(color);
      }
    });
  }

  function setMaterial(preset: MaterialPreset) {
    const p = PRESETS[preset];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.roughness = p.roughness;
        child.material.metalness = p.metalness;
        child.material.needsUpdate = true;
      }
    });
  }

  function toggleRoof(show: boolean) {
    if (show === roofVisible && !roofAnimating) return;
    roofVisible = show;
    roofAnimating = true;
    roofAnimDirection = show ? 'in' : 'out';
    if (roofAnimDirection === 'in') {
      roofAnimProgress = 0;
      roof.scale.set(1, 0.01, 1);
      roof.visible = true;
    } else {
      roofAnimProgress = 1;
    }
  }

  function updateRoofAnimation(dt: number) {
    if (!roofAnimating) return;
    const speed = 1 / 0.3;
    if (roofAnimDirection === 'in') {
      roofAnimProgress = Math.min(1, roofAnimProgress + dt * speed);
      const t = easeOutBack(roofAnimProgress);
      roof.scale.set(1, t, 1);
      if (roofAnimProgress >= 1) {
        roofAnimating = false;
        roof.scale.set(1, 1, 1);
      }
    } else {
      roofAnimProgress = Math.max(0, roofAnimProgress - dt * speed);
      const t = easeOutBack(roofAnimProgress);
      roof.scale.set(1, t, 1);
      if (roofAnimProgress <= 0) {
        roofAnimating = false;
        roof.visible = false;
        roof.scale.set(1, 0.01, 1);
      }
    }
  }

  function easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  return {
    group,
    setColor,
    setMaterial,
    toggleRoof,
    updateRoofAnimation,
    isRoofVisible: () => roofVisible,
  };
}
