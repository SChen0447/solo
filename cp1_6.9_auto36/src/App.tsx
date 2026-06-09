import React, { useRef, useState, useEffect } from 'react';
import Waveform from './components/Waveform';
import AnnotationPanel from './components/AnnotationPanel';
import { useAnnotationStore, generateId } from './stores/annotationStore';

const App: React.FC = () => {
  const { state, dispatch, loadAnnotations } = useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('上传失败');
      const data = await res.json();

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

      const audioId = generateId();
      dispatch({
        type: 'SET_AUDIO',
        payload: {
          id: audioId,
          name: file.name,
          url: data.url,
          duration: audioBuf.duration,
          sampleRate: audioBuf.sampleRate
        }
      });
      await loadAnnotations(audioId);
      audioCtx.close();
    } catch (e) {
      console.error(e);
      alert('音频加载失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
        background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0
      }}>
        <h1 style={{ fontSize: 18, color: '#58a6ff', fontWeight: 600 }}>🎙️ 音频标注工具</h1>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          style={{
            padding: '6px 16px', background: '#238636', color: '#fff', border: 'none',
            borderRadius: 6, cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 14
          }}
        >
          {isLoading ? '加载中...' : '上传音频'}
        </button>
        {state.audioFile && (
          <span style={{ color: '#8b949e', fontSize: 13 }}>
            当前文件: {state.audioFile.name}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 16px', background: 'transparent', color: '#8b949e',
            border: '1px solid #30363d', borderRadius: 6, cursor: 'pointer', fontSize: 14
          }}
        >
          重置
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '70%', minWidth: 0, borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
          <Waveform />
        </div>
        <div style={{ width: '30%', minWidth: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnnotationPanel />
        </div>
      </div>
    </div>
  );
};

export default App;
