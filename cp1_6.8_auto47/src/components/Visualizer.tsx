import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  WaveformType,
  FilterType,
  ParticleConfig,
  Keyframe,
  AudioMetadata,
} from '../types';
import { WaveformRenderer } from '../utils/WaveformRenderer';
import { ParticleSystem } from '../utils/ParticleSystem';
import {
  getInterpolatedState,
  addKeyframe,
  removeKeyframe,
  updateKeyframeTime,
} from '../utils/keyframeUtils';
import {
  defaultParticleConfig,
  waveformTypes,
  filterTypes,
  formatTime,
  templates,
} from '../utils';

interface VisualizerProps {
  audioMetadata: AudioMetadata;
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
  keyframes: Keyframe[];
  onWaveformTypeChange: (type: WaveformType) => void;
  onFilterTypeChange: (type: FilterType) => void;
  onParticleConfigChange: (config: ParticleConfig) => void;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({
  audioMetadata,
  waveformType,
  filterType,
  particleConfig,
  keyframes,
  onWaveformTypeChange,
  onFilterTypeChange,
  onParticleConfigChange,
  onKeyframesChange,
  leftPanelOpen,
  rightPanelOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rendererRef = useRef<WaveformRenderer | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelineHeight, setTimelineHeight] = useState(80);
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [embedCodeCopied, setEmbedCodeCopied] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
    }

    if (!sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (!rendererRef.current) {
      rendererRef.current = new WaveformRenderer(canvasRef.current);
    }

    if (!particleSystemRef.current) {
      particleSystemRef.current = new ParticleSystem(canvasRef.current, particleConfig);
    }
  }, [particleConfig]);

  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (particleSystemRef.current) {
      particleSystemRef.current.resize();
    }
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current || !analyserRef.current || !rendererRef.current) return;

    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = timestamp;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const time = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
    setCurrentTime(time);

    const interpolatedState = getInterpolatedState(keyframes, time);

    rendererRef.current.setWaveformType(interpolatedState.waveformType);
    rendererRef.current.setFilterType(interpolatedState.filterType);
    rendererRef.current.updateTransition(deltaTime);

    if (particleSystemRef.current) {
      particleSystemRef.current.setConfig(interpolatedState.particleConfig);
      particleSystemRef.current.update(dataArray);
    }

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

    rendererRef.current.draw(dataArray, time);

    if (particleSystemRef.current) {
      particleSystemRef.current.draw();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [keyframes]);

  const handlePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime / 1000;
    setCurrentTime(newTime);
  }, [duration]);

  const handleAddKeyframe = useCallback(() => {
    const time = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
    const newKeyframes = addKeyframe(
      keyframes,
      time,
      waveformType,
      filterType,
      particleConfig
    );
    onKeyframesChange(newKeyframes);
  }, [keyframes, waveformType, filterType, particleConfig, onKeyframesChange]);

  const handleDeleteKeyframe = useCallback((id: string) => {
    onKeyframesChange(removeKeyframe(keyframes, id));
  }, [keyframes, onKeyframesChange]);

  const handleKeyframeDrag = useCallback((id: string, newTime: number) => {
    onKeyframesChange(updateKeyframeTime(keyframes, id, newTime));
  }, [keyframes, onKeyframesChange]);

  const handleTimelineResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleTimelineResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const container = document.querySelector('.visualizer-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newHeight = rect.bottom - e.clientY;
    const clampedHeight = Math.max(80, Math.min(150, newHeight));
    setTimelineHeight(clampedHeight);
  }, [isResizing]);

  const handleTimelineResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !audioRef.current) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = canvasRef.current;
      const stream = canvas.captureStream(30);

      const audioElement = audioRef.current;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioElement);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      audioContext.createMediaStreamSource(dest.stream.getAudioTracks()[0]);

      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const maxExportDuration = 30000;
      const startTime = currentTime;
      const actualDuration = Math.min(maxExportDuration, duration - startTime);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setExportProgress(100);

        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = startTime / 1000;
        }
        setIsPlaying(false);
      };

      mediaRecorder.start();

      if (audioRef.current) {
        audioRef.current.currentTime = startTime / 1000;
        audioRef.current.play();
        setIsPlaying(true);
      }

      const exportStartTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - exportStartTime;
        const progress = Math.min(100, (elapsed / actualDuration) * 100);
        setExportProgress(progress);

        if (elapsed >= actualDuration) {
          clearInterval(progressInterval);
          mediaRecorder.stop();
        }
      }, 100);

    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  }, [currentTime, duration]);

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onWaveformTypeChange(template.waveformType);
      onFilterTypeChange(template.filterType);
      onParticleConfigChange(template.particleConfig);
      setShowTemplates(false);
    }
  }, [onWaveformTypeChange, onFilterTypeChange, onParticleConfigChange]);

  const generateShareLink = useCallback(() => {
    const params = new URLSearchParams();
    params.set('waveform', waveformType);
    params.set('filter', filterType);
    params.set('particles', JSON.stringify(particleConfig));
    if (keyframes.length > 0) {
      params.set('keyframes', JSON.stringify(keyframes));
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [waveformType, filterType, particleConfig, keyframes]);

  const generateEmbedCode = useCallback(() => {
    const params = new URLSearchParams();
    params.set('waveform', waveformType);
    params.set('filter', filterType);
    params.set('particles', JSON.stringify(particleConfig));
    if (keyframes.length > 0) {
      params.set('keyframes', JSON.stringify(keyframes));
    }
    params.set('embed', 'true');

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    return `<iframe src="${url}" width="800" height="600" frameborder="0" allow="autoplay; fullscreen"></iframe>`;
  }, [waveformType, filterType, particleConfig, keyframes]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(generateShareLink());
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  }, [generateShareLink]);

  const copyEmbedCode = useCallback(() => {
    navigator.clipboard.writeText(generateEmbedCode());
    setEmbedCodeCopied(true);
    setTimeout(() => setEmbedCodeCopied(false), 2000);
  }, [generateEmbedCode]);

  useEffect(() => {
    initAudio();
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', handleTimelineResize);
    document.addEventListener('mouseup', handleTimelineResizeEnd);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleTimelineResize);
      document.removeEventListener('mouseup', handleTimelineResizeEnd);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initAudio, resizeCanvas, handleTimelineResize, handleTimelineResizeEnd]);

  useEffect(() => {
    if (audioMetadata.url && audioRef.current) {
      audioRef.current.src = audioMetadata.url;
      setDuration(audioMetadata.duration || 0);
    }
  }, [audioMetadata]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isPlaying, animate]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setConfig(particleConfig);
    }
  }, [particleConfig]);

  const handleTimelineKeyframeClick = (e: React.MouseEvent, keyframe: Keyframe) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.currentTime = keyframe.time / 1000;
    }
  };

  return (
    <div className="visualizer-container">
      <audio ref={audioRef} crossOrigin="anonymous" />

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="visualizer-canvas" />

        {!isPlaying && (
          <div className="play-overlay" onClick={handlePlay}>
            <div className="play-button-large">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div
        className="timeline-section"
        style={{ height: `${timelineHeight}px` }}
      >
        <div className="timeline-resize-handle" onMouseDown={handleTimelineResizeStart} />

        <div className="timeline-controls">
          <button className="control-btn play-btn" onClick={handlePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="control-spacer" />

          <button
            className={`control-btn ${showTemplates ? 'active' : ''}`}
            onClick={() => setShowTemplates(!showTemplates)}
            title="模板库"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>

          <button
            className="control-btn"
            onClick={handleAddKeyframe}
            title="添加关键帧"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>

          <button
            className="control-btn"
            onClick={handleExport}
            disabled={isExporting}
            title="导出视频"
          >
            {isExporting ? (
              <div className="export-progress-mini">
                <div
                  className="export-progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </button>

          <button
            className={`control-btn ${showShare ? 'active' : ''}`}
            onClick={() => setShowShare(!showShare)}
            title="分享"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        <div
          className="timeline-track"
          onClick={handleSeek}
        >
          <div className="timeline-grid">
            {Array.from({ length: Math.ceil(duration / 1000) + 1 }).map((_, i) => (
              <div
                key={i}
                className="timeline-grid-line"
                style={{ left: `${(i * 1000 / duration) * 100}%` }}
              >
                <span className="timeline-grid-label">{i}s</span>
              </div>
            ))}
          </div>

          <div
            className="timeline-playhead"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="playhead-line" />
            <div className="playhead-triangle" />
          </div>

          {keyframes.map(kf => (
            <div
              key={kf.id}
              className="keyframe-marker"
              style={{ left: `${(kf.time / duration) * 100}%` }}
              onClick={(e) => handleTimelineKeyframeClick(e, kf)}
              draggable
              onDragEnd={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (rect) {
                  const x = e.clientX - rect.left;
                  const newTime = (x / rect.width) * duration;
                  handleKeyframeDrag(kf.id, Math.max(0, Math.min(duration, newTime)));
                }
              }}
            >
              <div className="keyframe-diamond" />
              <button
                className="keyframe-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteKeyframe(kf.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {showTemplates && (
          <div className="templates-panel">
            <div className="templates-header">
              <h4>预设模板</h4>
              <button className="close-btn" onClick={() => setShowTemplates(false)}>×</button>
            </div>
            <div className="templates-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="template-card"
                  onClick={() => handleApplyTemplate(template.id)}
                >
                  <div className={`template-preview template-${template.id}`}>
                    <span className="template-icon">
                      {template.id === 'concert' && '🎸'}
                      {template.id === 'nightclub' && '💃'}
                      {template.id === 'meditation' && '🧘'}
                      {template.id === 'tech' && '🤖'}
                      {template.id === 'retro' && '📼'}
                    </span>
                  </div>
                  <div className="template-info">
                    <span className="template-name">{template.name}</span>
                    <span className="template-desc">{template.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showShare && (
          <div className="share-panel">
            <div className="share-header">
              <h4>分享</h4>
              <button className="close-btn" onClick={() => setShowShare(false)}>×</button>
            </div>
            <div className="share-content">
              <div className="share-item">
                <label>分享链接</label>
                <div className="share-row">
                  <input type="text" readOnly value={generateShareLink()} />
                  <button className="share-copy-btn" onClick={copyShareLink}>
                    {shareLinkCopied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <div className="share-item">
                <label>嵌入代码</label>
                <div className="share-row">
                  <textarea readOnly value={generateEmbedCode()} rows={3} />
                </div>
                <button className="share-copy-btn" onClick={copyEmbedCode}>
                  {embedCodeCopied ? '已复制' : '复制嵌入代码'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .visualizer-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          position: relative;
        }

        .canvas-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #0a0a0f;
        }

        .visualizer-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 10, 15, 0.3);
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .play-overlay:hover {
          background: rgba(10, 10, 15, 0.5);
        }

        .play-button-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffaa, #ff00aa);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0a0f;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 0 30px rgba(0, 255, 170, 0.5);
        }

        .play-overlay:hover .play-button-large {
          transform: scale(1.1);
          box-shadow: 0 0 50px rgba(0, 255, 170, 0.7);
        }

        .timeline-section {
          background: #1a1a2e;
          border-top: 1px solid #333;
          position: relative;
          transition: height 0.1s ease;
        }

        .timeline-resize-handle {
          position: absolute;
          top: -3px;
          left: 0;
          right: 0;
          height: 6px;
          cursor: ns-resize;
          background: transparent;
        }

        .timeline-resize-handle:hover {
          background: rgba(0, 255, 170, 0.3);
        }

        .timeline-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          height: 40px;
          border-bottom: 1px solid #333;
        }

        .control-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #2a2a4e;
          border: none;
          color: #aaa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .control-btn:hover {
          background: #3a3a5e;
          color: #00ffaa;
          transform: scale(1.1);
        }

        .control-btn.active {
          background: #00ffaa;
          color: #0a0a0f;
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .play-btn {
          background: linear-gradient(135deg, #00ffaa, #00cc88);
          color: #0a0a0f;
        }

        .play-btn:hover {
          background: linear-gradient(135deg, #00ffaa, #00cc88);
          color: #0a0a0f;
        }

        .time-display {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #888;
          min-width: 140px;
        }

        .control-spacer {
          flex: 1;
        }

        .export-progress-mini {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #333;
          overflow: hidden;
          position: relative;
        }

        .export-progress-fill {
          height: 100%;
          background: #00ffaa;
          transition: width 0.1s ease;
        }

        .timeline-track {
          position: relative;
          height: calc(100% - 40px);
          cursor: pointer;
          overflow: hidden;
        }

        .timeline-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .timeline-grid-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .timeline-grid-label {
          position: absolute;
          top: 4px;
          left: 4px;
          font-size: 10px;
          color: #555;
        }

        .timeline-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          pointer-events: none;
          z-index: 10;
        }

        .playhead-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: -1px;
          width: 2px;
          background: #ff00aa;
          box-shadow: 0 0 10px #ff00aa;
        }

        .playhead-triangle {
          position: absolute;
          top: -1px;
          left: -5px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid #ff00aa;
        }

        .keyframe-marker {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          cursor: pointer;
          z-index: 5;
        }

        .keyframe-diamond {
          width: 12px;
          height: 12px;
          background: #00ffaa;
          transform: rotate(45deg);
          box-shadow: 0 0 8px rgba(0, 255, 170, 0.8);
          transition: transform 0.2s ease;
        }

        .keyframe-marker:hover .keyframe-diamond {
          transform: rotate(45deg) scale(1.3);
        }

        .keyframe-delete {
          position: absolute;
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ff4466;
          border: none;
          color: white;
          font-size: 12px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .keyframe-marker:hover .keyframe-delete {
          opacity: 1;
        }

        .templates-panel,
        .share-panel {
          position: absolute;
          right: 16px;
          bottom: 100%;
          margin-bottom: 8px;
          width: 360px;
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
          overflow: hidden;
        }

        .templates-header,
        .share-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #333;
        }

        .templates-header h4,
        .share-header h4 {
          margin: 0;
          font-size: 14px;
          color: #fff;
        }

        .close-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #333;
          color: #fff;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 12px;
        }

        .template-card {
          background: #2a2a4e;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .template-card:hover {
          background: #3a3a5e;
          transform: translateY(-2px);
        }

        .template-preview {
          height: 60px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          font-size: 28px;
        }

        .template-concert { background: linear-gradient(135deg, #9b59b6, #e74c3c); }
        .template-nightclub { background: linear-gradient(135deg, #ff00aa, #00ffaa); }
        .template-meditation { background: linear-gradient(135deg, #3498db, #2ecc71); }
        .template-tech { background: linear-gradient(135deg, #00ffaa, #00aaff); }
        .template-retro { background: linear-gradient(135deg, #f39c12, #e74c3c); }

        .template-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .template-name {
          font-size: 13px;
          color: #fff;
          font-weight: 500;
        }

        .template-desc {
          font-size: 11px;
          color: #888;
        }

        .share-content {
          padding: 16px;
        }

        .share-item {
          margin-bottom: 16px;
        }

        .share-item:last-child {
          margin-bottom: 0;
        }

        .share-item label {
          display: block;
          font-size: 12px;
          color: #888;
          margin-bottom: 6px;
        }

        .share-row {
          display: flex;
          gap: 8px;
        }

        .share-item input,
        .share-item textarea {
          flex: 1;
          background: #0a0a0f;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px;
          color: #aaa;
          font-size: 12px;
          font-family: 'Courier New', monospace;
          resize: none;
        }

        .share-copy-btn {
          padding: 8px 16px;
          background: #00ffaa;
          border: none;
          border-radius: 6px;
          color: #0a0a0f;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s ease;
        }

        .share-copy-btn:hover {
          background: #00cc88;
        }

        @media (max-width: 768px) {
          .templates-panel,
          .share-panel {
            width: calc(100% - 32px);
            right: 16px;
          }

          .templates-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .time-display {
            font-size: 11px;
            min-width: 100px;
          }

          .timeline-controls {
            gap: 8px;
            padding: 6px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Visualizer;
