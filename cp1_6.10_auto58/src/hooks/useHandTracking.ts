import { useEffect, useRef, useState, useCallback } from 'react'
import { Hands, Results } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

export interface Point2D {
  x: number
  y: number
}

export interface HandState {
  isPinching: boolean
  middleFingerTip: Point2D | null
  leftPalm: Point2D | null
  isLeftHandDetected: boolean
  isRightHandDetected: boolean
}

const PINCH_THRESHOLD = 0.15
const FADE_DURATION = 5000

interface HandStateRef {
  isPinching: boolean
  pinchStartTime: number
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const [handState, setHandState] = useState<HandState>({
    isPinching: false,
    middleFingerTip: null,
    leftPalm: null,
    isLeftHandDetected: false,
    isRightHandDetected: false,
  })

  const handsRef = useRef<Hands | null>(null)
  const cameraRef = useRef<Camera | null>(null)
  const lastPinchRef = useRef<HandStateRef>({ isPinching: false, pinchStartTime: 0 })
  const onResultsCallback = useRef<((results: Results) => void) | null>(null)

  const calculateDistance = (p1: Point2D, p2: Point2D): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  const handleResults = useCallback((results: Results) => {
    if (!results.multiHandLandmarks || !results.multiHandedness) {
      setHandState({
        isPinching: false,
        middleFingerTip: null,
        leftPalm: null,
        isLeftHandDetected: false,
        isRightHandDetected: false,
      })
      return
    }

    let leftPalm: Point2D | null = null
    let rightPinchTip: Point2D | null = null
    let isPinching = false
    let isLeftHandDetected = false
    let isRightHandDetected = false

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i]
      const handedness = results.multiHandedness[i]
      const label = handedness.label

      if (label === 'Left') {
        isLeftHandDetected = true
        const palmLandmark = landmarks[0]
        leftPalm = {
          x: palmLandmark.x,
          y: palmLandmark.y,
        }
      } else if (label === 'Right') {
        isRightHandDetected = true

        const thumbTip = landmarks[4]
        const indexTip = landmarks[8]
        const middleTip = landmarks[12]
        const wrist = landmarks[0]
        const middleMcp = landmarks[9]

        const p1: Point2D = { x: thumbTip.x, y: thumbTip.y }
        const p2: Point2D = { x: indexTip.x, y: indexTip.y }
        const ref1: Point2D = { x: wrist.x, y: wrist.y }
        const ref2: Point2D = { x: middleMcp.x, y: middleMcp.y }

        const pinchDistance = calculateDistance(p1, p2)
        const referenceDistance = calculateDistance(ref1, ref2)
        const pinchRatio = pinchDistance / referenceDistance

        const now = Date.now()
        if (pinchRatio < PINCH_THRESHOLD) {
          if (!lastPinchRef.current.isPinching) {
            lastPinchRef.current.pinchStartTime = now
          }
          isPinching = true
          lastPinchRef.current.isPinching = true
        } else {
          if (lastPinchRef.current.isPinching && now - lastPinchRef.current.pinchStartTime < 150) {
            isPinching = true
          } else {
            isPinching = false
            lastPinchRef.current.isPinching = false
          }
        }

        rightPinchTip = {
          x: middleTip.x,
          y: middleTip.y,
        }
      }
    }

    setHandState({
      isPinching,
      middleFingerTip: rightPinchTip,
      leftPalm,
      isLeftHandDetected,
      isRightHandDetected,
    })
  }, [])

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    onResultsCallback.current = handleResults

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      },
    })

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    })

    hands.onResults((results: Results) => {
      if (onResultsCallback.current) {
        onResultsCallback.current(results)
      }
    })

    handsRef.current = hands

    const camera = new Camera(video, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: video })
        }
      },
      width: 1280,
      height: 720,
    })

    camera.start()
    cameraRef.current = camera

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (handsRef.current) {
        handsRef.current.close()
      }
    }
  }, [videoRef, handleResults])

  return handState
}
