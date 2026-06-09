import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

interface VoteOption {
  id: string
  text: string
  votes: number
}

interface Voter {
  userId: string
  userName: string
  avatar: string
  optionId: string
  timestamp: number
}

interface Vote {
  id: string
  title: string
  options: VoteOption[]
  duration: number
  startTime: number
  endTime: number
  status: 'active' | 'ended'
  voters: Voter[]
}

interface Comment {
  id: string
  userId: string
  userName: string
  avatar: string
  text: string
  sentiment: 'positive' | 'negative' | 'neutral'
  timestamp: number
}

interface CanvasPoint {
  x: number
  y: number
}

interface DrawData {
  userId: string
  color: string
  size: number
  points: CanvasPoint[]
  isLine: boolean
}

const app = express()
app.use(cors())
app.use(express.json())

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

let currentVote: Vote | null = null
let comments: Comment[] = []
let onlineUsers = new Map<string, { userName: string; avatar: string; color: string }>()
let voteTimer: NodeJS.Timeout | null = null

const avatars = ['😀', '😎', '🤖', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🎨', '👩‍🔬', '🦊', '🐱', '🐶', '🐼', '🦁', '🐯', '🐸']

const positiveComments = [
  '这个方案太棒了！',
  '完全同意，非常有远见',
  '我喜欢这个想法，很有创意',
  '支持！这是最好的选择',
  '太好了，终于有人提出来了',
  '这个决定会让我们更上一层楼',
  '完美的解决方案',
  '我对这个结果很满意',
  '这才是正确的方向',
  '干得漂亮，团队！'
]

const negativeComments = [
  '我觉得这个方案有问题',
  '不太看好这个方向',
  '风险太大了，需要再考虑',
  '可能会带来一些负面影响',
  '我持保留意见',
  '这个决定太仓促了',
  '我担心实际效果',
  '还需要更多数据支持',
  '感觉不够稳妥',
  '我们是不是漏了什么？'
]

const neutralComments = [
  '再看看情况吧',
  '还行吧，感觉一般',
  '有待观察实际效果',
  '中规中矩的选择',
  '可以试试看',
  '没有特别的感觉',
  '综合来看还可以',
  '需要更多时间评估',
  '各有利弊吧',
  '看后续发展再说'
]

const userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateComment(voteTitle: string): Comment {
  const sentiment = getRandomItem(['positive', 'negative', 'neutral'] as const)
  let textList: string[]
  if (sentiment === 'positive') textList = positiveComments
  else if (sentiment === 'negative') textList = negativeComments
  else textList = neutralComments

  const user = getRandomItem(Array.from(onlineUsers.values())) || { userName: '匿名用户', avatar: '😀', color: '#888' }

  return {
    id: uuidv4(),
    userId: uuidv4(),
    userName: user.userName || '匿名用户',
    avatar: user.avatar || '😀',
    text: getRandomItem(textList),
    sentiment,
    timestamp: Date.now()
  }
}

function endVote() {
  if (currentVote) {
    currentVote.status = 'ended'
    io.emit('voteEnded', currentVote)
    
    const numComments = Math.floor(Math.random() * 8) + 5
    comments = []
    for (let i = 0; i < numComments; i++) {
      comments.push(generateComment(currentVote.title))
    }
    io.emit('commentsGenerated', comments)
  }
  if (voteTimer) {
    clearTimeout(voteTimer)
    voteTimer = null
  }
}

app.get('/api/vote', (req, res) => {
  res.json({ vote: currentVote, comments })
})

app.get('/api/users', (req, res) => {
  res.json({ users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, ...data })) })
})

io.on('connection', (socket) => {
  const userId = socket.id
  const userColor = getRandomItem(userColors)
  const userName = `用户${Math.floor(Math.random() * 9000) + 1000}`
  const userAvatar = getRandomItem(avatars)
  
  onlineUsers.set(userId, { userName, avatar: userAvatar, color: userColor })
  
  socket.emit('userInfo', { userId, userName, avatar: userAvatar, color: userColor })
  socket.emit('voteUpdate', currentVote)
  socket.emit('commentsGenerated', comments)
  io.emit('userListUpdate', Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, ...data })))

  socket.on('createVote', (data: { title: string; options: string[]; duration: number }) => {
    if (currentVote && currentVote.status === 'active') return

    const duration = Math.max(10, Math.min(120, data.duration))
    const startTime = Date.now()
    
    currentVote = {
      id: uuidv4(),
      title: data.title,
      options: data.options.slice(0, 6).filter(o => o.trim()).map(text => ({
        id: uuidv4(),
        text: text.trim(),
        votes: 0
      })),
      duration,
      startTime,
      endTime: startTime + duration * 1000,
      status: 'active',
      voters: []
    }

    comments = []
    io.emit('voteCreated', currentVote)
    io.emit('voteUpdate', currentVote)

    if (voteTimer) clearTimeout(voteTimer)
    voteTimer = setTimeout(endVote, duration * 1000)
  })

  socket.on('castVote', (data: { optionId: string }) => {
    if (!currentVote || currentVote.status !== 'active') return

    const existingVoter = currentVote.voters.find(v => v.userId === userId)
    if (existingVoter) return

    const option = currentVote.options.find(o => o.id === data.optionId)
    if (!option) return

    option.votes++
    const userData = onlineUsers.get(userId) || { userName: '未知', avatar: '😀' }
    
    currentVote.voters.push({
      userId,
      userName: userData.userName,
      avatar: userData.avatar,
      optionId: data.optionId,
      timestamp: Date.now()
    })

    io.emit('voteUpdate', currentVote)
  })

  let lastDrawTime = 0
  const DRAW_THROTTLE = 1000 / 30

  socket.on('draw', (data: DrawData) => {
    const now = Date.now()
    if (now - lastDrawTime < DRAW_THROTTLE) return
    lastDrawTime = now

    socket.broadcast.emit('draw', data)
  })

  socket.on('clearCanvas', () => {
    socket.broadcast.emit('clearCanvas')
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(userId)
    io.emit('userListUpdate', Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, ...data })))
  })
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
