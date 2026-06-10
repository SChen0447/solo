import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CreationStage } from '@/data/exhibits'

interface TimeLineProps {
  stages: CreationStage[]
}

export default function TimeLine({ stages }: TimeLineProps) {
  const [activeId, setActiveId] = useState<string | null>(
    stages.length > 0 ? stages[0].id : null,
  )

  const activeStage = stages.find((s) => s.id === activeId) ?? null

  return (
    <div className="timeline">
      <div className="timeline-track">
        <div className="timeline-line" />
        <div className="timeline-nodes">
          {stages.map((stage) => {
            const isActive = stage.id === activeId
            return (
              <div
                key={stage.id}
                className={`timeline-node ${isActive ? 'active' : ''}`}
                onClick={() => setActiveId(stage.id)}
              >
                <div className="timeline-dot" />
                <div className="timeline-node-title">{stage.title}</div>
                <div className="timeline-node-date">{stage.date}</div>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeStage && (
          <motion.div
            key={activeStage.id}
            className="timeline-desc-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <h4>{activeStage.title}</h4>
            <div className="sub">{activeStage.date}</div>
            <p>{activeStage.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
