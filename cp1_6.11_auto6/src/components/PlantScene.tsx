import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { PlantState, EnvironmentParams, AppearanceFactors } from '../utils/plantSimulator';
import { calculateAppearanceFactors } from '../utils/plantSimulator';

interface PlantSceneProps {
  plantState: PlantState;
  environment: EnvironmentParams;
  isReplaying?: boolean;
}

interface PlantPartsProps {
  plantState: PlantState;
  appearance: AppearanceFactors;
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const Seed = ({ progress }: { progress: number }) => {
  const scale = Math.max(0.01, progress * 0.3);
  return (
    <mesh position={[0, scale / 2, 0]}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial color="#6D4C41" roughness={0.8} />
    </mesh>
  );
};

const Roots = ({ progress, health }: { progress: number; health: number }) => {
  const rootGroup = useRef<THREE.Group>(null);
  const shakeIntensity = health < 20 ? 0.02 : 0;

  useFrame(({ clock }) => {
    if (rootGroup.current && shakeIntensity > 0) {
      rootGroup.current.position.x = Math.sin(clock.elapsedTime * 10) * shakeIntensity;
      rootGroup.current.position.z = Math.cos(clock.elapsedTime * 8) * shakeIntensity * 0.5;
    }
  });

  const roots = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const length = 0.5 + Math.random() * 0.5;
      return { angle, length, index: i };
    });
  }, []);

  const visibleProgress = easeInOutCubic(Math.min(1, progress * 1.5));

  return (
    <group ref={rootGroup}>
      {roots.map((root) => (
        <group
          key={root.index}
          rotation={[0, root.angle, Math.PI / 2.5]}
          position={[0, 0, 0]}
        >
          <mesh position={[0, -root.length * visibleProgress / 2, 0]}>
            <cylinderGeometry
              args={[0.02 * visibleProgress, 0.04 * visibleProgress, root.length * visibleProgress, 6]}
            />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Stem = ({ progress, health }: { progress: number; health: number }) => {
  const stemRef = useRef<THREE.Group>(null);
  const shakeIntensity = health < 20 ? 0.03 : 0;

  useFrame(({ clock }) => {
    if (stemRef.current && shakeIntensity > 0) {
      stemRef.current.rotation.z = Math.sin(clock.elapsedTime * 8) * shakeIntensity;
      stemRef.current.rotation.x = Math.cos(clock.elapsedTime * 6) * shakeIntensity * 0.5;
    }
  });

  const visibleProgress = easeInOutCubic(progress);
  const height = visibleProgress * 2.5;
  const radius = 0.08 + visibleProgress * 0.04;

  return (
    <group ref={stemRef}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.7, radius, height, 12]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.7} />
      </mesh>
    </group>
  );
};

const Leaves = ({
  count,
  height,
  appearance,
  health,
}: {
  count: number;
  height: number;
  appearance: AppearanceFactors;
  health: number;
}) => {
  const leavesRef = useRef<THREE.Group>(null);
  const shakeIntensity = health < 20 ? 0.04 : 0;

  useFrame(({ clock }) => {
    if (leavesRef.current && shakeIntensity > 0) {
      leavesRef.current.rotation.y = Math.sin(clock.elapsedTime * 7) * shakeIntensity;
    }
  });

  const leafColor = useMemo(() => {
    const baseColor = new THREE.Color('#4CAF50');
    if (appearance.leafYellow > 0) {
      const yellow = new THREE.Color('#CDDC39');
      return baseColor.lerp(yellow, appearance.leafYellow);
    }
    if (appearance.leafBleach > 0) {
      const white = new THREE.Color('#FFFFFF');
      return baseColor.lerp(white, appearance.leafBleach * 0.7);
    }
    return baseColor;
  }, [appearance.leafYellow, appearance.leafBleach]);

  const curlFactor = appearance.leafCurl * 0.5;

  const leafPositions = useMemo(() => {
    const positions: { y: number; angle: number; side: number }[] = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const y = 0.3 + (i / Math.max(count, 1)) * (height - 0.5);
      const angle = (i * 0.618 * Math.PI * 2) % (Math.PI * 2);
      const side = i % 2 === 0 ? 1 : -1;
      positions.push({ y, angle, side });
    }
    return positions;
  }, [count, height]);

  return (
    <group ref={leavesRef}>
      {leafPositions.map((pos, i) => {
        const leafSize = 0.15 + (i / leafPositions.length) * 0.2;
        return (
          <group key={i} position={[0, pos.y, 0]} rotation={[0, pos.angle, 0]}>
            <mesh
              position={[0.25 * pos.side, 0.1, 0]}
              rotation={[
                curlFactor * pos.side,
                0,
                (pos.side * Math.PI) / 6 + curlFactor * 0.5
              ]}
            >
              <sphereGeometry args={[leafSize, 8, 8]} />
              <meshStandardMaterial
                color={leafColor}
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Flower = ({
  progress,
  plantHeight,
  health,
}: {
  progress: number;
  plantHeight: number;
  health: number;
}) => {
  const flowerRef = useRef<THREE.Group>(null);
  const shakeIntensity = health < 20 ? 0.05 : 0;

  useFrame(({ clock }) => {
    if (flowerRef.current) {
      flowerRef.current.rotation.y = clock.elapsedTime * 0.3;
      if (shakeIntensity > 0) {
        flowerRef.current.rotation.z = Math.sin(clock.elapsedTime * 9) * shakeIntensity;
      }
    }
  });

  const visibleProgress = easeInOutCubic(progress);
  const petalCount = 8;
  const petalSize = 0.25 * visibleProgress;
  const flowerY = plantHeight + 0.2 * visibleProgress;

  return (
    <group ref={flowerRef} position={[0, flowerY, 0]}>
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * petalSize * 0.6,
              0,
              Math.sin(angle) * petalSize * 0.6
            ]}
            rotation={[0, angle, Math.PI / 6]}
          >
            <sphereGeometry args={[petalSize, 8, 8]} />
            <meshStandardMaterial color="#E91E63" roughness={0.4} emissive="#E91E63" emissiveIntensity={0.1} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12 * visibleProgress, 12, 12]} />
        <meshStandardMaterial color="#FFC107" roughness={0.3} emissive="#FFC107" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

const Soil = ({ crackFactor }: { crackFactor: number }) => {
  const soilGeometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(3, 32);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      if (dist > 0.3 && crackFactor > 0) {
        const crackAmount = (Math.random() - 0.5) * crackFactor * 0.1;
        positions.setZ(i, crackAmount);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, [crackFactor]);

  const soilColor = useMemo(() => {
    const base = new THREE.Color('#5D4037');
    const dry = new THREE.Color('#8D6E63');
    return base.lerp(dry, crackFactor * 0.5);
  }, [crackFactor]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} geometry={soilGeometry}>
      <meshStandardMaterial color={soilColor} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
};

const PlantParts = ({ plantState, appearance }: PlantPartsProps) => {
  const { stage, height, leafCount, flowerProgress, rootProgress, stemProgress, health } = plantState;

  return (
    <>
      <Seed progress={stage === 'seed' ? 1 : 0.2} />
      <Roots progress={rootProgress} health={health} />
      {stage !== 'seed' && stage !== 'root' && (
        <>
          <Stem progress={stemProgress} health={health} />
          {leafCount > 0 && (
            <Leaves count={leafCount} height={height} appearance={appearance} health={health} />
          )}
          {flowerProgress > 0 && (
            <Flower progress={flowerProgress} plantHeight={height} health={health} />
          )}
        </>
      )}
    </>
  );
};

const SceneContent = ({ plantState, environment }: PlantSceneProps) => {
  const appearance = calculateAppearanceFactors(environment, plantState.health);

  return (
    <>
      <ambientLight intensity={0.4 + environment.lightIntensity * 0.04} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.6 + environment.lightIntensity * 0.06}
        castShadow
      />
      <pointLight
        position={[-3, 4, -3]}
        color={environment.temperature > 30 ? '#FF7043' : '#64B5F6'}
        intensity={0.3}
      />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <Soil crackFactor={appearance.soilCrack} />
      <PlantParts plantState={plantState} appearance={appearance} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
};

const PlantScene = ({ plantState, environment, isReplaying }: PlantSceneProps) => {
  return (
    <Canvas
      camera={{ position: [6, 4, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(to bottom, #0F0C29, #302B63, #24243E)' }}
    >
      <fog attach="fog" args={['#1A1A2E', 15, 30]} />
      <SceneContent plantState={plantState} environment={environment} />
    </Canvas>
  );
};

export default PlantScene;
