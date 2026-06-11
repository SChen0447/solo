import * as THREE from 'three';
import { gsap } from 'gsap';
import { setupScene, updateLightIntensity, updateGridOpacity, animateObjects, SceneObjects, LightHandles } from './SceneSetup';
import { MaterialSwitcher } from './MaterialSwitcher';
import { OrbitControlsManager } from './OrbitControls';
import { UIPanel } from './UIPanel';

interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  objects: SceneObjects;
  lights: LightHandles;
}

function createHaloRing(color: THREE.Color): THREE.Mesh {
  const ringGeometry = new THREE.RingGeometry(1.5, 2.0, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  return ring;
}

function playObjectPulseAnimation(mesh: THREE.Mesh, halo: THREE.Mesh, onComplete: () => void): void {
  const originalScale = mesh.scale.clone();
  
  gsap.to(mesh.scale, {
    x: originalScale.x * 1.2,
    y: originalScale.y * 1.2,
    z: originalScale.z * 1.2,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(mesh.scale, {
        x: originalScale.x,
        y: originalScale.y,
        z: originalScale.z,
        duration: 0.5,
        ease: 'power2.in',
        delay: 1.0,
      });
    },
  });

  gsap.fromTo(halo.scale,
    { x: 0.5, y: 0.5, z: 0.5 },
    { x: 2.0, y: 2.0, z: 2.0, duration: 0.5, ease: 'power2.out' }
  );

  const ringMat = halo.material as THREE.MeshBasicMaterial;
  gsap.fromTo(ringMat,
    { opacity: 0 },
    {
      opacity: 0.3,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(ringMat, {
          opacity: 0,
          duration: 1.2,
          ease: 'power2.in',
          delay: 0.3,
          onComplete: () => {
            onComplete();
          },
        });
      },
    }
  );
}

function init(): SceneContext {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5, 4, 6);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const { objects, lights } = setupScene(scene);

  return { scene, camera, renderer, objects, lights };
}

function setupInteraction(
  context: SceneContext,
  materialSwitcher: MaterialSwitcher
): { raycaster: THREE.Raycaster; mouse: THREE.Vector2; activeHalos: Map<THREE.Mesh, THREE.Mesh> } {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const activeHalos = new Map<THREE.Mesh, THREE.Mesh>();

  const { scene, objects, camera, renderer } = context;
  const clickableObjects = [objects.sphere, objects.cube, objects.torusKnot];

  const handleClick = (event: MouseEvent): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;

      if (activeHalos.has(clickedMesh)) {
        return;
      }

      const haloColor = materialSwitcher.getCurrentColor();
      const halo = createHaloRing(haloColor);
      halo.position.copy(clickedMesh.position);
      halo.position.y = 0.01;
      scene.add(halo);
      activeHalos.set(clickedMesh, halo);

      playObjectPulseAnimation(clickedMesh, halo, () => {
        scene.remove(halo);
        (halo.geometry as THREE.BufferGeometry).dispose();
        (halo.material as THREE.Material).dispose();
        activeHalos.delete(clickedMesh);
      });
    }
  };

  renderer.domElement.addEventListener('click', handleClick);

  return { raycaster, mouse, activeHalos };
}

function main(): void {
  const context = init();
  const { scene, camera, renderer, objects, lights } = context;

  const materialSwitcher = new MaterialSwitcher();
  materialSwitcher.setTargets([objects.sphere, objects.cube, objects.torusKnot]);

  const controls = new OrbitControlsManager(camera, renderer.domElement);
  controls.setTargetGroup(objects.group);

  const uiPanel = new UIPanel('ui-panel', materialSwitcher.getPresets(), {
    onMaterialSelect: (index: number) => {
      materialSwitcher.switchTo(index, true);
    },
    onLightIntensityChange: (intensity: number) => {
      updateLightIntensity(lights, intensity);
    },
    onAmbientColorToggle: () => {
      const currentColor = lights.ambient.color.clone();
      const warmColor = new THREE.Color(0xffd699);
      const coolColor = new THREE.Color(0xb0d4ff);
      const targetColor = currentColor.equals(warmColor) ? coolColor : warmColor;

      const proxy = { r: currentColor.r, g: currentColor.g, b: currentColor.b };
      gsap.to(proxy, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.0,
        ease: 'power2.out',
        onUpdate: () => {
          lights.ambient.color.setRGB(proxy.r, proxy.g, proxy.b);
        },
      });
    },
    onResetView: () => {
      controls.resetView();
    },
  });

  setupInteraction(context, materialSwitcher);

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsUpdateTime = 0;

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = currentTime - lastTime;
    lastTime = currentTime;

    const clockDelta = clock.getDelta();

    controls.update(delta);

    animateObjects(objects, delta);

    const cameraDistance = controls.getDistance();
    updateGridOpacity(objects.gridHelper, cameraDistance);

    lights.point.position.copy(camera.position);

    frameCount++;
    fpsUpdateTime += delta;
    if (fpsUpdateTime >= 1000) {
      const fps = (frameCount * 1000) / fpsUpdateTime;
      if (fps < 30) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }
      frameCount = 0;
      fpsUpdateTime = 0;
    }

    renderer.render(scene, camera);
  }

  animate();

  const handleResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', handleResize);

  const handleBeforeUnload = (): void => {
    materialSwitcher.dispose();
    controls.dispose();
    uiPanel.destroy();
    renderer.dispose();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
}

main();
