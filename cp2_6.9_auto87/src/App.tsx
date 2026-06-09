import React, { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel from './controls/ControlPanel'
import CardGrid from './preview/CardGrid'
import { GlassParams, DEFAULT_PARAMS } from './types'

const App: React.FC = () => {
  const [params, setParams] = useState<GlassParams>(DEFAULT_PARAMS)
  const [toastVisible, setToastVisible] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  const rafRef = useRef<number | null>(null)
  const pendingParamsRef = useRef<GlassParams | null>(null)

  const showToast = useCallback(() => {
    setToastVisible(true)
    const timer = setTimeout(() => {
      setToastVisible(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleParamsChange = useCallback((nextParams: GlassParams) => {
    pendingParamsRef.current = nextParams

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingParamsRef.current) {
          setParams(pendingParamsRef.current)
          pendingParamsRef.current = null
        }
        rafRef.current = null
      })
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const isDesktop = windowWidth >= 1024
  const isMobile = windowWidth < 640

  return (
    <div className="relative flex min-h-screen w-full" style={{ background: '#12121A' }}>
      {isDesktop ? (
        <div
          className="flex-shrink-0 h-screen overflow-hidden"
          style={{ width: '320px' }}
        >
          <ControlPanel
            params={params}
            onChange={handleParamsChange}
            onExport={showToast}
          />
        </div>
      ) : null}

      <div
        className="flex-1 flex items-center justify-center overflow-auto p-8"
        style={{
          paddingBottom: isDesktop ? '2rem' : isDrawerOpen ? 'calc(50vh + 2rem)' : '8rem',
          backgroundImage: `
            radial-gradient(ellipse at 20% 30%, hsla(${params.gradientHue}, ${params.gradientSaturation}%, 40%, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, hsla(${(params.gradientHue + 60) % 360}, ${params.gradientSaturation}%, 40%, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsla(${(params.gradientHue + 120) % 360}, ${params.gradientSaturation}%, 30%, 0.1) 0%, transparent 70%)
          `,
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? '100%' : '640px',
          }}
        >
          <style>{`
            @media (max-width: 639px) {
              .card-grid-wrapper > div {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              .card-grid-wrapper .glass-card {
                width: 140px !important;
                height: 180px !important;
              }
            }
            @media (max-width: 380px) {
              .card-grid-wrapper > div {
                grid-template-columns: 1fr !important;
              }
              .card-grid-wrapper .glass-card {
                width: 100% !important;
                max-width: 220px;
                height: 200px !important;
              }
            }
            .glass-card:hover {
              transform: translateY(-3px) !important;
              box-shadow:
                0 12px 48px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.2) !important;
            }
          `}</style>
          <div className="card-grid-wrapper">
            <CardGrid params={params} />
          </div>
        </div>
      </div>

      {!isDesktop && (
        <>
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="fixed left-1/2 transform -translate-x-1/2 z-40 flex items-center justify-center transition-all"
            style={{
              bottom: isDrawerOpen ? 'calc(50vh - 8px)' : '16px',
              width: '48px',
              height: isDrawerOpen ? '16px' : '48px',
              borderRadius: isDrawerOpen ? '8px' : '50%',
              background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isDrawerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
                opacity: isDrawerOpen ? 0 : 1,
              }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            {isDrawerOpen && (
              <svg
                width="32"
                height="4"
                viewBox="0 0 32 4"
                fill="white"
                style={{ borderRadius: '2px' }}
              />
            )}
          </button>

          <div
            className="fixed left-0 right-0 bottom-0 z-30 transition-all duration-300 ease overflow-hidden"
            style={{
              height: isDrawerOpen ? '50vh' : '0px',
              borderTopLeftRadius: isDrawerOpen ? '12px' : '0px',
              borderTopRightRadius: isDrawerOpen ? '12px' : '0px',
            }}
          >
            <div
              className="w-full h-full"
              style={{
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
              }}
            >
              <ControlPanel
                params={params}
                onChange={handleParamsChange}
                onExport={showToast}
              />
            </div>
          </div>
        </>
      )}

      {toastVisible && (
        <div
          className="fixed left-1/2 z-50 toast-enter pointer-events-none"
          style={{
            bottom: isDesktop ? '32px' : isDrawerOpen ? 'calc(50vh + 32px)' : '100px',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white"
            style={{
              background: '#10B981',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M16.6667 5L7.5 14.1667L3.33337 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>代码已复制</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
