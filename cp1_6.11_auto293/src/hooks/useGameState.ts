import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const WaterVeinNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  ringIndex: z.number(),
  connected: z.boolean(),
  clickEffectTime: z.number(),
});

const VinePathSchema = z.object({
  id: z.string(),
  fromNodeId: z.string(),
  controlPoints: z.array(z.object({ x: z.number(), y: z.number() })),
  endPoint: z.object({ x: z.number(), y: z.number() }),
});

const RingLevelSchema = z.object({
  id: z.string(),
  diameter: z.number(),
  ringCount: z.number(),
  nodes: z.array(WaterVeinNodeSchema),
  crownEntrance: z.object({ x: z.number(), y: z.number() }),
  crownWithered: z.boolean(),
  crownBlooming: z.number(),
  vinePaths: z.array(VinePathSchema),
});

export type WaterVeinNode = z.infer<typeof WaterVeinNodeSchema>;
export type VinePath = z.infer<typeof VinePathSchema>;
export type RingLevel = z.infer<typeof RingLevelSchema>;

const RING_CONFIGS = [
  { diameter: 400, ringCount: 20 },
  { diameter: 500, ringCount: 30 },
  { diameter: 600, ringCount: 40 },
];

const MAX_MISSED_NODES = 2;

function generateNodesForRing(
  ringCount: number,
  diameter: number,
  centerX: number,
  centerY: number
): WaterVeinNode[] {
  const nodes: WaterVeinNode[] = [];
  const radius = diameter / 2;

  for (let i = 0; i < ringCount; i++) {
    const count = 5 + Math.floor(Math.random() * 6);
    const ringRadius = ((i + 1) / ringCount) * radius;
    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2 + Math.random() * 0.3;
      const r = ringRadius + (Math.random() - 0.5) * 8;
      nodes.push({
        id: uuidv4(),
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        ringIndex: i,
        connected: false,
        clickEffectTime: 0,
      });
    }
  }
  return nodes;
}

function createRingLevels(canvasW: number, canvasH: number): RingLevel[] {
  return RING_CONFIGS.map((cfg, idx) => {
    const cx = canvasW * 0.4;
    const cy = canvasH * 0.5;
    const crownX = cx + cfg.diameter / 2 + 60;
    const crownY = cy - cfg.diameter / 4;
    return {
      id: uuidv4(),
      diameter: cfg.diameter,
      ringCount: cfg.ringCount,
      nodes: generateNodesForRing(cfg.ringCount, cfg.diameter, cx, cy),
      crownEntrance: { x: crownX, y: crownY },
      crownWithered: false,
      crownBlooming: 0,
      vinePaths: [],
    };
  });
}

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  pathProgress: number;
  pathId: string;
  levelIndex: number;
};

export type ClickEffect = {
  x: number;
  y: number;
  startTime: number;
  duration: number;
};

export function useGameState(canvasW: number, canvasH: number) {
  const [levels, setLevels] = useState<RingLevel[]>(() =>
    createRingLevels(canvasW, canvasH)
  );
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickEffects, setClickEffects] = useState<ClickEffect[]>([]);
  const [dragging, setDragging] = useState<{
    nodeId: string;
    levelIndex: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const currentLevel = levels[currentLevelIndex];

  const totalNodes = useMemo(
    () => levels.reduce((s, l) => s + l.nodes.length, 0),
    [levels]
  );
  const totalConnected = useMemo(
    () => levels.reduce((s, l) => s + l.nodes.filter((n) => n.connected).length, 0),
    [levels]
  );
  const progress = useMemo(
    () => (totalNodes > 0 ? (totalConnected / totalNodes) * 100 : 0),
    [totalConnected, totalNodes]
  );

  const remainingNodes = useMemo(
    () => currentLevel?.nodes.filter((n) => !n.connected).length ?? 0,
    [currentLevel]
  );

  const missedNodes = useMemo(() => {
    if (!currentLevel) return 0;
    return currentLevel.nodes.filter((n) => !n.connected).length;
  }, [currentLevel]);

  const isCrownWithered = useMemo(
    () => missedNodes > MAX_MISSED_NODES,
    [missedNodes]
  );

  const connectNode = useCallback(
    (nodeId: string, levelIndex: number, endPoint: { x: number; y: number }) => {
      setLevels((prev) =>
        prev.map((level, li) => {
          if (li !== levelIndex) return level;
          const node = level.nodes.find((n) => n.id === nodeId);
          if (!node || node.connected) return level;
          const midX = (node.x + endPoint.x) / 2 + (Math.random() - 0.5) * 80;
          const midY = (node.y + endPoint.y) / 2 + (Math.random() - 0.5) * 80;
          const newPath: VinePath = {
            id: uuidv4(),
            fromNodeId: nodeId,
            controlPoints: [{ x: midX, y: midY }],
            endPoint: { x: endPoint.x, y: endPoint.y },
          };
          return {
            ...level,
            nodes: level.nodes.map((n) =>
              n.id === nodeId ? { ...n, connected: true, clickEffectTime: Date.now() } : n
            ),
            vinePaths: [...level.vinePaths, newPath],
          };
        })
      );

      setClickEffects((prev) => {
        const level = levels[levelIndex];
        const node = level?.nodes.find((n) => n.id === nodeId);
        if (!node) return prev;
        return [...prev, { x: node.x, y: node.y, startTime: Date.now(), duration: 2000 }];
      });
    },
    [levels]
  );

  const resetGame = useCallback(() => {
    setLevels(createRingLevels(canvasW, canvasH));
    setCurrentLevelIndex(0);
    setParticles([]);
    setClickEffects([]);
    setDragging(null);
  }, [canvasW, canvasH]);

  const switchLevel = useCallback((index: number) => {
    setCurrentLevelIndex(index);
  }, []);

  const startDrag = useCallback(
    (nodeId: string, levelIndex: number, x: number, y: number) => {
      setDragging({ nodeId, levelIndex, currentX: x, currentY: y });
    },
    []
  );

  const updateDrag = useCallback((x: number, y: number) => {
    setDragging((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
  }, []);

  const endDrag = useCallback(() => {
    if (!dragging) return;
    const { nodeId, levelIndex, currentX, currentY } = dragging;
    const level = levels[levelIndex];
    if (!level) {
      setDragging(null);
      return;
    }
    const dx = currentX - level.crownEntrance.x;
    const dy = currentY - level.crownEntrance.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      connectNode(nodeId, levelIndex, level.crownEntrance);
    }
    setDragging(null);
  }, [dragging, levels, connectNode]);

  const updateParticles = useCallback((deltaMs: number) => {
    setParticles((prev) => {
      const next: Particle[] = [];
      for (const p of prev) {
        const newLife = p.life - deltaMs;
        if (newLife <= 0) continue;
        next.push({ ...p, life: newLife, pathProgress: p.pathProgress + deltaMs / 4000 });
      }
      return next.slice(-500);
    });
  }, []);

  const spawnParticles = useCallback(() => {
    setParticles((prev) => {
      const newParticles: Particle[] = [];
      levels.forEach((level, levelIndex) => {
        for (const path of level.vinePaths) {
          if (Math.random() > 0.15) continue;
          if (prev.length + newParticles.length >= 500) break;
          const node = level.nodes.find((n) => n.id === path.fromNodeId);
          if (!node) continue;
          const t = Date.now() / 1000;
          const colorIdx = Math.floor(t * 2) % 3;
          const colors = ['#00e5ff', '#ce93d8', '#ffd54f'];
          newParticles.push({
            x: node.x,
            y: node.y,
            vx: 0,
            vy: 0,
            size: 4 + Math.random() * 4,
            color: colors[colorIdx],
            life: 4000,
            maxLife: 4000,
            pathProgress: 0,
            pathId: path.id,
            levelIndex,
          });
        }
      });
      return [...prev, ...newParticles].slice(-500);
    });
  }, [levels]);

  const checkCrownWither = useCallback(() => {
    setLevels((prev) =>
      prev.map((level) => {
        const unconnected = level.nodes.filter((n) => !n.connected).length;
        if (unconnected > MAX_MISSED_NODES && !level.crownWithered) {
          return { ...level, crownWithered: true };
        }
        if (unconnected <= MAX_MISSED_NODES && level.crownWithered) {
          return { ...level, crownWithered: false };
        }
        const connected = level.nodes.filter((n) => n.connected).length;
        const bloomTarget = level.nodes.length > 0 ? connected / level.nodes.length : 0;
        return { ...level, crownBlooming: bloomTarget };
      })
    );
  }, []);

  const cleanupClickEffects = useCallback(() => {
    const now = Date.now();
    setClickEffects((prev) => prev.filter((e) => now - e.startTime < e.duration));
  }, []);

  return {
    levels,
    currentLevelIndex,
    currentLevel,
    particles,
    clickEffects,
    dragging,
    progress,
    remainingNodes,
    missedNodes,
    isCrownWithered,
    totalNodes,
    totalConnected,
    connectNode,
    resetGame,
    switchLevel,
    startDrag,
    updateDrag,
    endDrag,
    updateParticles,
    spawnParticles,
    checkCrownWither,
    cleanupClickEffects,
  };
}
