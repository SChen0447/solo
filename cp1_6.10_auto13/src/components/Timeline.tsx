import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Project, ViewMode } from '../types';
import { ProjectCard } from './ProjectCard';
import { getSpiralPosition } from '../utils/spiral';

interface TimelineProps {
  projects: Project[];
  selectedProject: Project | null;
  viewMode: ViewMode;
  likes: Record<number, number>;
  onSelect: (project: Project | null) => void;
  onLike: (projectId: number) => void;
}

interface CameraControllerProps {
  selectedProject: Project | null;
  projects: Project[];
  viewMode: ViewMode;
}

const CameraController = ({ selectedProject, projects, viewMode }: CameraControllerProps) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (selectedProject) {
      const targetPos = new THREE.Vector3(0, 0, 10);
      camera.position.lerp(targetPos, delta * 3);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 3);
    } else {
      const targetPos = viewMode === '3d'
        ? new THREE.Vector3(0, 0, 14)
        : new THREE.Vector3(0, 0, 14);
      camera.position.lerp(targetPos, delta * 2);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
      minDistance={6}
      maxDistance={25}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      autoRotate={!selectedProject && viewMode === '3d'}
      autoRotateSpeed={0.3}
    />
  );
};

interface SpiralLineProps {
  total: number;
  viewMode: ViewMode;
}

const SpiralLine = ({ total, viewMode }: SpiralLineProps) => {
  const points = useRef<THREE.Vector3[]>([]);

  if (points.current.length === 0) {
    for (let i = 0; i < total; i++) {
      const pos = getSpiralPosition(i, total);
      points.current.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    }
  }

  if (viewMode !== '3d') return null;

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points.current);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#00D4FF" transparent opacity={0.3} linewidth={1} />
    </line>
  );
};

const GridTimeline = ({
  projects,
  selectedProject,
  likes,
  onSelect,
  onLike,
}: Omit<TimelineProps, 'viewMode'>) => {
  return (
    <motion.div
      className="grid-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <LayoutGroup>
        {projects.map((project, index) => {
          const liked = (likes[project.id] || 0) > 0;
          const likeCount = likes[project.id] || 0;

          return (
            <motion.div
              key={project.id}
              layout
              className="grid-card"
              onClick={() => onSelect(project)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
            >
              <div className="grid-card-header">
                <span className="grid-card-icon">{project.icon}</span>
                <motion.button
                  className="grid-card-like"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(project.id);
                  }}
                  whileTap={{ scale: 0.9 }}
                  animate={liked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  style={{
                    filter: liked ? 'drop-shadow(0 0 6px rgba(255, 80, 80, 0.6))' : 'none',
                  }}
                >
                  {liked ? '❤️' : '🤍'}
                </motion.button>
              </div>
              <div className="grid-card-title">{project.title}</div>
              <div className="grid-card-summary">{project.summary}</div>
              <div className="grid-card-footer">
                <span className="grid-card-date">{project.date}</span>
                <div className="grid-card-tags">
                  {project.techStack.slice(0, 2).map(tech => (
                    <span key={tech} className="grid-card-tag">{tech}</span>
                  ))}
                </div>
              </div>
              {likeCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '20px',
                    fontSize: '12px',
                    color: liked ? '#FF5050' : '#CCCCFF',
                    opacity: 0.8,
                  }}
                >
                  {likeCount}
                </div>
              )}
            </motion.div>
          );
        })}
      </LayoutGroup>
    </motion.div>
  );
};

export const Timeline = ({
  projects,
  selectedProject,
  viewMode,
  likes,
  onSelect,
  onLike,
}: TimelineProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current && selectedProject) {
      onSelect(null);
    }
  };

  return (
    <div className="canvas-wrapper" ref={containerRef} onClick={handleCanvasClick}>
      <AnimatePresence mode="wait">
        {viewMode === '3d' ? (
          <motion.div
            key="3d"
            style={{ width: '100%', height: '100%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Canvas
              camera={{ position: [0, 0, 14], fov: 50 }}
              onPointerMissed={() => selectedProject && onSelect(null)}
              gl={{ antialias: true, alpha: true }}
              frameloop="demand"
              dpr={[1, 1.5]}
            >
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={0.5} />
              <pointLight position={[-10, -10, -10]} intensity={0.3} color="#00D4FF" />

              <SpiralLine total={projects.length} viewMode={viewMode} />

              <CameraController
                selectedProject={selectedProject}
                projects={projects}
                viewMode={viewMode}
              />

              {projects.map((project, index) => {
                const liked = (likes[project.id] || 0) > 0;
                const likeCount = likes[project.id] || 0;

                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    total={projects.length}
                    isSelected={selectedProject?.id === project.id}
                    viewMode={viewMode}
                    liked={liked}
                    likeCount={likeCount}
                    onSelect={onSelect}
                    onLike={onLike}
                  />
                );
              })}
            </Canvas>
          </motion.div>
        ) : (
          <GridTimeline
            key="2d"
            projects={projects}
            selectedProject={selectedProject}
            likes={likes}
            onSelect={onSelect}
            onLike={onLike}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
