import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Scene, { SceneHandle } from './components/Scene';
import ControlPanel from './components/ControlPanel';
import { presetEmotions, getColorFromPosition } from './utils/emotionMapper';

const App: React.FC = () => {
  const [lightColor, setLightColor] = useState('#ff8c00');
  const [lightPositionX, setLightPositionX] = useState(0);
  const [lightPositionY, setLightPositionY] = useState(0);
  const [lightRadius, setLightRadius] = useState(120);
  const [lightIntensity, setLightIntensity] = useState(0.85);
  const [isAnimating, setIsAnimating] = useState(false);
  const [, setCurrentEmotionIndex] = useState(0);
  const [showExportNotification, setShowExportNotification] = useState(false);

  const animationTimerRef = useRef<number | null>(null);
  const sceneRef = useRef<SceneHandle>(null);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setLightColor(color);
  }, []);

  const handlePositionXChange = useCallback((value: number) => {
    setLightPositionX(value);
  }, []);

  const handlePositionYChange = useCallback((value: number) => {
    setLightPositionY(value);
  }, []);

  const handleRadiusChange = useCallback((value: number) => {
    setLightRadius(value);
  }, []);

  const handleIntensityChange = useCallback((value: number) => {
    setLightIntensity(value);
  }, []);

  const handlePositionChange = useCallback((x: number, y: number) => {
    setLightPositionX(x);
    setLightPositionY(y);
  }, []);

  const animateToNextEmotion = useCallback(() => {
    setCurrentEmotionIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % presetEmotions.length;
      const nextEmotion = presetEmotions[nextIndex];
      const nextColor = getColorFromPosition(nextEmotion.position);

      setLightColor(nextColor);
      setLightPositionX((Math.random() - 0.5) * 160);
      setLightPositionY((Math.random() - 0.5) * 80);
      setLightRadius(80 + Math.random() * 100);
      setLightIntensity(0.6 + Math.random() * 0.4);

      return nextIndex;
    });
  }, []);

  const handleToggleAnimation = useCallback(() => {
    if (isAnimating) {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      animateToNextEmotion();
      animationTimerRef.current = window.setInterval(() => {
        animateToNextEmotion();
      }, 3000);
    }
  }, [isAnimating, animateToNextEmotion]);

  const handleExport = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.exportImage();
      setShowExportNotification(true);
      setTimeout(() => {
        setShowExportNotification(false);
      }, 2000);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#121212',
        padding: '24px',
        position: 'relative',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 100,
        }}
      >
        <motion.button
          onClick={handleExport}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出图片
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showExportNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              backgroundColor: '#27ae60',
              color: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(39, 174, 96, 0.4)',
              zIndex: 1000,
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ✓ 图片已导出成功
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '8px',
            letterSpacing: '2px',
          }}
        >
          舞台灯光情绪调控模拟器
        </h1>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
          }}
        >
          通过调节色温、光位和光斑，感受灯光与情绪的联动关系
        </p>
      </motion.div>

      <div
        className="main-content"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '24px',
          flexWrap: 'wrap',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <Scene
          ref={sceneRef}
          lightColor={lightColor}
          lightPositionX={lightPositionX}
          lightPositionY={lightPositionY}
          lightRadius={lightRadius}
          lightIntensity={lightIntensity}
          onPositionChange={handlePositionChange}
        />

        <ControlPanel
          lightColor={lightColor}
          lightPositionX={lightPositionX}
          lightPositionY={lightPositionY}
          lightRadius={lightRadius}
          lightIntensity={lightIntensity}
          isAnimating={isAnimating}
          onColorChange={handleColorChange}
          onPositionXChange={handlePositionXChange}
          onPositionYChange={handlePositionYChange}
          onRadiusChange={handleRadiusChange}
          onIntensityChange={handleIntensityChange}
          onToggleAnimation={handleToggleAnimation}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{
          textAlign: 'center',
          marginTop: '40px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
        }}
      >
        <p>💡 提示：点击色条选择色温，拖动滑块调节参数，或直接在舞台上拖拽光斑</p>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column !important;
            align-items: center !important;
          }
          
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
