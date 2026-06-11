import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WatermarkStamp from './WatermarkStamp';
import RubbingCanvas from './RubbingCanvas';
import {
  calculatePaperThickness,
  calculateAverageSpeed,
  calculatePulpConcentration,
  generateFiberTexture,
  getPulpColor,
  generateShrinkClipPath,
  generateBubbles,
  Fiber,
  TrajectoryPoint,
  Bubble
} from '../utils/paperPhysics';

type Stage = 'soaking' | 'dipping' | 'pressing' | 'drying' | 'watermark' | 'rubbing';

const STAGES: Array<{ id: Stage; name: string; icon: React.ReactNode }> = [
  {
    id: 'soaking',
    name: '浸泡池',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <path d="M16 4c-6 8-10 12-10 18a10 10 0 0 0 20 0c0-6-4-10-10-18zm0 22a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
      </svg>
    )
  },
  {
    id: 'dipping',
    name: '抄纸框',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <rect x="4" y="6" width="24" height="4" rx="1" />
        <rect x="4" y="22" width="24" height="4" rx="1" />
        <rect x="6" y="10" width="2" height="12" />
        <rect x="24" y="10" width="2" height="12" />
        <path d="M10 12c4 2 8 2 12 0M10 16c4 2 8 2 12 0M10 20c4 2 8 2 12 0" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    )
  },
  {
    id: 'pressing',
    name: '压榨机',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <rect x="14" y="2" width="4" height="12" />
        <rect x="6" y="12" width="20" height="4" rx="1" />
        <rect x="10" y="16" width="12" height="8" opacity="0.6" />
        <rect x="4" y="24" width="24" height="4" rx="1" />
      </svg>
    )
  },
  {
    id: 'drying',
    name: '晾干架',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <rect x="4" y="8" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 11h18v12H7z" opacity="0.4" />
        <path d="M12 6v2M20 6v2M12 28v2M20 28v2" strokeWidth="2" />
      </svg>
    )
  }
];

const PAPER_WIDTH = 500;
const PAPER_HEIGHT = 400;

const PaperMill: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<Stage>('soaking');
  const [soakingProgress, setSoakingProgress] = useState(0);
  const [isDipping, setIsDipping] = useState(false);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [thickness, setThickness] = useState(1);
  const [fibers, setFibers] = useState<Fiber[]>([]);
  const [concentration, setConcentration] = useState(0);
  const [pressingProgress, setPressingProgress] = useState(0);
  const [dryingProgress, setDryingProgress] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [shrinkPath, setShrinkPath] = useState('none');
  const [watermarks, setWatermarks] = useState(0);

  const paperCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulpPoolRef = useRef<HTMLDivElement>(null);
  const waveAnimationRef = useRef<number>(0);
  const dryingIntervalRef = useRef<number>(0);
  const soakingIntervalRef = useRef<number>(0);

  const createPaperCanvas = useCallback((): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = PAPER_WIDTH;
    canvas.height = PAPER_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#faf0e6';
      ctx.fillRect(0, 0, PAPER_WIDTH, PAPER_HEIGHT);

      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = PAPER_WIDTH;
      noiseCanvas.height = PAPER_HEIGHT;
      const noiseCtx = noiseCanvas.getContext('2d');
      if (noiseCtx) {
        const imgData = noiseCtx.createImageData(PAPER_WIDTH, PAPER_HEIGHT);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const v = 240 + Math.floor(Math.random() * 15);
          imgData.data[i] = v;
          imgData.data[i + 1] = Math.floor(v * 0.98);
          imgData.data[i + 2] = Math.floor(v * 0.93);
          imgData.data[i + 3] = 30 + Math.floor(Math.random() * 20);
        }
        noiseCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(noiseCanvas, 0, 0);
      }

      const paperFibers = generateFiberTexture(PAPER_WIDTH, PAPER_HEIGHT, 40);
      ctx.strokeStyle = '#d7ccc8';
      paperFibers.forEach(fiber => {
        ctx.globalAlpha = fiber.opacity;
        ctx.lineWidth = fiber.width;
        ctx.beginPath();
        ctx.moveTo(fiber.startX, fiber.startY);
        const cp1x = (fiber.startX + fiber.endX) / 2 + (Math.random() - 0.5) * 30;
        const cp1y = (fiber.startY + fiber.endY) / 2 + (Math.random() - 0.5) * 30;
        ctx.quadraticCurveTo(cp1x, cp1y, fiber.endX, fiber.endY);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    paperCanvasRef.current = canvas;
    return canvas;
  }, []);

  useEffect(() => {
    if (currentStage === 'soaking' && soakingProgress < 100) {
      soakingIntervalRef.current = window.setInterval(() => {
        setSoakingProgress(p => {
          if (p >= 100) {
            window.clearInterval(soakingIntervalRef.current);
            return 100;
          }
          return p + 2;
        });
      }, 60);
    }
    return () => window.clearInterval(soakingIntervalRef.current);
  }, [currentStage, soakingProgress]);

  const drawPulpPool = useCallback(() => {
    const canvas = pulpCanvasRef.current;
    if (!canvas || !pulpPoolRef.current) return;

    const rect = pulpPoolRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = getPulpColor(concentration);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, concentration > 0.5 ? '#fff8e1' : '#4e342e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = waveAnimationRef.current;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + concentration * 0.1})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const baseY = (canvas.height / 8) * i + 20;
      for (let x = 0; x < canvas.width; x += 5) {
        const y = baseY + Math.sin((x + time * 2 + i * 50) * 0.03) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (fibers.length > 0) {
      ctx.strokeStyle = `rgba(188, 170, 164, ${0.3 + concentration * 0.2})`;
      fibers.forEach(fiber => {
        const scaleX = canvas.width / PAPER_WIDTH;
        const scaleY = canvas.height / PAPER_HEIGHT;
        ctx.globalAlpha = fiber.opacity * (0.5 + concentration * 0.5);
        ctx.lineWidth = fiber.width * 1.5;
        ctx.beginPath();
        ctx.moveTo(fiber.startX * scaleX, fiber.startY * scaleY);
        ctx.lineTo(fiber.endX * scaleX, fiber.endY * scaleY);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    if (isDipping && trajectory.length > 2) {
      ctx.strokeStyle = 'rgba(255, 248, 225, 0.8)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const scaleX = canvas.width / PAPER_WIDTH;
      const scaleY = canvas.height / PAPER_HEIGHT;
      ctx.moveTo(trajectory[0].x * scaleX, trajectory[0].y * scaleY);
      for (let i = 1; i < trajectory.length; i++) {
        ctx.lineTo(trajectory[i].x * scaleX, trajectory[i].y * scaleY);
      }
      ctx.stroke();
    }

    waveAnimationRef.current = requestAnimationFrame(drawPulpPool);
  }, [concentration, fibers, isDipping, trajectory]);

  useEffect(() => {
    if (currentStage === 'dipping') {
      waveAnimationRef.current = requestAnimationFrame(drawPulpPool);
    }
    return () => {
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
    };
  }, [currentStage, drawPulpPool]);

  const handleDippingStart = (e: React.MouseEvent) => {
    if (currentStage !== 'dipping' || !pulpPoolRef.current) return;
    setIsDipping(true);
    setTrajectory([]);

    const rect = pulpPoolRef.current.getBoundingClientRect();
    const scaleX = PAPER_WIDTH / rect.width;
    const scaleY = PAPER_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setTrajectory([{ x, y, timestamp: performance.now() }]);
  };

  const handleDippingMove = (e: React.MouseEvent) => {
    if (!isDipping || !pulpPoolRef.current) return;

    const rect = pulpPoolRef.current.getBoundingClientRect();
    const scaleX = PAPER_WIDTH / rect.width;
    const scaleY = PAPER_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setTrajectory(prev => {
      const newTraj = [...prev, { x, y, timestamp: performance.now() }];
      const newThickness = calculatePaperThickness(newTraj);
      const avgSpeed = calculateAverageSpeed(newTraj);
      const newConcentration = calculatePulpConcentration(newTraj.length, avgSpeed);

      setThickness(newThickness);
      setConcentration(newConcentration);

      if (newTraj.length > 50 && newTraj.length % 25 === 0) {
        setFibers(generateFiberTexture(PAPER_WIDTH, PAPER_HEIGHT, 40));
      }

      return newTraj;
    });
  };

  const handleDippingEnd = () => {
    if (isDipping && trajectory.length > 10) {
      setIsDipping(false);
      const avgSpeed = calculateAverageSpeed(trajectory);
      setConcentration(calculatePulpConcentration(trajectory.length, avgSpeed));
      setFibers(generateFiberTexture(PAPER_WIDTH, PAPER_HEIGHT, 40));
    } else {
      setIsDipping(false);
    }
  };

  const canAdvanceStage = (): boolean => {
    switch (currentStage) {
      case 'soaking':
        return soakingProgress >= 100;
      case 'dipping':
        return thickness >= 1.5;
      case 'pressing':
        return pressingProgress >= 100;
      case 'drying':
        return dryingProgress >= 100;
      case 'watermark':
        return watermarks >= 1;
      default:
        return true;
    }
  };

  const advanceStage = () => {
    switch (currentStage) {
      case 'soaking':
        setCurrentStage('dipping');
        break;
      case 'dipping':
        createPaperCanvas();
        setCurrentStage('pressing');
        startPressing();
        break;
      case 'pressing':
        setCurrentStage('drying');
        startDrying();
        break;
      case 'drying':
        setCurrentStage('watermark');
        break;
      case 'watermark':
        setCurrentStage('rubbing');
        break;
      default:
        break;
    }
  };

  const startPressing = () => {
    setPressingProgress(0);
    const interval = window.setInterval(() => {
      setPressingProgress(p => {
        if (p >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 80);
  };

  const startDrying = () => {
    setDryingProgress(0);
    setBubbles([]);
    setShrinkPath('none');

    dryingIntervalRef.current = window.setInterval(() => {
      setDryingProgress(p => {
        const newP = p + 1;
        if (newP >= 30 && bubbles.length === 0) {
          setBubbles(generateBubbles(PAPER_WIDTH, PAPER_HEIGHT));
        }
        if (newP >= 60 && shrinkPath === 'none') {
          setShrinkPath(generateShrinkClipPath(PAPER_WIDTH, PAPER_HEIGHT, 3));
        }
        if (newP >= 100) {
          window.clearInterval(dryingIntervalRef.current);
          return 100;
        }
        return newP;
      });
    }, 100);
  };

  const handleStageClick = (stage: Stage) => {
    const stageOrder: Stage[] = ['soaking', 'dipping', 'pressing', 'drying', 'watermark', 'rubbing'];
    const currentIdx = stageOrder.indexOf(currentStage);
    const targetIdx = stageOrder.indexOf(stage);

    if (targetIdx <= currentIdx) {
      setCurrentStage(stage);
    }
  };

  const renderSoakingStage = () => (
    <motion.div
      key="soaking"
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -40, rotateY: 8 }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      className="panel"
      style={{ width: 600, height: 400 }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          background: `linear-gradient(180deg, 
            hsl(${93 - soakingProgress * 0.5}, ${30 + soakingProgress * 0.3}%, ${30 + soakingProgress * 0.35}%) 0%, 
            hsl(${93 - soakingProgress * 0.5}, ${40 + soakingProgress * 0.2}%, ${50 + soakingProgress * 0.25}%) 100%)`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <pattern id="water-wave" width="200" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M0 20 Q 50 10, 100 20 T 200 20"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
              >
                <animate
                  attributeName="d"
                  values="M0 20 Q 50 10, 100 20 T 200 20;M0 20 Q 50 30, 100 20 T 200 20;M0 20 Q 50 10, 100 20 T 200 20"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#water-wave)" />
        </svg>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            zIndex: 5
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 20, opacity: 0.9 }}>纸浆浸泡中...</div>
          <div style={{
            width: 300,
            height: 16,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            overflow: 'hidden',
            margin: '0 auto'
          }}>
            <motion.div
              animate={{ width: `${soakingProgress}%` }}
              transition={{ duration: 0.1 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff8f00, #ffd54f)',
                borderRadius: 8
              }}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 'bold', color: '#ffd54f' }}>
            {soakingProgress}%
          </div>
        </div>

        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 2 + Math.random() * 4,
              height: 2 + Math.random() * 4,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`
            }}
            animate={{
              top: ['100%', '0%'],
              opacity: [0, 0.8, 0],
              scale: [1, 1.5, 0.5]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    </motion.div>
  );

  const renderDippingStage = () => (
    <motion.div
      key="dipping"
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -40, rotateY: 8 }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      <div
        ref={pulpPoolRef}
        className="pulp-pool"
        style={{
          background: getPulpColor(concentration),
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)'
        }}
        onMouseDown={handleDippingStart}
        onMouseMove={handleDippingMove}
        onMouseUp={handleDippingEnd}
        onMouseLeave={handleDippingEnd}
      >
        <canvas ref={pulpCanvasRef} className="pulp-canvas" />
        <div className="thickness-badge">
          厚度: {thickness.toFixed(1)} mm
        </div>

        {trajectory.length < 5 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: 18,
              opacity: 0.8,
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            按住鼠标左右拖动抄纸
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>
              拖动越密集，纸页越厚实
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderPressingStage = () => (
    <motion.div
      key="pressing"
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -40, rotateY: 8 }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      className="panel"
      style={{ width: 500 }}
    >
      <div style={{ position: 'relative', height: 400 }}>
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 30,
            background: 'linear-gradient(180deg, #8d6e63, #6d4c41)',
            borderRadius: '4px 4px 0 0'
          }}
        />
        <motion.div
          animate={{
            y: [0, 60, 0],
            scaleY: pressingProgress > 50 ? [1, 0.6, 0.5] : 1
          }}
          transition={{
            duration: 0.8,
            repeat: pressingProgress < 100 ? Infinity : 0,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 20,
            height: 100,
            background: 'linear-gradient(90deg, #795548, #5d4037, #795548)',
            transformOrigin: 'top center'
          }}
        />
        <motion.div
          animate={{ y: pressingProgress > 0 ? 130 + pressingProgress * 0.5 : 130 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 360,
            height: 20,
            background: 'linear-gradient(180deg, #a1887f, #795548)',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 170,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 180,
            background: '#faf0e6',
            borderRadius: 4,
            opacity: 0.9 + pressingProgress * 0.001
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, 
                rgba(255,248,225,${1 - pressingProgress * 0.004}) 0%, 
                rgba(250,240,230,1) 100%)`,
              borderRadius: 4
            }}
          />
        </div>

        {pressingProgress > 20 && Array.from({ length: Math.floor(pressingProgress / 10) }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.6, y: 0 }}
            animate={{ opacity: 0, y: 60 + Math.random() * 30 }}
            transition={{ duration: 1, delay: i * 0.1 }}
            style={{
              position: 'absolute',
              bottom: 30,
              left: `${20 + i * 6}%`,
              width: 4 + Math.random() * 4,
              height: 15 + Math.random() * 20,
              background: 'linear-gradient(180deg, rgba(176,190,197,0.8), rgba(176,190,197,0))',
              borderRadius: 2
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: '100%'
          }}
        >
          <div style={{ fontSize: 14, color: '#5d4037', marginBottom: 10 }}>
            压榨脱水进度
          </div>
          <div style={{
            width: 300,
            height: 12,
            background: 'rgba(93,64,55,0.2)',
            borderRadius: 6,
            overflow: 'hidden',
            margin: '0 auto'
          }}>
            <motion.div
              animate={{ width: `${pressingProgress}%` }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #8d6e63, #5d4037)',
                borderRadius: 6
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontWeight: 'bold', color: '#5d4037' }}>
            {pressingProgress}%
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderDryingStage = () => {
    const paperOpacity = 0.6 + dryingProgress * 0.004;
    const arcRadius = 60;
    const circumference = 2 * Math.PI * arcRadius;
    const progressLength = circumference * (dryingProgress / 100);

    return (
      <motion.div
        key="drying"
        initial={{ opacity: 0, x: 40, rotateY: -8 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        exit={{ opacity: 0, x: -40, rotateY: 8 }}
        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      >
        <div style={{ position: 'relative' }}>
          <div className="drying-rack">
            <div
              className="paper-sheet"
              style={{
                background: '#faf0e6',
                opacity: paperOpacity,
                clipPath: shrinkPath,
                transition: 'opacity 1s ease, clip-path 1s ease'
              }}
            >
              {bubbles.map(bubble => (
                <div
                  key={bubble.id}
                  className="bubble"
                  style={{
                    left: bubble.x,
                    top: bubble.y,
                    width: bubble.size * 4,
                    height: bubble.size * 4
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: -90,
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <svg width={arcRadius * 2 + 20} height={arcRadius + 20} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b0bec5" />
                  <stop offset="100%" stopColor="#ff8f00" />
                </linearGradient>
              </defs>
              <path
                d={`M 10 ${arcRadius + 10} A ${arcRadius} ${arcRadius} 0 0 1 ${arcRadius * 2 + 10} ${arcRadius + 10}`}
                fill="none"
                stroke="rgba(93,64,55,0.2)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d={`M 10 ${arcRadius + 10} A ${arcRadius} ${arcRadius} 0 0 1 ${arcRadius * 2 + 10} ${arcRadius + 10}`}
                fill="none"
                stroke="url(#arc-grad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${progressLength} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.1s linear' }}
              />
              <text
                x={arcRadius + 10}
                y={arcRadius - 5}
                textAnchor="middle"
                fill="#5d4037"
                fontSize="22"
                fontWeight="bold"
              >
                {dryingProgress}%
              </text>
              <text
                x={arcRadius + 10}
                y={arcRadius + 15}
                textAnchor="middle"
                fill="#8d6e63"
                fontSize="11"
              >
                干燥进度
              </text>
            </svg>
          </div>

          {dryingProgress < 100 && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={`steam-${i}`}
                  style={{
                    position: 'absolute',
                    width: 20 + Math.random() * 20,
                    height: 20 + Math.random() * 20,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
                    borderRadius: '50%',
                    left: `${20 + i * 12}%`,
                    top: '-10px',
                    pointerEvents: 'none'
                  }}
                  animate={{
                    y: [0, -80],
                    opacity: [0.6, 0],
                    scale: [1, 2],
                    x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 1.5,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const renderWatermarkStage = () => (
    <motion.div
      key="watermark"
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -40, rotateY: 8 }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      <WatermarkStamp
        paperCanvas={paperCanvasRef.current}
        onWatermarkApplied={() => setWatermarks(w => w + 1)}
      />
    </motion.div>
  );

  const renderRubbingStage = () => (
    <motion.div
      key="rubbing"
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -40, rotateY: 8 }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      <RubbingCanvas paperCanvas={paperCanvasRef.current} />
    </motion.div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 'soaking':
        return renderSoakingStage();
      case 'dipping':
        return renderDippingStage();
      case 'pressing':
        return renderPressingStage();
      case 'drying':
        return renderDryingStage();
      case 'watermark':
        return renderWatermarkStage();
      case 'rubbing':
        return renderRubbingStage();
      default:
        return null;
    }
  };

  const getStageInfo = () => {
    switch (currentStage) {
      case 'soaking':
        return [
          { label: '浸泡阶段', value: '进行中' },
          { label: '浸泡进度', value: `${soakingProgress}%` }
        ];
      case 'dipping':
        return [
          { label: '抄纸阶段', value: '进行中' },
          { label: '纸页厚度', value: `${thickness.toFixed(1)}mm` },
          { label: '纸浆浓度', value: `${(concentration * 100).toFixed(0)}%` }
        ];
      case 'pressing':
        return [
          { label: '压榨阶段', value: '进行中' },
          { label: '压榨进度', value: `${pressingProgress}%` },
          { label: '纸页厚度', value: `${thickness.toFixed(1)}mm` }
        ];
      case 'drying':
        return [
          { label: '晾干阶段', value: '进行中' },
          { label: '干燥进度', value: `${dryingProgress}%` },
          { label: '气泡数', value: bubbles.length }
        ];
      case 'watermark':
        return [
          { label: '水印阶段', value: '进行中' },
          { label: '已盖印章', value: watermarks }
        ];
      case 'rubbing':
        return [
          { label: '拓印阶段', value: '进行中' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="workspace">
      <div className="status-sidebar">
        {STAGES.map((stage, idx) => {
          const stageOrder: Stage[] = ['soaking', 'dipping', 'pressing', 'drying'];
          const currentIdx = stageOrder.indexOf(currentStage);
          const targetIdx = stageOrder.indexOf(stage.id);
          const isAccessible = targetIdx <= currentIdx;

          return (
            <div
              key={stage.id}
              className={`status-item ${currentStage === stage.id ? 'active' : ''}`}
              onClick={() => isAccessible && handleStageClick(stage.id)}
              style={{
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                opacity: targetIdx > currentIdx ? 0.4 : 1
              }}
            >
              {stage.icon}
              <div className="status-label">
                第{idx + 1}步 · {stage.name}
              </div>
            </div>
          );
        })}
        <div
          className={`status-item ${currentStage === 'watermark' ? 'active' : ''} ${currentStage === 'rubbing' ? '' : ''}`}
          onClick={() => handleStageClick('watermark')}
          style={{
            cursor: 'pointer',
            opacity: ['soaking', 'dipping', 'pressing', 'drying'].includes(currentStage) ? 0.4 : 1
          }}
        >
          <svg viewBox="0 0 32 32" fill="currentColor">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 8c-3 3-6 6-6 11a6 6 0 0 0 12 0c0-5-3-8-6-11z" opacity="0.5" />
            <circle cx="16" cy="16" r="3" />
          </svg>
          <div className="status-label">水印阶段</div>
        </div>
        <div
          className={`status-item ${currentStage === 'rubbing' ? 'active' : ''}`}
          onClick={() => handleStageClick('rubbing')}
          style={{
            cursor: 'pointer',
            opacity: ['soaking', 'dipping', 'pressing', 'drying', 'watermark'].includes(currentStage) && currentStage !== 'rubbing' ? 0.4 : 1
          }}
        >
          <svg viewBox="0 0 32 32" fill="currentColor">
            <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 10h4v4h-4zM18 10h4v4h-4zM10 18h4v4h-4zM18 18h4v4h-4z" opacity="0.7" />
            <path d="M14 8v16M8 14h16" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </svg>
          <div className="status-label">拓印阶段</div>
        </div>
      </div>

      <div className="main-stage">
        <AnimatePresence mode="wait">
          {renderStageContent()}
        </AnimatePresence>
      </div>

      <div className="right-panel">
        <div className="panel-title">工坊状态</div>
        <div className="panel-info">
          {getStageInfo().map((row, idx) => (
            <div key={idx} className="info-row">
              <span className="info-label">{row.label}</span>
              <span className="info-value">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="action-buttons">
          {currentStage !== 'rubbing' && (
            <button
              className="btn"
              onClick={advanceStage}
              disabled={!canAdvanceStage()}
              style={{
                opacity: canAdvanceStage() ? 1 : 0.5,
                cursor: canAdvanceStage() ? 'pointer' : 'not-allowed'
              }}
            >
              {currentStage === 'watermark' ? '进入拓印 →' : '下一步 →'}
            </button>
          )}
          {canAdvanceStage() && (
            <div style={{
              fontSize: 12,
              color: '#ff8f00',
              textAlign: 'center',
              animation: 'pulse 1.5s infinite'
            }}>
              ✓ 条件已满足
            </div>
          )}
          {!canAdvanceStage() && currentStage !== 'rubbing' && (
            <div style={{
              fontSize: 12,
              color: '#8d6e63',
              textAlign: 'center'
            }}>
              {currentStage === 'soaking' && '等待浸泡完成'}
              {currentStage === 'dipping' && '厚度需达到 1.5mm 以上'}
              {currentStage === 'pressing' && '等待压榨完成'}
              {currentStage === 'drying' && '等待晾干完成'}
              {currentStage === 'watermark' && '至少加盖 1 枚印章'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperMill;
