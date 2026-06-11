import * as THREE from 'three';

export interface SceneObjects {
  group: THREE.Group;
  sphere: THREE.Mesh;
  cube: THREE.Mesh;
  torusKnot: THREE.Mesh;
  floor: THREE.Mesh;
  gridHelper: THREE.GridHelper;
}

export interface LightHandles {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
  point: THREE.PointLight;
}

export function setupScene(scene: THREE.Scene): { objects: SceneObjects; lights: LightHandles } {
  scene.background = new THREE.Color(0x111118);

  const ambientLight = new THREE.AmbientLight(0xffd699, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(-5, 8, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.6, 20);
  pointLight.position.set(2, 3, 4);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.set(1024, 1024);
  scene.add(pointLight);

  const objectsGroup = new THREE.Group();

  const sphereGeo = new THREE.SphereGeometry(1.2, 64, 64);
  const cubeGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4);
  const torusGeo = new THREE.TorusKnotGeometry(1.0, 0.3, 128, 32);

  const defaultMat = new THREE.MeshPhysicalMaterial({
    color: 0x888888,
    roughness: 0.5,
    metalness: 0.1,
  });

  const sphere = new THREE.Mesh(sphereGeo, defaultMat);
  const cube = new THREE.Mesh(cubeGeo, defaultMat);
  const torusKnot = new THREE.Mesh(torusGeo, defaultMat);

  sphere.castShadow = true;
  sphere.receiveShadow = true;
  cube.castShadow = true;
  cube.receiveShadow = true;
  torusKnot.castShadow = true;
  torusKnot.receiveShadow = true;

  const spacing = 2.5;
  const height = 1.0;
  sphere.position.set(0, height, 0);
  cube.position.set(spacing * Math.cos(Math.PI / 6), height, spacing * Math.sin(Math.PI / 6));
  torusKnot.position.set(spacing * Math.cos(Math.PI * 5 / 6), height, spacing * Math.sin(Math.PI * 5 / 6));

  objectsGroup.add(sphere);
  objectsGroup.add(cube);
  objectsGroup.add(torusKnot);

  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a24,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  objectsGroup.add(floor);

  const gridHelper = new THREE.GridHelper(20, 40, 0x444466, 0x333344);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.3;
  objectsGroup.add(gridHelper);

  scene.add(objectsGroup);

  return {
    objects: {
      group: objectsGroup,
      sphere,
      cube,
      torusKnot,
      floor,
      gridHelper,
    },
    lights: {
      ambient: ambientLight,
      directional: directionalLight,
      point: pointLight,
    },
  };
}

export function updateLightIntensity(lights: LightHandles, intensity: number): void {
  lights.directional.intensity = intensity;
  lights.point.intensity = intensity * 0.6;

  const shadowRadius = Math.max(0, 5 - intensity * 2.5);
  lights.directional.shadow.radius = shadowRadius;
  lights.point.shadow.radius = shadowRadius;

  if (lights.directional.shadow.map) {
    lights.directional.shadow.map.dispose();
  }
  lights.directional.shadow.needsUpdate = true;
}

export function updateGridOpacity(grid: THREE.GridHelper, cameraDistance: number): void {
  const minDist = 0.5;
  const maxDist = 4.0;
  const t = Math.min(1, Math.max(0, (cameraDistance - minDist) / (maxDist - minDist)));
  const opacity = 0.1 + t * 0.2;
  (grid.material as THREE.Material).opacity = opacity;
}

export function animateObjects(objects: SceneObjects, delta: number): void {
  objects.sphere.rotation.y += delta * 0.002;
  objects.cube.rotation.x += delta * 0.003;
  objects.cube.rotation.y += delta * 0.0015;
  objects.torusKnot.rotation.y += delta * 0.004;
  objects.torusKnot.rotation.x += delta * 0.001;
}
