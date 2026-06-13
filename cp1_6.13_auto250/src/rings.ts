import * as THREE from 'three';
import gsap from 'gsap';

export interface RingData {
  mesh: THREE.Mesh;
  group: THREE.Group;
  originalColor: number;
  currentColor: number;
  rotationSpeed: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  radius: number;
}

export interface RingSystem {
  group: THREE.Group;
  rings: RingData[];
  update: (delta: number, elapsed: number) => void;
  triggerColorChange: () => void;
}

const RING_CONFIGS = [
  { radius: 1.5, color: 0xff6b6b, rotationPeriod: 20 },
  { radius: 2.5, color: 0x48dbfb, rotationPeriod: 35 },
  { radius: 3.5, color: 0xfeca57, rotationPeriod: 50 },
];

const SHOCK_COLORS = [0xff9ff3, 0xa29bfe, 0xfeca57];

export function createRings(): RingSystem {
  const group = new THREE.Group();
  const rings: RingData[] = [];

  RING_CONFIGS.forEach((config, index) => {
    const ringGroup = new THREE.Group();

    const tubeGeometry = new THREE.TorusGeometry(config.radius, 0.03, 16, 100);
    const material = new THREE.MeshPhongMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.6,
      emissive: config.color,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(tubeGeometry, material);
    ringGroup.add(mesh);

    const ringData: RingData = {
      mesh,
      group: ringGroup,
      originalColor: config.color,
      currentColor: config.color,
      rotationSpeed: (Math.PI * 2) / config.rotationPeriod,
      wobbleSpeed: 0.5,
      wobbleAmount: 0.15,
      wobbleOffset: index * 1.5,
      radius: config.radius,
    };

    rings.push(ringData);
    group.add(ringGroup);
  });

  let isColorChanging = false;

  function triggerColorChange() {
    if (isColorChanging) return;
    isColorChanging = true;

    rings.forEach((ring, index) => {
      const shockColor = SHOCK_COLORS[index];
      const material = ring.mesh.material as THREE.MeshPhongMaterial;

      gsap.to(material.color, {
        r: ((shockColor >> 16) & 255) / 255,
        g: ((shockColor >> 8) & 255) / 255,
        b: (shockColor & 255) / 255,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(material.color, {
            r: ((ring.originalColor >> 16) & 255) / 255,
            g: ((ring.originalColor >> 8) & 255) / 255,
            b: (ring.originalColor & 255) / 255,
            duration: 3,
            ease: 'power1.inOut',
          });
        },
      });

      gsap.to(material.emissive, {
        r: ((shockColor >> 16) & 255) / 255,
        g: ((shockColor >> 8) & 255) / 255,
        b: (shockColor & 255) / 255,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(material.emissive, {
            r: ((ring.originalColor >> 16) & 255) / 255,
            g: ((ring.originalColor >> 8) & 255) / 255,
            b: (ring.originalColor & 255) / 255,
            duration: 3,
            ease: 'power1.inOut',
            onComplete: () => {
              if (index === rings.length - 1) {
                isColorChanging = false;
              }
            },
          });
        },
      });
    });
  }

  function update(delta: number, elapsed: number) {
    rings.forEach((ring) => {
      ring.group.rotation.y += delta * ring.rotationSpeed;
      const wobble = Math.sin(elapsed * ring.wobbleSpeed + ring.wobbleOffset) * ring.wobbleAmount;
      ring.mesh.rotation.x = wobble;
    });
  }

  return {
    group,
    rings,
    update,
    triggerColorChange,
  };
}

export function createStarRings(): THREE.Group {
  const group = new THREE.Group();
  const colors = [0x48dbfb, 0xff6b6b, 0xfeca57];

  for (let i = 0; i < 50; i++) {
    const radius = 1 + Math.random() * 6;
    const tubeWidth = (0.001 + Math.random() * 0.003) * radius;
    const colorIndex = Math.floor(Math.random() * colors.length);
    const color = colors[colorIndex];
    const opacity = 0.1 + Math.random() * 0.2;

    const geometry = new THREE.TorusGeometry(radius, tubeWidth, 8, 64);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(geometry, material);

    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.z = Math.random() * Math.PI;

    const speed = (0.05 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1);
    (ring as any).rotationSpeed = speed;

    group.add(ring);
  }

  return group;
}

export function updateStarRings(group: THREE.Group, delta: number) {
  group.children.forEach((child) => {
    const ring = child as THREE.Mesh;
    ring.rotation.y += delta * (ring as any).rotationSpeed;
  });
}
