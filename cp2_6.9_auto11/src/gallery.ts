import * as THREE from 'three';
import { ArtworkData, getNextArtwork, createArtworkTexture, resetArtworkPool } from './artwork';

export interface FrameObject {
  group: THREE.Group;
  canvasMesh: THREE.Mesh;
  frameBorder: THREE.Mesh;
  glowMesh: THREE.Mesh;
  artwork: ArtworkData;
  wallNormal: THREE.Vector3;
}

export interface GalleryObjects {
  group: THREE.Group;
  frames: FrameObject[];
  walls: THREE.Mesh[];
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    centerX: number;
    centerZ: number;
    width: number;
    depth: number;
    height: number;
  };
}

const WALL_COLOR = 0x2d2d44;
const FLOOR_COLOR = 0x3a3a5c;
const CEILING_COLOR = 0x252538;
const FRAME_GOLD = 0xb8964f;
const FRAME_SILVER = 0xa8b0c0;

const GALLERY_WIDTH = 40;
const GALLERY_DEPTH = 40;
const GALLERY_HEIGHT = 6;

function createFloor(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(GALLERY_WIDTH, GALLERY_DEPTH, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: FLOOR_COLOR,
    roughness: 0.85,
    metalness: 0.05
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createCeiling(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(GALLERY_WIDTH, GALLERY_DEPTH, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: CEILING_COLOR,
    roughness: 0.9,
    metalness: 0.0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = GALLERY_HEIGHT;
  return mesh;
}

interface WallSpec {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
  height: number;
}

function getWallSpecs(): WallSpec[] {
  const hw = GALLERY_WIDTH / 2;
  const hd = GALLERY_DEPTH / 2;
  const h = GALLERY_HEIGHT;
  const halfH = h / 2;

  return [
    {
      position: new THREE.Vector3(0, halfH, -hd),
      normal: new THREE.Vector3(0, 0, 1),
      width: GALLERY_WIDTH,
      height: h
    },
    {
      position: new THREE.Vector3(0, halfH, hd),
      normal: new THREE.Vector3(0, 0, -1),
      width: GALLERY_WIDTH,
      height: h
    },
    {
      position: new THREE.Vector3(-hw, halfH, 0),
      normal: new THREE.Vector3(1, 0, 0),
      width: GALLERY_DEPTH,
      height: h
    },
    {
      position: new THREE.Vector3(hw, halfH, 0),
      normal: new THREE.Vector3(-1, 0, 0),
      width: GALLERY_DEPTH,
      height: h
    },
    {
      position: new THREE.Vector3(-hw * 0.4, halfH, 0),
      normal: new THREE.Vector3(1, 0, 0),
      width: h * 1.5,
      height: h
    },
    {
      position: new THREE.Vector3(hw * 0.4, halfH, 0),
      normal: new THREE.Vector3(-1, 0, 0),
      width: h * 1.5,
      height: h
    },
    {
      position: new THREE.Vector3(0, halfH, -hd * 0.4),
      normal: new THREE.Vector3(0, 0, 1),
      width: h * 2,
      height: h
    },
    {
      position: new THREE.Vector3(0, halfH, hd * 0.4),
      normal: new THREE.Vector3(0, 0, -1),
      width: h * 2,
      height: h
    }
  ];
}

function createWall(spec: WallSpec): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(spec.width, spec.height, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(spec.position);
  if (Math.abs(spec.normal.x) > 0.1) {
    mesh.rotation.y = Math.PI / 2;
  }
  mesh.receiveShadow = true;
  return mesh;
}

function createArtworkFrame(
  position: THREE.Vector3,
  wallNormal: THREE.Vector3,
  canvasW: number,
  canvasH: number
): FrameObject | null {
  const borderDepth = 0.08;
  const borderWidth = 0.18;

  const isGold = Math.random() > 0.5;
  const frameColor = isGold ? FRAME_GOLD : FRAME_SILVER;
  const frameMetalness = isGold ? 0.85 : 0.9;
  const frameRoughness = isGold ? 0.25 : 0.18;

  const totalW = canvasW + borderWidth * 2;
  const totalH = canvasH + borderWidth * 2;

  const group = new THREE.Group();
  group.position.copy(position);

  const borderGeo = new THREE.BoxGeometry(totalW, totalH, borderDepth);
  const borderInnerGeo = new THREE.BoxGeometry(canvasW, canvasH, borderDepth + 0.001);

  const borderMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    metalness: frameMetalness,
    roughness: frameRoughness
  });

  const borderMesh = new THREE.Mesh(borderGeo, borderMat);

  const canvasGeo = new THREE.PlaneGeometry(canvasW, canvasH, 1, 1);
  const artwork = getNextArtwork();
  const texture = createArtworkTexture(artwork, 512, 512 * (canvasH / canvasW));
  const canvasMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.0
  });
  const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  canvasMesh.position.z = borderDepth / 2 + 0.002;

  const glowGeo = new THREE.PlaneGeometry(totalW + 0.4, totalH + 0.4, 1, 1);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xfff8dc,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.z = -0.02;

  group.add(borderMesh);
  group.add(canvasMesh);
  group.add(glowMesh);

  if (Math.abs(wallNormal.x) > 0.1) {
    group.rotation.y = wallNormal.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else if (Math.abs(wallNormal.z) > 0.1) {
    if (wallNormal.z < 0) {
      group.rotation.y = Math.PI;
    }
  }

  return {
    group,
    canvasMesh,
    frameBorder: borderMesh,
    glowMesh,
    artwork,
    wallNormal: wallNormal.clone()
  };
}

function distributeFramesOnWall(
  wallSpec: WallSpec,
  count: number,
  results: FrameObject[]
): void {
  const usableWidth = wallSpec.width * 0.82;
  const startX = -usableWidth / 2;
  const gap = usableWidth / count;
  const wallNormal = wallSpec.normal.clone();

  const heightBase = GALLERY_HEIGHT * 0.42;

  for (let i = 0; i < count; i++) {
    const localX = startX + gap * (i + 0.5) + (Math.random() - 0.5) * 0.4;
    const canvasW = 1.4 + Math.random() * 0.8;
    const canvasH = 1.0 + Math.random() * 1.0;
    const yOffset = (Math.random() - 0.5) * 0.5;

    let pos: THREE.Vector3;
    if (Math.abs(wallNormal.x) > 0.1) {
      pos = new THREE.Vector3(
        wallSpec.position.x + wallNormal.x * 0.05,
        heightBase + yOffset,
        wallSpec.position.z + localX
      );
    } else {
      pos = new THREE.Vector3(
        wallSpec.position.x + localX,
        heightBase + yOffset,
        wallSpec.position.z + wallNormal.z * 0.05
      );
    }

    const frame = createArtworkFrame(pos, wallNormal, canvasW, canvasH);
    if (frame) {
      results.push(frame);
    }
  }
}

export function buildGallery(scene: THREE.Scene): GalleryObjects {
  resetArtworkPool();

  const galleryGroup = new THREE.Group();
  galleryGroup.name = 'gallery';

  const floor = createFloor();
  const ceiling = createCeiling();
  galleryGroup.add(floor);
  galleryGroup.add(ceiling);

  const wallSpecs = getWallSpecs();
  const walls: THREE.Mesh[] = [];
  const frames: FrameObject[] = [];

  for (const spec of wallSpecs) {
    const wall = createWall(spec);
    walls.push(wall);
    galleryGroup.add(wall);

    const frameCount = 3 + Math.floor(Math.random() * 3);
    distributeFramesOnWall(spec, frameCount, frames);
  }

  for (const frame of frames) {
    galleryGroup.add(frame.group);
  }

  scene.add(galleryGroup);

  const hw = GALLERY_WIDTH / 2;
  const hd = GALLERY_DEPTH / 2;

  return {
    group: galleryGroup,
    frames,
    walls,
    bounds: {
      minX: -hw + 1,
      maxX: hw - 1,
      minZ: -hd + 1,
      maxZ: hd - 1,
      centerX: 0,
      centerZ: 0,
      width: GALLERY_WIDTH,
      depth: GALLERY_DEPTH,
      height: GALLERY_HEIGHT
    }
  };
}
