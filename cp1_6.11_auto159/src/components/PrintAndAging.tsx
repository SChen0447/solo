import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { store } from '../store'
import html2canvas from 'html2canvas'
import { v4 as uuidv4 } from 'uuid'

const PAPER_W = 320
const PAPER_H = 420
const OUTPUT_MAX_W = 1200

interface Hole { x: number; y: number; r: number }
interface Stain { x: number; y: number; r: number; alpha: number }

export default function PrintAndAging() {
  const snap = useSnapshot(store)
  const outputRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const finalCanvasRef = useRef<HTMLCanvasElement>(null)
  const processedCacheRef = useRef<ImageData | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [holesCache, setHolesCache] = useState<Hole[]>([])
  const [stainsCache, setStainsCache] = useState<Stain[]>([])
  const rafRef = useRef<number | null>(null)
  const pendingRenderRef = useRef(false)
  const imgLoadedRef = useRef(false)

  useEffect(() => {
    if (snap.printImage && baseCanvasRef.current) {
      const img = new Image()
      img.onload = () => {
        const canvas = baseCanvasRef.current!
        canvas.width = PAPER_W
        canvas.height = PAPER_H
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, PAPER_W, PAPER_H)
        imgLoadedRef.current = true
        processedCacheRef.current = null
        scheduleRender()
      }
      img.src = snap.printImage
    }
  }, [snap.printImage])

  useEffect(() => {
    const newHoles: Hole[] = []
    for (let i = 0; i < snap.agingParams.wormholes; i++) {
      newHoles.push({
        x: Math.random() * PAPER_W,
        y: Math.random() * PAPER_H,
        r: 2 + Math.random() * 6
      })
    }
    setHolesCache(newHoles)
  }, [snap.agingParams.wormholes])

  useEffect(() => {
    const newStains: Stain[] = []
    for (let i = 0; i < snap.agingParams.waterStains; i++) {
      newStains.push({
        x: Math.random() * PAPER_W,
        y: Math.random() * PAPER_H,
        r: 15 + Math.random() * 35,
        alpha: 0.08 + Math.random() * 0.15
      })
    }
    setStainsCache(newStains)
  }, [snap.agingParams.waterStains])

  useEffect(() => {
    scheduleRender()
  }, [
    snap.agingParams.yellowing,
    snap.agingParams.inkFading,
    snap.bindingStyle,
    holesCache,
    stainsCache
  ])

  function scheduleRender() {
    pendingRenderRef.current = true
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (pendingRenderRef.current) {
          pendingRenderRef.current = false
          renderFinal()
        }
      })
    }
  }

  function renderFinal() {
    if (!imgLoadedRef.current || !baseCanvasRef.current || !finalCanvasRef.current) return

    const base = baseCanvasRef.current
    const out = finalCanvasRef.current
    out.width = PAPER_W
    out.height = PAPER_H
    const octx = out.getContext('2d')!

    let imgData: ImageData
    if (!processedCacheRef.current) {
      imgData = base.getContext('2d')!.getImageData(0, 0, PAPER_W, PAPER_H)
    } else {
      imgData = processedCacheRef.current
    }

    const data = imgData.data
    const yIntensity = snap.agingParams.yellowing / 100
    const fadeFactor = 1 - snap.agingParams.inkFading / 100

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      if (a > 0) {
        const isPaper = r > 200 && g > 190 && b > 170
        if (isPaper) {
          data[i] = Math.min(255, r + yIntensity * 40)
          data[i + 1] = Math.max(150, g - yIntensity * 10)
          data[i + 2] = Math.max(120, b - yIntensity * 60)
        } else {
          const newR = Math.min(255, r + (250 - r) * (1 - fadeFactor) * 0.9)
          const newG = Math.min(255, g + (243 - g) * (1 - fadeFactor) * 0.9)
          const newB = Math.min(255, b + (224 - b) * (1 - fadeFactor) * 0.9)
          data[i] = Math.round(newR + yIntensity * 20)
          data[i + 1] = Math.round(newG + yIntensity * 10)
          data[i + 2] = Math.round(newB - yIntensity * 20)
          data[i + 3] = Math.round(a * (0.3 + fadeFactor * 0.7))
        }
      }
    }

    octx.putImageData(imgData, 0, 0)
    processedCacheRef.current = imgData

    stainsCache.forEach(stain => {
      const grad = octx.createRadialGradient(stain.x, stain.y, 0, stain.x, stain.y, stain.r)
      grad.addColorStop(0, `rgba(160, 130, 70, ${stain.alpha})`)
      grad.addColorStop(0.6, `rgba(180, 150, 90, ${stain.alpha * 0.5})`)
      grad.addColorStop(1, 'rgba(180, 150, 90, 0)')
      octx.fillStyle = grad
      octx.beginPath()
      octx.arc(stain.x, stain.y, stain.r, 0, Math.PI * 2)
      octx.fill()
    })

    octx.globalCompositeOperation = 'destination-out'
    holesCache.forEach(hole => {
      const grad = octx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, hole.r)
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(0.7, 'rgba(0,0,0,0.8)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      octx.fillStyle = grad
      octx.beginPath()
      octx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2)
      octx.fill()
    })
    octx.globalCompositeOperation = 'source-over'
  }

  async function handleSave() {
    if (!outputRef.current) return
    try {
      const canvas = await html2canvas(outputRef.current, {
        backgroundColor: '#faf3e0',
        scale: OUTPUT_MAX_W / (outputRef.current.offsetWidth || PAPER_W),
        useCORS: true,
        logging: false
      })
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `雕版印刷作品_${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    }
  }

  function handleShare() {
    const id = uuidv4()
    const state = {
      printImage: store.printImage,
      bindingStyle: store.bindingStyle,
      agingParams: { ...store.agingParams },
      step: 3,
      artworkId: id
    }
    localStorage.setItem(`artwork_${id}`, JSON.stringify(state))
    const link = `${window.location.origin}${window.location.pathname}#/artwork/${id}`
    setShareLink(link)
    window.location.hash = `#/artwork/${id}`
    store.artworkId = id
  }

  function copyLink() {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink).then(() => {
        alert('链接已复制到剪贴板')
      }).catch(() => {
        alert('复制失败，请手动复制')
      })
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!snap.printImage) {
    return (
      <p className="hint-text letterpress-text" style={{ textAlign: 'center' }}>
        请先完成拓印步骤
      </p>
    )
  }

  const bindingClass =
    snap.bindingStyle === 'scroll' ? 'binding-scroll' :
    snap.bindingStyle === 'booklet' ? 'binding-booklet' :
    'binding-mirror'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p className="hint-text letterpress-text" style={{ marginBottom: '16px' }}>
        作品预览（装帧：{snap.bindingStyle === 'scroll' ? '卷轴式' : snap.bindingStyle === 'booklet' ? '册页式' : '镜心式'}）
      </p>

      <div className="canvas-container" ref={outputRef}>
        <div className={`binding-preview ${bindingClass}`}>
          <div className="rice-paper" style={{ position: 'relative' }}>
            <canvas
              ref={finalCanvasRef}
              width={PAPER_W}
              height={PAPER_H}
              style={{ width: PAPER_W, height: PAPER_H, display: 'block' }}
            />
          </div>
        </div>
      </div>

      <canvas ref={baseCanvasRef} style={{ display: 'none' }} />

      <div className="save-share-row">
        <button className="seal-btn" onClick={handleSave}>
          保存作品
        </button>
        <button className="seal-btn" onClick={handleShare}>
          生成分享
        </button>
      </div>

      {shareLink && (
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div className="share-link">{shareLink}</div>
          <div className="tools-row">
            <button className="seal-btn" onClick={copyLink}>
              复制链接
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
