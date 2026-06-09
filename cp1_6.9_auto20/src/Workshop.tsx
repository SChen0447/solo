import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useAuth } from './context/AuthContext'
import { Antique, Crack, Stroke, ToolType } from './types'
import './Workshop.css'

const Workshop: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [antique, setAntique] = useState<Antique | null>(null)
  const [currentTool, setCurrentTool] = useState<ToolType>(null)
  const [currentColor, setCurrentColor] = useState('#1e5799')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [history, setHistory] = useState<{ cracks: Crack[]; strokes: Stroke[] }[]>([])
  const { user } = useAuth()

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const antiqueMeshRef = useRef<THREE.Mesh | null>(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<{ x: number; y: number; z: number }[]>([])
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const strokesGroupRef = useRef<THREE.Group | null>(null)
  const cracksGroupRef = useRef<THREE.Group | null>(null)

  const loadNewAntique = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/antiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: user.username }),
      })
      const data: Antique = await res.json()
      setAntique(data)
      setHistory([])
      setCurrentColor(data.baseColor)
    } catch (e) {
      console.error('加载古董失败', e)
    }
  }, [user])

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 }
  }

  const createAntiqueGeometry = (type: string): THREE.BufferGeometry => {
    switch (type) {
      case 'vase':
        return new THREE.CylinderGeometry(0.5, 0.6, 1.8, 32)
      case 'bowl':
        return new THREE.SphereGeometry(0.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      case 'plate':
        return new THREE.CylinderGeometry(1.0, 1.1, 0.15, 48)
      case 'jar':
        return new THREE.CylinderGeometry(0.6, 0.7, 1.3, 32)
      case 'horse':
        return new THREE.SphereGeometry(0.7, 32, 16)
      case 'censer':
        return new THREE.CylinderGeometry(0.4, 0.5, 1.0, 32)
      default:
        return new THREE.CylinderGeometry(0.5, 0.6, 1.8, 32)
    }
  }

  const createNormalTexture = () => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 50}, ${Math.random() * 50}, ${Math.random() * 50}, 0.1)`
        ctx.beginPath()
        ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }

  useEffect(() => {
    if (!antique || !canvasRef.current) return

    const width = canvasRef.current.clientWidth
    const height = canvasRef.current.clientHeight

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 1.5, 4)
    camera.lookAt(0, 0.3, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    canvasRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 7)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0xffd700, 0.4)
    pointLight.position.set(-3, 3, 3)
    scene.add(pointLight)

    const geometry = createAntiqueGeometry(antique.type)
    const rgb = hexToRgb(antique.baseColor)

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      metalness: 0.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.95,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      normalMap: createNormalTexture(),
      normalScale: new THREE.Vector2(0.3, 0.3),
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = antique.type === 'plate' ? 0.08 : 0
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    antiqueMeshRef.current = mesh

    const strokesGroup = new THREE.Group()
    scene.add(strokesGroup)
    strokesGroupRef.current = strokesGroup

    const cracksGroup = new THREE.Group()
    scene.add(cracksGroup)
    cracksGroupRef.current = cracksGroup

    let angle = 0
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      angle += 0.003
      mesh.rotation.y = Math.sin(angle) * 0.3
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!canvasRef.current) return
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement)
      }
    }
  }, [antique?.id])

  const drawCracks = useCallback(() => {
    if (!cracksGroupRef.current || !antique) return
    cracksGroupRef.current.clear()
    antique.cracks.forEach(crack => {
      const points: THREE.Vector3[] = []
      const steps = 20
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = crack.startX + (crack.endX - crack.startX) * t
        const y = crack.startY + (crack.endY - crack.startY) * t
        const wobble = Math.sin(t * Math.PI * 3) * 0.05
        points.push(new THREE.Vector3(x * 0.6, y * 0.8 + wobble, 1.01))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const color = crack.repaired ? 0x00ff00 : 0x000000
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: crack.width,
        transparent: true,
        opacity: crack.repaired ? 0.8 : 0.9,
      })
      const line = new THREE.Line(geometry, material)
      cracksGroupRef.current!.add(line)
    })
  }, [antique])

  useEffect(() => {
    drawCracks()
  }, [antique?.cracks, drawCracks])

  const renderStrokes = useCallback(() => {
    if (!strokesGroupRef.current || !antique) return
    strokesGroupRef.current.clear()
    antique.strokes.forEach(stroke => {
      if (stroke.points.length < 2) return
      const points = stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const color = stroke.tool === 'gold' ? '#d4af37' : stroke.color
      const opacity = stroke.tool === 'fill' ? 0.6 : stroke.tool === 'smooth' ? 0.3 : 0.7
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth: stroke.tool === 'gold' ? 3 : 2,
      })
      const line = new THREE.Line(geometry, material)
      strokesGroupRef.current!.add(line)

      if (stroke.tool === 'gold') {
        stroke.points.forEach(p => {
          const dotGeo = new THREE.SphereGeometry(0.015, 8, 8)
          const dotMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.8 })
          const dot = new THREE.Mesh(dotGeo, dotMat)
          dot.position.set(p.x, p.y, p.z)
          strokesGroupRef.current!.add(dot)
        })
      }
    })
  }, [antique?.strokes])

  useEffect(() => {
    renderStrokes()
  }, [antique?.strokes, renderStrokes])

  const getIntersectPoint = (clientX: number, clientY: number): THREE.Vector3 | null => {
    if (!canvasRef.current || !antiqueMeshRef.current || !cameraRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
    const intersects = raycasterRef.current.intersectObject(antiqueMeshRef.current)
    if (intersects.length > 0) {
      return intersects[0].point
    }
    return null
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentTool || currentTool === 'undo') return
    e.preventDefault()
    const point = getIntersectPoint(e.clientX, e.clientY)
    if (!point) return

    if (currentTool === 'fill' && antique) {
      const clickedCrack = antique.cracks.find(crack => {
        const cx = ((crack.startX + crack.endX) / 2) * 0.6
        const cy = ((crack.startY + crack.endY) / 2) * 0.8
        const dist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2)
        return dist < 0.3 && !crack.repaired
      })
      if (clickedCrack) {
        saveHistory()
        const newCracks = antique.cracks.map(c =>
          c.id === clickedCrack.id ? { ...c, repaired: true } : c
        )
        setAntique({ ...antique, cracks: newCracks })
        saveAntique({ cracks: newCracks })
        return
      }
    }

    isDrawingRef.current = true
    currentStrokeRef.current = [{ x: point.x, y: point.y, z: point.z + 0.02 }]
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || !currentTool || currentTool === 'undo' || !overlayRef.current) return
    const point = getIntersectPoint(e.clientX, e.clientY)
    if (!point) return

    const ctx = overlayRef.current.getContext('2d')
    if (ctx && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect()
      ctx.globalAlpha = 0.4
      ctx.fillStyle =
        currentTool === 'gold'
          ? '#d4af37'
          : currentTool === 'fill'
          ? '#cccccc'
          : currentTool === 'smooth'
          ? 'rgba(255,255,255,0.5)'
          : currentColor
      ctx.beginPath()
      ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    const last = currentStrokeRef.current[currentStrokeRef.current.length - 1]
    if (last && Math.sqrt((point.x - last.x) ** 2 + (point.y - last.y) ** 2) > 0.01) {
      currentStrokeRef.current.push({ x: point.x, y: point.y, z: point.z + 0.02 })
    }
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !antique || !currentTool || currentTool === 'undo') return
    isDrawingRef.current = false

    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)
      }
    }

    if (
      currentStrokeRef.current.length > 1 &&
      (currentTool === 'paint' || currentTool === 'gold' || currentTool === 'fill' || currentTool === 'smooth')
    ) {
      saveHistory()
      const newStroke: Stroke = {
        id: Date.now().toString(),
        tool: currentTool,
        color: currentColor,
        points: [...currentStrokeRef.current],
        timestamp: Date.now(),
      }
      const strokes = [...antique.strokes, newStroke]
      setAntique({ ...antique, strokes })
      saveAntique({ strokes })
    }
    currentStrokeRef.current = []
  }

  const saveHistory = () => {
    if (!antique) return
    setHistory(prev => [
      ...prev,
      {
        cracks: JSON.parse(JSON.stringify(antique.cracks)),
        strokes: JSON.parse(JSON.stringify(antique.strokes)),
      },
    ])
  }

  const handleUndo = () => {
    if (!antique || history.length === 0) return
    const prev = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    setHistory(newHistory)
    setAntique({ ...antique, cracks: prev.cracks, strokes: prev.strokes })
    saveAntique({ cracks: prev.cracks, strokes: prev.strokes })
  }

  const saveAntique = async (data: Partial<Antique>) => {
    if (!antique) return
    try {
      await fetch(`/api/antiques/${antique.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (e) {
      console.error('保存失败', e)
    }
  }

  const captureThumbnail = (): string => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return ''
    rendererRef.current.render(sceneRef.current, cameraRef.current)
    return rendererRef.current.domElement.toDataURL('image/png')
  }

  const handleSubmit = async () => {
    if (!antique) return
    const thumbnail = captureThumbnail()
    await fetch(`/api/antiques/${antique.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        restoredThumbnail: thumbnail,
      }),
    })
    setShowSubmitModal(false)
    setTimeout(() => loadNewAntique(), 500)
  }

  useEffect(() => {
    if (user && !antique) {
      loadNewAntique()
    }
  }, [user, antique, loadNewAntique])

  const tools = [
    { id: 'fill', icon: '🔧', name: '裂纹填充', color: '#ccc' },
    { id: 'paint', icon: '🎨', name: '颜料上色', color: currentColor },
    { id: 'gold', icon: '✨', name: '金漆描绘', color: '#d4af37' },
    { id: 'smooth', icon: '🧽', name: '局部磨平', color: '#f5e6d0' },
    { id: 'undo', icon: '↩', name: '撤销上一步', color: '#aaa' },
  ]

  return (
    <div className="workshop-container">
      <h2 className="panel-title">🔨 修复工作台</h2>
      {antique && (
        <>
          <div className="antique-info">
            <div className="antique-name">{antique.name}</div>
            <div className="antique-dynasty">{antique.dynasty}</div>
          </div>
          <div className="workshop-workspace">
            <div
              className="workbench"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                cursor: currentTool ? 'crosshair' : 'default',
                position: 'relative',
              }}
            >
              <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
              <canvas
                ref={overlayRef}
                width={800}
                height={600}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div className="tool-panel">
              <div className="tool-panel-title">修复工具</div>
              {tools.map(tool => (
                <button
                  key={tool.id}
                  className={`tool-button ${currentTool === tool.id ? 'active' : ''}`}
                  onClick={() => {
                    if (tool.id === 'undo') {
                      handleUndo()
                    } else if (tool.id === 'paint') {
                      setShowColorPicker(!showColorPicker)
                      setCurrentTool(showColorPicker ? null : 'paint')
                    } else {
                      setCurrentTool(currentTool === tool.id ? null : (tool.id as ToolType))
                      setShowColorPicker(false)
                    }
                  }}
                  style={
                    {
                      '--tool-color': tool.color,
                    } as React.CSSProperties
                  }
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-name">{tool.name}</span>
                </button>
              ))}
              {showColorPicker && (
                <div className="color-picker fade-in">
                  <div className="color-picker-title">选择颜色</div>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={e => setCurrentColor(e.target.value)}
                    className="color-wheel"
                  />
                  <div className="color-presets">
                    {['#1e5799', '#8b4513', '#c71585', '#2c3e50', '#8b0000', '#228b22', '#4b0082', '#d4af37'].map(c => (
                      <button
                        key={c}
                        className="color-preset"
                        style={{ background: c }}
                        onClick={() => setCurrentColor(c)}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="status-info">
                <div className="status-item">
                  <span>裂纹修复：</span>
                  <span className="status-value">
                    {antique.cracks.filter(c => c.repaired).length}/{antique.cracks.length}
                  </span>
                </div>
                <div className="status-item">
                  <span>笔触数量：</span>
                  <span className="status-value">{antique.strokes.length}</span>
                </div>
              </div>
              <button className="btn btn-primary submit-btn" onClick={() => setShowSubmitModal(true)}>
                🏆 提交鉴赏
              </button>
              <button className="btn btn-secondary new-btn" onClick={loadNewAntique}>
                🔄 换一件
              </button>
            </div>
          </div>
        </>
      )}

      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>确认提交鉴赏？</h3>
            <p style={{ margin: '16px 0', color: '#5a3a1a' }}>
              提交后将进入公共鉴赏区，其他鉴赏家可以对您的修复作品进行评分和评论。
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>
                继续修复
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workshop
