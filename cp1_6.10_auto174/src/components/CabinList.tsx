import React from 'react';
import { Cabin } from '../data';

interface CabinListProps {
  cabins: Cabin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CabinList: React.FC<CabinListProps> = ({ cabins, selectedId, onSelect }) => {
  const sortedCabins = [...cabins].sort((a, b) => {
    const remainingA = a.beds - a.booked;
    const remainingB = b.beds - b.booked;
    return remainingB - remainingA;
  });

  return (
    <div style={styles.container}>
      {sortedCabins.map((cabin) => {
        const remaining = cabin.beds - cabin.booked;
        const isFull = remaining === 0;
        const isSelected = selectedId === cabin.id;

        return (
          <div
            key={cabin.id}
            onClick={() => onSelect(cabin.id)}
            style={{
              ...styles.card,
              ...(isFull ? styles.cardFull : {}),
              ...(isSelected ? styles.cardSelected : {}),
            }}
          >
            <div style={styles.imageWrapper}>
              <img
                src={cabin.imageUrl}
                alt={cabin.name}
                style={styles.thumbnail}
              />
              {isFull && (
                <div style={styles.fullBadge}>已满</div>
              )}
            </div>
            <div style={styles.cardContent}>
              <div style={styles.cabinName}>{cabin.name}</div>
              <div style={styles.remainingText}>
                剩余{remaining}间
              </div>
              <div style={styles.priceText}>
                ¥{cabin.price}/晚
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    overflowY: 'auto',
    height: '100%',
  },
  card: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    boxShadow: '0 2px 8px rgba(62, 39, 35, 0.08)',
  },
  cardSelected: {
    borderColor: '#8B7355',
    boxShadow: '0 4px 16px rgba(62, 39, 35, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  cardFull: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  imageWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  thumbnail: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  fullBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: '#e74c3c',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '12px',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  cabinName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#3e2723',
    lineHeight: 1.3,
  },
  remainingText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e67e22',
  },
  priceText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#27ae60',
  },
};

export default CabinList;
