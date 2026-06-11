import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandTracking } from './HandTracking';
import { LightController } from './LightController';
import { LightParams, TrackingData } from './types';
import './App.css';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 720;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handTrackingRef = useRef<HandTracking | null>(null);
  const lightControllerRef = useRef<LightController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lightParams, setLightParams] = useState<LightParams>({
    mode: 'starlight',
    colorTemperature: 'mixed',
    mainSpotX: 0.5,
    rotationSpeed: 2,
    flashEffect: false,
    flashProgress: 1
  });
  const [trackingActive, setTrackingActive] = useState(false);

  const handleParamsChange = useCallback((params: LightParams) => {
    setLightParams(params);
  }, []);

  const handleTrackingUpdate = useCallback((data: TrackingData) => {
    if (lightControllerRef.current) {
      lightControllerRef.current.updateTrackingData(data);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (thumbnailRef.current) {
        thumbnailRef.current.srcObject = stream;
        await thumbnailRef.current.play();
      }

      setCameraAuthorized(true);

      if (videoRef.current) {
        const handTracking = new HandTracking(handleTrackingUpdate);
        handTrackingRef.current = handTracking;

        await handTracking.init(videoRef.current);
        await handTracking.start();
        setTrackingActive(true);

        if (canvasRef.current && lightControllerRef.current) {
          lightControllerRef.current.start();
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('无法访问摄像头，请确保已授权摄像头权限');
    } finally {
      setIsLoading(false);
    }
  }, [handleTrackingUpdate]);

  useEffect(() => {
    if (canvasRef.current) {
      const controller = new LightController(canvasRef.current, handleParamsChange);
      lightControllerRef.current = controller;
    }

    return () => {
      if (lightControllerRef.current) {
        lightControllerRef.current.destroy();
      }
      if (handTrackingRef.current) {
        handTrackingRef.current.destroy();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [handleParamsChange]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const maxWidth = container.clientWidth * 0.7;
      const maxHeight = container.clientHeight - 160;

      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      if (canvasRef.current) {
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        if (lightControllerRef.current) {
          lightControllerRef.current.resize(width, height);
        }
      }

      if (videoRef.current) {
        videoRef.current.style.width = `${width}px`;
        videoRef.current.style.height = `${height}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cameraAuthorized]);

  const getModeName = (mode: string) => {
    return mode === 'starlight' ? '星光散射' : '聚光回缩';
  };

  const getColorTempName = (temp: string) => {
    if (temp === 'warm') return '暖色调';
    if (temp === 'cool') return '冷色调';
    return '混合色';
  };

  return (
    <div className="app-container">
      <div className="gradient-bg" ref={containerRef}>
        <AnimatePresence>
          {!cameraAuthorized && (
            <motion.div
              className="permission-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="permission-card"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                <div className="permission-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <h1 className="permission-title">虚拟手势灯光控制台</h1>
                <p className="permission-desc">
                  通过手势动作控制迪斯科灯光效果<br />
                  需要访问摄像头以捕捉手部动作
                </p>
                {cameraError && (
                  <motion.p
                    className="error-text"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {cameraError}
                  </motion.p>
                )}
                <motion.button
                  className="start-button"
                  onClick={startCamera}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? '加载中...' : '开启摄像头'}
                </motion.button>
                <div className="gesture-hints">
                  <p>✋ 张开手 → 星光散射模式</p>
                  <p>✊ 握拳 → 聚光回缩模式</p>
                  <p>👋 双手向外挥动 → 闪爆特效</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="canvas-container">
          <canvas ref={canvasRef} className="light-canvas" />
          <video
            ref={videoRef}
            className="video-preview"
            playsInline
            muted
          />
        </div>

        <AnimatePresence>
          {cameraAuthorized && (
            <motion.div
              className="bottom-bar"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            >
              <div className="camera-thumbnail">
                <video ref={thumbnailRef} className="thumbnail-video" playsInline muted />
                <div className="thumbnail-overlay">
                  <span className={`status-dot ${trackingActive ? 'active' : ''}`} />
                  <span className="status-text">
                    {trackingActive ? '手势追踪中' : '未追踪'}
                  </span>
                </div>
              </div>

              <div className="status-info">
                <motion.div
                  className="status-item"
                  key={lightParams.mode}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="status-label">模式</span>
                  <span className={`status-value mode-${lightParams.mode}`}>
                    {getModeName(lightParams.mode)}
                  </span>
                </motion.div>

                <motion.div
                  className="status-item"
                  key={lightParams.colorTemperature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="status-label">色温</span>
                  <span className={`status-value temp-${lightParams.colorTemperature}`}>
                    {getColorTempName(lightParams.colorTemperature)}
                  </span>
                </motion.div>

                <div className="status-item">
                  <span className="status-label">转速</span>
                  <span className="status-value">
                    {lightParams.rotationSpeed.toFixed(1)} rad/s
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lightParams.flashEffect && (
            <motion.div
              className="flash-particles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="particle-burst"
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i / 20) * Math.PI * 2) * 100,
                    y: Math.sin((i / 20) * Math.PI * 2) * 100,
                    opacity: [1, 0.8, 0]
                  }}
                  transition={{ duration: 0.6, delay: i * 0.02 }}
                  style={{
                    left: '50%',
                    top: '50%',
                    background: `hsl(${Math.random() * 360}, 100%, 70%)`
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
