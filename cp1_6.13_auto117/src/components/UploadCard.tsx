import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import type { AnalysisResult } from '../App';

interface UploadCardProps {
  onAnalyzed: (result: AnalysisResult) => void;
  loading: boolean;
}

const PRESET_TRACKS = [
  { id: 'hiphop1', name: 'Hip-Hop Groove', style: 'Hip-Hop' },
  { id: 'breaking1', name: 'Breaking Beat', style: 'Breaking' },
  { id: 'popping1', name: 'Popping Funk', style: 'Popping' },
];

export default function UploadCard({ onAnalyzed, loading }: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      alert('请上传MP3格式的音乐文件');
      return;
    }
    setFileName(file.name);
    setAnalyzing(true);
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const res = await axios.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAnalyzed(res.data);
    } catch {
      alert('解析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  }, [onAnalyzed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handlePresetAnalyze = useCallback(async () => {
    if (!selectedPreset) return;
    setAnalyzing(true);
    setFileName(PRESET_TRACKS.find(t => t.id === selectedPreset)?.name || '');
    try {
      const formData = new FormData();
      formData.append('presetId', selectedPreset);
      const res = await axios.post('/api/analyze', formData);
      onAnalyzed(res.data);
    } catch {
      alert('解析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  }, [selectedPreset, onAnalyzed]);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '0 20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
      }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragOver ? '2px dashed #7EC8E3' : '2px dashed rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease-out',
            background: dragOver ? 'rgba(126,200,227,0.1)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎵</div>
          <div style={{ color: '#ccc', fontSize: '0.95rem' }}>
            {fileName ? `已选择: ${fileName}` : '拖放MP3音乐文件到此处，或点击选择'}
          </div>
          <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '8px' }}>
            时长不超过3分钟
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ background: '#1A1A2E' }}>选择预设曲库...</option>
            {PRESET_TRACKS.map((t) => (
              <option key={t.id} value={t.id} style={{ background: '#1A1A2E' }}>
                {t.name} ({t.style})
              </option>
            ))}
          </select>
          <button
            onClick={handlePresetAnalyze}
            disabled={!selectedPreset || analyzing}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedPreset ? 'linear-gradient(135deg, #7EC8E3, #9C27B0)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: selectedPreset ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            解析节奏
          </button>
        </div>

        {analyzing && (
          <div style={{
            textAlign: 'center',
            marginTop: '16px',
            color: '#FEB47B',
            fontSize: '0.9rem',
          }}>
            <div style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #FEB47B33',
              borderTopColor: '#FEB47B',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginRight: '8px',
              verticalAlign: 'middle',
            }} />
            正在解析音频节奏...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}
