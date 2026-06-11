import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { Crease, PAPER_SIZE } from '../types';
import { generatePaperTexture, foldVerticesTo3D, getCorners } from '../utils/paperMath';

interface Preview3DProps {
  creases: Crease[];
  paperColor: string;
  onBack: () => void;
}

const Preview3D: React.FC<Preview3DProps> = ({ creases, paperColor, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Mesh;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 350);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-200, 100, 150);
    scene.add(directionalLight);

    const textureCanvas = generatePaperTexture(512);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const geometry = new THREE.BufferGeometry();
    let vertices2D = getCorners();
    let vertices3D: THREE.Vector3[] = vertices2D.map(
      (v) => new THREE.Vector3(v.x - PAPER_SIZE / 2, -(v.y - PAPER_SIZE / 2), 0)
    );

    for (const crease of creases) {
      const folded3D = foldVerticesTo3D(vertices2D, crease, crease.angle * 0.5);
      vertices3D = folded3D.map((v) => new THREE.Vector3(v.x, v.y, v.z));
      vertices2D = vertices2D.map((v, i) => ({
        x: folded3D[i].x + PAPER_SIZE / 2,
        y: -folded3D[i].y + PAPER_SIZE / 2,
      }));
    }

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < vertices3D.length; i++) {
      positions.push(vertices3D[i].x, vertices3D[i].y, vertices3D[i].z);
      uvs.push(
        (vertices2D[i].x) / PAPER_SIZE,
        1 - vertices2D[i].y / PAPER_SIZE
      );
    }

    for (let i = 1; i < vertices3D.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    const extraDetail = 2;
    for (let seg = 0; seg < extraDetail; seg++) {
      const idx = vertices3D.length;
      const t = (seg + 1) / (extraDetail + 1);
      for (let i = 0; i < vertices3D.length; i++) {
        const next = (i + 1) % vertices3D.length;
        const v = new THREE.Vector3().lerpVectors(vertices3D[i], vertices3D[next], t);
        positions.push(v.x, v.y, v.z);
        uvs.push(
          (vertices2D[i].x + (vertices2D[next].x - vertices2D[i].x) * t) / PAPER_SIZE,
          1 - (vertices2D[i].y + (vertices2D[next].y - vertices2D[i].y) * t) / PAPER_SIZE
        );
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) {
      geometry.setIndex(indices);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: new THREE.Color(paperColor),
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    sceneRef.current = { scene, camera, renderer, mesh };

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      mesh.rotation.x = rotationRef.current.x;
      mesh.rotation.y = rotationRef.current.y;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      rotationRef.current.y += dx * 0.01;
      rotationRef.current.x = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 3, rotationRef.current.x + dy * 0.01)
      );
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [creases, paperColor]);

  return (
    <motion.div
      className="preview-3d-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      <div ref={containerRef} className="preview-3d-canvas" />
      <button className="back-btn" onClick={onBack}>
        返回工作台
      </button>
    </motion.div>
  );
};

export default Preview3D;
