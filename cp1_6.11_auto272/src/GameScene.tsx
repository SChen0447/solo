import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, Vector3 } from './types';

interface GameSceneProps {
  gameState: GameState;
}

function FloatingIsland({ position, diameter, rotation }: { position: Vector3; diameter: number; rotation: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const rockRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position.y + Math.sin(clock.elapsedTime * 0.3 + rotation) * 8;
      groupRef.current.rotation.y = rotation + clock.elapsedTime * 0.02;
    }
    if (rockRef.current) {
      const material = rockRef.current.material as THREE.MeshStandardMaterial;
      material.needsUpdate = true;
    }
  });

  const topGeometry = useMemo(() => new THREE.CylinderGeometry(diameter / 2, diameter / 2.5, diameter * 0.3, 16), [diameter]);
  const rockGeometry = useMemo(() => new THREE.ConeGeometry(diameter / 2.5, diameter * 0.8, 16), [diameter]);

  const vinePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      positions.push({
        x: Math.cos(angle) * diameter / 2.2,
        z: Math.sin(angle) * diameter / 2.2,
      });
    }
    return positions;
  }, [diameter]);

  const crystalPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * diameter / 3;
      positions.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.8, 0.6),
      });
    }
    return positions;
  }, [diameter]);

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh geometry={topGeometry} position={[0, diameter * 0.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#6B8E23" roughness={0.9} />
      </mesh>
      <mesh ref={rockRef} geometry={rockGeometry} position={[0, -diameter * 0.25, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>
      {vinePositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, -diameter * 0.1, pos.z]}>
          <cylinderGeometry args={[2, 2, diameter * 0.5, 6]} />
          <meshStandardMaterial color="#228B22" />
        </mesh>
      ))}
      {crystalPositions.map((pos, i) => (
        <mesh key={`crystal-${i}`} position={[pos.x, diameter * 0.3, pos.z]}>
          <octahedronGeometry args={[8, 0]} />
          <meshStandardMaterial color={pos.color} emissive={pos.color} emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Glider({ player }: { player: GameState['player'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.set(player.position.x, player.position.y, player.position.z);
      groupRef.current.rotation.x = (player.pitch * Math.PI) / 180;
      groupRef.current.rotation.y = (player.yaw * Math.PI) / 180;
      groupRef.current.rotation.z = (player.roll * Math.PI) / 180;
    }
    if (leftWingRef.current && rightWingRef.current) {
      const wingFlutter = Math.sin(clock.elapsedTime * 20) * 0.02;
      leftWingRef.current.rotation.z = wingFlutter;
      rightWingRef.current.rotation.z = -wingFlutter;
    }
  });

  const wingspan = 80;

  return (
    <group ref={groupRef}>
      <mesh ref={leftWingRef} position={[-wingspan / 2, 0, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[wingspan / 2, 2, 30]} />
        <meshStandardMaterial color="#FF4500" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightWingRef} position={[wingspan / 2, 0, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[wingspan / 2, 2, 30]} />
        <meshStandardMaterial color="#FF4500" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[5, 20, 4, 8]} />
        <meshStandardMaterial color="#FF6347" />
      </mesh>
      <mesh position={[0, -5, 10]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[4, 8, 15]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

function AirflowColumn({ position, type, height, radius }: { position: Vector3; type: 'up' | 'down'; height: number; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 200;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const y = Math.random() * height;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const t = y / height;
      const baseColor = type === 'up' ? new THREE.Color('#ADD8E6') : new THREE.Color('#D3D3D3');
      const white = new THREE.Color('#FFFFFF');
      const mixed = baseColor.clone().lerp(white, t);
      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }
    return { positions: pos, colors: col };
  }, [type, height, radius]);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const speed = type === 'up' ? 30 : -25;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += speed * 0.016;
        positions[i * 3] += Math.sin(clock.elapsedTime * 2 + i * 0.1) * 0.5;
        positions[i * 3 + 2] += Math.cos(clock.elapsedTime * 2 + i * 0.1) * 0.5;
        if (type === 'up' && positions[i * 3 + 1] > height) {
          positions[i * 3 + 1] = 0;
        } else if (type === 'down' && positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = height;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * (type === 'up' ? 1 : -1);
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 16, 1, true]} />
        <meshBasicMaterial
          color={type === 'up' ? '#ADD8E6' : '#B0C4DE'}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={4}
          vertexColors
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function CheckpointRing({ position, index, passed }: { position: Vector3; index: number; passed: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 2;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.1;
      glowRef.current.scale.set(scale, scale, scale);
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(clock.elapsedTime * 4) * 0.2;
    }
  });

  const color = passed ? '#00FF00' : '#FFD700';

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={ringRef}>
        <torusGeometry args={[30, 5, 16, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={passed ? 0.8 : 0.5} />
      </mesh>
      <mesh ref={glowRef}>
        <torusGeometry args={[35, 2, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 50, 0]}>
        <planeGeometry args={[40, 30]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function VortexMesh({ position, radius }: { position: Vector3; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 8;
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh>
        <torusGeometry args={[radius, 3, 8, 32]} />
        <meshBasicMaterial color="#808080" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.7, 2, 8, 32]} />
        <meshBasicMaterial color="#696969" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function ParticlesSystem({ particles }: { particles: GameState['particles'] }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const maxParticles = 500;
    const pos = new Float32Array(maxParticles * 3);
    const col = new Float32Array(maxParticles * 3);
    const siz = new Float32Array(maxParticles);
    particles.slice(0, maxParticles).forEach((p, i) => {
      pos[i * 3] = p.position.x;
      pos[i * 3 + 1] = p.position.y;
      pos[i * 3 + 2] = p.position.z;
      const color = new THREE.Color(p.color);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
      siz[i] = p.size * (p.life / p.maxLife);
    });
    return { positions: pos, colors: col, sizes: siz };
  }, [particles]);

  useFrame(() => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      particles.slice(0, 500).forEach((p, i) => {
        posArray[i * 3] = p.position.x;
        posArray[i * 3 + 1] = p.position.y;
        posArray[i * 3 + 2] = p.position.z;
      });
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={500} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={500} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={6}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function CameraController({ gameState }: { gameState: GameState }) {
  const { camera } = useThree();
  const playerPos = gameState.player.position;

  useFrame(() => {
    const { theta, phi, distance } = gameState.cameraAngle;
    const phiRad = (phi * Math.PI) / 180;
    const thetaRad = (theta * Math.PI) / 180;

    const x = playerPos.x + distance * Math.sin(phiRad) * Math.sin(thetaRad);
    const y = playerPos.y + distance * Math.cos(phiRad);
    const z = playerPos.z + distance * Math.sin(phiRad) * Math.cos(thetaRad);

    camera.position.lerp(new THREE.Vector3(x, y, z), 0.1);
    camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
  });

  return null;
}

function SceneContent({ gameState }: { gameState: GameState }) {
  return (
    <>
      <CameraController gameState={gameState} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[500, 1000, 500]} intensity={1} castShadow />
      <fog attach="fog" args={['#87CEEB', 1000, 4000]} />

      {gameState.islands.map((island) => (
        <FloatingIsland
          key={island.id}
          position={island.position}
          diameter={island.diameter}
          rotation={island.rotation}
        />
      ))}

      {gameState.airflows.map((airflow) => (
        <AirflowColumn
          key={airflow.id}
          position={airflow.position}
          type={airflow.type}
          height={airflow.height}
          radius={airflow.radius}
        />
      ))}

      {gameState.checkpoints.map((checkpoint) => (
        <CheckpointRing
          key={checkpoint.id}
          position={checkpoint.position}
          index={checkpoint.index}
          passed={checkpoint.passed}
        />
      ))}

      {gameState.vortexes.map((vortex) => (
        <VortexMesh key={vortex.id} position={vortex.position} radius={vortex.radius} />
      ))}

      <Glider player={gameState.player} />
      <ParticlesSystem particles={gameState.particles} />
    </>
  );
}

export default function GameScene({ gameState }: GameSceneProps) {
  return (
    <Canvas
      camera={{ fov: 60, near: 1, far: 10000, position: [0, 600, 800] }}
      shadows
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color('#87CEEB');
        gl.setClearColor('#87CEEB');
      }}
    >
      <SceneContent gameState={gameState} />
    </Canvas>
  );
}
