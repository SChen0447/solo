import { useDrag } from 'react-dnd';
import { CardData, store } from './store';

interface MaterialItemProps {
  card: CardData;
}

function MaterialItem({ card }: MaterialItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'MATERIAL_ITEM',
    item: () => ({
      imageDataUrl: card.imageDataUrl,
      originalWidth: card.originalWidth,
      originalHeight: card.originalHeight,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card]);

  return (
    <div
      ref={drag}
      style={{
        width: 80,
        height: 80,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.3s cubic-bezier(.25,.46,.45,.94)',
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}
    >
      <img
        src={card.imageDataUrl}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
}

interface MaterialPoolProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function MaterialPool({ collapsed, onToggle }: MaterialPoolProps) {
  const cards = store.getState().cards;
  const uniqueImages = Array.from(
    new Map(cards.map((c) => [c.imageDataUrl, c])).values()
  ).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        width: collapsed ? 48 : 140,
        background: 'rgba(44, 44, 44, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#F5F0E8',
        transition: 'all 0.3s cubic-bezier(.25,.46,.45,.94)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          padding: '14px 0',
          background: 'transparent',
          border: 'none',
          color: '#F5F0E8',
          cursor: 'pointer',
          fontSize: 12,
          letterSpacing: 1,
          opacity: 0.8,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          writingMode: collapsed ? 'vertical-rl' : 'horizontal-tb',
          transition: 'all 0.3s ease',
        }}
      >
        {collapsed ? '素材库 ›' : '‹ 素材库'}
      </button>

      {!collapsed && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {uniqueImages.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                opacity: 0.5,
                textAlign: 'center',
                padding: '20px 4px',
                lineHeight: 1.6,
              }}
            >
              上传图片后<br />将显示在这里
            </div>
          ) : (
            uniqueImages.map((card) => (
              <MaterialItem key={card.id + card.imageDataUrl.slice(-8)} card={card} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
