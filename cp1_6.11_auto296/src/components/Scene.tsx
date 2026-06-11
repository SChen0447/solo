import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MixFormula, CrackData, ForceField } from '../types';
import { generateForceField, getStressColor } from '../utils/concreteSolver';

interface DomeProps {
  deformation: number;
  showCracks: boolean;
  crackData: CrackData | null;
  forceField: ForceField | null;
  stressAreaPosition: { x: number; y: number; z: number } | null;
  isLoading: boolean;
  currentFormula: MixFormula | null;
}

function DomeSection({
  radius,
  thickness,
  phiStart,
  phiLength,
  color,
  deformation,
  positionY = 0,
}: {
  radius: number;
  thickness: number;
  phiStart: number;
  phiLength: number;
  color: string;
  deformation: number;
  positionY?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const originalPositions = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 64, 32, phiStart, phiLength, 0, Math.PI / 2);
    const positions = geo.attributes.position.array as Float32Array;
    originalPositions.current = new Float32Array(positions);

    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const noise = (Math.random() - 0.5) * 0.05;
      positions[i] += noise;
      positions[i + 2] += noise;
      originalPositions.current[i] = positions[i];
      originalPositions.current[i + 2] = positions[i + 2];
    }

    geo.computeVertexNormals();
    return geo;
  }, [radius, phiStart, phiLength]);

  useFrame(() => {
    if (!meshRef.current || !originalPositions.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const orig = originalPositions.current;

    for (let i = 0; i < positions.length; i += 3) {
      const y = orig[i + 1];
      const deformFactor = Math.max(0, y / radius) * deformation;
      positions[i] = orig[i];
      positions[i + 1] = orig[i + 1] - deformFactor + positionY;
      positions[i + 2] = orig[i + 2];
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.1}
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

function InnerLayers({
  radius,
  thickness,
  deformation,
  phiStart,
  phiLength,
}: {
  radius: number;
  thickness: number;
  deformation: number;
  phiStart: number;
  phiLength: number;
}) {
  const layerColors = ['#8d6e63', '#a1887f', '#bcaaa4', '#d7ccc8'];
  const layerThickness = thickness / 4;

  return (
    <group>
      {layerColors.map((color, index) => {
        const innerRadius = radius - thickness + index * layerThickness;
        const outerRadius = innerRadius + layerThickness - 0.005;
        return (
          <group key={index}>
            <DomeSection
              radius={outerRadius}
              thickness={layerThickness}
              phiStart={phiStart}
              phiLength={phiLength}
              color={color}
              deformation={deformation * (1 - index * 0.1)}
            />
          </group>
        );
      })}
    </group>
  );
}

function StressMarker({ position }: { position: { x: number; y: number; z: number } | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!position);
  }, [position]);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    meshRef.current.scale.setScalar(scale);
  });

  if (!position || !visible) return null;

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#f44336" transparent opacity={0.4} />
    </mesh>
  );
}

function GoldParticles({ show }: { show: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (show) {
      setActive(true);
      const timer = setTimeout(() => setActive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const particlesGeometry = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    const velocities = new Float32Array(200 * 3);

    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = Math.random() * 0.1 + 0.05;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (geo as any).velocities = velocities;
    return geo;
  }, []);

  useFrame(() => {
    if (!particlesRef.current || !active) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = (particlesRef.current.geometry as any).velocities as Float32Array;

    for (let i = 0; i < 200; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      if (positions[i * 3 + 1] > 15) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef} geometry={particlesGeometry}>
      <pointsMaterial
        size={0.15}
        color="#ffd700"
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

function ForceFieldOverlay({
  forceField,
  show,
}: {
  forceField: ForceField | null;
  show: boolean;
}) {
  const { viewport, size } = useThree();

  if (!show || !forceField) return null;

  return (
    <group position={[0, 0, -0.01]}>
      {forceField.points.map((point, index) => (
        <mesh
          key={index}
          position={[
            (point.x / size.width - 0.5) * viewport.width,
            (0.5 - point.y / size.height) * viewport.height,
            0,
          ]}
        >
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial
            color={getStressColor(point.stress, forceField.gradient)}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({
  deformation,
  showCracks,
  crackData,
  forceField,
  stressAreaPosition,
  isLoading,
  showGoldParticles,
  currentFormula,
}: DomeProps & { showGoldParticles: boolean }) {
  const { size } = useThree();

  const domeRadius = 10;
  const domeThickness = 0.3;
  const phiStart = 0;
  const phiLength = Math.PI / 2;

  const generatedForceField = useMemo(() => {
    if (showCracks) {
      return generateForceField(size.width, size.height);
    }
    return forceField;
  }, [showCracks, size.width, size.height, forceField]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        color="#fff8e1"
        castShadow
      />
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.5}
        color="#e3f2fd"
      />
      <hemisphereLight args={['#ffecd2', '#8d6e63', 0.3]} />

      <DomeSection
        radius={domeRadius}
        thickness={domeThickness}
        phiStart={phiStart}
        phiLength={phiLength}
        color="#a1887f"
        deformation={deformation}
      />

      <InnerLayers
        radius={domeRadius}
        thickness={domeThickness}
        deformation={deformation}
        phiStart={phiStart}
        phiLength={phiLength}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[domeRadius + 2, 64]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>

      <StressMarker position={stressAreaPosition} />
      <GoldParticles show={showGoldParticles} />
      <ForceFieldOverlay forceField={generatedForceField} show={showCracks} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

interface SceneProps {
  deformation: number;
  showCracks: boolean;
  crackData: CrackData | null;
  forceField: ForceField | null;
  stressAreaPosition: { x: number; y: number; z: number } | null;
  isLoading: boolean;
  showGoldParticles: boolean;
  currentFormula: MixFormula | null;
  onCameraChange?: (position: THREE.Vector3) => void;
}

export default function Scene({
  deformation,
  showCracks,
  crackData,
  forceField,
  stressAreaPosition,
  isLoading,
  showGoldParticles,
  currentFormula,
  onCameraChange,
}: SceneProps) {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#f5f5dc']} />
        <fog attach="fog" args={['#f5f5dc', 20, 50]} />
        <SceneContent
          deformation={deformation}
          showCracks={showCracks}
          crackData={crackData}
          forceField={forceField}
          stressAreaPosition={stressAreaPosition}
          isLoading={isLoading}
          showGoldParticles={showGoldParticles}
          currentFormula={currentFormula}
        />
      </Canvas>
    </div>
  );
}
