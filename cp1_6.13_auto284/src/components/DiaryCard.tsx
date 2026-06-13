import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export interface DiaryCardData {
  id: string;
  title: string;
  content: string;
  moodColor: string;
  musicId: string;
  createdAt: string;
}

interface DiaryCardProps {
  diary: DiaryCardData;
  onClick?: () => void;
  volume?: number;
  autoPlay?: boolean;
  index?: number;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

const getComplementaryColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + 180) % 360;
  hsl.s = Math.min(hsl.s + 20, 100);
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
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
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToRgb = (h: number, s: number, l: number) => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const DiaryCard: React.FC<DiaryCardProps> = ({
  diary,
  onClick,
  volume = 0.3,
  autoPlay = false,
  index = 0
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const compColor = getComplementaryColor(diary.moodColor);
  const rgb = hexToRgb(diary.moodColor);

  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 60, scale: 0.8 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        delay: index * 0.08,
        ease: 'power3.out'
      }
    );
  }, [index]);

  useEffect(() => {
    if (!glowRef.current) return;

    gsap.to(glowRef.current, {
      background: `radial-gradient(circle, ${compColor}33 0%, transparent 70%)`,
      duration: 3,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        boxShadow: `0 5px 30px ${diary.moodColor}40, 0 0 5px ${diary.moodColor}60`,
        duration: 2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    }
  }, [diary.moodColor, compColor]);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [autoPlay, volume]);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      scale: 1.05,
      boxShadow: `0 15px 60px ${diary.moodColor}60, 0 0 15px ${diary.moodColor}90`,
      duration: 0.35,
      ease: 'power2.out'
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      scale: 1,
      boxShadow: `0 5px 30px ${diary.moodColor}40, 0 0 5px ${diary.moodColor}60`,
      duration: 0.35,
      ease: 'power2.out'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: 220,
        height: 300,
        borderRadius: 16,
        background: `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.15) 0%, rgba(255,255,255,0.05) 100%)`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${diary.moodColor}80`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.3s ease',
        flexShrink: 0
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${diary.moodColor}33 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${compColor}22 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: `${diary.moodColor}`,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 1
            }}
          >
            {formatDate(diary.createdAt)}
          </span>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: diary.moodColor,
              boxShadow: `0 0 8px ${diary.moodColor}`
            }}
          />
        </div>

        <h3
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 10,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {diary.title}
        </h3>

        <p
          style={{
            fontSize: 12,
            color: 'rgba(224, 214, 255, 0.7)',
            lineHeight: 1.7,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
            flex: 1
          }}
        >
          {diary.content}
        </p>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${diary.moodColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: 'rgba(224, 214, 255, 0.5)',
              letterSpacing: 0.5
            }}
          >
            ♪ {diary.musicId}
          </span>
          <div
            style={{
              display: 'flex',
              gap: 3,
              alignItems: 'flex-end',
              height: 14
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 6 + Math.random() * 8,
                  background: diary.moodColor,
                  borderRadius: 2,
                  opacity: isPlaying ? 1 : 0.4,
                  animation: isPlaying ? `pulse${i} 0.6s ease-in-out infinite alternate` : 'none'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`/audio/${diary.musicId}.mp3`}
        loop
        preload="none"
      />

      <style>{`
        @keyframes pulse0 { 0% { height: 4px; } 100% { height: 12px; } }
        @keyframes pulse1 { 0% { height: 10px; } 100% { height: 5px; } }
        @keyframes pulse2 { 0% { height: 6px; } 100% { height: 14px; } }
        @keyframes pulse3 { 0% { height: 12px; } 100% { height: 7px; } }
      `}</style>
    </div>
  );
};

export default DiaryCard;
