import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ArtworkData, GallerySceneRef } from '../types';
import { easeOutBack, lerp } from '../utils/helpers';
import ArtworkModal from './ArtworkModal';

interface GallerySceneProps {
  visitorMode?: boolean;
  initialArtworks?: ArtworkData[];
  onArtworkClick?: (artwork: ArtworkData) => void;
  onArtworksChange?: (artworks: ArtworkData[]) => void;
}

interface ArtworkMeshData {
  group: THREE.Group;
  frame: THREE.Mesh;
  image: THREE.Mesh;
  artwork: ArtworkData;
  originalPosition: THREE.Vector3;
  isAnimating: boolean;
}

const ROOM_WIDTH = 8;
const ROOM_HEIGHT = 3;
const ROOM_DEPTH = 6;
const WALL_COLOR = 0xe8e0d4;
const CEILING_COLOR = 0xf5f0e8;
const FLOOR_COLOR = 0x5d4037;
const FRAME_COLOR = 0xc8a96e;
const FRAME_BORDER = 0.04;
const SNAP_THRESHOLD = 0.08;

const GalleryScene = forwardRef<GallerySceneRef, GallerySceneProps>(({
  visitorMode = false,
  initialArtworks = [],
  onArtworkClick,
  onArtworksChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const artworksRef = useRef<Map<string, ArtworkMeshData>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const draggingRef = useRef<{ id: string; offset: THREE.Vector3; plane: THREE.Plane } | null>(null);
  const animatingRef = useRef<Map<string, { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number }>>(new Map());
  const wallPlanesRef = useRef<THREE.Plane[]>([]);
  const roomDimensionsRef = useRef({ width: ROOM_WIDTH, height: ROOM_HEIGHT, depth: ROOM_DEPTH });
  const wallMeshesRef = useRef<THREE.Mesh[]>([]);
  const [modalArtwork, setModalArtwork] = useState<ArtworkData | null>(null);
  const artworksDataRef = useRef<ArtworkData[]>([]);

  useImperativeHandle(ref, () => ({
    addArtwork: (artwork: ArtworkData) => {
      addArtworkToScene(artwork);
    },
    removeArtwork: (id: string) => {
      removeArtworkFromScene(id);
    },
    updateArtworkName: (id: string, name: string) => {
      const data = artworksDataRef.current.find(a => a.id === id);
      if (data) data.name = name;
    },
    exportLayout: () => {
      return [...artworksDataRef.current];
    },
    addWall: () => {
      expandRoom();
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    initScene();
    return () => {
      dispose();
    };
  }, []);

  useEffect(() => {
    if (initialArtworks.length > 0) {
      initialArtworks.forEach(a => addArtworkToScene(a));
    }
  }, [initialArtworks]);

  const initScene = () => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16213e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    if (visitorMode) {
      camera.position.set(0, 1.5, 6);
      camera.lookAt(0, 1, 0);
    } else {
      camera.position.set(0, 4, 10);
      camera.lookAt(0, 1, 0);
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);
    if (visitorMode) {
      controls.minDistance = 2;
      controls.maxDistance = 10;
      controls.maxPolarAngle = Math.PI * 0.85;
    } else {
      controls.minDistance = 4;
      controls.maxDistance = 20;
    }
    controlsRef.current = controls;

    createRoom(scene);
    setupLights(scene);

    if (!visitorMode) {
      setupInteraction();
    }

    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
  };

  const createRoom = (scene: THREE.Scene) => {
    const { width, height, depth } = roomDimensionsRef.current;

    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.6,
      metalness: 0.1,
      envMapIntensity: 0.3
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilingGeo = new THREE.PlaneGeometry(width, depth);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, side: THREE.BackSide });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    scene.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.85 });

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    frontWall.position.set(0, height / 2, -depth / 2);
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    backWall.position.set(0, height / 2, depth / 2);
    backWall.rotation.y = Math.PI;
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    wallMeshesRef.current = [frontWall, backWall, leftWall, rightWall];

    wallPlanesRef.current = [
      new THREE.Plane(new THREE.Vector3(0, 0, 1), depth / 2),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), depth / 2),
      new THREE.Plane(new THREE.Vector3(1, 0, 0), width / 2),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), width / 2)
    ];
  };

  const setupLights = (scene: THREE.Scene) => {
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    mainLight.position.set(-4, 5, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
    fillLight.position.set(4, 2, -3);
    scene.add(fillLight);

    const bounce = new THREE.HemisphereLight(0xf5f0e8, 0x5d4037, 0.2);
    scene.add(bounce);
  };

  const setupInteraction = () => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
  };

  const updateMouse = (e: MouseEvent) => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    updateMouse(e);
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const artworkMeshes = Array.from(artworksRef.current.values()).map(d => d.image);
    const intersects = raycasterRef.current.intersectObjects(artworkMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const entry = Array.from(artworksRef.current.values()).find(d => d.image === hitMesh);
      if (entry) {
        controlsRef.current!.enabled = false;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          entry.group.position
        );
        const hitPoint = intersects[0].point.clone();
        const offset = entry.group.position.clone().sub(hitPoint);
        draggingRef.current = { id: entry.artwork.id, offset, plane };
        entry.isAnimating = false;
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    updateMouse(e);
    const camera = cameraRef.current;
    if (!camera) return;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersection = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(draggingRef.current.plane, intersection);
    if (!intersection) return;

    const entry = artworksRef.current.get(draggingRef.current.id);
    if (!entry) return;

    const newPos = intersection.add(draggingRef.current.offset);
    entry.group.position.copy(newPos);
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!draggingRef.current) {
      if (e.button === 0) {
        handleClick(e);
      }
      return;
    }

    const id = draggingRef.current.id;
    const entry = artworksRef.current.get(id);
    draggingRef.current = null;
    controlsRef.current!.enabled = true;

    if (!entry) return;

    const { width, height } = roomDimensionsRef.current;
    const wallWidth = width - 0.4;
    const wallHeight = height - 0.6;

    const pos = entry.group.position;
    let inBounds = Math.abs(pos.x) < wallWidth / 2 && pos.y > 0.3 && pos.y < height - 0.3 && Math.abs(pos.z + ROOM_DEPTH / 2) < 0.3;

    if (!inBounds) {
      animatePosition(id, pos.clone(), entry.originalPosition.clone(), 1000, false);
    } else {
      const relX = (pos.x + wallWidth / 2) / wallWidth;
      const relY = (pos.y - 0.3) / wallHeight;

      const snapX = Math.round(relX * 3) / 3;
      const snapY = Math.round(relY * 3) / 3;

      const distX = Math.abs(relX - snapX);
      const distY = Math.abs(relY - snapY);

      if (distX < SNAP_THRESHOLD || distY < SNAP_THRESHOLD) {
        const finalRelX = distX < SNAP_THRESHOLD ? snapX : relX;
        const finalRelY = distY < SNAP_THRESHOLD ? snapY : relY;
        const targetPos = new THREE.Vector3(
          finalRelX * wallWidth - wallWidth / 2,
          finalRelY * wallHeight + 0.3,
          -ROOM_DEPTH / 2 + 0.02
        );
        animatePosition(id, pos.clone(), targetPos, 300, true);

        const artworkData = artworksDataRef.current.find(a => a.id === id);
        if (artworkData) {
          artworkData.x = finalRelX;
          artworkData.y = finalRelY;
        }
      } else {
        const artworkData = artworksDataRef.current.find(a => a.id === id);
        if (artworkData) {
          artworkData.x = relX;
          artworkData.y = relY;
        }
      }
      entry.originalPosition.copy(entry.group.position);
      onArtworksChange?.([...artworksDataRef.current]);
    }
  };

  const handleClick = (e: MouseEvent) => {
    updateMouse(e);
    const camera = cameraRef.current;
    if (!camera) return;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const artworkMeshes = Array.from(artworksRef.current.values()).map(d => d.image);
    const intersects = raycasterRef.current.intersectObjects(artworkMeshes, false);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const entry = Array.from(artworksRef.current.values()).find(d => d.image === hitMesh);
      if (entry) {
        if (visitorMode) {
          onArtworkClick?.(entry.artwork);
        } else {
          setModalArtwork(entry.artwork);
        }
      }
    }
  };

  const animatePosition = (id: string, from: THREE.Vector3, to: THREE.Vector3, duration: number, elastic: boolean) => {
    animatingRef.current.set(id, { from, to, start: performance.now(), duration });
    const entry = artworksRef.current.get(id);
    if (entry) entry.isAnimating = true;
  };

  const addArtworkToScene = (artwork: ArtworkData) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = artworksRef.current.get(artwork.id);
    if (existing) return;

    const loader = new THREE.TextureLoader();
    loader.load(artwork.imageData, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;

      const imgAspect = texture.image.width / texture.image.height;
      const maxArtW = 1.2;
      const maxArtH = 1.4;
      let artW = maxArtW;
      let artH = artW / imgAspect;
      if (artH > maxArtH) {
        artH = maxArtH;
        artW = artH * imgAspect;
      }

      const group = new THREE.Group();

      const frameGeo = new THREE.PlaneGeometry(artW + FRAME_BORDER * 2, artH + FRAME_BORDER * 2);
      const frameMat = new THREE.MeshStandardMaterial({
        color: FRAME_COLOR,
        roughness: 0.4,
        metalness: 0.6,
        side: THREE.DoubleSide
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      group.add(frame);

      const imgGeo = new THREE.PlaneGeometry(artW, artH);
      const imgMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0
      });
      const image = new THREE.Mesh(imgGeo, imgMat);
      image.position.z = 0.005;
      image.userData.artworkId = artwork.id;
      group.add(image);

      const { width, height } = roomDimensionsRef.current;
      const wallWidth = width - 0.4;
      const wallHeight = height - 0.6;

      const posX = artwork.x * wallWidth - wallWidth / 2;
      const posY = artwork.y * wallHeight + 0.3;
      group.position.set(posX, posY, -ROOM_DEPTH / 2 + 0.02);

      scene.add(group);

      const meshData: ArtworkMeshData = {
        group,
        frame,
        image,
        artwork,
        originalPosition: group.position.clone(),
        isAnimating: false
      };
      artworksRef.current.set(artwork.id, meshData);
      artworksDataRef.current.push(artwork);
      onArtworksChange?.([...artworksDataRef.current]);
    });
  };

  const removeArtworkFromScene = (id: string) => {
    const scene = sceneRef.current;
    const entry = artworksRef.current.get(id);
    if (!scene || !entry) return;

    scene.remove(entry.group);
    entry.frame.geometry.dispose();
    (entry.frame.material as THREE.Material).dispose();
    entry.image.geometry.dispose();
    const imgMat = entry.image.material as THREE.MeshStandardMaterial;
    if (imgMat.map) imgMat.map.dispose();
    imgMat.dispose();

    artworksRef.current.delete(id);
    animatingRef.current.delete(id);
    artworksDataRef.current = artworksDataRef.current.filter(a => a.id !== id);
    onArtworksChange?.([...artworksDataRef.current]);
  };

  const expandRoom = () => {
    const dims = roomDimensionsRef.current;
    dims.width += 2;

    const scene = sceneRef.current;
    if (!scene) return;
    wallMeshesRef.current.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    const oldFloor = scene.children.find(c => c.type === 'Mesh' && (c as THREE.Mesh).geometry instanceof THREE.PlaneGeometry && Math.abs((c as THREE.Mesh).rotation.x + Math.PI / 2) < 0.01);
    if (oldFloor) { scene.remove(oldFloor); (oldFloor as THREE.Mesh).geometry.dispose(); }
    const oldCeiling = scene.children.find(c => c.position.y > 2.5);
    if (oldCeiling && oldCeiling.type === 'Mesh') { scene.remove(oldCeiling); (oldCeiling as THREE.Mesh).geometry.dispose(); }
    createRoom(scene);
  };

  const animate = () => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !renderer) return;

    requestAnimationFrame(animate);

    const now = performance.now();
    animatingRef.current.forEach((anim, id) => {
      const entry = artworksRef.current.get(id);
      if (!entry) { animatingRef.current.delete(id); return; }
      const t = Math.min((now - anim.start) / anim.duration, 1);
      const eased = anim.duration <= 300 ? easeOutBack(t) : t;
      entry.group.position.set(
        lerp(anim.from.x, anim.to.x, eased),
        lerp(anim.from.y, anim.to.y, eased),
        lerp(anim.from.z, anim.to.z, eased)
      );
      if (t >= 1) {
        entry.isAnimating = false;
        animatingRef.current.delete(id);
      }
    });

    controls?.update();
    renderer.render(scene, camera);
  };

  const dispose = () => {
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    if (renderer && containerRef.current) {
      containerRef.current.removeChild(renderer.domElement);
      const canvas = renderer.domElement;
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      renderer.dispose();
    }
    controls?.dispose();
    artworksRef.current.forEach(entry => {
      entry.frame.geometry.dispose();
      (entry.frame.material as THREE.Material).dispose();
      entry.image.geometry.dispose();
      const imgMat = entry.image.material as THREE.MeshStandardMaterial;
      if (imgMat.map) imgMat.map.dispose();
      imgMat.dispose();
    });
    artworksRef.current.clear();
  };

  const handleUpdateName = (id: string, name: string) => {
    const data = artworksDataRef.current.find(a => a.id === id);
    if (data) data.name = name;
    const entry = artworksRef.current.get(id);
    if (entry) entry.artwork.name = name;
    if (modalArtwork && modalArtwork.id === id) {
      setModalArtwork({ ...modalArtwork, name });
    }
  };

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {modalArtwork && !visitorMode && (
        <ArtworkModal
          artwork={modalArtwork}
          onClose={() => setModalArtwork(null)}
          onUpdateName={handleUpdateName}
        />
      )}
    </>
  );
});

GalleryScene.displayName = 'GalleryScene';
export default GalleryScene;
