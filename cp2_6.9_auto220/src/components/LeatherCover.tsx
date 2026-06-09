import React from 'react';

interface LeatherCoverProps {
  onClick: () => void;
}

export const LeatherCover: React.FC<LeatherCoverProps> = ({ onClick }) => {
  return (
    <div className="leather-cover-wrapper" onClick={onClick}>
      <div className="leather-cover">
        <div className="leather-texture" />
        <div className="leather-spine" />
        
        <div className="cover-content">
          <h1 className="cover-title">Travelogue</h1>
          <p className="cover-subtitle">旅行 · 记忆 · 拼图</p>
          <div className="cover-decoration" />
          <p className="cover-hint">点击翻开</p>
        </div>

        <div className="cover-corner tl" />
        <div className="cover-corner tr" />
        <div className="cover-corner bl" />
        <div className="cover-corner br" />
      </div>
    </div>
  );
};
