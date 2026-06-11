import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { getEmotionFromColor } from '../utils/emotionMapper';

export interface LightParams {
  lightColor: string;
  lightPositionX: number;
  lightPositionY: number;
  lightRadius: number;
  lightIntensity: number;
}

export interface SceneHandle {
  exportImage: () => void;
}

interface SceneProps extends LightParams {
  onPositionChange: (x: number, y: number) => void;
}

const STAGE_WIDTH = 700;
const STAGE_HEIGHT = 400;
const ACTOR_HEIGHT = 150;
const ACTOR_WIDTH = 60;

const Scene = forwardRef<SceneHandle, SceneProps>(
  ({ lightColor, lightPositionX, lightPositionY, lightRadius, lightIntensity, onPositionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const animationFrameRef = useRef<number>();
    const currentParamsRef = useRef({
      lightColor,
      lightPositionX,
      lightPositionY,
      lightRadius,
      lightIntensity,
    });

    useEffect(() => {
      currentParamsRef.current = {
        lightColor,
        lightPositionX,
        lightPositionY,
        lightRadius,
        lightIntensity,
      };
    }, [lightColor, lightPositionX, lightPositionY, lightRadius, lightIntensity]);

    const drawActor = useCallback(
      (ctx: CanvasRenderingContext2D, centerX: number, stageBottom: number) => {
        const actorTop = stageBottom - ACTOR_HEIGHT;
        const headRadius = ACTOR_WIDTH * 0.3;
        const headCenterY = actorTop + headRadius + 5;

        ctx.save();
        ctx.fillStyle = '#000000';

        ctx.beginPath();
        ctx.arc(centerX, headCenterY, headRadius, 0, Math.PI * 2);
        ctx.fill();

        const neckY = headCenterY + headRadius;
        const shoulderY = neckY + 15;
        const hipY = stageBottom - ACTOR_HEIGHT * 0.4;

        ctx.beginPath();
        ctx.moveTo(centerX - ACTOR_WIDTH * 0.25, shoulderY);
        ctx.lineTo(centerX - ACTOR_WIDTH * 0.15, hipY);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.15, hipY);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.25, shoulderY);
        ctx.closePath();
        ctx.fill();

        const armStartY = shoulderY + 10;
        const armEndY = shoulderY + ACTOR_HEIGHT * 0.35;
        ctx.beginPath();
        ctx.moveTo(centerX - ACTOR_WIDTH * 0.25, armStartY);
        ctx.lineTo(centerX - ACTOR_WIDTH * 0.4, armEndY);
        ctx.lineTo(centerX - ACTOR_WIDTH * 0.3, armEndY + 5);
        ctx.lineTo(centerX - ACTOR_WIDTH * 0.18, armStartY + 10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX + ACTOR_WIDTH * 0.25, armStartY);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.4, armEndY);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.3, armEndY + 5);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.18, armStartY + 10);
        ctx.closePath();
        ctx.fill();

        const legWidth = ACTOR_WIDTH * 0.18;
        ctx.beginPath();
        ctx.moveTo(centerX - ACTOR_WIDTH * 0.15, hipY);
        ctx.lineTo(centerX - legWidth, stageBottom);
        ctx.lineTo(centerX - legWidth + 8, stageBottom);
        ctx.lineTo(centerX - ACTOR_WIDTH * 0.05, hipY + 5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX + ACTOR_WIDTH * 0.15, hipY);
        ctx.lineTo(centerX + legWidth, stageBottom);
        ctx.lineTo(centerX + legWidth - 8, stageBottom);
        ctx.lineTo(centerX + ACTOR_WIDTH * 0.05, hipY + 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      },
      [],
    );

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const params = currentParamsRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#0a0a0a');
      bgGradient.addColorStop(1, '#3a1a1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const stageX = (width - STAGE_WIDTH) / 2;
      const stageY = (height - STAGE_HEIGHT) / 2;

      ctx.fillStyle = '#c4a882';
      ctx.fillRect(stageX, stageY, STAGE_WIDTH, STAGE_HEIGHT);

      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 4;
      ctx.strokeRect(stageX, stageY, STAGE_WIDTH, STAGE_HEIGHT);

      const lightCenterX = stageX + STAGE_WIDTH / 2 + params.lightPositionX;
      const lightCenterY = stageY + STAGE_HEIGHT / 2 + params.lightPositionY;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      const glowRadius = params.lightRadius * 1.5;
      const glowGradient = ctx.createRadialGradient(
        lightCenterX,
        lightCenterY,
        0,
        lightCenterX,
        lightCenterY,
        glowRadius,
      );

      const color = params.lightColor;
      const intensity = Math.max(0, Math.min(1, params.lightIntensity));

      glowGradient.addColorStop(0, `${color}${Math.floor(intensity * 220).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(0.4, `${color}${Math.floor(intensity * 160).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(0.7, `${color}${Math.floor(intensity * 80).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(1, `${color}00`);

      ctx.fillStyle = glowGradient;
      ctx.fillRect(stageX, stageY, STAGE_WIDTH, STAGE_HEIGHT);

      ctx.globalCompositeOperation = 'source-over';

      const spotGradient = ctx.createRadialGradient(
        lightCenterX,
        lightCenterY,
        0,
        lightCenterX,
        lightCenterY,
        params.lightRadius,
      );
      spotGradient.addColorStop(0, `${color}${Math.floor(intensity * 200).toString(16).padStart(2, '0')}`);
      spotGradient.addColorStop(0.6, `${color}${Math.floor(intensity * 120).toString(16).padStart(2, '0')}`);
      spotGradient.addColorStop(1, `${color}00`);

      ctx.fillStyle = spotGradient;
      ctx.beginPath();
      ctx.arc(lightCenterX, lightCenterY, params.lightRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const actorPositions = [
        stageX + STAGE_WIDTH * 0.25,
        stageX + STAGE_WIDTH * 0.5,
        stageX + STAGE_WIDTH * 0.75,
      ];

      actorPositions.forEach((x) => {
        drawActor(ctx, x, stageY + STAGE_HEIGHT - 20);
      });

      if (isDragging) {
        ctx.save();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(lightCenterX, lightCenterY, params.lightRadius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }, [drawActor, isDragging]);

    useEffect(() => {
      let lastTime = performance.now();
      let frameCount = 0;

      const animate = (time: number) => {
        const delta = time - lastTime;
        if (delta >= 20) {
          render();
          lastTime = time;
          frameCount++;
          if (frameCount % 100 === 0) {
            const fps = 1000 / delta;
            if (fps < 50) {
              console.warn(`Low FPS: ${fps.toFixed(1)}`);
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [render]);

    const getMousePosition = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const stageX = (canvas.width - STAGE_WIDTH) / 2;
        const stageY = (canvas.height - STAGE_HEIGHT) / 2;

        const relativeX = x - (stageX + STAGE_WIDTH / 2);
        const relativeY = y - (stageY + STAGE_HEIGHT / 2);

        const clampedX = Math.max(-100, Math.min(100, relativeX));
        const clampedY = Math.max(-50, Math.min(50, relativeY));

        return { x: clampedX, y: clampedY };
      },
      [],
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePosition(e);
        const dx = pos.x - currentParamsRef.current.lightPositionX;
        const dy = pos.y - currentParamsRef.current.lightPositionY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentParamsRef.current.lightRadius + 30) {
          setIsDragging(true);
          onPositionChange(pos.x, pos.y);
        }
      },
      [getMousePosition, onPositionChange],
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging) return;
        const pos = getMousePosition(e);
        onPositionChange(pos.x, pos.y);
      },
      [isDragging, getMousePosition, onPositionChange],
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    useImperativeHandle(
      ref,
      () => ({
        exportImage: () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          tempCtx.drawImage(canvas, 0, 0);

          const emotion = getEmotionFromColor(lightColor);
          const watermarkText = `${emotion.name} - ${emotion.description}`;

          tempCtx.save();
          tempCtx.font = 'bold 20px "Segoe UI", sans-serif';
          tempCtx.textAlign = 'center';
          tempCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          tempCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          tempCtx.shadowBlur = 10;
          tempCtx.shadowOffsetX = 2;
          tempCtx.shadowOffsetY = 2;
          tempCtx.fillText(watermarkText, tempCanvas.width / 2, tempCanvas.height - 30);
          tempCtx.restore();

          tempCanvas.toBlob((blob) => {
            if (blob) {
              const link = document.createElement('a');
              link.download = `stage-lighting-${Date.now()}.png`;
              link.href = URL.createObjectURL(blob);
              link.click();
              URL.revokeObjectURL(link.href);
            }
          }, 'image/png');
        },
      }),
      [lightColor],
    );

    const emotion = getEmotionFromColor(lightColor);

    return (
      <div className="scene-wrapper" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <motion.div
          className="emotion-dashboard"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            width: '180px',
            padding: '20px',
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: lightColor,
              margin: '0 auto 16px',
              boxShadow: `0 0 30px ${lightColor}`,
              transition: 'all 0.3s ease-out',
            }}
          />
          <motion.h3
            key={emotion.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              color: lightColor,
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '12px',
              textShadow: `0 0 10px ${lightColor}`,
            }}
          >
            {emotion.name}
          </motion.h3>
          <motion.p
            key={emotion.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            {emotion.description}
          </motion.p>
        </motion.div>

        <div
          ref={containerRef}
          className="stage-container"
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            onMouseDown={handleMouseDown}
            style={{
              display: 'block',
              cursor: isDragging ? 'grabbing' : 'crosshair',
              transition: 'cursor 0.2s ease-out',
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </div>

        <style>{`
          @media (max-width: 768px) {
            .scene-wrapper {
              flex-direction: column !important;
              align-items: center !important;
            }
            
            .emotion-dashboard {
              width: 100% !important;
              max-width: 700px;
              display: flex;
              align-items: center;
              gap: 20px;
              text-align: left !important;
              padding: 16px !important;
            }
            
            .emotion-dashboard h3 {
              margin-bottom: 4px !important;
            }
            
            .emotion-dashboard > div:first-child {
              margin: 0 !important;
              width: 50px !important;
              height: 50px !important;
            }
            
            .stage-container {
              width: 100%;
            }
            
            canvas {
              width: 100% !important;
              height: 60vw !important;
              max-height: 400px;
            }
          }
        `}</style>
      </div>
    );
  },
);

Scene.displayName = 'Scene';

export default Scene;
