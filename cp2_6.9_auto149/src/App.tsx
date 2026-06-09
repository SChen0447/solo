import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createVote,
  getVote,
  submitVote,
  getVotes,
  VoteDetail,
  VoteListItem,
} from './voteService';

const COLOR_PALETTE = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

type ViewType = 'create' | 'result';
type FilterType = 'all' | 'active' | 'closed';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

function AnimatedProgressBar({
  percent,
  color,
  index,
}: {
  percent: number;
  color: string;
  index: number;
}) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevPercentRef = useRef(0);

  useEffect(() => {
    const startPercent = prevPercentRef.current;
    const targetPercent = percent;
    const startTime = performance.now();
    const duration = 800;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startPercent + (targetPercent - startPercent) * easeOut;
      setDisplayPercent(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevPercentRef.current = targetPercent;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [percent]);

  return (
    <div
      className="progress-bar-container"
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${displayPercent}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function VoteCreateForm({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const options = optionsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const result = await createVote({
        title,
        options,
        durationHours,
      });
      onCreated(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card vote-form" onSubmit={handleSubmit}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '22px' }}>创建新投票</h2>

      <div className="form-group">
        <label>投票标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入投票标题"
          className="input"
        />
      </div>

      <div className="form-group">
        <label>投票选项（每行一个，2-6个）</label>
        <textarea
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
          placeholder={'选项1\n选项2\n选项3...'}
          className="textarea"
          rows={6}
        />
      </div>

      <div className="form-group">
        <label>有效期</label>
        <div className="duration-options">
          {[1, 6, 12, 24, 48].map((h) => (
            <button
              type="button"
              key={h}
              className={`duration-btn ${durationHours === h ? 'active' : ''}`}
              onClick={() => setDurationHours(h)}
            >
              {h}小时
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? '创建中...' : '创建投票'}
      </button>
    </form>
  );
}

function VoteResultPanel({
  voteId,
  onBack,
}: {
  voteId: string;
  onBack: () => void;
}) {
  const [vote, setVote] = useState<VoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);

  const fetchVote = useCallback(async () => {
    try {
      const data = await getVote(voteId);
      setVote(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [voteId]);

  useEffect(() => {
    fetchVote();
    const interval = setInterval(fetchVote, 5000);
    return () => clearInterval(interval);
  }, [fetchVote]);

  const handleVote = async (optionIndex: number) => {
    if (!vote || vote.status === 'closed') return;
    setVoting(true);
    try {
      const data = await submitVote(voteId, optionIndex);
      setVote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票失败');
    } finally {
      setVoting(false);
    }
  };

  if (loading && !vote) {
    return (
      <div className="card">
        <p style={{ color: '#94A3B8' }}>加载中...</p>
      </div>
    );
  }

  if (error && !vote) {
    return (
      <div className="card">
        <p style={{ color: '#EF4444' }}>{error}</p>
        <button className="primary-btn" onClick={onBack} style={{ marginTop: 16 }}>
          返回
        </button>
      </div>
    );
  }

  if (!vote) return null;

  return (
    <div className="card vote-result">
      <div className="vote-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>{vote.title}</h2>
        {vote.status === 'closed' && <span className="closed-badge">已结束</span>}
      </div>

      <div className="vote-meta">
        <span>创建于 {formatTime(vote.createdAt)}</span>
        <span>·</span>
        <span>总票数: {vote.totalVotes}</span>
      </div>

      <div className="options-list">
        {vote.options.map((opt, idx) => {
          const percent = vote.totalVotes > 0 ? (opt.count / vote.totalVotes) * 100 : 0;
          const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

          return (
            <div key={idx} className="option-item" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="option-row">
                <span className="option-text">{opt.text}</span>
                <button
                  className="vote-btn"
                  onClick={() => handleVote(idx)}
                  disabled={vote.status === 'closed' || voting}
                  style={{ backgroundColor: color }}
                >
                  投票
                </button>
              </div>
              <div className="option-progress-row">
                <AnimatedProgressBar percent={percent} color={color} index={idx} />
                <div className="option-stats">
                  <span className="percent-text" style={{ color }}>
                    {Math.round(percent)}%
                  </span>
                  <span className="count-text">{opt.count}票</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar({
  history,
  currentVoteId,
  onSelectVote,
  onCreateNew,
  filter,
  onFilterChange,
  page,
  totalPages,
  onPageChange,
  total,
}: {
  history: VoteListItem[];
  currentVoteId: string | null;
  onSelectVote: (id: string) => void;
  onCreateNew: () => void;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">🗳️ 团队投票</h1>
      </div>

      <button className="primary-btn create-btn" onClick={onCreateNew}>
        + 创建投票
      </button>

      <div className="filter-buttons">
        {(['all', 'active', 'closed'] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已结束'}
          </button>
        ))}
      </div>

      <div className="history-section">
        <h3 className="section-title">历史记录</h3>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-hint">暂无投票记录</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`history-item ${currentVoteId === item.id ? 'active' : ''}`}
                onClick={() => onSelectVote(item.id)}
              >
                <div className="history-item-title">{item.title}</div>
                <div className="history-item-meta">
                  <span>{formatTime(item.createdAt)}</span>
                  <span className="history-votes">{item.totalVotes}票</span>
                  {item.status === 'closed' && (
                    <span className="mini-closed">已结束</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              上一页
            </button>
            <span className="page-info">
              {page}/{totalPages}（共{total}条）
            </span>
            <button
              className="page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function App() {
  const [view, setView] = useState<ViewType>('create');
  const [currentVoteId, setCurrentVoteId] = useState<string | null>(null);
  const [history, setHistory] = useState<VoteListItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getVotes(page, pageSize, filter);
      setHistory(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const handleVoteCreated = (id: string) => {
    setCurrentVoteId(id);
    setView('result');
    fetchHistory();
  };

  const handleSelectVote = (id: string) => {
    setCurrentVoteId(id);
    setView('result');
  };

  const handleCreateNew = () => {
    setCurrentVoteId(null);
    setView('create');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="app">
      <Sidebar
        history={history}
        currentVoteId={currentVoteId}
        onSelectVote={handleSelectVote}
        onCreateNew={handleCreateNew}
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />

      <main className="main-content">
        <div className="content-wrapper">
          {view === 'create' ? (
            <VoteCreateForm onCreated={handleVoteCreated} />
          ) : (
            currentVoteId && (
              <VoteResultPanel voteId={currentVoteId} onBack={handleCreateNew} />
            )
          )}
        </div>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

const styles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background-color: #0F172A;
    color: #E2E8F0;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }

  .app {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 280px;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    z-index: 100;
  }

  .sidebar-header {
    margin-bottom: 24px;
  }

  .app-title {
    font-size: 20px;
    font-weight: 700;
    color: #E2E8F0;
    letter-spacing: -0.02em;
  }

  .create-btn {
    width: 100%;
    margin-bottom: 20px;
  }

  .filter-buttons {
    display: flex;
    gap: 6px;
    margin-bottom: 20px;
  }

  .filter-btn {
    flex: 1;
    padding: 8px 12px;
    background: rgba(51, 65, 85, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #94A3B8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    color: #E2E8F0;
    background: rgba(51, 65, 85, 0.8);
  }

  .filter-btn.active {
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: white;
    border-color: transparent;
  }

  .history-section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #94A3B8;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .history-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-hint {
    color: #64748B;
    font-size: 13px;
    text-align: center;
    padding: 20px 0;
  }

  .history-item {
    padding: 12px;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .history-item:hover {
    transform: translateY(-2px);
    background: rgba(51, 65, 85, 0.6);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .history-item.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3B82F6;
  }

  .history-item-title {
    font-size: 14px;
    font-weight: 500;
    color: #E2E8F0;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #64748B;
  }

  .history-votes {
    color: #94A3B8;
  }

  .mini-closed {
    background: rgba(239, 68, 68, 0.2);
    color: #F87171;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    gap: 8px;
  }

  .page-btn {
    padding: 6px 12px;
    background: rgba(51, 65, 85, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #94A3B8;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .page-btn:hover:not(:disabled) {
    color: #E2E8F0;
    background: rgba(51, 65, 85, 0.8);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 12px;
    color: #64748B;
  }

  .main-content {
    flex: 1;
    margin-left: 280px;
    display: flex;
    justify-content: center;
    padding: 40px 24px;
  }

  .content-wrapper {
    width: 100%;
    max-width: 1200px;
  }

  .card {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    transition: all 0.2s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #CBD5E1;
    margin-bottom: 8px;
  }

  .input,
  .textarea,
  select {
    width: 100%;
    padding: 12px 14px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid #334155;
    border-radius: 10px;
    color: #E2E8F0;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s ease;
    outline: none;
  }

  .input:focus,
  .textarea:focus,
  select:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.6;
  }

  .duration-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .duration-btn {
    padding: 10px 16px;
    background: rgba(51, 65, 85, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #94A3B8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .duration-btn:hover {
    color: #E2E8F0;
    background: rgba(51, 65, 85, 0.8);
  }

  .duration-btn.active {
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: white;
    border-color: transparent;
  }

  .primary-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .primary-btn:hover {
    filter: brightness(1.1);
  }

  .primary-btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: none;
  }

  .error-msg {
    padding: 12px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #F87171;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .vote-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .back-btn {
    padding: 8px 14px;
    background: rgba(51, 65, 85, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #94A3B8;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .back-btn:hover {
    color: #E2E8F0;
    background: rgba(51, 65, 85, 0.8);
  }

  .closed-badge {
    background: rgba(239, 68, 68, 0.2);
    color: #F87171;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .vote-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #64748B;
    font-size: 13px;
    margin-bottom: 28px;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .option-item {
    animation: slideIn 0.5s ease-out both;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 12px;
  }

  .option-text {
    font-size: 15px;
    font-weight: 500;
    color: #E2E8F0;
    flex: 1;
  }

  .vote-btn {
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .vote-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .vote-btn:active:not(:disabled) {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  .vote-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: none;
  }

  .option-progress-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .progress-bar-container {
    flex: 1;
    animation: slideIn 0.5s ease-out both;
  }

  .progress-bar-bg {
    height: 10px;
    background: rgba(51, 65, 85, 0.6);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
  }

  .option-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 100px;
    justify-content: flex-end;
  }

  .percent-text {
    font-size: 15px;
    font-weight: 700;
    min-width: 42px;
    text-align: right;
  }

  .count-text {
    font-size: 13px;
    color: #94A3B8;
    min-width: 42px;
    text-align: right;
  }

  @media (max-width: 768px) {
    .app {
      flex-direction: column;
    }

    .sidebar {
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: auto;
      width: 100%;
      height: 60px;
      padding: 0 16px;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      overflow-x: auto;
      overflow-y: hidden;
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .sidebar-header {
      margin-bottom: 0;
      flex-shrink: 0;
    }

    .app-title {
      font-size: 16px;
    }

    .create-btn {
      width: auto;
      margin-bottom: 0;
      padding: 8px 16px;
      font-size: 13px;
      flex-shrink: 0;
    }

    .filter-buttons {
      margin-bottom: 0;
      flex-shrink: 0;
    }

    .filter-btn {
      padding: 6px 12px;
      font-size: 12px;
    }

    .history-section {
      display: none;
    }

    .main-content {
      margin-left: 0;
      margin-top: 60px;
      padding: 20px 16px;
    }

    .card {
      padding: 16px;
    }

    .vote-header {
      flex-wrap: wrap;
      gap: 12px;
    }

    .vote-header h2 {
      font-size: 18px;
      order: -1;
      width: 100%;
    }

    .option-stats {
      min-width: 80px;
      gap: 6px;
    }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);
