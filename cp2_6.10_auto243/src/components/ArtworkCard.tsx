import { motion } from 'framer-motion'
import type { Exhibit } from '@/data/exhibits'

interface ArtworkCardProps {
  exhibit: Exhibit
  index: number
  onSelect: (exhibit: Exhibit) => void
  onCollect: (id: string) => void
}

export default function ArtworkCard({
  exhibit,
  index,
  onSelect,
  onCollect,
}: ArtworkCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-stamp-btn')) return
    onSelect(exhibit)
  }

  const handleStampClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exhibit.isCollected) {
      onCollect(exhibit.id)
    }
  }

  return (
    <motion.div
      className="artwork-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -8, boxShadow: '0 18px 40px rgba(0,0,0,0.5)' }}
      onClick={handleCardClick}
    >
      <img src={exhibit.thumbnail} alt={exhibit.title} loading="lazy" />

      {exhibit.isCollected && <div className="card-collected-badge" />}

      <div className="card-hover-mask">
        <span>查看护照</span>
      </div>

      <div className="card-overlay">
        <div className="card-title">{exhibit.title}</div>
        <div className="card-meta">
          {exhibit.artist} · {exhibit.year}
        </div>
      </div>

      <motion.button
        className="card-stamp-btn"
        onClick={handleStampClick}
        whileTap={!exhibit.isCollected ? { scale: 0.9 } : undefined}
        aria-label={exhibit.isCollected ? '已打卡' : '打卡收藏'}
      >
        <motion.div
          className={exhibit.isCollected ? 'card-stamp-active' : 'card-stamp-idle'}
          animate={
            exhibit.isCollected
              ? {
                  scale: [1, 1.2, 1],
                  transition: { duration: 0.4, ease: 'easeOut' },
                }
              : undefined
          }
          key={exhibit.isCollected ? `collected-${exhibit.id}` : `idle-${exhibit.id}`}
        >
          {exhibit.isCollected ? 'PASS' : '印章'}
        </motion.div>
      </motion.button>
    </motion.div>
  )
}
