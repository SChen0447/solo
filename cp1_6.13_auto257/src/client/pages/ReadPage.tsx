import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Canvas from '../components/Canvas';
import type { DiaryEntry, PathSegment } from '../types';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

function getHueFromTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const minute = date.getMinutes();
  return ((hour * 60 + minute) / 1440) * 360;
}

function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const [bgStyle, setBgStyle] = useState({ top: 'transparent', bottom: 'transparent' });

  useEffect(() => {
    const fetchEntry = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/entries/${id}`);
        const data = await res.json();
        setEntry(data);
        hueRef.current = getHueFromTimestamp(data.timestamp);
      } catch (error) {
        console.error('Failed to fetch entry:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id]);

  useEffect(() => {
    if (!entry) return;

    const baseHue = getHueFromTimestamp(entry.timestamp);
    let startTime: number | null = null;
    const cycleDuration = 10000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      const hue = baseHue + progress * 60;

      const topColor = `hsl(${hue % 360}, 60%, 18%)`;
      const bottomColor = `hsl(${(hue + 30) % 360}, 50%, 10%)`;
      setBgStyle({ top: topColor, bottom: bottomColor });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [entry]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxWidth = rect.width * 0.85;
        const maxHeight = rect.height * 0.65;
        const aspectRatio = 4 / 3;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        setCanvasSize({
          width: Math.max(400, Math.floor(width)),
          height: Math.max(300, Math.floor(height)),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  const handleReplay = () => {
    setAnimationComplete(false);
    if (entry) {
      const temp = entry;
      setEntry(null);
      setTimeout(() => setEntry(temp), 50);
    }
  };

  if (loading) {
    return (
      <div className="read-page">
        <style>{`
          .read-page {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            position: relative;
            z-index: 1;
          }
        `}</style>
        <div>加载中...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="read-page">
        <style>{`
          .read-page {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            position: relative;
            z-index: 1;
          }
        `}</style>
        <div>未找到条目</div>
      </div>
    );
  }

  return (
    <div className="read-page" ref={containerRef}>
      <style>{`
        .read-page {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          padding: 40px;
        }

        .read-canvas-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 100%;
        }

        .read-canvas {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          border: 0.5px solid rgba(167, 139, 250, 0.4);
        }

        .read-footer {
          width: 100%;
          max-width: 800px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 30px;
        }

        .read-date {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 1px;
        }

        .footer-buttons {
          display: flex;
          gap: 12px;
        }

        .read-btn {
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 0.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .read-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(167, 139, 250, 0.5);
        }

        @media (max-width: 768px) {
          .read-page {
            padding: 20px 16px;
          }

          .read-footer {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .read-date {
            order: 2;
            font-size: 14px;
          }

          .footer-buttons {
            order: 1;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="read-canvas-wrapper">
        <div className="read-canvas">
          <Canvas
            width={canvasSize.width}
            height={canvasSize.height}
            brushWidth={6}
            brushColor="#ffffff"
            readOnly={true}
            animate={!animationComplete}
            paths={entry.paths}
            onAnimationComplete={handleAnimationComplete}
            backgroundGradient={bgStyle}
          />
        </div>
      </div>

      <div className="read-footer">
        <div className="read-date">
          {formatDate(entry.timestamp)}
        </div>
        <div className="footer-buttons">
          {animationComplete && (
            <button className="read-btn" onClick={handleReplay}>
              重新播放
            </button>
          )}
          <button className="read-btn" onClick={handleBack}>
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReadPage;
