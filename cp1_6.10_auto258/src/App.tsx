import React, { useState, useEffect, useRef, useCallback } from 'react';
import Recorder from './components/Recorder';
import AudioViz from './components/AudioViz';
import CompareView from './components/CompareView';
import { addRecording, getAllRecordings, searchRecordings, deleteRecording } from './utils/db';
import type { RecordingRecord, ViewMode, VoiceprintData } from './types';
import { v4 as uuidv4 } from 'uuid';

const TAG_COLORS = [
  '#00d4ff', '#ff00d4', '#ff3366', '#00cc99',
  '#ffaa00', '#7c3aed', '#22c55e', '#f43f5e'
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function App() {
  const [recordings, setRecordings] = useState<RecordingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecordings = useCallback(async () => {
    const list = await getAllRecordings();
    setRecordings(list);
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    if (!searchQuery) {
      loadRecordings();
      return;
    }
    const t = setTimeout(async () => {
      const list = await searchRecordings(searchQuery);
      setRecordings(list);
    }, 150);
    return () => clearTimeout(t);
  }, [searchQuery, loadRecordings]);

  const selectedRecording = recordings.find(r => r.id === selectedId) || null;
  const compareRecordings = compareIds
    .map(id => recordings.find(r => r.id === id))
    .filter(Boolean) as RecordingRecord[];

  const handleRecordingComplete = async (data: {
    audioBlob: Blob;
    voiceprint: VoiceprintData;
    duration: number;
  }) => {
    const record: RecordingRecord = {
      id: uuidv4(),
      title: `录音 ${new Date().toLocaleString('zh-CN')}`,
      transcription: '',
      tags: ['未分类'],
      createdAt: Date.now(),
      duration: data.duration,
      audioBlob: data.audioBlob,
      voiceprint: data.voiceprint
    };
    await addRecording(record);
    setShowRecorder(false);
    await loadRecordings();
    setSelectedId(record.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条录音记录？')) return;
    await deleteRecording(id);
    if (selectedId === id) setSelectedId(null);
    setCompareIds(ids => ids.filter(i => i !== id));
    await loadRecordings();
  };

  const toggleCompare = (id: string) => {
    setCompareIds(ids => {
      if (ids.includes(id)) return ids.filter(i => i !== id);
      if (ids.length >= 2) return [ids[1], id];
      return [...ids, id];
    });
  };

  const handleExport = () => {
    const exportData = recordings.map(r => {
      const { audioBlob, ...rest } = r;
      return rest;
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dialect-records-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as RecordingRecord[];
      for (const rec of imported) {
        const existing = recordings.find(r => r.id === rec.id);
        if (!existing) await addRecording(rec);
      }
      await loadRecordings();
      alert(`成功导入 ${imported.length} 条记录`);
    } catch (err) {
      alert('导入失败：JSON格式错误');
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1b2f' }}>
      <nav style={{
        height: 56, background: '#252840', display: 'flex',
        alignItems: 'center', padding: '0 20px', gap: 12,
        borderBottom: '1px solid #3a3e5a', flexShrink: 0
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#00d4ff', marginRight: 8 }}>
          🎙 方言声谱
        </div>

        <div style={{ display: 'none' }} />
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={navBtnStyle}
        >☰</button>

        <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'center',
          ...(menuOpen ? { flexDirection: 'column', position: 'absolute', top: 56, left: 0, right: 0,
            background: '#252840', padding: 12, zIndex: 100, borderBottom: '1px solid #3a3e5a' } : {})
        }}>
          <button onClick={() => setShowRecorder(true)} style={navBtnStyle}>● 录制</button>
          <button
            onClick={() => { setViewMode(viewMode === 'compare' ? 'single' : 'compare'); setMenuOpen(false); }}
            style={{ ...navBtnStyle, ...(viewMode === 'compare' ? { background: '#00d4ff', color: '#0f1120' } : {}) }}
          >⇄ 对比</button>
          <button onClick={handleExport} style={navBtnStyle}>↓ 导出</button>
          <button onClick={handleImportClick} style={navBtnStyle}>↑ 导入</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden',
        flexDirection: 'column',
      }}>
        <aside style={{
          width: '100%', maxHeight: '50vh', background: '#1e2030',
          borderRight: 'none', borderBottom: '1px solid #3a3e5a',
          display: 'flex', flexDirection: 'column', overflow: 'auto',
          flexShrink: 0
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid #3a3e5a' }}>
            <input
              type="text" placeholder="搜索录音、标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', background: '#0f1120',
                border: '1px solid #3a3e5a', borderRadius: 6, color: '#e0e0e0',
                outline: 'none', fontSize: 13
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {recordings.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                暂无录音记录
              </div>
            )}
            {recordings.map(rec => {
              const isSelected = selectedId === rec.id;
              const isCompare = compareIds.includes(rec.id);
              const tagColor = getTagColor(rec.tags[0] || 'default');
              return (
                <div
                  key={rec.id}
                  onClick={() => { setSelectedId(rec.id); setMenuOpen(false); }}
                  style={{
                    padding: '12px 12px 12px 15px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${isSelected ? '#ffffff' : (isCompare ? '#ffaa00' : 'transparent')}`,
                    background: isSelected ? '#3a3e5a' : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = '#2e3150';
                      (e.currentTarget as HTMLDivElement).style.borderLeftColor = tagColor;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      (e.currentTarget as HTMLDivElement).style.borderLeftColor = isCompare ? '#ffaa00' : 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rec.title}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {rec.tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 11, padding: '2px 6px', borderRadius: 3,
                            background: `${getTagColor(tag)}22`, color: getTagColor(tag)
                          }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                        {formatDuration(rec.duration)} · {formatDate(rec.createdAt)}
                      </div>
                    </div>
                    {viewMode === 'compare' && (
                      <input
                        type="checkbox" checked={isCompare}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleCompare(rec.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(rec.id); }}
                      style={{
                        background: 'transparent', border: 'none', color: '#6b7280',
                        cursor: 'pointer', fontSize: 14, padding: 2
                      }}
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main style={{ flex: 1, overflow: 'auto', background: '#1a1b2f' }}>
          {viewMode === 'compare' ? (
            <CompareView recordings={compareRecordings} />
          ) : selectedRecording ? (
            <AudioViz recording={selectedRecording} />
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: 16
            }}>
              <div style={{ fontSize: 64 }}>🎵</div>
              <div style={{ fontSize: 16 }}>选择一条录音查看声纹，或点击「录制」开始</div>
              <button onClick={() => setShowRecorder(true)} style={{
                padding: '10px 24px', background: '#00d4ff', color: '#0f1120',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease-in-out'
              }}>● 开始录制</button>
            </div>
          )}
        </main>
      </div>

      {showRecorder && (
        <Recorder onClose={() => setShowRecorder(false)} onComplete={handleRecordingComplete} />
      )}

      <style>{`
        @media (min-width: 768px) {
          div[style*="flex-direction: column"][style*="height: 100%"] > div:last-child {
            flex-direction: row !important;
          }
          aside {
            width: 300px !important;
            max-height: none !important;
            height: 100% !important;
            border-right: 1px solid #3a3e5a !important;
            border-bottom: none !important;
          }
          button[style*="☰"] { display: none !important; }
          nav > div[style*="position: absolute"] {
            position: static !important;
            flex-direction: row !important;
            padding: 0 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: '6px 14px', background: '#3a3e5a', color: '#e0e0e0',
  border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  transition: 'all 0.2s ease-in-out', whiteSpace: 'nowrap'
};
