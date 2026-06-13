import * as THREE from 'three';

interface StarData {
  id: number;
  core: THREE.Mesh;
  glow: THREE.Mesh;
  halo: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: Float32Array;
  isDragging: boolean;
  haloProgress: number;
  haloActive: boolean;
  rotationSpeed: number;
}

export class StarCoreManager {
  private scene: THREE.Scene;
  private stars: StarData[] = [];
  private starIdCounter: number = 0;
  private raycaster: THREE.Raycaster;
  private _camera: THREE.PerspectiveCamera;
  private draggedStar: StarData | null = null;
  private threadManager: any = null;

  constructor(scene: THREE.Scene, raycaster: THREE.Raycaster, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.raycaster = raycaster;
    this._camera = camera;
  }

  public setThreadManager(manager: any): void {
    this.threadManager = manager;
  }

  public createStarCore(position: THREE.Vector3): StarData {
    const coreGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.copy(position);
    core.userData.isStarCore = true;
    core.userData.starId = this.starIdCounter;

    const glowGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);

    const haloGeometry = new THREE.RingGeometry(0, 0.01, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(position);
    halo.position.z = 0.1;

    const trailLength = 30;
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailLength * 3);
    const trailColors = new Float32Array(trailLength * 3);
    const trailSizes = new Float32Array(trailLength);

    for (let i = 0; i < trailLength; i++) {
      trailPositions[i * 3] = position.x;
      trailPositions[i * 3 + 1] = position.y;
      trailPositions[i * 3 + 2] = position.z;

      trailColors[i * 3] = 1;
      trailColors[i * 3 + 1] = 0.9;
      trailColors[i * 3 + 2] = 0.6;

      trailSizes[i] = 0.05 * (1 - i / trailLength);
    }

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const trail = new THREE.Points(trailGeometry, trailMaterial);

    const starData: StarData = {
      id: this.starIdCounter++,
      core,
      glow,
      halo,
      trail,
      trailPositions,
      isDragging: false,
      haloProgress: 0,
      haloActive: true,
      rotationSpeed: 0.5 + Math.random() * 0.5
    };

    this.stars.push(starData);
    this.scene.add(core);
    this.scene.add(glow);
    this.scene.add(halo);
    this.scene.add(trail);

    return starData;
  }

  public handleMouseMove(_mouse: THREE.Vector2, _event: MouseEvent): void {
    if (this.draggedStar) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, point);

      if (point) {
        this.draggedStar.core.position.x = point.x;
        this.draggedStar.core.position.y = point.y;
        this.draggedStar.glow.position.x = point.x;
        this.draggedStar.glow.position.y = point.y;
        this.draggedStar.halo.position.x = point.x;
        this.draggedStar.halo.position.y = point.y;

        this.updateTrail(this.draggedStar);

        if (this.threadManager) {
          this.threadManager.updateThreadForStar(this.draggedStar.id, point);
        }
      }
    } else {
      const starMeshes = this.stars.map((s) => s.core);
      const intersects = this.raycaster.intersectObjects(starMeshes);

      if (intersects.length > 0) {
        document.body.style.cursor = 'grab';
      }
    }
  }

  public handleMouseDown(_mouse: THREE.Vector2, _event: MouseEvent): boolean {
    const starMeshes = this.stars.map((s) => s.core);
    const intersects = this.raycaster.intersectObjects(starMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const starData = this.stars.find((s) => s.core === hitMesh);

      if (starData) {
        this.draggedStar = starData;
        starData.isDragging = true;
        document.body.style.cursor = 'grabbing';
        return true;
      }
    }
    return false;
  }

  public handleMouseUp(): void {
    if (this.draggedStar) {
      this.draggedStar.isDragging = false;
      this.draggedStar = null;
      document.body.style.cursor = 'default';
    }
  }

  private updateTrail(star: StarData): void {
    const positions = star.trailPositions;

    for (let i = positions.length / 3 - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    positions[0] = star.core.position.x;
    positions[1] = star.core.position.y;
    positions[2] = star.core.position.z;

    star.trail.geometry.attributes.position.needsUpdate = true;
  }

  public update(delta: number, elapsed: number): void {
    this.stars.forEach((star) => {
      star.core.rotation.y += star.rotationSpeed * delta;
      star.glow.rotation.y -= star.rotationSpeed * 0.5 * delta;

      const pulse = 1 + Math.sin(elapsed * 2 + star.id) * 0.15;
      star.glow.scale.setScalar(pulse);

      const glowMat = star.glow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.25 + Math.sin(elapsed * 2 + star.id) * 0.1;

      if (star.haloActive) {
        star.haloProgress += delta * 1.5;

        if (star.haloProgress < 1) {
          const haloSize = star.haloProgress * 1.2;
          star.halo.scale.setScalar(haloSize);
          const haloMat = star.halo.material as THREE.MeshBasicMaterial;
          haloMat.opacity = 0.8 * (1 - star.haloProgress);
        } else {
          star.haloActive = false;
          const haloMat = star.halo.material as THREE.MeshBasicMaterial;
          haloMat.opacity = 0;
        }
      }

      if (!star.isDragging) {
        const trailPositions = star.trail.geometry.attributes.position.array as Float32Array;
        let allSame = true;
        for (let i = 3; i < trailPositions.length; i += 3) {
          if (Math.abs(trailPositions[i] - trailPositions[0]) > 0.001 ||
              Math.abs(trailPositions[i + 1] - trailPositions[1]) > 0.001) {
            allSame = false;
            break;
          }
        }

        if (!allSame) {
          for (let i = trailPositions.length / 3 - 1; i > 0; i--) {
            trailPositions[i * 3] = trailPositions[(i - 1) * 3];
            trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
            trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
          }
          trailPositions[0] = star.core.position.x;
          trailPositions[1] = star.core.position.y;
          trailPositions[2] = star.core.position.z;
          star.trail.geometry.attributes.position.needsUpdate = true;

          const trailMat = star.trail.material as THREE.PointsMaterial;
          trailMat.opacity = Math.max(0, trailMat.opacity - delta * 0.5);
        }
      } else {
        const trailMat = star.trail.material as THREE.PointsMaterial;
        trailMat.opacity = 0.8;
      }
    });
  }

  public reset(): void {
    this.stars.forEach((star) => {
      this.scene.remove(star.core);
      this.scene.remove(star.glow);
      this.scene.remove(star.halo);
      this.scene.remove(star.trail);
      star.core.geometry.dispose();
      (star.core.material as THREE.Material).dispose();
      star.glow.geometry.dispose();
      (star.glow.material as THREE.Material).dispose();
      star.halo.geometry.dispose();
      (star.halo.material as THREE.Material).dispose();
      star.trail.geometry.dispose();
      (star.trail.material as THREE.Material).dispose();
    });
    this.stars = [];
    this.draggedStar = null;
  }

  public getStars(): StarData[] {
    return this.stars;
  }
}
