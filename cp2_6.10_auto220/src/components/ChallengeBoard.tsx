import React, { useState } from 'react';
import type { ChallengeCard } from '../types';

interface ChallengeBoardProps {
  submissions: ChallengeCard[];
  onLike: (cardId: string) => void;
  onAddComment: (cardId: string, content: string) => void;
  isMobile?: boolean;
}

interface RecipeCardProps {
  card: ChallengeCard;
  onLike: (cardId: string) => void;
  onAddComment: (cardId: string, content: string) => void;
  isMobile?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ card, onLike, onAddComment, isMobile = false }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const handleAddComment = () => {
    if (commentInput.trim()) {
      onAddComment(card.id, commentInput.trim());
      setCommentInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    card: {
      width: isMobile ? '100%' : 280,
      maxWidth: isMobile ? '100%' : 280,
      minHeight: 220,
      background: 'linear-gradient(135deg, #e8d5c4 0%, #f5e6d3 100%)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(196, 168, 130, 0.35)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      flexShrink: 0
    },
    recipeName: {
      fontSize: 16,
      fontWeight: 700,
      color: '#3d2c1a',
      marginBottom: 8,
      lineHeight: 1.3
    },
    description: {
      fontSize: 12,
      color: '#5a4230',
      lineHeight: 1.5,
      marginBottom: 8,
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    },
    ingredients: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 12
    },
    ingredientTag: {
      fontSize: 10,
      padding: '2px 8px',
      backgroundColor: 'rgba(61, 90, 128, 0.12)',
      color: '#3d5a80',
      borderRadius: 8
    },
    bottomRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    leftActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    },
    nickname: {
      fontSize: 11,
      color: '#7a5c45',
      fontWeight: 500
    },
    commentIcon: {
      fontSize: 14,
      cursor: 'pointer',
      color: '#7a5c45',
      transition: 'transform 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    },
    likeBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      userSelect: 'none'
    },
    heart: {
      fontSize: 16,
      color: card.likedByUser ? '#e63946' : '#ccc',
      transition: 'color 0.2s ease-in-out, transform 0.2s ease-in-out'
    },
    likeCount: {
      fontSize: 12,
      color: card.likedByUser ? '#e63946' : '#7a5c45',
      fontWeight: 600
    },
    commentsSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px dashed rgba(139, 105, 66, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    },
    commentsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      maxHeight: 120,
      overflowY: 'auto'
    },
    commentBubble: {
      backgroundColor: '#f1e3d3',
      borderRadius: 12,
      padding: '6px 10px',
      paddingLeft: 18,
      fontSize: 11,
      color: '#3d2c1a',
      lineHeight: 1.4
    },
    commentNickname: {
      fontWeight: 600,
      color: '#6b4f35',
      fontSize: 10,
      marginBottom: 2
    },
    commentInput: {
      display: 'flex',
      gap: 6
    },
    input: {
      flex: 1,
      padding: '6px 10px',
      border: '1px solid #d4a373',
      borderRadius: 8,
      backgroundColor: '#fff',
      fontSize: 11,
      color: '#3d2c1a',
      outline: 'none',
      fontFamily: 'inherit'
    },
    sendBtn: {
      padding: '6px 12px',
      backgroundColor: '#3d5a80',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      fontSize: 11,
      cursor: 'pointer',
      fontWeight: 500
    }
  };

  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(196, 168, 130, 0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(196, 168, 130, 0.35)';
      }}
    >
      <div>
        <h4 style={styles.recipeName}>{card.recipeName}</h4>
        <p style={styles.description}>{card.description}</p>
        <div style={styles.ingredients}>
          {card.ingredients.slice(0, 4).map((ing, idx) => (
            <span key={idx} style={styles.ingredientTag}>{ing}</span>
          ))}
          {card.ingredients.length > 4 && (
            <span style={{ ...styles.ingredientTag, backgroundColor: 'rgba(139,105,66,0.15)' }}>
              +{card.ingredients.length - 4}
            </span>
          )}
        </div>
      </div>

      <div>
        <div style={styles.bottomRow}>
          <div style={styles.leftActions}>
            <span style={styles.nickname}>👨‍🍳 {card.nickname}</span>
            <span
              style={styles.commentIcon}
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1)';
              }}
            >
              💬 {card.comments.length}
            </span>
          </div>
          <div
            style={styles.likeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onLike(card.id);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            <span style={styles.heart}>{card.likedByUser ? '❤️' : '🤍'}</span>
            <span style={styles.likeCount}>{card.likes}</span>
          </div>
        </div>

        {showComments && (
          <div style={styles.commentsSection}>
            {card.comments.length > 0 && (
              <div style={styles.commentsList}>
                {card.comments.map((c) => (
                  <div key={c.id} style={styles.commentBubble}>
                    <div style={styles.commentNickname}>{c.nickname}</div>
                    <div>{c.content}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.commentInput}>
              <input
                style={styles.input}
                type="text"
                placeholder="写下你的评论..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                style={styles.sendBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddComment();
                }}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ChallengeBoard: React.FC<ChallengeBoardProps> = ({ submissions, onLike, onAddComment, isMobile = false }) => {
  const [displayCount, setDisplayCount] = useState(10);
  const sortedByTime = [...submissions].sort((a, b) => b.createdAt - a.createdAt);
  const displayed = sortedByTime.slice(0, displayCount);
  const hasMore = sortedByTime.length > displayCount;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      flexShrink: 0
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: '#3d2c1a'
    },
    count: {
      fontSize: 12,
      color: '#7a5c45'
    },
    grid: {
      flex: 1,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      alignContent: 'flex-start',
      overflowY: 'auto',
      padding: 4
    },
    empty: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#a89080',
      gap: 8
    },
    emptyEmoji: {
      fontSize: 48
    },
    emptyText: {
      fontSize: 14
    },
    loadMore: {
      marginTop: 12,
      alignSelf: 'center',
      padding: '8px 20px',
      backgroundColor: 'transparent',
      border: '1px solid #d4a373',
      color: '#6b4f35',
      borderRadius: 8,
      fontSize: 12,
      cursor: 'pointer',
      fontWeight: 500,
      flexShrink: 0,
      transition: 'all 0.2s ease'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🎂 挑战作品展示区</h3>
        <span style={styles.count}>共 {submissions.length} 份作品</span>
      </div>

      {displayed.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyEmoji}>🍰</span>
          <span style={styles.emptyText}>暂无作品，快来提交你的创意吧！</span>
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {displayed.map((card) => (
              <RecipeCard
                key={card.id}
                card={card}
                onLike={onLike}
                onAddComment={onAddComment}
                isMobile={isMobile}
              />
            ))}
          </div>
          {hasMore && (
            <button
              style={styles.loadMore}
              onClick={() => setDisplayCount((prev) => prev + 10)}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(212, 163, 115, 0.15)';
                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              加载更多 ({sortedByTime.length - displayCount} 份)
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ChallengeBoard;
