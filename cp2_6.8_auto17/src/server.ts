import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface Poll {
  id: string
  code: string
  title: string
  options: PollOption[]
  deadline: string
  createdAt: string
  voters: Set<string>
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

const polls = new Map<string, Poll>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function getVoterId(req: express.Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  return `${ip}-${userAgent}`
}

app.post('/api/poll', (req, res) => {
  const { title, options, deadline } = req.body

  if (!title || !options || options.length < 2 || options.length > 8) {
    return res.status(400).json({ error: '标题和2-8个选项是必填的' })
  }

  if (!deadline) {
    return res.status(400).json({ error: '截止时间是必填的' })
  }

  const id = uuidv4()
  let code = generateCode()
  while (polls.has(code)) {
    code = generateCode()
  }

  const poll: Poll = {
    id,
    code,
    title,
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: 0,
    })),
    deadline,
    createdAt: new Date().toISOString(),
    voters: new Set(),
  }

  polls.set(code, poll)

  res.status(201).json({
    id: poll.id,
    code: poll.code,
    title: poll.title,
    options: poll.options,
    deadline: poll.deadline,
    createdAt: poll.createdAt,
  })
})

app.get('/api/poll/:code', (req, res) => {
  const { code } = req.params
  const poll = polls.get(code.toUpperCase())

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const now = new Date()
  const deadline = new Date(poll.deadline)
  const isExpired = now > deadline

  res.json({
    id: poll.id,
    code: poll.code,
    title: poll.title,
    options: poll.options,
    deadline: poll.deadline,
    createdAt: poll.createdAt,
    isExpired,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
  })
})

app.post('/api/poll/:code/vote', (req, res) => {
  const { code } = req.params
  const { optionId } = req.body
  const poll = polls.get(code.toUpperCase())

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const now = new Date()
  const deadline = new Date(poll.deadline)
  if (now > deadline) {
    return res.status(400).json({ error: '投票已截止' })
  }

  const voterId = getVoterId(req)
  if (poll.voters.has(voterId)) {
    return res.status(400).json({ error: '您已经投过票了' })
  }

  const option = poll.options.find((opt) => opt.id === optionId)
  if (!option) {
    return res.status(400).json({ error: '选项不存在' })
  }

  option.votes += 1
  poll.voters.add(voterId)

  res.json({
    success: true,
    options: poll.options,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
