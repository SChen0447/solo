import { useState, useCallback } from 'react'

interface FlipInteractionState {
  isFlipped: boolean
  isHovered: boolean
}

interface FlipInteractionHandlers {
  onFlip: () => void
  onFlipBack: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
}

export function useFlipInteraction(): FlipInteractionState & FlipInteractionHandlers {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const onFlip = useCallback(() => {
    setIsFlipped(true)
  }, [])

  const onFlipBack = useCallback(() => {
    setIsFlipped(false)
  }, [])

  const onHoverStart = useCallback(() => {
    setIsHovered(true)
  }, [])

  const onHoverEnd = useCallback(() => {
    setIsHovered(false)
  }, [])

  return {
    isFlipped,
    isHovered,
    onFlip,
    onFlipBack,
    onHoverStart,
    onHoverEnd,
  }
}
