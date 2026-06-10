import React, { useState, useMemo } from 'react';
import type { Sticker } from './types';
import { RARITY_COLORS, RARITY_LABELS } from './types';
import { debounce } from 'lodash';

interface StickerGalleryProps {
  stickers: Sticker[];
  collectedIds: string[];
  onToggleCollect: (stickerId: string) => void;
}

type FilterType = 'all' | 'uncollected' | 'collected';

const StickerGallery: React.FC<StickerGalleryProps> = ({
  stickers,
  collectedIds,
  onToggleCollect
}) => {
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [animationKey, setAnimationKey] = useState(0);

  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => {
      setSearchText(value);
      setAnimationKey(k => k + 1);
    }, 150),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(e.target.value);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setAnimationKey(k => k + 1);
  };

  const filteredStickers = useMemo(() => {
    let result = stickers;
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(keyword));
    }
    if (filter === 'collected') {
      result = result.filter(s => collectedIds.includes(s.id));
    } else if (filter === 'uncollected') {
      result = result.filter(s => !collectedIds.includes(s.id));
    }
    return result;
  }, [stickers, searchText, filter, collectedIds]);

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="搜索贴纸名称..."
          onChange={handleSearchChange}
          style={styles.searchInput}
        />
        <div style={styles.filterGroup}>
          {(['all', 'uncollected', 'collected'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filter === f ? '#5c6bc0' : 'transparent',
                color: filter === f ? '#ffffff' : '#5d4037'
              }}
            >
              {f === 'all' ? '全部' : f === 'uncollected' ? '未收藏' : '已收藏'}
            </button>
          ))}
        </div>
      </div>

      <div
        key={animationKey}
        style={styles.grid}
        className="fade-in"
      >
        {filteredStickers.length === 0 ? (
          <div style={styles.emptyState}>暂无匹配的贴纸</div>
        ) : (
          filteredStickers.map(sticker => {
            const isCollected = collectedIds.includes(sticker.id);
            return (
              <div key={sticker.id} style={styles.card} className="sticker-card">
                <div
                  style={{
                    ...styles.imagePlaceholder,
                    backgroundColor: sticker.imageColor
                  }}
                >
                  <span style={styles.imageIcon}>🎀</span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.name}>{sticker.name}</div>
                  <div
                    style={{
                      ...styles.rarityTag,
                      backgroundColor: RARITY_COLORS[sticker.rarity]
                    }}
                  >
                    {RARITY_LABELS[sticker.rarity]}
                  </div>
                </div>
                <button
                  onClick={() => onToggleCollect(sticker.id)}
                  style={{
                    ...styles.heartBtn,
                    color: isCollected ? '#f48fb1' : '#bdbdbd',
                    fill: isCollected ? '#f48fb1' : 'none'
                  }}
                  className="btn-press"
                  title={isCollected ? '取消收藏' : '收藏'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'flex-start'
  },
  searchInput: {
    width: 400,
    maxWidth: '100%',
    padding: '10px 20px',
    backgroundColor: '#fff',
    borderRadius: 20,
    border: '1px solid #ddd',
    fontSize: 14,
    color: '#5d4037',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    fontFamily: 'inherit'
  },
  filterGroup: {
    display: 'flex',
    gap: 8
  },
  filterBtn: {
    padding: '8px 20px',
    borderRadius: 20,
    border: '1px solid #d7ccc8',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 220px)',
    gap: 20
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: 40,
    color: '#a1887f',
    fontSize: 16
  },
  card: {
    width: 220,
    height: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 2px 8px rgba(93, 64, 55, 0.08)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageIcon: {
    fontSize: 48,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start'
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: '#5d4037'
  },
  rarityTag: {
    padding: '3px 10px',
    borderRadius: 10,
    fontSize: 12,
    color: '#fff',
    fontWeight: 500
  },
  heartBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, color 0.3s ease',
    padding: 0
  }
};

export default StickerGallery;
