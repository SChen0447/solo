import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { StringState, PluckEvent } from './App';

interface ScoreDisplayProps {
  strings: StringState[];
  isRecording: boolean;
  recordedEvents: PluckEvent[];
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const STRING_NAMES = ['一', '二', '三', '四', '五', '六', '七'];

const calcNoteFromFreq = (baseFreq: number, tension: number): { note: string; octave: number; cents: number } => {
  const freq = baseFreq * Math.sqrt(tension);
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(semitones) + 69;
  const octave = Math.floor(midi / 12) - 1;
  const noteIdx = ((midi % 12) + 12) % 12;
  const cents = Math.round((semitones - (midi - 69)) * 100);
  return { note: noteNames[noteIdx], octave, cents };
};

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  strings,
  isRecording,
  recordedEvents,
  onStartRecording,
  onStopRecording
}) => {
  const timelineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scoreImageUrl, setScoreImageUrl] = useState<string>('');
  const [btnHover, setBtnHover] = useState(false);

  const generateScore = useCallback(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 560;
    const cssH = Math.max(280, 160 + Math.min(recordedEvents.length * 22, 260));

    canvas.style.height = cssH + 'px';
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const grad = ctx.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, '#faf2de');
    grad.addColorStop(1, '#efe0b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.fillStyle = 'rgba(92, 58, 33, 0.08)';
    for (let y = 28; y < cssH; y += 28) {
      ctx.fillRect(0, y, cssW, 0.5);
    }

    ctx.strokeStyle = 'rgba(212, 160, 23, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, cssW - 20, cssH - 20);
    ctx.strokeStyle = 'rgba(184, 134, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, cssW - 28, cssH - 28);

    ctx.save();
    ctx.font = 'bold 16px "Noto Serif SC", "FangSong", serif';
    ctx.fillStyle = '#2a1f14';
    ctx.textAlign = 'center';
    ctx.fillText('古琴谱 · 音序录', cssW / 2, 34);
    ctx.font = '11px "Noto Serif SC", serif';
    ctx.fillStyle = '#8a7f6e';
    const date = new Date();
    ctx.fillText(`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 制谱`, cssW / 2, 50);
    ctx.restore();

    const maxTime = recordedEvents.length > 0
      ? Math.max(...recordedEvents.map(e => e.timestamp), 10000)
      : 10000;
    const totalDurationMs = Math.max(maxTime, 2000);

    const tlLeft = 50;
    const tlRight = cssW - 40;
    const tlY = 78;
    const tlWidth = tlRight - tlLeft;

    ctx.save();
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tlLeft, tlY);
    ctx.lineTo(tlRight, tlY);
    ctx.stroke();

    const tickCount = 10;
    for (let i = 0; i <= tickCount; i++) {
      const x = tlLeft + (tlWidth / tickCount) * i;
      const timeSec = (totalDurationMs / tickCount / 1000) * i;
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x, tlY - (i % 5 === 0 ? 8 : 4));
      ctx.lineTo(x, tlY + (i % 5 === 0 ? 8 : 4));
      ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = '#5c3a21';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${timeSec.toFixed(1)}s`, x, tlY + 22);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 11px "Noto Serif SC", serif';
    ctx.fillStyle = '#5c3a21';
    ctx.textAlign = 'right';
    ctx.fillText('时间轴', tlLeft - 8, tlY + 4);
    ctx.restore();

    const sortedEvents = [...recordedEvents].sort((a, b) => a.timestamp - b.timestamp);
    const eventRowY = tlY + 50;
    const rowGap = 20;

    sortedEvents.forEach((ev, idx) => {
      const x = tlLeft + tlWidth * (ev.timestamp / totalDurationMs);
      const y = eventRowY + Math.floor(idx / 2) * rowGap;
      const offset = (idx % 2) * 12 - 6;

      ctx.save();
      ctx.strokeStyle = '#3a2a1c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, tlY + 2);
      ctx.lineTo(x, y + 28 + offset);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, tlY + 2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a017';
      ctx.fill();
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const bubbleW = 70;
      const bubbleH = 38;
      const bx = Math.min(Math.max(x - bubbleW / 2, tlLeft), tlRight - bubbleW);
      const by = y + 32 + offset;

      ctx.fillStyle = 'rgba(255, 250, 235, 0.95)';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1;
      const br = 5;
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.lineTo(bx + bubbleW - br, by);
      ctx.quadraticCurveTo(bx + bubbleW, by, bx + bubbleW, by + br);
      ctx.lineTo(bx + bubbleW, by + bubbleH - br);
      ctx.quadraticCurveTo(bx + bubbleW, by + bubbleH, bx + bubbleW - br, by + bubbleH);
      ctx.lineTo(bx + br, by + bubbleH);
      ctx.quadraticCurveTo(bx, by + bubbleH, bx, by + bubbleH - br);
      ctx.lineTo(bx, by + br);
      ctx.quadraticCurveTo(bx, by, bx + br, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 16px "Noto Serif SC", "FangSong", serif';
      ctx.fillStyle = '#2a1f14';
      ctx.textAlign = 'center';
      ctx.fillText(ev.note, bx + bubbleW / 2, by + 18);

      ctx.font = '9px monospace';
      ctx.fillStyle = '#8a7f6e';
      ctx.fillText(
        `${STRING_NAMES[ev.stringId]}弦·位${Math.round(ev.position * 100)}%`,
        bx + bubbleW / 2,
        by + 32
      );
      ctx.restore();
    });

    if (sortedEvents.length === 0) {
      ctx.save();
      ctx.font = 'italic 13px "Noto Serif SC", serif';
      ctx.fillStyle = '#a09080';
      ctx.textAlign = 'center';
      ctx.fillText('—— 暂无录音，点击"录制音阶"开始创作 ——', cssW / 2, eventRowY + 40);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.fillStyle = '#8a7f6e';
    ctx.textAlign = 'left';
    ctx.fillText(`共 ${sortedEvents.length} 音`, 18, cssH - 14);
    ctx.restore();

    try {
      setScoreImageUrl(canvas.toDataURL('image/png'));
    } catch {
      /* ignore canvas security errors */
    }
  }, [recordedEvents]);

  useEffect(() => {
    const timer = setTimeout(generateScore, 30);
    return () => clearTimeout(timer);
  }, [generateScore]);

  const handleDownload = () => {
    if (!scoreImageUrl) return;
    const a = document.createElement('a');
    a.href = scoreImageUrl;
    a.download = `古琴谱_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>七弦音律谱</h2>
          <span style={styles.cardHint}>减字谱 · 实时更新</span>
        </div>

        <div style={styles.jianziGrid}>
          {[...strings].reverse().map((s, revIdx) => {
            const idx = strings.length - 1 - revIdx;
            const freqInfo = calcNoteFromFreq(s.baseFreq, s.tension);
            const centsColor = Math.abs(freqInfo.cents) < 10 ? '#2d8048' :
                              Math.abs(freqInfo.cents) < 30 ? '#8a6d1c' : '#a23b2a';
            return (
              <div key={s.id} style={styles.jianziColumn}>
                <div style={styles.jianziBox}>
                  <div style={styles.jianziTop}>
                    <span style={styles.jianziSmallText}>{STRING_NAMES[idx]}</span>
                  </div>
                  <div style={styles.jianziMiddle}>
                    <span style={styles.jianziMainText}>{s.note}</span>
                  </div>
                  <div style={styles.jianziBottom}>
                    <span style={styles.jianziSmallText}>散</span>
                  </div>
                  <div style={styles.jianziBracketL} />
                  <div style={styles.jianziBracketR} />
                </div>
                <div style={styles.jianziMeta}>
                  <div style={{ ...styles.metaFreq, color: centsColor }}>
                    {freqInfo.note}{freqInfo.octave}
                  </div>
                  <div style={styles.metaCents}>
                    {freqInfo.cents > 0 ? '+' : ''}{freqInfo.cents}¢
                  </div>
                  <div style={styles.metaTension}>
                    T{s.tension.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '20px' }}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>制谱台</h2>
          <span style={styles.cardHint}>
            {isRecording
              ? `录制中 · 已录 ${recordedEvents.length} 音`
              : recordedEvents.length > 0
                ? `已存 ${recordedEvents.length} 音`
                : '录制音阶生成琴谱'}
          </span>
        </div>

        <div style={styles.btnRow}>
          {!isRecording ? (
            <button
              style={{
                ...styles.recordBtn,
                ...(btnHover ? styles.recordBtnHover : {})
              }}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              onClick={onStartRecording}
            >
              <span style={styles.recordDot} />
              录制音阶
            </button>
          ) : (
            <button
              style={{
                ...styles.recordBtn,
                background: 'linear-gradient(135deg, #c0392b 0%, #6b1d12 100%)',
                ...(btnHover ? styles.recordBtnHover : {})
              }}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              onClick={onStopRecording}
            >
              <span style={{ ...styles.recordDot, background: '#fff' }} />
              停止录制
            </button>
          )}

          <button
            style={{
              ...styles.secondaryBtn,
              opacity: recordedEvents.length ? 1 : 0.45,
              cursor: recordedEvents.length ? 'pointer' : 'not-allowed'
            }}
            onClick={handleDownload}
            disabled={!recordedEvents.length}
          >
            📥 导出琴谱图
          </button>
        </div>

        <div style={styles.timelineContainer}>
          <canvas ref={timelineCanvasRef} style={styles.timelineCanvas} />
        </div>

        {scoreImageUrl && recordedEvents.length > 0 && (
          <div style={styles.previewHint}>
            <span>预览已生成，可点击导出按钮下载 PNG 图片</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  },
  card: {
    background: 'rgba(245, 230, 200, 0.6)',
    border: '1px solid #b8860b',
    borderRadius: '8px',
    padding: '20px',
    backdropFilter: 'blur(6px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 12px rgba(92, 58, 33, 0.15)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(184, 134, 11, 0.3)'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2a1f14',
    letterSpacing: '3px',
    margin: 0
  },
  cardHint: {
    fontSize: '12px',
    color: '#8a7f6e',
    letterSpacing: '1px'
  },
  jianziGrid: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 4px',
    flexWrap: 'wrap'
  },
  jianziColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  jianziBox: {
    position: 'relative',
    width: '54px',
    height: '72px',
    background: 'linear-gradient(180deg, #faf3e0 0%, #e8d5ac 100%)',
    border: '1.5px solid #2a1f14',
    borderRadius: '3px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 8px rgba(92, 58, 33, 0.12), 2px 2px 0 rgba(42,31,20,0.15)'
  },
  jianziTop: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '0.8px solid rgba(42,31,20,0.35)'
  },
  jianziMiddle: {
    flex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '0.8px solid rgba(42,31,20,0.35)'
  },
  jianziBottom: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  jianziMainText: {
    fontSize: '30px',
    fontWeight: 700,
    color: '#2a1f14',
    fontFamily: '"Noto Serif SC", "FangSong", "STFangsong", serif',
    letterSpacing: '0',
    transform: 'scale(1.05, 1.15)',
    lineHeight: 1
  },
  jianziSmallText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3a2a1c',
    fontFamily: '"Noto Serif SC", "FangSong", serif'
  },
  jianziBracketL: {
    position: 'absolute',
    left: '5px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    borderLeft: '1.5px solid rgba(42,31,20,0.2)',
    pointerEvents: 'none'
  },
  jianziBracketR: {
    position: 'absolute',
    right: '5px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    borderRight: '1.5px solid rgba(42,31,20,0.2)',
    pointerEvents: 'none'
  },
  jianziMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 6px',
    background: 'rgba(42,31,20,0.05)',
    borderRadius: '4px',
    minWidth: '54px'
  },
  metaFreq: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  metaCents: {
    fontSize: '10px',
    color: '#8a7f6e',
    fontFamily: 'monospace'
  },
  metaTension: {
    fontSize: '9px',
    color: '#6b5a4a',
    fontFamily: 'monospace',
    letterSpacing: '0.5px'
  },
  btnRow: {
    display: 'flex',
    gap: '14px',
    marginBottom: '18px',
    flexWrap: 'wrap'
  },
  recordBtn: {
    position: 'relative',
    flex: 1,
    minWidth: '140px',
    padding: '12px 20px',
    border: '1px solid #b8860b',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #d2b48c 0%, #4a2c16 100%)',
    color: '#fff8e7',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '3px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
  },
  recordBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 5px 18px rgba(212, 160, 23, 0.45), 0 0 0 3px rgba(212, 160, 23, 0.18)',
    filter: 'brightness(1.08)'
  },
  recordDot: {
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    background: '#c0392b',
    boxShadow: '0 0 6px #c0392b',
    display: 'inline-block',
    animation: 'pulseRec 1s ease-in-out infinite'
  },
  secondaryBtn: {
    flex: 1,
    minWidth: '140px',
    padding: '12px 20px',
    border: '1px solid #8a7f6e',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #c9b89a 0%, #6b5a4a 100%)',
    color: '#fff8e7',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '2px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: '0 3px 10px rgba(0,0,0,0.18)'
  },
  timelineContainer: {
    border: '1px solid rgba(184, 134, 11, 0.35)',
    borderRadius: '6px',
    padding: '4px',
    background: '#faf2de'
  },
  timelineCanvas: {
    width: '100%',
    display: 'block',
    borderRadius: '4px'
  },
  previewHint: {
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(212, 160, 23, 0.1)',
    border: '1px solid rgba(212, 160, 23, 0.3)',
    borderRadius: '4px',
    color: '#6b4e13',
    fontSize: '12px',
    textAlign: 'center',
    letterSpacing: '1px'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulseRec {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.15); }
  }
`;
document.head.appendChild(styleSheet);

export default ScoreDisplay;
