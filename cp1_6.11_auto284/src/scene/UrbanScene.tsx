import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleSimulation } from '@/logic/ParticleSimulation';
import { useSimStore } from '@/store/useSimStore';
import type { Particle, Building, TreeData } from '@/types';

interface SceneProps {
  onStatsUpdate: (stats: { concentration: number; efficiency: number }) => void;
  onParticlesUpdate: (particles: Particle[], buildings: Building[], trees: TreeData[]) => void;
}

function Buildings({ buildings, animationKey }: { buildings: Building[]; animationKey: number }) {
  const meshRefs = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    meshRefs.current.forEach((mesh, i) => {
      if (mesh && buildings[i]) {
        mesh.scale.y = 0;
        mesh.position.y = 0;
        const targetHeight = buildings[i].height;
        const startTime = performance.now();
        const duration = 500;

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          mesh.scale.y = eased;
          mesh.position.y = (targetHeight / 2) * eased;
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }
    });
  }, [animationKey, buildings]);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh
          key={b.id}
          ref={(el) => {
            if (el) meshRefs.current[i] = el;
          }}
          position={[b.x, b.height / 2, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Trees({ trees, animationKey }: { trees: TreeData[]; animationKey: number }) {
  const groupRefs = useRef<THREE.Group[]>([]);

  useEffect(() => {
    groupRefs.current.forEach((group) => {
      if (group) {
        group.scale.set(0, 0, 0);
        const startTime = performance.now();
        const duration = 500;

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          group.scale.set(eased, eased, eased);
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }
    });
  }, [animationKey, trees]);

  return (
    <group>
      {trees.map((t, i) => (
        <group
          key={t.id}
          ref={(el) => {
            if (el) groupRefs.current[i] = el;
          }}
          position={[t.x, 0, t.z]}
        >
          <mesh position={[0, t.height * 0.25, 0]} castShadow>
            <cylinderGeometry args={[t.trunkRadius, t.trunkRadius * 1.2, t.height * 0.5, 8]} />
            <meshStandardMaterial color="#5d4037" roughness={0.9} />
          </mesh>
          <mesh position={[0, t.height - t.crownHeight / 2, 0]} castShadow>
            <sphereGeometry args={[t.crownRadius, 12, 10]} />
            <meshStandardMaterial
              color="#32cd32"
              transparent
              opacity={0.75}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Ground({ gridSize }: { gridSize: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[gridSize, gridSize]} />
      <meshStandardMaterial color="#a0a0a0" roughness={0.9} />
    </mesh>
  );
}

function Particles({ simulationRef }: { simulationRef: React.MutableRefObject<ParticleSimulation | null> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const isPlaying = useSimStore((state) => state.isPlaying);

  useFrame((_, dt) => {
    const sim = simulationRef.current;
    if (!sim || !pointsRef.current || !isPlaying) return;

    sim.update(dt);

    const particles = sim.getParticles();
    const geometry = pointsRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    let idx = 0;
    for (const p of particles) {
      if (idx >= 500) break;
      positions[idx * 3] = p.x;
      positions[idx * 3 + 1] = p.y;
      positions[idx * 3 + 2] = p.z;

      if (p.captured) {
        colors[idx * 3] = 1;
        colors[idx * 3 + 1] = 0.55;
        colors[idx * 3 + 2] = 0;
      } else {
        colors[idx * 3] = 1;
        colors[idx * 3 + 1] = 1;
        colors[idx * 3 + 2] = 1;
      }
      idx++;
    }

    for (let i = idx; i < 500; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -1000;
      positions[i * 3 + 2] = 0;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(500 * 3);
    const col = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pos[i * 3 + 1] = -1000;
      col[i * 3] = 1;
      col[i * 3 + 1] = 1;
      col[i * 3 + 2] = 1;
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={500}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.7}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function SceneContent({
  onStatsUpdate,
  onParticlesUpdate,
  simulationRef,
}: SceneProps & { simulationRef: React.MutableRefObject<ParticleSimulation | null> }) {
  const config = useSimStore((state) => state.config);
  const isPlaying = useSimStore((state) => state.isPlaying);
  const [animationKey, setAnimationKey] = useState(0);
  const lastStatsTime = useRef(0);
  const lastHeatmapTime = useRef(0);

  const buildings = simulationRef.current?.getBuildings() || [];
  const trees = simulationRef.current?.getTrees() || [];
  const gridSize = simulationRef.current?.getGridSize() || 200;

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.updateConfig(config);
      simulationRef.current.reset();
      setAnimationKey((k) => k + 1);
    }
  }, [config, simulationRef]);

  useFrame(() => {
    const sim = simulationRef.current;
    if (!sim || !isPlaying) return;

    const now = performance.now();

    if (now - lastStatsTime.current > 200) {
      const stats = sim.getStats();
      onStatsUpdate({
        concentration: stats.totalConcentration,
        efficiency: stats.captureEfficiency,
      });
      lastStatsTime.current = now;
    }

    if (now - lastHeatmapTime.current > 300) {
      onParticlesUpdate(sim.getAllParticles(), sim.getBuildings(), sim.getTrees());
      lastHeatmapTime.current = now;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <hemisphereLight args={['#b3d9ff', '#808080', 0.4]} />

      <Ground gridSize={gridSize} />
      <Buildings buildings={buildings} animationKey={animationKey} />
      <Trees trees={trees} animationKey={animationKey} />
      <Particles simulationRef={simulationRef} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={80}
        maxDistance={400}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 10, 0]}
      />
    </>
  );
}

export function UrbanScene({ onStatsUpdate, onParticlesUpdate }: SceneProps) {
  const simulationRef = useRef<ParticleSimulation | null>(null);
  const config = useSimStore((state) => state.config);

  if (!simulationRef.current) {
    simulationRef.current = new ParticleSimulation(config);
  }

  return (
    <Canvas
      shadows
      camera={{ position: [160, 140, 160], fov: 45, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#b3d9ff']} />
      <fog attach="fog" args={['#b3d9ff', 200, 500]} />
      <SceneContent
        onStatsUpdate={onStatsUpdate}
        onParticlesUpdate={onParticlesUpdate}
        simulationRef={simulationRef}
      />
    </Canvas>
  );
}
