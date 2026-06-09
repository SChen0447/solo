import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { DriftRecord } from '../types'

interface DriftMapProps {
  driftHistory: DriftRecord[]
  currentCity: { city: string; lat: number; lng: number }
}

const bookIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1565C0">
  <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
</svg>`

const bookIcon = L.divIcon({
  className: 'book-marker',
  html: bookIconSVG,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
})

function createCurvePoints(
  from: [number, number],
  to: [number, number],
  segments: number = 30
): [number, number][] {
  const points: [number, number][] = []
  const midLat = (from[0] + to[0]) / 2
  const midLng = (from[1] + to[1]) / 2
  const latOffset = Math.abs(to[0] - from[0]) * 0.3
  const lngOffset = Math.abs(to[1] - from[1]) * 0.3
  const curveLat = midLat + Math.max(latOffset, 2)
  const curveLng = midLng + Math.max(lngOffset, 1)

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const lat =
      (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * curveLat + t * t * to[0]
    const lng =
      (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * curveLng + t * t * to[1]
    points.push([lat, lng])
  }
  return points
}

export default function DriftMap({ driftHistory, currentCity }: DriftMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const completedRecords = driftHistory.filter((d) => d.status === 'completed')

    const allLocations: [number, number][] = []
    if (completedRecords.length > 0 && completedRecords[0].fromLocation) {
      allLocations.push([
        completedRecords[0].fromLocation.lat,
        completedRecords[0].fromLocation.lng,
      ])
    }
    completedRecords.forEach((r) => {
      allLocations.push([r.toLocation.lat, r.toLocation.lng])
    })
    if (allLocations.length === 0) {
      allLocations.push([currentCity.lat, currentCity.lng])
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '',
        maxZoom: 19,
      }
    ).addTo(map)

    map.getContainer().style.background = '#E0D8C8'
    const pane = map.createPane('customPane')
    pane.style.zIndex = '450'

    if (completedRecords.length > 0) {
      const first = completedRecords[0]
      const startMarker = L.marker(
        [first.fromLocation.lat, first.fromLocation.lng],
        { icon: bookIcon, pane: 'customPane' }
      ).addTo(map)
      startMarker.bindPopup(
        `<div style="font-family: inherit; padding: 4px;">
          <b style="color: #3E2723;">📍 ${first.fromLocation.city}</b><br/>
          <span style="color: #6B4423; font-size: 12px;">起点 · ${first.fromUserName} 发布</span>
        </div>`
      )

      completedRecords.forEach((record, idx) => {
        const from: [number, number] = [
          idx === 0 ? record.fromLocation.lat : completedRecords[idx - 1].toLocation.lat,
          idx === 0 ? record.fromLocation.lng : completedRecords[idx - 1].toLocation.lng,
        ]
        const to: [number, number] = [record.toLocation.lat, record.toLocation.lng]

        const curvePoints = createCurvePoints(from, to)

        L.polyline(curvePoints, {
          color: '#B8860B',
          weight: 3,
          opacity: 0.8,
          lineJoin: 'round',
        }).addTo(map)

        const animatedLine = L.polyline(curvePoints, {
          color: '#B8860B',
          weight: 3,
          opacity: 1,
          dashArray: '10, 10',
          className: 'drift-animate-line',
        }).addTo(map)

        const endMarker = L.marker(to, {
          icon: bookIcon,
          pane: 'customPane',
        }).addTo(map)

        endMarker.bindPopup(
          `<div style="font-family: inherit; padding: 4px; min-width: 160px;">
            <b style="color: #3E2723; font-size: 14px;">📍 ${record.toLocation.city}</b><br/>
            <span style="color: #6B4423; font-size: 12px;">到达: ${record.completedAt || record.createdAt}</span><br/>
            <span style="color: #8B5E3C; font-size: 12px;">
              停留: ${record.stayDays || '-'} 天 · ${record.toUserName}
            </span><br/>
            ${record.message ? `<span style="color: #5D8A4C; font-size: 12px; font-style: italic;">"${record.message}"</span>` : ''}
          </div>`
        )
      })
    } else {
      const marker = L.marker([currentCity.lat, currentCity.lng], {
        icon: bookIcon,
        pane: 'customPane',
      }).addTo(map)
      marker.bindPopup(
        `<div style="font-family: inherit; padding: 4px;">
          <b style="color: #3E2723;">📍 ${currentCity.city}</b><br/>
          <span style="color: #6B4423; font-size: 12px;">等待开启漂流之旅...</span>
        </div>`
      )
    }

    if (allLocations.length > 1) {
      map.fitBounds(allLocations, { padding: [60, 60] })
    } else {
      map.setView(allLocations[0], 5)
    }

    mapInstanceRef.current = map

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      .drift-animate-line {
        stroke-dasharray: 15 10;
        animation: dash 2s linear infinite;
      }
      @keyframes dash {
        to {
          stroke-dashoffset: -50;
        }
      }
      .leaflet-popup-content-wrapper {
        background: #FFF8E7;
        border: 1px solid #E8D5B7;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(107, 68, 35, 0.2);
      }
      .leaflet-popup-tip {
        background: #FFF8E7;
      }
      .leaflet-control-attribution {
        display: none;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      styleEl.remove()
    }
  }, [driftHistory, currentCity])

  return (
    <div
      style={{
        background: '#FFF8E7',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #E8D5B7',
        boxShadow: '0 2px 8px rgba(107, 68, 35, 0.1)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #E8D5B7 0%, #D4A76A 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#3E2723">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#3E2723' }}>
          漂流地图
        </h3>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '13px',
            color: '#6B4423',
          }}
        >
          已漂流{' '}
          {driftHistory.filter((d) => d.status === 'completed').length} 个城市
        </span>
      </div>
      <div ref={mapRef} style={{ width: '100%', height: '400px' }} />
    </div>
  )
}
