import * as THREE from 'three';

export function createScene(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8, 1000);
  pointLight.position.set(100, 100, 200);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x48dbfb, 0.5, 800);
  pointLight2.position.set(-100, -100, 150);
  scene.add(pointLight2);

  createStarfield(scene);

  return { scene, camera };
}

function createStarfield(scene: THREE.Scene): void {
  const starGroup = new THREE.Group();
  starGroup.name = 'starfield';

  const starGeometry1 = new THREE.BufferGeometry();
  const starPositions1: number[] = [];
  const starVelocities1: number[] = [];
  for (let i = 0; i < 100; i++) {
    starPositions1.push(
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000
    );
    starVelocities1.push(0.2 * (Math.random() * 0.5 + 0.5));
  }
  starGeometry1.setAttribute('position', new THREE.Float32BufferAttribute(starPositions1, 3));
  const starMaterial1 = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });
  const stars1 = new THREE.Points(starGeometry1, starMaterial1);
  stars1.userData.velocities = starVelocities1;
  stars1.userData.type = 'layer1';
  starGroup.add(stars1);

  const starGeometry2 = new THREE.BufferGeometry();
  const starPositions2: number[] = [];
  const starVelocities2: number[] = [];
  for (let i = 0; i < 50; i++) {
    starPositions2.push(
      (Math.random() - 0.5) * 2500,
      (Math.random() - 0.5) * 2500,
      (Math.random() - 0.5) * 2500
    );
    starVelocities2.push(0.1 * (Math.random() * 0.5 + 0.5));
  }
  starGeometry2.setAttribute('position', new THREE.Float32BufferAttribute(starPositions2, 3));
  const starMaterial2 = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 2.5,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  });
  const stars2 = new THREE.Points(starGeometry2, starMaterial2);
  stars2.userData.velocities = starVelocities2;
  stars2.userData.type = 'layer2';
  starGroup.add(stars2);

  scene.add(starGroup);
}

export function updateStarfield(scene: THREE.Scene, delta: number): void {
  const starGroup = scene.getObjectByName('starfield');
  if (!starGroup) return;

  starGroup.children.forEach((stars) => {
    const points = stars as THREE.Points;
    const positions = points.geometry.attributes.position.array as Float32Array;
    const velocities = points.userData.velocities as number[];
    const type = points.userData.type as string;
    const speed = type === 'layer1' ? 0.2 : 0.1;

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3 + 1] += speed * velocities[i] * delta * 60;
      if (positions[i * 3 + 1] > 1000) {
        positions[i * 3 + 1] = -1000;
        positions[i * 3] = (Math.random() - 0.5) * 2000;
      }
    }
    points.geometry.attributes.position.needsUpdate = true;
  });
}

export function onWindowResize(camera: THREE.PerspectiveCamera): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
