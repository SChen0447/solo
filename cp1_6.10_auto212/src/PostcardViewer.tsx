import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Postcard,
  WeatherType,
  getPostcardByShareCode,
  WeatherParticleSystem,
  BackgroundMusicPlayer
} from './utils';

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;

const weatherBgMap: Record<WeatherType, string> = {
  sunny: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 50%, #FFF8E1 100%)',
  rain: 'linear-gradient(180deg, #37474F 0%, #546E7A 50%, #78909C 100%)',
  snow: 'linear-gradient(180deg, #B0BEC5 0%, #CFD8DC 50%, #ECEFF1 100%)',
  sunset: 'linear-gradient(180deg, #FF6F00 0%, #FF8F00 30%, #FFB300 60%, #FFE082 100%)'
};

const weatherFilterMap: Record<WeatherType, string> = {
  sunny: 'brightness(1.05) saturate(1.1)',
  rain: 'brightness(0.9) saturate(0.8) contrast(1.05)',
  snow: 'brightness(1.02) saturate(0.9)',
  sunset: 'brightness(1.08) saturate(1.2) hue-rotate(-5deg)'
};

const PostcardViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [postcardVisible, setPostcardVisible] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [animationStarted, setAnimationStarted] = useState(false);

  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<WeatherParticleSystem | null>(null);
  const musicPlayerRef = useRef<BackgroundMusicPlayer | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const pc = getPostcardByShareCode(id);
    if (!pc) {
      setNotFound(true);
      return;
    }
    setPostcard(pc);
  }, [id]);

  useEffect(() => {
    if (!postcard) return;

    const timer1 = setTimeout(() => {
      setAnimationStarted(true);
    }, 300);

    const timer2 = setTimeout(() => {
      setEnvelopeOpen(true);
    }, 800);

    const timer3 = setTimeout(() => {
      setPostcardVisible(true);
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [postcard]);

  useEffect(() => {
    if (!postcardVisible || !postcard) return;

    const totalItems = postcard.drawPaths.length + postcard.textItems.length;
    if (totalItems === 0) {
      setRevealProgress(1);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setRevealProgress(current / totalItems);
      if (current >= totalItems) {
        clearInterval(interval);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [postcardVisible, postcard]);

  useEffect(() => {
    if (!postcardVisible || !postcard) return;

    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particleSystemRef.current) {
      particleSystemRef.current.destroy();
    }

    particleSystemRef.current = new WeatherParticleSystem(
      canvas.width,
      canvas.height,
      postcard.weatherType,
      () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (particleSystemRef.current) {
          particleSystemRef.current.render(ctx);
        }
      }
    );
    particleSystemRef.current.start();

    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
    };
  }, [postcardVisible, postcard]);

  useEffect(() => {
    if (!postcard || revealProgress <= 0) return;

    const canvas = contentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = postcard.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const drawContent = async () => {
      if (postcard.backgroundImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
            const x = (CANVAS_WIDTH - img.width * scale) / 2;
            const y = (CANVAS_HEIGHT - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            resolve();
          };
          img.src = postcard.backgroundImage;
        });
      }

      const totalPaths = postcard.drawPaths.length;
      const pathsToShow = Math.floor(revealProgress * (totalPaths + postcard.textItems.length));
      const actualPathsToShow = Math.min(totalPaths, pathsToShow);

      for (let i = 0; i < actualPathsToShow; i++) {
        const path = postcard.drawPaths[i];
        if (path.points.length < 2) continue;

        ctx.save();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const clipCanvas = document.createElement('canvas');
        clipCanvas.width = CANVAS_WIDTH;
        clipCanvas.height = CANVAS_HEIGHT;
        const clipCtx = clipCanvas.getContext('2d');
        if (clipCtx) {
          clipCtx.beginPath();
          clipCtx.moveTo(path.points[0].x, path.points[0].y);
          for (let j = 1; j < path.points.length; j++) {
            clipCtx.lineTo(path.points[j].x, path.points[j].y);
          }
          clipCtx.lineWidth = path.thickness + 4;
          clipCtx.strokeStyle = 'white';
          clipCtx.lineCap = 'round';
          clipCtx.lineJoin = 'round';
          clipCtx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let j = 1; j < path.points.length; j++) {
          ctx.lineTo(path.points[j].x, path.points[j].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      const textsToShow = Math.max(0, pathsToShow - totalPaths);
      ctx.textBaseline = 'top';
      for (let i = 0; i < textsToShow && i < postcard.textItems.length; i++) {
        const item = postcard.textItems[i];
        ctx.font = `${item.fontSize}px "Ma Shan Zheng", "ZCOOL KuaiLe", cursive`;
        ctx.fillStyle = '#2c2c2c';
        ctx.fillText(item.content, item.x, item.y);
      }
    };

    drawContent();
  }, [revealProgress, postcard]);

  useEffect(() => {
    if (!postcardVisible || !postcard) return;

    const handleResize = () => {
      const canvas = particleCanvasRef.current;
      if (!canvas || !particleSystemRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      particleSystemRef.current.resize(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [postcardVisible, postcard]);

  const toggleMusic = async () => {
    if (!musicPlayerRef.current) {
      musicPlayerRef.current = new BackgroundMusicPlayer();
      musicPlayerRef.current.setVolume(volume);
    }

    if (musicPlaying) {
      musicPlayerRef.current.stop();
      setMusicPlaying(false);
    } else {
      await musicPlayerRef.current.play();
      setMusicPlaying(true);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (musicPlayerRef.current) {
      musicPlayerRef.current.setVolume(v);
    }
  };

  useEffect(() => {
    return () => {
      if (musicPlayerRef.current) {
        musicPlayerRef.current.destroy();
      }
    };
  }, []);

  if (notFound) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 100%)',
        fontFamily: "'Noto Serif SC', serif"
      }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>💌</div>
          <h2 style={{ color: '#5d4037', marginBottom: 12, fontFamily: "'Ma Shan Zheng', cursive", fontSize: 32 }}>
            明信片不存在
          </h2>
          <p style={{ color: '#8d6e63', marginBottom: 24 }}>这张明信片可能已经过期或被删除了</p>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #ff8a65 0%, #ff7060 100%)',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(255, 112, 96, 0.3)'
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!postcard) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 100%)'
      }}>
        <div style={{ fontSize: 18, color: '#8d6e63' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="viewer-container">
      <style>{`
        .viewer-container {
          min-height: 100vh;
          background: ${weatherBgMap[postcard.weatherType]};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Noto Serif SC', serif;
        }
        .viewer-bg-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }
        .envelope-scene {
          position: relative;
          z-index: 10;
          perspective: 1200px;
          width: 400px;
          height: 300px;
        }
        .envelope {
          position: absolute;
          width: 400px;
          height: 280px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .envelope-body {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #d7ccc8 0%, #bcaaa4 100%);
          border-radius: 4px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          z-index: 2;
        }
        .envelope-flap {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 55%;
          background: linear-gradient(145deg, #a1887f 0%, #8d6e63 100%);
          transform-origin: top center;
          transform: rotateX(0deg);
          transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 5;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
        .envelope-flap.open {
          transform: rotateX(180deg);
          z-index: 1;
        }
        .envelope-front {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 65%;
          background: linear-gradient(180deg, #bcaaa4 0%, #a1887f 100%);
          z-index: 3;
          clip-path: polygon(0 20%, 50% 70%, 100% 20%, 100% 100%, 0 100%);
        }
        .postcard-wrapper {
          position: absolute;
          width: 350px;
          height: 500px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, 100%);
          transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 4;
          border-radius: 6px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .postcard-wrapper.visible {
          transform: translate(-50%, -50%);
        }
        .postcard-canvas {
          width: 100%;
          height: 100%;
          display: block;
          filter: ${weatherFilterMap[postcard.weatherType]};
        }
        .particle-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }
        .controls {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          border-radius: 50px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
        .music-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #ff8a65 0%, #ff7060 100%);
          color: white;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(255, 112, 96, 0.3);
          transition: all 0.2s;
        }
        .music-btn:hover {
          transform: scale(1.05);
        }
        .volume-slider {
          width: 100px;
          accent-color: #ff8a65;
        }
        .back-link {
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 100;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          color: #5d4037;
          text-decoration: none;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .back-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .hint {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 200;
          font-family: 'Ma Shan Zheng', cursive;
          font-size: 28px;
          color: #5d4037;
          opacity: ${animationStarted ? 0 : 1};
          transition: opacity 0.5s;
          pointer-events: none;
          text-align: center;
        }
        .hint span {
          display: block;
          font-size: 16px;
          color: #8d6e63;
          margin-top: 12px;
          font-family: 'Noto Serif SC', serif;
        }
        @media (max-width: 768px) {
          .envelope-scene {
            width: 90vw;
            height: 68vw;
            max-width: 400px;
          }
          .envelope {
            width: 90vw;
            height: 63vw;
            max-width: 400px;
            max-height: 280px;
          }
          .postcard-wrapper {
            width: min(350px, 80vw);
            height: min(500px, 114vw);
          }
        }
      `}</style>

      <canvas ref={bgCanvasRef} className="viewer-bg-canvas" />

      {!animationStarted && (
        <div className="hint">
          ✉️ 有一封来自远方的信
          <span>点击屏幕打开信件</span>
        </div>
      )}

      <Link to="/" className="back-link">← 返回创作</Link>

      <div
        className="envelope-scene"
        onClick={() => !animationStarted && setAnimationStarted(true)}
        style={{ cursor: !animationStarted ? 'pointer' : 'default' }}
      >
        <div className="envelope">
          <div className="envelope-body" />
          <div className="envelope-front" />
          <div className={`envelope-flap ${envelopeOpen ? 'open' : ''}`} />
        </div>

        <div className={`postcard-wrapper ${postcardVisible ? 'visible' : ''}`}>
          <canvas
            ref={contentCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="postcard-canvas"
          />
          <canvas
            ref={particleCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="particle-canvas"
          />
        </div>
      </div>

      {postcardVisible && (
        <div className="controls">
          <button className="music-btn" onClick={toggleMusic}>
            {musicPlaying ? '🔊' : '🔇'}
          </button>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
          />
        </div>
      )}
    </div>
  );
};

export default PostcardViewer;
