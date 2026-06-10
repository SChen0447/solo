import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { SkyScene, IslandData, RouteData } from './scene'

interface Island extends IslandData {
  resources: { crystal: number; wood: number; ore: number }
  resourceRate: number
}

interface ResourceItem {
  islandId: string
  islandName: string
  resources: { crystal: number; wood: number; ore: number }
}

const API_BASE = '/api'

const SHAPE_LABELS: Record<string, string> = {
  dome: '圆顶',
  peak: '尖峰',
  platform: '平台'
}

const RESOURCE_ICONS: Record<string, string> = {
  crystal: '💎',
  wood: '🪵',
  ore: '⛏️'
}

const RESOURCE_LABELS: Record<string, string> = {
  crystal: '水晶',
  wood: '木材',
  ore: '矿石'
}

const randomIslandColor = (): string => {
  const hue = 180 + Math.random() * 120
  return `hsl(${hue}, 70%, 45%)`
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SkyScene | null>(null)
  const resourceTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const [islands, setIslands] = useState<Island[]>([])
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null)
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createPosition, setCreatePosition] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const [newIslandName, setNewIslandName] = useState('')
  const [newIslandShape, setNewIslandShape] = useState<'dome' | 'peak' | 'platform'>('dome')
  const [newIslandColor, setNewIslandColor] = useState('#00aaff')
  const [newIslandSize, setNewIslandSize] = useState(3)
  const [isResourcePanelOpen, setIsResourcePanelOpen] = useState(false)
  const [showResourceTree, setShowResourceTree] = useState(false)
  const [editingIslandId, setEditingIslandId] = useState<string | null>(null)
  const [editSize, setEditSize] = useState(3)
  const [editColor, setEditColor] = useState('#00aaff')
  const [floatingLabel, setFloatingLabel] = useState<{ name: string; visible: boolean }>({ name: '', visible: false })
  const [discardParticles, setDiscardParticles] = useState<{ id: number; x: number; y: number; resource: string }[]>([])
  const particleIdRef = useRef(0)

  const fetchIslands = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/islands`)
      const data = await res.json()
      setIslands(data)
    } catch (err) {
      console.error('Failed to fetch islands:', err)
    }
  }, [])

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/routes`)
      const data = await res.json()
      setRoutes(data)
    } catch (err) {
      console.error('Failed to fetch routes:', err)
    }
  }, [])

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/resources`)
      const data = await res.json()
      setResources(data)
    } catch (err) {
      console.error('Failed to fetch resources:', err)
    }
  }, [])

  const createIsland = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/islands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIslandName || `新岛屿-${Date.now()}`,
          shape: newIslandShape,
          color: newIslandColor,
          size: newIslandSize,
          position: createPosition,
          resources: { crystal: 0, wood: 0, ore: 0 }
        })
      })
      const newIsland = await res.json()
      sceneRef.current?.addIsland(newIsland)
      setShowCreateModal(false)
      setNewIslandName('')
      setNewIslandColor(randomIslandColor())
      await fetchIslands()
      await fetchResources()
    } catch (err) {
      console.error('Failed to create island:', err)
    }
  }, [newIslandName, newIslandShape, newIslandColor, newIslandSize, createPosition, fetchIslands, fetchResources])

  const deleteIsland = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/islands/${id}`, { method: 'DELETE' })
      sceneRef.current?.removeIsland(id)
      if (selectedIslandId === id) setSelectedIslandId(null)
      if (editingIslandId === id) setEditingIslandId(null)
      const timer = resourceTimersRef.current.get(id)
      if (timer) {
        clearInterval(timer)
        resourceTimersRef.current.delete(id)
      }
      await fetchIslands()
      await fetchRoutes()
      await fetchResources()
    } catch (err) {
      console.error('Failed to delete island:', err)
    }
  }, [selectedIslandId, editingIslandId, fetchIslands, fetchRoutes, fetchResources])

  const updateIsland = useCallback(async (id: string, updates: Partial<Island>) => {
    try {
      const res = await fetch(`${API_BASE}/islands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const updated = await res.json()
      sceneRef.current?.updateIsland(id, updated)
      await fetchIslands()
    } catch (err) {
      console.error('Failed to update island:', err)
    }
  }, [fetchIslands])

  const createRoute = useCallback(async (fromId: string, toId: string) => {
    try {
      const res = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId })
      })
      if (!res.ok) {
        const err = await res.json()
        console.error(err.error)
        return
      }
      const newRoute = await res.json()
      sceneRef.current?.addRoute(newRoute)
      await fetchRoutes()

      const intervalId = setInterval(() => {
        sceneRef.current?.spawnResourcePacket(fromId, toId)
        fetchResources()
      }, 30000)
      resourceTimersRef.current.set(`${fromId}-${toId}`, intervalId)
    } catch (err) {
      console.error('Failed to create route:', err)
    }
  }, [fetchRoutes, fetchResources])

  const deleteRoute = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/routes/${id}`, { method: 'DELETE' })
      sceneRef.current?.removeRoute(id)
      const route = routes.find(r => r.id === id)
      if (route) {
        const timer = resourceTimersRef.current.get(`${route.fromId}-${route.toId}`)
        if (timer) {
          clearInterval(timer)
          resourceTimersRef.current.delete(`${route.fromId}-${route.toId}`)
        }
      }
      await fetchRoutes()
    } catch (err) {
      console.error('Failed to delete route:', err)
    }
  }, [routes, fetchRoutes])

  const discardResource = useCallback((islandId: string, resourceType: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const particleId = particleIdRef.current++
    setDiscardParticles(prev => [...prev, { id: particleId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, resource: resourceType }])
    setTimeout(() => {
      setDiscardParticles(prev => prev.filter(p => p.id !== particleId))
    }, 300)

    const island = islands.find(i => i.id === islandId)
    if (island) {
      const newResources = { ...island.resources }
      newResources[resourceType as keyof typeof newResources] = Math.max(0, newResources[resourceType as keyof typeof newResources] - 1)
      updateIsland(islandId, { resources: newResources })
    }
  }, [islands, updateIsland])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new SkyScene(containerRef.current, {
      onIslandClick: (id) => {
        setSelectedIslandId(id)
        if (id) {
          const island = islands.find(i => i.id === id)
          if (island) {
            setFloatingLabel({ name: island.name, visible: true })
            setTimeout(() => setFloatingLabel(prev => ({ ...prev, visible: false })), 1000)
          }
        }
      },
      onEmptyClick: (pos) => {
        setCreatePosition({ x: pos.x, y: pos.y, z: pos.z })
        setNewIslandColor(randomIslandColor())
        setShowCreateModal(true)
      },
      onRouteCreate: (fromId, toId) => {
        createRoute(fromId, toId)
      },
      onRouteClick: (routeId) => {
        deleteRoute(routeId)
      },
      onIslandHover: (id) => {
        setHoveredIslandId(id)
      }
    })
    sceneRef.current = scene

    return () => {
      scene.dispose()
      resourceTimersRef.current.forEach(timer => clearInterval(timer))
      resourceTimersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    fetchIslands()
    fetchRoutes()
    fetchResources()
  }, [fetchIslands, fetchRoutes, fetchResources])

  useEffect(() => {
    if (!sceneRef.current) return
    for (const island of islands) {
      const existing = sceneRef.current.getIslandPositions()
      if (!existing.has(island.id)) {
        sceneRef.current.addIsland(island)
      }
    }
  }, [islands])

  useEffect(() => {
    if (!sceneRef.current) return
    for (const route of routes) {
      sceneRef.current.addRoute(route)
    }
  }, [routes])

  useEffect(() => {
    sceneRef.current?.selectIsland(selectedIslandId)
  }, [selectedIslandId])

  const selectedIsland = islands.find(i => i.id === selectedIslandId)
  const totalResources = resources.reduce(
    (acc, r) => ({
      crystal: acc.crystal + r.resources.crystal,
      wood: acc.wood + r.resources.wood,
      ore: acc.ore + r.resources.ore
    }),
    { crystal: 0, wood: 0, ore: 0 }
  )

  const getTotalIslandResources = (island: Island) => {
    return island.resources.crystal + island.resources.wood + island.resources.ore
  }

  return (
    <div style={styles.appContainer}>
      <div style={styles.leftPanel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>🏝️ 岛屿列表</h3>
          <span style={styles.countBadge}>{islands.length}</span>
        </div>
        <div style={styles.islandList}>
          {islands.map((island) => (
            <div
              key={island.id}
              onClick={() => {
                setSelectedIslandId(island.id)
                sceneRef.current?.selectIsland(island.id)
              }}
              style={{
                ...styles.islandListItem,
                ...(selectedIslandId === island.id ? styles.islandListItemActive : {}),
                ...(hoveredIslandId === island.id ? styles.islandListItemHovered : {})
              }}
            >
              <div
                style={{
                  ...styles.colorDot,
                  backgroundColor: island.color
                }}
              />
              <div style={styles.islandListItemInfo}>
                <span style={styles.islandListName}>{island.name}</span>
                <span style={styles.islandListMeta}>
                  {SHAPE_LABELS[island.shape]} · {getTotalIslandResources(island)} 资源
                </span>
              </div>
            </div>
          ))}
          {islands.length === 0 && (
            <div style={styles.emptyState}>暂无岛屿，点击空域创建</div>
          )}
        </div>
      </div>

      <div style={styles.centerContainer}>
        <div ref={containerRef} style={styles.sceneContainer} />

        {floatingLabel.visible && (
          <div style={styles.floatingLabel}>
            {floatingLabel.name}
          </div>
        )}

        <div style={styles.resourceBar} onClick={() => setIsResourcePanelOpen(!isResourcePanelOpen)}>
          <span style={styles.resourceBarIcon}>📦</span>
          <span style={styles.resourceBarTotal}>
            {totalResources.crystal + totalResources.wood + totalResources.ore}
          </span>
          {isResourcePanelOpen && (
            <div style={styles.resourceDropdown}>
              {resources.map((r) => (
                <div key={r.islandId} style={styles.resourceRow}>
                  <span style={styles.resourceIslandName}>{r.islandName}</span>
                  <div style={styles.resourceItems}>
                    {Object.entries(r.resources).map(([key, val]) => (
                      <div
                        key={key}
                        style={styles.resourceChip}
                        draggable
                        onDragEnd={(e) => discardResource(r.islandId, key, e)}
                        title="拖拽丢弃"
                      >
                        {RESOURCE_ICONS[key]} {val}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>创建新岛屿</h3>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>岛屿名称</label>
                <input
                  type="text"
                  value={newIslandName}
                  onChange={(e) => setNewIslandName(e.target.value)}
                  placeholder="输入岛屿名称..."
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>预设形态</label>
                <div style={styles.shapeOptions}>
                  {(['dome', 'peak', 'platform'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setNewIslandShape(shape)}
                      style={{
                        ...styles.shapeButton,
                        ...(newIslandShape === shape ? styles.shapeButtonActive : {})
                      }}
                    >
                      {SHAPE_LABELS[shape]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>颜色: {newIslandColor}</label>
                <input
                  type="color"
                  value={newIslandColor}
                  onChange={(e) => setNewIslandColor(e.target.value)}
                  style={styles.colorPicker}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>大小: {newIslandSize.toFixed(1)}</label>
                <input
                  type="range"
                  min={2}
                  max={4}
                  step={0.1}
                  value={newIslandSize}
                  onChange={(e) => setNewIslandSize(parseFloat(e.target.value))}
                  style={styles.rangeSlider}
                />
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setShowCreateModal(false)} style={styles.cancelButton}>
                  取消
                </button>
                <button onClick={createIsland} style={styles.confirmButton}>
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedIsland && editingIslandId === selectedIsland.id && (
          <div style={styles.editPanel}>
            <h4 style={styles.editTitle}>编辑岛屿</h4>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>大小: {editSize.toFixed(1)}</label>
              <input
                type="range"
                min={2}
                max={4}
                step={0.1}
                value={editSize}
                onChange={(e) => setEditSize(parseFloat(e.target.value))}
                style={styles.rangeSlider}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>颜色</label>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={styles.colorPicker}
              />
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setEditingIslandId(null)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateIsland(selectedIsland.id, { size: editSize, color: editColor })
                  setEditingIslandId(null)
                }}
                style={styles.confirmButton}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>📋 岛屿详情</h3>
        </div>
        {selectedIsland ? (
          <div style={styles.detailContent}>
            <div style={styles.detailHeader}>
              <div
                style={{
                  ...styles.detailColorBlock,
                  backgroundColor: selectedIsland.color
                }}
              />
              <div>
                <h4 style={styles.detailName}>{selectedIsland.name}</h4>
                <span style={styles.detailShape}>{SHAPE_LABELS[selectedIsland.shape]}</span>
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>大小</span>
                <span style={styles.detailValue}>{selectedIsland.size.toFixed(1)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>航线数</span>
                <span style={styles.detailValue}>
                  {routes.filter(r => r.fromId === selectedIsland.id || r.toId === selectedIsland.id).length}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>产出频率</span>
                <span style={styles.detailValue}>每 30 秒</span>
              </div>
            </div>

            <div style={styles.detailSection}>
              <h5 style={styles.sectionTitle}>资源</h5>
              <div style={styles.resourceGrid}>
                {Object.entries(selectedIsland.resources).map(([key, val]) => (
                  <div key={key} style={styles.resourceCard}>
                    <span style={styles.resourceIcon}>{RESOURCE_ICONS[key]}</span>
                    <span style={styles.resourceCount}>{val}</span>
                    <span style={styles.resourceLabel}>{RESOURCE_LABELS[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {showResourceTree && (
              <div style={styles.detailSection}>
                <h5 style={styles.sectionTitle}>资源产出树</h5>
                <div style={styles.resourceTree}>
                  {Object.entries(selectedIsland.resources).map(([key, val]) => (
                    <div key={key} style={styles.treeItem}>
                      {RESOURCE_ICONS[key]} {RESOURCE_LABELS[key]}
                      <span style={styles.treeCount}>× {val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.detailActions}>
              <button
                onClick={() => {
                  setEditingIslandId(selectedIsland.id)
                  setEditSize(selectedIsland.size)
                  setEditColor(selectedIsland.color)
                }}
                style={styles.actionButton}
              >
                ✏️ 编辑
              </button>
              <button
                onClick={() => setShowResourceTree(!showResourceTree)}
                style={styles.actionButton}
              >
                🌳 {showResourceTree ? '收起' : '展开'}资源
              </button>
              <button
                onClick={() => {
                  sceneRef.current?.startRouteDrag(selectedIsland.id)
                }}
                style={styles.actionButtonPrimary}
                title="从当前岛屿拖拽到另一岛屿创建航线"
              >
                ✈️ 开始连线
              </button>
              <button
                onClick={() => deleteIsland(selectedIsland.id)}
                style={styles.dangerButton}
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>点击岛屿查看详情</div>
        )}

        <div style={styles.minimapContainer}>
          <h5 style={styles.minimapTitle}>🗺️ 迷你地图</h5>
          <Minimap islands={islands} selectedIslandId={selectedIslandId} />
        </div>
      </div>

      {discardParticles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            pointerEvents: 'none',
            zIndex: 10000,
            animation: 'burst 0.3s ease-out forwards'
          }}
        >
          <span style={{ fontSize: 24 }}>{RESOURCE_ICONS[p.resource]}</span>
        </div>
      ))}

      <style>{`
        @keyframes burst {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes labelFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `}</style>
    </div>
  )
}

function Minimap({ islands, selectedIslandId }: { islands: Island[]; selectedIslandId: string | null }) {
  if (islands.length === 0) {
    return <div style={styles.minimapEmpty}>暂无岛屿</div>
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  islands.forEach(i => {
    minX = Math.min(minX, i.position.x)
    maxX = Math.max(maxX, i.position.x)
    minZ = Math.min(minZ, i.position.z)
    maxZ = Math.max(maxZ, i.position.z)
  })
  const padding = 5
  minX -= padding; maxX += padding; minZ -= padding; maxZ += padding
  const width = maxX - minX
  const height = maxZ - minZ
  const mapSize = 140
  const scaleX = mapSize / width
  const scaleZ = mapSize / height

  return (
    <div style={styles.minimap}>
      {islands.map(island => {
        const x = (island.position.x - minX) * scaleX
        const z = (island.position.z - minZ) * scaleZ
        const isSelected = island.id === selectedIslandId
        return (
          <div
            key={island.id}
            title={island.name}
            style={{
              position: 'absolute',
              left: x - 4,
              top: z - 4,
              width: isSelected ? 12 : 8,
              height: isSelected ? 12 : 8,
              borderRadius: '50%',
              backgroundColor: island.color,
              border: isSelected ? '2px solid #00aaff' : '1px solid rgba(255,255,255,0.5)',
              boxShadow: isSelected ? '0 0 8px #00aaff' : 'none',
              transition: 'all 0.2s ease'
            }}
          />
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    backgroundColor: '#87ceeb',
    overflow: 'hidden',
    position: 'relative'
  },
  leftPanel: {
    width: '15%',
    minWidth: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(0,0,0,0.08)',
    zIndex: 10,
    boxShadow: '2px 0 12px rgba(0,0,0,0.08)'
  },
  centerContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },
  sceneContainer: {
    width: '100%',
    height: '100%'
  },
  rightPanel: {
    width: '15%',
    minWidth: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid rgba(0,0,0,0.08)',
    zIndex: 10,
    boxShadow: '-2px 0 12px rgba(0,0,0,0.08)'
  },
  panelHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  countBadge: {
    backgroundColor: '#00aaff',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10
  },
  islandList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8
  },
  islandListItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 4,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },
  islandListItemHovered: {
    backgroundColor: 'rgba(0, 170, 255, 0.08)'
  },
  islandListItemActive: {
    backgroundColor: 'rgba(0, 170, 255, 0.15)',
    borderColor: '#00aaff'
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 10,
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
  },
  islandListItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  islandListName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  islandListMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 2
  },
  emptyState: {
    padding: 20,
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12
  },
  floatingLabel: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    animation: 'labelFade 1s ease-out forwards',
    pointerEvents: 'none',
    zIndex: 100
  },
  resourceBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    zIndex: 20,
    userSelect: 'none'
  },
  resourceBarIcon: {
    fontSize: 18
  },
  resourceBarTotal: {
    fontSize: 15,
    fontWeight: 700,
    color: '#333'
  },
  resourceDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 8,
    padding: 8,
    minWidth: 240,
    maxHeight: 300,
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    animation: 'fadeIn 0.2s ease-out'
  },
  resourceRow: {
    padding: '8px 10px',
    borderRadius: 6,
    marginBottom: 4
  },
  resourceIslandName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
    display: 'block',
    marginBottom: 4
  },
  resourceItems: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  },
  resourceChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 8px',
    backgroundColor: 'rgba(0,170,255,0.1)',
    borderRadius: 10,
    fontSize: 11,
    color: '#333',
    cursor: 'grab'
  },
  modalOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    animation: 'fadeIn 0.25s ease-out'
  },
  editPanel: {
    position: 'absolute',
    right: '17%',
    top: 80,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12,
    padding: 20,
    width: 280,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 50,
    animation: 'fadeIn 0.2s ease-out'
  },
  editTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: '0 0 14px 0',
    color: '#333'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 18px 0',
    color: '#333'
  },
  formGroup: {
    marginBottom: 16
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    marginBottom: 6
  },
  formInput: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  },
  shapeOptions: {
    display: 'flex',
    gap: 8
  },
  shapeButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  shapeButtonActive: {
    backgroundColor: '#00aaff',
    color: '#fff',
    borderColor: '#00aaff'
  },
  colorPicker: {
    width: '100%',
    height: 40,
    border: '1px solid #ddd',
    borderRadius: 8,
    cursor: 'pointer',
    padding: 2,
    boxSizing: 'border-box'
  },
  rangeSlider: {
    width: '100%'
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8
  },
  cancelButton: {
    padding: '8px 18px',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    color: '#555',
    transition: 'all 0.2s ease'
  },
  confirmButton: {
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#00aaff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  detailContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 16
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  detailColorBlock: {
    width: 40,
    height: 40,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  detailName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  detailShape: {
    fontSize: 12,
    color: '#888'
  },
  detailSection: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: '1px solid rgba(0,0,0,0.06)'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: 13
  },
  detailLabel: {
    color: '#777'
  },
  detailValue: {
    color: '#333',
    fontWeight: 500
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#555',
    margin: '0 0 10px 0'
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8
  },
  resourceCard: {
    backgroundColor: 'rgba(0,170,255,0.06)',
    borderRadius: 8,
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  resourceIcon: {
    fontSize: 20,
    marginBottom: 2
  },
  resourceCount: {
    fontSize: 15,
    fontWeight: 700,
    color: '#333'
  },
  resourceLabel: {
    fontSize: 10,
    color: '#777',
    marginTop: 2
  },
  resourceTree: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  treeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: 'rgba(124, 252, 0, 0.1)',
    borderRadius: 6,
    fontSize: 12
  },
  treeCount: {
    fontWeight: 600,
    color: '#333'
  },
  detailActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  actionButton: {
    padding: '9px 14px',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    color: '#444',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  },
  actionButtonPrimary: {
    padding: '9px 14px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#00aaff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  },
  dangerButton: {
    padding: '9px 14px',
    border: '1px solid #ffcccc',
    borderRadius: 8,
    backgroundColor: '#fff5f5',
    fontSize: 13,
    cursor: 'pointer',
    color: '#d33',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  },
  minimapContainer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(0,0,0,0.06)'
  },
  minimapTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
    margin: '0 0 8px 0'
  },
  minimap: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(135, 206, 235, 0.3)',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden'
  },
  minimapEmpty: {
    width: 140,
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(135, 206, 235, 0.3)',
    borderRadius: 8,
    fontSize: 11,
    color: '#777'
  }
}
