import { useState, useRef, useEffect, useCallback } from 'react';
import LyricsDisplay from './LyricsDisplay';
import PitchVisualizer from './PitchVisualizer';
import { AudioAnalyzer, type AudioAnalysisResult } from './AudioAnalyzer';
import { sampleSongs, parseLRC } from './songs';
import type { LyricLine, Song, ScoreReport } from './types';

function App() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [showScoreReport, setShowScoreReport] = useState(false);
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [pitchDeviation, setPitchDeviation] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);

  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const pitchHistoryRef = useRef<{ deviation: number; timestamp: number }[]>([]);
  const pitchRecordsRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentPitch = useCallback(() => {
    if (!lyrics || lyrics.length === 0) return null;
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        index = i;
      } else {
        break;
      }
    }
    return lyrics[index]?.pitch ?? null;
  }, [lyrics, currentTime]);

  const handleAudioAnalysis = useCallback((result: AudioAnalysisResult) => {
    setCurrentVolume(result.volume);
    if (result.pitch > 0) {
      pitchRecordsRef.current.push(result.pitch);
      const targetPitch = getCurrentPitch();
      if (targetPitch) {
        const deviation = 1200 * Math.log2(result.pitch / targetPitch);
        setPitchDeviation(deviation);
        pitchHistoryRef.current.push({
          deviation,
          timestamp: performance.now(),
        });
      }
    }
  }, [getCurrentPitch]);

  const generateScoreReport = useCallback(() => {
    const history = pitchHistoryRef.current;
    const records = pitchRecordsRef.current;
    
    if (history.length === 0) {
      return {
        accuracy: 0,
        highestPitch: 0,
        lowestPitch: 0,
        comment: '没有检测到演唱数据，下次要大声唱哦！',
      };
    }

    const accurateCount = history.filter(h => Math.abs(h.deviation) <= 50).length;
    const accuracy = Math.round((accurateCount / history.length) * 100);
    const highestPitch = records.length > 0 ? Math.max(...records) : 0;
    const lowestPitch = records.length > 0 ? Math.min(...records) : 0;

    let comment = '';
    if (accuracy >= 90) {
      comment = '音准优秀，节奏感强！你就是麦霸！';
    } else if (accuracy >= 75) {
      comment = '表现不错，继续保持这个状态！';
    } else if (accuracy >= 60) {
      comment = '还可以，多练习会更好哦！';
    } else if (accuracy >= 40) {
      comment = '建议多练习高音部分，加油！';
    } else {
      comment = '需要多加练习，熟能生巧嘛！';
    }

    return { accuracy, highestPitch, lowestPitch, comment };
  }, []);

  const updatePlayback = useCallback(() => {
    if (!isPlaying || !currentSong) return;
    
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    setCurrentTime(elapsed);

    if (elapsed >= currentSong.duration) {
      setIsPlaying(false);
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.stop();
      }
      const report = generateScoreReport();
      setScoreReport(report);
      setShowScoreReport(true);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updatePlayback);
  }, [isPlaying, currentSong, generateScoreReport]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlayback]);

  const startAudioAnalysis = async () => {
    try {
      if (!audioAnalyzerRef.current) {
        audioAnalyzerRef.current = new AudioAnalyzer();
      }
      await audioAnalyzerRef.current.start(handleAudioAnalysis);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopAudioAnalysis = () => {
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.stop();
    }
  };

  const handlePlay = async () => {
    if (!currentSong) {
      alert('请先选择一首歌');
      return;
    }
    pitchHistoryRef.current = [];
    pitchRecordsRef.current = [];
    setCurrentTime(0);
    startTimeRef.current = performance.now();
    setIsPlaying(true);
    await startAudioAnalysis();
  };

  const handleStop = () => {
    setIsPlaying(false);
    stopAudioAnalysis();
    const report = generateScoreReport();
    setScoreReport(report);
    setShowScoreReport(true);
  };

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    setLyrics(song.lyrics);
    setShowSongList(false);
    setCurrentTime(0);
    setIsPlaying(false);
    stopAudioAnalysis();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const content = await file.text();
    const parsedLyrics = parseLRC(content);
    
    if (parsedLyrics.length === 0) {
      alert('LRC文件格式不正确');
      return;
    }

    const duration = parsedLyrics[parsedLyrics.length - 1].time + 10;
    const customSong: Song = {
      id: 'custom',
      title: file.name.replace('.lrc', ''),
      artist: '自定义',
      lyrics: parsedLyrics,
      duration,
    };

    setCurrentSong(customSong);
    setLyrics(parsedLyrics);
    setCurrentTime(0);
    setIsPlaying(false);
    stopAudioAnalysis();
  };

  const closeScoreReport = () => {
    setShowScoreReport(false);
    setCurrentTime(0);
    setPitchDeviation(0);
    setCurrentVolume(0);
  };

  const pitchToNote = (freq: number) => {
    if (freq <= 0) return '-';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midiNum = Math.round(69 + 12 * Math.log2(freq / 440));
    const octave = Math.floor(midiNum / 12) - 1;
    const noteIndex = midiNum % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="app-title">🎤 卡拉OK伴唱</h1>
        <div className="volume-meter">
          <div 
            className="volume-inner"
            style={{
              background: `conic-gradient(
                from 0deg,
                #2196f3 0%,
                #9c27b0 ${50 * currentVolume}%,
                #f44336 ${100 * currentVolume}%,
                transparent ${100 * currentVolume}%
              )`,
            }}
          >
            <div className="volume-core">
              <span className="volume-text">{Math.round(currentVolume * 100)}%</span>
            </div>
          </div>
          <div 
            className="volume-arc"
            style={{
              transform: `rotate(${currentTime * 180}deg)`,
              opacity: currentVolume,
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * currentVolume}% 0%)`,
            }}
          />
        </div>
      </header>

      <div className="controls">
        <button 
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          📁 上传LRC
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".lrc,.txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button 
          className="btn btn-primary"
          onClick={() => setShowSongList(!showSongList)}
        >
          🎵 选择内置歌曲
        </button>
        {currentSong && (
          <>
            <button 
              className={`btn ${isPlaying ? 'btn-danger' : 'btn-success'}`}
              onClick={isPlaying ? handleStop : handlePlay}
            >
              {isPlaying ? '⏹ 停止' : '▶ 开始演唱'}
            </button>
            <div className="song-info">
              <span className="song-title">{currentSong.title}</span>
              <span className="song-artist">- {currentSong.artist}</span>
            </div>
          </>
        )}
      </div>

      {showSongList && (
        <div className="song-list">
          {sampleSongs.map(song => (
            <div 
              key={song.id}
              className={`song-item ${currentSong?.id === song.id ? 'active' : ''}`}
              onClick={() => handleSelectSong(song)}
            >
              <span className="song-item-title">{song.title}</span>
              <span className="song-item-artist">{song.artist}</span>
            </div>
          ))}
        </div>
      )}

      <main className="main-content">
        <LyricsDisplay 
          lyrics={lyrics}
          currentTime={currentTime}
        />
      </main>

      <footer className="footer">
        <PitchVisualizer 
          deviation={pitchDeviation}
          volume={currentVolume}
        />
        <div className="time-display">
          <span className="current-time">
            {Math.floor(currentTime / 60).toString().padStart(2, '0')}:
            {Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
          {currentSong && (
            <span className="total-time">
              / {Math.floor(currentSong.duration / 60).toString().padStart(2, '0')}:
              {Math.floor(currentSong.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </footer>

      {showScoreReport && scoreReport && (
        <div className="modal-overlay" onClick={closeScoreReport}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeScoreReport}>✕</button>
            <h2 className="modal-title">🎉 演唱报告</h2>
            <div className="score-circle">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#333" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={scoreReport.accuracy >= 75 ? '#4caf50' : scoreReport.accuracy >= 50 ? '#ff9800' : '#f44336'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(scoreReport.accuracy / 100) * 326.7} 326.7`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="score-value">{scoreReport.accuracy}</div>
              <div className="score-label">音准准确率</div>
            </div>
            <div className="pitch-stats">
              <div className="stat-item">
                <span className="stat-label">最高音</span>
                <span className="stat-value">{pitchToNote(scoreReport.highestPitch)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">最低音</span>
                <span className="stat-value">{pitchToNote(scoreReport.lowestPitch)}</span>
              </div>
            </div>
            <p className="comment">{scoreReport.comment}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
