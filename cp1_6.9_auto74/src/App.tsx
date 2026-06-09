import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { WorkshopScene, CapsuleData } from './WorkshopScene';
import { CapsuleForm, CapsuleFormData } from './components/CapsuleForm';

interface FullCapsuleData extends CapsuleData {
  text: string;
  drawing: Array<{ x: number; y: number; color: string }>;
  author: string;
  likes: number;
  replies: Array<{ id: string; text: string; createdAt: number }>;
}

const BOTTLE_DATA = [
  { color: '#e74c3c', label: '热情红' },
  { color: '#f39c12', label: '活力橙' },
  { color: '#2ecc71', label: '生机绿' },
  { color: '#3498db', label: '宁静蓝' },
  { color: '#9b59b6', label: '神秘紫' },
];

function getAgingInfo(createdAt: number) {
  const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
  const hasCracks = ageHours > 1;
  const hasMoss = ageHours > 24;
  const fullyMossed = ageHours > 168;
  return { hasCracks, hasMoss, fullyMossed };
}

function renderDrawing(drawing: Array<{ x: number; y: number; color: string }>, size: number = 160) {
  const gridSize = 40;
  const pixelSize = size / gridSize;
  return (
    <canvas
      className="drawing-canvas"
      width={size}
      height={size}
      ref={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#faf6e8';
        ctx.fillRect(0, 0, size, size);
        drawing.forEach(({ x, y, color }) => {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize + 0.5, pixelSize + 0.5);
        });
      }}
    />
  );
}

const App: React.FC = () => {
  const workshopRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WorkshopScene | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#e74c3c');
  const [showPlaza, setShowPlaza] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailCapsule, setDetailCapsule] = useState<FullCapsuleData | null>(null);
  const [poolHover, setPoolHover] = useState(false);
  const [allCapsules, setAllCapsules] = useState<FullCapsuleData[]>([]);
  const [notification, setNotification] = useState<{ id: string; text: string } | null>(null);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [capsulePulse, setCapsulePulse] = useState(false);
  const [floatingBubbles, setFloatingBubbles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (workshopRef.current && !sceneRef.current) {
      const scene = new WorkshopScene(workshopRef.current);
      sceneRef.current = scene;
      
      scene.onCapsuleDropped = () => {
        setShowForm(true);
      };
      
      scene.onPoolHover = (hovering) => {
        setPoolHover(hovering);
      };
      
      scene.onCapsuleUnlocked = (capsule) => {
        setNotification({
          id: capsule.id,
          text: '一颗时光胶囊已经成熟，快来看看里面藏着什么吧！',
        });
        setTimeout(() => setNotification(null), 6000);
      };
      
      scene.start();
      setIsLoading(false);
    }

    return () => {
      if (sceneRef.current) {
        sceneRef.current.stop();
        sceneRef.current = null;
      }
    };
  }, []);

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await fetch('/api/capsules');
      const data = await res.json();
      setAllCapsules(data);
      if (sceneRef.current) {
        data.forEach((cap: FullCapsuleData) => {
          const existing = sceneRef.current!.getPoolCapsules().find(c => c.id === cap.id);
          if (!existing) {
            sceneRef.current!.addCapsuleToPool({
              id: cap.id,
              emotionColor: cap.emotionColor,
              createdAt: cap.createdAt,
              unlockAt: cap.unlockAt,
            });
          }
        });
      }
    } catch (e) {
      console.error('Failed to fetch capsules:', e);
    }
  }, []);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  const handleBottleClick = (color: string) => {
    setSelectedColor(color);
    if (sceneRef.current) {
      sceneRef.current.startDragging(color);
    }
  };

  const handleFormSubmit = async (data: CapsuleFormData) => {
    setShowForm(false);
    
    if (sceneRef.current) {
      sceneRef.current.spawnGoldParticles(new THREE.Vector3(0, 0.3, 0));
    }
    
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newCapsule = await res.json();
      
      if (sceneRef.current) {
        sceneRef.current.addCapsuleToPool({
          id: newCapsule.id,
          emotionColor: newCapsule.emotionColor,
          createdAt: newCapsule.createdAt,
          unlockAt: newCapsule.unlockAt,
        });
      }
      
      await fetchCapsules();
    } catch (e) {
      console.error('Failed to create capsule:', e);
    }
  };

  const handleCapsuleClick = (capsule: FullCapsuleData) => {
    const isUnlocked = capsule.unlockAt === 0 || Date.now() >= capsule.unlockAt;
    if (!isUnlocked) {
      setNotification({
        id: capsule.id,
        text: '这颗胶囊还未到开启时间，请耐心等待...',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setDetailCapsule(capsule);
    setShowDetail(true);
    setShowReplyInput(false);
    setReplyText('');
  };

  const handleLike = async () => {
    if (!detailCapsule) return;
    setCapsulePulse(true);
    setTimeout(() => setCapsulePulse(false), 600);
    
    try {
      const res = await fetch(`/api/capsules/${detailCapsule.id}/like`, { method: 'POST' });
      const { likes } = await res.json();
      setDetailCapsule({ ...detailCapsule, likes });
      setAllCapsules(prev => prev.map(c => c.id === detailCapsule.id ? { ...c, likes } : c));
    } catch (e) {
      console.error('Failed to like capsule:', e);
    }
  };

  const handleReplySubmit = async () => {
    if (!detailCapsule || !replyText.trim()) return;
    
    try {
      const res = await fetch(`/api/capsules/${detailCapsule.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      const newReply = await res.json();
      const updatedReplies = [...(detailCapsule.replies || []), newReply];
      setDetailCapsule({ ...detailCapsule, replies: updatedReplies });
      setAllCapsules(prev => prev.map(c => c.id === detailCapsule.id ? { ...c, replies: updatedReplies } : c));
      
      const bubbles = Array.from({ length: 3 }, (_, i) => ({
        id: Date.now() + i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 30,
        delay: i * 0.3,
      }));
      setFloatingBubbles(bubbles);
      setTimeout(() => setFloatingBubbles([]), 4000);
      
      setReplyText('');
      setShowReplyInput(false);
    } catch (e) {
      console.error('Failed to reply:', e);
    }
  };

  const bottleLabels = ['热情', '活力', '生机', '宁静', '神秘'];

  return (
    <div className="app-container">
      <div className="title-bar">
        <span className="title-text">⏳ 虚拟时光胶囊工坊 ⏳</span>
      </div>

      <div className="main-content">
        <div className="tool-panel">
          <div>
            <div className="panel-title">🧪 颜色瓶子</div>
            <div className="bottle-selector">
              {BOTTLE_DATA.map((bottle, i) => (
                <div
                  key={bottle.color}
                  className="bottle-item"
                  style={{
                    background: `linear-gradient(180deg, ${bottle.color}dd 0%, ${bottle.color} 100%)`,
                  }}
                  onClick={() => handleBottleClick(bottle.color)}
                  draggable
                  onDragStart={() => handleBottleClick(bottle.color)}
                >
                  {bottleLabels[i]}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="panel-title">⚙️ 操作</div>
            <button
              className="seal-button"
              onClick={() => setShowForm(true)}
              title="直接创建胶囊"
            >
              封印
            </button>
          </div>
        </div>

        <div className="workshop-area" ref={workshopRef}>
          <div className={`pool-view ${poolHover ? 'visible' : ''}`}>
            <div className="pool-view-title">🌊 时间池</div>
            <div className="pool-capsules">
              {sceneRef.current?.getPoolCapsules().slice(0, 12).map((cap) => {
                const aging = getAgingInfo(cap.createdAt);
                return (
                  <div
                    key={cap.id}
                    className="pool-capsule-icon"
                    style={{
                      background: aging.fullyMossed
                        ? '#4a7c59'
                        : aging.hasMoss
                        ? `${cap.emotionColor}aa`
                        : cap.emotionColor,
                    }}
                  >
                    {aging.hasCracks && (
                      <div className="aging-icons">
                        <span className="aging-icon">💔</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="plaza-button"
            onClick={() => setShowPlaza(true)}
            title="胶囊广场"
          >
            🏰
          </button>
        </div>
      </div>

      {showForm && (
        <CapsuleForm
          initialColor={selectedColor}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showPlaza && (
        <div className="plaza-modal" onClick={() => setShowPlaza(false)}>
          <div className="plaza-content" onClick={(e) => e.stopPropagation()}>
            <div className="plaza-header">
              <span className="plaza-title">🏰 胶囊广场</span>
              <button className="close-button" onClick={() => setShowPlaza(false)}>
                ×
              </button>
            </div>
            <div className="capsule-grid">
              {allCapsules.map((capsule) => {
                const aging = getAgingInfo(capsule.createdAt);
                const displayColor = aging.fullyMossed ? '#4a7c59' : capsule.emotionColor;
                return (
                  <div
                    key={capsule.id}
                    className="capsule-card"
                    onClick={() => handleCapsuleClick(capsule)}
                  >
                    <div style={{ position: 'relative' }}>
                      <div
                        className="capsule-thumbnail"
                        style={{ background: displayColor }}
                      />
                      {(aging.hasCracks || aging.hasMoss) && (
                        <div className="aging-icons">
                          {aging.hasCracks && <span className="aging-icon">💔</span>}
                          {aging.hasMoss && <span className="aging-icon">🍃</span>}
                        </div>
                      )}
                    </div>
                    <div className="capsule-author">{capsule.author}</div>
                    <div style={{ fontSize: '10px', color: '#8b451388' }}>
                      ❤️ {capsule.likes || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showDetail && detailCapsule && (
        <div className="detail-modal" onClick={() => setShowDetail(false)}>
          <div className="detail-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              style={{ position: 'absolute', top: 16, right: 16 }}
              onClick={() => setShowDetail(false)}
            >
              ×
            </button>
            
            <div style={{ position: 'relative' }}>
              <div
                className={`detail-capsule ${capsulePulse ? 'pulse' : ''}`}
                style={{ background: detailCapsule.emotionColor }}
              />
              {floatingBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="floating-bubble"
                  style={{
                    width: 20 + Math.random() * 15,
                    height: 20 + Math.random() * 15,
                    left: `${bubble.x}%`,
                    top: `${bubble.y}%`,
                    animationDelay: `${bubble.delay}s`,
                  }}
                />
              ))}
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: 12, color: '#8b4513', fontWeight: 'bold' }}>
              — {detailCapsule.author} —
            </div>
            
            <div className="detail-text">{detailCapsule.text || '（没有文字内容）'}</div>
            
            {detailCapsule.drawing && detailCapsule.drawing.length > 0 && (
              <div className="detail-drawing">
                {renderDrawing(detailCapsule.drawing)}
              </div>
            )}
            
            <div className="detail-actions">
              <button className="action-button" onClick={handleLike}>
                ❤️ 点赞 <span className="likes-count">{detailCapsule.likes || 0}</span>
              </button>
              <button className="action-button" onClick={() => setShowReplyInput(!showReplyInput)}>
                💬 回复
              </button>
            </div>
            
            {showReplyInput && (
              <div className="reply-section">
                <textarea
                  className="reply-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 140))}
                  placeholder="写下你的回复..."
                  maxLength={140}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '12px', color: '#8b4513', alignSelf: 'center' }}>
                    {replyText.length}/140
                  </span>
                  <button className="action-button" onClick={handleReplySubmit} style={{ padding: '6px 14px', fontSize: '12px' }}>
                    发送
                  </button>
                </div>
              </div>
            )}
            
            {detailCapsule.replies && detailCapsule.replies.length > 0 && (
              <div className="reply-bubbles">
                {detailCapsule.replies.map((reply) => (
                  <div key={reply.id} className="reply-bubble">
                    {reply.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {notification && (
        <div className="notification-card">
          <div className="notification-title">✨ 时光通知</div>
          <div className="notification-text">{notification.text}</div>
          <button
            className="notification-action"
            onClick={() => {
              setNotification(null);
              setShowPlaza(true);
            }}
          >
            查看详情
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
