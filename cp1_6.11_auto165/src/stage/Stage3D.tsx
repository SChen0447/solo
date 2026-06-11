import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { LightParams, DanceParams } from '../types';

interface Stage3DProps {
  lights: LightParams;
  dance: DanceParams;
  beatTime: number;
  bpm: number;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

interface VirtualSingerProps {
  dance: DanceParams;
  beatTime: number;
  bpm: number;
}

const VirtualSinger: React.FC<VirtualSingerProps> = ({ dance, beatTime, bpm }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const beatDuration = 60 / bpm;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const beatPhase = (time % beatDuration) / beatDuration;
    const beatIntensity = Math.sin(beatPhase * Math.PI);
    const beatPulse = Math.sin(beatTime * Math.PI / 2) * 0.1 + 1;

    const waveAmount = dance.wave;
    const spinAmount = dance.spin;
    const jumpAmount = dance.jump;
    const leanAmount = dance.lean;

    groupRef.current.rotation.y = spinAmount * time * 1.5;

    groupRef.current.position.y = jumpAmount * Math.abs(Math.sin(time * 3)) * 0.5 * beatPulse;

    groupRef.current.rotation.z = leanAmount * Math.sin(time * 1.5) * 0.3;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -Math.PI / 4 + waveAmount * Math.sin(time * 4) * 0.8;
      leftArmRef.current.rotation.z = waveAmount * Math.sin(time * 3) * 0.3;
    }

    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -Math.PI / 4 - waveAmount * Math.sin(time * 4 + 0.5) * 0.8;
      rightArmRef.current.rotation.z = -waveAmount * Math.sin(time * 3 + 0.5) * 0.3;
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(time * 2 + beatIntensity * jumpAmount) * 0.4;
    }

    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -Math.sin(time * 2 + beatIntensity * jumpAmount) * 0.4;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(time * 1.2) * 0.2 * leanAmount;
      headRef.current.position.y = 1.6 + Math.sin(time * 2) * 0.05 * jumpAmount;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={headRef} position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#ffcce0" roughness={0.5} metalness={0.1} />
      </mesh>

      <mesh position={[0, 1.85, 0.25]}>
        <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6b46c1" roughness={0.6} />
      </mesh>

      <mesh position={[-0.12, 1.65, 0.3]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.12, 1.65, 0.3]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      <mesh ref={bodyRef} position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 1.0, 16]} />
        <meshStandardMaterial color="#ec4899" roughness={0.4} metalness={0.2} />
      </mesh>

      <mesh ref={leftArmRef} position={[-0.45, 1.1, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.8, 0.15]} />
        <meshStandardMaterial color="#ffcce0" roughness={0.5} />
      </mesh>

      <mesh ref={rightArmRef} position={[0.45, 1.1, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.8, 0.15]} />
        <meshStandardMaterial color="#ffcce0" roughness={0.5} />
      </mesh>

      <mesh ref={leftLegRef} position={[-0.15, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.9, 0.18]} />
        <meshStandardMaterial color="#4c1d95" roughness={0.5} />
      </mesh>

      <mesh ref={rightLegRef} position={[0.15, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.9, 0.18]} />
        <meshStandardMaterial color="#4c1d95" roughness={0.5} />
      </mesh>

      <mesh position={[0, 0.3, 0.25]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.3]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

interface DynamicLightsProps {
  lights: LightParams;
  beatTime: number;
}

const DynamicLights: React.FC<DynamicLightsProps> = ({ lights, beatTime }) => {
  const mainLightRef = useRef<THREE.SpotLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const discoLight1Ref = useRef<THREE.PointLight>(null);
  const discoLight2Ref = useRef<THREE.PointLight>(null);
  const discoLight3Ref = useRef<THREE.PointLight>(null);

  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  const discoColors = useMemo(
    () => ['#ff0080', '#00ffff', '#80ff00', '#ff8000', '#0080ff', '#ff00ff'],
    []
  );

  useEffect(() => {
    if (mainLightRef.current) {
      gsap.to(mainLightRef.current, {
        intensity: lights.mainIntensity,
        angle: lights.spotAngle,
        duration: 0.3,
        ease: 'power2.out',
      });
      mainLightRef.current.color.set(lights.mainColor);
      mainLightRef.current.position.set(...lights.mainPosition);
    }
    if (ambientRef.current) {
      gsap.to(ambientRef.current, {
        intensity: lights.ambientIntensity,
        duration: 0.3,
        ease: 'power2.out',
      });
      ambientRef.current.color.set(lights.ambientColor);
    }
  }, [lights]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const beatFlash = Math.sin(beatTime * Math.PI / 2) * 0.2 + 1;

    if (mainLightRef.current && lights.preset === 'disco') {
      mainLightRef.current.position.x = Math.sin(time * 0.8) * 5;
      mainLightRef.current.position.z = Math.cos(time * 0.8) * 5;
      mainLightRef.current.intensity = lights.mainIntensity * beatFlash;
    }

    if (discoLight1Ref.current && lights.preset === 'disco') {
      const colorIndex = Math.floor((time * 2) % discoColors.length);
      discoLight1Ref.current.color.set(discoColors[colorIndex]);
      discoLight1Ref.current.position.x = Math.sin(time * 1.5) * 3;
      discoLight1Ref.current.position.z = Math.cos(time * 1.5) * 3;
      discoLight1Ref.current.intensity = 1.5 + Math.sin(time * 4) * 0.5;
    }

    if (discoLight2Ref.current && lights.preset === 'disco') {
      const colorIndex = Math.floor((time * 2.3 + 2) % discoColors.length);
      discoLight2Ref.current.color.set(discoColors[colorIndex]);
      discoLight2Ref.current.position.x = Math.sin(time * 1.2 + 2) * 3;
      discoLight2Ref.current.position.z = Math.cos(time * 1.2 + 2) * 3;
      discoLight2Ref.current.intensity = 1.5 + Math.sin(time * 3.5 + 1) * 0.5;
    }

    if (discoLight3Ref.current && lights.preset === 'disco') {
      const colorIndex = Math.floor((time * 2.7 + 4) % discoColors.length);
      discoLight3Ref.current.color.set(discoColors[colorIndex]);
      discoLight3Ref.current.position.x = Math.sin(time * 1.8 + 4) * 3;
      discoLight3Ref.current.position.z = Math.cos(time * 1.8 + 4) * 3;
      discoLight3Ref.current.intensity = 1.5 + Math.sin(time * 4.5 + 2) * 0.5;
    }

    if (mainLightRef.current && lights.preset !== 'disco') {
      const pulseAmount = lights.preset === 'warm' ? 0.1 : 0.2;
      mainLightRef.current.intensity =
        lights.mainIntensity + Math.sin(time * 2) * pulseAmount * lights.mainIntensity;
    }
  });

  return (
    <>
      <primitive object={targetRef.current} />
      <spotLight
        ref={mainLightRef}
        position={lights.mainPosition}
        angle={lights.spotAngle}
        penumbra={0.5}
        intensity={lights.mainIntensity}
        color={lights.mainColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        target={targetRef.current}
      />
      <ambientLight ref={ambientRef} intensity={lights.ambientIntensity} color={lights.ambientColor} />

      {lights.preset === 'disco' && (
        <>
          <pointLight ref={discoLight1Ref} position={[3, 3, 3]} intensity={1.5} distance={10} />
          <pointLight ref={discoLight2Ref} position={[-3, 3, 3]} intensity={1.5} distance={10} />
          <pointLight ref={discoLight3Ref} position={[0, 4, -3]} intensity={1.5} distance={10} />
        </>
      )}

      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#ffffff" />
      <pointLight position={[5, 3, -5]} intensity={0.3} color="#ffffff" />
    </>
  );
};

interface StageFloorProps {
  lights: LightParams;
  beatTime: number;
}

const StageFloor: React.FC<StageFloorProps> = ({ lights, beatTime }) => {
  const floorRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const beatPulse = Math.sin(beatTime * Math.PI / 2) * 0.15 + 1;

    if (ring1Ref.current) {
      const scale = (1 + Math.sin(time * 1.5) * 0.1) * beatPulse;
      ring1Ref.current.scale.set(scale, 1, scale);
      const mat = ring1Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(time * 2) * 0.2 * beatPulse;
    }

    if (ring2Ref.current) {
      const scale = (1 + Math.sin(time * 1.5 + 1) * 0.1) * beatPulse;
      ring2Ref.current.scale.set(scale, 1, scale);
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(time * 2 + 1) * 0.2 * beatPulse;
    }

    if (ring3Ref.current) {
      const scale = (1 + Math.sin(time * 1.5 + 2) * 0.1) * beatPulse;
      ring3Ref.current.scale.set(scale, 1, scale);
      const mat = ring3Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(time * 2 + 2) * 0.2 * beatPulse;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.5, 1.8, 64]} />
        <meshBasicMaterial color={lights.mainColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.5, 2.8, 64]} />
        <meshBasicMaterial color={lights.ambientColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={ring3Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[3.5, 3.8, 64]} />
        <meshBasicMaterial color={lights.mainColor} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 4.5, 0.02, Math.sin(angle) * 4.5]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshBasicMaterial color={lights.mainColor} transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

interface SceneContentProps {
  lights: LightParams;
  dance: DanceParams;
  beatTime: number;
  bpm: number;
}

const SceneContent: React.FC<SceneContentProps> = ({ lights, dance, beatTime, bpm }) => {
  return (
    <>
      <DynamicLights lights={lights} beatTime={beatTime} />
      <StageFloor lights={lights} beatTime={beatTime} />
      <VirtualSinger dance={dance} beatTime={beatTime} bpm={bpm} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={15} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2 - 0.1} />
    </>
  );
};

const Stage3D: React.FC<Stage3DProps> = ({ lights, dance, beatTime, bpm, onCanvasReady }) => {
  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    onCanvasReady(gl.domElement);
  };

  return (
    <div className="stage-canvas-container">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        onCreated={handleCreated}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={['#0a0a1a']} />
        <fog attach="fog" args={['#0a0a1a', 10, 50]} />
        <SceneContent lights={lights} dance={dance} beatTime={beatTime} bpm={bpm} />
      </Canvas>
    </div>
  );
};

export default Stage3D;
