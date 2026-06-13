import { useState, useEffect, useCallback, useRef } from 'react'
import CloudCanvas from './components/CloudCanvas'
import VotePanel from './components/VotePanel'

export interface Flavor {
  id: string
  name: string
  votes: number
  color: string
}

export interface VoteEvent {
  id: string
  timestamp: number
  flavorId: string
}

function App() {
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [voteEvents, setVoteEvents] = useState<VoteEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const localVoteIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/flavors')
      .then(res => res.json())
      .then((data: Flavor[]) => {
        setFlavors(data)
      })
      .catch(err => console.error('Failed to fetch flavors:', err))
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'init') {
        setFlavors(data.flavors)
      } else if (data.type === 'vote') {
        const eventId = `vote-${data.flavor.id}-${Date.now()}`
        if (!localVoteIdsRef.current.has(eventId)) {
          setVoteEvents(prev => [...prev, {
            id: eventId,
            timestamp: Date.now(),
            flavorId: data.flavor.id
          }])
          setTimeout(() => {
            setVoteEvents(prev => prev.filter(e => e.id !== eventId))
          }, 1600)
        }
        setFlavors(prev => prev.map(f => 
          f.id === data.flavor.id ? { ...f, votes: data.flavor.votes } : f
        ))
        setHighlightedId(data.flavor.id)
        setTimeout(() => setHighlightedId(null), 200)
      } else if (data.type === 'add') {
        setFlavors(prev => [...prev, data.flavor])
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  const handleVote = useCallback(async (id: string, x: number, y: number, color: string) => {
    try {
      await fetch(`/api/flavors/${id}/vote`, { method: 'POST' })
      const explosionId = `exp-${Date.now()}-${Math.random()}`
      setExplosions(prev => [...prev, { id: explosionId, x, y, color, startTime: Date.now() }])
      setTimeout(() => {
        setExplosions(prev => prev.filter(e => e.id !== explosionId))
      }, 1500)
    } catch (err) {
      console.error('Failed to vote:', err)
    }
  }, [])

  const handleAddFlavor = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/flavors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || '添加失败')
      }
    } catch (err) {
      console.error('Failed to add flavor:', err)
    }
  }, [])

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      background: 'radial-gradient(ellipse at center, #141829 0%, #0b0e14 100%)'
    }}>
      <CloudCanvas 
        flavors={flavors} 
        explosions={explosions}
        onVote={handleVote}
      />
      <VotePanel 
        flavors={flavors} 
        onVote={handleVote}
        onAddFlavor={handleAddFlavor}
        highlightedId={highlightedId}
      />
    </div>
  )
}

export default App
