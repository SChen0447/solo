import React, { useMemo } from 'react';
import { ColorHsl } from './ColorPicker';

interface MoodPreviewProps {
  color: ColorHsl;
}

interface MoodMatch {
  label: string;
  emoji: string;
  description: string;
}

function matchMood(color: ColorHsl): MoodMatch {
  const { h, s, l } = color;

  if (l < 20) {
    return { label: '沉寂', emoji: '🌙', description: '如深夜静默的湖面' };
  }
  if (l > 85 && s < 20) {
    return { label: '平和', emoji: '🕊️', description: '像晨光里舒展的云絮' };
  }
  if (s < 30) {
    if (h >= 0 && h < 60) {
      return { label: '温柔', emoji: '🌸', description: '如掌心捧着的樱花茶' };
    }
    if (h >= 60 && h < 180) {
      return { label: '宁静', emoji: '🌿', description: '像春雨后的草地气息' };
    }
    if (h >= 180 && h < 280) {
      return { label: '忧郁', emoji: '💧', description: '如窗外淅沥的灰蓝色雨' };
    }
    return { label: '恬静', emoji: '🍃', description: '像被风翻动的旧书页' };
  }

  if (h >= 0 && h < 40) {
    if (l > 60) {
      return { label: '兴奋', emoji: '🔥', description: '像被阳光点燃的晚霞' };
    }
    return { label: '焦虑', emoji: '⚠️', description: '如胸口悬着一团赤焰' };
  }
  if (h >= 40 && h < 75) {
    if (l > 65) {
      return { label: '愉悦', emoji: '☀️', description: '像被阳光晒暖的柠檬糖' };
    }
    return { label: '温暖', emoji: '🌻', description: '如壁炉旁晒透的毛毯' };
  }
  if (h >= 75 && h < 160) {
    if (l > 60) {
      return { label: '希望', emoji: '🌱', description: '像清晨破土而出的新芽' };
    }
    return { label: '沉静', emoji: '🌲', description: '如松林深处的薄雾微光' };
  }
  if (h >= 160 && h < 210) {
    if (l > 60) {
      return { label: '清新', emoji: '💦', description: '像海边拂过的咸咸微风' };
    }
    return { label: '忧郁', emoji: '💧', description: '如雨天窗外的灰蓝水面' };
  }
  if (h >= 210 && h < 280) {
    if (l > 60) {
      return { label: '梦幻', emoji: '🦋', description: '像银河坠落的紫蓝色梦境' };
    }
    return { label: '沉思', emoji: '🔮', description: '如夜空中低语的幽蓝星光' };
  }
  if (h >= 280 && h < 320) {
    if (l > 60) {
      return { label: '浪漫', emoji: '💜', description: '像普罗旺斯傍晚的薰衣草田' };
    }
    return { label: '神秘', emoji: '🌙', description: '如月色下悄然绽放的紫玫瑰' };
  }
  if (h >= 320 && h < 360) {
    if (l > 60) {
      return { label: '甜蜜', emoji: '💕', description: '像棉花糖融化在舌尖的粉色' };
    }
    return { label: '热忱', emoji: '🌹', description: '如热烈盛开的深绯玫瑰' };
  }

  return { label: '平和', emoji: '✨', description: '如星子落在静谧的湖面' };
}

const MoodPreview: React.FC<MoodPreviewProps> = ({ color }) => {
  const mood = useMemo(() => matchMood(color), [color]);
  const bgColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  const textColor = color.l > 60 ? '#333' : '#fff';

  return (
    <div
      className="mood-preview"
      style={{
        width: 160,
        height: 160,
        borderRadius: 16,
        background: bgColor,
        transition: 'background 0.5s ease, transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        color: textColor,
        fontFamily: 'Inter, sans-serif',
        padding: 16,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 32, transition: 'transform 0.3s ease' }}>{mood.emoji}</span>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>{mood.label}</span>
      <span
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: color.l > 60 ? 0.75 : 0.85,
          transition: 'opacity 0.3s ease',
        }}
      >
        {mood.description}
      </span>
    </div>
  );
};

export default MoodPreview;
