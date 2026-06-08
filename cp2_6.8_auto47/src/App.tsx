import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import VotePanel from './components/VotePanel'
import SentimentBoard from './components/SentimentBoard'
import CanvasBoard from './components/CanvasBoard'
import { Vote, Comment, OnlineUser } from './utils/dataGenerator'

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentVote, setCurrentVote] = useState<Vote | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [userInfo, setUserInfo] = useState<{ userId: string; userName: string; avatar: string; color: string } | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
    })

    newSocket.on('userInfo', (info: { userId: string; userName: string; avatar: string; color: string }) => {
      setUserInfo(info)
    })

    newSocket.on('voteUpdate', (vote: Vote | null) => {
      setCurrentVote(vote)
      if (vote) {
        const voted = vote.voters.some(v => v.userId === newSocket.id)
        setHasVoted(voted)
      } else {
        setHasVoted(false)
      }
    })

    newSocket.on('voteCreated', (vote: Vote) => {
      setCurrentVote(vote)
      setHasVoted(false)
      setComments([])
    })

    newSocket.on('voteEnded', (vote: Vote) => {
      setCurrentVote(vote)
    })

    newSocket.on('commentsGenerated', (newComments: Comment[]) => {
      setComments(newComments)
    })

    newSocket.on('userListUpdate', (users: OnlineUser[]) => {
      setOnlineUsers(users)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const handleCreateVote = (title: string, options: string[], duration: number) => {
    if (socket) {
      socket.emit('createVote', { title, options, duration })
    }
  }

  const handleVote = (optionId: string) => {
    if (socket && !hasVoted) {
      socket.emit('castVote', { optionId })
      setHasVoted(true)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 团队决策看板</h1>
        <div className="user-info">
          <span className="online-count">在线: {onlineUsers.length}</span>
          {userInfo && (
            <span className="current-user">
              <span className="avatar">{userInfo.avatar}</span>
              <span className="username">{userInfo.userName}</span>
            </span>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="top-section">
          <div className="vote-section">
            <VotePanel
              vote={currentVote}
              hasVoted={hasVoted}
              onVote={handleVote}
              onCreateVote={handleCreateVote}
              userId={userInfo?.userId || ''}
            />
          </div>
          <div className="sentiment-section">
            <SentimentBoard comments={comments} />
          </div>
        </div>

        <div className="canvas-section">
          <CanvasBoard
            socket={socket}
            userColor={userInfo?.color || '#888'}
            userId={userInfo?.userId || ''}
          />
        </div>
      </main>
    </div>
  )
}

export default App
