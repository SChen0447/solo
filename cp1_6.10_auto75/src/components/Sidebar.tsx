import { ChartType, CHART_ICONS } from '../types'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  theme: {
    sidebarBg: string
    text: string
    textSecondary: string
    divider: string
  }
  onDragStart: (type: ChartType) => void
}

const Sidebar = ({ collapsed, onToggle, theme, onDragStart }: SidebarProps) => {
  const chartTypes: ChartType[] = ['line', 'bar', 'pie', 'heatmap']

  const handleDragStart = (e: React.DragEvent, type: ChartType) => {
    e.dataTransfer.setData('chartType', type)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(type)
  }

  const renderIcon = (type: ChartType, color: string) => {
    const size = 32
    switch (type) {
      case 'line':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M4 24 L10 14 L16 18 L22 8 L28 16" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="14" r="2" fill={color} />
            <circle cx="16" cy="18" r="2" fill={color} />
            <circle cx="22" cy="8" r="2" fill={color} />
            <circle cx="28" cy="16" r="2" fill={color} />
          </svg>
        )
      case 'bar':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <rect x="5" y="16" width="5" height="12" rx="1" fill={color} />
            <rect x="13" y="10" width="5" height="18" rx="1" fill={color} />
            <rect x="21" y="4" width="5" height="24" rx="1" fill={color} />
          </svg>
        )
      case 'pie':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M16 4 A12 12 0 0 1 28 16 L16 16 Z" fill={color} />
            <path d="M28 16 A12 12 0 0 1 10 26 L16 16 Z" fill={color} opacity="0.7" />
            <path d="M10 26 A12 12 0 0 1 4 16 L16 16 Z" fill={color} opacity="0.4" />
          </svg>
        )
      case 'heatmap':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="6" height="6" rx="1" fill={color} opacity="0.3" />
            <rect x="13" y="4" width="6" height="6" rx="1" fill={color} opacity="0.8" />
            <rect x="22" y="4" width="6" height="6" rx="1" fill={color} opacity="0.5" />
            <rect x="4" y="13" width="6" height="6" rx="1" fill={color} opacity="0.9" />
            <rect x="13" y="13" width="6" height="6" rx="1" fill={color} opacity="0.6" />
            <rect x="22" y="13" width="6" height="6" rx="1" fill={color} opacity="1" />
            <rect x="4" y="22" width="6" height="6" rx="1" fill={color} opacity="0.5" />
            <rect x="13" y="22" width="6" height="6" rx="1" fill={color} opacity="1" />
            <rect x="22" y="22" width="6" height="6" rx="1" fill={color} opacity="0.7" />
          </svg>
        )
    }
  }

  return (
    <div
      style={{
        width: collapsed ? 0 : 220,
        backgroundColor: theme.sidebarBg,
        borderRight: collapsed ? 'none' : `1px solid ${theme.divider}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <div
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: collapsed ? -30 : -15,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 30,
          height: 60,
          backgroundColor: theme.sidebarBg,
          border: `1px solid ${theme.divider}`,
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: theme.textSecondary,
          fontSize: 14,
          zIndex: 10
        }}
      >
        {collapsed ? '▶' : '◀'}
      </div>

      {!collapsed && (
        <>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.divider}`
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>组件面板</div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>拖拽组件到画布</div>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {chartTypes.map(type => {
              const info = CHART_ICONS[type]
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  style={{
                    padding: 16,
                    backgroundColor: theme.sidebarBg,
                    border: `1px solid ${theme.divider}`,
                    borderRadius: 8,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)'
                    e.currentTarget.style.borderColor = info.color
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.sidebarBg
                    e.currentTarget.style.borderColor = theme.divider
                  }}
                >
                  {renderIcon(type, info.color)}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{info.name}</div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>拖放到画布</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            marginTop: 'auto',
            padding: 16,
            borderTop: `1px solid ${theme.divider}`,
            fontSize: 11,
            color: theme.textSecondary,
            lineHeight: 1.6
          }}>
            <div>• 拖拽卡片添加图表</div>
            <div>• 点击图表进行配置</div>
            <div>• 滚轮缩放图表大小</div>
            <div>• 悬停右上角删除</div>
          </div>
        </>
      )}
    </div>
  )
}

export default Sidebar
