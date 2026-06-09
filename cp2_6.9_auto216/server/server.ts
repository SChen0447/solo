import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')
const BOOKS_FILE = path.join(DATA_DIR, 'books.json')
const EXCHANGES_FILE = path.join(DATA_DIR, 'exchanges.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

interface Location {
  city: string
  lat: number
  lng: number
}

interface DriftRecord {
  id: string
  bookId: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  fromLocation: Location
  toLocation: Location
  message: string
  driftCode: string
  status: 'pending' | 'confirmed' | 'completed'
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  stayDays?: number
}

interface Book {
  id: string
  title: string
  author: string
  publisher: string
  publishYear: number
  coverImages: string[]
  status: 'available' | 'drifting' | 'exchanged' | 'borrow_only'
  ownerId: string
  ownerName: string
  exchangeRule: 'exchange' | 'borrow_only' | 'designated'
  designatedUserId?: string
  currentLocation: Location
  driftHistory: DriftRecord[]
  createdAt: string
  description: string
}

interface User {
  id: string
  name: string
  avatar: string
  registeredAt: string
  location: Location
  exchangeCount: number
}

const seedUsers: User[] = [
  {
    id: 'user-1',
    name: '墨香书客',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book1',
    registeredAt: '2024-01-15',
    location: { city: '北京', lat: 39.9042, lng: 116.4074 },
    exchangeCount: 12,
  },
  {
    id: 'user-2',
    name: '江南读书人',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book2',
    registeredAt: '2024-03-20',
    location: { city: '上海', lat: 31.2304, lng: 121.4737 },
    exchangeCount: 8,
  },
  {
    id: 'user-3',
    name: '古城书虫',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book3',
    registeredAt: '2024-05-10',
    location: { city: '西安', lat: 34.3416, lng: 108.9398 },
    exchangeCount: 5,
  },
  {
    id: 'user-4',
    name: '湖畔墨客',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book4',
    registeredAt: '2024-06-25',
    location: { city: '杭州', lat: 30.2741, lng: 120.1551 },
    exchangeCount: 3,
  },
]

const seedBooks: Book[] = [
  {
    id: 'book-1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    publisher: '南海出版公司',
    publishYear: 2017,
    coverImages: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=600&fit=crop',
    ],
    status: 'drifting',
    ownerId: 'user-1',
    ownerName: '墨香书客',
    exchangeRule: 'exchange',
    currentLocation: { city: '上海', lat: 31.2304, lng: 121.4737 },
    description: '一部魔幻现实主义的经典之作，讲述布恩迪亚家族七代人的传奇故事。',
    createdAt: '2024-08-01',
    driftHistory: [
      {
        id: 'drift-1-1',
        bookId: 'book-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        fromUserName: '墨香书客',
        toUserName: '江南读书人',
        fromLocation: { city: '北京', lat: 39.9042, lng: 116.4074 },
        toLocation: { city: '上海', lat: 31.2304, lng: 121.4737 },
        message: '希望你喜欢这本经典之作！',
        driftCode: 'DRIFT-2024-BJSH-001',
        status: 'completed',
        createdAt: '2024-08-15',
        confirmedAt: '2024-08-16',
        completedAt: '2024-09-20',
        stayDays: 35,
      },
    ],
  },
  {
    id: 'book-2',
    title: '三体',
    author: '刘慈欣',
    publisher: '重庆出版社',
    publishYear: 2008,
    coverImages: [
      'https://images.unsplash.com/photo-1614544048536-0d28caf77f41?w=400&h=600&fit=crop',
    ],
    status: 'available',
    ownerId: 'user-2',
    ownerName: '江南读书人',
    exchangeRule: 'exchange',
    currentLocation: { city: '上海', lat: 31.2304, lng: 121.4737 },
    description: '中国科幻文学的巅峰之作，讲述地球文明与三体文明的史诗碰撞。',
    createdAt: '2024-09-10',
    driftHistory: [],
  },
  {
    id: 'book-3',
    title: '活着',
    author: '余华',
    publisher: '作家出版社',
    publishYear: 2012,
    coverImages: [
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    ],
    status: 'available',
    ownerId: 'user-3',
    ownerName: '古城书虫',
    exchangeRule: 'borrow_only',
    currentLocation: { city: '西安', lat: 34.3416, lng: 108.9398 },
    description: '讲述一个人一生的故事，这是一个历尽世间沧桑和磨难老人的人生感言。',
    createdAt: '2024-09-25',
    driftHistory: [],
  },
  {
    id: 'book-4',
    title: '小王子',
    author: '圣埃克苏佩里',
    publisher: '人民文学出版社',
    publishYear: 2015,
    coverImages: [
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=600&fit=crop',
    ],
    status: 'drifting',
    ownerId: 'user-4',
    ownerName: '湖畔墨客',
    exchangeRule: 'exchange',
    currentLocation: { city: '杭州', lat: 30.2741, lng: 120.1551 },
    description: '一本写给大人的童话，关于爱、责任与成长的永恒寓言。',
    createdAt: '2024-07-20',
    driftHistory: [
      {
        id: 'drift-4-1',
        bookId: 'book-4',
        fromUserId: 'user-3',
        toUserId: 'user-4',
        fromUserName: '古城书虫',
        toUserName: '湖畔墨客',
        fromLocation: { city: '西安', lat: 34.3416, lng: 108.9398 },
        toLocation: { city: '杭州', lat: 30.2741, lng: 120.1551 },
        message: '送给每一个心里住着小孩的大人。',
        driftCode: 'DRIFT-2024-XAHZ-002',
        status: 'completed',
        createdAt: '2024-08-05',
        confirmedAt: '2024-08-06',
        completedAt: '2024-10-01',
        stayDays: 56,
      },
      {
        id: 'drift-4-2',
        bookId: 'book-4',
        fromUserId: 'user-4',
        toUserId: 'user-2',
        fromUserName: '湖畔墨客',
        toUserName: '江南读书人',
        fromLocation: { city: '杭州', lat: 30.2741, lng: 120.1551 },
        toLocation: { city: '上海', lat: 31.2304, lng: 121.4737 },
        message: '继续传递这份温暖。',
        driftCode: 'DRIFT-2024-HZSH-003',
        status: 'pending',
        createdAt: '2024-10-15',
      },
    ],
  },
  {
    id: 'book-5',
    title: '围城',
    author: '钱钟书',
    publisher: '人民文学出版社',
    publishYear: 1991,
    coverImages: [
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop',
    ],
    status: 'available',
    ownerId: 'user-1',
    ownerName: '墨香书客',
    exchangeRule: 'exchange',
    currentLocation: { city: '北京', lat: 39.9042, lng: 116.4074 },
    description: '一部新"儒林外史"，讽刺了当时社会的各种弊病。',
    createdAt: '2024-10-01',
    driftHistory: [],
  },
  {
    id: 'book-6',
    title: '平凡的世界',
    author: '路遥',
    publisher: '北京十月文艺出版社',
    publishYear: 2016,
    coverImages: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    ],
    status: 'exchanged',
    ownerId: 'user-3',
    ownerName: '古城书虫',
    exchangeRule: 'exchange',
    currentLocation: { city: '西安', lat: 34.3416, lng: 108.9398 },
    description: '一部全景式表现中国当代城乡社会生活的长篇小说。',
    createdAt: '2024-06-10',
    driftHistory: [],
  },
]

function initData() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2), 'utf-8')
  }
  if (!fs.existsSync(BOOKS_FILE)) {
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(seedBooks, null, 2), 'utf-8')
  }
  if (!fs.existsSync(EXCHANGES_FILE)) {
    fs.writeFileSync(EXCHANGES_FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

initData()

function readJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

function writeJSON<T>(filePath: string, data: T) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = 3001

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/books', (_req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  res.json(books)
})

app.get('/api/books/:id', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const book = books.find((b) => b.id === req.params.id)
  if (!book) {
    return res.status(404).json({ error: 'Book not found' })
  }
  res.json(book)
})

app.post('/api/books', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const users = readJSON<User[]>(USERS_FILE)
  const owner = users[0]
  const newBook: Book = {
    id: 'book-' + uuidv4(),
    title: req.body.title,
    author: req.body.author,
    publisher: req.body.publisher,
    publishYear: req.body.publishYear,
    coverImages: req.body.coverImages || [],
    status: 'available',
    ownerId: owner.id,
    ownerName: owner.name,
    exchangeRule: req.body.exchangeRule || 'exchange',
    currentLocation: owner.location,
    description: req.body.description || '',
    createdAt: new Date().toISOString().split('T')[0],
    driftHistory: [],
  }
  books.push(newBook)
  writeJSON(BOOKS_FILE, books)
  res.json(newBook)
})

app.put('/api/books/:id', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const index = books.findIndex((b) => b.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Book not found' })
  }
  books[index] = { ...books[index], ...req.body }
  writeJSON(BOOKS_FILE, books)
  res.json(books[index])
})

app.patch('/api/books/:id/status', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const index = books.findIndex((b) => b.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Book not found' })
  }
  books[index].status = req.body.status
  writeJSON(BOOKS_FILE, books)
  res.json(books[index])
})

app.get('/api/users', (_req, res) => {
  const users = readJSON<User[]>(USERS_FILE)
  res.json(users)
})

app.get('/api/users/:id', (req, res) => {
  const users = readJSON<User[]>(USERS_FILE)
  const user = users.find((u) => u.id === req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

app.get('/api/users/:id/books', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const { id } = req.params
  const published = books.filter((b) => b.ownerId === id)
  const exchanged = books.filter((b) =>
    b.driftHistory.some(
      (d) => d.toUserId === id && d.status === 'completed'
    )
  )
  res.json({ published, exchanged })
})

app.post('/api/exchanges', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const users = readJSON<User[]>(USERS_FILE)
  const { bookId, fromUserId, toUserId, message } = req.body

  const bookIndex = books.findIndex((b) => b.id === bookId)
  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' })
  }

  const fromUser = users.find((u) => u.id === fromUserId)
  const toUser = users.find((u) => u.id === toUserId)
  if (!fromUser || !toUser) {
    return res.status(404).json({ error: 'User not found' })
  }

  const driftCode = `DRIFT-${new Date().getFullYear()}-${fromUser.location.city.slice(0, 2)}${toUser.location.city.slice(0, 2)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

  const driftRecord: DriftRecord = {
    id: 'drift-' + uuidv4(),
    bookId,
    fromUserId,
    toUserId,
    fromUserName: fromUser.name,
    toUserName: toUser.name,
    fromLocation: fromUser.location,
    toLocation: toUser.location,
    message: message || '',
    driftCode,
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
  }

  books[bookIndex].driftHistory.push(driftRecord)
  books[bookIndex].status = 'drifting'
  writeJSON(BOOKS_FILE, books)

  res.json(driftRecord)
})

app.post('/api/exchanges/:id/confirm', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const { id } = req.params

  for (let i = 0; i < books.length; i++) {
    const driftIndex = books[i].driftHistory.findIndex((d) => d.id === id)
    if (driftIndex !== -1) {
      books[i].driftHistory[driftIndex].status = 'confirmed'
      books[i].driftHistory[driftIndex].confirmedAt = new Date().toISOString().split('T')[0]
      writeJSON(BOOKS_FILE, books)
      return res.json(books[i].driftHistory[driftIndex])
    }
  }
  res.status(404).json({ error: 'Exchange not found' })
})

app.post('/api/exchanges/:id/complete', (req, res) => {
  const books = readJSON<Book[]>(BOOKS_FILE)
  const { id } = req.params

  for (let i = 0; i < books.length; i++) {
    const driftIndex = books[i].driftHistory.findIndex((d) => d.id === id)
    if (driftIndex !== -1) {
      const record = books[i].driftHistory[driftIndex]
      record.status = 'completed'
      record.completedAt = new Date().toISOString().split('T')[0]
      const start = new Date(record.confirmedAt || record.createdAt)
      const end = new Date(record.completedAt)
      record.stayDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      books[i].currentLocation = record.toLocation
      books[i].ownerId = record.toUserId
      books[i].ownerName = record.toUserName
      books[i].status = 'available'
      writeJSON(BOOKS_FILE, books)
      return res.json(record)
    }
  }
  res.status(404).json({ error: 'Exchange not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
