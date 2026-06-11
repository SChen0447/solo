import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ElementType, ELEMENT_INFO, LiquidEssence } from './types';

interface ForgeProps {
  inventory: ElementType[];
  onSmeltComplete: (essence: LiquidEssence) => void;
  smeltingElement: ElementType | null;
  smeltingProgress: number;
  onStartSmelting: (element: ElementType) => void;
  fireColor: string;
}

const FireParticles: React.FC<{ color: string }> = ({ color }) => {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ position: 'absolute', top: -10, left: 30, width: 100, height: 40, pointerEvents: 'none' }}>
      {particles.map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 4 + Math.random() * 6,
            height: 4 + Math.random() * 6,
            borderRadius: '50%',
            background: color,
            left: 10 + Math.random() * 80,
            bottom: 0,
            opacity: 0.7 + Math.random() * 0.3,
            animation: `fireFloat ${0.5 + Math.random() * 0.8}s ease-out infinite`,
            animationDelay: `${Math.random() * 0.5}s`,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

const CrystalIcon: React.FC<{ element: ElementType; size?: number }> = ({ element, size = 36 }) => {
  const info = ELEMENT_INFO[element];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${info.glowColor}, ${info.color})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        boxShadow: `0 0 ${size * 0.4}px ${info.color}, inset 0 0 ${size * 0.2}px rgba(255,255,255,0.3)`,
        cursor: 'grab',
        transition: 'transform 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {info.symbol}
    </div>
  );
};

const SplashParticles: React.FC<{ color: string; active: boolean }> = ({ color, active }) => {
  if (!active) return null;
  const particles = Array.from({ length: 8 }, (_, i) => i);
  return (
    <>
      {particles.map(i => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 + Math.random() * 20;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
              left: 80 + Math.cos(angle) * dist,
              top: 50 + Math.sin(angle) * dist,
              animation: 'splashOut 0.6s ease-out forwards',
              boxShadow: `0 0 4px ${color}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
};

const Forge: React.FC<ForgeProps> = ({
  inventory,
  onSmeltComplete,
  smeltingElement,
  smeltingProgress,
  onStartSmelting,
  fireColor,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [splash, setSplash] = useState(false);
  const [splashColor, setSplashColor] = useState('#ff6a33');
  const forgeRef = useRef<HTMLDivElement>(null);
  const [showLiquid, setShowLiquid] = useState(false);
  const [liquidElement, setLiquidElement] = useState<ElementType | null>(null);
  const [liquidDragging, setLiquidDragging] = useState(false);
  const [liquidPos, setLiquidPos] = useState({ x: 0, y: 0 });
  const liquidDragStart = useRef({ x: 0, y: 0 });
  const [forgeShake, setForgeShake] = useState(false);

  useEffect(() => {
    if (smeltingProgress >= 100 && smeltingElement) {
      setShowLiquid(true);
      setLiquidElement(smeltingElement);
    }
  }, [smeltingProgress, smeltingElement]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const element = e.dataTransfer.getData('element') as ElementType;
      if (element && !smeltingElement) {
        onStartSmelting(element);
        setSplashColor(ELEMENT_INFO[element].glowColor);
        setSplash(true);
        setForgeShake(true);
        setTimeout(() => setSplash(false), 600);
        setTimeout(() => setForgeShake(false), 300);
      }
    },
    [smeltingElement, onStartSmelting]
  );

  const handleLiquidMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!showLiquid || !liquidElement) return;
      e.preventDefault();
      setLiquidDragging(true);
      const rect = forgeRef.current?.getBoundingClientRect();
      if (rect) {
        liquidDragStart.current = {
          x: e.clientX - rect.left - 80,
          y: e.clientY - rect.top - 20,
        };
      }
    },
    [showLiquid, liquidElement]
  );

  useEffect(() => {
    if (!liquidDragging) return;
    const handleMove = (e: MouseEvent) => {
      const rect = forgeRef.current?.getBoundingClientRect();
      if (rect) {
        setLiquidPos({
          x: e.clientX - rect.left - 80,
          y: e.clientY - rect.top - 20,
        });
      }
    };
    const handleUp = () => {
      setLiquidDragging(false);
      setLiquidPos({ x: 0, y: 0 });
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [liquidDragging]);

  const handleLiquidDropOnAltar = useCallback(() => {
    if (liquidElement && showLiquid) {
      onSmeltComplete({
        id: `essence-${Date.now()}`,
        element: liquidElement,
        color: ELEMENT_INFO[liquidElement].color,
      });
      setShowLiquid(false);
      setLiquidElement(null);
    }
  }, [liquidElement, showLiquid, onSmeltComplete]);

  return (
    <div
      ref={forgeRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ fontFamily: "'MedievalSharp', cursive", color: '#ff6a33', fontSize: 20, marginBottom: 4, textShadow: '0 0 10px #ff6a3388' }}>
        ⚒ 魔法熔炉 ⚒
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          width: 160,
          height: 180,
          cursor: 'pointer',
          transition: 'transform 0.1s',
          transform: forgeShake ? 'translateY(-3px)' : 'none',
        }}
        onClick={() => {
          if (!smeltingElement && inventory.length > 0) {
            const el = inventory[0];
            onStartSmelting(el);
            setSplashColor(ELEMENT_INFO[el].glowColor);
            setSplash(true);
            setForgeShake(true);
            setTimeout(() => setSplash(false), 600);
            setTimeout(() => setForgeShake(false), 300);
          }
        }}
      >
        <svg width="160" height="180" viewBox="0 0 160 180">
          <defs>
            <radialGradient id="furnaceGrad" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#4a3a2a" />
              <stop offset="100%" stopColor="#2a1a0a" />
            </radialGradient>
            <linearGradient id="ironGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5a5a5a" />
              <stop offset="50%" stopColor="#3a3a3a" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="50" rx="60" ry="15" fill="url(#ironGrad)" stroke="#666" strokeWidth="2" />
          <path
            d="M 20 50 L 30 150 Q 80 170 130 150 L 140 50"
            fill="url(#ironGrad)"
            stroke="#555"
            strokeWidth="2"
          />
          <ellipse cx="80" cy="150" rx="50" ry="12" fill="#2a2a2a" stroke="#555" strokeWidth="1" />
          <ellipse cx="80" cy="50" rx="50" ry="12" fill="#1a0a00" stroke="#444" strokeWidth="1" />
          {smeltingElement && (
            <ellipse cx="80" cy="50" rx="40" ry="8" fill={fireColor} opacity={0.3 + smeltingProgress * 0.007}>
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1s" repeatCount="indefinite" />
            </ellipse>
          )}
          <rect x="55" y="140" width="50" height="8" rx="3" fill="#444" />
          <rect x="60" y="135" width="8" height="20" rx="2" fill="#555" />
          <rect x="92" y="135" width="8" height="20" rx="2" fill="#555" />
        </svg>

        <FireParticles color={fireColor} />

        {dragOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 160,
              height: 180,
              border: '2px dashed #ff6a33',
              borderRadius: 8,
              background: 'rgba(255,106,51,0.1)',
              pointerEvents: 'none',
            }}
          />
        )}

        <SplashParticles color={splashColor} active={splash} />

        {smeltingElement && smeltingProgress < 100 && (
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: 30,
              width: 100,
              height: 6,
              background: '#333',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${smeltingProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${ELEMENT_INFO[smeltingElement].color}, ${ELEMENT_INFO[smeltingElement].glowColor})`,
                borderRadius: 3,
                transition: 'width 0.1s',
                boxShadow: `0 0 8px ${ELEMENT_INFO[smeltingElement].color}`,
              }}
            />
          </div>
        )}

        {showLiquid && liquidElement && (
          <div
            onMouseDown={handleLiquidMouseDown}
            style={{
              position: liquidDragging ? 'absolute' : 'absolute',
              left: liquidDragging ? liquidPos.x : 55,
              top: liquidDragging ? liquidPos.y : 20,
              width: 50,
              height: 40,
              cursor: 'grab',
              zIndex: liquidDragging ? 100 : 10,
              animation: liquidDragging ? 'none' : 'liquidRise 1s ease-out forwards',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(180deg, ${ELEMENT_INFO[liquidElement].glowColor}, ${ELEMENT_INFO[liquidElement].color})`,
                borderRadius: '0 0 50% 50%',
                boxShadow: `0 0 15px ${ELEMENT_INFO[liquidElement].color}, 0 4px 8px rgba(0,0,0,0.5)`,
                opacity: 0.85,
                animation: 'liquidPulse 2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -5,
                left: 10,
                width: 30,
                height: 8,
                background: ELEMENT_INFO[liquidElement].glowColor,
                borderRadius: '50%',
                opacity: 0.6,
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(40,30,20,0.8)',
          borderRadius: 8,
          border: '1px solid #4a3a2a',
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {inventory.length === 0 && (
          <span style={{ color: '#665544', fontSize: 13 }}>晶石已空</span>
        )}
        {inventory.map((el, i) => (
          <div
            key={i}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('element', el);
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={{ cursor: 'grab' }}
          >
            <CrystalIcon element={el} size={38} />
          </div>
        ))}
      </div>

      {liquidDragging && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
          onMouseUp={handleLiquidDropOnAltar}
        />
      )}
    </div>
  );
};

export default Forge;
