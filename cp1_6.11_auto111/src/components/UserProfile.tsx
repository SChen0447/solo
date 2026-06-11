import React from 'react';
import { PixelCard as PixelCardType } from '../types';

interface UserProfileProps {
  userName: string;
  works: PixelCardType[];
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userName, works, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        style={styles.overlay}
        onClick={onClose}
      />
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>{userName}</h3>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>最近作品</p>
          <div style={styles.worksGrid}>
            {works.slice(0, 5).map(work => (
              <div key={work.id} style={styles.workItem}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(32, 1fr)',
                    width: '100%',
                    aspectRatio: '1/1',
                    border: '1px solid #404060',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  {work.pixelData.flat().map((color, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: color === 'transparent' ? '#2a2a3e' : color
                      }}
                    />
                  ))}
                </div>
                <div style={styles.workLikes}>
                  ❤️ {work.likes}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{works.length}</span>
            <span style={styles.statLabel}>作品</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNum}>
              {works.reduce((sum, w) => sum + w.likes, 0)}
            </span>
            <span style={styles.statLabel}>获赞</span>
          </div>
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    animation: 'fadeIn 0.3s ease'
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 320,
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderLeft: '1px solid #404060',
    zIndex: 201,
    padding: 24,
    boxSizing: 'border-box',
    overflowY: 'auto',
    animation: 'slideInRight 0.3s ease-out'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 600
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12
  },
  worksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12
  },
  workItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  workLikes: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center'
  },
  stats: {
    display: 'flex',
    gap: 24,
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #404060'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statNum: {
    color: '#00cc88',
    fontSize: 24,
    fontWeight: 700
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4
  }
};

export default UserProfile;
