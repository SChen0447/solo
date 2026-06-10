import * as THREE from 'three';

export type PrismShape = 'triangle' | 'quad' | 'hexagon';

export interface PrismFace {
  normal: THREE.Vector3;
  vertices: THREE.Vector3[];
}

export class Prism {
  public mesh: THREE.Mesh;
  public edges: THREE.LineSegments;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public shape: PrismShape;
  public color: string;
  public isHovered: boolean = false;

  private edgeMaterial: THREE.LineBasicMaterial;
  private defaultEdgeColor: number = 0xffffff;
  private hoveredEdgeColor: number = 0xffff80;

  constructor(
    shape: PrismShape,
    position: THREE.Vector3,
    color: string,
    size: number = 1.5,
    depth: number = 0.8
  ) {
    this.shape = shape;
    this.position = position.clone();
    this.rotation = new THREE.Euler(0, 0, 0);
    this.color = color;

    const geometry = this.createGeometry(shape, size, depth);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.5,
      thickness: 0.5,
      side: THREE.DoubleSide,
      ior: 1.5
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.userData.prism = this;

    const edgeGeometry = new THREE.EdgesGeometry(geometry, 0);
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: this.defaultEdgeColor,
      linewidth: 1,
      transparent: true,
      opacity: 1.0
    });
    this.edges = new THREE.LineSegments(edgeGeometry, this.edgeMaterial);
    this.edges.position.copy(this.position);
    this.edges.userData.prism = this;
  }

  private createGeometry(
    shape: PrismShape,
    size: number,
    depth: number
  ): THREE.ExtrudeGeometry {
    const shapePath = new THREE.Shape();
    let sides: number;

    switch (shape) {
      case 'triangle':
        sides = 3;
        break;
      case 'quad':
        sides = 4;
        break;
      case 'hexagon':
        sides = 6;
        break;
      default:
        sides = 6;
    }

    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        shapePath.moveTo(x, y);
      } else {
        shapePath.lineTo(x, y);
      }
    }
    shapePath.closePath();

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shapePath, extrudeSettings);
    geometry.center();
    return geometry;
  }

  public update(delta: number = 0): void {
    this.mesh.rotation.copy(this.rotation);
    this.edges.rotation.copy(this.rotation);
    this.mesh.position.copy(this.position);
    this.edges.position.copy(this.position);
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;
    if (hovered) {
      this.edgeMaterial.color.setHex(this.hoveredEdgeColor);
      this.edgeMaterial.opacity = 1.5;
    } else {
      this.edgeMaterial.color.setHex(this.defaultEdgeColor);
      this.edgeMaterial.opacity = 1.0;
    }
  }

  public rotateY(delta: number): void {
    this.rotation.y += delta;
  }

  public resetRotation(): void {
    this.rotation.set(0, 0, 0);
  }

  public getWorldFaces(): PrismFace[] {
    const faces: PrismFace[] = [];
    const geometry = this.mesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const indexAttr = geometry.getIndex();

    if (!indexAttr) return faces;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      new THREE.Matrix4().compose(
        this.mesh.position,
        new THREE.Quaternion().setFromEuler(this.rotation),
        new THREE.Vector3(1, 1, 1)
      )
    );

    const count = indexAttr.count;
    for (let i = 0; i < count; i += 3) {
      const a = indexAttr.getX(i);
      const b = indexAttr.getX(i + 1);
      const c = indexAttr.getX(i + 2);

      const va = new THREE.Vector3(
        positionAttr.getX(a),
        positionAttr.getY(a),
        positionAttr.getZ(a)
      ).applyEuler(this.rotation).add(this.position);

      const vb = new THREE.Vector3(
        positionAttr.getX(b),
        positionAttr.getY(b),
        positionAttr.getZ(b)
      ).applyEuler(this.rotation).add(this.position);

      const vc = new THREE.Vector3(
        positionAttr.getX(c),
        positionAttr.getY(c),
        positionAttr.getZ(c)
      ).applyEuler(this.rotation).add(this.position);

      const normal = new THREE.Vector3(
        normalAttr.getX(a),
        normalAttr.getY(a),
        normalAttr.getZ(a)
      ).applyMatrix3(normalMatrix).normalize();

      faces.push({
        normal,
        vertices: [va, vb, vc]
      });
    }

    return faces;
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    scene.add(this.edges);
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    scene.remove(this.edges);
  }
}
