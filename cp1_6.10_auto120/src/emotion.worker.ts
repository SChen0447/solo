import { loadModel, detectEmotion, isModelLoaded } from './emotionDetector'

interface WorkerInMessage {
  id: number
  type: 'init' | 'detect'
  imageBitmap?: ImageBitmap
  width?: number
  height?: number
}

interface WorkerOutMessage {
  id: number
  type: 'init-complete' | 'result' | 'error'
  result?: any
  error?: string
}

let offscreenCanvas: OffscreenCanvas | null = null
let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { id, type } = e.data
  try {
    if (type === 'init') {
      await loadModel()
      self.postMessage({ id, type: 'init-complete' } as WorkerOutMessage)
    } else if (type === 'detect') {
      if (!isModelLoaded()) {
        await loadModel()
      }
      const { imageBitmap, width, height } = e.data
      if (!imageBitmap || !width || !height) throw new Error('Invalid input')

      if (!offscreenCanvas || offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
        offscreenCanvas = new OffscreenCanvas(width, height)
        offscreenCtx = offscreenCanvas.getContext('2d')
      }
      if (!offscreenCtx) throw new Error('Failed to get offscreen context')

      offscreenCtx.clearRect(0, 0, width, height)
      offscreenCtx.drawImage(imageBitmap, 0, 0, width, height)
      const imageData = offscreenCtx.getImageData(0, 0, width, height)

      const result = await detectEmotion(imageData)
      self.postMessage({ id, type: 'result', result } as WorkerOutMessage)
    }
  } catch (err: any) {
    self.postMessage({ id, type: 'error', error: err?.message || String(err) } as WorkerOutMessage)
  }
}
