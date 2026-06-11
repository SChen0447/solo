import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import ColorPalette from './components/ColorPalette';
import RoseWindow from './components/RoseWindow';
import LightControls from './components/LightControls';
import {
  LightParams,
  computeProjections,
} from './utils/projection';

interface WindowSection {
  id: string;
  index: number;
  color: string | null;
}

const createInitialSections = (): WindowSection[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: uuidv4(),
    index: i,
    color: null,
  }));
};

const App: React.FC = () => {
  const [sections, setSections] = useState<WindowSection[]>(createInitialSections);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [light, setLight] = useState<LightParams>({ altitude: 60, azimuth: 90 });
  const [isResetting, setIsResetting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const projections = useMemo(
    () => computeProjections(sections, light),
    [sections, light]
  );

  const handleSectionClick = useCallback(
    (index: number) => {
      if (!selectedColor || isResetting) return;
      setSections((prev) =>
        prev.map((s) =>
          s.index === index ? { ...s, color: selectedColor } : s
        )
      );
    },
    [selectedColor, isResetting]
  );

  const handleSelectColor = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleLightChange = useCallback((newLight: LightParams) => {
    setLight(newLight);
  }, []);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    const totalDelay = 12 * 200 + 500;
    setTimeout(() => {
      setSections(createInitialSections());
      setIsResetting(false);
    }, totalDelay);
  }, []);

  const handleSave = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `stained-glass-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('保存失败:', err);
    }
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #3d3d3d 0%, #fff8e7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
        position: 'relative',
      }}
    >
      <div
        ref={captureRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          padding: 40,
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ColorPalette
            selectedColor={selectedColor}
            onSelectColor={handleSelectColor}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          style={{ position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 680,
              height: 680,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255, 248, 231, 0.15) 0%, rgba(255, 248, 231, 0.02) 60%, transparent 80%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <RoseWindow
            sections={sections}
            projections={projections}
            isResetting={isResetting}
            onSectionClick={handleSectionClick}
            onReset={handleReset}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <LightControls light={light} onChange={handleLightChange} />
        </motion.div>
      </div>

      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 40,
          padding: '12px 28px',
          borderRadius: 12,
          border: 'none',
          background: '#3d3d3d',
          color: '#fff8e7',
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          letterSpacing: 1,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 100,
        }}
      >
        💾 保存作品
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{
          position: 'absolute',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#fff8e7',
            fontFamily: 'Georgia, serif',
            fontSize: 24,
            letterSpacing: 6,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: 'normal',
          }}
        >
          花窗玻璃艺术工坊
        </h1>
        <p
          style={{
            color: '#fff8e7',
            fontSize: 13,
            opacity: 0.7,
            marginTop: 8,
            letterSpacing: 1,
          }}
        >
          选择颜色 · 点击花窗 · 调节光影 · 保存作品
        </p>
      </motion.div>
    </div>
  );
};

export default App;
