import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sample } from '../types';
import ParticlePreview from './ParticlePreview';

interface StarCardProps {
  sample: Sample;
  compact?: boolean;
}

const StarCard: React.FC<StarCardProps> = ({ sample, compact = false }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const end = new Date(sample.endTime).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('已结束');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      if (days > 0) setTimeLeft(`${days}天 ${hours}时 ${mins}分`);
      else if (hours > 0) setTimeLeft(`${hours}时 ${mins}分 ${secs}秒`);
      else setTimeLeft(`${mins}分 ${secs}秒`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sample.endTime]);

  const handleBidClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 300);
    navigate(`/item/${sample.id}`);
  };

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/item/${sample.id}`)}
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '12px',
          background: '#ffffff08',
          border: '1px solid #ffffff20',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'rotate(3deg) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 8px 32px #aa88ff33';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <ParticlePreview colors={sample.colors} size={180} particleCount={80} />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '10px',
            background: 'linear-gradient(to top, #0a0815ee, transparent)',
            fontSize: '12px',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          {sample.name}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/item/${sample.id}`)}
      style={{
        width: '280px',
        height: '360px',
        borderRadius: '16px',
        background: '#ffffff08',
        border: '1px solid #ffffff20',
        cursor: 'pointer',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.4s ease-out, box-shadow 0.4s ease-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-12px)';
        e.currentTarget.style.boxShadow = '0 20px 60px #aa88ff44, 0 0 30px #aa88ff22';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            border: '2px solid #ffffff20',
            background: '#0a0815'
          }}
        >
          <ParticlePreview colors={sample.colors} size={80} particleCount={60} />
        </div>
        <div style={{ flex: 1, paddingTop: '8px' }}>
          <div
            style={{
              fontSize: '18px',
              color: '#ffffff',
              fontWeight: '700',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}
          >
            {sample.name}
          </div>
          <div style={{ fontSize: '16px', color: '#ffaa44', fontWeight: '700' }}>
            ◈ {sample.currentPrice} 星币
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', flex: 1 }}>
        <div style={{ fontSize: '13px', color: '#aaaacc', lineHeight: '1.6', opacity: 0.8 }}>
          {sample.story.length > 60 ? sample.story.substring(0, 60) + '...' : sample.story}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#ff4466', fontWeight: '700' }}>
          ⏱ {timeLeft}
        </div>
        <button
          onClick={handleBidClick}
          style={{
            background: 'linear-gradient(135deg, #aa88ff44, #ff88aa44)',
            border: '1px solid #aa88ff66',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: '700',
            transition: 'all 0.3s ease',
            transform: isPulsing ? 'scale(1.15)' : 'scale(1)'
          }}
        >
          竞拍
        </button>
      </div>
    </div>
  );
};

export default StarCard;
