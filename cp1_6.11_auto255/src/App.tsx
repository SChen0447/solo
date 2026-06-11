import React, { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import UmbrellaCanvas from './components/UmbrellaCanvas';
import BrushPalette from './components/BrushPalette';
import ControlPanel from './components/ControlPanel';
import Gallery, { GalleryButton } from './components/Gallery';
import useDryingAnimation from './hooks/useDryingAnimation';
import { temperatureColor } from './utils/colorUtils';

const App: React.FC = () => {
  const [currentColor, setCurrentColor] = useState('#c62828');
  const [sunAngle, setSunAngle] = useState(45);
  const [windSpeed, setWindSpeed] = useState(2);
  const [humidity, setHumidity] = useState(50);
  const [isDrying, setIsDrying] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasDrawnRef = useRef(false);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const { dryness, startDrying, resetDrying } = useDryingAnimation(isDrying, {
    humidity,
    windSpeed,
    sunAngle,
  });

  const handleStrokeComplete = useCallback((sectorIndex: number) => {
    hasDrawnRef.current = true;
  }, []);

  const handleStartDrying = useCallback(() => {
    if (isDrying) return;
    
    setIsDrying(true);
    startDrying();
    
    const checkComplete = () => {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas && hasDrawnRef.current) {
          const thumb = canvas.toDataURL('image/png');
          setThumbnails((prev) => [...prev, thumb]);
          hasDrawnRef.current = false;
        }
      }, 25000);
    };
    checkComplete();
  }, [isDrying, startDrying]);

  const sunColor = temperatureColor(sunAngle);

  const renderSunRays = () => {
    if (sunAngle === 0) return null;
    
    const rayCount = 8;
    const rays = [];
    const opacity = sunAngle / 90;
    
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * 360;
      rays.push(
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + Math.cos((angle * Math.PI) / 180) * 60}
          y2={50 + Math.sin((angle * Math.PI) / 180) * 60}
          stroke={sunColor}
          strokeWidth="2"
          opacity={opacity * 0.6}
        />
      );
    }
    
    return (
      <div className="sun-rays">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={sunColor} stopOpacity={opacity * 0.8} />
              <stop offset="100%" stopColor={sunColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="60" fill="url(#sunGlow)" />
          {rays}
          <circle cx="50" cy="50" r="20" fill={sunColor} opacity={opacity} />
        </svg>
      </div>
    );
  };

  const renderWindLines = () => {
    if (windSpeed === 0) return null;
    
    const lineCount = Math.min(5, windSpeed + 2);
    const lines = [];
    
    for (let i = 0; i < lineCount; i++) {
      const yOffset = i * 18;
      lines.push(
        <g key={i} style={{ animation: `windBlow ${2 - windSpeed * 0.2}s linear infinite`, animationDelay: `${i * 0.2}s` }}>
          <path
            d={`M0,${yOffset} Q30,${yOffset - 5} 60,${yOffset} T120,${yOffset}`}
            stroke="#90a4ae"
            strokeWidth="1.5"
            fill="none"
            opacity={windSpeed / 5}
          />
        </g>
      );
    }
    
    return (
      <div className="wind-lines">
        <svg width="140" height="100" viewBox="0 0 140 100">
          {lines}
        </svg>
        <style>{`
          @keyframes windBlow {
            0% { transform: translateX(20px); opacity: 0; }
            50% { opacity: ${windSpeed / 5}; }
            100% { transform: translateX(-20px); opacity: 0; }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="weather-effects">
        {renderSunRays()}
        {renderWindLines()}
      </div>

      <GalleryButton onClick={() => setGalleryOpen(true)} />

      <BrushPalette
        selectedColor={currentColor}
        onColorSelect={setCurrentColor}
      />

      <UmbrellaCanvas
        currentColor={currentColor}
        isDrying={isDrying}
        dryness={dryness}
        windSpeed={windSpeed}
        humidity={humidity}
        onStrokeComplete={handleStrokeComplete}
        onCanvasReady={handleCanvasReady}
      />

      <ControlPanel
        sunAngle={sunAngle}
        windSpeed={windSpeed}
        humidity={humidity}
        onSunAngleChange={setSunAngle}
        onWindSpeedChange={setWindSpeed}
        onHumidityChange={setHumidity}
        onStartDrying={handleStartDrying}
        isDrying={isDrying}
      />

      <Gallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        thumbnails={thumbnails}
      />

      {dryness > 0 && dryness < 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px 20px',
            borderRadius: '8px',
            fontFamily: 'KaiTi, STKaiti, serif',
            color: '#5d4037',
            fontSize: '14px',
          }}
        >
          晾干进度: {Math.round(dryness * 100)}%
        </div>
      )}

      {dryness >= 1 && isDrying && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(139, 195, 74, 0.9)',
            padding: '10px 20px',
            borderRadius: '8px',
            fontFamily: 'KaiTi, STKaiti, serif',
            color: '#fff',
            fontSize: '14px',
          }}
        >
          ☀ 晾干完成！作品已收入画册
        </div>
      )}
    </div>
  );
};

export default App;
