import * as THREE from 'three';
import { Node } from './node';
import { Web } from './webs';

export class SceneManager {
  public scene: THREE.Scene;
  public nodes: Node[] = [];
  public webs: Web[] = [];
  public nodesGroup: THREE.Group;
  public websGroup: THREE.Group;
  public ripplesGroup: THREE.Group;

  private rotationSpeed: number = (Math.PI * 2) / (30 * 1000);
  private stars: THREE.Points;
  private starTwinkleStart: number[] = [];
  private starTwinklePeriod: number[] = [];
  private mobileScale: number = 1;

  constructor(scene: THREE.Scene, isMobile: boolean = false) {
    this.scene = scene;
    this.mobileScale = isMobile ? 0.8 : 1;

    this.nodesGroup = new THREE.Group();
    this.websGroup = new THREE.Group();
    this.ripplesGroup = new THREE.Group();

    this.scene.add(this.websGroup);
    this.scene.add(this.nodesGroup);
    this.scene.add(this.ripplesGroup);

    this.stars = this.createStars();
    this.scene.add(this.stars);
  }

  private createStars(): THREE.Points {
    const starCount = 50;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const opacities = new Float32Array(starCount);

    const halfWidth = window.innerWidth;
    const halfHeight = window.innerHeight;
    const depth = 800;

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * halfWidth * 2.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * halfHeight * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
      sizes[i] = 1 + Math.random() * 1;
      opacities[i] = 0.2 + Math.random() * 0.3;
      this.starTwinkleStart.push(Math.random() * 5000);
      this.starTwinklePeriod.push(2000 + Math.random() * 3000);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const starTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 2 * this.mobileScale,
      map: starTexture,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  public addNode(position: THREE.Vector3): Node {
    const node = new Node(position, this.mobileScale);
    this.nodes.push(node);
    this.nodesGroup.add(node.mesh);
    this.nodesGroup.add(node.glowMesh);
    return node;
  }

  public removeNode(node: Node): void {
    const relatedWebs = this.webs.filter(web => web.connectsTo(node));
    relatedWebs.forEach(web => this.removeWeb(web));

    const idx = this.nodes.indexOf(node);
    if (idx !== -1) {
      this.nodes.splice(idx, 1);
    }

    this.nodesGroup.remove(node.mesh);
    this.nodesGroup.remove(node.glowMesh);
    const ripple = node.getRippleMesh();
    if (ripple) {
      this.ripplesGroup.remove(ripple);
    }
    node.dispose();
  }

  public addWeb(startNode: Node, endNode: Node): Web | null {
    if (startNode === endNode) return null;

    const exists = this.webs.some(web =>
      (web.startNode === startNode && web.endNode === endNode) ||
      (web.startNode === endNode && web.endNode === startNode)
    );
    if (exists) return null;

    const web = new Web(startNode, endNode, this.mobileScale);
    this.webs.push(web);
    this.websGroup.add(web.line);
    this.websGroup.add(web.glowLine);
    this.websGroup.add(web.flowParticles);
    return web;
  }

  public removeWeb(web: Web): void {
    const idx = this.webs.indexOf(web);
    if (idx !== -1) {
      this.webs.splice(idx, 1);
    }
    this.websGroup.remove(web.line);
    this.websGroup.remove(web.glowLine);
    this.websGroup.remove(web.flowParticles);
    web.dispose();
  }

  public getConnectedWebs(node: Node): Web[] {
    return this.webs.filter(web => web.connectsTo(node));
  }

  public highlightNodeConnections(node: Node, highlight: boolean): void {
    const connectedWebs = this.getConnectedWebs(node);
    connectedWebs.forEach(web => web.setHighlighted(highlight));
  }

  public update(time: number): void {
    this.nodesGroup.rotation.y = this.rotationSpeed * time;
    this.websGroup.rotation.y = this.rotationSpeed * time;
    this.ripplesGroup.rotation.y = this.rotationSpeed * time;

    this.nodes.forEach(node => {
      node.update(time, this.mobileScale);
      const ripple = node.getRippleMesh();
      if (ripple && ripple.parent !== this.ripplesGroup) {
        this.ripplesGroup.add(ripple);
      }
    });

    this.webs.forEach(web => {
      web.update(time, this.mobileScale);
    });

    this.updateStars(time);
  }

  private updateStars(time: number): void {
    const material = this.stars.material as THREE.PointsMaterial;
    const positions = this.stars.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.starTwinkleStart.length; i++) {
      const t = (time - this.starTwinkleStart[i]) / this.starTwinklePeriod[i];
      const twinkle = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    }

    material.opacity = 0.35 + 0.1 * Math.sin(time / 1000 * 0.5);
  }

  public updateMobileScale(isMobile: boolean): void {
    const newScale = isMobile ? 0.8 : 1;
    if (Math.abs(newScale - this.mobileScale) < 0.001) return;
    this.mobileScale = newScale;
  }

  public raycastIntersect(raycaster: THREE.Raycaster): Node | null {
    const meshes = this.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.node as Node;
    }
    return null;
  }

  public selectNode(node: Node | null): void {
    this.nodes.forEach(n => {
      n.isSelected = (n === node);
    });
  }

  public getSelectedNode(): Node | null {
    return this.nodes.find(n => n.isSelected) || null;
  }

  public getNodeCount(): number {
    return this.nodes.length;
  }

  public getWebCount(): number {
    return this.webs.length;
  }
}
