import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Album, AppAction } from '../types';
import ProgressBar from '../components/ProgressBar';

interface AlbumDetailProps {
  albums: Album[];
  dispatch: React.Dispatch<AppAction>;
}

export default function AlbumDetail({ albums, dispatch }: AlbumDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const album = albums.find(a => a.id === id);

  const [showBanner, setShowBanner] = useState(false);
  const [bannerContent, setBannerContent] = useState('');
  const [previousUnlockedCount, setPreviousUnlockedCount] = useState(0);

  useEffect(() => {
    if (!album) return;
    const currentUnlockedCount = album.unlockedContent.filter(c => c.isUnlocked).length;
    if (currentUnlockedCount > previousUnlockedCount && previousUnlockedCount > 0) {
      const newlyUnlocked = album.unlockedContent.find(c => c.isUnlocked &&
        !albums.find(a => a.id !== album.id)?.unlockedContent
      );
      if (newlyUnlocked) {
        setBannerContent(`里程碑解锁！${newlyUnlocked.title}`);
      } else {
        setBannerContent('里程碑解锁！');
      }
      setShowBanner(true);
    }
    setPreviousUnlockedCount(currentUnlockedCount);
  }, [album?.unlockedContent]);

  if (!album) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
        <h2>专辑未找到</h2>
        <button onClick={() => navigate('/')} style={buttonStyle}>返回首页</button>
      </div>
    );
  }

  const handlePurchase = (tierId: string) => {
    dispatch({ type: 'PURCHASE_TIER', albumId: album.id, tierId });
    const tier = album.tiers.find(t => t.id === tierId);
    if (tier) {
      setBannerContent(`感谢支持！已购买「${tier.reward}」`);
      setShowBanner(true);
    }
  };

  const handleVote = (voteId: string, optionId: string) => {
    dispatch({ type: 'CAST_VOTE', albumId: album.id, voteId, optionId });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e1a', color: '#fff', position: 'relative' }}>
      {showBanner && (
        <div
          onClick={() => setShowBanner(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'linear-gradient(90deg, #7c5cfc 0%, #4ecdc4 100%)',
            padding: '16px 24px',
            cursor: 'pointer',
            animation: 'slideIn 0.5s ease-out',
            boxShadow: '0 4px 20px rgba(124, 92, 252, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🎉</span>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{bannerContent}</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>(点击关闭)</span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: showBanner ? '80px 24px 40px' : '40px 24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            ...buttonStyle,
            marginBottom: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          ← 返回专辑列表
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          marginBottom: '40px',
          '@media (max-width: 768px)': { gridTemplateColumns: '1fr' }
        } as React.CSSProperties}>
          <div>
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '16px',
                background: album.coverGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '140px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(0, 0, 0, 0.3)'
              }}
            >
              {album.coverEmoji}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
              {album.title}
            </h1>
            <p style={{ color: '#7c5cfc', fontSize: '18px', fontWeight: 500, marginBottom: '16px' }}>
              {album.artist}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.8, marginBottom: '24px' }}>
              {album.description}
            </p>
            <ProgressBar
              pledgedAmount={album.pledgedAmount}
              goalAmount={album.goalAmount}
              height={16}
            />
            <div style={{
              display: 'flex',
              gap: '24px',
              marginTop: '20px',
              flexWrap: 'wrap'
            }}>
              <StatCard label="已筹集" value={`¥${album.pledgedAmount.toLocaleString()}`} color="#4ecdc4" />
              <StatCard label="目标" value={`¥${album.goalAmount.toLocaleString()}`} color="#7c5cfc" />
              <StatCard label="支持者" value={`${Math.floor(album.pledgedAmount / 30)}+`} color="#ff6b6b" />
            </div>
          </div>
        </div>

        <Section title="🎵 支持档位" subtitle="选择你喜欢的方式支持这张专辑">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            '@media (max-width: 768px)': { gridTemplateColumns: '1fr' }
          } as React.CSSProperties}>
            {album.tiers.map((tier) => {
              const isSoldOut = tier.remaining <= 0;
              return (
                <div
                  key={tier.id}
                  style={{
                    background: 'rgba(26, 31, 53, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: isSoldOut
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(124, 92, 252, 0.3)',
                    borderRadius: '12px',
                    padding: '24px',
                    opacity: isSoldOut ? 0.6 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #ff6b6b, #7c5cfc)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px'
                  }}>
                    ¥{tier.price}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    {tier.reward}
                  </h3>
                  <p style={{
                    color: tier.remaining <= 2 ? '#ff6b6b' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '20px'
                  }}>
                    剩余名额：{tier.remaining}
                  </p>
                  <button
                    onClick={() => handlePurchase(tier.id)}
                    disabled={isSoldOut}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isSoldOut ? 'not-allowed' : 'pointer',
                      fontSize: '15px',
                      fontWeight: 600,
                      background: isSoldOut
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'linear-gradient(135deg, #7c5cfc 0%, #4ecdc4 100%)',
                      color: '#fff',
                      transition: 'all 0.3s ease',
                      transform: isSoldOut ? 'none' : 'scale(1)',
                      boxShadow: isSoldOut ? 'none' : '0 0 0 rgba(124, 92, 252, 0)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSoldOut) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 92, 252, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 0 rgba(124, 92, 252, 0)';
                    }}
                  >
                    {isSoldOut ? '售罄' : '立即支持'}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="🔓 解锁里程碑" subtitle="每达到25%进度解锁更多内容">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {album.unlockedContent.map((content) => (
              <div
                key={content.id}
                style={{
                  background: content.isUnlocked
                    ? 'rgba(78, 205, 196, 0.1)'
                    : 'rgba(26, 31, 53, 0.5)',
                  border: content.isUnlocked
                    ? '1px solid rgba(78, 205, 196, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: content.isUnlocked
                    ? 'linear-gradient(135deg, #4ecdc4, #7c5cfc)'
                    : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  {content.isUnlocked ? (content.type === 'audio' ? '🎵' : content.type === 'video' ? '🎬' : '📸') : '🔒'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: content.isUnlocked ? '#fff' : 'rgba(255, 255, 255, 0.4)'
                    }}>
                      {content.title}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(124, 92, 252, 0.2)',
                      color: '#7c5cfc'
                    }}>
                      {content.threshold}%
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: content.isUnlocked ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)'
                  }}>
                    {content.isUnlocked ? content.description : '达到目标进度后解锁'}
                  </p>
                </div>
                {content.isUnlocked && (
                  <span style={{
                    color: '#4ecdc4',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    已解锁 ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="🗳️ 粉丝投票" subtitle="参与决定专辑的未来方向">
          {album.votes.map((vote) => (
            <div
              key={vote.id}
              style={{
                background: 'rgba(26, 31, 53, 0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(124, 92, 252, 0.2)',
                borderRadius: '12px',
                padding: '24px',
                pointerEvents: vote.hasVoted ? 'none' : 'auto'
              }}
            >
              <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                {vote.question}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {vote.options.map((option) => {
                  const percentage = vote.totalVotes > 0
                    ? (option.votes / vote.totalVotes) * 100
                    : 0;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleVote(vote.id, option.id)}
                      disabled={vote.hasVoted}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: vote.hasVoted ? 'not-allowed' : 'pointer',
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: '#fff',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        transform: vote.hasVoted ? 'none' : 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!vote.hasVoted) {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = `0 0 20px ${option.color}40, inset 0 0 30px ${option.color}15`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${option.color}30, ${option.color}10)`,
                          transition: 'width 0.6s ease'
                        }}
                      />
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>
                          {option.label}
                        </span>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '14px'
                        }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {option.votes} 票
                          </span>
                          <span style={{
                            color: option.color,
                            fontWeight: 700,
                            minWidth: '50px',
                            textAlign: 'right'
                          }}>
                            {percentage.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {vote.hasVoted && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: 'rgba(78, 205, 196, 0.1)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#4ecdc4',
                  fontWeight: 600
                }}>
                  ✨ 感谢参与！
                </div>
              )}
              <div style={{
                marginTop: '16px',
                textAlign: 'right',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                共 {vote.totalVotes} 人参与投票
              </div>
            </div>
          ))}
        </Section>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            gridTemplateColumns: 1fr !important;
          }
          div[style*="gridTemplateColumns: repeat(3"] {
            gridTemplateColumns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  background: 'linear-gradient(135deg, #7c5cfc, #4ecdc4)',
  color: '#fff',
  transition: 'all 0.3s ease'
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
        {title}
      </h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px', fontSize: '14px' }}>
        {subtitle}
      </p>
      {children}
    </div>
  );
}
