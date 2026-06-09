import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Marker, ScentCategory } from './types'
import { MarkerService } from './MarkerService'

interface MapViewProps {
  markers: Marker[]
  onMarkersChange: (markers: Marker[]) => void
  onMarkerClick: (marker: Marker) => void
  onShowSuccess: (message: string) => void
}

const CATEGORY_COLORS: Record<ScentCategory, string> = {
  flower: '#FF69B4',
  food: '#FF8C42',
  nature: '#4CAF50',
  city: '#64B5F6',
  other: '#9C27B0'
}

const CATEGORY_LABELS: Record<ScentCategory, string> = {
  flower: '花香',
  food: '食物',
  nature: '自然',
  city: '城市',
  other: '其他'
}

function createBubbleIcon(color: string, isNew = false): L.DivIcon {
  return L.divIcon({
    className: `custom-marker${isNew ? ' marker-animate' : ''}`,
    html: `<div class="bubble-marker" style="background: radial-gradient(circle at 30% 30%, ${color}cc, ${color}); box-shadow: 0 0 12px ${color}80;"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
}

function generateRandomUsername(): string {
  const adjectives = ['好奇的', '迷路的', '开心的', '悠闲的', '浪漫的', '勇敢的']
  const nouns = ['旅人', '嗅探者', '记味人', '闻香客', '寻味师', '行者']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

export default function MapView({ markers, onMarkersChange, onMarkerClick, onShowSuccess }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createPosition, setCreatePosition] = useState<{ lat: number; lng: number } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    username: generateRandomUsername(),
    category: 'other' as ScentCategory
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [40.7580, -73.9855],
      zoom: 13,
      zoomControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.setView([position.coords.latitude, position.coords.longitude], 13)
        },
        () => {
          map.setView([40.7580, -73.9855], 13)
        }
      )
    }

    map.on('contextmenu', (e) => {
      setCreatePosition({ lat: e.latlng.lat, lng: e.latlng.lng })
      setShowCreateForm(true)
      setFormData(prev => ({ ...prev, username: generateRandomUsername() }))
    })

    let pressTimer: ReturnType<typeof setTimeout> | null = null
    map.on('mousedown', () => {
      pressTimer = setTimeout(() => {
        if (pressTimer) {
          map.getContainer().click()
        }
      }, 500)
    })
    map.on('mouseup mouseout', () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    leafletMarkersRef.current.forEach((leafletMarker, id) => {
      if (!markers.find(m => m.id === id)) {
        map.removeLayer(leafletMarker)
        leafletMarkersRef.current.delete(id)
      }
    })

    markers.forEach(marker => {
      if (leafletMarkersRef.current.has(marker.id)) return

      const color = CATEGORY_COLORS[marker.category]
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createBubbleIcon(color)
      })

      const popupContent = `
        <div class="popup-card">
          <div class="popup-header">
            <span class="popup-category-badge" style="background: ${color};">${CATEGORY_LABELS[marker.category]}</span>
          </div>
          <h3 class="popup-title">${marker.name}</h3>
          ${marker.description ? `<p class="popup-desc">${marker.description}</p>` : ''}
          <div class="popup-meta">
            <span>@${marker.username}</span>
            <span>${new Date(marker.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div class="popup-stats">
            <span>❤️ ${marker.likes}</span>
            <span>💬 ${marker.comments.length}</span>
          </div>
          <button class="popup-detail-btn" data-marker-id="${marker.id}">查看详情 →</button>
        </div>
      `

      leafletMarker.bindPopup(popupContent, {
        className: 'custom-popup',
        maxWidth: 280
      })

      leafletMarker.on('popupopen', () => {
        const btn = document.querySelector(`.popup-detail-btn[data-marker-id="${marker.id}"]`)
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            onMarkerClick(marker)
            leafletMarker.closePopup()
          })
        }
      })

      leafletMarker.addTo(map)
      leafletMarkersRef.current.set(marker.id, leafletMarker)
    })
  }, [markers, onMarkerClick])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createPosition || isSubmitting) return
    if (!formData.name.trim() || !formData.username.trim()) return

    setIsSubmitting(true)
    try {
      const newMarker = await MarkerService.createMarker({
        lat: createPosition.lat,
        lng: createPosition.lng,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        username: formData.username.trim(),
        category: formData.category
      })

      const allMarkers = await MarkerService.getMarkers()
      onMarkersChange(allMarkers)

      const map = mapRef.current
      if (map) {
        const color = CATEGORY_COLORS[newMarker.category]
        const leafletMarker = L.marker([newMarker.lat, newMarker.lng], {
          icon: createBubbleIcon(color, true)
        })
        leafletMarker.addTo(map)
        setTimeout(() => {
          map.removeLayer(leafletMarker)
        }, 400)
      }

      onShowSuccess('气味标记创建成功！')
      setShowCreateForm(false)
      setCreatePosition(null)
      setFormData({
        name: '',
        description: '',
        username: generateRandomUsername(),
        category: 'other'
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container" />

      {showCreateForm && createPosition && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-card create-form" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">创建气味标记</h2>
            <p className="modal-subtitle">
              坐标: {createPosition.lat.toFixed(4)}, {createPosition.lng.toFixed(4)}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>气味名称 *</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：雨后泥土香"
                  required
                />
                <span className="char-count">{formData.name.length}/20</span>
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  maxLength={100}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述一下这个气味带给你的感受..."
                  rows={3}
                />
                <span className="char-count">{formData.description.length}/100</span>
              </div>

              <div className="form-group">
                <label>用户名 *</label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
                <span className="char-count">{formData.username.length}/15</span>
              </div>

              <div className="form-group">
                <label>气味类别 *</label>
                <div className="category-picker">
                  {(Object.keys(CATEGORY_LABELS) as ScentCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-btn ${formData.category === cat ? 'active' : ''}`}
                      style={{
                        borderColor: CATEGORY_COLORS[cat],
                        background: formData.category === cat ? CATEGORY_COLORS[cat] : 'transparent'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !formData.name.trim() || !formData.username.trim()}
                >
                  {isSubmitting ? '提交中...' : '创建标记'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
