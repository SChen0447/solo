import { useState, useRef } from 'react'
import {
  Building,
  SoundSource,
  MaterialType,
  MATERIAL_LABELS,
  ViewMode,
  ProbeInfo,
  AcousticRay,
  Vec2,
  SceneSnapshot
} from '../types'

export interface ControlPanelProps {
  buildings: Building[]
  soundSource: SoundSource
  probeInfo: ProbeInfo | null
  viewMode: ViewMode
  selectedBuildingId: string | null
  onSoundSourceChange: (source: SoundSource) => void
  onBuildingChange: (id: string, updates: Partial<Building>) => void
  onViewModeChange: (mode: ViewMode) => void
  onSelectedBuildingChange: (id: string | null) => void
  onSaveSnapshot: () => void
  onLoadSnapshot: (snapshot: SceneSnapshot) => void
  isMobile: boolean
}

export default function ControlPanel(props: ControlPanelProps) {
  const {
    buildings,
    soundSource,
    probeInfo,
    viewMode,
    selectedBuildingId,
    onSoundSourceChange,
    onBuildingChange,
    onViewModeChange,
    onSelectedBuildingChange,
    onSaveSnapshot,
    onLoadSnapshot,
    isMobile
  } = props

  const [drawerOpen, setDrawerOpen] = useState(isMobile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const snap = JSON.parse(ev.target?.result as string) as SceneSnapshot
        onLoadSnapshot(snap)
      } catch (err) {
        alert('无效的快照文件')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
    transition: 'transform 0.3s ease',
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column'
  } : {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '30%',
    minWidth: '340px',
    maxWidth: '420px',
    height: '100vh',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column'
  }

  return (
    <div style={{
      ...panelStyle,
      background: 'rgba(20, 30, 50, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderLeft: isMobile ? 'none' : '1px solid rgba(0, 188, 212, 0.15)',
      borderTop: isMobile ? '1px solid rgba(0, 188, 212, 0.15)' : 'none',
      boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.5)' : '-4px 0 20px rgba(0,0,0,0.4)'
    }}>
      {isMobile && (
        <div
          onClick={() => setDrawerOpen(o => !o)}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: '#00bcd4',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {drawerOpen ? '▼ 收起面板' : '▲ 展开控制面板'}
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,188,212,0.3) transparent'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(0,188,212,0.2)'
        }}>
          <h1 style={{
            fontSize: isMobile ? '16px' : '18px',
            color: '#00bcd4',
            margin: 0,
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>城市声场可视化</h1>
          <p style={{
            fontSize: '11px',
            color: '#8899aa',
            margin: '4px 0 0 0'
          }}>Acoustic Field Visualizer</p>
        </div>

        <Section title="声源调节 / Sound Source">
          <SliderRow
            label="频率 Frequency"
            value={soundSource.frequency}
            min={100} max={2000} step={50}
            unit="Hz"
            onChange={v => onSoundSourceChange({ ...soundSource, frequency: v })}
          />
          <SliderRow
            label="声压级 SPL"
            value={soundSource.soundPressureLevel}
            min={60} max={120} step={5}
            unit="dB"
            onChange={v => onSoundSourceChange({ ...soundSource, soundPressureLevel: v })}
          />
        </Section>

        <Section title="视角切换 / View Mode">
          <div style={{ display: 'flex', gap: '8px' }}>
            <ToggleButton
              active={viewMode === 'topdown'}
              onClick={() => onViewModeChange('topdown')}
              label="俯视 Top Down"
            />
            <ToggleButton
              active={viewMode === 'firstperson'}
              onClick={() => onViewModeChange('firstperson')}
              label="第一人称 3D"
            />
          </div>
        </Section>

        <Section title={`建筑控制 / Buildings (${buildings.length})`}>
          {buildings.map(b => (
            <BuildingCard
              key={b.id}
              building={b}
              selected={selectedBuildingId === b.id}
              onSelect={() => onSelectedBuildingChange(selectedBuildingId === b.id ? null : b.id)}
              onChange={updates => onBuildingChange(b.id, updates)}
            />
          ))}
        </Section>

        <Section title="测量探头 / Probe">
          <ProbeDisplay probeInfo={probeInfo} />
        </Section>

        <Section title="场景快照 / Snapshot">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ActionButton onClick={onSaveSnapshot} label="💾 保存配置" />
            <ActionButton onClick={() => fileInputRef.current?.click()} label="📂 加载配置" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileLoad}
            />
          </div>
        </Section>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(0, 188, 212, 0.08)',
          borderRadius: '6px',
          border: '1px solid rgba(0, 188, 212, 0.15)',
          fontSize: '11px',
          color: '#88aabb',
          lineHeight: '1.6'
        }}>
          <div style={{ color: '#00bcd4', fontWeight: 600, marginBottom: '6px' }}>💡 使用提示</div>
          <div>• 拖拽3D场景中的建筑可移动位置（步长0.5m）</div>
          <div>• 点击热力图或街道地面放置测量探头</div>
          <div>• 调整吸声系数观察反射变化</div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{
        fontSize: '12px',
        color: '#00bcd4',
        fontWeight: 600,
        marginBottom: '10px',
        paddingLeft: '8px',
        borderLeft: '2px solid #00bcd4',
        letterSpacing: '0.3px'
      }}>{title}</div>
      <div style={{ padding: '0 4px' }}>{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, unit, onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '12px'
      }}>
        <span style={{ color: '#c0c8d0' }}>{label}</span>
        <span style={{
          color: '#00bcd4',
          fontWeight: 600,
          fontFamily: 'monospace'
        }}>{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          background: 'linear-gradient(to right, #00bcd4, #00838f)',
          borderRadius: '2px',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          cursor: 'pointer',
          transition: 'filter 0.2s ease'
        } as React.CSSProperties}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
      />
    </div>
  )
}

function ToggleButton({ active, onClick, label }: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        fontSize: '12px',
        borderRadius: '6px',
        border: active ? '1px solid #00bcd4' : '1px solid rgba(255,255,255,0.1)',
        background: active
          ? 'linear-gradient(135deg, rgba(0,188,212,0.25), rgba(0,131,143,0.25))'
          : 'rgba(60,70,90,0.4)',
        color: active ? '#00bcd4' : '#a0a8b0',
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s ease',
        transform: 'scale(1)',
        boxShadow: active ? '0 0 10px rgba(0,188,212,0.3)' : 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.03)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {label}
    </button>
  )
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '120px',
        padding: '10px 14px',
        fontSize: '12px',
        borderRadius: '6px',
        border: '1px solid rgba(0,188,212,0.3)',
        background: 'linear-gradient(135deg, rgba(0,188,212,0.15), rgba(0,131,143,0.15))',
        color: '#00bcd4',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,188,212,0.3), rgba(0,131,143,0.3))'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,188,212,0.2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,188,212,0.15), rgba(0,131,143,0.15))'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {label}
    </button>
  )
}

function BuildingCard({
  building, selected, onSelect, onChange
}: {
  building: Building
  selected: boolean
  onSelect: () => void
  onChange: (updates: Partial<Building>) => void
}) {
  const snap = (v: number, step: number) => Math.round(v / step) * step

  return (
    <div
      onClick={onSelect}
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(0,188,212,0.15), rgba(0,131,143,0.1))'
          : 'rgba(50,60,80,0.35)',
        border: selected
          ? '1px solid rgba(0,188,212,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '12px', height: '12px',
            background: building.color,
            borderRadius: '3px',
            border: selected ? '1px solid #00bcd4' : '1px solid rgba(255,255,255,0.2)'
          }} />
          <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 600 }}>
            {building.name}
          </span>
        </div>
        {selected && (
          <span style={{ fontSize: '10px', color: '#00bcd4' }}>● 已选中</span>
        )}
      </div>

      {selected && (
        <div onClick={e => e.stopPropagation()}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <NumberField
              label="位置X"
              value={building.position.x}
              step={0.5}
              onChange={v => onChange({ position: { ...building.position, x: snap(v, 0.5) } })}
            />
            <NumberField
              label="位置Z"
              value={building.position.z}
              step={0.5}
              onChange={v => onChange({ position: { ...building.position, z: snap(v, 0.5) } })}
            />
          </div>

          <SliderRow
            label="旋转 Rotation"
            value={building.rotation}
            min={-180} max={180} step={5}
            unit="°"
            onChange={v => onChange({ rotation: snap(v, 5) })}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginTop: '8px'
          }}>
            <MaterialSelect
              label="前墙 Front"
              value={building.walls.front}
              onChange={m => onChange({ walls: { ...building.walls, front: m } })}
            />
            <MaterialSelect
              label="后墙 Back"
              value={building.walls.back}
              onChange={m => onChange({ walls: { ...building.walls, back: m } })}
            />
            <MaterialSelect
              label="左墙 Left"
              value={building.walls.left}
              onChange={m => onChange({ walls: { ...building.walls, left: m } })}
            />
            <MaterialSelect
              label="右墙 Right"
              value={building.walls.right}
              onChange={m => onChange({ walls: { ...building.walls, right: m } })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function NumberField({ label, value, step, onChange }: {
  label: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#8899aa', marginBottom: '3px' }}>{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: '12px',
          background: 'rgba(20,30,45,0.8)',
          border: '1px solid rgba(0,188,212,0.2)',
          borderRadius: '4px',
          color: '#e0e0e0',
          outline: 'none',
          fontFamily: 'monospace'
        }}
      />
    </div>
  )
}

function MaterialSelect({ label, value, onChange }: {
  label: string
  value: MaterialType
  onChange: (m: MaterialType) => void
}) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#8899aa', marginBottom: '3px' }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value as MaterialType)}
        style={{
          width: '100%',
          padding: '5px 6px',
          fontSize: '11px',
          background: 'rgba(20,30,45,0.8)',
          border: '1px solid rgba(0,188,212,0.2)',
          borderRadius: '4px',
          color: '#e0e0e0',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  )
}

function ProbeDisplay({ probeInfo }: { probeInfo: ProbeInfo | null }) {
  if (!probeInfo) {
    return (
      <div style={{
        padding: '12px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#8899aa',
        background: 'rgba(50,60,80,0.2)',
        borderRadius: '6px',
        border: '1px dashed rgba(255,255,255,0.1)'
      }}>
        点击热力图或3D场景地面放置测量探头
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(50,60,80,0.3)',
      borderRadius: '6px',
      padding: '10px',
      border: '1px solid rgba(0,188,212,0.2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <div style={{ color: '#8899aa', fontSize: '10px' }}>坐标 Position</div>
          <div style={{ color: '#e0e0e0', fontFamily: 'monospace' }}>
            ({probeInfo.position.x.toFixed(1)}, {probeInfo.position.z.toFixed(1)})
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#8899aa', fontSize: '10px' }}>总声压级 Total SPL</div>
          <div style={{
            color: probeInfo.totalSPL > 100 ? '#ffd700' : probeInfo.totalSPL > 80 ? '#8cbf3f' : '#00bcd4',
            fontFamily: 'monospace',
            fontWeight: 700
          }}>
            {probeInfo.totalSPL.toFixed(1)} dB
          </div>
        </div>
      </div>

      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#8899aa', marginBottom: '6px' }}>
          可分辨反射路径 ({probeInfo.rays.length})
        </div>
        {probeInfo.rays.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#8899aa' }}>无直达/反射声线</div>
        ) : (
          probeInfo.rays.map((ray: AcousticRay, i: number) => (
            <RayRow key={ray.id} ray={ray} index={i} />
          ))
        )}
      </div>
    </div>
  )
}

function RayRow({ ray, index }: { ray: AcousticRay; index: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      marginBottom: '4px',
      background: 'rgba(20,30,45,0.5)',
      borderRadius: '4px',
      fontSize: '11px',
      borderLeft: `3px solid ${ray.color}`
    }}>
      <div style={{ width: '20px', color: '#8899aa' }}>#{index + 1}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e0e0e0', fontWeight: ray.isDirect ? 600 : 400 }}>
          {ray.isDirect ? '直达声 Direct' : `一次反射 Refl`}
        </div>
        <div style={{ color: '#8899aa', fontSize: '10px', marginTop: '2px' }}>
          路径: {ray.pathLength.toFixed(1)}m
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: ray.soundPressureLevel > 100 ? '#ffd700' : '#aaddaa', fontWeight: 600 }}>
          {ray.soundPressureLevel.toFixed(1)} dB
        </div>
        <div style={{ color: '#00bcd4', fontSize: '10px' }}>
          {ray.delayMs.toFixed(2)} ms
        </div>
      </div>
    </div>
  )
}
