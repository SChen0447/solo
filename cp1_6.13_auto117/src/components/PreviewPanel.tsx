import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { DanceMove } from '../App';

interface PreviewPanelProps {
  move: DanceMove;
  bpm: number;
  onClose: () => void;
}

const MOVE_ANIMATIONS: Record<string, {
  leftArm: [THREE.Vector3, THREE.Vector3][];
  rightArm: [THREE.Vector3, THREE.Vector3][];
  leftLeg: [THREE.Vector3, THREE.Vector3][];
  rightLeg: [THREE.Vector3, THREE.Vector3][];
  torso: [THREE.Vector3, THREE.Vector3][];
}> = {
  'Toprock': {
    leftArm: [[new THREE.Vector3(-0.5, 1.2, 0), new THREE.Vector3(-0.8, 1.6, 0.3)], [new THREE.Vector3(-0.8, 1.6, 0.3), new THREE.Vector3(-0.5, 1.2, 0)]],
    rightArm: [[new THREE.Vector3(0.5, 1.2, 0), new THREE.Vector3(0.8, 1.0, -0.3)], [new THREE.Vector3(0.8, 1.0, -0.3), new THREE.Vector3(0.5, 1.2, 0)]],
    leftLeg: [[new THREE.Vector3(-0.2, 0.5, 0), new THREE.Vector3(-0.3, 0.3, 0.4)], [new THREE.Vector3(-0.3, 0.3, 0.4), new THREE.Vector3(-0.2, 0.5, 0)]],
    rightLeg: [[new THREE.Vector3(0.2, 0.5, 0), new THREE.Vector3(0.3, 0.3, -0.3)], [new THREE.Vector3(0.3, 0.3, -0.3), new THREE.Vector3(0.2, 0.5, 0)]],
    torso: [[new THREE.Vector3(0, 1.0, 0), new THREE.Vector3(0, 1.0, 0)]],
  },
  'default': {
    leftArm: [[new THREE.Vector3(-0.5, 1.2, 0), new THREE.Vector3(-0.3, 1.8, 0.2)], [new THREE.Vector3(-0.3, 1.8, 0.2), new THREE.Vector3(-0.5, 1.2, 0)]],
    rightArm: [[new THREE.Vector3(0.5, 1.2, 0), new THREE.Vector3(0.3, 1.8, -0.2)], [new THREE.Vector3(0.3, 1.8, -0.2), new THREE.Vector3(0.5, 1.2, 0)]],
    leftLeg: [[new THREE.Vector3(-0.2, 0.5, 0), new THREE.Vector3(-0.2, 0.2, 0.3)], [new THREE.Vector3(-0.2, 0.2, 0.3), new THREE.Vector3(-0.2, 0.5, 0)]],
    rightLeg: [[new THREE.Vector3(0.2, 0.5, 0), new THREE.Vector3(0.2, 0.2, -0.3)], [new THREE.Vector3(0.2, 0.2, -0.3), new THREE.Vector3(0.2, 0.5, 0)]],
    torso: [[new THREE.Vector3(0, 1.0, 0), new THREE.Vector3(0, 1.05, 0)]],
  },
};

const ALL_MOVE_ANIMATIONS: Record<string, typeof MOVE_ANIMATIONS['default']> = {};

const moveNames = [
  'Six Step', 'Freeze', 'Pop', 'Lock', 'Wave', 'Gliding', 'Tutting', 'Uprock',
  'Headspin', 'Windmill', 'Baby Freeze', 'Handspin', 'Electric Boogaloo', 'Robot',
  'Hit', 'Twist-o-Flex', 'Neck-o-Flex', 'Master Swipe', 'Cork', 'Kick Out',
  'Floor Rock', 'Air Flare', 'Scramble',
];

moveNames.forEach((name) => {
  const rotY = (Math.random() - 0.5) * 1.5;
  const armLift = 0.3 + Math.random() * 0.8;
  const legKick = 0.2 + Math.random() * 0.5;
  const torsoShift = Math.random() * 0.15;

  ALL_MOVE_ANIMATIONS[name] = {
    leftArm: [
      [new THREE.Vector3(-0.5, 1.2, 0), new THREE.Vector3(-0.3 - Math.random() * 0.4, 1.2 + armLift, Math.random() * 0.5)],
      [new THREE.Vector3(-0.3 - Math.random() * 0.4, 1.2 + armLift, Math.random() * 0.5), new THREE.Vector3(-0.5, 1.2, 0)],
    ],
    rightArm: [
      [new THREE.Vector3(0.5, 1.2, 0), new THREE.Vector3(0.3 + Math.random() * 0.4, 1.2 + armLift, -Math.random() * 0.5)],
      [new THREE.Vector3(0.3 + Math.random() * 0.4, 1.2 + armLift, -Math.random() * 0.5), new THREE.Vector3(0.5, 1.2, 0)],
    ],
    leftLeg: [
      [new THREE.Vector3(-0.2, 0.5, 0), new THREE.Vector3(-0.2 - Math.random() * 0.2, 0.3, legKick)],
      [new THREE.Vector3(-0.2 - Math.random() * 0.2, 0.3, legKick), new THREE.Vector3(-0.2, 0.5, 0)],
    ],
    rightLeg: [
      [new THREE.Vector3(0.2, 0.5, 0), new THREE.Vector3(0.2 + Math.random() * 0.2, 0.3, -legKick * 0.7)],
      [new THREE.Vector3(0.2 + Math.random() * 0.2, 0.3, -legKick * 0.7), new THREE.Vector3(0.2, 0.5, 0)],
    ],
    torso: [
      [new THREE.Vector3(0, 1.0, 0), new THREE.Vector3(Math.sin(rotY) * torsoShift, 1.0 + torsoShift, Math.cos(rotY) * torsoShift)],
    ],
  };
});

function getAnimationForMove(moveName: string) {
  if (MOVE_ANIMATIONS[moveName]) return MOVE_ANIMATIONS[moveName];
  if (ALL_MOVE_ANIMATIONS[moveName]) return ALL_MOVE_ANIMATIONS[moveName];
  return MOVE_ANIMATIONS['default'];
}

function HumanoidFigure({ move, bpm }: { move: DanceMove; bpm: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const animData = useMemo(() => getAnimationForMove(move.name), [move.name]);
  const animDuration = useMemo(() => (move.beats * 60) / bpm, [move.beats, bpm]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycleTime = t % animDuration;
    const progress = cycleTime / animDuration;

    const interpKeyframes = (keyframes: [THREE.Vector3, THREE.Vector3][]) => {
      const totalFrames = keyframes.length;
      const frameFloat = progress * totalFrames;
      const frameIdx = Math.min(Math.floor(frameFloat), totalFrames - 1);
      const frameProgress = frameFloat - frameIdx;
      const [start, end] = keyframes[frameIdx];
      return new THREE.Vector3().lerpVectors(start, end, frameProgress);
    };

    if (leftArmRef.current) {
      const pos = interpKeyframes(animData.leftArm);
      leftArmRef.current.position.copy(pos);
    }
    if (rightArmRef.current) {
      const pos = interpKeyframes(animData.rightArm);
      rightArmRef.current.position.copy(pos);
    }
    if (leftLegRef.current) {
      const pos = interpKeyframes(animData.leftLeg);
      leftLegRef.current.position.copy(pos);
    }
    if (rightLegRef.current) {
      const pos = interpKeyframes(animData.rightLeg);
      rightLegRef.current.position.copy(pos);
    }
    if (torsoRef.current) {
      const pos = interpKeyframes(animData.torso);
      torsoRef.current.position.copy(pos);
    }
    if (headRef.current && torsoRef.current) {
      headRef.current.position.set(torsoRef.current.position.x, torsoRef.current.position.y + 0.55, torsoRef.current.position.z);
    }
  });

  const material = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x7ec8e3,
    transparent: true,
    opacity: 0.6,
    emissive: 0x3a7bd5,
    emissiveIntensity: 0.3,
    shininess: 80,
  }), []);

  return (
    <group ref={groupRef}>
      <mesh ref={headRef} position={[0, 1.55, 0]} material={material}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>
      <mesh ref={torsoRef} position={[0, 1.0, 0]} material={material}>
        <cylinderGeometry args={[0.15, 0.2, 0.7, 12]} />
      </mesh>
      <mesh ref={leftArmRef} position={[-0.5, 1.2, 0]} material={material}>
        <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.5, 1.2, 0]} material={material}>
        <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.2, 0.5, 0]} material={material}>
        <cylinderGeometry args={[0.07, 0.06, 0.6, 8]} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.2, 0.5, 0]} material={material}>
        <cylinderGeometry args={[0.07, 0.06, 0.6, 8]} />
      </mesh>

      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial color={0x111133} transparent opacity={0.5} />
      </mesh>

      <pointLight position={[0, 2.5, 1]} intensity={0.8} color={0x7ec8e3} distance={5} />
    </group>
  );
}

export default function PreviewPanel({ move, bpm, onClose }: PreviewPanelProps) {
  const [playCount, setPlayCount] = useState(5);
  const startTimeRef = useRef(Date.now());
  const animDuration = (move.beats * 60) / bpm;

  useEffect(() => {
    startTimeRef.current = Date.now();
    setPlayCount(5);
  }, [move.name]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const played = Math.floor(elapsed / animDuration);
      const remaining = Math.max(0, 5 - played);
      setPlayCount(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [animDuration]);

  return (
    <div style={{
      width: '400px',
      height: '100%',
      minHeight: '500px',
      background: 'rgba(11,16,33,0.9)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden',
      animation: 'slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '16px',
        zIndex: 10,
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#7EC8E3' }}>{move.name}</div>
        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>剩余播放: {playCount}次</div>
      </div>

      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          zIndex: 10,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          cursor: 'pointer',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease-out',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
      >
        ✕
      </button>

      <div style={{ height: '300px', marginTop: '50px' }}>
        <Canvas camera={{ position: [0, 1.2, 3], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[2, 3, 2]} intensity={0.8} />
          <pointLight position={[-2, 2, -1]} intensity={0.4} color={0x9c27b0} />
          <HumanoidFigure move={move} bpm={bpm} />
          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={6}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      <div style={{
        padding: '16px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(126,200,227,0.15)',
          color: '#7EC8E3',
          fontSize: '0.8rem',
          border: '1px solid rgba(126,200,227,0.3)',
        }}>
          {move.beats}拍
        </span>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(254,180,123,0.15)',
          color: '#FEB47B',
          fontSize: '0.8rem',
          border: '1px solid rgba(254,180,123,0.3)',
        }}>
          {'★'.repeat(move.difficulty)}{'☆'.repeat(3 - move.difficulty)}
        </span>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(156,39,176,0.15)',
          color: '#CE93D8',
          fontSize: '0.8rem',
          border: '1px solid rgba(156,39,176,0.3)',
        }}>
          动画时长: {animDuration.toFixed(1)}s
        </span>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
