import type { Bottle } from '../App';

interface CollectedBottle extends Bottle {
  pickedAt: number;
}

interface CollectionProps {
  bottles: CollectedBottle[];
  onSelect: (bottle: CollectedBottle) => void;
  onClose: () => void;
}

function Collection({ bottles, onSelect, onClose }: CollectionProps) {
  const formatShortDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="collection-overlay">
      <div className="collection-panel">
        <div className="collection-header">
          <h2 className="collection-title">我的收集册</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8B6914" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {bottles.length === 0 ? (
          <div className="collection-empty">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#C4A76B" strokeWidth="1" opacity="0.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p>还没有收集到漂流瓶</p>
            <p className="collection-empty-sub">去海边拾取你的第一个吧</p>
          </div>
        ) : (
          <div className="collection-grid">
            {bottles.map((bottle) => (
              <div
                key={bottle.id}
                className="collection-thumb"
                onClick={() => onSelect(bottle)}
              >
                <div className="thumb-bg" />
                <div className="thumb-content">
                  <div className="thumb-origin">{bottle.origin.split('·')[0]?.trim() || bottle.origin}</div>
                  <div className="thumb-tags">
                    {bottle.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="thumb-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="thumb-watermark">{formatShortDate(bottle.pickedAt)}</div>
                <div className="thumb-overlay" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Collection;
