import * as THREE from 'three';

export interface StarData {
  id: number;
  position: THREE.Vector3;
  magnitude: number;
  distance: number;
  azimuth: number;
  elevation: number;
  color: THREE.Color;
  twinkleSpeed: number;
  twinkleOffset: number;
  baseSize: number;
  mesh: THREE.Mesh | null;
}

const STAR_COUNT = 800;
const HEMISPHERE_RADIUS = 200;

const vertexShader = `
  attribute float aSize;
  attribute float aTwinkleSpeed;
  attribute float aTwinkleOffset;
  attribute vec3 aStarColor;
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aStarColor;
    float phase = uTime * aTwinkleSpeed + aTwinkleOffset;
    float twinkle = 0.5 + 0.5 * sin(phase * 6.28318530718);
    vAlpha = 0.4 + 0.6 * twinkle;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    float scaleFactor = 300.0 / max(dist, 1.0);
    gl_PointSize = aSize * scaleFactor * (0.7 + 0.3 * twinkle);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.15, d);
    vec3 col = vColor * glow + vec3(1.0) * core * 0.5;
    gl_FragColor = vec4(col, vAlpha * glow);
  }
`;

export class StarField {
  stars: StarData[] = [];
  particles: THREE.Points | null = null;
  hitSpheres: THREE.Mesh[] = [];
  scene: THREE.Scene;
  raycaster = new THREE.Raycaster();
  highlightMesh: THREE.Mesh | null = null;
  highlightTimeout: number | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generateData(STAR_COUNT);
    this.createParticles();
    this.createHitSpheres();
    this.createHighlightMesh();
  }

  generateData(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const azimuth = Math.random() * Math.PI * 2;
      const elevation = Math.random() * (Math.PI / 2);
      const x = HEMISPHERE_RADIUS * Math.cos(elevation) * Math.cos(azimuth);
      const y = HEMISPHERE_RADIUS * Math.sin(elevation);
      const z = HEMISPHERE_RADIUS * Math.cos(elevation) * Math.sin(azimuth);
      const t = Math.random();
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0xa0c4ff),
        t
      );
      const magnitude = 1.0 + Math.random() * 5.5;
      const distance = 4.5 + Math.random() * 1495.5;
      const twinkleSpeed = 1.0 / (1.5 + Math.random() * 2.5);
      const twinkleOffset = Math.random() * Math.PI * 2;
      const baseSize = 1.0 + (6.5 - magnitude) / 5.5 * 2.0;
      this.stars.push({
        id: i,
        position: new THREE.Vector3(x, y, z),
        magnitude: parseFloat(magnitude.toFixed(1)),
        distance: parseFloat(distance.toFixed(1)),
        azimuth: parseFloat((azimuth * 180 / Math.PI).toFixed(1)),
        elevation: parseFloat((elevation * 180 / Math.PI).toFixed(1)),
        color,
        twinkleSpeed,
        twinkleOffset,
        baseSize,
        mesh: null,
      });
    }
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.stars.length * 3);
    const sizes = new Float32Array(this.stars.length);
    const twinkleSpeeds = new Float32Array(this.stars.length);
    const twinkleOffsets = new Float32Array(this.stars.length);
    const colors = new Float32Array(this.stars.length * 3);

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      positions[i * 3] = s.position.x;
      positions[i * 3 + 1] = s.position.y;
      positions[i * 3 + 2] = s.position.z;
      sizes[i] = s.baseSize;
      twinkleSpeeds[i] = s.twinkleSpeed;
      twinkleOffsets[i] = s.twinkleOffset;
      colors[i * 3] = s.color.r;
      colors[i * 3 + 1] = s.color.g;
      colors[i * 3 + 2] = s.color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    geometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1));
    geometry.setAttribute('aStarColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createHitSpheres() {
    const sphereGeo = new THREE.SphereGeometry(1.5, 8, 6);
    const sphereMat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });

    for (const star of this.stars) {
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.copy(star.position);
      mesh.userData = { starId: star.id };
      star.mesh = mesh;
      this.hitSpheres.push(mesh);
      this.scene.add(mesh);
    }
  }

  createHighlightMesh() {
    const geo = new THREE.SphereGeometry(2.5, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.9,
    });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);
  }

  hitTest(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): StarData | null {
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(this.hitSpheres);
    if (intersects.length > 0) {
      const starId = intersects[0].object.userData.starId;
      return this.stars[starId] || null;
    }
    return null;
  }

  highlightStar(star: StarData) {
    if (!this.highlightMesh) return;
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.highlightMesh.position.copy(star.position);
    this.highlightMesh.visible = true;
    this.highlightMesh.scale.set(1, 1, 1);

    const startTime = performance.now();
    const duration = 600;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = elapsed / duration;
      if (t >= 1) {
        this.highlightMesh!.visible = false;
        return;
      }
      const scale = 1.0 + 0.5 * Math.sin(t * Math.PI);
      this.highlightMesh!.scale.set(scale, scale, scale);
      (this.highlightMesh!.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  getBrightStars(count: number): StarData[] {
    return [...this.stars]
      .sort((a, b) => a.magnitude - b.magnitude)
      .slice(0, Math.min(count * 3, this.stars.length))
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  update(time: number) {
    if (this.particles) {
      (this.particles.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
  }
}
