import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import VoteDashboard from './components/VoteDashboard';
import {
  Vote, getAllVotes, getVote, createVote, deleteVote,
  formatRelativeTime, saveEditToken, getEditToken, BAR_COLORS
} from './api';

type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'detail'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === '/') return { name: 'home' };
  if (hash === '/create') return { name: 'create' };
  const m = hash.match(/^\/vote\/(.+)$/);
  if (m) return { name: 'detail', id: m[1] };
  return { name: 'home' };
}

function navigate(route: Route) {
  if (route.name === 'home') window.location.hash = '/';
  else if (route.name === 'create') window.location.hash = '/create';
  else window.location.hash = `/vote/${route.id}`;
}

let socket: Socket | null = null;
function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentVote, setCurrentVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const loadVotes = async () => {
      try {
        const data = await getAllVotes();
        setVotes(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadVotes();

    const s = getSocket();
    s.on('vote:created', (vote: Vote) => {
      setVotes(prev => [vote, ...prev.filter(v => v.id !== vote.id)]);
    });
    s.on('vote:updated', (vote: Vote) => {
      setVotes(prev => prev.map(v => v.id === vote.id ? vote : v));
      setCurrentVote(prev => prev && prev.id === vote.id ? vote : prev);
    });
    s.on('vote:deleted', (id: string) => {
      setVotes(prev => prev.filter(v => v.id !== id));
      setCurrentVote(prev => {
        if (prev && prev.id === id) {
          navigate({ name: 'home' });
          return null;
        }
        return prev;
      });
    });

    return () => {
      s.off('vote:created');
      s.off('vote:updated');
      s.off('vote:deleted');
    };
  }, []);

  useEffect(() => {
    if (route.name === 'detail') {
      setLoading(true);
      setError(null);
      getVote(route.id)
        .then(v => setCurrentVote(v))
        .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
        .finally(() => setLoading(false));
    } else {
      setCurrentVote(null);
    }
  }, [route]);

  const hasVotedFor = useCallback((voteId: string) => {
    const voted = JSON.parse(localStorage.getItem('voted_polls') || '[]');
    return voted.includes(voteId);
  }, []);

  const handleDeleteVote = async (voteId: string) => {
    const token = getEditToken(voteId);
    if (!token) {
      alert('您没有删除此投票的权限');
      return;
    }
    if (!confirm('确定要删除此投票吗？')) return;
    try {
      await deleteVote(voteId, token);
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          0% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes glowLine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        button:active { transform: scale(0.95); }
        .option-btn-wrapper:hover button:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-3px);
        }
        .stagger-item {
          opacity: 0;
          animation: slideUp 0.45s ease forwards;
        }
        input.glow-input:focus {
          outline: none;
          border-color: transparent;
        }
        input.glow-input:focus + .glow-line {
          opacity: 1;
          transform: scaleX(1);
        }
        .glow-line {
          height: 2px;
          background: linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899, #8B5CF6, #6366F1);
          background-size: 200% 100%;
          animation: glowLine 2s linear infinite;
          transform-origin: left;
          transform: scaleX(0);
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0;
          border-radius: 2px;
        }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 onClick={() => navigate({ name: 'home' })} style={styles.logo}>
            📊 VoteBoard
          </h1>
          {route.name !== 'create' && (
            <button style={styles.primaryBtn} onClick={() => navigate({ name: 'create' })}>
              + 创建投票
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {route.name === 'home' && (
          loading ? <div style={styles.loading}>加载中...</div> :
            votes.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗳️</div>
                <h3 style={{ color: '#fff', margin: 0 }}>暂无投票</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>点击右上角按钮创建您的第一个投票</p>
              </div>
            ) : (
              <div style={styles.voteGrid}>
                {votes.map((v, i) => (
                  <div
                    key={v.id}
                    className="stagger-item"
                    style={{
                      ...styles.voteCard,
                      animationDelay: `${i * 100}ms`,
                      borderLeft: `4px solid ${BAR_COLORS[i % BAR_COLORS.length]}`
                    }}
                    onClick={() => navigate({ name: 'detail', id: v.id })}
                  >
                    <div style={styles.cardHead}>
                      <h3 style={styles.cardTitle}>{v.title}</h3>
                      {getEditToken(v.id) && (
                        <button
                          style={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); handleDeleteVote(v.id); }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <div style={styles.cardStats}>
                      <span>📋 {v.options.length} 个选项</span>
                      <span>🗳️ {v.totalVotes} 票</span>
                    </div>
                    <div style={styles.cardTime}>{formatRelativeTime(v.createdAt)}</div>
                  </div>
                ))}
              </div>
            )
        )}

        {route.name === 'create' && (
          <CreateVoteForm
            onSuccess={(id, token) => {
              saveEditToken(id, token);
              navigate({ name: 'detail', id });
            }}
            onCancel={() => navigate({ name: 'home' })}
          />
        )}

        {route.name === 'detail' && (
          loading ? <div style={styles.loading}>加载中...</div> :
            currentVote ? (
              <>
                <button style={styles.backBtn} onClick={() => navigate({ name: 'home' })}>
                  ← 返回列表
                </button>
                {getEditToken(currentVote.id) && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <button style={styles.dangerBtn} onClick={() => handleDeleteVote(currentVote.id)}>
                      删除此投票
                    </button>
                  </div>
                )}
                <div style={{ marginTop: '20px' }}>
                  <VoteDashboard
                    vote={currentVote}
                    hasVoted={hasVotedFor(currentVote.id)}
                    onVoteError={(msg) => alert(msg)}
                  />
                </div>
              </>
            ) : (
              <div style={styles.emptyState}>
                <h3 style={{ color: '#fff' }}>投票不存在</h3>
                <button style={styles.primaryBtn} onClick={() => navigate({ name: 'home' })}>返回首页</button>
              </div>
            )
        )}
      </main>
    </div>
  );
}

function CreateVoteForm({
  onSuccess, onCancel
}: { onSuccess: (id: string, token: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 8) setOptions([...options, '']);
  };
  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };
  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val.slice(0, 30);
    setOptions(next);
  };

  const canSubmit = title.trim().length > 0 &&
    options.filter(o => o.trim().length > 0).length >= 2;

  const handleSubmit = async () => {
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!title.trim()) { setFormError('请输入投票主题'); return; }
    if (validOptions.length < 2) { setFormError('至少需要2个有效选项'); return; }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await createVote(title.trim(), validOptions);
      onSuccess(res.id, res.editToken);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.formCard}>
      <h2 style={styles.formTitle}>创建新投票</h2>
      {formError && <div style={styles.errorBox}>{formError}</div>}

      <div style={styles.fieldGroup}>
        <label style={styles.label}>投票主题</label>
        <div style={{ position: 'relative' }}>
          <input
            className="glow-input"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="输入投票主题，最多50个字符..."
            style={styles.textInput}
          />
          <div className="glow-line" />
        </div>
        <div style={styles.charCount}>{title.length}/50</div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>投票选项 ({options.length}/8)</label>
        {options.map((opt, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: '14px' }}>
            <div style={styles.optionRow2}>
              <span style={styles.optionIdx}>{i + 1}</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="glow-input"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`选项 ${i + 1}`}
                  style={styles.textInput}
                />
                <div className="glow-line" />
              </div>
              <button
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                style={{
                  ...styles.iconBtn,
                  opacity: options.length <= 2 ? 0.3 : 1,
                  cursor: options.length <= 2 ? 'not-allowed' : 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addOption}
          disabled={options.length >= 8}
          style={{
            ...styles.addOptionBtn,
            opacity: options.length >= 8 ? 0.5 : 1,
            cursor: options.length >= 8 ? 'not-allowed' : 'pointer'
          }}
        >
          + 添加选项
        </button>
      </div>

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onCancel} disabled={submitting}>取消</button>
        <button
          style={styles.primaryBtn}
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? '创建中...' : '创建投票'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#0F172A',
    color: '#fff'
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky',
    top: 0,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(10px)',
    zIndex: 10
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    margin: 0,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #6366F1, #EC4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px'
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px'
  },
  dangerBtn: {
    background: 'linear-gradient(135deg, #F43F5E, #EC4899)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px'
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.8)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 24px'
  },
  errorBox: {
    background: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    color: '#FDA4AF',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  voteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  voteCard: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '14px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '8px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#fff',
    lineHeight: 1.4,
    flex: 1
  },
  deleteBtn: {
    background: 'rgba(244, 63, 94, 0.2)',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    color: '#FDA4AF',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  cardStats: {
    display: 'flex',
    gap: '16px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    marginBottom: '8px'
  },
  cardTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px'
  },
  formCard: {
    maxWidth: '560px',
    margin: '0 auto',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    padding: '32px'
  },
  formTitle: {
    margin: '0 0 24px 0',
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center'
  },
  fieldGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
    fontSize: '14px'
  },
  textInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px 10px 0 0',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px'
  },
  optionRow2: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  optionIdx: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(244, 63, 94, 0.2)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#FDA4AF',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
    transition: 'all 0.2s ease'
  },
  addOptionBtn: {
    width: '100%',
    padding: '10px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px dashed rgba(99, 102, 241, 0.5)',
    color: '#A5B4FC',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px'
  }
};
