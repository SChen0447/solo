import { useState, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { FlipCard } from './FlipCard'
import type { CardData, Category } from '../data/cards'

type FilterKey = 'all' | Category

interface FilterOption {
  key: FilterKey
  label: string
}

const filters: FilterOption[] = [
  { key: 'all', label: '全部' },
  { key: 'nature', label: '自然' },
  { key: 'architecture', label: '建筑' },
  { key: 'technology', label: '科技' },
]

interface GalleryProps {
  cards: CardData[]
}

export function Gallery({ cards }: GalleryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filteredCards = useMemo(() => {
    if (activeFilter === 'all') return cards
    return cards.filter((card) => card.category === activeFilter)
  }, [cards, activeFilter])

  return (
    <LayoutGroup>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 300,
              color: '#2C3E50',
              margin: '0 0 12px 0',
              letterSpacing: '3px',
            }}
          >
            立体翻卡画廊
          </h1>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 300,
              color: '#7F8C8D',
              margin: 0,
              letterSpacing: '1px',
            }}
          >
            点击卡片，探索隐藏的精彩世界
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '40px',
            overflowX: 'auto',
            padding: '8px 4px',
            scrollbarWidth: 'none',
          }}
          className="filter-bar"
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key
            return (
              <motion.button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  backgroundColor: isActive ? '#2C3E50' : 'rgba(255,255,255,0.6)',
                  color: isActive ? 'white' : '#2C3E50',
                  boxShadow: isActive ? '0 4px 16px rgba(44,62,80,0.2)' : 'none',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 400,
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  fontFamily: 'inherit',
                }}
              >
                {filter.label}
              </motion.button>
            )
          })}
        </motion.div>

        <motion.div
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 280px)',
            gap: '32px',
            justifyContent: 'center',
            minHeight: '800px',
          }}
          className="gallery-grid"
        >
          <AnimatePresence mode="popLayout">
            {filteredCards.map((card, index) => (
              <FlipCard key={card.id} card={card} index={index} />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#7F8C8D',
              fontSize: '18px',
              fontWeight: 300,
            }}
          >
            该分类暂无卡片
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  )
}
