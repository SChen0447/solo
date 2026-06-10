import { useState, useEffect } from 'react';
import ExhibitionHall from './components/ExhibitionHall';
import Workspace from './components/Workspace';
import { UserData, Exhibition, loadUserData, saveUserData, defaultUserData, getUsername, setUsername, fetchInsects, Insect } from './utils/db';

type View = 'hall' | 'workspace' | 'view-exhibition' | 'collection';

export default function App() {
  const [view, setView] = useState<View>('hall');
  const [username, setUser] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [insects, setInsects] = useState<Insect[]>([]);
  const [viewingExhibition, setViewingExhibition] = useState<Exhibition | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');

  useEffect(() => {
    const init = async () => {
      const saved = getUsername();
      if (saved) {
        setUser(saved);
        const data = await loadUserData(saved);
        setUserData(data || defaultUserData(saved));
      } else {
        setShowLogin(true);
      }
      const insectList = await fetchInsects();
      setInsects(insectList);
    };
    init();
  }, []);

  const handleLogin = async () => {
    if (!loginInput.trim()) return;
    const name = loginInput.trim();
    setUser(name);
    setUsername(name);
    const data = await loadUserData(name);
    const finalData = data || defaultUserData(name);
    setUserData(finalData);
    await saveUserData(finalData);
    setShowLogin(false);
  };

  const updateData = async (newData: UserData) => {
    setUserData(newData);
    await saveUserData(newData);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showLogin && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(180deg,#3a3a3a,#222)', padding: 40, borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', textAlign: 'center', minWidth: 320
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, color: '#fff' }}>🦋 虚拟昆虫标本博物馆</h2>
            <p style={{ margin: '0 0 24px', color: '#aaa', fontSize: 14 }}>请输入您的策展人昵称</p>
            <input
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="策展人昵称"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #555',
                background: '#1a1a1a', color: '#fff', fontSize: 16, boxSizing: 'border-box',
                outline: 'none', marginBottom: 16
              }}
            />
            <button
              onClick={handleLogin}
              style={{
                width: '100%', padding: '12px 24px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#6b8e23,#556b2f)', color: '#fff',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(107,142,35,0.4)', transition: 'transform 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              进入博物馆
            </button>
          </div>
        </div>
      )}

      <header style={{
        padding: '14px 28px', background: 'rgba(20,20,20,0.85)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #333', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🦋</span>
          <h1 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 600, letterSpacing: 1 }}>
            虚拟昆虫标本博物馆
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {username && (
            <span style={{
              color: '#c9a96e', fontSize: 14, marginRight: 12, fontStyle: 'italic'
            }}>
              欢迎回来，{username}策展人
            </span>
          )}
          <NavBtn label="公共展厅" active={view === 'hall'} onClick={() => setView('hall')} />
          <NavBtn label="个人工作区" active={view === 'workspace'} onClick={() => setView('workspace')} />
          <NavBtn label="个人收藏馆" active={view === 'collection'} onClick={() => setView('collection')} />
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex' }}>
        {view === 'hall' && (
          <ExhibitionHall
            userData={userData}
            insects={insects}
            onEnterExhibition={(ex) => { setViewingExhibition(ex); setView('view-exhibition'); }}
          />
        )}
        {view === 'workspace' && userData && (
          <Workspace
            userData={userData}
            insects={insects}
            onUpdate={updateData}
            formatDate={formatDate}
          />
        )}
        {view === 'view-exhibition' && viewingExhibition && (
          <ExhibitionViewer
            exhibition={viewingExhibition}
            insects={insects}
            onBack={() => setView('hall')}
            userData={userData}
            onUpdate={updateData}
            username={username}
          />
        )}
        {view === 'collection' && userData && (
          <CollectionView
            userData={userData}
            insects={insects}
            formatDate={formatDate}
            onViewExhibition={(ex) => { setViewingExhibition(ex); setView('view-exhibition'); }}
          />
        )}
      </main>
    </div>
  );
}

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 500, transition: 'all 0.3s ease',
        background: active ? 'linear-gradient(135deg,#c9a96e,#8b7355)' : 'transparent',
        color: active ? '#1a1a1a' : '#ccc'
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'rgba(201,169,110,0.15)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

function ExhibitionViewer({
  exhibition, insects, onBack, userData, onUpdate, username
}: {
  exhibition: Exhibition; insects: Insect[]; onBack: () => void;
  userData: UserData | null; onUpdate: (d: UserData) => void; username: string;
}) {
  const [liked, setLiked] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState(userData?.comments.filter(c => c.exhibitionId === exhibition.id) || []);

  useEffect(() => {
    if (userData) {
      const likedList = userData.likes[exhibition.id] || [];
      setLiked(likedList.includes(username));
      setComments(userData.comments.filter(c => c.exhibitionId === exhibition.id));
    }
  }, [userData, exhibition.id, username]);

  const toggleLike = () => {
    if (!userData) return;
    const likes = { ...userData.likes };
    const list = new Set(likes[exhibition.id] || []);
    if (list.has(username)) list.delete(username); else list.add(username);
    likes[exhibition.id] = Array.from(list);
    const exhibitions = userData.exhibitions.map(e =>
      e.id === exhibition.id ? { ...e, likes: likes[exhibition.id].length } : e
    );
    onUpdate({ ...userData, likes, exhibitions });
  };

  const submitComment = () => {
    if (!commentInput.trim() || !userData) return;
    const newComment = {
      id: `c-${Date.now()}`, exhibitionId: exhibition.id,
      author: username, content: commentInput.trim(), createdAt: Date.now()
    };
    onUpdate({ ...userData, comments: [...userData.comments, newComment] });
    setCommentInput('');
  };

  const insectMap = Object.fromEntries(insects.map(i => [i.id, i]));

  return (
    <div style={{ width: '100%', padding: 28, overflowY: 'auto' }}>
      <button onClick={onBack} style={{
        background: 'rgba(255,255,255,0.1)', border: '1px solid #444', color: '#fff',
        padding: '8px 18px', borderRadius: 8, cursor: 'pointer', marginBottom: 20, fontSize: 14
      }}>← 返回公共展厅</button>

      <div style={{
        background: 'linear-gradient(180deg,rgba(60,60,60,0.6),rgba(30,30,30,0.6))',
        borderRadius: 16, padding: 32, border: '1px solid #333'
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 28, color: '#c9a96e' }}>{exhibition.title}</h2>
        <p style={{ margin: '0 0 20px', color: '#888', fontSize: 13 }}>
          策展人：{exhibition.curator} · {new Date(exhibition.createdAt).toLocaleDateString()}
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20, marginTop: 16
        }}>
          {Array.from({ length: 12 }, (_, i) => {
            const spec = exhibition.specimens.find(s => s.position === i);
            if (!spec) return <div key={i} style={{
              width: '100%', aspectRatio: '120/150',
              background: 'rgba(50,50,50,0.4)', borderRadius: 8, border: '1px dashed #444'
            }} />;
            const insect = insectMap[spec.insectId];
            if (!insect) return null;
            const glowRadius = 10 - (spec.hardness - 1) * 2;
            const brightness = 1 + (spec.hardness - 1) * 0.1;
            return (
              <div key={i} style={{
                width: '100%', aspectRatio: '120/150',
                background: spec.bgColor, borderRadius: 8, border: '3px solid #5a3a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: `0 0 ${glowRadius}px rgba(255,220,150,${0.2 + spec.hardness * 0.1}) inset`
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.65)', padding: '4px 8px', zIndex: 2
                }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{insect.name}</span>
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: spec.pose === 'flying' ? `linear-gradient(180deg, transparent 40%, ${spec.bgColor}aa 100%)` : 'transparent',
                  zIndex: 0
                }} />
                <img
                  src={insect.imageUrl}
                  alt={insect.name}
                  style={{
                    width: '75%', height: '75%', objectFit: 'contain',
                    transform: `rotate(${spec.pose === 'flying' ? -15 : spec.pose === 'resting' ? 90 : 0}deg) scale(${brightness})`,
                    filter: `drop-shadow(0 0 ${glowRadius}px rgba(255,220,150,0.5))`,
                    position: 'relative', zIndex: 1, transition: 'transform 0.3s'
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(circle at 50% 40%, rgba(255,255,255,0.15), transparent 60%)`,
                  pointerEvents: 'none', zIndex: 1
                }} />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={toggleLike} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: liked ? 'linear-gradient(135deg,#e74c3c,#c0392b)' : 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 14, fontWeight: 500,
            border: liked ? 'none' : '1px solid #555', transition: 'all 0.3s'
          }}>
            {liked ? '❤️' : '🤍'} 点赞 ({exhibition.likes})
          </button>
        </div>

        <div style={{ marginTop: 28 }}>
          <h3 style={{ color: '#ccc', fontSize: 16, margin: '0 0 12px' }}>观展评论</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="写下您的观展感受..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #444',
                background: '#1a1a1a', color: '#fff', outline: 'none', fontSize: 14
              }}
            />
            <button onClick={submitComment} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#c9a96e,#8b7355)', color: '#1a1a1a',
              fontSize: 14, fontWeight: 600
            }}>发送</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.length === 0 && (
              <p style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 20 }}>
                暂无评论，来发表第一条评论吧！
              </p>
            )}
            {comments.map(c => (
              <div key={c.id} style={{
                background: 'rgba(40,40,40,0.8)', padding: '12px 16px', borderRadius: 8,
                border: '1px solid #333'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#c9a96e', fontSize: 13, fontWeight: 600 }}>{c.author}</span>
                  <span style={{ color: '#666', fontSize: 11 }}>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: 0, color: '#ddd', fontSize: 14 }}>{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionView({
  userData, insects, formatDate, onViewExhibition
}: {
  userData: UserData; insects: Insect[]; formatDate: (n: number) => string;
  onViewExhibition: (e: Exhibition) => void;
}) {
  const badges = [
    { id: 'first', name: '初出茅庐', desc: '完成首个展览', icon: '🌱' },
    { id: 'three', name: '策展新秀', desc: '发布3个展览', icon: '🌿' },
    { id: 'ten', name: '资深策展人', desc: '发布10个展览', icon: '🌳' },
    { id: 'likes50', name: '人气之星', desc: '累计获得50个赞', icon: '⭐' },
    { id: 'allSpecimens', name: '收藏家', desc: '同时展出12个标本', icon: '💎' }
  ];

  const earned = new Set(userData.badges.map(b => b.id));
  const totalLikes = userData.exhibitions.reduce((s, e) => s + e.likes, 0);

  return (
    <div style={{ width: '100%', padding: 28, overflowY: 'auto' }}>
      <h2 style={{ color: '#fff', fontSize: 24, margin: '0 0 24px' }}>
        🏛️ 个人收藏馆 — {userData.username}
      </h2>

      <section style={{ marginBottom: 36 }}>
        <h3 style={{ color: '#c9a96e', fontSize: 18, margin: '0 0 16px' }}>🎖️ 荣誉勋章</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {badges.map(b => {
            const got = earned.has(b.id);
            return (
              <div key={b.id} style={{
                width: 140, padding: 16, borderRadius: 12, textAlign: 'center',
                background: got ? 'linear-gradient(180deg,rgba(201,169,110,0.2),rgba(139,115,85,0.15))'
                  : 'rgba(40,40,40,0.5)',
                border: got ? '1px solid rgba(201,169,110,0.5)' : '1px solid #333',
                opacity: got ? 1 : 0.5, transition: 'all 0.3s'
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{got ? b.icon : '🔒'}</div>
                <div style={{ color: got ? '#c9a96e' : '#666', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {b.name}
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>{b.desc}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, color: '#888', fontSize: 13 }}>
          已发布展览 {userData.exhibitions.length} 个 · 累计获得 {totalLikes} 个赞
        </div>
      </section>

      <section>
        <h3 style={{ color: '#c9a96e', fontSize: 18, margin: '0 0 16px' }}>📚 我的展览</h3>
        {userData.exhibitions.length === 0 ? (
          <div style={{
            padding: 48, textAlign: 'center', background: 'rgba(40,40,40,0.5)',
            borderRadius: 12, border: '1px dashed #444'
          }}>
            <p style={{ color: '#888', margin: 0 }}>还没有展览，去「个人工作区」创作第一个展览吧！</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 20 }}>
            {userData.exhibitions.map(ex => (
              <div key={ex.id} onClick={() => onViewExhibition(ex)} style={{
                background: 'rgba(50,50,50,0.6)', borderRadius: 12, overflow: 'hidden',
                cursor: 'pointer', border: '1px solid #333', transition: 'all 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ aspectRatio: '16/10', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
                  {ex.specimens.slice(0, 4).map((s, i) => {
                    const ins = insects.find(x => x.id === s.insectId);
                    if (!ins) return null;
                    const positions = [[10, 10], [60, 10], [10, 55], [60, 55]];
                    return (
                      <img key={i} src={ins.imageUrl} alt={ins.name}
                        style={{
                          position: 'absolute', left: `${positions[i][0]}%`, top: `${positions[i][1]}%`,
                          width: '30%', height: '35%', objectFit: 'contain', opacity: 0.9
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{ex.title}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>
                    {formatDate(ex.createdAt)} · ❤️ {ex.likes} · 🦋 {ex.specimens.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
