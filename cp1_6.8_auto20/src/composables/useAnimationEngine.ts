import { ref, computed, onUnmounted } from 'vue'
import type { Keyframe, PrototypeElement, ElementStyle } from '@/types'
import { getEasingFunction } from '@/utils/easing'
import { compressKeyframes } from '@/utils/helpers'

interface AnimationEngineOptions {
  onFrame?: (elements: PrototypeElement[]) => void
  onComplete?: () => void
}

export function useAnimationEngine(
  initialElements: PrototypeElement[],
  options: AnimationEngineOptions = {}
) {
  const elements = ref<PrototypeElement[]>(JSON.parse(JSON.stringify(initialElements)))
  const keyframes = ref<Keyframe[]>([])
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)
  const isRecording = ref(false)
  const playbackSpeed = ref(1)
  const isReversing = ref(false)

  let animationFrameId: number | null = null
  let lastTimestamp: number = 0
  let recordingStartTime: number = 0
  let recordedKeyframes: Keyframe[] = []
  let initialStates: Map<string, ElementStyle> = new Map()

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  const getElementStateAtTime = (
    elementId: string,
    time: number,
    baseElements: PrototypeElement[]
  ): ElementStyle | null => {
    const element = baseElements.find((e) => e.id === elementId)
    if (!element) return null

    const elementKeyframes = keyframes.value
      .filter((k) => k.elementId === elementId && k.timestamp <= time)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (elementKeyframes.length === 0) {
      return { ...element.style }
    }

    const style = { ...element.style }

    const propertyGroups = new Map<string, Keyframe[]>()
    for (const kf of elementKeyframes) {
      if (!propertyGroups.has(kf.property)) {
        propertyGroups.set(kf.property, [])
      }
      propertyGroups.get(kf.property)!.push(kf)
    }

    for (const [prop, kfs] of propertyGroups) {
      if (kfs.length === 1) {
        const kf = kfs[0]
        if (typeof kf.value === 'number' && prop in style) {
          ;(style as Record<string, number>)[prop] = kf.value
        }
      } else {
        let prevKf = kfs[0]
        let nextKf = kfs[kfs.length - 1]

        for (let i = 0; i < kfs.length - 1; i++) {
          if (kfs[i].timestamp <= time && kfs[i + 1].timestamp >= time) {
            prevKf = kfs[i]
            nextKf = kfs[i + 1]
            break
          }
        }

        if (prevKf.timestamp === nextKf.timestamp) {
          if (typeof prevKf.value === 'number' && prop in style) {
            ;(style as Record<string, number>)[prop] = prevKf.value
          }
        } else {
          const progress = (time - prevKf.timestamp) / (nextKf.timestamp - prevKf.timestamp)
          const eased = getEasingFunction('ease-out')(progress)

          if (
            typeof prevKf.value === 'number' &&
            typeof nextKf.value === 'number' &&
            prop in style
          ) {
            const startVal = prevKf.value
            const endVal = nextKf.value
            ;(style as Record<string, number>)[prop] = startVal + (endVal - startVal) * eased
          }
        }
      }
    }

    return style
  }

  const updateElementsToTime = (time: number): void => {
    const baseElements = JSON.parse(JSON.stringify(initialElements.value)) as PrototypeElement[]

    elements.value = baseElements.map((el) => {
      const state = getElementStateAtTime(el.id, time, baseElements)
      if (state) {
        return { ...el, style: state }
      }
      return el
    })

    if (options.onFrame) {
      options.onFrame(elements.value)
    }
  }

  const animate = (timestamp: number): void => {
    if (!isPlaying.value) return

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp
    }

    const delta = (timestamp - lastTimestamp) * playbackSpeed.value
    lastTimestamp = timestamp

    if (isReversing.value) {
      currentTime.value = Math.max(0, currentTime.value - delta)
      if (currentTime.value <= 0) {
        currentTime.value = 0
        isPlaying.value = false
        if (options.onComplete) {
          options.onComplete()
        }
        return
      }
    } else {
      currentTime.value = Math.min(duration.value, currentTime.value + delta)
      if (currentTime.value >= duration.value) {
        currentTime.value = duration.value
        isPlaying.value = false
        if (options.onComplete) {
          options.onComplete()
        }
        return
      }
    }

    updateElementsToTime(currentTime.value)
    animationFrameId = requestAnimationFrame(animate)
  }

  const play = (reverse: boolean = false): void => {
    if (keyframes.value.length === 0) return

    isReversing.value = reverse

    if (!reverse && currentTime.value >= duration.value) {
      currentTime.value = 0
    }
    if (reverse && currentTime.value <= 0) {
      currentTime.value = duration.value
    }

    isPlaying.value = true
    lastTimestamp = 0
    animationFrameId = requestAnimationFrame(animate)
  }

  const pause = (): void => {
    isPlaying.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const stop = (): void => {
    pause()
    currentTime.value = 0
    updateElementsToTime(0)
  }

  const seek = (time: number): void => {
    currentTime.value = Math.max(0, Math.min(duration.value, time))
    updateElementsToTime(currentTime.value)
  }

  const seekByProgress = (percent: number): void => {
    seek((percent / 100) * duration.value)
  }

  const startRecording = (currentElements: PrototypeElement[]): void => {
    isRecording.value = true
    recordingStartTime = performance.now()
    recordedKeyframes = []
    initialStates = new Map()

    for (const el of currentElements) {
      initialStates.set(el.id, { ...el.style })
    }
  }

  const recordKeyframe = (
    elementId: string,
    property: keyof ElementStyle | 'interaction',
    value: number | string,
    interactionType?: string
  ): void => {
    if (!isRecording.value) return

    const timestamp = performance.now() - recordingStartTime

    const keyframe: Keyframe = {
      id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      elementId,
      timestamp,
      property,
      value,
      ...(interactionType ? { interactionType: interactionType as any } : {})
    }

    recordedKeyframes.push(keyframe)
  }

  const stopRecording = (): Keyframe[] => {
    isRecording.value = false

    const compressed = compressKeyframes(recordedKeyframes, 200)
    keyframes.value = compressed

    if (compressed.length > 0) {
      duration.value = compressed[compressed.length - 1].timestamp
    }

    return compressed
  }

  const setKeyframes = (kfs: Keyframe[], dur: number): void => {
    keyframes.value = kfs
    duration.value = dur
    currentTime.value = 0
  }

  const setPlaybackSpeed = (speed: number): void => {
    playbackSpeed.value = speed
  }

  const reset = (newElements?: PrototypeElement[]): void => {
    pause()
    keyframes.value = []
    currentTime.value = 0
    duration.value = 0
    recordedKeyframes = []
    initialStates.clear()

    if (newElements) {
      initialElements.value = newElements
      elements.value = JSON.parse(JSON.stringify(newElements))
    }
  }

  const updateInitialElements = (newElements: PrototypeElement[]): void => {
    if (!isPlaying.value && !isRecording.value) {
      elements.value = JSON.parse(JSON.stringify(newElements))
    }
  }

  onUnmounted(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
  })

  return {
    elements,
    keyframes,
    currentTime,
    duration,
    isPlaying,
    isRecording,
    playbackSpeed,
    progress,
    play,
    pause,
    stop,
    seek,
    seekByProgress,
    startRecording,
    recordKeyframe,
    stopRecording,
    setKeyframes,
    setPlaybackSpeed,
    reset,
    updateInitialElements
  }
}
