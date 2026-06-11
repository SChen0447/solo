import { useState, useMemo, useRef, useEffect, CSSProperties } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import type { FormulaParams, InkColor, PigmentType } from '../App';

interface Props {
  params: FormulaParams;
  onParamsChange: (p: FormulaParams) => void;
  onComplete: (ink: InkColor) => void;
  completed: boolean;
}

interface PuzzlePiece {
  id: number;
  correctSlot: number;
  color: string;
  hsl: [number, number, number];
  label: string;
}

// 根据参数生成墨水色（HSL混合）
function computeFinalColor(params: FormulaParams): InkColor {
  const pigmentHues: Record<PigmentType, [number, number, number]> = {
    carbon: [0, 0, 8],
    indigo: [220, 55, 28],
    ochre: [30, 70, 45],
    alizarin: [350, 60, 35],
  };
  const [ph, s, l] = pigmentHues[params.pigment];
  const binderMod = params.binderRatio / 100;
  const finalH = Math.round(ph + (params.ph - 7) * 2.5);
  const finalS = Math.min(100, Math.max(10, s + binderMod * 15 - 5));
  const finalL = Math.min(70, Math.max(8, l + (7 - params.ph) * 1.2 - binderMod * 5));

  const hex = hslToHex(finalH, finalS, finalL);

  let name: InkColor['name'] = '普鲁士蓝';
  let year = '18 世纪';
  if (params.pigment === 'carbon') {
    name = '中国墨';
    year = '唐代 · 公元 700';
  } else if (params.pigment === 'alizarin' && params.ph > 8) {
    name = '赛别尔紫';
    year = '1856 · Perkin';
  } else if (params.pigment === 'indigo') {
    name = '普鲁士蓝';
    year = '1704 · Diesbach';
  } else if (params.pigment === 'ochre') {
    name = '赭石油墨';
    year = '史前 · Lascaux';
  } else {
    name = '茜素红墨';
    year = '古代 · 埃及';
  }

  return {
    name,
    year,
    hex,
    pigment: params.pigment,
    binderRatio: params.binderRatio,
    ph: params.ph,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

const SLOT_COUNT = 6;
const WHEEL_RADIUS = 180;
const CENTER = { x: 260, y: 260 };
const START_DEG = -90;
const ARC_DEG = 90; // 四分之一圆
const SLICE_DEG = ARC_DEG / SLOT_COUNT;

export default function ColorPuzzle({ params, onParamsChange, onComplete, completed }: Props) {
  const [pieces, setPieces] = useState<PuzzlePiece[]>(() => {
    const base = generatePieces(params);
    return shuffle(base);
  });
  const [placed, setPlaced] = useState<Map<number, number>>(new Map()); // pieceId -> slotId
  const [clickingPiece, setClickingPiece] = useState<number | null>(null);
  const [finalColor, setFinalColor] = useState<string>('#1d3557');
  const rotation = useMotionValue(0);
  const opacity = useMotionValue(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // 当外部参数变化时更新碎片（仅在未完成且未放置任何碎片时）
  useEffect(() => {
    if (placed.size === 0 && !completed) {
      setPieces(shuffle(generatePieces(params)));
    }
  }, [params]);

  useEffect(() => {
    if (completed) {
      const ink = computeFinalColor(params);
      setFinalColor(ink.hex);
      animate(rotation, 45, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
      animate(opacity, 1, { delay: 0.4, duration: 0.8 });
    }
  }, [completed, params]);

  const totalPlaced = placed.size;
  const allPlaced = totalPlaced === SLOT_COUNT;

  useEffect(() => {
    if (allPlaced && !completed) {
      // 延迟触发完成
      const ink = computeFinalColor(params);
      setFinalColor(ink.hex);
      animate(rotation, 45, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
      animate(opacity, 1, { delay: 0.4, duration: 0.8 });
      setTimeout(() => onComplete(ink), 1500);
    }
  }, [allPlaced, completed, params, onComplete]);

  const handleDropOnSlot = (slotId: number, pieceId: number) => {
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece || placed.has(pieceId)) return;
    const correct = piece.correctSlot === slotId;
    if (correct) {
      setPlaced((prev) => new Map(prev).set(pieceId, slotId));
      setClickingPiece(pieceId);
      setTimeout(() => setClickingPiece(null), 350);
    } else {
      // 错误：轻微晃动后归位（由framer-motion drag snap实现）
    }
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    background:
      'linear-gradient(180deg, rgba(27,42,26,0.55) 0%, rgba(90,62,43,0.5) 100%)',
    border: '2px solid #c9a96e',
    borderRadius: '10px',
    padding: '20px 28px 28px',
    boxShadow:
      '0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,169,110,0.15)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: '1px solid #c9a96e',
  };

  const titleStyle: CSSProperties = {
    fontFamily: "'Dancing Script', cursive",
    fontSize: '24px',
    color: '#f5e8c8',
    letterSpacing: '1px',
  };

  const progressStyle: CSSProperties = {
    fontFamily: "'Courier Prime', monospace",
    fontSize: '14px',
    color: '#c9a96e',
  };

  const wheelArea: CSSProperties = {
    position: 'relative',
    width: '520px',
    height: '340px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '28px',
    alignItems: 'center',
  };

  const colorPreviewStyle: CSSProperties = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px double #c9a96e',
    margin: '0 auto 12px',
    background: useTransform(
      opacity,
      (o) => `radial-gradient(circle at 35% 30%, ${finalColor} 0%, ${shade(finalColor, -30)} 100%)`
    ) as unknown as string,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.1)',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>色谱拼图 · Color Wheel</div>
        <div style={progressStyle}>
          {completed ? '✦ 复原完成 ✦' : `进度 ${totalPlaced} / ${SLOT_COUNT}`}
        </div>
      </div>

      <div style={wheelArea}>
        {/* 色谱轮区域 */}
        <div
          ref={wheelRef}
          style={{
            position: 'relative',
            width: '340px',
            height: '340px',
            margin: '0 auto',
          }}
        >
          {/* 深色圆形底座 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #1a2018 0%, #0c120a 100%)',
              border: '2px solid #8a6838',
              boxShadow:
                'inset 0 0 40px rgba(0,0,0,0.9), 0 8px 20px rgba(0,0,0,0.5)',
            }}
          />

          {/* 四分之一圆色谱轮 - 旋转动画 */}
          <motion.div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${WHEEL_RADIUS * 2}px`,
              height: `${WHEEL_RADIUS * 2}px`,
              marginLeft: -WHEEL_RADIUS,
              marginTop: -WHEEL_RADIUS,
              transform: 'rotate(-135deg)',
              rotate: rotation,
              transformOrigin: '50% 50%',
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${pieces
                .sort((a, b) => a.correctSlot - b.correctSlot)
                .map((p, i) => `${p.color} ${(i * 100) / SLOT_COUNT}% ${((i + 1) * 100) / SLOT_COUNT}%`)
                .join(', ')})`,
              clipPath:
                'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)',
              opacity: opacity,
              transition: 'opacity 0.4s ease',
              boxShadow: '0 0 30px rgba(255,200,120,0.2)',
            }}
          />

          {/* 靶位槽（六片四分之一圆扇形区域） */}
          {Array.from({ length: SLOT_COUNT }).map((_, slotId) => {
            const pieceForSlot = [...placed.entries()].find(([, s]) => s === slotId)?.[0];
            const p = pieces.find((x) => x.id === pieceForSlot);
            const start = START_DEG + slotId * SLICE_DEG;
            const end = start + SLICE_DEG;
            const clickAnim = clickingPiece === pieceForSlot;
            const midRad = ((start + SLICE_DEG / 2) * Math.PI) / 180;
            const pieceX = CENTER.x - WHEEL_RADIUS + Math.cos(midRad) * WHEEL_RADIUS * 0.68;
            const pieceY = CENTER.y - WHEEL_RADIUS + Math.sin(midRad) * WHEEL_RADIUS * 0.68;

            return (
              <div
                key={slotId}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  const pid = parseInt(e.dataTransfer.getData('text/piece'));
                  if (!isNaN(pid)) handleDropOnSlot(slotId, pid);
                }}
                style={{
                  position: 'absolute',
                  left: CENTER.x - WHEEL_RADIUS,
                  top: CENTER.y - WHEEL_RADIUS,
                  width: WHEEL_RADIUS * 2,
                  height: WHEEL_RADIUS * 2,
                  clipPath: sectorClipPath(slotId),
                  background: p ? 'transparent' : 'rgba(201,169,110,0.06)',
                  border: p ? 'none' : '1px dashed rgba(201,169,110,0.18)',
                  borderRadius: '50%',
                  boxSizing: 'border-box' as const,
                }}
              >
                {p && (
                  <motion.div
                    initial={false}
                    animate={
                      clickAnim
                        ? { scale: [1, 1.1, 1], rotate: [0, -2, 2, 0], transition: { duration: 0.35 } }
                        : { scale: 1, rotate: 0 }
                    }
                    style={{
                      position: 'absolute',
                      left: pieceX - (CENTER.x - WHEEL_RADIUS) - 28,
                      top: pieceY - (CENTER.y - WHEEL_RADIUS) - 28,
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${p.color} 0%, ${shade(p.color, -25)} 100%)`,
                      border: '2px solid #c9a96e',
                      boxShadow:
                        '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.75)',
                      transform: `rotate(${start + SLICE_DEG / 2 + 135}deg)`,
                    }}
                  >
                    {p.label}
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* 中心轴 */}
          <div
            style={{
              position: 'absolute',
              left: CENTER.x - 12,
              top: CENTER.y - 12,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #e8d49a 0%, #8a6838 70%, #4a3218 100%)',
              border: '1px solid #3a2810',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,240,200,0.5)',
              zIndex: 10,
            }}
          />
        </div>

        {/* 右侧：颜色预览 + 待放置碎片 */}
        <div>
          <div
            style={{
              textAlign: 'center',
              marginBottom: '12px',
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              color: '#c9a96e',
              fontSize: '14px',
              letterSpacing: '1px',
            }}
          >
            — 预 览 —
          </div>
          <motion.div style={colorPreviewStyle} />
          <motion.div
            style={{
              textAlign: 'center',
              fontFamily: "'Dancing Script', cursive",
              fontSize: '20px',
              color: '#f5e8c8',
              marginBottom: '20px',
              minHeight: '28px',
              opacity: opacity,
            }}
          >
            {completed ? computeFinalColor(params).name : '— 调配中 —'}
          </motion.div>

          {/* 待拖拽碎片 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              padding: '12px',
              border: '1px dashed rgba(201,169,110,0.35)',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.25)',
              minHeight: '110px',
            }}
          >
            <AnimatePresence>
              {pieces
                .filter((p) => !placed.has(p.id))
                .map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    draggable={!completed}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/piece', String(p.id));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    whileHover={!completed ? { scale: 1.08, y: -3 } : {}}
                    whileTap={!completed ? { cursor: 'grabbing' } : {}}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${p.color} 0%, ${shade(p.color, -25)} 100%)`,
                      border: '2px solid #c9a96e',
                      boxShadow:
                        '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22)',
                      cursor: !completed ? 'grab' : 'default',
                      userSelect: 'none' as const,
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      willChange: 'transform',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 30% 30%, ${shade(p.color, 20)}, ${p.color} 60%, ${shade(p.color, -30)})`,
                        border: '1px solid rgba(0,0,0,0.3)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)',
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.85)',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {p.label}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
            {pieces.filter((p) => !placed.has(p.id)).length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '20px',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  color: '#c9a96e',
                  opacity: 0.75,
                }}
              >
                所有碎片已就位…
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '14px',
          color: '#c9a96e',
          opacity: 0.8,
          letterSpacing: '1px',
        }}
      >
        {!completed
          ? '✦ 拖拽碎片至色谱轮正确位置 · 顺序依颜料 → 混合度 → pH 排列 ✦'
          : '✦ 古方色彩重现人间 ✦'}
      </div>
    </div>
  );
}

function generatePieces(params: FormulaParams): PuzzlePiece[] {
  const finalHsl = hexToHsl(computeFinalColor(params).hex);
  const [fh, fs, fl] = finalHsl;

  // 6片按色相/饱和度/明度排列：色相基色→衍生；饱和→中→低；明暗层次
  const raw: { color: string; label: string }[] = [
    { color: hslToHex(((fh - 20) + 360) % 360, fs, fl + 8), label: 'H-1' },
    { color: hslToHex(fh, Math.min(100, fs + 10), fl), label: 'S+' },
    { color: hslToHex(fh, fs, fl), label: '基色' },
    { color: hslToHex((fh + 15) % 360, fs, fl - 6), label: 'H+1' },
    { color: hslToHex(fh, Math.max(10, fs - 15), fl + 4), label: 'S-' },
    { color: hslToHex(fh, fs, Math.max(6, fl - 12)), label: 'L-' },
  ];
  return raw.map((r, i) => ({
    id: i,
    correctSlot: i,
    color: r.color,
    hsl: hexToHsl(r.color),
    label: r.label,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shade(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  const [h, s, l] = hsl;
  const nl = Math.max(0, Math.min(100, l + percent));
  return hslToHex(h, s, nl);
}

function sectorClipPath(slotId: number): string {
  // 四分之一圆，从左上90°范围，分成6片
  const total = 90;
  const each = total / SLOT_COUNT;
  // 起始方向：-90度（上）开始，顺时针90度（到右）
  // clipPath用多边形近似扇形
  const cx = 50, cy = 50;
  const startAng = (-90 + slotId * each) * (Math.PI / 180);
  const endAng = (-90 + (slotId + 1) * each) * (Math.PI / 180);
  const steps = 8;
  const pts: string[] = [`${cx}% ${cy}%`];
  for (let i = 0; i <= steps; i++) {
    const t = startAng + ((endAng - startAng) * i) / steps;
    const px = cx + 50 * Math.cos(t);
    const py = cy + 50 * Math.sin(t);
    pts.push(`${px}% ${py}%`);
  }
  return `polygon(${pts.join(', ')})`;
}
