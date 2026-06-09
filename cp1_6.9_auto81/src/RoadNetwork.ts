import * as THREE from 'three';

export const ROAD_WIDTH = 8;
export const ROAD_LENGTH = 200;
export const LANE_WIDTH = 2;
export const SIDEWALK_WIDTH = 2;
export const INTERSECTION_SIZE = 12;

export type Direction = 'north' | 'south' | 'east' | 'west';

export class RoadNetwork {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.build();
  }

  private build(): void {
    this.createRoads();
    this.createIntersection();
    this.createSidewalks();
  }

  private createRoads(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.0
    });

    const roadGeometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_LENGTH);
    const roadGeometryEW = new THREE.BoxGeometry(ROAD_LENGTH, 0.2, ROAD_WIDTH);

    const roadNorth = new THREE.Mesh(roadGeometry, roadMaterial);
    roadNorth.position.set(0, 0, -ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2);
    this.group.add(roadNorth);

    const roadSouth = new THREE.Mesh(roadGeometry, roadMaterial);
    roadSouth.position.set(0, 0, ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2);
    this.group.add(roadSouth);

    const roadEast = new THREE.Mesh(roadGeometryEW, roadMaterial);
    roadEast.position.set(ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2, 0, 0);
    this.group.add(roadEast);

    const roadWest = new THREE.Mesh(roadGeometryEW, roadMaterial);
    roadWest.position.set(-ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2, 0, 0);
    this.group.add(roadWest);

    this.createLaneLines();
  }

  private createLaneLines(): void {
    const lineLength = 2;
    const lineGap = 2;
    const lineWidth = 0.1;
    const lineHeight = 0.01;

    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      emissive: 0x222222
    });

    const dashGeometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineLength);
    const dashGeometryEW = new THREE.BoxGeometry(lineLength, lineHeight, lineWidth);

    for (let lane = -1; lane <= 1; lane += 2) {
      const laneOffset = lane * LANE_WIDTH;

      for (let z = -ROAD_LENGTH / 2 + lineLength / 2; z < ROAD_LENGTH / 2; z += lineLength + lineGap) {
        const lineNorth = new THREE.Mesh(dashGeometry, lineMaterial);
        lineNorth.position.set(laneOffset, 0.12, z - ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2);
        this.group.add(lineNorth);

        const lineSouth = new THREE.Mesh(dashGeometry, lineMaterial);
        lineSouth.position.set(laneOffset, 0.12, z + ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2);
        this.group.add(lineSouth);
      }

      for (let x = -ROAD_LENGTH / 2 + lineLength / 2; x < ROAD_LENGTH / 2; x += lineLength + lineGap) {
        const lineWest = new THREE.Mesh(dashGeometryEW, lineMaterial);
        lineWest.position.set(x - ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2, 0.12, laneOffset);
        this.group.add(lineWest);

        const lineEast = new THREE.Mesh(dashGeometryEW, lineMaterial);
        lineEast.position.set(x + ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2, 0.12, laneOffset);
        this.group.add(lineEast);
      }
    }

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8
    });

    const edgeGeometry = new THREE.BoxGeometry(0.05, 0.01, ROAD_LENGTH);
    const edgeGeometryEW = new THREE.BoxGeometry(ROAD_LENGTH, 0.01, 0.05);

    for (let side of [-1, 1]) {
      const edgeOffset = side * (ROAD_WIDTH / 2 - 0.025);

      const edgeNorth = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edgeNorth.position.set(edgeOffset, 0.12, -ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2);
      this.group.add(edgeNorth);

      const edgeSouth = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edgeSouth.position.set(edgeOffset, 0.12, ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2);
      this.group.add(edgeSouth);
    }

    for (let side of [-1, 1]) {
      const edgeOffset = side * (ROAD_WIDTH / 2 - 0.025);

      const edgeWest = new THREE.Mesh(edgeGeometryEW, edgeMaterial);
      edgeWest.position.set(-ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2, 0.12, edgeOffset);
      this.group.add(edgeWest);

      const edgeEast = new THREE.Mesh(edgeGeometryEW, edgeMaterial);
      edgeEast.position.set(ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2, 0.12, edgeOffset);
      this.group.add(edgeEast);
    }
  }

  private createIntersection(): void {
    const intersectionMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9
    });

    const intersectionGeometry = new THREE.BoxGeometry(INTERSECTION_SIZE, 0.2, INTERSECTION_SIZE);
    const intersection = new THREE.Mesh(intersectionGeometry, intersectionMaterial);
    intersection.position.set(0, 0, 0);
    this.group.add(intersection);

    this.createCrosswalks();
  }

  private createCrosswalks(): void {
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7
    });

    const stripeWidth = 0.4;
    const stripeGap = 0.4;
    const stripeLength = 4;

    const stripeGeometryNS = new THREE.BoxGeometry(stripeWidth, 0.02, stripeLength);
    const stripeGeometryEW = new THREE.BoxGeometry(stripeLength, 0.02, stripeWidth);

    const crosswalkOffset = INTERSECTION_SIZE / 2 + 0.5;

    for (let x = -3; x <= 3; x++) {
      const offset = x * (stripeWidth + stripeGap);

      const stripeNorth = new THREE.Mesh(stripeGeometryNS, stripeMaterial);
      stripeNorth.position.set(offset, 0.12, -crosswalkOffset);
      this.group.add(stripeNorth);

      const stripeSouth = new THREE.Mesh(stripeGeometryNS, stripeMaterial);
      stripeSouth.position.set(offset, 0.12, crosswalkOffset);
      this.group.add(stripeSouth);
    }

    for (let z = -3; z <= 3; z++) {
      const offset = z * (stripeWidth + stripeGap);

      const stripeWest = new THREE.Mesh(stripeGeometryEW, stripeMaterial);
      stripeWest.position.set(-crosswalkOffset, 0.12, offset);
      this.group.add(stripeWest);

      const stripeEast = new THREE.Mesh(stripeGeometryEW, stripeMaterial);
      stripeEast.position.set(crosswalkOffset, 0.12, offset);
      this.group.add(stripeEast);
    }
  }

  private createSidewalks(): void {
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.95
    });

    const sidewalkOffset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2;

    const sidewalkGeometry1 = new THREE.BoxGeometry(SIDEWALK_WIDTH, 0.25, ROAD_LENGTH);
    const sidewalkGeometry2 = new THREE.BoxGeometry(ROAD_LENGTH, 0.25, SIDEWALK_WIDTH);

    for (let side of [-1, 1]) {
      const walkNorth = new THREE.Mesh(sidewalkGeometry1, sidewalkMaterial);
      walkNorth.position.set(side * sidewalkOffset, 0, -ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2);
      this.group.add(walkNorth);

      const walkSouth = new THREE.Mesh(sidewalkGeometry1, sidewalkMaterial);
      walkSouth.position.set(side * sidewalkOffset, 0, ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2);
      this.group.add(walkSouth);

      const walkWest = new THREE.Mesh(sidewalkGeometry2, sidewalkMaterial);
      walkWest.position.set(-ROAD_LENGTH / 2 - INTERSECTION_SIZE / 2, 0, side * sidewalkOffset);
      this.group.add(walkWest);

      const walkEast = new THREE.Mesh(sidewalkGeometry2, sidewalkMaterial);
      walkEast.position.set(ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2, 0, side * sidewalkOffset);
      this.group.add(walkEast);
    }

    const cornerSidewalkGeo = new THREE.BoxGeometry(
      SIDEWALK_WIDTH + INTERSECTION_SIZE / 2,
      0.25,
      SIDEWALK_WIDTH + INTERSECTION_SIZE / 2
    );

    const cornerOffsets = [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: -1, z: 1 },
      { x: 1, z: 1 }
    ];

    for (const corner of cornerOffsets) {
      const cornerWalk = new THREE.Mesh(cornerSidewalkGeo, sidewalkMaterial);
      cornerWalk.position.set(
        corner.x * (INTERSECTION_SIZE / 2 + SIDEWALK_WIDTH / 2),
        0,
        corner.z * (INTERSECTION_SIZE / 2 + SIDEWALK_WIDTH / 2)
      );
      this.group.add(cornerWalk);
    }
  }

  public getLanePosition(direction: Direction, laneIndex: number): { x: number; z: number; rotation: number } {
    const laneOffset = (laneIndex - 1.5) * LANE_WIDTH;

    switch (direction) {
      case 'north':
        return { x: laneOffset, z: -(ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2 + 10), rotation: 0 };
      case 'south':
        return { x: -laneOffset, z: ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2 + 10, rotation: Math.PI };
      case 'east':
        return { x: -(ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2 + 10), z: -laneOffset, rotation: Math.PI / 2 };
      case 'west':
        return { x: ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2 + 10, z: laneOffset, rotation: -Math.PI / 2 };
    }
  }

  public getStopLineDistance(_direction: Direction): number {
    return INTERSECTION_SIZE / 2 + 5;
  }
}
