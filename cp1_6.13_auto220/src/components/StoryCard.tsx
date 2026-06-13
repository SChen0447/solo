import { useRef, useEffect, useState, useCallback } from 'react'
import gsap from 'gsap'
import type { StoryNode, StoryOption } from '@/services/storyService'

interface StoryCardProps {
  node: StoryNode
  onChoose: (nextNodeId: string) => void
  direction: string
}

const DIRECTIONS: Record<string, { x: number; y: number }> = {
  left: { x: -200, y: 0 },
  right: { x: 200, y: 0 },
  top: { x: 0, y: -200 },
  bottom: { x: 0, y: 200 },
}

function getRandomDirection(): string {
  const dirs = ['left', 'right', 'top', 'bottom']
  return dirs[Math.floor(Math.random() * dirs.length)]
}

export default function StoryCard({ node, onChoose, direction }: StoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!cardRef.current) return

    const dir = DIRECTIONS[direction] || DIRECTIONS.right
    gsap.fromTo(
      cardRef.current,
      { x: dir.x, y: dir.y, opacity: 0, scale: 0.8 },
      { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }
    )

    if (optionsRef.current) {
      const buttons = optionsRef.current.querySelectorAll('.option-btn')
      gsap.fromTo(
        buttons,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
      )
    }
  }, [node.id, direction])

  const handleChoose = useCallback(
    (option: StoryOption) => {
      if (animating) return
      setAnimating(true)

      if (!cardRef.current) {
        onChoose(option.nextNodeId)
        return
      }

      const outDir = getRandomDirection()
      const dir = DIRECTIONS[outDir] || DIRECTIONS.left

      gsap.to(cardRef.current, {
        x: dir.x,
        y: dir.y,
        opacity: 0,
        scale: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          onChoose(option.nextNodeId)
          setAnimating(false)
        },
      })
    },
    [animating, onChoose]
  )

  return (
    <div ref={cardRef} className="story-card" style={{ opacity: 0 }}>
      <div className="story-card-inner">
        <p className="story-text">{node.text}</p>
        <div ref={optionsRef} className="story-options">
          {node.options.map((option, idx) => (
            <button
              key={idx}
              className="option-btn"
              onClick={() => handleChoose(option)}
              disabled={animating}
            >
              <span className="option-text">{option.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
