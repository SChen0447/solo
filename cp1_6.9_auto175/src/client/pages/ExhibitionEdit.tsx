import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exhibitionApi, exhibitApi } from '../utils/api';
import type { Exhibition, Exhibit } from '../../shared/types';

const CANVAS_W = 1200;
const CANVAS_H = 700;
const PEDESTAL_SIZE = 140;

export default function ExhibitionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const animRef = useRef<number>();

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.016;
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const loadData = async () => {
    if (!id) return;
    try {
      const exhib = await exhibitionApi.get(id);
      setExhibition(exhib);
      const list = await exhibitApi.list(id);
      setExhibits(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdd = async () => {
    if (!id || !newName.trim()) return;
    try {
      const ex = await exhibitApi.create({
        exhibitionId: id,
        name: newName.trim(),
        description: newDesc.trim(),
        x: 300 + Math.random() * 600,
        y: 200 + Math.random() * 300,
        lightType: 'pulse',
        glowColor: '#ffaa66'
      });
      setExhibits([...exhibits, ex]);
      setShowAdd(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (exId: string, patch: Partial<Exhibit>) => {
    try {
      const updated = await exhibitApi.update(exId, patch);
      setExhibits(exhibits.map(e => e.id === exId ? updated : e));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (exId: string) => {
    if (!confirm('确定删除该展品？')) return;
    try {
      await exhibitApi.remove(exId);
      setExhibits(exhibits.filter(e => e.id !== exId));
      if (selectedId === exId) setSelectedId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, ex: Exhibit) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedId(ex.id);
    setDragging({
      id: ex.id,
      offsetX: e.clientX - rect.left - ex.x,
      offsetY: e.clientY - rect.top - ex.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(PEDESTAL_SIZE / 2, Math.min(CANVAS_W - PEDESTAL_SIZE / 2, e.clientX - rect.left - dragging.offsetX));
    const y = Math.max(PEDESTAL_SIZE / 2, Math.min(CANVAS_H - PEDESTAL_SIZE / 2, e.clientY - rect.top - dragging.offsetY));
    setExhibits(exhibits.map(ex =>
      ex.id === dragging.id ? { ...ex, x, y } : ex
    ));
  };

  const handleMouseUp = () => {
    if (dragging) {
      const updated = exhibits.find(e => e.id === dragging.id);
      if (updated) handleUpdate(dragging.id, { x: updated.x, y: updated.y });
    }
    setDragging(null);
  };

  const selected = exhibits.find(e => e.id === selectedId);

  const renderGlow = (ex: Exhibit) => {
    const t = timeRef.current;
    switch (ex.lightType) {
      case 'pulse': {
        const scale = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2));
        return (
          <div style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${ex.glowColor}66 0%, transparent 70%)`,
            transform: `scale(${scale})`,
            transition: 'transform 0.1s ease-out',
            pointerEvents: 'none'
          }} />
        );
      }
      case 'rotate': {
        return (
          <div style={{
            position: 'absolute',
            inset: -15,
            borderRadius: '50%',
            background: `conic-gradient(from ${(t * 120) % 360}deg, transparent 0%, ${ex.glowColor}88 25%, transparent 50%)`,
            pointerEvents: 'none'
          }} />
        );
      }
      case 'ripple': {
        const phase = (t % 2) / 2;
        return (
          <>
            {[0, 1, 2].map(i => {
              const p = ((phase + i / 3) % 1);
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: PEDESTAL_SIZE + p * 80,
                  height: PEDESTAL_SIZE + p * 80,
                  marginLeft: -(PEDESTAL_SIZE + p * 80) / 2,
                  marginTop: -(PEDESTAL_SIZE + p * 80) / 2,
                  borderRadius: '50%',
                  border: `2px solid ${ex.glowColor}`,
                  opacity: (1 - p) * 0.6,
                  pointerEvents: 'none'
                }} />
              );
            })}
          </>
        );
      }
    }
  };

  if (!exhibition) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#a0a0cc' }}>加载中...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(26, 26, 46, 0.7)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn" onClick={() => navigate('/dashboard')} style={{ fontSize: 13 }}>← 返回</button>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#e0e0ff' }}>{exhibition.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => navigate(`/gallery/${exhibition.id}`)} style={{ fontSize: 13 }}>预览漫游</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 13 }}>+ 添加展品</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedId(null)}
          style={{
            flex: 1,
            position: 'relative',
            background: 'radial-gradient(ellipse at center, #141428 0%, #0a0a14 80%)',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'default'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(68, 85, 170, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(68, 85, 170, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            pointerEvents: 'none'
          }} />

          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102, 170, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {exhibits.map(ex => (
            <div
              key={ex.id}
              onMouseDown={(e) => handleMouseDown(e, ex)}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: ex.x - PEDESTAL_SIZE / 2,
                top: ex.y - PEDESTAL_SIZE / 2,
                width: PEDESTAL_SIZE,
                height: PEDESTAL_SIZE,
                cursor: selectedId === ex.id ? 'grab' : 'pointer',
                userSelect: 'none',
                zIndex: selectedId === ex.id ? 20 : 10
              }}
            >
              {renderGlow(ex)}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #2a2a4e 0%, #1a1a2e 60%, #0f0f1a 100%)',
                border: `2px solid ${selectedId === ex.id ? '#66aaff' : ex.glowColor}`,
                boxShadow: `0 0 20px ${ex.glowColor}44, inset 0 0 30px rgba(0,0,0,0.5)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.2s'
              }}>
                <div style={{
                  width: PEDESTAL_SIZE * 0.5,
                  height: PEDESTAL_SIZE * 0.5,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${ex.glowColor}aa 0%, ${ex.glowColor}33 60%, transparent 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24
                }}>
                  ✦
                </div>
              </div>
              <div style={{
                position: 'absolute',
                bottom: -26,
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 12,
                color: '#a0a0cc',
                textAlign: 'center'
              }}>
                {ex.name}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div style={{
            width: 320,
            background: '#1a1a2e',
            borderLeft: '1px solid var(--border-color)',
            padding: 24,
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>展品属性</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>展品名称</label>
                <input
                  className="input"
                  value={selected.name}
                  onChange={(e) => handleUpdate(selected.id, { name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>展品描述</label>
                <textarea
                  className="input"
                  value={selected.description}
                  onChange={(e) => handleUpdate(selected.id, { description: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>光效类型</label>
                <select
                  className="input"
                  value={selected.lightType}
                  onChange={(e) => handleUpdate(selected.id, { lightType: e.target.value as any })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="pulse">脉动光</option>
                  <option value="rotate">旋转流光</option>
                  <option value="ripple">扩散波纹光</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>光晕颜色</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={selected.glowColor}
                    onChange={(e) => handleUpdate(selected.id, { glowColor: e.target.value })}
                    style={{
                      width: 50, height: 40,
                      borderRadius: 8, border: '1px solid var(--border-color)',
                      background: 'transparent', cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: '#a0a0cc', fontSize: 13 }}>{selected.glowColor}</span>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn"
                  onClick={() => handleDelete(selected.id)}
                  style={{ width: '100%', background: 'rgba(255, 107, 157, 0.1)', borderColor: 'rgba(255, 107, 157, 0.3)', color: '#ff6b9d' }}
                >
                  删除展品
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAdd(false)}>
          <div className="card" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 24, fontSize: 20 }}>添加新展品</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>展品名称</label>
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：量子波动" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#a0a0cc' }}>展品描述</label>
                <textarea className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="描述这件数字藏品..." />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleAdd}>添加</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
