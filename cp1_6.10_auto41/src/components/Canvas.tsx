import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { JointAngles, JointId } from '@/types';

interface CanvasProps {
  joints: JointAngles;
  currentFrame: number;
  onJointUpdate: (jointId: JointId, angle: number) => void;
}

interface JointPosition {
  x: number;
  y: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;
const ORIGIN_X = CANVAS_WIDTH / 2;
const ORIGIN_Y = CANVAS_HEIGHT / 2 - 40;

const JOINT_RADIUS = 8;
const SELECT_RADIUS = 12;
const GRID_SIZE = 40;

const BONE_LENGTHS: Record<JointId, number> = {
  torso: 100,
  head: 50,
  leftArm: 80,
  rightArm: 80,
  leftLeg: 90,
  rightLeg: 90,
};

const PARENTS: Partial<Record<JointId, JointId>> = {
  head: 'torso',
  leftArm: 'torso',
  rightArm: 'torso',
  leftLeg: 'torso',
  rightLeg: 'torso',
};

const BASE_ANGLES: Record<JointId, number> = {
  torso: -90,
  head: 0,
  leftArm: -90,
  rightArm: -90,
  leftLeg: 90,
  rightLeg: 90,
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeAngle(deg: number): number {
  let result = deg;
  while (result > 180) result -= 360;
  while (result < -180) result += 360;
  return result;
}

export const Canvas: React.FC<CanvasProps> = ({ joints, currentFrame, onJointUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<JointId | null>(null);
  const positionsRef = useRef<Record<JointId, JointPosition>>({
    torso: { x: ORIGIN_X, y: ORIGIN_Y },
    head: { x: ORIGIN_X, y: ORIGIN_Y - 100 },
    leftArm: { x: ORIGIN_X - 80, y: ORIGIN_Y - 40 },
    rightArm: { x: ORIGIN_X + 80, y: ORIGIN_Y - 40 },
    leftLeg: { x: ORIGIN_X - 40, y: ORIGIN_Y + 90 },
    rightLeg: { x: ORIGIN_X + 40, y: ORIGIN_Y + 90 },
  });

  const computePositions = useCallback((angles: JointAngles): Record<JointId, JointPosition> => {
    const positions: Partial<Record<JointId, JointPosition>> = {};

    const torsoAngle = degToRad(BASE_ANGLES.torso + angles.torso);
    const torsoEndX = ORIGIN_X + Math.cos(torsoAngle) * BONE_LENGTHS.torso;
    const torsoEndY = ORIGIN_Y + Math.sin(torsoAngle) * BONE_LENGTHS.torso;

    positions.torso = {
      x: (ORIGIN_X + torsoEndX) / 2,
      y: (ORIGIN_Y + torsoEndY) / 2,
    };

    const torsoTop = { x: torsoEndX, y: torsoEndY };
    const torsoBottom = { x: ORIGIN_X, y: ORIGIN_Y };

    const headAngle = degToRad(BASE_ANGLES.torso + angles.torso + BASE_ANGLES.head + angles.head);
    positions.head = {
      x: torsoTop.x + Math.cos(headAngle) * BONE_LENGTHS.head,
      y: torsoTop.y + Math.sin(headAngle) * BONE_LENGTHS.head,
    };

    const leftArmBaseAngle = degToRad(BASE_ANGLES.torso + angles.torso + BASE_ANGLES.leftArm + angles.leftArm);
    positions.leftArm = {
      x: torsoTop.x + Math.cos(leftArmBaseAngle) * BONE_LENGTHS.leftArm,
      y: torsoTop.y + Math.sin(leftArmBaseAngle) * BONE_LENGTHS.leftArm,
    };

    const rightArmBaseAngle = degToRad(BASE_ANGLES.torso + angles.torso + BASE_ANGLES.rightArm + angles.rightArm);
    positions.rightArm = {
      x: torsoTop.x + Math.cos(rightArmBaseAngle) * BONE_LENGTHS.rightArm,
      y: torsoTop.y + Math.sin(rightArmBaseAngle) * BONE_LENGTHS.rightArm,
    };

    const leftLegBaseAngle = degToRad(BASE_ANGLES.leftLeg + angles.leftLeg);
    positions.leftLeg = {
      x: torsoBottom.x + Math.cos(leftLegBaseAngle) * BONE_LENGTHS.leftLeg,
      y: torsoBottom.y + Math.sin(leftLegBaseAngle) * BONE_LENGTHS.leftLeg,
    };

    const rightLegBaseAngle = degToRad(BASE_ANGLES.rightLeg + angles.rightLeg);
    positions.rightLeg = {
      x: torsoBottom.x + Math.cos(rightLegBaseAngle) * BONE_LENGTHS.rightLeg,
      y: torsoBottom.y + Math.sin(rightLegBaseAngle) * BONE_LENGTHS.rightLeg,
    };

    return positions as Record<JointId, JointPosition>;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    const positions = computePositions(joints);
    positionsRef.current = positions;

    const torsoAngle = degToRad(BASE_ANGLES.torso + joints.torso);
    const torsoEndX = ORIGIN_X + Math.cos(torsoAngle) * BONE_LENGTHS.torso;
    const torsoEndY = ORIGIN_Y + Math.sin(torsoAngle) * BONE_LENGTHS.torso;
    const torsoTop = { x: torsoEndX, y: torsoEndY };
    const torsoBottom = { x: ORIGIN_X, y: ORIGIN_Y };

    ctx.strokeStyle = '#ffd93d';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(torsoBottom.x, torsoBottom.y);
    ctx.lineTo(torsoTop.x, torsoTop.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(torsoTop.x, torsoTop.y);
    ctx.lineTo(positions.head.x, positions.head.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(torsoTop.x, torsoTop.y);
    ctx.lineTo(positions.leftArm.x, positions.leftArm.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(torsoTop.x, torsoTop.y);
    ctx.lineTo(positions.rightArm.x, positions.rightArm.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(torsoBottom.x, torsoBottom.y);
    ctx.lineTo(positions.leftLeg.x, positions.leftLeg.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(torsoBottom.x, torsoBottom.y);
    ctx.lineTo(positions.rightLeg.x, positions.rightLeg.y);
    ctx.stroke();

    const jointIds: JointId[] = ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    jointIds.forEach((id) => {
      const pos = positions[id];
      const isDragging = dragging === id;

      if (isDragging) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, SELECT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74, 144, 217, 0.4)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isDragging ? '#4a90d9' : '#ff6b6b';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px monospace';
    ctx.fillText(`Frame: ${currentFrame}`, 16, 28);
  }, [joints, currentFrame, dragging, computePositions]);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      render();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [render]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const hitTest = (mx: number, my: number): JointId | null => {
    const positions = positionsRef.current;
    const jointIds: JointId[] = ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'torso'];
    for (const id of jointIds) {
      const pos = positions[id];
      const dx = mx - pos.x;
      const dy = my - pos.y;
      if (dx * dx + dy * dy <= SELECT_RADIUS * SELECT_RADIUS) {
        return id;
      }
    }
    return null;
  };

  const calculateAngleFromMouse = (jointId: JointId, mx: number, my: number): number => {
    const positions = positionsRef.current;
    let anchorX: number, anchorY: number, baseAngleDeg: number;

    if (jointId === 'torso') {
      anchorX = ORIGIN_X;
      anchorY = ORIGIN_Y;
      baseAngleDeg = BASE_ANGLES.torso;
    } else if (jointId === 'leftLeg' || jointId === 'rightLeg') {
      anchorX = ORIGIN_X;
      anchorY = ORIGIN_Y;
      baseAngleDeg = BASE_ANGLES[jointId];
    } else {
      const torsoAngle = degToRad(BASE_ANGLES.torso + joints.torso);
      anchorX = ORIGIN_X + Math.cos(torsoAngle) * BONE_LENGTHS.torso;
      anchorY = ORIGIN_Y + Math.sin(torsoAngle) * BONE_LENGTHS.torso;
      baseAngleDeg = BASE_ANGLES.torso + joints.torso + BASE_ANGLES[jointId];
    }

    const dx = mx - anchorX;
    const dy = my - anchorY;
    const mouseAngleDeg = radToDeg(Math.atan2(dy, dx));
    return normalizeAngle(mouseAngleDeg - baseAngleDeg);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const hit = hitTest(x, y);
    if (hit !== null) {
      setDragging(hit);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) {
      const canvas = canvasRef.current;
      if (canvas) {
        const { x, y } = getMousePos(e);
        const hit = hitTest(x, y);
        canvas.style.cursor = hit !== null ? 'grab' : 'default';
      }
      return;
    }

    const { x, y } = getMousePos(e);
    const newAngle = calculateAngleFromMouse(dragging, x, y);
    onJointUpdate(dragging, newAngle);
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(null);
    }
  };

  const handleMouseLeave = () => {
    if (dragging) {
      setDragging(null);
    }
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="animation-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};
