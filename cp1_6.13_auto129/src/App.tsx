import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RecorderPanel from './components/RecorderPanel';
import SheetMusic from './components/SheetMusic';
import ChordsPanel from './components/ChordsPanel';
import AccompanimentMixer from './components/AccompanimentMixer';
import {
  apiService,
  type Note,
  type ChordProgression,
  type Accompaniment,
  type MelodyArchive,
  type Chord,
} from './services/apiService';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [bpm, setBpm] = useState<number>(100);
  const [key, setKey] = useState<string>('');
  const [timeSignature, setTimeSignature] = useState<string>('4/4');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressions, setProgressions] = useState<ChordProgression[]>([]);
  const [selectedProgressionId, setSelectedProgressionId] = useState<number | null>(null);
  const [selectedChords, setSelectedChords] = useState<Chord[]>([]);
  const [isGeneratingAccompaniment, setIsGeneratingAccompaniment] = useState(false);
  const [accompanimentProgress, setAccompanimentProgress] = useState(0);
  const [accompaniment, setAccompaniment] = useState<Accompaniment | null>(null);

  const [playbackTime, setPlaybackTime] = useState(0);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(80);

  const [archives, setArchives] = useState<MelodyArchive[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [archiveDescription, setArchiveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadArchives = useCallback(async () => {
    try {
      const data = await apiService.loadArchives();
      setArchives(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await apiService.analyzeAudio({ audio: 'simulated_audio_data' });
      setNotes(result.notes);
      setBpm(result.bpm);
      setKey(result.key);
      setTimeSignature(result.timeSignature);
      setProgressions([]);
      setSelectedProgressionId(null);
      setSelectedChords([]);
      setAccompaniment(null);

      const chordResult = await apiService.generateChords(result.notes);
      setProgressions(chordResult);
    } catch (err: any) {
      console.error('分析失败:', err.message || err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectProgression = (progression: ChordProgression) => {
    setSelectedProgressionId(progression.id);
    setSelectedChords(progression.chords);
    setAccompaniment(null);
  };

  const handleGenerateAccompaniment = async () => {
    if (selectedChords.length === 0) return;
    setIsGeneratingAccompaniment(true);
    setAccompanimentProgress(0);
    try {
      const result = await apiService.generateAccompaniment(
        bpm,
        selectedChords,
        (p) => setAccompanimentProgress(p)
      );
      setAccompaniment(result);
    } catch (err: any) {
      console.error('生成伴奏失败:', err.message || err);
    } finally {
      setIsGeneratingAccompaniment(false);
      setTimeout(() => setAccompanimentProgress(0), 1500);
    }
  };

  const handleSave = async () => {
    if (!archiveName.trim()) return;
    setIsSaving(true);
    try {
      const res = await apiService.saveArchive({
        name: archiveName.trim(),
        description: archiveDescription.trim(),
        bpm,
        key,
        notes,
        chords: selectedChords,
        accompaniment,
      });
      if (res.success) {
        await loadArchives();
        setShowSaveModal(false);
        setArchiveName('');
        setArchiveDescription('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadArchive = (archive: MelodyArchive) => {
    setNotes(archive.notes || []);
    setBpm(archive.bpm || 100);
    setKey(archive.key || '');
    setSelectedChords(archive.chords || []);
    setAccompaniment(archive.accompaniment || null);
    if (archive.chords && archive.chords.length > 0) {
      setSelectedProgressionId(1);
      setProgressions([{ id: 1, name: '已保存方案', description: '从档案中恢复', chords: archive.chords }]);
    }
  };

  const canSave = notes.length > 0;
  const totalDuration = notes.reduce((m, n) => Math.max(m, n.start + n.duration), 0);

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="logograd" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00b4d8" />
                  <stop offset="100%" stopColor="#7209b7" />
                </linearGradient>
              </defs>
              <path d="M9 18V5l12-2v13" stroke="url(#logograd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" stroke="url(#logograd)" strokeWidth="2" />
              <circle cx="18" cy="16" r="3" stroke="url(#logograd)" strokeWidth="2" />
            </svg>
            <span className="gradient-text">音轨·旋律工坊</span>
          </div>
          <div className="nav-right">
            <button
              className="gradient-btn"
              disabled={!canSave}
              onClick={() => setShowSaveModal(true)}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                保存为旋律档案
              </span>
            </button>
          </div>
        </nav>

        <div className="main-content">
          <div className="left-panel">
            <RecorderPanel
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyze}
            />

            <div className="panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="section-title">已保存旋律档案</div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {archives.length === 0 ? (
                  <div style={{ color: '#778da9', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    暂无保存的档案<br />点击上方按钮保存当前创作
                  </div>
                ) : (
                  archives.map((a) => (
                    <div
                      key={a.id}
                      className="archive-item fade-in"
                      onClick={() => handleLoadArchive(a)}
                    >
                      <div className="archive-name" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{a.name}</div>
                      <div className="archive-meta">
                        <span>{a.createdAt ? formatDate(a.createdAt) : '-'}</span>
                        <span>♩ {a.bpm}</span>
                        <span>{a.notes?.length || 0}音</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="center-panel">
            <SheetMusic
              notes={notes}
              bpm={bpm}
              key={key || undefined}
              currentTime={playbackTime}
            />

            <ChordsPanel
              progressions={progressions}
              selectedId={selectedProgressionId}
              onSelect={handleSelectProgression}
              isGenerating={isGeneratingAccompaniment}
              onGenerateAccompaniment={handleGenerateAccompaniment}
            />
          </div>

          <div className="right-panel">
            {isGeneratingAccompaniment && accompanimentProgress > 0 && (
              <div className="panel fade-in">
                <div className="section-title">伴奏生成进度</div>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>AI正在编排多轨伴奏...</span>
                  <span className="gradient-text" style={{ fontWeight: 700 }}>{accompanimentProgress}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(65,90,119,0.5)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${accompanimentProgress}%`,
                      background: 'linear-gradient(90deg, #00b4d8, #7209b7)',
                      borderRadius: 4,
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
              </div>
            )}

            <AccompanimentMixer
              accompaniment={accompaniment}
              onPlaybackTimeChange={setPlaybackTime}
            />

            <div className="panel fade-in">
              <div className="section-title">作品信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div style={{ padding: 10, borderRadius: 6, background: 'rgba(0,180,216,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#778da9', marginBottom: 4 }}>调式</div>
                  <div style={{ fontWeight: 700, color: '#00b4d8' }}>{key || '-'}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: 'rgba(114,9,183,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#778da9', marginBottom: 4 }}>速度</div>
                  <div style={{ fontWeight: 700, color: '#b5179e' }}>{bpm ? `♩ = ${bpm}` : '-'}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: 'rgba(255,215,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#778da9', marginBottom: 4 }}>节拍</div>
                  <div style={{ fontWeight: 700, color: '#ffd700' }}>{timeSignature || '-'}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: 'rgba(42,157,143,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#778da9', marginBottom: 4 }}>音符数</div>
                  <div style={{ fontWeight: 700, color: '#2a9d8f' }}>{notes.length || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-player">
          <button
            className="icon-btn"
            style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #00b4d8, #7209b7)', color: 'white' }}
            onClick={() => setIsGlobalPlaying(!isGlobalPlaying)}
            disabled={!accompaniment && notes.length === 0}
          >
            {isGlobalPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <div style={{ fontSize: 12, color: '#a8dadc', width: 56, textAlign: 'center' }}>
            {playbackTime.toFixed(1)}s
          </div>

          <div className="progress-bar" onClick={() => {}}>
            <div
              className="progress-fill"
              style={{ width: `${totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0}%` }}
            />
          </div>

          <div style={{ fontSize: 12, color: '#778da9', width: 56, textAlign: 'center' }}>
            {totalDuration > 0 ? totalDuration.toFixed(1) : '0.0'}s
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 180 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8dadc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {globalVolume === 0 ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  {globalVolume > 50 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                </>
              )}
            </svg>
            <div className="slider-container" style={{ width: 140 }}>
              <input
                type="range"
                min={0}
                max={100}
                value={globalVolume}
                onChange={(e) => setGlobalVolume(Number(e.target.value))}
              />
            </div>
            <span style={{ fontSize: 12, color: '#a8dadc', width: 28, textAlign: 'right' }}>
              {globalVolume}
            </span>
          </div>
        </div>

        {showSaveModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
            className="fade-in"
            onClick={() => setShowSaveModal(false)}
          >
            <div
              style={{
                width: 420,
                maxWidth: '90%',
                padding: 28,
                borderRadius: 12,
                background: 'linear-gradient(180deg, #1b263b, #0d1b2a)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,180,216,0.1)',
                border: '1px solid rgba(0,180,216,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="gradient-text" style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
                保存旋律档案
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#a8dadc', display: 'block', marginBottom: 6 }}>档案名称</label>
                <input
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  placeholder="为你的作品起个名字..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,180,216,0.3)',
                    background: 'rgba(65,90,119,0.3)',
                    color: '#e0e1dd',
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: '#a8dadc', display: 'block', marginBottom: 6 }}>描述（可选）</label>
                <textarea
                  value={archiveDescription}
                  onChange={(e) => setArchiveDescription(e.target.value)}
                  placeholder="添加创作灵感、情绪描述..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,180,216,0.3)',
                    background: 'rgba(65,90,119,0.3)',
                    color: '#e0e1dd',
                    fontSize: 14,
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: 'rgba(65,90,119,0.4)',
                    color: '#a8dadc',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!archiveName.trim() || isSaving}
                  className="gradient-btn"
                  style={{ flex: 1 }}
                >
                  {isSaving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;
