import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionApi, exhibitApi } from '../utils/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Exhibition, Exhibit } from '../../shared/types';
import ExhibitionThumbnail from '../components/ExhibitionThumbnail';

export default function Dashboard() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exhibitsMap, setExhibitsMap] = useState<Record<string, Exhibit[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#66aaff');
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const list = await exhibitionApi.list();
      setExhibitions(list);
      const map: Record<string, Exhibit[]> = {};
      for (const e of list) {
        try {
          map[e.id] = await exhibitApi.list(e.id);
        } catch {
          map[e.id] = [];
        }
      }
      setExhibitsMap(map);
    } catch (err: any) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const exhib = await exhibitionApi.create(newName.trim(), newColor);
      setShowCreate(false);
      setNewName('');
      setNewColor('#66aaff');
      await loadData();
      navigate(`/exhibition/${exhib.id}/edit`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: 0
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffaa66, #66aaff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            策展台
          </h1>
          <p style={{ color: '#a0a0cc', fontSize: 13, marginTop: 4 }}>
            欢迎, {user?.username}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate('/gallery')} style={{ fontSize: 13 }}>
            公共画廊
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ fontSize: 13 }}>
            + 新建展厅
          </button>
          <button className="btn" onClick={logout} style={{ fontSize: 13 }}>
            退出
          </button>
        </div>
      </header>

      <main style={{ padding: '40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#a0a0cc' }}>加载中...</div>
        ) : exhibitions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 60, marginBottom: 20, opacity: 0.3 }}>✦</div>
            <h2 style={{ color: '#a0a0cc', marginBottom: 12 }}>还没有展厅</h2>
            <p style={{ color: '#8080a0', marginBottom: 24 }}>创建您的第一个虚拟数字藏品展厅</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + 创建展厅
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'flex-start'
          }}>
            {exhibitions.map(exhibition => (
              <ExhibitionThumbnail
                key={exhibition.id}
                exhibition={exhibition}
                exhibits={exhibitsMap[exhibition.id] || []}
                onClick={() => navigate(`/exhibition/${exhibition.id}/edit`)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 24, fontSize: 20 }}>创建新展厅</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#a0a0cc' }}>
                  展厅名称
                </label>
                <input
                  className="input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：光之序曲数字艺术展"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#a0a0cc' }}>
                  主题色
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: 50, height: 40,
                      borderRadius: 8, border: '1px solid var(--border-color)',
                      background: 'transparent', cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: '#a0a0cc', fontSize: 13 }}>{newColor}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleCreate}>创建</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
