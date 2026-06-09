import React, { useRef, useEffect, useState, useCallback } from 'react'
import { PartData } from '../data/partsData'

interface ShadowPartProps {
  part: PartData
  spotlightX: number
  spotlightY: number
  revealAll: boolean
  onPartClick: (part: PartData) => void
}

const SPOTLIGHT_RADIUS = 120

const ShadowPart: React.FC<ShadowPartProps> = ({
  part,
  spotlightX,
  spotlightY,
  revealAll,
  onPartClick,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const clippedRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [labelVisible, setLabelVisible] = useState(false)
  const localSpotRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  const updateClipPath = useCallback(() => {
    if (!clippedRef.current || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const localX = localSpotRef.current.x - rect.left
    const localY = localSpotRef.current.y - rect.top
    clippedRef.current.style.clipPath = `circle(${SPOTLIGHT_RADIUS}px at ${localX}px ${localY}px)`
    clippedRef.current.style.webkitClipPath = `circle(${SPOTLIGHT_RADIUS}px at ${localX}px ${localY}px)`
  }, [])

  useEffect(() => {
    localSpotRef.current = { x: spotlightX, y: spotlightY }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateClipPath)

    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      const localX = spotlightX - rect.left
      const localY = spotlightY - rect.top
      const distance = Math.sqrt(
        Math.pow(localX - rect.width / 2, 2) +
        Math.pow(localY - rect.height / 2, 2)
      )
      const closestEdge = Math.min(
        Math.abs(localX),
        Math.abs(localX - rect.width),
        Math.abs(localY),
        Math.abs(localY - rect.height)
      )
      setLabelVisible(closestEdge < SPOTLIGHT_RADIUS + 20 || revealAll)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [spotlightX, spotlightY, revealAll, updateClipPath])

  const handleMouseEnter = () => {
    setHovered(true)
  }

  const handleMouseLeave = () => {
    setHovered(false)
  }

  const handleClick = () => {
    onPartClick(part)
  }

  return (
    <div
      ref={wrapperRef}
      className={`part-wrapper ${revealAll ? 'reveal-mode' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className={`part-svg ${hovered ? 'hovered' : ''}`}>
        <svg viewBox={part.viewBox} xmlns="http://www.w3.org/2000/svg">
          <path d={part.svgPath} />
        </svg>
      </div>
      <div ref={clippedRef} className="part-clipped">
        <svg viewBox={part.viewBox} xmlns="http://www.w3.org/2000/svg">
          <path d={part.svgPath} />
        </svg>
      </div>
      <div className={`part-label ${labelVisible || revealAll ? 'visible' : ''}`}>
        {part.name}
      </div>
    </div>
  )
}

export default ShadowPart
