import * as THREE from 'three';
import { EffectComposer } from 'postprocessing';
import { RenderPass } from 'postprocessing';
import { BloomEffect } from 'postprocessing';
import { EffectPass } from 'postprocessing';

export class LightController {
  private scene: THREE.Scene;
  private pointLight: THREE.PointLight;
  private lightSphere: THREE.Mesh;
  private lightGroup: THREE.Group;
  private targetPosition: THREE.Vector3;
  private currentPosition: THREE.Vector3;
  private readonly LIGHT_RADIUS = 0.8;
  private composer: EffectComposer | null = null;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    this.scene = scene;

    this.targetPosition = new THREE.Vector3(8, 20, 5);
    this.currentPosition = this.targetPosition.clone();

    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);

    this.createLightSphere();
    this.createPointLight();
    this.setupPostProcessing(renderer, camera);
  }

  private createLightSphere() {
    const geometry = new THREE.SphereGeometry(this.LIGHT_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 2.5,
      roughness: 0.2,
      metalness: 0.0
    });

    this.lightSphere = new THREE.Mesh(geometry, material);
    this.lightSphere.position.copy(this.currentPosition);
    this.lightGroup.add(this.lightSphere);
  }

  private createPointLight() {
    this.pointLight = new THREE.PointLight(0xffd700, 2.0, 100, 1.5);
    this.pointLight.position.copy(this.currentPosition);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.pointLight.shadow.camera.near = 0.5;
    this.pointLight.shadow.camera.far = 100;
    this.lightGroup.add(this.pointLight);
  }

  private setupPostProcessing(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(this.scene, camera);
    composer.addPass(renderPass);

    const bloomEffect = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.2,
      luminanceSmoothing: 0.9,
      mipmapBlur: true,
      radius: 0.5
    });

    const bloomPass = new EffectPass(camera, bloomEffect);
    composer.addPass(bloomPass);

    this.composer = composer;
  }

  public setPosition(x: number, y: number, z: number) {
    this.targetPosition.set(x, y, z);
  }

  public getLightPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  public update(deltaTime: number) {
    const smoothing = 1 - Math.pow(0.001, deltaTime);
    this.currentPosition.lerp(this.targetPosition, smoothing);

    this.lightSphere.position.copy(this.currentPosition);
    this.pointLight.position.copy(this.currentPosition);
  }

  public render() {
    if (this.composer) {
      this.composer.render();
    }
  }

  public setIntensity(intensity: number) {
    this.pointLight.intensity = intensity * 2.0;
    const sphereMat = this.lightSphere.material as THREE.MeshStandardMaterial;
    sphereMat.emissiveIntensity = 1.5 + intensity * 1.0;
  }

  public onResize() {
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  public dispose() {
    this.scene.remove(this.lightGroup);
    this.lightSphere.geometry.dispose();
    (this.lightSphere.material as THREE.Material).dispose();
    if (this.composer) {
      this.composer.dispose();
    }
  }
}
