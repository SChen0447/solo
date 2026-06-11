import React, { useState, useCallback, useEffect, useRef } from 'react'
import AudioVisualizer from './AudioVisualizer'
import type { PlaybackState, AudioMetadata } from '../utils/AudioManager'

interface TapeDeckProps {
  playbackState: PlaybackState
  currentTime: number
  duration: number
  isRecording: boolean
  audioMetadata: AudioMetadata | null
  analyser: AnalyserNode | null
  isVisualizerActive: boolean
  isDragOver: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onFastForward: () => void
  onRewind: () => void
  onRecord: () => void
  onFileUpload: (file: File) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const TapeReel: React.FC<{
  direction: 'left' | 'right'
  isPlaying: boolean
  isFast: boolean
  isPaused: boolean
  progress: number
}> = ({ direction, isPlaying, isFast, isPaused, progress }) => {
  const reelSize = 120
  const innerHubSize = 36
  const tapeWidth = direction === 'left' ? (1 - progress) * 28 + 8 : progress * 28 + 8

  const ringStripes = []
  for (let i = 0; i < 12; i++) {
    ringStripes.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          width: '100%',
          height: '2px',
          top: '50%',
          left: 0,
          transform: `translateY(-50%) rotate(${i * 30}deg)`,
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: reelSize,
        height: reelSize,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #D4A574 0%, #8B6914 50%, #6B4F1A 100%)',
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.3),
          inset 0 -2px 4px rgba(0,0,0,0.3),
          0 4px 12px rgba(0,0,0,0.4)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isPlaying && !isPaused
          ? `spin-${direction} ${isFast ? '0.8' : '2'}s linear infinite`
          : 'none',
        animationPlayState: isPaused ? 'paused' : 'running',
        transition: 'animation 0.3s ease-out',
      }}
      className="tape-reel"
    >
      <div
        style={{
          position: 'absolute',
          width: reelSize - tapeWidth * 2,
          height: reelSize - tapeWidth * 2,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #2D1810 0%, #1a0f0a 100%)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
        }}
      />

      {ringStripes}

      <div
        style={{
          position: 'absolute',
          width: innerHubSize,
          height: innerHubSize,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #C0C0C0 0%, #808080 50%, #404040 100%)',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.5),
            0 2px 6px rgba(0,0,0,0.3)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #E0E0E0, #A0A0A0)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)',
          }}
        />
      </div>

      {isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '60%',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

const ControlButton: React.FC<{
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'record' | 'primary'
  disabled?: boolean
  active?: boolean
}> = ({ onClick, children, variant = 'default', disabled = false, active = false }) => {
  const [pressed, setPressed] = useState(false)

  const handleClick = () => {
    if (disabled) return
    setPressed(true)
    setTimeout(() => setPressed(false), 150)
    onClick()
  }

  const baseColors = {
    default: {
      bg: 'linear-gradient(145deg, #D4A574 0%, #8B6914 100%)',
      shadow: active
        ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
        : '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
    },
    record: {
      bg: active
        ? 'linear-gradient(145deg, #FF5252 0%, #D32F2F 100%)'
        : 'linear-gradient(145deg, #E53935 0%, #B71C1C 100%)',
      shadow: active
        ? 'inset 0 2px 4px rgba(0,0,0,0.4), 0 0 20px rgba(255,82,82,0.8)'
        : '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
    },
    primary: {
      bg: 'linear-gradient(145deg, #4CAF50 0%, #2E7D32 100%)',
      shadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
    },
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        minWidth: 44,
        minHeight: 44,
        padding: '10px 16px',
        border: 'none',
        borderRadius: '8px',
        background: baseColors[variant].bg,
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: baseColors[variant].shadow,
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        opacity: disabled ? 0.5 : 1,
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        letterSpacing: '1px',
      }}
    >
      {children}
    </button>
  )
}

const TapeDeck: React.FC<TapeDeckProps> = ({
  playbackState,
  currentTime,
  duration,
  isRecording,
  audioMetadata,
  analyser,
  isVisualizerActive,
  isDragOver,
  onPlay,
  onPause,
  onStop,
  onFastForward,
  onRewind,
  onRecord,
  onFileUpload,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const [noiseLines, setNoiseLines] = useState<{ top: number; width: number; left: number }[]>([])

  const isPlaying = playbackState === 'playing' || playbackState === 'fastForward' || playbackState === 'rewind' || isRecording
  const isPaused = playbackState === 'paused'
  const isFast = playbackState === 'fastForward' || playbackState === 'rewind'
  const isRewind = playbackState === 'rewind'

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0

  useEffect(() => {
    if (isFast) {
      const interval = setInterval(() => {
        setShakeOffset({
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 6,
        })
      }, 100)
      return () => clearInterval(interval)
    } else {
      setShakeOffset({ x: 0, y: 0 })
    }
  }, [isFast])

  useEffect(() => {
    if (isRewind) {
      const generateNoise = () => {
        const lines = Array.from({ length: 15 }, () => ({
          top: Math.random() * 100,
          width: Math.random() * 60 + 20,
          left: Math.random() * 100,
        }))
        setNoiseLines(lines)
      }
      generateNoise()
      const interval = setInterval(generateNoise, 50)
      return () => clearInterval(interval)
    } else {
      setNoiseLines([])
    }
  }, [isRewind])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const displayTime = isRecording || isPlaying || isPaused ? currentTime : 0

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        position: 'relative',
        maxWidth: 500,
        width: '100%',
        margin: '0 auto',
        transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
        transition: isFast ? 'none' : 'transform 0.1s ease-out',
      }}
    >
      <style>{`
        @keyframes spin-left {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes spin-right {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .rec-blink {
          animation: blink 0.5s ease-in-out infinite;
        }
      `}</style>

      {isRewind && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {noiseLines.map((line, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${line.top}%`,
                left: `${line.left}%`,
                width: `${line.width}%`,
                height: '2px',
                backgroundColor: 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #F5DEB3 0%, #DEB887 50%, #D2B48C 100%)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: `
            0 10px 40px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 0 rgba(0,0,0,0.1)
          `,
          border: isDragOver ? '3px solid #FFD700' : '0.5px solid rgba(0,0,0,0.1)',
          transition: 'border-color 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Orbitron', monospace",
            fontSize: '11px',
            color: '#FF5252',
            textShadow: '0 0 10px rgba(255,82,82,0.5)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#FF5252',
              boxShadow: '0 0 8px rgba(255,82,82,0.8)',
            }}
            className={isRecording ? 'rec-blink' : ''}
          />
          <span>{isRecording ? 'REC' : ''}</span>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '16px',
            fontSize: '10px',
            color: '#8B4513',
            fontFamily: "'Orbitron', monospace",
            letterSpacing: '2px',
          }}
        >
          VINTAGE
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #3E2723 0%, #2D1810 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '24px',
            boxShadow: `
              inset 0 4px 12px rgba(0,0,0,0.6),
              inset 0 -2px 4px rgba(255,255,255,0.05)
            `,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <TapeReel
              direction="left"
              isPlaying={isPlaying}
              isFast={isFast}
              isPaused={isPaused}
              progress={progress}
            />

            <div
              style={{
                position: 'relative',
                width: '80px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '-20px',
                  right: '-20px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #1a0f0a 0%, #3E2723 50%, #1a0f0a 100%)',
                  transform: 'translateY(-50%)',
                }}
              />

              <div
                style={{
                  width: '40px',
                  height: '20px',
                  background: 'linear-gradient(180deg, rgba(200,200,200,0.4) 0%, rgba(150,150,150,0.2) 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '3px',
                  backdropFilter: 'blur(2px)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '4px',
                    background: 'linear-gradient(180deg, #666 0%, #333 100%)',
                    borderRadius: '1px',
                  }}
                />
              </div>
            </div>

            <TapeReel
              direction="right"
              isPlaying={isPlaying}
              isFast={isFast}
              isPaused={isPaused}
              progress={progress}
            />
          </div>

          <div
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '24px',
              color: '#76FF03',
              textAlign: 'center',
              padding: '8px 16px',
              background: '#0A0A0A',
              borderRadius: '6px',
              textShadow: '0 0 10px rgba(118, 255, 3, 0.5)',
              letterSpacing: '4px',
              border: '2px solid #1B3A0A',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
              marginBottom: '12px',
            }}
          >
            {formatTime(displayTime)}
          </div>

          <AudioVisualizer analyser={analyser} isActive={isVisualizerActive} />
        </div>

        {audioMetadata && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(139, 69, 19, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 69, 19, 0.2)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#5D4037', marginBottom: '4px', fontWeight: 600 }}>
              {audioMetadata.fileName}
            </div>
            <div style={{ fontSize: '11px', color: '#795548', display: 'flex', gap: '16px' }}>
              <span>时长: {formatTime(audioMetadata.duration)}</span>
              <span>采样率: {audioMetadata.sampleRate}Hz</span>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          <ControlButton onClick={onRewind} disabled={!audioMetadata && !isRecording}>
            ◀◀
          </ControlButton>
          <ControlButton
            onClick={playbackState === 'playing' || isRecording ? onPause : onPlay}
            variant="primary"
            disabled={!audioMetadata && !isRecording}
            active={isPlaying}
          >
            {playbackState === 'playing' ? '⏸' : '▶'}
          </ControlButton>
          <ControlButton onClick={onStop} disabled={!audioMetadata && !isRecording}>
            ⏹
          </ControlButton>
          <ControlButton onClick={onFastForward} disabled={!audioMetadata && !isRecording}>
            ▶▶
          </ControlButton>
          <ControlButton
            onClick={onRecord}
            variant="record"
            active={isRecording}
          >
            REC
          </ControlButton>
        </div>

        <div
          onClick={handleUploadClick}
          style={{
            marginTop: '12px',
            padding: '12px',
            textAlign: 'center',
            border: '2px dashed #8B4513',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: isDragOver ? 'rgba(255, 215, 0, 0.1)' : 'rgba(139, 69, 19, 0.05)',
            transition: 'background-color 0.2s ease',
            boxShadow: isDragOver ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none',
          }}
        >
          <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: 500 }}>
            {audioMetadata ? '点击或拖拽更换音频文件' : '点击或拖拽上传音频文件 (MP3/WAV)'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp3"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          padding: '0 20px',
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '20px',
              height: '4px',
              background: 'linear-gradient(180deg, #8B4513 0%, #5D2E0A 100%)',
              borderRadius: '2px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default TapeDeck
