import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { exhibits as initialExhibits, type Exhibit } from '@/data/exhibits'
import ArtworkCard from '@/components/ArtworkCard'
import TimeLine from '@/components/TimeLine'
import '@/styles/global.css'

export default function App() {
  const [exhibits, setExhibits] = useState<Exhibit[]>(initialExhibits)
  const [selected, setSelected] = useState<Exhibit | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [countBump, setCountBump] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const total = exhibits.length
  const collectedCount = useMemo(
    () => exhibits.filter((e) => e.isCollected).length,
    [exhibits],
  )
  const progressRatio = total > 0 ? collectedCount / total : 0

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (!selected) {
      stopSpeaking()
    }
  }, [selected])

  const handleSelect = (exhibit: Exhibit) => {
    const current = exhibits.find((e) => e.id === exhibit.id)
    setSelected(current ?? exhibit)
  }

  const handleClose = () => {
    setSelected(null)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleCollect = (id: string) => {
    setExhibits((prev) => {
      const next = prev.map((e) =>
        e.id === id && !e.isCollected ? { ...e, isCollected: true } : e,
      )
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        setCountBump((c) => c + 1)
      }
      return next
    })
    if (selected && selected.id === id) {
      setSelected((s) => (s ? { ...s, isCollected: true } : s))
    }
  }

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setIsSpeaking(false)
  }

  const toggleSpeaking = () => {
    if (!selected) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    if (isSpeaking) {
      stopSpeaking()
      return
    }
    const utterance = new SpeechSynthesisUtterance(selected.audioGuideText)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  const ringSize = 90
  const radius = 36
  const stroke = 4
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progressRatio)

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            PASSPORT<span>艺术护照</span>
          </h1>
        </div>

        <div className="progress-ring-wrap">
          <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8c55b" />
                <stop offset="100%" stopColor="#d4a373" />
              </linearGradient>
            </defs>
          </svg>
          <motion.span
            className="progress-ring-text"
            key={`${collectedCount}-${countBump}`}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {collectedCount}/{total}
          </motion.span>
        </div>
      </header>

      <main className="card-grid">
        {exhibits.map((exhibit, i) => (
          <ArtworkCard
            key={exhibit.id}
            exhibit={exhibit}
            index={i}
            onSelect={handleSelect}
            onCollect={handleCollect}
          />
        ))}
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="modal-backdrop"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="modal-panel"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={handleClose} aria-label="关闭">
                ✕
              </button>

              <motion.button
                className="modal-audio-btn"
                onClick={toggleSpeaking}
                animate={isSpeaking ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isSpeaking
                    ? { duration: 2, repeat: Infinity, ease: 'linear' }
                    : { duration: 0.2 }
                }
                aria-label={isSpeaking ? '暂停语音导览' : '播放语音导览'}
              >
                {isSpeaking ? '❚❚' : '▶'}
              </motion.button>

              <div className="modal-hero">
                <img src={selected.hdImages[0]} alt={selected.title} />
              </div>

              <div className="modal-body">
                <div className="modal-head">
                  <div>
                    <h2 className="modal-title">{selected.title}</h2>
                    <div className="modal-artist">
                      {selected.artist}
                      <span>·</span>
                      {selected.year}
                    </div>
                    <div className="modal-tech">{selected.technique}</div>
                  </div>
                </div>

                <p className="modal-desc">{selected.description}</p>

                <div className="modal-section-label">创作过程 · TIMELINE</div>
                <TimeLine stages={selected.stages} />

                <div className="modal-stamp-row">
                  <div
                    className="modal-stamp-btn"
                    onClick={() => !selected.isCollected && handleCollect(selected.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !selected.isCollected) {
                        handleCollect(selected.id)
                      }
                    }}
                  >
                    <span className="modal-stamp-label">
                      {selected.isCollected ? '已打卡收藏' : '点击印章打卡'}
                    </span>
                    <motion.div
                      className={`modal-stamp-icon ${selected.isCollected ? 'active' : 'idle'}`}
                      animate={
                        selected.isCollected
                          ? {
                              scale: [1, 1.2, 1],
                              transition: { duration: 0.4, ease: 'easeOut' },
                            }
                          : undefined
                      }
                      key={selected.isCollected ? `mcollected-${selected.id}` : `midle-${selected.id}`}
                    >
                      {selected.isCollected ? 'PASSED' : '盖章'}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
