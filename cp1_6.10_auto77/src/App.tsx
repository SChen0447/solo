import { useEffect, useRef, useState } from 'react';
import { EyeTracker, type GazeData, type TrackingStatus, type CalibrationPoint } from './eyeTracker';
import { PageController, type ScrollData, type ControlMode } from './pageController';
import { UIRenderer } from './ui';

type AppState = 'welcome' | 'calibrating' | 'running';

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eyeTrackerRef = useRef<EyeTracker | null>(null);
  const pageControllerRef = useRef<PageController | null>(null);
  const uiRendererRef = useRef<UIRenderer | null>(null);
  const animationRef = useRef<number | null>(null);

  const [appState, setAppState] = useState<AppState>('welcome');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
    tracking: false,
    stability: 'lost',
    pupilOffset: 0,
    fps: 0
  });
  const [controlMode, setControlMode] = useState<ControlMode>('scroll');
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([]);
  const [currentCalibrationIndex, setCurrentCalibrationIndex] = useState(-1);
  const [lastGazeData, setLastGazeData] = useState<GazeData | null>(null);
  const [lastScrollData, setLastScrollData] = useState<ScrollData | null>(null);
  const [dwellProgress, setDwellProgress] = useState<{ x: number; y: number; progress: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const getCanvasSize = () => {
    const w = Math.max(800, Math.min(1920, window.innerWidth));
    const h = Math.max(600, Math.min(1080, window.innerHeight));
    return { w, h };
  };

  useEffect(() => {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.style.display = 'none';
    videoRef.current = video;
    document.body.appendChild(video);

    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    const { w, h } = getCanvasSize();
    canvas.width = w;
    canvas.height = h;
    canvasRef.current = canvas;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });
        video.srcObject = stream;
        await video.play();
        setIsCameraReady(true);

        const eyeTracker = new EyeTracker(video, canvas);
        await eyeTracker.init();
        eyeTrackerRef.current = eyeTracker;

        const pageController = new PageController({
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
        pageControllerRef.current = pageController;

        const uiRenderer = new UIRenderer(canvas);
        uiRendererRef.current = uiRenderer;
        setCalibrationPoints(eyeTracker.getCalibrationPoints());

        eyeTracker.addEventListener('gaze', ((e: CustomEvent<GazeData>) => {
          const gazeData = e.detail;
          setLastGazeData(gazeData);
          if (eyeTracker.getIsCalibrating() || appStateRef.current === 'running') {
            pageController.updateGaze(gazeData);
          }
        }) as EventListener);

        eyeTracker.addEventListener('status', ((e: CustomEvent<TrackingStatus>) => {
          setTrackingStatus(e.detail);
        }) as EventListener);

        eyeTracker.addEventListener('eyes-closed', ((e: CustomEvent<{ duration: number }>) => {
          if (e.detail.duration >= 1500 && appStateRef.current === 'running') {
            pageController.toggleMode();
          }
        }) as EventListener);

        eyeTracker.addEventListener('calibration-progress', ((e: CustomEvent<{
          currentIndex: number;
          point: CalibrationPoint;
          points: CalibrationPoint[];
        }>) => {
          setCurrentCalibrationIndex(e.detail.currentIndex);
          setCalibrationPoints([...e.detail.points]);
        }) as EventListener);

        eyeTracker.addEventListener('calibration-complete', ((e: CustomEvent<{ points: CalibrationPoint[] }>) => {
          setCalibrationPoints(e.detail.points);
          setAppState('calibrated');
        }) as EventListener);

        pageController.addEventListener('mode-change', ((e: CustomEvent<{ mode: ControlMode }>) => {
          setControlMode(e.detail.mode);
        }) as EventListener);

        pageController.addEventListener('scroll', ((e: CustomEvent<ScrollData>) => {
          setLastScrollData(e.detail);
          if (Math.abs(e.detail.deltaY) > 0) {
            window.scrollBy(0, e.detail.deltaY);
          }
        }) as EventListener);

        pageController.addEventListener('dwell-progress', ((e: CustomEvent<{ x: number; y: number; progress: number }>) => {
          setDwellProgress(e.detail);
        }) as EventListener);

        pageController.addEventListener('dwell-cancel', () => {
          setDwellProgress(null);
        });

        pageController.addEventListener('dwell-start', () => {
          setDwellProgress(null);
        });

        eyeTracker.start();
        startRenderLoop();
      } catch (err) {
        console.error('摄像头初始化失败:', err);
        setCameraError(err instanceof Error ? err.message : '无法访问摄像头');
      }
    };

    startCamera();

    const handleResize = () => {
      const { w, h } = getCanvasSize();
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
      }
      eyeTrackerRef.current?.resize(w, h);
      pageControllerRef.current?.resize(w, h);
      uiRendererRef.current?.resize(w, h);
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (uiRendererRef.current) {
        const handled = uiRendererRef.current.handleClick(e.clientX, e.clientY);
        if (handled) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      eyeTrackerRef.current?.stop();
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      video.remove();
    };
  }, []);

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const startRenderLoop = () => {
    const render = () => {
      const ui = uiRendererRef.current;
      const eyeTracker = eyeTrackerRef.current;
      const pageController = pageControllerRef.current;
      if (!ui || !eyeTracker || !pageController) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const currentState = appStateRef.current;

      if (currentState === 'welcome') {
        ui.drawBackground();
        ui.drawWelcomeScreen(() => {
          setAppState('calibrating');
          eyeTracker.startCalibration();
        });
      } else if (currentState === 'calibrating') {
        ui.drawBackground();
        const idx = eyeTracker.getCurrentCalibrationIndex();
        ui.drawCalibrationOverlay(eyeTracker.getCalibrationPoints(), idx);
        ui.drawStatusIndicator(trackingStatusRef.current, controlModeRef.current);
      } else if (currentState === 'calibrated') {
        ui.drawBackground();
        ui.drawCalibrationComplete(() => {
          setAppState('running');
        });
        ui.drawStatusIndicator(trackingStatusRef.current, controlModeRef.current);
      } else if (currentState === 'running') {
        ui.drawBackground();
        ui.drawScrollGlow(lastScrollDataRef.current);

        const gaze = eyeTracker.getLastGazeData();
        if (gaze && !gaze.isEyesClosed) {
          ui.drawGazePoint(gaze);
        }

        if (dwellProgressRef.current) {
          ui.drawDwellProgress(dwellProgressRef.current.x, dwellProgressRef.current.y, dwellProgressRef.current.progress);
        }

        ui.drawRippleEffects(pageController.getRippleEffects());
        ui.drawStatusIndicator(trackingStatusRef.current, controlModeRef.current);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
  };

  const trackingStatusRef = useRef(trackingStatus);
  useEffect(() => {
    trackingStatusRef.current = trackingStatus;
  }, [trackingStatus]);

  const controlModeRef = useRef(controlMode);
  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  const lastScrollDataRef = useRef(lastScrollData);
  useEffect(() => {
    lastScrollDataRef.current = lastScrollData;
  }, [lastScrollData]);

  const dwellProgressRef = useRef(dwellProgress);
  useEffect(() => {
    dwellProgressRef.current = dwellProgress;
  }, [dwellProgress]);

  if (cameraError) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a1a',
        color: '#ff3355',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: "'Rajdhani', sans-serif",
        padding: 20
      }}>
        <h1 style={{ fontSize: 32, marginBottom: 16 }}>摄像头访问失败</h1>
        <p style={{ fontSize: 18, marginBottom: 24 }}>{cameraError}</p>
        <p style={{ fontSize: 14, color: '#e0e0ff' }}>请确保已允许浏览器访问摄像头，并刷新页面重试。</p>
      </div>
    );
  }

  if (!isCameraReady) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a1a',
        color: '#e0e0ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: "'Rajdhani', sans-serif"
      }}>
        <h1 style={{ fontSize: 32, marginBottom: 16 }}>正在初始化摄像头...</h1>
        <p style={{ fontSize: 16 }}>请允许浏览器访问您的摄像头</p>
      </div>
    );
  }

  return null;
}
