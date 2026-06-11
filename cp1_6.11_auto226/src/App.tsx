import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import WhisperingChamber from './WhisperingChamber';
import ControlPanel from './ControlPanel';
import { Crystal, Particle, Stats, INNER_RADIUS, PITCH_NAMES } from './types';
import { audioEngine } from './audioEngine';

function generateCrystals(count: number): Crystal[] {
  const crystals: Crystal[] = [];
  const colors: Array<{ color: string; type: 'purple' | 'green' | 'blue' }> = [
    { color: '#c3073f', type: 'purple' },
    { color: '#45a29e', type: 'green' },
    { color: '#1f2833', type: 'blue' },
  ];
  const usedPitches = new Set<number>();

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 70 + Math.random() * (INNER_RADIUS - 140);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const size = 40 + Math.random() * 40;
    const colorObj = colors[Math.floor(Math.random() * colors.length)];

    let pitchIndex: number;
    let attempts = 0;
    do {
      pitchIndex = Math.floor(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 6));
      pitchIndex = (pitchIndex + Math.floor(Math.random() * 3)) % 12;
      attempts++;
    } while (usedPitches.has(pitchIndex) && attempts < 50 && usedPitches.size < 12);
    usedPitches.add(pitchIndex);

    crystals.push({
      id: uuidv4(),
      x,
      y,
      size,
      rotation: Math.random() * 360,
      color: colorObj.color,
      colorType: colorObj.type,
      pitchIndex,
      pitchName: PITCH_NAMES[pitchIndex],
      hit: false,
      hitTime: 0,
      ripples: [],
      crackLines: [],
      flashTime: 0,
    });
  }
  return crystals;
}

export default function App() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [crystals, setCrystals] = useState<Crystal[]>(() =>
    generateCrystals(8 + Math.floor(Math.random() * 5))
  );
  const [melodySequence, setMelodySequence] = useState<string[]>([]);
  const [volume, setVolume] = useState(70);
  const [reverbTime, setReverbTime] = useState(1.5);
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockText, setShowUnlockText] = useState(false);
  const [backgroundBrightness, setBackgroundBrightness] = useState(0);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [flashBg, setFlashBg] = useState(false);
  const unlockedRef = useRef(false);

  const hitCrystalCount = useMemo(
    () => crystals.filter((c) => c.hit).length,
    [crystals]
  );

  const stats: Stats = useMemo(
    () => ({
      particleCount: particles.length,
      hitCrystals: hitCrystalCount,
      totalCrystals: crystals.length,
      melodySequence: melodySequence.slice(-6),
    }),
    [particles, hitCrystalCount, crystals.length, melodySequence]
  );

  const handleFireParticle = useCallback((x: number, y: number) => {
    const dist = Math.sqrt(x * x + y * y);
    if (dist >= INNER_RADIUS - 10) return;

    const angle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.3;
    const speed = 280 + Math.random() * 60;
    const newParticle: Particle = {
      id: uuidv4(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      colorHue: 175,
      trailLength: 15,
      trail: [],
      bounceCount: 0,
      createdAt: Date.now(),
    };

    setParticles((prev) => {
      const next = [...prev, newParticle];
      if (next.length > 10) {
        return next.slice(next.length - 10);
      }
      return next;
    });

    try {
      (audioEngine as any).ensureContext?.();
    } catch (e) {}
  }, []);

  const handleCrystalHit = useCallback(
    (crystalId: string, hitX: number, hitY: number) => {
      let triggeredPitch = '';
      const willUnlock = { value: false };

      setCrystals((prev) => {
        const crystal = prev.find((c) => c.id === crystalId);
        if (!crystal || crystal.hit) return prev;

        const played = audioEngine.playPitch(crystal.pitchName);
        if (!played) return prev;

        triggeredPitch = crystal.pitchName;

        const crackCount = 3 + Math.floor(Math.random() * 3);
        const crackLines: Array<{ points: Array<{ x: number; y: number }> }> = [];
        for (let i = 0; i < crackCount; i++) {
          const startAngle = Math.random() * Math.PI * 2;
          const points: Array<{ x: number; y: number }> = [];
          let cx = 0,
            cy = 0;
          for (let j = 0; j < 5; j++) {
            cx +=
              Math.cos(startAngle + (Math.random() - 0.5) * 1.2) *
              (crystal.size / 8);
            cy +=
              Math.sin(startAngle + (Math.random() - 0.5) * 1.2) *
              (crystal.size / 8);
            points.push({ x: cx, y: cy });
          }
          crackLines.push({ points });
        }

        const newRipple = {
          id: uuidv4(),
          startTime: Date.now(),
          centerX: hitX,
          centerY: hitY,
        };

        setMelodySequence((seq) => {
          const nextSeq = [...seq, crystal.pitchName];
          const uniqueSet = new Set(nextSeq);
          if (uniqueSet.size >= 6 && !unlockedRef.current) {
            unlockedRef.current = true;
            willUnlock.value = true;
            setUnlocked(true);
            setShowUnlockText(true);
            setTimeout(() => setShowUnlockText(false), 4000);
            setFlashBg(true);
            setTimeout(() => setFlashBg(false), 300);
            setTimeout(() => {
              setCrystals((curr) =>
                curr.map((c) =>
                  c.hit ? { ...c, flashTime: Date.now() } : c
                )
              );
            }, 50);
          }
          return nextSeq;
        });

        setBackgroundBrightness((b) => Math.min(1, b + 0.05));

        return prev.map((c) =>
          c.id === crystalId
            ? {
                ...c,
                hit: true,
                hitTime: Date.now(),
                ripples: [...c.ripples, newRipple],
                crackLines,
              }
            : c
        );
      });
    },
    []
  );

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    audioEngine.setVolume(v / 100);
  }, []);

  const handleReverbChange = useCallback((t: number) => {
    setReverbTime(t);
    audioEngine.setReverbTime(t);
  }, []);

  const handleReset = useCallback(() => {
    audioEngine.resetPitches();
    unlockedRef.current = false;
    setParticles([]);
    setCrystals(generateCrystals(8 + Math.floor(Math.random() * 5)));
    setMelodySequence([]);
    setUnlocked(false);
    setBackgroundBrightness(0);
  }, []);

  const scaleName = useMemo(() => {
    const unique = Array.from(new Set(melodySequence)).slice(0, 6);
    if (unique.length < 6) return '';
    return unique.join('-');
  }, [melodySequence]);

  const bgColor = useMemo(() => {
    const start = { r: 11, g: 12, b: 16 };
    const target = { r: 69, g: 162, b: 158 };
    const t = backgroundBrightness;
    const r = Math.round(start.r + (target.r - start.r) * t);
    const g = Math.round(start.g + (target.g - start.g) * t);
    const b = Math.round(start.b + (target.b - start.b) * t);
    return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, #1f2833 100%)`;
  }, [backgroundBrightness]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: flashBg
          ? `linear-gradient(180deg, #2e4a62 0%, #1f2833 100%)`
          : bgColor,
        transition: 'background 0.8s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          aspectRatio: '16/9',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: '#c5c6c7',
            lineHeight: 1.8,
            zIndex: 10,
            userSelect: 'none',
          }}
        >
          <div>粒子数量：{stats.particleCount} / 10</div>
          <div>
            已击中水晶：{stats.hitCrystals} / {stats.totalCrystals}
          </div>
          <div>
            当前旋律：
            {stats.melodySequence.length > 0
              ? stats.melodySequence.join(' → ')
              : '（暂无）'}
          </div>
        </div>

        {unlocked && (
          <motion.button
            onClick={handleReset}
            onMouseEnter={() => setHoveredElement('reset')}
            onMouseLeave={() => setHoveredElement(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '60px',
              height: '30px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor:
                hoveredElement === 'reset' ? '#66fcf1' : '#c5c6c7',
              color: '#0b0c10',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'sans-serif',
              fontSize: '13px',
              zIndex: 10,
              transform:
                hoveredElement === 'reset' ? 'scale(1.1)' : 'scale(1)',
              boxShadow:
                hoveredElement === 'reset'
                  ? '0 0 8px 2px #66fcf1'
                  : 'none',
              transition: 'all 0.15s ease',
            }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            重奏
          </motion.button>
        )}

        <WhisperingChamber
          particles={particles}
          setParticles={setParticles}
          crystals={crystals}
          setCrystals={setCrystals}
          onFireParticle={handleFireParticle}
          onCrystalHit={handleCrystalHit}
          reverbJitter={audioEngine.getReverbJitter()}
          unlocked={unlocked}
          hoveredElement={hoveredElement}
          setHoveredElement={setHoveredElement}
        />

        <ControlPanel
          volume={volume}
          reverbTime={reverbTime}
          onVolumeChange={handleVolumeChange}
          onReverbChange={handleReverbChange}
          hoveredElement={hoveredElement}
          setHoveredElement={setHoveredElement}
        />

        <AnimatePresence>
          {showUnlockText && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '25%',
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'serif',
                fontSize: '24px',
                fontWeight: 600,
                background: 'linear-gradient(90deg, #ffd700, #66fcf1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0.5px 0.5px 1px rgba(102,252,241,0.3)',
                zIndex: 20,
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              旋律解锁：{scaleName}音阶
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
