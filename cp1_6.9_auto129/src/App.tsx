import { useState, useEffect } from 'react';
import ColorMixer from './components/ColorMixer';

interface EmotionColor {
  id: string;
  color: string;
  name: string;
  frequency: number;
}

interface Clip {
  id: string;
  colors: { emotionId: string; weight: number }[];
  mixedColor: string;
  frequency: number;
  note?: string;
  order: number;
}

function App() {
  const [emotions, setEmotions] = useState<EmotionColor[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [shareId, setShareId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  const currentPath = window.location.pathname;
  const shareMatch = currentPath.match(/^\/share\/(.+)$/);

  useEffect(() => {
    fetch('/api/emotions')
      .then((res) => res.json())
      .then((data) => setEmotions(data));
  }, []);

  useEffect(() => {
    if (shareMatch) {
      setViewOnly(true);
      fetch(`/api/share/${shareMatch[1]}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then((data) => {
          setClips(data.clips.sort((a: Clip, b: Clip) => a.order - b.order));
          setShareId(shareMatch[1]);
        })
        .catch(() => {
          window.location.href = '/';
        });
    } else {
      fetch('/api/clips')
        .then((res) => res.json())
        .then((data) => setClips(data));
    }
  }, [shareMatch?.[1]]);

  const handleAddClip = async (clip: Omit<Clip, 'id' | 'order'>) => {
    if (viewOnly) return;
    const res = await fetch('/api/clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clip)
    });
    const newClip = await res.json();
    setClips((prev) => [...prev, newClip]);
  };

  const handleUpdateClip = async (id: string, updates: Partial<Clip>) => {
    if (viewOnly) return;
    await fetch(`/api/clips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleReorderClips = async (newClips: Clip[]) => {
    if (viewOnly) return;
    setClips(newClips);
    const orders = newClips.map((c, i) => ({ id: c.id, order: i }));
    await fetch('/api/clips/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
  };

  const handleDeleteClip = async (id: string) => {
    if (viewOnly) return;
    await fetch(`/api/clips/${id}`, { method: 'DELETE' });
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const handleShare = async () => {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips })
    });
    const data = await res.json();
    setShareUrl(`${window.location.origin}${data.shareUrl}`);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1
            style={{
              color: '#e0e0f0',
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '4px'
            }}
          >
            虚拟情绪光谱调色板
          </h1>
          <p style={{ color: '#8888a0', fontSize: '14px' }}>
            选择和混合情绪色块，生成动态色彩声音片段
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {viewOnly ? (
            <span
              style={{
                padding: '8px 16px',
                background: '#3a3a4a',
                color: '#a0a0c0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              只读模式 - 分享作品 #{shareId}
            </span>
          ) : (
            <>
              <button
                onClick={handleShare}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #9966ff, #66ccff)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                分享作品
              </button>
            </>
          )}
        </div>
      </div>
      {shareUrl && (
        <div
          style={{
            background: '#2a2a3a',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #3a3a5a'
          }}
        >
          <span style={{ color: '#a0a0c0', fontSize: '13px' }}>分享链接:</span>
          <code
            style={{
              color: '#66ffcc',
              fontSize: '13px',
              flex: 1,
              wordBreak: 'break-all'
            }}
          >
            {shareUrl}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
            }}
            style={{
              padding: '6px 12px',
              background: '#3a3a5a',
              color: '#e0e0f0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            复制
          </button>
          <button
            onClick={() => setShareUrl('')}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: '#8888a0',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            关闭
          </button>
        </div>
      )}
      <ColorMixer
        emotions={emotions}
        clips={clips}
        viewOnly={viewOnly}
        onAddClip={handleAddClip}
        onUpdateClip={handleUpdateClip}
        onReorderClips={handleReorderClips}
        onDeleteClip={handleDeleteClip}
      />
    </div>
  );
}

export default App;
