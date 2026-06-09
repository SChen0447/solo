import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { IntersectionState, Vehicle, VehicleType } from '../utils/SimulationEngine'
import { SimulationEngine, VEHICLE_ICONS } from '../utils/SimulationEngine'

interface TrafficMapProps {
  intersections: Map<string, IntersectionState>
  selectedId: string | null
  onIntersectionClick: (id: string) => void
}

const CENTER: [number, number] = [31.2304, 121.4737]
const ZOOM = 14

const createSignalIcon = (signal: IntersectionState['signal'], isSelected: boolean) => {
  return L.divIcon({
    className: '',
    html: `
      <div class="intersection-marker ${isSelected ? 'selected' : ''}">
        <div class="intersection-label">路口</div>
        <div class="signal-lights">
          <div class="signal-light red ${signal === 'red' ? 'active' : ''}"></div>
          <div class="signal-light yellow ${signal === 'yellow' ? 'active' : ''}"></div>
          <div class="signal-light green ${signal === 'green' ? 'active' : ''}"></div>
        </div>
      </div>
    `,
    iconSize: [40, 70],
    iconAnchor: [20, 35],
  })
}

const createVehicleIcon = (type: VehicleType) => {
  return L.divIcon({
    className: '',
    html: `<div class="vehicle-marker">${VEHICLE_ICONS[type]}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

const TrafficMap: React.FC<TrafficMapProps> = ({
  intersections,
  selectedId,
  onIntersectionClick,
}) => {
  const [vehicles, setVehicles] = useState<Map<string, Vehicle[]>>(new Map())
  const animationRef = useRef<number | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    let lastTime = 0
    const animate = (time: number) => {
      if (time - lastTime >= 100) {
        setVehicles(SimulationEngine.getVehicles())
        lastTime = time
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const roadLines = useMemo(() => {
    const lines: [number, number][][] = []
    const list = Array.from(intersections.values())
    
    if (list.length >= 2) {
      lines.push([[list[0].lat, list[0].lng], [list[1].lat, list[1].lng]])
    }
    if (list.length >= 3) {
      lines.push([[list[0].lat, list[0].lng], [list[2].lat, list[2].lng]])
    }
    if (list.length >= 4) {
      lines.push([[list[2].lat, list[2].lng], [list[3].lat, list[3].lng]])
      lines.push([[list[1].lat, list[1].lng], [list[3].lat, list[3].lng]])
    }

    return lines
  }, [intersections])

  const handleMarkerClick = (id: string) => {
    onIntersectionClick(id)
  }

  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%', background: '#f5f5f5' }}
      ref={(map) => {
        if (map) mapRef.current = map
      }}
      zoomControl={true}
      preferCanvas={true}
    >
      <TileLayer
        attribution=''
        url='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23f5f5f5" width="400" height="400"/><g stroke="%23e0e0e0" stroke-width="1"><path d="M0 200 L400 200"/><path d="M200 0 L200 400"/></g></svg>'
      />

      {roadLines.map((positions, idx) => (
        <Polyline
          key={`road-${idx}`}
          positions={positions}
          pathOptions={{
            color: '#bdbdbd',
            weight: 12,
            opacity: 0.9,
            lineCap: 'round',
          }}
        />
      ))}

      {roadLines.map((positions, idx) => (
        <Polyline
          key={`road-center-${idx}`}
          positions={positions}
          pathOptions={{
            color: '#ffd600',
            weight: 2,
            opacity: 0.6,
            dashArray: '8, 8',
          }}
        />
      ))}

      {Array.from(intersections.values()).map((intersection) => {
        const isSelected = intersection.id === selectedId
        const icon = createSignalIcon(intersection.signal, isSelected)

        return (
          <Marker
            key={intersection.id}
            position={[intersection.lat, intersection.lng]}
            icon={icon}
            eventHandlers={{
              click: () => handleMarkerClick(intersection.id),
            }}
          >
            <Popup>
              <div style={{ color: '#1a237e', fontWeight: 600 }}>
                {intersection.name}
              </div>
              <div style={{ marginTop: 4, color: '#666' }}>
                信号灯：{intersection.signal === 'red' ? '🔴 红灯' : intersection.signal === 'yellow' ? '🟡 黄灯' : '🟢 绿灯'}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {Array.from(vehicles.values()).flat().map((vehicle) => (
        <Marker
          key={vehicle.id}
          position={[vehicle.lat, vehicle.lng]}
          icon={createVehicleIcon(vehicle.type)}
          keyboard={false}
          interactive={false}
        />
      ))}
    </MapContainer>
  )
}

export default TrafficMap
