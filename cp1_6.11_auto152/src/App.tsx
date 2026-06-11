import { useEffect, useCallback, useRef } from 'react'
import { useWorkshopStore } from './store'
import type { CandleRecipe } from './types'
import Candle from './components/Candle'
import Workbench from './components/Workbench'
import ParticleField from './components/ParticleField'
import RecipeCards from './components/RecipeCards'

export default function App() {
  const {
    scentNotes,
    candles,
    selectedCandleId,
    setScentNotes,
    setCandles,
    selectCandle,
    toggleBurning,
    updateBurnTime,
    updateMeltLevel,
    updateCurrentColor,
  } = useWorkshopStore()

  const burnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const colorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/notes')
      .then((r) => r.json())
      .then(setScentNotes)
      .catch(() => {})
    fetch('/api/candles')
      .then((r) => r.json())
      .then((data: CandleRecipe[]) =>
        setCandles(
          data.map((d) => ({
            id: d.id,
            name: d.name,
            isBurning: false,
            burnTime: 0,
            meltLevel: 0,
            currentColor: d.currentColor,
            waxColor: d.waxColor,
            scents: d.scents,
          }))
        )
      )
      .catch(() => {})
  }, [setScentNotes, setCandles])

  useEffect(() => {
    const loadRecipes = useWorkshopStore.getState().loadRecipes
    loadRecipes()
  }, [])

  useEffect(() => {
    const burningCandles = candles.filter((c) => c.isBurning)

    if (burningCandles.length > 0) {
      if (!burnTimerRef.current) {
        burnTimerRef.current = setInterval(() => {
          const currentCandles = useWorkshopStore.getState().candles
          currentCandles.forEach((c) => {
            if (!c.isBurning) return
            updateBurnTime(c.id, 100)
            const newMelt = Math.min(c.meltLevel + 5 / 30, 1)
            updateMeltLevel(c.id, newMelt)
          })
        }, 100)
      }
      if (!colorTimerRef.current) {
        colorTimerRef.current = setInterval(() => {
          const currentCandles = useWorkshopStore.getState().candles
          currentCandles.forEach((c) => {
            if (!c.isBurning || c.burnTime < 120000) return
            const waxRgb = hexToRgb(c.waxColor)
            const targetRgb = hexToRgb('#5a3e2b')
            if (!waxRgb || !targetRgb) return
            const progress = Math.min((c.burnTime - 120000) / (1200000), 1)
            const r = Math.round(waxRgb.r + (targetRgb.r - waxRgb.r) * progress)
            const g = Math.round(waxRgb.g + (targetRgb.g - waxRgb.g) * progress)
            const b = Math.round(waxRgb.b + (targetRgb.b - waxRgb.b) * progress)
            updateCurrentColor(c.id, rgbToHex(r, g, b))
          })
        }, 1000)
      }
    } else {
      if (burnTimerRef.current) {
        clearInterval(burnTimerRef.current)
        burnTimerRef.current = null
      }
      if (colorTimerRef.current) {
        clearInterval(colorTimerRef.current)
        colorTimerRef.current = null
      }
    }

    return () => {
      if (burnTimerRef.current) clearInterval(burnTimerRef.current)
      if (colorTimerRef.current) clearInterval(colorTimerRef.current)
    }
  }, [candles.some((c) => c.isBurning), updateBurnTime, updateMeltLevel, updateCurrentColor])

  const selectedCandle = candles.find((c) => c.id === selectedCandleId) || null

  const handleWickClick = useCallback(
    (id: string) => {
      toggleBurning(id)
    },
    [toggleBurning]
  )

  const handleCandleClick = useCallback(
    (id: string) => {
      selectCandle(id === selectedCandleId ? null : id)
    },
    [selectCandle, selectedCandleId]
  )

  return (
    <div className="workshop-root">
      <div className="workshop-bg" />
      <div className="workshop-table">
        <div className="table-surface">
          <div className="candles-row">
            {candles.map((candle) => (
              <Candle
                key={candle.id}
                candle={candle}
                scentNotes={scentNotes}
                isSelected={candle.id === selectedCandleId}
                onWickClick={handleWickClick}
                onCandleClick={handleCandleClick}
              />
            ))}
          </div>

          {selectedCandle && (
            <Workbench
              candle={selectedCandle}
              scentNotes={scentNotes}
            />
          )}
        </div>

        <RecipeCards />
      </div>

      {selectedCandle && selectedCandle.isBurning && (
        <ParticleField
          candle={selectedCandle}
          scentNotes={scentNotes}
        />
      )}
    </div>
  )
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
