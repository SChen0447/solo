import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, Specimen } from './App';

const TOTAL_SLOTS = 40;
const SLOTS_PER_ROW = 10;

function EmptyTube({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: '30px',
        height: '130px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div
        style={{
          width: '26px',
          height: '14px',
          background: 'linear-gradient(180deg, #a1887f 0%, #5d4037 100%)',
          borderRadius: '2px 2px 0 0',
          zIndex: 2,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          width: '22px',
          height: '116px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.05) 60%, rgba(0,0,0,0.15) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderTop: 'none',
          borderRadius: '0 0 11px 11px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '3px',
            top: '8px',
            width: '3px',
            height: '80px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.05) 100%)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.25)',
            fontSize: '18px',
            fontWeight: 300,
          }}
        >
          +
        </div>
      </div>
    </div>
  );
}

function SpecimenTube({
  specimen,
  index,
  onClick,
  onFavorite,
  animatedIndex,
}: {
  specimen: Specimen;
  index: number;
  onClick: () => void;
  onFavorite: () => void;
  animatedIndex: number;
}) {
  const [bouncing, setBouncing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fluidColor = `hsl(${specimen.hue}, ${specimen.saturation}%, ${specimen.lightness}%)`;
  const fluidGlow = `hsl(${specimen.hue}, ${specimen.saturation}%, ${Math.min(specimen.lightness + 20, 90)}%)`;
  const fillHeight = `${Math.max(10, Math.min(100, specimen.amplitude * 100))}%`;

  const playHoverSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 554.37;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBouncing(true);
    onFavorite();
    setTimeout(() => setBouncing(false), 400);
  };

  const labelNum = String(index + 1).padStart(2, '0');

  return (
    <div
      onClick={onClick}
      style={{
        width: '44px',
        height: '168px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transformOrigin: 'center bottom',
        animation: `fade-in 0.5s ease ${Math.min(animatedIndex * 0.03, 0.5)}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.2)';
        playHoverSound();
      }}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div
        style={{
          width: '28px',
          height: '14px',
          background: 'linear-gradient(180deg, #8d6e63 0%, #4e342e 100%)',
          borderRadius: '2px 2px 0 0',
          zIndex: 3,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          width: '22px',
          height: '120px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.25) 25%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.2) 100%)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderTop: 'none',
          borderRadius: '0 0 11px 11px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 0 8px ${fluidColor}66, inset 0 -4px 12px rgba(0,0,0,0.3)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '3px',
            top: '6px',
            width: '3px',
            height: '78px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 100%)',
            borderRadius: '2px',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: fillHeight,
            background: `linear-gradient(180deg, ${fluidGlow} 0%, ${fluidColor} 40%, ${fluidColor}dd 100%)`,
            animation: `pulse ${2 + (specimen.frequency / 1000)}s ease-in-out infinite`,
            boxShadow: `0 -2px 8px ${fluidColor}aa, inset 0 2px 6px rgba(255,255,255,0.3)`,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${15 + i * 20}%`,
                bottom: '10%',
                width: '3px',
                height: '3px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '50%',
                animation: `flow ${1.5 + i * 0.3}s ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              left: 0,
              right: 0,
              height: '5px',
              background: `linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: '5px',
          padding: '3px 6px',
          background: 'rgba(61, 39, 35, 0.85)',
          border: '1px solid #6d4c41',
          borderRadius: '3px',
          textAlign: 'center',
          minWidth: '42px',
        }}
      >
        <div
          style={{
            fontSize: '8px',
            color: '#ffd54f',
            letterSpacing: '1px',
            lineHeight: 1.2,
            fontFamily: 'monospace',
          }}
        >
          #{labelNum}
        </div>
        <div
          style={{
            fontSize: '9px',
            color: '#f5f0e1',
            lineHeight: 1.2,
            maxWidth: '36px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={specimen.name}
        >
          {specimen.name}
        </div>
      </div>

      <button
        onClick={handleFavoriteClick}
        style={{
          marginTop: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          padding: 0,
          lineHeight: 1,
          animation: bouncing ? 'bounce-star 0.4s ease' : 'none',
        }}
      >
        {specimen.favorite ? (
          <span style={{ color: '#ffd54f', filter: 'drop-shadow(0 0 4px rgba(255,213,79,0.6))' }}>★</span>
        ) : (
          <span style={{ color: '#757575' }}>☆</span>
        )}
      </button>
    </div>
  );
}

function Gallery() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'favorite'>('time');
  const [loading, setLoading] = useState(true);

  const loadSpecimens = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/specimens?user_id=${user.id}`);
      setSpecimens(res.data);
    } catch (err) {
      console.error('加载标本失败:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSpecimens();
  }, [user]);

  const sortedSpecimens = [...specimens].sort((a, b) => {
    if (sortBy === 'favorite') {
      if (b.favorite !== a.favorite) return b.favorite - a.favorite;
      return b.created_at - a.created_at;
    }
    return b.created_at - a.created_at;
  });

  const handleCreate = () => {
    navigate('/editor');
  };

  const handleEdit = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleFavorite = async (id: string, currentFavorite: number) => {
    try {
      await axios.post('/api/favorites', {
        specimen_id: id,
        favorite: !currentFavorite,
      });
      setSpecimens((prev) =>
        prev.map((s) => (s.id === id ? { ...s, favorite: currentFavorite ? 0 : 1 } : s))
      );
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  };

  const renderSlots = () => {
    const slots: JSX.Element[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const specimen = sortedSpecimens[i];
      slots.push(
        <div
          key={specimen ? specimen.id : `empty-${i}`}
          style={{
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
          }}
        >
          {specimen ? (
            <SpecimenTube
              specimen={specimen}
              index={i}
              onClick={() => handleEdit(specimen.id)}
              onFavorite={() => handleFavorite(specimen.id, specimen.favorite)}
              animatedIndex={i}
            />
          ) : (
            <EmptyTube onClick={handleCreate} />
          )}
        </div>
      );
    }
    return slots;
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 24px 60px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 8px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '40px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 400,
              letterSpacing: '4px',
              color: '#f5f0e1',
              fontFamily: 'Georgia, serif',
            }}
          >
            回声 · 标本集
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#a1887f',
              letterSpacing: '3px',
              marginTop: '4px',
            }}
          >
            ECHO SPECIMEN COLLECTION — {user?.username}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setSortBy('time')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'time' ? 'linear-gradient(135deg, #ffd54f, #ff8f00)' : 'rgba(255,255,255,0.06)',
                border: sortBy === 'time' ? 'none' : '1px solid #5d4037',
                borderRadius: '4px',
                color: sortBy === 'time' ? '#3e2723' : '#d7ccc8',
                fontSize: '13px',
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'all 0.2s',
                fontWeight: sortBy === 'time' ? 600 : 400,
              }}
            >
              按时间
            </button>
            <button
              onClick={() => setSortBy('favorite')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'favorite' ? 'linear-gradient(135deg, #ffd54f, #ff8f00)' : 'rgba(255,255,255,0.06)',
                border: sortBy === 'favorite' ? 'none' : '1px solid #5d4037',
                borderRadius: '4px',
                color: sortBy === 'favorite' ? '#3e2723' : '#d7ccc8',
                fontSize: '13px',
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'all 0.2s',
                fontWeight: sortBy === 'favorite' ? 600 : 400,
              }}
            >
              按收藏
            </button>
          </div>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #ffd54f, #ff8f00)',
              border: 'none',
              borderRadius: '4px',
              color: '#3e2723',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            + 新建标本
          </button>
          <button
            onClick={logout}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1px solid #5d4037',
              borderRadius: '4px',
              color: '#a1887f',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef5350';
              e.currentTarget.style.borderColor = '#ef5350';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1887f';
              e.currentTarget.style.borderColor = '#5d4037';
            }}
          >
            退出
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: '#a1887f' }}>加载中...</div>
      ) : (
        <div
          style={{
            background: `
              linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%),
              repeating-linear-gradient(0deg, #5d4037 0px, #5d4037 180px, #3e2723 180px, #3e2723 184px),
              linear-gradient(180deg, #4e342e 0%, #3e2723 100%)
            `,
            borderRadius: '8px',
            padding: '32px 28px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            border: '1px solid #3e2723',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${SLOTS_PER_ROW}, minmax(44px, 1fr))`,
              gap: '16px 12px',
              position: 'relative',
              zIndex: 1,
              justifyItems: 'center',
            }}
          >
            {renderSlots()}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(180deg, #6d4c41 0%, #3e2723 100%)',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          marginTop: '32px',
          color: '#6d4c41',
          fontSize: '12px',
          letterSpacing: '2px',
        }}
      >
        共 {specimens.length} / {TOTAL_SLOTS} 号标本 · 点击空管创建新标本
      </div>
    </div>
  );
}

export default Gallery;
