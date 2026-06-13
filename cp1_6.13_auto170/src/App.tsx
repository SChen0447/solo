import React, { useState, useEffect, useCallback, useRef } from 'react';
import MuseumSpace from './components/MuseumSpace';

export interface OrbData {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  memory: string;
  createdAt: number;
}

interface SelectedOrbInfo {
  orb: OrbData;
  screenX: number;
  screenY: number;
}

interface PendingPlacement {
  x: number;
  z: number;
}

const App: React.FC = () => {
  const [orbs, setOrbs] = useState<OrbData[]>([]);
  const [selectedOrb, setSelectedOrb] = useState<SelectedOrbInfo | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [memoryText, setMemoryText] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetch('/api/orbs')
      .then(res => res.json())
      .then((data: OrbData[]) => setOrbs(data))
      .catch(err => console.error('获取光球失败:', err));
  }, []);

  const handleOrbClick = useCallback((orb: OrbData, screenX: number, screenY: number) => {
    setSelectedOrb({ orb, screenX, screenY });
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedOrb(null);
  }, []);

  const handleGroundDoubleClick = useCallback((x: number, z: number) => {
    setPendingPlacement({ x, z });
    setMemoryText('');
  }, []);

  const handlePlaceMemory = useCallback(async () => {
    if (!pendingPlacement) return;
    const text = memoryText.trim() || '这里曾有一段回忆';
    try {
      const res = await fetch('/api/orbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: pendingPlacement.x,
          y: 15 + Math.random() * 20,
          z: pendingPlacement.z,
          memory: text.slice(0, 200)
        })
      });
      const newOrb: OrbData = await res.json();
      setOrbs(prev => [...prev, newOrb]);
    } catch (err) {
      console.error('创建光球失败:', err);
    }
    setPendingPlacement(null);
    setMemoryText('');
  }, [pendingPlacement, memoryText]);

  const handleCancelPlacement = useCallback(() => {
    setPendingPlacement(null);
    setMemoryText('');
  }, []);

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePlaceMemory();
    }
  }, [handlePlaceMemory]);

  return (
    <div className="app-container">
      <MuseumSpace
        orbs={orbs}
        onOrbClick={handleOrbClick}
        onBackgroundClick={handleBackgroundClick}
        onGroundDoubleClick={handleGroundDoubleClick}
      />

      <div className="hud-top">
        <h1 className="hud-title">浮 光 · 漫 记 馆</h1>
        <p className="hud-subtitle">A MUSEUM OF FLOATING MEMORIES</p>
      </div>

      <div className="hud-hint">
        拖拽鼠标 · 漫步空间 &nbsp;|&nbsp; 滚轮 · 缩放视角 &nbsp;|&nbsp;
        点击光球 · 聆听记忆 &nbsp;|&nbsp; 双击地面 · 放置回忆
      </div>

      {selectedOrb && (
        <div
          className="memory-card"
          style={{ left: selectedOrb.screenX, top: selectedOrb.screenY }}
        >
          {selectedOrb.orb.memory}
        </div>
      )}

      {pendingPlacement && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">放 置 记 忆</h2>
            <p className="modal-desc">将一段文字封存为漂浮的光球</p>
            <textarea
              className="modal-textarea"
              placeholder="写下你的回忆…（最多200字）"
              maxLength={200}
              value={memoryText}
              onChange={e => setMemoryText(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              autoFocus
            />
            <div className="modal-counter">{memoryText.length} / 200</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCancelPlacement}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handlePlaceMemory}>
                放 置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
