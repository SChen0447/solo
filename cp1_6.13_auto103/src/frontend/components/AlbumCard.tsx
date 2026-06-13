import React, { useMemo } from 'react';
import type { AlbumListItem } from '../types';
import '../styles/album-card.scss';

interface Props {
  album: AlbumListItem;
  index: number;
  onClick: () => void;
}

function AlbumCard({ album, index, onClick }: Props): JSX.Element {
  const { clipPath, transform } = useMemo(() => {
    const x = 20 + Math.floor(Math.random() * 60);
    const y = 20 + Math.floor(Math.random() * 60);
    const size = 30;
    return {
      clipPath: `circle(60px at ${x}% ${y}%)`,
      transform: { x, y, size } as unknown as string,
    };
  }, [album.id]);

  void transform;

  return (
    <button
      type="button"
      className="album-card fade-in-up"
      style={{ animationDelay: `${0.05 * index}s` }}
      onClick={onClick}
      aria-label={`盲听唱片 ${index + 1}`}
    >
      <div className="album-card__vinyl">
        <div className="vinyl__grooves" />
        <div className="album-card__cover-fragment">
          <img
            src={album.coverUrl}
            alt="封面碎片"
            draggable={false}
            style={{ clipPath }}
          />
          <div className="cover-fragment__serrated" />
        </div>
        <div className="album-card__center-label" />
      </div>
      <div className="album-card__hint">
        <span className="hint__icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
          </svg>
        </span>
        <span>点击盲听</span>
      </div>
    </button>
  );
}

export default AlbumCard;
