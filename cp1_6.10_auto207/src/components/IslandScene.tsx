import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useApp } from '../context/AppContext';
import { playCollectSound } from '../utils/audio';

interface IslandSceneProps {
  fps: number;
}

const IslandScene: React.FC<IslandSceneProps> = ({ fps }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, collectFragment, setActiveFragment, isAllCollected } = useApp();
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    island: THREE.Mesh;
    waterTexture: THREE.CanvasTexture;
    fragments: { mesh: THREE.Mesh; id: string; hue: number; basePos: THREE.Vector3; collected: boolean }[];
    connections: THREE.Line[];
    particles: THREE.Points;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    prevMouse: { x: number; y: number };
    azimuth: number;
    polar: number;
    distance: number;
    targetDistance: number;
    flyingFragments: {
      mesh: THREE.Mesh;
      startPos: THREE.Vector3;
      controlPos: THREE.Vector3;
      endPos: THREE.Vector3;
      progress: number;
      id: string;
    }[];
    animationId: number;
    breathSpeed: number;
    particleCount: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const initialAzimuth = 0;
    const initialPolar = Math.PI / 3;
    const initialDistance = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x6688ff, 0.5, 30);
    pointLight1.position.set(-5, 3, -5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6688, 0.3, 30);
    pointLight2.position.set(5, -2, 5);
    scene.add(pointLight2);

    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 256;
    waterCanvas.height = 256;
    const waterCtx = waterCanvas.getContext('2d')!;
    const waterTexture = new THREE.CanvasTexture(waterCanvas);
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;

    const islandGeometry = new THREE.SphereGeometry(5, 20, 20);
    const positions = islandGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = 1 + (Math.sin(x * 1.5) * Math.cos(y * 1.5) + Math.sin(y * 2) * Math.cos(z * 2) + Math.sin(z * 1.5) * Math.cos(x * 1.5)) * 0.15;
      positions.setXYZ(i, x * noise, y * noise, z * noise);
    }
    islandGeometry.computeVertexNormals();

    const islandColors: number[] = [];
    const colorGreen = new THREE.Color(0x6b8e23);
    const colorBrown = new THREE.Color(0x8b4513);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 5) / 10;
      const color = colorGreen.clone().lerp(colorBrown, 1 - t);
      islandColors.push(color.r, color.g, color.b);
    }
    islandGeometry.setAttribute('color', new THREE.Float32BufferAttribute(islandColors, 3));

    const islandMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 10,
      transparent: true,
      opacity: 0.95
    });

    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    scene.add(island);

    const waterGeometry = new THREE.SphereGeometry(5.15, 32, 32);
    const waterMaterial = new THREE.MeshPhongMaterial({
      map: waterTexture,
      transparent: true,
      opacity: 0.35,
      shininess: 100,
      specular: 0x88ccff,
      depthWrite: false
    });
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    scene.add(waterMesh);

    const fragmentsData: { mesh: THREE.Mesh; id: string; hue: number; basePos: THREE.Vector3; collected: boolean }[] = [];
    const fragmentMeshesById = new Map<string, THREE.Mesh>();

    state.fragments.forEach(frag => {
      const fragGeom = new THREE.SphereGeometry(0.3, 16, 16);
      const color = new THREE.Color().setHSL(frag.hue / 360, 0.8, 0.9);
      const fragMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      });
      const fragMesh = new THREE.Mesh(fragGeom, fragMat);
      const pos = new THREE.Vector3(frag.position.x, frag.position.y, frag.position.z);
      fragMesh.position.copy(pos);
      fragMesh.userData = { fragmentId: frag.id };

      const glowGeom = new THREE.SphereGeometry(0.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2
      });
      const glowMesh = new THREE.Mesh(glowGeom, glowMat);
      fragMesh.add(glowMesh);

      scene.add(fragMesh);
      fragmentsData.push({
        mesh: fragMesh,
        id: frag.id,
        hue: frag.hue,
        basePos: pos.clone(),
        collected: frag.collected
      });
      fragmentMeshesById.set(frag.id, fragMesh);
    });

    const connections: THREE.Line[] = [];
    for (let i = 0; i < fragmentsData.length; i++) {
      for (let j = i + 1; j < fragmentsData.length; j++) {
        const avgHue = (fragmentsData[i].hue + fragmentsData[j].hue) / 2;
        const lineColor = new THREE.Color().setHSL(avgHue / 360, 0.8, 0.9);
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          fragmentsData[i].basePos,
          fragmentsData[j].basePos
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: 0.15
        });
        const line = new THREE.Line(lineGeom, lineMat);
        scene.add(line);
        connections.push(line);
      }
    }

    let particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 7 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
      const hue = Math.random();
      const pColor = new THREE.Color().setHSL(hue, 0.5, 0.7);
      particleColors[i * 3] = pColor.r;
      particleColors[i * 3 + 1] = pColor.g;
      particleColors[i * 3 + 2] = pColor.b;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    const prevMouse = { x: 0, y: 0 };
    let azimuth = initialAzimuth;
    let polar = initialPolar;
    let distance = initialDistance;
    let targetDistance = initialDistance;

    const flyingFragments: {
      mesh: THREE.Mesh;
      startPos: THREE.Vector3;
      controlPos: THREE.Vector3;
      endPos: THREE.Vector3;
      progress: number;
      id: string;
    }[] = [];

    sceneRef.current = {
      scene, camera, renderer, island, waterTexture,
      fragments: fragmentsData,
      connections,
      particles,
      raycaster,
      mouse,
      isDragging,
      prevMouse,
      azimuth,
      polar,
      distance,
      targetDistance,
      flyingFragments,
      animationId: 0,
      breathSpeed: 1,
      particleCount
    };

    const updateCamera = () => {
      const s = sceneRef.current!;
      const x = s.distance * Math.sin(s.polar) * Math.cos(s.azimuth);
      const y = s.distance * Math.cos(s.polar);
      const z = s.distance * Math.sin(s.polar) * Math.sin(s.azimuth);
      s.camera.position.set(x, y, z);
      s.camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      const s = sceneRef.current!;
      s.isDragging = true;
      s.prevMouse.x = e.clientX;
      s.prevMouse.y = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = sceneRef.current!;
      if (s.isDragging) {
        const dx = e.clientX - s.prevMouse.x;
        const dy = e.clientY - s.prevMouse.y;
        s.azimuth -= dx * 0.005;
        s.polar = Math.max(0.1, Math.min(Math.PI - 0.1, s.polar - dy * 0.005));
        s.prevMouse.x = e.clientX;
        s.prevMouse.y = e.clientY;
        updateCamera();
      }
      const rect = renderer.domElement.getBoundingClientRect();
      s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseUp = () => {
      if (sceneRef.current) {
        sceneRef.current.isDragging = false;
      }
    };

    const onClick = (e: MouseEvent) => {
      const s = sceneRef.current!;
      if (s.isDragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      s.raycaster.setFromCamera(s.mouse, s.camera);
      const fragmentMeshes = s.fragments.filter(f => !f.collected).map(f => f.mesh);
      const intersects = s.raycaster.intersectObjects(fragmentMeshes, false);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const fragmentId = clickedMesh.userData.fragmentId;
        const fragData = s.fragments.find(f => f.id === fragmentId);

        if (fragData && !fragData.collected) {
          const startPos = clickedMesh.position.clone();
          const screenPos = new THREE.Vector3(
            (window.innerWidth - 170) / window.innerWidth * 2 - 1,
            -(window.innerHeight - 170) / window.innerHeight * 2 + 1,
            0.5
          );
          const worldEnd = screenPos.unproject(s.camera);
          const dir = worldEnd.sub(s.camera.position).normalize();
          const endPos = s.camera.position.clone().add(dir.multiplyScalar(s.camera.position.length() * 0.3));
          const controlPos = new THREE.Vector3(
            (startPos.x + endPos.x) / 2,
            Math.max(startPos.y, endPos.y) + 3,
            (startPos.z + endPos.z) / 2
          );

          s.flyingFragments.push({
            mesh: clickedMesh,
            startPos,
            controlPos,
            endPos,
            progress: 0,
            id: fragmentId
          });

          playCollectSound();
          collectFragment(fragmentId);
          fragData.collected = true;
        }
      } else {
        const collectedMeshes = s.fragments.filter(f => f.collected).map(f => f.mesh);
        const collectedIntersects = s.raycaster.intersectObjects(collectedMeshes, false);
        if (collectedIntersects.length > 0) {
          const mesh = collectedIntersects[0].object as THREE.Mesh;
          setActiveFragment(mesh.userData.fragmentId);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = sceneRef.current!;
      s.targetDistance = Math.max(3, Math.min(20, s.targetDistance + e.deltaY * 0.01));
    };

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    const startTime = performance.now();
    let breathSpeed = 1;

    const animate = () => {
      const s = sceneRef.current!;
      const time = (performance.now() - startTime) / 1000;

      if (fps < 20) {
        breathSpeed = 0.5;
        if (s.particleCount > 100) {
          s.particleCount = 100;
          const newPositions = new Float32Array(100 * 3);
          const newColors = new Float32Array(100 * 3);
          const oldPos = s.particles.geometry.attributes.position.array as Float32Array;
          const oldCol = s.particles.geometry.attributes.color.array as Float32Array;
          for (let i = 0; i < 100; i++) {
            newPositions[i * 3] = oldPos[i * 3];
            newPositions[i * 3 + 1] = oldPos[i * 3 + 1];
            newPositions[i * 3 + 2] = oldPos[i * 3 + 2];
            newColors[i * 3] = oldCol[i * 3];
            newColors[i * 3 + 1] = oldCol[i * 3 + 1];
            newColors[i * 3 + 2] = oldCol[i * 3 + 2];
          }
          s.particles.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
          s.particles.geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
        }
      }

      s.distance += (s.targetDistance - s.distance) * 0.1;
      updateCamera();

      waterCtx.fillStyle = '#0a1a3a';
      waterCtx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) {
        waterCtx.strokeStyle = `rgba(100, 180, 255, ${0.05 + Math.sin(time + i) * 0.03})`;
        waterCtx.lineWidth = 2;
        waterCtx.beginPath();
        for (let x = 0; x < 256; x += 4) {
          const y = 32 * (i + 1) + Math.sin((x * 0.03) + time * (0.5 + i * 0.1) + i) * 12;
          if (x === 0) waterCtx.moveTo(x, y);
          else waterCtx.lineTo(x, y);
        }
        waterCtx.stroke();
      }
      waterTexture.needsUpdate = true;

      island.rotation.y = time * 0.05;
      waterMesh.rotation.y = -time * 0.03;

      s.fragments.forEach(frag => {
        if (!frag.collected) {
          const breath = Math.sin(time * breathSpeed * Math.PI * 2) * 0.5 + 0.5;
          const scale = 0.8 + breath * 0.4;
          frag.mesh.scale.setScalar(scale);
          (frag.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 + breath * 0.4;
          frag.mesh.position.y = frag.basePos.y + Math.sin(time * 1.5 + frag.hue * 0.01) * 0.15;
        }
      });

      const pulse = (Math.sin(time * Math.PI) + 1) / 2;
      s.connections.forEach(line => {
        (line.material as THREE.LineBasicMaterial).opacity = 0.1 + pulse * 0.12;
      });

      particles.rotation.y = time * 0.02;

      for (let i = s.flyingFragments.length - 1; i >= 0; i--) {
        const flying = s.flyingFragments[i];
        flying.progress += 1 / 36;
        const t = Math.min(flying.progress, 1);
        const easeT = t * t * (3 - 2 * t);
        const x = (1 - easeT) * (1 - easeT) * flying.startPos.x +
                  2 * (1 - easeT) * easeT * flying.controlPos.x +
                  easeT * easeT * flying.endPos.x;
        const y = (1 - easeT) * (1 - easeT) * flying.startPos.y +
                  2 * (1 - easeT) * easeT * flying.controlPos.y +
                  easeT * easeT * flying.endPos.y;
        const z = (1 - easeT) * (1 - easeT) * flying.startPos.z +
                  2 * (1 - easeT) * easeT * flying.controlPos.z +
                  easeT * easeT * flying.endPos.z;
        flying.mesh.position.set(x, y, z);
        flying.mesh.scale.setScalar(Math.max(0.01, 1 - t * 0.7));

        if (t >= 1) {
          scene.remove(flying.mesh);
          s.flyingFragments.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      s.animationId = requestAnimationFrame(animate);
    };

    sceneRef.current.animationId = requestAnimationFrame(animate);

    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      islandGeometry.dispose();
      islandMaterial.dispose();
      waterTexture.dispose();
      waterGeometry.dispose();
      waterMaterial.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
};

export default IslandScene;
