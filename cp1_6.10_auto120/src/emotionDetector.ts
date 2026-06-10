import * as tf from '@tensorflow/tfjs'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { EMOTIONS, EmotionResult, EmotionScore, EmotionLabel } from './types'

let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null
let modelLoaded = false

export async function loadModel(): Promise<void> {
  if (modelLoaded && detector) return
  await tf.ready()
  detector = await faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs',
      refineLandmarks: true
    } as faceLandmarksDetection.MediaPipeFaceMeshTfjsModelConfig
  )
  modelLoaded = true
}

export function isModelLoaded(): boolean {
  return modelLoaded
}

function dist(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr)
  const exps = arr.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

function computeGeometricFeatures(keypoints: number[][]): {
  mouthOpen: number
  smile: number
  browRaise: number
  browFrown: number
  eyeWide: number
  mouthCornerUp: number
  noseWrinkle: number
  jawDrop: number
} {
  const leftEyeTop = keypoints[386]
  const leftEyeBottom = keypoints[374]
  const rightEyeTop = keypoints[159]
  const rightEyeBottom = keypoints[145]
  const leftBrowInner = keypoints[285]
  const rightBrowInner = keypoints[55]
  const leftBrowOuter = keypoints[300]
  const rightBrowOuter = keypoints[70]
  const leftEyeInner = keypoints[362]
  const rightEyeInner = keypoints[133]
  const mouthLeft = keypoints[78]
  const mouthRight = keypoints[308]
  const mouthTop = keypoints[13]
  const mouthBottom = keypoints[14]
  const topLipTop = keypoints[164]
  const bottomLipBottom = keypoints[18]
  const noseTip = keypoints[1]
  const upperLipRaiseLeft = keypoints[186]
  const upperLipRaiseRight = keypoints[410]
  const jawLeft = keypoints[175]
  const jawRight = keypoints[395]
  const chin = keypoints[152]

  const faceHeight = dist(noseTip, keypoints[10])
  const faceWidth = dist(jawLeft, jawRight)
  const interocular = dist(leftEyeInner, rightEyeInner)
  const norm = (interocular + faceWidth) / 2

  const mouthOpen = dist(mouthTop, mouthBottom) / norm
  const lipDist = dist(topLipTop, bottomLipBottom) / norm
  const mouthWidth = dist(mouthLeft, mouthRight) / norm

  const leftEyeOpen = dist(leftEyeTop, leftEyeBottom) / norm
  const rightEyeOpen = dist(rightEyeTop, rightEyeBottom) / norm
  const eyeWide = (leftEyeOpen + rightEyeOpen) / 2

  const leftBrowToEye = dist(leftBrowInner, leftEyeTop) / norm
  const rightBrowToEye = dist(rightBrowInner, rightEyeTop) / norm
  const browRaise = (leftBrowToEye + rightBrowToEye) / 2

  const browFrown = dist(leftBrowInner, rightBrowInner) / norm

  const smileLeft = keypoints[78]
  const smileRight = keypoints[308]
  const mouthCenter = keypoints[164]
  const leftCornerUp = (mouthCenter[1] - smileLeft[1]) / norm
  const rightCornerUp = (mouthCenter[1] - smileRight[1]) / norm
  const smile = (leftCornerUp + rightCornerUp) / 2
  const mouthCornerUp = smile

  const noseWrinkleLeft = dist(upperLipRaiseLeft, noseTip) / norm
  const noseWrinkleRight = dist(upperLipRaiseRight, noseTip) / norm
  const noseWrinkle = (noseWrinkleLeft + noseWrinkleRight) / 2

  const jawDrop = dist(chin, noseTip) / faceHeight

  return {
    mouthOpen: mouthOpen + lipDist * 0.5,
    smile,
    browRaise,
    browFrown,
    eyeWide,
    mouthCornerUp,
    noseWrinkle,
    jawDrop
  }
}

function classifyEmotion(features: {
  mouthOpen: number
  smile: number
  browRaise: number
  browFrown: number
  eyeWide: number
  mouthCornerUp: number
  noseWrinkle: number
  jawDrop: number
}): EmotionScore[] {
  const raw: Record<EmotionLabel, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprise: 0,
    fear: 0,
    disgust: 0
  }

  raw.happy = features.smile * 2.8 + features.mouthCornerUp * 2.2 - features.browFrown * 0.8
  raw.sad = -features.smile * 1.5 - features.mouthCornerUp * 1.8 + features.browFrown * 1.2 - features.eyeWide * 0.6
  raw.angry = features.browFrown * 2.5 - features.browRaise * 0.5 - features.smile * 1.0 + features.eyeWide * 0.4
  raw.surprise = features.mouthOpen * 2.8 + features.browRaise * 2.2 + features.eyeWide * 2.0 + features.jawDrop * 1.5
  raw.fear = features.browRaise * 1.6 + features.eyeWide * 2.2 + features.mouthOpen * 1.2 + features.browFrown * 0.8 - features.smile * 0.5
  raw.disgust = features.noseWrinkle * 2.8 - features.smile * 1.5 - features.mouthOpen * 0.4 + features.browFrown * 0.6

  const probs = softmax(EMOTIONS.map(e => raw[e.label]))

  return EMOTIONS.map((e, i) => ({
    ...e,
    confidence: Math.max(0.01, Math.min(0.99, probs[i]))
  }))
}

export async function detectEmotion(imageData: ImageData | HTMLVideoElement | HTMLImageElement): Promise<EmotionResult | null> {
  if (!detector) {
    await loadModel()
  }
  if (!detector) return null

  const faces = await detector.estimateFaces(imageData)
  if (!faces || faces.length === 0) return null

  const face = faces[0]
  const keypoints = face.keypoints.map(kp => [kp.x ?? 0, kp.y ?? 0, kp.z ?? 0]) as number[][]
  const features = computeGeometricFeatures(keypoints)
  const scores = classifyEmotion(features)
  scores.sort((a, b) => b.confidence - a.confidence)
  const dominant = scores[0]

  return {
    scores,
    dominant,
    timestamp: Date.now()
  }
}
