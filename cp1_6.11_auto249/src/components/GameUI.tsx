import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GamePhase, EnchantRecord } from '../App';
import { Ore, Particle, SmeltingOre } from '../forgeEngine';
import { RuneStone, RuneType } from '../enchantSystem';

interface Props {
  state: GameState;
  onThrowOre: (ore: Ore, startX: number, startY: number) => void;
  onSetTemperature: (temp: number) => void;
  onStartForging: () => void;
  onCompleteForging: () => void;
  onEnchant: (rune: RuneStone) => void;
  onProceedToTest: () => void;
  onReset: () => void;
  particles: Particle[];
}

const FORGE_CX = 0;
const FORGE_CY = 0;

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #bf7444 0%, #8d5524 50%, #bf7444 100%)',
  border: '3px solid #6d3a1a',
  borderRadius: '20px',
  color: '#ffe0b2',
  padding: '10px 28px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  textShadow: '1px 1px 2px #000',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
  transition: 'transform 0.15s, box-shadow 0.15s',
  letterSpacing: '1px',
  backgroundImage:
    'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)',
};

const interactiveHoverStyle = `
  .interactive:hover {
    transform: scale(1.2);
    filter: brightness(1.2);
    box-shadow: 0 0 15px rgba(255,111,0,0.6);
  }
  .interactive:active {
    transform: scale(0.95);
  }
`;

function ForgeSVG({
  smeltingOres,
  forgeFailed,
}: {
  smeltingOres: SmeltingOre[];
  forgeFailed: boolean;
}) {
  return (
    <svg
      width="360"
      height="400"
      viewBox="-180 -200 360 400"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) ${forgeFailed ? 'translateX(5px)' : ''}`,
        filter: forgeFailed ? 'hue-rotate(10deg)' : 'none',
        transition: 'transform 0.1s',
      }}
    >
      <defs>
        <radialGradient id="forgeBodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5d4037" />
          <stop offset="100%" stopColor="#3e2723" />
        </radialGradient>
        <radialGradient id="forgeInnerGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff6f00" />
          <stop offset="60%" stopColor="#e65100" />
          <stop offset="100%" stopColor="#bf360c" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="20" rx="160" ry="170" fill="url(#forgeBodyGrad)" stroke="#2c1a0e" strokeWidth="6" />
      <ellipse cx="0" cy="-20" rx="75" ry="30" fill="url(#forgeInnerGrad)" stroke="#4e342e" strokeWidth="3" />
      <ellipse cx="0" cy="-20" rx="60" ry="22" fill="#1a0a00" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i * Math.PI * 2) / 8;
        const x = Math.cos(angle) * 130;
        const y = 20 + Math.sin(angle) * 140;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="8"
            fill="#8d6e63"
            stroke="#5d4037"
            strokeWidth="2"
          />
        );
      })}
      {smeltingOres.map((ore) => (
        <g key={ore.id}>
          <circle
            cx={0}
            cy={-15}
            r={20 * ore.currentSize}
            fill={ore.progress > 0.5 ? ore.brightColor : ore.color}
            opacity={1 - ore.progress * 0.5}
          />
        </g>
      ))}
      {forgeFailed && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 12;
            const dist = 80 + Math.random() * 60;
            return (
              <rect
                key={i}
                x={Math.cos(angle) * dist}
                y={-20 + Math.sin(angle) * dist}
                width="8"
                height="8"
                fill="#ff6f00"
                transform={`rotate(${Math.random() * 360})`}
                opacity="0.8"
              />
            );
          })}
        </>
      )}
    </svg>
  );
}

function OreCart({
  ores,
  onThrowOre,
}: {
  ores: Ore[];
  onThrowOre: (ore: Ore, startX: number, startY: number) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '5%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '140px',
      }}
    >
      <svg width="140" height="200" viewBox="0 0 140 200">
        <rect x="10" y="40" width="120" height="120" rx="5" fill="#6d4c41" stroke="#4e342e" strokeWidth="3" />
        <line x1="10" y1="40" x2="10" y2="160" stroke="#5d4037" strokeWidth="4" />
        <line x1="130" y1="40" x2="130" y2="160" stroke="#5d4037" strokeWidth="4" />
        <line x1="10" y1="100" x2="130" y2="100" stroke="#5d4037" strokeWidth="2" />
        <circle cx="40" cy="175" r="15" fill="#4e342e" stroke="#3e2723" strokeWidth="3" />
        <circle cx="100" cy="175" r="15" fill="#4e342e" stroke="#3e2723" strokeWidth="3" />
        <line x1="10" y1="160" x2="40" y2="175" stroke="#5d4037" strokeWidth="3" />
        <line x1="130" y1="160" x2="100" y2="175" stroke="#5d4037" strokeWidth="3" />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '20px',
          width: '100px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          justifyContent: 'center',
        }}
      >
        {ores.map((ore) => (
          <motion.div
            key={ore.id}
            className="interactive"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: `radial-gradient(circle at 35% 35%, ${ore.brightColor}, ${ore.color})`,
              cursor: 'pointer',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: `0 2px 8px ${ore.color}88`,
              transition: 'box-shadow 0.15s',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onThrowOre(ore, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
            title={
              ore.type === 'red_iron'
                ? '红铁矿 +攻击'
                : ore.type === 'blue_copper'
                ? '蓝铜矿 +速度'
                : '绿琥珀矿 +暴击'
            }
          />
        ))}
      </div>
      <div
        style={{
          textAlign: 'center',
          color: '#ffe0b2',
          fontSize: '12px',
          marginTop: '4px',
          textShadow: '1px 1px 2px #000',
        }}
      >
        矿车 ({ores.length}/5)
      </div>
    </div>
  );
}

function ImpurityBar({ impurity }: { impurity: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: '8%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '40px',
        height: '200px',
        background: '#1a0a00',
        borderRadius: '8px',
        border: '3px solid #5d4037',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <motion.div
        animate={{ height: `${impurity}%` }}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          background:
            impurity > 80
              ? 'linear-gradient(180deg, #ff1744, #ff6f00)'
              : 'linear-gradient(180deg, #ffd600, #ff8f00)',
          borderRadius: '0 0 5px 5px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: impurity > 80 ? '#ff1744' : '#ffd600',
          fontSize: '11px',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px #000',
          whiteSpace: 'nowrap',
        }}
      >
        杂质 {Math.round(impurity)}%
      </div>
    </div>
  );
}

function TemperatureSlider({
  temperature,
  onChange,
}: {
  temperature: number;
  onChange: (t: number) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          color: '#ffab40',
          fontSize: '14px',
          marginBottom: '6px',
          textShadow: '1px 1px 2px #000',
          fontWeight: 'bold',
        }}
      >
        炉温: {temperature}°C
      </div>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="range"
          min="500"
          max="1800"
          step="50"
          value={temperature}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '12px',
            appearance: 'none',
            WebkitAppearance: 'none',
            background:
              'linear-gradient(90deg, #5d4037, #bf7444 30%, #ff6f00 70%, #ff3d00)',
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            color: '#8d6e63',
            fontSize: '10px',
          }}
        >
          <span>500°C</span>
          <span>1000°C</span>
          <span>1500°C</span>
          <span>1800°C</span>
        </div>
      </div>
    </div>
  );
}

function ParticleCanvas({ particles }: { particles: Particle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [particles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '360px',
        height: '400px',
        pointerEvents: 'none',
      }}
    />
  );
}

function RuneStonesPanel({
  runeStones,
  onEnchant,
  enchantCount,
}: {
  runeStones: RuneStone[];
  onEnchant: (rune: RuneStone) => void;
  enchantCount: number;
}) {
  const [rotations, setRotations] = useState<number[]>(
    runeStones.map(() => Math.random() * 360)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRotations((prev) => prev.map((r) => r + 1.5));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const labels: Record<RuneType, string> = {
    fire: '火',
    ice: '冰',
    poison: '毒',
    light: '光',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '30px',
      }}
    >
      {runeStones.map((rune, i) => (
        <motion.div
          key={rune.id}
          className="interactive"
          whileHover={rune.broken ? {} : { scale: 1.2 }}
          whileTap={rune.broken ? {} : { scale: 0.95 }}
          style={{
            width: '50px',
            height: '50px',
            cursor: rune.broken ? 'not-allowed' : 'pointer',
            opacity: rune.broken ? 0.3 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
          onClick={() => !rune.broken && enchantCount < 3 && onEnchant(rune)}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: rune.broken
                ? '#333'
                : `radial-gradient(circle at 35% 35%, ${rune.glowColor}, ${rune.color})`,
              border: `2px solid ${rune.broken ? '#555' : rune.color}`,
              boxShadow: rune.broken
                ? 'none'
                : `0 0 15px ${rune.glowColor}88, 0 0 30px ${rune.color}44`,
              transform: `rotate(${rotations[i]}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px #000',
            }}
          >
            {rune.broken ? '✕' : labels[rune.type]}
          </div>
          <span
            style={{
              color: rune.color,
              fontSize: '11px',
              textShadow: '1px 1px 2px #000',
            }}
          >
            {labels[rune.type]}符石
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SwordSVG({
  bladeColor,
  enchantments,
  testSwing,
}: {
  bladeColor: string;
  enchantments: EnchantRecord[];
  testSwing: boolean;
}) {
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = glowCanvasRef.current;
    if (!canvas || enchantments.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 200;

    let frame = 0;
    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lastEnchant = enchantments[enchantments.length - 1];
      if (lastEnchant && lastEnchant.success) {
        const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
        const gradient = ctx.createRadialGradient(80, 80, 10, 80, 80, 60);
        gradient.addColorStop(0, lastEnchant.glowColor + 'cc');
        gradient.addColorStop(0.5, lastEnchant.glowColor + '44');
        gradient.addColorStop(1, 'transparent');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 160, 200);
      }
      ctx.globalAlpha = 1;
      frame++;
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [enchantments]);

  return (
    <motion.div
      animate={
        testSwing
          ? { rotate: -45, x: -30, y: -30 }
          : { rotate: 0, x: 0, y: 0 }
      }
      transition={testSwing ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.1 }}
      style={{
        position: 'relative',
        width: '160px',
        height: '200px',
        margin: '0 auto',
      }}
    >
      {testSwing && (
        <div
          style={{
            position: 'absolute',
            left: '30px',
            top: '20px',
            width: '4px',
            height: '30px',
            background: `linear-gradient(180deg, ${bladeColor}88, transparent)`,
            transform: 'rotate(45deg)',
            transformOrigin: 'bottom center',
            filter: 'blur(2px)',
          }}
        />
      )}
      <canvas
        ref={glowCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '160px',
          height: '200px',
          pointerEvents: 'none',
        }}
      />
      <svg
        width="160"
        height="200"
        viewBox="0 0 160 200"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bladeColor} />
            <stop offset="100%" stopColor="#c0c0c0" />
          </linearGradient>
        </defs>
        <rect x="72" y="10" width="16" height="100" rx="3" fill="url(#bladeGrad)" stroke="#888" strokeWidth="1" />
        <polygon points="80,0 68,15 92,15" fill={bladeColor} stroke="#aaa" strokeWidth="0.5" />
        <rect x="56" y="110" width="48" height="12" rx="3" fill="#8d6e63" stroke="#5d4037" strokeWidth="1" />
        <rect x="60" y="108" width="6" height="16" rx="2" fill="#bf7444" />
        <rect x="94" y="108" width="6" height="16" rx="2" fill="#bf7444" />
        <rect x="74" y="122" width="12" height="50" rx="2" fill="#5d4037" stroke="#4e342e" strokeWidth="1" />
        <circle cx="80" cy="176" r="8" fill="#bf7444" stroke="#8d5524" strokeWidth="2" />
      </svg>
    </motion.div>
  );
}

function FlyingOreAnimation({ ore, startTime }: { ore: Ore; startTime: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = startTime;
    let rafId: number;

    const animate = () => {
      const now = Date.now();
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [startTime]);

  const startX = -200;
  const startY = 0;
  const endX = 0;
  const endY = -30;
  const x = startX + (endX - startX) * progress;
  const y = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 120;

  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        background: `radial-gradient(circle at 35% 35%, ${ore.brightColor}, ${ore.color})`,
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: `0 0 10px ${ore.color}`,
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        pointerEvents: 'none',
        opacity: 1 - progress * 0.5,
      }}
    />
  );
}

function EnchantFlash({ enchantments }: { enchantments: EnchantRecord[] }) {
  const lastEnchant = enchantments[enchantments.length - 1];
  if (!lastEnchant || !lastEnchant.success) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute',
        left: '50%',
        top: '55%',
        transform: 'translate(-50%, -50%)',
        width: '100px',
        height: '150px',
        borderRadius: '10px',
        background: `radial-gradient(circle, ${lastEnchant.glowColor}cc, transparent)`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
}

function WeaponStatsPanel({
  weapon,
  enchantments,
}: {
  weapon: { attack: number; speed: number; critRate: number };
  enchantments: EnchantRecord[];
}) {
  const successfulEnchants = enchantments.filter((e) => e.success);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(30,15,10,0.9)',
        border: '2px solid #bf7444',
        borderRadius: '12px',
        padding: '16px 32px',
        color: '#ffe0b2',
        minWidth: '260px',
      }}
    >
      <h3
        style={{
          textAlign: 'center',
          marginBottom: '12px',
          color: '#ff6f00',
          fontSize: '18px',
          textShadow: '0 0 8px #ff6f0088',
        }}
      >
        ⚔ 武器属性
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <StatRow label="攻击力" value={weapon.attack} color="#ef5350" />
        <StatRow label="速度" value={weapon.speed} color="#64b5f6" />
        <StatRow label="暴击率" value={`${weapon.critRate}%`} color="#66bb6a" />
      </div>
      {successfulEnchants.length > 0 && (
        <div
          style={{
            marginTop: '10px',
            borderTop: '1px solid #5d4037',
            paddingTop: '8px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {successfulEnchants.map((e, i) => (
            <span
              key={i}
              style={{
                color: e.glowColor,
                fontSize: '12px',
                textShadow: `0 0 6px ${e.glowColor}`,
              }}
            >
              [{e.type === 'fire' ? '灼烧' : e.type === 'ice' ? '冰冻' : e.type === 'poison' ? '剧毒' : '圣光'}]
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ color: '#8d6e63', fontSize: '14px' }}>{label}</span>
      <span
        style={{
          color,
          fontSize: '18px',
          fontWeight: 'bold',
          textShadow: `0 0 8px ${color}66`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function GameUI({
  state,
  onThrowOre,
  onSetTemperature,
  onStartForging,
  onCompleteForging,
  onEnchant,
  onProceedToTest,
  onReset,
  particles,
}: Props) {
  const { phase, cartOres, smeltingOres, temperature, impurity, weapon, forgeFailed, runeStones, enchantments, enchantCount, flyingOre } = state;
  const [testSwing, setTestSwing] = useState(false);

  const handleSwingTest = useCallback(() => {
    setTestSwing(true);
    setTimeout(() => setTestSwing(false), 500);
  }, []);

  const canForge = smeltingOres.length > 0 || state.meltedOres.length > 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <style>{interactiveHoverStyle}</style>

      <div
        style={{
          position: 'absolute',
          top: '3%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff6f00',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '0 0 15px #ff6f00aa, 0 2px 4px #000',
          letterSpacing: '3px',
          zIndex: 10,
        }}
      >
        {phase === 'mining' && '⛏ 选矿入炉'}
        {phase === 'forging' && '🔥 锻造中'}
        {phase === 'enchanting' && '✨ 符文附魔'}
        {phase === 'testing' && '⚔ 武器测试'}
      </div>

      {phase === 'mining' && (
        <OreCart ores={cartOres} onThrowOre={onThrowOre} />
      )}

      {(phase === 'mining' || phase === 'forging') && (
        <>
          <ForgeSVG smeltingOres={smeltingOres} forgeFailed={forgeFailed} />
          <ParticleCanvas particles={particles} />
          <ImpurityBar impurity={impurity} />
          <TemperatureSlider temperature={temperature} onChange={onSetTemperature} />

          {flyingOre && (
            <FlyingOreAnimation ore={flyingOre.ore} startTime={flyingOre.startTime} />
          )}

          <div
            style={{
              position: 'absolute',
              bottom: '2%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '16px',
              zIndex: 10,
            }}
          >
            {phase === 'mining' && canForge && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={buttonStyle}
                onClick={onStartForging}
              >
                开始锻造
              </motion.button>
            )}
            {phase === 'forging' && smeltingOres.length === 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={buttonStyle}
                onClick={onCompleteForging}
              >
                取出武器
              </motion.button>
            )}
            {phase === 'forging' && smeltingOres.length > 0 && (
              <div
                style={{
                  color: '#ffab40',
                  fontSize: '14px',
                  textShadow: '1px 1px 2px #000',
                  textAlign: 'center',
                }}
              >
                熔炼中... ({state.meltedOres.length}块已熔化)
              </div>
            )}
          </div>
        </>
      )}

      {forgeFailed && phase === 'forging' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              color: '#ff1744',
              fontSize: '36px',
              fontWeight: 'bold',
              textShadow: '0 0 20px #ff1744, 0 0 40px #ff6f00',
              textAlign: 'center',
            }}
          >
            💥 炸炉了！
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ ...buttonStyle, marginTop: '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
            onClick={onReset}
          >
            重新锻造
          </motion.button>
        </div>
      )}

      {phase === 'enchanting' && weapon && (
        <>
          <RuneStonesPanel
            runeStones={runeStones}
            onEnchant={onEnchant}
            enchantCount={enchantCount}
          />
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <SwordSVG
              bladeColor={weapon.bladeColor}
              enchantments={enchantments}
              testSwing={false}
            />
          </div>
          <EnchantFlash enchantments={enchantments} />

          <div
            style={{
              position: 'absolute',
              right: '8%',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#ffe0b2',
              fontSize: '13px',
              textAlign: 'center',
              textShadow: '1px 1px 2px #000',
            }}
          >
            <div>附魔次数</div>
            <div style={{ fontSize: '24px', color: '#ff6f00', fontWeight: 'bold' }}>
              {enchantCount}/3
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '5%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={buttonStyle}
              onClick={onProceedToTest}
            >
              前往测试
            </motion.button>
          </div>
        </>
      )}

      {phase === 'testing' && weapon && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <SwordSVG
              bladeColor={weapon.bladeColor}
              enchantments={enchantments}
              testSwing={testSwing}
            />
          </div>

          <WeaponStatsPanel weapon={weapon} enchantments={enchantments} />

          <div
            style={{
              position: 'absolute',
              bottom: '3%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '16px',
              zIndex: 10,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={buttonStyle}
              onClick={handleSwingTest}
            >
              挥舞测试
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                ...buttonStyle,
                background:
                  'linear-gradient(180deg, #5d4037 0%, #3e2723 50%, #5d4037 100%)',
              }}
              onClick={onReset}
            >
              重新锻造
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
