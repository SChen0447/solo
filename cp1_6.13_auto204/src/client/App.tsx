import { useEffect, useRef, useState, useCallback } from 'react'
import { Capsule } from './types'
import CapsuleCard from './CapsuleCard'
import CapsulePlayer from './CapsulePlayer'
import CreateCapsule from './CreateCapsule'

function App() {
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const startTime = performance.now()
    fetch('/api/capsules')
      .then(res => res.json())
      .then((data: Capsule[]) => {
        setCapsules(data)
        setLoading(false)
        const elapsed = performance.now() - startTime
        console.log(`[Capsule Gallery] loaded ${data.length} capsules in ${elapsed.toFixed(0)}ms`)
      })
      .catch(err => {
        console.error('Failed to load capsules:', err)
        setLoading(false)
      })
  }, [])

  const handleCreateCapsule = useCallback((newCapsule: Capsule) => {
    setCapsules(prev => [newCapsule, ...prev])
    setIsCreating(false)
    setTimeout(() => {
      if (galleryRef.current) {
        galleryRef.current.scrollTo({
          top: galleryRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 100)
  }, [])

  const handleDeleteCapsule = useCallback((id: string) => {
    fetch(`/api/capsules/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          setCapsules(prev => prev.filter(c => c.id !== id))
        }
      })
      .catch(err => console.error('Failed to delete capsule:', err))
  }, [])

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>胶囊·光音档案</h1>
        <p style={styles.subtitle}>光影与音乐编织的私人记忆档案</p>
      </header>

      <main style={styles.galleryContainer} ref={galleryRef}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : capsules.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>还没有记忆胶囊</p>
            <p style={styles.emptyHint}>点击右下角 + 创建你的第一个胶囊</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {capsules.map(capsule => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                onClick={() => setSelectedCapsule(capsule)}
                onDelete={() => handleDeleteCapsule(capsule.id)}
              />
            ))}
          </div>
        )}
      </main>

      <button
        style={styles.fab}
        onClick={() => setIsCreating(true)}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = ''
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = ''
        }}
      >
        <span style={styles.fabIcon}>+</span>
      </button>

      {selectedCapsule && (
        <CapsulePlayer
          capsule={selectedCapsule}
          onClose={() => setSelectedCapsule(null)}
        />
      )}

      {isCreating && (
        <CreateCapsule
          onClose={() => setIsCreating(false)}
          onCreated={handleCreateCapsule}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 40px 120px',
    position: 'relative'
  },
  header: {
    textAlign: 'center',
    marginBottom: '60px'
  },
  title: {
    fontSize: '42px',
    fontWeight: 200,
    letterSpacing: '8px',
    margin: 0,
    background: 'linear-gradient(135deg, #ffffff 0%, #a18cd1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 300,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '4px',
    marginTop: '16px'
  },
  galleryContainer: {
    width: '100%',
    maxWidth: '1200px',
    minHeight: '400px'
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '60px',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  loading: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '18px',
    padding: '80px'
  },
  empty: {
    textAlign: 'center',
    padding: '100px 20px'
  },
  emptyText: {
    fontSize: '24px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '16px'
  },
  emptyHint: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)'
  },
  fab: {
    position: 'fixed',
    bottom: '40px',
    right: '40px',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 100
  },
  fabIcon: {
    fontSize: '32px',
    fontWeight: 300,
    color: '#333333',
    transition: 'transform 0.3s ease',
    lineHeight: 1
  }
}

const fabStyle = document.createElement('style')
fabStyle.textContent = `
  button:hover {
    transform: scale(1.13) rotate(45deg) !important;
  }
  button:hover span {
    transform: rotate(-45deg) !important;
  }
`
document.head.appendChild(fabStyle)

export default App
