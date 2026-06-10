import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Project, ViewMode } from '../types';
import { getSpiralPosition, getGridPosition, easeOutCubic } from '../utils/spiral';

interface ProjectCardProps {
  project: Project;
  index: number;
  total: number;
  isSelected: boolean;
  viewMode: ViewMode;
  liked: boolean;
  likeCount: number;
  onSelect: (project: Project) => void;
  onLike: (projectId: number) => void;
}

export const ProjectCard = ({
  project,
  index,
  total,
  isSelected,
  viewMode,
  liked,
  likeCount,
  onSelect,
  onLike,
}: ProjectCardProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [animProgress, setAnimProgress] = useState(1);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const spiralPos = useMemo(() => getSpiralPosition(index, total), [index, total]);
  const gridPos = useMemo(() => getGridPosition(index, 4), [index]);

  const targetPos = useMemo(() => {
    const basePos = viewMode === '3d' ? spiralPos : gridPos;
    if (isSelected) {
      return { x: 0, y: 0, z: 3, rotation: 0 };
    }
    return { ...basePos, rotation: spiralPos.rotation };
  }, [viewMode, isSelected, spiralPos, gridPos]);

  const scale = isSelected ? 1.6 : isHovered ? 1.08 : 1;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (animProgress < 1) {
      setAnimProgress(prev => Math.min(prev + delta / 0.6, 1));
    }

    const t = easeOutCubic(animProgress);

    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      targetPos.x,
      t * delta * 8
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetPos.y,
      t * delta * 8
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetPos.z,
      t * delta * 8
    );

    const currentRotation = groupRef.current.rotation.y;
    const targetRotation = viewMode === '3d' && !isSelected ? targetPos.rotation : 0;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      currentRotation,
      targetRotation,
      t * delta * 8
    );

    const currentScale = groupRef.current.scale.x;
    groupRef.current.scale.x = THREE.MathUtils.lerp(currentScale, scale, delta * 8);
    groupRef.current.scale.y = THREE.MathUtils.lerp(currentScale, scale, delta * 8);
    groupRef.current.scale.z = THREE.MathUtils.lerp(currentScale, scale, delta * 8);
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);
    if (!isSelected) {
      onSelect(project);
      setAnimProgress(0);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimating(true);
    onLike(project.id);
    setTimeout(() => setLikeAnimating(false), 400);
  };

  const borderColor = isHovered || isSelected ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.2)';
  const glowColor = isHovered || isSelected ? '0 0 30px rgba(0, 212, 255, 0.3)' : 'none';

  return (
    <group ref={groupRef} position={[spiralPos.x, spiralPos.y, spiralPos.z]}>
      <Html
        center
        distanceFactor={8}
        zIndexRange={[100, 0]}
        transform
        occlude={false}
      >
        <motion.div
          style={{
            width: '220px',
            height: '280px',
            position: 'relative',
            borderRadius: '16px',
            background: 'rgba(26, 26, 58, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `0.5px solid ${borderColor}`,
            boxShadow: glowColor,
            overflow: 'hidden',
            cursor: isSelected ? 'default' : 'pointer',
            userSelect: 'none',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.5 }}
        >
          <AnimatePresence>
            {showRipple && (
              <motion.div
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100px',
                  height: '100px',
                  marginLeft: '-50px',
                  marginTop: '-50px',
                  borderRadius: '50%',
                  background: 'rgba(0, 212, 255, 0.3)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          <div
            style={{
              padding: '16px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '32px' }}>{project.icon}</div>
              <motion.button
                onClick={handleLike}
                animate={likeAnimating ? { scale: [1, 1.4, 1] } : {}}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  filter: liked ? 'drop-shadow(0 0 8px rgba(255, 80, 80, 0.6))' : 'none',
                }}
              >
                {liked ? '❤️' : '🤍'}
              </motion.button>
            </div>

            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#00D4FF',
                marginBottom: '6px',
                lineHeight: 1.3,
                textShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
              }}
            >
              {project.title}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#00D4FF',
                opacity: 0.7,
                marginBottom: '10px',
              }}
            >
              {project.date}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#CCCCFF',
                opacity: 0.85,
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              {project.summary}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '10px',
              }}
            >
              {project.techStack.slice(0, 3).map(tech => (
                <span
                  key={tech}
                  style={{
                    padding: '3px 8px',
                    background: '#2A2A5A',
                    borderRadius: '10px',
                    fontSize: '10px',
                    color: '#CCCCFF',
                  }}
                >
                  {tech}
                </span>
              ))}
              {project.techStack.length > 3 && (
                <span
                  style={{
                    padding: '3px 8px',
                    background: '#2A2A5A',
                    borderRadius: '10px',
                    fontSize: '10px',
                    color: '#CCCCFF',
                  }}
                >
                  +{project.techStack.length - 3}
                </span>
              )}
            </div>

            {likeCount > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '16px',
                  fontSize: '12px',
                  color: liked ? '#FF5050' : '#CCCCFF',
                  opacity: 0.8,
                }}
              >
                {likeCount}
              </div>
            )}
          </div>
        </motion.div>
      </Html>
    </group>
  );
};
