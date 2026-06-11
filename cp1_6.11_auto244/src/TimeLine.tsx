import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OceanSnapshot } from './OceanCanvas'

interface TimeLineProps {
  snapshots: OceanSnapshot[]
  onPlayback: (snapshot: OceanSnapshot) => void
  selectedIndex: number | null
  onSelect: (index: number | null) => void
}

export default function TimeLine({ snapshots, onPlayback, selectedIndex, onSelect }: TimeLineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastLen = useRef(snapshots.length)

  useEffect(() => {
    if (snapshots.length > lastLen.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      })
    }
    lastLen.current = snapshots.length
  }, [snapshots.length])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div
      className="fixed left-1/2 bottom-4 z-30 -translate-x-1/2"
      style={{ width: '80%', maxWidth: '1200px' }}
    >
      <motion.div
        className="relative rounded-xl overflow-hidden"
        style={{
          height: 60,
          background: 'linear-gradient(180deg, rgba(26,26,46,0.85) 0%, rgba(26,26,46,0.4) 70%, transparent 100%)',
          border: '1px solid rgba(0,188,212,0.15)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-2 gap-2">
          <span className="text-[10px] opacity-60" style={{ color: '#8fd4dc' }}>📜</span>
          <span className="text-[11px] font-medium tracking-wide" style={{ color: '#00bcd4' }}>
            光谱时间线
          </span>
          <span className="text-[10px] opacity-50 ml-1" style={{ color: '#8fd4dc' }}>
            · 每15秒自动记录 · 共 {snapshots.length} 个节点
          </span>
          <div className="flex-1" />
          {snapshots.length > 0 && (
            <span className="text-[10px] opacity-50" style={{ color: '#8fd4dc' }}>
              {formatDate(snapshots[0].timestamp)}
            </span>
          )}
        </div>

        <div
          ref={scrollRef}
          className="absolute bottom-0 left-0 right-0 overflow-x-auto overflow-y-hidden"
          style={{
            height: 40,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            > div::-webkit-scrollbar { display: none; }
          `}</style>
          <div
            className="relative h-full flex items-center px-8"
            style={{ minWidth: '100%', width: 'max-content' }}
          >
            <svg
              className="absolute top-1/2 left-8 right-8 pointer-events-none"
              style={{
                height: 2,
                width: `calc(100% - 64px + ${Math.max(0, snapshots.length - 1) * 52}px)`,
                transform: 'translateY(-50%)',
              }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4a4a6a" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#4a4a6a" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#4a4a6a" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="url(#lineGrad)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            </svg>

            <div className="relative flex items-center gap-[52px]">
              <AnimatePresence>
                {snapshots.map((snap, idx) => {
                  const brightnessScale = 0.5 + snap.avgBrightness * 0.8
                  const isSelected = selectedIndex === idx

                  return (
                    <motion.div
                      key={snap.timestamp}
                      className="relative flex-shrink-0"
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{ zIndex: isSelected ? 10 : 1 }}
                    >
                      <motion.button
                        className="relative rounded-full flex items-center justify-center cursor-pointer p-0"
                        onClick={() => {
                          if (isSelected) {
                            onSelect(null)
                          } else {
                            onSelect(idx)
                            onPlayback(snap)
                          }
                        }}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                          scale: isSelected ? 1.4 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: 12,
                          height: 12,
                          background: snap.dominantColor,
                          boxShadow: isSelected
                            ? `0 0 20px ${snap.dominantColor}, 0 0 40px ${snap.dominantColor}80, 0 0 0 3px rgba(0,188,212,0.4)`
                            : `0 0 ${8 + brightnessScale * 10}px ${snap.dominantColor}, 0 0 16px ${snap.dominantColor}60`,
                          border: `1.5px solid ${isSelected ? '#00bcd4' : 'rgba(255,255,255,0.3)'}`,
                        }}
                      />

                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none"
                          >
                            <div
                              className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap"
                              style={{
                                background: 'rgba(10,17,40,0.95)',
                                border: '1px solid rgba(0,188,212,0.3)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(0,188,212,0.1)',
                              }}
                            >
                              <div className="font-mono font-semibold mb-1" style={{ color: '#00ffaa' }}>
                                ⏱ {formatTime(snap.timestamp)}
                              </div>
                              <div className="space-y-0.5" style={{ color: '#b4e6ec' }}>
                                <div>🌊 潮汐: <span className="font-mono">{Math.round(snap.params.tideStrength)}</span></div>
                                <div>🌡️ 水温: <span className="font-mono">{snap.params.waterTemperature.toFixed(1)}°C</span></div>
                                <div>🧪 营养盐: <span className="font-mono">{Math.round(snap.params.nutrientConcentration)}</span></div>
                                <div className="pt-1 mt-1 border-t" style={{ borderColor: 'rgba(0,188,212,0.15)' }}>
                                  ✨ 亮度: <span className="font-mono">{Math.round(snap.avgBrightness * 100)}%</span>
                                </div>
                              </div>
                              <div
                                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                style={{
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(0,188,212,0.3)',
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[9px] font-mono pointer-events-none opacity-60"
                        style={{ color: '#8fd4dc' }}
                      >
                        {formatTime(snap.timestamp).slice(3)}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {snapshots.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] opacity-40 animate-pulse" style={{ color: '#8fd4dc' }}>
                  ⏳ 等待记录光谱节点...（每15秒自动记录）
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
