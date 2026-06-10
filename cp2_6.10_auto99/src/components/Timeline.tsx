import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  selectVersions,
  selectCurrentVersionIndex,
  goToVersion,
} from '../store/poemSlice';
import { getRelativeTime } from '../utils/versionManager';

const Timeline: React.FC = () => {
  const versions = useSelector(selectVersions);
  const currentIndex = useSelector(selectCurrentVersionIndex);
  const dispatch = useDispatch();

  const handleVersionClick = (index: number) => {
    dispatch(goToVersion(index));
  };

  const reversedVersions = [...versions].reverse();
  const reversedCurrentIndex = versions.length - 1 - currentIndex;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>⏱</span>
        <span style={styles.headerTitle}>时间线</span>
        <span style={styles.headerCount}>{versions.length}</span>
      </div>
      <div style={styles.timelineContainer}>
        {reversedVersions.map((version, revIndex) => {
          const actualIndex = versions.length - 1 - revIndex;
          const isCurrent = revIndex === reversedCurrentIndex;
          const lastLine = version.lines[version.lines.length - 1];

          return (
            <div key={version.id} style={styles.itemWrapper}>
              <motion.div
                style={{
                  ...styles.card,
                  ...(isCurrent ? styles.activeCard : {}),
                }}
                onClick={() => handleVersionClick(actualIndex)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={
                  isCurrent
                    ? { duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              >
                <div style={styles.versionBadge}>
                  v{version.versionNumber}
                </div>
                {lastLine ? (
                  <>
                    <div style={styles.author}>{lastLine.author}</div>
                    <div style={styles.text}>"{lastLine.text}"</div>
                    <div style={styles.time}>
                      {getRelativeTime(lastLine.timestamp)}
                    </div>
                  </>
                ) : (
                  <div style={styles.emptyVersion}>初始版本</div>
                )}
              </motion.div>
              {revIndex < reversedVersions.length - 1 && (
                <div style={styles.connector} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '60px',
    right: 0,
    width: '320px',
    height: 'calc(100vh - 60px)',
    backgroundColor: '#f5f5f5',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fff',
  },
  headerIcon: {
    fontSize: '18px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2d3436',
  },
  headerCount: {
    marginLeft: 'auto',
    backgroundColor: '#764ba2',
    color: '#fff',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 600,
  },
  timelineContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 16px 16px 28px',
  },
  itemWrapper: {
    position: 'relative',
    marginBottom: '8px',
  },
  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 1,
  },
  activeCard: {
    backgroundColor: '#e8d5f5',
    boxShadow: '0 2px 8px rgba(118, 75, 162, 0.25)',
  },
  versionBadge: {
    position: 'absolute',
    left: '-20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '22px',
    height: '22px',
    backgroundColor: '#764ba2',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#2d3436',
    marginBottom: '4px',
  },
  text: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#555',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  time: {
    fontSize: '11px',
    color: '#999',
  },
  emptyVersion: {
    fontSize: '13px',
    color: '#888',
    fontStyle: 'italic',
  },
  connector: {
    position: 'absolute',
    left: '-9px',
    top: '100%',
    width: '2px',
    height: '20px',
    backgroundColor: '#d0d0d0',
  },
};

export default Timeline;
