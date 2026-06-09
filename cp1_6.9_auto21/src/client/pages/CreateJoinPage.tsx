import { useState } from 'react';

interface Props {
  penName: string;
  onPenNameChange: (name: string) => void;
  onStoryCreated: (id: string) => void;
  onStoryJoined: (id: string) => void;
}

type Tab = 'create' | 'join';

export default function CreateJoinPage({
  penName,
  onPenNameChange,
  onStoryCreated,
  onStoryJoined
}: Props) {
  const [tab, setTab] = useState<Tab>('create');
  const [title, setTitle] = useState('');
  const [opening, setOpening] = useState('');
  const [joinId, setJoinId] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!penName.trim()) {
      setError('请先输入笔名');
      return;
    }
    if (!title.trim()) {
      setError('请输入故事标题');
      return;
    }
    if (!opening.trim()) {
      setError('请输入开头段落');
      return;
    }
    if (opening.length > 300) {
      setError('开头段落不能超过300字');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          opening: opening.trim(),
          authorName: penName.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '创建失败');
      }
      const data = await res.json();
      setCreatedId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!penName.trim()) {
      setError('请先输入笔名');
      return;
    }
    if (!joinId.trim() || joinId.length !== 6) {
      setError('请输入6位故事ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/story/${joinId.trim().toUpperCase()}`);
      if (!res.ok) throw new Error('故事不存在');
      onStoryJoined(joinId.trim().toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败');
    } finally {
      setLoading(false);
    }
  }

  function copyId() {
    if (createdId) {
      navigator.clipboard.writeText(createdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="page page-create fade-in">
      <div className="create-container">
        <h1 className="app-title">✒️ 故事接龙</h1>
        <p className="app-subtitle">多人共创 · 接力写作 · 每段最多300字</p>

        <div className="pen-name-section">
          <label className="form-label">你的笔名</label>
          <input
            type="text"
            className="form-input"
            placeholder="请输入笔名，无需注册"
            value={penName}
            onChange={(e) => onPenNameChange(e.target.value)}
            maxLength={20}
          />
        </div>

        {createdId ? (
          <div className="id-card fade-in">
            <p className="id-label">故事创建成功！你的故事ID是：</p>
            <p className="id-value">{createdId}</p>
            <p className="id-hint">请将此ID分享给朋友，让他们加入一起创作</p>
            <div className="id-actions">
              <button className="btn btn-secondary" onClick={copyId}>
                {copied ? '已复制 ✓' : '复制ID'}
              </button>
              <button className="btn btn-primary" onClick={() => onStoryCreated(createdId)}>
                进入故事 →
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="tab-switch">
              <button
                className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
                onClick={() => { setTab('create'); setError(''); }}
              >
                创建新故事
              </button>
              <button
                className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
                onClick={() => { setTab('join'); setError(''); }}
              >
                加入已有故事
              </button>
            </div>

            {error && <div className="error-msg fade-in">{error}</div>}

            {tab === 'create' ? (
              <form className="form" onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">故事标题</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="给故事起个名字"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    开头段落 <span className="char-count">{opening.length}/300</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder="写下故事的第一段，作为开头..."
                    value={opening}
                    onChange={(e) => setOpening(e.target.value.slice(0, 300))}
                    rows={5}
                  />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? '创建中...' : '创建故事'}
                </button>
              </form>
            ) : (
              <form className="form" onSubmit={handleJoin}>
                <div className="form-group">
                  <label className="form-label">故事ID</label>
                  <input
                    type="text"
                    className="form-input form-input-id"
                    placeholder="输入6位字母数字ID"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? '加入中...' : '加入故事'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
