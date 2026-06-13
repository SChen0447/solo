import React, { useState, useEffect, useRef } from 'react';
import { CapsuleData } from '../types';
import { getThemeGradient } from '../types';

interface CapsuleListProps {
  capsuleData: CapsuleData[];
  onCapsuleClick: (id: string) => void;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
}

const calculateCountdown = (unlockDate: string): CountdownTime => {
  const now = new Date().getTime();
  const unlock = new Date(unlockDate).getTime();
  const diff = unlock - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isUnlocked: false };
};

interface CapsuleCardProps {
  capsule: CapsuleData;
  onClick: () => void;
  index: number;
}

const CapsuleCard: React.FC<CapsuleCardProps> = ({ capsule, onClick, index }) => {
  const [countdown, setCountdown] = useState<CountdownTime>(() => calculateCountdown(capsule.unlockDate));
  const [isHovered, setIsHovered] = useState(false);
  const gradient = getThemeGradient(capsule.themeColor);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (countdown.isUnlocked) return;

    const timer = setInterval(() => {
      setCountdown(calculateCountdown(capsule.unlockDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [capsule.unlockDate, countdown.isUnlocked]);

  const formatCountdown = () => {
    if (countdown.isUnlocked) {
      return '已解锁';
    }
    return `${countdown.days}天${String(countdown.hours).padStart(2, '0')}时${String(countdown.minutes).padStart(2, '0')}分${String(countdown.seconds).padStart(2, '0')}秒`;
  };

  const rotationY = (index % 5 - 2) * 4;
  const rotationX = (Math.floor(index / 5) % 4 - 1.5) * 3;
  const zIndex = 50 - Math.abs(index % 5 - 2) * 5 - Math.abs(Math.floor(index / 5) - 1.5) * 3;
  const translateZ = 20 - Math.abs(index % 5 - 2) * 8;
  const floatDuration = 4 + (index % 3);
  const floatDelay = (index * 0.2) % 2;

  return (
    <div
      ref={cardRef}
      className={`capsule-card ${isHovered ? 'hovered' : ''} ${countdown.isUnlocked ? 'unlocked' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `perspective(1000px) rotateY(${rotationY}deg) rotateX(${rotationX}deg) translateZ(${translateZ}px)`,
        zIndex: zIndex,
        animationDelay: `${floatDelay}s`
      } as React.CSSProperties}
    >
      <div className="countdown-display" title="距离解锁时间">
        <span className={`countdown-text ${countdown.isUnlocked ? 'unlocked-text' : ''}`}>
          {formatCountdown()}
        </span>
      </div>

      <div className="amber-sphere-container" style={{ animationDuration: `${floatDuration}s` }}>
        <div
          className="amber-sphere"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 20%),
              radial-gradient(circle at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 30%),
              linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)
            `,
            boxShadow: isHovered
              ? `0 0 60px ${gradient.to}99, 0 0 100px ${gradient.from}66, inset 0 0 40px rgba(255,255,255,0.2)`
              : `0 0 30px ${gradient.to}66, 0 0 50px ${gradient.from}44, inset 0 0 30px rgba(255,255,255,0.1)`,
            transform: isHovered ? 'scale(1.2)' : 'scale(1)'
          }}
        >
          <div className="amber-shine"></div>
          <div className="amber-veil" style={{ background: `linear-gradient(45deg, transparent 30%, ${gradient.from}33 50%, transparent 70%)` }}></div>
        </div>
        {countdown.isUnlocked && (
          <div className="unlock-ring" style={{ borderColor: gradient.from }}></div>
        )}
      </div>

      <div className="capsule-info">
        <h4 className="capsule-title" style={{ color: countdown.isUnlocked ? gradient.from : '#f0e6d3' }}>
          {capsule.title}
        </h4>
        <p className="capsule-date">
          解锁: {new Date(capsule.unlockDate).toLocaleDateString('zh-CN')}
        </p>
      </div>
    </div>
  );
};

const CapsuleList: React.FC<CapsuleListProps> = ({ capsuleData, onCapsuleClick }) => {
  return (
    <div className="capsule-list-container">
      <div className="capsule-grid">
        {capsuleData.map((capsule, index) => (
          <CapsuleCard
            key={capsule.id}
            capsule={capsule}
            onClick={() => onCapsuleClick(capsule.id)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default CapsuleList;
