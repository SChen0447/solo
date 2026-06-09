import { useState } from 'react'
import type { DriftRecord } from '../types'

interface TimelineProps {
  driftHistory: DriftRecord[]
  originCity?: string
  originUser?: string
  originDate?: string
}

interface BubbleInfo {
  x: number
  y: number
  record: DriftRecord | null
  isOrigin: boolean
  originData?: { city: string; user: string; date: string }
}

export default function Timeline({
  driftHistory,
  originCity,
  originUser,
  originDate,
}: TimelineProps) {
  const [activeBubble, setActiveBubble] = useState<BubbleInfo | null>(null)
  const completedRecords = driftHistory.filter((d) => d.status === 'completed')

  return (
    <div
      style={{
        background: 'rgba(232, 213, 183, 0.5)',
        borderRadius: '12px',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#8B5E3C">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#3E2723' }}>
          漂流时间轴
        </h3>
      </div>

      {completedRecords.length === 0 && !originCity ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#8B5E3C' }}>
          <p>这本书还没有开始它的漂流旅程...</p>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            minHeight: '80px',
            paddingLeft: '8px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '0',
              bottom: '0',
              width: '3px',
              background:
                'linear-gradient(180deg, #D4A76A 0%, #8B5E3C 100%)',
              borderRadius: '2px',
            }}
          />

          <div style={{ position: 'relative' }}>
            {originCity && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  paddingBottom: '28px',
                  position: 'relative',
                }}
              >
                <div
                  onClick={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    setActiveBubble({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      record: null,
                      isOrigin: true,
                      originData: {
                        city: originCity,
                        user: originUser || '',
                        date: originDate || '',
                      },
                    })
                  }}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#5D8A4C',
                    border: '3px solid #F5E6CA',
                    boxShadow: '0 2px 8px rgba(93, 138, 76, 0.4)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    marginLeft: '-3px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#3E2723', fontSize: '15px' }}>
                    旅程起点 · {originCity}
                  </p>
                  <p style={{ color: '#6B4423', fontSize: '13px' }}>
                    {originUser} · {originDate}
                  </p>
                </div>
              </div>
            )}

            {completedRecords.map((record, idx) => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  paddingBottom: idx === completedRecords.length - 1 ? '0' : '28px',
                  position: 'relative',
                }}
              >
                <div
                  onClick={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    setActiveBubble({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      record,
                      isOrigin: false,
                    })
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#D4A76A',
                    border: '3px solid #F5E6CA',
                    boxShadow: '0 2px 8px rgba(212, 167, 106, 0.5)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    zIndex: 2,
                    marginLeft: '-1px',
                    transition: 'transform 0.2s ease',
                  }}
                />
                <div>
                  <p style={{ fontWeight: 600, color: '#3E2723', fontSize: '15px' }}>
                    📍 {record.toLocation.city}
                  </p>
                  <p style={{ color: '#6B4423', fontSize: '13px' }}>
                    {record.toUserName} 收 · {record.completedAt || record.createdAt}
                    {record.stayDays ? ` · 停留${record.stayDays}天` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {activeBubble && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999,
                }}
                onClick={() => setActiveBubble(null)}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: activeBubble.x,
                  top: activeBubble.y - 8,
                  transform: 'translate(-50%, -100%)',
                  background: '#FFF8E7',
                  border: '1px solid #D4A76A',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  boxShadow: '0 8px 24px rgba(107, 68, 35, 0.3)',
                  minWidth: '220px',
                  maxWidth: '320px',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '14px',
                    height: '14px',
                    background: '#FFF8E7',
                    borderRight: '1px solid #D4A76A',
                    borderBottom: '1px solid #D4A76A',
                    transformOrigin: 'center',
                    transform: 'translateX(-50%) rotate(45deg)',
                  }}
                />
                {activeBubble.isOrigin && activeBubble.originData ? (
                  <>
                    <p style={{ fontWeight: 700, color: '#5D8A4C', fontSize: '14px', marginBottom: '8px' }}>
                      🌟 旅程起点
                    </p>
                    <p style={{ color: '#3E2723', fontSize: '13px', marginBottom: '4px' }}>
                      📍 {activeBubble.originData.city}
                    </p>
                    <p style={{ color: '#6B4423', fontSize: '13px', marginBottom: '4px' }}>
                      👤 {activeBubble.originData.user}
                    </p>
                    <p style={{ color: '#8B5E3C', fontSize: '12px' }}>
                      📅 {activeBubble.originData.date}
                    </p>
                  </>
                ) : activeBubble.record ? (
                  <>
                    <p style={{ fontWeight: 700, color: '#B8860B', fontSize: '14px', marginBottom: '8px' }}>
                      📮 漂流码: {activeBubble.record.driftCode}
                    </p>
                    <p style={{ color: '#3E2723', fontSize: '13px', marginBottom: '4px' }}>
                      📍 {activeBubble.record.fromLocation.city} → {activeBubble.record.toLocation.city}
                    </p>
                    <p style={{ color: '#6B4423', fontSize: '13px', marginBottom: '4px' }}>
                      👤 {activeBubble.record.fromUserName} → {activeBubble.record.toUserName}
                    </p>
                    <p style={{ color: '#8B5E3C', fontSize: '12px', marginBottom: activeBubble.record.message ? '8px' : '0' }}>
                      📅 {activeBubble.record.completedAt || activeBubble.record.createdAt}
                      {activeBubble.record.stayDays ? ` · 停留 ${activeBubble.record.stayDays} 天` : ''}
                    </p>
                    {activeBubble.record.message && (
                      <p
                        style={{
                          color: '#5D8A4C',
                          fontSize: '12px',
                          fontStyle: 'italic',
                          padding: '8px 10px',
                          background: 'rgba(93, 138, 76, 0.1)',
                          borderRadius: '6px',
                          borderLeft: '3px solid #5D8A4C',
                        }}
                      >
                        "{activeBubble.record.message}"
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
