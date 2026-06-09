import React, { forwardRef } from 'react';
import { TravelPhoto } from '../utils/types';

interface MemoryBoardProps {
  photos: TravelPhoto[];
  dateRange: string;
  titleColor: string;
}

export const MemoryBoard = forwardRef<HTMLDivElement, MemoryBoardProps>(({ photos, dateRange, titleColor }, ref) => {
  const gridPhotos = [...photos];
  while (gridPhotos.length < 9) {
    gridPhotos.push({} as TravelPhoto);
  }

  return (
    <div className="memory-board" ref={ref}>
      <div className="board-inner">
        <div className="stamp">記憶</div>

        <div className="board-grid">
          {gridPhotos.map((photo, idx) => (
            <div
              key={idx}
              className={`board-cell ${!photo.id ? 'empty' : ''}`}
              style={{ borderColor: '#D4A574' }}
            >
              {photo.id ? (
                <>
                  <img src={photo.src} alt={photo.label} className="board-photo" />
                  <div className="board-overlay">
                    {photo.label && (
                      <p className="board-label" style={{ fontFamily: '"Crimson Text", serif' }}>
                        {photo.label}
                      </p>
                    )}
                    {photo.date && (
                      <p className="board-date">{photo.date}</p>
                    )}
                    {photo.thought && (
                      <p className="board-thought">{photo.thought}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="board-empty-hint" />
              )}
            </div>
          ))}
        </div>

        <div className="board-footer" style={{ color: titleColor }}>
          <span style={{ fontFamily: '"Crimson Text", serif' }}>{dateRange}</span>
          <span className="footer-divider">|</span>
          <span>{photos.length} 张照片</span>
        </div>
      </div>
    </div>
  );
});

MemoryBoard.displayName = 'MemoryBoard';
