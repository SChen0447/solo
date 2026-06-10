import * as THREE from 'three';

export class Road {
  public group: THREE.Group;
  public readonly roadLength = 20;
  public readonly roadWidth = 6;
  public readonly laneWidth = 1;
  public readonly stopLineDistance = 4;

  constructor() {
    this.group = new THREE.Group();
    this.createRoadSurface();
    this.createLaneLines();
    this.createCrosswalks();
    this.createCenterCircle();
  }

  private createRoadSurface(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.9,
      metalness: 0.1,
    });

    const roadX = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roadLength, this.roadWidth),
      roadMaterial
    );
    roadX.rotation.x = -Math.PI / 2;
    roadX.receiveShadow = true;
    this.group.add(roadX);

    const roadZ = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roadWidth, this.roadLength),
      roadMaterial
    );
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.receiveShadow = true;
    this.group.add(roadZ);
  }

  private createLaneLines(): void {
    const dashLength = 0.5;
    const gapLength = 0.5;
    const segmentLength = dashLength + gapLength;

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let lane = -2; lane <= 2; lane += 2) {
      if (lane === 0) continue;
      const z = lane * this.laneWidth * 0.5 + (lane > 0 ? this.laneWidth * 0.25 : -this.laneWidth * 0.25);
      const totalDashes = Math.floor(this.roadLength / segmentLength);
      for (let i = 0; i < totalDashes; i++) {
        const x = -this.roadLength / 2 + i * segmentLength + dashLength / 2;
        if (Math.abs(x) < this.roadWidth / 2) continue;
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(dashLength, 0.08),
          lineMaterial
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.01, z);
        this.group.add(dash);
      }
    }

    for (let lane = -2; lane <= 2; lane += 2) {
      if (lane === 0) continue;
      const x = lane * this.laneWidth * 0.5 + (lane > 0 ? this.laneWidth * 0.25 : -this.laneWidth * 0.25);
      const totalDashes = Math.floor(this.roadLength / segmentLength);
      for (let i = 0; i < totalDashes; i++) {
        const z = -this.roadLength / 2 + i * segmentLength + dashLength / 2;
        if (Math.abs(z) < this.roadWidth / 2) continue;
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.08, dashLength),
          lineMaterial
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.01, z);
        this.group.add(dash);
      }
    }

    this.createStopLines();
  }

  private createStopLines(): void {
    const stopLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stopLineWidth = this.roadWidth / 2 - 0.1;
    const stopLineLength = 0.2;

    const stopNorth = new THREE.Mesh(
      new THREE.PlaneGeometry(stopLineWidth, stopLineLength),
      stopLineMaterial
    );
    stopNorth.rotation.x = -Math.PI / 2;
    stopNorth.position.set(-stopLineWidth / 4, 0.01, -this.stopLineDistance);
    this.group.add(stopNorth);

    const stopSouth = new THREE.Mesh(
      new THREE.PlaneGeometry(stopLineWidth, stopLineLength),
      stopLineMaterial
    );
    stopSouth.rotation.x = -Math.PI / 2;
    stopSouth.position.set(stopLineWidth / 4, 0.01, this.stopLineDistance);
    this.group.add(stopSouth);

    const stopWest = new THREE.Mesh(
      new THREE.PlaneGeometry(stopLineLength, stopLineWidth),
      stopLineMaterial
    );
    stopWest.rotation.x = -Math.PI / 2;
    stopWest.position.set(-this.stopLineDistance, 0.01, stopLineWidth / 4);
    this.group.add(stopWest);

    const stopEast = new THREE.Mesh(
      new THREE.PlaneGeometry(stopLineLength, stopLineWidth),
      stopLineMaterial
    );
    stopEast.rotation.x = -Math.PI / 2;
    stopEast.position.set(this.stopLineDistance, 0.01, -stopLineWidth / 4);
    this.group.add(stopEast);
  }

  private createCrosswalks(): void {
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stripeWidth = 0.4;
    const stripeGap = 0.2;
    const crosswalkLength = this.roadWidth / 2 - 0.5;
    const stripeCount = Math.floor(crosswalkLength / (stripeWidth + stripeGap));

    const offsetFromRoad = this.roadWidth / 2 + 0.3;

    for (let i = 0; i < stripeCount; i++) {
      const offset = -crosswalkLength / 2 + i * (stripeWidth + stripeGap) + stripeWidth / 2;
      const positions = [
        { x: offset, z: -offsetFromRoad },
        { x: offset, z: offsetFromRoad },
        { x: -offsetFromRoad, z: offset },
        { x: offsetFromRoad, z: offset },
      ];
      positions.forEach((pos, idx) => {
        const isHorizontal = idx < 2;
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(
            isHorizontal ? stripeWidth : crosswalkLength,
            isHorizontal ? crosswalkLength : stripeWidth
          ),
          stripeMaterial
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(pos.x, 0.01, pos.z);
        this.group.add(stripe);
      });
    }
  }

  private createCenterCircle(): void {
    const circleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const circle = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 48),
      circleMaterial
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.005;
    circle.receiveShadow = true;
    this.group.add(circle);
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
