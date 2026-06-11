import React, { useState, useEffect, useCallback, useRef } from 'react'
import TapeDeck from './components/TapeDeck'
import { AudioManager, type PlaybackState, type AudioMetadata } from './utils/AudioManager'

const App: React.FC = () => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const audioManagerRef = useRef<AudioManager | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  useEffect(() => {
    const manager = new AudioManager({
      onStateChange: (state) => {
        setPlaybackState(state)
      },
      onTimeUpdate: (time) => {
        setCurrentTime(time)
      },
      onEnded: () => {
        setPlaybackState('idle')
        setCurrentTime(0)
      },
    })

    audioManagerRef.current = manager
    setAnalyser(manager.getAnalyser())

    return () => {
      manager.destroy()
    }
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!audioManagerRef.current) return

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
      alert('请上传MP3或WAV格式的音频文件')
      return
    }

    try {
      const metadata = await audioManagerRef.current.loadAudioFile(file)
      setAudioMetadata(metadata)
      setDuration(metadata.duration)
      setCurrentTime(0)
      setPlaybackState('idle')
    } catch (error) {
      console.error('Failed to load audio file:', error)
      alert('音频文件加载失败，请尝试其他文件')
    }
  }, [])

  const handlePlay = useCallback(() => {
    if (!audioManagerRef.current) return
    audioManagerRef.current.play()
  }, [])

  const handlePause = useCallback(() => {
    if (!audioManagerRef.current) return
    audioManagerRef.current.pause()
  }, [])

  const handleStop = useCallback(() => {
    if (!audioManagerRef.current) return
    audioManagerRef.current.stop()
    setCurrentTime(0)
  }, [])

  const handleFastForward = useCallback(() => {
    if (!audioManagerRef.current) return
    audioManagerRef.current.fastForward()
  }, [])

  const handleRewind = useCallback(() => {
    if (!audioManagerRef.current) return
    audioManagerRef.current.rewind()
  }, [])

  const handleRecord = useCallback(async () => {
    if (!audioManagerRef.current) return

    if (isRecording) {
      const blob = audioManagerRef.current.stopRecording()
      setIsRecording(false)
      if (blob) {
        console.log('Recording finished, blob size:', blob.size)
      }
    } else {
      try {
        await audioManagerRef.current.startRecording()
        setIsRecording(true)
        setAudioMetadata(null)
        setDuration(0)
        setCurrentTime(0)
      } catch (error) {
        console.error('Failed to start recording:', error)
        alert('无法开始录制，请确保已授权麦克风权限')
      }
    }
  }, [isRecording])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const isVisualizerActive = playbackState === 'playing' ||
    playbackState === 'fastForward' ||
    playbackState === 'rewind' ||
    isRecording

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: `
          repeating-linear-gradient(
            90deg,
            #8B4513 0px,
            #A0522D 2px,
            #8B4513 4px,
            #6B3E0A 8px
          ),
          linear-gradient(180deg, #A0522D 0%, #8B4513 50%, #6B3E0A 100%)
        `,
        backgroundBlendMode: 'multiply',
        fontFamily: "'Noto Sans SC', sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              color: '#F5DEB3',
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              letterSpacing: '4px',
            }}
          >
            复古磁带录音机
          </h1>
          <p
            style={{
              color: '#DEB887',
              fontSize: '14px',
              marginTop: '8px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            Vintage Tape Recorder
          </p>
        </div>

        <TapeDeck
          playbackState={playbackState}
          currentTime={currentTime}
          duration={duration}
          isRecording={isRecording}
          audioMetadata={audioMetadata}
          analyser={analyser}
          isVisualizerActive={isVisualizerActive}
          isDragOver={isDragOver}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onFastForward={handleFastForward}
          onRewind={handleRewind}
          onRecord={handleRecord}
          onFileUpload={handleFileUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        <div style={{ textAlign: 'center', marginTop: '24px', color: '#DEB887', fontSize: '12px', opacity: 0.7 }}>
          支持 MP3 / WAV 格式 · 拖拽文件到录音机上加载
        </div>
      </div>
    </div>
  )
}

export default App
