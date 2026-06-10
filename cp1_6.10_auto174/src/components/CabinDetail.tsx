import React, { useState, useEffect } from 'react';
import { Cabin } from '../data';

interface CabinDetailProps {
  cabin: Cabin;
  onUpdate: (id: string, newBookedCount: number, isConfirm: boolean) => void;
}

const CabinDetail: React.FC<CabinDetailProps> = ({ cabin, onUpdate }) => {
  const [animationKey, setAnimationKey] = useState(cabin.id);

  useEffect(() => {
    setAnimationKey(cabin.id);
  }, [cabin.id]);

  const remaining = cabin.beds - cabin.booked;
  const isFull = remaining === 0;
  const isEmpty = cabin.booked === 0;

  const handleConfirm = () => {
    if (!isFull) {
      onUpdate(cabin.id, cabin.booked + 1, true);
    }
  };

  const handleReject = () => {
    if (!isEmpty) {
      onUpdate(cabin.id, cabin.booked - 1, false);
    }
  };

  return (
    <div key={animationKey} style={styles.animatedContainer}>
      <div style={styles.container}>
        <div style={styles.imageContainer}>
          <img
            src={cabin.imageUrl}
            alt={cabin.name}
            style={styles.mainImage}
          />
        </div>
        <div style={styles.content}>
          <h1 style={styles.title}>{cabin.name}</h1>
          <p style={styles.description}>{cabin.description}</p>
          <div style={styles.infoRow}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>价格：</span>
              <span style={styles.priceValue}>¥{cabin.price}/晚</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>床位数：</span>
              <span style={styles.infoValue}>{cabin.beds}间</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>剩余：</span>
              <span style={styles.remainingValue}>剩余{remaining}间</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>已预订：</span>
              <span style={styles.infoValue}>{cabin.booked}间</span>
            </div>
          </div>
          <div style={styles.buttonRow}>
            <button
              onClick={handleConfirm}
              disabled={isFull}
              style={{
                ...styles.confirmButton,
                ...(isFull ? styles.buttonDisabled : {}),
              }}
            >
              确认入住
            </button>
            <button
              onClick={handleReject}
              disabled={isEmpty}
              style={{
                ...styles.rejectButton,
                ...(isEmpty ? styles.buttonDisabled : {}),
              }}
            >
              拒绝入住
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  animatedContainer: {
    animation: 'slideInFromRight 0.3s ease-out',
    height: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '0',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    maxWidth: '480px',
    alignSelf: 'center',
    marginTop: '24px',
  },
  mainImage: {
    width: '100%',
    height: '360px',
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(62, 39, 35, 0.15)',
  },
  content: {
    flex: 1,
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  description: {
    fontSize: '16px',
    color: '#7f8c8d',
    lineHeight: 1.8,
    marginBottom: '24px',
  },
  infoRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '32px',
    padding: '16px',
    backgroundColor: '#f8f5f0',
    borderRadius: '10px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '15px',
  },
  infoLabel: {
    color: '#7f8c8d',
    fontWeight: 500,
  },
  infoValue: {
    color: '#2c3e50',
    fontWeight: 600,
  },
  priceValue: {
    color: '#27ae60',
    fontWeight: 700,
    fontSize: '17px',
  },
  remainingValue: {
    color: '#e67e22',
    fontWeight: 600,
  },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    marginTop: 'auto',
    paddingTop: '16px',
  },
  confirmButton: {
    flex: 1,
    padding: '14px 24px',
    backgroundColor: '#27ae60',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  rejectButton: {
    flex: 1,
    padding: '14px 24px',
    backgroundColor: '#e74c3c',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CabinDetail;
