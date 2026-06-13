import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import UploadCard from './components/UploadCard';
import DanceSchemeCard from './components/DanceSchemeCard';
import PreviewPanel from './components/PreviewPanel';

export interface Beat {
  time: number;
  beat: number;
}

export interface Segment {
  name: string;
  label: string;
  start: number;
  end: number;
}

export interface DanceMove {
  name: string;
  beats: number;
  difficulty: number;
  timestamps: number[];
}

export interface DanceScheme {
  name: string;
  bpmRange: [number, number];
  totalDifficulty: number;
  moves: DanceMove[];
}

export interface BackupMove {
  name: string;
  beats: number;
  difficulty: number;
  icon: string;
}

export interface AnalysisResult {
  trackName: string;
  style: string;
  bpm: number;
  durationMs: number;
  beats: Beat[];
  segments: Segment[];
}

const SEGMENT_COLORS: Record<string, string> = {
  intro: '#7EC8E3',
  verse: '#00C853',
  chorus: '#FF9100',
  bridge: '#9C27B0',
  outro: '#B71C1C',
};

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [schemes, setSchemes] = useState<DanceScheme[]>([]);
  const [backupMoves, setBackupMoves] = useState<BackupMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewMove, setPreviewMove] = useState<DanceMove | null>(null);
  const [previewBpm, setPreviewBpm] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const handleAnalyzed = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
    setLoading(true);
    axios.post('/api/generate', { bpm: result.bpm, beatCount: result.beats.length }).then((res) => {
      setSchemes(res.data.schemes);
      setBackupMoves(res.data.backupMoves);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handlePreview = useCallback((move: DanceMove, bpm: number) => {
    setPreviewMove(move);
    setPreviewBpm(bpm);
    setPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleReplaceMove = useCallback((schemeIndex: number, moveIndex: number, newMove: BackupMove) => {
    setSchemes((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== schemeIndex) return s;
        const moves = [...s.moves];
        const currentMove = moves[moveIndex];
        const bpm = analysisResult?.bpm || 100;
        const beatInterval = 60000 / bpm;
        const timestamps: number[] = [];
        let startTime = currentMove.timestamps[0] || 0;
        for (let b = 0; b < newMove.beats; b++) {
          timestamps.push(Math.round((startTime + b * beatInterval) * 1000) / 1000);
        }
        moves[moveIndex] = {
          name: newMove.name,
          beats: newMove.beats,
          difficulty: newMove.difficulty,
          timestamps,
        };
        return { ...s, moves, totalDifficulty: moves.reduce((s, m) => s + m.difficulty, 0) };
      });
      return updated;
    });
  }, [analysisResult]);

  const handleReorderMoves = useCallback((schemeIndex: number, fromIndex: number, toIndex: number) => {
    setSchemes((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== schemeIndex) return s;
        const moves = [...s.moves];
        const [moved] = moves.splice(fromIndex, 1);
        moves.splice(toIndex, 0, moved);
        return { ...s, moves };
      });
      return updated;
    });
  }, []);

  const handleExport = useCallback((scheme: DanceScheme) => {
    axios.post('/api/export', {
      name: scheme.name,
      bpm: analysisResult?.bpm || 100,
      moves: scheme.moves,
    }, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${scheme.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  }, [analysisResult]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 200;
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 120;
      const barWidth = w / barCount;

      for (let i = 0; i < barCount; i++) {
        const amplitude = analysisResult
          ? Math.sin(i * 0.15 + time * 2) * 0.3 + Math.sin(i * 0.08 + time * 1.3) * 0.2 + 0.5
          : Math.sin(i * 0.1 + time * 0.5) * 0.15 + 0.2;
        const barHeight = amplitude * h * 0.7;

        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
        gradient.addColorStop(0, 'rgba(75, 0, 130, 0.6)');
        gradient.addColorStop(1, 'rgba(30, 60, 180, 0.8)');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.roundRect(i * barWidth + 1, h - barHeight, barWidth - 2, barHeight, 2);
        ctx.fill();
      }

      time += 0.02;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analysisResult]);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <canvas
        ref={waveformCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '200px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(90deg, #7EC8E3, #9C27B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            StreetDance Choreo Studio
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '0.95rem' }}>
            上传音乐 · 解析节奏 · 生成编舞 · 3D预览 · 导出教案
          </p>
        </header>

        <UploadCard onAnalyzed={handleAnalyzed} loading={loading} />

        {analysisResult && (
          <div style={{ maxWidth: '1200px', margin: '30px auto 0', padding: '0 20px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ marginBottom: '10px', color: '#7EC8E3' }}>
                🎵 {analysisResult.trackName} — BPM: {analysisResult.bpm}
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {analysisResult.segments.map((seg) => (
                  <span key={seg.name} style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    background: `${SEGMENT_COLORS[seg.name]}22`,
                    color: SEGMENT_COLORS[seg.name],
                    border: `1px solid ${SEGMENT_COLORS[seg.name]}44`,
                  }}>
                    {seg.label}
                  </span>
                ))}
              </div>
              <WaveformDisplay beats={analysisResult.beats} segments={analysisResult.segments} durationMs={analysisResult.durationMs} />
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#FEB47B' }}>
            <div style={{ fontSize: '1.2rem' }}>⚡ 正在生成编舞方案...</div>
          </div>
        )}

        {schemes.length > 0 && (
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: panelOpen ? '1fr 400px' : '1fr',
              gap: '20px',
              transition: 'grid-template-columns 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            }}>
              <div>
                {schemes.map((scheme, idx) => (
                  <DanceSchemeCard
                    key={idx}
                    scheme={scheme}
                    schemeIndex={idx}
                    bpm={analysisResult?.bpm || 100}
                    backupMoves={backupMoves}
                    onPreview={handlePreview}
                    onReplaceMove={handleReplaceMove}
                    onReorderMoves={handleReorderMoves}
                    onExport={handleExport}
                  />
                ))}
              </div>
              {panelOpen && previewMove && (
                <PreviewPanel
                  move={previewMove}
                  bpm={previewBpm}
                  onClose={handleClosePanel}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WaveformDisplay({ beats, segments, durationMs }: { beats: Beat[]; segments: Segment[]; durationMs: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = 60;

    ctx.clearRect(0, 0, w, h);

    for (const seg of segments) {
      const startX = (seg.start / durationMs) * w;
      const endX = (seg.end / durationMs) * w;
      ctx.fillStyle = SEGMENT_COLORS[seg.name] + '22';
      ctx.fillRect(startX, 0, endX - startX, h);
    }

    const step = Math.max(1, Math.floor(beats.length / (w / 2)));
    for (let i = 0; i < beats.length; i += step) {
      const beat = beats[i];
      const x = (beat.time / durationMs) * w;
      const seg = segments.find((s) => beat.time >= s.start && beat.time < s.end);
      const color = seg ? SEGMENT_COLORS[seg.name] : '#ffffff';
      const barH = beat.beat === 1 ? h * 0.8 : h * 0.4;

      ctx.fillStyle = color;
      ctx.fillRect(x, h - barH, 2, barH);
    }
  }, [beats, segments, durationMs]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '60px',
        marginTop: '12px',
        borderRadius: '6px',
        background: 'rgba(0,0,0,0.3)',
      }}
    />
  );
}

export default App;
