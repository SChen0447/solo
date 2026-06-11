import React, { useState, useCallback, useRef, useEffect } from 'react';
import TuningPanel from './TuningPanel';
import ScoreDisplay from './ScoreDisplay';

export interface StringState {
  id: number;
  tension: number;
  note: string;
  baseFreq: number;
}

export interface PluckEvent {
  stringId: number;
  position: number;
  timestamp: number;
  note: string;
}

const DEFAULT_NOTES = ['宫', '商', '角', '徵', '羽', '变宫', '变徵'];
const DEFAULT_FREQS = [261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25];

const createDefaultStrings = (): StringState[] => {
  return Array.from({ length: 7 }, (_, i) => ({
    id: i,
    tension: 1.0,
    note: DEFAULT_NOTES[i],
    baseFreq: DEFAULT_FREQS[i]
  }));
};

const App: React.FC = () => {
  const [strings, setStrings] = useState<StringState[]>(createDefaultStrings());
  const [loadId, setLoadId] = useState('');
  const [saveId, setSaveId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<PluckEvent[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleTensionChange = useCallback((id: number, tension: number) => {
    setStrings(prev => prev.map(s =>
      s.id === id ? { ...s, tension } : s
    ));
  }, []);

  const handleStringPluck = useCallback((stringId: number, position: number) => {
    const str = strings.find(s => s.id === stringId);
    if (!str) return;

    if (isRecording) {
      const event: PluckEvent = {
        stringId,
        position,
        timestamp: Date.now() - recordingStartRef.current,
        note: str.note
      };
      setRecordedEvents(prev => [...prev, event]);
    }
  }, [strings, isRecording]);

  const handleSaveTune = async () => {
    try {
      const res = await fetch('/api/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strings: strings.map(s => ({
            id: s.id,
            tension: s.tension,
            note: s.note
          })),
          timestamp: Date.now(),
          recordedEvents
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveId(data.id);
        showStatus(`调律已保存！ID: ${data.id.slice(0, 8)}...`);
      } else {
        showStatus('保存失败: ' + data.error);
      }
    } catch (err) {
      showStatus('网络错误，请确保后端已启动');
    }
  };

  const handleLoadTune = async () => {
    if (!loadId.trim()) {
      showStatus('请输入调律ID');
      return;
    }
    try {
      const res = await fetch(`/api/tune/${loadId.trim()}`);
      const data = await res.json();
      if (data.success) {
        setStrings(prev => prev.map(s => {
          const loaded = data.data.strings.find((ls: { id: number }) => ls.id === s.id);
          return loaded ? { ...s, tension: loaded.tension, note: loaded.note || s.note } : s;
        }));
        if (data.data.recordedEvents) {
          setRecordedEvents(data.data.recordedEvents);
        }
        showStatus('调律加载成功！');
      } else {
        showStatus('加载失败: ' + data.error);
      }
    } catch (err) {
      showStatus('网络错误，请确保后端已启动');
    }
  };

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedEvents([]);
    recordingStartRef.current = Date.now();
    recordingTimerRef.current = setTimeout(() => {
      setIsRecording(false);
      showStatus('录制完成（已达10秒上限）');
    }, 10000);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>七弦妙音 · 古琴音律调校实验室</h1>
        <p style={styles.subtitle}>调弦品竹，悟天地之音</p>
      </header>

      {statusMsg && (
        <div style={styles.statusBar}>{statusMsg}</div>
      )}

      {isRecording && (
        <div style={styles.recordingIndicator}>
          <span style={styles.recordingDot}></span>
          <span style={styles.recordingText}>正在录制...</span>
        </div>
      )}

      <div style={styles.loadSaveBar}>
        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="输入调律ID..."
            value={loadId}
            onChange={e => setLoadId(e.target.value)}
            style={styles.idInput}
          />
          <button style={styles.actionBtn} onClick={handleLoadTune}>
            加载调律
          </button>
        </div>
        <button style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #8b4513 0%, #3a2010 100%)' }} onClick={handleSaveTune}>
          保存当前调律
        </button>
        {saveId && (
          <span style={styles.saveIdText}>
            已保存 ID: <code style={styles.idCode}>{saveId}</code>
          </span>
        )}
      </div>

      <div className="main-layout-grid" style={styles.mainLayout}>
        <div style={styles.leftPanel}>
          <TuningPanel
            strings={strings}
            onTensionChange={handleTensionChange}
            onStringPluck={handleStringPluck}
          />
        </div>
        <div style={styles.rightPanel}>
          <ScoreDisplay
            strings={strings}
            isRecording={isRecording}
            recordedEvents={recordedEvents}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </div>
      </div>

      <footer style={styles.footer}>
        <p>© 古琴音律实验室 · 以器载道，以韵传神</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    minHeight: '100vh',
    padding: '20px 40px',
    maxWidth: '1600px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '20px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#2a1f14',
    letterSpacing: '6px',
    textShadow: '2px 2px 4px rgba(212, 160, 23, 0.3)'
  },
  subtitle: {
    fontSize: '16px',
    color: '#5c3a21',
    marginTop: '8px',
    letterSpacing: '3px',
    fontStyle: 'italic'
  },
  statusBar: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(42, 31, 20, 0.95)',
    color: '#f5e6c8',
    padding: '12px 28px',
    borderRadius: '8px',
    border: '1px solid #b8860b',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    fontSize: '14px',
    letterSpacing: '1px'
  },
  recordingIndicator: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(245, 230, 200, 0.95)',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #b8860b',
    zIndex: 999
  },
  recordingDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#c0392b',
    display: 'inline-block',
    animation: 'blink 0.5s ease-in-out infinite alternate'
  },
  recordingText: {
    color: '#2a1f14',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '1px'
  },
  loadSaveBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    padding: '16px',
    background: 'rgba(245, 230, 200, 0.6)',
    borderRadius: '12px',
    border: '1px solid #b8860b'
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  idInput: {
    padding: '10px 16px',
    border: '1px solid #b8860b',
    borderRadius: '6px',
    background: 'rgba(255, 253, 245, 0.9)',
    color: '#2a1f14',
    fontSize: '14px',
    minWidth: '260px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  actionBtn: {
    padding: '10px 24px',
    border: '1px solid #b8860b',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #d2b48c 0%, #4a2c16 100%)',
    color: '#fff8e7',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '2px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  saveIdText: {
    color: '#5c3a21',
    fontSize: '13px'
  },
  idCode: {
    background: 'rgba(212, 160, 23, 0.2)',
    padding: '4px 10px',
    borderRadius: '4px',
    color: '#2a1f14',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '60% 40%',
    gap: '24px',
    alignItems: 'start'
  },
  leftPanel: {
    minWidth: 0
  },
  rightPanel: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center',
    padding: '20px',
    color: '#5c3a21',
    fontSize: '13px',
    letterSpacing: '2px'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes blink {
    from { opacity: 1; box-shadow: 0 0 8px #c0392b; }
    to { opacity: 0.2; box-shadow: 0 0 2px #c0392b; }
  }
  @media (max-width: 768px) {
    .main-layout-grid {
      grid-template-columns: 1fr !important;
    }
    #root {
      padding: 0;
    }
  }
`;
document.head.appendChild(styleSheet);

export default App;
