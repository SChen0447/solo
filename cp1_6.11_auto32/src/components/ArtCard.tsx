import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Artwork } from '../types';
import { formatCountdown } from '../utils';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface ArtCardProps {
  artwork: Artwork;
}

const ArtCard: React.FC<ArtCardProps> = ({ artwork }) => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const animatedPrice = useAnimatedNumber(artwork.currentPrice, 600);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = formatCountdown(artwork.endTime);

  const handleClick = () => {
    navigate(`/artwork/${artwork.id}`);
  };

  return (
    <div className="art-card" onClick={handleClick}>
      <div
        className="art-card-image"
        style={{ background: artwork.gradient }}
      />
      <div className="art-card-info">
        <div className="art-card-title">{artwork.title}</div>
        <div className="art-card-artist">作者：{artwork.artist}</div>
        <div className="art-card-price-row">
          <span className={`art-card-price ${animatedPrice.isUpdating ? 'updating' : ''}`}>
            ¥{animatedPrice.value.toLocaleString('zh-CN')}
          </span>
        </div>
        <div className={`art-card-countdown ${countdown.urgent ? 'urgent' : ''}`}>
          <span>⏱</span>
          <span>剩余 {countdown.text}</span>
        </div>
      </div>
    </div>
  );
};

export default ArtCard;
