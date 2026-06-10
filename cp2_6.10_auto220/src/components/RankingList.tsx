import React, { useMemo, useRef, useEffect, useState } from 'react';
import type { ChallengeCard } from '../types';

interface RankingListProps {
  submissions: ChallengeCard[];
  isMobile?: boolean;
}

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1: return '#f4a261';
    case 2: return '#a8dadc';
    case 3: return '#e76f51';
    default: return '#ffffff';
  }
};

const getRankEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

interface RankItemData {
  id: string;
  recipeName: string;
  nickname: string;
  likes: number;
  rank: number;
}

const RankingList: React.FC<RankingListProps> = ({ submissions, isMobile = false }) => {
  const [positions, setPositions] = useState<Map<string, number>>(new Map());
  const prevIdsRef = useRef<string[]>([]);

  const rankedList = useMemo<RankItemData[]>(() => {
    return [...submissions]
      .sort((a, b) => {
        if (b.likes !== a.likes) return b.likes - a.likes;
        return b.createdAt - a.createdAt;
      })
      .slice(0, 5)
      .map((item, idx) => ({
        id: item.id,
        recipeName: item.recipeName,
        nickname: item.nickname,
        likes: item.likes,
        rank: idx + 1
      }));
  }, [submissions]);

  useEffect(() => {
    const currentIds = rankedList.map((r) => r.id);
    const newPositions = new Map<string, number>();
    rankedList.forEach((item, idx) => {
      const prevIdx = prevIdsRef.current.indexOf(item.id);
      if (prevIdx !== -1 && prevIdx !== idx) {
        newPositions.set(item.id, (prevIdx - idx) * 60);
      }
    });
    setPositions(newPositions);
    prevIdsRef.current = currentIds;

    if (newPositions.size > 0) {
      const timer = setTimeout(() => {
        setPositions(new Map());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [rankedList]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: isMobile ? '100%' : 240,
      backgroundColor: '#264653',
      borderRadius: 16,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden'
    },
    header: {
      textAlign: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid rgba(233, 196, 106, 0.2)'
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: '#e9c46a',
      letterSpacing: 2
    },
    subtitle: {
      fontSize: 11,
      color: 'rgba(233, 196, 106, 0.6)',
      marginTop: 4
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1
    },
    rankItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 8px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 10,
      transition: 'transform 0.3s ease, background-color 0.2s ease'
    },
    rankCircle: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      color: '#264653',
      flexShrink: 0
    },
    content: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    },
    recipeName: {
      fontSize: 13,
      fontWeight: 600,
      color: '#faf0e6',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    nickname: {
      fontSize: 10,
      color: 'rgba(250, 240, 230, 0.5)'
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    },
    lastBadge: {
      fontSize: 9,
      color: '#e63946',
      fontWeight: 700,
      backgroundColor: 'rgba(230, 57, 70, 0.15)',
      padding: '2px 6px',
      borderRadius: 4
    },
    likes: {
      fontSize: 12,
      fontWeight: 700,
      color: '#e76f51',
      minWidth: 28,
      textAlign: 'right'
    },
    heart: {
      fontSize: 12
    },
    empty: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(250, 240, 230, 0.3)',
      gap: 8,
      textAlign: 'center',
      padding: 20
    },
    emptyEmoji: {
      fontSize: 36
    },
    emptyText: {
      fontSize: 12
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🔥 热度榜</h3>
        <p style={styles.subtitle}>实时排名 · 按点赞数</p>
      </div>

      {rankedList.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyEmoji}>🏆</span>
          <span style={styles.emptyText}>暂无排名数据<br/>快提交作品参与竞争吧！</span>
        </div>
      ) : (
        <div style={styles.list}>
          {rankedList.map((item) => {
            const isLast = item.rank === 5 || (rankedList.length < 5 && item.rank === rankedList.length);
            const translateY = positions.get(item.id) || 0;
            const emoji = getRankEmoji(item.rank);

            return (
              <div
                key={item.id}
                style={{
                  ...styles.rankItem,
                  transform: `translateY(${translateY}px)`,
                  backgroundColor: item.rank <= 3 ? 'rgba(233, 196, 106, 0.08)' : 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(233, 196, 106, 0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = item.rank <= 3
                    ? 'rgba(233, 196, 106, 0.08)'
                    : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div
                  style={{
                    ...styles.rankCircle,
                    backgroundColor: getRankColor(item.rank)
                  }}
                >
                  {emoji || item.rank}
                </div>
                <div style={styles.content}>
                  <span style={styles.recipeName} title={item.recipeName}>{item.recipeName}</span>
                  <span style={styles.nickname}>by {item.nickname}</span>
                </div>
                <div style={styles.rightSection}>
                  {isLast && rankedList.length >= 3 && (
                    <span style={styles.lastBadge}>垫底</span>
                  )}
                  <span style={styles.heart}>❤️</span>
                  <span style={styles.likes}>{item.likes}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RankingList;
