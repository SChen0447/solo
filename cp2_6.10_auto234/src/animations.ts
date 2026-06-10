import { gsap } from 'gsap';
import * as THREE from 'three';
import * as _ from 'lodash';

export interface AnimatableMesh {
  mesh: THREE.Mesh;
  targetOpacity: number;
  basePosition: THREE.Vector3;
}

export const animatePhaseTransition = (
  fadingOut: AnimatableMesh[],
  fadingIn: AnimatableMesh[],
  duration: number = 1.5
): gsap.core.Timeline => {
  const tl = gsap.timeline();

  _.forEach(fadingOut, (item) => {
    const material = item.mesh.material as THREE.MeshStandardMaterial;
    tl.to(
      material,
      {
        opacity: 0.2,
        duration,
        ease: 'power2.inOut'
      },
      0
    );
    tl.to(
      item.mesh.position,
      {
        y: item.basePosition.y - 0.5,
        x: item.basePosition.x + (Math.random() - 0.5) * 0.3,
        z: item.basePosition.z + (Math.random() - 0.5) * 0.3,
        duration,
        ease: 'power2.inOut'
      },
      0
    );
  });

  _.forEach(fadingIn, (item) => {
    const material = item.mesh.material as THREE.MeshStandardMaterial;
    material.opacity = 0.2;
    item.mesh.position.set(
      item.basePosition.x + (Math.random() - 0.5) * 0.3,
      item.basePosition.y - 0.5,
      item.basePosition.z + (Math.random() - 0.5) * 0.3
    );

    tl.to(
      material,
      {
        opacity: 0.8,
        duration,
        ease: 'power2.inOut'
      },
      0
    );
    tl.to(
      item.mesh.position,
      {
        x: item.basePosition.x,
        y: item.basePosition.y,
        z: item.basePosition.z,
        duration,
        ease: 'power2.inOut'
      },
      0
    );
  });

  return tl;
};

export const animateAnnotationPanel = (panel: HTMLElement): gsap.core.Tween => {
  gsap.set(panel, {
    scale: 0.8,
    opacity: 0,
    y: 20
  });

  return gsap.to(panel, {
    scale: 1,
    opacity: 1,
    y: 0,
    duration: 0.35,
    ease: 'back.out(1.7)'
  });
};

export const animateHighlightPulse = (edges: THREE.LineSegments): gsap.core.Timeline => {
  const material = edges.material as THREE.LineBasicMaterial;
  const tl = gsap.timeline({ repeat: -1, yoyo: true });

  tl.to(material.color, {
    r: 1.0,
    g: 0.7,
    b: 0.2,
    duration: 0.8,
    ease: 'sine.inOut'
  });

  tl.to(material, {
    opacity: 1.0,
    duration: 0.8,
    ease: 'sine.inOut'
  }, 0);

  return tl;
};

export const animateFadeOutPanel = (panel: HTMLElement, onComplete: () => void): gsap.core.Tween => {
  return gsap.to(panel, {
    scale: 0.85,
    opacity: 0,
    y: 10,
    duration: 0.2,
    ease: 'power2.in',
    onComplete
  });
};
