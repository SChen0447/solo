import { useEffect, useCallback, useRef } from 'react'
import EmberPile from '@/components/EmberPile'
import ControlPanel from '@/components/ControlPanel'
import { useFireplaceStore, type EmotionType } from '@/store/fireplaceStore'
import { useAudio } from '@/hooks/useAudio'

interface WSMessage {
  type: string
  logs: Array<{ id: string; emotion: EmotionType; remainingMs: number }>
}

export default function App() {
  const { embers, addEmber, updateEmbers } = useFireplaceStore()
  const { playEmotionSound, stopSound } = useAudio()
  const prevEmberIdsRef = useRef<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/logs')
        if (res.ok) {
          const data = await res.json()
          updateEmbers(data.logs)
        }
      } catch (e) {
        console.error('Failed to fetch initial logs:', e)
      }
    }
    fetchInitial()
  }, [updateEmbers])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (msg.type === 'state_update') {
          updateEmbers(msg.logs)
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
      }, 1000)
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => {
      ws.close()
    }
  }, [updateEmbers])

  useEffect(() => {
    const currentIds = new Set(embers.map((e) => e.id))

    embers.forEach((ember) => {
      if (!prevEmberIdsRef.current.has(ember.id)) {
        playEmotionSound(ember.id, ember.emotion, 15)
      }
    })

    prevEmberIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        stopSound(id)
      }
    })

    prevEmberIdsRef.current = currentIds
  }, [embers, playEmotionSound, stopSound])

  const handleAddEmber = useCallback(async (emotion: EmotionType) => {
    await addEmber(emotion)
  }, [addEmber])

  const handleDrop = useCallback((emotion: EmotionType) => {
    handleAddEmber(emotion)
  }, [handleAddEmber])

  return (
    <div className="app-container">
      <EmberPile onDrop={handleDrop} />
      <ControlPanel onAddEmber={handleAddEmber} />
    </div>
  )
}
