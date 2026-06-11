import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Vector3, Island, Checkpoint, Vortex } from './types';

interface HUDProps {
  currentCheckpoint: number;
  totalCheckpoints: number;
  elapsedTime: string;
  playerPosition: Vector3;
  islands: Island[];
  checkpoints: Checkpoint[];
  vortexes: Vortex[];
  isFinished: boolean;
}

function MiniMap({
  playerPosition,
  islands,
  checkpoints,
  vortexes,
}: {
  playerPosition: Vector3;
  islands: Island[];
  checkpoints: Checkpoint[];
  vortexes: Vortex[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 150;
  const worldSize = 3000;
  const scale = size / worldSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    islands.forEach((island) => {
      const x = size / 2 + island.position.x * scale;
      const y = size / 2 + island.position.z * scale;
      const r = Math.max(3, island.diameter * scale * 0.5);
      ctx.fillStyle = '#6B8E23';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    checkpoints.forEach((cp, index) => {
      const x = size / 2 + cp.position.x * scale;
      const y = size / 2 + cp.position.z * scale;
      ctx.strokeStyle = cp.passed ? '#00FF00' : '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = cp.passed ? '#00FF00' : '#FFD700';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), x, y + 3);
    });

    vortexes.forEach((vortex) => {
      const x = size / 2 + vortex.position.x * scale;
      const y = size / 2 + vortex.position.z * scale;
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const px = size / 2 + playerPosition.x * scale;
    const py = size / 2 + playerPosition.z * scale;
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [playerPosition, islands, checkpoints, vortexes, scale]);

  return (
    <div className="glass-panel" style={{ padding: '8px', borderRadius: '50%' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: 'block', borderRadius: '50%' }}
      />
    </div>
  );
}

export default function HUD({
  currentCheckpoint,
  totalCheckpoints,
  elapsedTime,
  playerPosition,
  islands,
  checkpoints,
  vortexes,
  isFinished,
}: HUDProps) {
  return (
    <div className="hud-container">
      <div className="hud-top-center">
        <motion.div
          className="glass-panel"
          style={{
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              用时
            </div>
            <div
              style={{
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}
            >
              {elapsedTime}
            </div>
          </div>
          <div
            style={{
              width: '1px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              检查点
            </div>
            <div
              style={{
                color: currentCheckpoint >= totalCheckpoints ? '#00FF00' : '#FFD700',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              {Math.min(currentCheckpoint, totalCheckpoints)}/{totalCheckpoints}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="hud-bottom-left">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <MiniMap
            playerPosition={playerPosition}
            islands={islands}
            checkpoints={checkpoints}
            vortexes={vortexes}
          />
        </motion.div>
      </div>

      <div className="hud-bottom-right">
        <motion.div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            lineHeight: '1.8',
          }}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#FFFFFF' }}>
            操作说明
          </div>
          <div>
            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>W/S</span> 俯仰角
          </div>
          <div>
            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>A/D</span> 偏航角
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            鼠标拖拽旋转视角
          </div>
        </motion.div>
      </div>

      {isFinished && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
          }}
        >
          <motion.div
            className="glass-panel"
            style={{
              padding: '48px 64px',
              textAlign: 'center',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#FFD700',
                marginBottom: '16px',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              }}
            >
              🎉 完成！
            </div>
            <div
              style={{
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '8px',
              }}
            >
              总用时
            </div>
            <div
              style={{
                fontSize: '36px',
                fontFamily: 'monospace',
                color: '#FFFFFF',
                fontWeight: 'bold',
                letterSpacing: '3px',
              }}
            >
              {elapsedTime}
            </div>
            <div
              style={{
                marginTop: '24px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              刷新页面重新开始
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
