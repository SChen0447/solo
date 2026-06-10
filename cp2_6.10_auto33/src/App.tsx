import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import WebSocketManager, { WsMessage } from './utils/wsManager'
import FeedbackPanel from './components/FeedbackPanel'
import PollPanel from './components/PollPanel'

export interface User {
  userId: string
  userName: string
  avatarColor: string
}

export interface EmojiFeedback {
  id: string
  userId: string
  userName: string
  avatarColor: string
  emoji: string
  timestamp: number
}

export interface Poll {
  pollId: string
  topic: string
  options: string[]
  votes: Record<string, number>
  createdAt: number
  creatorId: string
}

type PanelType = 'feedback' | 'poll'

const AVATAR_COLORS = [
  '#60a5fa', '#a78bfa', '#f472b6', '#fb923c',
  '#4ade80', '#34d399', '#facc15', '#f87171'
]

const RANDOM_NAMES = [
  '小熊猫', '小松鼠', '小海豚', '小狐狸', '小企鹅',
  '小考拉', '小水獭', '小刺猬', '小兔子', '小鹿'
]

const STORAGE_KEY_POLLS = 'team_feedback_polls'
const STORAGE_KEY_USER = 'team_feedback_user'

function generateColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

function generateName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
}

function loadStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeUser(user: User): void {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}

function loadStoredPolls(): Poll[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_POLLS)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function storePolls(polls: Poll[]): void {
  localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls))
}

function App() {
  const [sessionId] = useState(() => uuidv4().slice(0, 8).toUpperCase())
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = loadStoredUser()
    if (stored) return stored
    const newUser: User = {
      userId: uuidv4(),
      userName: generateName(),
      avatarColor: generateColor()
    }
    storeUser(newUser)
    return newUser
  })
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [activePanel, setActivePanel] = useState<PanelType>('feedback')
  const [emojiFeedbacks, setEmojiFeedbacks] = useState<EmojiFeedback[]>([])
  const [polls, setPolls] = useState<Poll[]>(() => loadStoredPolls())
  const [flyingEmojis, setFlyingEmojis] = useState<Array<{ id: string; emoji: string; x: number; y: number; targetX: number; targetY: number }>>([])

  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const flyingIdRef = useRef(0)

  useEffect(() => {
    const wsUrl = window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws`
      : `ws://${window.location.host}/ws`

    const manager = new WebSocketManager(wsUrl, sessionId, currentUser.userId)
    wsManagerRef.current = manager

    try {
      manager.connect()
    } catch (e) {
      console.log('WebSocket connection failed, working in local mode')
    }

    const unsubscribe = manager.onMessage((message: WsMessage) => {
      handleWsMessage(message)
    })

    setOnlineUsers(prev => {
      if (prev.find(u => u.userId === currentUser.userId)) return prev
      return [...prev, currentUser]
    })

    return () => {
      unsubscribe()
      manager.disconnect()
    }
  }, [sessionId, currentUser])

  useEffect(() => {
    storePolls(polls)
  }, [polls])

  const handleWsMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case 'emoji': {
        const payload = message.payload as { emoji: string; userName: string; avatarColor: string }
        const feedback: EmojiFeedback = {
          id: uuidv4(),
          userId: message.userId,
          userName: payload.userName,
          avatarColor: payload.avatarColor || generateColor(),
          emoji: payload.emoji,
          timestamp: message.timestamp
        }
        setEmojiFeedbacks(prev => [...prev.slice(-499), feedback])
        triggerFlyingEmoji(payload.emoji)
        break
      }
      case 'poll_create': {
        const payload = message.payload as { pollId: string; topic: string; options: string[] }
        const newPoll: Poll = {
          pollId: payload.pollId,
          topic: payload.topic,
          options: payload.options,
          votes: {},
          createdAt: message.timestamp,
          creatorId: message.userId
        }
        setPolls(prev => {
          if (prev.find(p => p.pollId === payload.pollId)) return prev
          return [newPoll, ...prev]
        })
        break
      }
      case 'poll_vote': {
        const payload = message.payload as { pollId: string; optionIndex: number }
        setPolls(prev => prev.map(poll => {
          if (poll.pollId !== payload.pollId) return poll
          return {
            ...poll,
            votes: { ...poll.votes, [message.userId]: payload.optionIndex }
          }
        }))
        break
      }
      case 'poll_revoke': {
        const payload = message.payload as { pollId: string }
        setPolls(prev => prev.map(poll => {
          if (poll.pollId !== payload.pollId) return poll
          const newVotes = { ...poll.votes }
          delete newVotes[message.userId]
          return { ...poll, votes: newVotes }
        }))
        break
      }
      case 'user_join': {
        const payload = message.payload as { userId: string; userName?: string; avatarColor?: string }
        if (payload.userId === currentUser.userId) return
        setOnlineUsers(prev => {
          if (prev.find(u => u.userId === payload.userId)) return prev
          return [...prev, {
            userId: payload.userId,
            userName: payload.userName || '匿名用户',
            avatarColor: payload.avatarColor || generateColor()
          }]
        })
        break
      }
      case 'user_leave': {
        const payload = message.payload as { userId: string }
        setOnlineUsers(prev => prev.filter(u => u.userId !== payload.userId))
        break
      }
      case 'user_list': {
        const payload = message.payload as { users: User[] }
        setOnlineUsers(prev => {
          const merged = [...prev]
          payload.users.forEach(u => {
            if (!merged.find(mu => mu.userId === u.userId)) {
              merged.push(u)
            }
          })
          return merged
        })
        break
      }
    }
  }, [currentUser])

  const triggerFlyingEmoji = useCallback((emoji: string) => {
    const startX = Math.random() * (window.innerWidth * 0.6) + window.innerWidth * 0.1
    const startY = window.innerHeight * 0.7
    const targetX = window.innerWidth / 2
    const targetY = window.innerHeight * 0.4

    const id = `flying-${flyingIdRef.current++}`
    setFlyingEmojis(prev => [...prev, {
      id,
      emoji,
      x: startX,
      y: startY,
      targetX,
      targetY
    }])

    setTimeout(() => {
      setFlyingEmojis(prev => prev.filter(f => f.id !== id))
    }, 800)
  }, [])

  const sendEmoji = useCallback((emoji: string, startX: number, startY: number) => {
    const feedback: EmojiFeedback = {
      id: uuidv4(),
      userId: currentUser.userId,
      userName: currentUser.userName,
      avatarColor: currentUser.avatarColor,
      emoji,
      timestamp: Date.now()
    }
    setEmojiFeedbacks(prev => [...prev.slice(-499), feedback])

    const targetX = window.innerWidth / 2
    const targetY = window.innerHeight * 0.4

    const id = `flying-${flyingIdRef.current++}`
    setFlyingEmojis(prev => [...prev, {
      id,
      emoji,
      x: startX,
      y: startY,
      targetX,
      targetY
    }])

    setTimeout(() => {
      setFlyingEmojis(prev => prev.filter(f => f.id !== id))
    }, 800)

    wsManagerRef.current?.send('emoji', {
      emoji,
      userName: currentUser.userName,
      avatarColor: currentUser.avatarColor
    })
  }, [currentUser])

  const createPoll = useCallback((topic: string, options: string[]) => {
    const pollId = uuidv4()
    const newPoll: Poll = {
      pollId,
      topic,
      options,
      votes: {},
      createdAt: Date.now(),
      creatorId: currentUser.userId
    }
    setPolls(prev => [newPoll, ...prev])
    wsManagerRef.current?.send('poll_create', { pollId, topic, options })
  }, [currentUser])

  const votePoll = useCallback((pollId: string, optionIndex: number) => {
    setPolls(prev => prev.map(poll => {
      if (poll.pollId !== pollId) return poll
      return {
        ...poll,
        votes: { ...poll.votes, [currentUser.userId]: optionIndex }
      }
    }))
    wsManagerRef.current?.send('poll_vote', { pollId, optionIndex })
  }, [currentUser])

  const revokeVote = useCallback((pollId: string) => {
    setPolls(prev => prev.map(poll => {
      if (poll.pollId !== pollId) return poll
      const newVotes = { ...poll.votes }
      delete newVotes[currentUser.userId]
      return { ...poll, votes: newVotes }
    }))
    wsManagerRef.current?.send('poll_revoke', { pollId })
  }, [currentUser])

  const aggregatedEmojis = useMemo(() => {
    const now = Date.now()
    const recent = emojiFeedbacks.filter(f => now - f.timestamp < 5000)
    const counts: Record<string, number> = {}
    recent.forEach(f => {
      counts[f.emoji] = (counts[f.emoji] || 0) + 1
    })
    return counts
  }, [emojiFeedbacks])

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-title">团队反馈板</div>
          <div className="session-id">
            <span>会话</span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{sessionId}</span>
          </div>
        </div>
        <div className="online-status">
          <span className="online-dot"></span>
          <span className="online-count">{onlineUsers.length} 人在线</span>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activePanel === 'feedback' ? 'active' : ''}`}
            onClick={() => setActivePanel('feedback')}
          >
            反馈表情
          </button>
          <button
            className={`nav-tab ${activePanel === 'poll' ? 'active' : ''}`}
            onClick={() => setActivePanel('poll')}
          >
            匿名投票
          </button>
        </nav>
      </header>

      <main className="content">
        {flyingEmojis.map(fe => (
          <div
            key={fe.id}
            className="flying-emoji"
            style={{
              left: fe.x,
              top: fe.y,
              fontSize: '36px',
              ['--fly-x' as string]: `${fe.targetX - fe.x + (Math.random() * 100 - 50)}px`,
              ['--fly-y' as string]: `-${Math.abs(fe.y - fe.targetY) * 0.6}px`,
              ['--fly-end-x' as string]: `${fe.targetX - fe.x}px`,
              ['--fly-end-y' as string]: `${fe.targetY - fe.y}px`
            } as React.CSSProperties}
          >
            {fe.emoji}
          </div>
        ))}

        {activePanel === 'feedback' ? (
          <FeedbackPanel
            emojiFeedbacks={emojiFeedbacks}
            aggregatedEmojis={aggregatedEmojis}
            onSendEmoji={sendEmoji}
            currentUser={currentUser}
          />
        ) : (
          <PollPanel
            polls={polls}
            currentUserId={currentUser.userId}
            onCreatePoll={createPoll}
            onVote={votePoll}
            onRevoke={revokeVote}
          />
        )}
      </main>
    </div>
  )
}

export default App
