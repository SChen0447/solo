import React, { useState, useEffect } from 'react';
import { shareApi } from '../api';
import type { ShareData } from '../types';
import { formatTime } from '../utils/constants';

interface SharePageProps {
  shareId: string;
  onBack: () => void;
}

const SharePage: React.FC<SharePageProps> = ({ shareId, onBack }) => {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadShare = async () => {
      try {
        const data = await shareApi.getShare(shareId);
        setShareData(data);
      } catch (e: any) {
        setError(e.error || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadShare();
  }, [shareId]);

  const renderStarSvg = (size: number, color: string) => {
    const halfSize = size / 2;
    const innerRadius = halfSize * 0.38;
    
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const outerAngle = (i * 60 - 90) * Math.PI / 180;
      const innerAngle = ((i * 60) + 30 - 90) * Math.PI / 180;
      points.push(`${halfSize + Math.cos(outerAngle) * halfSize},${halfSize + Math.sin(outerAngle) * halfSize}`);
      points.push(`${halfSize + Math.cos(innerAngle) * innerRadius},${halfSize + Math.sin(innerAngle) * innerRadius}`);
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ animation: 'twinkle 2s ease-in-out infinite' }}>
        <defs>
          <filter id={`share-glow-${color.replace('#', '')}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={points.join(' ')}
          fill={color}
          filter={`url(#share-glow-${color.replace('#', '')})`}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="share-view">
        <div className="auth-card" style={{ textAlign: 'center', color: '#aab' }}>
          加载中...
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="share-view">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ color: '#ff6b6b', marginBottom: '20px' }}>{error || '分享内容不存在'}</div>
          <a className="share-back" onClick={onBack}>返回首页</a>
        </div>
      </div>
    );
  }

  return (
    <div className="share-view">
      <div className="share-card">
        <div className="share-star">
          {renderStarSvg(80, shareData.star.color)}
        </div>
        <div className="share-content" dangerouslySetInnerHTML={{ __html: shareData.star.content || '<em>这颗星星还没有内容</em>' }} />
        <div className="share-author">
          {shareData.author ? `来自 ${shareData.author.username} 的星星` : '匿名星星'}
          <br />
          <span style={{ color: '#667', fontSize: '12px' }}>
            {formatTime(shareData.star.createdAt)}
          </span>
        </div>
        <div style={{ marginTop: '20px' }}>
          <a className="share-back" onClick={onBack}>返回首页</a>
        </div>
      </div>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 5px currentColor); }
          50% { opacity: 1; filter: drop-shadow(0 0 20px currentColor); }
        }
      `}</style>
    </div>
  );
};

export default SharePage;
