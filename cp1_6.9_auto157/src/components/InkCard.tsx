import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Ink } from '../types';
import { TEXTURE_LABELS } from '../types';

interface InkCardProps {
  ink: Ink;
  isVisible: boolean;
}

export default function InkCard({ ink, isVisible }: InkCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`ink-card ${isVisible ? 'fade-in' : 'fade-out'}`}
      onClick={() => navigate(`/ink/${ink.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`color-circle ${isHovered ? 'hover-rotate' : ''}`}
        style={{ backgroundColor: ink.color }}
      />
      <div className="ink-name">{ink.name}</div>
      <span className="texture-tag">{TEXTURE_LABELS[ink.textureType]}</span>
    </div>
  );
}
