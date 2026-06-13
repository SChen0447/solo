import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { worksApi } from '../api';
import type { Work } from '../types';
import './WorkDetail.css';

interface WorkDetailProps {
  currentWorkId: string | null;
  isPlaying: boolean;
  onPlay: (work: Work) => void;
  onTogglePlay: () => void;
}

export default function WorkDetail({ currentWorkId, isPlaying, onPlay, onTogglePlay }: WorkDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    worksApi.getWork(id)
      .then(data => {
        setWork(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load work:', err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!work || !work.audioUrl || !audioRef.current) return;
    
    const audio = audioRef.current;
    audio.src = work.audioUrl;
    
    if (currentWorkId === work.id && isPlaying) {
      audio.play().catch(() => {});
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [work?.audioUrl]);

  useEffect(() => {
    if (!audioRef.current || !work) return;
    
    const audio = audioRef.current;
    
    if (currentWorkId === work.id) {
      if (isPlaying) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, currentWorkId, work?.id]);

  const initAudioContext = () => {
    if (audioContextRef.current || !audioRef.current || !work) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
      drawWaveform();
    } catch (e) {
      console.error('Failed to init audio context:', e);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8;
        
        const ratio = dataArray[i] / 255;
        const r = Math.floor(99 + ratio * (139 - 99));
        const g = Math.floor(102 + ratio * (92 - 102));
        const b = Math.floor(241 + ratio * (246 - 241));
        
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, `rgba(99, 102, 241, 0.8)`);
        gradient.addColorStop(1, `rgba(139, 92, 246, 0.8)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        
        x += barWidth;
      }
    };
    
    draw();
  };

  const handlePlayClick = () => {
    if (!work) return;
    initAudioContext();
    if (currentWorkId === work.id) {
      onTogglePlay();
    } else {
      onPlay(work);
    }
  };

  const shareToWeibo = () => {
    if (!work) return;
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(`${work.title} - 音乐人作品集`);
    window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank');
  };

  const shareToWechat = () => {
    alert('请复制链接分享到微信');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('链接已复制到剪贴板');
  };

  if (loading) {
    return (
      <div className="work-detail page-transition">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="work-detail page-transition">
        <div className="error">作品不存在</div>
      </div>
    );
  }

  const isCurrentPlaying = currentWorkId === work.id && isPlaying;

  return (
    <div className="work-detail page-transition">
      <button className="back-btn" onClick={() => navigate('/works')}>
        ← 返回作品列表
      </button>
      
      <div className="detail-container glass-card">
        <div className="detail-header">
          <div className="detail-cover">
            {work.coverImage ? (
              <img src={work.coverImage} alt={work.title} />
            ) : (
              <div className="cover-placeholder-large">
                <span>🎵</span>
              </div>
            )}
          </div>
          
          <div className="detail-info">
            <h1 className="detail-title">{work.title}</h1>
            <div className="detail-stats">
              <span>▶ {work.plays} 次播放</span>
              <span>⏱ {Math.floor(work.duration / 60)}:{(work.duration % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="detail-tags">
              {work.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            
            <div className="detail-play-section">
              <button
                className="play-btn detail-play-btn"
                onClick={handlePlayClick}
                aria-label={isCurrentPlaying ? '暂停' : '播放'}
              >
                {isCurrentPlaying ? '⏸' : '▶'}
              </button>
              <span className="play-text">
                {isCurrentPlaying ? '正在播放' : '点击播放'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="waveform-section">
          <h3>音频波形</h3>
          <div className="waveform-container">
            <canvas ref={canvasRef} width={800} height={120} className="waveform-canvas" />
            <audio ref={audioRef} loop />
          </div>
        </div>
        
        <div className="detail-description">
          <h3>作品介绍</h3>
          <p>{work.description}</p>
        </div>
        
        <div className="share-section">
          <h3>分享</h3>
          <div className="share-buttons">
            <button className="share-btn weibo" onClick={shareToWeibo}>
              微博
            </button>
            <button className="share-btn wechat" onClick={shareToWechat}>
              微信
            </button>
            <button className="share-btn link" onClick={copyLink}>
              复制链接
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
